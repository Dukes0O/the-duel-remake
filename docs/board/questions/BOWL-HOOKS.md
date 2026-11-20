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

## 2. The crowd meter barely moves with BOWL-SHOW's numbers

Not a question for this card, a finding for BOWL-FINISH: `scoreStuntEvent` adds about one point to the
crowd meter for each stunt (0.0015 a point, at least 1) and the meter loses 12 percent a second, so in the
scripted night the meter peaks at about 6 out of 100. The HUD shows the meter honestly, Big Mo's lines at 25,
50, 75 and 100 are wired but are not reached, and the crowd's cheer plays on every scored stunt. A gain of
about 0.05 a point (a 40-point jump adds 2, a launch adds 4 or 5) would let a good Freestyle reach 50 to 75.
I left `bowl-show.js` as merged.
