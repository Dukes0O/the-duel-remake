---
task: FND-05
status: review
kind: tooling
flag: none
player_facing: no
---

## What changed

Installed the task board, change-note folder, playtest inbox, root agent
rules, and ten role profiles from the approved playbook. The board records
ownership, dependencies and merge state for Wave 0 and Wave 1.

## Evidence

- The board parses as YAML and has 33 unique task IDs.
- All ten `.codex/agents/*.toml` files parse as TOML.
- The existing FIX-01 change follows the note template and is ready to be
  moved into integration as a dry-run card.
- `node tools/run-tests.mjs` passed 138/138 suites in 836.34 seconds on the
  isolated foundation branch.

## Behavior and test changes

No game behavior or test assertion changed.
