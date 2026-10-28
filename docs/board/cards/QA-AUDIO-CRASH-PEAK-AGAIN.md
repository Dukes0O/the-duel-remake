# QA-AUDIO-CRASH-PEAK-AGAIN

The short board entry controls current state, ownership, dependencies and locks.

The release full tier on f514c859 (26 October 2026 evening) failed
`test-audio-crash-peak` once with no crash-sound or mixing change since its
last pass; the one rerun on the same commit passed (rule 3). It was made
reliable once before (QA-AUDIO-CRASH-RELIABILITY). Find why it still fails
under a full-tier load and fix the cause. Never change its limits.
