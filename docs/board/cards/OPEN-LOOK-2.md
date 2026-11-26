# OPEN-LOOK-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics). Cut on 25 November 2026 from Claude's verdicts
on round 1 of the two open Scablands sites. Kyle, 25 November 2026: further rounds go to Codex.

## What to build

Round 2 of the Glasshouse and the Rats' Nest, from the two verdicts. Read both first: each says what passes and must
stay, and what does not.

- [The Glasshouse, round 1](../looks/open-glasshouse/round-1-review.md), on `src/world/open/looks/glasshouse-look.js`.
- [The Rats' Nest, round 1](../looks/open-rats-nest/round-1-review.md), on `src/world/open/looks/rats-nest-look.js`.

**The Glasshouse, in this order.**

1. **The burned camp reads as burned from its edge.** Scorched black ground round the tent and along the rows, charred
   poles still standing, soot up the pump's legs, and grey ash blown in streaks across the white salt downwind. A
   player driving up sees black before anything else.
2. **The tracks leaving read as tyre tracks.** They wander, cross, fade and have tread. The cart's two ruts are plainly
   wider apart and deeper than the buggies' tracks, and the footprints between them are seen from eye height.
3. **The bean pods are seen from a few steps away:** bright green on white, a little larger, lying across the track.
4. **The camp is read from the road.** The stove's smoke stands as a thin pale line taller than the haze, read from
   1,000 m at dusk. The glint is seen from 250 m by day in `camp-glint`.
5. **The scenario:** `far` stands where the Salt Road gives a clear view (no slope filling the frame), and `cold-clues`
   looks at what is left (the lamp, the frames, the pump).

**The Rats' Nest, in this order.**

1. **The smoke.** Each column is two or three crossed sheets with broken edges, rolling and paling as it rises, and a
   little thicker from 1.2 km.
2. **The yard is lived in.** Paths worn pale between the shacks, the fires and the pen; scrap sorted into heaps by
   kind; drums, a table, a line of washing. The red blotches on the floor go.
3. **The water cart is known from `rim-middle`:** near enough to that place on the rim, with its windscreens catching
   the light. This is the picture that tells the player who burned the camp.
4. **Tin roofs** rusted and dulled, no two sheets alike. **Tyre tracks** as two unbroken ruts, not ladder rungs.
5. **The road down at night** has one lamp at the head of the ramp, where a lookout would stand.
6. **The wrecks a player walks past** (by the drain, at the pen's gate) are mended close up.

Keep each site's names, spots, solids and layout as they are: other cards are built on them. Stay inside 12 draws and
60,000 triangles for each stage.

## Files and locks

`src/world/open/looks/glasshouse-look.js`, `src/world/open/looks/rats-nest-look.js`, their tests
(`tools/test-glasshouse-look.mjs`, `tools/test-rats-nest-look.mjs`) and scenarios (`tools/scenarios/look-glasshouse.mjs`,
`tools/scenarios/look-rats-nest.mjs`), `tools/open-look-stand.js`. No lock.

## Checks

1. Both look tests: each stage within the budget, the layout and spots unchanged, solids inside the radius.
2. Run both scenarios. Take the pictures in your cloud with software drawing, as the round 1 sessions did
   (`docs/ART_LINE.md`, "A site drawn in code, stood in the open land"), look at them, and mend what they show before
   handing over. Say that this was done, and that Claude has not looked yet.
3. One sheet for each site: `docs/board/looks/open-glasshouse/round-2.jpg` and `docs/board/looks/open-rats-nest/round-2.jpg`
   (500 KB at most each), each replacing that site's `round-1.jpg`, which is removed in the same change.

Rule 23 (behind an off switch; nothing loads the looks yet): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-glasshouse-look --filter test-rats-nest-look`
and `npm run build`. Claude takes the pictures on the laptop and writes the verdict at the merge.

## Sound cues

None.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), sections 16 and 21; it wins over this card where
they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off may change.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on. Before CARD DONE, search `tools/` for every older suite and scenario that names what this card changes,
and run them. Checks use memory-only saves. Write `docs/changes/OPEN-LOOK-2.md` with a **Removed** line. After the pull
request is open the card is finished: do not wait for review comments.
