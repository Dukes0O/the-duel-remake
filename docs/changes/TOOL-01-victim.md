# TOOL-01 combat hit victim metadata

Combat hit events now include `victim: 'player' | 'rival' | 'traffic'` so a balance report can count player hits without treating enemy self damage or traffic damage as player damage. The existing `combatHit`, `strength`, and `enemy` fields remain unchanged.

Focused check: `node tools/test-combat.mjs` passed 67 checks, including one event for each victim type. No existing assertion changed, and no race physics or save fields changed.
