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
| **Long road** | well (-424, 304); (-450, 40); (-300, -230); (-60, -380); (170, -340); (350, -200); (480, -90); Tin Town (600, 0) | about 1.64 km | 1 share | One step down, never below Watching |
| **Boneyard road** | well (-424, 304); (-200, 350); (0, 370); (250, 415); Boneyard (424, 304); Tin Town's gate (575, 62); Tin Town (600, 0) | about 1.25 km | 2 shares | One step up, never above War party |

- Corrected by Claude on 11 November after the first build: the Boneyard road first went back west to the safe road
  before turning for Tin Town, which made it as long as the long road. It now goes straight on from the Boneyard.
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

### Raids on an escort (settled by Claude on 11 November, after the builder found there were none)

The builder found that job 4's `raiders:` list is declared and never read: no raider appears on an escort and
nothing but the player's own weapons can hurt Big Bess. Job 4 today is a drive beside a truck. This card therefore
adds raids to the escort step itself, and job 4 gets them too, at its two declared places with 2 raiders each.

- **An ambush** is a place on the road with a number of raiders. When Big Bess comes within **160 m** of it, the
  raiders appear at the roadside within 12 m of the place, on both sides, the way the well's attackers appear in
  job 6 (`spawnWave`). The player has about 16 seconds to drive ahead and deal with them.
- **Raiders are the Ash Men on foot that job 6 already has.** They are knocked down by a car or a weapon exactly as
  there, and they shoot at the player exactly as there.
- **What hurts Big Bess:** each raider still standing within **30 m** of her wears her health down every second, by
  **5** on Medium, **7** on Hard and **1.5** on Easy. Left alone, two raiders cost her about 70 on Medium as she
  passes; on Easy about 10.
- **When her health reaches 0** the escort's existing rest runs and that stretch starts again, with its ambush
  back in place. Health lost on a stretch she finished stays lost for the run.
- **After she has passed** an ambush by 60 m, any raider left standing gives up and is removed.
- Easy has one raider fewer in every ambush, never fewer than one.
- The child-pace Easy driver in the test must still win job 4 and every run 8 times in 10. The driver may be taught
  to drive ahead of Bess to the ambush and knock the raiders down; that is a change to the test driver's play, not to
  an assertion.

### Pay

Every world job is paid one amount today (80 times the difficulty factor, in `src/arena/arena-settlement.js`). A
job definition may now carry `shares` (a whole number, 1 when absent), and the amount is multiplied by it. The long
road is 1 share and the Boneyard road 2. This is a change to pay, so Claude reviews it line by line before it merges.

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

The unread `raiders:` list on job 4 becomes real ambushes. Nothing else is replaced.
