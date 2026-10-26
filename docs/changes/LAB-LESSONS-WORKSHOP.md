# LAB-LESSONS-WORKSHOP

## Design settled before code

Four independent lesson packets use the existing frame, automatic packet loader,
notebook, bench models and challenges behind `lab-2`. No room, Brian, switch,
save or race file changes. Each packet owns its pictures, controls and animation.
Machine controls reuse `lab.clunk`; navigation reuses `lab.tick`; no new voice.
Pictures stay central, with thick arrows, kilograms and at most three captions.
Prediction pictures have no floating captions. Existing challenge gates keep rewards.
The bench-input binding line in `lab-view.js` is the only challenge wiring edit:
an optional `values` list maps a material dial's number to the bench's material.
Other controls retain their existing values. No room registration is needed.
One line in `lesson-ui.js` hides an older external challenge card during another
lesson, word help or the notebook. It does not disarm that challenge.

Truth takes priority over illustrative numbers in the prose. Equal-weight bars
use `loadBar`: the thicker aluminium bar outlasts steel, unlike section 12.6's
example. The hook uses `hookArm`, its safety margin and `lightestArm`, not an
invented 60 kg arm. Rust uses `jarAfter` and `rustOf`; the existing protection
challenge models a sheltered dry exhaust, so its correct choice remains bare.
The hot-exhaust paint warning is taught separately; changing challenge rules is
outside this lane. Claude should review these two source/spec differences.

Headings use actual pad legs and the map's 1,000 m unit, including the game's
north convention. The teaching model also shows the four cardinal directions.
G-force reads `lateralG`, the same calculation used by the lap monitor.

## Checks planned

- Pure behavior tests: every offered prediction against bench rules, picture
  answers, all five teaching stages, failed attempts and unchanged challenge goals.
- Memory-only browser flow through all four lessons, model controls, wrong-answer
  replays, help, challenge handoff and round-1 captures; no frame timing.
- Round-1 sheet, then lane tier with jobs 4 and production build, PowerShell
  with System32 first on PATH; one independent code review before integration.

## Changed assertions

No existing assertion or tolerance changes. The placement tool's `roundSheet`
classification gains only the card-required path
`docs/board/looks/lab-2/lab-lessons-workshop-[1-3].jpg`, following its existing
bounded earned-car naming rule. Raw captures still fail placement; the 500 KB
sheet budget and three-round cap remain. The new positive check proves the
required sheet is recognized. Claude's written review is requested on the card
before integration; this lane only commits.

The new workshop suite checks the
actual bar stress before calling a break, the safety reserve separately, radial
turn arrows, real GLB cross-sections and model ownership, along with prediction
truth and the complete frame flow. No signatures or replay numbers re-recorded.

## Removed

The automatic packet loader routes these four `lab-2` visits into lessons rather
than the old bench panel. The common old panel remains for switch-off play and
the other corner's lanes until LAB-LESSONS-2 switches over. No model is replaced.

## Results

Ten new pure checks passed (including the real GLB, 348 arm settings and the
card-named sheet).
Independent code review is clear after fixing map/ruler scale and direction,
picture distances, the difference between a safety reserve and a fracture,
visible arm thickness, radial arrows and the hanging weight's outward lean.

Strength's browser flow passed through its existing inline challenge and reward,
with real object clicks and thickness dragging, failed-try help and wrong-check
replays. First setup attempts incorrectly expected buttons on the door board;
they made no captures. The next run passed Strength and then its Rust walking
route hit the turning rig. The corrected route uses the clear aisle. One newest
continuation was stopped immediately because two older foreign heavy jobs
occupied both slots. No other session's processes were stopped.

The next browser run completed Rust, G-force and Headings, including their real
challenge handoffs. Its console caught an empty-drawing exception on Rust's
final key-idea card; the common mount now keeps the last pose without animating
an empty payload. The new no-throw check proves this case. The first Rust object
dial was hidden by the footer; it now sits above it, with projection checks.
The sheet also caught the previous G-force challenge card showing in Headings;
the one-line visibility fix and new browser assertion cover that transition.

Round 1 was written before the lane gate: one 491,702-byte JPG. Claude judges
it. The first 31-suite lane plan stopped on the previously unregistered required
sheet filename. Placement now passes. The targeted continuation covers the
changed UI and classifier, plus the unrun world guard: 23 suites passed, none
failed or left unrun (305.99 s). Earlier passing replay (225 checks) and smoke
results are retained. World signatures (47) and hygiene rules (150) passed.

The last Strength change normalizes dragged thickness through the bench before
evaluating or drawing it, so fractional inputs cannot disagree with whole-mm
bench settings. Its 21 fractional cases and all ten workshop checks passed in
the final targeted lane run (0.71 s). Independent review confirmed the fix.
The production build passed on this source (1.04 s); only the existing chunk
size and shared dynamic-import warnings remain. No signatures were changed.

The final-source Strength browser flow passed with no console issues or
warnings. Its following walk to Rust was blocked; the browser recipe now aligns
to the clear aisle after coasting stops. This changes no game code. The remaining
three lessons passed in the final continuation on private port 29111: 50
captures, zero warnings and zero errors. Rust's initial handoff timeout was a
QA pointer left over prose that appeared after the machine closed: its learned
word opened help and deliberately hid the reminder card. Moving the pointer
away before the handoff passed the same assertion. Failure diagnostics remain.
Strength's earlier final-source flow supplies its 18 captures; it was not rerun.
The final round-1 sheet is 491,239 bytes. Raw review captures remain until
Claude's verdict; disposable production and QA bundles were recycled.
Final board validation passed 194 checks; repository placement and
`git diff --check` passed after the sheet and status update.

Cockpit task `pers-the-duel/T-060` now names this card. The canonical integration
board sync set its status; the static fallback rebuilt. Its unrelated existing
mail/calendar feeds report that both Google profiles need re-consent.
No frame timing, merge, push or release.

Open for Claude: the round-1 look verdict, the two rule/prose differences above,
and written review of the exact sheet-path classification. This lane is ready
for that review, not a claim of art approval.
