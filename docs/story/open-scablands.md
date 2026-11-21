# The open Scablands: freedom, discovery and side stories

Kyle's ideas of 21 November 2026 for the choose-your-own-adventure story, logged to build on. They sit beside
`five-cold-nights.md` (the first act) and apply to every night of it and to the stories after it. Nothing here is built
yet; card STORY-OPEN-WORLD turns it into a design and then build cards.

Kyle's aim, in his words: "we need to make the code and storylines very flexible to adaptation, extension, enhancement,
variability, choice and randomness."

## 1. People who live, not people who stand to attention

"People shouldn't just be standing at attention motionless all the time. They should be able to move and walk around.
can be aimlessly or on a set track. but standing at attention is just silly."

- Every person in a town or camp has a routine: a set track (a guard's round, a mechanic between bench and car), a
  wander inside an area, or a task in one place (cooking, welding, hauling).
- A person the story needs is found where the routine puts them, and turns to face the driver when spoken to.

## 2. Freedom within each night

"We should be able to go into buildings if we want. We ought to have a large degree of freedom within each of the nights."

- The buildings of a town can be entered on foot: inside are people, services and things to find.
- A night's story waits for the player; the player can leave it, explore, and come back to it.

## 3. Services in town

"when the car is dirty, we should be able to find someone in a building who'll wash it; same with repair."

- A washer and a mechanic each work in a building in town. They wash or repair the car for scrap, and they are the same
  people the player meets elsewhere in the story.

## 4. Skirmishes on the open road

"If we head out and explore in the scablands, there should be an opportunity for more skirmishes."

- **Invisible checkpoints** are spread across the Scablands. Passing one may bring one car or several (a random number)
  onto the road.
- **Random intent:** a car may come to fight, or may only drive by, and the player chooses whether to engage it.
- **Switchable:** "The checkpoints must be able to be turned on and off so that during an actual mission that we're
  following, we don't cause a checkpoint to trigger and have multiple interactions." A mission turns them off while it
  runs; free roaming turns them on.
- All of it is drawn from the seeded generator, so a run can be replayed (AGENTS, "Always").

## 5. Camps that are not on the map

"we should be able to discover various camps that are not on the map ... At a minimum we add the discovery of towns and
encampments that weren't already established, to the map."

- Hidden towns and camps across the Scablands. Finding one adds it to the map for good.
- A camp may need help. Anything that needs supplies is likely too far from the player's town to help at once, but a
  thing that needs fixing can be fixed on the spot with the wrench, for scrap and goodwill.
- Goodwill with a camp is remembered (the ledger, `five-cold-nights.md` section 2).

## 6. Side stories found along the way: the burned camp

"if we discover an encampment, and we've helped them (they've become known and friendly), and we revisit the area, they
could be gone with the encampment destroyed and smouldering - likely we'd see smoke on the horizon and would draw our
attention over to it."

1. **The sign:** smoke on the horizon draws the player to the camp. It is burned and empty.
2. **The clues:** what is left points to an enemy: the Ash Men, Old Smoke, or another hostile camp.
3. **The choices:**
   - scout the enemy's known town; if they are confirmed as the culprits, engage there and then. The player is unlikely to
     win. A loss means capture, and the player's town must pay a large ransom to get the driver back;
   - or take the intel home and decide there: go out with a party to fight and free the friendlies, or leave them.

## 7. Not a straight line

"These can be storylines that get discovered along the way, and are not necessarily set out in a linear experience. so
one can play without actually unlocking these side stories and they'd be available to unlock on most Nights' play."

- Side stories are optional. The main story can be finished without any of them.
- Each side story has conditions (a camp found, goodwill earned, a night reached) and can start on most nights.
- A side story's state lives in the ledger, so it carries across nights and can be picked up again.

## 8. What the foundation must allow

From Kyle's aim above, the design must give:
- **Data, not code, for content:** people and their routines, buildings and their services, checkpoints, camps, side
  stories and their conditions are written as data, so new ones are added without new code.
- **Variety and chance:** encounters, camp needs and side-story starts vary from run to run, drawn from the seed.
- **Choice and consequence:** every choice is recorded and later content can read it.
- **Switches:** the checkpoints, and any system a mission needs quiet, can be turned off by that mission.

## Fixed points this must respect

- One keyboard; players take turns (`memory/one-keyboard-no-coop`).
- The player is a pre-teen (decisions, 20 November 2026).
- Dialogue is full plain sentences (`memory/dialogue-plain-prose`).
- The story for the helicopter, the Deep and the Lab is made with Gratian (AGENTS rule 18).
