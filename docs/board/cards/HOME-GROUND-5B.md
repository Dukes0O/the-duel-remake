# HOME-GROUND-5B

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol: rules, words and the plants' code-drawn look), Home Ground's step 5, second half: garden beds, the
greenhouse, and the first two power foods. Needs HOME-GROUND-5 merged (the beds and the greenhouse drink from its tank).
Design: `docs/HOME_GROUND.md` sections 4 (crops on the real clock) and 8 (the greenhouse and the power foods). Behind
`home-ground`; it changes the save, so it keeps the lane tier and one independent review of the save.

## Design, settled by Claude before code

**Garden beds.** G gains a garden bed (1 by 2 cells), hammered up in seconds like a nest box, from the old timber
Auntie Solder leaves with the tank. F at an empty bed plants the next seed he has: spinach (1 hour), carrots (4 hours)
or beans (8 hours) of the real clock, counted while the game is off too. A bed grows only while a tank within 12 m has
water; without water it waits, and never wilts or dies. F at a ripe bed harvests it into his store. Plain vegetables
feed the town later (the order board, step 7); for now the store counts them.

**The greenhouse** is a build kind (3 by 3 cells, four stages: the base, the frame, the glass, the door) from a load of
glass and frame at Tin Town's gate on the flatbed. He walks into it. Six pots inside take the power foods, which grow
only there, a bit longer than the plain kind, and show their stage: a sprout, then leaves, then a faint glow when
ready. This card grows two: **fire peppers** (12 hours) and **jumping beans** (12 hours). The seeds come from the
Glasshouse growers' gift, in a sentence on the board: "Marigold's growers sent you seeds: fire peppers and jumping
beans. They only grow under glass."

**The lunch tin** holds three foods for an outing; F at the shed puts ripe food in, and the number keys 1 to 3 on foot
eat what is in that slot (if those keys already do something on foot, or in a talk, use the next free keys and say
which in the change note).
- **Fire peppers:** for 90 seconds he runs as fast as a buggy, and the third speed lasts all that time.
- **Jumping beans:** for 2 minutes his jump lifts him onto a roof, a wall or a tower top.
They wear off without help: a small leaf beside his health empties, and in the last twenty seconds he slows. The other
four power foods, the pairs and the protein rule are a later card.

**The save:** version 8 adds `beds`, `pots`, `seeds`, the store's vegetables and power foods, and `tin`. Older versions
load unchanged after the verified backup.

**Sound cues** to name: `home.bed.plant`, `home.bed.harvest`, `home.glass.stage`, `home.pot.glow`, `home.eat`,
`home.power.end`.

## Checks

- `tools/test-home-ground.mjs` by behaviour: crops ripen on the real clock across a closed game; a bed without water
  waits and never dies; power foods grow only in the greenhouse; the tin holds three; fire peppers and jumping beans do
  what they say and wear off on time; a version 7 save loads unchanged.
- The lane tier, the rule 23 guards and `npm run build`. One independent review of the save. Claude drives it by hand.

## Claude answers

**28 November 2026, the five picks** (the questions file, commit `11e074edf`): all approved. Keys 4 to 6 for the tin's
slots, ignored in a talk or the name box. Six seeds of each plain crop and three of each power food to start, and a harvest
gives its seed back. A crop grows only while a tank within 12 m has water, with no drain rate yet; dry time never counts.
Six beds from Auntie Solder's timber; the greenhouse in four six-second stages by hand, then an hour by the crew. Jumping
beans reach 6 m; both powers ease back over their last twenty seconds and last only for the outing, while the tin is saved.
