---
task: CMB-04
status: integrated
kind: feature
flag: wasteland2
player_facing: yes
---

# Seeded combat pickups

The flagged Wasteland race prepares a fixed six-crate plan for a two-lap
course: one armor repair and two weapon recharges per lap. The race seed,
stage and lap fix each crate's road position and identity. Weapon crates are
placed on both sides of a car-width road margin. The plan does not depend on
car speed, frame rate, CPU ordering or pickup timers.

Each crate is awarded to the eligible car that first enters its road and lane
contact area in the current simulation step. A tie goes to the player,
then CPU order. Reverse travel misses a forward-road crate. Repair restores
at most 25 armor up to that car's own maximum, and a full or wrecking car
cannot consume it. Easy CPU cars ignore crates. A weapon crate recharges a
used player weapon or gives a Medium/Hard CPU one eligible charge. A UFO
crate cannot grant a second jump in a lap. On-foot ammo has a bounded
inventory operation but no crate spawns until the on-foot actor exists.

The scene reuses six fixed pickup groups, with a green cross for repair and
a colored, tipped box for weapons. Collection gives a named callout and an
indexed event. Ordinary modes and flag-off Wasteland retain the earlier
timed, center-lane pickup path.

## Verification in progress

- Independent red tests: 662c2e7, 3 legacy/control pass and 8 new-behavior
  failures on the pre-feature baseline. A proposed relaxation of two new
  swept-contact assertions was rejected by automatic review; the original
  assertions remain, and implementation meets them.
- Current focused CMB-04 acceptance: 14/14 pass, including 30/60/144 FPS
  swept collection, later CPU ownership, repair and future ammo bounds, and
  flag-off parity.
- Independent review found that comparing road-center crossing times could
  give a crate to a later arriving CPU, and that legacy flag-off boxes gained
  a new tip. The pickup sweep now compares first entry into both contact
  intervals, and the tip appears only on seeded weapon crates. Two focused
  cases pin the first-entry rule; the legacy render assertion pins the old
  silhouette. All 14 focused cases pass after these fixes.
- Existing CPU pickup and CMB-01 armor checks pass. Production build passes
  with the existing Vite large-chunk advisory.
- The private High and Performance browser scenario passed with memory-only
  saves, three CPU cars, six screenshots and zero warnings or errors. Both
  quality modes showed distinct repair and weapon crates, player armor
  60 to 85 with a matching callout, and CPU 3's indexed bomb collection.
  The six pickup mesh identities stayed fixed before and after collection.
- Combined CMB-08/CMB-04 browser check passed in High and Performance after
  integration, with six screenshots, memory-only saves and no browser issues.
  The combined production build passed. Broader balance and frame checks are
  reserved for a release that enables `wasteland2`.
