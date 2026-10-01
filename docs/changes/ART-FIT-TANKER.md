# ART-FIT-TANKER: independent native acceptance before fitting

Status: tests-first RED freeze. No candidate, runtime installation, fitted-art
comparison or completed convoy is claimed. Source base: 8abb32a8f8b029b13f66688c59ab857866cceb45.
Kyle's pick A and the rigid-truck rules in SCRAPDOME section 10 win over the
old sourcing sheet's historical trailer/hatch gaps.

## Changed

Added only tools/test-convoy-tanker-art.mjs, the small pinned recipe input
tools/art/tanker-fit.json and this note. Actual retained source files are read
from the existing catalog and valve donor record outside the repository.
No new download, source search, account, dependency or licensed-file change.

The fit input records the seven approved source bindings, actual SHA-256,
CC0 and native face counts, plus the retained archive/licence/palette pins.
The body and tank use the settled delivery-flat/detail-tank; only the verified
Factory pipe-large-valve supplies three valves. The remaining picks are
Kyle's approved Salt Flats salvage donors, not a new source choice.

| Native source | Catalog record | Actual triangles | Pinned model SHA-256 |
| --- | --- | --- | --- |
| delivery-flat | kenney-tanker-car-parts | 2574 | 2973152df7699767692ce890b3a0845a11333a52a23aa74b86a12ed443254c1b |
| detail-tank | kenney-tanker-tank-parts | 310 | 9e955732e4ef9ccff4a4d6967d29d8a7d2f9ed16c903923f2568216d9f0b50d2 |
| pipe-large-valve | kenney-factory-kit | 456 | 57126374dce5b172e06d5d6f8cbaab97c9cffe3e5e726060eb14c50a5bd519b6 |
| debris-door | kenney-tanker-car-parts | 68 | c62ab01c07be9be5dfc0f940dbc933fa836019ea1bc8fd0baa2d0e52cd764ea2 |
| debris-drivetrain | kenney-tanker-car-parts | 412 | 4a93bba25d3004b028f8494105d1774a91797d116dcb136fde00b4882bfec652 |
| debris-tire | kenney-tanker-car-parts | 288 | 7c3f5968244e2c617c698820e943493b8480c7bef8535fbab04d4a501b3489e9 |
| shipping-container-a | kenney-tanker-tank-parts | 402 | 7b2d5ca874c8e659ee6cfd1614f0470b70410b2ddc7620ac83b8954dedeb861d |

All actual GLTF source measurements match these counts. Actual archive,
licence and atlas checksums/byte counts match the existing records; embedded
licences identify Creative Commons Zero / CC0. The Factory donor also matches
the retained valve-source model record exactly. These are source-control
passes, not counts or scores for a fitted native tanker.

## Builder contract approved by the Director

The missing recipe is tools/blender/convoy-tanker.py. The normal bounded CLI
uses --root, --output-dir, --fit-config and --seed; --validate-sources validates
without emitting the model. Blender is run headlessly with auto-execution
disabled, a 240-second timeout and a bounded output buffer. Candidate and logs
stay in ignored private .qa-dist. Source validation must reject genuine but
unpicked truck-flat/truck/detail-tank-large/crane bindings before validation
or export, and reject changed original bytes before creating any labelled
substitute. Corruption fixtures use copies only; an intact copy must validate
first so a routing error cannot masquerade as a successful corruption test.

The recipe produces tanker.glb plus manifest.json in the requested private
output directory. Manifest fields used by independent acceptance:

- card and seed identify ART-FIT-TANKER and the chosen seed.
- parts entries have role and node. Roles are body, tank, valve, armor,
  boarding-plate and warning-lamp. They identify actual loaded native meshes
  or groups, with exactly one body, one tank and three valves; lamps are plural.
- sourceInstances entries have sourceKey (catalogId/path), node and a finite
  invertible 16-number THREE column-major matrix. It maps original GLTF world
  coordinates into fitted GLTF world coordinates. Actual fitted triangles
  must match the transformed original face multiset. Full rigid body/tank/
  valves remain complete. Trimmed salvage uses a nonempty genuine subset
  and must declare trimmed: true. Armor and boarding plate use approved
  salvage geometry; only the small lamps may be authored accessory geometry.
- stats includes triangles, meshes, draws and bytes. Independent actual GLTF
  data must match all four. Draws means native mesh/material primitive draws,
  not a measured renderer frame cost. Existing runtimeFileBytes is reported
  as an advisory size target; no new numerical budget merge gate is invented.

Geometry checks require a grounded single truck, actual tank containment in
its cab/bed footprint and actual bottom support-foot triangles resting on
visible truck-bed triangles. Native valve and armor envelopes attach to the
body/tank. The raised boarding plate attaches to the actual tank roof and
stays inside its footprint; warning lamps attach to that plate. These are
actual-source attachment/fit checks, not a new fixed truck scale or design.
No skeleton, animation, trailer/hitch or opening hatch may enter this model.

Original atlases are checked as actual encoded bytes and decoded PNG pixels;
re-encoding an unchanged palette does not count as fitting. Original material
JSON cannot simply be copied as fitted materials. This detects retained
source resources; it does not grade gritty appearance or certify every pixel
or material choice. Claude's actual renderer comparison remains mandatory.
Actual seed-repeat checks compare loaded native triangles/transforms, parts,
source lineage and materials/images, rather than copied manifest totals.

The missing read-only presentation consumer is src/arena/tanker-model.js:
createTankerModel({loadAsset}) returns group, ready, dispose and
setValveHealth([150,150,150]). The supplied loader resolves the genuine loaded
GLTF object. All eight intact/broken combinations, negative broken health,
half-armor recovery and initial healthy state are tested on actual native
lamp materials. Only all three health values <= 0 activate lamp emission;
recovery turns it off. Caller arrays are frozen, other truck materials and
native geometry/transforms stay exact, and storage/extra-network access is
trapped. The API receives no race/save object and implements no convoy rules.

Lifecycle checks watch actual loaded native geometries/materials/textures.
Normal and repeated disposal must release each owned resource once; disposal
before loading finishes retires late actual art. A rejected load remains
rejected and cannot leave a primitive stand-in labelled as finished art.

## Focused execution and exact failures

node tools/test-convoy-tanker-art.mjs exits 1: **34 checks, 12 passed,
22 failed**. All source/config/preservation controls pass. The 17 recipe
cases stop at native tanker build recipe missing. The five presentation
cases stop at native tanker presentation consumer missing. The suite has not
yet reached candidate geometry, material, copied-byte rejection, lifecycle
or lamp evaluation; those are acceptance obligations awaiting implementation.

| Current failing case | Exact failure message |
| --- | --- |
| bounded Blender validation accepts approved sources without emitting a candidate | native tanker build recipe missing |
| reject genuine unpicked truck-flat before validation | native tanker build recipe missing |
| reject genuine unpicked truck-flat before export | native tanker build recipe missing |
| reject genuine unpicked truck before validation | native tanker build recipe missing |
| reject genuine unpicked truck before export | native tanker build recipe missing |
| reject genuine unpicked detail-tank-large before validation | native tanker build recipe missing |
| reject genuine unpicked detail-tank-large before export | native tanker build recipe missing |
| reject genuine unpicked crane before validation | native tanker build recipe missing |
| reject genuine unpicked crane before export | native tanker build recipe missing |
| changed actual copied valve bytes rejected before export | native tanker build recipe missing |
| changed actual copied licence bytes rejected before export | native tanker build recipe missing |
| actual generated GLB is self-contained, finite and one rigid truck | native tanker build recipe missing |
| every fitted donor face has genuine native lineage, including three complete valves | native tanker build recipe missing |
| grounded native truck carries its tank, valve attachments and raised roof plate coherently | native tanker build recipe missing |
| fitted native materials do not retain original source atlases or material palette | native tanker build recipe missing |
| native counts and byte report match actual geometry without inventing a frame or art budget | native tanker build recipe missing |
| same seed repeats actual fitted geometry, parts, transforms and materials | native tanker build recipe missing |
| real loaded model lamps follow every valve combination and recovery without changing geometry or inputs | native tanker presentation consumer missing |
| loaded native geometries, materials and textures dispose exactly once | native tanker presentation consumer missing |
| disposing before actual native load completes retires the late model instead of attaching it | native tanker presentation consumer missing |
| native presentation reads supplied health without save access or extra network requests | native tanker presentation consumer missing |
| loader failure exposes no successful native stand-in and remains disposable | native tanker presentation consumer missing |

Full raw verdict names/messages/stacks remain in
.qa-dist/tanker-art-tests-kPPkdR/verdict.json. Copied licensed fixture inputs remain beside that
verdict. Future recipe executions retain complete bounded Blender stdout/
stderr and invocation arguments in private logs. No missing-recipe log is
presented as native output or a measured timing.

All existing tracked runtime art, simulation, test assertions, replay pins,
source catalog and retained valve record compare byte-exact before/after.
All actual external catalog-pinned source bytes compare exact before/after.
No fingerprint, source palette, assertion or game asset was regenerated.
No new replay fingerprint is needed for a tests-only freeze; existing pins
are protected without changing simulation behavior.

