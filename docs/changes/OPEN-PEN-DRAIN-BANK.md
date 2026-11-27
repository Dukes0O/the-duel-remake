# OPEN-PEN-DRAIN-BANK
Cause: the Nest cut only the yard and gully; its pipe crossed uncut earth, and the scenario teleported through it.
Fix: join the existing mouths with a 9 m deep bed and blended banks; keep all placements and foot physics.
Scenario: forward and mouse-look inputs, with a route round the lean-to and pen wreck instead of through their solids.
Checks on `3d1bae1d6` plus this patch (pre-commit working tree):
PASS: new check reproduces the old bank, then passes 105 metre samples, 12 drain walks and three yard routes on three seeds.
PASS: `test-burned-camp-pen`, `test-burned-camp`, `test-rats-nest-look`; full rescue with real foot inputs and guard rules without graphics.
PASS: `test-world-composition` (65 checks, 32 events); no signatures re-recorded; published Nest layout hash unchanged.
PASS: 142,806 half-metre samples outside the drain corridor match the old ground exactly.
PASS: combined `--jobs 2` core/replay/card checks: 8/8 suites (core 804, race replay 306, combat replay 12); `npm run build`.
PASS: board (641 checks) and repo hygiene; status refreshed; audit candidates advisory; lane scratch and build output recycled.
Changed assertion: replace the old requirement for uncut earth inside the drain with a continuous bed; Claude review owed.
Browser scenario and look: left to Claude as directed; no browser run in this lane. No new event or cue.
**Removed**: position-setting walks and the obsolete uncut-drain assertion; no replaced runtime asset or signature.
