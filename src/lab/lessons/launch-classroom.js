// Launch angles as a classroom lesson (docs/board/cards/LAB-CLASSROOM-LAUNCH.md, "Claude's script"; its wording and
// formulas follow LAB-CLASSROOM-LANGUAGE.md).
// Teaching state only, no DOM and no saves. Every distance is the launch bench's own run (launchBench, the challenge's
// bench) with the skier's own air and a level landing; question 2's landing is the bench's 10 m lower one.
import {launchBench, launchDragAcceleration, rangeOf, TARGET} from '../benches/launch.js';
import {MORE} from '../classroom/brian-text.js';

export const KMH_PER_MS = 3.6;
// The ramp tilts 5 degrees a press on the bench's 1-degree grid; the speed dial moves 1 m/s a press, shown in km/h.
export const ANGLE_STEP = 5, MIN_ANGLE = 15, MAX_ANGLE = 75;
export const SPEED_STEP = 1, MIN_MS = 13, MAX_MS = 24;
// A launch flies faster than life so the watch is not a wait; the tape is read for a moment after it lands.
export const FLY_RATE = 1.6, LAND_HOLD_S = .7;
const HELD_GAP_S = .14, GAP_S = .5;

const runOf = (angle, ms, lower = false) => launchBench.run({angleDeg: angle, speedMs: ms, air: 'air', landing: lower ? '10 m lower' : 'level'});
export const distanceOf = (angle, ms, lower = false) => runOf(angle, ms, lower).rangeM;
export const secondsOf = (angle, ms, lower = false) => runOf(angle, ms, lower).seconds;
// The flight's path, from the bench's own rule: [metres along, metres up, seconds].
export function pathOf(angle, ms, lower = false) {
  const points = [];
  rangeOf(angle, ms, {air: true, lower, points});
  return points;
}
export const kmh = ms => Math.round(ms * KMH_PER_MS);
export const m1 = value => `${value.toFixed(1)} m`;
export const deg = angle => `${angle}°`;
export const FLAG_M = TARGET.rangeM, WITHIN_M = TARGET.withinM;
export const hits = (flag, angle, ms) => Math.abs(distanceOf(angle, ms) - flag) <= WITHIN_M;

