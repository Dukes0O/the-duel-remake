# WILD-ART-SRC: North woods round 2 of 3

28 October 2026. Partial round 2 preparation; no group sheet submitted. No merge, push,
course placement or live installation. Round 1 source details remain in Git.

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

PARTIAL, NOT GREEN. The shared two-job limit prevented completion. A
15-minute queued batch obtained one brief slot and completed only the moose.
The slot closed before the other four animals could start. Combined with
the preceding process checks and manual waits, this reached the job's
30-minute tool-problem limit. The batch exited 2 without launching another
animal. Stopped as the user required; no extra heavy job was started.

- Python syntax parsing: PASS for all wildlife recipes.
- Pure round 2 output plan: PASS with a root named wildlife-round-1. It
  preserves that root and plans only its round 2 evidence subfolder.
- Moose build and exported-GLB review: PASS, Blender CPU with two threads.
  Actual output: 3,170 triangles, 891,992 bytes, one embedded 1024-square
  coat map, 17 bones, Idle and Walk. Both clips were sampled at six phases;
  all bounds finite. Lowest sampled Z: Idle -2.39 mm, Walk +2.09 mm.
  Side, three-quarter, idle and walk pictures were inspected. No exploded
  limbs or detached antler palms were seen. This is not an art pass.
- Other four models: NOT REBUILT. Their source edits are committed, but
  their runtime candidates remain from round 1. This mixed set is not a
  finished round 2 and must not merge on this evidence.
- Required node tools/run-tests.mjs --tier lane --changed --jobs 2:
  NOT RUN. No shared heavy-job slot was available before the stop limit.
- npm run build: NOT RUN, for the same reason.
- Existing test-blender-output, board and repository-hygiene suites:
  NOT RUN this round. No previous passing result is claimed for these edits.
- Round 2 sheet and requested scratchpad copy: NOT PRODUCED. Round 1's
  sheet remains because its replacement has not been produced and committed.
- No browser scenario, frame timing, real-save access, merge or push.

To resume, rebuild/review only the four unfinished species with Blender
background mode, -t 2, tools/blender/wildlife/<id>.py -- --root <lane>;
review adds --review --round 2. The moose recipe is complete, but its
pictures were recycled after recording this result and will need rendering
again for the eventual sheet. Compose with sheet.py --root <lane>
--references C:/Users/kyleb/dev/art-library/wild-north-woods/reference
--round 2, then run the required gates and build under the shared-job cap.
Both catalog-pin failures still need Claude's written review as described
above. No pin was moved. No group art round is claimed complete.

Independent source review found a round-path substitution bug: replacing
text in a full path could change a root folder named wildlife-round-1.
Fixed by constructing only the evidence subfolder from --round. Reviewer
confirmed the fix with that exact root and marked source CLEAR. Art verdict
belongs to Claude. No frame timing or game browser is needed for this card.

## Changed assertions

No existing assertion, tolerance, replay fixture or world signature changed.
Repository hygiene adds only the user-required exact round 2 JPG path to its
allowed compressed sheets. It still rejects other raw evidence paths.
The existing default round 1 output plans remain unchanged.

## Removed

The failed moose construction and its unused deer branch are replaced by the
new moose anatomy recipe. Round 1's sheet is retained until a replacement sheet is committed. Own
round 2 render output, logs and the unused temporary build launcher are
recycled after recording the partial result. No licensed originals or
pre-existing evidence folders are removed.
