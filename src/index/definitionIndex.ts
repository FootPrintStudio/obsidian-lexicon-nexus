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
	const formsByFirstChar = buildFormsByFirstChar(sortedForms);

	return { entries: entriesMap, forms, sortedForms, formsByFirstChar };
}

function buildFormsByFirstChar(forms: MatchForm[]): Map<string, MatchForm[]> {
	const buckets = new Map<string, MatchForm[]>();
	for (const form of forms) {
		if (!form.text) continue;
		const key = form.text[0]!.toLowerCase();
		const bucket = buckets.get(key);
		if (bucket) bucket.push(form);
		else buckets.set(key, [form]);
	}
	for (const bucket of buckets.values()) {
		bucket.sort((a, b) => b.text.length - a.text.length);
	}
	return buckets;
}
