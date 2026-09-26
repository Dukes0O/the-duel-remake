---
task: TITAN-01
status: active
kind: physics
player_facing: yes
---

# Titan mountain climbing (26 September 2026)

## Design

Settled in `docs/MUDDY_HOLLOW.md` section 2 before code. Remove only the
Titan's accumulated-climb tip. The Titan may climb a whole hill while the
local grade stays within its existing `maxGrade`; a steeper grade still tips
it. Grade slows an off-road-capable car uphill and speeds it downhill. Rally
and ordinary cars keep their current limits and behavior.

No new menu entry or save data is part of this card. TITAN-01 supports the
later `muddy-hollow` feature, which will have its own dev switch.

## Tests first

Pending independent red acceptance tests in `tools/test-titan-climb.mjs`.

## Changed assertions

None planned.

## Evidence

Pending.

## Removed

Pending implementation. The Titan-only accumulated-climb cap will be removed;
no other physics path will be retired.
