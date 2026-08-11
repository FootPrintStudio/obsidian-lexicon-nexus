import type { LexiconNexusSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export function normalizeSettings(data: Partial<LexiconNexusSettings> | null): LexiconNexusSettings {
	const d = data ?? {};
	const folder =
		typeof d.dictionaryFolder === "string" && d.dictionaryFolder.trim()
			? d.dictionaryFolder.trim()
			: DEFAULT_SETTINGS.dictionaryFolder;

	return {
		dictionaryFolder: folder,
		enableInReadingView: coerceBool(d.enableInReadingView, DEFAULT_SETTINGS.enableInReadingView),
		popoverTrigger:
			d.popoverTrigger === "hover" || d.popoverTrigger === "click"
				? d.popoverTrigger
				: DEFAULT_SETTINGS.popoverTrigger,
		caseSensitive: coerceBool(d.caseSensitive, DEFAULT_SETTINGS.caseSensitive),
		showSourceFile: coerceBool(d.showSourceFile, DEFAULT_SETTINGS.showSourceFile),
		debugMode: coerceBool(d.debugMode, DEFAULT_SETTINGS.debugMode),
		maxHighlightForms: coerceNonNegativeInt(d.maxHighlightForms, DEFAULT_SETTINGS.maxHighlightForms),
		maxTextNodeLength: coerceNonNegativeInt(d.maxTextNodeLength, DEFAULT_SETTINGS.maxTextNodeLength),
		refreshOnMetadataChange: coerceBool(
			d.refreshOnMetadataChange,
			DEFAULT_SETTINGS.refreshOnMetadataChange,
		),
	};
}

function coerceBool(value: unknown, defaultValue: boolean): boolean {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return defaultValue;
}

function coerceNonNegativeInt(value: unknown, defaultValue: number): number {
	if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		if (Number.isFinite(n) && n >= 0) return Math.floor(n);
	}
	return defaultValue;
}
