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
