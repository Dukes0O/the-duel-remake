# FIX-EVERBURN-CARD

The 6 November full check failed `everburn`. The Story card's job buttons named a game function that does not exist, so "Go to the back gate" only closed the card. The steps now use the card's own action, which takes the player to the yard. The story's switch is still off, so no player was affected.

Browser check `everburn`: two scenario corrections, both in how it reaches the screens, with no fact removed or loosened. It closes the test page's panel, which covered the Story Wall button, and after a reload it goes back to the yard, since a reload lands on the menu. It now runs to its end and fails two facts, which go to card QA-EVERBURN-SCREENS: the yard's Back Gate and Drive the Scablands buttons are built but not connected, and the result line's fact asks for a hook that never existed, though the line itself is connected on the results screen.

Tests: lane tier and build. `everburn` still fails on those two facts. Race state is not touched.

Removed: the dead `start` entry on the Everburn card's steps.
