# WILD-FRAMES

The short board entry controls current state, ownership, dependencies and locks.

## Why

Wildlife and helicopter skins went live on 3 November 2026 without a frame
check: the laptop's monitors were in the setup that locks frames at 33.3 ms
and does not count (rule 8), as with EARN-FRAMES. Claude (Director) released
them because at most 12 animals of at most 5,000 triangles are drawn at once
and the skins reuse Kestrel One's own materials. This card times them and
fixes forward if one misses.

## The check

With the HDMI Dell alone (Win+P, Second screen only) and nothing else heavy
running, Performance quality (Kyle, 30 October), one run each:

1. A Tremblant Woods race with eight cars at a sighting spot with a herd in
   view (the frame-pacing recipe in `tools/scenarios/frame-pacing.mjs` with
   the wildlife switch on).
2. A hover at about 110 m over a wildlife count square with the herds and
   rings in view, the wildlife camouflage skin worn at grime 80.

Pass: delivered p95 at most 18.5 ms. Record the numbers in
`docs/changes/WILD-FRAMES.md`.
