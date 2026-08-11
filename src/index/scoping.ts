import type { App } from "obsidian";
import { TFile, TFolder, normalizePath } from "obsidian";
import { buildDefinitionIndex } from "./definitionIndex";
import type { DefinitionIndex } from "../types";

/** Normalize lexicon-context path values (plain, wikilink, optional .md). */
export function normalizeContextPath(raw: string): string {
	let p = raw.trim();
	const wiki = /^\[\[(.+?)\]\]$/.exec(p);
	if (wiki) p = wiki[1]!;
	if (p.includes("|")) p = p.split("|")[0]!.trim();
	return normalizePath(p);
}

/** Resolve context paths to a set of markdown file vault paths (sync). */
export function resolveContextFilePaths(app: App, contextPaths: string[]): Set<string> {
	const out = new Set<string>();
	for (const raw of contextPaths) {
		const normalized = normalizeContextPath(raw);
		let abstract = app.vault.getAbstractFileByPath(normalized);
		if (!abstract && !normalized.endsWith(".md")) {
			abstract = app.vault.getAbstractFileByPath(`${normalized}.md`);
		}
		if (abstract instanceof TFile && abstract.extension === "md") {
			out.add(abstract.path);
			continue;
		}
		if (abstract instanceof TFolder) {
			for (const f of app.vault.getMarkdownFiles()) {
				if (f.path === normalized || f.path.startsWith(`${normalized}/`)) {
					out.add(f.path);
				}
			}
		}
	}
	return out;
}

/** Filter global index to scoped files plus Global entries (sync). */
export function filterGlobalIndexByContext(
	globalIndex: DefinitionIndex,
	allowedFiles: Set<string>,
): DefinitionIndex {
	if (allowedFiles.size === 0) {
		const globals = [...globalIndex.entries.values()].filter((e) => e.global);
		return buildDefinitionIndex(globals);
	}
	const entries = [...globalIndex.entries.values()].filter(
		(e) => e.global || allowedFiles.has(e.file),
	);
	return buildDefinitionIndex(entries);
}

/** True when async scope may include files outside the current global index. */
export function needsAsyncScopeEnrichment(
	app: App,
	contextPaths: string[],
	globalIndex: DefinitionIndex,
): boolean {
	const allowed = resolveContextFilePaths(app, contextPaths);
	for (const filePath of allowed) {
		const hasEntry = [...globalIndex.entries.values()].some((e) => e.file === filePath);
		if (!hasEntry) return true;
	}
	return false;
}
