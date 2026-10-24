# DEEP-RADIO

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Codex (needs the voice service key in Kyle's environment, so the laptop).
THE_DEEP section 6.7. Switch `the-deep` (dev). Can start now.

- Record Ana's 16 lines (6.7) with a fourth stock voice, warm, not used by
  the crew, the helicopter radio or the instructor (Matilda if the service
  offers it; name the pick in the change note). Same settings as the
  helicopter lines. Takes in `audio-src/voices/`, one catalogue entry per
  line (text, file, hash) in `tools/audio/catalog.json`, runtime files in
  `public/assets/audio/voices/` through a build step
  `tools/audio/build-deep-phone.mjs`. Stay within the month's voice
  credits; if they run out, stop and say so on the card.
- `src/deep/deep-phone.js`: the radio chain from `src/lessons/radio-voice.js`
  plus a slow warble (pitch wobble about 0.3% at about 2 Hz) and a soft
  bubble bed, so it sounds like speech carried through water.
  `src/deep/deep-phone-lines.js`: ids to files and captions.
- One line in `src/sound-bank.js` maps the phone lines.

Owns: the files above, `docs/changes/DEEP-RADIO.md`. Locks: `sound-bank`.
Sound: the 16 `deep.ana.*` lines. Art: none.

Acceptance: every line plays through the chain in a Node render check
(peaks at most -1 dBTP, speech about -18 LUFS, like the helicopter radio);
Claude listens to one packet of all 16 (at most three rounds); lane tier and
build. Removed: nothing.
