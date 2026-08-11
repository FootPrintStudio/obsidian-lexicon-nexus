import type { DefinitionIndex, MatchForm } from "./types";

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
