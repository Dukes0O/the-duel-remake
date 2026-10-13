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
