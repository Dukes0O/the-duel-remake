# WILDLIFE-HITS-2 (Claude cloud, 26 November 2026)

Behind `wildlife-hits` (dev). Roadside herds: one halfway between each two herds, 3 to 12 m from the road edge, bolting at 10 m; about twice the animals on every course with wildlife (Tremblant Woods 41 to 73 over ten days), and the ordinary herds unchanged. Every species has a size; a small one is flung 4.5 m and tumbles, a medium one goes onto its side at 1.2 m, a large one stops the car and slumps 0.3 m on; a bird can be hit on the ground, not in the air. Sound cues: `wildlife.hit` (the splat: a recorded crash take at the crash's 4.2 gain, pitched down, with a made-in-code splat at least as loud as the made-in-code crash) and `wildlife.hit.heavy` (the thump under a large animal). `render3d.js` passes the size to `animalHit`. U-turn: the 1.45 rad heading clamp in `src/sim-driving.js`, reported on the card, not changed (questions file).

Checks on 436e74b (the same code as the pushed commit, which only adds this hash): rule 23's small set (core, test-replays, test-combat-replays, test-world-composition, test-wildlife, test-wildlife-view, test-feature-flags) plus test-sound-bank, test-p4-audio, test-bowl-crush-audio, test-heli-audio, test-combat-audio, test-board and test-repo-hygiene: 17 of 17 passed. `npm run build` passed.

New checks: a hit on each size gives its fall, in the real view on Tremblant Woods; the splat against the crash; the roadside count, reach and spread (test-wildlife-view, test-wildlife).

Changed assertions: test-wildlife-view's source-text check now matches `planRace(course, raceNumber, today, roadside)` (the call gained the switch, same meaning). test-p4-audio's pre-P4 pin leaves out the two new cues the way earlier cards did; the hash is unchanged.

Not run (laptop only; this container's software renderer cannot start a race, and even the smoke run timed out): scenarios `wildlife-hits` (now waits 30 frames for the fall) and `wildlife-view`, and the frame check. The timed view (Harbour Lights at night) has no animals and the switch is dev, so it should not move. A Tremblant Woods look with the switch on is still owed.

**Removed:** `vehicle.crush` as the animal-hit sound (it stays for props), and `hitThrow`, `heapHeight`, `crushHeight` and `crushBlood` (replaced by `FALLS`).
