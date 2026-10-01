# ARENA-06: Salt Flats source validation

The three independently frozen wrong-pick regressions are repaired. All
**28 source/native/preservation checks pass**; the default suite reports
**41 checks, 32 passed, the same nine runtime failures**. This is a private
source-only WIP handoff. Existing game hooks remain ungranted, and runtime,
art/frame, heat, comparison and whole-card approval remain pending.

## Status and scope

Private native source stage, built after independent tests-first commit `c37eac8254f16f0f55491f08c799b7514da9d75e`, on clean integration `40b81c1159565ac1713b5d5d4d9a6c0593f64c96`. This is WIP and cannot be merged or installed as the finished card. The Director claimed the card before this lane started and granted the new recipe, new scene module and this note; control-fixture ownership was granted in board commit `927f57c`. Existing game hooks, catalog, frozen assertions, fit configuration, current assets and replay fingerprints remain unchanged.

Kyle selected Kenney Car Kit, Kenney City Kit Industrial, Kenney Factory Kit and Quaternius Public Transport; the bus is the plain `Bus.blend`. He selected the CC0 salt photograph with mirrored UV tiling. The small fit JSON pins these actual inputs, the nominal 300 × 200 metre ground and exactly two ramps. It contains no behavior fingerprints or invented material scores.

SPEC 0.12 requires a separate `salt-flats: dev` switch. The venue additionally requires the Wasteland/Scrapdome access, discovery and rank nine. Existing Scrapdome entry at rank one remains a control. Public launch must reject unknown venue or mode without changing event or profile state.

## Acceptance checks

The default `node tools/test-salt-flats.mjs` includes source, native, runtime and preservation checks. `--native-only` is a WIP diagnostic, not a passing card or merge gate.

- Source: actual CC0 source, primary licence records, byte counts and SHA-256 pins; nine independently imported native geometries; genuine 1920 × 1275 salt photograph. Actual recipe validation must accept the approved cache and reject an empty cache, changed model bytes, altered licence evidence and legitimate but unpicked SchoolBus geometry, before any export.
- Native: self-contained GLB under the lane's `.qa-dist`; actual transformed original source triangles for all four packs; nominal ground extent; unchanged approved photograph actually used by the ground material with exported mirrored U/V repetition; removed original bright pack palettes; actual salvage cover, two ramps, crane, plain bus, tyre walls and container walls; solid world vertices inside declared oriented collision envelopes; repeatable real geometry and layout.
- Runtime: separate dev switch; registered second physical venue, ramps, clear spawns and seeded collision features; actual memory-only App launch at rank eight/nine, discovery absent/present and switches off/on; unknown mode/venue rejection; unchanged default Scrapdome; each built public arena mode reaches an actual result through a complete seeded round, remains on its physical floor and repeats its trace, event sequence and result; actual scene uses the native geometry without changing collision features or consuming simulation RNG.
- Preservation: independently captured current Scrapdome physical/spawn fingerprint and real eight-second 120 Hz driving/rule fingerprint; existing ordinary replay pin preserved; every currently tracked runtime asset, catalog, selected old assertions/replay pins and licensed originals remain byte-identical during the checks.

The public-mode list follows the currently built `ARENA_MODES`, excluding dedicated story `warlord`. Moving Sal or other story fights by inference is not authorized; the Director sent that design exception to Claude in writing. Future built public modes enter the same complete-round check without a hidden skip.

White-bowl appearance, genuinely derelict wear, stacked readable boundaries, visible heat shimmer, all-six look scores >=4, and <=10% frame cost versus current Scrapdome in High and Performance remain mandatory actual-game browser/reviewer gates. The suite does not claim those from shader strings, labels, synthetic timings or saved generated reports. The Director will arrange independent matched measurements controlling active readiness, quality, seed and actor count. Use near/racing game views, at most three art rounds, stop after two rounds without useful improvement, and obtain Claude's comparison review before any merge. Kyle's final Preview review remains separate. No art, browser, frame or card pass is claimed here.

## Native builder and consumer contract

Accepted routine native command:

```text
blender -b --disable-autoexec --python-exit-code 1 --python tools/blender/salt-flats.py -- --root <lane> --output-dir <lane/.qa-dist/private> --fit-config <lane/tools/art/salt-flats-fit.json> --seed 1989
```

`--validate-sources` performs the actual source guard without exporting a venue. `--source-library <private-root>` resolves pack folders by catalog ID, permitting real copied-input negative tests without writing the read-only library. Default paths come from the existing pinned catalog. No external download is required.

The normal build emits `venue.glb` and a small `manifest.json`. Manifest source instances identify a picked `catalogId/relative-path`, actual target mesh name, first exported triangle, original triangle indices and 16-value column-major world transform. Original triangle numbering comes from actual Blender imports, mesh objects sorted by name and their native loop triangles, converted to game Y-up `(x,z,-y)`. Each asserted source face must match its actual transformed original vertices within 0.1 mm; metadata alone cannot establish source lineage. Combined and affine-trimmed parts are allowed. Bring any concrete decimation geometry bridge back for review before changing a frozen check.

`ground.node` names the actual ground mesh. Feature rows name actual meshes and one of `ramp`, `salvage-cover`, `crane`, `bus`, `tyre-wall`, `container-wall`; solid cover, bus and boundary parts carry `collision: {center:[x,y,z], halfExtents:[x,y,z], heading}`. Tests check actual world vertices with 2 mm numerical tolerance. These are observable geometry/provenance interfaces, not settled new gameplay dimensions. Source GLBs may legitimately reference their pinned local palettes; only the candidate must embed all resources.

The new native scene interface is implemented: `createSaltFlatsScene(course, {loadAsset})` in the owned new venue module returns `{group, ready, dispose}`. The injected loader returns the actual candidate GLTF scene, allowing native geometry consumption, physics/RNG independence and cleanup to be tested without graphics or live saves. Renderer/App/course/launcher/flags/UI and old catalog-test hook requests remain ungranted until the Director hands them off after Fuel merges. No existing hook was edited during RED or the private native build.

## Private implementation and actual checks

The native recipe verifies all cached CC0 licence records, byte counts and hashes before creating output or importing source models. It uses the installed Blender with script auto-execution disabled. Each exported reused face retains the original native triangle index and its affine source-to-world placement. The candidate is self-contained and does not depend on another procedural venue builder or any current runtime model.

The actual 300 × 200 metre ground uses the unchanged approved JPEG. Its exported glTF texture sampler mirrors both UV axes; the recipe changes sampler metadata, not photograph pixels. A new reproducible wear atlas replaces the original source palettes with faded paint, rust, scorch, dusty metal, dark glass and rubber. Its appearance remains unreviewed in the game.

Four container boundaries use grounded, aligned two-high native containers. Dense three-high tyre sections stand against the inner side boundaries. Six cover piles reuse strongly compressed sedan shells with wheels removed, supported by actual tyre/drivetrain parts and accompanied by actual detached doors. The upper shells overlap the lower roofs. The plain Bus retains its native body and wheels with window faces removed. The source crane retains its native proportions and has its actual source magnet hung from the jib by a simple cable connector. Exactly two native sine-profile ramps are included. These are private geometry/layout candidates, not newly settled gameplay dimensions.

The manifest names 16 real feature meshes, their actual solid collision envelopes, two ramp profiles and all source triangle placements. Native output contains **102,764 triangles and 17 mesh draws** before game lighting/shadow costs. The candidate GLB is **12,821,528 bytes** and the manifest **476,009 bytes**. This output cost remains to be measured and tuned in the actual game; it does not establish the <=10% frame gate. The field `geometrySha256` currently hashes the complete candidate GLB bytes: `59b4807bcd600bcb8e458dc4e9e2bdc3512fa4f3126c0c2343d594efdc0bcd7b`. The native test separately verifies repeatable actual geometry and source placements for seed 1989.

The new scene constructor attaches the actual loaded native graph and checks its real ground dimensions. It tracks loading, ready, failed and retired states without consuming simulation RNG or mutating supplied course features. It owns resource cleanup, clears its graph before enclosing disposal and releases late-loaded assets after retirement. No runtime asset was installed, and no existing renderer imports this new module yet.

On 30 September 2026:

