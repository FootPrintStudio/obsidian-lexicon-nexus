import { applyRequirements, hasWholePartialConflict, parseRequirementsLine } from "./requirements";
import type { LexiconAlias, LexiconEntry, ParseResult, ParseWarning } from "../types";
import { entryId } from "../types";

const HEADER_RE = /^#\s+(.+?)(?:\s+\{([^}]+)\})?\s*$/;
const ALIAS_LINE_RE = /^\[(.+)\]\s*$/;
const ALIAS_ENTRY_RE = /([^,{]+?)(?:\s+\{([^}]+)\})?(?:\s*,\s*|$)/g;
const DIVIDER_RE = /^---\s*$/;

function isRequirementsLine(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed) return false;
	if (trimmed.startsWith("#")) return false;
	if (trimmed.startsWith("[")) return false;
	if (DIVIDER_RE.test(trimmed)) return false;
	return true;
}

function parseAliasLine(line: string): LexiconAlias[] {
	const match = ALIAS_LINE_RE.exec(line.trim());
	if (!match) return [];
	const inner = match[1]!;
	const aliases: LexiconAlias[] = [];
	let m: RegExpExecArray | null;
	ALIAS_ENTRY_RE.lastIndex = 0;
	while ((m = ALIAS_ENTRY_RE.exec(inner)) !== null) {
		const name = m[1]!.trim();
		if (!name) continue;
		aliases.push({ name, plural: m[2]?.trim() || undefined });
	}
	return aliases;
}

function parseHeader(line: string): { term: string; plural?: string } | null {
	const match = HEADER_RE.exec(line.trim());
	if (!match) return null;
	return { term: match[1]!.trim(), plural: match[2]?.trim() || undefined };
}

/** Strip optional YAML frontmatter; returns body lines only. */
export function stripFrontmatter(content: string): string[] {
	const lines = content.replace(/\r\n/g, "\n").split("\n");
	if (lines[0]?.trim() !== "---") return lines;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i]?.trim() === "---") {
			return lines.slice(i + 1);
		}
	}
	return lines;
}

export function parseConsolidatedFile(content: string, filePath: string): ParseResult {
	const lines = stripFrontmatter(content);
	const entries: LexiconEntry[] = [];
	const warnings: ParseWarning[] = [];

	let i = 0;
	while (i < lines.length) {
		const line = lines[i]!;
		const trimmed = line.trim();

		if (!trimmed || DIVIDER_RE.test(trimmed)) {
			i++;
			continue;
		}

		const header = parseHeader(trimmed);
		if (!header) {
			warnings.push({ file: filePath, line: i + 1, message: `Skipping non-header line: ${trimmed.slice(0, 40)}` });
			i++;
			continue;
		}

		const headerLine = i + 1;
		i++;

		let requirementsRaw = "";
		while (i < lines.length && !lines[i]!.trim()) i++;
		if (i < lines.length && isRequirementsLine(lines[i]!)) {
			requirementsRaw = lines[i]!.trim();
			i++;
		}

		const requirements = requirementsRaw ? parseRequirementsLine(requirementsRaw) : [];
		if (hasWholePartialConflict(requirements)) {
			warnings.push({
				file: filePath,
				line: headerLine,
				message: "Both Whole and Partial set; Partial wins",
			});
		}

		while (i < lines.length && !lines[i]!.trim()) i++;
		let aliases: LexiconAlias[] = [];
		if (i < lines.length && lines[i]!.trim().startsWith("[")) {
			aliases = parseAliasLine(lines[i]!);
			if (aliases.length === 0) {
				warnings.push({ file: filePath, line: i + 1, message: "Malformed alias line" });
			}
			i++;
		}

		while (i < lines.length && !lines[i]!.trim()) i++;
		const bodyLines: string[] = [];
		while (i < lines.length) {
			const bodyLine = lines[i]!;
			const bodyTrim = bodyLine.trim();
			if (parseHeader(bodyTrim) || DIVIDER_RE.test(bodyTrim)) break;
			bodyLines.push(bodyLine);
			i++;
		}

		const flags = applyRequirements(requirements);
		const entry: LexiconEntry = {
			id: entryId(filePath, headerLine, header.term),
			term: header.term,
			termPlural: header.plural,
			requirements,
			aliases,
			body: bodyLines.join("\n").trim(),
			file: filePath,
			line: headerLine,
			...flags,
		};
		entries.push(entry);
	}

	return { entries, warnings };
}
