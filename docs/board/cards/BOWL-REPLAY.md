# BOWL-REPLAY

The short board entry controls current state, ownership, dependencies and locks.

Claude builds it (the show camera's line, as BOWL-CAMERA was). The replay of a missile hit. Design:
[BOWL-SHOW-3](BOWL-SHOW-3.md), section 6, with Kyle's words: "Can you make the camera follow the missile for part of the
replay, maybe about half the distance, then stop so you can watch the missile and the whole scene from a distance."
Needs BOWL-MISSILE.

## What to build

1. **When:** every missile hit that knocks a truck out, and the first missile hit in each event, in a solo night and a
   Turn Show.
2. **The pause:** the night holds the event for the replay as the pause screen holds it (clock and trucks still), by its
   own rule on the `hit` event; the renderer never changes race state.
3. **The store:** the view keeps the last 6 seconds of what it drew (each truck's place and pose, the missile, its
   smoke, the blast, the crowd's scatter), and the replay draws from it. Nothing in the rules runs again.
4. **The camera:** behind and above the missile as it leaves the tube (4 m behind, 1 m up), following it for the first
   half of the distance it flew; there it stops and stays, turning only to keep the missile and its target in the picture,
   so the missile flies on across the arena and bursts on the truck with the whole scene in view. The last 0.6 seconds
   before the hit at half speed, then 1 second after the blast at full speed. A flight under 0.8 seconds is watched from
   the side with no chase.
5. **On screen:** "REPLAY" in a corner and a thin bar top and bottom; the missile's sound and the blast again; the
   crowd's roar after. Any key or click after the first half second skips it; play comes back with a 0.4 second fade.

## Files and locks

`src/bowl/bowl-replay.js` (new, the store and the replay camera), `src/bowl/bowl-camera.js`, `src/bowl/bowl-night.js`
(the hold), `src/bowl/bowl-hud.js` (the corner word and bars), `tools/test-bowl-replay.mjs` (new). Lock: `bowl-night`.

## Checks

1. `tools/test-bowl-replay.mjs`: a knock-out by missile starts a replay and the event's clock does not move during it;
   the replay camera follows the missile to half its flight distance and then does not move; the race after a replay ends
   exactly as the same seed and inputs end without one; a skip ends it at once after half a second.
2. Laptop only: three replays watched by hand, one long shot, one short, one knock-out, with pictures for Kyle.

## Sound cues

`bowl.replay.start` (a short tape whirr as the picture rewinds; stand-in `interface.radar`), `bowl.replay.end` (stand-in
`interface.bonus`). The missile's own cues play again in the replay.

Behind `titan-bowl`. The lane tier and `npm run build`, recorded in `docs/changes/BOWL-REPLAY.md`.
