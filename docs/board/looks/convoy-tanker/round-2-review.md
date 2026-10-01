# ART-FIT-TANKER — round 2, independent review pending

waiting_on: independent critic, then Claude
Source freeze: a1ce674134dab9e71a0ac519f1322ecfbecc70b3.
Candidate: a3ed6fa81dd493983a4b9e07f69216258e2ce048b9849acf9af291ef02823377.
Native transform manifest: 6c7949a0e19e0b87cca33c5f8c05cca13eeb73a7b7014a1dc715d059a3c270d8.
Sheet: round-2.jpg, 444260 bytes, 1200 x 3707.
Two of three comparison rounds used. Round 1 and its verdict remain intact.

The sheet contains eighteen actual Scrapdome-yard App/Duel/renderer captures at
High and Performance. The loaded truck measures 3 m wide, 3.5 m high and 11 m
long. The actual Falcone F42 remains in the same scene for scale. Near and distant
Source/fitted pairs use identical cameras and the same real yard lighting.
The Source baseline is the intact picked body, tank and three valves with their
original palettes, placed by the exact current manifest matrices. There is no
previous runtime tanker. The fitted graph loads the cleared complete native GLB
through the actual tanker presenter; no runtime asset or catalog is installed.

The whole sheet uses full frames resized only. Labels sit outside the pixels.
There is no recolor, exposure change, cutout, synthetic background, scene masking
or texture edit. Higher paired/distant inspection angles clear the real yard
wall. The distant shot uses 3.4 times its actual-bounds fitting distance; it is
an elevated static readability view, not a production racing-camera or motion
check. Paired models use actual course ground points at lateral+8 and lateral+16.
Normal and health views return to the same native ground point at lateral+8.

## Capture result and self-observations

Final attempt passes all eighteen named views at private port 6331 with memory-only
saves, zero errors and two `Multiple instances of Three.js being imported`
QA-bundle warnings. All native-bounds framing, selected quality, actual yard,
supplied health, input and unchanged Duel state controls pass. Maximum absolute
projected corner coordinate is 0.860000000000072. The two loaded lamp meshes use
ff6610 at strength 6 for [0,0,0], and zero emission for recovery [1,0,0].
These are presentation-only health inputs; Convoy Raid gameplay is not covered.

My observations from the actual images: the full rigid truck reads larger than
the nearby car. The lighter tank contrasts with the dark cab and glass. Worn hubs
are distinct from the tyre rings; bright collars and small red handwheels are
visible close up. The open circular pipe ports remain visually prominent. The
opposite-side inspection shows the assembly against the tank face; the roof
inspection shows the raised yellow/black plate and its two small lamps. Lamp
on/off changes are visible as two bright versus dark tips, but they occupy few
pixels beside the bright plate. At distance, the broad cab/tank contrast survives;
small controls and mounting details are difficult to resolve. This is a self-check,
not an independent score or a claim that every art criterion passes.

Independent critic and Claude still need to judge proportions, attachment,
materials, distant readability, grounding, Wasteland consistency and lamp
contrast. No score, full Convoy/motion/frame clearance, public installation,
card completion or merge/release approval is granted by these captures.

## Recipes, changed QA expectations and evidence

QA recipe: tools/scenarios/convoy-tanker-art.mjs. Stage the unchanged cleared GLB
and manifest under lane .evidence/tanker-private-candidate before the QA build
clears .qa-dist. Both SHA/byte bindings are exact. The original source-palette
catalog, native 56-case assertions, recipe, fit and presenter remain frozen.
The QA two-lamp expected on value changes from b32904/2.2 to ff6610/6 because it
must check the independently approved real presenter. Two-lamp count, recovery,
input/state rules and the eighteen-view count are unchanged. The added quality
check reads the real renderer selector, app.ambientOcclusionEnabled. Added
native dimension and projected-corner checks reject a wrong or clipped fixture.

Capture command: node tools/browser-harness.mjs scenario convoy-tanker-art
--output-dir .evidence/2026-10-01/ART-FIT-TANKER/browser-round2-attempt4.
TANKER_ART_OUTPUT points to the stable private candidate directory.
Sheet command: python docs/board/looks/convoy-tanker/round-2-sheet.py
--captures .evidence/2026-10-01/ART-FIT-TANKER/browser-round2-attempt4
--output docs/board/looks/convoy-tanker/round-2.jpg.
The sheet recipe records dimensions and labels; final JPEG quality is 60.
Existing launcher controls pass 5 tests/14 evidence checks, memory-only controls
pass 39 checks and review-evidence controls pass 9 tests/319 checks. The private
build passes in 439 ms with its existing large-chunk warning. No full lane gate
or native assertion rerun is claimed by this bounded QA handoff.

Complete launcher logs and all attempts' reports are in integration
.evidence/2026-10-01/ART-FIT-TANKER/round2-comparison/.
Its captures/ folder holds all eighteen final unmodified 1280 x 800 PNGs, and
final-capture-receipt.json records their hashes. The lane retains original raw
captures/reports from every attempt. Attempt 1 caught a QA property read error;
attempt 2's paired camera was behind a wall; attempt 3's inherited world-X pair
shift overlapped the real car. Attempt 4 corrects private QA framing/grounding.
All camera changes were recorded before recapture. These are capture repairs for
one unchanged round-two candidate, not new fitting rounds.

Removed: replaced stale private candidate/lamp expectations, fixed review-camera
offsets and arbitrary paired world-X shifts. Round 1/verdict, licensed originals,
frozen native tests/Source, catalog, current public art, saves and signatures
remain unchanged. Earlier failed or occluded captures are used-once evidence
for the Director to delete after their verdict is recorded.