## Remaining review and ownership

No source recipe/module/public asset was written by the independent tester.
The Director receives ownership of the new test, input and note for fitting.
No lane/full/build, browser, art-score, frame-budget, merge or release pass is
claimed. The existing tools and approved native donors are readable and pass
source controls; no laptop/free-source acceptance blocker was proved here.
If fitting cannot meet acceptance, the builder must write why and route
waiting_on: kyle through the Director instead of inventing finished parts.

The future comparison must use the actual game renderer near and at game
camera distance in High and Performance, with the source/current comparison
and Claude review. The three-round cap and Kyle's final look remain required.
This card installs no gameplay, renderer/event hook or fake Convoy Raid.
No Preview, live folder, port 5174 or real save was touched.

## Removed

None. This new-art tests-first slice replaces no current runtime model,
script, source record, asset, test or assertion. Raw private logs, copied
negative fixtures and future private candidates remain until their verdict
is used; the Director's janitor removes reproducible evidence afterward.
Licensed originals and current game assets remain preserved.

## Private native fitting stage â€” 1 October 2026

This is a source freeze for independent review, not finished art, a runtime
installation, a lane gate or a whole-card merge claim. It starts from the clean
tests-first commit 415bd22c1a313399d3391d6fc626ca702ab89cad. Only the granted
new recipe, presentation module and private game-renderer scenario were added;
this note is append-only. Frozen tests, fit settings, catalogue, source records,
replays, current runtime art and shared game hooks stay unchanged.

The recipe checks the exact approved bindings against the retained small fit
input, all model/archive/licence/palette SHA values, catalogue metadata and
actual ZIP members before creating output. It accepts an intact copied source
fixture, rejects the four genuine unpicked donors in validation and export,
and rejects changed copied valve/licence bytes. Validation exports nothing.
Normal export is restricted to this lane's private .qa-dist or .evidence.

The complete delivery-flat body/cab/bed, detail-tank and three Factory valves
retain their actual native source-world triangle multisets through inspectable
affine transforms. Door, drivetrain and tyre salvage protect the cab and bed.
Compressed genuine container shells provide side skirts; an explicitly trimmed
subset of genuine container roof faces provides the raised boarding plate.
Only two small deterministic 12-sided warning lamps are authored accessories.
Materials replace the original palettes with a seeded 512-square worn-paint,
oxide, dust, rubber and steel atlas. Native material checks include both encoded
bytes and decoded original PNG pixels. Visual quality is still unjudged.

Measured private artifact at seed 1989:

- 6,328 triangles; 16 actual GLTFLoader meshes and 16 primitive/material draws.
- 1,063,268 GLB bytes, below the advisory 8,000,000-byte runtime-file target.
- GLB SHA256: 6240ff453c0d2df9e945cfc25cba012056d2d75dc64d4ec4bcb725f956c81342.
- These native counts are not measured frame cost or a settled tanker budget.

The frozen native suite went from 12/34 passing and 22 missing-build REDs to
33/34 passing and one retained source-support RED. Raw verdict:
.qa-dist/tanker-art-tests-H0RFHO/verdict.json. Full source lineage, repeat geometry,
transforms, parts/materials, all eight valve combinations, negative health,
half-armor recovery, immutable caller data, geometry preservation, exact-once
loaded/late resource disposal, loader failure, no save/extra-network access and
source/protected-file controls pass. A first run exposed a 5e-8 placement rounding
boundary and Blender sphere triangle-order drift; forward recipe fixes retain
the source faces and use deterministic small authored lamp triangles. The
subsequent default suite completes normally; no heap increase was used.

### Retained support RED for the independent test author and Claude

The genuine picked detail-tank's global minimum source Y is effectively zero
(-2.8199664484680564e-18). Its lowest complete triangle maxima are
0.020147841423749924. It contains zero complete triangles wholly within 0.002
of its global minimum before fitting. The unchanged test requires such flat
bottom triangles in the fitted tank. At the routine 4.25 vertical scale, the
source separation becomes 0.08562832605 m. Compressing the tank merely to pass
that assertion would flatten the actual tank and is rejected as a workaround.

Actual lowest fitted tank contact geometry is four native vertices at Y=1,
with X approximately 0.000001 and Z -0.9621501565, -0.7131500244,
-2.6553502083 and -2.4063501358. Barycentric interpolation of genuine visible
truck-bed triangles under each vertex returns Y=1 exactly: all four gaps are
zero. This proves the real contact witness only; it does not silently replace
the retained flat-foot gate. Exact original faces, source hashes, fitted
vertices and bed support values:
.evidence/2026-10-01/ART-FIT-TANKER/source-support-witness.json.

Written review question: should the accepted picked source be checked through
its actual lowest contact vertices/edges over genuine bed triangles, or through
explicitly identified native support faces? The current global-min flat-foot
assumption does not describe this original geometry. Keep the assertion RED
until the independent author reviews this witness and any precise assertion
change. No assertion, donor choice or settled design has been changed here.
Remaining attachment assertions after the early failed feet check have not yet
received a completed green whole-test verdict.

### Unrun game-renderer comparison scenario

The new owned scenario mounts the actual GLTFs in the production Scrapdome
yard via the existing private window.__render scene. It bundles the actual
presentation module in memory using the installed Vite dependency; no shared
renderer hook or new dependency is needed. Syntax, import, pinned source payload
and the complete in-memory bundle were verified without starting a browser.
The scenario itself has not run and has no screenshot, art score or frame pass.

It prepares identical-position matched original-source versus fitted shots
near and at racing distance in High and Performance, plus a paired source/fit
shot in each setting with one camera and one actual renderer/lighting setup.
The source baseline is honestly labelled: the picked original cab/body, tank
and three valves at the same fitted transforms. There is no previous runtime
tanker. It is not a claim that a source assembly was the current finished game
art. The source palettes exist only in disposable comparison payloads.

For future capture, export to .evidence/ART-FIT-TANKER/candidate first, or set
TANKER_ART_OUTPUT to another private output directory, then run
node tools/browser-harness.mjs scenario convoy-tanker-art. .qa-dist is rebuilt
by that harness, so candidates stored only there must be rebuilt afterward.
Independent native review precedes capture; coordinate heavy runs before any
frame experiment. The scenario records renderer counts but explicitly gives
no frame verdict. A real <=500 KB round sheet and scored verdict still go to
Claude before installation. Zero visual rounds have been performed.

Source hashes:

- Recipe: ad469d6e4bf9ce0455772a0dc27cef5cf35fbdb944b1d33c714bd2384279282a.
- Presentation: b80ef925af615c6ad3d7723fb9e17ea9dbb8ccb853a2c264099a0f241c707642.
- Scenario: d358ec4e092462d48ea1cafa8ca6cdfaa19de1e5a29dda983c3ec49fb0cd233e.
- Frozen test: 980afce57f84e6457a83db61464bbaf0817f2ceae23c7af9dd4ca399bd2c58e7.
- Frozen fit input: 42113797fca80592f9a99a00238054da4b0901e958ae4b2365860f1be9a2a498.

Changed assertions: none. Build/lane/full gates, actual comparison, art/frame
review, in-game credits and runtime/Convoy Raid installation remain pending.
No live folder, Preview, port 5174, real saves or protected audio was touched.

### Removed

No current art or original licensed source was replaced. Private generated GLB,
manifest, logs and witnesses remain ignored evidence and are not committed.
There is no prior runtime tanker or generator to retire. No switch or gameplay
event was installed by this source stage; future removal/installation belongs
to the approved continuation after review.


## Reviewed native contact correction and independent crossing RED — 1 October 2026

Tests-only follow-up on unchanged source
`23748e635f8fa0784a9c5c72998b19a94facc015`, with the original test freeze
`415bd22`. The Director assigned only this append-only note and
`tools/test-convoy-tanker-art.mjs`. The independent reviewer
`audio_output_source_review` approved replacing the false flat-bottom-face
assumption before this edit. The Director confirmed the scope in writing.
No recipe, fit settings, source mesh, model consumer, scenario, installed
asset, catalog, licence, other assertion or replay pin changed.

### Exact assertion change

The picked 310-face detail-tank has four genuine minimum vertices and two
bottom contact edges. Its minimum Y is about -2.8199664484680564e-18.
There are no complete triangles wholly within 0.002 m of that minimum.
The lowest complete face reaches Y 0.020147841423749924; the current 4.25
Y scale makes that difference 0.08562832605093718 m. Requiring complete flat
bottom triangles rejected the authentic picked source even when its actual
contact edges rested on the bed.

Only the old `feet` filter/assertion and centroid support loop were replaced.
The new check welds original vertices at 1e-7, derives the real minimum
triangle edges, follows the existing affine source-instance matrix, and finds
the same retained endpoints and topology in the actual fitted GLB. It then
checks the **actual fitted** edges against upward native body triangles.
Support must cover the entire projected edge, including endpoints, midpoint
and every triangle coverage boundary. The vertical precision remains
0.002 m; the old centroid loop's wider 0.05 m allowance is removed.
No envelope or centroid can supply missing deck geometry.

