# WILD-ART-SRC

Source the animals for every course: real, local species, gritty and
natural, never cartoon. Owner: Codex (ART); Claude judges each round. No
game code. Design: Kyle's storyboard (14 October 2026), the "Animals by
course" table, copied here.

| Group | Animals |
| --- | --- |
| North woods (Tremblant) | White-tailed deer, moose, black bear, beaver, eastern wolf |
| Western mountains (Summit, High Country, Ridge Rally, Timberline, Cloudbreak) | Mule deer, elk, black bear, coyote, cougar, yellow-bellied marmot, bighorn sheep, raven |
| Australia (Panorama Ridge) | Eastern grey kangaroo, sulphur-crested cockatoo, kookaburra, echidna |
| Europe (Ardennes, Eifel, Alps, Riviera) | Roe deer, red deer, wild boar, red fox, wildcat, black stork, chamois, ibex, alpine marmot, golden eagle, gull |
| Desert and coast (Pacific Canyon, Red Mesa) | Roadrunner, coyote, jackrabbit, sea lion, pelican, desert bighorn, collared lizard, condor |
| Asia and cities (Harbour Lights, city courses) | Black kite, egret, black-faced spoonbill, pigeon, raccoon, cat, owl |

## How

- Order: North woods first (the wildlife count starts at Tremblant), then
  Western mountains, then the rest.
- CC0 first (Quaternius and Kenney animal packs, Poly Pizza CC0), then CC-BY
  with credit (SPEC 0.11). An idle and a walk or run each where the pack has
  them; birds need a flight loop. At most 5,000 triangles per animal (birds
  2,000), textures at most 1K.
- Candidates in `C:/Users/kyleb/dev/art-library/wild-*`; only picked
  runtime models go to `public/assets/wildlife/`. Credits on the credits
  page.
- At most three rounds per group (SPEC 0.11): one comparison sheet per
  round (JPG, at most 500 KB) under `docs/board/looks/wildlife/`, judged by
  Claude. Evidence deleted after each verdict.

## Done

Picked models in `public/assets/wildlife/`, credits added, round notes
committed. Placing animals on courses is WILD-PLACE and WILD-VIEW (Claude),
designed in `docs/HELI_WILDLIFE.md` section 3.

## Claude answers - North woods source choice

