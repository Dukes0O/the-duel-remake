# PUSH-AFTER-RELEASE

Kyle, 13 October 2026 ("push it"): `integration/wasteland` had not been
pushed since 2 October because D8 required a history compaction first, and
compaction needs Kyle's approval, which was never asked for. 1,373 commits
existed only on the laptop. Claude pushed the branch as a fast-forward and
AGENTS.md now says the Release Manager pushes it after every release, with
compaction as an occasional approved tidy-up. The full-check report line
"Compaction and push disabled" stays true for that tool, which never pushes.

Tests: lane tier and build. No code or assertions changed.

Removed: the D8 compaction-before-push condition.
