# ARENA-06: Salt Flats — private native source stage

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
