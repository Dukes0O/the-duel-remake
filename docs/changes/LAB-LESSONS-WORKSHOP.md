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

Round-1 review was resolved by Claude's verdict below; only round-2 pictures
await a verdict now.

## Round 2 — Claude's verdict and design

Claude approved the logic, words, predictions, hints and numbers, both rule/prose
differences and the exact sheet-path registration. Nothing was loosened. Claude
corrects LAB.md 12.6. Pictures were returned for round 2: named real objects,
close low three-quarter cameras, readings beside objects, thick force arrows
on the experiment, clear challenge cards and captures of loaded worlds.

Merged current integration `f4b8356e` first, merge `6cc099b4`. Its only conflict
was the generated STATUS snapshot; integration's version was kept for the merge.
No game-code conflict. The final lane snapshot is regenerated after checking.

The approved lesson packets and rule calculations are unchanged. One Blender
recipe builds paint and zinc cans, a salt sack, water jug, sealed empty jar,
named material bars, a cast weight, handwheels and a supply tray. Invisible
hit skins replace the visible cubes. Numbers project from the object, rather
than staying in a top strip; jar names and material names are model geometry.
The four-jar comparison keeps three numeric captions and prints Dry's zero on
its shelf tag. The key-idea card moves to the left, clear of challenge panels.

Independent review found and confirmed fixes for cached prop variants that did
not switch, the ruler's fixed hit skin, the floor-pan skin above its face and
Dry showing water. The 13 focused tests pass, including the original ten and
new real-GLB geometry/label/anchor, control-pose, map-bound and private-jar checks. A first browser pass
showed the grounded car target too low after the close camera move; the camera
now aims lower and the skin sits on the car rather than its floor contact.
No existing assertion or tolerance was removed or changed. Browser diagnostics are
expanded; the same success assertions stay, plus actual selected-model checks,
card/panel intersection checks and world-ready waits before challenge captures.

The first lane run found the new Blender recipe missing from the existing
output-placement registry. Added its runtime GLB path and the standard
`--paths-only` planning command, which exits before importing Blender or writing
files. The registry's existing assertions and tolerances are unchanged; its
normal coverage now includes this recipe. Independent review confirmed the fix.

Picture inspection also corrected the G-force car's height to the cradle's
roller tops, attached its cast weight to the real leaning cord and supported
the handwheels on pedestals. The comparison's weights hang at the bars' free
ends, follow their deformation and stay above the floor. Short arrow shafts
scale in width as well as length. The map pads use named H markings rather
than blank coloured squares. Jar nameplates sit in front of and below the shelf
edge; glass keeps its clear material when nails rust.
The marked map reserves an edge margin on its shared scale so the Snow pad's
whole H circle and name fit; grid, ruler, toy and destination stay aligned.

Capture-only retakes use `WORKSHOP_QA_WATCH_ONLY=1` after the normal all-four
flow. They run the real words and worked steps, then leave instead of repeating
already-passed trials. The normal scenario and its assertions are unchanged.
Retakes are picture evidence, not another full behavior pass. G-force uses the
real Pause control after the speed changes, with the car on the near side.
The new tag test checks rendered indices rather than unused positions shared
by glTF material primitives; this corrects its initial false failure without
changing any pre-existing assertion or tolerance.

### Round-2 Removed

Removed the visible yellow, blue, white and green cube controls, blank map pad
squares, old jar dot-tags, top reading strip and fixed ruler hit target. The
Blender library and marked map replace them in the
same change. No superseded prop GLB or .blend is retained. Round-1 raw captures
are recycled after Claude's verdict; its one sheet and verdict remain. Round-2
captures stay until judged. Existing bench models and game rules are retained.

### Round-2 results

The normal all-four browser flow passed on private port 39768 (68 captures,
zero warnings/errors). Picture retakes on port 55414 passed (36 captures,
zero warnings/errors); they were capture-only, not another behavior pass.
The final normal flow then passed on port 32487: 69 captures, zero warnings
and zero errors, including the real protection reward, loaded lap world,
loaded helicopter world and reminder/panel non-overlap. Its pictures replace
the strips too, so every final image shows this source. No game code changed
after that run. Independent code review is clear.

The sheet is 2800 × 2415 pixels and 450,256 bytes, below 500 KB, with four
large Watch captures and four small flow strips. The sole runtime prop GLB
is 2,612,008 bytes; its Blender recipe is kept, with no .blend or superseded
binary. The sheet was written before the lane gate and build. These checks
run in the shared heavy-job slots. The initial lane run passed ten suites,
then stopped at the missing Blender registry entry (fixed above). Its targeted
continuation passed 31 more before the sandbox blocked ffmpeg in the evidence
tool test. That test and seven unrun suites continued with process permission;
passing suites were retained rather than repeated. The final eight passed
(316.92 s), completing all 49 lane suites: 10 + 31 + 8, none left unrun.
The workshop suite passed all 13 tests; replay fingerprints passed all 225
checks across 25 cases. No fingerprint was re-recorded and no assertion was
loosened. `npm run build` passed (567 modules, 980 ms), with the existing
dynamic-import and large-chunk advisories. System32 was first on PATH, workers
were capped at four, and each heavy run checked the inbox and shared capacity.
Cockpit sync reported no changes; this card is mapped to `pers-the-duel/T-060`.
The final status snapshot and whitespace check are included in this commit.
Generated build folders and temporary gate logs were recycled after checking.
No frame timing, outward
merge, push or release. Claude judges the round-2 sheet.
