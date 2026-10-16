# QA-DEEP-ART-THREE

Low-priority tools repair from the 15 October full check on detached `1c0cb3d0`. No lane, source, render or art round is claimed.

## Actual result

The shared browser runner marked `deep-art` FAIL: 18 screenshots, one warning, zero errors. Its own report is `passed:true`, memory-only, issues empty. The sole warning is `Multiple instances of Three.js being imported`. `deep-art-native.json` is complete with all 17 working roles, plus the wreck detail picture. Otter is held and was not rendered. The strict shared runner requires zero warnings, so this packet remains failed; do not call it a rejected art round or hide the warning.

Evidence: `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/deep-art/`, its report/native JSON and original batch log. The successful harness report and failed suite verdict are both retained. Source inspection, completed in less than ten minutes, shows that deep-art loads the existing Three-based look page and then injects a separate in-memory Vite helper bundle containing Three and GLTFLoader. That separate module path is the repair target; no new timing or art measurement was made.

## Future bounded scope

Own `tools/scenarios/deep-art.mjs`, the QA-only shared-instance hook in `tools/deep-look.js`, and `docs/changes/QA-DEEP-ART-THREE.md`. Reuse the look page's actual module instances for photography instead of injecting another Three runtime. Name the applicable existing source/recipe tests before implementation; no new harness or framework. If another file is needed, re-slice before editing it.

Keep the normal look page behavior, water, lights, shaders, geometry, palette, scale, cameras and every working GLB/manifest/source pin unchanged. Keep the standard warning/error rule intact: no suppression, allowlist, warning deletion or loosening. This is QA module wiring only, not Deep story, game-life work, runtime installation or another formal art round. The accepted art and held otter decisions stay in force.

Within an allowed lane, prove one shared module path, verify the original 17-role recipe and memory-only/native guards, and require the real unchanged scenario to finish without the duplicate-instance warning. One independent source review, nearby lane tier/jobs4 and build precede a merge. New lanes remain blocked by the existing merged-folder cleanup rule. Do not repeat the already passing full tier, frames or combat. Stop any unresolved investigation after 30 minutes, record the facts and move on.

## Removed

Nothing yet. A future fix removes only the redundant QA module initialization; no licensed source, current asset, role, assertion or failed packet is removed.

## Ready independent QA-only source slice

Kyle explicitly directs continuing other independent code while frozen checks wait. The merged-folder blocker in this older card was resolved after his restart; no cleanup bypass applies. Root readies only this existing narrow card with no core/save/scene locks. Its defined QA-only page-instance hook and scenario scope are settled here; no Deep story/runtime/art acceptance is included. Applicable existing checks named before code: tools/test-deep-look.mjs, tools/test-deep-look-zone.mjs, tools/test-browser-scenarios.mjs and tools/test-browser-harness.mjs, followed by the unchanged actual17-role private deep-art recipe, changed lane/jobs4, build and one independent source review. Expose/reuse the existing page's Three/GLTFLoader module objects; require real class identity instead of suppressing duplicate-instance warnings. Preserve every existing source/asset/scale/camera/water/light/role/memory and zero-warning assertion. If another host file is required, stop and name the re-slice before editing it. Prepare this card only when the actual active builder limit admits it; frozen waiting candidates do not justify idle source time or another heavy launch above3.