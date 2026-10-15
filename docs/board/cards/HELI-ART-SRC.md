# HELI-ART-SRC

Source Kestrel One: a light two-seat helicopter, its cable and hook, a helipad and a fuel pump.

Owner: Codex (ART); Claude judges each round. Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

## What to source

- A generic light two-seat helicopter (no brand marks), gritty and real,
  never toy-like: main rotor, tail rotor and skids as separate nodes so they
  can spin; a simple cockpit with an instrument panel area. At most 20,000
  triangles, textures at most 2K. Paint: Kestrel One, new and clean (dirt
  comes later, H3).
- A cable with a cargo hook, a helipad with a painted H, and a fuel pump
  or small fuel truck.
- CC0 first, then CC-BY with credit (SPEC 0.11). Library candidates go in
  `C:/Users/kyleb/dev/art-library/heli-*`; only the picked runtime models go
  to `public/`. Blender files are rebuilt from scripts, not committed.

## Rounds

At most three rounds (SPEC 0.11). Each round: one comparison sheet (JPG,
500 KB at most) under `docs/board/looks/kestrel-one/`, judged by Claude.

## Done

Picked models in `public/assets/heli/`, credits on the credits page, the
round notes committed, evidence deleted. No game code.

## Director sourcing start — 14 October

Current plan explicitly releases helicopter storyboard and assigns only this ART source card to Codex; Claude owns the rest of Flying. Pull completed before own heli-art-src / codex/heli-art-src. The merged QA pins lane/branch and consumed receipts were recycled before opening this lane. ART is free; keep six active build lanes maximum, no concurrent shared catalog edits.

Start with source discovery, not adaptation. Workspace catalog fresh20261014T090009Z (notstale) finds no helicopter-named source; verified game-media-assets root C:/Users/kyleb/dev/art-library is available for targeted inspection, no wider disk crawl. Follow SPEC0.11 existinglibrary CC0 first thenCCBY primaryauthor/license proof beforedownload, no accounts/paidservices/APIkeys/runtime dependencies. Read docs/HELICOPTER.md and ASSET_PIPELINE. At most30minutes per sourcing/tool obstacle, then facts+cardquestion and otherwork; never a finishedplaceholder or guessedlicence.

Own candidate receipts/recipe under tools/art/heli-* and tools/blender/heli-* only, future selected runtime assets public/assets/heli/, own docs/changes/HELI-ART-SRC.md and up tothree compact sheets/verdicts docs/board/looks/heli/. Shared tools/art/catalog.json only additive own rows and existing credits page only own named paragraph after verified accepted donor; preserve every other source/credit/asset. No src gamecode, hooks/menu/renderer/cues/flyingrules/saves/flags. Downloaded licensed donors cacheONLY own C:/Users/kyleb/dev/art-library/heli-* folders, checksums/source/author/licence/adaptations retained in recipe; no committed .blend or rawrenders. Only accepted/picked runtime model ships, not candidates.

First prepare twoor three plausible generic real two-seat helicopter starting assets with verifiedlicences, native/sourcepictures, dimensions/triangles/textures/node suitability and concrete gaps; cablehook/helipadH/fuelpump donor options too. Claude judges sourcechoice and rounds (Kyle alreadydelegatedartpicks). Separate actualmain/tail rotor pivotnodes and skids, instrumentpanel/cockpit, cleanKestrelpaint, mainrotor10m, ≤20000triangles/textures≤2K aswritten; do not claim thoseconstraints from a source thumbnail. Proposed exportnames/scale/coordinate/node contract go on this card beforeadaptation if notsettledbycurrentFlyingcode, so ClaudeHELI-VIEW canconsumeit. No art round4, newtestmachinery, freeplan workaroundorproceduralplaceholder.

Initialwork SOURCEONLY: catalog/primarylicense/search/downloadmetadata ifneeded, no Blender/render/build/gate/browser/timing until Rootreviews candidatepacket and explicitlycoordinates freeheavyjobs. Eachlaterjob freshintegrationinbox+ALLnode/blenderinventory, max3heavy/threads≤4; unreachableart hasno framecheck. Buildercommitsownrecipe/change-note source; Rootownssharedboard/inbox/status and review/merge/newfoldercleanup. No release/push/livefolder/5174/realsaves. Allquestions on this card, waiting_onclaude when needed; neverwaitingforKyleartpick byold wording.
## Claude answers (14 October): the model contract HELI-VIEW reads

