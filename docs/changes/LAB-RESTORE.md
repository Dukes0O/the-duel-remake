---
task: LAB-RESTORE
status: done
flag: lab, the-deep
player_facing: no
---

# LAB-RESTORE: restoring the Falcone Sirena on the Rust bench

Cloud session (Claude Sonnet 5.5), 25 October 2026. Card `docs/board/cards/LAB-RESTORE.md`; design `docs/LAB.md` section 7 and
`docs/THE_DEEP.md` 6.2. Behind `lab` and `the-deep` (both dev): with either off nothing shows and nothing is saved. The design lead
confirmed all five design picks in writing (on the card, "Claude answers").

## What it does

- **The offer** (`src/lab/restore.js`, pure): on the Rust bench, when the Sirena is raised and waiting (`sirenaState` is
  `waiting`) and the Rust lesson is passed, "Restore the Sirena: 2,500 CR". Short of credits the button is disabled and says how many
  more. Waiting but Rust not passed: a note says to pass it. Not raised, or either switch off: nothing shows.
- **The one save step** (`restoreSirena`, through `app.labCommit`): 2,500 credits go and `falcone_sirena` joins `unlockedCars`
  together. **No new save field** (nothing in `profile.lab` or `profile.deep`); nothing the player has is removed or changed, only
  those two fields (and, as for any bought car, an upgrade record for the still unowned Sirena is cleared). The garage's own
  DEEP-SIRENA-VIEW states read the list, so the panel goes from "Needs the Lab" to "Restored. Race the Coast Cup at Pacific Canyon"
  with no new state. Paid once: a second restore is refused and returns the same profile.
- **When it is paid**: at the start of the sequence, so closing the Lab or the tab mid-way loses neither the money nor the car.
- **The sequence** (about 60 s, `stageAt(seconds)` is the whole of it as a function of time): soak in fresh water (the salt
  readout falls from 100% to 4% over a fast-forwarded 26 weeks, marked "fast-forward"), the current with fizzing bubbles
  (`lab.fizz`), stripping, rebuilding (the car in primer grey replaces the wreck), the red paint and then the white stripe and
  roundels. The first, paid run has no Skip and plays Brian's `restore.start` and, at the end, `restore.done` (caption always on).
  Once restored, the Rust bench offers "Watch the restoration again": free, with Skip, no Brian lines. Escape or the tabs end the view
  at any time; nothing is lost because the car is already the player's.
- **The room** (`lab-scene.js`): a freshwater tank (steel posts, glass panes, water) on the open floor by the hangar door;
  SIRENA-ART's `wreck.glb` and `createSirenaVehicle` inside; 70 pooled bubbles on a deterministic path; the camera comes to the tank.
  Everything is released on dispose with the rest of the room.
- **Hook**: `src/lab/lab-view.js` and the markup (`lab-markup.js`); `lab-ui.css` for the panel.

## Tests and gates

After merging current `integration/wasteland` (clean), once:

- `node tools/test-lab-restore.mjs`: 11 tests. Offered only in that state (each switch, not raised, Rust not passed, junk
  profiles); disabled with the shortfall; **paid once and the car owned after, every other field exactly as it was** (the profile it
  was given is not changed, the cars the player had stay in order, the saved shape reads back through `normalizeProfile`); every
  refusal returns the very same profile; the stale-upgrade rule; the Coast Cup still settles and the replay stays on offer after
  it; the sequence is five stages and 60 s with every reading moving the right way and every value inside 0 to 1, for any time
  (NaN, negative, huge); the run panel; through the real app (`labCommit` once, not twice, with a switch off); and the tank, wreck,
  car and bubbles follow the sequence and are all released.
- Browser scenario `node tools/browser-harness.mjs scenario lab-restore` (private port, memory-only saves): the garage shows the
  Sirena under a sheet ("Needs the Lab"); the Lab tab leads in; the Rust bench shows "Restore the Sirena: 2,500 CR"; pressing it
  takes exactly 2,500 and puts the car in the garage once at the start; the run has no Skip; Brian's first line shows as a
  caption; the salt readout falls (82% to 12% to 4%); the sequence takes 60 s; Brian's second line; the garage now reads "Restored.
  Race the Coast Cup at Pacific Canyon"; the replay is offered with Skip and charges nothing. 0 errors, 0 warnings.
- Look sheet: `docs/board/looks/lab-restore/round-1.jpg` (158 KB) and `round-1-review.md`.
- Lane tier `--changed`, `npm run build`: see the end of this note.

## Removed

Nothing replaced and nothing removed.
