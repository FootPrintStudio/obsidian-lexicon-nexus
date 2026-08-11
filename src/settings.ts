import { App, PluginSettingTab, Setting } from "obsidian";
import type LexiconNexusPlugin from "./main";
import { DEFAULT_SETTINGS } from "./types";

export class LexiconNexusSettingTab extends PluginSettingTab {
	plugin: LexiconNexusPlugin;

	constructor(app: App, plugin: LexiconNexusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Lexicon Nexus" });

		containerEl.createEl("p", {
			text: "Vault glossary from markdown files in your dictionary folder. See docs/GUIDE.md for entry format.",
		});

		new Setting(containerEl)
			.setName("Dictionary folder")
			.setDesc("All .md files under this folder are indexed as Lexicon entries.")
			.addText((text) =>
				text.setValue(this.plugin.settings.dictionaryFolder).onChange(async (value) => {
					this.plugin.settings.dictionaryFolder = value.trim() || DEFAULT_SETTINGS.dictionaryFolder;
					await this.plugin.saveSettings();
					await this.plugin.refreshIndex();
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
			.setDesc("How popovers open on highlighted terms.")
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
			.setName("Debug mode")
			.setDesc("Log index warnings to the console.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
