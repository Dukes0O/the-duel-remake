// The driving instructor's radio lines (docs/DRIVING_LESSONS.md section 14.11):
// Brian, recorded with the same voice and settings as the helicopter's lines
// and played through the shared radio chain (src/lessons/radio-voice.js).
// Lines never name times, speeds, distances or prices; the card shows the numbers.
import {HELI_RADIO_VOICE} from './radio-voice.js';

// The instructor's voice for driving lessons: the same Brian.
export const DRIVE_RADIO_VOICE = HELI_RADIO_VOICE;

// Steps and advice are shared across all four lessons when the words match.
export const driveRadioId = (lesson, step) => `drive.radio.v2.${lesson}.${step}`;
export const DRIVE_RADIO_LINES = Object.freeze(Object.fromEntries(Object.entries({
  "drive.radio.v2.corner.intro": {"file": "drive-radio-v2-corner-intro.mp3", "text": "Welcome to the track. Brake while the car is straight, then release the brake as you turn."},
  "drive.radio.v2.line.intro": {"file": "drive-radio-v2-line-intro.mp3", "text": "Today we use the whole road. Start wide, touch the inside of each bend, then let the car run wide as you leave."},
  "drive.radio.v2.gears.intro": {"file": "drive-radio-v2-gears-intro.mp3", "text": "Today you change gear yourself. Change up at the lights and change down while you brake."},
  "drive.radio.v2.snow.intro": {"file": "drive-radio-v2-snow-intro.mp3", "text": "Snow gives your tyres less grip. Brake early and steer gently, and do your slowing before the ice."},
  "drive.radio.v2.shared.watch": {"file": "drive-radio-v2-shared-watch.mp3", "text": "Watch my line and where I brake. This run is just to show you how."},
  "drive.radio.v2.corner.watch-late": {"file": "drive-radio-v2-corner-watch-late.mp3", "text": "Watch what happens when I brake late. The tyres slide and the car runs wide."},
  "drive.radio.v2.shared.follow": {"file": "drive-radio-v2-shared-follow.mp3", "text": "Follow my car and use the guides. This is practice, so nothing is scored."},
  "drive.radio.v2.shared.your-turn": {"file": "drive-radio-v2-shared-your-turn.mp3", "text": "Your turn, with the guides on. Keep it clean, and hit every brake zone or beat my time."},
  "drive.radio.v2.shared.beat": {"file": "drive-radio-v2-shared-beat.mp3", "text": "Now beat me with a clean run. The painted line is gone, but the brake zones and targets stay."},
  "drive.radio.v2.shared.late": {"file": "drive-radio-v2-shared-late.mp3", "text": "You braked late and left too little room to slow. Brake in the zone while the car is straight."},
  "drive.radio.v2.shared.early": {"file": "drive-radio-v2-shared-early.mp3", "text": "You braked early. Wait for the brake zone so you keep your speed along the straight."},
  "drive.radio.v2.shared.fast": {"file": "drive-radio-v2-shared-fast.mp3", "text": "You carried too much speed into the corner. Slow while straight so the tyres have grip left to turn."},
  "drive.radio.v2.shared.slid": {"file": "drive-radio-v2-shared-slid.mp3", "text": "I heard the tyres slide. Sliding tyres grip less, so slow before turning and keep it smooth."},
  "drive.radio.v2.shared.off": {"file": "drive-radio-v2-shared-off.mp3", "text": "You ran out of road. Slow before turning and keep the car on the road."},
  "drive.radio.v2.shared.slow": {"file": "drive-radio-v2-shared-slow.mp3", "text": "You slowed too much in the corner. Use the target on screen to keep the car moving smoothly."},
  "drive.radio.v2.shared.lift": {"file": "drive-radio-v2-shared-lift.mp3", "text": "This bend needs a lift of the accelerator. Leave the brakes alone and let the car settle."},
  "drive.radio.v2.shared.pace": {"file": "drive-radio-v2-shared-pace.mp3", "text": "That run still needs to be quicker. Keep it clean and use the whole road."},
  "drive.radio.v2.shared.clean": {"file": "drive-radio-v2-shared-clean.mp3", "text": "Clean on every corner. Same again, a little quicker."},
  "drive.radio.v2.corner.pass": {"file": "drive-radio-v2-corner-pass.mp3", "text": "Well driven. You kept it clean and beat me, and you have earned your braking reward."},
  "drive.radio.v2.line.pass": {"file": "drive-radio-v2-line-pass.mp3", "text": "Well driven. You used the road and beat me, and you have earned your handling reward."},
  "drive.radio.v2.gears.pass": {"file": "drive-radio-v2-gears-pass.mp3", "text": "Well driven. You kept the engine pulling and beat me, and you have earned your engine reward."},
  "drive.radio.v2.snow.pass": {"file": "drive-radio-v2-snow-pass.mp3", "text": "Smooth and clean on snow, and quicker than me. Well driven, you have earned your tyre reward."},
}).map(([id, line]) => [id, Object.freeze(line)])));

// The sound-bank records (the same fields as src/sound-bank.js), behind the
// driving-lessons switch: the radio lines play on the voice bus through the
// radio chain; the cone is the CC0 knock built by tools/audio/build-drive-lessons.mjs.
const cue = (bus, data) => Object.freeze({bus, volume: 1, pitchRange: [1, 1], volumeRange: [1, 1], priority: 50, limit: 12,
  spatial: null, duck: null, flag: 'driving-lessons', ...data});

// The shift lights (docs/DRIVING_LESSONS.md 12.8): a short soft tick as each of the three lights comes on,
// each a little higher (an A, a C sharp and an E: a rising major chord), made from a recipe, no file.
const tone = (frequency, duration, volume, type = 'sine', delay = 0, endFrequency = null) =>
  ({kind: 'tone', frequency, duration, volume, type, delay, endFrequency});
const SHIFT_LIGHT_PITCHES = Object.freeze([880, 1109, 1319]);

export const DRIVE_LESSON_CUES = Object.freeze({
  ...Object.fromEntries(Object.entries(DRIVE_RADIO_LINES).map(([id, line]) =>
    [id, cue('voice', {file: `voices/${line.file}`, priority: 90, limit: 1, duck: 'voice'})])),
  'lesson.cone': cue('impacts', {file: 'lessons/cone.ogg', volume: .8, pitchRange: [.94, 1.06], volumeRange: [.85, 1], priority: 60, limit: 3}),
  ...Object.fromEntries(SHIFT_LIGHT_PITCHES.map((frequency, index) =>
    [index === 0 ? 'lesson.shift-light' : `lesson.shift-light.${index + 1}`,
      cue('interface', {layers: [tone(frequency, .06, .05, 'triangle'), tone(frequency * 2, .03, .015, 'sine')], priority: 55, limit: 3})])),
});
