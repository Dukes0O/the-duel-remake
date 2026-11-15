# MACHINE-BORER

## Built so far

Step 1 adds Mabel's machine data and pure rules for a face, thrust, head speed, stall recovery, protection and slow steering. The face reads edited ground, so a dug cutting can expose it. The rules are not connected to the game yet. The head can query the ground's seeded material layers at the face; a caller may still supply a material explicitly. Filled ground above the natural surface uses the cell's stored fill material.

Step 2 has begun: cutting records centre-line segments, coalesces straight runs, and leaves the far end closed. The trial's ground rules preserve explicit end states. Once covered, the machine opens the far end at a matching face and stops short of shallow open ground with the requested sentence. Cars can transfer between overlapping passages of a self-crossing tunnel when the floors meet. Crossings on different levels stay closed. The cutting rules also detect breakthrough into another supplied passage at the same floor height, without creating a surface portal over the underground junction. The game must still supply those passages, and travel between separate tunnels remains to be built, so this is not a finished cutting step. The machine now checks the full bore at its proposed position before advancing, so it stops at the edge of a protected place and keeps its own sentence.

Mabel can now reverse along her recorded tunnel at 1.4 m per second with her head stopped, and return to the cutting face without cutting the same ground again. The path follows bends and slopes; steering does not move her off it. These rules are not connected to the game controls yet.

The conveyor's pile is ten metres to the right of the first tunnel mouth. Each new cut samples the ground's material layers through the underground cut and places the bulked material in that pile through fill. The tunnel segments represent the void without lowering the surface. Reverse travel does not cut or add muck. The machine stops if the pile would be in a protected place.

Step 4 adds plain-data export and restore for the Dig's in-memory tunnels. Restoring validates and rebuilds the tunnel against the visit's ground. No store is read or written. Connecting the borer to the Dig remains step 5.

Step 5 has begun with Mabel's starting position: 30 m from the first west scarp's midpoint, facing its foot. The real ground offers a cutting face at the end of that approach. She is not yet selectable or driven in the Dig.

## Checks

- `node tools/test-machine-borer.mjs`: passed for machine data, face and dug cutting, refusals, stall and release, full soft-ground speed, steering limits, and a 40 m straight cut with a closed face. The input state remains unchanged.
- `node tools/test-machine-borer.mjs`: passed again with explicit open and closed ends, including collision and preservation through the tunnel rules.
- `node tools/test-tunnels.mjs`: passed, including the existing trial and simulated drives.
- `node tools/test-machine-borer.mjs`: passed after adding far-face breakthrough, passage in both directions, and the shallow-ground stop.
- `node tools/test-tunnels.mjs`: passed again after the breakthrough change.
- `node tools/test-machine-borer.mjs`: passed with the material query and a head stalled by rock sampled at the face.
- `node tools/test-ground-edit.mjs`: passed after adding the material query.
- `node tools/test-machine-borer.mjs`: passed with a moving bore stopped outside a reserved place, retaining its own sentence and emitting one refusal.
- `node tools/test-tunnels.mjs`: passed after the protected-edge change.
- `node tools/test-machine-borer.mjs`: passed with reverse travel, a bent and sloping return to the mouth, and forward travel back to the face without changing the tunnel.
- `node tools/test-machine-borer.mjs`: passed with pile positions for two headings, an empty tunnel and an invalid mouth direction.
- `node tools/test-ground-edit.mjs`: passed with underground volume, bulking, material layers, protected ground and unchanged surface checks.
- `node tools/test-machine-borer.mjs`: passed after the ground cut change.
- `node tools/test-machine-borer.mjs`: passed with a 40 m bulked muck pile, no muck during reverse, and a protected pile refusing before a cut.
- `node tools/test-ground-edit.mjs`: passed after connecting the conveyor.
- `node tools/test-machine-borer.mjs`: passed with vehicle turns at a self-crossing and a separate-height crossing that stays closed.
- `node tools/test-tunnels.mjs`: passed after adding crossing passage support.
- `node tools/test-machine-borer.mjs`: passed with breakthrough into a supplied passage, no false surface portal, and a separate-height passage that does not open the face.
- `node tools/test-tunnels.mjs`: passed after the underground junction change.
- `node tools/test-machine-borer.mjs`: passed with a bored tunnel exported and restored, independent copies, an empty list for missing data, and storage access forbidden during the exchange.
- `node tools/test-machine-borer.mjs`: passed with the west scarp parking position, heading, ground height and real approach face.
- Race fingerprints: not run yet. No existing race code was changed.
- The lane tier, replay and world-signature suites, build and browser scenario remain for the final step.

## For Claude to run

The browser scenario has not been written yet. The later card that connects the Dig to the town store will need the save checker and an independent save review.

## Save bridge decision

Claude decided that this card keeps tunnels in memory for the Dig visit. A later card will connect the Dig's ground, machines and tunnels to the town store. No save data has been changed.

## Changed assertions, for Claude to review

None.

## Codex decided

For the head's first rules, topsoil takes full thrust, clay 80%, gravel 55%, and rock one third. This is a starting scale within the card's soft and hard endpoints. The ground stores only one fill material per cell, so the face query uses that material for fill above the natural surface. Walking pace is 1.4 m per second; forward travel in a cut uses the maximum cutting speed.

The pile starts with a 0.75 m ground-edit radius, enough to cover a sample on the one-metre grid at any position. The pile has no volume limit. An underground cut samples 32 weighted strips across its face at the supplied ground position. Only newly cut lengths go through the conveyor. If the pile is protected, the machine stops before cutting and gives the place's sentence. The existing ground grid keeps only one material per cell, so mixed material in one pile cell is represented by its most recently deposited material.

## Sound cues

The rules emit `borer.stall`, `borer.refuse`, and `borer.breakthrough` events. The remaining cues are `borer.head` and `borer.muck`. Sound playback remains to be built.

## Removed

Nothing yet. The trial's plain tube will be replaced by the borer's lining and portals in the drawing step.
