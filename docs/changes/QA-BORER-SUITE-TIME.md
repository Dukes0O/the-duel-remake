# QA-BORER-SUITE-TIME

**Status:** improved, **the 120 s target is not met**; one independent review done. **Flag:** none; tests only.

## Times (laptop shared with other sessions at about 35% CPU, so not truly alone)
- `test-machine-borer`: 409 s before, 224 s after (same laptop state, run one after the other).
- `test-machine-borer-apprentice`: 213 s CPU before, 175 s after (run side by side); about 160 s to 140 s in a quieter pair.
- `test-machine-borer-freeze` 55 s, `test-tunnels` 11 s, both pass.

## Why not under 120 s
Cutting costs about 0.15 to 0.22 s per metre of bore (every 1/120 s step plans about 270 spoil cells and asks the land about each). The checks that need the real mesa cut 317 m (survey), 278 m (steep stop at 277.86 m) and 434 m (climb and trench together): about 1,030 m, so roughly 150 s of cutting before any other check. Reaching 120 s needs the step itself made cheaper (`src/machines/borer.js` spoil planning, `borerLandRefusal` lookups), which is outside this card. Suggested follow-up card for Claude.

## What changed, and why each check still proves what it proved
1. **Land answers remembered by place** (`rememberedByPlace`, both files; the Dig's own checks inside the sent bore are unchanged). The function reads only x, z and radius of static land, so the same question gets the same answer. The four mesa bores end in identical states (hash of the whole final machine, distance and message) before and after: survey 316.554 m, climb 337.996 m, trench 402.117 m with 2 warnings, steep 277.862 m.
2. **Trench resumes from the climb run** at the moment the exit cutting starts. Both are one flat bore up to there (same target, no climb, same ground); the saved ground chunks and a cloned machine carry over. Its asserts (warning count, finished, 70 m) read the same end state as a separate run (identical hash above).
3. **Pace check in two calls (10 s, 250 s)**: `stepDigSandbox` runs its own fixed 1/60 s steps inside one call, so these are the same 600 and 15,000 steps (reviewer checked the carry arithmetic; one step would be 0.008 m against 0.01 and 0.02 limits). The 4.95 m and 123.75 m asserts are unchanged.
4. **The four mesa bores run first in the borer suite** (earlier unit checks no longer slow the cutter's code). Order only; every assert stays where it was. Timed once: 267 s to 224 s. The apprentice suite got the same memo only, because moving its mesa block showed no gain.

No assertion was removed or loosened. Changed assertions: none. **Removed:** nothing.
