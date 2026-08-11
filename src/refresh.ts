import { App, MarkdownView } from "obsidian";

export function rerenderAllMarkdownViews(app: App): void {
	for (const leaf of app.workspace.getLeavesOfType("markdown")) {
		rerenderMarkdownView(leaf.view);
	}
}

export function rerenderMarkdownViewForFile(app: App, filePath: string): void {
	for (const leaf of app.workspace.getLeavesOfType("markdown")) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === filePath) {
			rerenderMarkdownView(view);
		}
	}
}

function rerenderMarkdownView(view: unknown): void {
	if (view instanceof MarkdownView) {
		void view.previewMode?.rerender(true);
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
