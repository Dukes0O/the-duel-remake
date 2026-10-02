# ARENA-WRECK-RATE

Status: ready for lane gate and build; gameplay acceptance passes.

## Changed

Claude's evening answer keeps every warlord's absolute armor as released.
Ordinary arena cars now use 1.2 of race armor for Last Car Rolling and the
public modes. Warlord arena setup keeps its former
0.5 base scale before the unchanged 1.5 boss multiplier. Steering, pilot,
brains, damage, clocks and respawns are untouched.

The balance tool's direct-execution guard lets native acceptance tests import
playRound without starting the whole report. Its normal CLI remains unchanged.

## Tests

Tests-first commit af9586b extends the existing target with all nine released
warlord base armor values and actual Sal/player armor at all difficulties.
The ordinary armor check genuinely failed at the old Falcone value of 50.
The original twelve-round native target failed at 20.75 wrecks per Medium
full-field round. The unchanged target is 10 to 14. At scale 0.8 the same twelve rounds gave
17.333; at 1.2 they give 12.5. All five acceptance checks pass, including
the actual released warlord armor values.

The required arena-balance report finishes all 108 rounds, 36 per difficulty:

| Measure | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Full-field wrecks per round | 12.7 | 12.5 | 14.4 |
| Scripted player wins / 36 | 16 | 11 | 4 |
| CPU near-target share | 0.65 | 0.65 | 0.63 |
| CPU wall hits per round | 0.3 | 0.3 | 1.1 |
| CPU reversing share | 0.073 | 0.103 | 0.095 |

The Medium wreck target passes. Other difficulties are measured, not tuned
against a new target. Focused native regressions pass all 263 subtests across
seven files: warlord format, Sal, arena events, Fuel, shove, steering and its
ceiling. No skips or cancelled cases. The unchanged steering checks include
30/60/144 FPS repeats; all original assertions pass. Lane gate and build await
their serialized window. Independent review of the armor separation and the
approved Sal assertion change carries forward; final numbers are ready to review.

Changed assertion: the former Sal format test tied boss and player armor to
ordinary arena armor. Claude explicitly superseded that coupling on 1 October:
the test now preserves the actual pre-tuning player 50 and Sal
83.79469985707887, and retains its original full-armor assertion.

## Replays

Only ordinary arena combat traces change because their armor increases.
Paired native runs load the exact pre-tuning arena module in memory and the
current module, with identical inputs. All ten old pins reproduce; all eight
road/Sal controls remain exact with Fuel off and on. Only Last Car Rolling
moves from db8e981 to 6584140: initial armor rises from 50 to 120, then the
existing health-sensitive goals and combat diverge. The approved single pin
changes; existing assertions, literal inputs and sample shape are unchanged.

Headless fixed-step outcome runs share the approved window with Arsenal's
balance report. Their elapsed times are advisory. No browser, frame, Blender,
whole-lane or build run has started in this window.

## Removed

Replaced the warlord-to-ordinary-armor coupling with the approved fixed
warlord base scale. No old model, switch, steering rule or test was removed.
