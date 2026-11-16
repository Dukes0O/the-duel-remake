# QA-NIGHTLY-NEWS

- Nightly reports distinguish passed, standing and new failures. Invalid stages fail and cannot clear standing items; no stages means failure.
- Weekday browser selection uses changed scenarios, helpers and areas. Saved progress and pay always run; Saturday and strict runs include all.
- Warlord settlement and arena world job files now select their scenario areas. Status reports the latest night and missed nights.
- At d77dfe088: full-check 52 passed; temporary Git-copy check failed because the sandbox blocks pwsh. Claude must rerun it on the laptop.
- At d77dfe088: browser selection tests 16 passed.
- At d77dfe088: list: Selected 70; left for Saturday 152. Reasons: 17 guards saved progress or pay; 53 no area.
- Changed assertions: no-stage result changed from passed to failed, as directed. No assertions were loosened.
- Codex decided: none. No game events or sound cues added; race fingerprints unchanged.
- Removed: all-scenarios-every-weekday selection and standing-item removal without valid stage results.
