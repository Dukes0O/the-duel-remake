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
  12 m circle within 120 m; `pickHiker` puts the hiker in one and the "last
  seen" point within 250 m (a 300 m search circle); `hikerSpotted` (70 m
  sideways, at most 120 m up); `hikerWalk` to the clearing at 1.2 m/s.
- The avalanche: `slideSpots` (mean slope 10 to 40 degrees, nearest 30
  first, 30 m clear of road, lodge and buildings, on the ski hill or off-road
  snowfields), `pickSlide` with the beacon buried inside, and
  `beaconSignal` (heard within 60 m with height; a beep every 0.15 + 1.6 x
  d / 60 s; 900 to 1,400 Hz; the bar fading with the square of the
  distance; no direction).
- The hoist rescue: `hoistSpots` along Mountain Climb and The Ridge (25 to
  40 degrees, 10 m or more below the road, 20 to 120 m from its edge, no
  tree within 12 m) and `pickHoist` with the car beside the driver.
- The supply run: `supplyYard` (a clear 10 m circle near the summit hut or
  the lodge), `crateSpots` (three by the landing zone), `liftAt` (H1's thin
  air), and the fuel drums tuned to 820 kg in RESCUE-LINE's table.
- `clearCircle`: H1's clear circle test, here for the sites (the session's
  own copy is private to heli-session.js).

## Tests

- `node tools/test-heli-search.mjs` (new): 465 checks in about 5 s (hikers in
  forest with a clearing on both courses; the slides' slopes, road, lodge
  and beacon rules on Tremblant Snow and Summit Run; beep interval, pitch,
  bar and range with height; the hoist spots' section, height, slope, trees
  and road gap; yards and crate spots; the hut's real height; the thin-air
  climb with the real flight model; same seed, same sites).
- `node tools/test-heli-mode.mjs`: 152 checks (the import guard sees the new
  rules file).
- Lane tier and build: below.

## Changed assertions

None. The packet's 20-degree minimum for a slide is 10 here, for the reason
on the card.

## Removed

Nothing.
