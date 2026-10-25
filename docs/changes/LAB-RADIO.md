---
task: LAB-RADIO
status: done
flag: lab
player_facing: no
---

# LAB-RADIO: Brian's Lab lines and the Lab's sounds

Claude (Sonnet 5.5 side session), 24 October 2026. Card
`docs/board/cards/LAB-RADIO.md`; design `docs/LAB.md` 4, 6, 7 and 8. Behind
`lab` (dev) and `helicopter`: nothing changes for players. Nothing plays the
lines or the Lab sounds yet: LAB-VIEW and the bench screens do, by id.

## Wording (section 8.1 of `docs/LAB.md`)

I wrote the 54 lines (the card asks for Claude's final wording before
recording) and added them as a table, `docs/LAB.md` 8.1: three for each of the
16 lessons (intro, explanation, pass), four for the secret, two for the
restore. Each explanation says only what its bench shows, and where the game
is simpler than the world it says so. What I changed from the section 4
table, because the LAB-BENCHES review found it untrue or not shown:

- Fuel and Suspension: no "brakes and turns better" and no "quick to turn"
  (the benches show 0 to 60 time, body shake and lean). Suspension says stiff
  springs shake the body harder and lean less, not that the tyre stays down.
- Grip: the tyre keeps all its grip up to 4.3 degrees, then loses it (no
  "lost time"; a long screech says grip is gone). G-force: the game allows
  2.5 to 3.5 g. Braking: the weight shift is shown at a gentle stop, the
  distances use full braking. Altitude: 75% true air, 71% in the game.
- Rust: no "paint keeps them out" (the bench has no paint jar). Projectile:
  no fall figures (the bench shows the stone and the water separately).
  Wax: no "3% faster" (the ski rules give a different figure).
- The Spéirling line says its name with the accent; Kyle should listen to how
  it is said, and to the 39.08 s record line.

## Voice

- Brian (`nPczCjzI2devNBz1zQrb`), `eleven_multilingual_v2`, stability .4,
  similarity .8, style .35, speaker boost: identical to the driving lessons
  and the helicopter lines (the test compares the settings). Clean: no
  radio chain.
- Credits: 6,321 characters, **6,745** by the take records (the
  estimate; it includes some lagging account readings). The account counter
  read 18,941 left before and **16,619 left** after, but it lags badly (it
  also moved by other sessions); by character count about 12,600 are left.
  Rate limits (HTTP 429) were waited out many times; no take was lost or paid
  for twice. Plan for about 12,000 credits for SKI-AUDIO.
- 54 takes, 394 s of speech, 6.36 MB (the same again in
  `audio-src/voices/`, as for every voice).

## Changed

- `audio-src/voices/lab-brian-*.mp3` (54 kept takes), 54 rows in
  `tools/audio/catalog.json`, the same files in `public/assets/audio/voices/`
  copied unchanged by `node tools/audio/build-lab-voice.mjs` (new).
- `src/lab/lab-lines.js` (new): the 54 ids with the design's exact words (the
  captions), file and fitted volume each; `LAB_VOICE_CUES` (voice bus,
  priority 90, limit 1, ducking like the other speech) and `LAB_CUES`.
