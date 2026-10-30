---
task: KOGANE-NIGHT-LIGHT
status: built-behind-switches
kind: course look
flag: kogane-pass, kogane-pass-night, kogane-pass-reverse
player_facing: no (Kogane Pass and its versions stay behind their dev switches)
---

# Kogane Pass: dusk and night light, readable (29 October 2026)

Fixes F4 and F5 of docs/changes/STORY-KOGANE-FINISH.md. Kogane's own files only
(`src/circuits/kogane-pass.js`); the Night and Reverse versions copy the parent,
so they follow. No shared code, no other course, no road, rule or sound change.

## The problem

- F4: at Kogane Pass at dusk, seen from the helicopter, the ground was black and
  only a pink strip of sky showed, so the tea house and the landing circle were
  hard to see.
- F5: on Kogane Pass Night the road near the Tea House Hairpin was almost black;
  lines and the headlight cone showed, the walls and roadsides did not. The
  early part of the road only read because the lanterns and tea house are near it.

## What changed

1. Dusk uses the same mountain dusk colours Panorama Ridge uses
   (`palette: 'mountain-sunset'` on the light path). Brighter ground and sky
   light at dusk, still pink and low. Night is unchanged by the palette, so the
   Night version's own light levels are the same as before.
2. The road is dry asphalt, not the glossy wet look (`wetRoad` removed). A wet
   road reflects the dark sky and shows black at night. Dry asphalt picks up
   the same light as Panorama Ridge's road, so it reads as grey road with its
   lines. Cost: the additive orange pools under the lower-road lamps (a look
   drawn only when `wetRoad` is set) are gone; the lamps, their glow dots and
   the sodium wash on nearby surfaces stay.
3. Stone walls, rails and the autumn trees take a soft glow of their own colour
   all along the road (`roadsideGlow`, `railGlow`, `treeGlow`), cool for the
   stone and rails, warm for the trees. Before, the sodium wash reached only
   within 17 m of the lower-road lamps (s 3280 onward), so the hairpins had none.
   The lamp wash `sodiumWash` still lights the lower road's surfaces as before.

## Why not more

The renderer lights night with one shared look for every course, and its ground
and road take only the sky and ground light, so Kogane's own files cannot raise
the dark grass beyond this. A lamp row at the hairpins would also have broken
`test-circuit-kogane` (it asserts every lamp stands at s 3270 or later), and that
test is not changed. If Kyle wants the grass lifted too, the next step is a
shared change to the night look, which is outside this card.

## Pictures

Round 1, 1280 by 720, memory-only saves, private port, no frame timing, from
`tools/scenarios/kogane-night-light.mjs` (new, a small look scenario in the style
of `kogane-c5-views`). Before and after sheet: Night at the start, mid course,
Tea House Hairpin and the village road; Kogane Pass at the tea house at dusk; the
helicopter on the Kogane pad. Reading: after, the walls, rails, road edge and
trees read at every point, the tea house and landing circle read in the
helicopter view, and it still looks like dusk (pink sky, dark hills) and night
(stars, dark grass). The grass at night is still dark by design. Sheet kept by
the Director, not committed.

## World signatures

`tools/fixtures/world-signatures/kogane-pass-night.json` and
`kogane-pass-reverse.json` change, for the light only: one fewer mesh, geometry
and material each (the wet-road lamp-pool mesh is no longer drawn), and a new
hash because the road and wash materials differ. Kogane Pass itself has no
signature yet. Every enabled course's signature is unchanged
(`test-world-composition` passes on all 57 checks without a recapture), and no
replay fingerprint moved.

## Checks

- test-circuit-kogane: pass. test-circuit-variants: 12 of 12 pass.
- test-world-composition: pass (enabled courses unchanged; Kogane's two
  signatures recaptured with `--capture-new` after removing the old files).
- Lane tier and `npm run build`: see the run log line for this card.

## Removed

- `wetRoad` on Kogane Pass (its lamp-pool mesh and glossy road). The old
  Kogane signature values for Night and Reverse, replaced.
## Claude's review (28 October 2026, night)

Claude reviewed the before/after sheet: dusk tea house and heli landing circle now readable, Night walls, rails and trees show at the Tea House hairpin, still night. World signatures for kogane-pass-night and -reverse refreshed after this reviewed visual difference; all others identical. Lost: lamp pools on the village road (wetRoad removed); follow-up: bring pools back without the wet road. No assertion changed.
