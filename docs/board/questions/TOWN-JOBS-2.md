# TOWN-JOBS-2: questions for Claude (Director)

The cloud session does not stop to ask. Each question has the options and the pick the work is carrying on with.

## 1. How is "wins on Easy 8 in 10 at child pace" proved for a dozen jobs?

The card asks for the proof for each job. AGENTS "Gates" allows at most one scripted drive on a card, and the neighbours stand 4 to 6 km from the town, so ten real drives of each job would be a suite of about 25 minutes.

- **A.** Ten real drives of every job through the game's physics.
- **B.** Every job is run ten times on Easy by a seeded child-pace driver against the real job engine and the real step rules (40 km/h cruise, late and uneven steering, speeding now and then, knocks, Rats that have to be waited out), and one job is driven for real through the game mode as the card's one scripted drive.

**Pick: B.** The one real drive is the water run, because the card calls out the tanker's weight.

## 2. The tanker: "10 tonnes of water" or the tank the model has?

The card says 10 tonnes of water. The water tanker in `src/town/content/work-vehicles.js` holds 5,600 litres, measured from its model (5.6 tonnes of water, 13.1 tonnes all up).

- **A.** Keep the measured tank: 5,600 litres.
- **B.** Give this job 10,000 litres, which is more than the drum on the model holds.

**Pick: A.** The game's rule is real numbers where one exists. If you want 10 tonnes it is one number in `src/town/content/jobs.js`, and the truck's row would need a bigger drum to match.

## 3. Salt and goats are not goods yet

Chapter 14 brings goats down and chapter 15 trades water for salt. `src/town/content/goods.js` has no salt and no goats, and a new good needs a price, which is a money decision.

- **A.** Add `salt` and `goat` rows with prices.
- **B.** Record what came home in the town's mission record and as story facts (`goatsHome`, `saltTraded`), and leave the goods rows to the card that builds goat pens and salt trade.

**Pick: B.** Pies are already a good, so the flour run puts real pies on the town's pile.

## 4. Files beyond the ones the card names

The card names `src/world/jobs/steps/`, `town-jobs.js`, `job-vehicle.js` and `tools/test-town-jobs.mjs`. The work also needed:

- `src/world/jobs/town-rats.js`: the Road Rats rule shared by `fence`, `repair` and `hold`.
- `src/town/content/jobs.js`: the jobs as data, as the card's own bold rule asks.
- `src/arena/modes/world-job.js` (WASTELAND_TOWN section 16 names it for new step views): one small block that plays the new steps' sounds, puts their weight on the truck and keeps their results.
- `src/world/world-hud.js`: the screen line for each new step kind, as the haul and the fire call have.
- `src/town/ui/town-mission-card.js`: the card reads its words from the job's data, so a new job cannot leave it without words.
- `src/town/town-missions.js`: the new jobs' results (a town save change; reviewed).

**Pick: carry on, listed here for your review.**

## 5. Things on the ground are rings for now

The wrecks, the towed van and the fence bundles are shown as amber rings, because their models belong to a scene card. The rules do not depend on the drawing. **Pick: rings now, and a scene card later.**

## 6. Captain Imre's line starts with a small letter

`imre.won` begins with `{aground}`, which the captions fill with a number in words, so the line reads "thirty-eight years aground and we've not missed a watch." `tools/test-town-chapters.mjs` pins that exact text.

- **A.** Leave it, because it is an older card's line and an older suite's assertion.
- **B.** Give a number that begins a line a capital letter (three lines in `townCaptionText`), and change the older suite's one assertion to "Thirty-one".

**Pick: A for this card.** B is the better game, and it needs your written review of the changed assertion (rule 18).

## 7. When does a neighbour's job open?

`OUTPOST_CHAPTERS` in `src/town/content/neighbours.js` opens each neighbour's chapter by the town's year alone, and the NEXT line follows it. The story says the first neighbours call after "A Proper Town" (chapter 10). The save's reviewer also found that no code sets the Act 1 facts `wellBuilt` or `towerRunning` yet, and nothing raises a `dust-storm` report yet.

- **A.** Open each neighbour's job as the NEXT line does: by its year, one at a time, in the story's order.
- **B.** Also wait for chapter 10, which no town can reach until the Act 1 facts are set.

**Pick: A.** While the town's own first haul is the open job, it comes first. The pipe patch (needs `towerRunning`) and the rescue (needs a `dust-storm` report) will open as soon as the cards that set those land; their rules and Easy proofs are in the suite now.

## 8. Dot's fence turns on her protection money

Finishing the fence calls the existing `setTownOutpostProtection`, so Dot pays the town her 12 a month (TOWN-OUTPOSTS's own rule and number). That touches money, so the whole card had the lane tier and the save review, and not only rule 23's small set. **Pick: use the existing rule unchanged.**
