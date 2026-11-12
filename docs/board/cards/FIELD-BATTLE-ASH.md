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

## Not in this card

A second group's feud, the Scrapdome challenge, lasting damage to Tin Town, sending someone else on a run.

## Removed

Nothing.
