# P4-SNOW: winter scenery and bounded snow effects

## Design, before code

Explicit snowWorld metadata plus snow-world dev opts a scene into winter. Full visible terrain is snow; authored ranges still own exact physical surfaces.
Snow pines, ground, ledge rocks and banks reuse Kyle's approved kit GLBs.

Course construction generates real deep-snow verge bands from the same ranges. Course.gripKindAt reads patches before its existing outside-road default; ordinary courses and pre-existing road patches retain their exact answers.
Renderer reads surfaces; existing surface.snow/surface.ice cues stay exact.

Terrain coverage uses a winter weight on the drawn triangles; ponds are
explicit off-road metadata, with fixed ice shells and shoreline snow.
Every pond vertex uses requireSurface renderedGroundHeight on actual Float32
near/far triangles; a missing surface fails instead of floating analytic ice. Pines
replace ordinary Snow-scene instances and retain broken-scenery poses.
Existing packed-snow/ice road overlays gain granular/worn surface detail.
An optional landscape-detail omitFoliageAt predicate removes summer grass
throughout Snow scenes after seeded placement/color calls, preserving dry
object signatures and RNG order. Native checks reject duplicate green grass.
Camera-local flakes, ridge gusts and tyre decals have fixed limits and fewer
instances in Performance. A winter world rebuilds when an equivalent Course
object changes, so frozen banks retain the actual live surface-patch identities.
Dry worlds retain their existing same-key reuse. Tyre marks follow actual cars
on snow only, expire and never write state. All randomness uses a separate seeded makeRng.

Native High/Performance uses real assets/full field; rules/saves/readiness/disposal exact. One compressed art sheet per round goes through the card to Claude, at most three.
Whole-view recipe, before code: fresh native dry/Snow worlds retain road,
ground,8-car poses,HUD and rear view. Frozen shared6e5f2d64 main/rear sampler:
120warmup,360CPU,359delivered,>=288GPU,two opposite pairs/quality stay exact.
Claude10:30 changes acceptance to deliveredp95<=18.5ms High/Performance and real kit construction<1000ms.
Mixed dry/fullSnow CPU/GPU/delivered/combined10% results remain visible information, including failures.
Before code: read Approved track kits.userData.trackKitStats.presentation.constructionMs; reject missing/nonfinite/negative witnesses.
Policy assertions change only per the written Claude decision; no extra effects-only comparison.
No state edits, sample discard or overhead subtraction. Static effects stay active;
Policy RED: old relative acceptance; GREEN28 numeric boundaries pass. Kyle rules7–10 supersede timing: currentSnow is QA-only, no catalogwintertrack; no art/look frames underrule9.
Loader union retains Snow extras/vehicle update, trusted runtime clearance,
camera culling and scoped rear restoration; only2granted renderer conflicts.

High native acceptance also requires real floating-point reads from the scene before Bloom, bright extraction and all ten blur targets: zero NaN/Inf.
Default Bloom stays enabled. FIX-P4-KERB-NORMALS removes shared reverse kerb
triangles without changing vertices/materials; its independent regression
failed on the actual ridge zero normal first. Genuine fix merge preserves
Dossier snapshot/readiness/retry/disposal and Snow/PIT presentation hooks.
Equivalent winter snapshots must rebuild with the current Course bank identities.
Round3 final, before code: Claude holds round2 at3.5/3.5/3.5/2.5.
Full-scene snow attributes/foliage exclusion replace range-only coverage;
Physical ranges/grip/banks stay exact. Eight seeded approved8-pine clusters.
Existing alpine shader gets Snow-only lower cap height/slope thresholds;
mesh positions/normals and all ordinary shader calls stay exact. Pond gains
bounded seeded uneven snow rim anchored to actual upper triangles, and native
physical clearcoat for faint real environment reflection; no new render pass.
Before code: full-scene owner uses snowfall active=1; gusts/caps/dt/life and physics exact.

## Checks

Focused: ranges, real bank driving90 to<=45mph, winter grip, exact kit patch identities,
seeded placements without consuming course RNG, actual ground attributes,
shader composition, pine break/reset/obliterate poses including the exact
loader-prepared ground anchor, quality caps and expiry. The actual eight Snow
High/LOD GLBs pass real mesh clearance, bank containment and pose reset.
Retained dry grass matrices and tints remain exact after winter omissions;
All-omitted grass releases its texture; original surface cues remain exact.
Malformed ridge/pond tests RED/GREEN; curved ponds pass actual Float32 raycasts including
actual overlaps; missing rendered terrain is rejected. Test failed before fix.
Round3 coverage RED0 versus1 then GREEN; native coverage/foliage scope now
requires the full Snow scene, per Claude.64 actual assets/rim ray/unit normals pass.

