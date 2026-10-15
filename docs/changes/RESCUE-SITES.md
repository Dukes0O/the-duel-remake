# RESCUE-SITES: where rescues happen

Card: RESCUE-SITES (Claude, SIM lane, no lock). Design: `docs/HELI_RESCUE.md`
section 5; settled numbers under "Claude answers" on
`docs/board/cards/RESCUE-SITES.md`.

Needs: FIRE-MISSIONS (merged). This lane merged RESCUE-LINE (for the one
crates table) and merges after it.

## What changed

`src/heli/heli-search.js` (new), pure and repeatable, every pick from the
mission seed:

- The lost hiker: forest places (the fire grid's cells) with a clear, level
  circle of 12 m radius within 120 m; `pickHiker` puts the hiker in one and the "last
  seen" point within 250 m (a 300 m search circle); `hikerSpotted` (70 m
  sideways, at most 120 m up); `hikerWalk` to the clearing at 1.2 m/s.
- The avalanche: `slideSpots` (mean slope 10 to 40 degrees, nearest 30
  first, 30 m clear of road, lodge and buildings, on the ski hill or, with no
  hill, beside the snow sections), `pickSlide` with the beacon buried inside, and
  `beaconSignal` (heard within 60 m with height; a beep every 0.15 + 1.6 x
  d / 60 s; 900 to 1,400 Hz; the bar fading with the square of the
  distance; no direction).
- The hoist rescue: `hoistSpots` along Mountain Climb and The Ridge (25 to
  40 degrees, 10 m or more below the nearest road, 20 to 120 m from its
  edge, no tree within 12 m) and `pickHoist` with the car beside the driver.
- The supply run: `supplyYard` (a clear circle of 10 m radius near the
  summit hut or the lodge), `supplyPickup` (Summit Run's crates wait on the
  open road below the avalanche, with the lodge's fuel truck: the packet's
  start area could not work, see the card), `crateSpots` (three by the
  pickup), `liftAt` (H1's thin air), and the fuel drums tuned to 640 kg in
  RESCUE-LINE's table.
- The spot lists are worked out once per course and ground.
- `docs/HELI_RESCUE.md` section 5.4: a note saying where the crates wait now.
- `clearCircle`: H1's clear circle test, here for the sites (the session's
  own copy is private to heli-session.js).

## Tests

- `node tools/test-heli-search.mjs` (new): 1,134 checks in about 5 s
  (hikers in forest with a clearing on both courses; the slides' slopes,
  sections, road, lodge and beacon rules on Tremblant Snow and Summit Run;
  beep interval, pitch, bar and range with height; every hoist spot's
  section, height and road gap against its nearest road, slope and trees;
  yards, the pickup below the avalanche and crate spots; the thin-air climb
  with the real flight model at the pickup and the yard; the whole supply
  job flown on autopilot over Summit Run's real ground, each crate up and
  back empty, with the drums' round trip above the reserve and three trips
  needing more than a tank; the spot lists worked out once; same seed, same
  sites).
- `node tools/test-heli-rescue.mjs`: 205 checks.
- `node tools/test-heli-mode.mjs`: 152 checks (the import guard sees the new
  rules file).
- Lane tier and build after the review fixes: below.

## Changed assertions

- `tools/test-heli-rescue.mjs` (RESCUE-LINE's test): the Summit Run fuel
  drums are pinned at 640 kg instead of 820, the mass tuned here for the
  pickup's thin air.
- In this card's own new test, after the review: the hoist checks now cover
  every spot (not the first 30) and measure against the nearest road with no
  2 m allowance; the supply checks moved from Summit Run's start to the
  pickup; the separate 20-degree Summit slide line is dropped (the slope band
  is checked per slide).

The packet's 20-degree minimum for a slide is 10 here, for the reason on
the card.

## Review

One independent review (rule 17) of the line, the sites and the radio lines.
Fixed here: the supply run could not be done from Summit Run's start (now a
pickup below the avalanche with a fuel truck, tested end to end); slides only
beside the snow sections; hoist spots measured against the nearest road and
every one tested; every circle given as a radius (the clearing was a 6 m
radius, the yard 5 m, so both were half the size the packet means); the spot
lists worked out once per course; the beacon bar's formula on the card; two
stale comments and a test label.

## Removed

Nothing.
