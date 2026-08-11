import type { DefinitionIndex, MatchForm, TextMatch } from "../types";

const CJK_RE = /\p{Script=Han}/u;

function isWordChar(ch: string): boolean {
	return /[\w\p{Script=Han}]/u.test(ch);
}

function caseMatch(text: string, pos: number, formText: string, caseSensitive: boolean): boolean {
	const slice = text.slice(pos, pos + formText.length);
	if (caseSensitive) return slice === formText;
	return slice.toLowerCase() === formText.toLowerCase();
}

function wholeBoundaryOk(text: string, start: number, end: number): boolean {
	const before = start > 0 ? text[start - 1]! : "";
	const after = end < text.length ? text[end]! : "";
	const segment = text.slice(start, end);
	if (CJK_RE.test(segment)) {
		if (start > 0 && CJK_RE.test(before)) return false;
		if (end < text.length && CJK_RE.test(after)) return false;
		return true;
	}
	if (start > 0 && isWordChar(before)) return false;
	if (end < text.length && isWordChar(after)) return false;
	return true;
}

function formMatchesAt(text: string, pos: number, form: MatchForm, globalCaseSensitive: boolean): boolean {
	const entry = form.entry;
	const caseSensitive = entry.caseSensitive || globalCaseSensitive;
	if (!caseMatch(text, pos, form.text, caseSensitive)) return false;

	const end = pos + form.text.length;
	if (entry.noSpace) return true;
	if (entry.matchMode === "partial") return true;
	return wholeBoundaryOk(text, pos, end);
}


function resolveOverlaps(raw: TextMatch[], onceSeen?: Set<string>): TextMatch[] {
	raw.sort((a, b) => {
		if (a.start !== b.start) return a.start - b.start;
		const lenB = b.end - b.start;
		const lenA = a.end - a.start;
		if (lenB !== lenA) return lenB - lenA;
		return b.form.entry.priority - a.form.entry.priority;
	});

	const out: TextMatch[] = [];
	let cursor = 0;
	for (const m of raw) {
		if (m.start < cursor) continue;
		if (m.form.entry.once && onceSeen?.has(m.form.entry.id)) continue;
		out.push(m);
		if (m.form.entry.once) onceSeen?.add(m.form.entry.id);
		cursor = m.end;
	}
	return out;
}

/** Find non-overlapping matches in plain text. */
export function scanText(
	text: string,
	index: DefinitionIndex,
	globalCaseSensitive: boolean,
	onceSeen?: Set<string>,
): TextMatch[] {
	const raw: TextMatch[] = [];
	for (let pos = 0; pos < text.length; pos++) {
		const candidates = candidatesAt(index, text, pos);
		for (const form of candidates) {
			if (form.entry.once && onceSeen?.has(form.entry.id)) continue;
			if (!formMatchesAt(text, pos, form, globalCaseSensitive)) continue;
			raw.push({ start: pos, end: pos + form.text.length, form });
		}
	}
	return resolveOverlaps(raw, onceSeen);
}

function candidatesAt(index: DefinitionIndex, text: string, pos: number): MatchForm[] {
	const ch = text[pos]?.toLowerCase();
	if (!ch) return index.sortedForms;
	const bucket = index.formsByFirstChar.get(ch);
	return bucket ?? [];
}

export function shouldSkipElement(el: Element, entry: import("../types").LexiconEntry): boolean {
	if (entry.noLink && el.closest("a")) return true;
	if (entry.noCode && el.closest("code, pre")) return true;
	return false;
}
