# Overnight Wasteland handoff — 23 September 2026

**Release decision: hold.** The live `master` checkout and real saves remain
unchanged. Integration is at `26a006b`. Its latest gameplay commit, `a3ad4ee`,
passes the exact merge test, production build, private browser smoke and all
11 browser scenarios. The full release gate is still red on all six UFO
two-lap time-gain comparisons. No full check was marked green, and no live
release or push was made.

## Integrated work

The board and run log record each merged card. The main playable changes so
far include arrow-key controls, gamepad weapon controls, the responsive weapon
bar, safe UFO swap landings and lap history, vehicle-mounted armor and weapon
parts, directional dents, bomb momentum, crossbow aiming, shield use, and a
CPU that attacks on the specified Easy/Medium/Hard schedule. Medium and Hard
CPU drivers physically collect road weapons; Easy does not. The latest fix
uses a collected CPU bomb only at close range. Career backup, save storage
budget work, replay fingerprints, browser checks and art intake validation are
also integrated.

The latest exact integration merge gate passed 160/160 suites in 166.12 s.
Private High/Performance smoke produced four screenshots and no browser
issues. The all-scenario browser pass completed 11/11 scenarios with 13
screenshots and no browser issues. Art intake passed with seven planned images
still absent. The last full **code** tier passed 167/167 suites before the
latest narrow bomb-use fix; that fix passed its 93-suite lane gate and the
160-suite exact merge gate. These are partial gates, not a full release check.
See `checks/2026-09-23-a3ad4ee-balance-hold.md` for the exact evidence.

| Balance measure | Easy | Medium | Hard | Required |
| --- | ---: | ---: | ---: | --- |
| No-weapon player wins | 8/10 | 6/10 | 2/10 | 80–95% / 45–65% / 20–40% |
| CPU hits on player | 1 | 2 | 10 | 0–3 / 2–6 / 4–10 |
| Stock UFO two-lap gain | 9.59 s | 45.52 s | 22.11 s | At most 4 s each |
| Max UFO two-lap gain | 26.31 s | 62.24 s | 76.18 s | At most 4 s each |

Crossbow aim is 13/26 hits (50%, within its 35–60% range); the maximum
own-bomb speed loss is 4.53% (within its 15% ceiling). The UFO remains the
only failed combat-balance gate. The previous composite full check was red;
the current pass used separate targeted checks while the known blocker was
investigated. The spec asks for no two red full checks in a row.

## UFO decision needed

The exact BUG-04 design, a visible charge variant, a target-only swap, and
several short-range once-per-race trials were tested on isolated branches.
They either exceed the four-second gain limit, make Medium win too often,
cause a crash soon after landing, remove useful upgrade value, or slow the
player. The target-only version passed 100 seeded landings across 11 combat
courses but still gave Medium a 35.22 s gain in the sample, largely by
avoiding an existing 30 s traffic-crash penalty. Lowering that penalty in a
probe did not make the exact BUG-04 rules pass. No test target was changed.

The next design review should decide how UFO use provides a useful, visible
advantage without bypassing too much race time or turning Medium races into
automatic wins. The existing 30 s traffic-crash rule and the later armor/wreck
model in section 3.2 of the spec should be considered together. BUG-04 and
CPU UFO use in BUG-07 remain open until that choice is made.

**Proposed direction for discussion, not a passing design:** make the race
UFO a one-use tactical exchange with a tight forward-progress cap, preserved
speed and the already-tested safe landing. Keep long forward warps for untimed
arena objectives, where they do not decide a lap time. Pair the race design
with the planned armor/wreck model, then require both the unchanged four-second
gain check and seeded UFO-policy win-rate checks. Add a positive usefulness
check as well: the current gain test has only an upper bound, so a weapon that
slows the player can pass. A progress-neutral lane/phase
exchange is another option. Neither option has passed the gates yet; the
apparently green narrow-window trial is not recommended because it slows Hard
and raises Medium UFO-policy wins to 8/10 against a 6/10 baseline.

## Tested work held off integration

| Branch | Work and evidence | Reason held |
| --- | --- | --- |
| `codex/wasteland-opponents-forward` (`c1c5322`) | Simulation split and three-opponent arena groundwork; 169-suite lane, 162 replays, 22 races and private frame/browser checks passed before the narrow bomb correction, whose focused checks also passed. | Balance stop line; RFX-02/03 need later integration review. |
| `codex/wasteland-save-forward` (`be0a552`) | Save-code formatting with identical parsed code, historical save roundtrips, 93-suite lane, build and browser smoke. | Balance stop line. |
| `codex/hud-contrast` (`39326d9`) | Compact HUD contrast and weapon-label polish; visual review, 168-suite lane, replay/build and private browser checks passed. | Balance stop line. |
| `codex/wasteland-feel-forward` (`d09c346`) | Real feel and audio diagnostics on current gameplay; 170-suite lane and build passed. | Diagnostic tooling awaits integration review. |
| `codex/wasteland-audio-forward` (`2f5e3cc`) | Partial spatial audio and hit placement; corrected QA capture and pitch analysis. Final 170-suite lane/build and all ten measured sound checks pass in a private race. | Remaining weapon and on-foot sounds and headphone/speaker listening open; balance stop line. |
| `codex/wasteland-cpu-ufo` (`953f77d`) | Physical CPU UFO pickup/use; 169-suite lane and replay/build pass. | Hard no-weapon wins drop below target, and UFO gain remains red. |

All these branches are isolated; a passing lane check does not mean a card is
released or ready to merge. The art reference board is also isolated. The
seven required Batch A source images remain absent, and generated source
dimensions differ from the spec. The image workflow needs a choice on whether
local technical resizing and seam repair may be used after generation.

The autonomous no-prompt profile was not installed: automatic approval review
rejected that persistent setup. This does not affect the tested code branches.

## Resume order

1. Review and revise the UFO rule with Kyle, then build a BUG-04 candidate on
   an isolated branch and run the unchanged time-gain, win-rate, landing and
   replay checks.
2. Once the full balance gate is green, merge held work one card at a time
   with its exact merge gate. Run the composite full check on the exact final
   integration commit before any live update.
3. Complete the remaining audio and Batch A art, then do private browser,
   frame, storage and visual checks required by the release gate.
