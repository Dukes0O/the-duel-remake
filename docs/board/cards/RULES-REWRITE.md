# RULES-REWRITE

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item M1). Kyle said yes
to this card on 9 November.

`AGENTS.md` has 368 lines, 23 dated amendments and two rules numbered 20. Later sections
overrule earlier ones, so a reader must hold the whole page to know which rule applies.
`docs/board/next-run.md` is named as the current plan; its newest section is dated 28 October
and it still says nothing goes live without Kyle's word, which rule 18 ended on 15 October.

## What to do

1. Rewrite `AGENTS.md` as today's rules only: about 120 lines, one numbering, no "this wins
   over that", no dated history. Where two present rules conflict, the later one stays and the
   change note lists the pair.
2. No rule changes its meaning. Every "Never" line, the live-folder and save protections, the
   stop rule, rule 18's short list of what waits for Kyle, and the "Keep these" pointer stay.
3. Kyle's dated decisions are not lost: each one that is not already in
   `docs/board/decisions.md` moves there as one line with its date.
4. Replace `docs/board/next-run.md` with a short current plan: the order in the audit's
   "A suggested order" section and the cards that carry it.
5. In `docs/FACTORY.md`, `docs/CODEX_PLAYBOOK.md` and `docs/README.md`, remove or correct the
   passages that the rewritten rules replace. Do not rewrite those pages.

## Checks

- `node tools/test-board.mjs` and `node tools/test-repo-hygiene.mjs`.
- `grep -rl "AGENTS.md" tools` first: any tool or test that reads a sentence from `AGENTS.md`
  is listed in the change note with what it reads, and still passes.
- Word count of `AGENTS.md` plus `next-run.md` before and after, in the change note.

No game code changes, so no lane tier, build or browser check.

## Result (Claude, 9 November 2026)

Done; see `docs/changes/RULES-REWRITE.md`. The page is 207 lines, not 120: every rule kept its
content. Rule numbers were kept because other files cite them, so point 1's "one numbering"
means one unbroken list from 1 to 22 with no rule numbered twice.

## Removed

The dated amendment sections of `AGENTS.md` and the old `next-run.md` text. Git keeps both.
