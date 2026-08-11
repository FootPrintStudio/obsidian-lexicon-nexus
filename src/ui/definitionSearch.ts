import type { LexiconEntry } from "../types";

const BODY_SEARCH_LEN = 200;

/** Unique source file paths sorted by basename. */
export function listSourceFiles(entries: LexiconEntry[]): string[] {
	const files = new Set<string>();
	for (const entry of entries) {
		if (!entry.draft) files.add(entry.file);
	}
	return [...files].sort((a, b) => {
		const baseA = a.split("/").pop() ?? a;
		const baseB = b.split("/").pop() ?? b;
		return baseA.localeCompare(baseB, undefined, { sensitivity: "base" });
	});
}

function entrySearchText(entry: LexiconEntry): string {
	const parts = [entry.term];
	if (entry.termPlural) parts.push(entry.termPlural);
	for (const alias of entry.aliases) {
		parts.push(alias.name);
		if (alias.plural) parts.push(alias.plural);
	}
	parts.push(entry.body.slice(0, BODY_SEARCH_LEN));
	return parts.join("\n").toLowerCase();
}

/** Non-draft entries sorted alphabetically by term. */
export function browsableEntries(entries: Iterable<LexiconEntry>): LexiconEntry[] {
	return [...entries]
		.filter((e) => !e.draft)
		.sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: "base" }));
}

/** True when every source file is explicitly disabled. */
export function noSourcesSelected(disabledFiles: Set<string>, allFiles: string[]): boolean {
	return allFiles.length > 0 && disabledFiles.size === allFiles.length;
}

/**
 * Filter entries by enabled source files and search query.
 * Pass `null` for enabledFiles when all sources are enabled.
 * Pass an empty Set when no sources are enabled (returns []).
 */
export function filterEntries(
	entries: LexiconEntry[],
	query: string,
	enabledFiles: Set<string> | null,
): LexiconEntry[] {
	const q = query.trim().toLowerCase();
	if (enabledFiles !== null && enabledFiles.size === 0) return [];

	return browsableEntries(entries).filter((entry) => {
		if (enabledFiles !== null && !enabledFiles.has(entry.file)) return false;
		if (!q) return true;
		return entrySearchText(entry).includes(q);
	});
}

/** True when every known source file is enabled. */
export function allSourcesEnabled(disabledFiles: Set<string>, allFiles: string[]): boolean {
	return disabledFiles.size === 0;
}
