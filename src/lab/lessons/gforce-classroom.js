// The G-force classroom lesson. It uses the same turning rule as the G-force challenge.
import {lateralG} from '../benches/gforce.js';

const GRAVITY = 9.81;
// The dial holds whole kilometres per hour. The challenge's rule takes the game's miles per hour.
const KMH_PER_MPH = 1.609344;
const KMH_PER_MS = 3.6;
const BASE = Object.freeze({speed: 50, radius: 50});
const TWICE_SPEED = 2 * BASE.speed;
const THREE_TIMES_SPEED = 3 * BASE.speed;
const MIN_SPEED = 20;
const MAX_SPEED = 240;
const SPEED_STEP = 10;
const MIN_RADIUS = 10;
const MAX_RADIUS = 200;
const RADIUS_STEP = 25;
const FREE_TRIES = 3;
const TIGHT_RADIUS = 25;
// Which card holds the right reading in each prediction, so the right card is not always the first.
const SPEED_RIGHT = 1, RADIUS_RIGHT = 2;
const FREE_RADII = Object.freeze([10, 25, 35, 50, 60, 75, 85, 100, 110, 125, 135, 150, 160, 175, 185, 200]);
const AUTO_GAP_S = .14, HELD_GAP_S = .14;
// Kyle, 19 November: a watch with several things moving lasts about ten seconds, and R plays it again.
const WONDER_S = 10, WATCH_S = 10.5;
const SPEED_KEYS = Object.freeze({'←': 'speed:down', '→': 'speed:up'});
const RADIUS_KEYS = Object.freeze({'↓': 'radius:down', '↑': 'radius:up'});

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does the cord lean?'},
  {id: 'word-speed', part: 1, title: 'Speed and its units', word: 'gforce-speed'},
  {id: 'word-radius', part: 1, title: 'The radius of a turn', word: 'radius'},
  {id: 'word-acceleration', part: 1, title: 'Velocity and acceleration', word: 'gforce-acceleration'},
  {id: 'word-g', part: 1, title: 'Measuring sideways push', word: 'gforce', words: ['one-g']},
  {id: 'formula', part: 1, title: 'The G-force rule'},
  {id: 'watch', part: 2, title: 'Speed and radius change the reading'},
  {id: 'try-speed', part: 3, title: 'Predict a faster turn'},
  {id: 'try-radius', part: 3, title: 'Predict a tighter turn'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'alone', part: 4, title: "Brian's 2 g test"},
  {id: 'check-speed', part: 5, title: 'Question 1 of 3'},
  {id: 'check-radius', part: 5, title: 'Question 2 of 3'},
  {id: 'check-rule', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.gforce.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'turning', text: 'A turning car keeps changing direction, so it needs a sideways push. The driver feels that push.'},
  {id: 'speed', text: 'Sideways acceleration is the speed squared, divided by the radius, so doubling the speed makes four times the G-force when the radius stays fixed.'},
  {id: 'radius', text: 'Sideways acceleration is divided by the turn radius, so doubling the radius halves the G-force when the speed stays fixed.'},
].map(Object.freeze));

export const CHALLENGE_CARD = Object.freeze({
  title: 'Reach 2 g in three different corners.',
  text: 'Drive a lap on a course you own. Reach at least 2 g in three different corners without leaving the road.',
});

// Keep the notebook ids from the earlier lesson so saved notebooks still match.
export const WORDS = Object.freeze([
  {id: 'gforce', word: 'G-force', meaning: 'G-force is sideways acceleration compared with Earth’s gravitational acceleration near the ground.'},
  {id: 'one-g', word: 'One g', meaning: 'One g is the rate at which a dropped stone speeds up near the ground, 9.81 metres per second squared (m/s²).'},
  {id: 'radius', word: 'Radius', meaning: 'Radius is the distance from the centre of a circular turn to the car, measured in metres (m).'},
  {id: 'gforce-speed', word: 'Speed', meaning: 'Speed is distance travelled during a set time. The dial uses kilometres per hour (km/h), and the formula uses metres per second (m/s).'},
  {id: 'gforce-acceleration', word: 'Acceleration', meaning: 'Acceleration is how quickly velocity changes. Velocity is speed in a direction, and acceleration is measured in metres per second squared (m/s²), a change of so many m/s during each second.'},
].map(Object.freeze));

const mpsFromDial = speed => speed / KMH_PER_MS;
const meter = (speed, radius) => lateralG(speed / KMH_PER_MPH, radius);
const shown = value => value.toFixed(2);
const settingsKey = (speed, radius) => `${speed}/${radius}`;
const FORMULA = 'G-force (g) = (speed in m/s)² ÷ radius in m ÷ 9.81 m/s²';

