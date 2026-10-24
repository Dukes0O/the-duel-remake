# FIX-LAUNCH: decisions taken on the way (Claude to review)

The gentler launch moves every race, so about 40 suites needed attention. Kept to
the rule "re-record, never loosen" wherever possible. Where a check encodes an old
absolute outcome I changed the scenario or the number minimally. Each one is
listed with old and new in docs/changes/FIX-LAUNCH.md. Please review:

1. Arena-only launch: arenas keep the old 5.2 launch and 42 nitro push
   (`DRIVE.arenaAccelScale`, `BOOST.arenaAccelMphPerSec`) so arena jumps, shoves
   and balance are untouched. Recommended; the card allows it.
2. Checkpoint Rush (Timberline), Easy: gate extension 10 to 12 s. At 10 s the Easy
   crash-recovery run now times out at gate 4; 11 s still fails, 12 s wins with
   42 s spare. Content number, so please confirm or choose another fix.
3. Race-field test "Easy field is the slower half": the F42 is now the slowest
   road car, so the field averages 0.8 percent above it. Check loosened to 1 percent.
4. Circuit-layouts sanity bound for a lap: 150 s to 165 s (Ardennes lap 2:36).
5. Drift trial (dev tyre-slip Pro fixture): the drift score collapses (142 vs
   4828). This is the dev `tyre-slip` tuning meeting the slower launch; needs a
   follow-up card, not a number I should pick.
