# AUD-15-P1: Bounded rival and traffic engine voices

Current scope, acceptance, decisions and retained evidence from the prior board.
The short entry in board.yaml controls status, owner, dependencies and locks.

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