- `node tools/test-salt-flats.mjs --native-only`: **25/25 pass**. Actual original-source imports, four-pack triangle lineage, supported feature meshes, containment, repeatability, embedded photo/sampler and preservation controls pass. Empty cache, changed model, changed licence and SchoolBus replacement are expected rejections before export.
- `node tools/test-salt-flats.mjs`: **38 checks, 29 passed, nine failed**. The remaining nine are the ungranted switch, venue/physical registry, rank-eight/dev-off rejection, selected rank-nine launcher, unknown venue/mode rejection, complete Salt Flats round and game scene through the real registered course. The new scene module now exists; the scene acceptance stops at the missing registered venue (`assert.ok(venue)`). No runtime assertion changed or was skipped.
- An additional private native-component diagnostic used the actual candidate GLB: **11 assertions passed** for disabled-course loading, real graph/ground consumption, preserved geometry pointers/features/RNG, exact-once disposal, late-load retirement and wrong-width rejection. This exercises the new module only; it is not a substitute for the frozen game scene acceptance.
- Existing arena event tests: **13/13 pass**; arena UI: **6/6 pass**; ordinary replay fingerprints: **162/162 pass**. `npm run build` passes; the inactive new module is exercised separately by the native-component diagnostic. The existing large-chunk warning remains.

Logs and generated private candidates are under the ignored `.evidence/2026-09-30/ARENA-06/native-stage/` and `.qa-dist/` paths. No comparison sheet or art round has been started: **0 of 3 rounds used**. There is no heat-shimmer, frame, browser, look-score, Claude approval or full-card pass.

Frozen read-only SHA-256 controls still match: fit JSON `c6298b9cc516a31cb97d76a6da88a84c6232200626699d5e499cc553107b660b`; independent source test `c67929fe883072b5bed5ed660e746225b694439dc95e00c46db94b9095bea05a`; new Scrapdome control fixture `db071b927146aea534ca6fb46a67655e7cb5fe864f62993e8149d22baa44513a`; original catalog `3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`. Changed assertions: **none**. All licensed originals and tracked public assets remain unchanged.

## Next ownership boundary

The Director must re-slice or release the existing venue registry, Course/arena physical consumer, App/launcher/access/flag/UI and render hooks after their current owner finishes. Real physics must consume the same candidate cover positions and ramp profiles before seeded full-round checks can pass. Actual heat shimmer, matched High/Performance game comparisons, <=10% frame measurements versus current Scrapdome and Claude's written comparison review remain required. A public model/catalog installation belongs to that later authorized stage. Do not infer approval from the native-only result or add synthetic heat/render proof to turn a check green.

This is an ownership boundary, not a laptop-tool failure. The story-warlord venue exception remains a written design question with Claude, routed by the Director. The current partial stage is frozen for review and handoff; it does not use the stopped Rustwall refit, modify its current assets or reopen that closed card.

## Exact pre-implementation RED

On 30 September 2026, the default suite exited 1: **38 checks, 13 passed, 25 failed** (2.17 seconds). Native WIP exited 1: **25 checks, 9 passed, 16 failed** (2.38 seconds). A sandboxed invocation first stopped at private scratch creation with EPERM; the authorized scoped invocation then ran the actual checks. EPERM is not counted as card RED.

The following 16 checks each fail with `missing actual Salt Flats source-validation and native-build recipe`:

1. Approved source validation without export.
2. Empty-cache rejection.
3. Changed-model-byte rejection.
4. Changed-licence-evidence rejection.
5. Legitimate unpicked SchoolBus rejection.
6. Actual contained native export.
7. Car Kit original-source triangle lineage.
8. Industrial Kit original-source triangle lineage.
9. Factory Kit original-source triangle lineage.
10. Public Transport original-source triangle lineage.
11. Actual 300 × 200 metre ground.
12. Genuine photo on mirrored repeated ground UVs.
13. No original bright pack palettes.
14. Native required features and plain Bus.
15. Solid collision-envelope containment.
16. Repeatable actual native geometry/layout.

The nine runtime failures are:

1. Dev switch: `new venue remains dev before review/release`, `undefined !== 'dev'`.
2. Registry/physical venue: `missing registered Salt Flats venue consumer`.
3. Rank-eight launch: `locked venue cannot silently launch the default Scrapdome`, `true !== false`.
4. Dev-off launch: the same message, `true !== false`.
5. Rank-nine selected launch: `selection reaches the actual event/course`, actual `scrapdome`, expected `salt-flats`.
6. Unknown venue: `Expected values to be strictly equal`, `true !== false`.
7. Unknown mode: the same message, `true !== false`.
8. Complete Last Car Rolling round: `missing built last-car-rolling Salt Flats consumer`, `false !== true`.
9. Native game scene: `missing Salt Flats native scene consumer`.

Seven actual-source positives, discovery/Scrapdome-off/Wasteland-off rejection, default Scrapdome entry and both preservation controls pass. Source proof runs installed Blender on the actual licensed native originals with script auto-execution disabled. Original source inspection measures triangle counts `[2032,68,412,288,402,402,564,172,1530]`. GLTFLoader's test texture adapter skips pixel decoding only; geometry, transforms, embedded bytes, material bindings and sampler metadata are real.

The off-Wasteland fixture reaches the yard with Wasteland enabled, then applies the tested off switch before public entry. This prevents a fixture navigation failure from masquerading as the acceptance failure.

## Unchanged controls and verification

The new one-time control fixture records:

- Scrapdome physical/spawn SHA-256: `ed9d0c026108a96dc68e34f5fb56a7b3db4f7d667ba39a744f7762faa5ff2ec7`.
- Scrapdome real driving/rule trace SHA-256: `8d56bfd8d80eb7d0968d919d1c4732991313ebdc5f2c632cd4d46a2c9fad72db`.
- Existing ordinary replay file SHA-256: `b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a`.

Other untouched SHA-256 controls: catalog `3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`; combat replay pins `85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536`; hidden-road ordinary pins `e7ac791e2889fb44fef7fe825820a80b6ea56770f1d73bb096d381b3a1a88b50`; world-composition assertions `03c46238e3a56ae9179cf3962bca56edf3d3a4778ffe93b962d6c36aafe35238`.

- `node tools/test-arena-event.mjs`: 13/13 pass.
- `node tools/test-arena-ui.mjs`: 6/6 pass.
- `node tools/test-replays.mjs`: 162/162 pass across 18 cases, 16 events, eight categories, three frame rates and three runs.
- New files use LF. Existing assertion files and replay pins were not edited or regenerated. Final staged diff check must be clean before freezing.

The normal build passes. Lane tier, full tier, matched actual browser/art/frame review and Claude review remain required before integration after the runtime acceptance is complete. This WIP freeze grants no merge pass. Existing arena launch sounds cover the event; this private stage adds no game event or audio asset. Any proposed new ambient cue belongs to the implementation/review, not an invented test-author design.

## Removed

None: Salt Flats is a new venue and preserves Scrapdome and its native assets. The independent control capture creates its new fixture once and refuses to overwrite it. Private inspector outputs and copied negative-input fixtures are reproducible test scratch under `.qa-dist`; discard them after use. Keep all licensed originals and existing runtime assets. No closed Rustwall refit, old build path or art family was reopened.

## Independent changed-fit source-binding RED (1 October 2026 UTC)

The source guard checks the list of model labels, then validates each supplied catalog/path/hash independently. It does not bind Kyle's selected plain Bus label to its actual Public Transport `blend/Bus.blend` source. Genuine unpicked cached geometry can therefore pass under a misleading approved label. The old SchoolBus negative changes bytes at the Bus path; that unchanged control detects a hash mismatch but does not cover this valid alternate-source fit.

Three new independent native checks use changed JSON fit copies under the suite's own ignored scratch. Every alternate input uses its genuine catalog hash and unchanged licensed bytes. The tests invoke installed Blender and the actual recipe, with script auto-execution disabled. They require rejection before the output directory exists:

- `--validate-sources` must reject model `Bus` paired with genuine `quaternius-public-transport/blend/SchoolBus.blend`, hash `c51a071f872f2234dfb5ee8d94087428b0be0df51e0564e22e005bef9b16e7b8` and 1,782 native triangles.
- The full recipe must reject the same changed fit before importing/exporting the unpicked SchoolBus geometry.
- `--validate-sources` must reject model `Bus` paired with `kenney-car-kit/unpacked/Models/GLB format/sedan.glb`, its genuine catalog hash and 2,032 native triangles. This separately covers the catalog-family binding as well as the path binding.

Exact RED production source: `647463770af26327a4e04ef3a9b4a67a9949eb0e`. Command: `node tools/test-salt-flats.mjs`, exit 1, **41 checks: 29 passed, 12 failed**. All **25 original source/native checks pass**. The same nine ungranted runtime failures remain; no runtime assertion, guard or replay pin was removed or skipped. The three added failure messages are:

