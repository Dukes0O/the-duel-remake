# OPEN-APPRENTICE-RUN | Gas yield and hearth banking

26 November 2026. Waiting for Claude's written answer before changing saves or rewards. Section 23 sets the learner's share and twenty gas per ember. The current code leaves two decisions for this card.

## What load reaches Tin Town on a hand run?

The repeatable roads in `src/world/jobs/gas-run.js` finish with Bess's health and an arrival line. They have no gas or hole reading. The separate Slow Ride job records both through `src/world/jobs/gas-load-rule.js` and uses its gas result to set scrap pay in `src/arena/arena-settlement.js`.

- **Recommended.** Under `story-choices`, capture Bess's arrival health as a whole-number load out of 100 for the repeatable roads. Use the existing completion and preserve road scrap and feud. Count legacy `emberRuns` toward the offer, since those were hand runs. Require a newly measured finish for a lesson. Confirm whether the Boneyard furnace battle also supplies a load or only counts as a past hand run.
- If literal holes and leaks are required, use Slow Ride's tank rules on the repeatable roads. Confirm which road mechanics to carry over and retain the existing road scrap awards. This needs the escort hook and a wider road check.

## Where is the daily bank, and what goes in the ledger?

`settleNight2` in `src/story/night-2-save.js` is the only persisted caller of `bankLedgerHearth`. It banks the authored Night 2 once, then uses the replay flow. Open roam can save its world, but has no repeatable bank action. `directBankedOpenWorld` has no caller and only runs the thread director. Routing the routine through Night 2 alone leaves no next bank after a lesson.

- **Recommended.** Authorize a repeatable bank at Tin Town's open-roam hearth under `story-choices`, using a single open-record and ledger settlement. Keep the authored Night 2 replay separate. Pay the hand run on arrival, and suppress the learner's delivery for that day when the player took Bess out or taught the lesson. At a bank, post the learner's delivery once before that night's burn, then show the tally the next morning. Preserve state and rewards on repeated or denied saves.
- If the repeatable hearth belongs to a later card, name the bank entry point and the player flow this card should use for its acceptance drive.

Please confirm whether the saved gas stock keeps the whole delivery as well as the baked embers, or keeps only the gas left after baking. The card check asks for gas and embers to be added, so the suggested rule is to record the whole delivery in the routine tally, add `floor(delivery / 20)` embers, and put the unbaked remainder in the gas stock. Please also confirm whether remainders can combine across deliveries. These choices affect the saved stock and the reward check.
