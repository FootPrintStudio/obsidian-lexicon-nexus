import { App, Component, MarkdownRenderer } from "obsidian";

export type PluginSettingsTabId = "settings" | "readme" | "guide";

const README_FALLBACK =
	"# README not found\n\nCould not load README.md from the plugin folder.";

const GUIDE_FALLBACK =
	"# Guide not found\n\nCould not load docs/GUIDE.md from the plugin folder.";

export async function loadPluginMarkdown(
	relativePath: string,
	fallback: string,
	pluginDir: string,
	adapter: App["vault"]["adapter"],
): Promise<string> {
	const fullPath = `${pluginDir}/${relativePath}`;
	try {
		if (await adapter.exists(fullPath)) {
			return await adapter.read(fullPath);
		}
	} catch {
		// fall through
	}
	return fallback;
}

export function renderSettingsTabBar(
	container: HTMLElement,
	activeTab: PluginSettingsTabId,
	onSelect: (tab: PluginSettingsTabId) => void,
	classPrefix: string,
): void {
	container.empty();
	container.addClass(`${classPrefix}-settings-tabs`);

	const tabs: { id: PluginSettingsTabId; label: string }[] = [
		{ id: "settings", label: "Settings" },
		{ id: "readme", label: "README" },
		{ id: "guide", label: "Guide" },
	];

	for (const tab of tabs) {
		const btn = container.createDiv({
			cls: `${classPrefix}-settings-tab${activeTab === tab.id ? " is-active" : ""}`,
			text: tab.label,
		});
		btn.addEventListener("click", () => {
			if (activeTab !== tab.id) onSelect(tab.id);
		});
	}
}

export function renderMarkdownPanel(
	app: App,
	container: HTMLElement,
	component: Component,
	panelClass: string,
	markdown: Promise<string>,
): void {
	container.empty();
	container.addClass(panelClass);
	void markdown.then((content) =>
		MarkdownRenderer.render(app, content, container, "", component),
	);
}

export function renderReadmePanel(
	app: App,
	container: HTMLElement,
	component: Component,
	panelClass: string,
	pluginDir: string,
): void {
	renderMarkdownPanel(
		app,
		container,
		component,
		panelClass,
		loadPluginMarkdown("README.md", README_FALLBACK, pluginDir, app.vault.adapter),
	);
}

export function renderGuidePanel(
	app: App,
	container: HTMLElement,
	component: Component,
	panelClass: string,
	pluginDir: string,
): void {
	renderMarkdownPanel(
		app,
		container,
		component,
		panelClass,
		loadPluginMarkdown("docs/GUIDE.md", GUIDE_FALLBACK, pluginDir, app.vault.adapter),
	);
}
