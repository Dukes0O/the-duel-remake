# RUN-FIRE-LINE

**The fire line: a run you can keep driving by hand, or build a safe way for and set running by itself.**

**A future idea, kept for later (Kyle, 16 November 2026). Not to be built now. Nothing here is in the plan.**

## Kyle's direction (16 November 2026)

> "so I'm unsure what the boring machine storyline includes as it relates to carrying embers, but if that's a recurring job
> (the ember run) then maybe we could have the boring machine option presented as a safe way to "automate" or have recurring
> runs where we can make money in the background instead of always having to run the course in the car. this is a kind of
> incentive, but also a real world thing that I'd like Gratian to be faced with, choose to always do things manually, or
> automate something that could bring ROI without constant manual intervention."

Where things stood when he said it: the boring machine had nothing to do with the ember. She belongs to the Dig and to the
Far Side story (a goat, a tunnel through the Ridge, the place where it rains). The ember belongs to the Everburn story, whose
first job, Hot Delivery, is driven once. The runs that come round again are the gas runs with Big Bess and Tin Town's notice
board. This card joins them, as Kyle asks.

Kyle, the same day, on reading the design below: "I think 20 minutes is too rapid for the burn out, that would mean nearly
every time he plays, he'd have to do one of these runs. I think the timer should be 40 minutes and would need to accumulate.
I didn't realize the stories had nothing to do with each other. This can be something handled later in our development.
just keep it as a future enhancement idea." So: the forge's clock is forty minutes of play, not twenty, and the whole card waits.

Kyle, on what "accumulate" means (Claude had read it as runs piling up, which was wrong): "I meant for accumulate as counting
time over sessions played. that is if G plays 20 minutes, then 20 minutes is recorded. another 10 minutes on another day,
brings it up to 30 mins. a 3rd day might have 30 minutes play time and 10 minutes in, a warning would be issued that the embers
are getting low." So: the forge's clock counts minutes of play and is kept from one sitting to the next. It does not run
while the game is closed and does not start again each sitting. When it reaches forty minutes, wherever that falls, the
player is told the embers are getting low.

## The idea in one line

**Tin Town's forge needs fire again and again. You can carry it every time, for good pay and some danger. Or you can spend
scrap and an afternoon with the boring machine on a way the Ash Men cannot watch, teach a driver, and let the line earn while
you do something else.** Neither is the right answer. The game shows the sum and lets the player choose, and choose again.

## The design, settled before code (Claude, 16 November 2026). Numbers are first guesses, to be set by play.

**1. The fire run comes round.** Once Hot Delivery is done, Tin Town's forge burns a pot of fire in forty minutes of play
(Kyle's number). The minutes are counted across sittings and kept in the save: twenty one day and ten the next make thirty,
and ten minutes into a third sitting the player is warned that the embers are getting low. When it is low, Auntie Solder asks on the notice board and on the map. Each run is Hot Delivery's
rule again, shorter in the telling: Cinder's brazier, the pot, the four ways, pay by the ember (bright 120, alive 80, barely
50). The Ash Men's feud rises with every run that gets through (`docs/FEUDS_AND_RUNS.md`), so the road gets harder, which is
what makes a safe way worth having. A run not made is not a failure: the forge burns low, Tin Town's prices rise a little,
and the next run pays the same.

**2. The safe way is built, by hand.** Nothing is bought with a button (MACHINES section 2).
- **The line:** from the yard's wall, under the scab plates' first scarp and under the dry river beside the Steps, to a mouth
  inside Tin Town's fence. About 900 m of bore in two cuts, each ending in a face, with open ground between that the
  furnace cannot see (the plates' cover buttes). The player surveys and cuts the first with the boring machine; the second
  teaches the apprentice (card MACHINE-BORER-APPRENTICE), or the apprentice cuts it while the player drives a run by hand.
- **It costs scrap.** Every metre of bore is lined with a steel ring. Rings are made from scrap the player has: about 1 scrap a
  metre, about 900 for the line. The Dig says the cost before the first cut and counts it down as she goes.
- **It costs time.** About half an hour of the player's own play for the first cut and the teaching, by the pace ruled for her.

**3. The line is taught, then it runs.** The player drives the pot through the finished tunnel once, with a town driver riding
along. That driver then makes the run alone in a small hauler each time the forge is low, while the player does anything else
in the game (not while the game is closed: the town's rule).
- A line's run always arrives **alive**, never bright: 80 scrap, less the driver's 20, so **60 a run to the player**. No
  ram can reach it and the furnace cannot see it. That is what "safe" buys, and what it costs: a hand run driven well pays 120.
- The line can be looked in on like any work (the bore board's neighbour: who is driving, where the hauler is, runs made,
  scrap earned). The player can ride any run, and can always take a run by hand instead, by the road, for full pay.

**4. The sum is on the screen, in plain words.** This is the part Kyle wants Gratian to meet. Before the first cut, at the
face, and afterwards on the line's board:

    The safe way costs about 900 scrap and half an hour of your own work.
    After that the line brings 60 scrap every run without you, a run every forty minutes of play.
    It pays for itself after 15 runs. That is about ten hours of play.
    Carrying it yourself pays up to 120 a run, and takes six minutes of your time each run.

After it is built the board keeps the tally honestly: scrap spent, scrap earned by the line, runs to go until it has paid for
itself, then "The line has paid for itself. Everything from here is gain." Brian has a Lab lesson for it, in prose with a
picture (card to follow): what something costs, what it brings back, and how long until the two are level.

**5. The choice stays a choice.**
- The hand run is never taken away and always pays more per run. A player who loves the drive loses nothing.
- The line is not free money for ever without a thought: about once in ten runs something needs deciding, said wherever
  the player is and never forcing a return (a ring has cracked, 40 scrap to mend, the line waits; the Ash Men have found the
  far mouth, go and clear it or pay Tin Town's guard 60).
- A player may build the line late, early or never. The story does not need it.
- The same shape serves later lines (water for Vane, gas for the Boneyard, the Far Side's goods): a run that comes round, a
  way that is built by hand, a driver who is taught, a tally that tells the truth.

## What it needs first (it does not start before these)

EVERBURN-REMAKE job 1 tried and passed by Kyle; MACHINE-BORER and MACHINE-BORER-APPRENTICE; a car driving through a bored
tunnel on the land (the save card that MACHINE-BORER put off); the town's save; `docs/FEUDS_AND_RUNS.md` step 2 (the feud).

## Slices, when it starts

1. The fire run comes round by hand (no machine): the forge's need, the board, the feud rising, pay.
2. The safe way: the line's survey, the two cuts, the rings' cost, the tunnel driven by car.
3. The line taught and running, the tally, looking in, the two things that need deciding.
4. Brian's lesson on what a thing costs and what it brings back.

## Checks (named before code)

1. Rules: the forge's need returns on the clock; a hand run pays by the ember; a line's run pays 60 and is never rammed or seen.
2. Rules: the tally's sum is right for any cost and return, and "paid for itself" is said on the run that crosses it.
3. Rules: nothing is earned with the game closed; the hand run is always offered.
4. Claude plays it by hand before it is called done: five hand runs with the feud rising, the line built, ten runs of the line
   watched while doing other work, both calls answered.
5. Kyle tries it, and Gratian's choice is the test of the design: if one answer is plainly right, the numbers are wrong.

Money and pay: every number above gets one independent review before code (AGENTS rule 17).
