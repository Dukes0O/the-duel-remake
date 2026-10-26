# RESCUE-FINISH

Rescue stays dev; helicopter stays on. Claude retains final review and release.

## Decision before code

Use on-screen fuel guidance for Summit avalanche jobs. The complete existing
flight needs two fuel stops: start area, then pickup beside the slide. Budget
remaining legs up to the next planned fuel stop (or handover after the pickup),
including the climb at 4 m/s and 60 seconds for approaches/hold. Calculate burn
from thin-air thrust, 330 kg departure fuel and the two-person load at 20 m/s.
Below the mountain point to the start-area truck when short; near the slide
point to the pickup truck when short. After enough fuel is bought, restore the
slide target. Explain the second stop in text. Guidance cannot guarantee fuel
for arbitrary hovering. Autopilot goals stay unchanged.
Show why a hold resets using its existing lifted/dragged/away event reason.
The playable finishing check then found that Summit had no rendered pump.
Expose the existing paid pump at either truck while on the ground. Offer the
existing recipe's tank targets 190/230/330/360/400 kg, plus fill. Show a clear
reason for lower or already-reached targets (including less than 0.1 kg room).
The Summit evidence recipe now selects and buys through the real DOM controls.
No recorded voice, save change, physics change or new dependency.

## Checks and findings

Complete flights below use Assisted mode, fixed seeds and ordinary pitch,
roll, collective, hook, radio, cruise, pump and autopilot actions. They start
at the home pad with a waiting call and finish at handover/payment. No
teleport, injected completion, player save, frame measurement or new voice.
The table uses a clue-only hiker search: 120 m parallel rows, stopping at 60 m
waypoints. It is cautious, rather than a claim about a human pilot's best pace.
The seed-known regression also passed (7:44.7, 207.0 kg, a42ce566).
Other rescue routes use seeded waypoints and verify the beacon/hold mechanics;
they are controlled flights, not a claim of blind human search testing. Browser picture flights are separate
from the complete headless flights.

| Rescue | Completed | Mission time | Fuel left | Finding | Fingerprint (FNV-1a) |
| --- | --- | --- | --- | --- | --- |
| Hiker, Woods (clue-only grid) | Yes | 14:01.4 | 23.1 kg | Hiker cold/hurt; 58.6 seconds left. Search and boarding instructions now written. | 415d77c0 |
| Avalanche, Snow | Yes | 6:55.9 | 184.3 kg | One lifted hold reset; the retry now explains why and how to recover. | 4363244b |
| Hoist, Ridge | Yes | 11:16.6 | 35.3 kg | Driver gets cold before handover. Low return fuel; no clock/physics retune in this lane. | 1ede265f |
| Supply, Snow fallback | Yes | 24:30.5 | 201.4 kg | Only 29.5 seconds remain; Claude should assess this fallback's pace. Written hook/release steps added. | 122f0304 |
| Avalanche, Summit | Yes | 23:24.9 | 35.3 kg | Both planned truck stops needed. Target and text now explain fuel stops; no truck autopilot routing. | 0e873fbb |
| Supply, Summit | Yes | 27:56.1 | 48.7 kg | Three crates delivered; truck top-ups to 230/230/190 kg keep loads liftable. | 997a19b3 |

Fuel is read immediately after the script's completion, not after a return
home that the job does not require. Mission time includes cruise time.
Full fingerprint strings and fuel/time records: ignored evidence flights.json.
Ordinary race replay and combat fingerprints passed unchanged.

Browser: rescue-view (four types) passed, 18 pictures, port 25154;
rescue-finish (Summit) passed, eight pictures, port 46813. Both headless,
High quality, memory-only; zero errors or warnings. The original four-type
pictures precede the final written approach instructions; Summit pictures
include the final runtime code. No art/model changes or fourth art round.
Sheet: docs/board/looks/heli-rescue-finish/round-1.jpg, 441,957 bytes.
The yard-only camera retake passed on port 58298: one picture, zero errors or
warnings. Raw pictures/reports: .evidence/2026-10-26/RESCUE-FINISH/{browser,summit,yard}/.
The first extra yard leg failed with the static waypoint camera-flight recipe;
the tested terrain-following cargo controller fixed the recipe. No game rules
were changed for that failure. The final yard shot faces the delivery circle.
The retained sheet recipe is tools/art/rescue-finish-sheet.py.

