# RESCUE-RADIO

Roger's, Sarah's and Brian's rescue lines and the rescue sound cues.

Owner: Claude (AUD). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet sections 8 and 9. Files: `src/heli/heli-radio-lines.js`,
`src/heli/heli-audio.js`, catalog rows, `audio-src/` takes. No lock; round
one of at most three listening rounds.
Also waits for FIRE-MISSIONS, the engine H4 joins.
