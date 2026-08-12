# rejected — proposals the owner declined

The loop reads this file first and never re-proposes anything listed here.
Without it, a rejected proposal returns every run and the PR queue becomes
noise.

Entries are appended by the loop, not by hand: after a research PR closes,
anything it proposed that is absent from `main` is recorded below. Partial
merges count — if a PR landed six of eight entries, the two that did not
land were rejected.

To un-reject something, delete its line. The loop may then propose it again.

## Format

```
- YYYY-MM — **Pattern name.** One line on what was proposed. (PR #N)
```

## Log

_Empty. No research runs have completed yet._
