# Lexicon Nexus

FootPrintStudio vault glossary for Obsidian — consolidated Lexicon markdown files, Reading view highlights, hover and click popovers.

## Quick start

1. Enable **Lexicon Nexus** under Community plugins.
2. Set **Dictionary folder** (default `Dictionary`).
3. Add `.md` files using the [Lexicon entry format](docs/GUIDE.md).
4. Open notes in **Reading view** — defined terms are underlined; hover or click for the definition.

## Entry format (summary)

```markdown
# Term Name {Plural if relevant}
(Optional requirements: Case, Whole, Partial, Priority: 10, …)

[Alias one {Plural}, Alias two]
Markdown definition body.

---
```

See [docs/GUIDE.md](docs/GUIDE.md) for the full grammar and requirements reference.

## Commands

| Command | Description |
|---------|-------------|
| **Refresh lexicon index** | Rebuild index from dictionary folder |
| **Go to lexicon definition** | Open dictionary file at term (selection, cursor, or word under cursor in editor) |

In Reading view: select a term and run the command, click the source filename in the popover, Ctrl/Cmd+click a highlighted term, or middle-click a term.

## Settings

| Setting | Default |
|---------|---------|
| Dictionary folder | `Dictionary` |
| Enable in Reading view | on |
| Popover trigger | Hover and click |
| Case-sensitive matching (global) | off |
| Show source file in popover | on |
| Debug mode | off |

## Per-note scoping

Use frontmatter `lexicon-context` (YAML array of file/folder paths) to limit which dictionary files apply to a note. Entries with the `Global` requirement are always available.

Legacy `def-context` is also read for compatibility.

## Build & test

```bash
cd .obsidian/plugins/lexicon-nexus
bash build.sh
bash test.sh
```

## License

MIT