The native candidate has two retained contact edges at Y 1:

- X about 1.02e-6, Z from -0.9621501564979553 to -0.7131500244140625,
  supported over its whole length by native bed face 725.
- X about 8.07e-7, Z from -2.6553502082824707 to -2.4063501358032227,
  supported over its whole length by native bed face 724.

Both support normals have Y about 1. The contact positive control also
checks that these genuine touching bed faces produce **zero strict interior
crossings**. Thus a supported contact does not automatically approve the
rest of the fit.

Six new native negative controls pass: move a clone of the complete native
310-face tank up 0.06 m, down 0.06 m or sideways 0.8 m; remove both actual
support faces, or remove each of the two support halves separately. The
sideways contacts remain inside the real transformed truck envelope but
lose native bed support. Removing either or both deck triangles leaves the
body envelope exactly unchanged. These controls preserve every donor face
in the moved tank fixtures and prove why an envelope-only test is inadequate.

### Genuine fit defect remains RED

A separate check compares all 310 native tank faces with all 2574 native
truck faces. It requires both triangles to straddle the other's actual
plane and share a positive-length interior line interval. Coplanar contact,
plane tangency and envelope overlap do not count as strict crossings.
The unchanged candidate independently reproduces **20 strict crossings**,
ten at each wheel arch. No bracket deletion or altered donor topology is
required by the test; coherent source fitting still needs repair.

The sole failure is:

`complete picked native tank does not strictly cross complete native truck surfaces: actual picked tank strictly crosses native truck surfaces: 20 crossings (20 !== 0)`

First native witness: tank face 158 crosses body face 541 for
0.027917915118930048 m, from
[-0.9136493802070618, 1.1867514031270698, -0.7857749462127686] to
[-0.8857314650881317, 1.1867514031270698, -0.7857749462127686].
This matches the supplied independent review witness.

A separate actual triangle-surface probe finds a bracket point
[0.9136514663696289, 1.0856282711029053, -0.8895251750946045] beneath the
arch surface at Y 1.25912445345364: a vertical overlap of
0.17349618235073483 m. The crossing witness's `planeDistanceExtent` is a
triangle-plane diagnostic, not a penetration depth or physical response.

### Commands, results and preservation proof

- `node --check tools/test-convoy-tanker-art.mjs`: pass.
- `node tools/test-convoy-tanker-art.mjs`: final native freeze **42 checks,
  41 passed, 1 failed**, exit 1 for the strict crossing defect above.
  All 34 original checks now pass, including their reviewed support
  correction. The new contact positive and all six native negatives pass.
- The suite's existing real Blender validation/export, complete donor
  lineage, source corruption, exact repeat export, palette/grounding,
  valve/plate/lamp, presentation lifecycle/disposal and protected-file
  controls retain their original assertions and pass.
- Raw stdout/stderr: ignored
  `.evidence/2026-10-01/ART-FIT-TANKER/test-contact-crossing-red/native-freeze.log`.
  Actual per-recipe logs, full verdict and native contact/crossing/surface
  witness are retained in that directory's `native-details/`.
  The private generated candidate is in
  `.qa-dist/tanker-art-tests-2XVSXw`; it is evidence, not installed game art.
- Remove only the additive helpers/checks and reverse only the reviewed
  support replacement: the original file reconstructs byte-for-byte,
  SHA-256 `980afce57f84e6457a83db61464bbaf0817f2ceae23c7af9dd4ca399bd2c58e7`.
  Original prefix SHA-256 before that replacement is
  `962f72a1cc2653bafa0827334f04980b5aa842d25512aafb82e19f1ca4dda54b`;
  original suffix SHA-256 after it is
  `1d5fde176938557a313d142f023f77a1a7ba24cef4378dadc144a112870de53d`.
  Final test SHA-256:
  `6021849168fe659eccd47a6db40e2e320a5b66a5c34f81dbc6632212f97cad05`.
- `git diff --check`: pass. No existing replay fingerprint changed.

No browser comparison, art score, frame pacing, lane/build/full gate,
merge or runtime acceptance is claimed here. Historical scripted HUD,
held-pose and listening limitations remain as previously recorded.
The source worker must fix the native placement before fresh source gates
and actual renderer review; valid support alone does not clear this card.

### Removed

Replaced only the reviewed false requirement for complete flat minimum-Y
foot triangles and its centroid-only support loop. Authentic native contact
edges now receive complete triangle coverage checks at 0.002 m precision.
No original donor face, picked bracket, source record, settings, asset,
other frozen assertion, old replay control or unrelated behavior was removed.
Ignored raw evidence remains for the next independent review; the Director's
janitor removes it after its verdict is committed.

## Coherent native tank placement repair â€” 1 October 2026

Source fitting resumed from the independent tests-first freeze
`67fb882849aa386dc197cc51ac03ae8681193249`. A normal merge of current
`integration/wasteland` produced `a765b78f144c4adb06b5e4edf73350fccbaeec40`
before fitting. The Director granted only the existing recipe and this
append-only note. Every frozen test, fit input, presentation module, scenario,
source record and original licensed donor stayed unchanged.

The exact unchanged command `node tools/test-convoy-tanker-art.mjs` first
reproduced **42 checks, 41 passed, 1 failed**, exit 1, with the same **20 strict
tank/body crossings** and first face-158/face-541 witness. All original source,
lineage, support, corruption, lamp and lifecycle controls passed before the fix.

### Placement and native geometry proof

The tank has asymmetric native brackets. Reversing its ends puts both bracket
sets clear of the rear wheel arches without shrinking the tank or changing the
truck. The complete tank's source-world affine placement changed only in its
horizontal orientation and longitudinal center:

- Scale remains `(4.15, 4.25, 4.4)`; rotation about Y changes from +90 to -90
  degrees. Translation changes from `(0, 1, -1.29)` to `(0, 1, -1.700021)`.
- Thus the tank keeps its original fitted proportions and height. Its center
  moves rearward by 0.410021 m. Minimum Y remains exactly 1 m on the native bed.
- The entire 2574-face truck remains at its unchanged affine placement. The
  entire 310-face tank, including its brackets, and all three complete
  456-face Factory valves retain their original affine lineage. No picked
  face was deleted, welded, replaced or compressed.
- Existing valves, the raised salvage roof plate and the two warning lamps
  follow `tank_center_z`. Valve Z positions are -2.860021, -1.700021 and
  -0.540021 m. Cab, wheel and bed armor keep their original body attachments.
  The Director confirmed that the frozen plural lamps remain two.

Actual exported original contact edge A has X about -1.02e-6 m, Y exactly 1 m,
and Z endpoints -2.0278708934783936 and -2.2768709659576416 m. Genuine upward
body face 724 covers its entire length, interval [0, 1]. Edge B has X about
-8.07e-7 m, Y exactly 1 m, and Z endpoints -0.3346707820892334 and
-0.5836707949638367 m. Upward body face 725 covers its entire length,
interval [0, 1]. Both native support normals have Y about 1. Their affine
contact gap is zero; the frozen 0.002 m precision was not changed.

The final exported tank has **zero strict crossings** against all 2574 native
truck faces, down from 20. The native vertex surface probe finds zero tank
vertices more than 0.002 m below an actual body surface. Genuine bed contact
still produces zero strict crossings. All six unchanged support negatives
pass: +0.06 m hover, -0.06 m sink, +0.8 m lateral displacement, removing both
actual bed triangles and removing either one separately. The accepted positive
uses actual native bed triangles, not an envelope or a claimed flat foot.

Final source-affine tank bounds are X [-1.1336514234542847, 1.1336495876312256],
Y [1, 2.7650065571069717], Z [-3.459621968658924, 0.0595797212996485] m.
The truck's rear bound remains -3.629999737739563 m, leaving 0.170377769080639 m
of rear clearance. No source geometry or gameplay rule changed.

### Exact native result and preserved controls

The first reversed candidate at center Z -1.70 cleared the crossing and support
checks but exposed a separate lineage-key rounding boundary: **41/42**, with
15 source face keys on a four-decimal boundary. Direct measurement found the
nearest native coordinates differed by at most 1.1250376719118549e-7 m, below
ordinary GLB float export precision. Moving the honest center by another
0.000021 m avoids that boundary. No test tolerance, assertion, manifest count
or source binding was changed to hide it.

The final unchanged command passes **42 checks, 42 passed, 0 failed**, exit 0.
This includes original bytes/archives/licences, unpicked donor rejection,
corrupted copied source rejection, complete affine triangle lineage, exact
repeat geometry/transforms/materials, source-palette encoded and decoded pixel
rejection, three valve attachments, roof/lamp grounding, all eight valve-health
combinations, caller immutability, exact-once loaded and late disposal, loader
failure and zero save/extra-network access. Protected source, runtime art,
replay pins, catalog and old assertions remain exact. Changed assertions: none.

