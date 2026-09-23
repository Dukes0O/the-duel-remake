# BUG-13 Prompt recovery at a missed lap checkpoint

Status: review. This is a separate checkpoint issue discovered while
investigating the Wasteland combat balance report.

On the pre-balance combat checkpoint `ad28a2d`, Pacific Canyon Medium seed
1989 fires an enemy crossbow at 14.0 s. It hits the player at 14.8 s with
power 0.9, moving the car from lateral -3.356 m with a -12.6 push. The car
crosses the first lap gate at road position 1000 m at 15.108 s, lateral
-8.2688076 m. The road plus shoulder limit is 7 + 1.25 = 8.25 m, so that
crossing is invalid by 0.0188 m. The old code correctly rejects the gate but
does not recover the car until it reaches the 4000 m finish at 62.7 s. It
then sends the player back to road position 1 m. The no-weapon race takes
185.40 s and this full-lap loss distorts weapon time-gain comparisons.

`_advanceLaps` now handles an invalid *physical* gate crossing immediately.
It calls the existing `_safeReset` helper, which limits the recovery to just
before the next unearned gate and finds a safe road lane. The same road and
shoulder test and ordered `nextLapGate` rule still apply. A discontinuous
position change cannot earn a checkpoint, and the existing `noReset` path
leaves crash recovery to its own code.

The focused test was red before the change: zero immediate reset events for
an invalid -8.2688 m crossing. It is green after the change in Duel,
Wasteland and time trial modes. It also checks a legal crossing 0.01 m inside
the shoulder, an ordered recross after recovery, and the `noReset` hook.
The full old Medium race now resets at 15.108 s to road position 999 m,
recrosses all six checkpoints in order, completes two laps, and takes
162.19 s. This is a 23.21 s improvement while retaining the real weapon hit
and missed-gate consequence.

Verification: `node tools/test-checkpoint-recovery.mjs` passed; race integrity
601 checks, checkpoint gates 19,943 checks, replay 162 checks, and the Vite
build passed. The changed lane gate passed 155/155 suites in 376.9 s.
