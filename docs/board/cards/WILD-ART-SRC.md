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
