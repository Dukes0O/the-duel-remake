# P4-SUMMIT

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-SUMMIT
    title: "Summit Run: the mountain epic"
    owner: codex
    lane: RACE
    size: L
    needs: [P4-TRACK-SCRIPT, P4-FIELD, P4-GRIP, P4-PIT, P4-DAYNIGHT, P4-SNOW]
    status: building
    claimed_by: codex-overnight-2026-10-12
    branch: codex/p4-summit
    flag: summit-run
    owns: [src/circuits/summit-run.js, tools/test-circuit-summit.mjs, docs/changes/P4-SUMMIT.md, tools/scenarios/summit-run.mjs, docs/board/looks/p4-summit]
    hooks: [src/circuits/index.js, src/feature-flags.js, start-preview.bat, src/race-field.js, src/game.js, src/track-script-course.js, src/race-field-driver.js, src/course.js, src/world.js, src/course-access.js, src/snow-world.js, src/screen-menu.js, tools/test-feature-flags.mjs, tools/test-preview.mjs, src/scene-lighting.js, src/render3d.js, src/camera-clearance.js, tools/test-reference-laps.mjs, tools/test-circuit-layouts.mjs, tools/test-wasteland-beta.mjs, src/sim-contacts.js]
    acceptance:
      - "Build docs/CIRCUITS.md section 5.4 in src/circuits/summit-run.js as a point-to-point road of about 14 km: sections A to G with their surfaces, six hairpins at the stated radii, three jumps, the tree-line pit lane, the light path along the road, the Gallery and Open Road split (avalanche itself in P4-AVALANCHE), the summit hut and observatory. Field of 6, all cars."
      - "Race time 6 to 8 minutes on Medium in a mid car. The pit-stop balance target in section 3.5 met and recorded. Frame cost within the usual limit, including night with snowfall. Then P4-FINISH-SUMMIT."

    overnight_design: "Director before code: build Claude5.4 actual52-piece open-road draft,720mclimb,sixhairpins,threejumps; derive scenic section/surface/light/pit from actual named-piece boundaries within permitted10percent fit. Avalanche coordinates remain exact: trigger10.0km,split10.1,slide10.42to10.58,rejoin10.9. Sixcars means5CPU,one native point-to-point run,own summit-run dev and noCombat. Reuse existing surface,pit,light,snow,kits,shortcut and tunnel paths. Narrow granted field/game hooks handle course-specific default count/open finish; branch driver/course/world hooks only for real Gallery/Open Road. No new test machinery or hidden-course frames."

    additional_scope: "Director before code: settled2600CR course-access id via existing normalization (fresh money/save review); additive summit-run dev catalogue/preview assertions only with old/new reason; opt-in authored mixed-winter terrain/flakes with full-winter default exact; native Summit defaultMode menu hook only. No testtolerance changes."

    review_scope: "Director grants mixed-winter lighting context, snowy Open Road material, and actual lateral Gallery roof checks in the named presentation hooks. Legacy tunnels and full-winter defaults stay exact. Existing reference assertions select closed circuits; all 27 cyclic targets remain, with Summit explicitly excluded because it is an open road. Record the reason for each changed catalogue or reference assertion. No timing on hidden dev art."

    catalogue_sync_scope: 'Director before edit: preserve actual Harbour union 2595735e release order and all 25 accepted switches. Append Summit after every current course and append summit-run dev to the existing beta catalogue fixture, with 26 switches. Keep production, QA isolation, defaults, thresholds and closed reference behavior exact; Summit is open and excluded from cyclic references.'

    gallery_contact_scope: 'Director before code, 12 October: native8367733b stops at Gallery first roof, s 10164.4984; actual roof underside is 5.056 m above road. Existing grounded contact intentionally omits y and treats it horizontally. Grant only _staticContacts in sim-contacts.js plus existing authored Gallery collider creation: roof colliders opt into vertical clearance and receive actual previous/current ground y when missing. Preserve shared points and every unflagged/legacy grounded path exactly; pillars/back stay solid and existing airborne behavior remains. Use existing sweepObstacle bounds, no geometry, driver, input, threshold, frame or new harness change. Existing Summit test proves real grounded passage and airborne roof contact; native strategies rerun honestly.'

    waiting_on: claude
    native_design_question: 'b7dd65eb: focused roof/contact regressions and 39 High/LOD placements pass. All three real original F42/.95/Medium/1989/4242 strategy runs finish without crashes: summer 276.7833 s, pit 290.2583 s, winter 262.9417 s. One legal 4 s service at 7004.2820 m. Race target 360–480, summer-minus-pit 4–8 and winter-minus-pit 2–5 fail; measured differences -13.475 and -27.3167. Existing pit spans roughly 529 m and limiter occupies 34 s including service. Source-only diagnosis found no within-scope defect. Claude must settle the actual mid-car/course/pit/surface design before more gameplay code; no driver-only slow profile or target change. Actual round-one art is next, separate from failed gameplay acceptance.'

    art_review_source: 7d51620ccad48a0b91e035c5361c2c6055616a50
    art_review_packet: 'p4-summit/docs/board/looks/p4-summit/round-1.jpg and round-1-review.md; 16 actual High/Performance views, 309,720 B, zero warnings/errors, memory-only, no frames. Exterior Gallery visible; Open Road readability weak, no fork acceptance. Production/native exact to b7dd65eb; one camera-only recipe correction. Claude review pending; no lane/build/merge acceptance.'
