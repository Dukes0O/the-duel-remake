---
task: GATE-REJOIN
status: merged
kind: fix
flag: hidden-road
player_facing: yes
---

# Leaving the race pauses it; driving back rejoins (26 September 2026)

Kyle's report from the live game: after driving up the hidden road far enough
that the clock stops, reversing back to the course left the race frozen. The
opponent stopped, weapons and pickups did nothing and the clock stayed
stopped.

## Cause

Past 150 m up the spur the race switches to exploring and the app settled the
run as abandoned. Nothing ever switched it back, so a player back on the
course sat in a frozen, already-abandoned race. A hard hit on the wash bank
that reset the car onto the course reached the same state. Muddy Hollow's
ridge (behind its dev switch) had the same gap.

## Rule now (SPEC hidden-road section, decisions.md)

- Departure pauses the race and shows RACE PAUSED · DRIVE BACK TO REJOIN.
- Back below 120 m on the spur (or reset onto the course), the race resumes
  where it stopped and shows BACK IN THE RACE. Turning back at the gate and
  driving back also rejoins.
- Driving through the gate (chosen or automatic entry) is the point of no
  return: it settles the race once as abandoned and clears pending fines.
- Muddy Hollow: crossing the ridge pauses; 12 m back toward the road resumes;
  crossing records the discovery and settles nothing.

## Changes

- `src/hidden-road-journey.js`: `HIDDEN_ROAD_REJOIN_PROGRESS`, rejoin from
  the exploring and turned-back phases, `hiddenRoadRejoined` and
  `hiddenRoadCommitted` events, fines cleared at commit, the two messages.
- `src/muddy-hollow.js`: `rejoinLateral` 72 and rejoin from exploration.
- `src/app.js`: settles abandonment on `hiddenRoadCommitted` (guarded by
  `journey.committed`); the Hollow departure only records discovery.
- `src/game.js`: the message timer also counts down while exploring.

## Tests

- New `tools/test-race-exit-rejoin.mjs`, 5 checks, committed red first (all 5
  failed on the old code): pause without abandoning; reverse back resumes
  clock, rival and combat; turn back and return; entering abandons once and
  keeps the bank; Hollow ridge return.
- Browser: `muddy-hollow` now drives back over the ridge in the real page and
  requires status racing, the BACK IN THE RACE message and a running clock.
  `hidden-road`, `hidden-road-discovery`, `hidden-road-arrival` and
  `wasteland-beta` pass unchanged.

## Changed assertions (all follow the new rule)

- `test-hidden-road-departure.mjs`: the abandonment check now settles at the
  gate instead of at departure, with the gate discovery excluded from the
  unchanged bank; the Enter check excludes the fields the abandoned result
  writes (history, active race, win streak, settled results).
- `test-hidden-road-journey.mjs`: the wash-bank fixture is placed inside the
  bank, so the car is reset onto the course; that now resumes the race.
- `test-muddy-hollow.mjs`: ridge return resumes instead of staying frozen;
  departure records discovery and settles nothing; departure keeps pending
  fines.
- `scenarios/muddy-hollow.mjs`: departure settles nothing; the drive back
  resumes; quitting the resumed race abandons it like any race.

## Removed

The departure-time abandonment for both side trips, and the Hollow's
departure-time fine clearing.
