---
task: WAR-03b
status: ready-to-merge
kind: feature
flag: warlords
player_facing: yes
---

# The Kettle Kingpin (Claude, 2 October 2026)

## What changed

- src/warlords/kettle.js: the Titan Monster on the rammer brain. Kettle Drop
  when ready and the player is on the floor 12 to 40 m away: KETTLE DROP!,
  the shared tell at 1.4 times, and a red 4 m ring where the player will be
  at landing (kept on the floor, at most 40 m away). A 1.2 s leap (he
  touches nothing in the air), then every car in the ring loses 20 armor
  (40 if landed on squarely) and is shoved outward. Stuck 2.5 s after:
  HE'S STUCK. HIT HIM NOW!. Cooldown 12, 10, 8 s. Phase two: two drops, the
  second ring aimed as he lands; the window follows only the second.
- New shared hooks, naming no warlord: `motion` (arena-event), a `fixed`
  armor source, arena floor `markers` drawn as rings, and `contactExempt`.
- Reward: the Warlord kit fitted to the Titan Monster, and Tusk saved as
  owned (usable early once CREW-02 makes him active).

## Tests

- New tools/test-kettle-kingpin.mjs (6 tests). Changed assertions:
  test-warlords lists the three built fights; test-warlord-settlement and
  test-territory-screen use Mirage, not the Dustmonger, as the unbuilt
  example. Headless fights with the simple scripted player: it loses to
  Sal, the Dustmonger and the Kingpin alike; Kyle and Gratian judge feel.

## Removed

- Nothing.
