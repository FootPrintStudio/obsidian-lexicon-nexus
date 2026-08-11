import { describe, expect, it } from "vitest";
import { getLexiconContextPaths } from "../src/context";
import { parseConsolidatedFile } from "../src/parser/consolidated";
import { buildDefinitionIndex } from "../src/index/definitionIndex";
import {
	filterGlobalIndexByContext,
	normalizeContextPath,
} from "../src/index/scoping";
import { findMatchAtCursor } from "../src/match";

describe("getLexiconContextPaths", () => {
	it("reads string and list frontmatter values", () => {
		expect(getLexiconContextPaths({ "lexicon-context": "Dictionary/a.md" })).toEqual([
			"Dictionary/a.md",
		]);
		expect(
			getLexiconContextPaths({ "lexicon-context": ["Dictionary/a.md", "Dictionary/b.md"] }),
		).toEqual(["Dictionary/a.md", "Dictionary/b.md"]);
	});

	it("coerces link-shaped property values", () => {
		expect(getLexiconContextPaths({ "lexicon-context": { link: "Dictionary/a.md" } })).toEqual([
			"Dictionary/a.md",
		]);
	});
});

describe("normalizeContextPath", () => {
	it("strips wikilink brackets", () => {
		expect(normalizeContextPath("[[Dictionary/consolidated.md]]")).toBe(
			"Dictionary/consolidated.md",
		);
	});
});

describe("filterGlobalIndexByContext", () => {
	it("includes only global entries and entries from allowed files", () => {
		const fileA = `# obsidian
Global, Whole

[Obsidian]
App.`;
		const fileB = `# local
Whole

Body.`;
		const { entries: entriesA } = parseConsolidatedFile(fileA, "Dictionary/a.md");
		const { entries: entriesB } = parseConsolidatedFile(fileB, "Dictionary/b.md");
		const global = buildDefinitionIndex([...entriesA, ...entriesB]);

		const scoped = filterGlobalIndexByContext(global, new Set(["Dictionary/b.md"]));
		const terms = [...scoped.entries.values()].map((e) => e.term);
		expect(terms).toContain("obsidian");
		expect(terms).toContain("local");
		expect(terms).not.toContain("sample");
	});

	it("excludes non-global entries outside allowed files", () => {
		const fileA = `# obsidian
Whole

App.`;
		const fileB = `# local
Whole

Body.`;
		const { entries: entriesA } = parseConsolidatedFile(fileA, "Dictionary/a.md");
		const { entries: entriesB } = parseConsolidatedFile(fileB, "Dictionary/b.md");
		const global = buildDefinitionIndex([...entriesA, ...entriesB]);

		const scoped = filterGlobalIndexByContext(global, new Set(["Dictionary/b.md"]));
		const terms = [...scoped.entries.values()].map((e) => e.term);
		expect(terms).not.toContain("obsidian");
		expect(terms).toContain("local");
	});
});

describe("findMatchAtCursor", () => {
	it("matches multi-word terms at cursor", () => {
		const sample = `# The Met
Case, Whole

Body.`;
		const { entries } = parseConsolidatedFile(sample, "t.md");
		const index = buildDefinitionIndex(entries);
		const form = findMatchAtCursor(index, "Visit The Met today", 8, false);
		expect(form?.text).toBe("The Met");
	});
});