Native output remains **6328 triangles, 16 loaded meshes/draws, 1,063,268 bytes**.
Final private GLB SHA-256:
`0af1e450360a329cbc91bd9a90267ec68f1aa4628791f8bb857d431a107e75be`.
The seeded worn atlas is byte-identical before and after placement:
419687 encoded PNG bytes, SHA-256
`8029e5c0f05142eb0d023012387af18c91ad6e91ae87f019d1e3ef5b073110a4`.
These native counts do not measure frame cost or approve the look.

Pins at this source freeze:

- Recipe SHA-256: `79c47392c75bd9845581da78b72f8f3f33e02657fa2ab5bd806c57476ac3de37`.
- Unchanged independent 42-check test: `6021849168fe659eccd47a6db40e2e320a5b66a5c34f81dbc6632212f97cad05`.
- Unchanged fit input: `42113797fca80592f9a99a00238054da4b0901e958ae4b2365860f1be9a2a498`.
- Unchanged presentation: `b80ef925af615c6ad3d7723fb9e17ea9dbb8ccb853a2c264099a0f241c707642`.
- Unchanged scenario: `d358ec4e092462d48ea1cafa8ca6cdfaa19de1e5a29dda983c3ec49fb0cd233e`.
- Unchanged catalog: `3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`.
- Unchanged valve source record: `3afc6c2a8b5c64ee72171b21894333be19a3cf8e3d8223a9dbf0f590c40bb6a4`.

Full stdout/stderr and per-recipe logs, verdicts, manifests and native contact /
crossing witnesses are retained in ignored integration evidence at
`.evidence/2026-10-01/ART-FIT-TANKER/placement-fix/`. The three stages are
`red-native-details`, `lineage-boundary-details` and `green-native-details`.
Private measurement recipes/results record the unscaled orientation sweep,
export rounding witness and unchanged material bytes. The final candidate
remains private in the lane's `.qa-dist/tanker-art-tests-zIEcpS/candidate/`.

### Review boundary and Removed

This hands back a clean source freeze for independent review. Lane tier, build,
actual game-renderer comparison, art scores, frame pacing, credits, public
installation and Convoy Raid integration remain pending. No comparison round
was spent. No integration merge, push, Preview, live folder, port 5174, real
save, audio, new asset, download or service was touched.

Removed: the old tank orientation and fixed tank-accessory center coordinates
were replaced in the recipe. No prior runtime tanker or current game asset
exists to retire. All original licensed files and current runtime assets stay.
Generated candidates and probe logs remain ignored, used-once review evidence;
the Integrator removes them after the independent verdict is committed.

## Independent actual-yard comparison â€” 1 October 2026

Frozen Source 2583c4de126629e7b673a136381ecb86b6e4aad0 remains unchanged.
Round1 sheet/recipe/review live in docs/board/looks/convoy-tanker/.
The sheet is 483090 bytes (below500KB), uses actual game renderer at both
qualities, and awaits Claude. Private candidate regenerated with existing
Blender4.5.13, frozen recipe/seed1989; exact SHA256
0af1e450360a329cbc91bd9a90267ec68f1aa4628791f8bb857d431a107e75be,
6328 triangles,16 meshes/draws,1063268 bytes. No public installation.

### Actual browser result and limits

Final owned convoy-tanker-art scenario completed exit0 on private port20762,
memoryOnlySaves=true, issues=[], no console errors or failed requests.
Two console warnings remain: Multiple instances of Three.js being imported.
They originate in the existing private Vite virtual presentation bundle; no
console suppression or runtime dependency change was attempted. Frame pacing
was not measured; draw/triangle capture observations are not a frame gate.

Actual App discovery visit, transition presentation, eight-second journey and
yard-ready guards passed. Candidate and pinned donor GLTF scenes actually
loaded and rendered in the yard. Existing final JSON simulation-state equality
and all source palette/hash/self-contained GLB guards remain. Added loaded
health captures verify two actual mesh lamp materials switch to emissive
0xb32904/intensity2.2 for [0,0,0], return to0/0 for [1,0,0], and mutate neither
supplied input nor simulation. These are read-only presentation inputs, not
future Convoy Raid event/damage/reward behavior. No frame, sound or human feel
clearance is claimed. Private camera state changes only; actual simulation
state stays exact through comparison.

All18 final images are on the sheet and inspected. Prefix tanker-, suffix
-high or -performance; each named view below exists at both qualities:
source-near (intact palette/body/tank), candidate-near (gritty armor/support),
source-racing (distant intact silhouette), candidate-racing (distant dark
silhouette), source-and-fit (source left, fitted right), all-three-broken
(two loaded orange warning lamps), recovered (same lamps dark), opposite-valve
(opposite mounting/seating concern), roof-plate (raised rigid roof plate).
No missing texture or placeholder truck was seen. Valves/armor/plate are rigid.
The opposite-valve view shows one valve apparently separated from tank
silhouette: native exact seating/contact unresolved, returned to Director.
Near-side two valves and roof plate read clearly; gritty details lose contrast
at distance. Structural Source tests do not clear these art questions.
Phone/HUD race layout and public Convoy Raid integration were not exercised.

### Native review received from Director

Independent frozen42/42 native rerun passed with complete raw log in integration
.evidence/2026-10-01/ART-FIT-TANKER/director-source-review/native.log.
Director provisionally cleared exact donor affine faces/tank support/zero bracket
crossings, rights/hash guards, bounded seeded atlas, no simulation/storage/network
or dependencies, loaded/late/fail exact-once disposal and all8 health states plus
recovery/two lamps. This is native structural/presentation clearance only;
valve envelope overlap does not prove exact contact and the new visual seating
concern stays pending. Art/frame/credits/public install/lane gates remain separate.

### Genuine private QA failures and corrections

Full launcher stdout/stderr was preserved before filtering in integration
.evidence/2026-10-01/ART-FIT-TANKER/browser-source2583/:
launcher.log, launcher-run2.log through launcher-run8.log, launcher-final.log,
and regeneration.log. Reports/captures remain in corresponding ignored lane
browser-source2583[-runN|-final] directories. No failure was overwritten.
First launcher rejected absolute output-dir; use required relative.evidence path.
Second launcher cleared.qa-dist including the staged candidate, causing ENOENT.
Director approved regeneration under.evidence; resulting GLB hash is exact.
Third run proved visitWasteland refresh discarded unsaved private discovery:
added actual memory-only _saveProfile guard before unchanged visit assertion.
Fourth/fifth runs timed out: original stopped-App advance8 happened before
visualReady, so App._simulate refused steps. The owned recipe now waits actual
transition presentation, uses original advance8, then original yard readiness.
Readiness invokes onFrame(state,0)/renderFrame, never advances physics to mask
loading. No extra journey time or fabricated App return was added.
Run6 assertions passed but racing/pair/health inspection cameras were occluded
by real yard walls. Run7 camera repair exposed original worldAt road-height
placement floating above yard floor and reversed paired positions. Run8 uses
actual course.groundAt and source-left/fitted-right offsets. Final adds opposite
and roof views without changing model bytes, palette or simulation inputs.
Private QA details are collapsed; real world geometry/lighting remains intact.

Changed assertions: no original assertion/predicate removed or relaxed.
Existing journey advance moved after actual presentation readiness; the final
state immutability guard is unchanged. New guards cover memory fixture save,
loaded two-lamp material values, health-input equality and unchanged state.
Source, fit settings, native tests, pins, catalog, public assets and runtime
presentation module are untouched by this reviewer. Scenario geometry transforms
only position private source/candidate objects and inspection camera.
Opposite witness: groundAt(state.s,state.lateral+8), q.placement=[world.x,
groundY+1.55,world.z-1], camera=[p.x-7,p.y+3.5,p.z-9] looking at p;
candidate position reset to original x, health[1,0,0], unchanged scale/rotation.
Original recipe did not serialize numeric world coordinates; none invented.

### Removed â€” independent actual-yard QA

Replaced faulty private save/readiness/camera/ground ordering, preserving old
failure evidence until review. No runtime model, source input, licensed file,
player data, catalog or current asset removed. Generated PNGs/logs stay ignored;
only one compressed sheet is committed for round1. The Director removes used
captures after Claude's verdict is committed. No live, Preview,.preview-dist,
port5174, real saves, merge, release, push, force or history rewrite used.

## Independent exact native valve contact, 1 October 2026

This tests-only continuation starts from clean QA
`ef3c7e216e38460add772cd0a9f1fee66c51eef5`. It adds exact valve attachment
acceptance after all 42 original checks. Source2583, the native recipe, fit
input, approved picks, catalog, runtime module and public assets remain exact.

### Genuine native connection contract

The original verified Factory `pipe-large-valve` is still 456 triangles,
SHA-256 `57126374dce5b172e06d5d6f8cbaab97c9cffe3e5e726060eb14c50a5bd519b6`.
Its genuine pipe/flange connections are the two source-X extreme patches,
X -0.5 and +0.5, **16 triangles each**. The handwheel/stem extends separately
along negative source Z. These are measured original native faces, not a
bounding box, gizmo, invented foot, proxy cylinder or guessed bottom plane.

