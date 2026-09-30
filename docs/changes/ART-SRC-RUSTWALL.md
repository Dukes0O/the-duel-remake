# ART-SRC-RUSTWALL — existing salvage and canyon sources

Status: source checkpoint ready; catalog waits for Crew then Hands to merge.

Three verified CC0 source sets are compared with the current in-game Rustwall.
Recommend Kenney Car Kit for loose car and sheet-metal salvage, Kenney City Kit
Industrial for metal structures, and the existing Quaternius Nature rock cache
for canyon forms. These are existing parts that need fitting; no adaptation,
new sculpting or runtime replacement has started. Kyle’s source choice follows
the catalog and merge checks.

## Evidence

- `docs/board/looks/rustwall-src/round-1.jpg`: one 182,867-byte comparison sheet.
- `round-1-review.md`: primary source pages, authors, licences, exact checksums,
  measured geometry and the fit gaps for each set.
- `tools/art/rustwall-source-sheet.py`: repeatable original source inspection,
  previews and sheet composition, with no model or asset exports.
- `tools/scenarios/art-source-rustwall.mjs`: production wall capture in a
  stopped private memory-only Hidden Road fixture, with no profile persistence.
- Original licensed sources: Kyle’s external `art-library` cache.

## Checks

Blender 4.5.13 inspected eleven originals. The car is 2,032 triangles;
its checked loose salvage parts are 40–116 each. Tower/container/chimney are
968/402/218. The four rock sources are 70/80/72/90. All are static models.
Kenney textures are the original 512 × 512 palettes. Quaternius source rocks
use native diffuse colours, displayed with Workbench to avoid an imported
FBX shader-alpha inconsistency; no source material was edited.

Private browser capture passed on port 58491: one image, memory-only storage,
zero warnings and zero errors. The actual production wall is ready with no
load errors and draws 10 calls / 54,858 triangles in the isolated front view.
The finished JPG was inspected for actual current wall content, all candidate
parts, visible rocks, accurate counts and readable labels.

The mandatory lane tier, production build and independent review await the
Director’s gate queue. This source checkpoint claims no passing merge gate.
No new implementation tests are needed for a source-only comparison.
Existing assertions, race fingerprints, source assets and runtime code are
unchanged. The shared catalog has not been edited while its other lanes work.

## Removed

No runtime asset or code path is replaced by this source shortlist. The blank
FBX-preview draft was rejected and replaced before committing the one review
sheet. Raw images and diagnostic JSON stay in ignored evidence and are deleted
by the Director after the review verdict is recorded. Licensed originals and
licence files remain in Kyle’s external art library.
