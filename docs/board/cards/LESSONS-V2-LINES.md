# LESSONS-V2-LINES

The short board entry controls current state, ownership, dependencies and locks.

`docs/DRIVING_LESSONS.md` 14.11. Write and record the lines with the same
voice and radio settings as the other driving lines, add them to
`tools/audio/catalog.json`, and remove the lines and files that no longer
play. Wording: plain, short, never times or prices; the text shows on screen
too. Within the month's voice credits; if credits run short, stop and ask
Kyle (money). Lane tier and build.

## Design settled before code (27 October 2026)

Use four lesson intros and four lesson pass lines. Share the four step starts
and miss advice under `drive.radio.v2.shared.*`; the late-braking Watch me
clip has its own `corner.watch-late` line. Add slow-corner, lift-only, clean
practice and clean-but-slower advice so every result has truthful feedback.
The radio subtitle uses the recording's exact text. Keep the result table
and its detailed, numbered corner explanation beside that short subtitle.
Retakes use their lesson intro, then start at Your turn. Remove all 47 v1
lines, their catalog entries and both copies of their MP3s.

Checks: `test-drive-lesson-lines` proves reachable ids, exact subtitle text,
catalog/hash/file coverage and no leftovers; existing lesson/run/view tests
keep lesson rules and save retry behaviour intact. Run the every-car suite,
lane tier with four jobs, and build. No frame or browser look check: this
changes voice files and radio text, not the scene.

## Lane handoff

22 Brian recordings, 1,883 characters; final credit lookup reports 15,661
left (counters lag; details and per-take estimates in the change note).
314 radio checks, 97/97 combined lane suites, every-car 196/196, build pass.
Independent code/asset review passes. Old 47 lines and both file copies are
removed. Claude's assertion review remains for integration; no merge/push
from this lane. Full line list and recovery details:
`docs/changes/LESSONS-V2-LINES.md`.
