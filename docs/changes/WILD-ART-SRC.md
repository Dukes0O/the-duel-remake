# WILD-ART-SRC: North woods round 1

28 October 2026. One candidate round for Claude to judge. This note replaces
superseded source-access holds and inspection logs retained in Git history.
No course placement, live installation, merge or push is part of this lane.

## Design and source choice

The user directed donor-first work, replacing the stopped run's original-only
plan. Direct Poly Pizza model-page GLB links worked without an account or key.
No Google Drive quota link was retried. OpenGameArt/Kenney searches and Poly
Pizza's moose results supplied no usable moose donor in the allowed libraries;
the existing original moose recipe was retained and matched to the reference.
The downloaded Poly beaver is reused, rather than the stopped original recipe.

| Candidate | Donor and licence | Changes | Triangles |
| --- | --- | --- | ---: |
| White-tailed deer | [Deer](https://poly.pizza/m/T6Cs7tmMHJ), Quaternius, CC0 1.0 | Smaller ears/eyes, narrower lower legs, whitetail antlers, white flag/throat, natural coat and metric fit | 4,352 |
| Moose | Original Blender recipe | Palmate antlers, high shoulders, long muzzle, dewlap, dark coat, weighted rig | 2,346 |
| Black bear | [Black bear](https://poly.pizza/m/56ym_pyVnel), Poly by Google, CC BY 3.0 | Metric fit, muted coat, weighted rig and new Idle/Walk | 3,000 |
| Beaver | [Beaver](https://poly.pizza/m/fwtA7VLrXPr), Poly by Google, CC BY 3.0 | Approved 1.10 m fit, minimum-paw pivot, natural coat, weighted rig and new Idle/Walk | 2,600 |
| Eastern wolf | [Wolf](https://poly.pizza/m/P1gU3Qkr9r), Quaternius, CC0 1.0 | Smaller ears/eyes, longer-legged fit, grey-brown saddle, natural coat | 4,100 |

Deer and wolf retain the original bone hierarchies and all 26/24 named source
clips, including Idle and Walk. A parent handles orientation and metric units.
All donor bodies are welded before subdivision, then reduced within the triangle
budget, before the original armature modifier. The static bear and beaver gain
17-bone weighted rigs. The original moose has the same Idle/Walk rig recipe.
All five have one embedded 1024-square unlit colour map, baked from natural
coat colours and fine directional noise, and rough non-metallic materials.
No generated reference picture is a runtime texture. Blender uses +X forward
and Z up; glTF uses Y up. Beaver retains the approved tail below the minimum
paw datum by about 15 mm. Ground contact in a course remains untested.

The CC-BY credits and adaptation disclosure are on the game's existing asset
credits page, public/assets/audio/credits.html. Provenance, original checksums
and changes are in tools/art/catalog.json and the recipe's sources.json.
Originals stay outside Git in C:/Users/kyleb/dev/art-library/wild-north-woods:

- quaternius-deer-original.glb: fabf360b22eaccccd056ee99d698a9562d15aa245821f96e4fbad6db3751604e
- quaternius-wolf-original.glb: 16ac96339d06f7def9af20d5d9b27622d61e53580dab43970c9edb1bffbe8f84
- poly-black-bear-original.glb: 04b739edaf4758849952757737ab97a7350370bdfbc662a96d7b6d4b75bc43d8
- poly-beaver-original.glb: 37e595b4916758e1c03ef816e4fa4f334e797fa90f095ccdd34832a522d097f1

Recipes validate source hashes before import. --cache can name another source
cache. --paths-only needs neither Blender nor external originals. No Blend
file or downloaded donor is committed. Runtime candidates total about 6 MB.

## References and round evidence

The built-in imagegen tool made five photographic side/front/three-quarter
species triptychs on plain backgrounds in natural colours. They are saved in
C:/Users/kyleb/dev/art-library/wild-north-woods/reference/<id>.png. The prompt
recipe and species requirements are in tools/blender/wildlife/references.json.
All five pictures were inspected for proportions and coat colours.

The sheet recipe imports actual exported GLBs, with neutral forest lighting,
side and three-quarter cameras at 14 m and a 55 mm lens. It also inspects six
phases of both exported Idle/Walk clips and renders two poses of each clip.
The JPG is docs/board/looks/wildlife/north-woods-round-1.jpg, 338,346 bytes.
Its scratchpad copy is byte-exact, SHA256
bb4701b59f249aef9b7017c3eb18751da41ed9a30e4fa92f3d80adb80b996709.
This is a Blender candidate round, not an in-game look or a frame measurement.
Claude's score and natural-look verdict are pending. Stop after this round.

Visual inspection found no exploded limbs or missing antlers in the final
exports; Idle and Walk visibly differ. The final moose hoof bridge closes the
observed gap. Remaining reference differences for Claude: moose shoulders and
antlers are angular; bear muzzle and paws are simple; beaver is small at 14 m;
coats have much less visible fur than the photographs; the donor wolf tail
rests higher than the reference. These are review gaps, not an art pass.

Rebuild each animal with Blender background mode, -t 2, the species entry in
tools/blender/wildlife/<id>.py, then -- --root <lane>. Add --review to import
and render its export. Compose the sheet with Python, sheet.py --root <lane>
--references C:/Users/kyleb/dev/art-library/wild-north-woods/reference.

## Validation

- Required lane command, node tools/run-tests.mjs --tier lane --changed --jobs 2:
  57 passed, 1 failed, 27 not run in 366.37 s. The failure is
  tools/test-p4-kits.mjs:35. It hashes every non-P4 catalog row; the four
  required wildlife additions change its hash. Direct comparison proves all
  55 pre-existing catalog records are structurally identical to HEAD.
  Expected hash: c75abff9d24ae7becbf8411c0222ff9b1a6aa30b003ec951672e56a63af05808.
  Actual hash with the four added records:
  2a15f3a5ad39955562b945c4bcf711d19d9503a5c06197cac07d63acc149961f.
  This assertion is left unchanged. Claude must review any deliberate pin
  update under AGENTS rule 18 and grant the P4 test file if it is needed.
  The lane is not green and must not merge on this evidence alone.
  The continuation also found tools/test-tanker-valve-source.mjs catalog pin
  failure: expected 6df6a61ed4f40b06c9dd7f4d4dd0e4e0286625af03d35ca5eebdb0e5574f8bea,
  actual fed1efb5f62cea25e613462bb4380987b23622395cf080c9e2b0b1d7baf9a116.
  It also hashes the unrelated catalog rows. Its assertion is unchanged.
- Final focused Blender-output check after image-driven recipe fixes:
  141 checks passed. Board: 155 checks passed. Repository placement: passed.
- Production build passed, 599 modules in 1.36 s, using npm.cmd run build --
  --configLoader runner --outDir .qa-dist/wildlife-build. The linked dependency
  tree lacks .bin/vite.cmd. A temporary lane-local launcher invoked its
  already installed Vite package through the unchanged npm script. The first
  launcher used one too many parent traversals; its corrected path passed.
  Vite's runner loader avoids temporary writes into shared node_modules.
  Existing mixed-import and large-chunk warnings remain.
- All five actual GLBs were imported and rendered. Both Idle and Walk were
  evaluated at six phases per species and visually inspected at two phases.
  Bounds stay finite. The lowest sampled vertical positions are -14 mm for
  the approved beaver tail and -8 mm for wolf walk. No course
  grounding or frame-rate verdict is inferred.
- Final independent source review confirmed the external cache, source pins,
  receipt fix, weighted hoof bridge, modifier order, coat bake and output plans.
- Continuation runs only the unrun selected suites, with --jobs 2 and
  --keep-going. It passed 17 suites and found the tanker catalog pin failure
  before stopping for shared capacity. At three concurrent outer test jobs,
  this session was newest and stopped its exact verified runner and two
  children. No completed passing suite was repeated for capacity.
  The replay guard passed 225 checks across 25 cases and three FPS values.
  World composition passed 47 checks across twenty events. Replay fixtures and
  world signatures were not edited or regenerated.
  After a slot opened, the final ten unfinished suites passed, zero failures
  and zero not run, in 330.18 s. Across the initial run and both continuations:
  84 selected suites passed and the two catalog-pin suites failed; no suite
  remains unrun. One additional browser-harness unit suite entered selection
  after STATUS changed, giving 86 selected suites overall. No browser scenario
  or native frame measurement was started.

No browser scenario, full tier or frame timing is required for this source
art card. No real player save was read or written. Game code is unchanged.
STATUS was refreshed in this lane without checking live or integration working
files. Cockpit sync is deferred to the Director under this lane-only job.

## Changed assertions

No existing assertion, tolerance, fingerprint or budget was weakened.
Ten additive cases in the existing Blender-output suite cover all five pure
build/review output plans and actual GLB budgets, embedded PNG size, skin attributes,
Idle/Walk joint animation and retention of every deer/wolf clip. During this
uncommitted implementation, the new texture assertion was updated from no
textures to exactly one embedded PNG of at most 1024 square, matching the
natural-coat bake. Existing tests were unchanged.

The placement check adds only the exact user-required north-woods-round-1.jpg
path to its allowed compressed sheets. Other raw evidence paths still fail.
Independent review confirmed the external-source and texture-receipt fixes,
modifier order, coat bake and neutral vertex-colour export. Claude judges art.

## Tool findings

The first network request was sandbox-blocked. The approved public request
with a normal browser user agent succeeded. Donor downloading then completed
without a login. The initial deer view exposed a wrapper/antler transform
fault. A later textured view exposed disconnected imported vertices before
subdivision. Both were fixed before the final sheet; no visual pass is claimed
for those failed internal renders. Work stayed inside the 30-minute limit
for each problem.

Automatic approval rejected a broad render-process stop because it could
match another session. A read-only process and parent-command check identified
this lane's exact render PID; the verified single-PID stop was then approved.
No other session's job was stopped.

## Removed

Removed the stopped original bear/beaver construction paths in favour of the
licensed donor adaptations, and removed superseded donor colour layers after
baking so glTF does not tint the coat twice. Donor scratch copies were recycled
after verified external caching. Replaced the stopped run's deer candidate.
Superseded source-access prose in this note is retained only in Git history.
This session's scratch renders, atlases, logs and build output are recycled
after final results are recorded. No .evidence folder was created or traversed;
the pre-existing junction into integration was left untouched. Licensed
originals, reference deliverables and the requested sheet copies are retained.
