# GFX-00 — Blender to game fighter pipeline

status: ready-for-independent-review

The dev-only Wasteland renderer now loads a retained Blender fighter through
Three's GLTFLoader and plays its bound idle, walk and knockdown clips. The
existing primitive figures remain available while the asset loads or if loading
fails. The feature switch stays `wasteland2: dev`; this card does not promote
the crew family to beta.

## Implementation

- Blender 4.5.13 LTS script and editable `.blend` retained with a self-contained
  GLB. Blender Z-up/-Y-forward is converted once by the exporter to Three
  Y-up/+Z-forward. The standing model is approximately 1.83 metres high.
- One vertex-coloured material, 7,708 near triangles, no external textures.
  The silhouette, blue-grey jacket, tan vest/scarf, olive cargo trousers,
  boots and hair/beard are a Rook pipeline study.
- Lazy loading starts once only for an active, flagged Wasteland scene.
  Pending/failed loads retain the primitive fallback. Late loads are disposed.
  Each visible fighter has its own skeleton and AnimationMixer.
- The mixer samples simulation time rather than render-frame elapsed time.
  Walk selection uses simulation-authored planar speed. Knockdown uses
  simulation knockdownRemaining when available.
- The local body is omitted at its first-person eye and is retained for a
  distant camera. No race, career, reward or save values are written.
- The comparison tool composes recorded source images and retains camera,
  pose, source paths, asset hash, implementation commit and measured counts.
  Its reference column repeats the source's standing views beside motion
  samples; the source has no walking or knockdown reference.

## Evidence

Implementation observation commit: `a76d79d`.
Contact sheet: `docs/board/looks/test-fighter/round-1.png`.
Provenance: `docs/board/looks/test-fighter/round-1.json`.
Raw images, capture counts and browser report are retained in the same folder.

- Independent red acceptance suite was committed first at `ed739a3`.
- `node tools/test-rigged-fighter.mjs`: 14 checks passed after the review fixes and final capture.
  It checks the actual bound geometry and visibly deforming clips, budgets,
  clock, independent skeletons, fallback, gating, first-person hiding,
  resource cleanup, combat hook and contact-sheet provenance. Review regressions
  added at `2e066bd` also prove stopped production fighters select identical
  GLB bones at 30/60/144 FPS and evidence images survive checkout relocation.
- `node tools/test-onfoot-figures.mjs`: passed; no assertions changed.
- `node tools/test-replays.mjs`: 162 checks passed across 18 cases,
  16 events, eight categories, three FPS settings and three runs.
  Ordinary replay fingerprints are unchanged.
- `node tools/browser-harness.mjs scenario rigged-fighter`: passed on
  private port 58742, memory-only saves, 18 captures, zero warnings/errors.
  It uses the production combat hook and loaded body, then captures matched
  front/side/back poses with the actual High compositor and Performance draw.
- Camera: 576 × 640, 28-degree vertical FOV, five metres, target Y=0.9.
  Idle/walk sample 0.25 seconds; knockdown samples 1 second. Prone cameras
  centre on the body's horizontal midpoint; exact targets are in provenance.
- Twelve independent rigs measured 12 draw calls and 92,496 triangles for
  the fighter-only colour pass in both settings. This excludes floor,
  shadow passes and post-processing; per-capture totals are also retained.
- No world signatures were regenerated. No assertion was weakened.
- The four existing on-foot suites passed: core movement (9), transitions (8),
  race interactions (3), and primitive figure checks. Test assertions are unchanged.
- Required lane/build gate and independent code re-review are pending the
  Director's assigned checkers. The independent art review remains on integration
  as round-1-review.md; the visual asset is unchanged by these review fixes.

Visual checks found and corrected cropped prone views and raised walk
keyframes. The final authored keyframes plant the lowest deformed vertex at
ground; the matched captures were regenerated after both corrections.

## Review corrections

The original renderer inferred locomotion from the last rendered position.
Moving two simulation steps and stopping could therefore show walk at 30 FPS
while showing idle at 60 FPS. The authorized narrow onfoot.js hook now records
actual planar displacement divided by the fixed step. Speed starts at zero and
resets on stop, blocked movement, knockdown and respawn; existing movement rules
and ordinary replay fingerprints are unchanged.

All twelve independent rigs and animation actions are prepared once on asset
load. Renderer and combat hook reuse fixed rosters, options and the local-player
wrapper; the ready renderer no longer updates hidden fallback figures or creates
position-history objects per frame.

Capture paths and the retained browser report are repository-relative. The
compositor resolves them against its current checkout. Browser sample poses now
come from production createFighter/stepFighter/knockdownFighter calls on a neutral
flat course. The reviewed asset hash is unchanged. High/Performance captures and
the sheet were rebuilt once after these fixes.

## GFX-01 gaps

This is a stylized pipeline model. It still needs natural shoulder and torso
shaping, tailored vest panels instead of rounded pouches, more readable face
and hair forms, seams and convincing fabric/leather wear. Blender and game
lighting also differ. The other crew members, remaining action clips,
2,000-triangle distant models, frame-time targets and three scored fidelity
rounds belong to subsequent work. No crew-fidelity score is claimed here.

## Reproduce

```powershell
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' -b --python tools/blender/test-fighter.py -- --root .
node tools/browser-harness.mjs scenario rigged-fighter
node tools/fidelity-sheet.mjs
node tools/test-rigged-fighter.mjs
```

The compositor also accepts `--captures PATH`, `--output PATH.png` and
`--blender PATH`. It uses Blender's installed NumPy and standard PNG encoding;
no dependency was added.