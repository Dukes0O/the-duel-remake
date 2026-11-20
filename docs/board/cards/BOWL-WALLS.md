# BOWL-WALLS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: how a truck meets a wall). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

Walls that bounce, and no wear outside a fight. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 7 and 8. Kyle, 20 November
2026: "low-speed hits on walls should be bounces, not damage".

**Measured before (Claude's hand drive):** a wall touch at 12 mph adds about a third to a damage zone, the truck stops at
0 to 3 mph and stays pressed on the wall nose first, and a truck held on W with no steering ends against an end wall.

## What to build

1. **The Bowl's wall rules,** read from data in `BOWL_FLOOR` (`wallBounce`), for the stand wall, the Spine, its
   containers and truck against truck. Speed is the speed straight into the wall.
   - Under 25 mph: no damage; pushed back out at two fifths of the incoming speed (at least 2 m a second); nine tenths of
     the speed along the wall kept; the nose turned to within 20 degrees of the wall's line inside 0.4 seconds.
   - 25 to 45 mph: the same at three tenths, with the event `bowlWall {kind: 'hard'}`; in a fight a twelfth of full health.
   - Over 45 mph: a quarter, the truck spun a quarter turn; in a fight a sixth of full health.
   - Under 30 degrees to the wall at any speed: a scrape, no damage, a twentieth of the speed lost.
   - A truck is never stopped dead and never held: after any wall contact its speed away from the wall is above zero.
2. **No wear outside a fight.** On the Bowl, outside Last Truck Rolling and the Scrapasaurus, damage zones stay at zero and
   no event can end in a wreck. The computer trucks follow the same rules.
3. **Events for sound and view:** `bowlWall {kind: 'bounce' | 'hard' | 'big' | 'scrape', mph}`.

## Files and locks

`src/sim-contacts.js` (a Bowl branch only, chosen by the course's own data), `src/bowl/bowl-course.js` (`BOWL_FLOOR`),
`tools/test-bowl-walls.mjs` (new), `tools/test-bowl-course.mjs`, `src/bowl/bowl-lines.js` (cue names only). Lock:
`bowl-floor`.

The Bowl-only branches of `_crash` in `src/sim-crash.js` and `containInArena` in `src/arena/arena-floor.js` are editing hooks. These functions otherwise apply generic wrecks and arena wall damage before the Bowl rules can act.

The Show Night listener in `src/app.js` may play this card's cue from the existing sound bank.

## Checks

1. `tools/test-bowl-walls.mjs`: from seed and inputs, a truck driven into the stand wall, the Spine and an end at 10, 35
   and 55 mph and at 20 degrees leaves the wall moving, turned along it, with the damage the table gives; a truck held on
   W with no steering for 30 seconds from each event's start is never slower than 5 mph for more than 1 second.
2. `tools/test-bowl-night.mjs` and `tools/test-bowl-rivals.mjs` brought up to date: Car Crush, Freestyle and Side by Side
   end with every damage zone at zero.
3. Replay fingerprints and world signatures of every other course unchanged.

## Sound cues

`bowl.wall.bounce` (a tyre thump; stand-in `heli.setdown.thud`), `bowl.wall.hard` (stand-in `vehicle.crash`),
`bowl.wall.big` (stand-in `vehicle.crash-impact`), `bowl.wall.scrape` (stand-in: the game's own scrape). BOWL-SOUND
chooses the final sounds.

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-WALLS.md`
with a Removed line. Before CARD DONE, search `tools/` for every id and name this card changes and bring each older suite
and scenario that names it up to date. No Chrome under `codex exec`: any browser scenario is "Claude runs". Memory-only
saves. No new dependency, network request or key. Clean up nothing outside this lane.

## Decision needed from Claude, 20 November

The new equal collision damage and the old unarmed Easy fight have conflicting checks. In three Easy runs of the corrected wall physics (seeds 1989, 2090 and 2191), the child driver lost with three rivals still rolling. In the first run, five truck contacts cost the player and the first rival 25 armor each. Wall contacts took the remaining 35 from the player. The existing suite requires a player knockout in seven of ten unarmed fights on each night and eight wins.

Please decide how the unarmed fight should stay playable until BOWL-WEAPONS. The current lane preserves the old assertions. One option is to keep the wall table and test the legacy knockout credit, sound and Big Mo line directly, then measure child-pace weapon balance under the stronger BOWL-WEAPONS target. Another is to retain the unarmed balance target and specify how a child can win while collisions cost both drivers the same share of health. The wall and truck contact tests, no-wear checks and other courses' checks still apply.

## Claude answers (20 November 2026)

**Take the first option.** Keep the wall table exactly as BOWL-SHOW-2 section 8 sets it, the same for every truck. The
unarmed fight is not a child's fight: Kyle found the rivals hard to hit and asked for weapons, and no player meets Last
Truck Rolling before BOWL-WEAPONS, because `titan-bowl` stays off until BOWL-FINISH. So:

- In this card, replace the old unarmed balance assertion (a player knockout in seven of ten fights, eight wins) with
  direct checks of the knockout credit, its sound and Big Mo's line, and keep every wall, truck contact and no-wear check.
- The balance target moves, it is not dropped: BOWL-WEAPONS owns the child-pace target for Last Truck Rolling with these
  wall costs in force, and must meet it on Easy with the child driver hitting walls as often as it did here. If it cannot,
  BOWL-WEAPONS may lower the player's wall share on Easy only; the table for Medium and Hard stays.

Rule 18 review: the assertion changes because the fight it measured (unarmed, walls free) no longer exists; the target is
carried to BOWL-WEAPONS in full, so nothing is loosened. Write this reason in the change note.
