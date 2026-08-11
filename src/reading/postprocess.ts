import type { App, MarkdownPostProcessorContext } from "obsidian";
import { scanText, shouldSkipElement } from "../index/scanner";
import { resolvePerformanceLimits, shouldSkipHighlighting, shouldSkipTextNode } from "../performance";
import type { DefinitionIndex, LexiconNexusSettings } from "../types";
import { LexiconPopoverManager } from "./popover";

export function processLexiconInElement(
	app: App,
	element: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	index: DefinitionIndex,
	settings: LexiconNexusSettings,
	popoverManager: LexiconPopoverManager,
): void {
	if (!settings.enableInReadingView) return;
	if (index.sortedForms.length === 0) return;

	const limits = resolvePerformanceLimits(settings);
	if (shouldSkipHighlighting(index, limits)) return;

	const onceSeen = new Set<string>();
	walkElement(app, element, ctx, index, settings, popoverManager, onceSeen, limits);
}

function walkElement(
	app: App,
	root: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	index: DefinitionIndex,
	settings: LexiconNexusSettings,
	popoverManager: LexiconPopoverManager,
	onceSeen: Set<string>,
	limits: ReturnType<typeof resolvePerformanceLimits>,
): void {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const parent = node.parentElement;
			if (!parent) return NodeFilter.FILTER_REJECT;
			if (parent.closest(`.lxn-term, script, style`)) return NodeFilter.FILTER_REJECT;
			const text = node.textContent ?? "";
			if (!text.trim()) return NodeFilter.FILTER_REJECT;
			if (shouldSkipTextNode(text.length, limits)) return NodeFilter.FILTER_REJECT;
			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const textNodes: Text[] = [];
	let n: Node | null;
	while ((n = walker.nextNode())) {
		textNodes.push(n as Text);
	}

	for (const textNode of textNodes) {
		try {
			processTextNode(app, textNode, ctx, index, settings, popoverManager, onceSeen);
		} catch (e) {
			if (settings.debugMode) {
				console.debug("[Lexicon Nexus] post-process node error:", e);
			}
		}
	}
}

function processTextNode(
	app: App,
	textNode: Text,
	ctx: MarkdownPostProcessorContext,
	index: DefinitionIndex,
	settings: LexiconNexusSettings,
	popoverManager: LexiconPopoverManager,
	onceSeen: Set<string>,
): void {
	const parent = textNode.parentElement;
	if (!parent) return;

	const text = textNode.textContent ?? "";
	const matches = scanText(text, index, settings.caseSensitive, onceSeen);
	if (matches.length === 0) return;

	const filtered = matches.filter((m) => {
		const entry = m.form.entry;
		if (entry.noHighlight) return false;
		if (entry.noLink && parent.closest("a")) return false;
		if (entry.noCode && parent.closest("code, pre")) return false;
		if (shouldSkipElement(parent, entry)) return false;
		return true;
	});

	if (filtered.length === 0) return;

	const frag = document.createDocumentFragment();
	let last = 0;
	for (const m of filtered) {
		if (m.start > last) {
			frag.appendChild(document.createTextNode(text.slice(last, m.start)));
		}
		const span = document.createElement("span");
		span.className = "lxn-term";
		span.textContent = text.slice(m.start, m.end);
		span.dataset.lxnEntry = m.form.entry.id;
		popoverManager.attach(span, m.form.entry, settings);
		frag.appendChild(span);
		last = m.end;
	}
	if (last < text.length) {
		frag.appendChild(document.createTextNode(text.slice(last)));
	}

	parent.replaceChild(frag, textNode);
}
