---
task: UX-ENTRY-HINTS
status: ready-to-merge
kind: feature
flag: wasteland2
player_facing: yes
---

## Design before code

Validated against src/input-contexts.js and src/onfoot-transition.js on
30 September 2026. Keyboard F is the held interact control in both car and
foot contexts. Gamepad button 2 (X on the Xbox layout) is the held interact
control. Keyboard X is the car's left camera and has no foot action.

Use a small race HUD text panel. Show keyboard F and gamepad X explicitly,
so the shared X label cannot be mistaken for a keyboard control. In the car,
show both speed rules in one sentence: below 40 km/h, hold for 0.4 seconds
to step out;
at 40 km/h or above (including reverse speed), hold for 1 second to bail out
and lose 25 health. After exit, explain release first, then a fresh 0.6-second
hold within 3.5 metres. A fighter outside that range is told to move closer.
Temporary recovery prevents an available-action hint until recovery ends.
Both car rules stay visible while the car slows through 40 km/h; the player
can see the longer bailout hold and health cost before accelerating.

The pure onFootHint(duel) presentation helper returns text or null. It reads
the existing transition rules, tuning and car distance without changing state
or consuming randomness. Availability follows canLeaveCar and also requires
an initialized transition: wasteland2 Wasteland combat racing only, never
arena, ordinary, time trial, paused, countdown, results, practice, stunt,
chase, drift or checkpoint events. Null hides the panel and clears old text.
No new simulation behavior or sound event; existing exit/reentry cues remain.

## What changed

The Wasteland race HUD explains keyboard F and gamepad X, the 0.4-second
normal exit, the one-second bailout at 40 km/h or above and its 25-health
cost. On foot it explains release, the 0.6-second fresh hold and the 3.5-metre
reentry range. A distant fighter is told to move closer. Hints clear during
recovery and when this race cannot use on-foot rules.

The existing packed HUD statements and block markup were unpacked. Its
existing JavaScript behavior remains identical; the new helper and HUD hook
only read race state. Styling places the hint above the score and weapons.

## Evidence

- Test author committed acceptance tests and four seeded fingerprints at
  088062b before implementation.
- Baseline focused run: 1/15 passed; 14 failed because the helper and HUD panel
  do not yet exist. Existing exact-boundary simulation check passed.
- Focused acceptance after implementation: 15/15 checks passed, including the
  four frozen fingerprints. No assertion or recorded fingerprint was changed.
- HUD formatting check: parsed JavaScript matches the original AST after
  removing only the hint import and three-statement hook. Only whitespace
  between block markup elements differs.
- Private browser scenario onfoot-hints: passed on port 31684, memory-only
  saves, 6 captures, zero warnings and zero errors. Both High and Performance
  passed real keyboard F and gamepad X exit/release/reentry, keyboard X camera,
  hold boundaries, exact 40 km/h bailout (110 to 85 health), distance guidance,
  pause, ordinary/time trial, actual stunt objective and arena exclusions.
  The undiscovered temporary player disables the real race Wasteland rules;
  the direct headless flag-off case also passes.
- Desktop 1280 by 720 and phone 390 by 844 checks pass: text is inside the
  viewport and neither clipped nor overlapping the tested HUD panels. Desktop
  exit hint: x380/y456, 520 by 56 pixels. Phone distant hint: x16/y330,
  358 by 56 pixels. Builder viewed the desktop release and phone captures.
- First lane gate: 296 passed, zero failed/not run in 863.89 seconds. A browser
  check then found an overlap with the style score; the CSS correction was
  verified in the passing browser run above.
- Final required gate after the CSS correction: node tools/run-tests.mjs
  --tier lane --changed --jobs 8 passed 296/296, zero failed/not run,
  in 468.49 seconds. Replay fingerprints: 162 unchanged checks across 18
  cases, 16 events, eight categories, three FPS values and three runs.
- Final npm run build passed (455 ms Vite build). The existing large-chunk
  size advisory remains. No dependency, asset or runtime request was added.
- Independent read-only review by format_build: CLEAN on source commit
  5b58850. The reviewer checked the pure UI helper, state/input safety,
  unchanged replays and screenshots, and independently passed focused
  acceptance 15/15. The Director dispatches test_runner to verify the final
  evidence-only commit before merging; source remains frozen.
- An initial Chrome transport timeout left two disposable QA profiles locked.
  After their Chrome processes had ended, the builder removed only those exact
  profiles from verified Temp paths. The final browser run cleaned up normally.

Raw review evidence is in integration's
.evidence/2026-09-30/UX-ENTRY-HINTS/. It is deleted after the review verdict.

## Behavior and test changes

No simulation or input-rule changes. No existing assertion changed. New tests
compare hint reads against the test author's pre-implementation fingerprints.

## Removed

None. The hint adds presentation to existing transition rules.
