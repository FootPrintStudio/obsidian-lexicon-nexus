import { describe, expect, it } from "vitest";
import { parseConsolidatedFile } from "../src/parser/consolidated";
import { buildDefinitionIndex } from "../src/index/definitionIndex";
import {
	allSourcesEnabled,
	browsableEntries,
	filterEntries,
	listSourceFiles,
	noSourcesSelected,
} from "../src/ui/definitionSearch";
import {
	formatAliasesLabel,
	formatRequirementsLine,
	formatTermLabel,
} from "../src/ui/renderDefinitionPreview";

function entriesFrom(markdown: string, file = "Dictionary/a.md") {
	const { entries } = parseConsolidatedFile(markdown, file);
	return [...buildDefinitionIndex(entries).entries.values()];
}

describe("listSourceFiles", () => {
	it("returns unique paths sorted by basename", () => {
		const a = entriesFrom("# alpha\n\nBody.", "Dictionary/zebra.md");
		const b = entriesFrom("# beta\n\nBody.", "Dictionary/alpha.md");
		expect(listSourceFiles([...a, ...b])).toEqual(["Dictionary/alpha.md", "Dictionary/zebra.md"]);
	});

	it("includes only files with at least one non-draft entry", () => {
		const live = entriesFrom("# live\n\nBody.", "Dictionary/live.md");
		const draft = entriesFrom("# hidden\nDraft\n\nBody.", "Dictionary/draft-only.md");
		expect(listSourceFiles([...live, ...draft])).toEqual(["Dictionary/live.md"]);
	});
});

describe("browsableEntries", () => {
	it("excludes draft and sorts by term", () => {
		const entries = entriesFrom(`# zebra\n\nZ.\n\n---\n\n# alpha\nDraft\n\nA.\n\n---\n\n# beta\n\nB.`);
		const terms = browsableEntries(entries).map((e) => e.term);
		expect(terms).toEqual(["beta", "zebra"]);
	});
});

describe("filterEntries", () => {
	const entries = entriesFrom(`# alpha\n\nAlpha body.\n\n---\n\n# beta\n\n[AliasName]\nBeta body.\n\n---\n\n# gamma\nDraft\n\nHidden.`);

	it("matches term substring", () => {
		expect(filterEntries(entries, "alp", null).map((e) => e.term)).toEqual(["alpha"]);
	});

	it("matches alias name", () => {
		expect(filterEntries(entries, "aliasname", null).map((e) => e.term)).toEqual(["beta"]);
	});

	it("matches body snippet", () => {
		expect(filterEntries(entries, "beta body", null).map((e) => e.term)).toEqual(["beta"]);
	});

	it("excludes entries from deselected files", () => {
		const multi = [
			...entriesFrom("# one\n\nBody.", "Dictionary/a.md"),
			...entriesFrom("# two\n\nBody.", "Dictionary/b.md"),
		];
		const result = filterEntries(multi, "", new Set(["Dictionary/a.md"]));
		expect(result.map((e) => e.term)).toEqual(["one"]);
	});

	it("returns nothing when no sources enabled", () => {
		expect(filterEntries(entries, "", new Set()).length).toBe(0);
	});

	it("excludes draft entries", () => {
		expect(filterEntries(entries, "gamma", null).length).toBe(0);
	});
});

describe("noSourcesSelected", () => {
	it("is false when all sources enabled", () => {
		expect(noSourcesSelected(new Set(), ["a.md", "b.md"])).toBe(false);
	});

	it("is true when every source disabled", () => {
		expect(noSourcesSelected(new Set(["a.md", "b.md"]), ["a.md", "b.md"])).toBe(true);
	});
});

describe("format helpers", () => {
	it("formats requirements including priority", () => {
		expect(formatRequirementsLine(["Case", "Whole", { kind: "Priority", value: 10 }])).toBe(
			"Case, Whole, Priority: 10",
		);
		expect(formatRequirementsLine([])).toBe("None");
	});

	it("formats term and alias plurals", () => {
		const [entry] = entriesFrom("# Dog {Dogs}\n\n[Hound {Hounds}]\nBody.");
		expect(formatTermLabel(entry!)).toBe("Dog · Dogs");
		expect(formatAliasesLabel(entry!.aliases)).toBe("Hound · Hounds");
	});
});

describe("allSourcesEnabled", () => {
	it("is true when no files are disabled", () => {
		expect(allSourcesEnabled(new Set(), ["a", "b"])).toBe(true);
	});

	it("is false when any file is disabled", () => {
		expect(allSourcesEnabled(new Set(["a"]), ["a", "b"])).toBe(false);
	});
});
