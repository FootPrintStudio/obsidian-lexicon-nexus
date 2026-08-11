import type { DefinitionIndex, MatchForm } from "./types";
import { scanText } from "./index/scanner";

export function findMatchForm(
	index: DefinitionIndex,
	word: string,
	globalCaseSensitive: boolean,
): MatchForm | null {
	const trimmed = word.trim();
	if (!trimmed) return null;

	for (const form of index.forms) {
		const caseSensitive = form.entry.caseSensitive || globalCaseSensitive;
		if (caseSensitive) {
			if (form.text === trimmed) return form;
		} else if (form.text.toLowerCase() === trimmed.toLowerCase()) {
			return form;
		}
	}
	return null;
}

/** Longest indexed match on a line that contains the cursor column. */
export function findMatchAtCursor(
	index: DefinitionIndex,
	line: string,
	cursorCh: number,
	globalCaseSensitive: boolean,
): MatchForm | null {
	const matches = scanText(line, index, globalCaseSensitive);
	let best: MatchForm | null = null;
	let bestLen = -1;
	for (const m of matches) {
		if (cursorCh >= m.start && cursorCh <= m.end) {
			const len = m.end - m.start;
			if (len > bestLen || (len === bestLen && m.form.entry.priority > (best?.entry.priority ?? -1))) {
				best = m.form;
				bestLen = len;
			}
		}
	}
	return best;
}
