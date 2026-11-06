# THE-DIG

## Changed

Added a switch-gated THE DIG button to the Scrapdome yard. The game loads on click and starts in the excavator cab beside the Dome. The trencher, excavator, dump truck and parked dozer use the town machine model; the dozer has no controls yet. Dirt, pipe props, reserved places, machine controls, camera cycling and a brief controls panel complete the yard. Ground edits use the Scablands layer and a page-memory save. The career save is untouched; TOWN-STORE replaces the temporary save later.

Excavator digging, truck loading and tipping, and trencher cutting run on fixed simulation steps. The view shows edited ground and dirt effects. The machine view resolves the model's `<id>:<joint>` names. Trencher ridge placement covers at least one ground sample so cut soil is not lost between cells.

## Checks

- `node tools/test-the-dig.mjs` - passed. The headless input run dug, loaded, drove, tipped and trenched; it checked ground edits, material conservation, reserved ground, the gated yard button and memory persistence.
- `node --check tools/scenarios/the-dig.mjs` - passed.
- `npm.cmd run build` - passed. Vite emitted a separate 29.63 KB `dig-game` chunk. It also reported an ineffective `src/game.js` dynamic import and large chunk warnings.
- `git diff --check` - passed.
- Browser and look checks - not run here. Claude should run `tools/scenarios/the-dig.mjs` in the memory-only browser, inspect each screenshot from yard entry through the ditch, and confirm the model fit, excavator camera, edited ground, dirt plume, truck load and tip, trench and ridge, transient refusal message, C camera cycle, Q switching, Tab mode, control dismissal and Escape return. The browser scenario uses `/tools/menu-check.html?flags=wasteland-town` and `window.__qaApp`.
- Lane tier - not run, as directed for this lane.
- Race fingerprints - not measured; this sandbox card does not change race rules. The lane tier will check replay and world-signature guards.
- Changed assertions - none.

## Removed

Nothing. The temporary memory save is marked in code for replacement by TOWN-STORE.
