import type { App } from "obsidian";
import { TFile, TFolder, normalizePath } from "obsidian";
import { parseConsolidatedFile } from "./parser/consolidated";
import { buildDefinitionIndex } from "./index/definitionIndex";
import type { DefinitionIndex, LexiconEntry, ParseWarning } from "./types";

export function normalizeSettingsPath(folder: string): string {
	const trimmed = (folder ?? "").trim();
	return trimmed || "Dictionary";
}

export async function collectDictionaryFiles(app: App, folderPath: string): Promise<TFile[]> {
	const folder = app.vault.getAbstractFileByPath(normalizePath(folderPath));
	if (!(folder instanceof TFolder)) return [];

	const out: TFile[] = [];
	const stack: TFolder[] = [folder];
	while (stack.length > 0) {
		const current = stack.pop()!;
		for (const child of current.children) {
			if (child instanceof TFolder) stack.push(child);
			else if (child instanceof TFile && child.extension === "md") out.push(child);
		}
	}
	return out;
}

export async function buildIndexFromFolder(
	app: App,
	folderPath: string,
): Promise<{ index: DefinitionIndex; warnings: ParseWarning[] }> {
	const files = await collectDictionaryFiles(app, folderPath);
	const allEntries: LexiconEntry[] = [];
	const warnings: ParseWarning[] = [];

	for (const file of files) {
		try {
			const content = await app.vault.read(file);
			const result = parseConsolidatedFile(content, file.path);
			allEntries.push(...result.entries);
			warnings.push(...result.warnings);
		} catch (e) {
			warnings.push({
				file: file.path,
				message: e instanceof Error ? e.message : String(e),
			});
		}
	}

	return { index: buildDefinitionIndex(allEntries, warnings), warnings };
}

export function getLexiconContextPaths(frontmatter: Record<string, unknown> | undefined): string[] {
	if (!frontmatter) return [];
	const raw = frontmatter["lexicon-context"] ?? frontmatter["def-context"];
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map(String);
	if (typeof raw === "string") return [raw];
	return [];
}

export async function buildScopedIndex(
	app: App,
	globalIndex: DefinitionIndex,
	contextPaths: string[],
): Promise<DefinitionIndex> {
	if (contextPaths.length === 0) return globalIndex;

	const globalEntries = [...globalIndex.entries.values()].filter((e) => e.global);
	const contextEntries: LexiconEntry[] = [];
	const warnings: ParseWarning[] = [];
	const seen = new Set<string>();

	for (const path of contextPaths) {
		const normalized = normalizePath(path);
		const abstract = app.vault.getAbstractFileByPath(normalized);
		if (abstract instanceof TFile && abstract.extension === "md") {
			if (seen.has(abstract.path)) continue;
			seen.add(abstract.path);
			try {
				const content = await app.vault.read(abstract);
				const result = parseConsolidatedFile(content, abstract.path);
				contextEntries.push(...result.entries);
				warnings.push(...result.warnings);
			} catch (e) {
				warnings.push({ file: abstract.path, message: String(e) });
			}
		} else if (abstract instanceof TFolder) {
			const files = await collectDictionaryFiles(app, normalized);
			for (const file of files) {
				if (seen.has(file.path)) continue;
				seen.add(file.path);
				try {
					const content = await app.vault.read(file);
					const result = parseConsolidatedFile(content, file.path);
					contextEntries.push(...result.entries);
					warnings.push(...result.warnings);
				} catch (e) {
					warnings.push({ file: file.path, message: String(e) });
				}
			}
		}
	}

	return buildDefinitionIndex([...globalEntries, ...contextEntries], warnings);
}

export function isUnderDictionaryFolder(filePath: string, dictionaryFolder: string): boolean {
	const norm = normalizePath(filePath);
	const folder = normalizePath(dictionaryFolder);
	return norm === folder || norm.startsWith(folder + "/");
}
