# Lexicon Nexus — Language Guide

Lexicon entries live in ordinary markdown files under your **Dictionary folder**. Each file may contain multiple terms.

## Entry structure

```markdown
# Term Name {Plural if relevant}
(Optional requirements line)

[Alias one {Alias one plural}, Alias two]
Markdown definition body.

---
```

### Header

`# Term Name {Plural}` — primary term and optional manual plural form.

### Requirements (optional)

Comma-separated flags on the line after the header:

| Flag | Effect |
|------|--------|
| `None` | No special rules (line may be omitted) |
| `Case` | Case-sensitive matching for this entry |
| `Whole` | Whole-word match only (default) |
| `Partial` | Substring match allowed |
| `Priority: N` | Higher wins when spans overlap |
| `Draft` | Not indexed (work in progress) |
| `Global` | Always available even with `lexicon-context` scoping |
| `NoHighlight` | Indexed but not underlined in Reading view |
| `NoLink` | Do not match inside links |
| `NoCode` | Do not match inside code spans |
| `Plain` | Popover shows definition body only |
| `Once` | Highlight first occurrence per note only |
| `NoSpace` | Literal token match (no word boundaries) |

### Aliases

`[Alias {Plural}, Alias two]` — bracket line, comma-separated. Manual plurals only; no auto-pluralization.

### Body

Markdown rendered in the popover.

## Examples

```markdown
# Dog {Dogs}
Whole

[Hound {Hounds}, Canine {Canines}]
Dogs are loving four-legged pets.

---

# The Met
Case, Whole, NoLink, Priority: 10

[The Metropolitan Museum of Art]
The Met presents over 5,000 years of art from around the world.
```

## Per-note scoping

Frontmatter on any note:

```yaml
lexicon-context:
  - Dictionary/consolidated.md
  - Dictionary/special/
```

Only listed paths are indexed for that note, plus any entry with the `Global` requirement.

Legacy `def-context` is also supported.

## Editing workflow

1. Edit dictionary markdown files directly.
2. Index updates automatically when dictionary files change.
3. Use **Refresh lexicon index** if needed.

See [README.md](../README.md) for settings and commands.
