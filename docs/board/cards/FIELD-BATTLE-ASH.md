# FIELD-BATTLE-ASH

Step 4 of `docs/FEUDS_AND_RUNS.md` for the first group: the Ash Men's war party comes out. Kyle, 11 November 2026:
"an open air fight in the field or scablands during an escalation of hostilities between rival wasteland / scabland
survival communities... something lead up to a boss fight that is compelling, not just new bosses."

Owner: Claude (design, lines, verdict by pictures and scripted play). Built by a Sonnet helper. Switch:
`scablands-runs` (off). Needs RUN-GAS.

## What the player gets

The player's own choices bring this fight on: every run down the Boneyard road raises the Ash Men's feud. At War party
the Ash Men drag Old Smoke's furnace out of the well, patch it, and come for the gas. The next Boneyard run is not a
run but a battle along the road: Big Bess must reach Tin Town while the furnace hunts her.

It passes the three rules of the design page. Seen before fought: the player fought this machine in the story and
has watched the feud's word climb on the wall. Brought out by the player's doing: only Boneyard runs raise the feud.
The fight goes somewhere: Big Bess to Tin Town's gate, with the gas the town lives on.

## Settled design (Claude)

### When it happens

- The feud is at War party and the player presses BONEYARD ROAD. The wall's line reads "The Ash Men have dragged the
  furnace out of the well. They are waiting on the Boneyard road." and the button reads **BONEYARD ROAD: THE BATTLE**
  with pay of 4 shares.
- The long road stays an ordinary run and still lowers the feud a step. A player who does not want the battle can
  take the long road until the feud falls.

### The battle

- **Big Bess** drives the Boneyard road as in any run: 9 m/s, health 100, the same rests, and the same rule that an
  ambush gives up after two rests.
- **The patched furnace** starts at the Boneyard's far end, at (250, 415), and comes out as Big Bess passes
  (0, 370), 430 m into the road. It drives her road behind her at 11 m/s, so it closes on her by 2 m/s.
- **What the furnace does to Big Bess:** within 25 m behind her it throws cinders onto her: 6 health a second on
  Medium, 9 on Hard, 2 on Easy. It never rams her.
- **What the player does to the furnace:** the story's rules, unchanged (`src/world/jobs/old-smoke.js`): a door stokes,
  glows and slams; a hit or a ram on a glowing door breaks it. Here the three doors come in turn on one long leg
  (left, right, rear), and **each broken door stops the furnace for 8 seconds** and knocks it back to 11 m/s from
  whatever it had gained. Three broken doors and it dies on the road.
- **Riders:** two ambushes of 3 stand on the road ahead as in a War party run, so the player is pulled two ways:
  forward to clear the road, back to break a door.
- **How it ends:**
  - The third door breaks: the furnace stops for good, burning, where it stands. Big Bess drives on to Tin Town and
    the battle is won.
  - Big Bess reaches Tin Town's gate with the furnace still rolling: the furnace turns away at the gate. The gas is
    home, but the battle is not won: the feud stays at War party and the furnace will be back on the next Boneyard run.
  - Big Bess rests as usual when her health reaches 0; a battle is never a game over.
- **Winning** pays 4 shares, sets the feud to Watching, and leaves the dead furnace on the Boneyard road for good as
  a wreck the player drives past on every later run (drawn only, with a thin smoke). The battle does not come again
  until the feud climbs back to War party, and then the riders come without a furnace (a War party run as today).
- **Easy:** the furnace closes at 1 m/s, doors glow for 6 seconds, and one broken door is enough to stop it for good.

### Who is driving it

Old Smoke fell into the well. His stoker drives the patched furnace: **Clinker**, who never speaks above a mutter and
blames the player for everything. No new machine and no new art: the furnace model with two of its six shields
already gone and one door scorched.

