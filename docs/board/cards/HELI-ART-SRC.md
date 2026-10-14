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
