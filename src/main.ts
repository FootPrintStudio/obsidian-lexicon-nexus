import { Notice, Plugin, TAbstractFile, MarkdownView } from "obsidian";
import {
	buildIndexFromFolder,
	buildScopedIndex,
	getLexiconContextPaths,
	isUnderDictionaryFolder,
} from "./context";
import type { DefinitionIndex, LexiconNexusSettings, ParseWarning } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { normalizeSettings } from "./settingsUtil";
import { debounce, rerenderAllMarkdownViews } from "./refresh";
import { LexiconNexusSettingTab } from "./settings";
import { findMatchForm } from "./match";
import { processLexiconInElement } from "./reading/postprocess";
import { LexiconPopoverManager, gotoDefinition, getWordAtCursor } from "./reading/popover";

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
			editorCallback: () => void this.commandGotoDefinition(),
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
		return this.scopedCache.get(sourcePath) ?? this.globalIndex;
	}

	async prewarmScope(sourcePath: string): Promise<void> {
		const cache = this.app.metadataCache.getCache(sourcePath);
		const paths = getLexiconContextPaths(cache?.frontmatter);
		if (paths.length === 0) return;
		const scoped = await buildScopedIndex(this.app, this.globalIndex, paths);
		this.scopedCache.set(sourcePath, scoped);
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

		rerenderAllMarkdownViews(this.app);
		if (notify) {
			new Notice(`Lexicon Nexus: indexed ${index.forms.length} match forms`);
		}
	}

	async resolveIndexForContext(sourcePath: string): Promise<DefinitionIndex> {
		await this.prewarmScope(sourcePath);
		return this.getIndexForSource(sourcePath);
	}

	private async commandGotoDefinition(): Promise<void> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) return;

		const word = getWordAtCursor(view);
		if (!word) {
			new Notice("Lexicon Nexus: no word at cursor");
			return;
		}

		const index = await this.resolveIndexForContext(view.file.path);
		const form = findMatchForm(index, word, this.settings.caseSensitive);
		if (!form) {
			new Notice(`Lexicon Nexus: no definition for "${word}"`);
			return;
		}

		await gotoDefinition(this.app, form.entry);
	}
}
