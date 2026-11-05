# BOWL-TURNS

The short board entry controls current state, ownership, dependencies and locks.

Pick named players; the game runs each event in turn with "NAME IS UP. PASS THE KEYBOARD."; a scoreboard for the night. Never two players at once. Scores go to each player's own save.

**Checks:** `tools/test-bowl-turns.mjs`: order, scoreboard, each save gets only its own.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-TURNS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
