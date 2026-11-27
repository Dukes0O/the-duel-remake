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
