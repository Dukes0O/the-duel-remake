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
