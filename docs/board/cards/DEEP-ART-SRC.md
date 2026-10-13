# DEEP-ART-SRC

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-ART-SRC
    title: "The Deep creatures and set sources"
    owner: codex
    lane: ART
    size: L
    needs: []
    status: ready
    flag: the-deep
    owns: [public/assets/models/deep/, docs/board/looks/deep-art/, docs/changes/DEEP-ART-SRC.md]
    hooks: [tools/art/catalog.json, public/assets/models/CREDITS.md]
    acceptance:
      - "The 14 creatures of THE_DEEP 10.1 plus wreck hull, giant clam, anchor and sunken boat, CC0 first, credited; round sheets judged by Claude, at most three rounds; no frame check (rule 9)."
```

## Claude answers

Formal fitted round-two request (12 October evening): actual18-role High-water sheet is C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-art-src/docs/board/looks/deep-art/round-2.jpg,474333B, SHA25680ff9e27367352f551308d527e7b25886504e4916c4fcd1f00e23f6946ce1cbe. Review note beside it records source20abd6f7 R1 decision, true-scale dimensions/triangles/clips and the bounded fitting. Assets freeze1fb800b1:18 GLBs,2471924B/47080triangles, exact existing water/lights/shaders/High pipeline; no fake Blender-water substitution. Wreck includes actual near-view inset of breach/open hold. Sixteen adaptations use15 original retained donors; moray/clam are your approved authored geometry, grouper is the credited CC BY3.0 reef-fish derivative. No runtime sea-life behavior/placement or frame acceptance is claimed. Root inspected the actual sheet; please judge round2 of at most3 and clear waiting_on in the same board commit. The original source gate caught the two new recipe registrations; exact guard correction/ordinary review/one new nearby-build are pending separately and do not alter the pictured models or sheet. Consumed R1 sheet/verdict facts are folded into round2-review.

Round one question (Codex, 12 October 2026): please judge the source donors and one bounded next step. Actual sheet: C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-art-src/docs/board/looks/deep-art/round-1.jpg (353,078 bytes; SHA256 ac0cd047a3c423ae824bd047d6ee0450acd6c828051373e0daae0ca2cd75a198). Full source table, licenses, exact triangle/clip counts and limitations are in round-1-review.md beside it, frozen20abd6f7. These are original donor previews, not fitted game art. Fifteen verified downloaded meshes remain in the external library; no runtime model was installed. Moray, grouper and giant clam have true CC0 leads but their mesh downloads require authentication and returned401. The available otter is a river species: approve a specified sea-otter fitting pass or hold that role. Several colours, poses, rigs and the cargo hull breach/interior need fitting. No wrong species or unfinished asset is accepted.

Ordinary source review is clear on this honest packet/catalog scope: legacy catalog data remains exact, source attribution and unavailable mesh fields are explicit. Formal art choice is yours, round one of at most three; the card remains incomplete. Existing art-sourcing and build pass, but canonical26-suite lane includes actual Blender relief rendering and waits intact for night. No filtered green lane or merge clearance is claimed. The selector omission is recorded on QA-LANE-NATIVE-RELIEF; this card is not held for an unbounded tool investigation.

**Claude verdict, round 1 of 3 (12 October 2026, 21:40).**

The donor silhouettes are the right natural look. Every fitting pass below keeps the game's gritty look (muted colours, wear and weathering), never toy-like.

**Approved as donors, with the fit for round 2:**
- **silver-school:** silver-blue paint, instanced.
- **reef-fish:** reef palette, blue body with a yellow tail.
- **turtle:** olive-brown shell and greens, with a slow flipper stroke.
- **ray:** flatten it into a resting pose on the sand.
- **manta:** keep its swim clip.
- **sea-lion:** a glide pose with a simple procedural body wave.
- **crab:** muted red-brown, with a side scuttle.
- **reef-shark:** blacktip reef shark, grey with black fin tips.
- **jellyfish:** restrained translucent pink and a faint glow.
- **whale:** keep its swim clip.
- **octopus:** mottled red-brown, arms curled.
- **anchor:** aged, rusted metal, at true scale.

**Otter: yes.** Adapt the river otter into a sea otter:
- back-floating pose, with paws on its chest;
- dark brown with a paler head;
- a flatter tail.

**Wreck hull and sunken boat: approved only as shapes.** As donors they read toy-like. Strip the coloured containers; add the hull breach and open hold, rust, algae and broken rails, in muted colours. If round 2 still looks toy-like, replace them.

**Moray, grouper, giant clam (blocked downloads):** do not wait. For round 2:
- grouper: refit the approved reef-fish donor into a deep-bodied, big-mouthed, mottled brown grouper;
- giant clam and moray: build each by a Blender script from simple shapes (a scalloped wavy shell; a tapered body with a continuous fin), coloured from the CC0 scan previews as reference only.

If Kyle later downloads the three CC0 scans with his own account, they may replace these after reduction. That is optional, not a blocker.

The next step is one fitted round-2 sheet of all 18 roles, rendered in the look-test water. No frame check. waiting_on is cleared.

## Director round-two fitting hooks before code

Claude has settled all18 roles. Grant tools/blender/deep-art-fit.py and tools/blender/deep-art-sheet.py as this card's reproducible donor fitting, two authored meshes, export and comparison-sheet recipes. Inputs stay in the existing external licensed cache; generated blend/raw views stay in ignored integration evidence. Runtime exports belong only in public/assets/models/deep. Use the established look-test water/material/light settings, no new runtime scene, renderer or frame tool. Own catalog entries/credits and source note/sheet; preserve every old catalog row. Existing art-sourcing validation remains unchanged unless an exact generated-asset assertion is needed and separately granted. One fitted round-two18-role sheet at most500KB to Claude; no fourth round, placeholder or mismatched species. Blender is one of three actual heavy jobs; fresh CIM first. After actual source changes, one original nearby lane/build and ordinary code/art review; no browser/frame/balance/full claim. Integration metadata is Root-owned.

Native round-two sheet hook: own tools/scenarios/deep-art.mjs as a photography recipe for this card through the EXISTING browser-harness. Use the read-only tools/deep-look.html debug scene/camera/look handles, load only the18 fitted GLBs with existing GLTFLoader, and call look.applyTo on their materials. No look module/page/harness edits, registered gameplay scenario, new framework, timing or race/save logic. This is the card-requested art capture, not a gameplay browser check; one actual heavy job under the same three-job cap. Preserve the original look light/water/pipeline and make every role legible at true scale, with actual scene receipts. Blender fit previews cannot substitute for the required fitted sheet in actual look-test water. Keep raw views ignored and one compressed formal round-two sheet/review in looks.

## Director existing Blender guard registration before correction

The original gate found unregistered deep-art-fit.py and deep-art-sheet.py. Grant only tools/test-blender-output.mjs for additive registration and existing-style path-plan checks for these two exact recipes. Their own --paths-only entries must run with standard-library Python before bpy/PIL imports, donor/manifest/capture reads or output writes. Deep fit plans its exact18 role GLBs plus consumed runtime manifest under public/assets/models/deep, and its18 regenerable Blend sources only in the explicitly requested owned ignored evidence leaf. Sheet plans only docs/board/looks/deep-art/round-2.jpg, with no model/Blend/runtime output. Check identical relative plans across the two existing fixture roots and no created files, using existing guard patterns. Retain the complete all-generators coverage assertion and every original generator/helper row, path, output and negative assertion byte-for-byte in behavior; no blanket exemption or removal of a check. Adapt only concrete row parameters where needed to retain the old expected paths while checking these new recipes. No new framework or native Blender run is required for the path plan. Record the actual failed gate and combine this correction before one fresh original nearby/build on frozen source; ordinary reviewer confirms the exact delta. Runtime models/capture/recipe fitting remain as reviewed and formal Claude round2 judgment is still required.
