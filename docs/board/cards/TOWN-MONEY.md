# TOWN-MONEY

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-money.js`, registered. Section 3, 9 and 11: rent, shop money, tickets by Cheap, Fair and Dear, upkeep, weekly Ledger (money in by kind, money out by kind, profit, last 8 weeks), `tillIn`, `tillOut` with the levy, the starting grant, and a rescue: if the till is empty for a week, the Tollkeeper or Hollis lends 300 with no interest and says so, so a town can never be stuck. An unpaid building stops working and says why; nothing is ever seized. `tools/test-town-money.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read section 9 (how it works) and section 13 (checks) first. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
