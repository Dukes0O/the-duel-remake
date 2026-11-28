# HOME-GROUND-4

The short board entry controls current state, ownership, dependencies and locks.

Cockpit task: `pers-the-duel` / `T-120` (Board card HOME-GROUND-4).

Codex's card (Astra: rules, combat and the tower's look), Home Ground's step 4, first half: the watchtower, the raid
clock, the first test raid and real raids on his fence. The loot that a won raid leaves is the second half, card
HOME-GROUND-4B. Kyle cut it on 27 November 2026, before his and Gratian's try of steps 2 and 3. Design:
`docs/HOME_GROUND.md` sections 4 (demands count play time only), 6, 9 and 15, and steps 1 to 3 as built in section 16.
Behind `home-ground`, but it changes the save, so it keeps the lane tier and one independent review of the save before
the merge (rule 23, "Not covered").

Reuse before building: the old town's raid rules (`src/world/jobs/town-rats.js`, `src/world/jobs/steps/hold.js` and
`steps/fence.js`), the open land's Rats and their bikes and buggies, the shoulder rocket launcher on foot, the seeded
generator in `src/rng.js`, and the old town's drawn watchtower if its parts suit a 2 by 2 cell footprint.

## Design, settled by Claude before code

**The watchtower** is a fourth build kind on G (tin panel, gate, old crate, coop, shed, tower), 2 by 2 cells, raised by
hand in four stages (the legs, the platform, the ladder, the rail and roof) from a load of poles and tin that waits at
Tin Town's gate, brought on the flatbed with one tap, exactly as the coop is. On foot, F at its ladder climbs it in
about 2 seconds and F on top climbs down. On top his eye is about 6 m up, he sees over his own fence, the launcher is in
his hands (no hammer), and his rockets reach a quarter further than from the ground. The builders can raise a second
tower once he has raised one, as for the coop.

**The raid clock counts play only** (Kyle's ruling for the ember run, 16 November 2026). The save keeps the seconds he
has played with Home Ground on and the sittings he has opened. There is no raid in his first three sittings, and none
while the game is off. After that a raid falls due when 75 to 105 minutes of play (from the seeded generator) have
passed since the last one; it starts at the next dusk of the land's day while he is on his ground or within 150 m of
it. If he is elsewhere at dusk, it waits for a dusk when he is home.

**The lookout calls it at dusk**: Wren, if the crew has come, shouts "Rats on the road! Get up the tower!"; before the
crew, the board's bell rings and the prompt says "The Rats are coming. Get up a tower or meet them at the fence."

**The first raid is a test and cannot be lost** (section 15): at the first dusk after his first coop stands, one Rat on
a bike circles his fence, rattles the gate and rides off if he chases it, shoots at it or simply waits a minute. It
counts as a sitting's raid only for the board's news.

**A real raid**, from the fourth sitting: two bikes and one buggy, from a side of the ground chosen by the seeded
generator. Bikes ride for the coop; a buggy rams the fence. A tin panel a buggy hits at more than 25 km/h falls flat and
is no longer solid; it stands up again with a tap of B with the hammer. He wins when every raider is wrecked or has fled
60 m from his fence. A raid ends after 4 minutes of play; if any raider is still inside his fence then, he has lost,
and the Rats take a tenth of the eggs in his store, never more, and nothing else. Leaving mid-raid ends it with nothing
lost and nothing won. The pitch is for a pre-teen: on Easy he should win about six raids in ten without a tower and
nearly every raid from a tower. Name the numbers in `src/world/open/content/home-ground.js`.

**The board** says what happened in whole sentences: "The Rats came at dusk. You drove them off.", "The Rats got into
the coop and took 4 eggs before they left.", "Two panels of your fence are down. Tap B with the hammer to stand them
up."

**The save:** `world.open.home` becomes version 5 with `raids` (`{played, sittings, nextDue, testDone, won, lost}`) and
a `down` flag on fallen panels. A raid in progress is never saved. Version 4 and older load unchanged after the
verified backup (`needsCareerMigration` already asks for one below `HOME_RECORD_VERSION`).

**Sound cues** to name: `home.raid.call`, `home.raid.bike`, `home.raid.ram`, `home.fence.fall`, `home.fence.up`,
`home.tower.climb`, `home.raid.won`, `home.raid.lost`.

## Checks

- `tools/test-home-ground.mjs` gains by behaviour: the clock counts play and never time away; no raid in the first
  three sittings; the test raid cannot be lost; a buggy at speed flattens a panel and a tap stands it up; a raid ends
  at 4 minutes and a loss takes at most a tenth of the eggs; the tower's climb, its height and the launcher's longer
  reach; a version 4 save loads unchanged; raids are the same from the same seed and inputs.
- The lane tier, the rule 23 guards, `node tools/combat-balance.mjs --check` if any combat file changes, and
  `npm run build`. One independent review of the save.
- No browser scenario or frame check; Claude drives it by hand.

## Claude answers

**27 November 2026, the three choices** (the questions file, commit `ccf8aa197`): all three picks approved. A sitting is
one opened Home Ground outing, resumed ones included; pauses, talks and time away add no play. The bikes are built from
the existing wheel, frame and Rat parts with the existing combat hits: gritty and real, never toy-like (dented tanks,
mismatched wheels, rust and tape, a rider who leans), judged against photographs of dirt bikes in the change note. The
tower is the old town's, cut to the 4 m footprint with a 4.4 m platform; level 1 poles and tin.

## Builder's assertion review request

`test-home-ground`, `test-home-hens` and `test-career-backup` now expect version 5 rather than 4. Historical version
2/3 fixtures omit the added fields; backup checks include literal version 4 with active crew. Migration still
compares every old field and expects only the new tower load alongside the old loads. No tolerance or gameplay
assertion is loosened. Claude's written review under rule 18 is owed before integration because this card changes
saves and does not qualify for rule 23. Current facts and checks are in `docs/changes/HOME-GROUND-4.md`.

## Builder handoff for Claude

The independent save/code review approved the final retreat routing and Easy threshold. The 20-seed controlled
sample won 15/20 on the ground and 18/20 from the tower; the repeatable recipe is in HOME_GROUND section 16.
Ground success is above the roughly six-in-ten design aim. Please judge child difficulty and the moving bike pose
in the hand drive, alongside the version assertion review above. This card is not release approval.
