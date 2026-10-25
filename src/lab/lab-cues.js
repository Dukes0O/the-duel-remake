// The Lab's sounds (docs/LAB.md section 8), apart from Brian's voice (lab-lines.js): the bench cues
// each bench names in its `cues` list, the REVERSE roar, and the Spéirling's motor. Behind the `lab`
// switch. Short effects are made from tones and noise, with no file; the fan, the reverse and the
// Spéirling are loops and a one-shot built by tools/audio/build-lab-sounds.mjs from code.
// Passing and buying use the existing confirm and purchase sounds.

const cue = (bus, data) => Object.freeze({bus, volume: 1, pitchRange: [1, 1], volumeRange: [1, 1], priority: 50, limit: 12,
  spatial: null, duck: null, flag: 'lab', ...data});
const tone = (frequency, duration, volume, type = 'sine', delay = 0, endFrequency = null) =>
  ({kind: 'tone', frequency, duration, volume, type, delay, endFrequency});
const noise = (frequency, duration, volume, type = 'bandpass') => ({kind: 'noise', frequency, duration, volume, type});

export const LAB_SOUND_CUES = Object.freeze({
  // The tunnel fan hum: a loop; the bench raises its playback rate with the fan dial (about 0.6 at 50 mph to 1.5 at 150).
  'lab.fan': cue('ambience', {file: 'lab/fan.ogg', volume: .7, loop: true, priority: 35, limit: 1}),
  // The REVERSE switch: the fan winds down, stops, and roars back the other way (6.4 s).
  'lab.reverse': cue('ambience', {file: 'lab/reverse.ogg', volume: .9, priority: 70, limit: 1}),
  // Gas whoosh when the fire pit's burner is lit.
  'lab.burner': cue('ambience', {priority: 45, limit: 2, volume: .8, layers: [
    noise(450, 1.3, .55, 'bandpass'), noise(1100, 1.0, .3, 'bandpass'), tone(70, 1.2, .25, 'sine')]}),
  // A bar breaking, and a bar bending (the strength bench picks by the result).
  'lab.snap': cue('impacts', {priority: 60, limit: 2, volume: .45, layers: [
    noise(3500, .07, .8, 'highpass'), tone(1600, .06, .4, 'triangle', 0, 380), noise(900, .12, .35, 'bandpass')]}),
  'lab.creak': cue('impacts', {priority: 55, limit: 2, volume: .8, layers: [
    tone(150, .9, .4, 'sawtooth', 0, 95), tone(230, .8, .18, 'sawtooth', .05, 170), noise(700, .6, .22, 'bandpass')]}),
  // A parcel of water hitting the sand.
  'lab.splash': cue('impacts', {priority: 55, limit: 3, volume: .8, layers: [
    noise(2200, .4, .5, 'bandpass'), noise(900, .6, .45, 'lowpass'), noise(5500, .2, .2, 'highpass')]}),
  // The pendulum's stopwatch.
  'lab.tick': cue('interface', {priority: 50, limit: 3, volume: .6, layers: [
    tone(1900, .035, .4, 'sine'), noise(5000, .02, .25, 'highpass')]}),
  // Weights set down on the pad, and the jerry can on the scale.
  'lab.clunk': cue('impacts', {priority: 55, limit: 3, volume: .6, layers: [
    tone(120, .28, .6, 'sine', 0, 55), noise(500, .12, .45, 'lowpass'), tone(260, .1, .25, 'triangle', 0, 130)]}),
  // The rust bench's electric current: fizz and a few pops.
  'lab.fizz': cue('ambience', {priority: 45, limit: 2, volume: .7, layers: [
    noise(6000, 1.2, .3, 'highpass'), noise(3500, 1.0, .18, 'bandpass'),
    tone(1400, .04, .18, 'sine', .2), tone(1900, .03, .14, 'sine', .5), tone(1600, .04, .14, 'sine', .8)]}),
  // A petrol engine running out of fuel: four coughs, each lower and further apart.
  'car.sputter': cue('engine', {priority: 70, limit: 1, volume: .8, layers: [
    tone(95, .12, .45, 'sawtooth', 0, 60), tone(90, .1, .4, 'sawtooth', .18, 55),
    tone(100, .14, .45, 'sawtooth', .33, 50), tone(85, .18, .4, 'sawtooth', .62, 40), noise(300, .1, .25, 'lowpass')]}),
  // The McMurtry Spéirling: an electric motor's whine over a loud fan roar that is there even standing
  // still. A loop; the car raises its playback rate with speed (about 0.7 standing to 1.8 at top speed).
  'car.speirling': cue('engine', {file: 'lab/speirling.ogg', volume: .8, loop: true, priority: 60, limit: 1}),
});
