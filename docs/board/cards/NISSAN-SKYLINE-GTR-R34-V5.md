# NISSAN-SKYLINE-GTR-R34-V5: Nissan Skyline GT-R R34, V5 sound

Owner: codex. Lane: AUDIO.

## Prerequisites and graph

Claude must complete and approve [the packet](../../cars/nissan-skyline-gtr-r34.md) before this stage starts.

Needs: approved packet (V0).
Next: NISSAN-SKYLINE-GTR-R34-V6.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

Engine and shift sounds from the sound catalog recipe; loudness matched

Judge: Claude, by listening tool numbers.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## Build contract (28 October 2026)

Own `src/audio.js`, `src/sound-bank.js`, the two synthesis recipes in
`tools/audio/catalog.json`, audio tests and one Skyline browser scenario.
Lock: sound-bank. No simulation, save, roster or switch-state change.
Use the approved voice row and existing engine/shift donors. Synthesize the
continuous sine whistle and filtered-noise flutter through registered cues;
no new asset is needed. Only the Skyline row has a turbo setting, admitted
by `nissan-skyline`. Whistle follows revs from 4 to 7 kHz above .35 load.
Blow-off requires a lift below .2 from at least .7 throttle above .55 revs,
with 1.2 seconds between releases. Shift events do not trigger it.

Checks: `tools/test-audio.mjs` (wiring, voice rates, engine levels and six-second
mix), `tools/test-sound-bank.mjs`, and `tools/test-p4-audio.mjs` (old cues exact).
Browser: one memory-only Skyline audio scenario using the existing private
harness and recorded audio pattern. No frame timing or listening verdict.

## Claude review at handoff

The implementation and independent code review are complete. Results and
loudness numbers are in `docs/changes/NISSAN-SKYLINE-GTR-R34-V5.md`.
Claude must review the historical test projections before integration:
`test-p4-audio.mjs` excludes exactly the two new cues/recipes;
`test-arsenal-wave1-audio.mjs` excludes exactly the new Skyline voice.
All three old hashes remain unchanged. No old cue, recipe, voice value,
assertion tolerance or replay fingerprint changed. The new voice and cue
behaviour have separate checks. This paragraph requests review; it does not
claim Claude has approved the assertion changes or the sound numbers.
