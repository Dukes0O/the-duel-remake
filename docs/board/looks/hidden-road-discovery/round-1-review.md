# Discovery round 1 review

Director review of the actual contact sheet and full-size phone menu, desktop
menu, garage and High dust captures. Production source e26e1cd; independent
source review 7b4df1f; browser scenario 922c563. This is UI and hint presentation,
not a new Blender asset family.

| Criterion | Score / 5 | Evidence |
| --- | --- | --- |
| Discovery and return clarity | 3 | WASTELAND is legible but looks like a small incidental action below Start Engine. |
| Hint visibility | 2 | Five-race hint is outside the initial garage viewport. The ten-race pale swirl is visible at the wash mouth. |
| Map readability | 3 | Dotted route and Rustwall endpoint are present, but tiny; a short adjacent label would explain them. |
| Mobile layout | 3 | No new horizontal overflow; return action needs a full-width touch target of at least 44 pixels. |
| Scene consistency | 4 | Existing colors and type fit the menu. Dust is subtle and grounded near the entrance. |
| Frame pacing | 4 | Bounded 120-frame samples: High p95 18.1 ms, Performance 18.2 ms; 48 pooled points. |

The frame samples have no paired effect-off baseline and do not establish
percentage overhead or worst-case race performance. No such claim is made.
The private memory-only scenario reports zero browser warnings/errors and
passes Turn-back discovery, reload, player isolation, automatic scenic passage,
safe direct visit, pause and flag-off checks. Finish counts and short approach
positions are explicit fixtures; this is not a claim of ten complete races.

## Next round

1. Put the garage hint immediately below the header, above the car list.
2. Make WASTELAND a full-column secondary action with a 44-pixel minimum height.
3. Add a short revealed-only label explaining the dotted path and Rustwall.
4. Wait for actual menu/loading readiness before capture. The desktop image
   still contains PREPARING THE ROAD and a racing scene; do not mask the overlay.
5. Preserve the readable dust effect and current ownership/lifecycle behavior.

These are the only requested refinements. Preserve this round, review the
changed source, then capture the second bounded round before the required gate.
