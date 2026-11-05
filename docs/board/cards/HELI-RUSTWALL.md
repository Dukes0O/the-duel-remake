# HELI-RUSTWALL

The short board entry controls current state, ownership, dependencies and locks.

Story section 6. The Scablands as a place Kestrel One can fly: read `docs/HELICOPTER.md`, `docs/HELI_FIRE.md`, `docs/PILOT_MAP.md`. Helipad in the town is the pad; Reservoir is scoopable; fire on the Ridge job using the same bucket; lift a crate or truck; scout clears fog. Roger's lines from story section 10. No pilot yet: Dune goes, by dispatch. No helicopter rules change. Everything behind `wasteland-town`. Claude owns final flying feel; say what to check.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
