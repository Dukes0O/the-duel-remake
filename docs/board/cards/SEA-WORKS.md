# SEA-WORKS

The short board entry controls current state, ownership, dependencies and locks.

The Sea Works as town data. `SEA_WORK` in `src/town/content/sea-works.js`, the part order in section 2, the Fund's line in the Ledger, opening from chapter 23. Sites use the town's own work orders, so a site short of steel stops and says so, and machine parts use `docs/MACHINES.md`'s do, teach, hand over. The Clean Fleet's raids through TOWN-DEFEND, about twice a year while the works run. `sea.quill.names` plays when one of the town's people who worked on a site dies, and the Book records it.

**Checks:** `tools/test-sea-works.mjs`, headless: a scripted town of 500 finishes all the sites between 5 and 12 game years; all hours add to about 2,000,000 and steel to about 400 tonnes; the Ledger still balances; a save from Year 18 loads.

Design: [docs/story/the-sea-works.md](../../story/the-sea-works.md), [docs/story/the-long-dry.md](../../story/the-long-dry.md) and [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) sections 2, 3, 10, 11. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
