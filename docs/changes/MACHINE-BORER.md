# MACHINE-BORER

## Built so far

Step 1 adds Mabel's machine data and pure rules for a face, thrust, head speed, stall recovery, protection and slow steering. The face reads edited ground, so a dug cutting can expose it. The rules are not connected to the game yet. The material at the face is supplied by the caller; the ground layer does not yet expose a material query at depth.

## Checks

- `node tools/test-machine-borer.mjs`: passed for machine data, face and dug cutting, refusals, stall and release, full soft-ground speed and steering limits.
- Race fingerprints: not run yet. No existing race code was changed.
- The lane tier, replay and world-signature suites, build and browser scenario remain for the final step.

## For Claude to run

The browser scenario has not been written yet. An independent save review will be needed when saving is built.

## Changed assertions, for Claude to review

None.

## Codex decided

For the head's first rules, topsoil takes full thrust, clay 80%, gravel 55%, and rock one third. The face material still needs to come from the ground layer. This is a starting scale within the card's soft and hard endpoints.

## Sound cues

The rules emit `borer.stall` and `borer.refuse` events. The remaining cues are `borer.head`, `borer.breakthrough`, and `borer.muck`. Sound playback remains to be built.

## Removed

Nothing yet. The trial's plain tube will be replaced by the borer's lining and portals in the drawing step.
