# Gate arrival presentation round 1

Source: `0d54300`. Scenario: `3a16f85`. Private harness port: 24178. Ten screenshots, two actual real-time PCM recordings and aligned journey/cue logs are retained here. The browser run completed with zero warnings and errors. A first CLI attempt used the wrong harness syntax and exited before building; the corrected command was `node tools/browser-harness.mjs scenario hidden-road-arrival` with `EGG_ARRIVAL_ROUND=1`.

The scenario uses named pose fixtures at 100 m, 149.9 m and 59.5 m before the gate to avoid replaying the long approach. Production simulation performs departure, braking, opening and both choices. The real App loop supplies audio and rendering. High chooses Enter, pauses/resumes at the invitation and captures the phone layout. Performance chooses Turn back. Both navigate to the menu and check cleanup. These are not full-route continuous driving recordings.

Audio taps record the post-limiter mix and the pre-limiter engine/gate stems at master gain. PCM downsampling carries sample phase across buffers. Spectrograms show the actual captured gate PCM with dispatch markers. Measured mix peaks are -14.20 dBFS High and -13.39 dBFS Performance; isolated cue onset estimates are within 3–5 ms of dispatch. The gate stem is often quieter than the engine in 400 ms windows, so the mix needs independent judgment/refinement. These measurements do not imply a whole-race sound acceptance or a subjective listening result.

Independent source review found two presentation defects after capture: the legacy weapon-strip CSS selector uses an ID although the actual element has a class; and dialog title/copy text is rewritten on every frame. Round 2 will fix both. The focused Mad Max departure view requested for that fix is an addition to the same bounded scenario. This original round is retained unchanged.

Focused source checks before capture: presentation 10/10, Rustwall lifecycle 18/18, and existing audio/PCM 459 checks pass. No test assertions were changed. Independent visual/audio scoring follows this evidence freeze.
