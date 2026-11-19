# WILD-HIT: cars knock animals down (switch `wildlife-hits`, dev)

Kyle, 19 November 2026: hit the animals beside the road, smash them like other cars, crush them in the monster truck,
leave a small heap with a bit of red blood. Design: `docs/HELI_WILDLIFE.md` section 3.5.

**What changed.** `src/wildlife-view.js`: any car whose middle comes within 2.4 m of an animal on the ground (the monster
truck, `kind: 'monster'`, 3.4 m) knocks it down: thrown 1.2 m on, lying on its side as a heap (flattened by the monster
truck), a ragged dark-red stain under it on the ground's slope (wider under the monster truck); it stays for the race.
Drawing only: the car feels nothing, no race rule, replay or pay changes. The player's own hits play `vehicle.crush`
(new `animalHit` in `src/audio.js`, harder from the monster truck). `src/render3d.js` passes the switch, the monster-truck
flag and the sound. New switch `wildlife-hits: 'dev'` in `src/feature-flags.js`.

## Checks
- `node tools/test-wildlife-view.mjs`: 3862 checks (new section: switch off hits nothing; heap on its side, low, thrown on;
  one red stain under the middle of each heap; sound once per player hit, none for other cars; heap stays; monster
  truck flattens and widens). Fails when the reach or the flattening is broken, or the stain sits off the heap.
- `node tools/test-feature-flags.mjs`: 133 checks.
- Browser look `tools/scenarios/wildlife-hits.mjs` on `2322c1589`: passed; car: 2 deer down on their sides (squash .6),
  monster truck: 2 flattened (.17), one stain under each, sound once each. The first look (on `5fda7fbba`) showed stains
  wider than the deer and purple from mirroring the sky; cured in `61f72af00` (smaller, matte deep red, smoother edge).
- Lane tier on `2322c1589` (integration `bb7aace9c` merged in): 86 passed, 0 failed, 0 not run; replay fingerprints 297
  checks unchanged. The first lane tier on `5fda7fbba` failed `test-preview-launcher` (the Preview must ask for every dev
  switch); `start-preview.bat` now asks for `wildlife-hits`. `npm run build` passes.
- Left to the night by the lane tier: `test-arena-shove`, `test-circuit-layouts`, `test-convoy-tanker-art`,
  `test-first-person-polish`.
- Stays behind the dev switch until Claude has seen it in the game (done, pictures sent to Kyle) and Kyle has tried it.

## Changed assertions
`tools/test-wildlife-view.mjs`: the stain outline test follows the new 28-point outline and a 65-115% radius band
(was 14 points, 70-115%), for the smoother edge. `tools/test-feature-flags.mjs`: the switch count 58 -> 59 and `wildlife-hits` joins the stay-dev list (one new switch;
nothing loosened).

## Removed
Nothing; this adds to the wildlife view.
