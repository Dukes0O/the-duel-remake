# RESCUE-SITES

Where rescues happen: hiker and clearing, the avalanche slide and beacon, the hoist spot, the lodge yard.

Owner: Claude (SIM). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet section 5. Files: `src/heli/heli-search.js` (new),
`tools/test-heli-search.mjs`. Pure; reads courses through `heli-ground.js`
and H1's clear circle test. A new file of its own; it waits for
FIRE-MISSIONS so it builds against the finished engine. Also tunes the
Summit supply crates to the hut's real height (section 5.4).

## Claude answers (15 October): the sites and the crates

- **Avalanche slides.** Tremblant Snow's ski hill is 36 m high and gentle: its
  slopes average 10 to 13 degrees, and in the whole flying area only 82
  sample points are 20 to 40 degrees, scattered. So a slide's mean slope may
  be 10 to 40 degrees, nearest 30 first. Tremblant Snow gets 3 slides (13,
  10.2, 10.2 degrees), Summit Run's snowfields 12 near 30 degrees. A slide is
  200 m across the fall line and 80 m down it, 30 m clear of the road, the
  lodge and every building or lift tower (props taller than 4 m).
- **Hoist spots.** Panorama Ridge's Mountain Climb and The Ridge are stretches
  of the lap (34% and 22%), found by section name; 166 spots pass the rules.
- **Lost hikers.** Tremblant Woods 400 places (capped), Panorama Ridge 137.
- **The supply crates.** Summit Run starts at 2,860 m and the summit hut
  stands 720 m higher (about 3,580 m), where Kestrel One holds 2,218 kg in
  the air against 2,415 kg at the start. Flown at full lift for a minute in
  the real flight model: with the fuel drums at 820 kg, a full tank sinks,
  half a tank climbs about 165 m a minute at the start and about 60 near the
  hut. Food 300 kg and medicine 200 kg lift with a full tank. The masses
  live in one table, `SUPPLY_CRATES` in `heli-rescue.js` (RESCUE-LINE).
