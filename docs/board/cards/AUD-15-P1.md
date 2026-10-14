# AUD-15-P1

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: AUD-15-P1
    title: "Bounded rival and traffic engine voices"
    lane: AUDIO
    size: M
    needs: [AUD-14, AUD-17]
    status: backlog
    owner: "Future audio lane; not started tonight"
    owns: [src/sound-bank.js, src/audio.js, tools/test-audio-vehicles.mjs, tools/scenarios/audio-vehicles.mjs, docs/audio/briefs.md, docs/changes/AUD-15-P1.md]
    hooks: [src/app.js, src/sound-mixer.js]
    acceptance:
      - "Before code, settle a bounded read-only actor snapshot, stable spawn identity, count/radius/priority limits and whether existing engine loops are suitable pending human listening. Proposal: at most three rivals and four nearest traffic cars within 250 metres; deterministic tie ordering and fade on leaving range."
      - "Use bank cues vehicle.rival-engine and vehicle.traffic-engine with per-car pitch data, 3D distance/direction and bounded doppler. A cap applies to real loop voices and graph resources; no silent duplicate loops on identity reuse or loading."
      - "Independent tests cover moving listener/actors, left/right, approach/recede, nearest selection, voice stealing, wreck/despawn/respawn, pause/menu/stage/flag-off cleanup and restart. Audio must not mutate simulation or saves."
      - "Keep the original flag-off waveform comparator unchanged. Record a private memory-only full-throttle near/far browser mix, resource/frame measurements and at least three measured listening rounds; mark missing human ratings explicitly."
    note: "Read-only preparation only. Kyle limited the current external session to AUD-10, AUD-11, kept gatekeeper, AUD-14 and optional AUD-17 candidates; it will stop after its final gate. Do not start this slice tonight or create another audio lane. Surface tires, scrapes/landings, convolution reverb, ambience one-shots and remaining arrival work need later AUD-15 slices. No new source downloads or credits are authorized by this card."
