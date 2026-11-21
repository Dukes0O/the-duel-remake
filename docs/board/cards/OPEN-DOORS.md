# OPEN-DOORS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Section 13.

1. **The buildings table** and its rule. A building has a shell, a door, a room with named spots and things, an
   optional car bay, services and finds. Its solid box becomes four walls with a gap at the door. While the player is
   inside, the roof and the wall nearest the camera are not drawn and the camera comes in close. People walk in and
   out by the door. A car cannot enter.
2. **Two buildings in Tin Town:** the forge shed (Odessa: a bench, a bay, a cot, an anvil, gas bottles, a parts rack)
   and Big Bess's shed (Moss: the tanker's bay, a bucket, a long brush). Use the shacks in hand; new things are drawn
   in code.
3. **The service rule.** `servicePrice(service, word, car)` and `doService(service, world)`. Repair mends all the
   car's armour for 2 scrap for every ten armour, 4 at least, with the car in the bay. Wash takes the dirt off for 6
   scrap. Friendly takes a quarter off, Sworn half, Wary adds a quarter, and Cold is refused with a line. The price is
   said by the person in a talk bubble and the player answers yes or no. Scrap is counted for the outing in memory;
   OPEN-STATE saves it.
4. **The wrench in the field** mends a car up to six tenths of its armour while a roam job runs, and no further.
5. **The dirt rule.** `dirtAfter(dirt, metres, ground, onRoad)`: dust in the colour of the ground driven on, three
   times as fast off the road, and ash where an ash bank or sack hits. Drawn with the finishes in
   `src/paint-finish-look.js`, mixed by the amount. Wim's line on Night 2 reads it.
6. Odessa's and Moss's routines and talk tables, with the lines Claude writes into "Claude answers".

## Files and locks

New: `src/world/open/content/buildings.js`, `src/world/open/building-rule.js`, `src/world/open/service-rule.js`,
`src/world/open/dirt-rule.js`, `src/world/open/building-view.js`, `tools/test-open-doors.mjs`,
`tools/scenarios/open-forge-shed.mjs`. Rows in `src/world/open/content/people.js` and `talk-tables.js`.
Named hooks: the two shacks' solids in `src/world/tin-town-shacks.js`; the wrench's limit in `src/onfoot-weapons.js`
(roam jobs only); the car's finish in `src/arena/modes/world-job.js`. No lock.

## Checks

1. `tools/test-open-doors.mjs`: a walker gets in by the door and is stopped by each wall; the player counts as inside
   only within the room; a price follows the word and Cold is refused; repair mends all the armour and takes its scrap,
   and with too little scrap it mends nothing and takes nothing; dirt grows faster off the road and a wash takes it to
   nothing; the wrench stops at six tenths in a roam job and is unchanged in Night 2.
