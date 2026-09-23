---
task: RFX-06
status: review
kind: rendering-refactor
flag: none
player_facing: no
---

## What changed

`vehicle-attachments.js` owns named mounts for visual pieces on each car. The
combat bumper, bow and shield use it for both player and rival. Moving a rig to
a new car releases its old parent; retiring a car or disposing the combat scene
returns its rigs to their scene owner without removing a kit owned elsewhere.
The renderer also routes garage paint
through this same vehicle visual service. Future armor kit, decal and figure
meshes can choose a socket without adding new renderer branches.

No car size, socket position, paint color, combat rule or simulation state
changed. The registry does not allocate meshes during a race.

## Evidence

- `node tools/test-vehicle-sockets.mjs`: 845 checks across all nine runtime
  models, both actor roles and slide, spin, tumble and jump poses. Added
  replacement, invalid-socket, unique-object ownership, shared-registry
  retirement, scene-fallback and paint routing checks.
- `node tools/test-vehicle-paint.mjs`: 2,142 existing paint, damage and
  factory-restore checks passed.
- Private production `vehicle-socket-poses` browser scenario passed on the
  review-fix source state on port 23832 with four screenshots and zero warnings
  or errors.
- The changed-file lane gate passed 25/25 suites in 81.29 seconds, including
  all 509 core assertions. `npm run build` passed with the existing large
  rendering chunk warning.

## Scope

Armor kits and on-foot figures are later wave features. The registry exposes
their named mounting path now; those later cards will attach their own meshes.
The current garage paint follows the registry and keeps its existing material
ownership and factory restore behavior.

Review follow-up: a scene object now has one registry owner. A second owner
cannot silently take it from another car. Retiring a car also releases every
attachment in the shared registry before the car is disposed, including pieces
owned by systems other than combat. Other cars keep their attachments.
