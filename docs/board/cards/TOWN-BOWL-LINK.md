# TOWN-BOWL-LINK

The short board entry controls current state, ownership, dependencies and locks.

`docs/story/the-long-dry.md` promises three things about the Bowl that no card builds: fans walk over from your homes, Show Nights put ticket money in the till, and the beaten Scrapasaurus stands in the town square. The school bus job also needs somewhere to drive to. The Bowl is a course (`docs/WASTELAND_WORLD.md` section 8), not a place on the Scablands map, so this card makes the link.

- **A Bowl gate on the map.** A prompt at about (-340, 20), on flat ground near there and clear of every place in the story job tables. Driving up to it goes to the Bowl, as the Dome's gate goes to the Scrapdome panel. TOWN-WORLD reserves it if it lies on the town's ground.
- **Tickets.** A finished Show Night pays the till through `missionResult`. The Ledger shows it as its own line. The player's own winnings stay as they are.
- **The crowd.** Show Night's crowd size reads the town's population, and never changes a rule or a replay. With no town the crowd is the size it is today.
- **The Rex.** Once the Scrapasaurus is beaten, it stands in the town as a building that costs nothing and needs no site, in a spot the player picks, using BOWL-ART-REX's model. It is an ornament that adds mood within 16 cells.

**Checks:** `tools/test-town-bowl-link.mjs`, headless: a Show Night result adds its tickets to the till once and only once; a larger population gives a larger crowd with the same replay; no town means today's crowd and no error.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
