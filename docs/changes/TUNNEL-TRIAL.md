# TUNNEL-TRIAL

## Incomplete

This is unfinished work, not a passing trial. The lane contains the earlier tube query adapted to an explicit car-height argument in `course.groundAt`. Only `_supportAt` passes the car's `groundHeight`. Other calls retain the surface. There is no installed tunnel, switch-controlled scenario, visible opening, mesh, enforced wall, save, or driving proof. A car placed inside without an initialized height is still unresolved. Do not merge this work as a finished trial.

This round corrected support sampling along sloping tube segments and added a tested wall-motion calculation with open ends and vehicle clearance. The driving simulation does not yet call the wall calculation. The tube still needs a real driven-car test.

A grid scan around the rise nearest the Ridge, using 25 m position steps and 16 directions, found a maximum midpoint rise of about 1.03 m above the straight line between points 100 m apart. This is a sample, not a proof about every possible line. It suggests a car-sized tube with rock overhead needs approach cuts or different terrain. That choice has not been made.

`course.groundAt` is used by driving and collision, rivals, people on foot, combat, camera, scenery, course construction and effects. Only car support was changed. Every other caller remains unreviewed for underground use, including people and other vehicles. Surface drawing and scenery should normally keep the surface height. The source inventory is `rg -n '\.groundAt\(' src` and `rg -n 'scablands(Surface|Natural|Terrain|Plain)?HeightAt\(' src`; these include unrelated methods with the same name. No race or released course was intentionally changed; replay and world signature guards were not completed, so that is not verified. No fingerprint was recorded.

The shader was not built. Its cost, tube limit, and appearance are unknown. No new sound event was added. The boring machine is not ready for a go decision on this evidence. Test an approach cut and a driven car first; then compare a real cut to the shader and measure both.

[three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) is MIT licensed. It uses brushes and an evaluator for subtraction; the source warns about geometry and precision faults. A second trial needs an isolated installation, suitable closed cutting geometry, integration with terrain and collision, and measurements of rebuild and frame time. Cost is not measured.

## Checks

- `node tools/test-tunnels.mjs`: passed 313 ground-query and wall-calculation checks. These are not the required driving, wall-enforcement, mouth or save tests.
- Lane tier: interrupted before completion. No pass is claimed.
- `npm.cmd run build`: passed. PowerShell blocked `npm` itself under its script policy.
- Browser: not run. The requested scenario does not exist yet.

## For Claude to run

No runnable scenario is ready. After it is built, bore 100 m and drive both directions; inspect both mouths, the inside and ground above, using memory-only saves and Performance quality. Record pictures, draw calls, triangles and frame times.

## Changed assertions

None.

## Codex decided

No design decision was made. The trial needs a site or approach that gives both a usable entrance and overhead rock.

## Removed

Nothing was replaced or removed.
