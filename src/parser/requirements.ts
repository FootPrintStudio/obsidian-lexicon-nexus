import type { LexiconEntry, LexiconRequirement } from "../types";

const FLAG_NAMES = new Set([
	"none",
	"case",
	"whole",
	"partial",
	"draft",
	"global",
	"nohighlight",
	"nolink",
	"nocode",
	"plain",
	"once",
	"nospace",
]);

const PRIORITY_RE = /^priority\s*:\s*(\d+)$/i;

export function parseRequirementsLine(line: string): LexiconRequirement[] {
	const out: LexiconRequirement[] = [];
	for (const raw of line.split(",")) {
		const token = raw.trim();
		if (!token) continue;
		const priorityMatch = PRIORITY_RE.exec(token);
		if (priorityMatch) {
			out.push({ kind: "Priority", value: Number(priorityMatch[1]) });
			continue;
		}
		const key = token.toLowerCase();
		if (!FLAG_NAMES.has(key)) continue;
		const normalized =
			key === "none"
				? "None"
				: key === "case"
					? "Case"
					: key === "whole"
						? "Whole"
						: key === "partial"
							? "Partial"
							: key === "draft"
								? "Draft"
								: key === "global"
									? "Global"
									: key === "nohighlight"
										? "NoHighlight"
										: key === "nolink"
											? "NoLink"
											: key === "nocode"
												? "NoCode"
												: key === "plain"
													? "Plain"
													: key === "once"
														? "Once"
														: "NoSpace";
		out.push(normalized);
	}
	return out;
}

export function applyRequirements(requirements: LexiconRequirement[]): Pick<
	LexiconEntry,
	| "priority"
	| "caseSensitive"
	| "matchMode"
	| "draft"
	| "global"
	| "noHighlight"
	| "noLink"
	| "noCode"
	| "plainPopover"
	| "once"
	| "noSpace"
> {
	let priority = 0;
	let hasWhole = false;
	let hasPartial = false;
	let draft = false;
	let global = false;
	let noHighlight = false;
	let noLink = false;
	let noCode = false;
	let plainPopover = false;
	let once = false;
	let noSpace = false;
	let caseSensitive = false;

	for (const req of requirements) {
		if (typeof req === "object" && req.kind === "Priority") {
			priority = req.value;
			continue;
		}
		switch (req) {
			case "Case":
				caseSensitive = true;
				break;
			case "Whole":
				hasWhole = true;
				break;
			case "Partial":
				hasPartial = true;
				break;
			case "Draft":
				draft = true;
				break;
			case "Global":
				global = true;
				break;
			case "NoHighlight":
				noHighlight = true;
				break;
			case "NoLink":
				noLink = true;
				break;
			case "NoCode":
				noCode = true;
				break;
			case "Plain":
				plainPopover = true;
				break;
			case "Once":
				once = true;
				break;
			case "NoSpace":
				noSpace = true;
				break;
			case "None":
				break;
		}
	}

	const matchMode = hasPartial ? "partial" : "whole";

	return {
		priority,
		caseSensitive,
		matchMode,
		draft,
		global,
		noHighlight,
		noLink,
		noCode,
		plainPopover,
		once,
		noSpace,
	};
}

export function hasWholePartialConflict(requirements: LexiconRequirement[]): boolean {
	let whole = false;
	let partial = false;
	for (const req of requirements) {
		if (req === "Whole") whole = true;
		if (req === "Partial") partial = true;
	}
	return whole && partial;
}
