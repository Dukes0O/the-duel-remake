# ARENA-WRECK-RATE

Status: current acceptance passes; final independent review and gates pending.

## Changed

Kyle, 1 October evening: use the lower wreck rate and keep Sal unchanged.
Claude's written answer preserves every warlord's released absolute armor.
Ordinary arena modes use 1.2 of race armor. Warlord setup retains the former
0.5 base scale before the unchanged 1.5 boss multiplier. Steering, brains,
ram damage, clocks, respawns, Sal numbers and audio are untouched.

The balance tool's direct-execution guard lets native tests import playRound
without starting the full report. Its normal CLI remains unchanged.

## Tests

Tests came first. The original twelve-round Medium target genuinely failed
at 20.75 wrecks with the released ordinary scale. Tests-first af9586b added
all nine released warlord base armor values and actual Sal/player armor at
all difficulties; the ordinary armor check failed at the old value of 50.
The target remains 10 to 14 wrecks. Prior tuning at 1.2 gave 12.5 before Junk.

After synchronizing merged Junk and Arsenal, all five native acceptance
checks pass without further tuning. The exact twelve-round Medium full-field
mean is 12.417. All released warlord values and Sal's armor remain exact.

The fresh required report completes all 108 rounds, 36 per difficulty:

| Measure | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Full-field wrecks per round | 14.0 | 12.4 | 15.1 |
| Scripted player wins / 36 | 13 | 5 | 3 |
| Mean player place | 2.14 | 2.36 | 2.64 |
| CPU near-target share | 0.62 | 0.65 | 0.64 |
| CPU wall hits per round | 0.3 | 0.2 | 0.6 |
| CPU reversing share | 0.035 | 0.043 | 0.040 |

Medium meets the unchanged target. Easy and Hard are measured, not tuned
against new targets. Fresh direct node tools/test-<name>.mjs controls pass:
- warlord-format: 24 tests and 256 checks; sal-fight: 25 tests and 119 checks.
- arena-fuel-run: 68 tests and 1,552 checks; arena-event: 13 tests.
- arena-junk-shove: 54 checks; arena-junk-respawn: six checks.
- arena-steering: 215 checks; arena-steering-ceiling: 274 checks.
- arena-shove: 131 tests and 6,542 checks.

Changed assertion: the former Sal format test tied boss and player armor to
ordinary arena armor. Claude explicitly superseded that coupling on 1 October.
It now preserves pre-tuning player armor 50 and Sal 83.79469985707887, while
retaining the original initial-full-armor check. The earlier independent
approval carries forward; current final review and exact lane/build follow.

## Replays

Only the approved ordinary Last Car Rolling pin changes. Fresh paired native
runs use the actual merged integration and current lane with identical
literal inputs and sample shapes. All 20 old/new runs reproduce their pins.
All eight road/Sal pairs remain exact with Fuel off and on. Ordinary LCR
remains db8e981 to 6584140: initial player armor rises from 50 to 120, then
existing health-sensitive goals and combat diverge. No additional pin changed.

The fresh report and focused controls ran serially in the approved headless
window. No new browser or frame evidence is claimed for this setup-only tune.
Mandatory lane/build evidence is still pending and will be recorded on the
card after the exact candidate passes.

## Removed

Replaced the warlord-to-ordinary-armor coupling with the approved fixed
warlord base scale. No model, switch, steering rule or test was removed.
