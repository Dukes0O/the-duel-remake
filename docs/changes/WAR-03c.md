---
task: WAR-03c
status: ready-to-merge
kind: feature
flag: warlords
player_facing: yes
---

# The Twin Vultures (Claude, 2 October 2026)

## What changed

- src/warlords/vultures.js: two buggies as one team. The first harasses on the
  hunter brain and fires; the second shadows on the far side of the player and
  holds its fire until phase two. Each has 0.9 times arena armor (not 1.5) and
  respawns on its own. First to three wrecks counts either buggy; phase two
  starts after their second wreck.
- Pincer, at most every 11, 9, 7 s, never at the opening bell, with both
  buggies within 80 m: both flash (the shared tell, 20% shorter in phase two),
  PINCER!, both screen edges light, then both charge from the player's left and
  right at a meeting point fixed at the tell (where the player will be if he
  holds his speed). Braking or turning away leaves him short of it, so they
  arrive together and meet each other. The first real crash contact between
  them during a charge stuns both 2.5 s: THEY HIT EACH OTHER. NOW!
- Reward: Jax's grapple +10 m, saved as the defeat itself (like the Side Saws);
  `jaxGrappleBonusMetres(profile)` in src/warlords.js is what CREW-02 reads.
  No save-shape change. The results screen says so.
- Shared files, generic and naming no warlord: warlord data may carry a `team`
  (names, cars, brains), `armorScale` and `phaseTwoWrecks`; the shared wreck
  rules sum a team's wrecks, damage and phase trigger (`teamTotal`);
  `arenaTeams` gives places per side for the HUD and results; settlement
  accepts the built fight's whole team (one warlord still validates exactly as
  before); two new fight hooks, `mayFire` (combat AI) and `contact` (crash
  contact, first impact of a pair); a generic `arena.edgeCues` lights the HUD
  edges. The board shows the pair as one row with its totals.

## Sound cue

- The shared tell plays the existing `arena.tell` cue from each buggy. The
  two-tone horn in the design is not made: no horn sound exists and a new one
  belongs to the audio owner. Stun uses the ordinary crash sounds.

## Not done, and why

- The Pit: ARENA-PIT has not merged, so the fight stays on the ring. When it
  merges, add a `venue` field to warlord data and have the warlord start use it.
- No buggy model exists. Both buggies are Dusthawk Rallys (the lightest car
  with the right look), the second tinted by the existing colour order. A
  proper buggy is an art decision for Kyle.

## Tests

- New tools/test-twin-vultures.mjs (17 tests): team and armor, fire rules,
  pincer tell, sides, cooldowns by difficulty, meeting point, braking and
  collision stun, team wrecks and phase two, respawn, board, settlement and
  the Jax bonus, and refusal of a partial pair.
- Changed assertions: test-warlords lists five built fights (adds the Twin
  Vultures); test-warlord-hooks accepts a named `rewardGear` as a reward.
- Browser: scenario new-warlords now includes the pair's tell and charge;
  pictures reviewed.

## Removed

- Nothing.
