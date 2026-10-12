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
