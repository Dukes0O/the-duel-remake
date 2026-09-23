# Director decisions

Standing decisions D1-D7 are approved in [SPEC.md](../../SPEC.md), section 15.
This log is for choices the spec does not settle. Record the choice, reason,
and how to reverse it before continuing.

## 2026-09-22 PDT — FND-10/FND-11 order

- Decision: Use FND-10's integrated seven historical fixtures as the
  prerequisite for FND-11, then complete FND-10's storage-budget design with
  FND-11's verified pre-migration backup in place.
- Reason: Four valid archived ghosts exceed the 4 MB localStorage budget.
  Moving them safely requires a recovery copy before changing their storage
  format. The fixture work is complete; the budget work remains open.
- How to reverse: Revert the archive migration and keep the unmodified raw
  localStorage shape; the FND-11 export/import and backup feature can stand
  independently behind its development switch.

## 2026-09-22 PDT — BUG-10 D-pad direction map

- Decision: Up fires UFO swap, Right fires bomb storm, Down fires crossbow,
  Left fires star shield. Each weapon fires once per new press.
- Reason: This follows keyboard weapon order 1–4 clockwise from Up and leaves
  analog steering, pedals, camera, and gear controls unchanged.
- How to reverse: Change the mapping in `src/app.js`, its fake-gamepad test,
  and the HUD/help text together, then rerun the input and browser gates.

## 2026-09-22 PDT — FND-10 storage unit and scope

- Decision: Interpret the 4 MB budget as 4,000,000 bytes of localStorage
  keys and values across the whole game origin. Count UTF-16 storage bytes.
  Keep gallery images and automatic backups in IndexedDB, as the spec says.
- Reason: The spec allocates gallery images and backups to IndexedDB and
  allows up to 60 gallery images per player; a 4 MB limit on every storage
  system combined would contradict that design. Four valid archived ghosts
  already push the modeled localStorage origin to 4.08 MB, so the hard budget
  still needs a lossless storage change after career backup is in place.
- How to reverse: Change the budget definition and rerun the seven save
  fixtures and the storage model before moving any production save data.

## 2026-09-22 PDT — FND-05 base

- Decision: Build the integration branch from the isolated green foundation
  commit that contains FND-04 and FIX-01..03.
- Reason: The checkout called `master` remains the live game. Its three known
  red suites make it an unsafe branch point for parallel work until these
  repairs land. Keeping it untouched avoids a source reload during a race.
- How to reverse: Move `integration/wasteland` to a later tested `master`
  commit before feature work; preserve the foundation commits as a separate
  branch.

## 2026-09-23 PDT — CMB-07 initial aim bounds

- Decision: For the first aimed-bolt implementation, cap homing at 12 degrees
  from launch direction and turn at no more than 90 degrees per second.
  Bombs inherit thrower motion and may lead at launch, but do not steer later.
- Reason: Section 3.2 calls for a small homing cone but gives no angle or turn
  rate. These bounds are narrow enough to keep misses and counterplay while
  allowing a bolt to track a car that changes lane during flight.
- How to reverse: Tune the two values in `src/wasteland-tuning.js`, update the
  CMB-07 tests, and rerun the crossbow hit-rate and Wasteland balance checks.

## 2026-09-23 PDT — SAVE-01 completed combat loss reward

- Decision: A completed armored Wasteland loss can earn the positive hit and
  wreck bonus, within the spec's 25% base-win cap. It does not debit saved
  credits. Abandoned or timed-out events earn no bonus.
- Reason: The approved design rewards combat actions and says saved credits
  are never taken by combat. A player who fights well but loses should still
  see that bounded reward. CMB-03 records actions; SAVE-01 alone changes money.
- How to reverse: Change SAVE-01 eligibility and rerun save migration,
  settlement-idempotence, result and balance tests before release.

## Entry format

- Date and card:
- Decision:
- Reason:
- How to reverse:
