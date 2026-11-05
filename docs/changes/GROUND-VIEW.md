# GROUND-VIEW

## Changed

Added `createGroundView` to draw edited 32 m ground chunks as 1 m meshes with
material colours, computed normals and a 2 m edge skirt. It retains chunk
geometry when the saved samples have not changed. The Scablands scene exposes
an explicit refresh hook; a refresh rebuilds the coarse horizon after edits.
The view reads the existing ground edit layer, so its rendered heights match
the height function used by physics.

Added seeded dirt and clod burst effects with short ballistic motion and cleanup.
The Scablands scene exposes the effect emitter to the world/job owner.

## Design choice

The scene hook does not own browser input, the camera or a cursor ray. Binding
the card's dev key for digging under the cursor would require edits to an
unowned input hook. The scene exposes the ground refresh and effect methods for
the world/job hook to use. This needs Claude's browser review and follow-up
input hookup before a player can dig with the dev key.

The effect accepts an atlas texture and selects its frames through
`combat-vfx-atlas.js`. The current scene does not supply the Kenney particle
texture, so the scene currently uses coloured clod meshes. Claude should check
the effect in browser and decide the texture asset hookup before this is treated
as finished art.

## Checks

- `node tools/test-ground-view.mjs` — passed. Sparse chunk mesh creation,
  incremental refresh, colours, normals, skirt vertices and seeded effect
  cleanup.
- `node tools/test-scablands-scene.mjs` — passed. Existing scene construction,
  shared ground and disposal remain valid.
- `npm.cmd run build` — passed. Vite reported its existing dynamic import and
  large chunk warnings.
- Lane tier and browser checks — Claude runs.
- Changed assertions: none.
- Race fingerprints: not applicable; race simulation and course files were
  unchanged.

## Claude browser review

1. Open the Scablands and inspect an edited chunk from above and at a shallow
   angle. Check that its edge skirt hides the coarse ground seam and the dirt
   colour follows the cut material.
2. Trigger one ground refresh after a cut and confirm physics and rendered
   terrain stay aligned, including after a second refresh with no new edits.
3. Trigger a dirt burst in each tool direction. Check particle direction,
   grounding and cleanup. Confirm whether Kenney's dirt sprite should be wired
   from the local particle pack.
4. Decide the owning input hook for the dev key that digs under the cursor.

## Removed

Nothing.