1. `native source validation accepted unpicked quaternius-public-transport/blend/SchoolBus.blend as Bus (1782 triangles)`.
2. `native export accepted unpicked quaternius-public-transport/blend/SchoolBus.blend as Bus (1782 triangles)`.
3. `native source validation accepted unpicked kenney-car-kit/unpacked/Models/GLB format/sedan.glb as Bus (2032 triangles)`.

The unchanged runtime failures remain the missing dev flag, missing physical venue, rank-eight rejection, dev-off rejection, selected rank-nine entry, unknown venue rejection, unknown mode rejection, completed selected Last Car Rolling round, and registered native scene consumer. Their nine failure messages remain those documented above; the last scene check now reaches `assert.ok(venue)` rather than missing the already-built inactive scene module. This test-only freeze is not a full-card or merge pass.

The full negative genuinely exports a **12,845,984-byte `venue.glb`**, a 477,200-byte manifest and a 1,602,248-byte wear texture. The manifest reports 103,004 triangles/17 draws and names `quaternius-public-transport/blend/SchoolBus.blend` for `plain-derelict-bus`. Validation-only negatives exit successfully without creating output; neither is a missing-source or infrastructure failure. Reproducible inputs, native logs and verdict JSON are in `.qa-dist/salt-flats-tests-QG4keZ/` for this run; the suite recreates them and never depends on saved review artifacts.

All **31,310 original test bytes** remain exact after removing only the new registration/helper block: SHA-256 `c67929fe883072b5bed5ed660e746225b694439dc95e00c46db94b9095bea05a`. The fit JSON, source catalog, licensed originals, runtime art and old replay controls remain unchanged. `git diff --check` passes; the assigned two files use LF. No source, fitting rule, selected pick or card acceptance changed. The source owner must bind the settled model/catalog/path selection before output and rerun these native negatives plus the required lane gates when runtime acceptance is complete.

### Removed for this test-only follow-up

None. The old hash-substitution negative and every original control remain. The new fit copies, accepted wrong-pick outputs and verdicts are reproducible ignored scratch, to be deleted after their verdict is used. No licensed source or current game asset is removed.


## Settled model/source binding repair

Tests-first input is clean `098d5132dbefa92b445c782ed8c25464050dc5de`,
with unchanged production source `6474637`. This implementation owns only
`tools/blender/salt-flats.py` and this note. Every frozen assertion, fit
input, catalog/source record, licensed original, scene module, public asset,
existing runtime hook and replay pin remains read-only and unchanged.

The previous guard checked ordered model labels, then accepted any genuine
catalog/path/hash assigned to each label. It now checks the settled ordered
**(model, catalogId, path)** triples for all nine selected native parts.
The plain Bus must be `quaternius-public-transport/blend/Bus.blend`;
SchoolBus and another pack's sedan cannot pass under its label even when
their bytes, catalog hash and native triangle count are genuine. The other
eight bindings retain Kyle's selected Car Kit, City Kit Industrial and
Factory Kit parts. No source choice or fitting rule was redesigned.

This guard runs inside `source_guard`, called before `originals`, Blender
source import, output-directory creation or native export in both modes.
The existing CC0/cache/hash/byte-count guards still run, the existing
model pin guard still checks each chosen hash, and the original triangle
counts still validate actual imported meshes. Fit transforms, source photo
pixels, mirrored UV tiling, palette replacement and geometry/layout
construction are unchanged. No new config field, source/license/hash/count,
substitute model or runtime dependency was introduced.

## Reproduce the native source RED to GREEN

Command: `node tools/test-salt-flats.mjs`.

Before, with frozen tests on `6474637`: **41 checks, 29 pass, 12 fail**.
The three accepted wrong-pick cases are recorded in the independent RED
section above; all 25 older native checks already passed. The same nine
runtime consumers remained missing.

After: exit 1, **41 checks, 32 pass, nine fail**. All **28 non-runtime
source/native/preservation checks pass**, including all original 25 and
all three appended genuine-source negatives. No test was skipped or
weakened. The failure status truthfully reports unfinished runtime wiring;
it is not a source-native pass for the whole card.

Actual native verdicts at `.qa-dist/salt-flats-tests-AJxQYB/`:

| Changed fit in plain Bus slot | Native mode | Rejected | Output directory exists | GLB exists |
| --- | --- | --- | --- | --- |
| quaternius-public-transport/blend/SchoolBus.blend | validation | true | false | false |
| quaternius-public-transport/blend/SchoolBus.blend | full export | true | false | false |
| kenney-car-kit/unpacked/Models/GLB format/sedan.glb | validation | true | false | false |

Every rejection is native exit code 1 with the settled-source message
`The recipe accepts only Kyle's nine picked native source bindings and plain Bus`.
The original missing-cache, changed-byte, changed-license and Bus-path
SchoolBus-byte-substitution controls still pass. The approved actual source
still builds a self-contained native candidate: **102,764 triangles, 17
mesh draws**, with the original photograph, two ramps and real source-face
lineage. Repeat actual geometry and source transforms still pass. A valid
candidate and copied negative fixtures stay only in ignored private
`.qa-dist`; no public asset was installed.

## Unchanged nearby controls and source protections

Fresh existing checks all exit 0:

- `tools/test-arena-event.mjs`: 13/13.
- `tools/test-arena-ui.mjs`: 6/6.
- `tools/test-scene-systems.mjs`: 16 lifecycle/clock/disposal checks.
- `tools/test-crash-slide.mjs`: 4/4 ordinary and Mad Max contact checks.
- `tools/test-replays.mjs`: **162 retained fingerprint checks**, unchanged.

An in-memory diagnostic also rechecks the unchanged private Salt constructor
using this actual candidate GLB: **11 checks pass on its 17 native meshes**.
It covers disabled loading, real native attachment/shared geometry, supplied
Course features and RNG preservation, exact-once disposal with enclosing
disposal, late-load retirement and wrong-ground-size rejection. It supplies
an explicitly unregistered private Course with the Salt ID, derived from
unchanged Scrapdome solely for the constructor's state/RNG contract. This
does not register physical Salt Flats, launch a game, clear the failing
registered-scene acceptance or measure art/frame/heat. Its local GLTF
texture adapter skips pixel decoding only; native geometry is loaded.
An initial incomplete one-off command stopped on an undefined diagnostic
variable; the corrected in-memory command passes. That setup error is not
counted as production RED and changed no frozen test or source.

Read-only SHA-256 controls:

- source recipe: `91a5f43df171eb2393f4faac71ddbc49e8a5bd716353020c30d78015de7f8872`
- frozen full source test: `46d27e8be782591d07ff5440ca0e20673bcc78e24060b8f9865a900d994d9774`
- unchanged fit JSON: `c6298b9cc516a31cb97d76a6da88a84c6232200626699d5e499cc553107b660b`
- unchanged catalog: `3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`
- unchanged Salt scene module: `17f3532974d57e9b49be98c8da1f8f5f95f8f58167a9ddad80b67c3f0aa676d1`
- unchanged Scrapdome controls: `db071b927146aea534ca6fb46a67655e7cb5fe864f62993e8149d22baa44513a`
- retained ordinary pins: `b55182cbc6d6121a205fa24ba9049aeefabd7943a6e12ebba5a7f868c068c77a`
- retained combat pins: `85d9457ccd27534cfd7134547690b0ea5ad430fd9f374a63a1015c0b4b781536`
- retained Hidden Road ordinary pins: `e7ac791e2889fb44fef7fe825820a80b6ea56770f1d73bb096d381b3a1a88b50`
- retained world-composition assertions: `03c46238e3a56ae9179cf3962bca56edf3d3a4778ffe93b962d6c36aafe35238`

The full frozen suite additionally verifies every tracked runtime asset,
its old protected assertion files and every catalog-pinned licensed source
against hashes captured before this run. All preservation controls pass.
The selection fix changes no input bytes or native model counts. The
approved plain Bus source remains `b6603f556b73b0e9f4aa92d02f11d2a197fc8d55139c960788f0db36a679bbd8`.
Changed assertions and regenerated fingerprints: **none**.

## Remaining ownership and review

The nine unchanged runtime failures are the separate dev flag, physical
venue registration, rank-eight and dev-off rejection, selected rank-nine
entry, unknown venue/mode rejection, completed Salt Flats public round and
scene through the actual registered course. The last one still stops at
`assert.ok(venue)`. Existing source/scene modules are partial WIP until
the Director grants those real hooks and they pass actual consumer checks.

White bowl/wear/readable boundaries, actual heat shimmer, matched High and
Performance game captures, <=10% frame cost, six look scores and Claude's
written comparison review remain mandatory. No art round was started by
this source repair. No private/native result is a full-card, public install,
lane/full/build, merge or release pass. The Director owns the next hook
slice, independent source review and all required whole-card gates.