```

## Claude decision, 12 October 2026 (inbox, Claude answers; revised after review)

Mid car Falcone F42; race 270 to 330 s. Opt-in pit fields `limiterLength`
and `limitKph` in `src/pit-lane.js` (absent: today's behaviour, Tremblant
Snow exact); Summit uses 180 m at 80 km/h centred on the box, CPU estimate
from the limited stretch. New `warm-tarmac` on every asphalt piece of A and B
(gravel stays), tyre column `warm` with summer 1.0 and winter tuned .62 to
.88 (then winter top-speed share on warm .93 to .97 if needed), drawn as
asphalt, hint WARM TARMAC under .80 grip. At most six measured sets in the
inbox order (80 km/h, then 90, then road snow from piece 28 after the pit
straight, then the warm winter numbers). Holds lock
`surfaces`; hooks pit-lane.js and track-script-scene.js. Art round one hold:
Tremblant grove pines on B, Tremblant Snow snow and plough heaps,
Harbour-level night exposure, the accepted gallery kit, lit summit windows,
and a fork view.

## Director source scope before resumption — 12 October 2026

Resume only after Deep Save releases busy-game-files and GP existing releases gp-existing-field-width; acquire all locks together, including surfaces. Career has a real variant-cost question with Claude, so Summit is next available Phase4 work. Retain the older lane and exact52-piece layout/road length, gallery fork coordinates, six cars, one run, noCombat, own dev switch, immutable generation stage20. Own manifest summit-run/dev/2600/grandPrix/releaseOrder4/F42-Club-racing-line.95. Drop obsolete central registry/flags/price/preview/count edits, preserving accepted factory/Pay/Qual/Panorama/Deep source.

Additional exact grants: pit-lane.js optional limiterLength/limitKph bay and CPU estimate; race-field-driver.js normal driving outside that optional bay; race-surfaces.js warm-tarmac/tyre warm column; track-script-scene.js warm draws as ordinary asphalt with no overlay. Start180m/80kmh and warm winter.82/.97; preserve every legacy lane, road, service4s and tyre/surface path. Existing test-race-surfaces and test-pit-lane cover additions and legacy exactness. Explain additive SURFACE_KINDS and Claude's corrected270–330 timing assertion; strategy differences4–8 and2–5 stay exact. Actual measured sets (maximumsix, existing F42/Medium/.95/1989/4242 roles) wait for night, in Claude's exact order.

Art reuse grants: existing forest block in track-script-course.js and birch block in circuit-effects.js gain Summit-only placement ranges for dense sectionB thinning at TreeLine; smooth existing rock normals only on owned cloned geometry; existing snow soft banks/verges and Harbour-level Summit-only night exposure. In track-kits.js treat only the actual observatory opening materials/geometry as a lit slit and real hut windows; no whole-dome glow, new substitute model or geometry/collision change. Preserve the accepted Gallery asset/transforms and10m road clearance. Native roundtwo keeps the original16 views plus a genuine fork view, at night, no hidden-course frame measurement.

Shared test grants are limited to test-circuit-layouts closure/reverse-lap loops selecting closed circuits and test-reference-laps declared-seed target coverage selecting closed circuits; native catalogue coverage still covers ALL circuits including open Summit. Keep existing per-event publishers/generators and fixtures; no replay/world signature regeneration without its required reviewed difference. No new machinery. One completed source freeze/nearby lane/build/code review plus required paid-course save review; dev source handoff can precede deferred measured strategy/art acceptance, with the card open and failures honest. No release or push.

## Director append-only fixture scope before code — 12 October 2026

FAC-04 registration preflight confirms open Summit requires two new owned files when its dev flag is enabled in QA: tools/replays/courses/summit-run.json (one actual primary Duel case using the existing recorded inputs, actual30/60/144 fingerprints) and tools/fixtures/world-signatures/summit-run.json (actual scene hash and resource counts). Existing loaders discover them; preserve every prior row/byte. No reference-lap file: closed:false is excluded by the current declared target selector, not by a new exception. No central registry, base replay envelope or publisher change.

The existing test-world-composition --capture command checks baseline coverage before emitting a new row. Grant a TEMPORARY capture-only exclusion of ONLY missing summit-run from that coverage roster, using the existing --capture flag. Every other course's coverage stays required. Capture the real new scene, prove every old emitted signature equals its unchanged baseline, write only the new per-course row, then restore the guard file byte-exact in the SAME source change. Normal guards and the final tool source remain unchanged; no provisional fixture/stub, new command, general missing-row permission or machinery. Keep an honest initial-signature/visual-difference note: this is the new authored14km open course and approved Gallery/forest/snow arrangement; existing real round-one review and later night art verdict remain distinct from a source signature. No old signature is regenerated.

If the named Course geometry hooks invalidate shortcutSourceFingerprint, grant only the existing generator plus separate --verify-solvers and its generated-shortcut-presets.js output, conditional on all15 original entries/order/numeric paths/version2 staying byte-identical. Do not edit the fingerprint assertion or any expected world/replay value. Use these existing tools only after Summit acquires all its locks; current GP/Save/Surface source gates retain priority and ownership until green handoff.
## Director release-context assertion grant — 12 October 2026

The accepted Panorama release now pins all registered manifests to four literal released ids in test-release-tremblant.mjs. Adding Summit dev correctly changes that registry, while production keeps precisely those four released events. Grant ONLY that literal-roster assertion and its label: compare the released-on manifest projection to the unchanged literal four ids in the unchanged order. Retain all generic registry ordering, explicit switch selections, production COURSE, access, price, event-key, race-only and historical-save assertions. Summit's independent acceptance still requires its appended dev manifest. No runtime, fixture, expected hash or tolerance change. Sync the actual clean Panorama/Tollkeeper integration context before the single corrected canonical lane/build; ordinary reviewer confirms the exact assertion delta and source union. Existing Summit runtime/save reviews stand when their reviewed bytes remain exact, apart from disjoint accepted release/game context.

## Director additive warm catalogue correction — 12 October 2026

The original corrected32cd gate completed318/319, one failure, zero unrun, in2170.3812s. Its actual Deep surface test expects the old five circuit kinds and, in the next assertion, their five literal grips. Warm tarmac is the approved sixth kind. Grant ONLY those two literal arrays and the group label in tools/test-deep-surface.mjs: append warm-tarmac and its summer grip1, preserving all five original kind/order/value entries. Retain every sea-floor exclusion, asphalt readout, all-car drive/boost/tyre/gravity/landing and outside-zone/switch-off assertion exactly. No production, fixture, expected fingerprint or tolerance changes. Record the real failure, get same-reviewer confirmation of this actual diff, then one fresh original nearby lane and build on frozen source. Existing production/save review stands on unchanged bytes. No duplicate fixture or generator run.

## Director shared-file handoff — 12 October 2026

Actual bab5ca92 is clean; the final correction is the Deep warm-surface test catalogue, with no outstanding App/main/game/render edits. Release busy-game-files to FIX-FOOT-MOUSE for the bounded App._bindKeys repair Kyle requested. Summit may finish its frozen source/test handoff with surfaces and gp-existing-field-width held; do not make new busy-game-files edits until reacquiring that lock after the mouse handoff. This does not claim its pending gate is green or change its acceptance. Both private lanes retain exact sources; disjoint clean merges reuse their original gates.

## Source handoff after mouse fix — 12 October evening

Frozen bab5ca92987369051596b7b1ff0b13dd80447406 passes 319/319, jobs4, no failures/unrun; build1479.6255ms, ordinary review clear, unchanged runtime save review nine fixtures/286 assertions. Integrated without conflicts after FIX-FOOT-MOUSE. P4-SUMMIT-RUNTIME is complete and unblocks only runtime consumers (Snowmen/Avalanche/Yeti). This whole card remains open for actual strategy acceptance and round-two art; no native or art pass is claimed. Runtime locks are released; reacquire before further source changes. Older retained lane stays.

## Claude answers

Formal art round-two request (12 October evening): retained lane C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-summit/docs/board/looks/p4-summit/round-2.jpg and round-2-review.md. Sheet365471B, SHA2562b90bfc73e6ed145be49f32ced83925b7d4b4483697970e6a72196f0850b0388; frozen art-only f27f46cb797bc30ade6c61d64869c5dcdfec5549. Actual18 High/Performance views preserve the original16 plus two real approach views showing GALLERY/OPEN ROAD signs. Both added camera eyes are s10002,18m above actual ground,tunnel=null; private24735,memory-only,zero issues/warnings/errors,no frames. Accepted runtime remains da75 exact. R1hold facts are folded into the final review and only its consumed JPEG is removed. Grove is denser, soft heaps/hut light visible; Open Road surface still low contrast at sheet scale and observatory slit small. Root inspected the actual sheet; please judge round2 of3 without inventing fork/strategy acceptance. Existing art-only nearby/build/code review are pending separately. No new strategy set ran; maximum-six measurements remain deferred in your prescribed order.

## Claude answers (13 October)

**Claude verdict, Summit art round 2 of 3 (13 October 2026, 08:40): not yet. Round 3 is the last; fix these.**

The desert, pines and tree line are good and stay as they are. The snow half reads flat and unfinished at sheet scale:
1. **Gallery shed:** it reads as a black blob. Show a concrete snow shed: pale grey roof slab on visible pillars, an open downhill side, and warm lamps inside so the tunnel reads at night.
2. **Snowfields:** one flat blue tone. Add the existing snow surface variation (packed tyre tracks, wind-blown drifts), dark rock outcrops on the slopes and orange-tipped snow poles every 50 m along both edges. The poles also show the road at night.
3. **Road edge:** the rounded banks both sides read as a gutter. Lower them and break them into heaps with gaps, so the road looks cut through snow, not laid in a trough.
4. **Summit:** the hut and observatory need lit windows as designed. The dark objects beside the road in the summit view must sit on the ground (check grounding), or go.
5. **Open Road:** add a darker packed-snow surface tone so it reads apart from the Gallery at the fork.

Same views as round 2, plus one night view from the Ledge with the town lights below. No frame check. waiting_on is cleared.

## Director final Summit art resumption, 13 October

Resume the older retained p4-summit lane with a clean automatic current-integration union. Round3 is the final art round. Own only src/circuits/summit-run.js existing kitLook/glows/snowWorld/scenery visual values, src/snow-world.js narrowly course-authored visual snow variation and shorter broken heap geometry/50m orange-tip poles, src/world.js only roadBranchMaterial's authored packed-snow contrast, tools/scenarios/summit-run.mjs final sheet/added night-Ledge photography, existing test-circuit-summit/test-snow-world visual contracts and change/final-review note/sheet. Do not edit track-kits (live-edge lane owns it), render3d/App/Game/progression (Yeti holds core), terrain/surface tables/collision/controller or simulation seeds/road/layout values. Ask before any extra hook. Existing helper paths only, no new machinery/model/bitmap assets. Preserve exact desert/pines/tree-line and every other course's default material/geometry behavior; new purely visual values are Summit-authored. Use existing night-wash/glows/window masks for pale concrete shed/visible pillars/warm lamps and hut/observatory lights, actual ground points for dark outcrops, existing snow variation/tyre-tracks plus lower gapped heaps/poles and darker Open Road. Do not fake a model or final art acceptance. Keep actual route positions/read-only snapshot guards and original18 views; add one actual night Ledge/town-light view, final JPEG<=500KB. No frame timing. Preserve the separately granted Gallery rejoin correction once it lands rather than reintroducing removed tiles; no new source tuning of road strategy targets. One original unfiltered nearby/jobs4/build afterfreeze and one ordinary source review; Claude alone judges final round3. At30minutes per visual/tool problem record actual limitation and move, no fourth round. Root owns all shared metadata/merge and retains this older lane. Native strategy timing remains separate pending Claude's actual route-value answer.

## Director existing snow and grounded light hooks, 13 October

Grant world.js existing winterTerrainMaterial call only an optional course-authored Summit snowWorld.variation value, with snow-world.js optional variation handling and every default/other-course shader/cache key behavior exact. Leave mainroad overlayMaterial and track-script-scene.js untouched; existing packed tyre tracks stay. The granted branch-material hook may darken only Summit's authored Open Road visual tone.

Grant src/night-glows.js only optional course-authored ground-light rows for the final Summit night view, using actual course positions and renderedGroundHeight(requireSurface:true), with no guessed-height/floating fallback for these new rows. These grounded visual lights represent the distant town below; retain existing piece/street/waterside lights, no model asset, simulation/collision/terrain/seed/core hook or extra light owner. Record actual grounded positions/elevations in the final sheet's facts. If the actual terrain/view cannot show them within30minutes, record the limitation; never substitute a painted sky/light composite or claim an unseen town view. Add only corresponding existing night-glow/snow/Summit acceptance; no new harness. Existing snow-rock meshes use their actual min bound and drawn ground; lower/fix only their Summit visual anchoring if actual footprint evidence requires it, or omit ungrounded dark extras as Claude permits.
