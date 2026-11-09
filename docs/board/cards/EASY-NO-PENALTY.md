# EASY-NO-PENALTY

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item O2). Kyle said yes
to this card on 9 November.

A young driver on Easy loses often (see EASY-YOUNG-DRIVER). The game then takes credits for
the loss, and a lost fire closes a course for ten play days. Both punish the player who most
needs to keep playing. This card removes the punishment; EASY-YOUNG-DRIVER, a larger card,
makes Easy winnable.

## Settled design (Claude)

1. **A lost Duel on Easy charges nothing.** In `src/progression.js` the loss charge
   (`charge`, taken from `breakdown.base`) is 0 when the computer cars are on Easy. Medium and
   Hard are unchanged. First find the size of today's charge and write it in the change note:
   the audit says 300 credits, and Claude confirmed only that a charge exists.
2. **A burnt course closes for 3 play days, not 10.** In `src/course-closures.js`,
   `closedDays` becomes 3 and the buy-back starts at 3,000 credits, less 1,000 a play day. The
   burnt look and its regrowth keep today's timing, so give the look its own number of days
   where it now reads `closedDays`. Update `docs/HELI_FIRE.md` in the same change.
3. **Not on this card:** the audit also said "earned cars drive anywhere". Claude has not
   confirmed in the code what limit an earned car has. Claude checks and adds a card only if
   the limit is real.

No saved field changes shape. A profile with a course already closed under the old rule opens
on the new, shorter day count.

## Checks

- New or extended test: an Easy Duel loss leaves credits unchanged; the same loss on Medium
  and on Hard charges what it charged before.
- `course-closures` tests with the new numbers, and one case for a profile whose course burnt
  five play days ago (open again, look still burnt).
- Pinned credit sums and closure days that move are re-recorded with a one-line reason each in
  the change note. That is a deliberate change, not a weakened test.
- This card touches credits, so it gets one independent review (rule 17).
- No browser check needed beyond the results screen after an Easy loss: the line for the loss
  must not show a charge.

## Removed

The Easy loss charge and the ten-day closure numbers, with their mentions in the docs.
