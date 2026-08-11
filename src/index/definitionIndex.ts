import { expandAllForms } from "../parser/forms";
import type { DefinitionIndex, LexiconEntry, MatchForm, ParseWarning } from "../types";

export function buildDefinitionIndex(
	entries: LexiconEntry[],
	warnings: ParseWarning[] = [],
): DefinitionIndex {
	const entriesMap = new Map<string, LexiconEntry>();
	const keyToForm = new Map<string, MatchForm>();

	for (const entry of entries) {
		entriesMap.set(entry.id, entry);
	}

	const allForms = expandAllForms(entries);
	for (const form of allForms) {
		const key = form.entry.caseSensitive ? form.text : form.text.toLowerCase();
		if (keyToForm.has(key)) {
			warnings.push({
				file: form.entry.file,
				line: form.entry.line,
				message: `Duplicate match key "${form.text}" — last wins`,
			});
		}
		keyToForm.set(key, form);
	}

	const forms = [...keyToForm.values()];
	const sortedForms = [...forms].sort((a, b) => b.text.length - a.text.length);

	return { entries: entriesMap, forms, sortedForms };
}
