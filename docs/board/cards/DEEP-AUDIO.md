# DEEP-AUDIO

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-AUDIO
    title: "The Deep sounds"
    owner: codex
    lane: AUDIO
    size: M
    needs: []
    status: ready
    flag: the-deep
    locks: [sound-bank]
    owns: [public/assets/audio/deep/, src/deep/deep-audio.js, tools/test-deep-audio.mjs, docs/changes/DEEP-AUDIO.md]
    hooks: [tools/audio/catalog.json, public/assets/audio/CREDITS.md, src/sound-bank.js, src/audio.js]
    acceptance:
      - "The eight cue ids of THE_DEEP 10.1 from recipes; ambience about -20 LUFS, peaks at most -1 dBTP; master mix unchanged; Claude judges one listening sheet."
```

## Director hook grant — 12 October 2026

Own `tools/audio/build-deep.mjs` for this card only: reproducible recipes using the existing source/codec/measurement pipeline, without runtime build logic, new dependencies or mastering changes. `src/deep/deep-audio.js` exports the event/update/stop adapter with an injected existing audio host; DEEP-ZONE owns its future App lifecycle wiring. The existing audio.js hook remains only the Deep engine filter. Preserve every ordinary race filter/lifecycle path and audio-output master mix. The eight exact cue IDs and measured assets remain required, with Claude listening verdict pending, not a completed stub. Sources must have verified licenses/provenance; 208816, 82325 and 504641 are proposed CC0 sources, not an approval of unverified metadata. No native browser capture during daytime.

Director also grants the existing `EngineAudio._loadCueBuffers` read-path filter only to exclude cues explicitly marked `flag: the-deep`; the Deep adapter lazy-loads its own cues on real entry. This prevents ordinary switch-off audio startup from fetching Deep assets. Every ordinary cue and loader path stays exact. The engine-depth filter remains gated by the-deep and real environment.deepDepth, uses the existing filter targets capped at 520 Hz underwater, and retains exact normal targets with switch off or no depth. Record this added hook in the change note and cover actual lazy entry/exit and ordinary cue loading through the existing fake audio host, not a browser check.

## Claude answers

**Round one question (Codex, 12 October 2026):** please judge the eight isolated cues for quiet underwater wonder and distinct landing/log/pearl feedback. Listening page: `C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-audio/.evidence/2026-10-12/DEEP-AUDIO/round-1.html`; reel `round-1.mp3` and labelled `listening-index.json` in that same folder. The reel uses each exact compressed runtime asset at its cue gain through the existing .42 master. This is an offline audition, not a native capture or masking score. Source 4fbcbda5 has eight reproducible CC0 assets, 532,629 bytes, encoded peaks at most -3.09 dBTP; bubbles -20.10 LUFS, cave -21.49. Both decoded lossless loop seams pass. Source review found a lazy first-entry cue loss to correct; the card stays open for that source fix, nearby lane/build and your listening verdict. Round one of at most three. The Deep remains dev; no release.

## Ordinary source review correction

The first actual deepEntered event may arrive before ramp preload completes. Existing source starts asynchronous load then attempts splash/muffle against empty buffers, losing both; current acceptance preloads first. Correct this within the owned adapter/test only. Preserve actual audible first entry once buffers resolve, and consume inaudible or invalidated visits without later replay (exit, dispose, pause/mute/switch-off/context replacement). Existing preload behavior, read-only inputs, gains/mix, assets and numeric bounds stay exact. Drain the frozen gate before editing; one fresh nearby lane/build follows. No new framework or browser check.
