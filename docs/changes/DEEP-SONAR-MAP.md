---
task: DEEP-SONAR-MAP
status: ready
kind: ui
---

# The Deep: sonar ring stays on screen, the map starts north up (30 October 2026)

Kyle (for Gratian): the sonar was not on screen and the map was hard to follow. In `src/deep/sirena-view.js`: once the badge gives the sonar, its ring stays on screen for the whole dive, reading 'R · sonar'; a ping shows its echo and distance for six seconds, then the ring waits for the next R. Before the badge the ring stays hidden (R does nothing then). The chart starts north up again; the button reads 'Turn with the car' and still switches.

Tests: all 17 test-deep-*.mjs pass by hand with no assertion changed; deep-sirena scenario passes (6 pictures, 0 browser errors), pictures checked (ring before the badge hidden, after it on screen; map north up). Lane tier and build in the run log.

## Removed

The six-second hide of the whole sonar ring.
