# P4-ARDENNES

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Kyle, 13 October 2026, on a Spa-style forest circuit after loving Panorama
Ridge: "make that one a beauty!" Design: `docs/CIRCUITS.md` section 5.5.

## Split

- **Road layout (Claude, tonight).** A Claude helper writes
  `src/circuits/ardennes-forest.js` from the fitted script in section 5.5:
  widths, run-off, crests, kerbs, boards, pit lane and the `ardennes-forest`
  dev switch, registered the way Panorama's road was (P4-CIRCUIT-LAYOUTS).
  It uses existing forest scenery and puts no art in.
- **The rest (Codex, this card).** Codex builds it once the road merges:
  - the light path (morning mist clearing to sun);
  - the forest dressing (dense firs and beech close behind the fences, mist
    in the dips);
  - the catch fences and armco from the circuit kit;
  - every landmark in section 5.5;
  - the full eight-car field on the native .95 driver;
  - the pit lane;
  - its own field recipe (the Panorama recipe is the starting point).

  Use the existing kits, stand crowds, night glows and landmark metadata.
  New models only where no kit piece fits: the stone stream bridge, the
  footbridge and the timing tower. Send those through one art sheet to
  Claude, within the three-round cap.

## Acceptance

- Section 4 feel targets checked with the review tool. Lap time and corner
  speeds go in the change note: The Wall flat in a good car, Les Combes and
  Riverside the heavy stops.
- The full field races two laps cleanly.
- The drive-through passes, with no floating walls, the road covered and
  body-to-face contact within bounds.
- The simple frame check at both qualities on the busiest view (the grid at
  Pit Straight) passes.
- Lane tier, build, one review. Then Claude's finishing pass,
  P4-FINISH-ARDENNES, before Kyle's "go live".
- Price 2,000 credits. The course joins the end of the list after Summit Run,
  so saves, records and menu places stay put.

## Road merged (Claude, 13 October 21:40 PT)

P4-ARDENNES-ROAD merged at 85e47a3e: `src/circuits/ardennes-forest.js` (manifest: dev, 2,000 credits, release order 5, Grand Prix), reference lap 139.3 s, `tools/test-circuit-ardennes.mjs`. No safety kit yet: open run-off on both sides. Widths 15 / 16 on Kestrel / 15 from Les Combes / 13 through the Bus Stop.

The layout test's Medium driver laps in 2:29.2, just under its 150 s cap. Codex should not make the lap slower without first raising that cap for this circuit's length, with a reason. P4-ARDENNES can start now.
