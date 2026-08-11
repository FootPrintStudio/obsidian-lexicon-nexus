import { Notice, Plugin, TAbstractFile, MarkdownView } from "obsidian";
import {
	buildIndexFromFolder,
	buildScopedIndex,
	getLexiconContextPaths,
	isUnderDictionaryFolder,
} from "./context";
import {
	filterGlobalIndexByContext,
	needsAsyncScopeEnrichment,
	resolveContextFilePaths,
} from "./index/scoping";
import type { DefinitionIndex, LexiconNexusSettings, ParseWarning } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { normalizeSettings } from "./settingsUtil";
import { debounce, rerenderAllMarkdownViews } from "./refresh";
import { LexiconNexusSettingTab } from "./settings";
import { findMatchAtCursor, findMatchForm } from "./match";
import { processLexiconInElement } from "./reading/postprocess";
import {
	LexiconPopoverManager,
	gotoDefinition,
	getEditorOrSelectionText,
} from "./reading/popover";

export default class LexiconNexusPlugin extends Plugin {
	settings: LexiconNexusSettings = { ...DEFAULT_SETTINGS };
	globalIndex: DefinitionIndex = { entries: new Map(), forms: [], sortedForms: [] };
	warnings: ParseWarning[] = [];
	popoverManager = new LexiconPopoverManager(this.app);
	private scopedCache = new Map<string, DefinitionIndex>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new LexiconNexusSettingTab(this.app, this));

		await this.refreshIndex();

		this.registerMarkdownPostProcessor((element, ctx) => {
			try {
				const settings = { ...this.settings };
				const index = this.getIndexForSource(ctx.sourcePath);
				processLexiconInElement(
					this.app,
					element,
					ctx,
					index,
					settings,
					this.popoverManager,
				);
			} catch {
				// per-element isolation
			}
		});

		this.addCommand({
			id: "refresh-lexicon",
			name: "Refresh lexicon index",
			callback: () => void this.refreshIndex(true),
		});

		this.addCommand({
			id: "goto-lexicon-definition",
			name: "Go to lexicon definition",
			editorCallback: (_editor, view) => {
				const mdView = view instanceof MarkdownView ? view : undefined;
				void this.commandGotoDefinition(mdView);
			},
			callback: () => void this.commandGotoDefinition(),
		});

		const scheduleRefresh = debounce(() => void this.refreshIndex(), 250);

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TAbstractFile && this.isDictionaryFile(file.path)) scheduleRefresh();
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TAbstractFile && this.isDictionaryFile(file.path)) scheduleRefresh();
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TAbstractFile && this.isDictionaryFile(file.path)) scheduleRefresh();
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (
					(file instanceof TAbstractFile && this.isDictionaryFile(file.path)) ||
					this.isDictionaryFile(oldPath)
				) {
					scheduleRefresh();
				}
			}),
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const file = this.app.workspace.getActiveFile();
				if (file) void this.prewarmScope(file.path);
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				this.scopedCache.delete(file.path);
				void this.prewarmScope(file.path);
				rerenderAllMarkdownViews(this.app);
			}),
		);

		const file = this.app.workspace.getActiveFile();
		if (file) void this.prewarmScope(file.path);
	}

	onunload(): void {
		this.popoverManager.unload();
	}

	private isDictionaryFile(path: string): boolean {
		return isUnderDictionaryFolder(path, this.settings.dictionaryFolder);
	}

	getIndexForSource(sourcePath: string): DefinitionIndex {
		const cache = this.app.metadataCache.getCache(sourcePath);
		const paths = getLexiconContextPaths(cache?.frontmatter);
		if (paths.length === 0) return this.globalIndex;

		const cached = this.scopedCache.get(sourcePath);
		if (cached) return cached;

		const allowedFiles = resolveContextFilePaths(this.app, paths);
		const syncScoped = filterGlobalIndexByContext(this.globalIndex, allowedFiles);

		if (needsAsyncScopeEnrichment(this.app, paths, this.globalIndex)) {
			void this.prewarmScope(sourcePath);
		}

		return syncScoped;
	}

	async prewarmScope(sourcePath: string): Promise<void> {
		const cache = this.app.metadataCache.getCache(sourcePath);
		const paths = getLexiconContextPaths(cache?.frontmatter);
		if (paths.length === 0) return;

		const scoped = await buildScopedIndex(this.app, this.globalIndex, paths);
		this.scopedCache.set(sourcePath, scoped);
		rerenderAllMarkdownViews(this.app);
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<LexiconNexusSettings> | null;
		this.settings = normalizeSettings(data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.scopedCache.clear();
		rerenderAllMarkdownViews(this.app);
	}

	async refreshIndex(notify = false): Promise<void> {
		const { index, warnings } = await buildIndexFromFolder(
			this.app,
			this.settings.dictionaryFolder,
		);
		this.globalIndex = index;
		this.warnings = warnings;
		this.scopedCache.clear();

		if (this.settings.debugMode && warnings.length > 0) {
			console.debug("[Lexicon Nexus] index warnings:", warnings);
		}

		const file = this.app.workspace.getActiveFile();
		if (file) await this.prewarmScope(file.path);

		rerenderAllMarkdownViews(this.app);
		if (notify) {
			new Notice(`Lexicon Nexus: indexed ${index.forms.length} match forms`);
		}
	}

	private async commandGotoDefinition(view?: MarkdownView): Promise<void> {
		const activeView = view ?? this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = activeView?.file ?? this.app.workspace.getActiveFile();
		if (!file) {
			new Notice("Lexicon Nexus: no active note");
			return;
		}

		const index = this.getIndexForSource(file.path);
		const cachedAsync = this.scopedCache.get(file.path);
		const resolvedIndex = cachedAsync ?? index;

		let form = null;
		const selected = getEditorOrSelectionText(activeView ?? null);
		if (selected) {
			form = findMatchForm(resolvedIndex, selected, this.settings.caseSensitive);
		}
		if (!form && activeView?.editor) {
			const pos = activeView.editor.getCursor();
			const line = activeView.editor.getLine(pos.line);
			form = findMatchAtCursor(resolvedIndex, line, pos.ch, this.settings.caseSensitive);
		}
		if (!form && selected) {
			form = findMatchForm(resolvedIndex, selected, this.settings.caseSensitive);
		}

		if (!form) {
			new Notice("Lexicon Nexus: no definition at cursor or selection");
			return;
		}

		await gotoDefinition(this.app, form.entry);
	}
}
