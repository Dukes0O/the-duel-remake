# COCKPIT-TRACKING

Kyle (12 October 2026) wants one high-level view of everything being built
without anyone updating it by hand.

- Cockpit project "The Duel" (`pers-the-duel`, internal, client PERS) holds one
  task per piece of work, grouped by lane: Underwater, Flying, Lab, Cars,
  Mountain courses, Grand Prix and career, Finishing and releases, Wasteland,
  Factory. Each task's notes name its board cards.
- `tools/cockpit-sync.py` sets each task's status from its cards: all cards
  completed is Done; any card waiting on Kyle is Blocked; then building is In
  Progress, review is In Review, ready is Not Started. Backlog-only tasks and
  tasks with no cards (new ideas) are left alone. It lists open cards no task
  names. Any Cockpit error prints a warning and exits 0, so it never blocks a merge.
- AGENTS rule 18: run it after every merge and at session end.

- Only ids after "Board card(s)" up to the end of that sentence count, ids
  may hold lowercase letters (WAR-02a), final statuses Kyle or an agent chose
  (Deferred, Cancelled, Done and the like) are kept and reported, a Blocked
  task whose card left the active list returns to Not Started, and one failed
  update does not stop the others (fixes from the independent review).

- Cockpit now refuses changes from sources it does not know, so the sync
  records itself as "board-sync" (Kyle, 13 October 2026). `--dry-run` lists
  what would change without writing anything.
- Carried onto the integration line on its own, without the game work the
  earlier branch had picked up.
- `.claude/settings.json` switches on the engineering skills pack (spec,
  testing, debugging, review) and Anthropic's frontend design skill for Claude
  sessions in this repo only (Kyle,
  13 October 2026). It changes no game file.

Dry run on 13 October against the live board: 4 tasks would move to In Review
(Summit Run, Summit Run extras, live course edges, race sound mix); cards with
no Cockpit task: FIX-DRIVING-FEEL, FIX-RACE-SCREEN.

Tests: parsing and status rules checked by hand on sample notes and cards;
the sync ran against the live board through the protected runner with 0
tasks changed (statuses already matched) and no unnamed cards. No game code
changed; no assertions changed.

Removed: nothing.
