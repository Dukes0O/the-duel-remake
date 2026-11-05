# WEAPON-WATER-CANNON

The short board entry controls current state, ownership, dependencies and locks.

Read `docs/ARSENAL.md`. On the fire truck first, then in the Armory at Fire Station level: a short readable stream, shoves cars, puts out fire and flame weapons, no damage, a counter a child can learn. Follow arsenal section 1's rules, section 2's systems. Rank and weapon balance for existing weapons do not change. Balance check `combat-balance.mjs --check`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
