# TOWN-MONEY

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-money.js`, registered. Section 5, 11 and 14: double entry in named accounts, monthly and yearly; rent, shop money, tickets by Cheap, Fair and Dear, wages, upkeep; what you own and what you owe; loans with real interest; `tillIn`, `tillOut` with the levy; the 1,500 grant. If the till is empty for a season, Hollis lends what keeps the town going and says so, so a town can never be stuck. An unpaid building stops working and says why. `tools/test-town-money.mjs`: the books balance to the scrap after a 30 year run.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The money design does not set shop and ticket prices, staff wages, loan rates,
or what monthly trade volume looks like. Use integer scrap throughout. Rent is
6, 12, 16 and 20 scrap per person each month by the four home tiers, matching
the section 14 range; use the middle rent of 12 scrap to set a starting wage
of 96 scrap per staff member, matching the stated eight-to-one ratio. Cheap,
Fair and Dear tickets cost 2, 5 and 10 scrap. Shops use those same prices and
record their monthly customers. Loans charge 1% monthly interest, compounded
monthly. Buildings use section 14's upkeep and staff figures. These are
starting values in the money module so TOWN-PACE can tune them with a balance
review. Keep unpaid buildings out of service until their next bill is paid;
Hollis's seasonal loan covers unpaid bills and is recorded as a liability. Add
a one-time starting grant of 1,500 scrap to the town ledger.
