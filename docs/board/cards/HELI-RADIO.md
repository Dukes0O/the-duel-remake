# HELI-RADIO

Brian's radio lines with the radio filter, and the helicopter's sound cues.

Owner: Claude (AUD). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 7 and 8 of the packet. Lines through `tools/audio/elevenlabs.mjs`
(stock voice Brian, fitted to the month's credits), library sounds through
`tools/audio/freesound.mjs` (CC0 first). Files: `src/heli/heli-audio.js`,
cue lines in `src/sound-bank.js` (holds `sound-bank`), catalog rows,
`audio-src/` takes. Never touches mastering (`audio-mix`). No lock: the
cue list lives in `heli-audio.js` and HELI-HOOKS adds the one line that
maps it into `src/sound-bank.js` (re-sliced 14 October 2026).

## Claude answers

Choices made while building, in plain words. Change any of them after listening.

- **Rotor sound.** It gets lower and slower as the helicopter gets heavier.
  Empty with a full tank it plays at about 95 percent of its recorded speed;
  at the heaviest takeoff (3,130 kg) about 82 percent. It also follows the
  rotor: at half rotor speed the pitch drops to about two thirds and the
  sound dulls, and below 2 percent rotor speed it goes silent. A heavy
  helicopter is a little louder.
- **Wind.** Silent when standing still, louder and brighter as airspeed
  rises, and it stops getting louder at 60 metres per second (the top speed).
- **Engine start** plays when the engine turns on. **Engine stop** plays when
  it turns off, except after a crash (the thud covers it) and the loops stay
  off until the next engine start.
- **Radio.** Voice band 300 to 3,000 Hz, a gentle soft clip for crackle, a faint
  hiss while the radio is keyed, and a 14 millisecond click on and off. One line
  at a time, in order, with a short breath between lines. A line asked for twice
  within 6 seconds is ignored. At most 8 lines wait.
- **The instructor reacts on his own** to low fuel, engine out, crash, a
  dropped load and a cargo hit, and to a hard landing. The session may also ask
  for these lines; the repeat rule stops doubles.
- **Voice takes.** Brian at the same settings as the crew voices (stability 0.4,
  similarity 0.8, style 0.35). Each line was made once; no retakes were needed.
- **Chime and horn** are made from tones: a two-note falling chime, played
  twice, and three short blasts of a buzzing horn at about 330 Hz.

Listening request: please judge the helicopter sounds and the radio together
(see the list at the end of `docs/changes/HELI-RADIO.md`). Round one of at most
three.
