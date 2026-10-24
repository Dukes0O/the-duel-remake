# DEEP-SIRENA-VIEW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Codex (needs the screen). THE_DEEP sections 6.2, 6.3, 6.7 and 6.8. Switch
`the-deep` (dev). Needs DEEP-SIRENA, SIRENA-ART, DEEP-RADIO and SIRENA-CAR.

The one wiring card for the story, holding `busy-game-files` once:

- Keys under water: R pings, F lifts (check both are free while diving;
  the controls help lists them only while diving).
- Drawing: the wreck and loose parts at their finds, the badge's glint, the
  yellow bag filling and rising with its part (four bags with the car,
  rising through the kelp into the light), the sonar ring and blip with the
  distance in metres, "No echo".
- Ana: plays the `deep.ana.*` lines at the steps of 6.2 and 6.7 with a
  caption strip, one at a time, never over a title card.
- Garage: the Sirena under a sheet ("Needs the Lab") while `waiting`; the
  plaque on its page after the Coast Cup; the "Coast Cup, 1966 to 2026:
  finished" title card after that race.
- Browser scenario (private port, memory-only storage): dive, badge,
  sonar, one bagged part, the garage sheet.

The seaward side of the Drop-off lip must read as a real drop into dark water,
because the Sirena rests on a ledge just below it. The Kelp Coast zone data
(DEEP-TRAIL) marks the lip only with `rock` near 1 and a depth of about 25 m;
it has no field for water beyond the trail, so the look draws the drop.

Owns: `src/deep/sirena-view.js`, `src/deep/sirena-ui.css`, the scenario,
`docs/changes/DEEP-SIRENA-VIEW.md`. Hooks: `src/app.js`, `src/game.js`,
`src/render3d.js`, `src/screen-garage.js`, `src/controls-help.js`.
Locks: `busy-game-files`.

Sound: DEEP-AUDIO's four new cues and DEEP-RADIO's lines. Art: SIRENA-ART.

Acceptance: a player can go from the first dive to the Coast Cup with the
scenario's memory save; the renderer and screens never change race state;
Pacific Canyon replays exact with the switch off; lane tier, build, one
review. Removed: nothing.
