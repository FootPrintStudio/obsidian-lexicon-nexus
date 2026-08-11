import {
	App,
	Component,
	MarkdownRenderer,
	MarkdownView,
	Notice,
	TFile,
} from "obsidian";
import type { LexiconEntry, LexiconNexusSettings } from "../types";

export class LexiconPopoverManager {
	private pinnedEl: HTMLElement | null = null;
	private hoverEl: HTMLElement | null = null;
	private hoverTimer: ReturnType<typeof setTimeout> | undefined;
	private component = new Component();

	constructor(private app: App) {}

	attach(el: HTMLElement, entry: LexiconEntry, settings: LexiconNexusSettings): void {
		const trigger = settings.popoverTrigger;

		el.addEventListener("click", (ev) => {
			if (!ev.ctrlKey && !ev.metaKey) return;
			ev.preventDefault();
			ev.stopPropagation();
			this.closeAll();
			void gotoDefinition(this.app, entry);
		});

		if (trigger === "hover" || trigger === "both") {
			el.addEventListener("mouseenter", () => {
				if (this.pinnedEl && this.pinnedEl !== el) return;
				this.hoverTimer = setTimeout(() => this.show(el, entry, settings, false), 200);
			});
			el.addEventListener("mouseleave", () => {
				if (this.hoverTimer) clearTimeout(this.hoverTimer);
				if (this.pinnedEl === el) return;
				this.hideHover();
			});
		}
		if (trigger === "click" || trigger === "both") {
			el.addEventListener("click", (ev) => {
				if (ev.ctrlKey || ev.metaKey) return;
				ev.preventDefault();
				ev.stopPropagation();
				if (this.pinnedEl === el) {
					this.hidePinned();
					return;
				}
				this.hideHover();
				this.show(el, entry, settings, true);
			});
		}
		el.addEventListener("auxclick", (ev) => {
			if (ev.button === 1) {
				ev.preventDefault();
				ev.stopPropagation();
				this.closeAll();
				void gotoDefinition(this.app, entry);
			}
		});
	}

	private show(
		anchor: HTMLElement,
		entry: LexiconEntry,
		settings: LexiconNexusSettings,
		pin: boolean,
	): void {
		if (pin) this.hidePinned();
		else this.hideHover();

		const pop = document.createElement("div");
		pop.className = "lxn-popover";
		document.body.appendChild(pop);

		if (pin) {
			this.pinnedEl = anchor;
			pop.classList.add("is-pinned");
			const onDocClick = (ev: MouseEvent) => {
				if (!pop.contains(ev.target as Node) && ev.target !== anchor) {
					this.hidePinned();
					document.removeEventListener("click", onDocClick, true);
				}
			};
			setTimeout(() => document.addEventListener("click", onDocClick, true), 0);
		} else {
			this.hoverEl = pop;
		}

		this.renderContent(pop, entry, settings, anchor);
	}

	private renderContent(
		pop: HTMLElement,
		entry: LexiconEntry,
		settings: LexiconNexusSettings,
		anchor: HTMLElement,
	): void {
		if (!entry.plainPopover) {
			pop.createDiv({ cls: "lxn-popover-title", text: entry.term });
			if (entry.aliases.length > 0) {
				const aliasText = entry.aliases.map((a) => a.name).join(", ");
				pop.createDiv({ cls: "lxn-popover-aliases", text: aliasText });
			}
			if (settings.showSourceFile) {
				const base = entry.file.split("/").pop() ?? entry.file;
				const sourceRow = pop.createDiv({ cls: "lxn-popover-source" });
				const link = sourceRow.createEl("a", {
					cls: "lxn-popover-goto",
					text: base,
					href: "#",
				});
				link.setAttr("aria-label", `Open definition in ${entry.file}`);
				link.addEventListener("click", (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					this.closeAll();
					void gotoDefinition(this.app, entry);
				});
			}
		}

		const body = pop.createDiv({ cls: "lxn-popover-body" });
		void MarkdownRenderer.render(
			this.app,
			entry.body || "*(empty)*",
			body,
			entry.file,
			this.component,
		);

		const rect = anchor.getBoundingClientRect();
		pop.style.position = "fixed";
		pop.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
		pop.style.top = `${rect.bottom + 6}px`;
		pop.style.maxWidth = "320px";
		pop.style.zIndex = "1000";
	}

	private closeAll(): void {
		this.hideHover();
		this.hidePinned();
	}

	hideHover(): void {
		if (this.hoverTimer) clearTimeout(this.hoverTimer);
		this.hoverEl?.remove();
		this.hoverEl = null;
	}

	hidePinned(): void {
		this.pinnedEl = null;
		document.querySelectorAll(".lxn-popover.is-pinned").forEach((el) => el.remove());
	}

	unload(): void {
		this.closeAll();
		this.component.unload();
	}
}

export async function gotoDefinition(app: App, entry: LexiconEntry): Promise<void> {
	const file = app.vault.getAbstractFileByPath(entry.file);
	if (!(file instanceof TFile)) {
		new Notice(`Lexicon Nexus: dictionary file not found: ${entry.file}`);
		return;
	}

	const leaf = app.workspace.getLeaf(false);
	await leaf.openFile(file);
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (view?.editor && entry.line > 0) {
		const line = entry.line - 1;
		view.editor.setCursor({ line, ch: 0 });
		view.editor.scrollIntoView(
			{ from: { line, ch: 0 }, to: { line: line + 1, ch: 0 } },
			true,
		);
	}
}

export function getWordAtCursor(view: MarkdownView): string {
	const editor = view.editor;
	const pos = editor.getCursor();
	const line = editor.getLine(pos.line);
	const wordRe = /[\w\p{Script=Han}]+/gu;
	let match: RegExpExecArray | null;
	while ((match = wordRe.exec(line)) !== null) {
		const start = match.index;
		const end = start + match[0]!.length;
		if (pos.ch >= start && pos.ch <= end) return match[0]!;
	}
	return "";
}

/** Selected text in active window, or empty string. */
export function getEditorOrSelectionText(view: MarkdownView | null): string {
	const selection = window.getSelection()?.toString().trim();
	if (selection) return selection;
	if (!view) return "";
	return getWordAtCursor(view);
}
