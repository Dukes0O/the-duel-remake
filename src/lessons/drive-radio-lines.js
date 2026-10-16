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
  'drive.radio.corner.late.result': {file: 'drive-radio-corner-late-result.mp3', text: 'Hear that screech? That was your tyres sliding, and sliding is slow. Look at the time you lost.'},
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
}).map(([id, line]) => [id, Object.freeze(line)])));

// The sound-bank records (the same fields as src/sound-bank.js), behind the
// driving-lessons switch: the radio lines play on the voice bus through the
// radio chain; the cone is the CC0 knock built by tools/audio/build-drive-lessons.mjs.
const cue = (bus, data) => Object.freeze({bus, volume: 1, pitchRange: [1, 1], volumeRange: [1, 1], priority: 50, limit: 12,
  spatial: null, duck: null, flag: 'driving-lessons', ...data});

export const DRIVE_LESSON_CUES = Object.freeze({
  ...Object.fromEntries(Object.entries(DRIVE_RADIO_LINES).map(([id, line]) =>
    [id, cue('voice', {file: `voices/${line.file}`, priority: 90, limit: 1, duck: 'voice'})])),
  'lesson.cone': cue('impacts', {file: 'lessons/cone.ogg', volume: .8, pitchRange: [.94, 1.06], volumeRange: [.85, 1], priority: 60, limit: 3}),
});
