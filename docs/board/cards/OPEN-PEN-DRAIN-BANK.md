# OPEN-PEN-DRAIN-BANK

The short board entry controls current state, ownership, dependencies and locks.

**Found in Claude's drive of the merged batch, 27 November 2026** (`docs/board/looks/drive-2026-11-27.md`).

**What a player meets.** At the Rats' Nest, the player chooses to go in by the drain on foot. From the drain's mouth
the walk toward the pen stops after two metres against a bank of earth. There is no way through, so the break-out with
Finch cannot be done by hand.

**Measured.** Beat `drain`, mission `burned-camp/drain` active, the player standing at `drain-out` (4138.3, 2160.2)
facing `drain-in` (4104.6, 2160.0). Walking forward for six seconds moved the player 2.3 m, to x 4136.0, and no
further. The ground along the line, from `course.groundAt`: -7.7 m at the mouth, -6.8, then -0.6, then +1.5 m for 20
metres, then -1.1, -6.7 and -7.6 m at `drain-in`. A 9 m bank stands across the drain. The scenario `open-burned-pen`
passes because its `walkTo` sets the player's position directly and never walks.

**Likely file.** The cut for the drain in the land under the Rats' Nest (`src/world/open/content/burned-pen.js`
spots, and the ground cut that the Rats' Nest look joins, see the OPEN-BURNED-PEN hand-over: the Nest's look and
solids are not joined to the land yet). Check: the drain walked with real keys from mouth to pen, the ground along it
measured; the scenario walks rather than sets positions.

## Claude answers

**27 November 2026, verdict on the Codex lane's commit 578c6bb20 (kept on the laptop branch `codex/open-pen-drain-bank`,
not merged).** It made the drain walkable by cutting an open 9 m trench from the yard to the gully, through the
cutting's east wall, and changed `test-rats-nest-look`'s "the drain runs under uncut land" to "the drain bed is cut
continuously". That changes the place: the drain is a hidden concrete pipe under the wall, and an open trench is a new
way in that the guards, the lookouts and the look were not built for. Rejected.

The fix wanted is a real floor inside the pipe, as the lane's own factory note offers: the land above the pipe stays
whole, and a walker who enters a mouth follows the pipe's floor (its height and walls) until the other mouth, as the
open land's buildings give a walker an inside. Keep "the drain runs under uncut land" exactly as it was. Keep the
lane's good parts: its new check that samples the route and walks it with the real foot mover (on the pipe's floor),
and the scenario that walks the drain with real inputs round the lean-to and the pen wreck. Claude's card; Codex's
model was at capacity when the lane stopped.

## Round 2 build decision and checks

Restore integration's terrain and its uncut-land assertion exactly. Install a Rats' Nest pipe interior with the site's
ground lease: absolute floor, two mouths, inner radius and short open aprons. Height selects the inside, as for a building
room; the foot mover respects the bore and ceiling, and both camera modes stay inside it. No new event or sound cue.
Owned hooks: `site-ground.js`, new `pipe-rule.js`, `scablands-ground.js`, `onfoot.js`, `onfoot-camera.js`, its `render3d.js` pose hook, the look and check
named above, `test-open-pen-drain-bank`, and round 1's real-input `open-burned-pen` scenario. No signatures re-recorded.
The `scablands-scene.js` ground hook passes the bore to its existing terrain opening shader, clearing only the pipe mouths.
Checks: `test-open-pen-drain-bank`, `test-rats-nest-look`, `test-burned-camp-pen`, `test-burned-camp`,
`test-world-composition`, core and both replay guards (`--jobs 2`), then build; Claude runs browser scenarios.