The tests transform those exact original patches through each output
source-instance matrix and match them to the actual loaded native triangles.
Exact contact uses real triangle crossings and vertex/face and edge/edge
distances. The Director approved requiring both whole-valve contact and at
least one genuine pipe/flange connection touching within the existing
**.002 m** precision or crossing the tank skin as a genuine embedded connection.
Handwheel-only contact does not mount a fuel valve. No full-flush rule, flat
feet, new fit angle, new tolerance or recipe value is prescribed.

The three real candidate valves use their actual output faces. Separate
positive and negative DATA controls copy the genuine Source2583 valve2
geometry relative to the original tank donor's affine frame. This pins a
proven native control, not a candidate fitting choice. A future source repair
cannot move the negative rear-pose fixture into a valid mounting or make an
allowed touching candidate fail an embedded-only predicate.

### Exact failures and native controls

The final normal command `node tools/test-convoy-tanker-art.mjs` exits 1:

- Original suite: **42 checks, 42 passed, 0 failed**.
- Additive exact-contact suite: **12 checks, 9 passed, 3 failed**.
- Combined: **54 cases, 51 passed, 3 genuine contact failures**.
  All original cases and all new cases run; none are skipped or excluded.

The three exact failures are:

1. `valve0: actual whole native valve touches or crosses actual native tank skin`.
   Actual valve face 328 and tank face 274 have a minimum native surface gap
   of **0.11249710048096646 m**. Closest points:
   valve [0.8233996135990674, 1.9172951119420445, -2.630021095275879];
   tank [0.7394046126322701, 1.8825032711029053, -2.563764282492314].
   There are zero whole-valve/tank interior crossings.
2. `valve0: genuine original pipe/flange connection touches or embeds in actual tank skin`.
   The actual retained two connection patches miss by
   **0.11249710048096646** and **0.4517631304430445 m**.
3. `valve1: genuine original pipe/flange connection touches or embeds in actual tank skin`.
   Its genuine mating patches miss by **0.01793217681641043** and
   **0.017932231510569226 m**, despite **31** whole-valve crossings elsewhere.
   Handwheel/stem contact therefore cannot clear the actual pipe attachment.

Candidate valve2 is a true native positive: **166** whole-valve crossings
and **five genuine pipe-patch/tank-skin crossings**. Its other port is
0.017933879638581805 m from the tank. These passes do not erase the other
valves' failures. The rear visual gap is physical, not a camera-only artifact.

The copied native controls pass:

- Genuine full 456-triangle valve2 copy retains a real embedded pipe patch.
- Six-centimetre outward hover retains overlapping complete bounding boxes
  and whole-part contact elsewhere, but its two original pipe patches miss
  by **0.007891468737308852** and **0.07336666842676882 m** and are rejected.
- Genuine copied rear lateral pose retains bounding-box overlap but has
  the measured 0.11249705105537215 m whole-part gap and is rejected.
- Removing only actual native tank triangles **111 and 118** retains the
  exact tank bounding box and whole-valve contact elsewhere. Both pipe
  patches are disconnected; the nearest is **0.004315894402245505 m** away,
  and attachment is rejected.
- Original topology, all transformed source patches and protected bytes pass.

The regenerated native model remains **1,063,268 bytes**, **6,328 triangles**,
**16 meshes and 16 draws**, SHA-256
`0af1e450360a329cbc91bd9a90267ec68f1aa4628791f8bb857d431a107e75be`.
All **1,186** tracked files outside the owned test and note are hash-checked;
licensed source files are checked separately. The complete original test
prefix is exactly **42,161 bytes**, SHA-256
`6021849168fe659eccd47a6db40e2e320a5b66a5c34f81dbc6632212f97cad05`.
The prior note prefix is exactly **38,715 bytes**, SHA-256
`7bcd5ecbf1d277efeb7422946d60a2a4af8d9309722c37a146cdcae2cfacb94c`.

Full raw probe, focused and default logs, native closest-point/crossing
witnesses, original-patch indices, protected Source hashes and recipe output
are retained in ignored integration
`.evidence/2026-10-01/ART-FIT-TANKER/valve-contact-tests/`.
The focused fixture supplies the unchanged existing private candidate and
runs only the 12 new cases; it never claims the 42 original cases passed there.
The final default run executes their real bounded recipe and all 54 cases.

### Durable independent round-one art verdict

The Director relayed the read-only independent art critic's **round1 FAIL**
for all 18 actual-yard images in lane
`.evidence/2026-10-01/ART-FIT-TANKER/browser-source2583-final/`.
Scores: direction **2/5**, materials **3/5**, racing read **3/5**, opposite-view
grounding **2/5**, and broken/recovery lamp contrast **3/5**. The opposite High
and Performance images show the detached valve around screen X 452â€“508,
Y 365â€“407. Exact native geometry above independently confirms the rear gap.

The palette improves on Source1, but the cab still reads like a toy, the pale
wheels read flat, tank blotches look uniform, and lamp-state differences are
small at race distance. All images are from the actual yard. No motion/frame
measurement or whole-art clearance follows from them. Claude's round-one
review remains held before public installation. Structural Source/native
passes cannot clear this look or the attachment failures.

### Changed assertions and Removed

Changed assertions: **none**. Every byte of the original 42-check prefix and
prior change-note prefix remains intact. Only new checks, native copied DATA
controls, exact witnesses and this appended note were added.

Removed: none. No source, native recipe, fit, approved model, licensed file,
current asset, assertion or replay pin was replaced. Native attachment Source
work remains for the builder after this independent acceptance handoff.
Private evidence remains for review and the Director's used-once janitor.
No lane/full/build, frame, art, whole-card, merge, public-install, push or
release pass is claimed. No live folder, Preview, port 5174, real save,
protected audio, dependency, external service or source repair was touched.

## Round-two native scale acceptance, 1 October 2026

This append-only tests-first continuation starts at clean
`5a844645b79438cd27d86849f2c2fa8dd9bec58a`. Claude's 04:00 review approved
a tanker about 11 m long and 3.5 m tall, plus the native mounting and material
direction recorded in the integration inbox/card at `12329e5`.
The Director adopted **11 m length and 3.5 m height as exact reproducible
build targets**, using the existing **.002 m** native export precision.
These realize the approximate visual direction; they are not new race or
collision-shell rules. No width target was introduced.

Two new default checks use the bounding box of the **complete loaded native
assembly**, with actual world matrices updated: truck, tank, all three valves,
armor, boarding plate and warning lamps. They measure the model's existing
longitudinal Z and vertical Y spans. No displayed gizmo, declared manifest size,
substitute truck, camera scale or shader-pixel expectation supplies the result.

### Exact measured RED

The existing pinned private candidate was measured first without rebuilding:
SHA-256 `0af1e450360a329cbc91bd9a90267ec68f1aa4628791f8bb857d431a107e75be`,
1,063,268 bytes. Both native checks fail:

- `complete native tanker length 7.227999687194824m differs from approved11m
  build target by 3.772000312805176m; tolerance remains.002m`
- `complete native tanker height 2.875006699562073m differs from approved3.5m
  build target by 0.6249933004379269m; tolerance remains.002m`

Actual complete minimum:
[-1.5, -0.000000023841858265427618, -3.7079999446868896].
Actual complete maximum:
[1.5, 2.875006675720215, 3.5199997425079346].
The measured width is 3 m; it is reported only and has no acceptance target.

The normal full default command was then run once through the unchanged recipe.
It regenerates the same exact candidate and reports:

- Original native checks: **42/42 pass**.
- Previously frozen pipe contact checks: **12 cases, 9 pass, 3 genuine RED**.
- New native scale checks: **2 cases, 0 pass, 2 genuine RED**.
- Combined: **56 cases, 51 pass, 5 fail; no skips or exclusions**.

The prior rear gap and handwheel-only attachment failures remain exactly the
same. Full native donor affine lineage, tank support, zero strict truck/tank
crossings, three original pipe-mount conditions, native copied positive/
hover/lateral/disconnected-surface controls and all rights/lifecycle guards
are unchanged. No fixture bug was found and no existing control was edited.
The copied native controls remain expressed relative to the actual tank's
affine frame; this continuation does not alter their scaling behavior.

The previous **55,768-byte** test prefix remains exact, SHA-256
`ff00ff7c590d52df8844aa39c1c7fc21620cf7b5e7d4e769efb735039c50330a`.
The previous **45,806-byte** change-note prefix remains exact, SHA-256
`742a58ed3986b8ae75d0a8e2458b39163d5f8d1633b332773d732ec7702267a1`.
All **1,186** unowned tracked files and the separately checked licensed source
bytes remain unchanged.

Raw focused and default stdout/stderr, the complete native box/target receipt,
original42 and existing12 verdicts, native manifest/build output and protected
byte proof are retained under ignored integration
`.evidence/2026-10-01/ART-FIT-TANKER/round2-scale-tests/`.
The focused proof runs only the two new cases against the existing genuine
candidate; it does not claim prior cases passed there. The default run executes
all 56 cases and preserves the five intentional failures.

