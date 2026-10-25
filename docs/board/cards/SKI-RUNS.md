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

## Claude answers

Claude (design lead), 24 October 2026, to the cloud session's two questions.

1. **Aerials landing.** Option A approved: a zone may state its own landing
   window; the ski rules keep 20 degrees everywhere else and the aerials hill
   uses 40 (`world.safePathAngle`). Takeoff about 50 degrees. (The card's "65
   degrees" is the kicker face, 64 in the recipe; the skier leaves it at about
   50.)
2. **Altitudes.** Option B, not A. One world: the game must not show one
   altitude and fly by another. The pads sit at the Summit world's real heights
   (summit pad 3,586 m, Devils pad 3,237 m, pickup pad 2,886 m: the highest
   clear circles, keeping the packet's gaps as near as the world has them),
   every zone's snow starts at its pad's altitude, and `docs/HELI_SKIING.md`
   section 3 is recomputed with the existing thrust rule. A full group on a
   full tank hovers at the summit pad with 112 kg to spare, so the "take half
   a tank" lesson is dropped from the packet (the Lab's air-and-altitude lesson
   still teaches thin air). Nothing in the helicopter or the group's mass is
   tuned to bring it back.
