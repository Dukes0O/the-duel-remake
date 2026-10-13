# FIX-FOOT-MOUSE

Kyle, 12 October2026, separate mouse: holding right-click prevents left-click firing, and mouse aim only responds after a first shot. Fix this alongside the Ambush opening work. Boss rewards are explicitly a separate push.

## Settled before code

App._bindKeys listens to pointerdown, which fires only on the first mouse button in a chord. Use mouse button events so a left press while right is held sets fire without clearing aim, and releasing one button leaves the other active. Right-click must acquire mouse look without a shot, with safe handling when pointer lock is refused. Mouse movement over the playable canvas must remain usable before lock; paused/menu input stays inert. Blur, pause, reentry, disposal and pointer-lock release clear held buttons as before. No sticky-aim setting is needed because Kyle uses a separate mouse.

Own only the on-foot mouse handlers in src/app.js, the existing input lifecycle acceptance in tools/test-app-lifecycle.mjs, and docs/changes/FIX-FOOT-MOUSE.md. Hold busy-game-files; P4-SUMMIT currently owns that lock, so wait for its source handoff. Do not edit its App hooks. One existing event-level regression, one targeted lane/jobs4, build and one independent code review; no browser/frame/full run during the day and no new harness. Ammo capacity, crew gear, rewards and saves stay unchanged. Entry help from FIX-AMBUSH-OPENING remains accurate. No release.

## Claude answers

No open art/sound decision. Shared-file handoff is the only current hold.

## Director lock handoff

Summit’s bab5ca92 shared source is clean and frozen; the latest correction only changes the Deep surface test catalogue. Its card now releases busy-game-files for this bounded mouse repair. Start after the board confirms CODEX CAN START NOW, then claim the lock before creating the lane.

## Current handoff, Codex control-fix chat

Owner chat01a12965-cccd-7533-acc7-f11164e302b5 owns source4d48a1b6b245d832556235a55ea6542c9312c844 in fix-foot-mouse. Independent code review and real menu-fault correction confirmed clear. Its single targeted lane/jobs4 and following build are still running; no green receipt or build is claimed yet. Evidence will be .evidence/FIX-FOOT-MOUSE/evidence.json in that lane. This chat merges the mouse fix first when green, preserves Summit App hooks with a normal disjoint merge, releases its busy-game-files lock, then recycles its newly created lane. No release or push.
