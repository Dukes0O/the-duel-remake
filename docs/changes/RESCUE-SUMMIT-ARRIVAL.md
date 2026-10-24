# RESCUE-SUMMIT-ARRIVAL: the Summit cruise leg ends over the start area

Card: RESCUE-SUMMIT-ARRIVAL (Claude, SIM lane), from RESCUE-SUMMIT-TUNE's open point.
Behind `rescue` and `summit-run` (the session's `rescueEnabled` and `summitRunEnabled`).
File: `src/heli/heli-session.js` (`enter`); new test `tools/test-heli-summit-arrival.mjs`
(28 checks, about 2 minutes); board entry set to owner claude, building.

## What changed

With both switches on, the cruise leg to Summit Run now ends hovering over the start
area's landing circle (at the usual arrival height, 150 m up, heading the way it came in),
not at the arrival point 1.5 km out. The autopilot's straight line from that point to the
avalanche slide and to the pickup clears the cliff near x 2,080, z 1,565 that the line from
the old arrival point met. Every other arrival keeps its arrival point and speed: Tremblant
Snow, Panorama Ridge, the home pad, and Summit Run with rescues off.

## Decisions I made

- **Hovering, not moving, on arrival.** The old arrival carries 20 m/s toward the zone;
  over the circle that would fly on past it. Summit's arrival has no speed.
- **The cruise leg itself is unchanged**: the same fuel (160 kg), the same flying time on the
  rescue clock. Only where the leg ends moved; the Summit clock rows of RESCUE-SUMMIT-TUNE
  stay as measured (its scripted flights started the climb from the start area anyway).

## Tests (test first; the arrival checks failed before the change)

- Pin 1120341889, worked out before the change: the helicopter three seconds after the cruise
  leg from the home pad to Tremblant Snow and to Panorama Ridge (both switches on), to Summit
  Run with rescues off, and to Tremblant Snow with rescues on and Summit Run off. Unchanged.
- With both switches on the cruise leg ends inside the landing circle at the arrival height,
  hovering; with rescues off it ends about 1.5 km out, as before.
- Avalanche answered at the pad, line fitted, cruise leg, then (the cruise leg leaves only 179
  kg, and the climb takes about 250) down for the start area truck, a full tank, back up to the
  arrival height: the autopilot flies to the slide without a crash and hovers over it.
- The pickup has no autopilot goal of its own (the supply run is the pilot's), so the same
  autopilot and flight rules are flown headless from the arrival state to the pickup: no
  crash, a hover over it.

## Open for Claude

- An autopilot started on arrival still cannot reach the slide on the cruise leg's leftover
  fuel (179 kg); the pilot lands at the start area truck first (RESCUE-SUMMIT-TUNE). A
  rescue autopilot goal that routes through the trucks would be a new card.

## Changed assertions

`tools/test-heli-autopilot-rescue.mjs`, "The flight itself" (home pad to Summit Run, both
switches on): `near(dist(arrived.heli, arrived.zone), 1500, 40, 'arrived 1.5 km from the
zone')` now asserts the helicopter is inside the landing circle (`dist <= zone.radius`),
because the arrival point is the thing this card moves. The fuel (160 kg), the 2,860 m
altitude base, the thin-air check and the autopilot's hover over the zone 20 m up that
follow are unchanged and pass.

## Removed

Nothing replaced.

## Gates

Owned suite: `test-heli-summit-arrival` (28). 24 October 2026, once, on the final commit after
merging current `integration/wasteland` (clean): the card's test passes; `node tools/run-tests.mjs
--tier lane --changed --jobs 4`: 145 passed, 0 failed (727 s), including
`test-heli-autopilot-rescue` (169), `test-heli-summit-rescues` (113), `test-heli-summit-tune`
(105) and the rescue session suites; `npm run build`: pass.