## Removed for the source-binding repair

Replaced the insufficient label-only selection guard with the complete
settled model/catalog/path guard. The old independent hash, CC0, licence,
count and triangle checks remain. No model/source, texture/palette recipe,
scene/runtime hook, asset, config claim, licensed original, old assertion
or replay pin was removed or substituted. The new copied negative inputs,
private candidate and native logs are reproducible ignored scratch; the
janitor removes them after their verdict is used. Original licensed files
and current game assets remain preserved.


## Independent native physical alignment acceptance (1 October 2026)

Tests-first continuation on unchanged source commit
`2d6e5cc94ddd5c3a46316db411e20872b449f4ca`. The Director granted only
append-only tests and this note. No physical venue, source recipe, fit,
public model, renderer, flag or floor hook was changed.

The added geometry oracle reads the actual freshly generated private GLB.
It interpolates its exported world-space triangles, including triangle
edges with a small float tolerance. It copies no sine profile, Course
private helper or source-text behavior. The two-millimetre comparison
allowance covers exported float coordinates. A ramp-2 bounding-box edge
had two micrometres of export drift; the initial strict ray probe missed
that edge. The new oracle handles that measured float boundary, and all
three new native controls now pass. That test setup correction is not a
production failure or an altered frozen assertion.

Coverage added before the native physical consumer is built:

- Both actual ramp meshes: every exported station, midpoint between
  stations and centroid inside every actual triangle. Quarter-height
  acceptance comes from the mesh, not the recipe's analytic curve.
- Center, both sides, footprint edges, just outside each side and end,
  and eight-metre lateral offsets. The native flat floor remains the
  expected surface where the actual ramp has no triangles.
- Actual ground origin and near-bound coordinates, plus every actual
  Course-declared sample at center and 95% of each side's floor width.
- Every salvage-cover, plain Bus, crane, tyre wall and container wall:
  actual visible mesh/envelope alignment, matching actual Course collider
  position, extents, orientation and vertical bounds, real bucket lookup,
  swept contact at the native envelope edge and a real outside miss.

The registered checks construct the actual registry's Salt Flats Course.
They never substitute a renamed Scrapdome or an unregistered invented
venue. World coordinates pass through real nearest/worldAt/groundAt APIs;
collider checks use real obstaclesNear and sweepObstacle consumers.
The ground checks do not choose which part of the rectangular native bowl
is playable, or impose an inner Heap. That driving-domain question remains
with Claude through the Director's written question. These tests cover
native coordinate mapping and the Course's own declared floor.

The builder supplied a separate diagnostic witness before source edits:
actual ramp-1 quarter station y=1.697056293 versus generic jumpAt y=1.2,
and native width 8 m versus generic relief extending 15 m on each side.
The appended runtime tests currently stop earlier at missing registration.
They do not claim to have evaluated that height mismatch on a registered
Salt Flats Course. Their GLB station/triangle/footprint oracle will check
that obligation when the real physical consumer is registered.

### Focused execution and exact RED

`node tools/test-salt-flats.mjs --native-only`: exit 0.
Original native selection **28 passed, 0 failed**; appended geometry
selection **3 passed, 0 failed; 13 registered-Course checks excluded**.
This is partial native evidence, not whole-card acceptance.

`node tools/test-salt-flats.mjs`: exit 1.
Original selection remains **41 checks, 32 passed, 9 failed**.
Appended geometry selection is **16 checks, 3 passed, 13 failed**.
Combined execution: **57 checks, 35 passed, 22 failed**.
The original nine runtime failures remain as recorded above. Each appended
failure has the exact message:
`geometry acceptance requires the actual registered Salt Flats Course`.

| Appended failing case | Current reason |
| --- | --- |
| salt-ramp-1: registered groundAt matches all actual native ramp stations | Missing actual registration |
| salt-ramp-1: registered groundAt matches mid-segment and triangle-interpolated heights | Missing actual registration |
| salt-ramp-1: registered groundAt respects native center, sides, edges and outside footprint | Missing actual registration |
| salt-ramp-2: registered groundAt matches all actual native ramp stations | Missing actual registration |
| salt-ramp-2: registered groundAt matches mid-segment and triangle-interpolated heights | Missing actual registration |
| salt-ramp-2: registered groundAt respects native center, sides, edges and outside footprint | Missing actual registration |
| registered Course mapping preserves the actual native ground origin and footprint coordinates | Missing actual registration |
| registered Course declared floor samples stay inside the real native ground envelope | Missing actual registration |
| salvage-cover: native visible collision envelopes reach actual Course buckets and swept contacts | Missing actual registration |
| bus: native visible collision envelopes reach actual Course buckets and swept contacts | Missing actual registration |
| crane: native visible collision envelopes reach actual Course buckets and swept contacts | Missing actual registration |
| tyre-wall: native visible collision envelopes reach actual Course buckets and swept contacts | Missing actual registration |
| container-wall: native visible collision envelopes reach actual Course buckets and swept contacts | Missing actual registration |

### Frozen controls and handoff

The Director approved a second appended runner to preserve the original
runner and every frozen byte. Default execution runs both selections;
either runner's RED leaves exit code 1. Native-only explicitly reports the
13 excluded registered checks and cannot grant the physical card a pass.

The original test's **34,473 bytes** compare byte-exact to the clean source
commit, SHA-256
`46d27e8be782591d07ff5440ca0e20673bcc78e24060b8f9865a900d994d9774`.
The original note's **29,367 bytes** are preserved before this append.
All original public-asset, licensed-input, old assertion and replay-pin
preservation controls pass. No replay fingerprint was regenerated; the
retained native/Scrapdome controls still run unchanged. The tests do not
modify production behavior and need no new behavior fingerprint.

Only the owned test and note change. No build, lane/full tier, browser,
art/frame capture, merge or release pass is claimed by this RED freeze.
No Preview, live folder, port 5174 or real save was used. The Director
receives ownership of these files for source construction and review.

### Removed for this tests-first continuation

None. No source, asset, licensed input, existing check, assertion, fixture
or replay pin was replaced. Temporary private native exports and copied
negative-source fixtures remain reproducible ignored .qa-dist scratch for
the Director's janitor once their verdict is used.

## Registered native Course geometry slice — 1 October 2026

This partial source slice executes and passes all **16 native geometry checks**,
including all **13 formerly missing registered-Course cases**. All **31 native
source/geometry controls** pass. The default suite remains RED on **six held
runtime hooks**. Visible inner/outer boundary correspondence is still incomplete;
this is a source freeze for independent acceptance, not a finished venue.

The Director granted only the existing venue module, venue registry, Course,
recipe and this append-only note. Work began at the tests-first freeze
`3dbecc33e9487efe536c3a7d63958afae33df549`, preserving source guard
`2d6e5cc94ddd5c3a46316db411e20872b449f4ca`. A normal merge of current integration
produced `8d34b1fa5abab0a271f0879d8656a08e9e558d23` before source edits. Fuel,
steering, Claude's settled oval-band direction and the current source picks
remain preserved. No test, input setting or replay fingerprint changed.

### Exact RED and resulting physical source

After the Fuel merge, the unchanged default command
`node tools/test-salt-flats.mjs` reproduced:

- Original selection: **42 checks, 33 passed, 9 failed**.
- Appended geometry: **16 checks, 3 passed, 13 failed**. Every failure required
  the actual registered Salt Flats Course.
- Combined: **58 checks, 36 passed, 22 failed**, exit 1. Fuel adds its complete
  round case while its merged unknown-mode rejection now passes. This explains
  the one-check change from the pre-merge 57-check freeze; no test was edited.

The registered venue uses the existing ring engine and a centered 640 m oval
inside the unchanged 300 by 200 m native bowl. Centerline sample bounds are
X +/-124.34283226679858 m and Z +/-76.51866601033758 m, with the existing
18 m floor half-width. Native declared-floor samples at the center and 95%
of both sides stay on actual ground triangles. Curvature ratio is
0.4383909713295506, below 1. All eight native spawn slots are off ramps, clear
of one another and deterministic.

The new Salt-specific nearest-frame solve inverts the same sampled Course
frame for native and scenery coordinates. It does not return a cached fixture,
rename another venue or teleport a requested point. The coordinate diagnostic
at native ground bounds, all solid centers and ramp vertices measures maximum
nearest/world error 2.3327151445628006e-10 m. Existing ordinary Course mapping
and all frozen Scrapdome geometry/driving fingerprints remain unchanged.