Settled from the flying code (`src/heli/heli-flight.js`, `heli-cable.js`)
so the models drop in without changes there. Adapt to this; ask on this
card if a source cannot meet a line.

- **Kestrel One, `public/assets/heli/kestrel-one.glb`.** Metres, +Y up,
  nose toward +Z. Origin on the ground under the main rotor mast: y = 0 at
  the bottom of the skids, x = 0 on the centre line.
- **Nodes, named exactly:** `body` (fuselage, cockpit glass, doors),
  `main_rotor` (pivot at the top of the mast, about 2.85 m up; spins about
  its own +Y; blades reach 5 m from the pivot), `tail_rotor` (pivot at the
  tail rotor hub; spins about its own X), `skids`, and two empties:
  `cable_hook` (belly under the mast, where the cable hangs from) and
  `pilot_eye` (the right-hand seat, about 1.70 m up: seat 0.95 m, eye about
  0.75 m above it; raised from 1.45 on 14 October so the glare shield clears
  the cockpit view).
  An `instrument_panel` mesh inside the cockpit; the readings are drawn
  separately in the page.
- **Size:** fuselage about 8.5 m nose to tail rotor, 1.7 m wide; at most
  20,000 triangles and 2K textures, PBR (base colour, normal, metal and
  roughness). Paint: Kestrel One, clean, no brand marks.
- **Cargo hook, `public/assets/heli/cargo-hook.glb`:** origin at the top
  where the cable meets it, about 0.4 m tall. The cable itself is drawn in
  code as a line.
- **Helipad, `public/assets/heli/helipad.glb`:** a 14 m square or circle
  with a painted H, origin at the centre of its top surface, about 0.15 m
  thick at most. The H's long strokes run along +Z.
- **Fuel pump or small fuel truck, `public/assets/heli/fuel-pump.glb`:**
  origin at its base centre, front toward +Z.
- The stand-in in `src/heli/heli-scene.js` (HELI-HOOKS) uses the same
  origin and axes, so the views and the cable line up with no change.

## Candidate packet: accessible donor decision needed — 14 October

Frozen243e1af4 contains only tools/art/heli-source-candidates.json and its change note. Claude's8065f3d6 exact lowercase node/origin/size contract is accepted and replaces the packet's earlier proposed naming. No adaptation or formal art round is used. Preferred CC0 light piston source advertises17460tri/two seats but the page returned503 and CDN DNS fails; actual mesh/pivots/textures remain unverified. Galih Pamungkas/Lopo3D R22 is verified CC BY4.0,9902tri published; actual author picture has two seats/skids/rotors/panel pod, but anonymous download metadata returned401. No account/key was created. The older z3eus CC0 archive is screened out because its cockpit/tail requirements are unproven. Hook/H-pad/pump CC0 leads share the blocked CDN; fitting gaps are documented.

Claude: choose the accessible donor route for the required real two-seat model, or point to an existing legitimately available source that meets your settled contract. Primary URLs/checksums/licence receipts are in the packet and originals only in C:/Users/kyleb/dev/art-library/heli-source-packet. Bounded access diagnosis stopped; no repeat downloads, procedural placeholder, paid/account workaround or guessed mesh compliance. Source packet is reviewable in heli-art-src; card remains incomplete until actual accepted runtime assets and rounds exist. Other cards continue while art choice waits.

## Claude answers - donor route, 14 October

- **First:** one retry of the preferred CC0 two-seat source after 18:00 today
  (a 503 and a DNS failure are usually temporary). If it downloads, check it
  against the contract.
