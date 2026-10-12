# P4-CAREER-PAY

Status: merged into integration; `grand-prix-career` stays dev. Kyle previews it before any release.

## Behavior

Claude approved this early slice on 11 October at 22:10 and confirmed the dev merge on 12 October at 10:00. Completed positions 1–8 pay 100/75/55/40/30/20/15/10 percent of the existing Easy/Medium/Hard base (600/1,000/1,500 CR), with no Grand Prix loss charge. Existing eligible bonuses, milestones, wallet ceiling and once-only run/stage keys remain. Snowmen pay 25 each, capped at ten, outside Pro doubling. Qualifying, abandoning, malformed finishes and duplicates cannot create pay.

Records use separate Grand Prix event keys and authored lap counts: default three, Harbour four and future open courses one. Best-lap ghosts retain capacity rejection without deleting existing Time Trial recordings; playback remains Time Trial only. Results show position pay, earnings and balance. The enabled menu explains pay; flag-off preserves current Grand Prix behavior and legacy modes. No new career store, course admissions, Azure geometry/tuning, course section, prices or variants enter this slice.

## Verification and review

- Source `02d914c3`: lane 400/400, zero failures or unrun suites, 1,980.72 seconds, jobs 4 with keep-going; build 843 ms. This is lane evidence, not the final quiet full tier.
- The owned pay suite passed 184 settlement and ghost-safety checks. The gate also passed old-save, career backup/recovery/budget, storage, progression, ghost, driver UI and unchanged replay checks.
- Actual memory-only Pacific races finished three laps in second place at 156.93 seconds: pay off banked zero; pay on banked 750 CR with no charge. Reload and duplicate settlement preserved exact saved bytes. Both race traces hash to `de5e5cfd5d1860757a5f5048b3a5376cdb75c2521787ed043a01be88b744e2ce`.
- The actual browser result on private port 8230 showed position pay, earnings and balance of 750 CR, with zero warnings/errors. Its late QA tools overlay was a capture-fixture limitation; the recipe hides it after finishing, and no extra screenshot retake was required. No frame timing was measured.
- Fresh Save Guardian and independent ordinary source review cleared the pay, record and ghost paths. The later UI correction changes no payment or storage behavior.

## Corrections and assertion reasons

The carried row-mode discriminator unintentionally separated legacy Duel and Time Trial rows. Restore the original row key; GP event keys already separate GP. The direct regression retains the faster legacy row and rejects a slower Time Trial. GP count/byte capacity, exact old current/archive bytes, damaged samples, native lap clocks, qualifying exclusion, partial/invalid capture rejection, wallet-ceiling duplicate handling and the SNOWMEN label all remain checked without relaxed bounds.

The first lane gate stopped at 208 passed / one failed / 191 not run because the driver UI source guard requires the exact legacy car/driver leaderboard call. An explicit GP/default branch restores that call while preserving the GP mode and both filters. The existing assertion is unchanged; its 65 checks and the complete rerun passed.

The additive catalogue assertions retain every existing state, including incoming Tremblant Snow on, and add only career dev and the total of 25 flags. No replay fixture was authored here. Earlier pure-library RED was -300 versus approved +450 for Easy second place; the released App previously bypassed GP settlement and actually paid zero.

## Removed

Replace the no-pay/records menu claim only when the dev switch is enabled. No runtime asset, legacy mode, player save or old recording is removed. The course screen, variants and prices remain in P4-CAREER after Panorama.
