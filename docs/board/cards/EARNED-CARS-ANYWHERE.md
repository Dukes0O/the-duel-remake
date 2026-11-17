# EARNED-CARS-ANYWHERE

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item O2, its third part: "earned cars drive
anywhere"). EASY-NO-PENALTY left it out until Claude had read the code. Claude read it on 16 November 2026.

## What is true today

The limit is real, and it was designed. Every earned car is one of the cars that travel only by air
(`docs/EARNED_CARS.md`, "Travels only by air"; `AIR_ONLY_CARS`). With the helicopter switched on it waits at Tremblant
Woods and races only on the course where Kestrel One last set it down. Choosing it for any other course is refused
(`_airOnlyRefused` in `src/app.js`). The Jesko follows the same rule, and the rule is why an earned car weighs 1,500 kg or
less: Kestrel One has to lift it.

So a player who has just won a new car can race it on one course, and must fly it by helicopter to race it on another.
For Gratian that is a reward that arrives locked. For the helicopter it is one of the reasons to fly.

## The decision is Kyle's

This changes what the helicopter is for, and the helicopter's story waits for Kyle and Gratian (AGENTS.md rule 18). The
ways it could go:

1. **Leave it.** The lift stays a job the player must do. Cost: the newest car is the hardest to use.
2. **An earned car drives anywhere; flying it in pays.** The refusal goes. Setting a car down on a course by helicopter
   earns something on that course instead (a first-race bonus, or the car's paint for that place). The flights keep a
   reason and nothing is locked. Claude's pick.
3. **Anywhere on Easy only.** The limit stays for Medium and Hard. Simple to say, and it splits one rule in two.

No saved field would change shape under any of the three: where each car stands is already saved and would still be.

## Checks, when a way is chosen

`tools/test-earned-cars-ui.mjs` and the helicopter's lift suites; one independent review, because it touches what a player
owns.
