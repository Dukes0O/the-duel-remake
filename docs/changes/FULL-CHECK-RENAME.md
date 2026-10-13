# FULL-CHECK-RENAME

Docs and board change only. No game code and no tool code.

## What changed and why

Kyle, 12 October 2026, evening: "night shift" and "night run" are the wrong
names. The overnight run means all the building that happens while Kyle
sleeps. The batch of heavy checks (full tier, frame check at both qualities,
combat balance `--check` on current rules, all browser scenarios, then a short
report) is now called **the full check**, named for what it does. By default it
runs once a day while Kyle sleeps, but the time is a default, not its
definition.

It is also less restrictive. It checks a copy of one commit, so builders keep
building and merging while it runs. Only its frame step needs the laptop to
itself (builders pause gates, builds and browser checks for that step only,
about 15 minutes). The other stages run alongside builders, each counting as
one of the at-most-three heavy jobs at `--jobs 4`. The full tier on an exact
release commit still runs alone before a release.

`tools/night-shift.mjs` does not do this yet. Until the new card FAC-FULL-CHECK
lands, the old behaviour applies: the whole check needs the laptop to itself
and the integration folder unchanged. Tonight only, builders pause from 03:45
until the "Record night" commit lands or 06:30 (see `docs/board/next-run.md`).

## Files touched

- `AGENTS.md`: rules 2, 7, 11, 13 and the Gates full tier line.
- `docs/FACTORY.md`, `docs/CODEX_PLAYBOOK.md`, `docs/OPERATIONS.md`: night
  wording replaced with the full check and the less restrictive meaning.
- `docs/board/next-run.md`: Order section rewritten to Kyle's approved order
  for tonight (open work first, then FAC-FULL-CHECK, then Claude-answered
  cards, then `busy-game-files` owners, with QA-AUDIO-CLOCK,
  QA-TITAN-REPLAY-TIMEOUT and DISC held); full check section renamed and
  tonight's pause added; a janitor and port 5311 line added under Limits. The
  "no heavy job after 23:00 PT" line is gone, replaced by tonight's pause.
- `docs/board/cards/FAC-FULL-CHECK.md` and a `docs/board/board.yaml` entry:
  the new Codex card that renames the tool and makes the new behaviour real.

Tool file names (`tools/night-shift.mjs`, `night-<date>.json`) are unchanged;
FAC-FULL-CHECK renames them. Kyle's scheduled task command changes when that
card merges.

## Removed

None: the tool rename belongs to FAC-FULL-CHECK.

## Gates

`node tools/run-tests.mjs --tier lane --changed --jobs 4` and `npm run build`
in the lane; results recorded in the hand-off report.
