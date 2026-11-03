# WILD-VIEW: animals beside the road and from the helicopter

Card: WILD-VIEW (Claude, UI lane; lock `busy-game-files`, held only for the one call in
`src/render3d.js`). Design: `docs/HELI_WILDLIFE.md` sections 3.3, 3.4 and 11. Switch:
`wildlife` (dev). With it off nothing is drawn, no model is requested and nothing else changes.

## What changed

- **`src/wildlife-models.js` (new).** The one list of species that have a passed model:
  deer, moose, black bear (cubs reuse its file at half size), beaver and eastern wolf. Each row
  names the file, the Idle and Walk clips, a scale and how fast the animal runs when startled
  (and how much faster than normal its Walk clip plays). The wolf tracks decal and every species
  without a model are simply absent. A new species is one more row. `APPROVED_MODEL_IDS` is what
  placement (`availableSpecies`) and the wildlife count take as the approved list.
- **`src/wildlife-view.js` (new).** Draws the animals. Models load lazily, one species at a time,
  only when the switch is on and the course has animals. Each herd is its own group inside one
  `Wildlife` group that sits in the scene beside the cars, never in the world, and the world
  builder does not know it exists. Animals idle until a car comes within 35 m, then turn away from
  the road and trot or bound 10 to 20 m into cover (the first standable spot that is not a road,
  wall or lake) with the Walk clip played faster, then idle again. Birds take off and fly away and
  do not come back that race (no bird model exists yet; the code and its tests are ready for one).
  Fade out beyond 250 m in a race and 400 m from the helicopter; at most 12 drawn, nearest first;
  skinned clones share the model's geometry and textures (each has its own material so one can
  fade); no per-frame allocation; animals not drawn are not updated; animals stand on the drawn
  ground height (`renderedGroundHeight`). The seed is course id, play day and the race number of
  that day (`wildlifeSeed`), never the race generator.
- **`src/render3d.js` (one call, one line to refresh the scene, one to dispose).**
  `wildlifeView.update({...})` once a frame with the switch, the course, the app's run id, the
  helicopter's view and the car meshes; it only reads them. The same call draws the helicopter's
  view: the race's spots as that race would be next, plus the count's animals while a count is
  active. No change to `heli-scene.js`, `heli-ui.js`, `heli-ui.css` or `heli-skin-view.js`.
