# Lexicon Nexus — Language Guide

Lexicon entries live in ordinary markdown files under your **Dictionary folder**. Each file may contain multiple terms.

See **Settings → Guide** in Obsidian for this document in-app.

## Entry structure

```markdown
# Term Name {Plural if relevant}
(Optional requirements line)

[Alias one {Alias one plural}, Alias two]
Markdown definition body.

---
```

Separate entries with a horizontal rule (`---`) or another `#` header.

### Header

`# Term Name {Plural}` — primary term and optional manual plural form in braces.

### Aliases

`[Alias {Plural}, Alias two]` — bracket line, comma-separated. Manual plurals only; no auto-pluralization.

### Body

Markdown rendered in popovers and the definition browser.

---

## Optional requirements

Comma-separated flags on the line after the header. Omit the line entirely for default behaviour (whole-word matching, case-insensitive unless global setting is on).

| Flag | Effect |
|------|--------|
| `None` | Explicitly no special rules (same as omitting the line) |
| `Case` | Case-sensitive matching for this entry |
| `Whole` | Whole-word match only (default when neither Whole nor Partial is set) |
| `Partial` | Substring match allowed |
| `Priority: N` | When two matches share the same start **and** length, higher N wins |
| `Draft` | Not indexed — invisible to highlights, goto, and browser |
| `Global` | Always available even when a note uses `lexicon-context` scoping |
| `NoHighlight` | Indexed but not underlined in Reading view (goto/browser still work) |
| `NoLink` | Do not match inside markdown links |
| `NoCode` | Do not match inside inline code or fenced blocks |
| `Plain` | Popover shows definition body only (browser modal always shows full detail) |
| `Once` | Highlight first occurrence per note only |
| `NoSpace` | Match without word-boundary checks (substring anywhere) |

### Requirement examples

```markdown
# caseword
Case, Whole
Matches exact case only.

---

# pin
Partial
Matches inside spellingpin, pin, pinnacle.

---

# linkterm
NoLink, Whole
Highlights standalone linkterm but not [linkterm](url).

---

# codeterm
NoCode, Whole
Highlights standalone codeterm but not `codeterm`.

---

# obsidian
Global, Whole, Plain
Always in scoped notes; minimal popover chrome.

---

# onceterm
Once, Whole
Only the first occurrence per note is underlined.
```

**Code spans:** By default, terms **do** match inside `` `inline code` `` and fenced blocks. Use `NoCode` to suppress matching there.

**Links:** By default, terms match inside link text. Use `NoLink` to suppress.

---

## Per-note scoping

Frontmatter on any note:

```yaml
lexicon-context:
  - Dictionary/consolidated.md
  - Dictionary/special/
```

Only listed paths are indexed for that note, plus any entry with the `Global` requirement.

Legacy `def-context` is also supported. Wikilink paths (`[[path]]`) and folders work.

---

## Commands

| Command | Description |
|---------|-------------|
| **Refresh lexicon index** | Rebuild from dictionary folder |
| **Search lexicon definitions** | Vault-wide browser with search and preview |
| **Go to lexicon definition** | Open dictionary file at term |

---

## Editing workflow

1. Edit dictionary markdown files directly.
2. Index updates automatically when dictionary files change.
3. Use **Refresh lexicon index** if needed.
4. Check **Settings** for index size, warnings, and performance limits.

See [README.md](../README.md) for settings and troubleshooting.
