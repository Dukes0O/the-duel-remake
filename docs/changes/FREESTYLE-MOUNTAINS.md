# FREESTYLE-MOUNTAINS: every car drives on the Freestyle quarry mountains

Kyle, 16 November 2026: Gratian's Koenigsegg crashed far from the mountains
and in mid-air in the Titan dome. Measurements on the card.

**Changed.** `sim-contacts.js`: on the practice course the player's car is
supported by the quarry mountains' real surface (`sampleMountainSupport`)
whatever the car, and a mountain is not a wall for it; rocks and wrecks still
support only the off-road trucks. `sim-crash.js`: a practice recovery spot
may stand on a mountain. Other courses are unchanged.

**Tests.** `test-freestyle-course`: a Jesko driven at a quarry mountain
reaches its top with no crash, never sinks below the surface and climbs over
20 m; a 20 m jump toward it does not crash; the Titan climbs it. Run against
the old code it fails with "mountain, 63 m from its top".

**Removed.** The full-height oval wall around each quarry mountain for cars
without off-road ability.
