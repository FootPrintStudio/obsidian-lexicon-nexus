# Lexicon Nexus — testing

## Unit tests

```bash
bash test.sh
```

**36 tests** across:

| File | Coverage |
|------|----------|
| `test/parser.test.ts` | Requirements parsing, consolidated grammar, scanner basics |
| `test/scoping.test.ts` | Context paths, scoped filter, cursor matching |
| `test/definitionSearch.test.ts` | Browser search/filter, format helpers |
| `test/performance.test.ts` | Performance guardrails, form buckets |

## Manual smoke test

Open [`Lexicon Nexus Test/00 Smoke Test.md`](../../Lexicon%20Nexus%20Test/00%20Smoke%20Test.md) in **Reading view** with Lexicon Nexus enabled.

Dictionary data: [`Dictionary/`](../../Dictionary/)

## Checklist

- [ ] **obsidian** underlined in Reading view
- [ ] Hover popover shows definition
- [ ] Click pins popover
- [ ] Ctrl/Cmd+click opens dictionary file
- [ ] **Go to lexicon definition** opens dictionary file
- [ ] **Search lexicon definitions** — find **caseword**, preview, open in file
- [ ] **hotdog** does not match **Dog** (Whole)
- [ ] **the met** does not match **The Met** (Case)
- [ ] `codeterm` in inline code does not highlight; standalone does (NoCode)
- [ ] Settings → Guide tab loads requirements reference
