// The G-force classroom lesson. It uses the same turning rule as the G-force challenge.
import {lateralG} from '../benches/gforce.js';

const GRAVITY = 9.81;
const KMH_PER_SETTING = 1.609344;
const KMH_PER_MS = 3.6;
const BASE = Object.freeze({speed: 40, radius: 50});
const MIN_SPEED = 10;
const MAX_SPEED = 150;
const SPEED_STEP = 5;
const MIN_RADIUS = 10;
const MAX_RADIUS = 200;
const RADIUS_STEP = 25;
const FREE_TRIES = 3;
const FREE_RADII = Object.freeze([10, 25, 35, 50, 60, 75, 85, 100, 110, 125, 135, 150, 160, 175, 185, 200]);
const AUTO_GAP_S = .14;
const SPEED_KEYS = Object.freeze({ArrowLeft: 'speed:down', ArrowRight: 'speed:up'});
const RADIUS_KEYS = Object.freeze({ArrowDown: 'radius:down', ArrowUp: 'radius:up'});

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does the cord lean?'},
  {id: 'word-speed', part: 1, title: 'Speed and its units', word: 'gforce-speed'},
  {id: 'word-radius', part: 1, title: 'The radius of a turn', word: 'radius'},
  {id: 'word-acceleration', part: 1, title: 'Velocity and acceleration', word: 'gforce-acceleration'},
  {id: 'word-g', part: 1, title: 'Measuring sideways push', word: 'gforce'},
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
  {id: 'speed', text: 'The game squares speed, so doubling speed makes four times the G-force when radius stays fixed.'},
  {id: 'radius', text: 'The game divides by turn radius, so doubling radius halves the G-force when speed stays fixed.'},
].map(Object.freeze));

export const CHALLENGE_CARD = Object.freeze({
  title: 'Reach 2 g in three different corners.',
  text: 'Drive a lap on a course you own. Reach at least 2 g in three different corners without leaving the road.',
});

// Keep the notebook ids from the earlier lesson so saved notebooks still match.
export const WORDS = Object.freeze([
  {id: 'gforce', word: 'G-force', meaning: 'G-force is sideways acceleration compared with Earth’s gravitational acceleration near the ground.'},
  {id: 'one-g', word: 'One g', meaning: 'One g is the rate at which a dropped stone speeds up near the ground, about 9.81 metres per second squared (m/s²).'},
  {id: 'radius', word: 'Radius', meaning: 'Radius is the distance from the centre of a circular turn to the car, measured in metres (m).'},
  {id: 'gforce-speed', word: 'Speed', meaning: 'Speed is distance travelled during a set time. The dial uses kilometres per hour (km/h), and the formula uses metres per second (m/s).'},
  {id: 'gforce-acceleration', word: 'Acceleration', meaning: 'Acceleration is how quickly velocity changes. Velocity is speed in a direction.'},
].map(Object.freeze));

const kmh = setting => Number((setting * KMH_PER_SETTING).toFixed(1));
const mpsFromDial = speed => kmh(speed) / KMH_PER_MS;
const meter = (speed, radius) => lateralG(speed, radius);
const shown = value => value.toFixed(2);
const settingsKey = (speed, radius) => `${speed}/${radius}`;
const FORMULA = 'G-force (g) = (speed in m/s)² ÷ radius in m ÷ 9.81 m/s²';

function formulaRows(speed, radius, {worked = true, includeSpeed = true} = {}) {
  const entries = [];
  const shownKmh = kmh(speed);
  const roundedMps = Number((shownKmh / KMH_PER_MS).toFixed(2));
  const sumFromShownSpeed = (roundedMps ** 2 / radius / GRAVITY).toFixed(2);
  if (includeSpeed) {
    entries.push({
      title: 'Change the speed unit',
      formula: 'speed in m/s = speed in km/h ÷ 3.6',
      worked: worked ? `${shownKmh.toFixed(1)} km/h ÷ 3.6 = ${roundedMps.toFixed(2)} m/s` : '',
      note: 'The meter uses the same setting. The sum is approximate because the displayed speed and m/s are rounded.',
    });
  }
  entries.push({
    title: 'The turning rule in this game',
    formula: FORMULA,
    worked: worked
      ? `(${roundedMps.toFixed(2)} m/s)² ÷ ${radius} m ÷ ${GRAVITY} m/s² = about ${sumFromShownSpeed} g`
      : '',
    note: worked
      ? 'The final number counts sideways acceleration in units of one g. The meter and the sum use the same turn settings.'
      : 'The last division compares sideways acceleration with one g, which is 9.81 m/s².',
  });
  return entries;
}