Independent code review: clear after fixing the initial fuel estimate's
burn/second-stop fault and clarifying the fallback yard wording. Final QA
search and sheet recipe reviewed clear too. No heavy jobs run by reviewer.

Verification complete (PowerShell; System32 first on PATH; at most four jobs):

- First lane attempt: 51 passed, one sandbox FFmpeg EPERM, four unrun.
- Final runtime source: lane tier with --changed --jobs 4 --json: 49 passed;
  the sheet's initial flights.jpg filename failed placement; six unrun.
- Renamed the sheet to the required round-1.jpg. Existing runner, jobs 4,
  selected only that failure and six unrun checks: 7/7 passed, zero unrun.
  Thus all 56 checks in the lane plan are covered, with no remaining failure.
  FFmpeg evidence analysis passed with access to the installed tool.
- Rescue regression 442 checks plus the additional clue-only hiker flight;
  view 209 existing plus 12 new checks; Summit arrival 38; Summit tune 118.
  Race replay guard: 225 unchanged checks. World composition: 47 exact checks.
- npm run build passed (541 modules, 2.20 seconds). Existing chunk-size and
  mixed static/dynamic import warnings remain; no build error.
- Independent review clear, including actual fuel-control reachability and
  clear lower/equal/sub-minimum fuel target refusals.
Receipts: final-lane.json (49 passes), remainder.json (7 passes), build.log,
flights.json and browser report.json files under this card's ignored evidence.
No frame check or voice recording. All admission checks used FACTORY section 8;
no foreign job was stopped. Temporary QA/build output is recycled at session end.


## Changed assertions

No existing assertion was changed or loosened in this lane. Added checks:

- Summit arrival: insufficient fuel points at the start truck, both text
  surfaces explain it, an insufficient 1 kg refill keeps it, and a refill
  to 330 kg switches target/text back immediately (eight checks), plus two
  checks that the pump and partial target are rendered.
- Summit tune: before/after the second truck refill, the target names the
  pickup circle then the slide (four checks).
- Rescue view: each lifted/dragged/away reset names its cause and remedy
  (three checks). Nine more checks cover fill/target controls, five tank
  choices, the paid first truck fill, and no truck purchase in the air or
  away from the circle. The browser verifies real DOM purchases and the
  clear lower-target refusal.
Optional evidence logging and the clue-only search add no relaxed expectation.
Part 1's previously accepted assertion change is historical: cable endpoint
changed from the old raised hand (2.22 m) to the loaded model's hook/chest
geometry, with the same 0.05 m tolerance and a new hook-height check.

## Removed

No runtime assets replaced. The old home-only pump restriction is replaced
in place; no old fuel path or duplicate handler remains. The temporary QA
bundle, production build and one-off remainder runner are recycled after use.
The superseded blank yard capture is recycled; the final view is in yard/.
Raw pictures and receipts remain for Claude's finishing review.

## Earlier part 1 findings carried forward

Part 1 removed the unused debris model, rebuilt the rescuer/pair poses, drew
the stranded car, and kept delivered crates visible. Its round 3 sheet and
accepted pose/cable assertion change remain in heli-rescue-view. The scene now
shares vehicle assets, and SUMMIT-HELI-RESCUES supplies the matching recovery
car id (covered by its existing test). Still open: the hanging casualty uses
the driver model for every rescue. This lane does not alter accepted art.
Claude still owns the final look verdict, frames, switch-on and release.

## Still open for Claude

Final look/feel verdict and frames before switch-on/release. Review the narrow
margin in the cautious hiker search, Ridge hoist and Snow fallback supply
clock; this lane changes no timing or balance numbers. The casualty model
limitation from part 1 remains. No merge, push or live installation in this lane.

## Claude review (26 October 2026)

Approved: only checks were added; nothing changed or loosened. Merged with rescue still dev; tuning for a child is on the card.
