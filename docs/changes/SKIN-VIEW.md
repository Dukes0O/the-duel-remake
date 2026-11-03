# SKIN-VIEW: Kestrel One wears her skin

Card SKIN-VIEW (Claude, UI). Design: `docs/HELI_WILDLIFE.md` sections 5, 6, 7 and 12.
Switch: `heli-skins` (dev), effective only with `helicopter` on. Drawing only: flight,
mission and save state are never changed.

## What changed

- `src/heli/heli-skin-view.js` (new): the seven paints on paint_white, paint_navy and
  paint_red (colours kept equal to `palettes.json` by the test); wildlife camouflage;
  the Barely News logo on both flanks of the TV skin (a patch built from rays cast at
  the hull, 4 mm off it); each piece of gear on its mount; grime from the four dirt
  levels; the heat camera inset. Paint and grime run on three shared copies of the
  paint materials, so every mesh shares them, and the model's own materials are put
  back exactly for stock paint with no grime, for a rank coat and for the switch off.
  Camouflage and grime are projected from the model's own axes (the model has no
  painted layout). Each kind of dirt shows first where its mask is strongest and
  spreads as its level grows, thicker low on the hull, over a thin film coloured by
  the kinds' shares. A change of coat and a wash fade over 1.5 seconds. Textures
  (camo, logo, the four masks) and gear models load once, when first needed and only
  with the switch on. No per-frame allocation in the steady state.
- `src/heli/heli-scene.js`: builds the skin view, attaches it to the model, calls it each
  frame with `view.skins`, and passes the worn skin's gear to `heliCameraPose`, so the TV
  skin's nose camera view (C, fifth view) draws. `render3d.js` needed no edit: the
  camera pose is made inside `heli-scene.js`, so the one line the card expected there
  was this one. New optional argument `skinTexture` (for tests).
- `src/heli/heli-ui.js` and `heli-ui.css`: the heat camera inset (bottom left, a thermal
  plan view with the nose up, warm people and, in a count, warm animals, with range
  rings); a frame and "NOSE CAMERA" label round the nose view; the status line now names
  the fifth view (it showed "behind" for the nose view because it counted four views).
- Gear fitting: drop sight, heat camera and zoom camera on the belly; searchlight on the
  belly half a metre aft of the heat camera (they share the mount); winch on
  `mount_side_right` turned half a turn about the vertical axis; nose camera on the nose;
  cargo net on the hook (the stronger hook is that model's heavy hook); the quiet rotor
  replaces the plain blades on the same hub. The water gauge (panel number) and the
  stretcher (drawn on the rescue line) have no model on the hull. The searchlight's beam
  is a soft cone, drawn only while `view.skins.night.lightOn`.
- `tools/test-heli-skin-view.mjs` (new, 273 checks), `tools/scenarios/heli-skin-view.mjs`
  (new browser look, an ordinary scenario).

## Checks

- `node tools/test-heli-skin-view.mjs`: 273 checks pass. It loads the real model and gear
  files with the real three.js types and fake textures.
- Browser look (private port, memory-only saves): all seven paints clean and at grime 80,
  each dirt alone at 80 (distance and close), each piece of gear, the heat inset, the nose
  camera view: 45 screenshots, 0 errors, 0 warnings. Sheet:
  `docs/board/looks/heli-skins/look-1.jpg` (named `look-1` so it passes the repository
  hygiene rule for tracked sheets), with `look-1-review.md`.
- No frame timing (Claude does that).
- Lane tier and `npm run build`: see Results below.

## Changed assertions

`tools/test-heli-mode.mjs`: `heli-skin-view.js` joins the list of drawing files (like
`heli-rank-paint.js`), because that test treats every other file in `src/heli/` as game
rules that may not use the page. Nothing was loosened for any existing file.

## Choices (for Claude)

- The logo sits on the flat flank panel behind the cabin (centre 1.42 m up, 0.12 m aft of
  the mast), not at the palette's door centre (0.72, 1.28, 0.78), which falls on the cabin
  window glass. Size is the palette's 0.5 m. Change `LOGO` in `heli-skin-view.js` to move it.
- Rank coats (logbook) are left to the logbook: no grime or gear is drawn on them.
- Grime is drawn on the three paint materials only (not skids, rotor or glass).

## Removed

Nothing replaced. The old `HELI_CAMERA_VIEWS[... % 4]` status-line lookup in
`heli-ui.js` is now `cameraName` (same result with four views).

## Results

Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, on the branch with
`integration/wasteland` at 926f6d26 merged in): 46 passed, 0 failed, 0 not run, 506 s.
It includes `test-heli-skin-view`, `test-heli-mode`, `test-heli-view`
and `test-repo-hygiene` (the rank paint and skin gear suites were not selected as unaffected). `npm run build`: built in 1.1 s. The heavy-job turn
rule made this builder wait and, twice, stop its own start when a later count passed two.
