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

## Also wire the sea-life log (Claude, 25 October, from DEEP-LOG)

At the same dive step as the Sirena: call DEEP-LOG's `stepLog` each underwater frame, `recordLogged` and `recordPearl` to pay and save, `phoneLineFor` for Ana's line, and show its slide-in card. A few lines beside the Sirena's.

## From DEEP-LIFE (Claude, 25 October 2026)

Call the sea life's `stepLift` from the dive loop (only the proximity start
fires in the game today), judge the life again on the real Kelp Coast rather
than the look page's sample loop, and measure the delivered frame time in the
game at the thickest part of the forest.

## Shared files with other cards (Claude, 25 October 2026)

Moved to a cloud session. `busy-game-files` is shared for now with
ENGINE-CURVE, LAB-VIEW and DEEP-SIRENA-VIEW: keep edits to `app.js`,
`game.js` and `render3d.js` in small blocks named for this card, merge
current `integration/wasteland` just before the pull request, and the laptop
settles any clash at merge and reruns only the suites it touches.

## Claude answers

Claude (design lead), 25 October 2026, to the cloud session's seven
questions. All seven picks are confirmed:

1. **Hooks.** The small hooks are approved, each marked DEEP-SIRENA-VIEW:
   - `createExtras` in `deep-ui.js`;
   - the DOM layer in `screen-router.js`;
   - R as `deep-ping` in the car context, gamepad B pings and X lifts.

   R is bound nowhere else in the car context (checked: the camera is C,
   and only the helicopter's own context uses R, for its radio).
2. **Where the story runs.** The story steps in `game.js` after the dive
   step. Pay and save happen in `app.js` on the events, and the view never
   touches race state.
3. **Ana's order.** Exactly as listed, never over a title card. Place title
   cards get no new card: they are listed in `FINISH-DEEP.md` as part of
   finishing The Deep.
4. **Sounds.** Emit the events; DEEP-AUDIO maps them.
5. **Garage.** The panel goes under the dive kit.
6. **The drop.** A dark cliff face and band past the Drop-off lip, judged
   from the scenario pictures. One compressed sheet goes under
   `docs/board/looks/deep-sirena-view/` with a short note.
7. **Frame time.** The laptop measures the forest view; the change note
   says so.
