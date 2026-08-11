import { App, Component, PluginSettingTab, Setting } from "obsidian";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import type LexiconNexusPlugin from "./main";
import { indexSizeMessage } from "./performance";
import { DEFAULT_SETTINGS } from "./types";

export class LexiconNexusSettingTab extends PluginSettingTab {
	plugin: LexiconNexusPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private docComponent = new Component();

	constructor(app: App, plugin: LexiconNexusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.docComponent.unload();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.docComponent.unload();
		this.docComponent = new Component();

		containerEl.createEl("h2", { text: "Lexicon Nexus" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "lxn");

		const content = containerEl.createDiv({ cls: "lxn-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.docComponent, "lxn-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.docComponent, "lxn-guide-panel", pluginDir);
			return;
		}

		this.displaySettings(content);
	}

	private displaySettings(containerEl: HTMLElement): void {
		containerEl.createEl("p", {
			text: "Vault glossary from markdown files in your dictionary folder. See the Guide tab for entry format and optional requirements.",
		});

		const indexInfo = containerEl.createDiv({ cls: "lxn-index-info" });
		indexInfo.createEl("strong", { text: "Index: " });
		indexInfo.createSpan({ text: indexSizeMessage(this.plugin.globalIndex) });

		if (this.plugin.warnings.length > 0) {
			const warnBox = containerEl.createDiv({ cls: "lxn-warnings-box" });
			warnBox.createEl("strong", { text: `${this.plugin.warnings.length} index warning(s):` });
			const list = warnBox.createEl("ul", { cls: "lxn-warnings-list" });
			const shown = this.plugin.warnings.slice(0, 12);
			for (const w of shown) {
				const loc = w.line ? `${w.file}:${w.line}` : w.file;
				list.createEl("li", { text: `${loc} — ${w.message}` });
			}
			if (this.plugin.warnings.length > shown.length) {
				list.createEl("li", {
					text: `… and ${this.plugin.warnings.length - shown.length} more (enable Debug mode for console log)`,
				});
			}
		}

		new Setting(containerEl)
			.setName("Dictionary folder")
			.setDesc("All .md files under this folder are indexed as Lexicon entries.")
			.addText((text) =>
				text.setValue(this.plugin.settings.dictionaryFolder).onChange(async (value) => {
					this.plugin.settings.dictionaryFolder = value.trim() || DEFAULT_SETTINGS.dictionaryFolder;
					await this.plugin.saveSettings();
					await this.plugin.refreshIndex();
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName("Enable in Reading view")
			.setDesc("Highlight defined terms and show popovers when notes render in Reading view.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableInReadingView).onChange(async (value) => {
					this.plugin.settings.enableInReadingView = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Popover trigger")
			.setDesc("How popovers open on highlighted terms. Use Click on touch devices.")
			.addDropdown((drop) =>
				drop
					.addOptions({ both: "Hover and click", hover: "Hover only", click: "Click only" })
					.setValue(this.plugin.settings.popoverTrigger)
					.onChange(async (value) => {
						this.plugin.settings.popoverTrigger = value as typeof DEFAULT_SETTINGS.popoverTrigger;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Case-sensitive matching (global)")
			.setDesc("When off, terms match regardless of case unless an entry has the Case requirement.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.caseSensitive).onChange(async (value) => {
					this.plugin.settings.caseSensitive = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Show source file in popover")
			.setDesc("Display the dictionary filename above the definition (hidden when entry has Plain requirement).")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showSourceFile).onChange(async (value) => {
					this.plugin.settings.showSourceFile = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Refresh on metadata change")
			.setDesc(
				"Re-render a note's Reading view when its frontmatter changes (e.g. lexicon-context). May reset scroll position — leave off if disruptive.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.refreshOnMetadataChange).onChange(async (value) => {
					this.plugin.settings.refreshOnMetadataChange = value;
					await this.plugin.saveSettings();
				}),
			);

		containerEl.createEl("h3", { text: "Performance" });

		new Setting(containerEl)
			.setName("Max match forms for highlighting")
			.setDesc("Reading-view highlights pause when the index exceeds this count. 0 = unlimited.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.maxHighlightForms))
					.onChange(async (value) => {
						this.plugin.settings.maxHighlightForms = parseLimit(value, DEFAULT_SETTINGS.maxHighlightForms);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max text node length")
			.setDesc("Skip scanning individual text nodes longer than this (characters). 0 = unlimited.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.maxTextNodeLength))
					.onChange(async (value) => {
						this.plugin.settings.maxTextNodeLength = parseLimit(value, DEFAULT_SETTINGS.maxTextNodeLength);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Debug mode")
			.setDesc("Log index warnings and post-processor errors to the console.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}

function parseLimit(value: string, fallback: number): number {
	const n = Number(value.trim());
	if (!Number.isFinite(n) || n < 0) return fallback;
	return Math.floor(n);
}
