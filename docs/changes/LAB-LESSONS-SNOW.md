# LAB-LESSONS-SNOW

## Design settled before code

Two auto-discovered lesson packets own their words, predictions, animations
and machine controls. Reuse the launcher ramp and snow trays, close and low
in every teaching step. New named skier, wax blocks and snow cutaways come
from one Blender recipe. Three anchored captions at most; no top readout.
Persistent thick paths compare launches. Existing challenge rules and rewards
remain the authority, behind `lab-2`. Navigation uses `lab.tick`; launch uses
the existing `lab.splash` cue. Wax adds no new sound event.

Truth: `rangeOf` and `launchBench.run` supply launch results; `waxBench.run`
supplies tray times. Section 12.6's fastest/middle/slowest cannot be taught:
the two wrong waxes tie in the actual game. Pictures instead predict faster
or slower, with the tie explained. `waxRunResult` requires the right wax and
a finished run, not a silver time; the challenge wording follows that rule.
No physics or reward change is needed.

The green wall rectangle is the unlabelled green box at [8.8, 1.9, -8.92]
in `tools/art/lab-hangar.mjs`. Give it a fixed first-aid face in the room,
including teaching views, without replacing the hangar asset.

## Checks planned

- Pure tests: each prediction/check against the real challenge functions,
  the teaching flow, persistent paths and projected close-camera framing.
- Memory-only browser: both full flows, dial input, helpful failure, checks,
  inline launch goal and loaded ski challenge, reminder clear of controls.
- One lane tier with jobs 4, then build; independent code review and Claude's
  round-one art review. No frame timing.

## Changed assertions

The Blender generator list gains the snow recipe and its exact runtime path.
The existing registry, placement and no-output checks apply unchanged; no
generator or assertion is removed and no tolerance is changed. New tests
prove all predictions, the lower-landing flag and the offered camera bounds.
The hygiene allow-list also gains the exact card-named Snow sheet pattern,
limited to rounds 1 to 3. Claude's review of these expectation expansions
is pending; no existing allowed path changes.

## Implementation and review

Merged current integration `e06a27d3` into this lane before validation,
including the Flying lessons and their challenge-card placement.
Six new pure tests pass. They cover all offered angle/speed/air/landing
combinations, every wax/snow match, each picture answer, real teaching state,
the actual launch challenge and both true and false daily wax choices.

Independent review found and confirmed fixes for an unreachable pictured
flag, wide unanswered-check cameras, constant arrows, unclear wax selection,
landing height, incorrect failed-prediction advice and backward labels.
The launch speed arrow reads timed path samples; orange drag preserves the
real speed-squared change, normalized for visibility because speed and drag
have different units. No force numbers are shown. Initial camera images
found a hangar wall in front of the teaching view; both cameras now stand
on the aisle side. The selector is a named handle with keyboard access.
Review confirms resource ownership and late-load disposal; no open code fault.

The new runtime props are 1,335,804 bytes; their Blender recipe is kept.
The original benches and hangar binary are reused. The lone room hook names
the existing first-aid cabinet; a scoped CSS line keeps the inline launch
reminder above prediction buttons without moving any other lesson's card.

Native Launch flow passes through its real rewarded target on `10af3f96`.
Wax's initial flow passes teaching, but its ski-offer wait timed out because
the QA URL omitted Rescue, which App requires for Summit ski drops. The
continuation enables that existing prerequisite and checks Wax only; it
keeps Launch's green evidence. No game rule or wait limit was changed.

Wax pictures also exposed caption collisions and a far-side handle. The
three captions now sit separately beside their own trays; the named selector
and blocks sit on the aisle edge. Browser capture checks caption rectangles
for overlap and uses real pointer clicks on the selector. Cold and wet
cutaways change the actual coating halfway through Watch, with the bench's
own improved time; model instances are keyed by both id and model so those
cutaway replacements appear. The affected pure tests pass.

The first lane gate found a real drawing fault in graphics-free restoration
tests: the first-aid label assumed a 2D canvas existed. It now returns without
drawing when no canvas context is available. A new test covers missing and
null contexts; the existing restoration assertions stay unchanged. Resume
only failed and unrun suites, preserving unrelated green results.

## Final checks and handoff

- Frozen game source and final browser recipe: `d8222357` (wall-label fix
  `31b6c372`). Required lane command ran with System32 first on PATH, jobs 4:
  33 passed, one failed, 22 unrun in 231.27 s. After the real canvas fix, the
  failed/unrun suites plus the changed Snow suite all pass: 24/24, zero failed
  or unrun, 219.80 s. All 56 unique lane suites are covered; passing unrelated
  suites were not repeated. Seven Snow tests pass, including the new missing-
  canvas regression. Existing restoration checks pass unchanged.
- Replay fingerprints: 225 unchanged checks across 25 cases and three frame
  rates. World composition: all 47 exact checks pass. No simulation rule,
  seed, saved shape or reward rule changed.
- `npm run build` passes, 777 ms, System32 first on PATH. Only the existing
  shared dynamic-import and large-chunk warnings remain.
- Native Launch flow passes all words, worked steps, prediction/hint,
  three real dragged speed-dial trials, checks and the actual rewarded bench
  target. Wax's final continuation passes its whole teaching flow, real
  selector clicks, caption separation, checks and the existing slalom start.
  It waits for the wax-selected button to become enabled, then for skiing,
  loaded ski models, visual readiness and the hidden renderer loading panel.
  A transient instruction card is not a reliable model-loading witness.
  No wait limit or game condition was relaxed. Private port 11890; isolated
  memory-only saves; zero warnings/errors. The real challenge is pictured
  while running, with its reminder clear of every button and panel.
- Independent code review confirms all final fixes and resource disposal;
  no open code finding. No frame timing, outward merge, push or live game edit.
- Round-one sheet: `docs/board/looks/lab-2/lab-lessons-snow-1.jpg`, 430,080
  bytes, one large Watch per lesson plus a small full-flow strip. All 30
  full-size final captures remain under this card's `round-1` evidence folder
  for Claude. Claude's art verdict and the expectation-expansion review above
  are pending. Later changes are documentation, sheet and status only.
- Cockpit: created T-064 with `Board cards LAB-LESSONS-SNOW.` in its notes;
  the protected board sync set its status. The local fallback was rebuilt.
  Integration's unrelated HELI-VIEW-FRAMES mapping remains for its owner.

## Removed

The new packets replace both old bench panels in Lab 2 through the existing
lesson discovery hook. Legacy Lab keeps its existing bench implementation.
No old runtime model is replaced or archived.
Recycled 838,992,081 bytes of this lane's generated QA/build output and its
interrupted first Chrome profile. That profile was identified by its exact
Snow-only QA URL before removal. Final captures and handoff gate proof stay
for review. The read-only audit found no unused new module; its 141 existing
runtime candidates are advisory and were left for the Director, not deleted.

## Claude review (26 October 2026)

Accepted at look round 1: five coloured launch arcs from one launcher with
angle, speed, landing and flag on the objects; named wax blocks and snow
trays with temperature and glide time on each; the unlabelled green hangar
box is now a first-aid sign. The generator-list and hygiene-list additions
are approved (new entries under the existing checks; nothing loosened).
Snow, Flying, Workshop, walk, view, frame, Blender-output, hygiene and save
suites and the build pass on the merged result. Goes in the next release.
