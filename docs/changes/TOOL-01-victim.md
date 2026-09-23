# TOOL-01 combat hit victim metadata

Combat hit events now include `victim: 'player' | 'rival' | 'traffic'` so a balance report can count player hits without treating enemy self damage or traffic damage as player damage. The existing `combatHit`, `strength`, and `enemy` fields remain unchanged.

Focused check: `node tools/test-combat.mjs` passed 67 checks, including one event for each victim type. No existing assertion changed, and no race physics or save fields changed.

Cherry-picked as `1d9110f` with BUG-08. The 147-suite integration gate,
production build and private High/Performance browser smoke passed. This event
identity will be used by TOOL-01 to count only CPU attacks that hit the player.
