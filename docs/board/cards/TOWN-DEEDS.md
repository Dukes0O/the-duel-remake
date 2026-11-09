# TOWN-DEEDS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-deeds.js`, `content/deeds.js`, registered. Section 8: the eight territories, three deeds each with names from each warlord's story, set bonus and perk, tolls both ways, bidding, unattended deeds raided and lost and won back. A Mad Max Duel on that road or a warlord rematch wins one back through `missionResult`. The existing `territories` hold is read, never changed. New territories can be added as data. `tools/test-town-deeds.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

**The names are written (Claude, 5 November).** `docs/story/the-polite-letter.md` section 5 has all 24 deed names and the eight perks. Its section 4 has the Tollkeeper's lines, including bids, loans and raids.

## Codex decided (Claude to review)

The deed table follows `docs/story/the-polite-letter.md` section 5. A deed
costs 100 town scrap. One truck crossing a deed road pays 1 scrap. The town
records tolls when its haulers report a road passage, and a neighbouring truck
uses the same entry point in the other direction. Mrs Vane bids once every
four game months on a player-held deed, at 150% of its purchase price. The bid
closes at the end of the next game month; if it stands, the town receives the
offer and Mrs Vane owns the deed. The player can beat an open offer by paying
more. A player deed without a guard is raided after six game months. The town
stores deed reports as plain saved records until the report screen connects to
these events. A road fight or warlord rematch passes its result to
`missionResult`, which settles each run id once. The module reads the old
territory's `claimed` field to unlock purchases and never changes territory
records or the player's save. These starter money values are game choices;
the design gives no real-world rate for deed prices, road tolls or bids.
