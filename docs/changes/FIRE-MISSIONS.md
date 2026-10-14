# FIRE-MISSIONS: the mission engine

Card: FIRE-MISSIONS (Claude, SIM lane, no lock). Design: `docs/HELI_FIRE.md`
section 3.

Needs: FIRE-SAVE (merged first; this lane was cut from its branch). The
H1 dependency is met by HELI-FINISH's code at 64198f94 (the main design
session ruled the pending H1 release is not a build dependency).

## What changed

`src/heli/heli-missions.js` (new), pure and repeatable:

- `armMissions(missions, {date, playerName})`: the seed is the save's
  `heliHash('missions', date, name)` (never 0, which means not armed), and
  the first need is drawn. Arming twice changes nothing. The session arms
  it when lesson 4 is done (FIRE-HOOKS).
- `noteRefuel`: a pump purchase adds 1, up to need, never while a call
  waits or a fire burns. The fuel truck never calls it.
- `callDue`: armed, at need, nothing waiting or burning, out of the quiet
  spell, and some kind possible (`conditions: {fire: [courses that can
  burn]}`). With nothing that can burn, no call.
- `callTime`: 20 to 60 s after lift-off, the same for the same save.
  `createCallClock` and `tickCallClock` ring once at that time with the
  helicopter 30 m or more up, never during a lesson, the opening or a
  cruise fade; the session makes a new clock each lift-off, so a landing
  first leaves the call for the next flight.
- `openCall`: a seeded pick of a kind, then a course (sorted first, so the
  order the courses are listed in does not matter); returns the fire's
  seed. `answerCall` marks it answered; an unanswered call stays in the save.
- `endMission`: count to 0, a new need, `last` set, and the quiet spell:
  `untilDay` two play days on and 1,200 s of engine time, run down by
  `runEngine`. The fire count and the firefighter badge are given by the
  save's `putOutFire` (FIRE-SAVE), in the same step that pays.
- Every draw uses `makeRng(heliHash(seed, purpose, draws))`, so one draw
  never shifts another.

## Tests

- `node tools/test-heli-missions.mjs` (new): 12 groups passed (the rules;
  nothing before arming; need 3 to 6 with every value seen; the same save
  gives the same needs and call times, other players differ; only pump
  refuels count and not during a call or fire; due only when something can
  burn; the call clock's height, lesson, opening and fade rules; answer now
  or later and the call surviving the save; the quiet spell by day and by
  engine time; the same kind three times running; a seeded course pick; no
  helper changes its input).
- `node tools/test-heli-mode.mjs`: 144 checks passed (the import guard sees
  the new rules file).
- Lane tier and build: below.

## Changed assertions

None.

## Removed

Nothing.
