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
## Implementation

Medium and Hard rivals can now physically collect UFO crates in both pickup
paths. Each rival holds its own charge and lap history. After its own first
checkpoint, it may make one stock 12 m tactical jump per validated lap.
Player upgrades do not change CPU range. Blocked jumps keep the charge and
leave the actor unchanged. Easy still ignores pickups.

The existing destination scan now accepts an optional actor. CPU landings use
that actor's footprint, checkpoint, lap and route, and include the player among
occupied positions. Relocation clears that rival's air and collision motion,
clamps speed to its car and surface, updates its route planner, and grants the
existing short UFO protection. Departure and arrival bursts plus indexed
CPU-use events expose the action. The player UFO callout, assisted-lap state,
usage history and existing player firing path are preserved.

CPU UFO use runs separately from scheduled attacks. It does not spend or reset
the shared attack timer, shot seed or alternating CPU turn. The integrated enemy
aim correction and tuning remain unchanged. No save, reward, dependency or
feature-flag default changed.

### Reviewed existing assertion change

Before: the final Medium/Hard UFO check in `test-cpu-pickups.mjs` required the
unsupported crate to remain visible after CPU contact.

After: the same physical crossing must remove the crate, hold exactly one UFO
charge, retain rival position 386 m and retain its first-gate index 0. This
proves collection without an early jump. All other shield, bomb, crossbow and
Easy assertions remain unchanged. The independent new suite separately checks
safe use after the first gate, both flag paths and all three rival identities.

Independent test author `/root/enemy_aim_builder` approved this replacement
and reviewed the runtime diff without finding a defect. They independently
ran the existing CPU pickup test successfully and made no source changes.

### Focused green evidence

- `node tools/test-cpu-ufo.mjs`: 37/37 groups pass.
- `node tools/test-cpu-pickups.mjs`: pass, including the reviewed replacement.
- `node tools/test-combat-pickups2.mjs`: 14/14 pass.
- `node tools/test-ufo-landing.mjs`: 100 safe player jumps across all 11 combat
  courses, including 18 shortcut landings; no crash or reset within two seconds.
- `node tools/test-combat-replays.mjs`: all 12 fingerprints across four
  encounters pass unchanged. No fingerprint file was regenerated.
- `git diff --check`: pass.

No browser, lane/build gate or balance matrix was run in this slice. The
Director reserved the broad gate slot for GFX-01. Flag-off/on balance reports,
the required lane/build gate and integration review remain before merge.
All checks used isolated lane state without live port 5174 or real saves.

## Reviewed defensive AI strategy

After the initial source author completed `9c519fd`, the Director rejected
automatic racing use of every safely collected charge. A bounded comparison
of 40 Medium no-weapon races against pinned integration `1900297` showed
flag-off wins falling from 6 to 4 (seeds 1989 and 1995), and flagged wins
falling from 5 to 4 (seed 1992). All three changed-win activations began more
than 12 m behind the player, so a minimum 12 m deficit rule would not prevent
those regressions. Full per-seed evidence is retained in
`.qa-dist/cpu-ufo-medium-before-after.json` and its adjacent summary.

The approved strategy keeps the safe direct CPU firing API intact but makes
AI use defensive: spend a collected charge only when the existing
`incomingBolt` helper recognizes an incoming player crossbow. The existing
reaction delay, vision cone, vertical/closing checks and shield rejection
remain authoritative. A no-weapon opponent therefore does not grant the CPU
a free racing boost. No numeric tuning or balance target was relaxed.

Independent test commit `febfe5e` changes only the two AI decision groups in
`test-cpu-ufo.mjs`, each exercised with the flag off and on. Their former
immediate-jump expectation is replaced with stronger requirements:

- Hold the collected charge and position without a threat.
- Ignore enemy bolts, other weapons, unrecognized young bolts, rear-cone
  shots, high shots, receding shots, lateral misses and threats while shielded.
