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

The new runtime props are 1,248,836 bytes; their Blender recipe is kept.
The original benches and hangar binary are reused. The lone room hook names
the existing first-aid cabinet; a scoped CSS line keeps the inline launch
reminder above prediction buttons without moving any other lesson's card.

## Removed

The new packets replace both old bench panels in Lab 2 through the existing
lesson discovery hook. Legacy Lab keeps its existing bench implementation.
No old runtime model is replaced or archived.
