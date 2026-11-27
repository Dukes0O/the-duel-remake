# TOWN-FIRE-STREAM-LOOK: the fire truck's water drawn as a jet, spray, steam and a wet wall

**Changed.** `src/arsenal/water-stream-view.js` is redrawn in code: a jet that arcs and tears into spray, steam off flames, a
cloud when a fire goes out, and a dark wet patch on the wall (or the ground) it lands on; the Armory's car cannon uses the same
file. `src/town/view/work-vehicle-view.js` carries the jet across the building's plot to the first thing of the building it
meets, and draws no water on a fire that is out. View only: the job's state is read and nothing is written.

**Looks.** Eight rounds in `docs/board/looks/town-fire-stream-look/`; round 8 passes, for the Director's look. New scenario
`look-fire-stream` (its row in `tools/run-browser-scenarios.mjs` came with TOWN-HAUL-LOAD-LOOK). No frame check (rule 9).

**Checks, on the working tree over `469bcfb8e`, both cards together.** Rule 23's set, 18 suites passed: core, the three guards,
test-town-fire-job, test-town-haul-job, test-town-vehicles, test-water-cannon, test-town-view-life, test-town-goods,
test-machine-haul, test-browser-scenarios, test-full-check, test-repo-hygiene, test-board. `npm run build` passed. Browser
scenarios passed: `town-fire-save`, `town-haul-save`, `arsenal-water-cannon`. No assertion changed; no fingerprint moved.
Learned: seven entries in `docs/ART_LINE.md` under "Moments". Not photographed: dusk and night.

**Removed.** The string of pale balls: the old `WATER_STREAM_LOOK` figures and its instanced spheres.
