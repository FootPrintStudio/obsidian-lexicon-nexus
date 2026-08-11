import type { LexiconEntry, MatchForm } from "../types";

export function expandMatchForms(entry: LexiconEntry): MatchForm[] {
	if (entry.draft) return [];

	const forms: MatchForm[] = [];
	const add = (text: string) => {
		const t = text.trim();
		if (!t) return;
		forms.push({ text: t, entry });
	};

	add(entry.term);
	if (entry.termPlural) add(entry.termPlural);
	for (const alias of entry.aliases) {
		add(alias.name);
		if (alias.plural) add(alias.plural);
	}
	return forms;
}

export function expandAllForms(entries: LexiconEntry[]): MatchForm[] {
	const out: MatchForm[] = [];
	for (const entry of entries) {
		out.push(...expandMatchForms(entry));
	}
	return out;
}
