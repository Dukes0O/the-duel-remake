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
