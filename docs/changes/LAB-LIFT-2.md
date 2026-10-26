# LAB-LIFT-2

Switch: `lab-2`, dev. Branch: `codex/lab-lift-2`.

## Round 2 design · 26 October

Claude accepted round 1's structure, flight numbers, kg hints, and the
Dusthawk-plus-three-crates overload. Claude also approved the Brian-only
generator-table addition with its existing checks unchanged (verdict relayed
by Kyle). Those three round-1 questions are resolved.

Round 2 uses kg comparisons derived from the flight engine's gravity, while
the underlying force calculations stay unchanged. Weight comes before lift
so Brian's requested comparison sentence uses words already introduced.
The closer low camera, thick centre-line arrows and translucent downwash
keep the machine central. A compact load gauge replaces five load labels;
prediction hides every floating label. Force captions occupy separate safe
screen positions. The collective word adds a cutaway cockpit inset with a
left hand gripping the moving lever beside the real twisting rotor blades.
Brian's existing recipe gains facial detail, clear raised safety glasses and
a canvas apron with a pencil. This is round 2 of the three-round limit.

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
visible crates overload her. Claude confirmed this example in round 1;
no flight number changed to manufacture failure.

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
exempted. Claude approved the registry addition in the round-1 verdict
relayed by Kyle; this lane does not merge.

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
  Claude accepted the structure and numbers and requested round 2. Kyle and
  Gratian's preview remains open. No frame timing.
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

## Final checks and handoff

- Game source: `091203c4`. All 50 suites in the final lane plan are covered
  by passing results, jobs 4. The original run passed 9 suites; its missing
  Blender entry was fixed and passed 89 placement checks. The next run
  passed 14 suites; its import-boundary fault was fixed and passed all 180
  helicopter-mode checks. The five Lift tests passed after that mechanical
  move. The final 24 uncovered suites passed, zero failed or unrun, in
  420.50 seconds. No passing suite was repeated merely to fill a new gate.
- Replay fingerprints: 225 unchanged checks across 25 cases, 23 events and
  three FPS values. World composition: all 47 exact scene checks passed.
  Helicopter flight fingerprint remains
  `idle|panorama-ridge|116.216667|30.149797|30.764262|39.825237|0.031176|-0.000383|…`.
- `npm run build` passed in 823 ms, with System32 first on PATH. Its existing
  shared dynamic-import and large-chunk warnings remain.
- Final code review approved the lesson, interaction fixes, generator entry
  and mechanical bench-boundary move. The move changes no animation or
  interaction from the 21-capture green browser run. The later hint wording
  is covered by pure behavior checks; no browser pass was repeated for it.
- Board: 187 checks passed. Repository placement and whitespace passed.
  Session status was regenerated. Cockpit sync: zero tasks changed, no
  missing task mapping reported.
- `docs/lab-lesson-authoring.md` now documents the range controls, dynamic
  kilogram hints, graph placement and custom ghost contract for the next
  fifteen lessons. Only this documentation, the verdict and status snapshot
  changed after the checked game source.

Round 1, the Dusthawk-plus-crates example and the generator-list addition
are accepted. Kyle and Gratian try the lesson before LAB-LESSONS-2. `lab-2` remains
dev. This lane is committed only: no merge, push, release or frame timing.

## Round 2 checks and handoff

- Merged current `integration/wasteland` into this branch as `a1e315f4`.
  Only the generated STATUS snapshot conflicted; integration's copy won.
- Required lane command, jobs 4: 50 passed, zero failed or unrun, 338.18 s.
  Replay fingerprints passed all 225 checks; all 47 exact world checks pass.
  No flight, race or save rules changed.
- Final view corrections track the climbing helicopter and move the graph
  clear of the captions and canvas edge. New projection assertions failed
  on the clipped views and pass after the fixes. The affected Lift suite was
  rerun through the lane runner: all eight tests pass. Other passing suites
  were preserved under the check-once rule. Existing frame tests also pass.
- Final `npm run build`: pass, 1.02 s, PowerShell with System32 first on
  PATH. Existing shared dynamic-import and large-chunk warnings remain.
- Final browser: private port 27689, memory-only saves, 22 captures, zero
  warnings/errors. Real drag and held keys, all three load objects, both
  hover trials, the overload, checks, notebook and existing challenge pass.
  Navigation now waits for the machine prompt after Brian's portrait; the
  earlier coordinate could open Ask Brian instead. Prediction is chosen
  before dragging, and the waiting crate is visible beside the pad.
- Independent review approved the code, Brian recipe and final pictures.
  Resolved findings: unchanged DOM text rewritten each frame, shaft colour
  reused across word steps, hidden red arrow tip, climbing arrow clipping,
  and graph overlap/clipping. Captions update only when their values change.
- Brian: 7,960 triangles, 261,916 bytes. Clear lenses survive GLB export.
  The comparison sheet is `docs/board/looks/lab-2/look-4.jpg`, 474,345 bytes.
  All requested pictures remain under the card's `round-2` evidence folder.
- Board: 181 checks pass; repository placement and whitespace pass. Session
  STATUS regenerated. Required protected Cockpit sync updated T-053 to Done
  from integration's completed helicopter card; no manual tracker edits.

Open: Claude's round-2 art verdict and exact word-order assertion review
(recorded on the card), then Kyle and Gratian's preview. No known code or
picture defect remains. `lab-2` stays dev. No push, outward merge, release,
live-folder access or frame timing.

## Removed

Round 2 removes the five floating load/control sprites and all displayed
newton labels from this lesson. The single load gauge and two kg captions
replace them; prediction hides both captions. Brian's current GLB replaces
round 1's GLB at the same runtime path. No backup model is kept.
Recycled this round's `.qa-dist`, `dist`, Blender importer scratch and the
two failed diagnostic captures. Kept all 22 final captures and Brian renders.

Changed assertions: the exact word-order expectation now requires Rotor,
Weight, Lift, Collective, Hover. This moves Weight ahead of the kg comparison
without dropping a word or relaxing the sequence check. The browser follows
this order, verifies hidden prediction labels, and navigates back from Brian
by the real Lift prompt rather than a timing-sensitive coordinate. It picks
the prediction before dragging, as the player does. All interaction/outcome
assertions remain. New checks prove kg conversion for every animation, the
caption's two-sentence limit, and projected arrow-length ratios. Existing
frame and flight assertions and tolerances are unchanged. Claude's round-2
review of the deliberate order change remains on the card.

Brian's reused Rook reference is replaced by his own model. The old bench
remains available with Lab 2 off until LAB-LESSONS-2 replaces it at go-live.
The failed browser's own Chrome processes were closed and its verified
temporary profile recycled using Windows PowerShell. No other process or
player data was touched. Final step captures remain for the requested review.
Recycled this run's `.qa-dist` and `dist` after the gates. Moving the pad
module removed its old lesson-folder copy; there is one calculation module.
