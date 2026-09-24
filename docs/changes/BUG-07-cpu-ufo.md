# BUG-07: CPU tactical UFO use

## Independent acceptance tests before implementation

Source baseline: `fceff635838b831a974f0846a32a3de62b1281ff`.
Scope: the Director's `docs/board/checks/2026-09-24-cpu-ufo-scope.md` in
integration. This is an existing BUG-07 slice; no release or save work is
authorized by the test card.

Added `tools/test-cpu-ufo.mjs` with 37 bounded check groups. It uses production
pickup, destination, fire and AI entry points on an empty flat-road fixture.
Three real opponent records, vehicle specifications and collision sweeps remain
in use. All state is disposable and no browser or player storage is accessed.

Coverage:

- Both flag paths, Medium and Hard, all three rival identities; wrong-lane
  and airborne rejection followed by actual swept pickup contact.
- Easy ignores pickups and no rival receives free UFO use.
- Stock CPU distance despite upgraded player inventory, own first checkpoint,
  own validated lap, charge consumption only on success, and no repeat
  collection/use after the lap's jump. Two rivals may each use their own charge
  in the same lap.
- Player and other-rival isolation; no player assisted-lap, route or UFO-history
  mutation; actor transient reset, actor shield, two physical bursts and an
  indexed CPU-use event without replacing the player HUD callout.
- Occupied player/rival lanes, solids, off-road rejection, wider rival vehicle
  footprint, safe alternative lane, own checkpoint and finish margins, actor
  vehicle surface speed limit and shortcut metadata.
- Separate AI pickup use without shortening/resetting the attack schedule or
  adding an attack shot; common-time 30/60/144 results for all three rivals.
- Actual flag-off player preview, jump, assisted-lap and blocked behavior as a
  passing control.

The optional actor form `ufoDestination(duel, actor)` is exercised. Successful
CPU activation uses `fireWeapon(duel, 'ufo', true, actor)` and must emit
`{cpuPickupUsed: 'ufo', opponentIndex}`. Tests observe per-rival inventory through
the existing `cpuPickupCharges` helper; the actor's private usage-history
representation is not prescribed.

### Red evidence

`node tools/test-cpu-ufo.mjs`: **37 checks, 3 passed, 34 failed**, exit 1,
1.22 s. The passing controls are both Easy/no-free-charge groups and actual
flag-off player behavior. Failing groups stop at the missing CPU UFO pickup
capability; downstream acceptance assertions become reachable after it exists.
This is a deliberate red handoff, not a claim that later behavior passed.

During fixture preparation, the player was initially ahead of every crate,
so the legacy pickup expiry rule removed ineligible crates. The final fixture
puts the player behind them and supplies the explicit two-lap race length.
Those were test setup corrections before handoff, not production changes or
changes to existing assertions.

No production file, existing pickup assertion, replay fingerprint or balance
target was edited. No broad matrix, build, browser or lane gate was run. The
implementation author owns the next source changes and appends measured
results here after the red-test commit.
