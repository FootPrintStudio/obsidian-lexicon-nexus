# Lexicon Nexus

FootPrintStudio vault glossary for Obsidian — consolidated Lexicon markdown files, Reading view highlights, hover and click popovers, and a searchable definition browser.

Repository: [FootPrintStudio/obsidian-lexicon-nexus](https://github.com/FootPrintStudio/obsidian-lexicon-nexus)

## Quick start

1. Enable **Lexicon Nexus** under Community plugins.
2. Set **Dictionary folder** (default `Dictionary`).
3. Add `.md` files using the [Lexicon entry format](docs/GUIDE.md).
4. Open notes in **Reading view** — defined terms are underlined; hover or click for the definition.

See **Settings → Guide** in Obsidian for the full language reference and optional requirements.

## Entry format (summary)

```markdown
# Term Name {Plural if relevant}
(Optional requirements: Case, Whole, Partial, Priority: 10, …)

[Alias one {Plural}, Alias two]
Markdown definition body.

---
```

## Commands

| Command | Description |
|---------|-------------|
| **Refresh lexicon index** | Rebuild index from dictionary folder |
| **Search lexicon definitions** | Browse all definitions — search, preview, filter by source file |
| **Go to lexicon definition** | Open dictionary file at term (selection, cursor, or word under cursor) |

In Reading view: select a term and run the command, click the source filename in the popover, Ctrl/Cmd+click a highlighted term, or middle-click a term.

## Settings

The settings UI includes **README** and **Guide** tabs with in-app documentation.

| Setting | Default | Description |
|---------|---------|-------------|
| **Dictionary folder** | `Dictionary` | All `.md` files under this folder are indexed |
| **Enable in Reading view** | on | Highlight terms and show popovers |
| **Popover trigger** | Hover and click | Use **Click only** on touch devices |
| **Case-sensitive matching (global)** | off | Unless an entry has the `Case` requirement |
| **Show source file in popover** | on | Hidden when entry has `Plain` |
| **Refresh on metadata change** | off | Re-render Reading view when frontmatter changes |
| **Max match forms for highlighting** | 2500 | Pause highlights when index exceeds this (0 = unlimited) |
| **Max text node length** | 10000 | Skip scanning very long text nodes (0 = unlimited) |
| **Debug mode** | off | Log warnings and errors to the console |

The Settings tab shows current index size and any parse warnings.

## v0.2.0 features

- Consolidated Lexicon dictionary format with optional requirement flags
- Reading view term highlighting, hover/click popovers, goto definition
- Per-note scoping via `lexicon-context` frontmatter
- Definition browser modal (search, preview, source-file filters)
- Performance guardrails for large dictionaries (form limits, text-node limits, first-char scan buckets)
- Settings README and Guide tabs
- Unit test suite (`bash test.sh`)

## Per-note scoping

Use frontmatter `lexicon-context` (YAML list of file/folder paths) to limit which dictionary files apply to a note. Entries with the `Global` requirement are always available.

Legacy `def-context` is also read for compatibility.

## Performance

Large dictionaries are supported with guardrails:

- **First-character buckets** reduce scan work per text node.
- **Max match forms** pauses Reading-view highlighting when the index grows too large (search and goto still work).
- **Max text node length** skips scanning individual DOM text nodes that exceed the limit.

Raise limits in Settings → Performance if you have a powerful machine and a very large glossary.

## Build & test

```bash
cd .obsidian/plugins/lexicon-nexus
bash build.sh      # writes main.js
bash test.sh       # unit tests in /tmp
```

Enable **Lexicon Nexus** under Community plugins, then reload after rebuilding.

Manual smoke test: open `Lexicon Nexus Test/00 Smoke Test.md` in Reading view. See [TESTING.md](TESTING.md).

## Documentation

| File | Purpose |
|------|---------|
| [docs/GUIDE.md](docs/GUIDE.md) | Full format and requirements reference (Settings → Guide) |
| [TESTING.md](TESTING.md) | Manual and automated test checklist |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No highlights | Reading view enabled? Dictionary folder correct? Run **Refresh lexicon index** |
| Highlights paused notice | Index exceeds **Max match forms** — raise limit or split dictionary |
| Scoping seems ignored | Add `lexicon-context` to note frontmatter; wait for rerender or reopen note |
| Term in code not highlighting | Expected unless entry has `NoCode` — default allows code matches |
| Warnings after refresh | Open Settings — warnings list shows parse issues |

## License

MIT — see [LICENSE](LICENSE).
