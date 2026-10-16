# QA-AUDIO-CRASH-RELIABILITY

The shared browser suite now classifies audio-crash-peak as run by its wrapper. The browser discovery list contains only directly executable recipes; the summary has an explicit delegations section naming tools/test-audio-crash-peak.mjs. The shared route does not launch the incompatible direct recipe. An explicit shared-suite request reports the same delegation; this is not an executed browser or wrapper pass.

Summary count and rows retain their existing executed-only meaning, including for the unchanged full-check consumer. Separate executed/delegated counts and delegations metadata make coverage visible without treating it as a missing browser result. Delegated entries have passed:null, no invented exit code, report, screenshot, warning or issue counts. They never increase passed or failed totals. Ordinary scenarios keep their existing exit, passed, memory-only, zero-warning and zero-issue rules. Delegation alone does not build a QA bundle. Mixed runs still build once, drain normally and report actual failures.

Claude approved this discovery-only change on the card (15 October05:20). The original full tier on detached1c0cb3d0 already ran the specialized wrapper exactly once:23/23 pass. That historical result is not rerun or converted into a new browser pass. The old direct browser failure and earlier unknown recorder timeout remain historical failures with no new cause claim.

## Verification

Existing runner tests extended with two cases; RED before implementation (2 new failures/8 original passes), then10/10 PASS. Independent review found the initial mixed-row representation would fail the existing strict full-check consumer. Corrected within the same two owned hooks: directly executable discovery/count/rows remain aligned; delegation has separate metadata. Corrected10/10 PASS in125.4712ms, with all eight original tests/assertions unchanged. They verify actual discovery, default and explicit delegation without build/capture, separate counts/null results, ordered executed rows and separate delegation metadata, one build and retained real-warning failure. All eight original assertions remain unchanged. Source parses and diff check passes. Independent review confirmation, canonical changed lane/jobs4 and production build pending. No native audio capture, recorder change, full-check job or real-save access.

## Removed

Removed the incompatible direct shared-suite invocation for this one recipe. Its source, specialized wrapper, recorder, path guard, assertions, deadlines and prior packets are unchanged. No replacement harness or extra wrapper invocation is added.
