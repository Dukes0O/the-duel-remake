# P4-HARBOUR-FINISH-2: second finishing round on Harbour Lights

Claude (Opus agent), 11 October 2026. Design: `docs/CIRCUITS.md` section 5.2; round one:
`docs/changes/P4-HARBOUR-FINISH.md`. Switch unchanged (`harbour-lights` with `grand-prix`). Road, race
rules, timing, field settings and the Team Room intel are untouched. Every shared-file change is an
opt-in read from the circuit's own data (`waterside`, `facades`, `streetLight`, `kitLook`,
`mergeKitMeshes`, `smoothInnerWalls`); other circuits draw exactly as before.

## What changed, per item on Claude's list

1. **Street light pools.** Pools are now about a quarter of the old size with a steeper fall-off
   (`src/circuit-water.js`), weaker, and mostly warm white with every third lamp sodium orange through the
   old town (`lampLook`, `src/night-glows.js`). The lantern and neon pools are smaller and weaker too.
   The asphalt between them stays dark.
2. **Water.** Deep navy-black water (base colour, shallows and the sky mirrored in it all lowered), and
   broken vertical streaks of light on it: one instanced draw puts a streak under every lamp, yacht
   light, pier lamp, the lighthouse and a few windows across the water, placed where the eye meets the
   light's mirror image and smeared along the view (`src/waterside-scenery.js`). The catch fence is
   gone where water lies beyond the wall (`openToWater`, `src/circuit-kit-layout.js`); a slim two-rail
   railing on posts stands on the wall there instead. Yachts (sail and motor, masts, masthead, stern,
   cabin and red/green riding lights), a marina (pier, finger pontoons, 16 or so moored yachts, pier
   lamps) in the Seafront harbour, more yachts in the Harbour Road basin.
3. **Facades.** `src/night-wash.js` gives a surface a warm wash of street light near the ground (a glow
   in its shader, no real lights) and can tint each placement a different wall colour. The kit
   shopfronts take it (`kitLook.wash`, `src/track-kits.js`) with cream, ochre, pink, terracotta and sage
   plaster. The legacy warehouse blocks behind them become plaster in the same palette with
   washed walls and cream trim (`facades`, `src/scenery-detail.js`). `src/street-facades.js` adds, on the
   face of each near building that looks at the road: shutters, small balconies, a cornice and parapet,
   lit shop windows and awnings, in two instanced draws per 200 m. Palms along the Seafront (one draw).
4. **Long straights.** A tall harbour lamp (11.5 m, arm over the road, lit lens, halo, road pool and
   reflection) between the ordinary lamps along the waterside of the Seafront, Reservoir Run and Harbour
   Road, which puts a lamp every 20 m on the water side. Landmarks: a lit marina on the Seafront, a
   lighthouse on a mole at the harbour mouth (banded tower, lantern, a sweeping double beam) seen from
   Harbour Road and the Reservoir Run's end. The Lantern Tower stands above Casino Corner, which is behind
   the car on both long straights, so it shows on the Seafront (frames 3 and 4), not on them.
5. **Lantern strings.** Kept; the soft bulb lights stop growing at about 30 pixels (was 44) and start
   smaller, and the lanterns are 15% smaller.
6. **Hairpin island.** The wall inside the Lantern Hairpin (radius 9 m) is drawn as one smooth ribbon
   (`smoothInnerWalls`, `src/track-script-scene.js`, no kit pieces there). The physical boxes stay
   in the physics; only their drawing is replaced.

## Frame cost

Kit pieces made of many parts are joined by material when loaded (`mergeKitMeshes`,
`mergeModelByMaterial` in `src/track-kits.js`: shopfronts, neon signs, lantern strings, tower, garages): the
same picture, far fewer draws, which also shortens the contact-shading pass. Everything added here is
excluded from that pass. Draws, eight cars, old town: High 2,502 (3,039 after round one), Performance
1,174 (2,357); mid race High 1,852 (2,431), Performance 756 (1,830). Timing numbers are in the final
section below.

## Look sheet

`docs/board/looks/p4-harbour/round-2.jpg` replaces round 1 (and its note) in this commit: the 16-frame
review sheet at High, chase camera, test driver.

## Changed assertions

`tools/test-circuit-harbour.mjs`, "the street has everything the card asks for": the old line
`concrete-wall count == catch-fence count` could not hold once the water side loses its fence. It now
says more: every wall has a fence at its own place except where water lies beyond it (the same test the
layout uses), and every wall with water beyond has none (walls beside the run-off roads are skipped; they carry
their own fences at their own stations). No other assertion changed.

## Removed

- The round-one lamp pool shape (22 by 9 m, strength .2) and the old catch fence beside the water.
- The jagged inner wall of the hairpin (the short kit pieces and drawn boxes there).
- Nothing else replaced; the shared helpers are only used by circuits that ask for them.
