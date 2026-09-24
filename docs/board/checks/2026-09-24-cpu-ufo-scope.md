# BUG-07 next slice: CPU tactical UFO use

This is preparation for the existing open card. Implementation waits until
the enemy-aim slice is reviewed and integrated, because both edit weapons.
It does not authorize a push, release or save change.

## Existing hooks

- `combat-pickups.js` owns swept contact and per-rival pickup inventory.
  Both seeded and older pickup paths currently reject UFOs for CPU cars.
- `combat-weapons.js` owns destination scanning and relocation. Its current
  destination helper reads the player's lap, checkpoint and level. Generalize
  it with an optional actor while retaining the current player call contract.
- `combat-ai.js` owns CPU pickup use. Add a separate bounded UFO decision;
  do not spend or shorten the shared 10/7/5-second attack schedule.
- Rivals already carry `completedLaps` and `nextLapGate`, and `sim-laps.js`
  validates their progress. No new checkpoint system is needed.

## Acceptance to turn into independent failing checks

1. Medium and Hard collect a UFO only through the existing physical swept
   contact rule. Easy still ignores all pickups. Cover flag off and on,
   including all three rival identities, wrong lane and excessive air height.
2. A collected charge permits one stock-distance jump after that rival's
   first checkpoint, at most once per validated lap. No free CPU charges.
   Each rival owns its usage history; it cannot consume the player's history
   or another rival's charge. Reject repeat collection/use after its lap use.
3. Destination scanning uses the jumping actor's position, vehicle footprint,
   checkpoint and lap. Include the player among occupied landing locations.
   Preserve obstacle, road, finish-margin and gate-margin checks. A blocked
   attempt leaves the charge, pose and history untouched.
4. Relocate only the jumping rival. Reset its transient collision/air state
   coherently, clamp speed to that actor's driving surface, and update route
   metadata. Do not award a gate or lap, overwrite player lap assistance or
   route history, or change saved results. Keep a short protective effect
   consistent with the existing UFO rule and actor-specific shield handling.
5. Use the existing stock distance; player upgrades never increase CPU range.
   Two physical UFO bursts and an identifiable CPU-use event make the action
   observable. Do not emit a player-only landing callout or mutate HUD state.
6. Common-time 30/60/144 checks cover all actor identities and lap limits.
   Player destination/blocked behavior remains unchanged. Reproduce any
   affected replay before proposing a fingerprint change for review.

## Review and measurement

The existing `test-cpu-pickups.mjs` assertion saying the CPU leaves an
unsupported UFO must change because this approved feature removes that
exclusion. The independent reviewer must approve its replacement with
physical pickup and safe-use assertions; do not merely delete the check.

Use focused checks and one bounded scenario first. Then run the existing
balance reports with the flag off and on because both paths gain CPU use.
Keep target bands fixed. The required lane/build gate still applies before
merge; this preparation is not evidence of a passing feature.
