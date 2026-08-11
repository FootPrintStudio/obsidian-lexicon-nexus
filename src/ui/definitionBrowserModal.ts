import { App, Component, Modal } from "obsidian";
import type LexiconNexusPlugin from "../main";
import type { LexiconEntry } from "../types";
import { gotoDefinition } from "../reading/popover";
import { filterEntries, listSourceFiles, noSourcesSelected } from "./definitionSearch";
import { renderDefinitionBrowserPreview } from "./renderDefinitionPreview";

const SEARCH_DEBOUNCE_MS = 100;

export class DefinitionBrowserModal extends Modal {
	private query = "";
	private selectedIndex = 0;
	private results: LexiconEntry[] = [];
	private allFiles: string[] = [];
	private disabledFiles = new Set<string>();
	private searchTimer: ReturnType<typeof setTimeout> | undefined;
	private previewComponent = new Component();

	private searchInput!: HTMLInputElement;
	private listEl!: HTMLElement;
	private previewEl!: HTMLElement;
	private previewActionsEl!: HTMLElement;
	private emptyEl!: HTMLElement;
	private chipRow!: HTMLElement;

	constructor(
		app: App,
		private plugin: LexiconNexusPlugin,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		contentEl.empty();
		contentEl.addClass("lxn-browser-modal");
		modalEl.addClass("lxn-browser-modal-shell");

		this.titleEl.setText("Search lexicon definitions");

		const allEntries = [...this.plugin.globalIndex.entries.values()];
		this.allFiles = listSourceFiles(allEntries);
		this.disabledFiles = new Set();
		this.results = filterEntries(allEntries, "", null);
		this.selectedIndex = 0;

		const toolbar = contentEl.createDiv({ cls: "lxn-browser-toolbar" });
		this.searchInput = toolbar.createEl("input", {
			cls: "lxn-browser-search",
			attr: { type: "search", placeholder: "Search terms, aliases, definitions…" },
		});
		this.searchInput.addEventListener("input", () => {
			if (this.searchTimer) clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				this.query = this.searchInput.value;
				this.refreshResults();
			}, SEARCH_DEBOUNCE_MS);
		});

		const filterRow = toolbar.createDiv({ cls: "lxn-browser-filters" });
		filterRow.createSpan({ cls: "lxn-browser-filters-label", text: "Sources:" });
		this.chipRow = filterRow.createDiv({ cls: "lxn-browser-chips" });
		this.renderFileChips();

		const body = contentEl.createDiv({ cls: "lxn-browser-body" });

		const listPane = body.createDiv({ cls: "lxn-browser-list-pane" });
		this.listEl = listPane.createDiv({ cls: "lxn-browser-list" });
		this.emptyEl = listPane.createDiv({ cls: "lxn-browser-empty" });

		const previewPane = body.createDiv({ cls: "lxn-browser-preview-pane" });
		this.previewActionsEl = previewPane.createDiv({ cls: "lxn-browser-preview-actions" });
		this.previewEl = previewPane.createDiv({ cls: "lxn-browser-preview" });

		this.searchInput.addEventListener("keydown", (ev) => this.onSearchKeydown(ev));
		contentEl.addEventListener("keydown", (ev) => this.onModalKeydown(ev));

		this.refreshResults();
		setTimeout(() => this.searchInput.focus(), 0);
	}

	onClose(): void {
		if (this.searchTimer) clearTimeout(this.searchTimer);
		this.previewComponent.unload();
		const { contentEl } = this;
		contentEl.empty();
	}

	private enabledFilesSet(): Set<string> | null {
		if (this.disabledFiles.size === 0) return null;
		const enabled = this.allFiles.filter((f) => !this.disabledFiles.has(f));
		return new Set(enabled);
	}

	private refreshResults(): void {
		const allEntries = [...this.plugin.globalIndex.entries.values()];
		const enabled = this.enabledFilesSet();

		if (noSourcesSelected(this.disabledFiles, this.allFiles)) {
			this.results = [];
		} else {
			this.results = filterEntries(allEntries, this.query, enabled);
		}

		if (this.selectedIndex >= this.results.length) {
			this.selectedIndex = Math.max(0, this.results.length - 1);
		}

		this.renderList();
		this.renderPreview();
	}

	private renderFileChips(): void {
		this.chipRow.empty();
		for (const file of this.allFiles) {
			const base = file.split("/").pop() ?? file;
			const enabled = !this.disabledFiles.has(file);
			const chip = this.chipRow.createEl("button", {
				cls: `lxn-browser-chip${enabled ? " is-enabled" : ""}`,
				text: base,
			});
			chip.setAttr("aria-pressed", enabled ? "true" : "false");
			chip.setAttr("title", file);
			chip.addEventListener("click", () => {
				if (this.disabledFiles.has(file)) {
					this.disabledFiles.delete(file);
				} else {
					this.disabledFiles.add(file);
				}
				this.renderFileChips();
				this.refreshResults();
			});
		}
	}

	private renderList(): void {
		this.listEl.empty();
		this.emptyEl.empty();

		if (this.allFiles.length === 0) {
			this.emptyEl.setText("No definitions indexed.");
			return;
		}

		if (noSourcesSelected(this.disabledFiles, this.allFiles)) {
			this.emptyEl.setText("No sources selected.");
			return;
		}

		if (this.results.length === 0) {
			this.emptyEl.setText(this.query ? "No matches." : "No definitions in selected sources.");
			return;
		}

		this.results.forEach((entry, index) => {
			const item = this.listEl.createDiv({
				cls: `lxn-browser-list-item${index === this.selectedIndex ? " is-selected" : ""}`,
			});
			item.createDiv({ cls: "lxn-browser-list-term", text: entry.term });
			const base = entry.file.split("/").pop() ?? entry.file;
			item.createDiv({ cls: "lxn-browser-list-file", text: base });
			item.addEventListener("click", () => {
				this.selectedIndex = index;
				this.renderList();
				this.renderPreview();
			});
			item.addEventListener("dblclick", () => {
				this.selectedIndex = index;
				void this.openSelected();
			});
		});

		const selected = this.listEl.querySelector(".is-selected");
		selected?.scrollIntoView({ block: "nearest" });
	}

	private renderPreview(): void {
		this.previewEl.empty();
		this.previewActionsEl.empty();

		const entry = this.results[this.selectedIndex];
		if (!entry) {
			this.previewEl.createDiv({
				cls: "lxn-browser-preview-placeholder",
				text: "Select a definition to preview.",
			});
			return;
		}

		const openBtn = this.previewActionsEl.createEl("button", {
			cls: "lxn-browser-open-btn",
			text: "Open in file",
		});
		openBtn.addEventListener("click", () => void this.openSelected());

		this.previewComponent.unload();
		this.previewComponent = new Component();

		renderDefinitionBrowserPreview(
			this.app,
			this.previewEl,
			entry,
			this.previewComponent,
			{
				onOpenFile: () => void this.openSelected(),
			},
		);
	}

	private async openSelected(): Promise<void> {
		const entry = this.results[this.selectedIndex];
		if (!entry) return;
		this.close();
		await gotoDefinition(this.app, entry);
	}

	private onSearchKeydown(ev: KeyboardEvent): void {
		if (ev.key === "ArrowDown") {
			ev.preventDefault();
			this.moveSelection(1);
		} else if (ev.key === "ArrowUp") {
			ev.preventDefault();
			this.moveSelection(-1);
		} else if (ev.key === "Enter") {
			ev.preventDefault();
			void this.openSelected();
		}
	}

	private onModalKeydown(ev: KeyboardEvent): void {
		if (ev.target === this.searchInput) return;
		if (ev.key === "ArrowDown") {
			ev.preventDefault();
			this.moveSelection(1);
		} else if (ev.key === "ArrowUp") {
			ev.preventDefault();
			this.moveSelection(-1);
		} else if (ev.key === "Enter") {
			ev.preventDefault();
			void this.openSelected();
		}
	}

	private moveSelection(delta: number): void {
		if (this.results.length === 0) return;
		this.selectedIndex = Math.max(
			0,
			Math.min(this.results.length - 1, this.selectedIndex + delta),
		);
		this.renderList();
		this.renderPreview();
	}
}
