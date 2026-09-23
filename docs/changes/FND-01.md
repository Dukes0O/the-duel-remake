---
task: FND-01
status: merged
kind: fix
flag: none
player_facing: yes
---

## What changed

The desktop launcher now serves a built game on `localhost:5174`. It builds
once if `dist` is missing and no longer starts the live-reloading dev server.
It calls Vite directly because this Windows npm setup dropped arguments after
`npm run preview --`.

## Evidence

- The desktop shortcut's host target is the live `start-game.bat` and exists.
- `npm run build` passed in the isolated worktree.
- The direct Vite preview command on private port 5180 returned HTTP 200 for
  the landing page and build manifest. The private preview was stopped.
- `node tools/test-build-update.mjs` passed 194 checks for the menu-only
  update notice, malformed manifests and race-state blocking.
- Actual shortcut launch, save continuity and no-reload behavior on port 5174
  still need the release check. No live game or save was touched for this test.

## Behavior and test changes

Serving mode changes from development to built preview. No race rule or test
assertion changed.
