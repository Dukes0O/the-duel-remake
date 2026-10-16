---
task: RELEASE-FIRE
status: ready-for-release-gate
kind: release
flag: forest-fire
player_facing: yes
---

# Forest fire release, 15 October 2026

Claude's decision under AGENTS rule 18 (Kyle, 15 October 20:45: finished
green features go live on Claude's decision); Kyle asked for this release
by name ("Follow rule 18: release H2 Fire"). Claude is Release Manager.

## What goes live

One switch goes from dev to on: `forest-fire` (it works only with the
helicopter, which is already on). With it on:

- The mission engine: after lesson 4 and a few trips, a fire call comes
  mid-flight; R answers now or later.
- The bucket at the pad, the lake, the aim ring, H to pour; fire spreads one
  step per 200 s of engine time and three steps a new play day.
- A fire out pays 1,500 credits and the firefighter badge; a fire lost
  closes Tremblant Woods for 10 play days, with a buyback (10,000 credits,
  less each day), and the burnt course grows back in four stages, seen in
  races and from the air; Sarah's news at each stage.
- Seasons: fire calls weighted summer 4, autumn 2, winter 0, spring 1; the
  first snow puts a burning fire out.
- The fire's sounds and Roger's and Sarah's lines.

The FIRE-SAVE unknown-key rule has been live since the helicopter release
(14 October), so an older build reading a save with fire fields keeps them.

## What else the release carries

Since the live Ardennes build (7d430cd0): P4-FINISH-ARDENNES round 3, the
braking boards beside the road (bf358e5a), already named in the README.
Everything else merged since is documentation or board records; every other
switch keeps its state.

## Changed code

- `src/feature-flags.js`: `'forest-fire': 'on'`.
- `README.md`: the release paragraph.

## Changed assertions (reviewed)

- `tools/test-wasteland-beta.mjs`: the pinned switch table expects
  `'forest-fire': 'on'` instead of `'dev'`. The written review is this
  note (rule 18: Claude's written review is the approval).

## Checks

- Full tier: the Ardennes release candidate ac8fd6c3 (which already carried
  every H2 card) ran 452/453 alone with four jobs; its one failing suite,
  a fixture gap in `test-expansion-vegetation-grounding.mjs`, was fixed and
  passed in its own reviewed lane (17/17). Rule 19: that covers this release
  except what changed since, which the lane tier covers.
- Lane tier and build in this lane (below), covering the switch and every
  suite that reads it.
- Combat balance passed on ac8fd6c3 (51 policy runs, 90 baseline races, no
  flags); nothing combat-related has changed since.
- H2's browser checks passed on the same code: FIRE-VIEW's look and frame
  check (p95 18.2 ms on High and Performance over a 43-cell fire and racing
  on the burnt course) and FIRE-FINISH's play-through (a fire flown out and
  paid, a fire left to burn and the course closed). They set the switch in
  the page, so turning it on in the build changes nothing they measured.
- At install: the staged build on a private port with the switch on by
  default, then the live HTTP checks (recorded in `docs/VERIFICATION.md`).

## Removed

Nothing. The switch's off paths come out with the switch clean-up once the
release settles.