Actual renderer comparison against a car, race-distance hazard-red valves/
bright collars, stripes, lighter tank/darker cab, independent art review,
frame/motion and Claude's round-two verdict remain pending. No arbitrary width,
triangle, draw or brightness budget was added. Native build dimensions alone
cannot clear those visual outcomes.

### Changed assertions and Removed

Changed assertions: none. This adds exactly two native size checks and their
measurement/runner after every byte of all 54 existing cases.

Removed: none. No source, recipe, fit, approved pick, licensed file, public
asset, material, valve control, assertion or replay pin was changed or replaced.
The separate Source worker receives these RED checks before implementing
round two. No whole-card, art, frame, lane/full/build, merge, push or public
installation pass is claimed. No live folder, Preview, port 5174, real save,
protected external system, new dependency or runtime physics was touched.


## Round-two Source geometry and material freeze, 1 October 2026

The final private Source clears all 56 unchanged native cases. Work resumed from
clean tests-first `6572240cd07beb284a0f60d816ca212582ed7afc`. Only the granted
recipe, fit input, native lamp presenter and this append-only note changed.
The previous 50,279-byte note prefix remains SHA-256
`afff4caff6be39b06ade6c8e6af64ce6705f84c6ca7739fa93b2a9e891ba42e8`.
Claude's 04:00 direction and the Director's exact 11 m / 3.5 m build targets
supply the scope; the existing .002 m export precision remains unchanged.

### Genuine fitting and complete-rig affine proof

Each complete original 456-triangle valve now mounts through its actual
negative-source-X flange. The recipe measures the original extreme-X patch,
finds the closest point on an actual outward native tank triangle, aligns the
pipe axis with that face's outward normal, and places the genuine flange center
on that surface. The handwheel is not used as an attachment foot. Original tank
triangle indices 278, 251 and 279 supply the three mounting planes; these are
picked-source indices, before export ordering. All three full valve donors,
the complete 310-face tank and complete 2,574-face truck remain retained.
No cap, bracket, flange or other donor geometry was replaced or sculpted.

The recipe then measures the complete rigid assembly, including all salvage,
boarding plate and both lamps. It applies one common affine map with X scale 1,
Y scale **1.2173884674888331**, Z scale **1.5218595013898075**, Y translation
**0.000000029024803295834896**, and Z translation **0.1430549469746238**.
This preserves the existing width, grounds the complete model and centers its
11 m longitudinal span. Every donor's source-to-world matrix is composed with
that same map. Final native vertices are computed directly from original faces
through the composed matrix, with one float conversion. Both lamps follow the
same rigid fit. The fit input records `buildTargetsMetres`, not a claimed size
substituted for loaded geometry. Width has no new acceptance target.

Actual complete native box is minimum **[-1.5, 0.0000000000000004054718131,
-5.5]**, maximum **[1.5, 3.5, 5.5]**: width **3 m**, height
**3.4999999999999996 m**, length **11 m**. These are measured loaded triangles
with world matrices, not manifest declarations or camera scaling.

Both genuine minimum tank edges remain fully supported at native Y
**1.2173885107040405 m**. Their loaded Z spans are
**[-3.3220229148864746, -2.9430794715881348]** and
**[-.7452099919319153, -.3662669360637665]**, with X near -0.000001 m.
Actual upward bed faces 683/684 cover each complete interval [0,1]. Bed face
indices changed only through material grouping/export order. There are
**zero strict tank/body triangle crossings** and no below-bed vertex witness.
The hover, sink, .8 m lateral and removed-both/either-bed-face negatives pass
at the original precision. No bounding-box-only support or hidden filler was
introduced.

Final whole-valve native skin gaps are **0 m for all three**; whole-part crossing
counts are **34, 8 and 2**. Their genuine negative-X flange patches have **0 m**
gaps and **7, 6 and 2** real skin crossings. The opposite ports remain exposed,
with measured gaps .3822401350741849, .4102227797574427 and
.4041989501781599 m. At least one genuine pipe connection mounts each valve;
no invented full-flush requirement was added. All copied native positive,
hover, lateral and removed-attachment-surface controls remain passing.

### Approved material and lamp work

The replacement seeded atlas distinguishes dark worn cab paint, lighter dusty
tank steel, localized oxide/scuffs, dark rubber, worn steel hubs and dark cab
glass. Original donor face regions are read only as semantic labels; their
source UVs and original palette pixels never enter output art. Actual cab glass,
headlights and wheel hubs receive distinct replacement surfaces while every
triangle stays native. Road tyres remain dark rubber. The genuine Factory
handwheel/control faces receive hazard red; genuine flange/collar faces use
bright worn metal; the remaining pipe uses dark worn metal. Black/yellow hazard
paint is on actual front bumper and retained boarding-plate faces.

The two lamp lenses are darker while inactive. The existing native presenter
sets them to orange `0xff6610` at emission strength 6 only when all three finite
valve health values are <=0. Initial healthy values, every one of the eight
combinations and half-armor recovery retain the original on/off rules. All other
materials, geometry, input arrays, simulation state and source ownership remain
untouched by lamp updates. Exact-once success/late-load disposal, rejected load,
no save access and no extra request controls remain passing. These material
choices address the written review direction; they do not grant a visual score.

### Exact validation and protected inputs

Unchanged default RED reproduction: original **42/42 passed**, native flange
suite **9/12 passed**, scale suite **0/2 passed**: **56 cases, 51 passed,
5 genuine failures**. Final default `node tools/test-convoy-tanker-art.mjs`:
**42/42 + 12/12 + 2/2 = 56/56 passed**, with no exclusions, changed assertion,
new tolerance or fixture change. Full topology/affine lineage, actual supported
edges, zero strict truck/tank crossings, original rights/bindings, replacement
PNG pixels/materials, seeded byte repeatability and lamp/resource controls pass.

The first Source attempt exposed repeated float-rounding error and an optional
X-width expansion that made the fixed .8 m lateral negative genuinely supported.
Source was corrected by retaining X scale 1 and applying the composed affine
once to original faces. The test stayed exact. That attempt's raw two failures
remain in private evidence. The corrected geometry passed all 56; the final
material refinement passed all 56 again. Heavy jobs paused after a completed
batch for the Director's actual Salt frame window and resumed only after release.
No export was interrupted mid-write and no frame numbers are inferred here.

Existing `test-tanker-valve-source.mjs` passes **30 checks**;
`test-scene-systems.mjs` passes **16**; `test-replays.mjs` passes all **162 exact
fingerprints**. Private `npm run build` passes (422 ms Vite build) with the existing
large-chunk warning. No catalog, source choice/pick, licensed file, scenario,
comparison sheet, current public model, old world signature or replay pin changed.

The complete frozen test remains 58,677 bytes, SHA-256
`fcaa36c3aabe4f67df6d07a79fcbb6d98a605aa83563c66ec62f9c429310ac4c`.
Its original 42,161-byte prefix remains
`6021849168fe659eccd47a6db40e2e320a5b66a5c34f81dbc6632212f97cad05`;
the 55,768-byte contact prefix remains
`ff00ff7c590d52df8844aa39c1c7fc21620cf7b5e7d4e769efb735039c50330a`.
The original valve-source record remains SHA-256
`3afc6c2a8b5c64ee72171b21894333be19a3cf8e3d8223a9dbf0f590c40bb6a4`;
catalog remains
`3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`.
All unowned tracked files and separately checked licensed source bytes remain
protected. All existing source picks, provenance, rig rules and output paths
in the fit input remain byte-equivalent data; only build targets were added.

### Native cost, evidence, limits and Removed

Final native candidate and repeat: **6,328 triangles, 26 meshes/draws,
1,616,912 bytes**, SHA-256
`a3ed6fa81dd493983a4b9e07f69216258e2ce048b9849acf9af291ef02823377`.
Triangles remain unchanged. Ten added native draws come from genuine semantic
material groups, and byte growth versus Source2583 is **553,644 bytes**, from
the replacement atlas/materials. The file-size target remains advisory; no
triangle, width, draw, brightness or frame budget was invented. Native counts
cannot clear frame performance or visible proportions.

Complete raw RED/first-fit/corrected/final logs, original source/support/flange/
size witnesses, repeat evidence, protected receipts, replay and build output
stay in ignored integration `.evidence/2026-10-01/ART-FIT-TANKER/round2-source/`.
Final regenerable candidate/repeat stay in lane
`.qa-dist/tanker-art-tests-IkL4uW/`. No generated GLB, PNG or screenshot is
committed or installed into public/current assets.

This hands back clean bounded Source ownership for independent review.
Comparison round two, actual renderer/car-size and material views, independent
art/frame/motion review and Claude's round-two verdict are still required.
Every comparison goes to Claude; one comparison round has been used and the
three-round cap remains unchanged. No comparison two was created here.
Final exact lane/full/build/integration gates and public installation remain
pending. No whole-art/card/frame/browser/merge/push/release clearance is claimed.

