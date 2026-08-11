import { describe, expect, it } from "vitest";
import { buildDefinitionIndex } from "../src/index/definitionIndex";
import { scanText } from "../src/index/scanner";
import {
	indexOverLimitMessage,
	shouldSkipHighlighting,
	shouldSkipTextNode,
} from "../src/performance";
import { parseConsolidatedFile } from "../src/parser/consolidated";
import { DEFAULT_SETTINGS } from "../src/types";

describe("performance guardrails", () => {
	it("skips highlighting when form count exceeds limit", () => {
		const entries = Array.from({ length: 5 }, (_, i) => {
			const { entries: parsed } = parseConsolidatedFile(`# term${i}\n\nBody.`, "t.md");
			return parsed[0]!;
		});
		const index = buildDefinitionIndex(entries);
		const limits = { maxHighlightForms: 3, maxTextNodeLength: 0 };
		expect(shouldSkipHighlighting(index, limits)).toBe(true);
		expect(indexOverLimitMessage(index, limits)).toContain("paused");
	});

	it("skips oversized text nodes", () => {
		const limits = { maxHighlightForms: 0, maxTextNodeLength: 100 };
		expect(shouldSkipTextNode(101, limits)).toBe(true);
		expect(shouldSkipTextNode(100, limits)).toBe(false);
	});
});

describe("formsByFirstChar buckets", () => {
	it("finds matches using first-character bucket", () => {
		const { entries } = parseConsolidatedFile(
			`# alpha\n\nA.\n\n---\n\n# beta\n\nB.`,
			"t.md",
		);
		const index = buildDefinitionIndex(entries);
		expect(index.formsByFirstChar.has("a")).toBe(true);
		expect(index.formsByFirstChar.has("b")).toBe(true);
		const matches = scanText("alpha beta", index, false);
		expect(matches.map((m) => m.form.text).sort()).toEqual(["alpha", "beta"]);
	});
});

describe("NoCode semantics", () => {
	it("parses NoCode requirement onto entry", () => {
		const { entries } = parseConsolidatedFile("# codeterm\nNoCode\n\nBody.", "t.md");
		expect(entries[0]!.noCode).toBe(true);
	});

	it("default entry does not set noCode", () => {
		const { entries } = parseConsolidatedFile("# plainterm\n\nBody.", "t.md");
		expect(entries[0]!.noCode).toBe(false);
	});
});

describe("settings defaults", () => {
	it("has performance defaults", () => {
		expect(DEFAULT_SETTINGS.maxHighlightForms).toBeGreaterThan(0);
		expect(DEFAULT_SETTINGS.maxTextNodeLength).toBeGreaterThan(0);
	});
});
