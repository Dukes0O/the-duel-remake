# QA-AUDIO-UNDER-LOAD

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol), small; Claude's until 27 November 2026. In the night of 26 November 2026, `p4-audio` (a native sample frame 128 frames out, segment 7)
and `skyline-audio` (integrated loudness -12.8 LUFS against an advisory -16) failed in the browser stage, which runs
four jobs at once; both passed rerun alone on the same code. Find what the load changes (a dropped or doubled audio
callback under four browsers, the loudness measure on a clipped capture) and make each check say plainly when its
capture was disturbed, rather than fail as a sound fault. Never widen a tolerance. Checks: each scenario five times
alone and once inside a four-job browser stage.

## Claude answers
