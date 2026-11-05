# WW-JOBS-CORE

## Changed

Added a headless, deterministic job engine and separate modules for reach,
carry, chase, escort, on-foot, heist, rescue, defence and exploring steps.
The engine validates definitions, tracks the current step and line id, and
returns events and requests without importing game, renderer or browser code.
Restarting a step preserves its returned checkpoint state.

## Checks

- `node tools/test-world-jobs.mjs` — passed. Covers all nine step kinds,
  completion, failure and restart behavior, and replay results at 30, 60 and
  144 frames per second.
- `npm.cmd run build` — passed. Vite reported the existing dynamic-import and
  large-chunk warnings.
- Lane tier — not run, as directed; Claude runs it.
- Browser and look checks — Claude runs. Review step transitions and the
  event/request contract when this engine is connected to the world mode.
- Changed assertions — none.
- Race fingerprints — not applicable; no race simulation or fixtures changed.

## Removed

Nothing. This card adds the first job engine and step modules.
