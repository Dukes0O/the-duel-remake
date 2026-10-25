---
task: DEEP-LIFE
status: done
flag: the-deep
player_facing: no
---

# DEEP-LIFE: the Kelp Coast's sea life

Claude (Sonnet 5.5 side session), 25 October 2026. Card
`docs/board/cards/DEEP-LIFE.md`; design `docs/THE_DEEP.md` sections 5, 6.4 and
8. Behind `the-deep` (dev): nothing changes for players. The creatures are
drawn from the DEEP-ART-SRC models, which Kyle's decision keeps as
working art only (see `docs/board/looks/deep-art/round-3-review.md`; DEEP-ART-FINAL replaces them later), so the same code will
draw the better models when they arrive. Picture sheet:
`docs/board/looks/deep-life/round-1.jpg` and its note.

## Design decisions (settled before the code)

1. **Six of the seven creatures are drawn; the otter is held.** DEEP-ART-SRC
   removed the otter's model (its manifest lists it under `heldRoles`), and
   nothing stands in for it: no placeholder. The Kelp Coast's `otter` spot
   stays in the zone data; the code reports it as `held` and draws nothing.
   When DEEP-ART-FINAL delivers an otter, it is one table row
   (`planSeaLife` in `src/deep/sea-life-rules.js`) and one motion rule: it
   floats on its back at the surface, wrapped in kelp (THE_DEEP section 5).
2. **The zone's `spots` say what lives where.** The plan is worked out from
   `zone.spots` (creature, trail index, count) and nothing else, with its own
   generator (`src/rng.js`, seeded from the zone id, the creature and the
   spot), so the same zone gives the same layout and the race's streams are
   never touched. The three route variants give three layouts from the same
   spots.
3. **Instanced, capped per type.** Turtle, bat ray, sea lion and crab are one
   `InstancedMesh` each (caps 6, 4, 4, 12; the Kelp Coast asks for 2, 1, 2 and
   4). The turtle, the sea lion and the crab swim with the model's own morph
   clip, played per animal with three's per-instance morph weights
   (`setMorphAt`), so two turtles are never in step. The ray has no clip: its
   wings flap in the shader, strongly when it lifts off and as a slow ripple
   at rest. Sardines are the existing fish schools (cap 800 fish, quality
   count 480 High, 320 Performance, shared between the zone's three schools)
   with the DEEP-ART-SRC sardine model instead of the look test's procedural
   fish (the procedural fish remain, as the look test's approved geometry and
   as the fallback if the model does not load). The whale is the one thing not
   instanced: it is a single skinned mesh with its own swim clip (cap 1), drawn
   only while it passes.
4. **Reactions use the car's position only, and are smooth.** Each animal's
   state is its own; the car is a read-only `{x, y, z}` (the tests hand it a
   read-only proxy that fails on any write). A startled animal glides away at
   a top speed and glides back when the car has gone; nothing jumps:
   - turtle: turns away and slides off up to 6 m (top speed 2.5 m/s), and
     every 80 s rises over about 11 s to breathe at the surface;
   - bat ray: lies on the sand; within 11 m it lifts up to 2.4 m, flaps and
     moves off up to 7 m, then settles again;
   - kelp crab: within 7 m it goes sideways (its body square across its way)
     up to 3.5 m, legs running only while it moves;
   - sea lion: fast looping passes round its spot (4.5 to 6 m/s), drawn up to
     half way toward the car when it is within 70 m, and never closer than
     3.5 m to it;
   - sardines: the existing school rules (they part round the car and close
     behind it); a school more than 170 m from the camera is not worked out
     or drawn.
5. **The whale: one slow pass per visit, two ways to start it.** A pass starts
   (a) when the car comes within 70 m of the whale's spot at the Drop-off, or
   (b) when the Sirena is raised (`deepRaised` with find `sirena-car`), but
   only if this visit's whale has not passed yet. A visit is one dive's scene,
   so a new dive gets a new pass. It swims a straight 220 m line at 3 m/s
   (73 s), 22 m out on the deeper side of the trail, against the way the trail
   runs, about 6 m above the ground and always under the surface; it starts and
   ends inside the water's murk, so it swims in and away unseen. After the
   Sirena comes up the pass is anchored where the car is, so the Sirena's
   moment has the whale beside it. A raise that arrives before the whale's
   model has loaded is remembered and begins on the first frame after.
6. **How the raise reaches the scene (the named hook).** `render3d.js` already
   listens to the duel's events for the Deep view; one line passes
   `deepRaised` to `deepView.raised(find)` (`src/deep/deep-ui.js`), which
   forwards it to the current dive's scene (`createUnderwaterScene(...).raised`).
   Nothing is written back. Stepping the lift (`stepLift`) is not wired into the
   running game yet (DEEP-SIRENA-VIEW), so in the game today only the
   proximity start happens; a test covers the raise.
7. **Frame cost.** Measured in the browser on the look page, in the thickest
   place (the forest, the car inside a school, all 480 sardines, the nearby
   animals and the whale in its pass): see the table below. The creatures cost
   under 1.5 ms of CPU a frame and about 1 ms of the frame; far animals and
   far schools are skipped; models load once, as they arrive, and a model that
   will not load is skipped and reported (`failures`) while the dive goes on.

## Changed

- `src/deep/sea-life-rules.js` (new): the rules, no graphics: caps, the plan
  from the spots, each animal's motion and reaction, the whale's pass.
- `src/deep/sea-life.js` (new): draws them; one instanced mesh per type, the
  schools, the whale; asynchronous model loading with a replaceable loader.
- `src/deep/fish-school.js`: a school can take a given geometry
  (`geometry` option), and `fishGeometryFromModel` makes the school fish from
  the sardine model (one unit long, nose at +z, tail weights from the model).
  Default behaviour is unchanged.
- `src/deep/underwater-scene.js`: builds the sea life from the zone's spots,
  updates it with the car, exposes `sea` and `raised(find)`, disposes it.
  A zone without spots loads and draws nothing, as before.
- `src/deep/deep-ui.js` and `src/render3d.js` (one line each): the
  `deepRaised` hook of decision 6.
- `tools/deep-look-zone.js`: `?life=1` puts the Kelp Coast's creatures on the
  sample loop and `debug.placeCarAt` places the car anywhere, for the pictures.
- `tools/scenarios/deep-life.mjs` (new): plays eight situations, photographs
  them in the look page's water and joins the sheet; also measures the frame
  cost. It runs with the ordinary browser scenarios (0 warnings, 0 errors, and
  every model must load).
- `tools/test-deep-life.mjs` (new, 22 checks): the plan on all three routes,
  caps, determinism, smoothness (no jump over a top speed), under the surface
  and above the ground, each reaction, the sea lions' clear gap, the whale's
  one pass (both starts, once, never twice), no `Math.random` and no race
  imports, the real GLBs through the real drawing code (instanced, caps, a
  failing model skipped, the sardine fallback, no spots loads nothing, the
  read-only car).
- Files beyond the card's owned list (`sea-life.js`, `sea-life-rules.js`,
  `underwater-scene.js`, `deep-ui.js`, `render3d.js`, `deep-look-zone.js`, the
  scenario): the card named only the fish files, but its acceptance (all
  seven creatures, reacting, capped) and the `deepRaised` listening need them.

