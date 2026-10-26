# LAB-LIFT-2

Switch: `lab-2`, dev. Branch: `codex/lab-lift-2`.

## Design settled before code

The lesson packet owns its words, pad loads, prediction pictures and model
animations. The existing frame owns teaching state and the existing flight
challenge keeps its rewards. The model uses the real Kestrel and Dusthawk.
The left-hand lever accepts dragging and held Up/Down; load objects are
clickable, with named buttons for keyboard access. No slider is used.
Load actions reuse `lab.clunk`; teaching navigation reuses `lab.tick`.

Flight numbers come from `heli-flight.js`; car and crate masses come from
`heli-cable.js`. Fuel cans transfer a quarter-tank each. The pad offers zero
to four crates, the Dusthawk, and zero to a full tank. A supported hover
matches forces at a small height above the pad; ground lift and hover lift
use their respective ground-effect factors.

Design conflict found: a full-tank Kestrel can lift the Dusthawk alone.
Used the recommended truthful example: the Dusthawk alone lifts, then three
visible crates overload her. This small change is open to Claude's lesson
review; no flight number changed to manufacture failure.

The key-idea card uses "Lift must match weight." as its title and the second
sentence as its text, preserving the requested wording without relaxing the
frame's one-sentence text assertion.

## Checks planned

- Pure test: every offered pad load against flight-rule thrust and one real
  flight step; vocabulary order, force comparison and end-to-end teaching.
- Memory-only browser scenario: every step, drag and held-key lever, load
  objects, predictions, help and unchanged challenge, with step captures.
- Lane tier, jobs 4; build; independent code review; one art round and sheet.

## Changed assertions

`tools/test-blender-output.mjs` adds Brian to its generator data: the exact
runtime path is `public/assets/models/lab/brian.glb`, with no editable Blend
output. This extends the existing generator-list expectation and applies the
same planning, placement, reproducibility and no-output checks to Brian.
No assertion code or tolerance changes, and no generator is removed or
exempted. Claude's written registry review is still needed before merge
under AGENTS 18; this lane does not merge.

## Review and early checks

- Independent code review approved after four fixes: pitch all three real
  rotor primitives, keep a waiting crate visible, remove enough kilograms to
  hover, and preserve the previous try's index for its ghost.
- Five new Lift tests and seven existing frame tests pass. The new tests
  cover 250 pad combinations, a real flight step for each, all teaching
  stages, loaded picture verdicts, useful kg hints and the real rotor GLB.
- First browser attempt captured Wonder, all words and the first watch
  step, with no browser warnings or errors. It timed out on a later watch
  step while three other lanes were also running gates. Our newest browser
  job was stopped; no passing browser claim. Its profile cleanup reported a
  locked temporary lockfile. No other session's process was stopped.
- Final browser scenario passed on private port 23924: 21 screenshots,
  memory-only storage, zero warnings/errors. Real dragging, held Up/Down,
  can transfers, crates and the Dusthawk all worked; guided and prompted
  hovers and the solo overload passed. Wrong check answers replay the right
  model. Notebook words were saved only in the isolated test career, with
  no lesson reward before the existing flight challenge launched.
- Browser recipe fixes: wait for usable controls and each rendered load
  change, use a correctly escaped number match, avoid a duplicate picture
  click, and deliberately lower enough to produce a failed first try.
  None changes a game assertion or tolerance. All final pass conditions hold.
- The final delta after the browser pass improves only prediction and goal
  hint wording: keep the same kg load when only the picture was wrong; test
  full power before calling a load too heavy; otherwise add enough kg using
  an achievable Dusthawk-and-crates combination. Pure behavior checks cover
  each recommendation. No model, input, flight rule or outcome changed.
- Art round 1: `docs/board/looks/lab-2/look-3.jpg`, 468,446 bytes. Every step
  plus Brian is pictured. The builder found no clearly unresolved look issue;
  Claude's verdict and Kyle/Gratian's preview remain theirs. No frame timing.
- First frozen lane attempt found the missing Brian generator registration.
  The corrected placement suite passes 89 checks. The existing equality and
  placement assertions remain intact; the new registry entry extends them.
  The lane continuation reuses passing suites and runs the failed and unrun
  suites only, following the check-once rule.
- The continuation caught the helicopter import boundary: only benches may
  read flight-rule files. Moved the unchanged pad calculations into
  `src/lab/benches/lift-pad.js`; the definition and animation read this bench
  API. The existing import guard is unchanged. No flight rule or displayed
  number changed, and no broader import exception was added.

## Removed

Brian's reused Rook reference is replaced by his own model. The old bench
remains available with Lab 2 off until LAB-LESSONS-2 replaces it at go-live.
The failed browser's own Chrome processes were closed and its verified
temporary profile recycled using Windows PowerShell. No other process or
player data was touched. Final step captures remain for the requested review.
