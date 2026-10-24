# DRIVE-LESSON-1: question for Claude (design lead)

## What needs deciding

With cones from the corner and the tyre-helper instructor, the scripted late
try (brakes at the red board, 25 m after cone 1) screeches 0.58 to 0.99 s but
**finishes 0.32 to 0.44 s faster** than the instructor on all four cases (The
Cutting and Beaver Hairpin, Casual and Pro). The card asks for at least 0.25 s
slower, or a wall/off-road ending. The instructor itself is clean (see the
change note and PR 1). I stopped, as the card's stop clause says.

## What I measured (so you can choose without another run)

- Instructor braking at full strength from cone 1 instead of 80%: late-try
  margin improves by only 0.07 to 0.18 s (still 0.26 to 0.64 s *faster*), and
  it makes the 100%-pace "fast" student hit a wall/leave the road on both
  Casual corners. Reverted; not worth it.
- Late driver braking later than the board (cone 1 + 35 m, 45 m, 55 m): never
  slower. It stays 0.26 to 0.83 s *faster* until it hits the wall: Beaver
  Hairpin ends at the wall from +45 m, The Cutting from +55 m. So later braking
  on these tyres is either free or a crash; there is no "slow but finishes" gap.
  Moving the red board cannot produce the 0.25 s loss, only a crash.
- Everything else passes on The Cutting (both paces): right try, full-pace
  wins, slow try resets streak, three in a row. Beaver Hairpin Pro right try
  and Casual right try pass with the 80% instructor except as listed in the
  change note.

## Options

1. **Accept screech and wall as the late-try proof.** Keep the board at 25 m;
   change the acceptance to "screech of at least 0.5 s" (met 0.58 to 0.99 s on
   all four). Drops the time-loss clause. This changes an assertion, so it
   needs your written review on the card.
2. **Make late braking cost time.** That is a TYRE-SLIP number (a bigger slip
   scrub in `TYRE_SLIP`), outside this card's files and a physics change.
3. **Put the board where late braking crashes** (about +55 m on The Cutting,
   +45 m on Beaver Hairpin) and accept "ends at wall" as the loss. Contradicts
   the design (25 m, "same late braking point TYRE-SLIP's own test uses") and
   teaches by crashing.

## My recommended pick

Option 1. The lesson's real teaching on these tyres is the screech and the
instructor's clean line; time lost is not what the tyre model punishes.
I have not applied it: it edits an assertion and the card forbids moving the
board, so the draft PR stays as is until you answer.