Both ramps move to the actual oval ends at X +/-124.34283226679858 m, Z about
zero. The Course owns their 26 m length, 8 m width, 2.4 m height, 17 squared-sine
sample stations over 16 segments, vertices and triangles. Blender reads this actual headless
Course through installed Node and exports those vertices. The old independent
sine recipe and generic 30 m-wide relief are removed from the Salt path.
Actual exported meshes both measure [8, 2.4000000953674316, 26] m. At the native
quarter station Z -6.5 m, both meshes are Y 1.2000000476837158 m; Course heights
are 1.1999999999999993 and 1.1999999999996902 m. Eight-metre side probes are Y 0.
All station, midpoint, triangle-centroid, side, edge and outside-footprint
checks pass at the frozen 0.002 m tolerance.

The Salt surface currently interpolates its own 17 squared-sine station
heights linearly. That is an explicitly unreviewed polygonal approximation of
the continuous arena curve between stations; existing Scrapdome/Titan analytic
ramps are unchanged. Independent source review must settle this approximation
before a final venue pass. Increasing mesh sampling from an unchanged analytic
physical rule remains a possible follow-up; no claim is made that a test
against the native mesh settles that game-rule question.

Fourteen actual solid envelopes are authored in the owned venue registry:
four container boundaries, two tyre sections, six genuine salvage piles, the
plain Bus and the crane/magnet assembly. The Bus and crane now sit in the
central area. The recipe fits their genuine assembled source faces to those
Course envelopes and updates each full affine lineage matrix honestly. The
exported manifest still measures actual visible vertices with its 0.002 m
margin; no runtime manifest, proxy source or new network request drives physics.
Every visible solid reaches real Course collision buckets and swept contacts,
with correct position, extents, orientation, vertical bounds and outside misses.

The first fit passed 15/16 geometry cases; the Bus alone exposed an ambiguous
interior nearest-frame projection. An inner world solid can be equally near
opposite sides of a ring. Salt off-band solids therefore reach every small
venue bucket, with actual world sweeps filtering their tight native envelopes.
This fixes real broad-phase coverage without adding an obstacle. The venue has
only fourteen solids; frame cost remains unmeasured.

### Exact final checks and native artifact

The final unchanged default command reports:

- Original selection: **42 checks, 36 passed, 6 failed**.
- Appended geometry: **16 checks, 16 passed, 0 failed**, with **zero registered
  cases excluded**.
- Combined: **58 checks, 52 passed, 6 failed**, exit 1.

All 28 original source/native controls and three appended native oracle controls
pass, including exact nine picked model/catalog/path bindings; empty, changed
licence, changed model, genuine unpicked SchoolBus and relabelled sedan
rejections before export; four-pack original triangle lineage; unchanged photo
pixels and mirrored UV sampler; palette replacement; tight visible envelopes;
real repeat geometry and source transforms; and preservation of licensed inputs,
current public art and retained tests/replay pins. Registry/spawn checks, actual
native scene consumption and a complete seeded Last Car Rolling round now pass
through the real existing consumers. Those passes do not grant App launch or
whole runtime acceptance.

The six held failures remain: missing Salt dev flag; rank-eight rejection;
dev-off rejection; rank-nine App selection reaching Salt; unknown-venue App
rejection; and complete Fuel Run on Salt. No new public mode, stub, flag, App,
event, UI, renderer or audio wiring was added.

Unchanged regression commands all exit 0:

- Course nearest: 127296 checks; all existing samples/features/colliders exact.
- Polyline index: 95656 checks.
- Road surface: 495518 checks.
- Arena event: 13/13; salvage props: 29; ramp sides: 42; steering: 215.
- Scene systems: 16 lifecycle/clock/disposal controls.
- Ordinary replay fingerprints: **162 retained checks**, unchanged.
- `npm run build`: pass in 449 ms, with the existing large-chunk warning.

Private current artifact: **102764 triangles, 17 draws, 16 features, two ramps**.
GLB: **12821472 bytes**, SHA-256
`07d4e706af9ba14d2329247997346501b438e43cfbe27eac763db89899c0336f`.
Manifest: **474178 bytes**. These are actual native counts, not a frame gate;
the model remains above the advisory 8 MB single-file target.

Current source SHA-256 pins:

- Venue registry: `c7cd3906fc8502a5dda2b6a93aa8e5eb85090db34280a7204334badeaf68d2f8`.
- Course: `b624aff7bc9c0ee397a3a7af07ccfb30c6cccdd2291ff5a5a105acf1bb407497`.
- Native scene header: `0970a895ad885d4b3122aa721550a371fccd7748da7b4566abbe768f0c8f8f75`.
- Recipe: `2fb751bd89cdc070ec2fec9ba4ccc7f1f9395fdcc7f7c18caa50b96b1e07674d`.
- Unchanged full frozen test: `d56517bed257b7150c2030a77fa053c69ad8b874bb67095fe863f27cc49ea824`.
- Unchanged fit: `c6298b9cc516a31cb97d76a6da88a84c6232200626699d5e499cc553107b660b`.
- Unchanged catalog: `3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`.
- Unchanged Scrapdome control: `db071b927146aea534ca6fb46a67655e7cb5fe864f62993e8149d22baa44513a`.

Raw RED, first-fit and final logs, native source reports and manifests are kept
in ignored integration `.evidence/2026-10-01/ARENA-06/physical-source/`.
`native-measurements.json` measures the actual exported GLB;
`course-physical-receipt.json` records the actual authoritative Course data.
The final candidate remains only in the lane's
`.qa-dist/salt-flats-tests-BUlPcJ/candidate/`. Changed assertions: none.

### Required continuation and Removed

The frozen geometry checks do not prove that the driving domain's whole boundary
matches visible geometry. Continuous visible/solid inner-island correspondence
and the oval outer-band/native perimeter correspondence need additive independent
acceptance before another construction step. No continuous rim, perimeter
relocation or invisible filling collider was added in this partial slice.
The current right band endpoint is X 142.34283226679858 m while the native
rectangular wall's inner face is about X 145.78 m, a 3.43716773320142 m difference.
The north band edge is Z 94.51866601033758 m versus native wall inner Z about
95.78 m, a 1.26133398966242 m difference; diagonal gaps are wider. These figures
compare nominal center-line domain edges, not an independently settled car-body
wall clearance. The six small piles, crane and Bus do not yet establish a
continuous native island boundary. Neither gap is a finished-venue pass.

This hands back Source ownership for independent acceptance. Island/perimeter
continuity, held launch/flag/event hooks, art/wear/heat, actual matched game
High/Performance measurements within 10%, Claude comparison, public installation
and final exact lane/full/build gates remain required. No art round, Salt frame,
whole-card merge, integration merge, push or release is claimed. No Preview,
live folder, port 5174, real save, protected audio, new service or source pick
was touched.

Removed: Salt's missing-registry path, off-origin generic physical course,
independent sine ramp recipe and oversized generic side relief were replaced
in this source slice. The now-unused native yaw RNG was removed. No existing
Scrapdome/ordinary Course path, current art, old assertion, original licensed
source, source recipe binding or replay pin was discarded. Private candidates
and source receipts stay ignored used-once evidence for the Integrator's janitor.

## Independent native boundary acceptance, 1 October 2026

This tests-only continuation freezes the missing visible/solid boundary acceptance
before new perimeter or island source work. Source remains
`d1ed6dc75635c47acfd56a9b9d6b11794d2ea367`. New file:
`tools/test-salt-flats-art.mjs`. No previous assertion or selection was changed.

### Criterion and native evidence

Claude settled an oval drivable band inside the 300 by 200 m bowl, between a
solid tyre/container perimeter and a solid central scrap/crane/Bus island.
The Director approved the existing Scrapdome center buffer as the maximum
visible clearance: frozen `SCRAPDOME_LAYOUT.wallOffset (21)` minus frozen
`floorHalfWidth (18)`, or **3 m**, plus the unchanged **.002 m** native float
export allowance. The test reads the Scrapdome reference, never Salt candidate
tuning. This preserves an existing engine buffer; it does not require zero
center/mesh separation or change a race rule.

The recipe runs through bounded normal Blender CLI into private `.qa-dist`,
using the unchanged seed and fit input. Native GLB position/index buffers and
world matrices supply the triangles. Only headless texture decoding is replaced;
no geometry, Course, containment, collision or actor behavior is mocked.
Body-height clipping uses the genuine Falcone shell (1.02 m half width,
2.35 m half length, 1.35 m height), so a high crane jib cannot stand in for
a ground-level wall. The genuine Course supplies every one of its 80 segments
and each midpoint: **160 stations per side**, 40 in each quadrant.

