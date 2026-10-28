# KOGANE-PASS-C2: Kogane Pass, C2 rough road

Owner: codex. Lane: SIM.

## Prerequisites and graph

Claude must complete and approve [the packet](../../courses/kogane-pass.md) before this stage starts.

Needs: approved packet (C0).
Next: KOGANE-PASS-C3, KOGANE-PASS-C5.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

`src/circuits/kogane-pass.js` drives end to end with existing kits; drive-through check clean; `test-circuits.mjs` passes; a lap feels right on the keyboard (Claude drives it)

Judge: Claude.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## C2 build contract

- Own `src/circuits/kogane-pass.js`, `tools/test-circuit-kogane.mjs` and
  `tools/scenarios/kogane-pass.mjs`; rebuild the existing pilot outline tool.
- Registration lock: `circuit-registry`, confined to the new course manifest.
  Folder discovery supplies the switch and price without shared registry edits.
- Keep the packet's 28 road pieces unchanged, including widths, climbs and
  angles. Claude approved the open road, six-car field and 2,200 credit price.
  Reuse Summit's racing line and following options. No C3 pace changes.
- Checks: new course test for geometry, separation and registration;
  `node tools/drive-through.mjs --course kogane-pass`; manually run
  `node tools/test-circuits.mjs` with the development switch enabled.
- Browser: memory-only `kogane-pass` scenario, one job, three 1280 by 720
  road views. Top-down map from the existing track-script picture tool.
  No frame timing. Claude still judges keyboard driving.
- No new game event or sound cue. Reuse the alpine forest ambience until C5.
