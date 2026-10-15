---
task: RELEASE-HELI
status: ready-for-release-gate
kind: release
flag: helicopter
player_facing: yes
---

# Helicopter release, 14 October 2026

Kyle said "go live" in this session on 14 October 2026, after the H1
finishing pass (HELI-FINISH) and Kestrel One's model were merged.

## What goes live

One switch goes from dev to on: `helicopter`. Every other switch keeps its
state. With it on:

- HELIPAD on the main menu; the pad at Tremblant Woods; the opening and
  lessons 1 to 4 with the instructor (Brian's voice through the radio
  filter); fuel (the first tank free, then 1.5 credits a kg; lesson 3 opens
  the pump after the free tank and the dispatch board, lesson 4 opens
  carrying cars); flying to Tremblant Snow and Panorama Ridge with the cruise
  leg; carrying your own car and setting it down; Race here; three jobs a
  day; repairs that never take credits below zero; the fuel truck; Assisted
  and Real flying; the autopilot (P); four camera views (C); the
  instruments.
- Kestrel One's original model (`public/assets/heli/kestrel-one.glb`),
  loaded only when someone flies.
- The Koenigsegg Jesko Absolut travels only by air (Kyle's decision in the
  storyboard): it races only on the course where it was last set down,
  starting at Tremblant Woods. Players who own it keep it.
- A new optional save field `heli`; untouched saves gain nothing until the
  player visits the helipad.

Not in this release: HELI-ART-SRC's cargo hook, helipad and fuel pump
models (the hook and the pad's H are drawn simply until they pass), and the
later sprints (H2 Fire and after).

## What else the release carries

Three items Kyle approved, recorded in their own change notes:

- STEER-055 (8fd3e494).
- P4-FINISH-1014 (bc85df40).
- P4-FINISH-PANORAMA (c458cf29).
- PANORAMA-TOWN (66d93044): Panorama Ridge's valley town redrawn in code
  (64 houses, a church, lamps); looks only, world signature recaptured after
  a reviewed sheet. It changes how a released course looks, so the release
  browser checks include it.
- Art for later helicopter sprints under `public/assets/heli/` (fire bucket,
  fire effects, rescue props, burnt Tremblant props and textures, the Barely
  News logo). Nothing loads it yet; it only adds bytes to the build.
- FIRE-SAVE (ac89c5eb): H2 save fields behind the new `forest-fire` switch,
  which stays `dev` (off for players).

Everything else merged on integration since the last release stays behind
its own development switch (unchanged for players).

## Changed code

- `src/feature-flags.js`: `helicopter: 'on'`.
- `README.md`: the release paragraph.
- Fix from the release review: the "travels only by air" message never
  reached the screen. `src/heli/heli-jobs.js` gains `airOnlyNote`, and
  `src/screen-readiness.js` shows it in the menu's start note and closes
  START ENGINE while an air-only car is away from the chosen course.
  `tools/test-heli-mode.mjs` approves that one import;
  `tools/test-heli-hooks.mjs` checks the note matches the game's own refusal;
  the `heli-first-flight` scenario checks it on the real menu. The reviewer
  confirmed the fix, and found the line under START could come back with the
  old course's words after a course change; the line is now put back only
  if the menu has not written a newer one (checked in test-heli-hooks).

## Known, for a later card

The WASTELAND button and arena starts from the yard still do nothing
without a word when the Jesko is chosen on the course where it sits (the
reviewer's second note). Rare: it needs the Wasteland open and the Jesko
chosen. It needs `src/app.js` (busy-game-files), so it waits for its own
card.

## Changed assertions (reviewed)

- `tools/test-heli-mode.mjs`: the switch is expected `on` instead of `dev`.
- `tools/test-wasteland-beta.mjs`: the pinned switch table expects
  `helicopter: 'on'`.
- `tools/test-course-eligibility.mjs`: "every owned car starts on every
  course" now expects the Jesko to start only at Tremblant Woods (where a
  fresh save has it) and be refused with the reason on the other 19 courses.
  The test names that answer itself and checks every other car is never
  refused.
- `tools/test-koenigsegg-driver.mjs`, `-driving.mjs`, `-progression.mjs`:
  the Jesko's save records it as flown to the course each race uses, so the
  same races and handling checks run unchanged.
- `tools/test-heli-mode.mjs`: the import guard approves
  `src/screen-readiness.js` reading `heli/heli-jobs.js` (one new entry; the
  guard is otherwise unchanged).

## Checks

Lane tier and build in this lane; full tier, combat balance and the
helicopter's browser playthrough on the exact release commit, recorded in
`docs/VERIFICATION.md` at install.

## Removed

Nothing. The switch's off paths come out with the switch clean-up once the
release settles.
