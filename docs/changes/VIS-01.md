---
task: VIS-01
status: ready-to-merge
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
  `node tools/test-combat-effects.mjs` passes 12/12, including UV order, fixed
  resources, disposal, first paused frame, separate later-CPU position,
  missing-sheet fallback, and ordinary and flag-off controls. Follow-up
  assertions verify that expired sparks stop drawing, planes face the
  current main or rear-view camera, and sheet uploads and an offscreen mesh
  draw happen once before visible effects. First visible UV frames are written
  when the pool is built, and its preparation draw uses the live scene's fog
  and environment settings.
- On rebased integration `d714317`, `node tools/test-combat-armor.mjs`
  passes 19/19; `node tools/test-combat-ramming.mjs` passes 13/13;
  `node tools/test-combat-modules.mjs` passes 5/5. The pinned replay command
  passes 162 checks. The production build passes with the existing Vite
  large-chunk advisory.
- `node tools/check-art-intake.mjs` reports all seven accepted art files
  present with zero failures.
- The private `combat-effects` browser scenario passed High and Performance
  with 12 screenshots and zero page warnings or errors. It checked muzzle,
  first and aged blast, first paused player wreck, 60% armor recovery,
  later-CPU wreck position and a constant scene light count. The inspected
  images show the blast and fire at the expected cars with the race HUD
  visible during the paused first-frame shots. The report is under
  `.qa-dist/browser-output/combat-effects-2026-09-23T23-33-08-188Z/` in this
  isolated worktree. This browser run exited successfully. An earlier
  run wrote a pass report but hit a temporary Chrome profile cleanup error.
- In the private browser fixture, the first blast initially took 73 ms in
  High and 60 ms in Performance, against nearby 8–10 ms and 5–8 ms frames.
  Uploading the four sheets and drawing the fixed pool offscreen once cut
  the final first blast to 5.2 ms High and 7.6 ms Performance. Final first
  player wreck draws took 40.7 and 33.1 ms; later-CPU wreck draws took 43.7
  and 41.8 ms. The active wreck did not add a shader program or texture.
  The one-time atlas preparation took 172 and 210 ms after loading in this
  synthetic race, which forces the race past its normal countdown.
- The exact-current 120-frame real-RAF comparison kept p95 at 16.8 ms in
  both quality settings. With the atlas, the first armored wreck reached
  100.1 ms High and 50.0 ms Performance, with one frame over 33 ms in each.
  A temporary procedural fallback on the same rebased source reached
  183.4 and 66.5 ms, with one and two frames over 33 ms. The temporary
  fallback edits were restored before the final tests and build. The atlas
  improves the inherited first-wreck hitch in this controlled comparison;
  one outlier frame remains. Reports are under
  `.qa-dist/browser-output/combat-armor-frame-pacing-2026-09-23T23-31-12-143Z/`
  and `.qa-dist/browser-output/combat-armor-frame-pacing-2026-09-23T23-32-05-195Z/`.
- An exact 189-suite lane attempt stopped by request after 91 suites, all
  green to that point, so it is incomplete. The user asked to avoid another
  broad lane run; the Director will run one broad gate on the final release
  candidate.
- `node --check` on changed JavaScript and `git diff --check` pass.

## Integration check

Re-run the private browser scenario on the merged CMB-04/CMB-08 renderer
because those cards also touch `src/render3d.js` and CMB-04 touches
`src/combat-scene.js`. The final release candidate needs the Director's
broad gate.
