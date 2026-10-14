# HELI-RADIO

Brian's radio lines with the radio filter, and the helicopter's sound cues.

Owner: Claude (AUD). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 7 and 8 of the packet. Lines through `tools/audio/elevenlabs.mjs`
(stock voice Brian, fitted to the month's credits), library sounds through
`tools/audio/freesound.mjs` (CC0 first). Files: `src/heli/heli-audio.js`,
cue lines in `src/sound-bank.js` (holds `sound-bank`), catalog rows,
`audio-src/` takes. Never touches mastering (`audio-mix`).
