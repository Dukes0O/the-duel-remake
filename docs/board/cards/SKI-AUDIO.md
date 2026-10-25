# SKI-AUDIO

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/HELI_SKIING.md`; this card names the slice, files and acceptance.

Codex (needs the voice service key in Kyle's environment). H5 section 8.
Switch `heli-skiing` (dev). Can start now.

- **Cues** from recipes (CC0 libraries or synthesis): `ski.carve`,
  `ski.skid`, `ski.wind`, `ski.gate`, `ski.pop`, `ski.land` (soft and hard
  variants), `ski.tumble`, `ski.powder`, `ski.step-out`.
- **Lines** (radio filter as usual): Roger for the lodge (the drop, "Clear
  to ski", the pickup, the group job's call and thanks, a missed-run "No
  harm done, I'll come and get you"), Brian for the thin-air line ("Thin air
  up here. Less air for the rotor to push. Lighten up: burn fuel or leave
  some behind."). About ten lines; Claude writes the final wording on this
  card before recording. Ids `ski.radio.*`.
- Sound-bank rows for all of them.

Owns: takes, runtime files, catalogue rows, `src/ski/ski-lines.js`,
`docs/changes/SKI-AUDIO.md`. Hooks: `src/sound-bank.js`. Locks:
`sound-bank`. Art: none.

Acceptance: a Node render check (peaks at most -1 dBTP; speech about
-18 LUFS); Claude listens to one packet (at most three rounds); lane tier,
build. Removed: nothing.

## Also record in this voice run (Claude, 24 October)

- Roger, id `heli.radio.table.spotted`: "Kestrel One, odd thing back there. Flat-topped mesa off your left, looked like a tower on top." (MAP-SECRETS emits the text; add one `HELI_RADIO_LINES` entry once recorded.)
- This voice run waits for Kyle: about 12,600 voice credits were left after LAB-RADIO on 24 October.
