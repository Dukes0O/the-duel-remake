# WW-ART-FOLK change note

## Changed

- Added the Blender recipe for Auntie Solder, Moss, three Tin Town residents and two Ash Men. Each figure has named pieces and the shared raider bone names. The recipe exports one Y-up `folk.glb`; WW-SCENE will wire it into the world.
- Added the recipe to `tools/test-blender-output.mjs` with the 56,000-triangle maximum for seven figures at 8,000 each.
- Added one first-round JPG and a short visual note under `docs/board/looks/ww-art-folk/`.

## Evidence and checks

- Blender export completed. GLB read-back: 1,766,360 bytes, 30,984 triangles, 15 bones. These are within the 2 MB file and 56,000-triangle limits. The model is a review candidate and is not wired into the game.
- Review sheet: 37,175 bytes (500 KB maximum). Self-scores: gritty/grounded 3/10, welded-steel and wear 4/10, non-toy realism 2/10. The cast is readable, but its regular shapes still look too toy-like. Claude should decide whether the direction merits another round.
- `node tools/test-blender-output.mjs`: **passed**, 192 checks, 0 failures.
- Lane tier: 44 named tool suites reported pass, including hygiene; two failed and the runner gave no final summary before it stopped producing output and had to be interrupted. Replay guard passed 297 checks across 33 cases. Same-commit reruns: `test-circuit-eifel` failed again because FFmpeg loudness measurement failed; `test-review-evidence` failed again on the crew recipe's date-based evidence path mismatch and `spawnSync ffmpeg EPERM`. No game code changed.
- `npm.cmd run build`: **passed**. Vite reported its existing ineffective dynamic import and large-chunk warnings.
- Browser and in-game look checks: Claude runs. No browser check or frame check was needed for this art card.
- Changed assertions: none. Replay fingerprints: unchanged.

## Removed

- No prior files or behavior were removed.
