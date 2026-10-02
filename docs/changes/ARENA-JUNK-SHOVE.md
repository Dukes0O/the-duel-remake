# ARENA-JUNK-SHOVE

Status: native checks and Source review pass; browser rerun pending.

## Changed

Round-owned junk cover uses the released crash-body solver and knock motion.
Its native body weighs 2,175 kg, 1.5 times the ordinary 1,450 kg car. Its real
world position and heading feed existing CPU avoidance. The renderer copies
that pose without moving simulation bodies.

Junk settles on the floor and keeps its position. Native wall containment runs
quietly for junk, without sliding armor damage or wall-hit cues. Titan retains
the released flattening, score, vertical checks and vehicle.crush cue. Crushed
hulks finish their first slide, then remain transparent to later car contacts
and solid junk-pair contacts, as before.

Moved cover refreshes spawn candidates before native respawns. Slot indices
and copied Fuel depot coordinates stay intact. Idle ticks retain the valid
candidates. The leaf continues the venue's six-metre search for at most one
course length, using its authored 14-metre clearance.

A late native junk contact now reapplies the released floor solver after its
pose correction. Wall geometry, participant collision physics and steering
rules are unchanged. A new actual ram uses vehicleSmash and the existing
vehicle.crash-impact sound. Titan uses propCrushed and vehicle.crush.

## Tests

Independent tests came first in 18aa344: 53 checks, with 37 genuine acceptance
failures and 16 released controls passing. Raw native impact velocities meet
the movement floors without displacement tuning. All original assertions and
replay pins remain unchanged.

Review found the venue's six search advances could leave a current-cover
cluster blocking slot zero. New regression daf0d3f came first: six checks,
four genuine RED failures across Last Car Rolling and Fuel Run. Slot IDs and
depot controls passed. The continued search passes all six native checks.

The full-round control then found a late junk contact pushing CPU-3 outside
the floor after the event had contained it. Paired native Medium runs at seed
1989 show integration's maximum excess was zero; Junk's was 0.462277 metres.
New check ec388ae came first: the original 53 passed and the added witness
failed. Reusing native containment passes all 54 checks and the original
13-test arena-event suite, including all three full-round difficulties.

Fourteen focused suites pass on the final Source. Their direct commands are
node tools/test-<name>.mjs for:
- arena-junk-shove: 54 checks; arena-junk-respawn: six checks.
- arena-event: 13 tests; arena-fuel-run: 68 tests and 1,552 checks.
- sal-fight: 25 tests and 119 checks; arena-shove: 131 tests and 6,542 checks.
- arena-feel: five tests; arena-steering: 215 checks.
- vehicle-knock-integration: pass; vehicle-collision: seven tests.
- contact-damage: 195 checks; arena-props: 29 checks.
- arena-ramp-side: 42 checks; roadside-destruction: 24 checks.

Independent review cleared the native Source, including the contact correction,
spawn continuation, crushed behavior and renderer purity. Browser evidence
and mandatory lane/build gates are still pending. The first browser attempt
stopped before its first screenshot: capture labels contained underscores.
The recipe now uses hyphens in labels only; simulation inputs are unchanged.

## Replays

No fingerprint changed. Focused native controls preserve the reviewed global
solver, ordinary road, Last Car Rolling and Sal pins. Longer arena outcomes
can change when movable cover is hit, as intended.

## Removed

The fixed stop response is replaced by crash motion only for round-owned
arena junk. Ordinary Titan Arena props retain their released crush behavior.
No sound asset or dependency was added.