- **If it is still down:** the Galih Pamungkas / Lopo3D R22 (CC BY 4.0, two
  seats, skids, rotors, panel pod, 9,902 triangles) is the pick. Its download
  needs an account, which only Kyle creates: Claude has asked Kyle to download
  it into `C:/Users/kyleb/dev/art-library/heli-source-packet`. Credit it in
  `public/assets/models/CREDITS.md` as CC BY 4.0.
- Hook, helipad and pump: build them in Blender from recipes in
  `tools/blender/` (simple shapes, no donor needed), within the contract.
- No placeholder ships as finished; rounds as on the card.


## Director answered accessory source scope — 14 October

Resume existing own heli-art-src; Claude3e034b28 permits original Blender recipe accessories. Own new tools/blender/heli-accessories.py, tools/art/heli-accessories.json and own note/source packet ONLY initially. Future outputs only public/assets/heli/cargo-hook.glb, helipad.glb, fuel-pump.glb and additive own original-model credits paragraph after actual export. Build finished simple metal cargo hook(top cable origin,0.4m),14m H pad(top-centre origin,thickness≤0.15m,H along+Z) andclean generic aviation pump(base/front+Z) from recipes, with sensible shared PBR/material/node/triangle/texture bounds. No helicopter geometry/stand-in/donor fabrication or runtimecode. ExactClaude exportcontract remains. No .blend/rawrender/sourcebinary under public; no sharedcatalog rows yet. Sourcefreeze/Rootreview before one Blender export threads4 or lower, originalnearby/jobs4/build and actualcompactround sheet. Actual accessoryart remainsClaude's, cap3; no visual/asset pass from source.

Preferred helicopter retry remains exactly once AFTER18:00PT today; no downloadnow. If unavailable, Claude alreadyasked Kyle for the licensedR22download; onlyKylecreatesaccounts. Retain originals/provenance, waitactuallegitbinarybeforeadaptation. Source accessory work can continue without donor. Builder is notalone, onlynamedownfiles; Rootcoordinatesheavyjobs and owns immediateboard/inbox/STATUS/merge/cleanup.

## Claude answers - a second candidate, 14 October evening

Kyle asked Claude to build what it can without waiting. Claude builds an
original Kestrel One in Blender, `tools/blender/kestrel-one.py` (Claude's
lane `claude/heli-kestrel`, candidate output in ignored `art-build/heli/`,
to the exact contract above). The donor route continues unchanged (the one
retry after 18:00, else Kyle's R22 download). Round 1 puts both on one
sheet; Claude picks, and only the pick goes to
`public/assets/heli/kestrel-one.glb`. Codex keeps the hook, helipad and
pump recipes; Claude does not touch `tools/blender/heli-accessories.py`.

## Claude answers - the helicopter pick, 14 October evening

Picked: Claude's original Kestrel One (`tools/blender/kestrel-one.py`,
`public/assets/heli/kestrel-one.glb`), three rounds closed, review in
`docs/board/looks/kestrel-one/round-3-review.md`. Drop the donor route: no
retry, no R22 download needed. Codex's part of this card is now the cargo
hook, helipad and fuel pump only.


## Codex lane handoff — accessories only

The second Codex lead may take the existing heli-art-src folder / codex/heli-art-src source from bb40c3eacfaee15ea05f66b5b30774d69faa9590 when the six-lane inventory has room. No builder from this chat is active there. The first lead remains sole integration/metadata/merge and heavy-job scheduler for retained work; request checks on this card before running them. Do not take TYRE-SLIP's shared game files while Claude's steering work and the priority Summit Attack queue need them.

The three original accessory recipes and actual GLBs are already exported and source-reviewed: tools/blender/heli-accessories.py, tools/art/heli-accessories.json, cargo-hook.glb/helipad.glb/fuel-pump.glb, source packet and own change note. Export receipt and independent GLTF inspection are under .evidence/2026-10-14/HELI-ART-SRC/accessories-fbe27f80. Hook2108tri/41748bytes, pad1346tri/84492bytes, pump2133tri/98140bytes; all exact origins/dimensions/PBR guards passed. No accessory art sheet, lane gate or build has run. Do not repeat the export merely to resume.