2. Laptop only: the browser scenario `open-forge-shed` (walk in, see the room, pay for a repair, walk out).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.door`: a tin door on a wire hinge. `open.wash`: a brush and a bucket of water. `open.scrap.paid`: scrap counted
into a tin. Repair uses `repair.start` and `repair.complete`, in hand.

## Claude answers

Written 21 November 2026. Every line is spoken in a talk bubble. `{price}` is the number the service rule works out.

**Hours.** Odessa and Moss serve by day and at dusk. After dark each is asleep at the cot or the bench, and the talk
table gives the "after dark" line.

**Odessa, the forge shed: repair.** She is brisk and fond of machines, and she talks to the car as much as to the
driver.

| When | The line |
| --- | --- |
| The car is in the bay with armour missing, Sworn | **Odessa:** Bring that poor car in here. For you it's {price} scrap, and I'll straighten the bumper as well, because I can't stand looking at it. |
| The same, Friendly | **Odessa:** Somebody has been hitting your car with other cars. I can have it right again for {price} scrap, if you can spare it. |
| The same, Strangers | **Odessa:** I can mend that. It will cost you {price} scrap, and I'd like to see the scrap before I pick up a hammer. |
| The same, Wary | **Odessa:** I'll mend it for {price} scrap. That's more than I'd charge a friend, and I think you know why. |
| Cold | **Odessa:** I'm busy today, and I expect I'll be busy tomorrow as well. |
| You say yes | **You:** Yes, please mend it. |
| You say no | **You:** Not today, thank you. |
| She answers no | **Odessa:** Suit yourself. The car knows where to find me, even if you don't. |
| The work is done | **Odessa:** There, that's every panel back where it belongs. Try to bring it home in one piece this time, because I get attached. |
| There is too little scrap | **Odessa:** You're {short} scrap short, and I don't mend half a car. Come back when you have it, and I'll keep the bay free. |
| The car has nothing to mend | **Odessa:** There isn't a mark on it. Either you've been driving very carefully, or you haven't been anywhere interesting. |
| The car is not in the bay | **Odessa:** I can't mend a car from across the yard. Park it on the marked patch outside my door, and then we'll talk. |
| The car was patched in the field with the wrench | **Odessa:** I can see you've been at this with a wrench. It's a fair patch, and it will hold for a while, but a wrench out on the road only ever does about half the job. |
| No service wanted, by day | **Odessa:** Mind the sparks. If you're only here to watch me work, then stand over by the door. |
| After dark | **Odessa:** *(from the cot)* The forge is cold and so am I. Whatever it is, bring it to me in the morning. |

**Moss, Big Bess's shed: the wash.** He is gloomy and kind, and everything he says comes round to Bess.

| When | The line |
| --- | --- |
| The car is dirty, Sworn | **Moss:** I'll wash it for {price} scrap, and I'll do it properly, the way I do Bess. I don't say that to everybody. |
| The same, Friendly | **Moss:** That car could do with a wash. It's {price} scrap for the brush and the bucket, and I'll throw in the wheels for nothing. |
| The same, Strangers | **Moss:** I wash Bess every evening, so one more won't hurt me. It will be {price} scrap, and the water is grey before I even start. |
| The same, Wary | **Moss:** I'll wash it for {price} scrap. Bess has first go at the clean water, though, and you'll have what's left. |
| Cold | **Moss:** I've only enough water for Bess today. I'm sorry, but that's how it is. |
| You say yes | **You:** Yes, please give it a wash. |
| You say no | **You:** No, thank you, I'll leave it as it is. |
| He answers no | **Moss:** Then leave it dirty. Bess won't mind being the best-looking thing in the yard. |
| The work is done | **Moss:** There you are. I'd forgotten what colour it was under all that, and I think the car had forgotten as well. |
| There is too little scrap | **Moss:** You haven't got {price} scrap, and water doesn't come free out here. I'd let you off if it were up to me, but it's Auntie who counts the tin. |
| The car is clean already | **Moss:** There's nothing on it for me to wash. Come back when you've been somewhere dusty, which won't take you long round here. |
| The car is grey with ash | **Moss:** That's ash on your car, and plenty of it. I'd know that grey anywhere. It comes from the burn, where Old Smoke's people drive. Shall I take it off for you? |
| No service wanted, by day | **Moss:** Bess is resting. She likes company, as long as nobody mentions hills in front of her. |
| After dark | **Moss:** *(low)* Bess is asleep, and I ought to be. Could it wait until the morning? |

Moss's line about the ash is the only tell the game gives for the hidden rule in section 13. He says where the ash
comes from and nothing about what it does.

**Wim, wherever she is, the first time she sees the car clean.**

> **Wim:** Your car is clean today. I liked it better when it was dirty, because then I could draw on it.

**Prices to start from.** Repair: 2 scrap for every ten armour mended, 4 at least. Wash: 6 scrap. A quarter off for
Friendly and half off for Sworn, a quarter more for Wary, rounded up to a whole scrap.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-DOORS.md` with a **Removed** line.
