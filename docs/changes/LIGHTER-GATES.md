# LIGHTER-GATES: build more, record less

Kyle approved on 4 October 2026 after a day where 66 of 78 integration
commits were notes and one unreliable audio check held merges for hours.

- AGENTS.md gains "Build more, record less" above Gates; it wins over older
  text. SPEC 0.5 and the playbook match: full tier at session end and before
  release, run alone with `--jobs 4`; one rerun for a check that fails with no
  game code changed; 30-minute cap on any one investigation; one log line per
  merge; extra helpers only for saves, releases, pay and art.
- Tests: no test, assertion or tolerance changed.

Removed: the "every 5 merges or 2 hours" full-tier trigger and the
build-status run after every merge.
