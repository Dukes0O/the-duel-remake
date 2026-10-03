# AUD-CAPTURE-CONTINUITY: native peak capture

Status: building. This changes only the QA recorder. The game audio path and
all measured limits stay as they are.

## Decision before code

The full tier at 879c014 passed 343/344 suites. The only failure was the
non-Fuel mix AudioWorklet timeline: one or more 2,048-frame blocks were
missing. The unchanged native suite then passed 23/23 alone. The runner
already gives this suite exclusive access within its eight-job pool.

The meter's processor writes no audio to its output. It currently feeds an
explicit zero-gain node before the destination. Remove that node and connect
the meter output directly to the destination. Its unwritten output remains
silent, while the browser has a live destination path for each meter. Keep
the exact Float32 block-continuity, sample-peak, true-peak, onset, contrast,
event and cleanup assertions. Do not fill missing blocks or retry a failed
capture. Apply the same path to the quiet reference and pause checks.

## Checks

Run the native suite repeatedly, then the exact lane tier and build. After
the fix merges, rerun the full tier on the exact integration commit. Record
the observed results here.

The native capture passed 23/23 in three separate runs after the path change.
The tests still require gap-free Float32 blocks and the same sample peak,
true peak, onset, contrast and cleanup limits. The lane tier and build are
pending.

## Removed

The redundant zero-gain monitor branches are removed with the new recorder
path. No runtime sound or licensed source is removed.
