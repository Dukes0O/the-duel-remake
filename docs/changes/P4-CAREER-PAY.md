# P4-CAREER-PAY

Status: building. Separate pay/records slice; grand-prix-career stays dev.

## Design before code

Claude approved the position table on 11 October at 22:10 and brought this slice forward. It applies to the currently admitted Pacific Canyon and Tremblant Grand Prix events and future admitted courses. It does not admit the nine existing circuits, carry Azure geometry or tuning, add course sections, change prices or unlock variants.

Positions 1 to 8 pay 100, 75, 55, 40, 30, 20, 15 and 10 percent of the current difficulty win base (600/1000/1500 CR). A completed Grand Prix has no Duel loss charge. Reuse the current clean, improved-best, win-streak and Pro bonus eligibility, lifetime milestone rules, wallet ceiling and run/stage settlement key. A valid position determines a win; malformed positions cannot forge win bonuses. Qualifying and abandoned races pay zero. No new career store is needed for this slice.

Carry the reviewed separate-mode record and best-lap ghost implementation, including capacity rejection without deleting old Time Trial ghosts and the damaged legacy sample guard. Derive actual race lap count from the stable course definition (grandPrixLaps, default three); Harbour four and future open-course one are supported without changing old event keys. Playback remains Time Trial only. Gate GP pay, record/ghost capture and its menu/results/leaderboard options behind grand-prix-career dev. Flag-off keeps today's Grand Prix behavior and other modes exact. One-run result/record text says one run.

The new flag adds one exact catalogue entry/state and one Preview request. The existing flag-count/state and Preview-list assertions will be updated only for that additive entry, retaining all other states, keys and thresholds. Fresh Save Guardian review covers carried records/ghosts and the actual new pay together. QA uses memory-only storage; no release, push, live folder or real saves.

## Checks

Pending implementation, native settlement, old-save checks, review, lane jobs 4 and build.

## Removed

Replace the no-pay/records menu claim only when the new switch is enabled. No runtime assets or legacy modes are removed.
## Current implementation evidence

Old-source pure RED failed at Easy position two: -300 CR versus the approved +450 CR. Implementation now supplies position pay, rejects malformed position/field/win inputs, uses the existing settlement key and keeps qualifying/off paths unchanged. Snowman pay is fixed25 CR per valid count, capped at ten and outside Pro doubling. The existing named-player save path, capacity ceiling, bonuses and lifetime milestones remain.

Carried records/ghost code is scoped from the reviewed GP branch; no race-field, course-width, surface, renderer, admissions or tuning file is changed. Authored count source had a genuine 38-check Harbour native GREEN in the retained GP lane before this slice; this pay source still requires its own native on/off settlement and record checks. New catalogue assertions add grand-prix-career dev only (24 to25 switches); Preview requests that switch. No old gameplay threshold or tolerance changes.

Pure/native GREEN, old-save/ghost suites, independent Save Guardian, ordinary review, lane jobs4 and build are pending on this source. The test uses actual grid-to-finish controls, real named-player storage bytes, reload and duplicate event checks, visible result/leaderboard values, and the same race trace with capture/pay off and on. No pending check is called a pass.
