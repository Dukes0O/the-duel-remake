# RUN-GAS

Step 2 of `docs/FEUDS_AND_RUNS.md` (sections 2 and 3): the first recurring run, and the first feud. Kyle, 11
November 2026: "escorting cargo could be a kind of recurring mission in the scablands that results in skirmishes and
battles."

Owner: Claude (design, lines, verdict by playing). Built by a Sonnet helper. New switch: `scablands-runs` (dev, off).
It needs `story-everburn`.

## What the player gets

After Old Smoke falls, the Everburn's gas has to reach Tin Town, and it goes in Big Bess. The run can be driven again
and again. Each time the player picks a road. The short road crosses what is left of the Ash Men, and how often the
player uses it decides how hard they fight.

## Settled design (Claude)

### Where a run starts

- On the yard's story wall, under the Everburn's six jobs, once job 6 is won: one entry, **GAS RUN**, with one line
  under it that says how things stand ("The Ash Men are watching the Boneyard road.") and two buttons, **LONG ROAD**
  and **BONEYARD ROAD**. Each button shows its pay.
- It is drawn like the six job entries and never shows a tick: it does not finish.

### The two roads (Big Bess drives from the well to Tin Town)

| Road | Places (x, z) | Length | Pay | Feud |
| --- | --- | --- | --- | --- |
| **Long road** | well (-424, 304); (-450, 40); (-300, -230); (-60, -380); (170, -340); (350, -200); (480, -90); Tin Town (600, 0) | about 1.9 km | 1 share | One step down, never below Watching |
| **Boneyard road** | well (-424, 304); (-200, 350); (0, 370); (250, 415); Boneyard (424, 304); the safe road (230, 150); Tin Town (600, 0) | about 1.6 km | 2 shares | One step up, never above War party |

- A share is the scrap that Everburn job 4 pays today. The builder reads that amount from the game and uses it.
- Big Bess keeps job 4's manners: 9 metres a second, health 100, a rest when she is hurt and then that stretch again.
  A run is never lost for good.
- Both roads must clear every box in `SCABLANDS_SOLIDS` by 8 m (the builder may move a place by up to 25 m, saying
  so).

### The Ash Men's feud

One number in the player's Everburn story save, with four words. It starts at **Raiding** when job 6 is won.

| Feud | Line on the wall | On the Boneyard road | On the long road |
| --- | --- | --- | --- |
| **Watching** (1) | "The Ash Men are watching the Boneyard road." | One raid of 2 | Nothing |
| **Raiding** (2) | "The Ash Men are raiding the Boneyard road." | Two raids of 2 | Nothing |
| **Hunting** (3) | "The Ash Men are hunting Big Bess." | Three raids: 2, 3, 2 | One raid of 2 where the long road comes nearest the Boneyard |
| **War party** (4) | "The Ash Men have gathered a war party." | Three raids: 3, 3, 4 | One raid of 3 |

- The feud moves when a run **arrives**: up one step for the Boneyard road, down one step for the long road, within
  Watching and War party. A run that is abandoned moves nothing.
- Raids use the raiders job 4 already has. Where they wait is taken from a fixed list of ambush places along each
  road, chosen by the seeded generator in `src/rng.js` from the run's count, so that the same save always gets the
  same run and two runs in a row are not alike.
- On Easy every raid has one raider fewer, never fewer than one.
- At War party nothing more happens in this card. The boss coming out is step 4 of the design.

### What the save holds

Inside the Everburn story's own save object, beside `read`, `end` and `jobs`: `feud` (1 to 4) and `runs` (a count).
Missing or damaged values read as Raiding and 0. Nothing existing is changed, hidden or wiped. This is a save change,
so it gets its own review (rule 17) and the save tests named below.

### Lines (captions with the radio click; no voice recording in this card)

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.ember.moss.5` | Moss | A long-road run starts | "The long way round, then. Bess likes a quiet road." |
| `story.ember.moss.6` | Moss | A Boneyard-road run starts | "Through the Boneyard. Keep your eyes on the planes; that is where they wait." |
| `story.ember.moss.7` | Moss | The first raid of a run appears | "Here they come. Keep them off the tank." |
| `story.ember.moss.8` | Moss | A run arrives with Bess at 70 health or more | "Every drop delivered. Bess thanks you, in her way." |
| `story.ember.moss.9` | Moss | A run arrives with Bess under 70 health | "We are here, and most of the gas is too. That will do." |
| `story.ember.auntie-solder.9` | Auntie Solder | The feud reaches War party | "They have stopped raiding and started gathering. That is a war party, driver. Mind how you go." |

### Sound

No new sound. A run's start, raids, hits on Bess, her rest and her arrival use the cues job 4 uses.

## Checks (named before code)

1. A new `tools/test-run-gas.mjs`: the two roads and their pay; the feud table (raid counts per word and road, Easy's
   one fewer); the feud moving only on arrival and staying within its limits; the same save giving the same ambush
   places; both roads clear of every solid.
2. `tools/test-ember-save.mjs`: `feud` and `runs` kept, repaired when damaged, and every older save reading exactly
   as before.
3. `tools/test-everburn-easy.mjs`: the child-pace Easy driver brings a run home on each road at each feud word at
   least 8 times in 10.
4. `tools/test-ember-lines.mjs`: the six new lines.
5. Laptop only (Claude): one browser scenario that wins job 6 by setting the save, opens the wall, starts a run on
   each road and photographs the wall, a raid and the arrival; then Claude drives both roads.

## Not in this card

Other cargo and other roads, sending someone else, the boss coming out, the Scrapdome challenge, lasting damage.

## Removed

Nothing. The run uses job 4's engine and does not replace job 4.
