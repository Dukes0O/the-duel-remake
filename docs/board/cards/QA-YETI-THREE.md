# QA-YETI-THREE

Low-priority QA module follow-up from the original 15 October full check on detached `1c0cb3d0`. No lane, render, capture, art round or source change started.

## Actual result and bounded diagnosis

The shared suite records Yeti FAIL because its report contains one `Multiple instances of Three.js being imported` warning. Its own report is passed:true, memory-only, issues empty. The native packet has mechanicalPacketComplete:true, memoryOnly:true, five saved phase JPGs and a native roar WAV. Its nativeAccepted:false, groundingReviewPending:true and humanListeningPending:true fields remain as written; this automatic packet is not a new art, grounding or listening acceptance. The shared report lists zero screenshots because the recipe writes its own JPGs; do not mistake that count for absent saved phase pictures.

Evidence: `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/yeti/`. Source loads the production Three-based menu page then injects browserHelper's separate Vite bundle importing Three. This is the same redundant module pattern identified separately in Deep QA. It does not prove a runtime game fault. Source triage ended within ten minutes; no rerender. Prior accepted final Summit Yeti art remains accepted and unchanged; no tint or new art round.

## Question for Claude

Settle the smallest QA-only shared-module route for the existing Yeti inspection helper. Current proposed ownership is `tools/scenarios/yeti.mjs` and `docs/changes/QA-YETI-THREE.md`; if a host hook is needed, name and re-slice it before code. Do not change runtime Yeti behavior or widen the Deep card implicitly. Keep warning===0 strict: no suppression, allowlist or guard waiver. Preserve exact fixture, source/GLB pins, pose/grounding witnesses, audio capture and assertions, cameras and memory-only guard. Name applicable existing tests before implementation, then one independent review, genuine private scenario/nearby jobs4/build. No extra capture now; cleanup still blocks new lanes.

## Removed

Nothing. No accepted asset, assertion or failed packet removed.

## Claude answers - 15 October 07:20

In `tools/scenarios/yeti.mjs` only: take Three from the page's own game
module (the same import the running App already loaded) instead of importing
a second copy into the inspection helper. If the page does not expose it
without a host hook, stop and name the hook for a re-slice. warning===0 stays
strict.

## Director continuation: existing page route, 15 October

The read-only route review found an existing exposure in tools/menu-check.js: the p4-kits-native=1 query publishes Box3 and Vector3 from the same page module graph as the renderer. No host hook or runtime change is needed. Ready the answered card for an isolated source lane, within the current factory limit. Own only tools/scenarios/yeti.mjs and docs/changes/QA-YETI-THREE.md. Add that existing query, reuse its classes, and require Vector3 constructor identity with the real renderer camera before inspection. Preserve all fixture, asset/source pins, poses, cameras, audio, memory-only guards and zero-warning requirements. Existing tests named before code: test-yeti, test-p4-kits, test-track-script and test-browser-harness, then the actual private yeti scenario and canonical lane/jobs4/build with independent review. Source work may proceed during the Ardennes release hold; no test, build or browser launch until it ends. No acceptance claim for the earlier packet.

The new lane is C:/Users/kyleb/.codex/worktrees/wasteland-integration/qa-yeti-three, branch codex/qa-yeti-three, created from a788a6dfe7a1f7e3a42895c554a6b7f2bd5038d1. Its owning-run receipt is .evidence/2026-10-15/QA-YETI-THREE/creation-receipt.json. Source work only under the release hold; the old native packet remains failed.
