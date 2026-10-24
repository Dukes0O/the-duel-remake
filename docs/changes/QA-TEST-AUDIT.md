---
task: QA-TEST-AUDIT
status: review
kind: tooling
flag: none
player_facing: no
---

# QA-TEST-AUDIT: right-sized tests (24 October 2026)

Kyle: too many tests run too often, and many pin exact numbers that break on
every deliberate change. Built on `cloud/qa-test-audit` from
`integration/wasteland` (card `docs/board/cards/QA-TEST-AUDIT.md`). No game
code changed: only `tools/run-tests.mjs`, test suites, one replay control file
and docs. The audit table is `docs/board/checks/test-audit.md`; questions for
Claude are in `docs/board/questions/QA-TEST-AUDIT.md`.

@@BODY@@
