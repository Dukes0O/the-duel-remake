# GFX-02 round 1: Blender evidence

This is the first measured asset round. Browser captures and independent art
scores are separate evidence; this document does not approve visual fidelity.

## Rebuild

Run installed Blender 4.5.13 LTS in the isolated GFX-02 lane:

```powershell
blender -b --python-exit-code 1 --python tools/blender/first-person-gear.py -- --root REPO --round 1
```

The final full export took 73.25 seconds. It retained eight hand GLBs and
Blender sources, both shared tool GLBs and sources, 1024-square color/surface
maps, and 21 matched Blender renders. The manifest records exact hashes,
per-asset time, clips, reference crops and camera settings. Factory-empty
scenes isolate each build. Original crew and ART-W reference images are intact.

The textures are authored material islands with padding, deterministic cloth
grain, leather, skin and local steel wear. They do not project character sheets
onto unrelated surfaces. New hand atlases replace the unsuitable full-body
projection for this close view; each hand asset uses one 1024-square set.

## Model and animation contract

- Camera-local glTF coordinates: right +X, up +Y, forward -Z. Attach at identity.
  Camera is at the origin, with vertical FOV 72 degrees and near plane 0.15 m.
- Hand rigs have continuous forearm/wrist/palm sections, individual weighted
  finger chains, crew glove/sleeve colors and proportions, and named
  `rpg-mount` and `wrench-mount` bones. Socket rest axes match camera axes.
- Clips: idle, aim, fire, reload, repair, wrench-idle, aim-fire and aim-reload.
  Runtime samples normalized action progress from existing simulation state.
  Fire is authored at 0.35 s, reload at 2.2 s, repair at 4 s with four strokes.
- The RPG has a separate bound `loaded-rocket` mesh and a reload clip. Its
  insertion path follows the support hand until release near phase 0.76.
  The initial reload phase uses hidden-equivalent scale; runtime separately
  hides the rocket for empty/recoil states.
- Aim places both sight apertures on the screen center, with the large rear
  collar below the sightline. The correction is in authored poses, not camera
  or runtime placement offsets.

## Measured budget and focused check

Hands use 1,664 triangles each except Nell/Cinder at 1,856 and Tusk at 1,736.
The shared RPG uses 2,204 triangles and two draws; the wrench uses 1,148 and
one draw. The maximum combination is 4,060 triangles and three material draws.
Each hand model has one material draw.

`node tools/test-first-person-gear.mjs`: **26/26 passed** after the final export.
The independent tests load real geometry, skins and clips through installed
Three.js. This validates structure and deformation, not appearance or frame
cost. `git diff --check` passed. No broad gate, browser capture, frame-cost
measurement, live port or save access was performed by the asset builder.

## Inspection before freeze

The builder inspected Rook idle, aim, wrench and reload, Odessa repair, and
Nell/Wren/Tusk idle renders. Grip orientation, center sightline, continuous
wrists and the separated wrench head read in those views. Remaining visible
differences include thin straight sleeve silhouettes, simple glove folds,
faceted wrench edges, strong directional material grain, and limited distinct
crew arm details. These need the independent round-one critique and the next
measured round; they are not claimed as finished graphics.

Internal draft rebuilds corrected the Blender-only imported-tool orientation,
static wrench animation reset, aim height and rocket/hand path. They are part
of this single round, not extra fidelity rounds.
