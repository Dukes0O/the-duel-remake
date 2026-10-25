---
task: SKI-VIEW
status: review
kind: feature
flag: heli-skiing
player_facing: yes (behind heli-skiing, dev)
---

# SKI-VIEW: heli-skiing in the game (25 October 2026)

HELI_SKIING sections 2, 4, 5 and 8; card `docs/board/cards/SKI-VIEW.md`.
Built on `cloud/ski-view` from `integration/wasteland`, behind `heli-skiing`
(dev). Claude's answers to the nine design questions are on the card.

## What a player gets

- **At the home pad:** a HELI-SKIING box on the helicopter panel's side.
  - "Take it" for the free ski drop.
  - On a group day, the group job too.
  - "Hand it back" once taken.
- **On a drop pad, with a flight in hand:** the run menu.
  - The day's snow (name and temperature).
  - The three-wax pick with the Wax kit.
  - Each run's best and medal, and a Ski button.
  - The Lab's wax run on the slalom, which waits for a wax pick.
- **Stepping out:** the helicopter's instruments give way to the run HUD.
  - At the top: the run, the clock, the gates passed and missed (judged runs
    show the judges' three shares; powder, the stashes found).
  - The speed in km/h.
  - The medal targets: times on the timed runs, points on the judged ones.
  - A key strip at the bottom.
  - "Start again" and "Leave the run".
  - C cycles chase, low chase and side. H opens the ski keys help.
- **The loading card** shows until the start line is crossed. It has:
  - the run, the day's snow and the pick, and the targets;
  - the run's tip: the moguls tip from section 5, and the six
    `aerialsTips()` lines on Aerials.

  On powder it stays for 10 s.
- **The result card**, from the session's `skiResult`. It has:
  - the time and the gates missed, or the three parts of the score card and
    the points;
  - the medal, and the pay and "new best" from `skiRecorded`.

  It stays until the pickup, then 8 s more over the helicopter's panel. A
  found stash's pay shows as a notice.
- **The zone, drawn:**
  - The snow, with its moguls and kickers.
  - SKI-ART's poles, gates, timing arches, pad flags, kicker and netting.
  - The skier in the right one of the seven poses.
  - The guide's ghost on timed runs, or the guide and four guests on a group
    run.
  - Snow spray from the outside edge in a carve or a skid.
  - The stashes' untouched snow, glittering until found.
  - The drop and pickup circles.
  - On powder, the yeti on its rocks beside the bowl, playing its idle
    (scenery only).
- **The backdrop** (Claude's answer 1): the Summit world, captured once into
  a cube when the skier steps out. The eye is 40 m above the run's pad,
  turned so the run looks down that pad's real valley (305, 210 and 205
  degrees). The cube is 1,024 pixels a face on High and 512 on Performance,
  is the zone scene's background, and is freed when the run ends.

## How it is built

- `src/ski/ski-view.js` (new):
  - pure parts: the ski keys, the cameras, the backdrop's eye, the pose
    choice, `skiDeepSnow` and the card markups;
  - the zone scene (`createSkiView`);
  - the run HUD (`createSkiHud`).

  It reads the session's view and the zones' own data, and never writes the
  run, the flight or the save. Its buttons call the app, and the session
  decides.
- `src/ski/ski-ui.css` (new): the HUD and the panel's ski box. The HUD loads
  it with a `<link>` (from `new URL(..., import.meta.url)`), because the page's
  stylesheet imports are in `src/screen-router.js`, which is not this card's
  hook.
- **Hooks**, each marked SKI-VIEW:
  - `src/app.js`:
    - the `heli-skiing` switch is passed to the helicopter session (it was
      never passed before, so the ski rules could not run in the game);
    - the ski keys go through `session.step` while skiing;
    - C and H are handled on skis;
    - `heliSki(action)` serves the box, the menu and the HUD buttons;
  - `src/render3d.js`: the ski view's pose and its draw, beside the Deep's
    private draw;
  - `src/heli/heli-ui.js`: the ski box and run menu in the side panel, the
    HUD, and the ski notices;
  - `src/controls-help.js`: `skiControlsHelp()`.

## Sounds (Claude's answer 7)

No new sounds and no new events. The session already emits everything
SKI-AUDIO's cues hang on:

- `skiCarve`, `skiSkid`, `skiPop`, `skiLand`, `skiTumble`, `skiGate`,
  `skiStash`, `skiStepOut`;
- the `ski.step-out` cue and the `ski.radio.*` lines.

The wind and powder beds can read `view.ski.run.skier.speed` and
`skiDeepSnow(view.ski.run)`. The helicopter's own sounds play as before:
it idles on the pad while the pilot skis.

## Checks

- `tools/test-ski-view.mjs` (new), 5 tests, all pass:
  - the ski keys, keyboard and pad, and the help listing every key of
    section 4;
  - the cameras never under the snow, and the backdrop's eye over each pad
    and turned to its valley;
  - the cards: all six aerials tips, the moguls tip, the targets, both
    result cards with their three parts, the menu with the snow, the waxes
    and the Lab run, and the board;
  - **drawing never changes the run:** each of the five runs is skied twice
    with the same controls, once drawn every tenth of a second. The two runs
    end with the same fingerprint. The skier is drawn where it is, every
    gate and stash is there, and the group and ghost show only when they
    should;
  - in a memory-only App:
    - the switch reaches the session, and the drop is taken through
      `heliSki`;
    - a scripted pilot flies to Devils Playground, and the skier steps out
      onto the slalom;
    - C and H change only the camera and the help, and the session's
      fingerprint is unchanged;
    - W pushes off and D tips the skis right;
    - Start again and Leave the run go through the session.
- Existing suites rerun: `test-heli-mode`, `test-deep-look`,
  `test-heli-hooks`, `test-fire-view`, `test-heli-hook-window`,
  `test-heli-lesson-core`, `test-drive-lesson-helipad`, `test-deep-story`,
  `test-board` and `test-repo-hygiene` all pass.
