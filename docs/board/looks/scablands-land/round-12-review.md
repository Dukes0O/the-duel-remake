# Scablands land, round 12: dead trees along the dry river (realism trial)

Sheet: `round-12.jpg` (left, the trial switch off; right, on: the bank from the bed, and the bank from a road 300 m away).
Pictures from the real game in a visible browser window on the QA page with memory-only saves, Performance, taken
15 November 2026 with scenario `tools/scenarios/scablands-things.mjs`. Claude drew the two shapes (a bare cottonwood and a
broken snag, `src/world/scablands-things-look.js`); Codex placed them, made the trunks solid and wrote the checks.

## Verdict (Claude): passes, merged, switch off

A dry river has dead trees on its banks, and now this one has: bare grey trees in ones and twos, 6 to 30 m back from the
lip, with long empty stretches between groups. From the bed one stands on the skyline over the bank; from a road 300 m off
three show along the river's line, which marks where the river is before its bank can be seen. They stand on the ground.

## Found in review, and cured before the merge

Reading the code, every tree was drawn facing the same way, because the trunk's solid shape was given no heading (a way round
a fault in the shared collision code, card QA-ROUND-SOLID-HEADING) and the drawing took its turn from the solid shape. The
drawing now has its own seeded heading.

## Short of right

- 115 trees on 18 km of river is thin. It is right for a dry river; a stand of five or six at one bend would give a place
  its own look. Not asked for here.
- At 300 m a tree is a few pixels tall. Nothing to do about that but stand closer.