Read Claude's latest pick first: his original Kestrel One is accepted, three model rounds closed, and the donor route is dropped. No download retry, R22 or fourth helicopter round. Keep licensed originals. Own only accessory recipes/parameters, these three runtime GLBs, the original accessory credit paragraph, the accessory source packet and this card's change note/review sheet. Merge current integration normally before changes; preserve Claude's Kestrel model, recipes, credits and runtime code. Prepare the compact actual accessory review with existing tools, then freeze source for first-lead review and Claude's art verdict. No new general harness or helicopter scene/view code. No heavy job or merge until the first lead schedules the slot; follow the shared six-lane and three-job limits.


The second lead's proposed accessory-only Blender review is within that handoff: extend only heli-accessories.py with the existing Kestrel camera/light rendering pattern and a separate compact looks/heli-accessories/round-1 sheet. No production GLB loader hook, procedural scene substitution or fourth Kestrel round. Existing first-flight QA does not load these accessories and cannot certify their appearance. The old worker is released; source review comes before any render/export/gate/build, all scheduled here. Keep the already measured GLBs unless Claude's accessory verdict requests a real change.


## Accessory source handoff held for capacity

Second authorized Codex chat prepared clean db6f04d18f86b14a09e9b04394e8567e8b7710b1 in the retained heli-art-src lane, after normal integration merge 77033b64. Root independently reviewed the two owned files: imported-GLB six-view render-only recipe and its change note. Path and framing faults were corrected; source review is clear and diff check passes. All three current GLBs remain unchanged. No Python, Blender, sheet, gate or build ran on this slice. That chat is held until this lead grants an actual ART and heavy slot; no additional lane, export or runtime wiring is authorized. Prior exact render-only request and source-view labels remain binding.


## Conditional single render admission

Kyle renewed the accessory completion instruction in the authorized second chat. Root grants exactly the reviewed db6f04d1 render-only batch once that builder verifies a free ART build slot, the existing inspectNightProcesses reports at most ONE foreign heavy root, and no current frame or release-alone hold exists. The one-root threshold reserves room for the priority QA retry, which is also queued; even simultaneous admissions then stay within three jobs. Recheck immediately before launch and send start/end notices. CPU four threads, six imported-GLB views, unchanged source-byte verification and the already reviewed compact source-only sheet follow serially. No new export, gate, build, card, source scope or runtime wiring is granted. If the lane inventory is unclear, ask this lead and remain held. Root reviews actual output and routes Claude's art verdict on this card. Shared metadata and merges stay with this lead.


## Claude coordination requested: actual ART inventory

The second builder reports nine Claude cards listed building or under review, which may include stale or paused statuses. Please name the actual active build-lane inventory and which ART slot is free for the already reviewed accessory batch. A named merged lane alone does not prove total work is within six. Until this is settled, the source stays clean at db6f04d1 and no render starts; the conditional one-foreign-root admission grant remains ready. This is an operational capacity question, not a request for Kyle or a new art verdict.


## Capacity settled from Kyle's actual quota notice

Root verified the direct human message in the authorized second chat: Claude is out of quota until17:40 PT today. Claude's source builders are paused; only their already running gates continue. The stale building/review rows are therefore not nine actively editing builders. Our other retained sources are frozen, QA is this lead's active lane, and HELI's existing ART lane may resume within six active lanes. Clear this operational waiting_on; the art verdict itself still waits for Claude after17:40 once real pictures exist.

The ready browser slice passed its canonical46/46 nearby gate, notRun0/jobs4, so Root reserves the next heavy slot exclusively for the reviewed db6f04d1 single render batch. The builder must inspect immediately before launch: at most TWO foreign job roots, no frame or standalone-full/release hold. Root starts no other heavy job until this batch's end notice. This specific reservation supersedes the earlier one-root threshold for this one batch only. CPU4, six imported-GLB views, unchanged bytes and serial approved compositor remain exact. No export, source edit, gate, build, second job or art acceptance is granted.


## Accessory planner correction and actual round 1 review

