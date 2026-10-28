# QA-HARNESS-CLOSE-CAP

The short board entry controls current state, ownership, dependencies and locks.

Found in QA-AUDIO-CRASH-PEAK-AGAIN (27 October 2026): `tools/browser-harness.mjs`
waits for `Browser.close` with no cap, and Chrome helper processes can hold its
output pipes open, so a scenario can hang 1 to 7 minutes after its report is
saved under load. Cap the close wait (a few seconds), then end the browser's
process tree and close its pipes, as the crash-peak recipe now does; then drop
that recipe's private copy. No retries, no test limits changed. Lane tier and
build. Low priority.