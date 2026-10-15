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
