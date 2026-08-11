import type { DefinitionIndex, LexiconNexusSettings } from "./types";

export const DEFAULT_MAX_HIGHLIGHT_FORMS = 2500;
export const DEFAULT_MAX_TEXT_NODE_LENGTH = 10_000;

export interface PerformanceLimits {
	maxHighlightForms: number;
	maxTextNodeLength: number;
}

export function resolvePerformanceLimits(settings: LexiconNexusSettings): PerformanceLimits {
	return {
		maxHighlightForms: settings.maxHighlightForms,
		maxTextNodeLength: settings.maxTextNodeLength,
	};
}

/** True when highlighting should be skipped entirely for this index. */
export function shouldSkipHighlighting(index: DefinitionIndex, limits: PerformanceLimits): boolean {
	if (limits.maxHighlightForms <= 0) return false;
	return index.sortedForms.length > limits.maxHighlightForms;
}

/** True when a text node is too long to scan safely. */
export function shouldSkipTextNode(textLength: number, limits: PerformanceLimits): boolean {
	if (limits.maxTextNodeLength <= 0) return false;
	return textLength > limits.maxTextNodeLength;
}

export function indexSizeMessage(index: DefinitionIndex): string {
	const entries = index.entries.size;
	const forms = index.sortedForms.length;
	return `${entries} entries, ${forms} match forms`;
}

export function indexOverLimitMessage(index: DefinitionIndex, limits: PerformanceLimits): string | null {
	if (!shouldSkipHighlighting(index, limits)) return null;
	return `Lexicon index has ${index.sortedForms.length} match forms (limit ${limits.maxHighlightForms}). Reading-view highlights are paused — raise the limit in settings or reduce dictionary size.`;
}
