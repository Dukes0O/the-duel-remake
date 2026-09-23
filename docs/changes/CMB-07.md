---
task: CMB-07
status: building
kind: feature
flag: wasteland2
player_facing: yes
---

# CMB-07 projectile carry and aim

## What changed

- When the race is Wasteland and `duel.featureFlags.enabled('wasteland2')` is
  true, bombs and crossbow bolts inherit the firing car's forward, reverse
  and lateral world velocity. Flag-off bomb carry and bolt launch stay on
  their previous paths.
- Player and CPU bolts lead their chosen moving target at launch. A flagged
  bolt tracks that same target during flight, turning at most 90 degrees per
  second within 12 degrees of its launch bearing. Bombs fly straight after
  launch. Flagged hit checks now intersect the projectile and target's
  horizontal contact window with their vertical hit window over the whole
  step, so a fast bolt cannot pass through the car between frames. The
  flag-off endpoint-height rule remains unchanged.
- The cone and turn rate live in `src/wasteland-tuning.js` for balance work.
  A bolt's target index and launch bearing are stored only for the flagged
  path, so the normal race state and flag-off projectile shape are unchanged.

## Evidence on base `89513d7`

- Cherry-picked the independent acceptance tests as `6e7055c`, without
  changing any assertion or pinned fingerprint.
- `node --check src/combat-weapons.js` and
  `node --check src/combat-projectiles.js`: passed.
- `node tools/test-combat.mjs`: 66 checks passed.
- `node tools/test-combat-field-shields.mjs`: passed.
- `git diff --check` and staged diff check: passed.
- `node tools/test-combat-projectiles.mjs`: 5/9 pass. The four red cases are
  player bolt carry, later-CPU bolt carry, player lead and in-flight turn.
  This base does not have CMB-01's `Duel.featureFlags` constructor override
  or the `wasteland2` catalog entry, so the new branch remains disabled even
  when the independent test passes the override to `new Duel`.
- A direct ordinary-mode control injects an enabled development switch and
  a stray targeted bolt. It confirms that neither ordinary weapon launch
  nor in-flight guidance activates. This test passes on the current base
  without changing either expected replay hash.
- The independent swept-height test commit `c28f5df` reproduced a missed
  30 FPS bolt hit while 60 and 144 FPS hit. With the vertical sweep fix,
  its 30/60/144 FPS cases all pass. The focused ordinary-mode control also
  passes.
- A test-only command assigned `Duel.prototype.featureFlags` with
  `enabled('wasteland2') === true` and selected the flagged gameplay and
  ordinary-control cases by name. All 8/8 pass,
  including carry, lead, bounded turn, straight bombs and horizontal and
  vertical swept collision at 30, 60 and 144 FPS. This did not edit
  production or test files. The ordinary and flag-off hash case passes in
  the direct 5/9 run; the approved full replay suite has not run on this
  branch.
- The worktree uses an ignored junction to integration's installed
  `node_modules`; no package was installed.

## Behavior and test changes

No existing assertion or replay fingerprint changed. New behavior is gated
on the `wasteland2` flag. The independent tests still need CMB-01's flag
wiring to pass as a whole. CMB-01 also edits `combat-projectiles.js` and
`wasteland-tuning.js`, so the Director should bring this source commit onto
the integrated CMB-01 baseline and review any conflict there.

## Remaining gates

After CMB-01 integrates, replay this source commit and its independent test
commit on a fresh branch. Run `node tools/test-combat-projectiles.mjs`, the
approved replay suite, the changed lane gate, production build and a private
flag-on combat browser check. Record any balance change to the provisional
12-degree cone or 90-degree-per-second cap with a reviewed test change.
