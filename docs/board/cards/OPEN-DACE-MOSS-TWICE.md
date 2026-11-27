# OPEN-DACE-MOSS-TWICE

The short board entry controls current state, ownership, dependencies and locks.

**Found in Claude's drive of the merged batch, 27 November 2026** (`docs/board/looks/drive-2026-11-27.md`).

**What a player meets.** On a morning when Dace waits on Moss's pickup in the forge yard (Dace Goes Looking, beat
`sign`), the open land stands still the moment the outing starts: the car does not move, the clock does not run, and no
key does anything. The game is frozen, not paused.

**Measured.** A memory-only outing with the switch `story-choices`, world `newWorld({seed: 7, night: 3})` with the
Walkers inside, the mark `dace-runner` and the storyline at `sign`, morning (`daySeconds` 120). `stageTimeSec` stayed at
0.008 while the page drew 60 frames a second. One `app.advance(.1)` threw
`Unknown or repeated story figure: moss` from `createStoryPeople` (`src/world/jobs/story-people.js:99`), called by
`syncOpenPeople` (`src/arena/modes/world-job.js` about line 1744). The open cast held `dace, moss, rell, wim` (from
`dacePeople`, `src/world/open/content/dace-goes-looking-places.js`) and `fixedOpenPeople` (OPEN-DOORS's shed staff,
`world-job.js` about line 452) held `odessa, moss`. The staff are filtered against the cast only when the outing starts.

**Likely fix.** In `syncOpenPeople`, leave out a fixed post whose id the moving cast already holds, every time the
cast changes, so a storyline can take Moss from his shed for a scene. Check: a suite that starts an outing at Dace's
morning sign and steps it once; `test-open-dace-goes-looking` and the OPEN-DOORS suite still pass.