Separate checks retain actual visible-envelope/export/Course correspondence,
run genuine `sweepObstacle` with all nine native playable car shells, and
prove continuous closed enclosure from native donor-instance triangle subsets.
The latter uses source-instance bounds at body height and the conservative
component-wise minimum of all genuine native projected contact shells at each
ring frame. It does not use one merged-mesh box spanning separated pieces.
Connections travel through actual overlapping contact footprints. A nonzero
winding closed walk encloses the authored origin. An explicit connected open
spiral control proves that complete angular projections cannot fake closure.
These footprints follow the existing box-contact convention; the checks do
not impose a new mesh-manifold or full-body zero-gap rule.

A genuine shorter Dusthawk control touches the actual inherited wall with
the Falcone at the same native pose but clears with the Dusthawk. Thus a
Falcone-only sweep cannot grant solidity for all playable cars. Every native
car also retains exact floor containment: the center at either 18 m edge is
allowed, outward movement is clamped to that edge, and a steep 20 mph contact
keeps the existing 4 mph result.

### Frozen RED and protected controls

`node tools/test-salt-flats-art.mjs` exits 1:
**29 checks, 16 passed, 13 failed; no cases skipped or excluded.**

The exact failure messages and per-car witnesses are in the raw log/receipt.
The thirteen failures are:

- Four inner-quadrant checks: 40 of 40 stations in each exceed the inherited
  3 m allowance. Worst distances by quadrant are **60.45687548042132**,
  **55.93165142142831**, **60.927286708663054**, and
  **61.73863218247728 m**.
- Four outer-quadrant checks: 33 of 40 stations in each exceed that allowance
  (**132/160 total**). Worst distance is **34.472143819984424 m**, at s 376.
- Inner real-car sweep coverage: no genuine contact at **157/160** stations
  for Falcone, Stuttgart, Heritage, Aurora and Dusthawk; **156/160** for
  Banshee, Viper, Titan and Jesko.
- Outer real-car sweep coverage: no genuine contact at **120/160** stations
  for Falcone, Stuttgart, Heritage, Aurora and Dusthawk; **116/160** for
  Banshee, Viper, Titan and Jesko.
- Inner enclosure: 44 native donor pieces form eight disconnected components,
  with sizes **[7,7,7,7,7,7,1,1]**, and no closed enclosing cycle.
- Real stopped-player inner witness: actual containment stops at s 636,
  lateral -18, X 106.06806361052259, Z -2.479682550806968, ground Y 0;
  nearest body-height solid is **61.73863218247728 m** away.
- Real stopped-player outer witness: actual containment stops at s 376,
  lateral 18, X -109.04748272599042, Z -61.30785495931245, ground Y 0;
  nearest body-height solid is **34.472143819984424 m** away.

The outer donor pieces do form a connected closed contact-footprint cycle.
That passing enclosure does not clear their distance from the drivable oval.
The envelope, all nine floor controls, genuine shorter-car witness, open-spiral
negative control, native repeatability and protected-byte controls pass.

The unchanged original default command also ran, without selection exclusions:
**42 checks, 36 passed, 6 failed**, plus **16/16 geometry checks passed**.
Its six existing held failures remain Salt dev flag, rank-eight rejection,
dev-off rejection, rank-nine App selection, unknown-venue App rejection and
Fuel Run completion. All **162 ordinary replay fingerprint checks pass**.
This continuation does not claim a lane/full/build, art, frame, browser,
whole-card, merge or release pass.

The freshly generated GLB remains exactly **12,821,472 bytes**, SHA-256
`07d4e706af9ba14d2329247997346501b438e43cfbe27eac763db89899c0336f`.
The original test is exactly **48,683 bytes**, SHA-256
`d56517bed257b7150c2030a77fa053c69ad8b874bb67095fe863f27cc49ea824`.
All **1,184** previously tracked files outside the owned change note/test
were hash-checked before and after, including source, fit, catalog, flags,
settings, public assets, protected audio and replay pins. The prior note
prefix remains exactly **46,155 bytes**, SHA-256
`dfa5fd4ab918bccf3bfc4ede46b2a649e083c8bd688f1898291ac70726e2f7cb`.

Full raw build output, new RED, original default output, replay output,
manifest, native boundary measurements and protected-file hashes live in
ignored integration `.evidence/2026-10-01/ARENA-06/boundary-tests/`.
Current generated candidates stay private and regenerable. Source authors
can now fit a genuine visible perimeter/rim to this acceptance, without
changing the floor rule. Held runtime/art/frame hooks remain separate.

### Changed assertions and Removed

Changed assertions: none in any existing suite. A first new envelope control
combined two independent float comparisons too tightly; it was corrected
before freezing to the existing separate export-envelope and Course-envelope
precision assertions. No source change made a check pass.

Removed: none. This adds acceptance and a change-note section only. No old
test, source model, native recipe binding, licensed input, public asset,
source path or replay pin was replaced. Private evidence is retained for
the Director's review and used-once janitor cleanup. No live folder,
Preview, port 5174, real save or new service was used.


## Native oval boundary Source freeze, 1 October 2026

The independently frozen boundary RED is now GREEN in this private Source
slice. No frozen test, source pick, fit input, palette/photo binding, floor
rule, ramp station, settings value, current Scrapdome path or replay pin changed.
Work resumed from clean acceptance commit
`d5b77fe28b71ae461393a399e0f4a6105fa61ef6`. Only `src/arena/venues.js`,
`src/course.js`, `tools/blender/salt-flats.py` and this append-only note changed.
The prior 53,005-byte note prefix remains SHA-256
`ca5b7cc11e805b97ece5e0d464bea05761204ed09608f02c215cf5353aa057cf`.

### Actual physical construction and affine lineage

The authored physical geometry now follows the actual centered Course oval.
There are 64 local outer sections: 62 genuine two-high container stacks and
two three-high tyre sections. Each container retains its 2.44 by 2.60 by
12.15 m fitted dimensions, with lower/upper centers at Y 1.30/3.90 m.
Each tyre section retains 30 genuine tyres in ten columns and three levels;
each tyre is .46 by 1.18 by 1.18 m, with levels .59/1.71/2.83 m.

There are 96 grounded original sedan-body wreck sections around the inner
island, at the already used 2.30 by .92 by 5.25 m wreck-body proportions.
Their complete selected body faces are retained. Their centers are Y .46 m,
so their lowest native geometry is on the actual floor. The six existing
central salvage piles, picked plain Bus and full crane/magnet assembly remain
inside that closed boundary. No invisible filled bowl or island was added.

Section placement comes from `course.worldAt(s, offset)`: outer stations are
`index/64 * course.length`; inner stations are `index/96 * course.length`.
Container centers use the inherited outer wall offset +21 m, wreck centers
use -21 m, and the two tyre centers use +20.5 m within the same approved visible
buffer. Each source assembly rotates by the actual frame heading. For a local
width W and length L, its nominal world envelope is
`abs(cos heading)*W + abs(sin heading)*L` in X and
`abs(sin heading)*W + abs(cos heading)*L` in Z. The recipe consumes these actual
Course numbers, fits the complete native faces into each local envelope and
updates every source-to-world affine lineage matrix. Its manifest records
actual source triangle indices; counts are measured from exported triangles.
The existing .002 m export padding and axis-aligned box-contact convention
remain unchanged. No broad sector collider encloses an empty/drivable region.

There are exactly 168 tight local colliders: 64 outer sections, 96 inner
sections and eight existing central solids. Perimeter pieces now use local
64 m broadphase buckets. Actual buckets contain 37 or 38 obstacles. The eight
central solids remain available across ambiguous off-band projections; the
native Bus collision regression passes. Rendering still consumes the original
native meshes directly. No instancing, batching, culling or resource hook was
introduced in this Source slice.

Both ramps retain the exact existing authoritative 16-segment Course geometry:
8 m wide, 26 m long and 2.4 m high. Neither their profile nor the 300 by 200 m
native ground changed. The original CC0 photo pixels and approved mirrored
UVs, seeded worn material, exact nine source bindings, native face lineage,
resource lifecycle and scene ownership controls remain passing.

### Measured RED to GREEN and unchanged controls

Reproduction on unchanged source: `node tools/test-salt-flats-art.mjs` produced
29 checks, 16 passed, 13 failed, with no exclusions. After fitting, the same
exact command produces **29/29 passed**, with no changed assertion or precision.
All 160 native frame/midpoint stations per side have body-height visible solids.
Inner unbacked samples fall from 160 to zero; outer samples from 132 to zero.
Maximum inner distance falls from 61.73863218247728 to **1.9838192110987063 m**;
maximum outer distance from 34.472143819984424 to **2.271364305221265 m**.
Both remain below the unchanged inherited 3 m plus .002 m limit.

