# FAC-06: lean board and locks

The board now lists 47 open cards instead of 317 current and finished cards.
Each open card has one short YAML entry and a detail note under board/cards.
The 270 completed ids remain explicit prerequisite evidence; unknown ids stay
blocked. Active nonwaiting cards hold named locks. A ready card with the same
lock is shown as waiting, and independent cards remain available.

Design before code: keep the existing parseBoard array API, attach its completed
Set without enumerating it, and let workSplit resolve removed completed ids.
Detailed open-card scope and Kyle/Claude decisions are preserved verbatim.
Existing GP work is ready for the course-lock transition; its caps and results
remain in its detail note. No game source, saves, fixtures or assets change.

Tests first: the new acceptance failed on finished cards remaining in the board.
Focused green: 226 checks, including standard YAML through already-installed
PyYAML, dependency settlement/unknown refusal, shared-lock waiting, independent
work, and lock release. No runtime dependency was added. Lane/build and one
independent review remain pending.

Changed assertions: the obsolete board-size >100 test becomes nonempty open
entries plus every card having an open status and a real detail note. Needs may
name an explicit completed id after its finished entry leaves. The original
owner/review/known-status/unique-id protections remain, with new lock checks.

## Removed

Finished entries and their duplicated implementation history leave board.yaml;
Git and existing change notes keep text history. Open facts move to their named
current cards, not an archive. The malformed old combined gate fields cannot
break the new standard YAML. No original lane, evidence or runtime file is deleted.

One review found a conflicting Claude claimant was shown active and held its
second lock despite losing the first. A genuine failing three-card fixture now
requires all locks or none, consistently for both teams. The correction passes
230 focused checks; no existing lock assertion was relaxed.

Claude's new Deep packet and FAC-04 lock claim were preserved during the real
board conflict: current 52 open cards, 270 completed ids, and all current raw
card blocks in the detail notes. Two superseded notes created by this lane
(DEEP-RAMP and DEEP-DRIVE) went to the Recycle Bin after Git proved ownership.
The current focused board suite passes 256 checks and standard YAML loads.

The first canonical gate on 373f2fac failed 10/17, six unrun, 122.20 s:
only the preview launcher's last board assertion demanded its already merged
card remain waiting for Kyle. Before changing it, Director grants only that
assertion and parseBoard import in tools/test-preview-launcher.mjs. Finished
PREVIEW-LAUNCHER must now be explicit in completed and absent from open cards;
if still open, its original pending confirmation check remains. Unknown missing
cards fail. AGENTS rule 15 removes that old non-release wait; the other 22
launcher, runtime and memory-only assertions stay exact. No flaky rerun claim.

## Final merge verdict

Source 8885399a: canonical lane 18/18, zero failures/unrun, 288.97 s, jobs 4.
Production build passed (Vite 1.21 s); one ordinary review by gp_existing clear,
including the final preview lifecycle assertion. Current board is 50 open cards
and 272 completed ids after FAC-06 leaves at merge. Current raw Claude packets,
P4 results, named locks and granted FAC-04 hooks are preserved. No game code,
save, price, replay fingerprint or world signature changed. The real metadata
conflict was fixed in the lane before this one fresh gate; no clean-merge rerun.
FAC-02 own merged checkout was recycled, its integration junction safely detached
and only its missing registration pruned. Older retained lanes remain.
