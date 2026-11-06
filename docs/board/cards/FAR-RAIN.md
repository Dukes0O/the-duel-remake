# FAR-RAIN

The short board entry controls current state, ownership, dependencies and locks.

Rain, view only, in `src/render/` files of its own, with a switch per region: a single drop on the glass first, then more, wet ground and puddles, a grey sky, and `far.rain` coming in slowly. No race rule changes. No released course uses it, and each stays byte for byte the same.

**Checks:** `tools/test-far-rain.mjs`: a replay with rain on matches one with it off; a released course never enables it. Claude judges the look, and checks frames on both qualities.

Design: [docs/story/the-far-side.md](../../story/the-far-side.md) and [docs/MACHINES.md](../../MACHINES.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
