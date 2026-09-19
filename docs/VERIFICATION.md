# Remake verification

Checked 18 September 2026, Vancouver time (19 September UTC), in the local Windows workspace.

## Automated checks

- `npm test`: **161 passed, 0 failed**.
- Includes 60 full campaign runs: five seeds, two cars, two difficulties, and 30/60/144 simulated display frames per second. All 60 complete. Matched runs have the same outcomes across frame rates.
- Checks cover throttle-only departure from a bend, responsive cornering, drift development and release, off-road speed/grip without damage or life loss, swept rock collisions, major-impact thresholds, recovery after four hits, a fatal fifth hit, persistence through checkpoints, restart, paused impacts, boost, near misses, police, manual over-revving, lifecycle guards, and versioned best times.
- `npm run build`: passes. Current renderer/Three.js chunk is about **666 KB minified / 175 KB gzip**. Vite reports its chunk-size warning. Further asset compression, loading polish and distance-based detail budgets remain production work.
- `npm run assets:export`: passes; original editable coupe and station GLBs rebuilt. The licensed player-car source is separate and is not overwritten.
- `git diff --check`: clean. Git also emits routine LF/CRLF notices.

## Browser checks

Development and production builds rendered in the Codex browser. The detailed car and natural HDR lighting both reported ready. Red and silver paint selections, start/countdown, live HUD, pause/resume, mute and camera changes were checked. Main play remains manual. The current production menu and race HUD were checked at 1280x720 and 390x844; asset credits remain accessible at both widths. Narrow screens still require a keyboard or gamepad.

The developer-only `/tools/visual-check.html` exercised recovery after the fourth major crash and a fifth-hit explosion with the new detailed car. The fifth hit reported game over and catastrophic damage, with visible fire, debris and detached wheels. Chickens were visually checked walking and pecking near the road. Alpine inspection exposed a terrain fold over a bend; the distant terrain now uses a world grid and the same view was rechecked with a clear road.

Sampled steady frames reported **60 FPS**: approximately 160 draws / 1.44 million triangles in the garage and 231 draws / 1.46 million triangles in a race view. Counts include shadow passes. These are point samples on this host, not a broad hardware guarantee. First-load and scene-change samples were lower while assets and shaders initialized. A full-screen ambient-occlusion pass was removed after it reduced the sampled frame rate; baked occlusion, sun shadows and a lightweight contact shadow remain.

An early texture-clone loading warning was fixed by loading the outcrop texture without cloning an incomplete source. No new warnings or errors appeared in the final production checks; the browser log retained warnings from the earlier bundle.

AudioContext reported running and all three sampled assets reported ready. Pause, mute and resume responded correctly. The recorded engine and tire loops were decoded successfully; this is not an independent listening or audio-engineering review.

The final chase-camera adjustment follows the car's full lateral position and terrain height. A separate visual check at 45 m off the road confirmed that the car remains in frame, with no captured errors or warnings. The production build was rerun after this change.

## Assets and limits

The player uses the licensed Car Concept GLB, normalized and adapted at runtime. Both selections currently share its body geometry with distinct paint/trim and handling. Traffic, rival and fallback vehicles remain procedural. Model, lighting, ground and audio provenance is in the asset credit files and the in-game credits page.

The Blender Python builder passed syntax checking in the earlier pass. Blender was not found in the checked installation locations, so no Blender render is claimed. All included GLBs can be imported into Blender. See `ASSET_PIPELINE.md` for the active loader and editing workflow.

Handling is controllable arcade drift, damage is visual deformation, and explosion debris uses lightweight particle physics. The major-crash limit is five; ordinary collisions and mechanical failures also retain the original finite run-reserve rules. The scenery and performance budgets remain a remake foundation rather than a finished AAA production.
