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
