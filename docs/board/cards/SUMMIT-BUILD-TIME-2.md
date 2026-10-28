# SUMMIT-BUILD-TIME-2

The short board entry controls current state, ownership, dependencies and locks.

The Summit ground fix (SUMMIT-GROUND-GAPS) raised Summit's world build from
about 850 / 890 ms to 1,051 / 1,013 ms (High / Performance), just over rule
8's 1 s. Find where the continuous ground costs the time (far-ground mesh,
world surfaces) and bring both under 1 s without changing what is drawn: the
Summit world signatures stay exact. Measure with
`SUMMIT_FRAMES_ONLY=1 DUEL_NIGHT_FRAMES=1 DUEL_NIGHT_IDLE_AWAKE=1 node
tools/run-browser-scenarios.mjs --scenarios frame-pacing --timing-only
--headed --jobs 1`, run alone with the laptop panel off (Claude runs the
official timing). Lane tier, build, one review.
