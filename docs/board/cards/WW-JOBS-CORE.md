# WW-JOBS-CORE

The short board entry controls current state, ownership, dependencies and locks.

Design sections 4 and 8. The rules of every job, no graphics, no game code.

**Files you own:** `src/world/jobs/job-engine.js`, `src/world/jobs/steps/{reach,carry,chase,escort,onfoot,heist,rescue,defend,explore}.js`,
`tools/test-world-jobs.mjs`.

**Shape.** `createJob(def, seed)` and `stepJob(job, view, dt)`. `view` is a plain object: player car pose, speed,
whether on foot, fighter pose, crash size this frame, the list of other actors' poses and health, things hit. It returns
events and requests: `say(lineId)`, `marker(place)`, `spawnWave(n, at)`, `lend(weaponId)`, `follow(path, speed)`,
`damage`, `done`, `failedStep`. The engine has no import from `src/game.js`, `src/app.js`, the renderer or the DOM.

**Each step, in its own file:**
- `reach`: be within a radius (`onFoot` optional).
- `carry`: a load on the roof; a crash above its limit spills it and the step restarts from the last safe point; optional `burnable` barricades.
- `chase`: a target on a path; a leash distance that warns then restarts the leg; caught by health or contact.
- `escort`: a slow vehicle on a path with health; rests instead of dying once, then restarts its leg.
- `onfoot`: light or use a list of places on foot; knocked down means back to the last one done.
- `heist`: inside a zone on foot; lamps see the player in a cone, which raises an alarm (more raiders, never failure); take; carry at 70% speed (the fighter's cargo rule); reach the car.
- `rescue`: reach people, stop beside them for a few seconds, two seats, return.
- `defend`: place health, waves, a wave restarts if it falls.
- `explore`: a list of finds with hints; cannot fail.

A failed step restarts only itself, and a job always knows one line of "what to do now" text id.

**Checks:** `tools/test-world-jobs.mjs` drives each step with a pretend `view` through a win, a failure and a restart; the same
seed and inputs give the same events at 30, 60 and 144 frames a second; an exploring step never fails; nothing reads `Math.random` or the clock.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-JOBS-CORE.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
