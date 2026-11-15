# TUNNEL-TRIAL

## Incomplete

This is unfinished work, not a passing trial. The lane contains the earlier tube query adapted to an explicit car-height argument in `course.groundAt`. Only `_supportAt` passes the car's `groundHeight`. Other calls retain the surface. There is no installed tunnel, switch-controlled scenario, visible opening, mesh, save, or driving proof on the real Ridge. A car placed inside without an initialized height is still unresolved. Do not merge this work as a finished trial.

The tube wall calculation now runs in car contacts when a tunnel is installed and the car starts inside it. A focused contact test checks the side limit and a car above the tube. A controlled straight-course test now drives a real simulated car through a level 100 m tube in both directions. This does not prove the mouths or a complete journey through the tube.

The support query now tolerates a rise of up to half a metre between samples, and an underground car's support skips surface obstacles and mountain support. A focused test carries the previous floor height along a sloping tube in both directions and checks that surface obstacles still apply above it. The level tube now has a driven-car test, but the half-metre slope allowance still needs testing at real driving speeds. The driving code also samples support for the player's default actor and needs a full journey check.

The support query now ends at each mouth. Previously it could return the tunnel floor indefinitely beyond either end. The focused test checks that both approaches return the surface height; the controlled driving test still passes in both directions. This does not establish that the real site's floor meets the surface at the mouths.

A grid scan around the rise nearest the Ridge, using 25 m position steps and 16 directions, found a maximum midpoint rise of about 1.03 m above the straight line between points 100 m apart. This is a sample, not a proof about every possible line. It suggests a car-sized tube with rock overhead needs approach cuts or different terrain. That choice has not been made.

`course.groundAt` is used by driving and collision, rivals, people on foot, combat, camera, scenery, course construction and effects. Only car support was changed. Every other caller remains unreviewed for underground use, including people and other vehicles. Surface drawing and scenery should normally keep the surface height. The source inventory is `rg -n '\.groundAt\(' src` and `rg -n 'scablands(Surface|Natural|Terrain|Plain)?HeightAt\(' src`; these include unrelated methods with the same name. No race or released course was intentionally changed; replay and world signature guards were not completed, so that is not verified. No fingerprint was recorded.

The scene now passes the course's tubes to the near and coarse ground materials and adds the inward-facing rock lining when `wasteland-town` is enabled. It reads the tubes when the scene is created; it does not yet update them while boring. There is still no installed trial tunnel or browser scenario. Each supplied segment adds two vector uniforms, one radius uniform and one capsule-distance test per ground fragment. There is no chunk selection or measured practical limit yet. The appearance and frame cost are unknown. No new sound event was added. The boring machine is not ready for a go decision on this evidence. Test an approach cut and a driven car first; then compare a real cut to the shader and measure both.

[three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) is MIT licensed. It uses brushes and an evaluator for subtraction; the source warns about geometry and precision faults. A second trial needs an isolated installation, suitable closed cutting geometry, integration with terrain and collision, and measurements of rebuild and frame time. Cost is not measured.

A repeatable trial placement now joins the tube floor to the surface at both ends and measures the roof against the land. On the rise nearest the Ridge, a 100 m line along its road has no cover over an 8 m diameter roof at any of the 101 sampled points. This is a measurement of that line, not proof for every possible line. The real-site test checks both mouth heights; it does not yet drive a car there or show a tunnel with rock overhead. The placement is available for the unfinished scenario and is not installed in the game.

## Checks

- `node tools/test-tunnels.mjs`: passed material generation and lining checks, plus ground-query, joined-slope continuity, surface-obstacle, wall-calculation, contact-hook and real simulated driving checks in both directions on a controlled level tube. The real Ridge mouths and save are not tested.
- `node tools/test-replays.mjs`: passed 297 fingerprints across 33 cases.
- `node tools/test-combat-replays.mjs`: passed 12 fingerprints across four encounters.
- Lane tier: interrupted in an earlier round before completion. No pass is claimed.
- `npm.cmd run build`: passed after adding the real-site measurement. PowerShell blocked `npm` itself under its script policy.
- Browser: not run. The requested scenario does not exist yet.

## For Claude to run

No runnable scenario is ready. After it is built, bore 100 m and drive both directions; inspect both mouths, the inside and ground above, using memory-only saves and Performance quality. Record pictures, draw calls, triangles and frame times.

## Changed assertions

None.

## Codex decided

For the isolated driving check, the ground rises gently above a level tube on a controlled course. This is test ground, not a choice of Ridge site. The trial needs a site or approach that gives both a usable entrance and overhead rock.

## Removed

The previous first-match selection at overlapping tube joints was replaced by the nearest eligible segment. Tunnel floor support no longer extends beyond the mouths. The ordinary ground shader is unchanged when no tunnel is supplied. Nothing else was removed.