### Lines (captions with the radio click)

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.ember.moss.11` | Moss | The battle starts | "That is his furnace on the road behind us. Somebody pulled it out of the well." |
| `story.ember.clinker.1` | Clinker | The furnace comes out | "You put him in the well. I am putting you in the ground." |
| `story.ember.clinker.2` | Clinker | A door breaks | "That door was the last thing he made. You will pay for that door." |
| `story.ember.moss.12` | Moss | Cinders land on Big Bess | "It is throwing fire on the tank! Get it off us!" |
| `story.ember.cinder.25` | Cinder | The furnace dies | "That is the last of his fire, and it went out on a road. Bring the gas home." |
| `story.ember.auntie-solder.10` | Auntie Solder | Big Bess arrives with the furnace still rolling | "The gas is in and the gate is shut. That thing will be back. Next time, finish it." |
| `story.ember.auntie-solder.11` | Auntie Solder | The battle is won | "No more toll on the Boneyard road. Tin Town owes you a supper." |

### Sound

Existing cues only: the furnace's stoke, door and hit cues from the story; the fire cue for cinders on Big Bess; the
raid warning for riders.

### What the save holds

One more fact in the Everburn story's save: `furnaceDead` (true once the battle is won). Missing or damaged reads as
false. A save change, so it gets its own review.

## Checks (named before code)

1. A new `tools/test-field-battle.mjs`: the battle is offered only at War party on the Boneyard road; the furnace's
   start, pace and closing; cinders on Big Bess by difficulty; each door stops it for 8 seconds; the three endings and
   what each writes to the save and pays; Easy's rules; both roads clear of every solid.
2. `tools/test-ember-save.mjs`: `furnaceDead` kept, repaired, and older saves unchanged.
3. Scripted drivers, 10 tries each: on Easy the child-pace driver gets Big Bess home 10 times in 10 and wins the
   battle at least 8 times in 10; on Medium a driver who clears the riders and breaks doors wins at least 6 times in
   10, and a driver who never fights still gets Big Bess home.
4. `tools/test-ember-lines.mjs`: the seven lines.
5. Pictures from the game (a helper) and Claude's verdict: the furnace coming out behind Big Bess, cinders landing on
   her, a door breaking, the dead furnace on the road, and the wall before and after.

## Result (built by a Sonnet helper; reviewed by Claude, 12 November 2026)

Merged into Claude's branch as 693564cfe, switch `scablands-runs` off. Change note: `docs/changes/FIELD-BATTLE-ASH.md`.

- **Save, read line by line by Claude (rule 17):** `furnaceDead` is checked only when a save already holds it; an
  older save reads as before. The battle's ending is written only at War party with the furnace alive, and only as
  'won' (furnace dead, feud to Watching, one run) or 'arrived' (one run). 117 checks.
- **Pay, read line by line by Claude (rule 17):** settlement code is untouched. A won battle pays the job's 4 shares;
  arriving with the furnace still rolling pays the Boneyard road's own 2, which the card had left unsaid.
- **The furnace's rules:** seven small branches in `old-smoke.js`, each taken only when a furnace's definition says
  `battle`. `tools/test-old-smoke.mjs` passes untouched at 616 checks, so job 6 is as it was.

Where the build differs from the design above, all accepted by Claude:

1. **The card was wrong about where the furnace starts.** (250, 415) is 254 m ahead of Big Bess at the moment the
   card brings the furnace out, so it could not come up behind her. It now drives her own road and comes out 80 m
   behind her as she passes (0, 370). On Medium it is throwing cinders on her 27 seconds later.
2. The furnace never comes nearer than 12 m to her, and after she rests it falls back to 80 m with its broken doors
   still broken.
3. In the battle an ambush she has already passed also gives up after two rests, so that nobody loops for ever.
4. Only Auntie Solder's line closes each ending. Clinker speaks at every broken door but the last, which is
   Cinder's; on Easy one door ends it, so Clinker's door line is not heard there.
5. The wreck stands at (250, 407), 8 m off the road.

**Changed test input, reviewed by Claude (rule 18):** two places in `tools/test-run-gas.mjs` that looked at the
ordinary War party wall and a Boneyard arrival from War party now start from a save whose furnace is dead, because
with it alive that button is the battle. Every assertion is as it was.

| 10 tries each | Big Bess home | Battle won | Her lowest health | Longest battle |
| --- | --- | --- | --- | --- |
| Easy, child-pace driver | 10 | 10 | 52 | 142 s |
| Medium, a driver who clears riders and breaks doors | 10 | 9 | 26 | 194 s |
| Medium, a driver who never fights | 10 | 0 | 60 | 230 s |
| Hard, a driver who clears riders and breaks doors | 10 | 7 | 28 | 203 s |

Checks on the builder's branch: `test-field-battle` 643, lane tier 105 of 105, build, and the `field-battle`,
`run-gas` and `everburn-well` browser checks. Rerun by Claude on the merged result: field battle 643, furnace rules
616, save 117, run-gas 1,088, build.

### Pictures of the battle, and what they changed (Claude, 12 November 2026)

The `field-battle` browser check passes on the merged result, but its six pictures show the player's car parked, so
a helper took pictures with a camera placed beside the two machines while the battle ran. They showed two gaps, both
now drawn by Claude in `src/world/scablands-scene.js` and `src/world/scrap-look.js`:

1. **Nothing was drawn when the furnace threw cinders on Big Bess.** Her health fell under a caption and a sound.
   Now, for as long as the furnace's own state says it is throwing (`burning`), glowing lumps fly a low arc from its
   chimney to her tank (`createCinderArc`), three fires stand on the tank and firelight lies on the road under her.
2. **The furnace's death could not be seen.** It now dies with a last fire in its chimney for 5 seconds and heavy
   smoke for 12, and after that only thin smoke rises (fuller than before, so that the wreck can be seen from the
   road). Its door fire stays out, as Cinder's line says. The wreck of later runs has thin smoke only.

Both are drawing only: no rule, pay or save reads them.

**Changed assertion, reviewed by Claude (rule 18).** `tools/test-scablands-scene.mjs` checked "only thin smoke rises"
at the moment the furnace died. The furnace now dies under heavy smoke by design, so that check is made 18 seconds
later, at the same age of the same puff of smoke, with its limits unchanged; new checks cover the heavy smoke at the
moment of death, the last fire standing, sinking and going out, the cinders, the fires on the tank, and that none of
them shows beside the wreck or while the furnace only follows. Nothing is loosened.

Sheet and verdict: `docs/board/looks/field-battle/round-1.jpg` and its review note.

Also seen in the pictures, and not this card's: in every Scablands job the map panel shows the venue's oval, and the
screen still says PLACING 01 and KEEP YOUR LINE as in a race. New card SCABLANDS-JOB-MAP.

Still to do before this card closes:

1. Tuning. A Medium driver who fights wins 10 times in 10, yet Big Bess arrives with 1 health. The fight may want the
   furnace tougher and its cinders gentler, so that winning is less certain and Big Bess is less close to resting.
2. One play by hand, to see the cinders and the last fire while driving.

### Tuning: what the battle should feel like (Claude, 12 November 2026, before the numbers move)

The battle should be a race against the road: the player has until Tin Town's gate to break three doors, and the
riders ahead cost time. Losing that race is the kind ending (the gas is home, the furnace comes back). Big Bess
should be hurt, never one cinder from resting when the player has fought well.

Targets for scripted drivers, 10 tries each, same seeds as the table above:

| Driver | Big Bess home | Battle won | Her lowest health in a won battle |
| --- | --- | --- | --- |
| Easy, child-pace | 10 | 8 or more | 50 or more |
| Medium, clears riders and breaks doors | 10 | 6 to 8 | 25 or more in at least 7 of the won battles |
| Medium, never fights | 10 | 0 | (not won) |
| Hard, clears riders and breaks doors | 8 or more | 2 to 5 | no target |

First the builder finds out and writes down why the fighting driver's Big Bess falls to 1 while the driver who never
fights keeps 22. If that is a fault in a rule or in the scripted driver, it is fixed before any number moves.

Numbers that may move, in this order, and only for a furnace whose definition says `battle`:

1. Cinders on Big Bess: Medium from 6 health a second down to no less than 3; Hard from 9 down to no less than 6.
   Easy stays at 2.
2. The time between one door's glow and the next (the stoke), so that three doors take most of the road: up to twice
   today's.
3. How long a broken door stops the furnace: from 8 seconds down to no less than 5.
4. How long a door glows on Medium and Hard: down to no less than 4 seconds.

Not to move: Big Bess's pace and health, the furnace's pace, one hit breaking a glowing door, Easy's one door, pay,
the save, the lines, and anything in the story's own fight (job 6). If the targets cannot be met inside these
limits, the builder stops and reports the nearest result.

### The hunt, redesigned after the builder's finding (Claude, 12 November 2026)

The builder was right to stop, and its finding is worse than a missed win count: against a driver who fights, the
furnace never comes within range, so the fire drawn last night is never seen in a well-fought battle. Each broken
door stops the furnace for 8 seconds, Big Bess gains 72 m, and at 2 m/s the furnace needs 36 seconds to close that
again, by which time the next door has glowed and been broken. The furnace is a target that trails behind, not a
hunter. Three rule changes, all only for a furnace whose definition says `battle`:

1. **It catches up.** More than 40 m behind Big Bess the furnace drives at a catching-up pace (15 m/s on Medium and
   Hard, 12 on Easy). Within 40 m it drives today's pace. It still never comes nearer than 12 m.
2. **The fire and the door are one act.** A door begins to stoke only while the furnace is within its cinder range
   of Big Bess. Out of range the stoke waits. A door that already glows keeps its time. So before every door the
   player sees fire land on the tank, and the way to stop the fire is to break the door.
3. **Cinders are gentler,** because they now land in every battle: Medium 4 health a second, Hard 6, Easy 2.

Targets, 10 tries each on the same seeds, in this order of importance:

1. Medium, fights: cinders land on Big Bess for 10 to 30 seconds in all, in at least 8 tries of 10.
2. Big Bess home 10 times in 10 for every Easy and Medium driver, and the driver who never fights wins none.
3. Medium, fights: her lowest health in a won battle is 25 or more in at least 7 of the won battles.
4. Medium, fights: 6 to 9 battles won. Easy child-pace: 8 or more won. Hard, fights: 3 to 7 won.

Numbers the builder may move to meet them, each only for the battle: the catching-up pace (13 to 16 m/s), the stoke
(4 to 8 seconds), the stop after a broken door (5 to 8 seconds), the glow on Medium and Hard (4 seconds or more),
cinders (Medium 3 to 6, Hard 6 to 9), and where the furnace comes out (430 to 700 m into the road; decide that one
from 30 tries, not 10). If targets 1 to 3 are met and target 4 is not, the builder builds the nearest result and
says so; it stops only if 1, 2 or 3 cannot be met.

Not to move: riders and their damage, Big Bess's pace and health, one hit breaking a glowing door, Easy's one door,
pay, the save, the lines, and job 6 of the story (`tools/test-old-smoke.mjs` passes untouched).

### Tuning result (builder, 12 November 2026, after the redesign)

**Question 1: why the fighting driver's Big Bess ended at 1 health while the driver who never fights kept 22 (first build).** It was not a fault in a rule or
in the driver, and the two figures do not measure the same thing.
- In all ten tries of the fighting driver the furnace never threw one cinder on Big Bess (0 seconds in range, 0 health lost to
  cinders). It comes out at 48 s with Big Bess 80 m ahead, its first door glows 11 s later and each broken door stops it for 8 s,
  so the third door breaks at about 88 s with the furnace still some 120 m behind her, far outside the 25 m range. What the
  fighting driver's Big Bess loses, she loses to the riders: with the driver behind her at the furnace's doors, three riders at
  5 health a second each take her from 100 to 0 in about 8 s (try 3 of the trace: 100, 83, 53, 23, 0 between 72 and 80 s, no cinders,
  three riders standing). The 1 is where that left her at the gate.
- The 22 of the driver who never fights is the lowest health on arrival after 3 to 5 rests, with the furnace alive and in range for
  25 to 60 s (150 to 360 health of cinders in a try). Each rest puts her back to 60 or more, so where she stands at the gate depends on
  when her last rest fell. She is in far worse trouble than the fighter's 1.
- So the driver is doing what its priorities say: go to a door that is opening, clear riders otherwise. The pull between the riders
  ahead and the doors behind is the design, and it is the riders, not the cinders, that bring Big Bess near resting. Lowering
  the cinders cannot change it, because a driver who fights is never in them.

**First build, before the redesign** (10 tries each, same seeds): Easy 10 home, 10 won; Medium fights 10 home, 10 won, cinders on her for
0 s; Medium never fights 10 home, 0 won; Hard fights 10 home, 10 won, cinders 0 s. No stoke, stop, glow or cinder setting inside the
first limits changed the win count (the third door broke some 44 s before she arrived), so the builder stopped and the hunt was redesigned.

**The redesigned hunt, built.** The three rule changes are in (catching-up pace beyond 40 m; a door begins to stoke only while the furnace
is within cinder range; gentler cinders). Numbers, each only for the battle:

| Number | Card's start | Built | Range | Why |
| --- | --- | --- | --- | --- |
| Catching-up pace, Medium and Hard (Easy) | 15 (12) | 15 (12) | 13 to 16 | Not needed to move |
| Beyond how many metres behind her it catches up | 40 | 40 | fixed by the card | |
| Cinders, Medium (Hard, Easy) | 4 (6, 2) | 4 (6, 2) | Medium 3 to 6, Hard 6 to 9 | Not needed to move |
| Stoke, Medium and Hard (Easy) | 4 (4) | 6 (4) | 4 to 8 | Gives the cinders more seconds on her and keeps her health up at the gate |
| Stop after a broken door | 8 | 8 | 5 to 8 | Not needed to move |
| Glow, Medium (Hard, Easy) | 4.5 (3.5, 6) | 4.5 (3.5, 6) | 4 or more | Not needed to move |
| Where the furnace comes out, metres into the road | 430 | 560 | 430 to 700 | Decided from 30 tries; see below |

**Where it comes out, from 30 tries of each fighting driver** (stoke 4 / 6 / 8 s; won out of 30; Medium cinders in range of 10 to 30 s in
how many of 30; Medium health 25 or more in how many of the won):

| Comes out at | Medium fights (stoke 4) | Medium (stoke 6) | Hard fights (stoke 4) | Hard (stoke 6) |
| --- | --- | --- | --- | --- |
| 430 m | 26 won, cinders 29, health 19 of 26 | 25, 27, 19 of 25 | 30 won | 30 won |
| 560 m | 25 won, cinders 29, health 23 of 25 | 23, 30, 23 of 23 | 17 won | 16 won |
| 620 m | 15 won, 30, 15 of 15 | | 27 won | |
| 660 m | 16 won, 20, 15 of 16 | | 17 won | |
| 700 m | 10 won, 20, 10 of 10 | 8, 30, 8 of 8 | 8 won | 9 won |

At 430 m Hard is never beaten and at 620 to 700 m Medium is beaten about as often as it wins; 560 m is the one place where Medium (7.7 of 10)
and Hard (5.3 of 10) both land in their targets, with the fire landing in 30 of 30 Medium battles (stoke 6) and her health at the gate 25 or
more in every won one. Stoke 8 s at 560 m costs Medium too many wins (13 of 30).

**The four drivers, built numbers, 10 tries each on the same seeds** (cinders: seconds of fire landing on Big Bess in a try):

| Driver | Big Bess home | Battle won | Her health at the gate in won battles | Cinders on her | Longest |
| --- | --- | --- | --- | --- | --- |
| Easy, child-pace | 10 | 10 | lowest 52 | 4.3 to 4.4 s | 142 s |
| Medium, clears riders and breaks doors | 10 | 9 | lowest 26; 25 or more in 9 of 9 | 11 to 21 s (10 of 10 tries in 10 to 30 s) | 194 s |
| Medium, never fights | 10 | 0 | (not won; on arrival 60) | 42 to 82 s | 230 s |
| Hard, clears riders and breaks doors | 10 | 7 | lowest 28; 25 or more in 7 of 7 | 13 to 24 s | 203 s |
| Hard, never fights (for information) | 0 | 0 | (never arrives) | 372 to 402 s | 897 s (stopped) |

Against the targets: 1 (cinders 10 to 30 s in at least 8 of 10) met, 10 of 10. 2 (home 10 of 10 for Easy and Medium drivers, the one who
never fights wins none) met. 3 (25 or more in at least 7 of the won) met, 9 of 9. 4 (Medium 6 to 9, Easy 8 or more, Hard 3 to 7) met: 9, 10
and 7. On 30 tries the same numbers give Medium 23 won (7.7 of 10), Hard 16 (5.3 of 10).

**Found wrong on the card: a Hard driver who never fights cannot get Big Bess home.** With cinders at 6 a second on Hard (the lowest the card
allows) and a furnace that catches up and sits 12 m behind her throwing fire, she rests every 17 s or so and each rest puts her back at the
last place she reached, so in 10 of 10 tries she was still resting when the 15 minutes ran out (32 rests). Before the redesign this driver got
home 10 of 10. The card asks for home 10 of 10 only for the Easy and Medium drivers, so this is outside the targets, but a Hard player who
only drives has no way to finish; the road back (fight, or lower the Hard cinders under 6) is for Claude to decide.

## Not in this card

A second group's feud, the Scrapdome challenge, lasting damage to Tin Town, sending someone else on a run.

## Removed

Nothing.
