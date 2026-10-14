# FIRE-RADIO

Sarah's and Roger's radio lines, a voice per line, and the fire sound cues.

Owner: Claude (AUD). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 10 and 11. Files: `src/heli/heli-radio-lines.js`,
`src/heli/heli-audio.js`, catalog rows, `audio-src/` takes. The cues reach
`src/sound-bank.js` through HELI-HOOKS' existing line, so no `sound-bank`
lock; never touches mastering. Round one of at most three listening rounds.