- `src/lab/lab-cues.js` (new, a second file beyond the card's list): the Lab's
  sound-bank rows. `lab.burner`, `lab.snap`, `lab.creak`, `lab.splash`,
  `lab.tick`, `lab.clunk`, `lab.fizz` and `car.sputter` are tone and noise
  layers with no file, like the helicopter's chimes. `lab.fan`, `lab.reverse`
  and `car.speirling` are files.
- `tools/audio/build-lab-sounds.mjs` (new): makes those three files from
  recipes in plain code (a seeded generator, no recording, no library). The
  fan is a 120 Hz blade hum with harmonics over a rush of air (a four second
  loop of whole cycles). `car.speirling` is a 1,200 Hz motor whine with a
  beating 1,215 Hz partner and an octave over a loud fan roar that is there
  even standing still. `lab.reverse` is 6.4 s: blades slow from 130 Hz to
  nothing with a rattle, a pause, then spin up the other way to 170 Hz under a
  louder, lower roar. Rebuilding gives the same bytes (checked).
- `heli.buoy-hit` (water on a buoy, a soft bell) and `heli.retardant` (a slow
  heavy whump and thick rush) in `src/heli/heli-audio.js`, as layers with no
  file. The bucket's `pourStart` that carries `retardant: true` now plays
  `heli.retardant` (new rule in `HELI_EVENT_CUES`), and while retardant is
  poured the pour bed plays the same recording slower (rate .8) and duller
  (low-pass 2,400 Hz) than water; `fireSounds` in `src/app.js` passes
  `retardant` from the bucket's contents. Water is unchanged.
- `src/sound-bank.js`: one import and one spread, `...LAB_CUES`.
- `src/audio.js`: start-up loading skips `lab` cues like the helicopter's, the
  driving lessons' and the Deep's, so nobody downloads 6.4 MB of speech at
  start-up; the Lab loads its own sounds when it opens.
- `tools/audio/render-lab-cues.mjs` (new): a Node render of tone and noise
  cues (the envelope of `_tone` and `_weaponNoise`, seeded noise) for the
  checks. `tools/test-lab-radio.mjs` (new, 735 checks): lines match the
  design; every lesson has its three; the voice, settings, hashes, unchanged
  runtime copies and credits; every bench's named cue exists; start-up loads
  none of the Lab's files with the switch off or on; each line plays within
  0.5 LU of -18 LUFS; each layered cue renders with a peak between -16 and -3
  dBTP; the three files are Ogg, under -1 dBTP, on target, loops close and
  rebuild byte for byte; the retardant rule.

## Level and loudness (measured, not by ear)

- Every kept take peaks at **-8.4 to -3.0 dBTP**, under the -1 limit, and the
  takes are at -22.9 to -25.4 LUFS, the same as every other Brian take.
- The Lab voice is clean, so the radio chain does not lift it as it lifts the
  instructor (about -15 LUFS after the chain). Each line's cue `volume`
  (1.76 to 2.35, fitted per line) brings its take to **-18 LUFS**, the figure
  on the card, a little under the instructor and the gatekeeper (who plays at
  2.2 and about -16). At that volume the loudest peaks reach about +4 dBFS
  before the master compressor and ceiling, as the gatekeeper's do. If the Lab
  is too quiet next to the lessons, raise `LAB_VOICE_TARGET_LUFS` in
  `src/lab/lab-lines.js` (one number) and refit the volumes.
- The sounds are made to peaks of -15 to -5 dBTP (table below); their levels
  are guesses against the existing effects, and Kyle's ear decides.

| Id | Text | File | Length (s) | Take LUFS | Take peak (dBTP) | Volume |
| --- | --- | --- | --- | --- | --- | --- |
| `lab.brian.lift.intro` | Kestrel One is on the weighing pad. Add fuel and cargo, raise the collective, and see if she leaves the ground. | `lab-brian-lift-intro.mp3` | 6.5 | -24.5 | -5.6 | 2.11 |
| `lab.brian.lift.explain` | To hover, the rotor has to push the air down as hard as gravity pulls the helicopter down. More weight needs more push, and every rotor has a most it can give. | `lab-brian-lift-explain.mp3` | 9.4 | -24.2 | -5.0 | 2.03 |
| `lab.brian.lift.pass` | Good. Now you know why a heavy load is a hard lift. | `lab-brian-lift-pass.mp3` | 2.8 | -23.7 | -4.6 | 1.92 |
| `lab.brian.projectile.intro` | Pick a height and a forward speed, drop the parcel, and watch where it lands. | `lab-brian-projectile-intro.mp3` | 4.2 | -25.1 | -4.5 | 2.26 |
| `lab.brian.projectile.explain` | A dropped thing keeps the forward speed it had, so it lands ahead of where you let go. And it falls faster every second. Air slows a spray of water more than a stone, so water falls shorter. | `lab-brian-projectile-explain.mp3` | 11.0 | -24.5 | -4.6 | 2.12 |
| `lab.brian.projectile.pass` | That's your aim. Let go early, not right over the target. | `lab-brian-projectile-pass.mp3` | 3.4 | -24.1 | -5.6 | 2.01 |
| `lab.brian.fire.intro` | Three switches: gas for heat, wood for fuel, and a lid for air. Let's put the fire out three different ways. | `lab-brian-fire-intro.mp3` | 6.7 | -24.7 | -7.8 | 2.16 |
| `lab.brian.fire.explain` | Fire needs heat, fuel and air. Take away any one and it dies. Water takes the heat, a lid takes the air, a cleared strip takes the fuel. Retardant coats plants so they char instead of burn, so planes drop it in front of a fire, not on it. | `lab-brian-fire-explain.mp3` | 16.5 | -24.4 | -6.0 | 2.09 |
| `lab.brian.fire.pass` | Heat, fuel, air. Break any one and the fire is done. | `lab-brian-fire-pass.mp3` | 3.4 | -23.9 | -7.0 | 1.97 |
| `lab.brian.pendulum.intro` | Three weights on three strings, then a heavier weight on the same string. The stopwatch times every swing. | `lab-brian-pendulum-intro.mp3` | 6.1 | -25.3 | -7.9 | 2.31 |
| `lab.brian.pendulum.explain` | A swing takes longer on a longer string, and the weight makes no difference. Slow swings are gentler and easier to calm, but a longer cable needs more height. | `lab-brian-pendulum-explain.mp3` | 9.3 | -24.1 | -5.2 | 2.03 |
| `lab.brian.pendulum.pass` | A long cable swings slow, and a slow swing is easy to settle. | `lab-brian-pendulum-pass.mp3` | 3.7 | -23.8 | -5.0 | 1.95 |
| `lab.brian.altitude.intro` | A rotor on a test stand at sea level, at Panorama Ridge and at Summit Run. Measure its lift at each. | `lab-brian-altitude-intro.mp3` | 6.9 | -24.4 | -6.5 | 2.09 |
| `lab.brian.altitude.explain` | Higher up the air is thinner. At Summit Run each lungful holds about three quarters of the air it would at sea level, so the rotor has less to push on and the engine makes less power. The game rounds this down a little, to seventy one percent. | `lab-brian-altitude-explain.mp3` | 15.0 | -24.6 | -4.1 | 2.15 |
| `lab.brian.altitude.pass` | Thin air, less lift. Plan your load for the high country. | `lab-brian-altitude-pass.mp3` | 3.6 | -24.1 | -3.9 | 2.01 |
| `lab.brian.strength.intro` | Three bars of the same weight: aluminium, steel and carbon fibre. Load them until they bend or snap. | `lab-brian-strength-intro.mp3` | 6.5 | -23.7 | -5.2 | 1.93 |
| `lab.brian.strength.explain` | Aluminium is about a third the weight of steel, size for size. Carbon fibre is lighter still and very stiff, but it snaps instead of bending. Engineers choose by what the part has to do. | `lab-brian-strength-explain.mp3` | 12.1 | -24.1 | -3.9 | 2.01 |
| `lab.brian.strength.pass` | That arm holds the load for the least weight. Well chosen. | `lab-brian-strength-pass.mp3` | 3.4 | -24.9 | -6.5 | 2.23 |
| `lab.brian.rust.intro` | Four steel nails in jars for a week. Dry air, fresh water, salt water, and one with a zinc coat in salt water. | `lab-brian-rust-intro.mp3` | 7.6 | -24.4 | -5.4 | 2.08 |
| `lab.brian.rust.explain` | Iron rusts when water and oxygen reach it, and salt water makes it rust much faster. A zinc coat rusts first and saves the steel under it. | `lab-brian-rust-explain.mp3` | 8.9 | -24.4 | -5.4 | 2.10 |
| `lab.brian.rust.pass` | Right protection for the right part. That's how you keep metal alive. | `lab-brian-rust-pass.mp3` | 4.2 | -25.0 | -7.7 | 2.24 |
| `lab.brian.gforce.intro` | A car on a turning arm. Set the speed and the radius, and watch the weight on the string lean. | `lab-brian-gforce-intro.mp3` | 5.5 | -24.3 | -4.0 | 2.06 |
| `lab.brian.gforce.explain` | In a corner the car pushes you sideways. One g is a push as strong as your own weight. Twice the speed makes four times the push, and half the radius makes twice the push. The cars in this game are allowed between two and a half and three and a half g. | `lab-brian-gforce-explain.mp3` | 14.4 | -24.3 | -5.5 | 2.07 |
| `lab.brian.gforce.pass` | That's a proper corner. You can feel that in the seat. | `lab-brian-gforce-pass.mp3` | 3.2 | -25.1 | -8.4 | 2.28 |
| `lab.brian.headings.intro` | A map table with a compass and a ruler. Find the heading and the distance between two pads. | `lab-brian-headings-intro.mp3` | 5.5 | -24.6 | -5.0 | 2.13 |
| `lab.brian.headings.explain` | A heading is the compass direction you point. Zero is north, ninety is east, one eighty is south and two seventy is west. A map's scale says how many real metres one map unit stands for. | `lab-brian-headings-explain.mp3` | 11.9 | -23.9 | -5.3 | 1.98 |
| `lab.brian.headings.pass` | A heading and a distance. With those two you can find anything. | `lab-brian-headings-pass.mp3` | 3.7 | -24.0 | -3.4 | 2.00 |
| `lab.brian.grip.intro` | A tyre on the rolling road. Each run, we slide it a little more and graph the grip. | `lab-brian-grip-intro.mp3` | 5.8 | -24.9 | -5.9 | 2.22 |
| `lab.brian.grip.explain` | In the game a tyre keeps all its grip up to four point three degrees of slide. Past that the rubber skates and grip falls. A short squeal says you are at the limit. A long screech says you are past it. | `lab-brian-grip-explain.mp3` | 12.1 | -23.9 | -4.2 | 1.97 |
| `lab.brian.grip.pass` | Right at the limit and no further. That's grip. | `lab-brian-grip-pass.mp3` | 2.8 | -25.2 | -7.1 | 2.30 |
| `lab.brian.downforce.intro` | A wing in the smoke. Turn the fan from fifty to a hundred and fifty miles an hour, and watch the scale. | `lab-brian-downforce-intro.mp3` | 5.7 | -24.2 | -4.8 | 2.05 |
| `lab.brian.downforce.explain` | A racing wing is an aeroplane wing upside down, so it pushes the car onto the road. Twice the speed gives four times the push. More push means more grip in fast corners, but the wing also drags, so top speed falls. | `lab-brian-downforce-explain.mp3` | 14.4 | -24.2 | -3.4 | 2.04 |
| `lab.brian.downforce.pass` | More wing, more grip, less top speed. Choose for the track. | `lab-brian-downforce-pass.mp3` | 3.6 | -23.7 | -5.3 | 1.93 |
| `lab.brian.braking.intro` | The car brakes from fifty and from a hundred miles an hour. You can slide the braking between front and back. | `lab-brian-braking-intro.mp3` | 6.7 | -24.0 | -5.3 | 2.00 |
| `lab.brian.braking.explain` | From a hundred miles an hour a car needs four times the road it needs from fifty. Braking tips the weight forward onto the front tyres, so the front brakes do most of the work. Too much rear brake and the back slides. The bench shows the weight shift at a gentle stop; the distances use the car's full braking. | `lab-brian-braking-explain.mp3` | 18.1 | -24.1 | -4.4 | 2.03 |
| `lab.brian.braking.pass` | Double the speed, four times the road. Brake early and brake straight. | `lab-brian-braking-pass.mp3` | 4.0 | -22.9 | -4.2 | 1.76 |
| `lab.brian.suspension.intro` | A shaker rig under each wheel, a bumpy road and a smooth one. Try soft springs and stiff springs. | `lab-brian-suspension-intro.mp3` | 6.2 | -24.4 | -5.4 | 2.10 |
| `lab.brian.suspension.explain` | Soft springs let the body ride over a bump, so it is shaken less, but it leans more in a corner. Stiff springs pass every bump up into the body and shake it harder, but keep it flatter. | `lab-brian-suspension-explain.mp3` | 12.6 | -25.0 | -3.0 | 2.24 |
| `lab.brian.suspension.pass` | Soft for bumps, stiff for smooth. Now you can set up for the road. | `lab-brian-suspension-pass.mp3` | 3.9 | -23.6 | -5.2 | 1.91 |
| `lab.brian.fuel.intro` | A jerry can on the scale, then the car timed from nought to sixty, full and half full. | `lab-brian-fuel-intro.mp3` | 5.2 | -25.3 | -7.2 | 2.31 |
| `lab.brian.fuel.explain` | Petrol weighs about three quarters of a kilo a litre, so a seventy litre tank holds about fifty two kilos. A lighter car speeds up quicker. Electric cars carry batteries instead, which weigh the same full or empty. | `lab-brian-fuel-explain.mp3` | 13.6 | -24.7 | -5.9 | 2.16 |
| `lab.brian.fuel.pass` | Less fuel, less weight, a quicker car. But you still have to finish the race. | `lab-brian-fuel-pass.mp3` | 4.8 | -24.6 | -6.1 | 2.14 |
| `lab.brian.launch.intro` | A small launcher. Set the angle and the speed, and measure how far it goes. | `lab-brian-launch-intro.mp3` | 4.9 | -24.2 | -3.8 | 2.04 |
| `lab.brian.launch.explain` | On flat ground with no air, forty five degrees goes furthest. Air drag, and landing lower than you took off, both make the best angle lower than forty five. | `lab-brian-launch-explain.mp3` | 9.1 | -24.4 | -5.2 | 2.10 |
| `lab.brian.launch.pass` | Right on target. That's how you plan a jump. | `lab-brian-launch-pass.mp3` | 2.2 | -25.2 | -6.7 | 2.30 |
| `lab.brian.wax.intro` | Skis on three kinds of snow, with three waxes. We'll time every glide. | `lab-brian-wax-intro.mp3` | 4.7 | -25.2 | -3.4 | 2.29 |
| `lab.brian.wax.explain` | Cold snow has hard, sharp crystals, so it needs a hard wax. Warm wet snow sticks by suction, so it needs a softer wax and fine grooves in the base to let the water out. | `lab-brian-wax-explain.mp3` | 11.0 | -24.5 | -5.7 | 2.12 |
| `lab.brian.wax.pass` | Right wax for the snow. That's free speed. | `lab-brian-wax-pass.mp3` | 2.5 | -25.4 | -7.9 | 2.35 |
| `lab.brian.secret.reverse` | Huh. A fan that sucks the car onto the road, even standing still. Someone really built that. | `lab-brian-secret-reverse.mp3` | 6.1 | -23.8 | -4.8 | 1.94 |
| `lab.brian.secret.1970` | In 1970 the Chaparral 2J raced with two fans sucking it to the ground. | `lab-brian-secret-1970.mp3` | 4.6 | -23.8 | -4.7 | 1.95 |
| `lab.brian.secret.1978` | In 1978 the Brabham BT46B fan car won its first race, the Swedish Grand Prix, and was withdrawn straight after. | `lab-brian-secret-1978.mp3` | 8.0 | -24.4 | -6.7 | 2.08 |
| `lab.brian.secret.2022` | In 2022 the electric McMurtry SpÃ©irling set the Goodwood hill climb record, 39.08 seconds. Its fans pull about two thousand kilos of downforce, even standing still. | `lab-brian-secret-2022.mp3` | 12.0 | -24.6 | -5.6 | 2.13 |
| `lab.brian.restore.start` | Salt has been working on her metal for sixty years. First a long soak in fresh water to draw it out, then a small electric current to loosen the rust. | `lab-brian-restore-start.mp3` | 8.6 | -23.7 | -5.3 | 1.93 |
| `lab.brian.restore.done` | Strip, rebuild, paint. There she is. Sixty years under the sea, and she's ready to race. | `lab-brian-restore-done.mp3` | 5.7 | -24.3 | -6.9 | 2.06 |

| Sound | Made from | Bank volume | Length (s) | LUFS | Peak (dBTP) |
| --- | --- | --- | --- | --- | --- |
| `lab.fan` | file lab/fan.ogg (43882 B) | 0.7 | 4.0 | -24.0 | -14.8 |
| `lab.reverse` | file lab/reverse.ogg (67828 B) | 0.9 | 6.4 | -20.0 | -9.2 |
| `car.speirling` | file lab/speirling.ogg (44458 B) | 0.8 | 4.0 | -22.2 | -10.7 |
| `lab.burner` | tones and noise | 0.8 | 1.35 | -28.6 | -8.5 |
| `lab.snap` | tones and noise | 0.45 | 0.17 | n/a (too short) | -5.0 |
| `lab.creak` | tones and noise | 0.8 | 0.95 | -24.8 | -7.3 |
| `lab.splash` | tones and noise | 0.8 | 0.65 | -28.3 | -7.5 |
| `lab.tick` | tones and noise | 0.6 | 0.09 | n/a (too short) | -12.0 |
| `lab.clunk` | tones and noise | 0.6 | 0.33 | n/a (too short) | -7.2 |
| `lab.fizz` | tones and noise | 0.7 | 1.25 | -26.3 | -9.4 |
| `car.sputter` | tones and noise | 0.8 | 0.85 | -27.3 | -7.3 |
| `heli.buoy-hit` | tones and noise | 0.8 | 1.25 | -26.3 | -7.8 |
| `heli.retardant` | tones and noise | 0.9 | 1.45 | -25.5 | -6.0 |

Peaks are the file's (files) or the Node render at the bank volume (layers).
Lab loops are meant to be played with a changing playback rate: `lab.fan`
about 0.6 at a 50 mph dial to 1.5 at 150, `car.speirling` about 0.7 standing
to 1.8 at top speed. The bench and the car do that; nothing here calls them.

## Changed assertions (reviewed)

- `tools/test-p4-audio.mjs`: the pre-P4 sound-bank and catalogue hashes leave
  out every `lab.*` id, `car.sputter`, `car.speirling` and the `lab.brian.*`
  rows, as they already leave out the helicopter's, the lessons' and Ana's.
  The pinned hashes are unchanged.
- `tools/test-fight-voices.mjs`: the crew-voice records leave out
  `lab.brian.*` rows. All pinned hashes and the nine kept takes are unchanged.
- `tools/test-heli-audio.mjs`: the helicopter's tone cues list gains
  `heli.buoy-hit` and `heli.retardant` (two more tone and noise cues).

## Removed

Nothing.

## Not done

- Nothing plays the Lab lines or sounds, and nothing sets the fan's or the
  Spéirling's playback rate; LAB-VIEW and the Spéirling's race audio do.
  `car.sputter` has no caller either (the fuel setting's empty tank, LAB-TUNE).
- No audio was listened to. Kyle should listen to a handful of lines (a short
  one, a long one, the Spéirling and the 1978 line), `lab.reverse`,
  `car.speirling`, the retardant pour and the layered effects before release.
- The synthesized effects are plausible, not recordings. If one sounds wrong,
  its recipe is a few numbers in `src/lab/lab-cues.js` or
  `tools/audio/build-lab-sounds.mjs`.

## Tests

(Filled in at the end of the card.)
