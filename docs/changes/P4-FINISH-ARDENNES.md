# P4-FINISH-ARDENNES

Claude's finishing pass on Ardennes Forest (dev course), round 2, lane `claude/finish-ardennes`. Course data in `src/circuits/ardennes-forest.js`, plus its own test. The road, barriers, physics, seeds, reference lap, accepted art (merge 010c81ad: village, church, bridges, beeches, stream) and every released course are unchanged. Round 1 findings and the checklist verdicts are in the card report; the before and after sheet is held in `.evidence/2026-10-15/P4-FINISH-ARDENNES/round-2.jpg` (integration folder) until it has room in the repository; see Looks budget.

## What changed

- **Braking boards (F1).** 150, 100 and 50 m boards (existing `braking-board-*` kit pieces) before Les Combes, Malmedy, Woodland Left, Fagnes, Campus and Stavelot: 17 boards (Stavelot's 150 m board would fall on Campus, so it is left out, the same rule Tremblant uses). They stand on the outside, on straight road, 13 m from the road edge: beyond the 12 m run-off and inside the 14.3 m catch fence. Not solid. The track script's own boards (La Fontaine, Riverside, Bus Stop) are unchanged.
- **Paddock past the grid (F4).** Pit garages (every 7.5 m) and the main grandstand (every 15 m) now start at s -72.5 instead of 70 and 55. Garages 30 to 49, stands 25 to 33. The native pit lane starts at s 10 and stays within 18 m of the road centre; the garages stand at 31 m. The 7.5 m spacing steps over the 4 m closing seam just before the line (s -3.9 to 0), where the ground has no drawn surface under a kit anchor (first try at s -70 put one garage at s -2.5 and failed the existing kit check; see Tests).
- **Wet-road gloss (F3): tried and put back.** With `wetRoad` removed the grid's blue-grey patch stayed exactly where it was, and the other views changed by less than half a colour level on average. The patch is the pit-lane surface where it joins Pit Straight (s 10 to 40, the same blue-grey slab as the apron inside La Fontaine), not the wet look, so `wetRoad` stays as it was and its test is untouched. The pit-lane tone is added to card ARDENNES-PIT-GRASS's question.
- **Riverside mist (F7).** That bank's opacity .2 to .12. The other three banks are unchanged.
- **Team Room intel.** An `intel` block like Panorama's and Tremblant's: six flags (signature Red Water and The Wall; overtaking Kestrel into Les Combes and the Bus Stop; corners La Fontaine, Riverside, Long Left) and engineer notes for all 18 analysed corners. Wall Crest keeps the generated crest flag; engineer notes apply only to analysed corners (review finding, fixed). Sectors are left at the default thirds, so the course fingerprint and the bundled reference lap are unchanged. Board numbers in the notes are given only where boards stand.

## Not done, and why

- **F5 deeper forest and firs behind Stavelot, and the few firs behind the left-hand stands (F4).** Not possible as course data without moving the accepted beeches. The forest band is one seeded pass (`scatterScenery` in `src/track-script-course.js`) whose trees are numbered in order; the beeches are chosen from those trees by number and by distance (`beechTreePlacements` in `src/vegetation.js`). Any change to the band's depth, rows or clear zones changes the random sequence and the numbering for every later tree on that side, so the beech groves on Kestrel and the Forest Run would move or change. A deeper forest band to 100 m would also turn its new trees inside the grove reach into beeches. This needs a small code change: an optional second, far forest band with its own random numbers and its own tree names, placed after the first band and kept out of the beech selection. Stopped and reported to the coordinator.
- F2 (fade the damp-road edge), F6 (grass on the pit-lane apron) and F8 (review frame at 3,848 m) are Codex cards ARDENNES-DAMP-FADE, ARDENNES-PIT-GRASS and QA-REVIEW-RUNUP-3848 (integration 856a2441).

## Numbers

- Planted trees 9,131 before and after, identical positions, names and scales; beeches 191 before and after, identical (checked by listing every tree and beech before and after). Rocks 84, unchanged. Kit placements: kit solids 2,182 to 2,209 (the extra garages and stands).
- Native eight-car race, both qualities, before and after identical: player laps 147.268 s and 139.408 s, zero player crashes or resets, all seven CPUs finish, the same five CPU incident rows, no opening pile-up.

## Pictures

`round-2.jpg` (458,543 bytes, held in evidence): before and after, High, from the same native views and review frames (`.evidence/2026-10-15/P4-FINISH-ARDENNES/views`, `views-final`, `review-high`, `review-final` in the integration folder). Honest reading: the grid is the clear gain (stands and garages on both sides of the field). The new boards read, but small: at 13 m from the road edge they stand at the fence line and look pale at a distance, smaller than the script's own boards at 2.4 m. The Riverside change is subtle (the inside of the hairpin is about 10 colour levels darker); the sheet's edge still shows faintly.

## Tests

- First focused run (test-circuit-ardennes, test-circuits, test-track-kits, test-world-composition, jobs 4): 3 passed, 1 failed. test-track-kits: "Track kit placement has no rendered terrain beneath its anchor" for the garage at s -2.5 (the closing seam). Fixed by starting the paddock at s -72.5; no assertion changed.
- Second focused run: 4 of 4 passed (480 s).
- World signature: this lane has no Ardennes signature file (the course is dev; the first one is being captured in the ardennes-switch-on lane). The switch-on card now says to recapture it after this pass merges.

## Looks budget

The lane tier's `tools/test-review-evidence.mjs` holds `docs/board/looks` under 20,000,000 bytes. The committed looks total is 19,935,199 bytes, so only 64,801 bytes are free and this 458,543-byte sheet failed the check (lane run 2: 41 passed, 1 failed). The sheet is therefore not committed. To commit it, about 394 KB must leave the looks folder first. Candidates, none removed here because they belong to other cards: `ardennes-art/round-4.jpg` (316,397 bytes, the accepted art sheet; its verdict is in `round-4-review.md` and on P4-ARDENNES) with the three superseded `ardennes-art/round-1..3-review.md` notes, or another family's consumed sheet in a janitor sweep. The integration folder also holds two untracked leftover files, `p4-panorama/round-2.jpg` and `round-2-review.md` (427,090 bytes, removed from Git by P4-FINISH-PANORAMA), which make that folder's disk total read higher than Git's.

## Changed assertions

- None changed. Added: a check that every finishing-pass board stands beyond the run-off, inside the fence, on straight road, on the outside of the corner it announces, and is not solid.

## Removed

Nothing in the game. The round 1 finishing sheet was never committed. When the round-2 sheet is committed it must be named `docs/board/looks/ardennes/round-2.jpg` (the repository admits only `round-N.jpg` look sheets; `round-1.jpg` there is the accepted layout map).
