# NISSAN-SKYLINE-GTR-R34-V4: Nissan Skyline GT-R R34, V4 handling

Owner: codex. Lane: SIM.

## Prerequisites and graph

Claude must complete and approve [the packet](../../cars/nissan-skyline-gtr-r34.md) before this stage starts.

Needs: approved packet (V0).
Next: NISSAN-SKYLINE-GTR-R34-V6.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

Car numbers in config; lap times against two current cars on two courses inside the packet targets; replay fingerprints of other cars unchanged

Judge: Tests.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## Handling implementation

Uses Claude's settled numbers and Skyline-only AWD rule in the packet.
Lock: surfaces. Owned files: config entry, engine fit row, surface rule,
handling test and this note. Kyle's direct assignment also names the
completion exclusion, ROAD_CLASS row and dev-only 959-S stand-in.
The nissan-skyline dev switch gates the appended config entry at startup;
off keeps the exact existing roster. No price until V6, so it cannot be bought.
V3 replaces the temporary donor; V6 adds the final shop and list wiring.

Checks: test-skyline-handling (four pace bands, all surfaces and tyres,
completion count, lift and field pool); test-engine-curve; existing replay
fingerprints in the lane tier. No browser, look or frame check for handling.
No new sound event.

## Director handoff

Handling and engine fit complete; independent review clear. The approved
preview flag append is complete. Fresh lane gate passes 238/238 with jobs 2
and keep-going, and production build passes. Replay and world guards pass
unchanged. See docs/changes/NISSAN-SKYLINE-GTR-R34-V4.md for results and the
41 to 42 switch-count reason for Claude's written assertion review.

## Approved scope extension (28 October 2026)

Claude approved the preview launcher extension in Kyle's continuation brief.
Append `nissan-skyline` to `start-preview.bat`'s explicit non-course flag list,
like the other dev cars. `tools/preview-flags.mjs` supplies only course flags
and needs no change. Check the existing preview-launcher suite, the lane tier
with jobs 2 and keep-going, and the production build. No browser or frame
check applies to this flag-list change.
