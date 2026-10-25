# SUMMIT-HELI-RESCUES

From RESCUE-AUTOPILOT (Claude, 16 October). Summit Run is a helicopter
destination now (behind `rescue`), but no rescue happens there yet.
Design: `docs/HELI_RESCUE.md` sections 2, 5.4 and 5.5.

- Call `rescueConditions({summitRun})` so avalanche and supply rescues can be
  set at Summit Run when its switch is on (Tremblant Snow's lodge stays the
  supply fallback when it is off).
- Lay out the supply run at Summit Run: the pickup in the start area and the
  truck, up to the summit hut (packet 5.4).
- The flying ceiling: Summit's ceiling today is 300 m above the start, below
  the pickup at about 570 m up. Settle the ceiling rule so the summit hut is
  reachable (for example 300 m above the ground under the helicopter, with
  H1's thin-air thrust rule still applying) and test it.
- Tests: Summit rescues appear only with both switches on; every other
  destination and fingerprint unchanged.

Also (RESCUE-AUTOPILOT review, minor): `specialGoal` in `src/heli/heli-session.js` (about line 418) falls through to `recoveryGoal`, so with a recovery job in hand and a hoist or avalanche hold on the same course the autopilot would fly to the car. Add `|| live` to the first guard of `recoveryGoal` and test it.

Also (RESCUE-FINISH part 1): add a one-line `carId` to the hoist site in `src/heli/heli-session.js` (the same car the recovery job later offers), so the drawn car matches the job; the view already uses it when present.
