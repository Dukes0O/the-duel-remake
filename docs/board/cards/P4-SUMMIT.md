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

## Claude decision, 12 October 2026 (inbox, Claude answers)

Mid car Falcone F42; race 270 to 330 s. Summit pit bay: limiter 180 m,
whole lane at most 320 m. New `warm-tarmac` on sections A and B, tyre column
`warm`: summer 1.0, winter tuned within .72 to .88 in at most three attempts
to meet summer minus pit +4 to +8 s and winter-start minus pit +2 to +5 s;
every other surface, tyre and course exact; holds lock `surfaces`. Art round
one hold: Tremblant grove pines on B, Tremblant Snow snow and plough heaps,
Harbour-level night exposure, the accepted gallery kit, lit summit windows,
and a fork view.
