---
task: SCRAPDOME-RELEASE
status: review
kind: release
flag: scrapdome, titan-climb, muddy-hollow
player_facing: yes
---

# Scrapdome, Titan climbing and Muddy Hollow released (30 September 2026)

Kyle and Gratian played all three in the Preview. Kyle, 30 September:
"good enough to merge". The Titan's low-speed steering is TITAN-HANDLING and
does not hold this release.

## What changed

- `src/feature-flags.js`: `scrapdome`, `titan-climb` and `muddy-hollow` go
  from dev to on. `career-backup` stays dev. No menu entry changes: the
  Scrapdome is reached only from the yard, Muddy Hollow only by driving there.
- Warlord fights are not in this release. None is merged yet, and SCRAPDOME.md
  section 5 now puts them behind their own `warlords` dev switch (added by
  WAR-02a-FORMAT after this merges).
- Answers to Codex's three questions recorded in `docs/playtest-inbox.md` and
  SCRAPDOME.md section 5.

## Changed assertions (reviewed)

- `tools/test-feature-flags.mjs`: the three switches are expected on, and
  production has them on; career backup still off.
- `tools/test-muddy-hollow.mjs`: "QA-only dev switch" becomes "released":
  production has the Hollow without a request.
- `tools/test-wasteland-beta.mjs`: the switch table lists the three as on.

Each assertion checked the switch was off; the release turns it on by Kyle's
written approval, so the test now checks the released state.

## Tests

Lane tier and build in the lane; full tier and release evidence on the exact
integration commit (recorded in docs/board/run-log.md).

## Removed

Nothing yet. The three switches and their switch-off branches are removed by
BALANCE-W2-OFF-RETIRE, together with wasteland2, once this release is live.
