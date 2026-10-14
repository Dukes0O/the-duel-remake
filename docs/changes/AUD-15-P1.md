# AUD-15-P1

The settled contract is three nearest live rivals and four nearest live traffic cars within 250 m, distance then stable ID ties. App supplies a bounded read-only snapshot with actual course/spawn-array/actor identity. Authored IDs remain unchanged; original array indices are privately remembered for actors without IDs. No simulation or save field is added.

Rivals reuse the existing high engine donor and actual per-car pitch; traffic reuses the existing fallback engine donor. Their gain is .35/.25 of the current player engine AudioParam level, including loaded main/body/intake and synth layers. All use the same existing engine output path. Priorities remain below player/impact/weapon, rivals above traffic. No new source, asset, download, mastering or dependency.

Seven reservations include pending loads, active voices and fades. A .4 s retirement holds its slot until actual source completion; replacements wait for capacity. Stage, actor-reference and spawn-array guards discard stale decode completions. Pause, mute, menu, off and disposal clear this layer. Existing moving-loop callers retain original gain/rate, .04 s stop and routing defaults; the original flag-off waveform comparator stays unchanged.

The actual test-first failure was the missing dev declaration. Tests first use existing-style controlled audio nodes for real mixer lifecycle, identities, spatial motion, gain reference and async races. Native mix, recording, resource/frame measurement and the Claude listening round remain pending; controlled checks are not listening acceptance.

The dev catalogue adds only rival-voices. Existing declaration assertions and Preview append only this flag, retaining all old entries/order, port and memory-only behavior.

## Removed

Nothing replaced. Legacy player engine and existing moving voices remain exact when rival-voices is off.

The new App receiver fixture initially omitted the existing Course.def/themeAt interface; only that new fixture was completed, with no runtime guard or assertion reduction. The existing audio brief has legacy encoded punctuation, so its new ASCII section is appended without rewriting any old bytes.

The final owned acceptance passes 95 controlled checks, including actual App wiring, current-array checks before the next audio frame, latest-listener pending binds, repeated identity replacements and actual source completion accounting. The deferred native scenario passes syntax checking only. No native mix, waveform comparator, frame check or listening verdict is claimed.

Independent review found a real late-decode menu fault before any broad gate: status changes to menu without another audio frame started seven old voices. The existing owned test reproduced 7 versus 0 before repair. Decode binding now checks current live status and paused state; the actual menu event immediately retires active/fading sources and marks pending reservations canceled. Pending budget stays occupied until decode completion. The new cases cover menu/paused changes before the next audio frame and real menu-event cleanup of active, pending and already-fading resources. All original controlled checks and legacy defaults remain unchanged.

The corrected affected acceptance passes 107 controlled checks; no native or broad gate has run before the correction confirmation.

## Historical bank guards

The original unfiltered lane on e9ab0fd6 completed 250/253 passed, three failed and zero unrun; exit 1, suite aggregate 1,186,525.8628 ms and wall receipt 1,192,665.4548 ms. No build ran. Only the historical bank projections in test-arsenal-core-audio, test-arsenal-wave1-audio and test-p4-audio failed because they included the two approved new vehicle cue rows.

Actual base/current object proof confirms all 153 prior rows and their order and every other export are byte-exact. Removing only vehicle.rival-engine and vehicle.traffic-engine reproduces the original core cc6d14d4b734baeff5104526ef4e3841fa24c6cc3051e59c37f488f5734afeb9, wave-one b63edbe579c7709c32af22b2467fa8706aee2585ed957c20fde8062064f7f2b4 and pre-P4 df5cf72de6db8a8f50273c78ae0e6dd349b6ed0ae32ff1ad37627ddbc8a725ba hashes.

Director grant 7fbc87b9 adds only those two literal IDs to the existing core/wave-one later-feature lists and excludes them only from the pre-P4 bank projection. Every original hash literal, assertion, old-flag reconstruction, catalog/recipe filter and waveform comparator remains unchanged. The owned acceptance pins both complete new descriptors, so the additions remain guarded. No runtime, source recipe, asset, mastering or tolerance change. Native mix/listening/frame and comparator execution remain unrun.

## Verified source integration, 13 October

Frozen 4d5e5cad9fd426f5bc65125b2b014f500f28bff4 passed the original unfiltered nearby lane 253/253, zero failures and zero unrun, exit 0, jobs 4; aggregate 1,606,229.5311 ms and wall 1,616,939.0285 ms. Build exit 0, Vite 1.37 s, wall 2,942.1528 ms. Independent source review and the same review's real menu-decode correction confirmation are CLEAR. The final five-file historical-test repair is independently confirmed: only the two literal new cues are excluded from the three old bank projections; all original pins, 153 prior rows/order, other exports, catalog filters, old-flag reconstruction and waveform comparator remain exact. The corrected gate includes both full new descriptor assertions alongside the 107 previously passed controlled checks.

The conflict-free source merge releases busy-game-files and sound-bank without another gate. The parent stays in review and rival-voices stays dev. Actual near/far browser mix, resource/frame measurements, unchanged waveform-comparator execution and Claude's listening verdict remain UNRUN; controlled nodes are not human listening acceptance. No simulation, save, asset, mastering, dependency or released-course change. Root recycles only this run's new audio lane/branch and consumed source-gate evidence after committing these verdicts; older retained lanes and pending art/native packets stay.