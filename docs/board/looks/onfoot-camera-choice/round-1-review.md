# Camera choice round 1 review

Director reviewed both contact sheets plus full-size High first-person,
overhead aim and phone overhead images. Production 1b76d26, corrected scenario
aabb4f8, retained evidence d679fbc. The earlier resume-script failure and its
images remain under round-1/failed-attempt-1; the actual resume button corrected
that fixture without a gameplay change.

| Criterion | Score / 5 | Evidence |
| --- | --- | --- |
| Style and view consistency | 4 | Existing crew, tools and scene retain their established appearance. Underlying model fidelity debt is separate. |
| Camera and aiming clarity | 4 | Overhead shows the complete fighter and nearby car; projected reticle follows the distant aim ray, not the fixed action label. |
| Grounding and clearance | 4 | Fighter feet and car contact read clearly; focused all-course and remote-tunnel checks support the camera bounds. |
| Interaction and motion | 4 | Actual key/menu, aim/fire/repair, pause/resume and re-entry controls pass in both qualities. Still images alone do not prove every motion frame. |
| View obstruction | 2 | QA-only panels obscure much of the view and phone gear readouts; the phone minimap overlaps the fighter's left arm/leg. |
| Frame pacing | 4 | Short 120-frame absolute p95 samples are 18.2 ms High and 18.1 ms Performance. |

The successful private memory-only capture reports eleven PNGs and zero browser
warnings/errors. Absolute timing is limited smoothness evidence, not percentage
overhead, GPU time or worst-case combat performance. No model beta claim is made.

## Round 2 priorities

1. Hide only the two harness debug panels through their specific QA selectors.
   Keep real product controls and overlays visible.
2. Shrink or reposition the existing minimap only for on-foot phone layout so
   the full fighter is clear. Keep health, gear, car direction and aim readable.
3. Preserve desktop/car HUD and camera numbers. No art changes are requested.
4. Repeat the same matched shot list after independent CSS/fixture review.

The existing combat HUD stylesheet is already inside this card's ownership;
this narrow on-foot mobile rule needs no additional file hook.
