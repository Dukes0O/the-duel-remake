# HELI-FINISH

Claude flies the whole first slice, fixes what feels wrong, sends Kyle pictures, prepares the release.

Owner: Claude. Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Section 11 of the packet. The release waits for Kyle's word and holds
`release` only then.

## Installed at Kyle's request, 15 October 2026

Kyle explicitly asked Codex to install the prepared helicopter candidate `1c0cb3d0`. Codex acted as Release Manager for this installation. Live master was fast-forwarded from `d34bf40f` to exact `1c0cb3d0b5d134f579bf39cf744d6cd99dc0bb5f`; no code or switch was changed. Helicopter is on, Summit and Yeti remain dev. Live production build `20261015161329-187a6c9406c6` is verified over HTTP, with entry, manifest and referenced assets exact. All 487 build files match the staged inventory. No game tab was refreshed and no player storage was accessed.

Evidence reused from the original exact-source full check: 444/444 full suites, quiet Harbour frames, current-rules combat, heli-first-flight and heli-finish scenarios passed. The original aggregate remains FAILED, browser119/129: all ten QA failures remain recorded, and audio timeout/continuity causes remain unknown. Kyle's current install instruction follows that reported failed batch; no all-green result, assertion waiver, new art review or repeated check is claimed. New production staging build passed with the existing large-chunk warning and a fresh outDir notice; private5188 checks were static HTTP only, not a new runtime browser pass.

Rollback is the prior installed build `20261014035636-e7c3f590285b` in live `dist-previous`; the superseded rollback and temporary dist-next/staging archive were sent to Recycle Bin. Private preview stopped. Receipt: `.evidence/2026-10-15/RELEASE-HELICOPTER-1c0cb3d0/install-receipt.json`. No push or history rewrite was performed. Overnight continuation remains paused; denied HELI source-lane cleanup is untouched.