## Frame cost (look page, headless Chrome, this laptop, whole frame with the GPU waited for)

Not the game's delivered p95: the look page has no race, HUD or road; it shows
what the creatures add in the thickest place.

| Setting | Frame with sea life (median / p95) | Hidden (median / p95) | Sea life update alone | Drawn |
| --- | --- | --- | --- | --- |
| High | 2.0 / 4.5 ms | 2.1 / 3.3 ms | 1.2 ms | 480 sardines, 2 turtles, 1 ray, 2 sea lions, 4 crabs, whale passing; 188 draws |
| Performance | 1.3 / 3.4 ms | 1.2 / 1.5 ms | 0.8 ms | 318 sardines and the rest; 150 draws |

In Node the update alone is about 1.4 ms a frame (`test-deep-life`). The card's
18.5 ms delivered target is for the game's busiest view and needs the real
race; nothing here is near it, and the DEEP-SIRENA-VIEW work that wires the
dive into the game should measure it there.

## Removed

Nothing is replaced for good. The look test's procedural sardine stays: the
look test and its checks use it, and the scene uses it if the sardine model
does not load. DEEP-ART-FINAL's better models replace the working art; the
loader reads the same ids.

## Changed assertions

- `tools/test-deep-look.mjs`: the list of approved imports of Deep modules
  gains nine rows, all for the new `tools/test-deep-life.mjs` (the Deep's
  isolation rule asks every file outside `src/deep/` that imports a Deep
  module to be listed). Nothing about the rule or its other rows changed.

## Not done

- No otter (decision 1). The sea-life log (DEEP-LOG) and the creatures' sounds
  (DEEP-AUDIO) are other cards; nothing here counts a creature as found.
- The whale's song and the Sirena's own moment in the game wait for
  DEEP-SIRENA-VIEW and DEEP-AUDIO.
- The pictures use the look page's sample loop with the Kelp Coast's spots
  placed on it, not the real Kelp Coast (the real zone needs a whole Pacific
  Canyon race to build; the Node checks use the real zone on all three
  routes). Kyle should see the creatures in the real dive once the dive is
  reachable.

## Tests

- `node --test tools/test-deep-life.mjs`: 22 checks pass (about 3 s).
- Lane tier `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`
  on the merged tip: 39 passed, 0 failed (it first failed once on the import
  list above; fixed, rerun clean). `npm run build`: built.
- Browser: `scenario deep-life` (High) passed with 0 warnings and 0 errors, every
  model loaded, eight pictures and the cost table above; the Performance
  setting ran the same scenario clean.
- Race fingerprints: not touched (no race code, no race stream; the checks
  assert it).
