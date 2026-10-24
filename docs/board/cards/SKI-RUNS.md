# SKI-RUNS

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). H5 section 5. Switch
`heli-skiing` (dev). Needs SKI-RULES.

The five Summit Run ski zones as recipes and data, in `src/ski/runs/`:

- A zone is `{id, drop: {x, z, y}, pickup: {x, z, y}, ground(x, z), gates,
  line, stashes, bounds}`; `ground` is built from a recipe (a smooth fall
  line, with bumps, a kicker or a bowl shaped in), so no height file is
  stored.
- **Slalom** (450 m, 180 m drop, 50 gates), **giant slalom** (1,100 m,
  350 m drop, 40 gates) and **moguls** (250 m at 28 degrees, bumps every
  3.5 to 4 m in two lines, two small kickers) from the Devils Playground
  pad (about 3,960 m); **aerials** (one kicker launching at about 65
  degrees onto a 37-degree landing hill) above the pickup; **powder** from
  the summit pad (4,302 m) down the north bowl, deep-snow friction 0.12
  off the packed lines, three stashes.
- Each drop pad matches a landing zone in the Summit Run world (12 m,
  level within 1.5 m); the zone's top meets it.
- `tools/test-ski-runs.mjs`: every zone loads; each timed run is skied
  start to finish by the guide through every gate; the aerials kicker and
  landing hill give a safe landing for the guide's jump; the moguls' bumps
  and kickers are inside the run; the powder run reaches the pickup from the
  summit pad and every stash; pad heights match the Summit world within
  1.5 m.

Owns: `src/ski/runs/`, `tools/test-ski-runs.mjs`, `docs/changes/SKI-RUNS.md`.
Locks: none. Sound: none. Art: none (shapes from the recipes).

Acceptance: the test, lane tier, build, one review. Removed: nothing.