- **The count honours the approved list.** `surveyCourses`, `surveyJob` and `planSurvey` in
  `src/heli/heli-survey.js` take `approved` (the models' ids). A course is offered only while one
  of its targets has a model, the species is picked among those, and the square's other animals
  and its rare animal also need a model. With no list (or every target approved) every answer is
  exactly what it was. `surveyJob` returns null when nothing can be counted. Today that gives
  Tremblant Woods and Tremblant Snow; Panorama Ridge and Summit Run join by themselves once
  kangaroo or bighorn models exist.
- **Wiring.** `src/app.js` passes `wildlifeApproved` to the helicopter session; `heli-session.js`
  hands it to the board's job and the count's plan (and adds each animal's species to the view of
  the count, which the drawing needs); `heli-jobs.js` passes it through `surveyJobOf` and
  `finishSurvey`.
- **`tools/scenarios/wildlife-view.mjs` (new).** The browser look: switch off draws nothing and
  loads nothing; a race at Tremblant Woods draws the animal, an approaching car makes it run
  10 to 20 m; the helicopter over the count square draws the count's deer and moose.

## Round 2: the animals must be seen

- **Race herds stand in the open, near the road.** `createPlacementChecker` in `src/wildlife.js` gets an `open` test
  built from the course's own trees (`course.features.trees`, the trees the world draws, so no renderer is needed): no
  trunk within 6 m, and no tree crown (3 m) on the last 40 m of the line to the road edge. A herd's middle is tried 15 to 35 m
  from the road edge in open ground first, then anywhere in 15 to 70 m in open ground, then, so a thick forest still has
  animals, as before. The 15 to 70 m band the placement test checks is unchanged. At Tremblant Woods and Snow over 40
  races each, 90 per cent or more of herds stand within 35 m of the edge and in open ground (the test says so).
  Not done: preferring the side the driver faces or the outside of a bend.
- **The count's animals stand in open ground.** `_surveyStand` in `src/app.js` asks the checker for `open: true`;
  `planSurvey` and its tests are unchanged. Over 120 days at both courses 95 per cent or more of the count's animals stand in
  open ground.
- **A ring for every counted animal.** At the shutter click (the animal's `counted` flag in the count's view) a thin pale
  ring (3.3 to 4 m) is drawn on the ground where the animal stood. It swells and fades once over 0.9 s, then stays at
  30 per cent opacity until the count ends. It is drawn through grass and trees on purpose, is not part of the 12-animal
  cap, fades with distance like the animals, and stays where it was when the animal runs. View only.
- **Pictures** (integration `.evidence/2026-11-03/WILD-VIEW/`): `race-chase-36m.png` (a deer in the open beside the road in
  the normal chase view at about 85 mph), `race-chase-startled.png`, `heli-count-rings.png` and
  `heli-count-rings-pulse.png` (110 m up, normal view, four rings and the herd's animals), `heli-count-ring-close.png`.
  Honest limit: an animal is small at those ranges (a deer is about 40 pixels tall at 36 m from the car, a few pixels
  from the helicopter at 110 m up and 190 m out). From 110 m the count reaches only animals within 60 m sideways, which lie
  under the behind camera's lower edge, so the pilot sees counted animals mainly as rings once past them.
- **Scenario.** `tools/scenarios/wildlife-view.mjs` now drives by at racing pace and flies the count toward a herd, past
  it and back to look at it.

## Assumptions to review

- **Play day** in a race is the calendar day (a whole number of days), because the save's
  `playDay` only moves for pilots; the race number is counted in the view from the app's run id
  (memory only, nothing saved: section 10).
- **Helicopter startle** uses the count's own numbers: below 60 m up, within 100 m (not 35 m), so
  what you see run is what the count treats as scared. Cars use 35 m.
- **Birds perch on the ground** until a bird card gives tree and post spots; no bird model exists.
- Animals draw in every race mode on a course with placement (not arenas, pits, practice or
  salt flats, which `placeWildlife` already leaves empty) and never in menus or the Deep.

## Checks and results

- `node tools/test-wildlife-view.mjs` (new, 3,060 checks after round 2): the table matches the files and clips on
  disk; the count offers only approved animals and gives today's answers when all are approved;
  the idle or flee decision, the fade, the 12-animal pick, facing and a bird's flight as pure
  functions; drawing never uses the race generator or assigns race state; one call in render3d.
- Existing `test-wildlife.mjs`, `test-heli-survey.mjs`, `test-heli-skin-session.mjs` and
  `test-heli-skin-gear.mjs` pass **unchanged**.
- Browser look (`node tools/browser-harness.mjs scenario wildlife-view`): passed, 0 errors. Off:
  no animals, no model requested. On: a bear drew beside the Tremblant Woods lake and ran 10.9 m
  when the car came within 20 m; from the helicopter 110 m over the count square 9 animals drew
  (deer and moose) and stood on the ground. Pictures are in the integration folder's
  `.evidence/2026-11-03/WILD-VIEW/` (to be deleted after review).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`), after round 2: 86 suites passed, 0
  failed. (Round 1: one failure, `test-heli-mode`'s import guard read a comment that named a helicopter file; reworded.)
  `test-wildlife.mjs` passes unchanged. The replay and world-signature guards passed (the world builder is not touched).
- `npm run build`: passes (the usual large-chunk notes only).
- Two of the laptop's heavy slots were busy when the browser look started (it began with two jobs counted, not one); no
  frame timing was done.

## Changed assertions

None.

## Removed

Nothing replaced. The count's course list no longer assumes every species has a model.

## Not done

Frame timing (Claude's step). Bird perch spots and bird models. Animal calls (WILD-RACE-SOUND).

## Review (3 November, Claude)

One independent review. One real fault, fixed: a new plan (leaving the helicopter, or another course) left the count's animals and rings in place, so they could stand in the next race. The plan change now clears them; a source check in test-wildlife-view guards it (3,061 checks pass). Minor points not taken: a few small per-frame objects (ring look, bird flight, key strings) and switch-off hiding rather than freeing one race's animals; both bounded.
