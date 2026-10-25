---
task: DEEP-SIRENA-VIEW
status: review
kind: feature
flag: the-deep
player_facing: yes (behind the-deep, dev)
---

# DEEP-SIRENA-VIEW: the Sirena story in the game (25 October 2026)

THE_DEEP sections 6.2, 6.3, 6.7 and 6.8, card
`docs/board/cards/DEEP-SIRENA-VIEW.md`. It also wires DEEP-LOG's sea-life log
and DEEP-LIFE's whale. Built on `cloud/deep-sirena-view` from
`integration/wasteland`, behind `the-deep` (dev). Claude's answers to the
seven design questions are on the card.

## What a player gets

- **First dive:** Ana calls (`hello`, then `legend`). The badge glints in the
  sand near the foot of the ramp. Stopping beside it raises it, pays 100 and
  gives the sonar (`badge`).
- **R pings** (gamepad B): a ring spreads and the blip shows the nearest
  part's direction and distance, or "No echo". The first ping of a dive, while
  no part is up, brings Ana's 1,500 m line (`sonar`).
- **F held** beside a part (gamepad X): a yellow bag fills for 3 s and
  carries the part up to the surface. Driving off cancels it.
  - The first time near a part, Ana explains (`bag`); each part brings
    `part`, and the fifth piece brings `deep`.
  - The Sirena takes four bags and 12 s and rises slowly. Ana: `car`, then
    `raised`, then `lab`. The whale passes if it has not this visit
    (DEEP-LIFE, through `deepRaised`).
  - On the way back up the ramp after the dive that raised the first part,
    Ana tells the Norseman story (`norseman`).
- **Sea-life log** (DEEP-LOG): creatures and pearls are logged in the dive,
  paid and saved once. The picture card slides in and Ana's log lines play.
- **Ana's captions:** one line at a time, in a caption strip, never over a
  title card. Each caption shows even with the sound off.
- **The Drop-off:** a dark band of open water stands past the lip's seaward
  side, so the lip reads as a drop. The door waits on the lip, and the Sirena
  on her ledge below.
- **Garage:** once she is raised, the Sirena appears under a drawn sheet
  ("Needs the Lab"). Once restored, the panel says to race the Coast Cup; once
  the cup is won, it shows the plaque.
- **Coast Cup:** after that race, the title card "Coast Cup, 1966 to 2026:
  finished" and Ana's `cup` line. `deepCoastCup` is emitted by the existing
  settlement.
- **Controls help** lists R and F only while diving.

## How it is built

- `src/deep/deep-story.js` (new, pure rules, no graphics) steps DEEP-SIRENA's
  `stepLift` and `pingSonar` and DEEP-LOG's `stepLog` each underwater frame,
  and emits their events and Ana's story lines as `deepPhone {line}`. It
  reads a save snapshot (`startCampaign({deepSave})`) and the car's picture,
  and never changes race state.
- **Hooks**, each marked DEEP-SIRENA-VIEW:
  - `src/game.js`: the `deepSave` option, the story step after the dive
    step, `deepPing()`, and F held recorded as `_deepLift`;
  - `src/app.js`: `deepSave` passed in; `_settleDeepStory` pays and saves
    `raiseFind`, `recordLogged` and `recordPearl` on the events, with the
    dive settlement's checks (this run, this player, switch on), then passes
    `phoneLineFor`'s lines; the `deep-ping` action;
  - `src/input-contexts.js`: R and gamepad B = `deep-ping` in the car
    context, free there (checked: the camera is C; only the helicopter's own
    context uses R). F is the existing held `interact`;
  - `src/controls-help.js`;
  - `src/deep/deep-ui.js`: an optional `createExtras` that the dive's scene
    builds, updates and disposes;
  - `src/render3d.js`: passes `createSirenaScene`;
  - `src/screen-router.js`: mounts the HUD;
  - `src/screen-garage.js` and its stylesheet: the Sirena panel.
- `src/deep/sirena-view.js` (new) holds the 3D story, the HUD and Ana's
  phone queue:
  - the 3D story: SIRENA-ART's models at their finds, the glint, the bags,
    the rise and the drop;
  - the HUD: the sonar ring, the caption strip, the log card and the Coast
    Cup title card;
  - Ana's phone queue, through DEEP-RADIO's phone chain.

  `src/deep/sirena-ui.css` (new) styles the HUD.

## Sound cue

