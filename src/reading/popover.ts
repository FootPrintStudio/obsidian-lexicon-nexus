import {
	App,
	Component,
	MarkdownView,
	Notice,
	TFile,
} from "obsidian";
import type { LexiconEntry, LexiconNexusSettings } from "../types";
import { renderDefinitionPreview } from "../ui/renderDefinitionPreview";

export class LexiconPopoverManager {
	private pinnedEl: HTMLElement | null = null;
	private hoverEl: HTMLElement | null = null;
	private hoverTimer: ReturnType<typeof setTimeout> | undefined;
	private component = new Component();
	private pinnedDocListener: ((ev: MouseEvent) => void) | null = null;

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
			this.removePinnedDocListener();
			this.pinnedDocListener = (ev: MouseEvent) => {
				if (!pop.contains(ev.target as Node) && ev.target !== anchor) {
					this.hidePinned();
				}
			};
			setTimeout(() => {
				if (this.pinnedDocListener) {
					document.addEventListener("click", this.pinnedDocListener, true);
				}
			}, 0);
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
		renderDefinitionPreview(this.app, pop, entry, settings, this.component, {
			onOpenFile: () => {
				this.closeAll();
				void gotoDefinition(this.app, entry);
			},
		});

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
		this.removePinnedDocListener();
		document.querySelectorAll(".lxn-popover.is-pinned").forEach((el) => el.remove());
	}

	private removePinnedDocListener(): void {
		if (this.pinnedDocListener) {
			document.removeEventListener("click", this.pinnedDocListener, true);
			this.pinnedDocListener = null;
		}
	}

	unload(): void {
		this.closeAll();
		this.removePinnedDocListener();
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
