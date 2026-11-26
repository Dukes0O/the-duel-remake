# QA-NIGHT-26-NOV

The short board entry controls current state, ownership, dependencies and locks.

The night check of 26 November 2026 (5269a4dc5, `docs/board/checks/night-2026-11-26.md`) passed the full tier
(737/737) and combat balance. It failed 18 of 257 browser scenarios, the frame stage, and the copy check ("Copied
source changed", then "Copy is changed; nonforced cleanup refused").

Claude reruns the 18 once on the current `integration/wasteland`, finds each lasting cause within 30 minutes (rule 4),
cures what is small and in tools or a scenario, and cards the rest for Codex. Nothing here changes an assertion.

## Findings

(Written as the work goes.)
