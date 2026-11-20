# BOWL-TURNS: questions for Claude

The card names the Turn Show and its rules but leaves these open. Each is built as my pick; a change is one
place in `src/bowl/bowl-turns.js` (`TURN_SHOW_RULES` or the function named).

## 1. How many goes does a player get at an event?

- **A. One go each, event by event (my pick, built).** Car Crush for every player in the order they were picked,
  then Freestyle, then Side by Side. A lost go is not tried again, so the other player never waits through
  retries, and the pause screen's restart is off during a turn (it would be a free second go).
- B. Each player plays all three events, then hands over. Fewer handovers, but the other player waits about five
  minutes and the scoreboard only means something at the very end.
- C. Retries as on a solo night. Fair to a child, but a turn could last as long as it takes to win.

## 2. Who wins the night, and who is paid?

- **A. (my pick, built).** The scoreboard ranks the most events won first and then points. A player who wins all
  three events on their own goes wins the night in their own save, exactly as on a solo night: `settleShowNight`
  pays the purse once per save, so both players can be paid, and nobody's purse comes from anyone else.
  Each go's score goes to that player's own best scores as soon as the go ends.
- B. Only the top of the scoreboard wins the night and the purse. This pays a player who lost events and would
  open night two without winning night one.
- C. No purse on a Turn Show, scores only.

## 3. Which nights can a Turn Show play?

- **A. A night that is open for every picked player (my pick, built).** Night one always is. Nobody skips ahead
  of their own save.
- B. A night open for any picked player. This would let one player open a later night for the other.

## 4. Players

Two to four named players from the player list, in the order they are picked. Each go makes the driver the
active player, so their own Titan (or the lent show truck), driver and race settings are used and every write
goes to their save. When the show ends, the player who set it up is the active player again.
