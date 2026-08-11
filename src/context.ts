import type { App } from "obsidian";
import { TFile, TFolder, normalizePath } from "obsidian";
import { parseConsolidatedFile } from "./parser/consolidated";
import { buildDefinitionIndex } from "./index/definitionIndex";
import {
	filterGlobalIndexByContext,
	resolveContextFilePaths,
} from "./index/scoping";
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

function coerceContextPath(value: unknown): string | null {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (value && typeof value === "object") {
		const obj = value as Record<string, unknown>;
		if (typeof obj.link === "string") return obj.link.trim() || null;
		if (typeof obj.path === "string") return obj.path.trim() || null;
	}
	return null;
}

export function getLexiconContextPaths(frontmatter: Record<string, unknown> | undefined): string[] {
	if (!frontmatter) return [];
	const raw = frontmatter["lexicon-context"] ?? frontmatter["def-context"];
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw.flatMap((item) => {
			const path = coerceContextPath(item);
			return path ? [path] : [];
		});
	}
	const single = coerceContextPath(raw);
	return single ? [single] : [];
}

export async function buildScopedIndex(
	app: App,
	globalIndex: DefinitionIndex,
	contextPaths: string[],
): Promise<DefinitionIndex> {
	if (contextPaths.length === 0) return globalIndex;

	const allowedFiles = resolveContextFilePaths(app, contextPaths);
	const scoped = filterGlobalIndexByContext(globalIndex, allowedFiles);

	const globalFiles = new Set([...globalIndex.entries.values()].map((e) => e.file));
	const extraEntries: LexiconEntry[] = [];
	const warnings: ParseWarning[] = [];

	for (const filePath of allowedFiles) {
		if (globalFiles.has(filePath)) continue;
		const abstract = app.vault.getAbstractFileByPath(filePath);
		if (!(abstract instanceof TFile) || abstract.extension !== "md") continue;
		try {
			const content = await app.vault.read(abstract);
			const result = parseConsolidatedFile(content, abstract.path);
			extraEntries.push(...result.entries);
			warnings.push(...result.warnings);
		} catch (e) {
			warnings.push({ file: abstract.path, message: String(e) });
		}
	}

	if (extraEntries.length === 0) return scoped;
	return buildDefinitionIndex([...scoped.entries.values(), ...extraEntries], warnings);
}

export function isUnderDictionaryFolder(filePath: string, dictionaryFolder: string): boolean {
	const norm = normalizePath(filePath);
	const folder = normalizePath(dictionaryFolder);
	return norm === folder || norm.startsWith(folder + "/");
}
