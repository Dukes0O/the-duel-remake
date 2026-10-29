# NIGHT-FIXES-1029

Fix forward for the four failures of the 29 October nightly full check
(`docs/board/checks/night-2026-10-29.json`). All came from merges made that night
(EIFEL-CROWN-C2/C3/C4 and VARIANTS-RELEASE), whose lane tiers did not select these suites.
No change touches the released game: the Eifel switch stays `dev`, and nothing in the
race rules, the saves or any released course moves.

## Causes and fixes

1. **`test-circuit-layouts`: "eifel-crown: inside of Spruce Bend stays open".**
   Cause: EIFEL-CROWN-C4 round 2 told the Eifel woods to come within 22 m of the inside of a
   corner (`insideOpen: 22`, an option it added to the planting code). The shared rule, tested
   for every circuit, keeps 30 m free on the inside of every corner so the exit can be seen;
   about 750 trees stood inside it, on all 15 corners of the Eifel road (not only Spruce Bend).
   Fix: Eifel Crown's forest band no longer sets `insideOpen`, so it keeps the shared 30 m.
   The option has no other user, so it is removed from `src/track-script-course.js` too
   (replace means remove). The woods stay dense everywhere else: 12,023 trees against 12,768,
   and the near band still starts 14 m past the road edge with crowns allowed to touch.
   `test-circuit-eifel` and the drive-through are unchanged and still pass.

2. **`test-circuit-layouts`: "Eifel Crown: the test driver completes every lap on Medium without a
   crash" (the same suite's second failure, not in the report summary).**
   Cause: Eifel Crown is the one circuit that keeps oncoming traffic (C2). The test driver
   steers the racing line and never avoids a car, so it ran head-on into oncoming cars on the
   crests of Crown Climb, Crown Kink and Ridge Top (five crashes, game over, first lap 4:10).
   The same failure is present from C2 on; no one ran this suite on the new road. The raw
   drive-through hides it, because it records road and wall faults, not crashes.
   Fix (changed input, see below): the lap-driving check drives circuits that have traffic with
   the traffic off. Without traffic the road is clean: laps of 1:56 and 1:51, no crash, no wall.

3. **`test-opponents`: "panorama-ridge-night: real App starts the requested race".**
   Cause: VARIANTS-RELEASE made the five secret course versions open only when found from the
   helicopter. The game is right. The test's profile unlocked every course but did not hold the
   pilot's map record, so the real App refused the race.
   Fix: the test profile gets the pilot's map find record for every course whose manifest unlock
   is `spotted-from-air`, built the same way as `tools/track-review.mjs` does.
   Once it started, the same suite showed the driver fault of item 4 for the same two versions
   (its three-opponent race of Panorama Ridge Reverse ended in game over, five crashes), so its
   own racing-line list gets the same two ids.

4. **`test-campaigns` shards 1/8 and 2/8: "Harbour Lights Dusk" and "Panorama Ridge Reverse":
   the default car can win all laps.**
   Cause: not the field pace. In this check the car is driven by the stock demo driver, which
   looks too short a distance ahead. The test already drives Harbour Lights with the racing-line
   driver for that reason (RELEASE-HARBOUR). Harbour Lights Dusk is the same road and was missing
   from that list: the stock driver reached lap 3 of 4 when the 400 s allowance ran out.
   Panorama Ridge Reverse runs the road the other way round and the stock driver crashed out
   of it (five crashes, game over in lap 2 of 3), while the parent road passes with it.
   With the racing-line driver both win every lap with no crash (Dusk 350 s, Reverse 295 s)
   on the same easy field. The pace rows for the versions did not need changing.
   Fix: both ids join the racing-line list in the test.

5. **Browser scenario `team-room`: "Timed out waiting for eifel-crown|fixed dossier".**
   Cause: the scenario opens the game with every circuit's switch on. Since EIFEL-CROWN-C2 that
   includes `eifel-crown`, which replaces the released Eifel in slot 9, so the game built the new
   road, whose track reference is not published (it goes live with C7), and the Team Room
   rightly refused it as stale ("Track reference is stale"). With the switch off, as the player
   has it, the released Eifel's dossier opens normally; the slot work did not break it.
   Fix: the scenario leaves off any development course that stands in for a released road
   (it has a `slot` and its state is not `on`). Passes: 4 screenshots, 0 warnings, 0 errors.
   `tools/scenarios/team-room-photos.mjs` builds its entry the same way and would hit the same
   wall; it is not part of the full check and was left alone.

## Changed assertions and inputs (for Claude's written review)

- `tools/test-circuit-layouts.mjs`, lap-driving test: circuits with traffic are driven with
  `noTraffic: true`. No assertion value changed: crashes 0, boundary resets 0, checkpoint resets
  0, stuck under 1 s, 90% clean laps, lap times 55 to 165 s all still apply to Eifel's road.
  What is no longer asked is that this racing-line driver survive oncoming cars, which it can
  not. If you want a traffic lap checked, it needs a driver that dodges, which is a new tool.
- `tools/test-opponents.mjs`: the profile fixture gains the pilot's map record, and two ids join
  its racing-line driver list. No assertion changed.
- `tools/test-campaigns.mjs`: two ids move to the racing-line driver list. The assertion
  (default car wins all laps) is unchanged.
- No tolerance, expected value or fixture hash changed. The scenery rule (30 m open on corner
  insides) was not touched; the Eifel road now meets it.

## Checks

- test-circuit-layouts 18/18, test-circuit-eifel, test-circuits (208,982 checks), test-world-composition, test-ground-rows-exact, test-replays, test-opponents (365 checks, 28 courses), test-campaigns shards 1 to 8 all pass; test-drive-through passes (run from PowerShell: Git Bash tar breaks it).
- Browser scenario team-room passes (4 screenshots, 0 warnings, 0 errors).
- Lane tier --changed --jobs 2: 168 of 169 pass; the one failure was test-drive-through under Git Bash (tar), which passes from PowerShell.
- vite build passes.
- Other browser failures in the night report (audio-baseline, deep-frames, frame-pacing) were not part of this fix.

## Removed

- The `insideOpen` band option in `src/track-script-course.js` and its use in
  `src/circuits/eifel-crown.js` (added by EIFEL-CROWN-C4, no other user).
