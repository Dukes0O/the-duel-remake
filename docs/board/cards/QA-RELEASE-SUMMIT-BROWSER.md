# QA-RELEASE-SUMMIT-BROWSER

The short board entry controls current state, ownership, dependencies and locks.

Claude, 16 October 10:30. The RELEASE-SUMMIT browser batch (`run-browser-scenarios
--all --jobs 4` on 7f108454, started 08:24 alongside other jobs and while Kyle
used the laptop) was stopped at 10:25 for Kyle's screen hold: 119 passed, 9
failed, the last few scenarios unrun. Seven failures already have cards
(arsenal-wave1-audio: QA-ARSENAL-AUDIO-READINESS; audio-baseline:
QA-AUDIO-BASELINE-CONTROL; lap-telemetry: QA-BROWSER-SWEEP; p4-audio:
QA-AUDIO-CLOCK; track-kits: QA-HARBOUR-ROAD-CLEARANCE; tremblant-snow and
tremblant-views: QA-BROWSER-FRAME-ISOLATION). Two have none:

- combat-field: `Page.navigate timed out.`
- roadside-destruction: failed; its message was lost in the interleaved log.

Both may be load timeouts from a busy laptop. Run each alone once in the next
daily full check or a quiet slot; if either fails alone, find the cause within
rule 4's 30 minutes. They did not hold the release (Kyle, 15 October).
