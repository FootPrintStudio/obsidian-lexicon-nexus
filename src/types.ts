export type PopoverTrigger = "hover" | "click" | "both";

export interface LexiconNexusSettings {
	dictionaryFolder: string;
	enableInReadingView: boolean;
	popoverTrigger: PopoverTrigger;
	caseSensitive: boolean;
	showSourceFile: boolean;
	debugMode: boolean;
	/** 0 = unlimited. Reading highlights skip when form count exceeds this. */
	maxHighlightForms: number;
	/** 0 = unlimited. Text nodes longer than this are not scanned. */
	maxTextNodeLength: number;
	/** Re-render a note's Reading view when its frontmatter changes (lexicon-context). */
	refreshOnMetadataChange: boolean;
}

export const DEFAULT_SETTINGS: LexiconNexusSettings = {
	dictionaryFolder: "Dictionary",
	enableInReadingView: true,
	popoverTrigger: "both",
	caseSensitive: false,
	showSourceFile: true,
	debugMode: false,
	maxHighlightForms: 2500,
	maxTextNodeLength: 10_000,
	refreshOnMetadataChange: false,
};

export type LexiconRequirement =
	| "None"
	| "Case"
	| "Whole"
	| "Partial"
	| "Draft"
	| "Global"
	| "NoHighlight"
	| "NoLink"
	| "NoCode"
	| "Plain"
	| "Once"
	| "NoSpace"
	| { kind: "Priority"; value: number };

export interface LexiconAlias {
	name: string;
	plural?: string;
}

export interface LexiconEntry {
	id: string;
	term: string;
	termPlural?: string;
	requirements: LexiconRequirement[];
	aliases: LexiconAlias[];
	body: string;
	file: string;
	line: number;
	priority: number;
	caseSensitive: boolean;
	matchMode: "whole" | "partial";
	draft: boolean;
	global: boolean;
	noHighlight: boolean;
	noLink: boolean;
	noCode: boolean;
	plainPopover: boolean;
	once: boolean;
	noSpace: boolean;
}

export interface MatchForm {
	text: string;
	entry: LexiconEntry;
}

export interface TextMatch {
	start: number;
	end: number;
	form: MatchForm;
}

export interface ParseWarning {
	file: string;
	line?: number;
	message: string;
}

export interface ParseResult {
	entries: LexiconEntry[];
	warnings: ParseWarning[];
}

export interface DefinitionIndex {
	entries: Map<string, LexiconEntry>;
	forms: MatchForm[];
	/** Sorted longest text first for scanning. */
	sortedForms: MatchForm[];
	/** Forms grouped by first character (lowercase) to reduce scan work. */
	formsByFirstChar: Map<string, MatchForm[]>;
}

export function entryId(file: string, line: number, term: string): string {
	return `${file}:${line}:${term}`;
}
