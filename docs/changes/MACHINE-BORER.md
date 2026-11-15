# MACHINE-BORER

## Built so far

Step 1 adds Mabel's machine data and pure rules for a face, thrust, head speed, stall recovery, protection and slow steering. The face reads edited ground, so a dug cutting can expose it. The rules are not connected to the game yet. The head can query the ground's seeded material layers at the face; a caller may still supply a material explicitly. Filled ground above the natural surface uses the cell's stored fill material.

Step 2 has begun: cutting records centre-line segments, coalesces straight runs, and leaves the far end closed. The trial's ground rules preserve explicit end states. Once covered, the machine opens the far end at a matching face and stops short of shallow open ground with the requested sentence. Cars can transfer between overlapping passages of a self-crossing tunnel when the floors meet. Crossings on different levels stay closed. The cutting rules also detect breakthrough into another supplied passage at the same floor height, without creating a surface portal over the underground junction. The game must still supply those passages, and travel between separate tunnels remains to be built, so this is not a finished cutting step. The machine now checks the full bore at its proposed position before advancing, so it stops at the edge of a protected place and keeps its own sentence.

Mabel can now reverse along her recorded tunnel at 1.4 m per second with her head stopped, and return to the cutting face without cutting the same ground again. The path follows bends and slopes; steering does not move her off it. These rules are not connected to the game controls yet.

The conveyor's pile is ten metres to the right of the first tunnel mouth. Each new cut samples the ground's material layers through the underground cut and places the bulked material in that pile through fill. The tunnel segments represent the void without lowering the surface. Reverse travel does not cut or add muck. The machine stops if the pile would be in a protected place.

Step 4 adds plain-data export and restore for the Dig's in-memory tunnels. Restoring validates and rebuilds the tunnel against the visit's ground. No store is read or written. Connecting the borer to the Dig remains step 5.

Step 5 has begun with Mabel's starting position: 30 m from the first west scarp's midpoint, facing its foot. The real ground offers a cutting face at the end of that approach. She is not yet selectable or driven in the Dig.

The Dig simulation now holds Mabel and advances her in drive and work modes. Open-ground driving is limited to 4 km/h; work controls run the borer rules and update the visit's tunnel geometry and dug ground. Reverse follows the cut. The page controls, drawing, camera and sound still need connecting before she can be selected.

The Dig page now maps Mabel's W and S to thrust, A and D to steering, and the up and down arrows to slope. The control function also accepts the existing mapped machine axes. Mabel is not yet in the selection list; her view and the page's controller connection still need work.

The Dig now has synthesised borer sounds: a head loop whose pitch follows head speed, a conveyor loop while fresh muck moves, and distinct stall, refusal and breakthrough cues. The loops stop when Mabel stops working, the sound is muted, or the Dig closes. These are connected for the borer but cannot be heard until she is selectable.

The Dig page has Mabel's head-speed dial, distance cut, control instructions and operating guidance. The dial follows the simulated head and is hidden for other machines. These controls remain unreachable until selection and the scarp scene are connected.

The Dig scene now includes natural ground around Mabel's west scarp. It uses the same height and ground colour as the yard, over a 1,024 m square. Mabel, the tunnel and its openings still need to be drawn and checked there.

Mabel is now reached with Q from the excavator. Her model loads from the borer asset, and her chase camera follows her own height underground. The model and camera still need the tunnel drawing and Claude's browser check; the scarp surface has not yet been cut away for the view. Controller input is connected and needs a hands-on check.

The head now turns with its simulated speed, and the existing rock effect appears at the face while she cuts. The rest of the lining and conveyor drawing is still to come.

The Dig now draws the trial's continuous rock lining and closed cutting face as the bore grows. The same ground shader opens the mouth in the scarp. Drawing catches up after cutting stops and is limited to four updates a second. Rings, portals and conveyor dirt still need drawing; Claude must check the view in a browser.

Claude's updated tunnel lining now receives the active machine position, heading and open mouths each frame. A portal stands at each surface mouth, facing out of the hill. The browser appearance still needs Claude's check.

Mabel now accepts a connected controller in the Dig. The existing machine axis settings select steering, thrust and slope, with standard stick axes as a fallback. Keyboard input takes priority when both are used. Controller behaviour still needs a hands-on check.

The conveyor now carries moving clods while fresh ground is cut, and the existing spark effect appears with the rock at the face. Both stop when cutting stops. Their appearance and placement need Claude's browser check.

Drive mode now stops the head and cannot cut after Mabel has entered a bore. Switch back to work mode to move along the tunnel or cut again.

In work mode, holding Shift with W gives gentle thrust. This lets keyboard players keep the head turning in hard rock. Open-ground driving and reverse keep their usual speed.

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
- `node tools/test-machine-borer.mjs`: passed with Dig simulation driving, cutting, tunnel updates and reverse travel.
- `node tools/test-machine-borer.mjs`: passed with keyboard thrust, steering and slope and mapped machine axes.
- `node tools/test-machine-borer.mjs`: passed with head pitch, conveyor, event cues and mute checks using a fake mixer.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed after adding the borer display. The display needs Claude's browser check.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed after adding the scarp ground. The view and load time have not been checked in a browser.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed with selection, model loading code and camera positioning. The model and camera have not been checked in a browser.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed after adding the head movement and face effect. Their appearance still needs a browser check.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed after connecting the trial lining and ground openings. The drawing has not been checked in a browser.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed after connecting the updated lining and portals. Browser appearance remains unchecked.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed for controller axes, slope and keyboard priority.
- `node --check src/machines/dig-game.js` and `node tools/test-machine-borer.mjs`: passed after adding conveyor dirt and face sparks. Browser appearance is not yet checked.
- `node tools/test-machine-borer.mjs`: passed with drive mode stopped inside a bore and no additional cutting.
- `node tools/test-machine-borer.mjs` and `node --check src/machines/dig-game.js`: passed with gentle keyboard thrust advancing through hard rock without a stall, and ordinary drive speed unchanged.
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

The Dig and town route planner have separate ground and tunnel data. The planner searches a surface grid and makes earthwork stages for the full route. Connecting a finished bore needs a bridge from the Dig to the town, centre-line links in the search and profiles, and work-order changes to exclude earthwork inside the bore. That is more than a small hook, so this card leaves roads and pipes through the bore for later.

The apprentice system measures a timed machine demonstration and advances abstract work stages. It has no connection to the Dig, no 20-metre teaching check, and no way to apply a delegated line cut to the borer and its tunnel. This card leaves the apprentice out rather than inventing another system.

Shift and W gives one-third thrust in work mode, matching the hardest rock. This gives keyboard players a way to cut without repeated stalls while preserving full thrust on W alone.

## Sound cues

The rules emit `borer.stall`, `borer.refuse`, and `borer.breakthrough` events. `borer.head` follows head speed, and `borer.muck` runs while cutting moves material. Playback is connected in the Dig; selection is still to be built.

## Removed

Nothing yet. The trial's plain tube will be replaced by the borer's lining and portals in the drawing step.
