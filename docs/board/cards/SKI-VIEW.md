# SKI-VIEW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Codex (needs the screen). H5 sections 2, 4, 5 and 8. Switch `heli-skiing`
(dev). Needs SKI-HELI, SKI-ART and SKI-AUDIO.

- Drawing the ski zone: the slope with the Summit world's far terrain as
  backdrop, snow spray from the edges, gates, the kicker, moguls, the
  stashes' fresh snow, the guide's ghost on timed runs, the yeti watching
  the powder bowl (the existing yeti, scenery only).
- Camera behind the skier (C: a lower chase and a side view for aerials).
- HUD: time and gates missed, speed, the medal targets; the moguls and
  aerials score card with its three parts; the run's result card.
- Controls help lists the ski keys while skiing.
- Browser scenario (private port, memory-only storage): drop at Devils
  Playground, ski the slalom to the pickup, see the result card.

Owns: `src/ski/ski-view.js`, `src/ski/ski-ui.css`, the scenario,
`docs/changes/SKI-VIEW.md`. Hooks: `src/app.js`, `src/render3d.js`,
`src/controls-help.js`, `src/heli/heli-ui.js` (the run menu at a drop pad).
Locks: `busy-game-files`.
Sound: SKI-AUDIO's cues and lines. Art: SKI-ART.

Acceptance: the scenario; drawing never changes the ski or race state; lane
tier, build, one review; the frame check on the moguls run with the group
before it goes live (rule 8). Removed: nothing.

## Carried from LAB-SNOW (Claude, 25 October)

- Show the aerials tips (`aerialsTips()` in `src/lab/benches/launch.js`, six lines) on the Aerials run's loading card once `aerialsOpen` is true.
- Show the day's snow (`snowOfDay(day)`: name and temperature) and, with the Wax kit, the three-wax pick before each run.

## Sounds come after (Claude, 25 October 2026)

SKI-AUDIO waits for Kyle's voice session, so this card no longer waits for
it. Emit the game events the cues will hang on (as DEEP-SIRENA-VIEW did for
DEEP-AUDIO) and play only sounds that already exist; SKI-AUDIO maps its cues
and Roger's lines to those events when it runs. Moved to a cloud session;
`busy-game-files` is shared with LAB-VIEW, LAB-TUNE, MAP-VIEW and
DRIVE-LESSON-3, so keep shared-file edits in small blocks marked SKI-VIEW.

## Claude answers (25 October 2026)

All nine picks from the cloud session's questions are confirmed. One change
is made to how answer 1 is drawn.

1. **The backdrop.** Yes: the real Summit world behind the zone, turned to
   look down the real valley (305, 210 and 205 degrees).
   - Change: the eye never moves, so do not draw the whole Summit world every
     frame.
   - Capture it once when the skier steps out, as a cube render target from
     that fixed eye: 1,024 pixels a face on High, 512 on Performance. Use it
     as the zone scene's background, and free it when the run ends.
   - Only if the capture visibly loses something important (moving cloud or
     light), say so in the note.
2. **Ski keys.** Yes, as picked. The helicopter context stays, and H shows
   the ski help.
3. **Cameras.** Yes: three cameras on C.
4. **Ski box and run menu.** Yes, in `src/heli/heli-ui.js`'s side panel.
5. **Loading card.** Yes: with the moguls tip, and 10 s on powder.
6. **Result card.** Yes: it stays until pickup, then 8 s more. A stash's pay
   shows as a notice.
7. **Sounds.** Yes: no new sounds or events. The beds use `skier.speed` and
   `skiDeepSnow(view)`.
8. **The yeti.** Yes: on a rock beside the powder bowl, scenery only.
9. **Suit colours.** Yes: SKI-ART's own.

The look sheet must include one frame looking down a run, so the backdrop
seam can be judged.