// The wonder's two launches and the watch's five, all at 72 km/h (20 m/s).
export const SHOW_MS = 20;
export const WONDER_ANGLES = Object.freeze([60, 30]);
export const WATCH_ANGLES = Object.freeze([15, 30, 45, 60, 75]);
// Try 2 slows the dial from 72 km/h to 65 km/h (18 m/s).
export const SLOW_MS = 18;
// The free test asks for this many launches before Continue opens.
export const FREE_TRIES = 3;
// Brian's job: three marks. The first fixes the ramp, the second the speed, the third is the bench's own 30 m mark.
export const MARKS = Object.freeze([
  {flag: 42, fixed: 'angle', angle: 45, ms: 20},
  {flag: 27, fixed: 'speed', angle: 45, ms: 22},
  {flag: FLAG_M, fixed: null, angle: 75, ms: 16},
].map(Object.freeze));

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Two jumps, one spot'},
  {id: 'word-speed', part: 1, title: 'Speed', word: 'launch-speed'},
  {id: 'word-angle', part: 1, title: 'Launch angle', word: 'launch-launch-angle'},
  {id: 'word-distance', part: 1, title: 'Distance', word: 'launch-distance'},
  {id: 'watch', part: 2, title: 'Five ramps, one speed', voice: 'lab.brian.launch.intro'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-flag', part: 3, title: 'Beyond the flag'},
  {id: 'try-speed', part: 3, title: 'A little slower'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-pair', part: 5, title: 'Question 1 of 3'},
  {id: 'check-lower', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.launch.explain'},
].map(Object.freeze));

const D = (angle, ms = SHOW_MS, lower = false) => m1(distanceOf(angle, ms, lower));
export const KEY_IDEAS = Object.freeze([
  {id: 'angle', text: `On level ground, a ramp of about 45 degrees sends the skier furthest: ${D(45)} at ${kmh(SHOW_MS)} km/h. Two ramps equally far either side of 45 degrees land close together, such as 30° at ${D(30)} and 60° at ${D(60)}.`},
  {id: 'speed', text: `Greater speed carries the skier further. At 45 degrees the skier lands ${D(45, SLOW_MS)} at ${kmh(SLOW_MS)} km/h, ${D(45)} at ${kmh(SHOW_MS)} km/h and ${D(45, 22)} at ${kmh(22)} km/h.`},
  {id: 'lower', text: 'When the landing is lower than the ramp, a flatter ramp goes furthest. On the Aerials run the kicker sets the angle, so hold Shift to tuck on the inrun and arrive with more speed.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'About 45 degrees goes furthest, and more speed goes further.',
  text: 'The Aerials run is now open on the mountain. The angle of the kicker cannot be changed, so hold Shift to tuck on the inrun. Leaving the kicker faster carries you higher and further.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'launch-launch-angle', word: 'Launch angle', meaning: 'How far the ramp points up from level ground, measured in degrees. Level ground is 0 degrees and straight up is 90 degrees.'},
  {id: 'launch-speed', word: 'Speed', meaning: 'How fast the skier is moving when leaving the ramp, given in km/h or in m/s (metres per second). To convert km/h to m/s, divide by 3.6.'},
  {id: 'launch-distance', word: 'Distance', meaning: 'How far along the ground the skier lands, measured in metres from the end of the ramp.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const ANGLE_KEYS = Object.freeze({'↑': 'angle:up', '↓': 'angle:down'});
const SPEED_KEYS = Object.freeze({'→': 'speed:up', '←': 'speed:down'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const LAUNCH = Object.freeze({action: 'go', label: 'Launch', key: 'Space'});

// Try 1's guesses: which way to tilt a ramp whose skier lands past the flag.
const TILT_GUESSES = Object.freeze([['steeper', 'Steeper'], ['flatter', 'Flatter'], ['either', 'Either direction works']].map(([way, label]) => ({way, label})));
// Try 2's guesses: three places on the tape.
const SLOW_GUESSES = Object.freeze([34, 30, 20].map(at => ({at, label: `About ${at} m`})));

const A50 = distanceOf(50, SHOW_MS);
const CHECKS = {
  'check-pair': {
    question: `At ${kmh(SHOW_MS)} km/h, the ramp at 50 degrees lands the skier ${m1(A50)} along the tape. Which other ramp lands the skier closest to that distance?`,
    answers: [40, 55, 70].map(angle => ({label: `${angle} degrees`, picture: {kind: 'ramp', angle}})),
    correct: 0,
    right: () => `Correct. The ramp at 40 degrees lands the skier ${D(40)}, close to ${m1(A50)}. A ramp at 40 degrees is 5 degrees below 45 and a ramp at 50 degrees is 5 degrees above it, and ramps equally far either side of 45 degrees land close together.`,
    wrong: picked => picked === 1 ? `The ramp at 55 degrees lands the skier ${D(55)}, which is ${m1(A50 - distanceOf(55, SHOW_MS))} shorter. The ramp at 40 degrees is the closer match, because it is as far below 45 degrees as the 50 degree ramp is above it, and it lands the skier ${D(40)}.`
      : `The ramp at 70 degrees is much too steep and lands the skier only ${D(70)}. The ramp at 40 degrees is the closer match, because it is as far below 45 degrees as the 50 degree ramp is above it, and it lands the skier ${D(40)}.`,
    hints: ['Think of the pairs you watched: 30 and 60 degrees, and 15 and 75 degrees.', '50 is 5 degrees above 45. Which ramp is 5 degrees below 45?', 'Pick 40 degrees.'],
  },
  'check-lower': {
    question: `Suppose the landing is 10 m lower than the ramp, as it is on the Aerials hill below its kicker. At ${kmh(SHOW_MS)} km/h, which ramp sends the skier furthest?`,
    answers: [40, 45, 55].map(angle => ({label: `${angle} degrees`, picture: {kind: 'ramp', angle, lower: true}})),
    correct: 0,
    right: () => `Correct. The ramp at 40 degrees sends the skier ${D(40, SHOW_MS, true)} and the ramp at 45 degrees sends the skier ${D(45, SHOW_MS, true)}. With a lower landing the skier has longer to fall, so a flatter ramp gains by sending more of the speed forward.`,
    wrong: picked => picked === 1 ? `The ramp at 45 degrees sends the skier ${D(45, SHOW_MS, true)}, but the ramp at 40 degrees sends the skier ${D(40, SHOW_MS, true)}. With a lower landing the skier has longer to fall, so a flatter ramp gains by sending more of the speed forward.`
      : `The ramp at 55 degrees sends the skier only ${D(55, SHOW_MS, true)}, because a steeper ramp sends less of the speed forward. The ramp at 40 degrees sends the skier ${D(40, SHOW_MS, true)}.`,
    hints: ['A lower landing gives the skier longer in the air.', 'With longer to fall, it pays to send more of the speed forward, which means a flatter ramp.', 'Pick 40 degrees.'],
  },
  'check-game': {
    question: 'On the Aerials run you ski down a slope called the inrun and leave the ground from a snow ramp called the kicker, which always throws you at about 50 degrees. What can you do to fly higher and further?',
    answers: [{label: 'Hold Shift to tuck, which means crouching low, on the inrun and leave the kicker faster', picture: {kind: 'kicker', what: 'tuck'}},
      {label: 'Lean back to make the kicker steeper', picture: {kind: 'kicker', what: 'lean'}},
      {label: 'Ski more slowly so that the kicker throws you higher', picture: {kind: 'kicker', what: 'slow'}}],
    correct: 0,
    right: () => `Correct. You cannot change the angle of the kicker, but you can change your speed. On the launcher at 50 degrees, the skier lands ${D(50, SLOW_MS)} at ${kmh(SLOW_MS)} km/h and ${D(50, 22)} at ${kmh(22)} km/h.`,
    wrong: picked => picked === 1 ? 'The kicker is made of snow, so leaning back does not change its angle. You can change your speed, so hold Shift to tuck on the inrun and leave the kicker faster.'
      : `A slower skier lands lower and shorter. On the launcher at 50 degrees, the skier lands ${D(50, SLOW_MS)} at ${kmh(SLOW_MS)} km/h and ${D(50, 22)} at ${kmh(22)} km/h. Hold Shift to tuck on the inrun for more speed.`,
    hints: ['You cannot change the angle of the kicker.', 'What did more speed do on the launcher?', 'Pick the first card.'],
  },
};

// ---- the formulas beside the board (the numbers are the ones on the ramp and the dial now) ----
const G_SHOWN = 9.8, DRAG_K = launchDragAcceleration(1);
// The sums as the panel shows them, so that what Brian says matches what a calculator gives from the numbers on the screen.
function splitOf(angle, ms) {
  const a = angle * Math.PI / 180, forward = Number((ms * Math.cos(a)).toFixed(2)), upward = Number((ms * Math.sin(a)).toFixed(2)), air = Number((2 * upward / G_SHOWN).toFixed(2));
  return {cos: Math.cos(a), sin: Math.sin(a), forward, upward, air, distance: forward * air};
}
export const noAirDistance = (angle, ms) => Number(splitOf(angle, ms).distance.toFixed(1));
function formulasFor(angle, ms, tape = null) {
  const {cos, sin, forward, upward, air, distance} = splitOf(angle, ms), f = forward.toFixed(2), u = upward.toFixed(2), t = air.toFixed(2);
  return [
    {title: 'Speed in kilometres per hour', formula: 'km/h = m/s × 3.6', worked: `${ms} m/s × 3.6 = ${(ms * KMH_PER_MS).toFixed(1)} km/h`, note: 'The dial shows this to the nearest whole number.'},
    {title: 'The ramp divides the speed', formula: 'forward = speed × cos(angle)', worked: `${ms} × cos ${angle}° = ${f} m/s`, note: `cos ${angle}° is ${cos.toFixed(2)}, the share of the speed going forward. sin ${angle}° is ${sin.toFixed(2)}, the share going upward.`},
    {title: '', formula: 'upward = speed × sin(angle)', worked: `${ms} × sin ${angle}° = ${u} m/s`},
    {title: 'Time in the air', formula: 'time = 2 × upward ÷ g', worked: `2 × ${u} ÷ ${G_SHOWN} = ${t} s`, note: 'g is the acceleration caused by gravity, 9.8 m/s², which is read as “metres per second, per second”. Gravity changes the skier’s speed by 9.8 m/s during every second.'},
    {title: 'Distance, leaving out the air', formula: 'distance = forward × time', worked: `${f} m/s × ${t} s = ${distance.toFixed(1)} m`},
    {title: 'What the air does', formula: 'slowing = k × speed^2', worked: `${DRAG_K.toFixed(4)} × (${ms} m/s)^2 = ${launchDragAcceleration(ms).toFixed(1)} m/s^2`, note: tape == null ? 'k depends on the size and mass of the skier. The friction of the air slows the skier throughout the flight, so the tape reads shorter than the sum above.' : `The tape read ${m1(tape)}, which is shorter than the sum above, because the friction of the air slows the skier throughout the flight.`},
  ];
}

const clampAngle = a => Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, a));
const clampSpeed = s => Math.max(MIN_MS, Math.min(MAX_MS, s));
// What to change after a miss, from where the ramp is. Short: tilt toward 45, or more speed. Past: away from 45, or less.
function angleFix(angle, short) {
  if (short) return angle < 45 ? 'tilt the ramp steeper, towards 45 degrees, by pressing ↑' : angle > 45 ? 'tilt the ramp flatter, towards 45 degrees, by pressing ↓' : null;
  return angle < 45 ? 'tilt the ramp flatter, further from 45 degrees, by pressing ↓' : angle > 45 ? 'tilt the ramp steeper, further from 45 degrees, by pressing ↑' : 'tilt the ramp steeper or flatter, because 45 degrees goes furthest, by pressing ↑ or ↓';
}
// Speed advice only while the dial can still turn that way.
const speedFix = (short, ms) => short ? (ms < MAX_MS ? 'add speed by pressing →' : null) : (ms > MIN_MS ? 'reduce the speed by pressing ←' : null);
const sentence = s => s[0].toUpperCase() + s.slice(1);
export function missSay(flag, angle, ms, fixed) {
  const d = distanceOf(angle, ms), short = d < flag, by = m1(Math.abs(d - flag));
  const turn = angleFix(angle, short), speed = speedFix(short, ms);
  const fix = fixed === 'angle' || !turn ? speed ?? turn : fixed === 'speed' || !speed ? turn : `${turn}, or ${speed}`;
  return `The skier landed ${m1(d)} along the tape, which is ${by} ${short ? 'short of' : 'beyond'} the ${flag} m flag. ${sentence(fix)}, then press Space.`;
}

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The ramp and the dial carry from step to step, as the player left them.
  const set = {angle: 45, ms: SHOW_MS};
  const step = () => STEPS[m.index];
  const row = (angle, ms) => ({angle, speed: kmh(ms), ms, distance: distanceOf(angle, ms)});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', flight: null, queue: [], trails: [], rows: [], guess: null, answered: null, say: '', auto: null, lastPress: -1,
      mark: 0, tries: 0, tested: new Set(), ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { set.ms = SHOW_MS; queueLaunches(WONDER_ANGLES); }
    if (id === 'word-angle') { set.angle = 60; set.ms = SHOW_MS; m.phase = 'tilt'; }
    if (id === 'word-speed') { set.angle = 45; set.ms = SLOW_MS; m.phase = 'turn'; }
    if (id === 'word-distance') { set.angle = 45; set.ms = SHOW_MS; m.phase = 'ready'; }
    if (id === 'watch') { set.ms = SHOW_MS; queueLaunches(WATCH_ANGLES); }
    if (id === 'try-free') { set.angle = 45; set.ms = SHOW_MS; m.phase = 'set'; }
    if (id === 'try-flag') { set.angle = 45; set.ms = SHOW_MS; m.rows = [row(45, SHOW_MS)]; m.phase = 'guess'; }
    if (id === 'try-speed') { set.angle = 45; set.ms = SHOW_MS; m.rows = [row(45, SHOW_MS)]; m.phase = 'set'; }
    if (id === 'alone') startMark();
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  // Each mark starts where Brian sets it, away from its answer.
  function startMark() {
    const mark = MARKS[m.mark];
    set.angle = mark.angle; set.ms = mark.ms; m.trails = []; m.phase = 'set';
  }
  // The wonder and the watch launch by themselves, one after another.
  function queueLaunches(angles) {
    m.queue = [...angles]; m.phase = 'running';
    launch(m.queue.shift(), set.ms, .6);
  }
  function launch(angle, ms, delay = 0) {
    set.angle = angle;
    m.flight = {angle, ms, t: -delay, seconds: secondsOf(angle, ms), distance: distanceOf(angle, ms)};
    runs.push({angle, ms});
    if (m.phase !== 'running') m.phase = 'flying';
  }
  const setting = () => ['try-free', 'try-flag', 'try-speed', 'alone'].includes(step().id) && m.phase === 'set';
  const mark = () => MARKS[Math.min(m.mark, MARKS.length - 1)];
  // The two word steps stay open after their first answer, so the player can go on watching the arrows and the formulas change.
  const canAngle = () => (setting() && (step().id === 'try-free' || step().id === 'try-flag' || (step().id === 'alone' && mark().fixed !== 'angle'))) || step().id === 'word-angle';
  const canSpeed = () => (setting() && (step().id === 'try-free' || step().id === 'try-speed' || (step().id === 'alone' && mark().fixed !== 'speed'))) || step().id === 'word-speed';
  // What Show me sets and launches.
  function goal() {
    const id = step().id;
    if (id === 'word-angle') return {angle: 45, ms: set.ms};
    if (id === 'word-speed') return {angle: set.angle, ms: SHOW_MS};
    if (id === 'try-flag') return {angle: set.angle > 45 ? 60 : 30, ms: set.ms};
    if (id === 'try-speed') return {angle: set.angle, ms: SLOW_MS};
    // The free test: Show me moves on to a ramp that has not been tested at this speed yet.
    if (id === 'try-free') {
      const fresh = [45, 30, 60, 15, 75].find(angle => !m.tested.has(`${angle}/${set.ms}`));
      return {angle: fresh ?? set.angle, ms: set.ms};
    }
    if (id === 'alone') {
      const k = mark();
      if (k.fixed === 'angle') return {angle: set.angle, ms: 22};
      if (k.fixed === 'speed') return {angle: set.angle < 45 ? 20 : 70, ms: set.ms};
      return {angle: 45, ms: SLOW_MS};
    }
    return {angle: set.angle, ms: set.ms};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'word-angle') return 'I will tilt the ramp to 45 degrees.';
    if (id === 'word-speed') return `I will turn the dial to ${kmh(SHOW_MS)} km/h.`;
    if (id === 'try-speed') return `I will turn the dial to ${kmh(SLOW_MS)} km/h, and then you can guess where the skier will land.`;
    const parts = [g.angle !== set.angle ? `tilt the ramp to ${g.angle} degrees` : null, g.ms !== set.ms ? `turn the dial to ${kmh(g.ms)} km/h` : null].filter(Boolean);
    return parts.length ? `I will ${parts.join(' and ')}, and then launch.` : 'I will launch now.';
  }

  function act(action) {
    const id = step().id, [kind, value, held] = action.split(':');
    if (kind === 'replay') return replay();
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      seen.add(id);
      enter(m.index, {answered: picked});
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (kind === 'set' && value === 'best') {
      if (m.auto || !(setting() || canAngle() || canSpeed())) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'angle') return tilt(value, held === 'held');
    if (kind === 'speed') return turn(value, held === 'held');
    if (kind === 'answer' && m.phase === 'guess') {
      const picked = Number(value);
      if (id === 'try-flag' && TILT_GUESSES[picked]) {
        m.guess = picked; m.phase = 'set';
        m.say = `You chose “${TILT_GUESSES[picked].label.toLowerCase()}”. Now tilt the ramp with ↑ or ↓, and launch until the skier lands on the flag.`;
        return {kind: 'progress', say: m.say};
      }
      if (id === 'try-speed' && SLOW_GUESSES[picked]) {
        m.guess = picked; launch(set.angle, set.ms);
        m.say = `You guessed about ${SLOW_GUESSES[picked].at} m. Watch the tape.`;
        return {kind: 'progress', say: m.say};
      }
      return null;
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ tilts the ramp 5 degrees steeper, ↓ 5 degrees flatter, between 15 and 75.
  function tilt(way, held) {
    if (!canAngle() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.angle;
    set.angle = clampAngle(before + (way === 'up' ? ANGLE_STEP : -ANGLE_STEP));
    if (set.angle === before) return held ? null : {kind: 'note', say: way === 'up' ? `${MAX_ANGLE} degrees is as steep as the ramp goes.` : `${MIN_ANGLE} degrees is as flat as the ramp goes.`};
    m.lastPress = m.time;
    if (step().id === 'word-angle' && m.phase === 'tilt' && set.angle === 45) return tilted();
    return held ? null : {kind: 'sound', sound: 'lab.clunk'};
  }
  function tilted() {
    m.phase = 'done'; m.auto = null; seen.add('word-angle');
    m.say = 'A ramp at 45 degrees points halfway between level ground and straight up, and that angle is its launch angle. The ramp divides the skier’s speed into two parts, a forward speed and an upward speed, and the two arrows at the end of the ramp show them. At 45 degrees the two parts are equal. A steeper ramp sends more of the speed upward, and a flatter ramp sends more of it forward. You can keep tilting the ramp to watch the arrows and the formulas change.';
    return {kind: 'right', sound: 'lab.clunk', say: m.say};
  }
  // → turns the speed dial 1 m/s faster, ← 1 m/s slower, shown in km/h.
  function turn(way, held) {
    if (!canSpeed() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.ms;
    set.ms = clampSpeed(before + (way === 'up' ? SPEED_STEP : -SPEED_STEP));
    if (set.ms === before) return held ? null : {kind: 'note', say: way === 'up' ? `${kmh(MAX_MS)} km/h is the top of the dial.` : `${kmh(MIN_MS)} km/h is the bottom of the dial.`};
    m.lastPress = m.time;
    if (step().id === 'word-speed' && m.phase === 'turn' && set.ms === SHOW_MS) return turned();
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  function turned() {
    m.phase = 'done'; m.auto = null; seen.add('word-speed');
    m.say = `A dial reading of ${kmh(SHOW_MS)} km/h is about the same as ${SHOW_MS} m/s, and that is how fast the skier leaves the end of the ramp. More speed means that the skier moves forward faster and also stays in the air for longer. You can keep turning the dial to watch the formula change.`;
    return {kind: 'right', sound: 'lab.tick', say: m.say};
  }

  function go() {
    const id = step().id;
    if (id === 'word-distance' && m.phase === 'ready') {
      launch(set.angle, set.ms);
      m.say = 'Watch the tape to see where the skier lands.';
      return {kind: 'progress', say: m.say};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-flag' && set.angle === 45) return {kind: 'note', say: `At 45 degrees the skier lands ${D(45)}, which is beyond the flag. Tilt the ramp first with ↑ or ↓.`};
    if (id === 'try-speed') {
      if (set.ms !== SLOW_MS) return {kind: 'note', say: `This test is at ${kmh(SLOW_MS)} km/h, so press ← until the dial reads ${kmh(SLOW_MS)} km/h.`};
      m.phase = 'guess';
      m.say = `At ${kmh(SHOW_MS)} km/h the skier landed ${D(45)} along the tape. At ${kmh(SLOW_MS)} km/h, where do you think the skier will land? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    launch(set.angle, set.ms);
    m.say = `The ramp is at ${set.angle} degrees and the dial is at ${kmh(set.ms)} km/h. Watch the tape.`;
    return {kind: 'progress', say: m.say};
  }

  // The skier has landed and the tape has been read: judge the launch, or launch the next one in the queue.
  function judge() {
    const id = step().id, {angle, ms, distance} = m.flight;
    m.trails = [...m.trails, {angle, ms, distance}].slice(-6);
    m.flight = null;
    if (id === 'wonder' || id === 'watch') {
      m.rows = [...m.rows, row(angle, ms)];
      if (m.queue.length) { m.gap = GAP_S; return {kind: 'sound', sound: 'lab.tick'}; }
      m.phase = 'done'; seen.add(id); return null;
    }
    if (id === 'word-distance') {
      m.phase = 'done'; seen.add(id); m.rows = [row(angle, ms)];
      m.say = `The tape reads ${m1(distance)}, which is further than both the 60 degree and the 30 degree jumps. Leaving out the air, the formulas predict ${m1(noAirDistance(angle, ms))}. The skier lands shorter than that, because the friction of the air slows the skier throughout the flight.`;
      return {kind: 'right', say: m.say};
    }
    m.rows = [...m.rows, row(angle, ms)];
    if (id === 'try-free') {
      m.phase = 'set'; m.tested.add(`${angle}/${ms}`); m.tries = m.tested.size;
      if (m.tries >= FREE_TRIES) seen.add(id);
      m.say = `With the ramp at ${angle} degrees and the dial at ${kmh(ms)} km/h, the skier landed ${m1(distance)} along the tape. Leaving out the air, the formulas predict ${m1(noAirDistance(angle, ms))}, so the friction of the air shortened the jump by ${m1(noAirDistance(angle, ms) - distance)}. ${m.tries >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change a setting and test a different one.'}`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-flag') {
      m.phase = 'set';
      if (!hits(FLAG_M, angle, ms)) { m.say = missSay(FLAG_M, angle, ms, 'speed'); return {kind: 'fail', say: m.say}; }
      m.phase = 'done'; seen.add(id);
      const other = angle > 45 ? 30 : 60, either = TILT_GUESSES[m.guess]?.way === 'either';
      m.say = `With the ramp at ${angle} degrees the skier landed ${m1(distance)}, on the flag. ${either ? 'You were right that either direction works.' : `A ${TILT_GUESSES[m.guess]?.way ?? 'steeper'} ramp works, and so does tilting the other way.`} A ramp at ${other} degrees lands the skier ${D(other)}. A ramp at 45 degrees gives the greatest distance, so tilting it in either direction shortens the jump.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-speed') {
      m.phase = 'done'; seen.add(id);
      const right = m.guess === 1, cost = m1(distanceOf(45, SHOW_MS) - distance);
      const slower = kmh(SHOW_MS) - kmh(SLOW_MS);
      m.say = right ? `Correct: the skier landed ${m1(distance)}. Slowing down by ${slower} km/h shortened the jump by ${cost}, because a slower skier moves forward more slowly and also comes down sooner. Both effects shorten the jump.`
        : m.guess === 0 ? `The jump shortened by more than that: the skier landed ${m1(distance)}. A slower skier moves forward more slowly and also comes down sooner, and both effects shorten the jump.`
          : `The jump did not shorten by that much: the skier landed ${m1(distance)}. Slowing down by ${slower} km/h shortened the jump by ${cost}, not by half.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    // Brian's job.
    const k = mark();
    if (!hits(k.flag, angle, ms)) { m.phase = 'set'; m.say = missSay(k.flag, angle, ms, k.fixed); return {kind: 'fail', say: m.say}; }
    m.mark += 1;
    if (m.mark >= MARKS.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `With the ramp at ${angle} degrees and the dial at ${kmh(ms)} km/h, the skier landed ${m1(distance)}, on my 30 m mark, which finishes the job. You used speed to reach the far flag, the angle to reach the near flag, and both to reach my mark.`;
      return {kind: 'pass', say: m.say};
    }
    startMark();
    const next = MARKS[m.mark];
    if (m.mark === 1) {
      m.say = `Correct: at ${kmh(ms)} km/h the skier landed ${m1(distance)}, on the 42 m flag, because more speed carries the skier further. For the second mark, a flag stands at ${next.flag} m and the speed is fixed at ${kmh(next.ms)} km/h, so you must set the angle.`;
    } else {
      const other = angle > 45 ? 20 : 70;
      m.say = `Correct: with the ramp at ${angle} degrees the skier landed ${m1(distance)}, on the 27 m flag. A ramp at ${other} degrees would land close as well, at ${m1(distanceOf(other, ms))}. For the third mark you must reach my ${next.flag} m mark, and you may change both controls. I have set the ramp to ${next.angle} degrees and the dial to ${kmh(next.ms)} km/h.`;
    }
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto, id = step().id;
      m.lastPress = m.time;
      if (set.angle !== a.angle) {
        set.angle += Math.sign(a.angle - set.angle) * ANGLE_STEP;
        return id === 'word-angle' && set.angle === 45 ? tilted() : null;
      }
      if (set.ms !== a.ms) {
        set.ms += Math.sign(a.ms - set.ms) * SPEED_STEP;
        return id === 'word-speed' && set.ms === SHOW_MS ? turned() : null;
      }
      m.auto = null;
      return go();
    }
    if (m.gap > 0) {
      m.gap -= dt;
      if (m.gap <= 0) { m.gap = 0; launch(m.queue.shift(), set.ms); }
      return null;
    }
    const f = m.flight;
    if (!f) return null;
    f.t += dt * FLY_RATE;
    return f.t >= f.seconds + LAND_HOLD_S * FLY_RATE ? judge() : null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The launcher as the board draws it: the ramp, the dial, the skier in the air, and the trails of this step's launches.
  function rig() {
    const f = m.flight;
    return {angle: set.angle, ms: set.ms, kmh: kmh(set.ms),
      flight: f ? {angle: f.angle, ms: f.ms, t: Math.max(0, Math.min(f.t, f.seconds)), seconds: f.seconds, distance: f.distance, landed: f.t >= f.seconds} : null,
      trails: m.trails.map(t => ({...t}))};
  }

  function view() {
    const id = step().id;
    const flown = m.flight, lastRow = m.rows.at(-1);
    const shown = flown ? [flown.angle, flown.ms, flown.t >= flown.seconds ? flown.distance : null] : [set.angle, set.ms, lastRow && lastRow.angle === set.angle && lastRow.ms === set.ms ? lastRow.distance : null];
    const base = {scene: 'launcher', low: 'table', time: m.time, rig: rig(), formulas: id === 'wonder' ? [] : CHECKS[id] || id === 'recap' ? formulasFor(45, SHOW_MS) : formulasFor(...shown).slice(0, id === 'word-speed' ? 1 : id === 'word-angle' ? 3 : 6), ramp: null, dial: null, flag: null, rows: m.rows.map(r => ({...r})), job: null, runs: runs.map(r => ({...r})),
      focus: null, keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      const arcs = id === 'check-pair' ? [50, ...(answered ? [40, 55, 70] : [])].map(angle => ({angle, ms: SHOW_MS, lower: false, distance: distanceOf(angle, SHOW_MS)}))
        : id === 'check-lower' ? (answered ? [40, 45, 55] : []).map(angle => ({angle, ms: SHOW_MS, lower: true, distance: distanceOf(angle, SHOW_MS, true)})) : null;
      return {...base, scene: id, asking: !answered, answered, rig: null, arcs,
        kicker: id === 'check-game' ? {arcs: answered ? [SLOW_MS, 22].map(ms => ({ms, distance: distanceOf(50, ms)})) : []} : null,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, rig: null,
      say: `On level ground, a ramp of about 45 degrees sends the skier furthest, because it divides the speed evenly between moving forward and staying in the air. Greater speed carries the skier further, because the skier moves forward faster and also stays in the air for longer.${MORE}When the landing is lower than the ramp, the skier has longer to fall, so a flatter ramp goes furthest. On the Aerials run the kicker sets the angle, so the part you can change is your speed.`,
      prompt: 'Enter finishes the lesson and opens the Aerials run on the mountain.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'], focus: 'tape',
        say: done ? `At 60 degrees the skier went high but moved forward slowly, and landed ${D(60)} along the tape. At 30 degrees the skier stayed low but moved forward quickly, and landed ${D(30)}. Those are two very different jumps that land in nearly the same spot. Is there an angle that goes further than both?`
          : 'My launcher throws a skier along a tape that is marked in metres. First the ramp will be at 60 degrees, and then at 30 degrees, with the same speed both times. Watch where the skier lands each time.',
        prompt: done ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the tape.',
        hints: ['Watch where the skier lands on the tape each time.', 'One jump goes high and the other stays low.', done ? 'Press Enter when you are ready to find out.' : 'Watch, then press Enter.']};
    }
    if (id === 'word-angle') {
      const done = m.phase === 'done';
      return {...base, ramp: {angle: set.angle, locked: false}, focus: 'ramp', low: 'angle', best: goal(), split: true,
        ...(done ? {keys: ANGLE_KEYS, repeat: ['↑', '↓']} : {keys: ANGLE_KEYS, repeat: ['↑', '↓'], waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'ramp'}),
        say: done ? m.say : m.auto ? autoSay() : `Launch angle is how far the ramp points up from level ground, measured in degrees. The ramp starts at 60 degrees. Tilt it to 45 degrees, and watch the two arrows at the end of the ramp.${MORE}Level ground is 0 degrees and straight up is 90 degrees.`,
        prompt: done ? 'Press Enter to continue, or keep tilting the ramp with ↑ and ↓.' : `The ramp is at ${set.angle} degrees. Press ↓ to tilt it flatter or ↑ to tilt it steeper, or click Flatter or Steeper.`,
        hints: done ? DONE : ['Watch the angle on the ramp panel.', 'Press ↓ until the panel reads 45°.', 'Watch my pointer. I will tilt the ramp.']};
    }
    if (id === 'word-speed') {
      const done = m.phase === 'done';
      return {...base, ramp: {angle: set.angle, locked: true}, dial: {ms: set.ms, kmh: kmh(set.ms), locked: false}, focus: 'dial', low: 'speed', best: goal(), split: false,
        ...(done ? {keys: SPEED_KEYS, repeat: ['←', '→']} : {keys: SPEED_KEYS, repeat: ['←', '→'], waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'dial'}),
        say: done ? m.say : m.auto ? autoSay() : `Speed is how fast the skier is moving at the moment of leaving the ramp. We usually give speed in kilometres per hour, written km/h. The formulas use metres per second, written m/s, which is the number of metres travelled during each second.${MORE}To change km/h into m/s you divide by 3.6, because an hour has 3,600 seconds and a kilometre has 1,000 metres. The dial starts at ${kmh(SLOW_MS)} km/h. Turn it up to ${kmh(SHOW_MS)} km/h, and watch the formula beside the picture change.`,
        prompt: done ? 'Press Enter to continue, or keep turning the dial with ← and →.' : `The dial reads ${kmh(set.ms)} km/h. Press → for faster or ← for slower, or click Faster or Slower.`,
        hints: done ? DONE : ['The speed dial is on the right.', `Press → until the dial reads ${kmh(SHOW_MS)} km/h.`, 'Watch my pointer. I will turn the dial.']};
    }
    if (id === 'word-distance') {
      const ready = m.phase === 'ready', done = m.phase === 'done';
      return {...base, ramp: {angle: set.angle, locked: true}, dial: {ms: set.ms, kmh: kmh(set.ms), locked: true}, focus: 'tape', low: 'tape',
        ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'launcher', buttons: [LAUNCH]} : {}),
        say: done ? m.say : `Distance is how far along the ground the skier lands, measured from the end of the ramp and read on the tape. The ramp is at 45 degrees and the dial is at ${kmh(SHOW_MS)} km/h. Press Space to launch.`,
        prompt: ready ? 'Press Space to launch, or click the launcher.' : done ? 'Press Enter to continue.' : 'Watch the tape.',
        hints: done ? DONE : ['The tape runs along the floor from the end of the ramp.', 'Press Space.', 'Watch my pointer. I will launch.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], ramp: {angle: set.angle, locked: true}, dial: {ms: set.ms, kmh: kmh(set.ms), locked: true}, focus: 'tape',
        say: done ? `The ramp at about 45 degrees sent the skier furthest, ${D(45)} along the tape. A steeper ramp sends more of the speed upward, so the skier stays in the air for a long time but moves forward slowly. A flatter ramp sends more of the speed forward, but the skier comes down too soon. The distance depends on the forward speed multiplied by the time in the air, and that product is greatest near 45 degrees. That is also why two ramps equally far either side of 45 degrees land close together, such as 30 and 60 degrees, or 15 and 75 degrees.`
          : `The launcher will now make five launches at ${kmh(SHOW_MS)} km/h, with the ramp at 15, 30, 45, 60 and 75 degrees. Watch the tape and the table.`,
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the tape.',
        hints: ['Watch the distances in the table.', 'Which angle sent the skier furthest?', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The tries and Brian's job: the ramp panel, the speed dial and the launcher.
    const setNow = setting() && !m.auto, g = goal(), atGoal = set.angle === g.angle && set.ms === g.ms;
    const keys = !setNow ? {} : {...(canAngle() ? ANGLE_KEYS : {}), ...(canSpeed() ? SPEED_KEYS : {}), Space: 'go'};
    const flying = m.phase === 'flying';
    const v = {...base, split: setNow, ramp: {angle: set.angle, locked: !canAngle()}, dial: {ms: set.ms, kmh: kmh(set.ms), locked: !canSpeed()}, keys, buttons: setNow ? [LAUNCH] : [],
      repeat: setNow ? [...(canAngle() ? ['↑', '↓'] : []), ...(canSpeed() ? ['←', '→'] : [])] : [], target: !setNow ? null : atGoal ? 'go' : 'set:best',
      glow: setNow ? 'set' : null, waiting: setNow || m.phase === 'guess', best: g};
    if (id === 'try-free') {
      if (flying) return {...v, focus: 'tape', say: m.say, prompt: 'Watch the tape.', hints: ['Watch where the skier lands.', 'Compare it with the table.', 'Wait a moment.']};
      return {...v, target: 'set:best', say: m.say || `Now you can experiment. Press ↑ and ↓ to tilt the ramp, and ← and → to change the speed. Test at least ${FREE_TRIES} different settings.${MORE}Watch the arrows and the formulas change as you do, and predict where the skier will land before you press Space. The table keeps your results so that you can compare them.`,
        waiting: !seen.has(id), prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the settings, then press Space to launch. Different settings tested so far: ${m.tries} of ${FREE_TRIES}.`,
        hints: ['Press Space to test the settings as they are.', 'Try a very steep ramp, a very flat ramp, and a fast and a slow dial.', 'Watch my pointer. I will set a ramp you have not tested yet, and launch.']};
    }
    if (id === 'try-flag') {
      const flagged = {...v, flag: FLAG_M};
      if (m.phase === 'guess') return {...flagged, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: TILT_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'tilt', way: c.way}, state: null})),
        say: `A flag stands at ${FLAG_M} m on the tape. With the ramp at 45 degrees and the dial at ${kmh(SHOW_MS)} km/h, the skier lands ${D(45)}, which is beyond the flag. Which way should you tilt the ramp to bring the skier back to the flag?${MORE}The speed must stay at ${kmh(SHOW_MS)} km/h.`,
        prompt: 'Pick a card by clicking it, or press 1, 2 or 3.', hints: ['A ramp at 45 degrees sends the skier furthest.', 'Does a steeper ramp land shorter? Does a flatter ramp?', 'Pick a card. Any guess lets you go on.']};
      if (flying) return {...flagged, focus: 'tape', say: m.say, prompt: 'Watch the tape.', hints: ['Watch where the skier lands against the flag.', 'Compare this launch with the 45 degree row.', 'Wait a moment.']};
      if (m.phase === 'done') return {...flagged, focus: 'tape', mood: TILT_GUESSES[m.guess]?.way === 'either' ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...flagged, say: m.auto ? autoSay() : m.say,
        prompt: `The ramp is at ${set.angle} degrees and the dial is at ${kmh(SHOW_MS)} km/h. Press ↑ for steeper or ↓ for flatter, then Space to launch.`,
        hints: ['The flag is at 30 m, and a ramp at 45 degrees lands beyond it.', `Tilt the ramp away from 45 degrees, either steeper or flatter, and press Space. A ramp at ${set.angle > 45 ? 60 : 30} degrees will do.`, 'Watch my pointer. I will tilt the ramp and launch.']};
    }
    if (id === 'try-speed') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: SLOW_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'tape', at: [distanceOf(45, SHOW_MS), c.at]}, state: null})),
        say: m.say, prompt: 'Pick a card by clicking it, or press 1, 2 or 3.', hints: [`At ${kmh(SHOW_MS)} km/h the skier landed ${D(45)}.`, 'A slower skier lands shorter, but by how much?', 'Pick a card. Any guess lets you go on.']};
      if (flying) return {...v, focus: 'tape', say: m.say, prompt: 'Watch the tape.', hints: ['Watch where the skier lands.', 'Compare this launch with the first row.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, focus: 'tape', mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `The ramp stays at 45 degrees. At ${kmh(SHOW_MS)} km/h the skier landed ${D(45)} along the tape. Turn the dial down to ${kmh(SLOW_MS)} km/h, then press Space, and you can guess where the skier will land.`,
        prompt: `The dial reads ${kmh(set.ms)} km/h. Press ← for slower or → for faster, then Space to launch.`,
        hints: ['The speed dial is on the right.', `Press ← until the dial reads ${kmh(SLOW_MS)} km/h, then press Space.`, 'Watch my pointer. I will turn the dial and launch.']};
    }
    // Brian's job.
    const k = mark();
    const job = {mark: Math.min(m.mark, MARKS.length - 1) + 1, of: MARKS.length, flag: k.flag, fixed: k.fixed, done: m.phase === 'done'};
    const jv = {...v, job, flag: k.flag, low: 'job', focus: flying ? 'tape' : null};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (flying) return {...jv, say: m.say, prompt: 'Watch the tape.', hints: ['Watch where the skier lands against the flag.', 'Did the skier land short of the flag or beyond it?', 'Wait a moment.']};
    const intro = `Here is a job for you, with three marks to reach. First, a flag stands at ${MARKS[0].flag} m and the ramp is fixed at 45 degrees, so you must set the speed.`;
    const what = k.fixed === 'angle' ? 'The ramp is fixed, so set the speed.' : k.fixed === 'speed' ? 'The speed is fixed, so set the angle.' : 'You may change both controls.';
    return {...jv,
      say: m.auto ? autoSay() : m.mark === 0 && !m.say ? intro : m.say,
      prompt: `Mark ${job.mark}: the flag is at ${k.flag} m. ${what} The ramp is at ${set.angle} degrees and the dial is at ${kmh(set.ms)} km/h. Press Space to launch.`,
      hints: k.fixed === 'angle' ? ['More speed lands the skier further.', `At 45 degrees and ${kmh(22)} km/h the skier lands ${D(45, 22)}. Press → until the dial reads ${kmh(22)} km/h, then press Space.`, 'Watch my pointer. I will turn the dial and launch.']
        : k.fixed === 'speed' ? ['The flag is nearer than the 45 degree landing, so tilt the ramp away from 45 degrees.', `At ${kmh(22)} km/h, a ramp at 20 degrees lands the skier ${D(20, 22)} and a ramp at 70 degrees lands the skier ${D(70, 22)}. Pick one, then press Space.`, 'Watch my pointer. I will tilt the ramp and launch.']
          : ['Start from 45 degrees, which goes furthest, and then find the speed.', `A ramp at 45 degrees and a dial at ${kmh(SLOW_MS)} km/h land the skier ${D(45, SLOW_MS)}. Set those, then press Space.`, 'Watch my pointer. I will set both controls and launch.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own launches, as the bench's challenge reads them: the bench's goal (a landing within 2 m of the 30 m mark)
// passes on these. Several steps land on 30 m (the wonder's 60 degrees, the flag try, mark 3), so a finished lesson has one.
export const benchAttempts = view => (view?.runs ?? []).map(({angle, ms}) => ({controls: [{id: 'angleDeg'}, {id: 'speedMs'}, {id: 'air'}, {id: 'landing'}],
  input: {angleDeg: angle, speedMs: ms, air: 'air', landing: 'level'}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = 'You have passed Launch angles, and the Aerials run is now open on the mountain. The kicker sets the angle, so hold Shift to tuck on the inrun and arrive with more speed.';

export const lesson = Object.freeze({id: 'launch', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
