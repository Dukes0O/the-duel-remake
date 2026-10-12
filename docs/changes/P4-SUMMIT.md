# P4-SUMMIT

Status: source build in a new isolated lane; no release.

## Design before code

Build Claude's exact 52-piece point-to-point draft in CIRCUITS.md 5.4.
Director reserves authored stage 20 for Summit before any capture; Claude's
Tremblant Snow owns stage 19. Stable id summit-run stays unchanged. The
registry union appends Summit after Snow when that actual source lands.
Keep the six hairpin radii (16, 16, 18, 16, 15, 15 m) and three authored
crests (2.5, 2.5, 1.5 m). Distribute 720 m of climb through the seven scenic
sections: 120, 220, 30, 200, 0, 150, 0 m. Derive section, pit and light
markers from the actual named pieces. The draft distances differ from the
section overview; Claude's confirmation is requested through the inbox.
Keep avalanche trigger 10.0 km, split 10.1 km, slide 10.42–10.58 km and
rejoin 10.9 km exact. Allowed fitting stays within 10 percent of the draft.

Summit is one run with six cars. All cars can enter. Append stable id
summit-run to the authored registry, gated by its own dev switch and noCombat.
Use the existing seeded field, native checkpoint finish, surface rules,
Tree Line Pit Straight, distance lighting, snow presentation and approved
Gallery, summit hut and observatory kits. No simulated lap completion.
The protected Gallery remains a real road beside the faster Open Road; use
the existing shortcut road model and real collision/tunnel envelope.
Avalanche rules, snowmen rewards and yeti sightings belong to their cards.

Director grants narrow shared hooks in race-field.js, game.js,
track-script-course.js and race-field-driver.js, plus course.js/world.js only
where the existing branch model needs authored script support. Existing
modes and circuits retain their defaults.

## Acceptance before implementation

The focused card test was written before the course source. Its first run
awaits shared capacity; no failing run is claimed. Checks cover
repeatable script geometry, 13–15 km road length, 720 m endpoint climb,
six hairpin radii, three crests, named tree-line pit, native point-to-point
six-car field, surfaces and light progression, real branch roads and the
165 m separation for road points more than 750 m apart. Race time, pit
strategy, pictures and actual frame checks remain measured acceptance:
Medium mid-car 6–8 minutes; winter pit 4–8 s faster than summer throughout;
starting winter 2–5 s slower than the pit choice; busiest playable view
High and Performance delivered p95 at most 18.5 ms, construction under 1 s.
Under Kyle rule 9 no frames run for this hidden dev card; that measurement
belongs to the later finishing/release step and is deferred, not passed.
No measure is claimed until observed. Art sheets go to Claude.

## Source progress

The 52-piece road, six-car start, native finish, real branch road and physical
snow shed are implemented as source. The shed collider follows the approved
Blender recipe's pillar positions, roof height and uphill back; approved Gallery,
hut and observatory meshes supply the art. Existing pit cues (limiter, wrench,
GO) and existing field/start/jump sounds apply; no new event cue is invented.

Director's additional grants cover stable Summit access at 2,600 CR,
partial winter coverage in snow-world.js, default Race setup/briefing in
screen-menu.js and the additive feature catalogue assertion. Access uses the
current course entitlement schema; money/save review remains required.

No test, full race, pit strategy, browser picture or art score is claimed yet.
The original Qualifying lane remains untouched; its scoped final lane owns
the closed-course qualifying guard and retained field-grid origin.

## Initial source review corrections

Root's independent review found dry-looking Open Road material, global winter
lighting on the desert and a range-only Gallery tunnel query. These are fixed
forward. The branch uses the actual winter surface material on its own clone.
Lighting receives readonly course/distance context: zero winter weight returns
the original base object exactly, full weight keeps the previous transform.
Gallery queries use its actual 7.8 m roof half-width; the Open Road at -18 m
is outside it. Gallery roof cameras use the flat 6.292 m underside. Legacy
tunnel range queries and arch constraints remain unchanged. The Director grants
these narrow scene-lighting.js, render3d.js and camera-clearance.js hooks.
Card tests add real dry/snow/material/roof controls; runs still await capacity.

## Actual Gallery asset correction before code

