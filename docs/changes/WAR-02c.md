---
task: WAR-02c
status: ready-to-merge
kind: feature
flag: warlords
player_facing: yes
---

# Mother Mirage (Claude, 2 October 2026)

## What changed

- src/warlords/mirage.js: the Aurora GTR on the gunner brain. Once her
  cooldown is ready (12, 10, 8 s; her first split is not ready at the start)
  and the player is within 40 m, a heat shimmer and MIRAGE! (the shared tell),
  then two copies 8 m either side for 6 s. A copy never takes armor and bursts
  into scrap on any hit. Only the real car fires (shared combat AI skips
  decoys) and only the real car leaves tyre marks. Hitting the real car during
  the split bursts the copies and stuns her for 2 s: GOT HER. HIT HER NOW!,
  and hits deal 1.5 times. Phase two: splits 20% more often, copies are
  rammers at half ram damage.
- Decoy cars are arena participants with a `decoy` flag. Shared files treat
  the flag generically and name no warlord: combat AI skips decoys, damage and
  wrecks by a decoy credit its owner, ranking, the placing line and results
  settlement ignore decoys, and the arena steps a snapshot of the cars so a
  think may add or burst them. The renderer draws a copy in its original's
  colours, shows its original's name and armor on the HUD, and does not
  rebuild the wreck-effect pool when copies come and go (no hitch at a split).
- Floor `markers` gain a `tyre` kind (two dark streaks, gone after 8 s),
  drawn in arena-tell-view.js beside Kettle's red rings.
- Reward: the Decoy Drone weapon belongs to ARS-03, which reuses these decoy
  cars. Until it lands the fight pays its settled scrap only and the territory
  panel does not claim a reward (`rewardBuilt: false`). Kyle's earlier rule
  "reward unlocked early and working" is therefore NOT yet met; ARS-03 closes it.

## Tests

- New tools/test-mirage.mjs (13 tests): no split at the start, tell then
  split with copies, 40 m trigger, only the real car fires, a copy bursts on a
  hit, the stun window and 1.5 times damage, split expiry, cooldowns by
  difficulty and phase, phase two rammers, decoys never score or settle,
  tyre marks only from the real car.
- Changed assertions: test-warlords lists four built fights (adds Mirage);
  test-warlord-hooks accepts a named unbuilt reward (the Drone) for a built
  fight; test-territory-screen and test-warlord-settlement use Gearhead Gunn,
  not Mirage, as the unbuilt example.
- Browser: tools/scenarios/new-warlords.mjs now includes the Mirage shimmer
  and split. Pictures reviewed by Claude; copies match, the HUD gives
  nothing away, marks trail only the real car.

## Removed

- Nothing.
