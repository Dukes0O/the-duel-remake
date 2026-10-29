# EIFEL-CROWN-C2: Eifel Crown, C2 rough road

Owner: codex. Lane: SIM.

## Prerequisites and graph

Claude must complete and approve [the packet](../../courses/eifel-crown.md) before this stage starts.

Needs: approved packet (C0).
Next: EIFEL-CROWN-C3, EIFEL-CROWN-C5.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

`src/circuits/eifel-crown.js` drives end to end with existing kits; drive-through check clean; `test-circuits.mjs` passes; a lap feels right on the keyboard (Claude drives it)

Judge: Claude.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## C2 implementation contract

- Own the road, sections and registration in `src/circuits/eifel-crown.js`,
  `tools/test-circuit-eifel.mjs` and `tools/scenarios/eifel-views.mjs`.
- Hold `circuit-registry` for the slot hook in `src/circuit-manifests.js`,
  `src/circuits/index.js` and `src/config.js`, and the affected count checks.
- Claude's packet answers settle the design: slot 9, state dev, layout 3,
  the exact 34-piece draft, 14 m width and alpine sections throughout.
- Prove geometry, switch off/on slot identity and boards/kerbs in the own test;
  run drive-through and `tools/test-circuits.mjs` by hand with preview enabled.
- Browser: memory-only `eifel-views`, three 1280 x 720 road views. Map picture
  uses `drawCircuit` from the track-script tool at the same size. No frames.
- No new event or sound. Scenery uses the existing forest bands only in C2.
- Required slot hooks also cover the GP list's duplicate Eifel id and the
  pilot-map builder/view. Generated map data retains the old outline and adds
  a switch-selected preview, so the packet's off/on map contract holds.

## Director decisions needed before handoff is green

1. The raw drive-through spawns traffic. The isolated stock-959 Casual/Pro
   geometry laps pass, but raw Easy leaves the road by 0.037 m and a trial
   narrower line ran out of lives in traffic. Recommended: re-slice C2 to add
   an explicit isolated-geometry mode using the existing reference fixture,
   keeping the raw traffic check unchanged. No tool changes made yet.
2. The lane gate stops at `tools/test-career-rebuild.mjs`: its recipe filters
   courses by manifest switch state, so the new dev replacement hides the
   still-released Eifel entitlement from the recipe. Recommended: authorize
   the small slot-aware filter correction in `tools/career-rebuild.mjs`, with
   the shipped restore data and exact-match assertion unchanged. This is
   outside the packet's owned files and needs a save review. No save or recipe
   data changed in C2.

The road is committed for review, not marked done. Claude still drives the
keyboard lap. C3 has not started.
