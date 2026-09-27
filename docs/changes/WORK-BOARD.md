---
task: WORK-BOARD
status: merged
kind: tooling
flag: none
player_facing: no
---

# Who works on what: the board split (26 September 2026)

Kyle asked for the warlord plan to be on the board so Codex agents can pull
work, separated from what Claude is doing.

- `docs/board/board.yaml`: an `owner` (codex, claude, kyle) on every plan
  card; the Warlords for Gratian cards (Claude: RALLY-CHECKPOINT in progress,
  SCRAPDOME-PLAYTEST, SCRAPDOME-RELEASE, WAR-SAL-TUNE, WAR-SAL-RELEASE,
  DESIGN-WAR-02b/c; Codex: INT-0926-MERGE, PREVIEW-LAUNCHER,
  COMBAT-AUDIO-SCENARIO, WAR-SAL-ART, WAR-01, WAR-02a-FORMAT, WAR-02a-SAL,
  WAR-02a-REWARD, WAR-02b/c). WAR-02a is replaced by its three slices plus
  WAR-SAL-ART. The old "Gate arrival and invitation" card shared the id
  EGG-03 with Muddy Hollow; it is now EGG-03-GATE (EGG-04 follows it).
- `tools/board.mjs`: prints CODEX CAN START NOW, CODEX IN PROGRESS, CODEX
  WAITING, CLAUDE IS WORKING ON, CLAUDE NEXT, WAITING FOR CLAUDE'S REVIEW and
  WAITING FOR KYLE. `--json` for agents. No new dependency: it reads the
  board's fixed fields directly.
- `tools/test-board.mjs`: every card has a known status, unique id and real
  needs (cards or standing decisions); Claude's work in progress says who;
  Codex is only offered codex cards with every need done and no waiting_on.
- `docs/CODEX_PLAYBOOK.md` section 6 Pick and `AGENTS.md` Who works on what:
  the owner rule, claiming, waiting_on, design questions to Claude, and
  Kyle's stop rule.
- `docs/board/next-run.md`: the written plan with the two card tables.

Tests: `node tools/test-board.mjs` (452 checks). The test found the duplicate
EGG-03 id on its first run.

Removed: the first-draft plan cards from 9bb488a (replaced in place).
