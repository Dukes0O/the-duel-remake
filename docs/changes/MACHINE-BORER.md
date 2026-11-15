# MACHINE-BORER

## Built so far

Step 1 adds Mabel's machine data and pure rules for a face, thrust, head speed, stall recovery, protection and slow steering. The face reads edited ground, so a dug cutting can expose it. The rules are not connected to the game yet. The head can query the ground's seeded material layers at the face; a caller may still supply a material explicitly. Filled ground above the natural surface uses the cell's stored fill material.

Step 2 has begun: cutting records centre-line segments, coalesces straight runs, and leaves the far end closed. The trial's ground rules preserve explicit end states. Once covered, the machine opens the far end at a matching face and stops short of shallow open ground with the requested sentence. Joining another tunnel remains to be built. This is not a finished cutting step.

## Checks

- `node tools/test-machine-borer.mjs`: passed for machine data, face and dug cutting, refusals, stall and release, full soft-ground speed, steering limits, and a 40 m straight cut with a closed face. The input state remains unchanged.
- `node tools/test-machine-borer.mjs`: passed again with explicit open and closed ends, including collision and preservation through the tunnel rules.
- `node tools/test-tunnels.mjs`: passed, including the existing trial and simulated drives.
- `node tools/test-machine-borer.mjs`: passed after adding far-face breakthrough, passage in both directions, and the shallow-ground stop.
- `node tools/test-tunnels.mjs`: passed again after the breakthrough change.
- `node tools/test-machine-borer.mjs`: passed with the material query and a head stalled by rock sampled at the face.
- `node tools/test-ground-edit.mjs`: passed after adding the material query.
- Race fingerprints: not run yet. No existing race code was changed.
- The lane tier, replay and world-signature suites, build and browser scenario remain for the final step.

## For Claude to run

The browser scenario has not been written yet. An independent save review will be needed when saving is built.

## Changed assertions, for Claude to review

None.

## Codex decided

For the head's first rules, topsoil takes full thrust, clay 80%, gravel 55%, and rock one third. This is a starting scale within the card's soft and hard endpoints. The ground stores only one fill material per cell, so the face query uses that material for fill above the natural surface.

## Sound cues

The rules emit `borer.stall`, `borer.refuse`, and `borer.breakthrough` events. The remaining cues are `borer.head` and `borer.muck`. Sound playback remains to be built.

## Removed

Nothing yet. The trial's plain tube will be replaced by the borer's lining and portals in the drawing step.
