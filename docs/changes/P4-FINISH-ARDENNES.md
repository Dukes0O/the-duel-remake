# P4-FINISH-ARDENNES

Claude's finishing pass on Ardennes Forest (dev course), rounds 1 to 3, lane `claude/finish-ardennes`. Course data in `src/circuits/ardennes-forest.js`, plus its own test. The road, barriers, physics, seeds, reference lap, accepted art (merge 010c81ad: village, church, bridges, beeches, stream) and every released course are unchanged. Round 1 findings and the checklist verdicts are in the card report; the before and after sheet is `docs/board/looks/ardennes/round-3.jpg` with its verdicts in `round-3-review.md`.

## What changed

- **Braking boards (F1).** 150, 100 and 50 m boards (existing `braking-board-*` kit pieces) before Les Combes, Malmedy, Woodland Left, Fagnes, Campus and Stavelot: 17 boards (Stavelot's 150 m board would fall on Campus, so it is left out, the same rule Tremblant uses). They stand on the outside, on straight road, 2.4 m from the road edge, the same rule as the track script's own boards. Not solid. (Round 2 stood them 13 m out, beyond the run-off; Claude rejected that as unreadable at speed.) The track script's own boards (La Fontaine, Riverside, Bus Stop) are unchanged.
- **Paddock past the grid (F4).** Pit garages (every 7.5 m) and the main grandstand (every 15 m) now start at s -72.5 instead of 70 and 55. Garages 30 to 49, stands 25 to 33. The native pit lane starts at s 10 and stays within 18 m of the road centre; the garages stand at 31 m. The 7.5 m spacing steps over the 4 m closing seam just before the line (s -3.9 to 0), where the ground has no drawn surface under a kit anchor (first try at s -70 put one garage at s -2.5 and failed the existing kit check; see Tests).
- **Wet-road gloss (F3): tried and put back.** With `wetRoad` removed the grid's blue-grey patch stayed exactly where it was, and the other views changed by less than half a colour level on average. The patch is the pit-lane surface where it joins Pit Straight (s 10 to 40, the same blue-grey slab as the apron inside La Fontaine), not the wet look, so `wetRoad` stays as it was and its test is untouched. The pit-lane tone is added to card ARDENNES-PIT-GRASS's question.
- **Riverside mist (F7).** That bank's opacity .2 to .12. The other three banks are unchanged.
- **Team Room intel.** An `intel` block like Panorama's and Tremblant's: six flags (signature Red Water and The Wall; overtaking Kestrel into Les Combes and the Bus Stop; corners La Fontaine, Riverside, Long Left) and engineer notes for all 18 analysed corners. Wall Crest keeps the generated crest flag; engineer notes apply only to analysed corners (review finding, fixed). Sectors are left at the default thirds, so the course fingerprint and the bundled reference lap are unchanged. Board numbers in the notes are given only where boards stand.

## Not done, and why

- **F5 deeper forest, firs behind Stavelot and behind the left-hand stands.** Out of this card: it needs a second, far forest band so the accepted beeches stay put (the forest band is one seeded pass whose tree names and random sequence pick the beeches). Card ARDENNES-FAR-FOREST (owner Claude, integration 1e91ca0b).
- F2 (fade the damp-road edge), F6 (grass on the pit-lane apron) and F8 (review frame at 3,848 m) are Codex cards ARDENNES-DAMP-FADE, ARDENNES-PIT-GRASS and QA-REVIEW-RUNUP-3848 (integration 856a2441).

## Numbers

- Planted trees 9,131 before and after, identical positions, names and scales; beeches 191 before and after, identical (checked by listing every tree and beech before and after). Rocks 84, unchanged. Kit placements: kit solids 2,182 to 2,209 (the extra garages and stands).
- Native eight-car race, both qualities, before and after identical: player laps 147.268 s and 139.408 s, zero player crashes or resets, all seven CPUs finish, the same five CPU incident rows, no opening pile-up.

## Pictures

`docs/board/looks/ardennes/round-3.jpg` (340,566 bytes): before and after, High (grid chase camera, grid in mist, Les Combes braking point, Fagnes approach beside the script's own Bus Stop boards, Riverside). Raw views: `.evidence/2026-10-15/P4-FINISH-ARDENNES/{views,views-r3,review-high,review-r3}` in the integration folder; the round 1 and round 2 sheets stay there only.

## Tests

- Focused run 1 (test-circuit-ardennes, test-circuits, test-track-kits, test-world-composition, jobs 4): 3 passed, 1 failed. test-track-kits: "Track kit placement has no rendered terrain beneath its anchor" for the garage at s -2.5 (the closing seam). Fixed by starting the paddock at s -72.5; no assertion changed. Focused run 2: 4 of 4 passed.
- Lane tier run 1: failed only the repository placement check (sheet named `finish-round-2.jpg`; only `round-N.jpg` is admitted). Run 2: 41 of 42, failed only the 20 MB looks check (sheet too large for the room left). Run 3 without the sheet: 39 of 39; build passed.
- Round 3 (boards at 2.4 m, sheet and looks clean-up): focused 4 of 4 passed (301 s); the final lane tier and build on the merge candidate are recorded in `docs/board/run-log.md`.
- Independent review: one real fault (an authored Wall Crest flag and note that the Team Room never shows), fixed and confirmed; the rest clear (fingerprint track-v1-ba6d2be1 unchanged).
- World signature: this lane has no Ardennes signature file (the course is dev; the first one is being captured in the ardennes-switch-on lane). The switch-on card says to recapture it after this pass merges.

## Looks budget

`tools/test-review-evidence.mjs` holds `docs/board/looks` under 20,000,000 bytes and only 64,801 bytes were free. With Claude's go-ahead, the consumed accepted art sheet `ardennes-art/round-4.jpg` (316,397 bytes) and the superseded `ardennes-art/round-1..3-review.md` notes were removed; their verdicts are folded into `round-4-review.md`. Looks total after: 19,951,464 bytes.

## Changed assertions

- None changed. Added: a check that every finishing-pass board stands 2.4 m from the road edge like the script's boards, on straight road, on the outside of the corner it announces, and is not solid.

## Removed

Nothing in the game. Consumed evidence: `docs/board/looks/ardennes-art/round-4.jpg` and `round-1-review.md` to `round-3-review.md` (verdicts folded into `round-4-review.md`). Two untracked leftovers in the integration folder, `p4-panorama/round-2.jpg` and `round-2-review.md`, were already gone when checked.

- Round 3 recaptured the Ardennes scene signature for the board move only (7e3fd47f to 5a96dada); node, mesh, instance, geometry, material and texture counts unchanged; every other scene row exact. Reviewed from the round-3 sheet; Kyle approved committing and merging it on 15 October 2026.