Round2 memory-only native High/Performance passes with eight actual cars,
340/128 driven wheel marks expiring to zero after 8.5 s, and unchanged
state/profile/memory saves. Flakes use 240/72 and marks 512/128. Two ponds
pass 98 actual triangle anchors, including near/far overlap; max offset error
0.000004895 m. Live bank identities and winter pine/grass replacement pass.
Round2 functional QA has eight captures and no warnings/errors. Readiness uses
a boolean. Art inspection cameras hide UI; whole-view timing keeps it.
High ridge initially had a black region covering 58.85% of the canvas.
AO/flakes/edge smoothing were excluded. Actual HalfFloat scene input had
90 NaN components; first NaN hit a zero-normal kerb. FIX-P4-KERB-NORMALS
6d284cb0 removes only reverse faces; vertices/UV/material and owner hooks remain.
Fresh native default Bloom input, bright and all ten blur targets have zero
NaN/Inf. Ridge is fully visible. Consumed diagnostic probes are removed;
the permanent finite-target acceptance and normal regression remain.
Integration4527 synced; loaderd05 retains Snow API. Current 15276b08 genuinely merges rulesf30 and Tremblant9ed; Snow has none of the new relief/gravel/crowd opt-ins. Genuine actual Deep2e7613e5 union keeps both winter/Deep dev switches, catalog23 and both preview/beta entries; native Snow source unchanged. Before actual Harbour0cdf conflict edits: preserve winterBankPatches plus escape/basin imports; winter preparation/snow argument plus wetRoad/water/glow hooks. Snow has no new opt-ins, so earlier native applies. Checks held for actual pending release union. Before fixture edit: lane failed the exact flag count21 because approved snow-world dev makes22; root grants count22 plus required snow-world dev, with every old released/retired/isolation assertion retained. Current6c gate:386pass/3fail/0notrun; preview omitted Snow, beta exact catalog omitted Snow, snapshot fixture omitted real winter scope. Before launcher edit: root grants only PREVIEW_FLAGS append snow-world; every launcher assertion/default remains exact. Before companion fixtures: root grants beta exact catalog addSnowdev and snapshot extraction actual winter imports/renderer-equivalent wrapper; every old assertion remains exact.
Prepared extras/current bank identities/eight grounded cars pass; round2 ba685 native passes.
Snapshot RED:308 previous/0 current banks; builds2 to2; state/profile/storage exact.
Single guard GREEN both qualities:0 old/308 current,new world2 to3;12 finite targets.
Static timing fixes only its native presentation camera; poses and limits stay exact.
Round-two focused GREEN: actual assets/cluster clearance and exact dry/night palette pass.
Original lighting1078/moods2666/lightpath544 pass; round2 sheet294380bytes sent to Claude.
Round3 GREEN: outside-range lightfall RED/GREEN, dry cap shader,64 seeded pines,
actual rim overlap/road clearance/read-only identity. e6ac2080 final native8views passes. Placement-fixed cfcf4b24 native passes8views, private56398,0warnings/errors,12finiteHDRtargets,308current/0oldbanks,340/128marks expire0; actualpond image reviewed CLEAR. No frame timing. Catalog fixture GREEN78 checks.
Claude13:40 accepts final cap2.5/4/3/3.5 subject to everypine6moutsidepond; all remaining look toClaude, no fourth round.
Before placement code: new106pine acceptance uses original1989native fixture and actual seededFloat32 outer polygons, with signed inside/near/outside and invalid-math controls; Claude14:15 approves onlypond2 s600→650 and firstpositivecluster s180→205; everypine>=6.4m, all else exact. Original RED12violations (2physical/10authored), min-8.254607m. GREEN106pines min6.446767m,0violations; physicalfeatures/RNG exact.

## Removed

Snow-scene ordinary pine, rock and summer-grass instances are removed from the copied presentation views. Snow switches replace the flat winter road
material path. Shared ordinary scenery remains in use on dry ranges/tracks.
Consumed probes/shared reverse kerbs are removed in FIX-P4-KERB-NORMALS.
Main-only hidden-mirror timing recipe is replaced by fresh whole-view controls. Mixed relative10% acceptance is replaced by Claude10:30 absolute policy; every original diagnostic stays.
Replaced only the overlapping positive cluster centre and second pond centre; physical tree placements retained. Removed obsolete preview/catalog omissions and incomplete extracted-call scope; original acceptance guards retained.
