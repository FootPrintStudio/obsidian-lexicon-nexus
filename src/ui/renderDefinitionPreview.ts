import { App, Component, MarkdownRenderer } from "obsidian";
import type { LexiconAlias, LexiconEntry, LexiconNexusSettings, LexiconRequirement } from "../types";

export interface PreviewActions {
	onOpenFile?: (entry: LexiconEntry) => void;
}

export function formatRequirementsLine(requirements: LexiconRequirement[]): string {
	if (requirements.length === 0) return "None";
	return requirements
		.map((r) => (typeof r === "object" ? `Priority: ${r.value}` : r))
		.join(", ");
}

export function formatTermLabel(entry: LexiconEntry): string {
	if (entry.termPlural) return `${entry.term} · ${entry.termPlural}`;
	return entry.term;
}

export function formatAliasesLabel(aliases: LexiconAlias[]): string {
	return aliases.map((a) => (a.plural ? `${a.name} · ${a.plural}` : a.name)).join(", ");
}

/** Reading-view popover — respects Plain and showSourceFile settings. */
export function renderDefinitionPreview(
	app: App,
	container: HTMLElement,
	entry: LexiconEntry,
	settings: LexiconNexusSettings,
	component: Component,
	actions?: PreviewActions,
): void {
	container.empty();

	if (!entry.plainPopover) {
		container.createDiv({ cls: "lxn-popover-title", text: entry.term });
		if (entry.aliases.length > 0) {
			container.createDiv({ cls: "lxn-popover-aliases", text: entry.aliases.map((a) => a.name).join(", ") });
		}
		if (settings.showSourceFile) {
			appendSourceLink(container, entry, actions);
		}
	}

	appendDefinitionBody(app, container, entry, component);
}

/** Browser modal preview — always full detail; ignores popover settings. */
export function renderDefinitionBrowserPreview(
	app: App,
	container: HTMLElement,
	entry: LexiconEntry,
	component: Component,
	actions?: PreviewActions,
): void {
	container.empty();

	container.createDiv({ cls: "lxn-popover-title", text: formatTermLabel(entry) });

	if (entry.aliases.length > 0) {
		container.createDiv({ cls: "lxn-popover-aliases", text: formatAliasesLabel(entry.aliases) });
	}

	appendSourceLink(container, entry, actions);
	appendDefinitionBody(app, container, entry, component);

	const footer = container.createDiv({ cls: "lxn-browser-requirements" });
	footer.createSpan({ cls: "lxn-browser-requirements-label", text: "Requirements: " });
	footer.createSpan({ text: formatRequirementsLine(entry.requirements) });
}

function appendSourceLink(
	container: HTMLElement,
	entry: LexiconEntry,
	actions?: PreviewActions,
): void {
	const base = entry.file.split("/").pop() ?? entry.file;
	const sourceRow = container.createDiv({ cls: "lxn-popover-source" });
	if (actions?.onOpenFile) {
		const link = sourceRow.createEl("a", {
			cls: "lxn-popover-goto",
			text: base,
			href: "#",
		});
		link.setAttr("aria-label", `Open definition in ${entry.file}`);
		link.addEventListener("click", (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			actions.onOpenFile!(entry);
		});
	} else {
		sourceRow.setText(base);
	}
}

function appendDefinitionBody(
	app: App,
	container: HTMLElement,
	entry: LexiconEntry,
	component: Component,
): void {
	const body = container.createDiv({ cls: "lxn-popover-body" });
	void MarkdownRenderer.render(
		app,
		entry.body || "*(empty)*",
		body,
		entry.file,
		component,
	);
}
