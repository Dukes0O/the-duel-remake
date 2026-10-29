# WILD-ART-SRC: North woods round 2 of 3

28 October 2026. Round 2 submitted for Claude's art verdict. Continued
30474271 without changing its recipes. No merge, push, course placement or
live installation. Round 1 source details remain in Git.

## Design and changes

Claude's full round 1 verdict and the round 2 design, written before code,
are in docs/board/looks/wildlife/north-woods-round-2.md.

- Bear: retain accepted shape, add stronger fine coat variation and full
  material roughness with reduced specular response.
- Deer: darker grey-brown coat, smaller throat patch, white belly and inner
  legs, raised tail with white underside, darker antler bases. Paint the
  refined donor mesh so markings follow anatomy rather than coarse faces.
- Moose: rebuild the barrel and tall shoulder hump, heavier upper legs,
  lighter grey-brown lower legs, drooping muzzle, throat bell and two
  skull-rooted antler beams with broad separate palms and short rim points.
- Beaver: dark chestnut coat and grey-black paddle with crossed scale marks;
  broaden tail and lift back slightly. Keep 1.10 m donor fit along its length.
- Wolf: darker grizzled grey-brown coat with dark saddle, tawny ears/legs,
  pale chest/belly only, broader neck/chest and longer-legged proportions.

The donors remain Quaternius CC0 deer/wolf and Poly by Google CC BY 3.0
bear/beaver. Moose remains original. Source URLs, hashes and credits are
unchanged in tools/blender/wildlife/sources.json, tools/art/catalog.json
and public/assets/audio/credits.html. Originals and existing photographic
references stay in the external wild-north-woods cache, read-only this round.
No new dependency, download, reference generation or runtime request.

All donor skeletons and source clips are retained. Each export has one
embedded 1K coat map, skin weights and Idle/Walk; the hard limit remains
5,000 triangles. --round selects review output and sheet paths; the default
round 1 planner contract stays compatible with its existing assertions.

## Catalog failures: cause proved, pins unchanged

Both tests hash all catalog rows outside their own card, so four legitimate
wildlife provenance additions from round 1 change both pins. This is not
caused by files in public/assets/wildlife or by a merge mistake. Filtering
ONLY those four records from the actual 59-row catalog reproduces both
expected hashes exactly; the other 55 rows have not changed.

| Check | Existing expected SHA256 | Actual SHA256 with four wildlife records |
| --- | --- | --- |
| P4 non-P4 rows | c75abff9d24ae7becbf8411c0222ff9b1a6aa30b003ec951672e56a63af05808 | 2a15f3a5ad39955562b945c4bcf711d19d9503a5c06197cac07d63acc149961f |
| Tanker non-Factory rows | 6df6a61ed4f40b06c9dd7f4d4dd0e4e0286625af03d35ca5eebdb0e5574f8bea | fed1efb5f62cea25e613462bb4380987b23622395cf080c9e2b0b1d7baf9a116 |

The added IDs are wild-north-woods-white-tailed-deer,
wild-north-woods-eastern-wolf, wild-north-woods-black-bear and
wild-north-woods-beaver. They hold each donor's licence, original hash,
source link and adaptation disclosure. Removing these records or hiding them
in another file just to recover the pins would discard required provenance.
Claude's written review is needed for deliberate catalog-pin changes. This
lane does not move either pin. No catalog row changes in round 2.

## Validation

All four unfinished exports completed with Blender background mode and two
CPU threads. The existing moose export was retained. All five exported GLBs
were imported for review with --review --round 2. Each Idle and Walk clip
was sampled at six phases; all bounds were finite. Thirty actual-export
pictures were inspected with no detached parts or exploded limbs observed.
The round note records triangle counts, bytes and lowest sampled positions.
All models stay below 5,000 triangles, with one embedded 1K coat map.
The deer and wolf retain their donor clips as well as Idle and Walk.
Beaver nose-to-tail extent in the exported position bounds is 1.098954 m.
Its tail remains within the already approved 20 mm grass allowance.

The existing sheet.py produced north-woods-round-2.jpg, 337,151 bytes,
from the actual GLB renders and existing references. It was visually checked
and copied only to the exact scratchpad filename requested in the brief.
Both copies have SHA256
2bd6bcfacb8b14b75508068992671e8240b94fb098fa7f7e1d6df43fa38da36c.
Claude's full round 1 verdict is in the round 2 note. Round 2 art judgment
is pending; no round 3 work started. The shapes remain stylised and the
beaver remains small at the fixed 14 m camera. No art pass is claimed.

- node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going
  --json: 84 of 86 suites passed; two failed; zero not run; 794.24 s.
  Only P4-KITS and tanker-valve-source failed, at the exact catalog pins
  proved above. The lane is NOT GREEN and must not merge on this evidence.
- Existing Blender-output suite: 141 checks passed, zero failed. It checks
  all five actual GLBs, budgets, embedded textures, skins and donor clips.
- Board: 155 checks passed. Repository placement passed in the lane gate.
- Replay guard: 225 checks across 25 cases and three FPS values passed.
  World composition: 47 complete-scene checks across twenty events passed.
  No replay fixture or world signature was changed or regenerated.
- Production build: PASS, 599 modules, 1.34 s, using npm.cmd run build --
  --configLoader runner --outDir .qa-dist/wildlife-build. The plain command
  first exited 1 before Vite could start because the linked dependencies
  lack .bin/vite.cmd, as already documented in round 1. A temporary
  lane-local launcher invokes the existing Vite package. The runner config
  loader avoids writes through linked node_modules. Existing mixed-import
  and large-chunk warnings remain. No dependency or shared file was changed.
- git diff --check: PASS.
The user explicitly renewed waiting and retries for shared slots, so the
previous queue timeout did not end this continuation. No check used more
than two workers. The queue wait was retried until capacity opened.
No browser scenario, frame measurement or real-save access.

The independent source review recorded on 30474271 remains applicable:
this continuation changes no recipe or test source. Its root-path fix was
confirmed by that reviewer. The catalog-filter proof was repeated read-only
and reproduced both old pins exactly when only the four wildlife records
were excluded. No pin moved.

## Changed assertions

No existing assertion, tolerance, replay fixture or world signature changed.
The prior 30474271 commit added only the user-required exact round 2 JPG
path to the repository hygiene sheet allow-list; this continuation changes
no test source. It still rejects other raw evidence paths.
The existing default round 1 output plans remain unchanged.

## Removed

The four round 1 runtime exports are replaced in place by their round 2
exports. The rebuilt moose already replaced its failed predecessor in
30474271. Round 1's sheet was recycled after round 2 was committed as
800c7f98, as the brief requires. Own temporary render output, motion
montages, logs, launchers, production build and the salt-flats suite's new
98rTyh fixture folder were recycled after their results were recorded.
No .evidence folder was created or traversed. No licensed original,
existing evidence folder or other scratchpad file is removed. Cockpit sync
is deferred to the Director under the lane-only boundary. STATUS was
refreshed only in this lane, with other lane working-file inspections skipped
and no live root supplied. No integration board or Cockpit entry changed.
