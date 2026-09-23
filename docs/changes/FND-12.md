---
task: FND-12
status: building
kind: operations
flag: none
player_facing: no
---

## What changed

Corrected playbook 14.2 for the installed Codex CLI. Profiles are separate
`$CODEX_HOME/<name>.config.toml` files, selected with `--profile`; the old
example used an invalid nested table, unescaped Windows paths and a folder
that does not exist. The replacement starts with a worktree-only dry-run
profile and adds live release access only after a copy-only proof.

## Evidence and remaining work

- `codex --help`, `codex exec --help` and `codex sandbox --help` confirmed
  the profile syntax. The official Codex configuration guide agrees.
- The existing user config uses approval on request. No dry-run or release
  profile file existed before this task.
- Automatic approval review rejected installing the persistent dry-run
  profile because its no-prompt and network settings were not specifically
  authorized. No profile file was created or tested.
- A copy-only release, zero-prompt check, role invocation checks and the
  missing feel/audio tools remain. This card is not accepted yet.

## Behavior and test changes

Documentation only. No game code, tests, live checkout or saves changed.