Read-only preflight: Workspace Catalog is fresh; no local wild-* candidate folder exists in the verified art library. No downloads, lane, model change, art round or acceptance yet. Primary source leads are [Nioma moose](https://sketchfab.com/3d-models/low-poly-moose-ad0d58f8668f43d5b362d529371a7f6d), CC-BY/844 triangles/walk; [UC Davis black bear](https://sketchfab.com/3d-models/american-black-bear-7c304db470dc4b9f801acf587962f1e5), CC-BY/3000 triangles, animation unknown; [Poly beaver](https://poly.pizza/m/fwtA7VLrXPr), CC-BY, actual budget/animation unknown. Archive and1K texture/rig verification remain pending; some live source pages refuse automated fetches.

[Quaternius animated animals](https://quaternius.com/packs/ultimateanimatedanimals.html) is CC0 with animated deer/wolf, but their creator does not identify white-tailed deer or eastern wolf. The verified exact whitetail alternative isabout39400 triangles and unrigged, outside this card. Claude: may the generic CC0 deer/wolf be adapted visibly to the named local species for your actual round1 judgment, or must we continue finding species-labelled donors? Natural gritty appearance and all budgets/clips remain required; no silent relabel, cartoon placeholder or new account is proposed. Art/source choice stays yours under rule16; other priority cards continue.

## Claude answers - North woods donors, 14 October evening

Yes, adapt the CC0 Quaternius deer and wolf to white-tailed deer and eastern
wolf, credited as adapted from Quaternius (CC0), with these conditions:
proportions nudged to the real species (deer: white tail underside and
throat patch, slimmer legs; wolf: grizzled grey-brown coat, longer legs), and
textured with natural fur colour and shading, never flat cartoon colours.
Kyle wants gritty, not toy-like; Claude judges that strictly in round 1, and a
toy-looking result sends that animal back to a species-labelled donor. The
Nioma moose and UC Davis black bear (both CC BY) are the picks for those two;
the beaver from Poly Pizza if its budget fits. No new accounts.

## North woods source-only lane during the release hold

Claude's exact donor/species answer above is settled. The new wild-art-src lane owns tools/blender/wildlife-north-woods.py, tools/art/wildlife-north-woods.json and its own change note; candidates stay in the card's existing art-library/wild-* source cache. Only documented public downloads without an account are allowed. Keep original licensed archives/credits as one current copy, verify actual creator/licence and bytes; report inaccessible donors without extraction tricks or substitute species. The approved Quaternius adaptation must preserve its actual rig/clips and receive the named natural markings/proportions, not a flat recolour labelled finished.

Prepare the existing-style reproducible five-model recipe and manifest only after source access is proved. Runtime destinations, after actual art acceptance, are the five named animals under public/assets/wildlife; no game, placement, save, switch, registry or CREDITS edits yet. The later existing all-Blender generator registration will be named before code when this recipe exists; no new test harness. Source preparation/download inspection only: no Blender/import/export/render, game browser, gate, build, frame, art sheet or round starts until Root GO after RELEASE DONE and a fresh slot check. North woods has its own three-round cap; no art verdict is inferred from donor approval. Spend at most30minutes on any inaccessible source problem, then record it and continue available sources. Root owns shared metadata, scheduling and merges; other lanes' files stay intact.

## Claude answers - accessible approved originals needed

Source-only lane is frozen clean at4800654b. The original Poly by Google CC-BY3.0 beaver was publicly downloaded:41468bytes, SHA25637e595b4916758e1c03ef816e4fa4f334e797fa90f095ccdd34832a522d097f1. Direct GLB accessor and PNG-header inspection proves568triangles, one32x32texture and no skins/clips; no model import or art acceptance is claimed.

The official Quaternius public Deer and Wolf downloads returned quota-exceeded HTML, not model bytes. Approved Nioma moose and UC Davis bear pages are accessible, but their documented archive download requires an account. No new account, credential request, quota bypass or alternate donor was attempted. Publisher metadata, not downloaded-model measurements, lists moose1664triangles/one animation/1Ktexture and bear3028triangles/one animation/three2Ktextures; the bear will need actual texture reduction after source access.

Claude: please provide accessible original archives or a documented public download route for these four approved donors, or choose accessible replacements within the existing species, licence and natural-look rules. This is a source/art decision, so waiting_on stays claude. Exact provenance and the one licensed original are retained in art-library/wild-north-woods. No placeholder recipe, runtime model, export, render, art round, gate or build was created; the source packet is unmerged and the release hold remains in force.

## Claude answers - download routes, 14 October night

- **Quaternius deer and wolf:** the "quota exceeded" page is a daily download
  limit on their file host; retry once after 22:00 PT on 15 October. Do not
  look for a mirror.
- **Moose and bear:** keep them. Their download needs an account, which only
  Kyle creates; Claude asks Kyle to download both, together with the R22
  helicopter for HELI-ART-SRC, into `C:/Users/kyleb/dev/art-library/` in one
  sitting. Until then they wait.
- **Beaver:** go ahead with the downloaded Poly original (CC BY 3.0, credit
  it). 568 triangles is fine; its 32x32 texture is too small for a natural
  look, so paint a new 512 texture from its colours (brown fur, darker tail).
- Move to other cards while these wait; this card stays open.


## Beaver-only source lease after the answered donor hold

Claude's accepted downloaded beaver can proceed while the other four originals wait. Root read-only inspection verifies original41468B/SHA25637e595b4916758e1c03ef816e4fa4f334e797fa90f095ccdd34832a522d097f1,568triangles,1122vertices,one Geo_Beaver mesh/material,embedded32x32 four-colour atlas and no skins/clips. It is Poly by Google, CC-BY3.0, https://poly.pizza/m/fwtA7VLrXPr; keep its licensed original and provenance exact.

Existing wild-art-src lane alone may now prepare tools/blender/wildlife-north-woods.py, tools/art/wildlife-north-woods.json and docs/changes/WILD-ART-SRC.md for this ONE accessible beaver, superseding the earlier all-five recipe prerequisite. No geometry, UV, rig, clip or other animal is invented. Preserve original indices/normals/UV/material roles and sampler; replace only the colour atlas with deterministic512x512 brown-fur/darker-tail texture adaptation retaining four tiles and edge padding, darker underside/limbs and facial marks. Actual original UV groups reuse faces; no unique asymmetric fur is promised. Semantic tail/body readings need the real imported model view before export acceptance.

Prepare source/parameters and own change note only, with actual original/hash/licence, declared adaptation and four blocked donors. Use the existing Blender recipe conventions and original CLI paths-only contract, no new harness or broad batch pretending five assets exist. Original cache remains readonly. No generated texture, Blender/import/export/render/browser, runtime asset or CREDITS edit yet; Root reviews source and names concrete axes/fit/ground/render and existing generator-roster/test leases before any execution. The North-woods group has three actual art rounds total; no review is consumed by this source preparation. Deer/wolf retry ONLY after15October22:00PT; moose/bear remain Kyle's official originals. No account, mirror, substitute or placeholder. Root remains sole metadata owner/merger/heavy scheduler.

## Beaver source frozen; no execution

Normal lane sync3538c27b then clean602a7cb180aaea288111e88e69bdc436c0c77a81 freezes three owned files. Root source CLEAR: one private unfitted beaver, deterministic512 four-tile adaptation; complete original568tri/1122verts/UV/normals/indices/material/sampler/nodes retained by embedded-image replacement. Licensed original/provenance exact; four donors blocked. Axes/semantic masks/metric fit/grounding/natural look remain unproved. No actual paint/planner/test/Blender/native/art/gate/build/runtime installation. Named existing roster/test and view/fit scope still needed before execution; no account, bypass or partial-group art acceptance.

## Beaver planner-test lease, existing suite only

Source602a7cb1 is independently CLEAR, original unchanged. Add ONLY the recipe registration and additive beaver CLI cases inside existing tools/test-blender-output.mjs plus own note. Register the private recipe with its actual native suite(the same existing file), exercise actual --paths-only on the existing TWO empty roots with existing stdlib-only kitPlanAudit(no donor/config reads,Blender imports or writes), exact private unfittedGLB/PNG/manifest paths. Check actual invalid model/public/traversal/sibling/linked-escape refusal before inputs/writes. Reuse existing audit/fixtures; do not add a harness, fit-config facade, mutate old tanker/kit assertions or weaken their no-external-atlas contract. Beaver's explicitly private PNG is its own exact contract. No generated model/paint, source read, import/Blender/view/fit/gate/build yet. Freeze and Root review before one focused existing suite. Root remains scheduler; four blocked donors and group art cap unchanged.

## Planner confirmed; one private beaver texture generation

Root independently reviewed clean3defc56866ec1a4b3c867b661619cada2d0b23c9: additions only in existing suite, old tanker/kit contracts exact. ONE focused existing test-blender-output completed06:50:59UTC,1/1 suite,zero failures/notRun,jobs4,5146.5681ms,source unchanged/clean; actual private/no-read/no-write CLI and rejection cases pass. No paint/model was generated by that check.

Claude already approved this accessible Poly beaver's512 brown-fur/darker-tail adaptation. Root now admits ONE selected beaver private unfitted generation with the unchanged reviewed recipe, Blender CPU4/no-autoexec, after fresh holds/capacity. Output ONLY new absent .qa-dist/wild-beaver-3defc568/{beaver-source-unfitted.glb,beaver-colour.png,manifest.json}; original cache readonly/exact41468B/SHA, no runtime/CREDITS write, Blender model import/re-export/rig/metric fit/LOD/other donor/image sheet/review. Validate actual512PNG/quadrant roles and complete original geometry prefix/accessors/indices/UV/normals/material/sampler/nodes/zero clips preserved, recording actual hashes/bytes. This is a real source adaptation check, not art/natural-look/fit/grounding acceptance. Four donors remain blocked; group three-round cap untouched. No further run/export/view/gate/build from this lease.


## Actual private beaver structural proof; next read-only source inspection

ONE actual CPU4 generation on clean3defc568 finished06:52:36UTC,exit0/1166.4748ms. Independent read-only verification confirms licensed original41468B/hash37e595b4916758e1c03ef816e4fa4f334e797fa90f095ccdd34832a522d097f1 exact; original39312-byte geometry prefix exact; all donorJSON except image/buffer lengths exact; embeddedPNG equals externalPNG. Actual candidate151888B/hash834d024ab14cc4ec14e7402f28b3ec06df311748c8dd380bf26e306ad0e1705b; PNG110530B/hashd5cbdc7f194a1db71679ee3099a2b9472b851aed095bdccb2d1d343e7fd7098d,512RGBA/opaque/16px padding/four planned tile roles. Actual568tri/1122vertices/no skins or clips. Manifest/note freeze f066a8d6 records real receipts; recipe/tests unchanged. This is structural proof only: unfitted,artAcceptedfalse,runtimeInstalledfalse; anatomical masks/axes/metricfit/grounding/natural look remain unproved.

Root permits READ-ONLY actual donor JSON/BIN bounds/axes inspection plus identification of an existing CPU4 imported-GLB picture recipe to reuse for later isolated source views. No Blender/import/render/native/export/generator execution,fit,new recipe/harness,art round,gate/build,runtime/CREDITS or account starts from this inspection. Four blocked donors retain exact tomorrow22:00PT retry/Kyle-originals policy. No complete five-animal batch or picture acceptance claimed.


## Selected donor view source lease, not execution

Read-only donor decoding proves original and candidate identity node/no transforms, equal actualPOSITION bounds min[-18.6143913269,-19.8521823883,-55.8140487671],max[18.6143913269,19.8521823883,55.8140487671] in UNVERIFIED donor units. Head+Z/tail-Z is only a UV-region hypothesis; tail may touch a bounds floor before feet. No metre/ground/anatomy pass is inferred.

Grant SOURCE ONLY in owned tools/blender/wildlife-north-woods.py, tools/art/wildlife-north-woods.json, existing tools/test-blender-output.mjs and own note: optional --view-only reuses existing output-dir planning and actual pinned private .qa-dist/wild-beaver-3defc568/beaver-source-unfitted.glb/hash834d024a..., never regeneration. Keep default generation/planner output exact; view paths-only remains stdlib/no reads/writes/imports and gets additive cases in SAME existing suite with unchanged old kit/tanker assertions. No new harness or shared accessory edits.

Reuse heli-accessories.py actual import/hash/CPU4/48sample rendering pattern inside OWN recipe: fresh scene, import donor unchanged, measure worldbounds, SIX source-axis orthographic views +/-X,+/-Z,+/-Y at bounds-relative cameras; neutral lighting and measured-minimum floor, floor hidden ONLY for labelled underside view. Never move/rescale/rebind donor meshes/materials, modify geometry/UVs,rig/pose,fit/export .blend/GLB or runtime. New absent private leaf only. Record actual imported matrices/bounds/camera/target/floor/image hashes and source/candidate hashes before/after in inspection manifest; explicit SOURCE INSPECTION/UNFITTED/NOT GAME/artAcceptedfalse. Anatomical role,scale and foot-tail anchor still need viewed evidence/settled fit before future fitted output. Freeze/source review BEFORE focused planner or actual Blender/render execution; no sheet/art round/native/gate/build yet. Bounded source-preparation deadline07:40UTC then note/move.


## View-only source independently clear; planner admission

Root read complete4378ebff2f8aeabc453f137c60aa324b48fcf79e vsf066a8d6: CLEAR. Only four grantedfiles; actualcandidate/originalhashpin, nonmutatingimportedobject path, source-axis mapping, measuredminimumfloor/labelledunderside, bounds-relativeorthographicCPU4, freshprivateoutput and before/afterevidence are coherent. Defaultgeneration bodies and old assertions/audit retain their original contract. No art/metric/feetground acceptance inferred.

Admit ONE existing test-blender-output on exact clean4378, jobs4, after freshactualcapacity/holds. Actualimport/render remains UNRUN and requires originalplannerPASS then RootGO; no generation/export/runtime/CREDITS/fit or formalart. Current oneforeignheavyroot is merelyobserved, notstopped or duplicated. Do not rerun earlier3defgeneration or its finishedplanner.


## View planner passed; one source-inspection packet admitted

Exact clean4378ebff existing test-blender-output completed07:10:18.3902658UTC,exit0/7991.3896ms,1/1 suite,zero failures/notRun,jobs4,source unchanged; one foreignlane38352 was observed under sharedcapacity. Receipt/result: .evidence/2026-10-15/WILD-ART-SRC/view-planner-4378ebff. Defaultplanner and new actual sixview/refusal cases pass; do notrepeat.

Root admits ONE unchanged-source CPU4/48sample --view-only inspection of existing candidate into new absent .qa-dist/wild-beaver-source-views-4378ebff, after freshholds/capacity. Six SOURCE INSPECTION/UNFITTED/NOTGAME axisPNGs and actual inspectionmanifest only; no regeneratedpaint,model fit/export/runtime/CREDITS,sheet,artverdict,gate/build/nativegame. Recordsourcebeforeafter/rendererrors; actual anatomical/foot-tail/axes conclusions wait allreal pictures, never camera labels alone. Stop after30min onfault; no duplicate/retry or transformadjustment. This is not a Northwoodsgroupartround.


## Actual source inspection and two cropped views

The original view job4541 completed at07:13:08.9353474UTC on clean4378ebff: exit0,58199.3261ms,CPU4/48samples. All six actual PNGs are960x600 and match their recorded hashes. Source files, imported matrices and material bindings remained exact. Root viewed all six. The side/front/rear images confirm head at source+Z and tail at-Z; this does not establish metres, ground contact or art acceptance.

Two real framing faults remain: top and underside clip the ends. Blender orthographic scale spans image width, so145.1 units at aspect1.6 leaves only90.7 vertical units for the111.6-unit animal. No formal art round was submitted. Do not repeat the four complete views or change donor transforms/materials.

Narrow source amendment in the SAME four owned files: correct orthographic framing with the actual render aspect, and add optional repeated --source-view choices from the existing six named views, accepted only with --view-only, rejecting duplicates/invalid names before reads. Default six-view planning and generation contracts stay intact. Extend the existing planner cases only for this exact selection/refusal contract. Prepare a fresh private two-view leaf for plus-y/minus-y; no overwrite, image edits, fit, model export, art sheet or review. Freeze and Root review before a focused planner check and ONE corrected two-view CPU4 render. Framing investigation ends07:50UTC, then note and move on. Original four complete pictures remain the evidence; old clipped pictures are not called valid.


## Two-view correction reviewed

Root reviewed cleanc55288dc1a51f627300371869ce138d30434778f against4378ebff: CLEAR. The new scale accounts for actual image/pixel aspect; only selected existing axis views run. Invalid or duplicate choices are rejected before reads, and default generation/six-view planner contracts remain unchanged. Donor transforms, materials, lights, geometry, floor and pose are unchanged.

Admit one existing test-blender-output suite on exactcleanc552,jobs4,after fresh holds/capacity. If it passes, admit only the corrected plus-y/minus-y CPU4/48sample views into fresh .qa-dist/wild-beaver-source-views-c55288dc. Keep the original four complete4378 pictures; no full-six repeat, fit, export, art review, gate or build. Preserve actual receipts and inspect both full new pictures before any completion claim. The07:50UTC framing cutoff remains.


## Two corrected source views complete; fit decision for Claude

On exactcleanc55288dc the existing planner passed1/1 at07:23:15.4024474UTC,6022.5055ms,jobs4,zero failures/notRun. Then only plus-y/minus-y rendered in job26423: exit0,16451.3943ms,CPU4/48samples,ended07:23:46.3986756UTC. Actual sources, matrices and material bindings remain unchanged. Root viewed both full960x600 pictures: no clipping. Their hashes are cbff9d01b161b48516dc4b95251b8dadb64306efed05cda0f0ac647a3b7ace0f and3314847e40dbf90499ae2595fcde5cef6fae7ec2b36f58aac6de812a18ee344d. Use these plus the four complete4378 pictures; no repeat render or model regeneration needed. The framing problem is resolved within its budget.

The beaver still has no metric fit, foot-contact or art acceptance. Claude: please settle the fit policy for this approved donor before a fitted output. Proposed adult total nose-to-tail length is1.10m by uniform scale, source+Y up/+Z head, with all licensed geometry/UVs unchanged. Its tail reaches roughly1.5donor units below the feet (about1.5cm after that scale). Should the pivot use the lowest tail with that small foot gap, or should a narrowly allowed tail/pose correction establish actual foot contact? No ground pass, deformation or alternate size is assumed. This is a numerical authoring question, not a formal Northwoods art round; four donors remain blocked and no sheet/verdict has been submitted. Root continues Ardennes while this waits.

## Claude answers - beaver fit, 15 October 00:45

Adult nose-to-tail 1.10 m by uniform scale is right. Pivot on the feet: the
feet touch the ground and the tail may sit up to 2 cm below it (it reads as
resting in grass). No tail or pose edit. Then the fitted output and the North
woods round 1 sheet when the other donors arrive.


## Approved beaver fit: source-only lease

Claude approved1.10m uniform nose-to-tail scale, feet pivot and up to2cm tail penetration into grass. No tail/pose edit. The other donors and group round1 still wait. Prepare only the existing wildlife recipe/manifest/test-blender-output/own note in the retained lane: optional --fit-only, exclusive with view-only/source-view, with unchanged default generation and pure paths-only contracts. Read the existing pinned candidate; do not repaint or regenerate its mesh/UV/material/image data. Write one fresh private fitted GLB plus measured manifest, no public/runtime/CREDITS or art sheet.

Before implementation, decode the actual indexed dark paw-region vertices from the approved donor and prove the four feet contact plane from those coordinates and viewed anatomy. Use its real foot minimum as anchor, uniformscale1.10/actual nose-to-tail extent, +Yup/+Zhead. Preserve complete candidate BIN bytes; only root node scale/translation and container JSON lengths may change. Measured transformed feet must touch0 and tail stay within[-.02,0]; fail rather than change pose or force a ground claim if the actual geometry disagrees. Keep actual source hashes/licence, no clips/rigs invented. Reuse existing GLB container serialization and existing planner cases; no new harness or dependencies.

Freeze the precise foot/transform source plan and code for review before any import/test/fit generation/export/render. No already-finished source view is repeated. Source-preparation limit30minutes, by08:20UTC; then note/move. Root remains scheduler and integration editor.


## Foot datum clarification within the approved unchanged-donor fit

Read-only source inspection measures both rear paw minima atY-18.33993911743164 and front minima at-18.159942626953125. At1.10m scale the original front soles sit1.774mm above the rear datum; tail reaches14.90mm below it. No pose or tail edit is allowed.

Use the minimum actual paw sole as the feet pivot, as Claude approved, and preserve the donor exactly. Root withdraws its additional requirement that four distinct original paw minima become mathematically coplanar: uniform scaling cannot do that without changing the approved donor. The fit check proves the lowest real paw datum is0 and tail stays within2cm; it records the untouched front-foot offset instead of calling all four feet grounded or inventing an acceptance tolerance. This is private source fitting, not game-placement or art acceptance. All other source-only scope and08:20UTC limit remain.


## Reviewed fit admitted, Codex 15 October 01:17 PT

Independent source review is CLEAR on clean625b8398: the four owned files preserve default generation, views, pure planning, old assertions and the complete candidate BIN. Only the approved root uniform scale and Y translation may change. Real minimum-paw datum anchors zero; unchanged front sole offset1.774mm and tail penetration14.902mm are recorded, not called all-four-foot grounding.

After fresh holds/capacity, admit ONE existing test-blender-output suite/jobs4. If green, ONE plain-Python fit-only execution into absent private .qa-dist/wild-beaver-fit-625b8398. No Blender import, paint, geometry regeneration, render, runtime installation, CREDITS, sheet or art verdict. Verify actual output BIN identity/root transform/measured size/paw/tail and source hashes; no repeat of the completed source views. Other four donors retain their exact blocks.


## Private fitted beaver completed, 15 October 01:14 PT

Exact clean625b8398: existing test-blender-output passed1/1,98checks,zero failures/notRun,jobs4,6781.974ms. One plain-Python fit completed08:13:36UTC,exit0,80.7743ms,source unchanged. Output in the existing lane: .qa-dist/wild-beaver-fit-625b8398/beaver-source-fitted.glb and fit-manifest.json. Fitted GLB152000B/SHA2569b2d4a0989ceb3b5f905b7df58e921bb2e951a248ac4d49279fab31a7a1d5d7b.

Separate actual-container inspection confirms the complete149844-byte candidate BIN is exact, including geometry, atlas and padding; JSON differs only by Geo_Beaver root uniform scale.009854149844873853 and translation[0,.1807245082090349,0]. Actual length1.10m, minimum rear-paw datum0, original front offset1.774mm, unchanged tail14.902mm below datum (within approved20mm). No all-four-coplanar or in-game-grounding claim. Original and unfitted candidate hashes remain exact. Receipts and independent verification are under integration .evidence/2026-10-15/WILD-ART-SRC/fit-625b8398.

This completes only the authorized private beaver fit. No runtime/CREDITS, art sheet/verdict, gate/build or merge. North woods round1 still waits for four donors: deer/wolf retry only15October22:00PT; moose/bear await Kyle's official originals. No further generation or views are needed now. Fold these actual results into the lane's own note with its next genuine source change, not a results-only lane commit.
