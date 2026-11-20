# BOWL-SOUND-CRUSH

The short board entry controls current state, ownership, dependencies and locks.

More sounds of cars being crushed. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 4. Kyle, 20 November 2026: "more sounds
of cars being crushed". Claude's card: the sounds are chosen by ear.

A crush today is one sound (`vehicle.crush`). It becomes a set, from library sounds as recipes in
`tools/audio/catalog.json` (the libraries stay outside the repository), each compressed into `public/assets/audio/`.

## The cues

| Cue | When | What it should sound like |
| --- | --- | --- |
| `bowl.crush.car` | the truck's wheels first bite a junk car | sheet metal folding; four takes, never the same one twice running |
| `bowl.crush.bus` | a bus or the RV | the same, longer and deeper, with a boom from the hollow body |
| `bowl.crush.stack` | a burning stack | the deepest, with a rush of sparks |
| `bowl.crush.glass` | a quarter of a second after the bite, on cars and buses | windows going |
| `bowl.crush.groan` | while the wheels are on the wreck | metal groaning, held and then let go |
| `bowl.crush.off` | the truck comes off the wreck | a clank as it settles |
| `bowl.crush.flat` | a wreck run over again | a dull flat crunch, half as loud |
| `bowl.crush.pancake` | a piece crushed by a truck coming down out of the air | the bite with a low thump under it |
| `bowl.crush.ooh` | a bus, the RV, a stack or the Bus Pile | the crowd's "ooh" |

## What done looks like

- The nine cues are in the sound bank and played from the Bowl's crush events, with the crush line's fifteen pieces
  sounding like fifteen different things when driven end to end.
- Nothing changes for a crush on any other course.
- Claude has listened to a run down the line and a pancake in the real game with the crowd and the engine on, and has
  written one line on this card about each cue that was changed after listening.

## Files and locks

`tools/audio/catalog.json`, `public/assets/audio/` (the nine cues), `src/sound-bank.js`, the Bowl's crush branch in
`src/audio.js`, `src/bowl/bowl-lines.js` (`BOWL_SOUND_CUES`). Lock: `sound-bank`.

## Checks

1. The audio budget check and `tools/test-repo-hygiene.mjs` (file homes and sizes).
2. A check that each of the nine cues is in the bank and that two crushes of cars one after the other never pick the same
   take.
3. Laptop only: Claude listens, as above.
