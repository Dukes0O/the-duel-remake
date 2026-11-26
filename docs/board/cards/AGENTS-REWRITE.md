# AGENTS-REWRITE

The short board entry controls current state, ownership, dependencies and locks.

**Claude, 27 November 2026** (Kyle, 26 November evening: "these rules are getting out of hand ... rewrite it tomorrow").

Rewrite `AGENTS.md` around three lines, with one short page of how-to beneath them:

1. If it works and makes the game better, it merges.
2. If it is broken, it does not merge until it is fixed.
3. Whatever is left becomes the next card.

Keep every decision Kyle made (`docs/board/decisions.md`) and the "Never" list's protections (the live folder, port
5174, real saves, keys, history). Fold the numbered rules, the gates and rule 23 into the how-to, cut what nobody needs
to read, and bring `docs/CODEX_PLAYBOOK.md` section 15 and the card templates into line. Kyle approves the new page.
Checks: `tools/test-board.mjs`, `tools/test-repo-hygiene.mjs` and any suite that reads AGENTS.md.