Root approved replacing the unrun 6 m roof assumption with exact agreement
with the current approved GLB, keeping the existing 4.5 m road headroom.
Its thick fascia reaches y=4.5964661 m (5.0561127 m at the actual 1.1 scale).
The four actual posts lie at x=+/-5.7000008, z=+/-2.4444814 m: at this tile
scale they stand 7.333444 m before/after the tile centre, not at its centre.
Use the actual post/roof/back bounds in course metadata, transform each by
the same placement frame as the actual model, and bind the camera ceiling
to that same underside. Physics colliders enter obstacles only: the approved
GLB supplies the picture, with no duplicate primitive wall render.
The real asset test must detect the old centred-post and 6.292 m ceiling
assumptions. The asset and unrelated assertions remain unchanged.

## Bounded road fit before code

The first focused check retained the 165 m requirement and failed at 148.7805 m
between the Engineer approach/return. The real kit test then failed clearance:
Gallery narrowing began at actual s10,299, leaving the first tiles on the
12 m road. No assertion or clearance rule was waived.

Fit within Claude's allowed 10 percent: each post-hairpin straight shortens
by 10 percent, each exit kink turns 10 percent more, and Engineer's hairpin
angle moves 172 to 170 degrees. All six radii stay exact. The remaining
pre-Gallery straights scale by 0.9794965749 to place narrowing at s10,100,
keeping split/avalanche coordinates exact. Total is 14,219.9546 m; source
inspection of all native 2 m samples finds a 167.6946 m minimum for pairs
more than 750 m apart. This is no focused/native/kit acceptance pass.
The Gallery pictures and physical inputs still use the actual approved model.

The exact fitted lengths and angles are recorded below before strengthening
or rerunning the tests. Pieces are the one-based numbers in Claude's draft.

| Piece | Before | After |
| --- | --- | --- |
| 1 | 470 m | 460.3634 m |
| 3 | 380 m | 372.2087 m |
| 5 | 370 m | 362.4137 m |
| 7 | 340 m | 333.0288 m |
| 9 | 630 m | 617.0828 m |
| 11 | 390 m | 382.0037 m |
| 13 | 310 m | 303.6439 m |
| 14 | 420 m | 411.3886 m |
| 16 | 190 m | 171 m |
| 18 | 560 m | 548.5181 m |
| 20 | 210 m | 189 m |
| 22 | 570 m | 558.3130 m |
| 24 | 170 m | 153 m |
| 26 | 370 m | 362.4137 m |
| 27 | 560 m | 548.5181 m |
| 29 | 610 m | 597.4929 m |
| 31 | 390 m | 382.0037 m |
| 33 | 170 m | 153 m |
| 35 | 590 m | 577.9030 m |
| 37 | 520 m | 509.3382 m |
| 45 | 140 m | 126 m |
| 49 | 160 m | 144 m |
| 17 | 54 degrees | 59.4 degrees |
| 19 | 172 degrees | 170 degrees |
| 21 | 47 degrees | 51.7 degrees |
| 25 | 50 degrees | 55 degrees |
| 34 | 53 degrees | 58.3 degrees |
| 46 | 38 degrees | 41.8 degrees |
| 50 | 52 degrees | 57.2 degrees |

The separation check now uses every native sample (about 2 m), keeping the
same >750 m exclusion and >=165 m target. The earlier 20 m sampling missed
an undersized candidate; denser coverage closes that gap without new machinery.

## Changed assertions

The feature catalogue grows from 23 to 24 entries only for summit-run dev.
The dev-state list gains that same name. All existing state checks remain.
Preview still requests every dev switch except career-backup; appending
summit-run satisfies its existing computed list. No threshold changes.
The authored registry assertion grows from three ids/stages to four, adding
Summit. Closed-loop closure and reverse-lap driving checks now apply to actual
closed definitions only, with their original assertions and tolerances intact.
All four courses still receive registry, pricing and scenery checks; Summit's
card adds the actual open endpoint and one-run checks.
Two reference assertions now apply to actual closed authored definitions;
Summit gets an explicit no-cyclic-reference assertion. The publisher already
excludes closed:false. All 27 closed targets and published keys stay unchanged.

## Removed

None. This appends one dev course and bounded opt-ins to existing owners.
