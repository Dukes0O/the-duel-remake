# HOME-GROUND-5C

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol: rules and words), Home Ground's step 5, third part: the other four power foods, the pairs and the
protein rule. Needs HOME-GROUND-5B merged (the greenhouse, the lunch tin, fire peppers and jumping beans). Design:
`docs/HOME_GROUND.md` section 8. Behind `home-ground`; a save change keeps the lane tier and one independent review.

## Design, settled by Claude before code

The seeds come in a board sentence from the growers once his first greenhouse crop is picked: "Marigold's growers have
sent more seeds: super spinach, night carrots, iron beets and stink garlic."

| Power food | Grows | What it does | Lasts |
| --- | --- | --- | --- |
| Super spinach | 3 hours | He carries a whole bundle of fence at a run, shoves a buggy over and throws a Rat's bike | 2 min |
| Night carrots | 8 hours | Raiders in the dark stand out, and far-off things are marked | 3 min |
| Iron beets | 16 hours | Knocks and hits bounce off: half the damage | 2 min |
| Stink garlic | 16 hours | Nobody comes within five metres; raiders on foot turn back | 2 min |

**Pairs:** two eaten within 10 seconds of each other make a third thing, for as long as the shorter lasts.
- Spinach with peppers: a battering ram. He runs through a fence, his own included, and has to stand it up again.
- Peppers with beans: one long jump clears a ditch or a wall.
- Spinach with beans: he lands with a thump that tips over every bike within 6 m.

**Protein:** an egg from his store eaten with any power food (the number key for the food, then E within 5 seconds, or
the next free key) makes it last half as long again.

All wear off as the first two do: the leaf beside his health empties, and in the last twenty seconds he slows. In
fights the numbers stay fair for a pre-teen: Easy raids stay about six wins in ten from the ground without power
foods, and power foods make them easier, never certain.

**The save:** the store and seeds gain the four foods (version 9 or the next free number after step 6). Older versions
load unchanged after the verified backup.

**Sound cues** to name: `home.power.spinach`, `home.power.sight`, `home.power.iron`, `home.power.stink`,
`home.power.pair`, `home.power.protein`.

## Checks

- `tools/test-home-ground.mjs` by behaviour: each food does what it says and wears off on time; each pair happens only
  within 10 seconds and lasts as the shorter; an egg makes a food last half as long again; a save from 5B loads
  unchanged.
- The lane tier, the rule 23 guards, `node tools/combat-balance.mjs --check` (iron beets and spinach touch fights) and
  `npm run build`. One independent review of the save and the fight numbers. Claude drives it by hand.

## Claude answers

**28 November 2026, the raid sample** (the questions file, commit `5911e7dfe`): the pick is approved. Keep step 4's raid
rules and the comparable sample (12 of 20 from the ground without food, the six-in-ten baseline); add no attacks or bonuses
to move a number. The scripted defender stands still, so it cannot show what the foods add; Claude judges that by hand
before the step goes live, and notes that step 4's raiders do not shoot at him, so iron beets have little to resist yet.
