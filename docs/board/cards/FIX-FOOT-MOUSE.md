# FIX-FOOT-MOUSE

Kyle, 12 October2026, separate mouse: holding right-click prevents left-click firing, and mouse aim only responds after a first shot. Fix this alongside the Ambush opening work. Boss rewards are explicitly a separate push.

## Settled before code

App._bindKeys listens to pointerdown, which fires only on the first mouse button in a chord. Use mouse button events so a left press while right is held sets fire without clearing aim, and releasing one button leaves the other active. Right-click must acquire mouse look without a shot, with safe handling when pointer lock is refused. Mouse movement over the playable canvas must remain usable before lock; paused/menu input stays inert. Blur, pause, reentry, disposal and pointer-lock release clear held buttons as before. No sticky-aim setting is needed because Kyle uses a separate mouse.

Own only the on-foot mouse handlers in src/app.js, the existing input lifecycle acceptance in tools/test-app-lifecycle.mjs, and docs/changes/FIX-FOOT-MOUSE.md. Hold busy-game-files; P4-SUMMIT currently owns that lock, so wait for its source handoff. Do not edit its App hooks. One existing event-level regression, one targeted lane/jobs4, build and one independent code review; no browser/frame/full run during the day and no new harness. Ammo capacity, crew gear, rewards and saves stay unchanged. Entry help from FIX-AMBUSH-OPENING remains accurate. No release.

## Claude answers

No open art/sound decision. Shared-file handoff is the only current hold.