The original 77cf4446 gate failed 26/28: inherited root run-log placement is already corrected on integration; the strict Blender generator roster omits this new recipe. Extend only tools/test-blender-output.mjs with the additive heli-accessories generator row for the three settled GLBs, retaining all roster, paths and no-write assertions. In the owned heli-accessories.py, return its unchanged constant --paths-only plan before reading configuration, so the existing empty-root planner test uses no Blender, Pillow or input files. Default export, render, sheet and GLB bytes stay exact. Merge current integration normally, freeze for Root review, then the original focused output test and corrected canonical lane/jobs4/build; no repeated render/export or changed assertion limit.

Claude: please judge actual accessories round 1 at docs/board/looks/heli-accessories/round-1.jpg on codex/heli-art-src, SHA ac9f430bf139076117da400c4c025b16d7649a8ca0da905f0cbe03b2a0246e06 (156226 bytes). It contains six original imported-GLB views, hook/pad/pump fully framed. Independent source/GLTF checks are clear; actual appearance remains your verdict, separate from Kestrel One's closed three rounds. Your quota pause until17:40 PT is respected. No runtime flight or frame acceptance is inferred.


Planner lease refinement: the settled accessory recipe emits no editable Blend files. Add recipeOnly:true ONLY on its new roster row. Assert its exact empty blend array, allow that array only for the named recipe-only row during normalization, and require count0 only there. All existing generators retain their positive Blend count/path/assertions; all-generator coverage, exact three runtime paths, runtime existence, two-root equality and no-write checks remain. This extends the existing suite to the written source-only contract, without loosening any prior case. Root confirms the exact additive source before execution.

## Claude accessory round 1 verdict and bounded round 2

Actual single read-only Claude image review after17:40 completed exit0 in31271.5544ms on original79769594 sheetSHAac9f430bf139076117da400c4c025b16d7649a8ca0da905f0cbe03b2a0246e06. Verdict CHANGES REQUIRED: hook shape3/5, material2/5, readability2/5; pad5/4/5 and pump4/4/5 acceptable with no required corrections. Hook must lose copper tint, gain a real hinged grey safety flap closing against its tip, and show an open cargo-hook throat rather than a split ring. Raw actual verdict and receipt: .evidence/2026-10-14/HELI-ART-SRC/claude-image-only-round1-79769594. No final set acceptance or runtime flight pass.

The existing accessory builder may prepare only these round2 hook corrections in tools/blender/heli-accessories.py and its existing config/change note. Preserve accepted pad/pump GLBs byte exactly, original helicopter closed3rounds, all dimensions/origins/poly/size guards and cameras. If needed, add a validated cargo-hook-only export selector to this same recipe, preserving its default3-asset and empty-root paths-only contracts; Root reviews source before export. No optional pad/pump embellishments, R22, donor, runtime hooks, new helper/framework or fourth round. Render the same6 actual imported-GLB views once at a fresh Root-scheduled slot, compose round2 <=500KB, then corrected original nearby/jobs4/build and actual Claude verdict. Source preparation now; no check/export/render/build until Root GO under actual maximum3 jobs. Root alone edits integration/shared metadata and merges.

## Reviewed hook source waiting for RELEASE DONE

Root source review of clean971dbb74 is clear: only the hook becomes the requested forged J with grey hinged flap and pivot; the selected-asset export skips pad and pump, and the same six imported-GLB review views support the next numbered sheet without overwriting round1. Actual round1 verdict already accepted pad and pump and requested this hook correction; do not repeat that review.

The authorized second Codex chat is idle with its heartbeat paused. After RELEASE DONE and a fresh capacity check, Root will wake that chat for one selected-hook export at four CPU threads, proof that pad/pump bytes remain exact, the six-view CPU-four review and compact round2 sheet, then Claude's actual art verdict and fresh lane/build. No export, render, gate, build or merge is authorized during the current release hold. Prior79769594 mechanics do not certify the changed hook.

## Root bounded GO after explicit hold lift, 14 October22:28PT

Claudeaa95cf95 explicitly lifted the earlier helicopter check/merge hold; the frozen release still waits for Kyle's High-frame decision. Root's later interrupted quiet window is also explicitly released a2982352. No release/push/live access is granted. Existing971dbb74 hook-only source remains Root-reviewed CLEAR; the actual R1 verdict above is not repeated.

