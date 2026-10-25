# LAB-FAN-VIEW

Status: built, checked and independently reviewed. The arena follow-up is
green; verification is recorded below. No merge or push.
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

The original UI work changed no existing assertion or tolerance. The arena
follow-up below repairs historical roster assertions and adds a full-roster
pin, with every old hash and tolerance retained. New `lab-fan-view` scenario
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
  The follow-up below now repairs the fixture's cause. No physics or
  threshold was changed to hide it.
- The other lane failure was `test-test-runner`'s changing suite inventory:
  the sound regression file was added while the first lane run was active.
  Its one stable-inventory rerun is recorded below. This was a build-process
  mistake, not a game behavior change.
- Final audio delta: lane tier `--changed --jobs 4 --filter lab-view
  --filter lab-fan-view`: 2/2 suites pass, 5.20 s, zero unrun. This covers
  all 30 existing Lab view checks and the four new fan-view checks.
- Stable-inventory `test-test-runner` rerun: pass, 203 checks, 506 suites
  discovered. No test assertion or tolerance changed in that retry.
  Arena-shove was the sole unresolved suite from the original selection;
  the follow-up below records its fix.
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

## Arena run-up follow-up (Claude, before merge)

Design settled before code: the failure is fixture braking, not the electric
gear, launch curve, speed ceiling or fan grip. The pinned CPU attacker takes
one native pilot step near the wall. Wall sense brakes in that step. The
fixture starts every car 1.1 mph above its 20/40 mph contact threshold, which
covered the previous strongest brakes (Jesko: 1.001 mph lost per 1/120 s).
Factory-maxed Speirling braking is 2.2 × 1.54 = 3.388. One pilot brake step
loses 52 × 3.388 / 120 = 1.468133 mph. Starting at 21.1 therefore gives
19.631866 mph; starting at 41.1 gives 39.631866 mph. Native probes reproduce
both numbers exactly. Player attackers coast in this fixture and need no
new allowance.

The fixture will budget the CPU's actual native brake step plus 0.01 mph,
with the existing 1.1 mph minimum. This increases only the Speirling's CPU
run-up allowance; every other car retains its existing speed and goal.
The real pilot, swept contact and measurement window remain in use. No
game rule, launch, car value or contact/movement threshold changes.

The full suite also exposed historical solver checks that accidentally
treated the later fan car as part of every old roster. Keep the old pins
and their actual era rosters; add a separate all-current-car pin including
the Speirling. The car stays in every current mass-pair test. No old pin
is regenerated. This is assertion coverage for the new car, not a reduced
roster or a relaxed solver expectation.

The lane found the same era-roster bug in `test-arena-junk-shove`. Its five
historical checks get the same repair, with a sixth check for all 14 current
cars against the new fan pin. All junk motion, damage, road replay, energy
and momentum assertions stay intact. No old pin or tolerance changes.

Requested checks: complete arena-shove, LAB-FAN, replays, lane --changed
with four workers, production build, one independent review. Results follow.

- `node tools/test-arena-shove.mjs`: 133/133 tests pass, zero failures or
  skipped tests, 228.35 s. The new test proves every previous car retains
  its 1.1 mph margin, every player still coasts as before, and the CPU fan
  gets enough allowance for its actual brake step. The previously failing
  pinned 20 mph matrix and both normal-wall sides also passed a focused
  preflight before this complete run.
- `node tools/test-lab-fan.mjs`: pass. Launch remains 2.400 s, quickest
  inside the unchanged FIX-LAUNCH range. All earlier-car data, Lab on/off
  race equality, grip, price/save boundaries and accepted model checks pass.
- `node tools/test-replays.mjs`: 225 checks pass across 25 cases. No replay
  fingerprint changed.
- `npm.cmd run build`: pass, 817 ms; existing chunk/import notices only.
- Independent review: CLEAR. Confirmed every earlier car's setup is
  unchanged, native pilot/contact stay active, and all 14 current cars stay
  tested. No runtime rule, save or car data changed.
- Lane tier `--changed --jobs 4 --keep-going`: 46/47 suites pass, zero unrun,
  232.90 s. The only failure was the junk suite's five historical-roster
  assertions above. Preserve all 46 passing suites; its focused lane retry
  after that repair passes 1/1, zero unrun, 3.26 s (74 junk checks, zero
  failures). All 47 selected suites are now covered by passing results;
  the 46 unchanged passes were not repeated. The production build remains
  valid: only this test's roster assertions and notes changed afterwards.
- Final independent delta review: CLEAR, no assertion weakened. Confirmed
  junk's current 20/40/60 mph mass tests and all motion, armor, containment,
  road, momentum and energy assertions remain intact. Both suites construct
  the same all-14-car solver inputs, so the shared new hash is valid.
- Session-end sync: zero Cockpit task changes; STATUS refreshed. Run-owned
  probes, build output and raw logs recycled after recording results.

Changed assertions in this follow-up: the historical 9/10/11/12/13-car
solver checks again name their true era rosters, keeping every old hash
verbatim. The new full 14-car solver assertion pins
`4eadd8188e3ccb9ceb4a94c216e9b24273e18d4921d1960081d56d5249f17d00`.
It adds Speirling coverage; it does not replace or loosen a historical
assertion. Claude's written assertion review belongs on the card before
merge, per AGENTS 18. This branch makes no merge or push.

Removed in this follow-up: the fixture's assumption that 1.1 mph always
covers a CPU brake tick. No runtime path, asset or test case was removed.

## Claude review (25 October 2026)

Look passed (REVERSE, Project Fan and its true story, the scales demo, the build). Arena fixture change approved: the run-up margin now covers each car's own brake step (other cars keep 1.1 mph), the 20 mph contact and 1.5 m displacement thresholds are unchanged, and a new full-roster pin includes the Speirling. Merge conflict in `screen-garage.js` resolved by Claude: kept the achievements shelf, added the Lab-built note with the correct separator.