Every one of the nine genuine car shells now contacts a real native-backed
Course obstacle at all 160 inner and all 160 outer sweep stations. Both native
donor contact-footprint graphs now have a closed enclosing cycle. The genuine
shorter-Dusthawk witness, connected-open-spiral negative control, all nine exact
floor/body rules, stopped-player witnesses, repeatability and tight native
export/Course envelope correspondence all pass. This proves the frozen existing
box-contact and visible-boundary criteria; it does not claim a manifold mesh,
zero car-center clearance or a new containment rule.

The unchanged `node tools/test-salt-flats.mjs` still gives **42 checks,
36 passed, 6 held runtime failures**, plus **16/16 geometry checks passed**:
58 total, 52 passed, 6 held. All 31 source/native controls pass and all 16
registered/mesh geometry controls pass. None were excluded. The six held hooks
are the dev switch, rank-eight rejection, dev-off rejection, rank-nine public
App selection, unknown-venue rejection and complete Fuel Run Salt consumer.
A native-only selection is not used to claim the whole geometry/runtime card.

Required unchanged regression commands pass:

- `test-course-nearest.mjs`: 127,296 checks across the existing 16 courses.
- `test-polyline-index.mjs`: 95,656 checks.
- `test-road-surface.mjs`: 495,518 checks.
- `test-arena-event.mjs`: 13/13; `test-arena-props.mjs`: 29;
  `test-arena-ramp-side.mjs`: 42; `test-arena-steering.mjs`: 215.
- `test-scene-systems.mjs`: 16 lifecycle controls.
- `test-replays.mjs`: all 162 fingerprints exact across the existing 18 cases.
- `npm run build`: passes in the private lane (390 ms Vite build), retaining
  the existing large-chunk warning.

The boundary test remains exactly 19,194 bytes, SHA-256
`fd8e46508f394a50c681a86812639cca9fc941241edb377c716500fb1d0b1166`.
The original suite remains exactly 48,683 bytes, SHA-256
`d56517bed257b7150c2030a77fa053c69ad8b874bb67095fe863f27cc49ea824`;
its first 34,473 bytes remain
`46d27e8be782591d07ff5440ca0e20673bcc78e24060b8f9865a900d994d9774`.
Frozen fit SHA-256 remains
`c6298b9cc516a31cb97d76a6da88a84c6232200626699d5e499cc553107b660b`;
catalog SHA-256 remains
`3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`.
The unchanged independent Scrapdome/control fixture and ordinary replay pins
pass. No assertions or pin files changed.

### Native cost, evidence, limits and Removed

Actual candidate: **152,180 triangles, 171 native meshes/draws, 168 colliders,
170 manifest features including two ramps**, GLB **17,480,484 bytes**, manifest
**726,947 bytes**. The candidate and repeat export have the exact same GLB hash:
`6cd41757ee903b3924ddd760f66533e1295ba96d96d863a8689361db74d35bdc`.
Compared with the preceding 102,764-triangle/17-draw private candidate, this is
49,416 more triangles and 154 more native draws. GLB growth is 4,659,012 bytes.
These are real geometry/frame costs, not an accepted frame budget. The source
is larger than the initial estimate. Recognizable stacks were retained rather
than reduced solely for counts. Any later native instancing needs independent
transform, lifecycle and culling acceptance before presentation edits.

Raw RED/GREEN/default-suite output, original-source inspection, repeat receipts,
regression logs, build output and native measurements are private ignored
integration `.evidence/2026-10-01/ARENA-06/boundary-source/`. The GREEN actual
candidate remains in this lane `.qa-dist/salt-boundary-tests-USdfdq/candidate`;
the independent unchanged suite candidate and byte-identical repeat are in
`.qa-dist/salt-flats-tests-OSk440/`. Output stays regenerable and is not committed
or installed into public/current runtime assets.

This returns Source ownership for independent review. Held public runtime hooks,
art/wear/heat, actual matched game High/Performance frames within 10%, Claude
comparison, installation and final exact lane/full/build gates remain open.
No whole-card, mode, browser, art round, Salt frame, merge, push or release pass
is claimed. No live folder, Preview, port 5174, real save, protected audio,
source pack, new service or asset download was used.

Removed: the six native rectangular-perimeter sections and their broad straight
wall envelopes were replaced by actual local oval container/tyre sections.
The empty inner-boundary path was replaced by genuine grounded wreck sections
with native-backed local collision. No original licensed geometry, selected
source binding, current asset, test, assertion, old Course/Scrapdome behavior,
photo pixel or replay pin was removed. Superseded private candidates remain
used-once review evidence for the Director's janitor after verdict capture.

## Tests-first production Salt renderer route, 1 October 2026

Test-author work starts from clean Source `0050a724944549d8ae9d5ad2d16a9217a3bc3d65`.
Only new `tools/test-salt-flats-render.mjs`, new
`tools/scenarios/salt-flats.mjs` and this appended note are owned. All Source,
old tests, replay pins, fit, catalog, settings and public assets remain unchanged.
The Director approved the optional additive API
`buildEnvironment(course, {saltFlats: {loadAsset}} = {})`, forwarding the loader
only to the Salt presenter. Existing renderer callers remain valid. The Source
implementation is still held until this acceptance freeze is reviewed.

### Meaningful native RED and lifecycle acceptance

The new suite invokes the real `buildEnvironment` with real Course/Duel data
and decodes the actual approved GLB. Only headless canvas labels and image
textures use adapters; native geometry, materials, Course, simulation, scene
registry and disposal are production. Eight cases cover actual world routing,
complete native geometry, successful exact-once cleanup, late arrival after
world retirement, load rejection, invalid native ground rejection, untouched
Duel/Course/RNG, and ordinary Scrapdome/road controls. They are not source-string
or import-presence tests. The fixed candidate is SHA-256
`6cd41757ee903b3924ddd760f66533e1295ba96d96d863a8689361db74d35bdc`.

Executed command, before any Source hook:
`SALT_FLATS_RENDER_ASSET=<lane-private-GLB> node tools/test-salt-flats-render.mjs`.
Eight checks run: six fail at the real missing-world-route assertion; two
ordinary Scrapdome/pacific-canyon environment controls pass. The first draft
had two test-adapter errors (wrong RNG method and missing canvas image-data
method); these were corrected to the actual APIs before this RED freeze.
No original test assertion was changed. Both raw runs are retained in
integration `.evidence/2026-10-01/ARENA-06/director-geometry-review/`, named
`renderer-native-red.log` and `renderer-native-red-corrected.log`.

Reproduce after the harness has rebuilt its scratch output by using the
preserved lane `.evidence/ARENA-06/render-candidate/venue.glb`. The earlier
`.qa-dist/salt-boundary-tests-USdfdq/candidate` is not a durable path: a QA build
clears that output. The asset is regenerable Source evidence, not public output.

### Actual game-renderer browser RED

Executed `node tools/browser-harness.mjs scenario salt-flats --output-dir
.evidence/2026-10-01/ARENA-06/renderer-red-final` with no timing opt-in.
The standard harness builds/serves actual App/game renderer on private port
46060 with throwaway Chrome and memory-only storage. Low-level
`Duel.startArenaEvent` selects the actual registered venue; it does not claim
held rank, switch or public App/menu selection hooks. Seed 1989, Falcone,
Dusthawk, quality, fractional station/offset and relative camera formulas match
between the current production Scrapdome baseline and Salt. Racing captures
use the unchanged Duel input and sixty native fixed steps. No App method,
renderer method, state return, source module or game clock is replaced.

After the real harness build, the recipe verifies the exact private GLB hash
and copies its unchanged bytes only to the checked lane
`.qa-dist/assets/models/wasteland/salt-flats/venue.glb`. The actual loader's URL
can then decode it naturally once the missing Source route exists. No file is
installed in public, Preview or the live folder. Its provenance is serialized
in `salt-flats-browser.json`. The original first browser failure is retained;
its first Scrapdome QA panel reopened asynchronously. The final capture helper
collapses only the private QA details after loading, without changing game UI.

Final browser RED is exactly `actual game renderer is missing native Salt world
route`. The serialized actual renderer witness has no Salt group, no native
ground, neither native ramp, zero native meshes/triangles. There are no reported
console errors, warnings or failed-request issues. All six final High screenshots
were inspected individually under lane
`.evidence/2026-10-01/ARENA-06/renderer-red-final/`:

