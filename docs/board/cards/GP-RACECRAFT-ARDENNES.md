# GP-RACECRAFT-ARDENNES

The short board entry controls current state, ownership, dependencies and locks.

## Why (Claude, 25 October 2026)

`cpu-racecraft` was due to go live on 25 October (Kyle liked the acceleration
and nitro in the preview). With it on, `tools/test-circuit-ardennes.mjs`
"Long Left original stock full-field replay finishes without the former
player exception" records majorCrashes 1 against its zero-crash requirement
(setup 959/.95/Medium/seed 1989/1000, unchanged), and a rerun repeats it.
Racecraft stayed dev for that release.

## The card

Find which racecraft behaviour (CPU nitro, lap-1 defence, real-pace passing,
the nitro lock) puts a CPU car into the player on Long Left, and fix that
behaviour so the replay finishes with zero major crashes, without changing
the test or its setup. Then rerun GP-PASSING-2's three-course gates and
GP-WIDE-START's step 2 table on top. Once green, `cpu-racecraft` goes on in
the next release with the wide start.
