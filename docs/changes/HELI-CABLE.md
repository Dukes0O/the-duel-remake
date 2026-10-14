# HELI-CABLE

The car on the cable, from `docs/HELICOPTER.md` section 5. Nothing in the
game imports it yet; HELI-MODE and HELI-DISPATCH wire it in behind the
`helicopter` switch.

## What landed

- `src/heli/heli-cable.js`: a 15 m cable, stiff when taut and slack when
  not, with the load as a point mass. It returns the cable's pull for the
  flight step. Which cars lift (masses from `src/config.js`, the packet's
  table for the rest, used only here), the 500 kg lesson crate, hooking and
  letting go with H, set-down in the 12 m circle at 1 m/s or less, drops
  measured from the release height, cargo hits on the ground, trees,
  buildings and the helicopter (light, heavy, wreck), trees that fall once,
  the car turning nose first, and the swing angle for the cable view.
- `src/heli/heli-autopilot.js` (Claude's own helicopter file, from
  HELI-FLIGHT): the wanted speed now builds at 0.7 m/s2, and with a load it
  leans the hook toward the load's swing. Without a load it flies as before.
- `docs/HELICOPTER.md` section 5: the numbers this card settled (hooking
  reach, the coupled swing, nose first above 5 m/s, cargo hit speeds, the
  tension cap).

## Checks

- `node tools/test-heli-cable.mjs`: 87 checks pass (every car's mass and
  whether it lifts, the Banshee needs the Lab and the Titan never lifts,
  car physics gets no new masses, hooking reach and speed, hanging still
  with the car's weight on the helicopter, the swing period of the
  helicopter and car together and its dying away, the autopilot carrying
  the Jesko at 30 m/s with the cable within 12 degrees, set-down in and out
  of the circle, clean release on the ground, the drop measured from its
  height, a 9 m/s slam, a tree hit once that falls, a building charged
  once per strike at 8, 12 and 20 m/s and never left with the car inside
  it, a clean release under 1 m, one set-down while bobbing, dragging a
  hooked car without a jerk, no hooking past the limit, the autopilot
  engaging while flying away, the car swinging into the helicopter, no
  fling from a stretched cable, same inputs give the same swing).
- `node tools/test-heli-flight.mjs`: 103 checks still pass with the
  autopilot changes.
- Review (rule 17): one independent reviewer found two real faults: a car
  pressed into a building or rock was charged every step (nine charges for
  one strike), and a release under 1 m was charged as a drop. Both are
  fixed with tests, along with its notes on dragging, repeated set-downs,
  hooking past the limit and the autopilot's starting speed. The reviewer
  confirmed the fixes. HELI-DISPATCH decides a delivery at the H release
  (a set-down is counted once per hook-up).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 21 passed, 0
  failed, 0 not run in 250.04 s, after the fixes (the first run, before
  them, was 21 of 21 in 153.71 s).
- `npm run build`: passed in 1.12 s (the usual large-chunk warning only).

## Changed assertions

None. No existing test changed.

## Race fingerprints

No race code changed; nothing outside `src/heli/` imports these files.

## Sound cue

No sound is played here. The events it raises (hooked, load lifted,
set-down, released, drop, cargo hit, tree down) are the hooks for
HELI-RADIO's cable creak, hook release and set-down thud and the radio's
drop and cargo lines.

## Removed

Nothing was replaced, so nothing was removed.