The existing authorized accessory chat01a13c7a-8f66-7832-b9c6-82054f30e29b may resume its existing heli-art-src lane ONLY. One ordinary heavy slot is reserved sequentially for the selected-hook CPU4 export, proof accepted pad/pump GLB bytes exact, then the SAME six imported-GLB CPU4 views and immutable compact round2 sheet. No new builder/lane or repeated R1/closed Kestrel rounds; no donor download or alternate geometry. Check actual node/blender roots before every launch: maximumTWO other heavy roots, four threads each, and no new frame/release hold. Root's final Snow pair may finish as one other job; never duplicate it or exceed3 total.

After source/assets/pictures freeze, actual minimal image-only Claude verdict within remaining accessory three-round cap, then sync current integration in the lane and one fresh nearby/jobs4/build/review. A conflict requires normal resolution/preserve both new generator rows and Root source review before gate; never edit integration metadata or merge integration from that chat. Hand exactsource/evidence/result to this chat's card or final reply; Root remains sole integration merger/heavy lead. On a new quiet/release hold source-only until actual clearance. Stop at handoff or30-minutefailurelimit; preserve unresolved originals/lane.

## Conflict union confirmed; final packet update before gate

Root independently checked d60d93cf: bounded union CLEAR. The roster retains the exact new heli-accessories recipeOnly row AND incoming skin-gear/rescue-people rows, all original positive Blend/path/no-write/two-root/runtime assertions. Recipe heli-accessories.py remains byte-exact971dbb74; config changes only to actual round2 accepted state. Actual hook1496tri/50440B/hash13ed385c3849d33e3885685435944fb3ff7c105f34cf1dae2a7e9eddfe0c1f6e and accepted pad/pump byte-preservation/render guards/verdict are handed back by the authorized builder. No extra art round or optional polish.

Director adds narrow tools/art/heli-source-candidates.json lease BEFORE its final gate: update only localAccessories current cargo-hook metrics/nodes/bytes/hash/bounds from the actual existing export/GLTF receipt, current inspection/state/artAccepted and accessoryReview current R2 actual sheet/source hashes/verdict. Keep accepted pad/pump exact, cancelled donor/download plan and every licence/source provenance row. Distinguish recipe commit from generated asset bytes; do not invent a clean asset commit at render time. No export/render/review or runtime edit is needed. Fold consumed own R1 verdict/hash/scores into finalR2 note; the owning chat may recycle only its own consumed R1 JPEG/note after exact hashes/facts retained, leaving currentR2. No closed Kestrel images/originals touched.

Freeze this final metadata/cleanup source for Root confirmation, then one canonical nearby/jobs4/build in the lane under restored reserved slot. PIT FINAL RUN DONE; no other Root native follows. A conflict resolution now gets this one fresh gate, no additional clean-merge rerun. Never edit integration metadata/merge from accessory chat.

## Integrated green; lane recycle pending

Mergeda7505637/clean54ba9f66: original nearby29/29,failures0/notRun0,jobs4,runner219191.3218ms/wall230810.8692ms; build971ms/wall1611.9196ms, unchanged clean source. Root independent source/real roster-union CLEAR. Actual R2 image-only ACCEPT hook4/4/4,pad5/4/5,pump4/4/4; hook1496tri/50440B/0.4m/top0,accepted pad/pump exact. Current packet/sheet and folded R1 verdicts retained. Conflict-free integration/no clean rerun; accessory heartbeat paused. No native-flight/frame/release/push claim.

Own node_modules and .evidence junctions unlinked NONRECURSIVELY after exact integration-target verification; both targets remain intact. Windows Recycle Bin refuses the own merged lane with 'Attempted to perform an unauthorized operation', including after the second evidence link was removed. No forced/permanent deletion. Lane/branch remain registered, clean and merged, pending bounded cleanup; do not reuse or remove foreign lanes. Essential original receipts retained in integration .evidence/2026-10-15/HELI-ART-SRC/final-54ba9f66. No new lane until this owned cleanup is settled.
