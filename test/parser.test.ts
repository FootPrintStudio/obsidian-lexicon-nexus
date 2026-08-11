import { describe, expect, it } from "vitest";
import { parseConsolidatedFile } from "../src/parser/consolidated";
import { expandMatchForms } from "../src/parser/forms";
import { parseRequirementsLine, applyRequirements } from "../src/parser/requirements";
import { buildDefinitionIndex } from "../src/index/definitionIndex";
import { scanText } from "../src/index/scanner";

describe("parseRequirementsLine", () => {
	it("parses comma-separated flags and priority", () => {
		const reqs = parseRequirementsLine("Case, Whole, NoLink, Priority: 10");
		expect(reqs).toContain("Case");
		expect(reqs).toContain("Whole");
		expect(reqs).toContain("NoLink");
		expect(reqs.some((r) => typeof r === "object" && r.kind === "Priority" && r.value === 10)).toBe(
			true,
		);
	});

	it("applies derived flags", () => {
		const flags = applyRequirements(parseRequirementsLine("Case, Partial, Draft, Global, Once, Plain"));
		expect(flags.caseSensitive).toBe(true);
		expect(flags.matchMode).toBe("partial");
		expect(flags.draft).toBe(true);
		expect(flags.global).toBe(true);
		expect(flags.once).toBe(true);
		expect(flags.plainPopover).toBe(true);
	});
});

describe("parseConsolidatedFile", () => {
	it("parses Dog and The Met examples", () => {
		const sample = `# Dog {Dogs}
Whole

[Hound {Hounds}, Canine {Canines}]
Dogs are loving four-legged pets.

---

# The Met
Case, Whole, NoLink, Priority: 10

[The Metropolitan Museum of Art]
The Met presents over 5,000 years of art.`;

		const { entries } = parseConsolidatedFile(sample, "test.md");
		expect(entries).toHaveLength(2);

		const dog = entries[0]!;
		expect(dog.term).toBe("Dog");
		expect(dog.termPlural).toBe("Dogs");
		expect(dog.matchMode).toBe("whole");
		expect(dog.aliases).toHaveLength(2);

		const met = entries[1]!;
		expect(met.term).toBe("The Met");
		expect(met.caseSensitive).toBe(true);
		expect(met.priority).toBe(10);
		expect(met.noLink).toBe(true);
	});

	it("parses obsidian global entry", () => {
		const sample = `# obsidian
Global, Whole

[Obsidian]
The knowledge base app.`;
		const { entries } = parseConsolidatedFile(sample, "Dictionary/consolidated.md");
		expect(entries[0]?.global).toBe(true);
	});

	it("skips draft entries in index", () => {
		const sample = `# WIP
Draft

[wip]
Not indexed yet.`;
		const { entries } = parseConsolidatedFile(sample, "draft.md");
		expect(entries[0]?.draft).toBe(true);
		const index = buildDefinitionIndex(entries);
		expect(index.forms).toHaveLength(0);
	});
});

describe("expandMatchForms", () => {
	it("includes manual plurals", () => {
		const { entries } = parseConsolidatedFile(
			`# Dog {Dogs}
[Hound {Hounds}]
Body`,
			"t.md",
		);
		const forms = expandMatchForms(entries[0]!);
		const texts = forms.map((f) => f.text);
		expect(texts).toContain("Dog");
		expect(texts).toContain("Dogs");
		expect(texts).toContain("Hound");
		expect(texts).toContain("Hounds");
	});
});

describe("scanText", () => {
	it("matches whole words only by default", () => {
		const { entries } = parseConsolidatedFile(`# Dog {Dogs}\nWhole\n\nBody`, "t.md");
		const index = buildDefinitionIndex(entries);
		const matches = scanText("hotdog and Dog", index, false);
		expect(matches).toHaveLength(1);
		expect(matches[0]!.form.text).toBe("Dog");
	});

	it("respects case requirement", () => {
		const { entries } = parseConsolidatedFile(`# The Met\nCase, Whole\n\nBody`, "t.md");
		const index = buildDefinitionIndex(entries);
		expect(scanText("the met", index, false)).toHaveLength(0);
		expect(scanText("The Met", index, false)).toHaveLength(1);
	});

	it("supports partial matching", () => {
		const { entries } = parseConsolidatedFile(`# meta\nPartial\n\nBody`, "t.md");
		const index = buildDefinitionIndex(entries);
		const matches = scanText("metadata", index, false);
		expect(matches.some((m) => m.form.text === "meta")).toBe(true);
	});
});
