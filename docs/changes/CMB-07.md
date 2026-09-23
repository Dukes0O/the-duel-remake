---
task: CMB-07
status: ready for integration gate
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

## Evidence on CMB-01 integration base `fc6cbc7`

- Replayed the six CMB-07 commits onto the isolated `codex/cmb07-forward`
  branch. The sole source conflict was the `combat-projectiles.js` import list;
  the resolved file keeps both CMB-01's armor damage hook and CMB-07's target
  prediction helper.
- `node tools/test-combat-projectiles.mjs`: 9/9 pass, including player and
  later-CPU carry and lead, bounded homing, straight bombs, horizontal and
  vertical sweeps at 30/60/144 FPS, ordinary-mode isolation and flag-off
  fingerprints.
- `node tools/test-combat.mjs`: 66 checks passed.
- `node tools/test-combat-projectile-order.mjs`: passed.
- `node tools/test-combat-armor.mjs`: 19/19 pass, including bomb arming,
  self damage, wreck recovery and ordinary-mode controls.
- `node tools/test-replays.mjs`: 162 checks passed across 18 cases, 16 events,
  eight categories, three FPS values and three runs.
- `node --check` passed for both changed source modules.

## Earlier source evidence on base `89513d7`

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

No existing assertion or replay fingerprint changed. New behavior requires
both Wasteland mode and the `wasteland2` flag. The independent acceptance
tests pass against the integrated CMB-01 flag wiring.

## Remaining gates

Run the changed lane gate, production build and a private flag-on combat
browser check after the current integration merge gate finishes. Record any
balance change to the provisional 12-degree cone or 90-degree-per-second cap
with a reviewed test change.
