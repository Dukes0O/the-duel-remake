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
