# Lexicon Nexus — testing

## Unit tests

```bash
bash test.sh
```

9 tests cover requirements parsing, consolidated grammar (Dog / The Met examples), manual plurals, draft skipping, and scanner behavior.

## Manual smoke test

Open [`Lexicon Nexus Test/00 Smoke Test.md`](../../Lexicon%20Nexus%20Test/00%20Smoke%20Test.md) in **Reading view** with Lexicon Nexus enabled.

Dictionary data: [`Dictionary/consolidated.md`](../../Dictionary/consolidated.md)

## Checklist

- [ ] **obsidian** underlined in Reading view
- [ ] Hover popover shows definition
- [ ] Click pins popover
- [ ] **Go to lexicon definition** opens dictionary file
- [ ] **hotdog** does not match **Dog** (Whole)
- [ ] **the met** does not match **The Met** (Case)
