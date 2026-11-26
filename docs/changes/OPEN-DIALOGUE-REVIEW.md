# OPEN-DIALOGUE-REVIEW: the owed dialogue review of nine open Scablands storylines

Claude, 26 November 2026, for Kyle's note of 19 November (plain, whole, conversational sentences).

**Changed.** About 250 lines, thoughts, questions, answers, choices and mark sentences in nine storylines, each in
`src/story/threads/content/<name>.js` and its page `docs/story/threads/<name>.md`, word for word: dace-goes-looking,
dry-pump, lights-on-the-whites, mall-road-toll, market-day, radio-hill-voice, runaway, somebody-elses-flag,
stranded-hauler. Runs of short sentences are joined as people speak; fragments are whole sentences; hints that hid
the meaning say it plainly; "they/them/their" for one person is gone; the water company's "Prior Use Schedule" is a
"Prior Use Form". No line was added or removed, and no id, condition, effect or `next` changed.
`burned-camp.js`, which now holds the Ash Men's turn, was left to the session that folded them together.

**Checks**, on the merge with integration f68e27c85: `test-thread-shape`, `thread-crossings --check` (only the two
burned-camp beats "alone" and "drain" that OPEN-BURNED-PEN builds, the same as on integration), `test-burned-camp`,
`test-open-dry-pump`, `test-open-market-day`, `test-open-somebody-elses-flag`, `test-open-stranded-hauler`,
`test-board`, `test-repo-hygiene`.

**Removed.** Nothing; the older wording is replaced in place.
