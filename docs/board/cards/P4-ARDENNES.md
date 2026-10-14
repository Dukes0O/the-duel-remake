# P4-ARDENNES

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Kyle, 13 October 2026, on a Spa-style forest circuit after loving Panorama
Ridge: "make that one a beauty!" Design: `docs/CIRCUITS.md` section 5.5.

## Split

- **Road layout (Claude, tonight).** A Claude helper writes
  `src/circuits/ardennes-forest.js` from the fitted script in section 5.5:
  widths, run-off, crests, kerbs, boards, pit lane and the `ardennes-forest`
  dev switch, registered the way Panorama's road was (P4-CIRCUIT-LAYOUTS).
  It uses existing forest scenery and puts no art in.
- **The rest (Codex, this card).** Codex builds it once the road merges:
  - the light path (morning mist clearing to sun);
  - the forest dressing (dense firs and beech close behind the fences, mist
    in the dips);
  - the catch fences and armco from the circuit kit;
  - every landmark in section 5.5;
  - the full eight-car field on the native .95 driver;
  - the pit lane;
  - its own field recipe (the Panorama recipe is the starting point).

  Use the existing kits, stand crowds, night glows and landmark metadata.
  New models only where no kit piece fits: the stone stream bridge, the
  footbridge and the timing tower. Send those through one art sheet to
  Claude, within the three-round cap.

## Acceptance

- Section 4 feel targets checked with the review tool. Lap time and corner
  speeds go in the change note: The Wall flat in a good car, Les Combes and
  Riverside the heavy stops.
- The full field races two laps cleanly.
- The drive-through passes, with no floating walls, the road covered and
  body-to-face contact within bounds.
- The simple frame check at both qualities on the busiest view (the grid at
  Pit Straight) passes.
- Lane tier, build, one review. Then Claude's finishing pass,
  P4-FINISH-ARDENNES, before Kyle's "go live".
- Price 2,000 credits. The course joins the end of the list after Summit Run,
  so saves, records and menu places stay put.

## Road merged (Claude, 13 October 21:40 PT)

P4-ARDENNES-ROAD merged at 85e47a3e: `src/circuits/ardennes-forest.js` (manifest: dev, 2,000 credits, release order 5, Grand Prix), reference lap 139.3 s, `tools/test-circuit-ardennes.mjs`. No safety kit yet: open run-off on both sides. Widths 15 / 16 on Kestrel / 15 from Les Combes / 13 through the Bus Stop.

The layout test's Medium driver laps in 2:29.2, just under its 150 s cap. Codex should not make the lap slower without first raising that cap for this circuit's length, with a reason. P4-ARDENNES can start now.

## Director source start, 13 October evening

Road prerequisite85e47a3e is merged and its Claude lane is cleared; integration was pulled before this card. Start only new p4-ardennes, branch codex/p4-ardennes, holding no busy-game-files. The exact merged road script, widths, closure, grades, pit location, stable id/generation stage, 2000-credit price, release order and dev/noCombat admission stay exact. Initial owns: src/circuits/ardennes-forest.js course-authored field/light/scenery/landmark/safety-kit metadata, its existing owned circuit test, existing course-specific scenario or field-recipe file if present, and docs/changes/P4-ARDENNES.md. Read section5.5 and actual current renderer/kit hooks first; request exact additional files before touching them. No placeholder or unauthorised shared terrain/physics/controller/save/audio/catalogue rewrite.

Build the native eight-car/two-lap field and all accepted landmark/forest/mist/light requirements using existing kits and helpers. Any needed three original stone-bridge/footbridge/timing-tower model recipe, runtime asset/manifest or new course-specific photo hook needs a precise Director grant first; it cannot silently edit shared source pins or Deep's pending catalogue. Write meaningful card-owned acceptance before implementation where behavior needs it. Do not run a gate, build, browser, render, balance or merge until Claude posts RELEASE DONE. Code preparation in this lane may continue. Later checks follow fresh all-team inventory, jobs4, one original nearby/build/review, bounded native field tuning, and Claude's art/finishing pass. Root owns shared metadata and cleanup of this newly created lane; preserve all others.

## Director exact Ardennes visual and landmark hooks

Grant src/light-path.js only forest-morning palette handling for existing golden/day endpoints and its palette admission, retaining every original palette/look/default/cache behavior. Author race-progress0 golden, .5 day,1 day in this course only. Grant src/circuit-effects.js only opt-in effects.valleyMist: existing mistTexture, finite bounded authored banks {s,lateral,along,across,count,height,opacity,colour,fadeEnd}, actual rendered-ground anchors, read-only native lap progress fading and disposal; and opt-in effects.stream {s,width,reach,colour}, one grounded red-brown ribbon visible either side of Red Water, omitting the whole road/shoulder interval. Preserve lake mist, all default effects, terrain, water reset, surface/grip and simulation state/seeds.

Grant src/track-kits.js only three appended IDs stone-stream-bridge, forest-footbridge, forest-timing-tower, and course-authored kitLook.leafColour on the actual leaf material-name patterns -leaves-/-leaf-cluster-. Use owned cloned materials; never mutate a donor or another course's owner. Retain the35 original IDs/order, bounds/collision/LOD/loading defaults and the accepted larger trackside faces. Grant tools/test-track-kits.mjs only additive38-ID admission preserving the35 originals and their existing assertions; validate all three actual new assets in the owned Ardennes test. Original kits are not regenerated.

Own new tools/blender/ardennes-landmarks.py writing only these three high/LOD GLBs in public/assets/models/circuits/kits, with source provenance/metrics in tools/art/ardennes-landmarks.json (not an unused public provenance file). Budgets per High/LOD: stone bridge2500/800 triangles, footbridge3500/1000, tower4000/1200; each high+LOD at most250KB, actual measured. Add original-model credits to existing public/assets/models/CREDITS.md, preserving all prior credits. No shared P4 recipe/manifest or global catalogue/pins change; Deep's pending catalogue remains owned separately. Model grounding and all existing road/triangle clearances stay exact; no under-road guard exemption.

Own new course-specific tools/scenarios/ardennes-views.mjs, tools/art/p4-ardennes-sheet.py and tools/ardennes-field-rate.mjs using the existing Panorama native/memory-only helpers and field recipe. These are this card's explicitly requested recipes, not new general harnesses. Keep Claude's existing docs/board/looks/ardennes/round-1.jpg layout original untouched; formal actual in-game art sheets use docs/board/looks/ardennes-art/round-N.jpg, at most500KB, at most3 rounds. The circuit-owned test covers authored palette/mist/stream/leaf defaults and immutability, actual three-model dimensions/grounding/budgets, road identity, eight-car/two-lap field and pit clearance. New Ardennes world-signature fixture only follows independently reviewed actual visual differences; every old row stays byte-exact.

Existing alpine ambience already selects ambience.forest, so reuse it unchanged: no sound-bank/mastering/download or new audio route. Village/church/cafe assemblies use real existing kits, with Claude judging the actual sheet. No finished-art or native/frame claim from code. Release hold still forbids test execution, builds, Blender exports/renders, browsers, balance or merges until RELEASE DONE. Root owns shared metadata, ordinary review and cleanup; builder continues only named source edits now.
