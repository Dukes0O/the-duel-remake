---
task: SCRAPDOME-RELEASE
status: released
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

- `tools/test-offroad-physics.mjs`: the 70% slope elevation cap now applies
  to the rally car only, and the summit check expects the Titan to climb past
  the old 24 m cap on the 44 m summit without a limit rollover (it does); the
  rally car still meets its limit. The Titan's grade tip stays covered here
  (near-vertical face) and in `tools/test-titan-climb.mjs`.

Each assertion checked the switch was off (or the switched-off Titan); the release turns it on by Kyle's
written approval, so the test now checks the released state.

## Tests

Lane tier and build in the lane. Full tier 298 of 298 on the merge 73f63eb
and again on the final release commit 246e7f1 (release notes added). Combat
balance with the released rules passed. Build 20260930170709-a39e0d checked on
port 5188 (menu loads, no errors, no Scrapdome entry on the main menu), copied
into the live dist; the live server was not running, so the landing page was
verified from the files. dist 149 files, dist-previous 149 (20c16a), dist-next
deleted; master pushed.

## Removed

Nothing yet. The three switches and their switch-off branches are removed by
BALANCE-W2-OFF-RETIRE, together with wasteland2, once this release is live.
