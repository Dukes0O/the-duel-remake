# TOWN-PIPES

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-pipes.js`, `town-power.js`, `town-treatment.js`, registered. Section 3 and 11. Three pipe sizes, laid along agreed routes (TOWN-ROUTES) as work orders, on their own layer. **First try the real EPANET engine through `epanet-js` (`docs/MACHINES.md` section 12): check its licence at the source, and adopt it if it runs repeatably in browser and Node and solves 500 junctions in under 50 ms; if not, say why and use section 11's method.** Either way: a tap above its tower gets nothing, a long thin pipe gets less. Taps at 7.5 L a minute with real queues, 15 to 50 L a person a day, carrying buckets until there is a tap (and the hours it costs people). The Water Road tap limited in litres (read through TOWN-LINKS). Water quality carried with the water; settling, sand filter, boil or chlorine as real stages with a turbidity number. Sewers need a fall. Latrines: 20 people each, fill in about 2 years, the 30 metre and downhill rule. Reed beds. Power in kW against demand; wind and sun vary. Every shortfall gives a plain sentence and the cells to show. Plain arrays for overlays. `tools/test-town-pipes.mjs`, with the real sums in the test so that anyone can check them.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

Use the section 11 fallback for this lane. The source repository lists MIT,
and its README says it supports browser and Node, but `epanet-js` is not
installed here and package fetching is unavailable. I could not run the
repeatability or 500-junction timing check, so the card's adoption gate is not
proven. The fallback stays in plain data and does not add a dependency.

The system tick has no player profiles. It reads the Water Road limit from
`town.utilities.waterRoadLimitLitresPerDay`, supplied by the town link layer,
and defaults old towns to 10,000 litres a day. This keeps the profile read
outside the pure simulation.

For one tap, draw from each reachable source in order of lowest pipe loss
until its demand or daily queue is met. Track each source's own remaining
supply. Treatment plants process water in the order it reaches them on each
source-to-tap route. A plant treats up to its remaining capacity; its output
mixes with untreated water before continuing to the next plant. A sewer chain
stops at its first segment that does not fall; a lower final outlet cannot
make an uphill segment flow. A connected source with no available water has a
different report from a tap that lacks pressure.
