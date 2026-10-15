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
  10.2, 10.2 degrees), Summit Run 12 from 24.6 to 34.1 degrees. A course
  with no ski hill has its slides only beside its snow sections (Summit Run's
  Snowfields and Avalanche Gallery, by their own road, not a bend of another
  section passing close). A slide is 200 m across the fall line and 80 m down
  it, 30 m clear of the road, the lodge and every building or lift tower
  (props taller than 4 m).
- **The beacon.** Heard within 60 m, height included. A beep every
  0.15 + 1.6 x d / 60 seconds, 1,400 Hz on top falling to 900 Hz at 60 m,
  and the signal bar (1 - d / 60) squared: full on top, a quarter at 30 m.
  No arrow and no distance.
- **Every circle is a radius,** as H1's 12 m landing circle is: the hiker's
  clearing 12 m, the hut yard 10 m, Summit Run's pickup 12 m.
- **Hoist spots.** Panorama Ridge's Mountain Climb and The Ridge are stretches
  of the lap (34% and 22%), found by section name. Each spot is measured
  against its nearest road, so a switchback above it cannot pass a spot
  that is too close to, or level with, another bend; 161 spots pass.
- **Lost hikers.** Tremblant Woods 400 places (capped), Panorama Ridge 126.
- **The supply run: where the crates wait (review, 14 October).** The packet
  put the crates at Summit Run's start, 7.6 km and 720 m below the hut yard.
  Flown on the autopilot over the real ground, a crate leg of 2.3 km burns
  about 88 kg of fuel loaded and 62 kg back empty, so a 7.6 km leg needs most
  of a tank each way: the job could not be done, and a full tank is too
  heavy to lift the drums. Answer, in the story's own terms: the trucks got
  as far as the avalanche. **The crates wait at a pickup on the open road
  100 m below where the race's avalanche crosses it** (`supplyPickup`:
  lap distance 10,320 m, about 3,430 m up, 2.3 km from the yard and 150 m
  below it), **with the lodge's fuel truck beside them, selling fuel at the
  home pad's price.** The H1 rule that the pump is at home stays everywhere
  else. The thin-air lesson becomes the choice at the truck before each
  trip: buy only as much as you can lift.
- **The drums, tuned to the pickup.** Kestrel One holds 2,258 kg in the air
  there. Flown at full lift for a minute in the real flight model, with the
  drums at 640 kg: a full tank sinks, half a tank climbs about 180 m a
  minute and three quarters about 116; at the yard, 100 kg lighter, they
  still climb. Food 300 kg and medicine 200 kg lift with a full tank. A
  drums round trip from three quarters of a tank, with a minute of hooking
  and setting down, uses about 195 kg and lands above the 60 kg reserve;
  three round trips need more than a tank, which is why the truck waits
  there. The masses live in one table, `SUPPLY_CRATES` in `heli-rescue.js`.
- **For RESCUE-HOOKS and RESCUE-ENGINE:** the truck sells fuel only to a
  helicopter on the ground in the pickup's circle during a supply run, by
  the tenth like the pump, and the panel says "buy only what you can lift".
  Tremblant Snow's fallback starts at the home pad, where the pump already is.
