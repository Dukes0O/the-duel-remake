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

## Kyle decided (17 November 2026)

"I kind of think an earned car should be able to race in most places." Gratian is not excited about the helicopter yet; a
joystick and the wildlife would change that. A limit only on Medium and Hard "is adding difficulty without adding anything
interesting", so there is no split by difficulty. "There might be one top of the line car that if you want to race it in a
top of the line course, you have to fly it there. Maybe that's it."

## Settled design (Claude)

- **Every car earned with medals races on any course, in any mode, from the moment it is earned.** The medal cars leave
  the list of cars that travel only by air (`AIR_ONLY_CARS` in `src/heli/heli-jobs.js` is built from `MEDAL_CARS`). They no
  longer wait at Tremblant Woods, and the pilot's map no longer shows them as cars to lift.
- **One car is still flown: the McMurtry Speirling**, the top of the line. It stays on the list exactly as today. The two
  Falcone cars on that list (Sirena and Vasca) are not medal cars and are not touched by this card.
- **Nothing a player owns changes.** Where each car stands is already saved; a medal car that was set down somewhere keeps
  that record, and the record is simply no longer asked. No saved field changes shape and nothing is migrated. A save
  rolled back one release sees the old limit again and loses nothing.
- **Words:** every line that tells a player a medal car must be flown (the garage, the menu's refusal, the pilot's map,
  `docs/EARNED_CARS.md` "Travels only by air") is corrected. The 1,500 kg limit on an earned car's weight stays in the
  document as the rule for a car that is flown.
- No new game event, so no new sound cue.

## Checks

`tools/test-earned-cars-ui.mjs` and the helicopter's lift suites; one independent review, because it touches what a player
owns.