Removed: prior detached/handwheel-only candidate valve poses were replaced by
actual native flange mounts. Prior all-rubber wheel treatment, uniform worn
paint and weak warning emission were replaced by semantic replacement surfaces
and the brighter approved lamp state. No donor face, original licensed source,
picked topology, source binding, old assertion, current public asset, scenario,
comparison or replay pin was deleted. Private superseded candidates remain
used-once evidence for the Director's janitor after verdict capture. No live,
Preview, port 5174, real save, protected audio, new dependency, service, source
pack, download, helper, model override or history rewrite was used.


## Round 2 QA framing recorded before capture — 1 October 2026

Director independently cleared Source a1ce674 and the exact private candidate
SHA-256 a3ed6fa81dd493983a4b9e07f69216258e2ce048b9849acf9af291ef02823377,
1,616,912 bytes, for actual comparison only. The unchanged candidate and manifest
are staged in lane `.evidence/tanker-private-candidate/` before the QA build
clears `.qa-dist/`. The scenario rejects any other candidate SHA or size.

The round-one fixed camera offsets assumed the prior 7.228 m truck. Before any
round-two capture, QA framing now derives from the complete loaded 3 x 3.5 x 11 m
truck bounds. Near and distant matched views include the actual rendered game
car for scale. The paired view includes both native graphs and that car; opposite
and roof inspection include the complete truck. The existing production
inspection camera stays at 48 degrees. Its position/target are set only by this
private QA scenario, using all eight bounds corners and a 14% edge margin.
Projected corners must remain inside the actual camera. No production camera,
model transform, native recipe, test or simulation rule changes.

All eighteen named High/Performance views and existing readiness, yard, health,
input and state controls remain. The exact two-lamp on expectation follows the
approved real presenter: orange ff6610, strength 6; recovery remains zero.
Original main-donor Source palettes are loaded only for the disposable comparison
graph with the exact new manifest matrices; the fitted graph uses the verified
complete native asset and actual presenter. No former runtime tanker exists.
The report is saved incrementally to retain completed details if an attempt fails.
Capture and art verdicts remain pending at this preparation entry. Heavy work is
held for Shove's agreed frame window; Tanker frame timing is not measured.

Removed: replaced private round-one fixed review offsets and stale lamp-output
expectations. Round-one sheet/verdict, Source/native assertions, palettes/catalog,
licensed files and public/runtime assets remain intact.


### Round-two camera correction before recapture

Attempt 1 stopped before images on the new QA quality assertion. The inherited
report read nonexistent `app.graphicsQuality`; the actual renderer selects High
from `app.ambientOcclusionEnabled !== false`. QA now reads that real selector and
retains an exact High/Performance check. No production setting or rule changed.

Attempt 2 passed all eighteen functional checks at private port 59369, with two
duplicate-Three QA warnings and no errors. Direct image inspection found that the
paired bounds-fitting camera was behind a genuine yard wall; the distant angle
partly hid the car. Bounds alone do not prove visible art. Before recapture, only
QA view directions are corrected: paired [2,10,-5] and distant [1,10,-2], each
normalized before actual-bounds fitting. The distant camera retains its 3.4
distance multiplier. These higher actual-yard angles keep the review context
clear of the real wall. Near/opposite/roof directions, model placement, all native
graphs, yard walls, complete eighteen-view count and every state/health assertion
stay unchanged. No wall is hidden or altered. Attempt 2 is retained as used-once
evidence, not accepted as the finished sheet.


Attempt 3 clears the wall and passes eighteen checks, but direct paired-image
inspection shows that the inherited +4 world-X Source shift overlaps the actual
car. Before final recapture, the paired Source graph stays at its normal actual
`groundAt(s,lateral+8)` point; the fitted graph uses the native
`groundAt(s,lateral+16)` point. The complete fitted position is reset to its
normal native ground point before health/opposite/roof views. Only private
comparison placement changes; donor manifest matrices, model scale, real car,
yard and simulation state remain unchanged. This replaces arbitrary paired
world-X translation with genuine course ground coordinates. The same higher
paired camera fits both actual graphs, and report records the paired ground.
Attempts 1–3 remain complete private evidence; one round-two candidate is used.


### Round-two actual capture result — bounded QA ownership return

Final attempt 4 uses private port **6331**, memory-only saves and the actual
App/Duel/renderer. All **18/18** named High/Performance Source/fitted/paired/
health/opposite/roof views pass. Loaded native dimensions are **3 x 3.5 x 11 m**;
all projected context corners remain inside the camera (maximum absolute X/Y
**0.860000000000072**). The actual Falcone F42 is retained for scale. Both loaded
warning-lamp meshes show exact ff6610/6 at [0,0,0], and zero emission at recovery
[1,0,0]. Supplied arrays and Duel state are unchanged. There are zero browser
errors and **two duplicate-Three QA-bundle warnings**, preserved without hiding.

One round-two sheet is **444,260 bytes, 1200 x 3707**, SHA-256
`dc21c8e4f55551bcd53ba4e6769e50e1c61bdef6ee0aafbd9102afbfe062bd63`.
All eighteen actual full frames are resized only, with labels outside the pixels.
The source-palette baseline uses exact new manifest transforms. Manifest is
**12,224 bytes**, SHA-256
`6c7949a0e19e0b87cca33c5f8c05cca13eeb73a7b7014a1dc715d059a3c270d8`.
Candidate remains exact **a3ed6fa8 / 1,616,912 B / 6,328 triangles / 26 native draws**.
The approved QA expectation changes are exact candidate/manifest bindings and
old lamp b32904/2.2 -> real approved ff6610/6. No threshold, health count, state
rule, native 56-case assertion, source palette/catalog or Source file is weakened
or changed. New bounds/corner/quality checks add evidence.

The complete original Source/note prefix, first-round sheet/recipe/verdict and
all unowned tracked files remain unchanged; explicit hashes are in
`protected-before.json` and `protected-after.json`. Raw logs, every attempt's
complete report, final camera/ground/corner/health records and all eighteen final
PNG hashes/images are in integration
`.evidence/2026-10-01/ART-FIT-TANKER/round2-comparison/`. Lane evidence retains
every attempt. No active export was interrupted. The two camera/placement repairs
are QA recaptures of one unchanged round-two candidate; **two of three art rounds**
are used. Round-one verdict stays intact.

The review note records self-observations only: full rigid truck/car scale,
lighter tank/darker cab/glass, distinct hubs, bright collars/small red controls,
prominent open ports, raised striped plate and small lamp contrast. Distant
views use a higher static angle to clear the real wall; they do not clear the
production racing camera or motion readability. Independent critic and Claude
verdicts remain pending. Every comparison goes to Claude before merge/install.
No frame timings, full Convoy/gameplay, art score, public install, whole card,
merge/push/release or final lane/full clearance is claimed here.

Removed: stale private QA fixture/lamp expectations, fixed comparison offsets
and paired world-X shifts were replaced. No native donor, Source/provenance/test,
licensed input, first-round record, public model/catalog, runtime asset, replay
pin, world signature or protected audio is removed. Failed/occluded evidence
stays used-once pending Director consumption and janitor deletion.


Focused unchanged QA controls pass: browser harness **5 tests / 14 evidence
checks**, memory-only storage **39 checks**, review evidence **9 tests / 319
checks**. Private `npm run build` passes (**439 ms**) with the existing large-chunk
warning. The sheet recipe deterministically selects **JPEG quality 60** to stay
under 500,000 bytes; dimensions and the final sheet SHA stay exact after rebuilding.
Complete outputs are preserved under the same integration evidence directory.
Native 56-case Source assertions remain byte-exact and retain their previously
reviewed Sourcea1ce evidence; this QA slice does not change or rerun them.
The full lane plan is unchanged and remains a later pre-merge gate. No merge
occurs in this handoff. QA ownership returns for independent review and Claude.


### Private-generator placement gate: tests-first contract

The mandatory lane gate on clean effa791 stopped at the exhaustive Blender
coverage check: tools/blender/convoy-tanker.py was the single uncovered recipe.
Its raw result is 115 passed, 1 failed and 202 not run; the separate build passes.
Evidence remains in .evidence/2026-10-01/ART-FIT-TANKER/review-gates-round2/.
This is a tooling gate repair, not another art round or runtime installation.

The Director grants this card tools/test-blender-output.mjs exclusively until
merge. A separate, explicitly named private-generator registry adds Tanker to
its existing exhaustive deepEqual. The actual script enumeration and filtering
are unchanged. All established public-generator GLB paths, one-Blend-per-model,
editable-source placement, runtime-file-existence and review-helper assertions
remain exact. No unknown recipe is skipped or allowed by a blanket exception.

Seven additional checks run the real command-line recipe under plain Python
with --root pointing at an empty synthetic root, --output-dir pointing at its
.qa-dist/tanker-private or .evidence/tanker-private, --fit-config pointing at
checked-in tools/art/tanker-fit.json, --seed 1989 and --paths-only. Two distinct
roots must give identical relative output plans and create no files or folders.
The plan lists absolute tanker.glb and manifest.json destinations, blend:[],
atlas:[] and embeddedAtlas:['tanker-local-wear-and-hazard-atlas']. The actual
worn atlas is packed in the GLB; this contract invents no external PNG or Blend.

