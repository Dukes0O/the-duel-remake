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

## Carried from SKI-HELI (Claude, 25 October): the ids the helicopter session emits

The session emits these as `{type: 'radio', line: <id>}` (and the cue as `{type: 'cue', id: 'ski.step-out'}`); none is recorded or registered yet. Suggested wording, for Claude to settle before recording:

| Id | When | Voice | Suggested text |
| --- | --- | --- | --- |
| `ski.radio.drop` | landed on a drop pad with a ski drop or the group job in hand | Roger | Kestrel One, you are on the drop pad. Choose your run. |
| `ski.radio.clear` | stepping out to ski | Roger | Clear to ski. |
| `ski.radio.pickup` | stopped in the pickup circle, climbing aboard | Roger | Good run. Welcome aboard, Kestrel One. |
| `ski.radio.fetch` | a run left, the helicopter comes for the pilot | Roger | No harm done. I will come and get you. |
| `ski.radio.group.call` | the group job taken at the home pad | Roger | A guide and four guests for Summit Run. They are aboard and ready, Kestrel One. |
| `ski.radio.group.done` | the group home and the job paid | Roger | Everyone is home safe. The lodge thanks you, Kestrel One. |
| `ski.radio.thin-air` | the collective at its top, the helicopter still sinking above 3,500 m | Brian | Thin air up here. Less air for the rotor to push. Lighten up: burn fuel or leave some behind. |

The cue `ski.step-out` (boots on snow, bindings click) is in the cue list above.

## Kyle decided (26 October 2026)

"Hold the ski radio lines for now; on-screen text is fine." The sound
effects are merged; the `ski.radio.*` lines stay as on-screen text and no
voice credits are spent. The card is done. Recording them later is a new
card, only if Kyle asks.
