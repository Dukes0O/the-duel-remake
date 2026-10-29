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

## Claude answers

1. Keep the existing raw drive-through with traffic. Do not add an isolated
   geometry mode or other test machinery. Widen the corner where Easy leaves
   the road by 0.037 m, or ease its radius within the packet's limits, until
   every difficulty passes. If traffic costs all lives, identify the road
   fault at that spot and fix it. Record each road change.
2. Approved: correct the slot-aware filter in `tools/career-rebuild.mjs` so
   released Eifel ownership stays available while its slotted replacement is
   dev. The shipped `src/career-restore-2026-10-28.js` and the exact-match
   assertion must remain byte-for-byte unchanged. Show this in the change
   note for Claude's save review.

The resumed C2 owns this small recipe correction as well as its original
road files. Required checks: full changed lane with jobs 2 and keep-going,
manual circuits and raw drive-through, build, and refreshed four pictures
if the road changes. Claude still judges the keyboard lap. Do not start C3.

## Continued gate finding

The historical GP field formula in `test-grand-prix-podiums.mjs` imports
today's manifests. It therefore appends the slotted Eifel id a second time.
The approved slot hook removes that duplicate in the current catalogue.
Compare the current catalogue with the historical catalogue's unique ids in
the same order, and separately require current ids to be unique. All podium,
pay, historical save-byte and exact restore assertions stay unchanged.
This is an affected catalogue assertion under C2's count-check ownership;
Claude's written assertion review remains required before integration.

Two further catalogue checks need the same slot contract: the release suite
must require Eifel's approved combat and traffic while keeping every other
registered circuit race-only; the reference suite must compare published
records against the installed road when an id has both a released definition
and a dev replacement. Include authored definitions only for ids absent from
the installed list. Keep every fingerprint, trace and save assertion exact.
These are C2 slot-contract test hooks, not C3 reference generation. Do not
rebuild references, replay fixtures or world signatures in C2.

`test-team-room-views.mjs` uses the same published references, so its catalogue
must also prefer the installed definition for duplicate ids. Keep every
framing, visibility and dossier fingerprint check unchanged.

`test-track-analysis.mjs` must likewise keep the old Eifel definition in the
older-course notes roster while its replacement is dev, matching definitions
by identity rather than shared id. Its published-reference map checks prefer
the installed definition; its reference-free geometry checks still include
the authored preview. Keep the existing older-course count and note, map and
geometry assertions unchanged.

## Builder handoff

Raw traffic drive-through passes all three difficulties after Wall Left's
radius changes from 105 m to 108 m. Full lane: 323 passed, zero failed or not
run. Manual circuits, build and refreshed four pictures passed. Independent
code/save review is clear. Restore data and its exact-match test are unchanged.
See the change note for each catalogue assertion correction. Claude's written
assertion review and keyboard lap remain before integration. C3 has not started.
