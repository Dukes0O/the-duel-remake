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
500 KB at most) under `docs/board/looks/heli/`, judged by Claude.

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
  `pilot_eye` (the right-hand seat, about 1.45 m up, for the cockpit view).
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