const reading = (speed, radius) => shown(meter(speed, radius));
const baseReading = reading(BASE.speed, BASE.radius);

const CHECKS = Object.freeze({
  'check-speed': Object.freeze({
    question: 'At the same 50 m radius, which speed gives the larger reading: 32.2 km/h or 64.4 km/h?',
    answers: ['64.4 km/h gives the larger reading.', '32.2 km/h gives the larger reading.', 'Both speeds give the same reading.'],
    correct: 0,
    right: `That is right. At 64.4 km/h the meter reads ${reading(40, 50)} g. At 32.2 km/h it reads ${reading(20, 50)} g, because half the speed makes one quarter the reading when the rule squares speed.`,
    wrong: `At 64.4 km/h the meter reads ${reading(40, 50)} g. At 32.2 km/h it reads ${reading(20, 50)} g, because half the speed makes one quarter the reading when the rule squares speed.`,
  }),
  'check-radius': Object.freeze({
    question: 'At 64.4 km/h, which turn radius gives the larger reading: 25 m or 100 m?',
    answers: ['25 m gives the larger reading.', '100 m gives the larger reading.', 'Both radii give the same reading.'],
    correct: 0,
    right: `That is right. At 25 m the meter reads ${reading(40, 25)} g, and at 100 m it reads ${reading(40, 100)} g. A larger radius is a larger number to divide by, so the reading falls.`,
    wrong: `At 25 m the meter reads ${reading(40, 25)} g, and at 100 m it reads ${reading(40, 100)} g. A larger radius is a larger number to divide by, so the reading falls.`,
  }),
  'check-rule': Object.freeze({
    question: 'Which sentence describes the G-force rule used in this game?',
    answers: [
      'The reading rises with the square of speed and falls as radius grows.',
      'The reading rises in direct proportion to speed and radius.',
      'The reading falls as speed rises and radius shrinks.',
    ],
    correct: 0,
    right: 'Correct. The game squares speed and divides by radius.',
    wrong: 'The game squares speed and divides by radius. More speed raises the squared value, and a shorter radius also raises the reading.',
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
    return {kind, speed: kmh(currentSpeed), radius: currentRadius, g: shown(g)};
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
      case 'try-speed': return {speed: 60, radius: BASE.radius};
      case 'try-radius': return {speed: BASE.speed, radius: 75};
      case 'alone': return {speed: 80, radius: BASE.radius};
      case 'try-free': {
        const preferred = [
          {speed: 50, radius: 50},
          {speed: 40, radius: 75},
          {speed: 60, radius: 50},
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
    if (target.speed !== speed) changes.push(`set the speed dial to ${kmh(target.speed).toFixed(1)} km/h`);
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

  function move(kind, direction, automatic = false) {
    if (m.auto && !automatic) return null;
    const before = kind === 'speed' ? speed : radius;
    if (kind === 'speed') speed = clampSpeed(speed + direction * SPEED_STEP);
    else radius = clampRadius(radius + direction * RADIUS_STEP);
    const after = kind === 'speed' ? speed : radius;
    if (before === after) {
      m.say = kind === 'speed'
        ? `${direction > 0 ? 'The speed dial is already at its top' : 'The speed dial is already at its bottom'}, ${kmh(speed).toFixed(1)} km/h.`
        : `The radius control is already at its ${direction > 0 ? 'outer' : 'inner'} limit, ${radius} m.`;
      return {kind: 'note', say: m.say};
    }
    if (id() === 'word-speed' && speed === BASE.speed && m.phase !== 'done') {
      m.phase = 'done';
      m.say = `The dial now shows ${kmh(speed).toFixed(1)} km/h. The formula changes that speed to ${mpsFromDial(speed).toFixed(2)} m/s by dividing by 3.6.`;
      return {kind: 'right', say: m.say};
    }
    if (id() === 'word-radius' && radius === BASE.radius && m.phase !== 'done') {
      m.phase = 'done';
      m.say = `The radius is now ${radius} m, measured from the marked centre to the car.`;
      return {kind: 'right', say: m.say};
    }
    m.say = `The dial shows ${kmh(speed).toFixed(1)} km/h, and the radius is ${radius} m. The turning rule gives ${reading(speed, radius)} g.`;
    return {kind: 'progress', say: m.say};
  }

  function record() {
    const key = settingsKey(speed, radius);
    if (id() === 'try-free') {
      if (key === settingsKey(BASE.speed, BASE.radius)) {
        m.say = `The starting turn reads ${reading(speed, radius)} g. Change the speed or radius before recording a comparison.`;
        return {kind: 'note', say: m.say};
      }
      if (tested.has(key)) {
        m.say = 'That speed and radius are already in the table. Change at least one setting before recording another turn.';
        return {kind: 'note', say: m.say};
      }
      tested.add(key);
      rows.push(row('free', speed, radius, result()));
      m.say = `At ${kmh(speed).toFixed(1)} km/h and ${radius} m, the meter reads ${reading(speed, radius)} g. Change a setting before you run a different turn.`;
      if (tested.size >= FREE_TRIES) m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'try-speed' || id() === 'try-radius') {
      const expected = goal();
      if (speed !== expected.speed || radius !== expected.radius) {
        m.say = `Set the speed to ${kmh(expected.speed).toFixed(1)} km/h and the radius to ${expected.radius} m, then run the turn.`;
        return {kind: 'note', say: m.say};
      }
      rows.push(row(id(), speed, radius, result()));
      m.phase = 'done';
      const correct = m.guess === 0;
      if (id() === 'try-speed') {
        m.say = correct
          ? `That is right. At 96.6 km/h the meter reads ${reading(speed, radius)} g, about 2.25 times the ${baseReading} g at 64.4 km/h because 1.5 × 1.5 = 2.25.`
          : `At 96.6 km/h the meter reads ${reading(speed, radius)} g, about 2.25 times the ${baseReading} g at 64.4 km/h. That follows because 96.6 ÷ 64.4 = 1.5, and 1.5 × 1.5 = 2.25.`;
      } else {
        m.say = correct
          ? `That is right. At 75 m the meter reads ${reading(speed, radius)} g, two thirds of the ${baseReading} g at 50 m because 50 ÷ 75 = 2 ÷ 3.`
          : `At 75 m the meter reads ${reading(speed, radius)} g, about two thirds of the ${baseReading} g at 50 m. A 75 m radius is one and a half times 50 m, so the reading is two thirds as large.`;
      }
      return {kind: correct ? 'right' : 'wrong', say: m.say};
    }
    if (id() === 'alone') {
      if (key === settingsKey(BASE.speed, BASE.radius)) {
        m.say = `The starting turn reads ${reading(speed, radius)} g, below the 2 g target. Change speed or radius before running it again.`;
        return {kind: 'fail', say: m.say};
      }
      if (result() < 2) {
        m.say = `This turn reads ${reading(speed, radius)} g, below the 2 g target. Raise speed or shorten the radius, then try again.`;
        return {kind: 'fail', say: m.say};
      }
      m.phase = 'done';
      m.say = `This turn reads ${reading(speed, radius)} g, which reaches the target of at least 2 g after you changed the speed or radius.`;
      return {kind: 'pass', say: m.say};
    }
    return null;
  }

  function act(action) {
    const [kind, raw] = action.split(':');
    if (kind === 'replay') {
      if (id() === 'wonder' || id() === 'watch') enter(m.index);
      return null;
    }
    if (kind === 'set' && raw === 'best') return startAuto();
    if (kind === 'speed' && ['ready', 'set', 'done'].includes(m.phase)) return move('speed', raw === 'up' ? 1 : -1);
    if (kind === 'radius' && ['ready', 'set', 'done'].includes(m.phase)) return move('radius', raw === 'up' ? 1 : -1);
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
        m.say = `Your prediction is recorded. Now raise the speed to ${kmh(60).toFixed(1)} km/h, keep the radius at 50 m, and run the turn.`;
      } else {
        m.say = `Your prediction is recorded. Now keep the speed at 64.4 km/h, set the radius to 75 m, and run the turn.`;
      }
      return {kind: 'progress', say: m.say};
    }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    if (id() === 'watch' && m.phase !== 'done') {
      if (m.time < 1.5) {
        speed = BASE.speed;
        radius = BASE.radius;
      } else if (m.time < 3.5) {
        speed = 80;
        radius = BASE.radius;
      } else if (m.time < 4.5) {
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
    if ((id() === 'wonder' || id() === 'watch') && m.phase !== 'done' && m.time >= (id() === 'wonder' ? 2.5 : 6)) {
      m.phase = 'done';
      if (id() === 'watch') {
        rows.push(row('watch-speed', 80, 50, meter(80, 50)));
        rows.push(row('watch-radius', 40, 100, meter(40, 100)));
        m.say = `At 64.4 km/h and 50 m, the meter reads ${baseReading} g; at 128.7 km/h and 50 m, it reads ${reading(80, 50)} g, about four times as much. At 64.4 km/h and 100 m, it reads ${reading(40, 100)} g, about half as much.`;
        return {kind: 'right', say: m.say};
      }
      m.say = 'Which change could make the meter show a larger reading?';
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
      note: 'Velocity is speed in a direction. The unit m/s² means a change in m/s during each second.',
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
      speedKmh: kmh(speed),
      radiusM: radius,
      g: answersOpen ? null : result(),
      formulas: formulasForView(),
      rows: rows.map(item => ({...item})),
      keys,
      repeat: Object.keys(keys).filter(key => key.startsWith('Arrow')),
      buttons: [],
      cards: [],
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
      say: done ? m.say : 'A car on an arm goes around a marked circle with a cord hanging from it and a meter showing the reading. The words come next.',
      prompt: done ? 'Press Enter to continue.' : 'Watch the cord and the sideways arrow.',
      hints: ['Watch the cord and the arrow beside the car.', 'The sideways arrow grows with the meter reading.', 'Wait for Brian to finish.'],
    };

    if (current === 'word-speed') {
      const target = targetAction();
      return {
        ...base,
        waiting: !done,
        target,
        glow: 'speed',
        say: done ? m.say : m.auto ? m.say : 'Speed is distance travelled during a set time, and the dial shows kilometres per hour, written km/h. The formula uses metres per second, written m/s, which counts metres travelled each second; divide km/h by 3.6 because a kilometre is 1,000 metres and an hour is 3,600 seconds.',
        prompt: done ? 'Press Enter to continue, or keep changing the speed.' : `The dial reads ${kmh(speed).toFixed(1)} km/h. Press ← to lower it or → to raise it until it reads 64.4 km/h.`,
        hints: ['The speed is shown on the right dial.', 'Use ← to lower the reading or → to raise it until it shows 64.4 km/h.', 'Watch my pointer. I will set the speed dial to 64.4 km/h.'],
      };
    }

    if (current === 'word-radius') {
      return {
        ...base,
        waiting: !done,
        target: done ? null : 'set:best',
        glow: 'radius',
        say: done ? m.say : m.auto ? m.say : 'Radius is the distance from the centre of a circular turn to the car. The arm marks this distance, and its control moves the car inward for a shorter radius or outward for a longer radius.',
        prompt: done ? 'Press Enter to continue, or keep changing the radius.' : `The radius is ${radius} m. Press ↓ to shorten it or ↑ to lengthen it until it reads 50 m.`,
        hints: ['Follow the arm from the marked centre to the car.', 'Use ↓ to shorten the radius or ↑ to lengthen it until it reads 50 m.', 'Watch my pointer. I will set the radius to 50 m.'],
      };
    }

    if (current === 'word-acceleration') return {
      ...base,
      ready: true,
      say: 'Velocity is speed in a direction, and acceleration is how quickly velocity changes. Metres per second squared, written m/s², means a speed change measured in m/s during each second; the turning car changes direction, so its velocity changes even when speed stays the same.',
      prompt: 'Press Enter to continue.',
      hints: ['Velocity includes a direction.', 'Acceleration measures a change in velocity over time.', 'Press Enter to continue.'],
    };

    if (current === 'word-g') return {
      ...base,
      ready: true,
      say: "G-force compares the car's sideways acceleration with one g. One g is the rate at which a dropped stone speeds up near the ground, about 9.81 m/s\u00b2.",
      prompt: 'Press Enter to see the rule that gives the reading.',
      hints: ['One g is 9.81 m/s².', 'The meter compares sideways acceleration with one g.', 'Press Enter to continue.'],
    };

    if (current === 'formula') return {
      ...base,
      ready: true,
      say: 'In this game, the rule squares the speed in m/s and divides by the radius in m to get sideways acceleration in m/s². The rule then divides by 9.81 m/s² to count the reading in g, and the sum uses the values shown on the board.',
      prompt: 'Press Enter to watch how speed and radius change the reading.',
      hints: ['Speed is squared in this rule.', 'Radius and 9.81 m/s² divide the squared speed.', 'Press Enter to continue.'],
    };

    if (current === 'watch') return {
      ...base,
      waiting: !done,
      ready: done,
      say: done ? m.say : 'I will raise the speed from 64.4 to 128.7 km/h while the radius stays at 50 m; then I will restore the speed and widen the radius to 100 m. Watch the cord, arrow, meter and formula as I change one setting at a time.',
      prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the car turn and the readings change.',
      hints: ['Watch the sideways arrow as the car goes faster.', 'Then watch the cord and meter as the turn radius grows.', 'Wait for Brian to finish.'],
    };

    if (current === 'try-speed' || current === 'try-radius') {
      const speedTry = current === 'try-speed';
      if (answersOpen) {
        const labels = speedTry
          ? [`About ${reading(60, 50)} g.`, `About ${reading(50, 50)} g.`, `About ${baseReading} g.`]
          : [`About ${reading(40, 75)} g.`, `About ${reading(40, 100)} g.`, `About ${baseReading} g.`];
        return {
          ...base,
          g: null,
          waiting: true,
          ready: false,
          target: 'answer:0',
          say: speedTry
          ? 'The car starts at 64.4 km/h and 50 m. What reading will the meter show if speed becomes 96.6 km/h and radius stays at 50 m?'
            : 'The car starts at 64.4 km/h and 50 m. What reading will the meter show if radius becomes 75 m and speed stays at 64.4 km/h?',
          prompt: 'Pick a card by clicking it, or press 1, 2 or 3.',
          cards: labels.map((label, i) => ({id: `answer:${i}`, key: String(i + 1), label, picture: {kind: 'reading', g: null}, state: null})),
          hints: speedTry
            ? ['A faster car changes its direction sooner.', 'Use the rule with 96.6 km/h and 50 m, but do not run the turn yet.', 'Pick the answer that matches the formula.']
            : ['Radius is the distance from the centre to the car.', 'Use the rule with 64.4 km/h and 75 m, but do not run the turn yet.', 'Pick the answer that matches the formula.'],
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
          ? 'Your prediction is recorded. Change the speed to 96.6 km/h, keep the radius at 50 m, and run the turn.'
          : 'Your prediction is recorded. Keep the speed at 64.4 km/h, change the radius to 75 m, and run the turn.'),
        prompt: done ? 'Press Enter to continue.' : `Set the speed to ${kmh(g.speed).toFixed(1)} km/h and the radius to ${g.radius} m, then press Space to run the turn.`,
        hints: ['The formula follows the two settings.', speedTry ? 'Use ← or → to set 96.6 km/h.' : 'Use ↑ or ↓ to set 75 m.', 'Watch my pointer. I will set the requested value and run the turn.'],
      };
    }

    if (current === 'try-free') return {
      ...base,
      waiting: !done,
      ready: done,
      target: done ? null : targetAction(),
      glow: 'settings',
      say: m.say || 'You can change speed and radius freely, and the formula follows every change so you can predict before pressing Space. The table keeps three different settings and their readings.',
      prompt: done ? 'Press Enter to continue, or keep testing new settings.' : `Change speed or radius, then press Space to record a turn. Different settings tested: ${tested.size} of ${FREE_TRIES}.`,
      hints: ['Change either dial before you run a comparison.', 'The table keeps different settings, so repeats do not count twice.', 'Watch my pointer. I will choose a new setting and run the turn.'],
    };

    if (current === 'alone') return {
      ...base,
      waiting: !done,
      ready: done,
      target: done ? null : targetAction(),
      glow: 'settings',
      say: done ? m.say : 'Brian’s test starts at 64.4 km/h and 50 m; change at least one setting, then find a turn that reaches 2 g or more. Predict from the formula and press Space to run the turn.',
      prompt: done ? 'Press Enter to continue.' : `The meter reads ${reading(speed, radius)} g. Change speed or radius, then press Space to run the turn.`,
      hints: ['A higher speed or a shorter radius raises the reading.', 'Use ← or → to raise speed, or ↑ or ↓ to change the radius; then run the turn.', 'Watch my pointer. I will set 128.7 km/h and run the turn.'],
    };

    if (check) return {
      ...base,
      waiting: !done,
      ready: done,
      asking: !done,
      say: check.question,
      prompt: done ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.',
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
      say: 'A turning car keeps changing direction, so it needs a sideways push that the driver feels. In this game the reading rises with the square of speed and falls as radius grows, and the G-force lap still asks you to reach at least 2 g in three different corners without leaving the road.',
      prompt: 'Press Enter to finish the lesson and open the G-force lap challenge.',
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
  finishLabel: 'Finish the lesson',
  passSay: PASS_SAY,
});