function formulaRows(speed, radius, {worked = true, includeSpeed = true} = {}) {
  const entries = [];
  // Four decimal places, so that the reading on the line is the meter's own reading when a calculator does the working.
  const roundedMps = Number(mpsFromDial(speed).toFixed(4));
  const readingFromShownSpeed = (roundedMps ** 2 / radius / GRAVITY).toFixed(2);
  if (includeSpeed) {
    entries.push({
      title: 'Change the speed unit',
      formula: 'speed in m/s = speed in km/h ÷ 3.6',
      worked: worked ? `${speed} km/h ÷ 3.6 = ${roundedMps.toFixed(4)} m/s` : '',
      note: 'A kilometre is 1,000 metres and an hour is 3,600 seconds, so dividing by 3.6 turns km/h into m/s. The meter uses the same setting.',
    });
  }
  entries.push({
    title: 'The G-force rule',
    formula: FORMULA,
    worked: worked
      ? `(${roundedMps.toFixed(4)} m/s)² ÷ ${radius} m ÷ ${GRAVITY} m/s² = ${readingFromShownSpeed} g`
      : '',
    note: worked
      ? 'The last division compares the sideways acceleration with one g, 9.81 m/s². The meter shows the same reading to two decimal places.'
      : 'The last division compares sideways acceleration with one g, which is 9.81 m/s².',
  });
  return entries;
}

const reading = (speed, radius) => shown(meter(speed, radius));
const baseReading = reading(BASE.speed, BASE.radius);