- Ana's lines play through DEEP-RADIO's phone chain, and `deep.logged` and
  `deep.pearl` play as before.
- DEEP-AUDIO's four story cues have not merged. This card emits the events
  they will map to (Claude's answer 4): `deepSonar`, `deepLift`,
  `deepLiftCancel` and `deepRaised`.

## Checks

- `tools/test-deep-story.mjs` (new), 7 tests, all pass, after the review
  fixes. They play the whole story headless in a real Kelp Coast dive:
  - Ana's lines in order, from first dive to the Sirena raised;
  - the Norseman line on the way back up;
  - the log and pearls in the dive;
  - the switch off: no story, no events, R does nothing;
  - controls help lists R and F only under water;
  - a memory-only App pays and saves the badge (100) and the otter (50)
    once, standing still pays nothing more, and the otter line reaches the
    phone;
  - the phone queue: one line at a time, in order, a caption without sound,
    none over a title card, and a quit that lets the current line finish but
    drops the rest;
  - the garage panel in each Sirena state, and gone with the switch off.
- `tools/test-deep-look.mjs`: the `src/deep` allow-list gains this card's
  hooks and test (changed assertion, below). It passes, 5287 checks.
- Lane tier (`--changed --jobs 4 --keep-going`, current integration merged
  in, after the review fixes): 69 suites, 65 passed, 4 failed. All 4 need the
  laptop and the Windows Recycle Bin: `test-course-kit`,
  `test-earned-cars-ui`, `test-medals`, `test-drive-through`. The replay and
  world guards pass, so Pacific Canyon replays stay exact with the switch
  off.
- `npm run build`: built.
- **Browser scenario** `tools/scenarios/deep-sirena.mjs` (private port,
  memory-only storage): passed with 0 console errors and 6 screenshots, also
  after the review fixes. It
  covers the dive, the badge raised and paid, the sonar ("40 m"), the bonnet
  bagged and paid, the Drop-off lip, and the garage sheet. The look sheet is
  `docs/board/looks/deep-sirena-view/round-1.jpg`, with its note, for
  Claude. In the cloud, Chromium needs a `--no-sandbox` wrapper (the
  container runs as root); there is no repository change for that.
- **Frame time: not now.** Rule 9: no frame checks on what players cannot
  reach yet. The laptop measures the delivered frame time at the thickest
  part of the Kelp Forest when FINISH-DEEP turns `the-deep` on (Claude,
  25 October 2026). This cloud machine has only a software graphics device
  in any case.
- **Laptop to run:** the 4 suites above and the `deep-sirena` scenario in
  the real browser.
- **Look:** Claude's verdict on round 1 is a pass, with the bag drawn 1.8
  times larger from the chase camera (`BAG_DRAW_SCALE` in the view). The
  rules, timings and the 3 s fill are unchanged.

## Review

One independent review (this card touches pay and saves). It checked pay,
saves, race state, replays, keys and GPU disposal, and they are clear. It
found two faults in Ana's phone, both fixed here and covered by the test:

- **The Norseman line was cut on the way up and lost for good.** The line
  starts on the first frame of the ascent, but the dive ended about 6 s
  later and the phone stopped. The take is about 8.5 s, and the line is
  never offered again. Now a normal exit up the ramp lets Ana finish what
  she has queued over the menu.
- **Quitting a dive to the menu left Ana talking** through every queued
  line. Now a quit or a new race stops her after the line she is saying.

Hardening taken from the review:
- a line whose sound never reports its end (a closed context) times out;
- `_settleDeepStory` also needs a race run;
- `aria-live` is on the caption only, not the sonar distance.

A design note for Claude: Ana's `sonar` line ("Press R to ping...") plays on
the first ping, as 6.3 says, and the badge line does not name R. A child who
never opens the help may not find R. Moving the `sonar` line to just after
the badge would fix it.

The Coast Cup title card (on `deepCoastCup`) is covered by neither the node
test nor the scenario; the laptop sees it after that race.

## Changed assertions (for Claude's review)

- `tools/test-deep-look.mjs`: the `src/deep` import allow-list gains this
  card's named hooks and its test:
  - `game.js` → `deep-story`;
  - `app.js` → `deep-sirena`, `deep-log`;
  - `render3d.js` and `screen-router.js` → `sirena-view` (and its CSS);
  - `screen-garage.js` → `sirena-car`.

  Nothing is removed.

## Removed

Nothing.
