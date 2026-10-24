// The driving instructor's radio lines (docs/DRIVING_LESSONS.md section 6):
// Brian, recorded with the same voice and settings as the helicopter's lines
// and played through the shared radio chain (src/lessons/radio-voice.js).
// Lines never name times or prices; the card shows the numbers.
import {HELI_RADIO_VOICE} from './radio-voice.js';

// The instructor's voice for driving lessons: the same Brian.
export const DRIVE_RADIO_VOICE = HELI_RADIO_VOICE;

export const DRIVE_RADIO_LINES = Object.freeze(Object.fromEntries(Object.entries({
  'drive.radio.corner.intro': {file: 'drive-radio-corner-intro.mp3', text: 'Welcome to the track. Today is the most important corner skill there is: braking. Forget the course boards today and watch my cones.'},
  'drive.radio.corner.late.start': {file: 'drive-radio-corner-late-start.mp3', text: 'Let us see what happens when you leave it late. Keep your foot down and brake at the red board.'},
  'drive.radio.corner.late.early': {file: 'drive-radio-corner-late-early.mp3', text: 'You braked early. Good instinct, but this time I wanted you to feel it. That one still counts.'},
  'drive.radio.corner.right.start': {file: 'drive-radio-corner-right-start.mp3', text: 'Now the right way. Brake hard at the first cone while the car is straight, turn in, touch the inside cone, and accelerate out wide past the third.'},
  'drive.radio.corner.coach.brake': {file: 'drive-radio-corner-coach-brake.mp3', text: 'Brake at the first cone. Not before, not after.'},
  'drive.radio.corner.coach.inside': {file: 'drive-radio-corner-coach-inside.mp3', text: 'Get closer to the inside cone. Use the whole road.'},
  'drive.radio.corner.coach.exit': {file: 'drive-radio-corner-coach-exit.mp3', text: 'Back on the gas sooner, and let the car run out wide.'},
  'drive.radio.corner.coach.screech': {file: 'drive-radio-corner-coach-screech.mp3', text: 'I heard the tyres. Brake a little earlier and keep it smooth.'},
  'drive.radio.corner.right.pass': {file: 'drive-radio-corner-right-pass.mp3', text: 'That is it. Quiet tyres, clean line, and quicker too.'},
  'drive.radio.corner.challenge.start': {file: 'drive-radio-corner-challenge-start.mp3', text: 'Good. Now beat my time through the corner. Three in a row.'},
  'drive.radio.corner.challenge.one': {file: 'drive-radio-corner-challenge-one.mp3', text: 'That is one. Again.'},
  'drive.radio.corner.challenge.two': {file: 'drive-radio-corner-challenge-two.mp3', text: 'Two. One more.'},
  'drive.radio.corner.challenge.reset': {file: 'drive-radio-corner-challenge-reset.mp3', text: 'Not that time. Back to zero. You know how.'},
  'drive.radio.corner.pass': {file: 'drive-radio-corner-pass.mp3', text: 'Three in a row. You have earned better brakes, and the next lesson is open.'},
  'drive.radio.retake': {file: 'drive-radio-retake.mp3', text: 'Back for more? Good. Practice is how the fast drivers got fast.'},
  // Lessons 2 to 4 and the true late-try lines (docs/DRIVING_LESSONS.md 12.7).
  'drive.radio.line.intro': {file: 'drive-radio-line-intro.mp3', text: 'Lesson two: the racing line. Through linked corners, the fastest way is not the shortest.'},
  'drive.radio.line.middle.start': {file: 'drive-radio-line-middle-start.mp3', text: 'First, stay in the middle of the road. Follow the markers.'},
  'drive.radio.line.middle.result': {file: 'drive-radio-line-middle-result.mp3', text: 'Felt tight, didn\'t it? The middle of the road makes every bend sharper, so you have to go slower.'},
  'drive.radio.line.right.start': {file: 'drive-radio-line-right-start.mp3', text: 'Now use the whole road. Start wide, touch each inside cone, and let the car run out wide between them.'},
  'drive.radio.line.coach.apex': {file: 'drive-radio-line-coach-apex.mp3', text: 'Closer to the inside cone. Use every bit of road.'},
  'drive.radio.line.coach.early': {file: 'drive-radio-line-coach-early.mp3', text: 'You turned in too early and ran out of road. Wait a moment longer, then turn.'},
  'drive.radio.line.right.pass': {file: 'drive-radio-line-right-pass.mp3', text: 'Feel how straight that was? A wider line is a gentler curve, and a gentler curve is a faster one.'},
  'drive.radio.line.challenge.start': {file: 'drive-radio-line-challenge-start.mp3', text: 'Now beat my time through the esses. Three in a row.'},
  'drive.radio.line.pass': {file: 'drive-radio-line-pass.mp3', text: 'Three in a row. Better handling for your car, and the next lesson is open.'},
  'drive.radio.gears.intro': {file: 'drive-radio-gears-intro.mp3', text: 'Lesson three: the gearbox. Today you change gear yourself. E is up, Q is down.'},
  'drive.radio.gears.early.start': {file: 'drive-radio-gears-early-start.mp3', text: 'First, change up as soon as the needle passes the green mark.'},
  'drive.radio.gears.early.result': {file: 'drive-radio-gears-early-result.mp3', text: 'Sluggish, wasn\'t it? An engine is weak at low revs. Changing up early drops it below where it pulls.'},
  'drive.radio.gears.right.start': {file: 'drive-radio-gears-right-start.mp3', text: 'Now hold each gear until the lights come on, then change up. Change down while you brake, so you leave the corner in my gear.'},
  'drive.radio.gears.coach.limiter': {file: 'drive-radio-gears-coach-limiter.mp3', text: 'That was the limiter. Change up when the lights come on, not after.'},
  'drive.radio.gears.coach.down': {file: 'drive-radio-gears-coach-down.mp3', text: 'Too high a gear coming out. Change down while you brake.'},
  'drive.radio.gears.right.pass': {file: 'drive-radio-gears-right-pass.mp3', text: 'Hear it pull out of the corner? That\'s the right gear.'},
  'drive.radio.gears.challenge.start': {file: 'drive-radio-gears-challenge-start.mp3', text: 'Now beat my time, changing gear yourself. Three in a row.'},
  'drive.radio.gears.pass': {file: 'drive-radio-gears-pass.mp3', text: 'Three in a row. More power for your car, and the next lesson is open.'},
  'drive.radio.snow.intro': {file: 'drive-radio-snow-intro.mp3', text: 'Lesson four: snow. On summer tyres you have about half the grip you have on a dry road.'},
  'drive.radio.snow.late.start': {file: 'drive-radio-snow-late-start.mp3', text: 'First, brake where you would on a dry road. The red board shows it.'},
  'drive.radio.snow.late.result': {file: 'drive-radio-snow-late-result.mp3', text: 'Half the grip means about twice the road to stop. That\'s why you ran out of corner.'},
  'drive.radio.snow.right.start': {file: 'drive-radio-snow-right-start.mp3', text: 'Now brake at the snow cone, gently. Do your braking before the ice, never on it. Then turn in smooth.'},
  'drive.radio.snow.coach.brake': {file: 'drive-radio-snow-coach-brake.mp3', text: 'Earlier. On snow, start braking at the cone.'},
  'drive.radio.snow.coach.ice': {file: 'drive-radio-snow-coach-ice.mp3', text: 'You braked on the ice. Brake before it, roll across it, then turn.'},
  'drive.radio.snow.coach.turn': {file: 'drive-radio-snow-coach-turn.mp3', text: 'Turn in more gently. Sudden steering on snow slides the front.'},
  'drive.radio.snow.right.pass': {file: 'drive-radio-snow-right-pass.mp3', text: 'Smooth and early. That\'s how you drive on snow.'},
  'drive.radio.snow.challenge.start': {file: 'drive-radio-snow-challenge-start.mp3', text: 'Now beat my time, three in a row, on summer tyres.'},
  'drive.radio.snow.winter.start': {file: 'drive-radio-snow-winter-start.mp3', text: 'Same corner, now on winter tyres. Feel the difference.'},
  'drive.radio.snow.winter.result': {file: 'drive-radio-snow-winter-result.mp3', text: 'Winter tyres use softer rubber that stays grippy in the cold, and deep cuts that bite into the snow.'},
  'drive.radio.snow.pass': {file: 'drive-radio-snow-pass.mp3', text: 'That\'s every driving lesson I have for now. Better tyres for your car. Well driven.'},
  'drive.radio.corner.late.slid': {file: 'drive-radio-corner-late-slid.mp3', text: 'Hear that screech? Your tyres slid past their best grip, so the car could not steer or stop as well. You got away with it here. On snow you won\'t.'},
  'drive.radio.corner.late.off': {file: 'drive-radio-corner-late-off.mp3', text: 'That\'s where a slide takes you. Brake at the first cone, and keep it clean.'},
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
