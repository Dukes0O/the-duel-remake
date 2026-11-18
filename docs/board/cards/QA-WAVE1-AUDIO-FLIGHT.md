# QA-WAVE1-AUDIO-FLIGHT

From the full check of 6 November 2026. `arsenal-wave1-audio` failed twice on 7712ae7d with "Actual moving flight loop did not travel and retire once", both times with other work on the laptop. Run it alone first. If it passes alone, say so here and close this: a sound check that needs a free laptop is no fault in the game. If it still fails, find whether the weapon's flight sound stopped moving or never stopped, which would be a real fault players can hear. Rule 4: 30 minutes, then a note. No assertion changes without Claude's written review.

## Result, 18 November 2026 (Sonnet helper, QA-NIGHT-18-NOV)

Run alone on the merged integration commit (655dc537a plus this branch's scenario changes, none of which touch this
scenario), twice in a row, with nothing else running: `node tools/run-browser-scenarios.mjs --scenarios arsenal-wave1-audio
--jobs 1`. Both runs passed (2 screenshots, 0 warnings, 0 errors). The night check of 18 November had failed it with
the same message as on 6 November ("Actual moving flight loop did not travel and retire once") while other work was on
the laptop. No assertion was changed and nothing in the game was touched. It passes alone, so by this card's own rule it is
a sound check that needs a free laptop and no fault in the game; the card can close. Claude to confirm.