```

## Claude answers

Director packet question before code, 12 October evening: Kyle's new overnight order authorizes this card after LAP-CHOICE, superseding its older not-tonight wording. Please settle the proposed three nearest live rivals and four nearest live traffic cars within250m; stable identity plus distance/id ties, read-only snapshots, zero voices for wreck/despawn and cleanup on pause/menu/flag-off. Reuse existing engine-loop assets and per-car pitch, existing bounded doppler and spatial mixer; no downloads/mastering changes. Are these existing loops suitable donors, and what priority/gain/fade should rival-engine and traffic-engine use behind the player engine and impact/weapon cues? Please name the dev switch and whether one bounded listening round (maximum three, Claude judged) suffices instead of the historical at-least-three rounds/resource timing. Native mix/frame checks wait for the full check. Actual graph/voice resources remain capped at seven, including pending loads and fades; no simulated or save changes. This is a design question only, no claim/code/lane/check started.

## Claude answers (13 October)

**Claude, 13 October 2026, 08:40: settled before code.**
- **Voices.** The proposal is approved: the three nearest live rivals and four nearest live traffic cars within 250 m, with ties broken by distance then id. No voice for wrecked or despawned cars. All stop on pause, menu and switch-off.
- **Sounds.** The existing engine loops are suitable donors, with per-car pitch and the existing doppler and spatial mixer.
- **Mix.** Always under the player engine:
  - rival-engine: gain 0.35 of the player engine's level, priority below player engine, impacts and weapons;
  - traffic-engine: gain 0.25, priority below rival-engine;
  - 0.4 s fade in and out, and the farthest voice is replaced first.
- **Switch:** `rival-voices`, dev.
- **Listening:** one Claude-judged round (at most three) is enough. Kyle's play is the final ear.

The seven-voice cap including pending loads and fades stays. waiting_on is cleared.

## Director settled production hooks, 13 October

Claude's08:40 answer and Kyle's overnight order supersede the old not-tonight/at-least-three-round wording. Start only after Yeti releases busy-game-files; claim busy-game-files and sound-bank together. Own the files named above, plus feature-flags.js only the additive dev rival-voices declaration and start-preview.bat only its existing additive private-preview flag literal; existing feature-flag/preview tests may add the corresponding declaration expectation while preserving every old entry/order/launcher/QA-memory rule. App supplies a bounded read-only current actor/listener snapshot through its existing audio update path; no simulation/Game or save changes. If a stable existing actor identity or resource-safe mixer hook is missing, name the exact need before editing another file. Existing donor loops and bank registry are reused, mastering and downloadable assets unchanged. Three nearest live rivals/four traffic within250m, distance/id ties, zero wreck/despawn voices, seven real voices including pending/fades,0.4s fade, rival.35/traffic.25 below player/impact/weapon, cleanup pause/menu/off/stage. Keep flag-off comparator exact. One original nearby/jobs4/build and one independent code review; actual native mix/listening/frame acceptance remains unclaimed and deferred to the full check/Claude listening. No claim, lane or code starts in this note.

## Director read-only identity and mixer seam, 13 October

Actual App audio update already supplies course and listener. GP opponents have gp-index ids; ordinary opponents and traffic have no authored id. Their existing spawn arrays are replaced at stage start and retain spawn order. Use an authored actor id where present, otherwise its original spawn-array index, scoped to that array/stage identity. Keep the actual actor reference privately for replacement detection. Do not add ids, counters or audio fields to simulation or saves; never identify an actor by its rank in the distance-sorted audible list. Pending loads must carry the private stage/actor identity and be discarded after replacement, pause/menu/off or disposal. Generic traffic has no car field and uses the existing generic visual vehicle; use the existing fallback engine voice for it rather than inventing saved car data. Named rivals retain their actual car's pitch data.

The owned sound-mixer hook may add optional moving-loop rate, gain and fade controls needed for the approved0.4s transitions and real-resource cleanup. Existing playMoving callers keep their exact defaults,0.04s stop and cleanup behavior. Count pending, active and fading reservations together before allocating; starting a replacement must not temporarily create an eighth source/graph. Existing player/impact/weapon priorities and flag-off comparator stay exact. This is a settled packet, not a claim or code start; acquire both locks after Yeti.

## Director active claim, 13 October

Yeti and the requested camera source are integrated, both core locks released. Integration pull is current; camera's new lane and consumed owned green packets were recycled. Start the approved audio slice in new aud-15-p1, branch codex/aud-15-p1, taking busy-game-files and sound-bank together. The settled hooks and read-only identity/mixer packet above control. No save/finance/simulation or mastering change. Builder owns only the listed audio/bank/mixer/App snapshot hooks, named tests/scenario/brief/note and exact dev flag/private-preview admission. Additive existing test-feature-flags.mjs, test-wasteland-beta.mjs and current preview declaration assertions may admit only rival-voices without altering old entries/order/QA-memory/launcher behavior. Request an exact additional production file or source-content literal hook before editing it. No new generic machinery. One original nearby/jobs4/build and independent source review; native mix/listening/frame remain open for full-check/Claude. Root owns all shared metadata, merge and this new lane cleanup; preserve other builders' work.

## Director historical-bank test hooks, 13 October

The original source gate on e9ab0fd6 passed 250/253, with zero unrun. Only the three historical sound-bank projections failed. Independent review verified that all 153 previous bank rows and their order, and all other exports, are byte-exact. Removing only vehicle.rival-engine and vehicle.traffic-engine reproduces every original expected hash. No build or passing gate is claimed for that failed run.

Grant three precise test-only hooks: tools/test-arsenal-core-audio.mjs and tools/test-arsenal-wave1-audio.mjs may add only those two literal cue ids to their existing BANK_ADDITIONS lists. tools/test-p4-audio.mjs may exclude only those two ids from its historical bank projection; its existing added set and catalog/recipe validation filters remain unchanged. Preserve every original expected hash, projection shape, old-flag behavior, assertion, threshold and waveform comparator. No production or source-catalog change is authorized by this repair.

The owned tools/test-audio-vehicles.mjs must assert both complete cue descriptors, including all keys and values, so the new rows remain covered. Record the failed gate and this assertion change in the change note. Freeze the test-only repair for the same independent review confirmation, then run one corrected original unfiltered nearby lane tier with --jobs 4 and build. No new generic test machinery.
## Verified source integration, 13 October

Frozen 4d5e5cad9fd426f5bc65125b2b014f500f28bff4 passed the original unfiltered nearby lane 253/253, zero failures and zero unrun, exit 0, jobs 4; aggregate 1,606,229.5311 ms and wall 1,616,939.0285 ms. Build exit 0, Vite 1.37 s, wall 2,942.1528 ms. Independent source review and the same review's real menu-decode correction confirmation are CLEAR. The final five-file historical-test repair is independently confirmed: only the two literal new cues are excluded from the three old bank projections; all original pins, 153 prior rows/order, other exports, catalog filters, old-flag reconstruction and waveform comparator remain exact. The corrected gate includes both full new descriptor assertions alongside the 107 previously passed controlled checks.

The conflict-free source merge releases busy-game-files and sound-bank without another gate. The parent stays in review and rival-voices stays dev. Actual near/far browser mix, resource/frame measurements, unchanged waveform-comparator execution and Claude's listening verdict remain UNRUN; controlled nodes are not human listening acceptance. No simulation, save, asset, mastering, dependency or released-course change. Root recycles only this run's new audio lane/branch and consumed source-gate evidence after committing these verdicts; older retained lanes and pending art/native packets stay.
## Claude listening requested — 14 October morning

The already completed full check on 7ee1958a supplies the actual memory-only native mix; no repeat browser job ran. Packet: `.evidence/2026-10-14/FAC-03/night-99wbhD/browser/audio-vehicles/vehicle-mix.wav` and companion `vehicle-mix.json`, with report passed, port48512 and issues/warnings empty. The vehicle source/scenario is unchanged on current integration. Actual1034 frame rows,521 full-throttle near witnesses (4.760–18.131s) and595 far witnesses (4.760–20.080s); maximum5 resources against the7 cap, remaining0 after pause, memoryOnly:true. Both loaded rival and traffic donors are present. Loudness is -13.81LUFS and peak -5.64dBTP; the advisory loudness target reports false, which is disclosed rather than changed. No frame, isolated waveform comparator or human listening pass is claimed.

Claude: please listen to this real full-throttle near/far recording and give the card's one-round mix verdict. HumanListeningPending remains true; waiting_on:claude is set. rival-voices stays dev. Source review/gate/build receipts remain the accepted source receipts above; no source change or release.

## Claude answers - mix verdict round 1, 14 October

Not accepted yet: one real fault. Judged from the 04:00 recording
(`vehicle-mix.wav`, 20.5 s) and its 1,034 rows, measured in 0.5 s windows.

- **Every rival and traffic voice follows the player's engine, not its own
  car.** In every row, rival gain = 0.35 x `playerEngineLevel` and traffic gain
  = 0.25 x `playerEngineLevel`. At 12.41 s (player off the throttle) rivals 41,
  61 and 115 m away all read 0.07; at 12.96 s (player flat out) the same cars
  read 0.29 to 0.30. When the player stopped at 13.1 s, every voice fell to
  0.00 for about a second while rivals passed 13 to 25 m away; the recording
  drops to -41 to -44 dB from 13.5 to 14.4 s. A rival should be loudest exactly
  when it roars past a stopped or slow player.
- **Fix:** each voice's level comes from its own car (its throttle or speed,
  through the same 0.35 rival and 0.25 traffic ceilings) and its distance,
  never from the player's engine level or throttle. If distance falloff is
  done by a panner rather than in `gain`, say so in the change note; in these
  rows a rival at 17 m and one at 92 m carry the same gain.
- **Loudness:** -13.8 LUFS against the -16 advisory (2 LU tolerance) is just
  outside. Report the same recording's loudness with rival-voices off; if the
  voices add more than 1 LU, lower the two ceilings together until they add 1
  LU or less.
- Pass for round 2: one new recording of the same scenario, with a stop or
  lift in it, showing the voices holding their level while the player is
  quiet. Then Claude's verdict. rival-voices stays dev.