- `high-scrapdome-near.png`: real loaded cars and body/front gear on existing dirt.
- `high-scrapdome-racing.png`: actual chase camera, player/CPU and original stands.
- `high-scrapdome-full.png`: complete original stadium; inherited HUD covers parts.
- `high-salt-flats-near.png`: real cars but generic dirt instead of native salt art.
- `high-salt-flats-racing.png`: generic stadium remains; Salt ground/cover/rim absent.
- `high-salt-flats-full.png`: generic oval/stands instead of the approved native bowl.

All use 1280x800 laptop capture; the private panel is collapsed in the final
six. Race-start text and existing HUD labels overlap views. These are not native
Salt visual passes. No new floating-part or missing-car-texture fault is proved.
Performance execution stops behind the meaningful High route failure; no
Performance visual or whole-card result is claimed. Full launcher stdout/stderr
is preserved before filtering under integration director-geometry-review as
`renderer-browser-red.log` and `renderer-browser-red-final.log`.

### Pending frame/art/public limits and Removed

The committed recipe includes both actual quality settings and near/racing/full
pairs. Native Salt presence/readiness, actual ground/two ramps, all 171 meshes
and 152,180 triangles must pass. It does not fabricate geometry or warmup success.
The optional `SALT_FLATS_MEASURE_FRAMES=1` is allowed only after the Director
agrees a quiet window. It collects 180 real requestAnimationFrame intervals,
mean/P95 and actual renderer draw/triangle counts, while advancing native fixed
steps. It compares Salt P95 with the matched current Scrapdome P95 at no more
than 10% growth in each quality. Without that opt-in, even a later visual run
cannot claim a complete scenario pass. No timing samples were taken in this
RED run. Native 171-draw cost is pending, not accepted. This is a headless frame
interval check; actual laptop feel/GPU diagnosis and independent art/heat/wear
judgment are still needed. No listening or phone verdict is inferred.

The unchanged original Salt suite's six public runtime hooks remain held by
Arsenal. These tests do not cover or counterfeit them. Exact old native/road
regressions and all replay fingerprints remain necessary after Source lands.
No lane/full/build or merge clearance is claimed by this intentional RED freeze.
Syntax checks and `git diff --check` pass. No existing assertion or pin changed.

Removed: none. No current Source, model, licensed input, old test, public asset
or player save was replaced. Failed logs/captures and the private pinned asset
are retained until independent review consumes their verdict; the next harness
build removes the disposable QA asset copy. No screenshots or GLB are committed.
No live folder, Preview, `.preview-dist`, port 5174, real save, external service,
dependency addition, helper agent, release, merge, push or history rewrite was used.


## Native production world route Source freeze, 1 October 2026

The real production world now routes Salt Flats to its existing native presenter.
This Source slice resumes clean tests-first commit
`23d3208af373bcc39ca183c8cc41954916e8906b` and changes only `src/world.js` and
this append-only note. The prior 68,760-byte note prefix remains SHA-256
`6dadc371e61a66755fb96f20c34d7dd72be7f20ed34729eceb3d5f3338a885ec`.

`buildEnvironment(course, {saltFlats} = {})` accepts the Director-approved
optional native loader argument. Only the actual `salt-flats` venue forwards
it to `createSaltFlatsScene`. That native presenter is a direct child of the
returned world. Salt returns before generic arena dirt, stands and furniture
are constructed, so those shells do not cover its actual native ground/ramps.
The existing one-argument renderer call already reaches this path. Every other
venue/course continues through the original complete world-building code.
No `render3d.js`, renderer readiness/timing, presenter lifecycle, App/flag/UI,
event/game hook, geometry, recipe, source pick, fit, catalog, public asset,
setting, pin or protected audio code changed. No batching or proxy graph was
introduced.

### Exact RED to GREEN and lifecycle controls

Before Source, the independently frozen
`SALT_FLATS_RENDER_ASSET=<lane-private-GLB> node tools/test-salt-flats-render.mjs`
reproduces all eight cases: six real missing-world-route failures and two
ordinary Scrapdome/pacific-canyon passes. After the additive route, the exact
same eight tests give **8/8 passed** without an assertion change.

The real loaded world contains all **171 native meshes and 152,180 triangles**,
including the original native salt ground and both exact Course-derived ramps.
Successful world disposal releases every owned geometry/material/texture once;
repeated disposal is safe. Retirement before load completion rejects and disposes
the late native asset. Actual load failure retains the real error and no
substitute graph. Invalid real ground rejection releases its native resources
once. Presentation clocks leave actual Duel state, Course features and seeded
Course RNG exact. The two ordinary world controls never invoke the Salt loader.
These are headless image/canvas adapters around production world, scene and
native resource behavior; they do not grant a browser or frame verdict.

The unchanged default `node tools/test-salt-flats.mjs` remains **42 checks,
36 passed, 6 held runtime failures**, plus **16/16 registered/mesh geometry
checks passed**: 58 total, 52 passed, 6 held, no selection exclusions. All 31
native/source controls still pass. The held public hooks remain dev switch,
rank-eight rejection, dev-off rejection, rank-nine public selection,
unknown-venue rejection and complete Salt Fuel Run consumer.

Existing `test-world-composition.mjs` passes all 33 exact complete-scene and
immutable-feature controls across the sixteen established events.
`test-scene-systems.mjs` passes 16 lifecycle controls; `test-scene-presentation.mjs`
passes actual RenderPass/direct/composite/error-restoration/warmup/mirror/adaptive
presentation controls. `test-replays.mjs` passes all **162 unchanged fingerprints**.
Private `npm run build` passes (400 ms Vite build) with its existing large-chunk
warning. No unchanged assertion, source binding or replay pin was regenerated.

### Protected bytes, evidence and limits

The eight-case renderer test is exactly 8,405 bytes, SHA-256
`224c731f0e7b174fb50b6968b01f6cf8698474be8b6aa1d13b015dec703e99b3`.
The original Salt suite remains SHA-256
`d56517bed257b7150c2030a77fa053c69ad8b874bb67095fe863f27cc49ea824`;
the boundary suite remains
`fd8e46508f394a50c681a86812639cca9fc941241edb377c716500fb1d0b1166`.
Frozen fit/catalog and independent Scrapdome/control fixture hashes remain
`c6298b9cc516a31cb97d76a6da88a84c6232200626699d5e499cc553107b660b`,
`3902a750659da37892ac0ff6ac3431393fdfb9f35e2a4a4273117fa71eda0843`, and
`db071b927146aea534ca6fb46a67655e7cb5fe864f62993e8149d22baa44513a`.
The unmodified native presenter and renderer are respectively
`0970a895ad885d4b3122aa721550a371fccd7748da7b4566abbe768f0c8f8f75` and
`139b09c6a0088da9db1101ef1690401ac5f6e198ad60d23a840ce5f727933ac4`.
The tested world Source hash is
`6ca45835f463df8c3120a2a3dba3d13178315907e5ea7c0b5c1ef5b552f531c0`.

The pinned private GLB remains **17,480,484 bytes**, SHA-256
`6cd41757ee903b3924ddd760f66533e1295ba96d96d863a8689361db74d35bdc`.
The unchanged original suite's fresh candidate and repeat export have those
same bytes. Geometry stays **152,180 triangles, 171 draws and 168 colliders**;
171 native draws are a real pending frame cost. No instancing, heat/wear or
renderer readiness change was made. Future readiness or batching work needs
separate independent acceptance before Source edits.

Full raw eight-case RED/GREEN, unchanged default Salt output, regression and
build logs are in ignored integration
`.evidence/2026-10-01/ARENA-06/renderer-source/`. The eight-case native input
remains private lane `.evidence/ARENA-06/render-candidate/venue.glb`; fresh
candidate/repeat output is `.qa-dist/salt-flats-tests-7FFCGw/`. No GLB or other
runtime asset was installed in public. The existing browser recipe may copy
these exact bytes into checked QA scratch after its own build, as previously
reviewed, for independent actual-renderer review.

This returns clean bounded Source ownership for independent Source/browser
review. Held public mode/launch hooks, actual game browser captures, art,
High/Performance frame acceptance within 10%, Claude comparison, public
installation and final exact lane/full/build gates remain open. No whole-card,
mode, browser, art, frame, merge, push or release clearance is claimed.

Removed: Salt's generic arena-world rendering branch is replaced at venue
routing by its original native presenter. The normal world implementation
remains in use for all established courses and Scrapdome. No asset, old test,
licensed input, source recipe, public file, current world signature or replay
pin was removed. Private review evidence remains used-once and regenerable
for the Director's janitor after the verdict. No Preview/live folder, port
5174, real save, protected audio, dependency, service or download was used.
