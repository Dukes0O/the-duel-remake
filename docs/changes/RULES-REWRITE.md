# RULES-REWRITE

Task: RULES-REWRITE. Kind: documents only. Flag: none. Owner: Claude. 9 November 2026.

## Changed

- `AGENTS.md` states today's rules only: 207 lines and 2,560 words, from 368 lines and 3,783
  words. The card asked for about 120 lines. Every rule kept its content, so the page did not
  go lower; cutting further would have meant dropping rules.
- `docs/board/next-run.md` is a short current plan: 449 words, from 2,510.
- Read at the start of a session, the two pages together fell from 6,293 words to 3,009.
- Kyle's dated decisions behind the rules moved to the top of `docs/board/decisions.md`, with
  his words of 15 October as the old page quoted them.
- `docs/CODEX_PLAYBOOK.md`, `docs/FACTORY.md` and `docs/README.md`: corrected the passages that
  still asked for Kyle's "go live", a three-round art limit, three heavy jobs at once, a
  Preview step, or a pause from an October night.

## Decided while writing (Claude)

- **Rule numbers stay.** Other files cite the rules by number (rule 18 in about 150 files, rule
  17 in 54, rules 8 and 9 in about 45 each). Each surviving rule keeps its number. The second
  rule numbered 20 (the factory learns) is now 21, and the history exception is 22.
- **Where two rules disagreed, this one stayed:**
  - Rule 19 (never redo a passing check) over rule 2 and the Gates line that asked for a full
    tier on every release commit.
  - Rule 18 (standing approval) over rule 15's "go-live waits for Kyle".
  - Gates (the merge does not repeat the builder's lane tier) over the cloud paragraph's
    "after its own lane tier".
  - The 13 October push decision over "compacted before every push".
  - Kyle's "Use Performance" of 30 October over rule 8's "one run per quality". That decision
    was written only in Claude's private notes; it is now in the rule (rule 21).
  - The lane tier command says `--jobs 4`, not the Gates section's `--jobs 8`. Here the older
    limit stayed: rules 7 and 14 and the playbook say 4 or fewer, 17 of the last 19 change
    notes used 4, and the laptop's memory is the reason for the limit.

## Checks

- `node tools/test-board.mjs` and `node tools/test-repo-hygiene.mjs`: passed.
- What reads `AGENTS.md`: `tools/test-repo-hygiene.mjs` only requires the file in the root.
  `tools/test-repo-hygiene-rules.mjs` and `tools/cockpit-sync.py` name it in a comment; the
  second said rule 18 for Cockpit and now says rule 20. No test reads a sentence from the page.
- No game code changed: no lane tier, build or browser check. No review (rule 17: rule wording
  already decided).

## Removed

The dated amendment sections of `AGENTS.md`, every "this wins over that" line, and all earlier
run plans in `next-run.md`. Git text history keeps them.
