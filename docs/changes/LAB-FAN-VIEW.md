# LAB-FAN-VIEW

Status: built and reviewed; inherited lane failure blocks a green handoff.
Kind: UI. Switch: `lab`, remains dev.

## Design settled before code

The five completed wind-tunnel lessons reveal a small REVERSE control beside
the tunnel dial. There is no secret row or hint before then. REVERSE uses
`markReverse` through `app.labCommit`; the room winds down, reverses and dips
the car, then pins the accepted Project Fan sheet. Brian explains the secret
and the three historical facts in order, with captions.

Project Fan opens a fan bench. Its dial demonstrates 1,000 kg of weight plus
up to 2,000 kg of stationary downforce. Build costs 15,000 through the existing
atomic `buildFan` call. Ownership disables Build. The owned car appears in
the garage and player menu; existing air-only and home-pad rules apply.

Checks: lane tier --changed --jobs 4, production build, existing lab-view
browser scenario, and a new memory-only lab-fan-view scenario with a compact
secret/blueprint/finished-car sheet. One independent code review. No frames
or release checks in this card.

## Changed assertions

No existing assertion or tolerance changed. New `lab-fan-view` scenario
assertions cover four-lesson secrecy, the five-lesson room dial, saved REVERSE,
the scales jumping to 3,000 kg, the loaded accepted models, stationary fan
power, one 15,000 debit, duplicate purchase refusal, profile reload, garage
and player-menu selection, and home/away air restrictions.

New `test-lab-fan-view` assertions cover all 32 lesson subsets (also with
forged REVERSE), Lab off, stationary scale endpoints, one owned audio loop,
power changing its rate, stop/disconnect on close, cancelled late loads,
on-demand cue decoding, and mute/unmute recovery. Existing replay pins,
world signatures and rule values stay exact.

The task's room/garage requirement needs small drawing hooks in
`lab-scene.js` and owned-car hooks in `screen-garage.js` and `screen-menu.js`.
The shared generic inventories remain unchanged: no rival, locked row or
unearned fan car is added. The garage labels this car as built in the Lab.

## Results and review

- Independent review: CLEAR. Fixed live readout/status DOM writes to change
  only when needed. The final audio review found and confirmed the fix for
  opening muted then unmuting. No reviewer changed any file or reran gates.
- `lab-fan-view` browser scenario: pass, four captures, zero warnings/errors;
  `lab-view`: pass, four captures, zero warnings/errors. Both use private
  ports and memory-only storage. The final pictures precede only the local
  audio-loader/lifetime correction; no scene or visual changed afterwards.
- `test-lab-fan-view`: 4/4 pass, including final mute recovery.
- Lane tier `--changed --jobs 4 --keep-going`: 39/41 suites pass, zero unrun,
  319.89 s. `test-arena-shove` fails 37/132 cases: existing fan-car native
  closing speed is 19.631866 mph in a 20 mph fixture (and 39.631865 in a
  40 mph fixture); historical roster fingerprints also include the new
  fan. The reviewer traced all 172 imported files: none changed here.
  This needs a separate LAB-FAN arena-fixture/rules review before release;
  no assertion, physics or fixture was changed to hide it.
- The other lane failure was `test-test-runner`'s changing suite inventory:
  the sound regression file was added while the first lane run was active.
  Its one stable-inventory rerun is recorded below. This was a build-process
  mistake, not a game behavior change.
- Final audio delta: lane tier `--changed --jobs 4 --filter lab-view
  --filter lab-fan-view`: 2/2 suites pass, 5.20 s, zero unrun. This covers
  all 30 existing Lab view checks and the four new fan-view checks.
- Stable-inventory `test-test-runner` rerun: pass, 203 checks, 506 suites
  discovered. No test assertion or tolerance changed. Only arena-shove
  remains failing from the original lane selection.
- Final `npm.cmd run build`: pass. Existing chunk-size and shared dynamic
  import notices only. The first sandboxed QA build could not write Vite's
  temporary config in shared dependencies; the approved native-tool run
  succeeded without a source or test change for that access restriction.
- Scenario sheet: `docs/board/looks/lab-fan-view/round-1.jpg`, recipe and look
  verdict beside it. No world signature or race fingerprint regenerated.
- Session-end Cockpit sync: zero task changes. STATUS refreshed. No merge,
  push, live-game access or real-save access.

Lab audio file cues are excluded from startup loading. The view therefore
loads the two existing local files on demand. It owns and releases the fan
loop, changes pitch with fan power and cancels late playback after close.
Brian's four secret lines use the existing one-at-a-time voice/caption path.
No new audio asset, external service or dependency is added.

## Removed

No model, save shape or race rule changed or removed. No old implementation
was replaced. Run-created browser captures and build output are recycled
after their verdict and compact sheet are recorded.
