import type { App } from "obsidian";
import { MarkdownView } from "obsidian";
import type { LexiconNexusSettings } from "./types";

export function rerenderAllMarkdownViews(app: App): void {
	for (const leaf of app.workspace.getLeavesOfType("markdown")) {
		const view = leaf.view;
		if (view instanceof MarkdownView) {
			void view.previewMode?.rerender(true);
		}
	}
}

export function debounce<T extends (...args: never[]) => void>(
	fn: T,
	ms: number,
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<T>) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}

export function normalizeSettings(data: Partial<LexiconNexusSettings> | null): LexiconNexusSettings {
	const d = data ?? {};
	const folder =
		typeof d.dictionaryFolder === "string" && d.dictionaryFolder.trim()
			? d.dictionaryFolder.trim()
			: "Dictionary";

	return {
		dictionaryFolder: folder,
		enableInReadingView: coerceBool(d.enableInReadingView, true),
		popoverTrigger: d.popoverTrigger === "hover" || d.popoverTrigger === "click" ? d.popoverTrigger : "both",
		caseSensitive: coerceBool(d.caseSensitive, false),
		showSourceFile: coerceBool(d.showSourceFile, true),
		debugMode: coerceBool(d.debugMode, false),
	};
}

function coerceBool(value: unknown, defaultValue: boolean): boolean {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return defaultValue;
}
