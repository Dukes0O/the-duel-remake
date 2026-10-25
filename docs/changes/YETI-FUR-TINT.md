# YETI-FUR-TINT: the yeti reads pale at night

Claude (Sonnet 5.5 side session), 25 October 2026. Card `docs/board/cards/YETI-FUR-TINT.md`.
Built on the Codex draft (`codex/yeti-fur-tint`, merged in with its history), finished
and measured here. The accepted model, rig, clips, geometry, maps, vertex colours,
roughness, lights and emissive values are unchanged.

## What changed

- `src/yeti-view.js`: `createYetiView(assets, {furTint})`. With a `furTint`, each
  High and LOD actor clones only the `round-two-yeti-matted-ivory` fur materials
  (one clone per source material in an actor, so High and LOD parts share) and sets
  their colour; the shared donor, the face, mouth shadow, eyes and teeth are never
  touched, and `dispose()` disposes only the owned clones. Omitting `furTint` is an
  exact no-op. The seated roof yeti (`createYetiRoof`) stays original.
- `src/render3d.js`: the one caller passes `new THREE.Color(2.6, 2.6, 2.6)`. The
  accepted fur has a white colour factor, so a conventional pale colour below 1
  would darken it; a neutral multiplier above 1 lifts the textured fur while its
  detail stays.
- `tools/test-yeti.mjs`: new cases (30) for omission identity, fur-only change,
  non-fur/texture/geometry invariance, High/LOD sharing, independent views, owned
  disposal and race-state immutability, including the real accepted GLBs.
- `tools/scenarios/yeti-fur-tint.mjs` (manual only; `DUEL_YETI_FUR_TINT_CAPTURE=1`):
  the one-shot picture recipe. It starts the recorded Summit night encounter in a
  private memory-only game, lets the real autopilot reach the one real roar, freezes
  it, and photographs original, 2.6 and 3.6 on the same cloned fur materials, then
  restores them and checks that pose, camera, geometry, non-fur materials, lights,
  race state and profile did not change. `tools/run-browser-scenarios.mjs` keeps it
  out of the daily run (`yeti-fur-tint` beside `rustwall-frame`), with its
  exclusion cases in `tools/test-browser-scenarios.mjs`.
- `docs/board/looks/yeti/round-1.jpg`: the sheet (66 KB).

## The picture

Frozen roar at night (authored light path at full night, `nightAmount` 1, recorded
at the capture and after each of the three pictures; roar 0.56 s in), same pose and
camera in all three, cropped to the yeti and enlarged. Before: dark grey-green.
After at 2.6: a pale grey-white with the fur texture still readable. 3.6 is paler and
flatter. A first run with 1.8 (the draft's candidate) only lifted it to a lighter
grey-green, so I tried 2.6 and 3.6 and chose 2.6. Verdict for the design lead: pick
2.6 or ask for another value (one number in `render3d.js`).

## Checks

- `node tools/test-yeti.mjs`: 388 checks passed. `node tools/test-browser-scenarios.mjs`: passed.
- The picture recipe ran three times (1.8 and 2.6/3.6 twice) on a headless private
  game: every run complete, night witness 1, fur restored, camera restored.
- Lane tier and build: below.

## Removed

Nothing.

## Lane tier and build

(Filled in at the end of the card.)
