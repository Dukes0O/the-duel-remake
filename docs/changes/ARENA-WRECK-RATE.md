# ARENA-WRECK-RATE

Status: resumed by Kyle; fresh checks await Junk's merge and the test slot.

## Changed

Kyle, 1 October evening: use the lower wreck rate and keep Sal unchanged.
Claude's written answer keeps every warlord's absolute armor as released.
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

The prior pre-Junk report finished all 108 rounds, 36 per difficulty:

| Measure | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Full-field wrecks per round | 12.7 | 12.5 | 14.4 |
| Scripted player wins / 36 | 16 | 11 | 4 |
| CPU near-target share | 0.65 | 0.65 | 0.63 |
| CPU wall hits per round | 0.3 | 0.3 | 1.1 |
| CPU reversing share | 0.073 | 0.103 | 0.095 |

That Medium wreck target passed. Other difficulties were measured, not tuned
against a new target. Focused native regressions pass all 263 subtests across
seven files: warlord format, Sal, arena events, Fuel, shove, steering and its
ceiling. This is prior evidence, before the Junk merge. No skips or cancelled
cases. The unchanged steering checks include 30/60/144 FPS repeats; all original
assertions passed. The earlier independent armor-separation and Sal assertion
approvals carry forward. Fresh five-check acceptance, the full 108-round report,
native controls, final independent review and exact lane/build gates still
follow after synchronization with merged Junk.

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

The earlier fixed-step outcome report shared Arsenal's approved headless
window; its elapsed time was advisory. No job has started in the resumed lane
while Junk owns the test slot.

## Removed

Replaced the warlord-to-ordinary-armor coupling with the approved fixed
warlord base scale. No old model, switch, steering rule or test was removed.
