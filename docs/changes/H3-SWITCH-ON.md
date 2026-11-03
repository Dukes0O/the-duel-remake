# H3-SWITCH-ON: wildlife and helicopter skins go live

Cards WILD-FINISH and SKIN-FINISH (Claude, 3 November 2026). Under AGENTS
rule 18 the Director switches green, finished work on.

## What changed

- `src/feature-flags.js`: `wildlife` and `heli-skins` from `dev` to `on`.
  Animals stand beside the roads of every course whose species have passed
  their art rounds (North woods today: Tremblant Woods and Tremblant Snow);
  the wildlife count is offered only there. Skins, gear, dirt and the wash
  work with the helicopter.

## Finishing pass

- Race at Tremblant Woods (scenario `wildlife-view`): a deer stands in open
  ground about 36 m off the road, plain in the normal chase view; animals
  run 10 to 20 m into cover as a car passes.
- From the helicopter at 110 m over the count square: counted animals get a
  pale ring that pulses once and stays faint; animals stand in open ground.
- Kestrel One in all seven paints, clean and at grime 80, gear on its mounts:
  `docs/board/looks/heli-skins/look-1.jpg` (look round 1 passed).

## Changed assertions (Claude's review under rule 18)

- `tools/test-feature-flags.mjs`: `wildlife` and `heli-skins` move from the
  list that must be `dev` to a list that must be `on`, and the message says
  so. Every other switch is checked exactly as before. Nothing loosened.
- `tools/test-heli-skin-session.mjs`: the "both off", "skins alone" and
  "wildlife alone" visits passed no override and relied on both switches
  being off by default. They now pass the off switches explicitly, so the
  same four combinations are still checked with the same expectations.
  Nothing loosened.

## Checks

- Switch-related suites: test-feature-flags, test-heli-audio,
  test-heli-logbook(-session), test-heli-pay, test-heli-save,
  test-heli-skin-gear, test-heli-skin-session, test-heli-skin-view,
  test-heli-skins, test-heli-story, test-heli-survey, test-wildlife-view,
  test-wildlife: all pass.
- Lane tier and build: see the run log line for this merge.
- Frame check not run: the laptop's current monitor setup locks frames at
  33.3 ms and does not count (rule 8), as with the earned cars. Card
  WILD-FRAMES times a Tremblant Woods race with animals and a hover over a
  count square when the HDMI Dell is alone. At most 12 animals of at most
  5,000 triangles are drawn at once.

## Removed

Nothing replaced; the two dev states are gone.