The real CLI runs with Python -I -B -S and a standard-library audit hook. Any
bpy/mathutils/numpy import, read outside the exact recipe/fit and Python standard
library, or filesystem mutation is recorded and rejected before it can occur.
A successful plan therefore cannot depend on licensed caches, installed Blender
or an output directory. Rejected public paths, paths outside the requested root,
traversal into public, private-looking siblings and linked-directory escapes
must fail with a specific private-output diagnostic before forbidden operations.
The exact synthetic tree and the linked destination stay unchanged.

Source repair is deliberately small: parse/validate the private plan and return
before importing Blender dependencies. Preserve the original native recipe body,
normal candidate output and source-validation/artifact behavior. The Source
worker owns that later step; this tests-only slice changes no recipe or src file.

The original runtime/review assertion blocks and the coverage-only registry delta
are verified in placement-tests/existing-assertions.json. protected-before.json
records every tracked file, including Source a1ce, native 56-case assertions,
round-one/two sheets and recipes, fit, catalog, public assets and replay pins.
The complete prior change-note bytes are retained for an append-only comparison.
Execution remains held during the Director's Shove frame window. No new RED,
browser, native Blender, full gate, art or merge result is claimed at this entry.

Removed: nothing. This registers the previously uncovered private recipe while
retaining every existing runtime placement assertion and current art asset.


### Private-generator placement: actual RED result

After the Director released the frame window, the complete placement suite ran
in **2.62 seconds**: **41 checks, 7 intended failures**. The original 34 checks
are clear, including the exhaustive registry equality after the explicit Tanker
registration. This does not clear the later lane or full gate.

Both valid destination checks stop at the actual top-level import with
RuntimeError: paths-only attempted forbidden import: bpy; no path plan is
produced. The five unsafe destination checks fail the strong requirement to
reject paths before imports, because their actual audit receipt also records
that forbidden import. Exact failing cases are:

- tools/blender/convoy-tanker.py plans private model, manifest and packed atlas without Blender, licensed reads or writes.
- tools/blender/convoy-tanker.py also permits a dedicated private evidence destination.
- tools/blender/convoy-tanker.py rejects public runtime output before imports, reads and writes.
- tools/blender/convoy-tanker.py rejects an escaping root before imports, reads and writes.
- tools/blender/convoy-tanker.py rejects traversal into public before imports, reads and writes.
- tools/blender/convoy-tanker.py rejects a private-looking sibling before imports, reads and writes.
- tools/blender/convoy-tanker.py rejects a linked private directory that escapes the requested root.

The guard blocked bpy before import completion. Actual read receipts contain
only the recipe and Python standard-library files; no fit/cache/catalog or
licensed source read occurred. Every synthetic root and outside/linked target
remained unchanged, and the junction was unlinked without following its target.
No Blender, browser, native 56-case rerun, build or art recapture was performed.
Complete failure messages/audit receipts are in placement-tests/red.log and
red-result.json; the previous uncovered-recipe failure is retained separately
in original-coverage-failure.txt.

The Source worker must add the agreed side-effect-free planning entry before
Blender imports, including private-output validation before returning its JSON.
No source body, fit, presenter, native art assertion, palette/catalog, runtime
asset, round-one/two recipe/sheet, replay fingerprint or art verdict is changed.
Original note prefix: 67804 bytes, SHA-256
9a6dab188a5e90be5e31e8cf1e5d931671676551fe7f5230fc40122753d7a4cd. Exact tracked-file
receipts and original assertion-block hashes are retained in placement-tests/.
Tests-only freeze follows; whole-card, merge and push clearance remain pending.

Removed: nothing. Seven real private-output acceptance checks are added; no
existing assertion or current asset is removed or weakened.


## Private tanker planning CLI Source fix — 1 October 2026

Frozen tests-first ref **1c366f4ac3a92edea3eef7d254a49bc1bee54713** is reproduced
unchanged: **41 checks, 34 passed, 7 real failures**, all seven caused by attempted
`bpy` import before private planning/path rejection. The early standard-library
entry now parses the agreed CLI and rejects public, outside, traversal, sibling
and linked-directory escapes before importing bpy/mathutils/numpy. Valid
`--paths-only` exits with one JSON object, absolute tanker.glb/manifest.json
paths, empty blend/atlas lists and the real packed-atlas name
`tanker-local-wear-and-hazard-atlas`. It reads no fit, catalog, licence, source
cache or destination and creates no file, directory or bytecode cache.

The planning root is the requested synthetic `--root`. Normal source-validation
fixtures may provide a separate catalog root; normal export destinations keep
the existing recipe-lane private boundary. This preserves intact copied-source
validation and genuine damaged-source rejection. The complete original
`import bpy`-to-end native body is byte-exact, including its normal CLI, fit/source
validation, seeded atlas/materials, geometry, export and manifest code. Only the
early private entry is added. No fit, presenter, native test or art change occurs.

Actual strong suite after the fix is **41/41**, including two distinct synthetic
roots, private evidence output, five unsafe-output audit guards and all original
**34 coverage/placement controls**. The audit rejects forbidden imports/reads/
writes before they happen. Actual normal Blender private regeneration gives
**6,328 triangles, 26 native draws, 1,616,912 bytes**, exact SHA-256
`a3ed6fa81dd493983a4b9e07f69216258e2ce048b9849acf9af291ef02823377`.
The manifest is also byte-identical: **12,224 bytes**, SHA-256
`6c7949a0e19e0b87cca33c5f8c05cca13eeb73a7b7014a1dc715d059a3c270d8`.
Unchanged native acceptance passes **42/42 + 12/12 + 2/2 = 56/56**, preserving
all genuine donor topology/affine/source controls, tank support/zero crossings,
three native valve mounts, exact 11 m/3.5 m dimensions, two lamps and lifecycle.
No new fitting round is used because all native output bytes stay exact.

Complete RED/GREEN audit logs, normal export args/log/byte receipt, native56 log,
original-body proof and all tracked-file protection receipts are in integration
`.evidence/2026-10-01/ART-FIT-TANKER/private-planning-source/`. The mandatory fresh
`node tools/run-tests.mjs --tier lane --changed --jobs 8` and `npm run build`
follow this entry; their raw verdict is retained before the Source handoff.
Round two remains Claude-held below the art bar. This CLI gate repair grants no
art, whole-card, public installation, merge, push or release clearance. No browser
or frame work is performed.

Removed: the missing private planning entry and import-before-rejection failure
are replaced by the early side-effect-free CLI branch. No old native body, asset,
source/licence, fit/material, test/assertion, catalog/public file, comparison
round/verdict, replay pin or shared file is removed, weakened or replaced.

Recipe before SHA-256: `6483f1d7eb9970744f71db78cc06def007a39c066c2212d8c947de9ac018ce13`.
Recipe after SHA-256: `28f091e0e7c4325bc0c0a86018380f71a5efd534ee77b07c62bc7cae370e86a4`.
Original frozen Blender body: **24996 bytes**, SHA-256
`7975324c58225b02a5a008cb95f9f73942b23685f368e589b20d8f04cbe07cd4`.
The prior note prefix remains **73750 bytes**, SHA-256
`42699f01a607380a35969246083e5e53adfc3dc2f89660521ff314cb193e2ac8`.


### Mandatory lane result and bounded Source freeze

Fresh exact command `node tools/run-tests.mjs --tier lane --changed --jobs 8`
stopped at **118 passed, 1 failed, 199 not run in 241.70 seconds** out of the
318-suite plan. The single failed suite is protected
`tools/test-audio-crash-peak.mjs`: native browser setup reports
**Runtime.evaluate timed out**. No audio acceptance check was reached; its 23
cases share the failed setup hook. This is preserved as an infrastructure
failure, without inferring a Source/audio cause or changing any audio/test file.
The Root's concurrent Salt diagnosis browser has finished, but Shove's mandatory
lane is still active. Per Director instruction, the complete lane is not retried
concurrently. One unchanged failed audio suite and a fresh exact lane/build wait
for the Director's quiet availability. This Source freeze has no passing lane gate.

The separate required private `npm run build` passes (**479 ms**) with the
existing large-chunk warning. Both direct **41/41** planning and **56/56** native
checks remain green, and actual regenerated GLB/manifest bytes are exact.
`lane.log`, `lane-result.json`, complete native audio failure report, `build.log`
and `build-result.json` retain the actual results; no failure is excluded or
converted to a pass. All unowned tracked hashes, including frozen placement/native
assertions, fit, presenter, material/catalog/public assets, both comparison rounds
and replay pins, remain exact. The complete prior note prefix is unchanged.
Only tools/blender/convoy-tanker.py and this append-only note are committed.
Source ownership returns for independent review; later successful exact gates
and Claude's art clearance remain required before any applicable merge/install.

Removed: only the original import-before-private-planning failure. No protected
audio code, test, tolerance, native body, art round, current asset or failed
evidence is removed or altered. No merge, push, release, art recapture or
frame measurement occurs in this CLI repair.
