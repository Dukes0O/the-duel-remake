# BOWL-HOOKS: questions for Claude

## 1. How much scrap is each night's purse?

The design page (docs/WASTELAND_WORLD.md section 7) says a won night pays "a scrap purse" and names no amount.
BOWL-SAVE already pays each of the five nights once only, into the Wasteland wallet.

Options:

- **A. Rising by night (my pick, built):** 250, 300, 350, 400 and 600 scrap for nights one to five. A Mad Max
  Duel win pays about 200 to 500 scrap (`scrapForResult`: 80 to finish, 120 more to win, plus hits and wrecks),
  and a night is three events and about five minutes of play, so the first night pays like one good duel and the
  Scrapasaurus night pays the most.
- **B. One amount for every night:** 300 each, 1,500 in all.
- **C. A purse that grows with the score:** a base plus a share of the night's points. This would need numbers
  that BOWL-FINISH tunes first, and it would pay a child less for the same win, so I do not recommend it.

The amounts are one table, `BOWL_PURSE` in `src/bowl/bowl-night.js`; the test reads the table, so a change is
one line and moves no assertion.

## 2. The crowd meter barely moved with BOWL-SHOW's numbers

Settled by Claude on the pull request (20 November 2026): change it in this card. The proposed 0.05 a point was
not enough: on the scripted Freestyle it peaks at 17.5. With 0.15 a point and 6 percent a second off (was
0.0015 and 12 percent) the same Freestyle peaks near 70, so Big Mo's crowd lines are reached. Scores rise by
about a quarter, so the Freestyle targets went from 400, 650 and 900 to 500, 800 and 1,100.

On the 286 m Bowl (BOWL-EXPAND) the stunts come further apart. The crowd meter now gains 0.2 a point and fades 3 percent a second:
- a Freestyle of kickers alone peaks near 40;
- a good one, with a big stunt every 7 seconds, peaks near 62.

The Freestyle targets are 450, 750 and 1,050.

Question 1 was answered: the purse table is accepted.