- Use the charge exactly once for a recognized incoming player bolt, without
  consuming/resetting scheduled attacks or inventing a projectile.
- All three rivals first hold, then defend once, with equal common-time
  outcomes at 30/60/144 FPS.

The direct firing API, physical pickup, safety, history and player-control
groups remain unchanged. Red proof against the automatic-use implementation:
**37 groups, 33 passed, 4 failed**, 3.79 s. All four failures were the newly
required hold-without-threat behavior; no other check regressed.

The Director implemented the narrow existing-helper guard in `f8b5b06` after
that red-test commit. This note records the independent assertion rationale;
subsequent green checks and the required merge gate are recorded separately
by the Director. The test author made no production edits or extra reports.

### Independent defensive follow-up

The independent test author reviewed `febfe5e..f8b5b06` and found no defect:
the only AI policy change passes the existing difficulty settings into UFO
selection and requires the unchanged `incomingBolt` helper. Pickup shields
still run first; an already shielded rival therefore retains its UFO charge.
The Director reports 37/37 focused UFO checks and the existing pickup suite
passing after this source change.

The Director authorized exactly four affected no-weapon probes, not another
40-race comparison. They took 7.11 s. All four match the complete result
objects and enemy-hit event timing/ownership of the saved pinned `1900297`
baseline, with zero CPU UFO activations:

| Flags | Seed | Outcome | Player time s | Enemy hits |
| --- | --- | --- | --- | --- |
| Off | 1989 | Win | 110.80 | 3 |
| Off | 1995 | Win | 109.88 | 6 |
| Wasteland2 | 1992 | Win | 110.78 | 9 |
| Wasteland2 | 1989 | Loss, rival 106.78 s | 108.08 | 4 |

Evidence: `.qa-dist/trace-cpu-ufo-defensive.mjs` and
`.qa-dist/cpu-ufo-defensive-probes.json`. The reproducer checks the retained
baseline hash and requires the current simulation/report source to match
`f8b5b06` before rerunning. No production edit, new matrix or balance report
was made by the test author. The Director retains the final balance pair and
required merge gate.

## Final balance and merge gate

Measured on clean `479643a11dda8ae83f3b5b1d0dca47366e3e5943`, with gameplay
source unchanged since the independent defensive review of `f8b5b06`.

| Rules | Time | Wins out of 10, Easy/Medium/Hard | Enemy hits | Result |
| --- | --- | --- | --- | --- |
| Flag off | 68.81 s | 9/6/2 | 1/3/7 | All balance targets pass |
| Wasteland2 | 69.43 s | 9/5/3 | 6/4/6 | Only the pre-existing Easy 0–3 hit limit fails |

Flag-off stock UFO gains are 0.28/0.36/0.16 s; maximum gains are
0.57/0.07/-0.72 s. Flagged stock gains are 0.29/-0.73/1.20 s; maximum
gains are 0.55/2.72/3.31 s. All remain within the existing limits.
Crossbow contact is 13/26 off and 12/26 on. Own-bomb speed loss is 4.53%
in both paths. Flagged player wrecks are 0/2/4. No target was changed.

Required gate on the same clean commit:

- Lane tier: **127 passed, zero failed, zero not run in 249.13 s**.
- Build: passed, Vite 352 ms; existing large-chunk warning only.
- HEAD and tracked source stayed unchanged through both commands.
- Logs: `.qa-dist/cpu-ufo-final-{off,on,lane,build}.log`.

The AI capability, safe landings and defensive policy are accepted for
integration. BUG-07 remains open for Easy balance. This does not qualify
the current integration for release, and no live game or save was accessed.
This final commit changes only the evidence note.

## Integration and evidence archive

Merged as `c15026d`. The clean merged lane was removed without force and its
branch retained. All thirteen QA logs, probes and diagnostics were copied
with matching hashes to `.lanes/evidence/cpu-ufo/` in integration. References
above to the former lane's `.qa-dist/` now resolve to that archive.
