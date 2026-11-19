# EVERBURN-RUN-AT-TOWN

Step 1 of `docs/FEUDS_AND_RUNS.md` (section 5). Kyle, 11 November 2026: "each of these bosses just runs around in a
circle... We should have something lead up to a boss fight that is compelling." On the design: "do your best then
build from it."

Owner: Claude (design, lines, verdict by playing). Built by a Sonnet helper. Switch: `story-everburn` (still off).

## What the player gets

- Old Smoke's furnace is seen in three earlier jobs before it is fought.
- The last fight is a run at Tin Town's forge, the forge the player lit in job 2, and no longer a loop back to the
  well. If the furnace reaches Tin Town's gate with its right door still shut, the gate burns.
- The rules of the fight (three doors, stoke then glow then slam, cinders, the shove, Easy's help) do not change.

## Settled design (Claude)

### The path

The furnace's path stays one list of places with three legs, so `src/world/jobs/old-smoke.js` keeps its rules.

| Stretch | Places (x, z) | Leg and door |
| --- | --- | --- |
| Out of the well, east across the open flats | well (-424, 304); (-450, 40); (-300, -230); (-60, -380); (170, -340); (350, -200); (350, 60) | 1, `open-flats`, left door, from place 0 |
| Through the Boneyard, past the planes | (335, 170); (345, 246); (440, 248); (545, 252) | 2, `boneyard`, right door, from place 7 |
| Up to Tin Town's gate | (610, 170); **the gate (575, 62)** | still leg 2 |
| Home along the road, with the player behind | (430, 70); the safe road (230, 150); (0, 230); (-200, 350); well | 3, `run-back`, rear door, from the place (-200, 350), 229 m from the well |

- Nothing else about a leg changes: after a door breaks, the furnace still runs at its bolt pace to the ground of the
  next door. After the second door it therefore runs through the gate and home, and the rear door is fought on the
  last 229 m, ending in the fall into the well as written.
- A door missed on its own ground is handled as now: at the end of the path the furnace turns round to that leg's
  ground (Easy and Medium), or escapes (Hard).
- The path must clear every box in `SCABLANDS_SOLIDS` by 8 m and stay on ground the furnace's own speed can cross.
  The builder checks this in a test and may move a place by up to 25 m to clear a box, saying so in the change note.

### The gate

- When the furnace first passes the gate, the rules record it once: `townReached`, and `gateBurnt` when the right door
  (leg 2) is not yet broken at that moment. Both are plain facts in the furnace's state, read from the path position,
  so the same inputs always give the same fight.
- Events for cues and lines: `townReached` always; `gateBurnt` when it burns.
- A burnt gate costs the player nothing in this card. The Scablands scene draws fire and smoke on the gate (the
  drawing code in `src/world/scrap-look.js`) until the job ends. Lasting damage to a town belongs to the feuds card.

### Seen before fought

Drawing only: the Scablands scene places the furnace model, with its smoke, where the player will see it. No actor,
no collision, no rule.

| Job | When | Where the furnace is | Line |
| --- | --- | --- | --- |
| 1, Hot Delivery | From the start until the pot is delivered | Standing on the skyline north of the road at (300, -120), smoke rising | Cinder, when the player first comes within 260 m of it |
| 3, Run Him Down | When the thief is caught | Rolling away west from the Boneyard's far end, from (140, 470) toward (-60, 440), for 20 seconds | Cinder, with the job's won line |
| 4, Slow Ride | While Big Bess is between 30% and 70% of her road | Pacing her on the high ground 150 m to the north of her, at her speed, then turning away north | Moss, when it appears |

### New lines (captions with the radio click; no voice recording in this card)

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.ember.cinder.21` | Cinder | Job 1 sighting | "See the smoke with wheels under it? That is Old Smoke's furnace. Keep the pot out of its sight." |
| `story.ember.cinder.22` | Cinder | Job 3 sighting | "He was taking the bellows to the furnace. There it goes, out the far end." |
| `story.ember.moss.4` | Moss | Job 4 sighting | "Furnace on the ridge, keeping pace with us. Bess does not like being watched." |
| `story.ember.old-smoke.4` | Old Smoke | Chase starts, after his line 2 | "If I cannot have the fire, nobody has it. I am going to put out your forge." |
| `story.ember.cinder.23` | Cinder | Chase starts, in place of line 17 | "He is heading for Tin Town! When a door glows, hit it!" |
| `story.ember.auntie-solder.7` | Auntie Solder | The gate burns | "He has set the gate alight! We will mend it. You stop that furnace." |
| `story.ember.auntie-solder.8` | Auntie Solder | The furnace reaches the gate with the right door broken | "That is close enough, Smoke. Look at the state of you. Go home." |

Line 17 ("He's running! When a vent glows, hit it!") is removed with its replacement. The callout that already reads
"RUNNING BACK TO THE WELL. AFTER HIM" stays for the run home. The job's line on screen becomes "Stop the furnace
before it reaches Tin Town. Hit a door while it glows."

### Sound

- `townReached`: the existing furnace horn or stoke cue, once (the builder names the cue used).
- `gateBurnt`: the existing fire-catch cue used by the Everburn's burning loads, once.
- Sightings: no new sound; the radio click with each caption.

## Checks (named before code)

1. `tools/test-old-smoke.mjs`: the path's three legs and their doors; the gate facts (`townReached` once;
   `gateBurnt` only with the right door unbroken); the path clear of every solid; the fight still ends at the well.
   Pinned lengths and times that move with the path are recorded again, each with its reason in the change note.
2. `tools/test-everburn-easy.mjs`: the child-pace Easy driver still wins job 6 at least 8 times in 10.
3. `tools/test-ember-lines.mjs`: the seven new lines and the removed one.
4. `tools/test-scablands-scene.mjs`: the furnace is drawn at its sighting place in jobs 1, 3 and 4 and is not an
   actor there; the gate's fire shows only after `gateBurnt`.
5. Laptop only (Claude): browser checks `everburn-well` and `everburn`; then Claude drives job 6 by hand on Easy and
   Medium and watches the three sightings.

## Result (built by a Sonnet helper; reviewed by Claude, 11 November 2026)

Merged into Claude's branch as 58e42dc5c. Claude read the rule changes (`old-smoke.js`, `steps/chase.js`,
`everburn.js`) and reran the four named tests on the merged result: the furnace rules 480 checks, the scene, 40
captions, and the child-pace Easy driver winning all nine jobs 10 times in 10.

Four things differ from the design above, all accepted by Claude:

1. The job 1 sighting line is `story.ember.cinder.24`, because `cinder.21` was already a job 6 line.
2. `OLD_SMOKE.introSec` is 6.7 seconds (was 4.5), so that the three opening lines finish before the first stoke.
   **Changed assertion, reviewed by Claude (rule 18):** the first-slam wait in `tools/test-old-smoke.mjs` is 16 s
   with a limit of 24 s (was 14 and 20), which follows the longer opening and loosens nothing else.
3. Job 3 ends on Cinder's sighting line as a closing line, held for about 2.2 seconds, in place of a won line that
   had no caption behind it (the raw id on card QA-EVERBURN-SCREENS). A catch now stays a catch during that hold. The
   player sees about the first 2 seconds of the furnace rolling away; a longer look needs a longer hold.
4. The path's first and last pieces are let off the well's own box, since the furnace starts in the well and falls
   into it. Every other piece clears every solid by at least 15.1 m, and no place was moved.

The path is 3,250.6 m, 3 minutes 52 seconds at the base pace. Sound: `arena.toll-gate` when the furnace reaches the
town, `weapon.flame.start` when the gate burns.

Still to do before this card closes: the two browser checks on the merged result, Claude's look at the three
sightings and the gate, a drive of job 6 on Easy and Medium, and the caption table in `docs/WASTELAND_WORLD.md`.

## Not in this card

Ash Men riding beside the furnace, lasting damage to Tin Town, feuds and recurring runs: later steps of
`docs/FEUDS_AND_RUNS.md`. No new art.

## Removed

The loop: the places `furnace-turn-1`, `furnace-turn-2`, `furnace-run-1` and `furnace-run-2`, and line
`story.ember.cinder.17`.
