# TEAMROOM-VARIANT-NOTES

Written Team Room notes for the three reverse variants: Harbour Lights Reverse, Panorama Ridge Reverse and
Tremblant Woods Reverse (switch `dev`). Card: `docs/board/cards/TEAMROOM-VARIANT-NOTES.md`. Notes only: the
words on screen change, no road, race rule, save or reference lap does.

## What changed

- `src/circuit-intel/harbour-lights-reverse.js`, `panorama-ridge-reverse.js`, `tremblant-woods-reverse.js`
  (new), registered in `src/circuit-intel/index.js`. The variants are built with their parent's inline intel
  removed, so the registry is the one place their notes can live.
- Before writing, each variant's real analysed corners were printed from its dossier and reference lap (id,
  name, direction, radius, approach and minimum speed, gear), with the slope in and out of each corner, the
  piece list and the brake boards that really stand in the world. The parent's corner names are kept, but every
  corner is met in the opposite order and direction, so the notes were written fresh. Examples: Final Turn is
  now the first bend after the start line; Devil's Chicane 2 comes before Devil's Chicane 1; the Old Town Esses
  are met as 4, 3, 2, 1; the Panorama Ridge Esses are now a climb up to Skyline and The Cutting a steep drop;
  Lakeside Plunge is a climb.
- Every slow corner has a `line` and a `note`. Each variant has a written signature view (Timber Straight and
  the chairlift; the Old Town Esses crest; Skyline) and its passing zones (one on Tremblant Woods, two on each of
  the others), with notes keyed under the flag id.
- Harbour Lights Reverse keeps its signature view on the Old Town Esses crest, where the shared analysis already
  put it. The Lantern Hairpin was tried first (as on the parent), but its picture is taken from a spot where the
  camera is lifted above a nearby road, which the `team-room` browser check does not allow; the hairpin keeps its
  written corner note.
- `brakeBoard` is named only where a board of that distance stands before the corner. Devil's Chicane names
  none: its boards stand before the first half, not before the corner each note belongs to. Lantern Hairpin
  names the 50 m board, the only one it has.
- No `sectors` anywhere, so the three reference laps stay valid.

## Dusk and night variants

Harbour Lights Dusk and Panorama Ridge Night drive the parent's road the same way and are built by copying the
parent's course description, which carries its inline intel. They already show exactly their parent's notes,
flags and sectors, so nothing was added for them. A new test pins this. (Tremblant Woods has no dusk or night
variant; Tremblant Snow is a separate course with its own notes.)

## Tests

`tools/test-track-analysis.mjs` (5073 checks): for each reverse variant, no note key without a real
corner or written flag; every slow corner has a written note; every corner flag and written flag has a line
and a note over 20 characters; one signature and one or two written passing zones; no `sectors` in the resolved
notes; a named brake board really stands that far before the corner (script board or placed board; a 150 m
board on the Lantern Hairpin was tried and the test failed it); no em dash and none of the banned words. For
the dusk and night variants: notes, flags and sectors equal their parent's. No existing assertion changed.

## Removed

Nothing: the variants had no written notes, so there is nothing to replace.

## Parent passing-zone notes (Claude)

Harbour Lights `casino` and Panorama Ridge `conrod` and `murray` passing-zone
flags showed only their title; each now has a written line and note under its
flag id in the circuit's `intel.notes` (Harbour's `harbour-turn` already had
one). Notes only; sectors and reference laps unchanged.
