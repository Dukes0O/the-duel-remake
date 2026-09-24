---
task: AUD-02
status: ready-to-merge
kind: sound-refinement
flag: wasteland2
player_facing: yes
scope: current foot weapons and roadside raiders
---

This is a bounded implementation slice of the sound direction in `SPEC.md`
sections 3.11 and 12.2. The earlier `AUD-02.md` measurement note remains
separate and unchanged. This slice does not complete the full sound card.
Integrated at `6898579`.

## What changed

The current on-foot RPG has a short launcher sound. Its direct hit and ground
burst have slightly different, positioned impacts. An RPG impact replaces the
large bomb blast sound for that event; bombs keep their existing blast.

Wrench repair has distinct start, completion and interruption sounds. An
interruption is emitted once when an active repair is released or disrupted.
The roadside warning and each raider shot also have short sounds. A shot
carries the raider's position so it pans toward the shooter.

These cues use the existing Web Audio noise and oscillator paths. They add no
asset, dependency, network request, save field, score event or race rule. The
new event fields describe sound only. Ordinary and flag-off racing keep their
existing weapon sounds.

## Checks

- `node tools/test-weapon-audio.mjs` passed: eight distinct foot and raider
  variants, four existing car cues, short source lifetime, bounded gain,
  spatial direction, ordinary racing, mute and pause.
- `node tools/test-onfoot-weapons.mjs` passed: 5 tests, including a direct RPG
  sound event and one interruption event for a disrupted repair.
- `node tools/test-raiders.mjs` passed: 4 tests, including shot position and
  unchanged player score ownership.
- `npm run build` passed. `git diff --check` passed.

No existing assertion was weakened. A full race mix recording and listening
pass remain open for the overall AUD-02 card, as do sounds for weapons that
are not yet implemented. No full suite or browser run is claimed for this
bounded slice.

## Current-action waveform verification (23 September 2026)

The active AUD-02 verification slice adds a reusable measurement gate and
extends the existing private `weapon-audio` browser scenario. It preserves
all four car-weapon assertions and WAVs, then writes eight named stereo WAVs
for the implemented foot and raider actions. No runtime source changed.
The independent red tests at `8e51328` first failed because the validator
module was absent; all 30 now pass without changing any test assertion.

The scenario renders isolated cue calls in real `OfflineAudioContext` graphs.
Raider warning is inline in `EngineAudio.event`, so its call uses a narrow
context proxy that reports `state: running` while binding Web Audio methods
to the real offline context. This bypasses the suspended-context guard only;
it does not copy the warning envelope. These captures do not establish live
game event delivery, perceived quality in play, timing against race events,
or whole-race mix balance. The separate production event-routing check passes.

Each capture uses 44,100 Hz, 550 ms, master gain 0.42 and fixed noise seed
1989. Measurements precede any lossy PCM effects: peak, whole-capture RMS,
left/right RMS, last active sample above 0.003, and nonfinite sample count.
The eight-cue gate requires stereo, unique complete cue names, peak at least
0.01 and at most -1 dBFS (0.891251), RMS at least 0.001, active duration
20–300 ms, zero nonfinite samples, and at least 1.5:1 RMS channel dominance
for the positioned cues. Low-level tails below the activity threshold are
not a duration measure; source lifetime remains covered by the event test.

| Cue | Peak | RMS | Active ms | Left RMS | Right RMS |
| --- | ---: | ---: | ---: | ---: | ---: |
| RPG launch | 0.054350 | 0.007471 | 158 | 0.007471 | 0.007471 |
| RPG direct | 0.061580 | 0.005849 | 144 | 0.002394 | 0.007917 |
| RPG splash | 0.045233 | 0.004552 | 142 | 0.001863 | 0.006162 |
| Wrench start | 0.045791 | 0.003306 | 75 | 0.003306 | 0.003306 |
| Wrench complete | 0.036642 | 0.005152 | 146 | 0.005152 | 0.005152 |
| Wrench interrupt | 0.022573 | 0.002581 | 80 | 0.002581 | 0.002581 |
| Raider warning | 0.025019 | 0.004388 | 192 | 0.004388 | 0.004388 |
| Raider shot | 0.038222 | 0.002213 | 72 | 0.002996 | 0.000906 |

All eight nonfinite counts are zero. Both RPG impacts favor the right
channel and the raider shot favors the left by about 3.307:1 RMS.

Focused checks passed: `test-weapon-audio-waveforms.mjs` (30),
`test-weapon-audio.mjs`, `test-onfoot-weapons.mjs` (5),
`test-raiders.mjs` (6), and `git diff --check`. Dependencies were installed
with `npm ci --offline`. The private browser harness built its QA bundle and
passed `scenario weapon-audio` on port 23077 with memory-only saves,
a disposable browser profile, zero warnings and zero errors.

The initial capture summary names source commit
`8e51328717989723fd7ede6d404b0e39be422e99` with `worktreeDirty: true` because
these tooling changes were being verified before commit. Runtime cue source
was unchanged. Its artifact directory, relative to this lane, is
`.qa-dist/browser-output/weapon-audio-2026-09-24T04-17-10-908Z/`, containing
12 WAVs, `weapon-waveforms.json` and `report.json`. The summary reports the
source commit and dirty state automatically on every run.

Independent audio QA, review and lane/build gates belong to the handoff.
Race fingerprints were not measured in this tools-only builder check; no
simulation source changed. The full AUD-02 card remains open for future cues
and whole-race listening.

### Independent verification handoff

On committed `660e352`, the required lane command passed 214/214 suites in
307.16 seconds and the production build passed. The lane command selected
the campaign shards too; this was its dependency fallback, not an extra run.
Independent code review found no blockers or changed existing assertions.

The fresh private capture at
`.qa-dist/browser-output/weapon-audio-2026-09-24T04-20-36-783Z/` reports
`sourceCommit: 660e3521ca677f32ec3470df14ba9a9211113216`, a clean worktree,
memory-only saves, and zero browser warnings/errors. Independent audio QA
decoded all twelve WAVs. Their measurements match the summary within PCM
rounding, with no saturated samples and the intended 3.307:1 channel ratios.
No listening tool was available; this is measured verification, not a claim
about perceived quality or whole-race mixing. Full AUD-02 remains building.
