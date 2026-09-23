---
task: VIS-01
status: focused checks complete; integration gate pending
kind: visual feature
flag: wasteland2
player_facing: yes
---

# VIS-01 pooled combat flipbooks

## What changed

- Flagged Wasteland combat uses the accepted fire, explosion, smoke and
  muzzle-dust sheets. UVs advance left to right, then top to bottom. The
  transparent planes show the first frame even when the race is paused.
- One combat-only pool preloads the four sheets once and builds its meshes,
  materials and geometry before the first hit. It owns and disposes those
  textures. Player and all three CPU wrecks have separate effect slots and
  use their recorded wreck sites.
- The renderer prepares the pool during race setup. If any sheet is missing,
  the existing CMB-01 procedural wreck and combat burst effects remain in
  use. Ordinary crashes and flag-off Wasteland keep their existing visuals.
  The atlas adds no lights.
- VIS-02 owns persistent low-armor smoke, fire and plate loss. This card
  handles hit, muzzle and temporary wreck effects only.

## Evidence

- Independent acceptance commit `ab9398b` supplied nine focused tests.
  `node tools/test-combat-effects.mjs` passes 10/10, including UV order, fixed
  resources, disposal, first paused frame, separate later-CPU position,
  missing-sheet fallback, and ordinary and flag-off controls. Follow-up
  assertions verify that expired sparks stop drawing and that planes face
  the current main or rear-view camera during each pass.
- `node tools/test-combat-armor.mjs` passes 19/19;
  `node tools/test-combat-modules.mjs` passes 5/5.
- `node tools/check-art-intake.mjs` reports all seven accepted art files
  present with zero failures.
- The private `combat-effects` browser scenario passed High and Performance
  with 12 screenshots and zero page warnings or errors. It checked muzzle,
  first and aged blast, first paused player wreck, 60% armor recovery,
  later-CPU wreck position and a constant scene light count. The inspected
  images show the blast and fire at the expected cars with the race HUD
  visible during the paused first-frame shots. The report is under
  `.qa-dist/browser-output/combat-effects-2026-09-23T22-39-30-907Z/` in this
  isolated worktree. This final browser run exited successfully. An earlier
  run wrote a pass report but hit a temporary Chrome profile cleanup error.
- `node --check` on changed JavaScript and `git diff --check` pass.

## Remaining gate

Run the lane suite, pinned replays, production build and the
same-route 10% combat frame-cost comparison after CMB-02 releases the heavy
test lane. Re-run the private browser scenario on the merged CMB-04/CMB-08
renderer because those cards also touch `src/render3d.js` and CMB-04 touches
`src/combat-scene.js`.