const CHECKS = Object.freeze({
  'check-speed': Object.freeze({
    question: `At the same 50 m radius, which speed gives the larger reading: ${BASE.speed} km/h or ${TWICE_SPEED} km/h?`,
    answers: [`${BASE.speed} km/h gives the larger reading.`, 'Both speeds give the same reading.', `${TWICE_SPEED} km/h gives the larger reading.`],
    correct: 2,
    right: `That is right. At ${TWICE_SPEED} km/h the meter reads ${reading(TWICE_SPEED, 50)} g. At ${BASE.speed} km/h it reads ${reading(BASE.speed, 50)} g, because the speed is squared, and half the speed makes ½ × ½ = ¼ of the reading.`,
    wrong: `At ${TWICE_SPEED} km/h the meter reads ${reading(TWICE_SPEED, 50)} g. At ${BASE.speed} km/h it reads ${reading(BASE.speed, 50)} g, because the speed is squared, and half the speed makes ½ × ½ = ¼ of the reading.`,
  }),
  'check-radius': Object.freeze({
    question: `At ${BASE.speed} km/h, which turn radius gives the larger reading: 25 m or 100 m?`,
    answers: ['25 m gives the larger reading.', '100 m gives the larger reading.', 'Both radii give the same reading.'],
    correct: 0,
    right: `That is right. At 25 m the meter reads ${reading(BASE.speed, 25)} g, and at 100 m it reads ${reading(BASE.speed, 100)} g. A larger radius is a larger number to divide by, so the reading falls.`,
    wrong: `At 25 m the meter reads ${reading(BASE.speed, 25)} g, and at 100 m it reads ${reading(BASE.speed, 100)} g. A larger radius is a larger number to divide by, so the reading falls.`,
  }),
  'check-rule': Object.freeze({
    question: 'Which sentence describes the G-force rule?',
    answers: [
      'The reading rises in direct proportion to speed and radius.',
      'The reading rises with the square of speed and falls as radius grows.',
      'The reading falls as speed rises and radius shrinks.',
    ],
    correct: 1,
    right: 'Correct. Sideways acceleration is the speed squared, divided by the radius.',
    wrong: 'Sideways acceleration is the speed squared, divided by the radius. More speed raises the squared value, and a shorter radius also raises the reading.',
  }),
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clampSpeed = speed => clamp(speed, MIN_SPEED, MAX_SPEED);
const clampRadius = radius => clamp(radius, MIN_RADIUS, MAX_RADIUS);
const isCheck = id => Object.hasOwn(CHECKS, id);

export function createModel() {
  const tested = new Set();
  const rows = [];
  let speed = BASE.speed;
  let radius = BASE.radius;
  let m = {index: 0, time: 0, phase: 'watch', say: '', guess: null, auto: null, lastPress: -1};
  const step = () => STEPS[m.index];
  const id = () => step().id;
  const result = () => meter(speed, radius);

  function row(kind, currentSpeed, currentRadius, g) {
    return {kind, speed: currentSpeed, radius: currentRadius, g: shown(g)};
  }

  function enter(index) {
    m = {index, time: 0, phase: 'ready', say: '', guess: null, auto: null, lastPress: -1};
    switch (id()) {
      case 'wonder':
      case 'formula':
      case 'watch':
      case 'alone':
      case 'recap':
        speed = BASE.speed;
        radius = BASE.radius;
        break;
      case 'try-free':
        speed = BASE.speed;
        radius = BASE.radius;
        rows.splice(0);
        tested.clear();
        break;
      case 'word-speed':
        speed = BASE.speed - SPEED_STEP;
        radius = BASE.radius;
        break;
      case 'word-radius':
        speed = BASE.speed;
        radius = 100;
        break;
      case 'word-acceleration':
      case 'word-g':
        speed = BASE.speed;
        radius = BASE.radius;
        break;
      case 'try-speed':
        speed = BASE.speed;
        radius = BASE.radius;
        m.phase = 'guess';
        break;
      case 'try-radius':
        speed = BASE.speed;
        radius = BASE.radius;
        m.phase = 'guess';
        break;
      default:
        if (isCheck(id())) m.phase = 'ask';
    }
  }

  function goal() {
    switch (id()) {
      case 'word-speed': return {speed: BASE.speed, radius};
      case 'word-radius': return {speed, radius: BASE.radius};
      case 'try-speed': return {speed: THREE_TIMES_SPEED, radius: BASE.radius};
      case 'try-radius': return {speed: BASE.speed, radius: TIGHT_RADIUS};
      case 'alone': return {speed: THREE_TIMES_SPEED, radius: BASE.radius};
      case 'try-free': {
        const preferred = [
          {speed: TWICE_SPEED, radius: BASE.radius},
          {speed: BASE.speed, radius: 75},
          {speed: THREE_TIMES_SPEED, radius: BASE.radius},
        ];
        const nextPreferred = preferred.find(choice => !tested.has(settingsKey(choice.speed, choice.radius)));
        if (nextPreferred) return nextPreferred;
        for (let candidateSpeed = MIN_SPEED; candidateSpeed <= MAX_SPEED; candidateSpeed += SPEED_STEP) {
          for (const candidateRadius of FREE_RADII) {
            const key = settingsKey(candidateSpeed, candidateRadius);
            if (key !== settingsKey(BASE.speed, BASE.radius) && !tested.has(key)) {
              return {speed: candidateSpeed, radius: candidateRadius};
            }
          }
        }
        return {speed, radius};
      }
      default: return {speed, radius};
    }
  }

  function autoText(target) {
    const changes = [];
    if (target.speed !== speed) changes.push(`set the speed dial to ${target.speed} km/h`);
    if (target.radius !== radius) changes.push(`set the turn radius to ${target.radius} m`);
    const action = id() === 'try-free' || id() === 'alone' ? ' and run the turn' : '';
    return changes.length
      ? `I will ${changes.join(' and ')}${action}.`
      : 'I will run this turn now.';
  }

  function targetAction() {
    const next = goal();
    if (next.speed !== speed || next.radius !== radius) return 'set:best';
    if (id() === 'try-free' || id() === 'alone') return 'run';
    return null;
  }

  function startAuto() {
    if (m.auto) return null;
    m.auto = goal();
    m.lastPress = m.time;
    m.say = autoText(m.auto);
    return {kind: 'progress', say: m.say};
  }

  function move(kind, direction, automatic = false, held = false) {
    if (m.auto && !automatic) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = kind === 'speed' ? speed : radius;
    if (kind === 'speed') speed = clampSpeed(speed + direction * SPEED_STEP);
    else radius = clampRadius(radius + direction * RADIUS_STEP);
    const after = kind === 'speed' ? speed : radius;
    if (before === after) {
      if (held || automatic) return null;
      m.say = kind === 'speed'
        ? `${direction > 0 ? 'The speed dial is already at its top' : 'The speed dial is already at its bottom'}, ${speed} km/h.`
        : `The radius control is already at its ${direction > 0 ? 'outer' : 'inner'} limit, ${radius} m.`;
      return {kind: 'note', say: m.say};
    }
    m.lastPress = m.time;
    if (id() === 'word-speed' && speed === BASE.speed && m.phase !== 'done') {
      m.phase = 'done';
      m.say = `The dial now shows ${speed} km/h. The formula changes that speed into ${mpsFromDial(speed).toFixed(4)} m/s by dividing by 3.6.`;
      return {kind: 'right', say: m.say};
    }
    if (id() === 'word-radius' && radius === BASE.radius && m.phase !== 'done') {
      m.phase = 'done';
      m.say = `The radius is now ${radius} m, measured from the marked centre to the car, and that is the radius of the turn you watched.`;
      return {kind: 'right', say: m.say};
    }
    // While Brian sets the dials he keeps the line that says what he is doing.
    if (automatic) return null;
    m.say = `The dial shows ${speed} km/h, and the radius is ${radius} m. The meter reads ${reading(speed, radius)} g.`;
    return {kind: 'progress', say: m.say};
  }

  function record() {
    const key = settingsKey(speed, radius);
    if (id() === 'try-free') {
      if (key === settingsKey(BASE.speed, BASE.radius)) {
        m.say = `The starting turn reads ${reading(speed, radius)} g. Change the speed or the radius before you run a turn to compare.`;
        return {kind: 'note', say: m.say};
      }
      if (tested.has(key)) {
        m.say = 'That speed and radius are already in the table. Change at least one setting before you run another turn.';
        return {kind: 'note', say: m.say};
      }
      tested.add(key);
      rows.push(row('free', speed, radius, result()));
      m.say = `At ${speed} km/h and ${radius} m, the meter reads ${reading(speed, radius)} g. ${tested.size >= FREE_TRIES ? 'A higher speed or a shorter radius gives a bigger reading.' : 'Change a setting to run a different turn.'}`;
      if (tested.size >= FREE_TRIES) m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'try-speed' || id() === 'try-radius') {
      const expected = goal();
      if (speed !== expected.speed || radius !== expected.radius) {
        m.say = `Set the speed to ${expected.speed} km/h and the radius to ${expected.radius} m, then run the turn.`;
        return {kind: 'note', say: m.say};
      }
      rows.push(row(id(), speed, radius, result()));
      m.phase = 'done';
      const correct = m.guess === (id() === 'try-speed' ? SPEED_RIGHT : RADIUS_RIGHT);
      if (id() === 'try-speed') {
        const times = speed / BASE.speed;
        m.say = correct
          ? `That is right. At ${speed} km/h the meter reads ${reading(speed, radius)} g, and at ${BASE.speed} km/h it read ${baseReading} g. The reading is ${times * times} times as large, because ${times} × ${times} = ${times * times}.`
          : `At ${speed} km/h the meter reads ${reading(speed, radius)} g, and at ${BASE.speed} km/h it read ${baseReading} g. The reading is ${times * times} times as large, because ${speed} ÷ ${BASE.speed} = ${times}, and ${times} × ${times} = ${times * times}.`;
      } else {
        m.say = correct
          ? `That is right. At ${TIGHT_RADIUS} m the meter reads ${reading(speed, radius)} g, and at ${BASE.radius} m it read ${baseReading} g. The radius is half as large, so the reading is twice as large.`
          : `At ${TIGHT_RADIUS} m the meter reads ${reading(speed, radius)} g, and at ${BASE.radius} m it read ${baseReading} g. A ${TIGHT_RADIUS} m radius is half of ${BASE.radius} m, and the rule divides by the radius, so the reading is twice as large.`;
      }
      return {kind: correct ? 'right' : 'wrong', say: m.say};
    }
    if (id() === 'alone') {
      if (key === settingsKey(BASE.speed, BASE.radius)) {
        m.say = `The starting turn reads ${reading(speed, radius)} g, below the 2 g target. Change the speed or the radius before you run the turn again.`;
        return {kind: 'fail', say: m.say};
      }
      if (result() < 2) {
        m.say = `This turn reads ${reading(speed, radius)} g, below the 2 g target. Raise the speed or shorten the radius, then try again.`;
        return {kind: 'fail', say: m.say};
      }
      m.phase = 'done';
      m.say = `This turn reads ${reading(speed, radius)} g, which reaches the target of at least 2 g after you changed the speed or the radius.`;
      return {kind: 'pass', say: m.say};
    }
    return null;
  }

  function act(action) {
    const held = action.endsWith(':held');
    const [kind, raw] = (held ? action.slice(0, -5) : action).split(':');
    if (kind === 'replay') {
      if (id() === 'wonder' || id() === 'watch') enter(m.index);
      return null;
    }
    if (kind === 'set' && raw === 'best') return startAuto();
    if (kind === 'speed' && ['ready', 'set', 'done'].includes(m.phase)) return move('speed', raw === 'up' ? 1 : -1, false, held);
    if (kind === 'radius' && ['ready', 'set', 'done'].includes(m.phase)) return move('radius', raw === 'up' ? 1 : -1, false, held);
    if (kind === 'run' && (['ready', 'set'].includes(m.phase) || id() === 'try-free' && m.phase === 'done')) return record();
    if (kind === 'answer' && (m.phase === 'guess' || m.phase === 'ask')) {
      const picked = Number(raw);
      if (!Number.isInteger(picked) || picked < 0 || picked > 2) return null;
      if (isCheck(id())) {
        const check = CHECKS[id()];
        m.phase = 'done';
        m.guess = picked;
        m.say = picked === check.correct ? check.right : check.wrong;
        return {kind: picked === check.correct ? 'right' : 'wrong', say: m.say};
      }
      m.guess = picked;
      m.phase = 'set';
      if (id() === 'try-speed') {
        m.say = `Your prediction is recorded. Now raise the speed to ${THREE_TIMES_SPEED} km/h, keep the radius at 50 m, and run the turn.`;
      } else {
        m.say = `Your prediction is recorded. Now keep the speed at ${BASE.speed} km/h, set the radius to ${TIGHT_RADIUS} m, and run the turn.`;
      }
      return {kind: 'progress', say: m.say};
    }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    if (id() === 'watch' && m.phase !== 'done') {
      if (m.time < 2) {
        speed = BASE.speed;
        radius = BASE.radius;
      } else if (m.time < 5.5) {
        speed = TWICE_SPEED;
        radius = BASE.radius;
      } else if (m.time < 7) {
        speed = BASE.speed;
        radius = BASE.radius;
      } else {
        speed = BASE.speed;
        radius = 100;
      }
    }
    if (m.auto) {
      if (m.time - m.lastPress < AUTO_GAP_S) return null;
      m.lastPress = m.time;
      if (speed !== m.auto.speed) return move('speed', Math.sign(m.auto.speed - speed), true);
      if (radius !== m.auto.radius) return move('radius', Math.sign(m.auto.radius - radius), true);
      m.auto = null;
      if (['try-free', 'try-speed', 'try-radius', 'alone'].includes(id())) return record();
      if (id() === 'word-speed' || id() === 'word-radius') {
        m.phase = 'done';
        return null;
      }
    }
    if ((id() === 'wonder' || id() === 'watch') && m.phase !== 'done' && m.time >= (id() === 'wonder' ? WONDER_S : WATCH_S)) {
      m.phase = 'done';
      if (id() === 'watch') {
        rows.push(row('watch-speed', TWICE_SPEED, 50, meter(TWICE_SPEED, 50)));
        rows.push(row('watch-radius', BASE.speed, 100, meter(BASE.speed, 100)));
        m.say = `At ${BASE.speed} km/h and 50 m, the meter reads ${baseReading} g. At ${TWICE_SPEED} km/h and 50 m, it reads ${reading(TWICE_SPEED, 50)} g, because doubling the speed makes 2 × 2 = 4 times the reading. At ${BASE.speed} km/h and 100 m, it reads ${reading(BASE.speed, 100)} g, because doubling the radius halves the reading.`;
        return {kind: 'right', say: m.say};
      }
      m.say = `The cord leaned outward as the car went round, and the meter read ${baseReading} g. Why does the cord lean, and which change would make the meter read more?`;
      return {kind: 'right', say: m.say};
    }
    return null;
  }

  function formulasForView() {
    const current = id();
    if (current === 'wonder') return [];
    if (current === 'word-speed') return formulaRows(speed, radius, {worked: true, includeSpeed: true}).slice(0, 1);
    if (current === 'word-radius') return [{
      title: 'Measure the turn radius',
      formula: 'radius = distance from the marked centre to the car',
      worked: `${radius} m`,
      note: 'The arm moves the car inward for a shorter radius and outward for a longer radius.',
    }];
    if (current === 'word-acceleration') return [{
      title: 'Acceleration and velocity',
      formula: 'acceleration = change in velocity ÷ time',
      worked: '',
      note: 'Velocity is speed in a direction. Acceleration is measured in metres per second squared, written m/s², which means a change in m/s during each second.',
    }];
    if (current === 'word-g') return [{
      title: 'One g',
      formula: '1 g = 9.81 m/s²',
      worked: '',
      note: 'Dividing one acceleration by another compares their sizes.',
    }];
    if (current === 'try-speed' && m.phase === 'guess') return formulaRows(speed, radius, {worked: false, includeSpeed: true});
    if (current === 'try-radius' && m.phase === 'guess') return formulaRows(speed, radius, {worked: false, includeSpeed: true});
    if (isCheck(current) && m.phase === 'ask') return formulaRows(BASE.speed, BASE.radius, {worked: false, includeSpeed: false});
    if (current === 'formula') return formulaRows(speed, radius, {worked: true, includeSpeed: true});
    if (current === 'try-speed' && m.phase === 'set' && m.guess !== null) return formulaRows(speed, radius);
    if (current === 'try-radius' && m.phase === 'set' && m.guess !== null) return formulaRows(speed, radius);
    if (current === 'watch') return formulaRows(speed, radius);
    if (current === 'try-free' || current === 'alone' || current === 'recap') return formulaRows(speed, radius);
    return [];
  }

  function view() {
    const current = id();
    const done = m.phase === 'done';
    const check = isCheck(current) ? CHECKS[current] : null;
    const answersOpen = m.phase === 'guess' || m.phase === 'ask';
    const controlsOn = ['word-speed', 'word-radius', 'try-speed', 'try-radius', 'try-free', 'alone'].includes(current);
    const keys = {};
    if (controlsOn && !m.auto && (!done || ['word-speed', 'word-radius', 'try-free'].includes(current))) {
      Object.assign(keys, SPEED_KEYS, RADIUS_KEYS);
      if (['try-free', 'alone'].includes(current)) keys.Space = 'run';
      if (['try-speed', 'try-radius'].includes(current) && m.phase === 'set') keys.Space = 'run';
    }
    if (answersOpen) Object.assign(keys, {1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});

    const base = {
      scene: current,
      time: m.time,
      setting: speed,
      speedKmh: speed,
      radiusM: radius,
      g: answersOpen ? null : result(),
      formulas: formulasForView(),
      rows: rows.map(item => ({...item})),
      keys,
      repeat: Object.keys(keys).filter(key => ['←', '→', '↑', '↓'].includes(key)),
      buttons: [],
      actions: done && (current === 'wonder' || current === 'watch') ? ['replay'] : [],
      cards: [],
      focus: ['word-speed', 'try-speed'].includes(current) ? 'speed' : ['word-radius', 'try-radius'].includes(current) ? 'radius' : null,
      pointOnly: answersOpen,
      asking: answersOpen,
      answered: check ? done : false,
      target: null,
      glow: null,
      waiting: false,
      ready: done || current === 'recap',
      say: m.say,
      prompt: '',
      hints: [],
      meterBaseline: baseReading,
      best: goal(),
      radiusKnown: m.index >= STEPS.findIndex(step => step.id === 'word-radius'),
      accelerationKnown: m.index >= STEPS.findIndex(step => step.id === 'word-acceleration'),
    };

    if (current === 'wonder') return {
      ...base,
      waiting: !done,
      ready: done,
      say: done ? m.say : 'A car on an arm goes around a marked circle, and a cord with a weight hangs inside the car beside a meter. Watch the cord lean outward as the car turns.',
      prompt: done ? 'Continue when you are ready to find out, or watch it again.' : 'Watch the cord and the sideways arrow.',
      hints: ['Watch the cord and the arrow beside the car.', 'The sideways arrow grows with the meter reading.', 'Wait for Brian to finish.'],
    };

    if (current === 'word-speed') {
      const target = targetAction();
      return {
        ...base,
        waiting: !done,
        target,
        glow: 'speed',
        say: done ? m.say : m.auto ? m.say : 'Speed is the distance travelled during a set time. The dial shows kilometres per hour, written km/h, and the formula uses metres per second, written m/s, which counts the metres travelled each second.',
        prompt: done ? 'Continue when you are ready, or keep changing the speed to watch the formula.' : `The dial reads ${speed} km/h. Turn it to ${BASE.speed} km/h, the speed of the car on the arm, and watch the formula change it into m/s.`,
        hints: ['The speed is shown on the right dial.', `Use ← to lower the reading or → to raise it until it shows ${BASE.speed} km/h.`, `Watch my pointer. I will set the speed dial to ${BASE.speed} km/h.`],
      };
    }

    if (current === 'word-radius') {
      return {
        ...base,
        waiting: !done,
        target: done ? null : 'set:best',
        glow: 'radius',
        say: done ? m.say : m.auto ? m.say : 'Radius is the distance from the centre of a circular turn to the car. The arm marks this distance, and its control moves the car inward for a shorter radius or outward for a longer radius.',
        prompt: done ? 'Continue when you are ready, or keep changing the radius.' : `The radius is ${radius} m. Set it to ${BASE.radius} m, the radius of the turn you watched.`,
        hints: ['Follow the arm from the marked centre to the car.', 'Use ↓ to shorten the radius or ↑ to lengthen it until it reads 50 m.', 'Watch my pointer. I will set the radius to 50 m.'],
      };
    }

    if (current === 'word-acceleration') return {
      ...base,
      ready: true,
      say: 'Velocity is speed in a direction, and acceleration is how quickly velocity changes. A turning car changes direction even at a steady speed, so it accelerates sideways, and the weight on the cord leans outward because it tries to keep going straight.',
      prompt: 'Continue when you are ready.',
      hints: ['Velocity includes a direction.', 'Acceleration measures a change in velocity over time.', 'Press Enter to continue.'],
    };

    if (current === 'word-g') return {
      ...base,
      ready: true,
      say: 'One g is the acceleration of a dropped stone near the ground, 9.81 m/s\u00b2. G-force compares the car\u2019s sideways acceleration with one g, so a sideways acceleration of 9.81 m/s\u00b2 is 1 g.',
      prompt: 'Continue to see the rule that gives the reading.',
      hints: ['One g is 9.81 m/s².', 'The meter compares sideways acceleration with one g.', 'Press Enter to continue.'],
    };

    if (current === 'formula') return {
      ...base,
      ready: true,
      say: 'Sideways acceleration is the speed in m/s squared, divided by the radius in m, and squared means multiplied by itself. The reading in g is that acceleration divided by 9.81 m/s².',
      prompt: 'Continue to watch how speed and radius change the reading.',
      hints: ['Speed is squared in this rule.', 'Radius and 9.81 m/s² divide the squared speed.', 'Press Enter to continue.'],
    };

    if (current === 'watch') return {
      ...base,
      waiting: !done,
      ready: done,
      say: done ? m.say : `I will raise the speed from ${BASE.speed} to ${TWICE_SPEED} km/h while the radius stays at 50 m, and then I will go back to ${BASE.speed} km/h and widen the radius to 100 m. Watch the cord, the arrow, the meter and the formula as I change one setting at a time.`,
      prompt: done ? 'Continue when you are ready, or watch it again.' : 'Watch the car turn and the readings change.',
      hints: ['Watch the sideways arrow as the car goes faster.', 'Then watch the cord and meter as the turn radius grows.', 'Wait for Brian to finish.'],
    };

    if (current === 'try-speed' || current === 'try-radius') {
      const speedTry = current === 'try-speed';
      if (answersOpen) {
        // The right reading is on a different card in each prediction; the wrong cards are the common mistakes.
        const labels = speedTry
          ? [`${(meter(BASE.speed, BASE.radius) * 3).toFixed(2)} g.`, `${reading(THREE_TIMES_SPEED, 50)} g.`, `${reading(TWICE_SPEED, 50)} g.`]
          : [`${reading(BASE.speed, 100)} g.`, `${baseReading} g.`, `${reading(BASE.speed, TIGHT_RADIUS)} g.`];
        return {
          ...base,
          g: null,
          waiting: true,
          ready: false,
          target: `answer:${speedTry ? SPEED_RIGHT : RADIUS_RIGHT}`,
          say: speedTry
          ? `The car starts at ${BASE.speed} km/h and 50 m. What reading will the meter show if the speed becomes ${THREE_TIMES_SPEED} km/h and the radius stays at 50 m?`
            : `The car starts at ${BASE.speed} km/h and 50 m. What reading will the meter show if the radius becomes ${TIGHT_RADIUS} m, a tighter turn, and the speed stays at ${BASE.speed} km/h?`,
          prompt: 'Pick the card with your answer.',
          cards: labels.map((label, i) => ({id: `answer:${i}`, key: String(i + 1), label, picture: {kind: 'reading', g: null}, state: null})),
          hints: speedTry
            ? ['A faster car changes its direction sooner.', `Use the rule with ${THREE_TIMES_SPEED} km/h and 50 m, but do not run the turn yet.`, 'Pick the answer that matches the formula.']
            : ['Radius is the distance from the centre to the car.', `Use the rule with ${BASE.speed} km/h and ${TIGHT_RADIUS} m, but do not run the turn yet.`, 'Pick the answer that matches the formula.'],
        };
      }
      const g = goal();
      const target = targetAction();
      return {
        ...base,
        waiting: !done,
        ready: done,
        target,
        glow: speedTry ? 'speed' : 'radius',
        say: m.say || (speedTry
          ? `Your prediction is recorded. Change the speed to ${THREE_TIMES_SPEED} km/h, keep the radius at 50 m, and run the turn.`
          : `Your prediction is recorded. Keep the speed at ${BASE.speed} km/h, change the radius to ${TIGHT_RADIUS} m, and run the turn.`),
        prompt: done ? 'Continue when you are ready.' : `Set the speed to ${g.speed} km/h and the radius to ${g.radius} m, then run the turn.`,
        hints: ['The formula follows the two settings.', speedTry ? `Use ← or → to set ${THREE_TIMES_SPEED} km/h.` : `Use ↑ or ↓ to set ${TIGHT_RADIUS} m.`, 'Watch my pointer. I will set the requested value and run the turn.'],
      };
    }

    if (current === 'try-free') return {
      ...base,
      waiting: !done,
      ready: done,
      target: done ? null : targetAction(),
      glow: 'settings',
      say: m.say || 'Which settings give the biggest reading? The formula follows every change of speed or radius, so you can work out the reading before you run the turn.',
      prompt: done ? 'Continue when you are ready, or keep testing new settings.' : `Run ${FREE_TRIES} turns with different settings to fill the table. Turns run so far: ${tested.size} of ${FREE_TRIES}.`,
      hints: ['Change either dial before you run a comparison.', 'The table keeps different settings, so repeats do not count twice.', 'Watch my pointer. I will choose a new setting and run the turn.'],
    };

    if (current === 'alone') return {
      ...base,
      waiting: !done,
      ready: done,
      target: done ? null : targetAction(),
      glow: 'settings',
      say: done ? m.say : m.auto ? m.say : `The G-force lap asks for 2 g in three corners, so find a turn that reaches 2 g or more. The turn starts at ${BASE.speed} km/h and 50 m, so change at least one setting, and work out the reading from the formula first.`,
      prompt: done ? 'Continue when you are ready.' : `The meter reads ${reading(speed, radius)} g. Change the speed or the radius to reach 2 g, then run the turn.`,
      hints: ['A higher speed or a shorter radius raises the reading.', 'Use ← or → to raise speed, or ↑ or ↓ to change the radius; then run the turn.', `Watch my pointer. I will set ${THREE_TIMES_SPEED} km/h and run the turn.`],
    };

    if (check) return {
      ...base,
      waiting: !done,
      ready: done,
      asking: !done,
      say: check.question,
      prompt: done ? 'Continue when you are ready.' : 'Pick the card with your answer.',
      cards: check.answers.map((label, i) => ({id: `answer:${i}`, key: String(i + 1), label, picture: {kind: 'reading', g: null}, state: !done ? null : i === check.correct ? 'right' : i === m.guess ? 'wrong' : null})),
      hints: done ? ['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.'] : [
        'Use the formula to compare the two settings.',
        current === 'check-speed' ? 'The formula squares speed.' : current === 'check-radius' ? 'Radius divides the result.' : 'Speed is squared, and radius divides the result.',
        'Pick the sentence that matches the formula.',
      ],
    };

    return {
      ...base,
      ready: true,
      waiting: false,
      ideas: KEY_IDEAS,
      ideaRows: {
        speed: [`${BASE.speed} km/h: ${reading(BASE.speed, 50)} g`, `${TWICE_SPEED} km/h: ${reading(TWICE_SPEED, 50)} g`, 'Both at a 50 m radius'],
        radius: [`50 m: ${reading(BASE.speed, 50)} g`, `100 m: ${reading(BASE.speed, 100)} g`, `Both at ${BASE.speed} km/h`],
      },
      say: 'A turning car keeps changing direction, so it needs a sideways push that the driver feels. The reading rises with the square of the speed and falls as the radius grows.',
      prompt: 'Start the G-force lap, and reach at least 2 g in three different corners without leaving the road.',
      hints: KEY_IDEAS.map(item => item.text),
    };
  }

  function state() {
    return {speed, radius, rows: rows.map(item => ({...item})), tested: [...tested]};
  }

  return {enter, act, tick, view, state};
}

export const PASS_SAY = 'You have passed G-force. Drive a lap on a course you own and reach 2 g in three different corners without leaving the road.';
export const lesson = Object.freeze({
  id: 'gforce',
  steps: STEPS,
  createModel,
  keyIdeas: KEY_IDEAS,
  challengeCard: CHALLENGE_CARD,
  words: WORDS,
  finishLabel: 'Start the lap',
  passSay: PASS_SAY,
});
