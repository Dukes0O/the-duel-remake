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

Everything merged on integration since the last release that stays behind
its own development switch (unchanged for players), and any fixes merged
since then, as recorded in their own change notes.

## Changed code

- `src/feature-flags.js`: `helicopter: 'on'`.
- `README.md`: the release paragraph.

## Changed assertions (reviewed)

- `tools/test-heli-mode.mjs`: the switch is expected `on` instead of `dev`.
- `tools/test-wasteland-beta.mjs`: the pinned switch table expects
  `helicopter: 'on'`.

## Checks

Lane tier and build in this lane; full tier, combat balance and the
helicopter's browser playthrough on the exact release commit, recorded in
`docs/VERIFICATION.md` at install.

## Removed

Nothing. The switch's off paths come out with the switch clean-up once the
release settles.
