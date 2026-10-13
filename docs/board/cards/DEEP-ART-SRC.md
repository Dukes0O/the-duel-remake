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

Source handoff is now green on e5dca26f2af085cb2e7809981e77dba831824f44: original nearby29/29, zero failures or unrun,231.055 seconds; build exit0,1356.2672ms wall/Vite709ms; ordinary source review and exact checksum correction confirmation CLEAR. All models and the actual round-two sheet remain byte-identical to the packet below. Root verified clean frozen source and invocation receipts. This clears source checks only; please judge the formal art packet and clear waiting_on with your verdict.

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
## Director photography source-access contract before correction

The corrected original lane on da1de4b4 reports 12 passed, 1 failed and 16 not run; the existing Blender placement suite passed all48 checks, and build passed (Vite839ms). The remaining failure is the isolation guard, which sees the card-approved photography helper's literal source('src/deep/sea-floor-shape.js'). Grant only tools/test-deep-look.mjs to recognize that exact tools/scenarios/deep-art.mjs plus that exact source expression before its existing forbidden-path scan. This grants photography read access to the existing floorHeight function; it grants no other importer, path or runtime access. Keep every existing approved import pair and the complete forbidden-path assertion unchanged in behavior. No blanket helper exemption, renderer/page/debug-handle edits, new framework or weakened assertion. The proposed exact literal patch is sufficient. Record both real failed gates; apply this correction, freeze source, run one fresh original nearby lane with --jobs 4 and a build, then one ordinary source review. Models and the actual round-two sheet remain byte-identical; Claude's art verdict is still pending separately.
## Director reviewed catalogue pins before correction

Original nearby db88ccf6 completed 27/29, two real failures and no unrun suites, in 230.0518802 seconds. Both Deep guard corrections passed. test-p4-kits and test-tanker-valve-source pin projections of the whole catalogue, so the eighteen approved new Deep rows change their digests. Root verified integration's original37 rows are exactly equal, in their original order, in the lane's55-row catalogue; only18 rows with card DEEP-ART-SRC were appended. Grant only those two existing suites' expected digest literals: test-p4-kits protectedRows 638e0675be0d488bfb8ae24b6ac5b8bc7ebeacd45580b574c0d7af7c63b6c1c2 becomes 8455623df877f5485d97197bfa780f4ccd2f105513fed9f8c0e40bf4944134dc; test-tanker-valve-source non-Factory projection 6407c90d9574b7ab95974ec16229f87ad0696e9cb3d0058a9c70f2edb44bd5f7 becomes 7cb026655ca6168d71d8bfd89c19ec954a464456b079fd0040cba1fa89bd1c20. Keep the projection filters, every existing assertion and all model/provenance/Factory pins unchanged. This is an explicit reviewed additive-source checksum update, not an exclusion or tolerance change. Record old/new digests and the exact legacy-row proof in the note; freeze corrected source, run one fresh original nearby/build, and have the same ordinary reviewer confirm this two-literal delta. Formal art judgment remains Claude's.

## Claude answers (13 October)

**Claude verdict, Deep art round 2 of 3 (13 October 2026, 08:40): 15 of 18 accepted; three fixes for round 3.**

Accepted as they are: silver-school, reef-fish, turtle, ray, manta, sea-lion, crab, moray, reef-shark, jellyfish, whale, octopus, wreck-hull, anchor and sunken-boat. Their natural, muted look is right.

Round 3, final:
1. **Otter:** it does not read as an otter. Make it float on its back at the surface, belly up, with the paler head and paws together on the chest. Keep the round face visible from below.
2. **Grouper:** remove the loop by the mouth (it reads as a hook or handle). Give it the wide, down-turned grouper mouth and a mottled brown pattern.
3. **Giant clam:** reduce it from 23,904 to at most 4,000 triangles and 150 KB. Darken it to sandy grey shell with a blue-green mottled lip, not white.

Re-shoot only those three in the same water. waiting_on is cleared.

## Director final art resumption, 13 October

Resume retained clean deep-art-src after an automatic current-integration union; never reset others' work. Only the three Claude-rejected roles may change: otter belly-up/pale head/paws on chest, grouper mouth/no loop/mottled brown, giant clam at most4000triangles/150KB/sandy grey/blue-green mottled lip. Keep all15 accepted GLBs byte-identical. Own existing tools/blender/deep-art-fit.py recipe and the existing deep-art photo recipe only its three-role selection, corresponding three runtime models/manifest/provenance rows, final round3 sheet/review and change note. Preserve original37 catalogue rows; only actual source-content pins of changed Deep rows may update with reviewed proof. No water/light/shader/runtime-life change or new helper/framework. Fold consumed earlier verdicts into final notes; do not delete old evidence or sheets you did not create without Root/user authorization. Same actual water views for only these3; compressed sheet<=500KB, final round3 of3, no frames. One original nearby/jobs4/build and one ordinary source review; Claude alone judges final art. Root owns shared metadata/merge; retain the existing lane while it waits.

## Director existing final-sheet hook, 13 October

Grant tools/blender/deep-art-sheet.py only an optional round3 composer for the three changed roles; preserve its original default and paths-only round2 output/guards. No new helper/framework. The two whole-catalogue expected digest literals remain ungranted until actual old/new projection values, original37-row equality and15 accepted-model byte equality are supplied for independent review. No filter, assertion or old-source pin changes.

## Director final-role camera correction, 13 October

Grant only the existing final-round photography role values: otter centre from0.5m below water to0.02m above it, with a below-surface eye to show the real face; grouper front eye to show its real mouth. These are three-role photography controls in the existing recipe, with water/lights/materials/scale/render pipeline exact. Flatten only otter donor cross-section centres with original topology to meet the approved belly-up pose. Record the actual draft's submerged/arched defect honestly; no formal round3 acceptance or fourth round. Final content hashes and the two complete-catalogue digests are supplied after the last actual export before a pin grant/gate.

## Director independently verified final source pins, 13 October

Root independently read both existing projection filters and recomputed the final hashes. Exactly3 rows change (deep-otter/deep-grouper/deep-giant-clam); original37 ordered catalogue rows and all15 acceptedGLB bytes match e5dca26f. Grant only test-p4-kits expected8455623df877f5485d97197bfa780f4ccd2f105513fed9f8c0e40bf4944134dc to91fcc5b3740744c6a6e9e543fba9ce62a3dd21322a8e4e0ca5e5692de4d2aec6, and test-tanker-valve-source7cb026655ca6168d71d8bfd89c19ec954a464456b079fd0040cba1fa89bd1c20 to530d258c3980ff47d7dd6746a44218e85974cc0e182f37331563fa2b247d81f2. Preserve filters and every assertion. These reviewed content-pin changes reflect actual three-role exports, not excluded source rows. Source review still inspects final recipes/default photography behavior before integration.
