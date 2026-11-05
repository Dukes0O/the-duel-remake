# TOWN-DEEDS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-deeds.js`, registered. Section 6: the eight territories, three deeds each with names from each warlord's story (`src/town/town-deed-data.js`), set bonus and perk, tolls both ways, bidding, unattended deeds raided and lost and won back. A Mad Max Duel on that road or a warlord rematch wins one back through `missionResult`. The existing `territories` hold is read, never changed. `tools/test-town-deeds.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
