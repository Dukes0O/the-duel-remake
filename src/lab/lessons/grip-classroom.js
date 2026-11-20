// Grip follows the same tyre rule as the rolling-road challenge.
import {gripBench, bestSlideDegrees} from '../benches/tunnel.js';

const BASE = 2;
const MIN = 0, MAX = 12, STEP = .5;
const FREE_RUNS = 3;
const HELD_GAP_S = .14, AUTO_GAP_S = .14;
// The wonder and the watch have several things moving together (the tyre, the dot on the graph, the reading and the table),
// so each lasts about ten seconds, and R plays it again (Kyle, 19 November 2026).
export const WATCH_S = 10;
const WONDER_SWEEP_S = 9;
export const WATCH_ANGLES = Object.freeze([2, 3, 4, 12]);
const WATCH_SEGMENT_S = WATCH_S / WATCH_ANGLES.length;
const BEST = String(Math.round(bestSlideDegrees() * 10) / 10);
const DIRECTIONS = Object.freeze({'↑': 'slide:up', '↓': 'slide:down'});
const clamp = value => Math.max(MIN, Math.min(MAX, value));
const pct = grip => Math.round(grip * 1000) / 10;
const runAt = slideDeg => gripBench.run({slideDeg, driver: 'casual'});
const showPct = slideDeg => pct(runAt(slideDeg).grip);
const settingsKey = slideDeg => String(slideDeg);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'What changes as a tyre slides?', voice: 'lab.brian.grip.intro'},
  {id: 'word-slide', part: 1, title: 'Measure sideways slide', word: 'grip-slide', words: ['slip']},
  {id: 'word-grip', part: 1, title: 'What grip means', word: 'grip'},
  {id: 'word-limit', part: 1, title: 'The best angle', word: 'limit'},
  {id: 'formula', part: 1, title: 'Grip as a percentage'},
  {id: 'watch', part: 2, title: 'Watch the grip reading'},
  {id: 'try-edge', part: 3, title: 'Predict at 4.5 degrees'},
  {id: 'try-far', part: 3, title: 'Predict at 9 degrees'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'challenge', part: 4, title: "Brian's two-run test"},
  {id: 'check-best', part: 5, title: 'Question 1 of 3'},
  {id: 'check-loss', part: 5, title: 'Question 2 of 3'},
  {id: 'check-driving', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.grip.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'sideways', text: 'A tyre turns the car by sliding a little sideways. The slide angle is the angle between the way the tyre points and the way it travels.'},
  {id: 'limit', text: `Up to ${BEST} degrees of slide, the tyre keeps all of its grip. ${BEST} degrees is its best angle.`},
  {id: 'target', text: `Past the best angle the tyre keeps less grip, and the driver feels the car start to skid. The fastest corner slides the tyre to ${BEST} degrees and no farther.`},
].map(Object.freeze));

export const CHALLENGE_CARD = Object.freeze({
  title: 'Find full grip, then find where it starts to fall.',
  text: 'Run the tyre once at 3 degrees or more with full grip, and once at an angle where grip has begun to fall.',
});

// Keep the earlier notebook identifiers so saved Lab notes still match.
export const WORDS = Object.freeze([
  {id: 'grip', word: 'Grip', meaning: 'Grip is the push a tyre gets from rubber pressing against the road.'},
  {id: 'slip', word: 'Slip', meaning: 'Slip is a tyre sliding a little sideways as it turns.'},
  {id: 'limit', word: 'Best angle', meaning: `The best angle is ${BEST} degrees. Up to it the tyre keeps all of its grip, and past it the tyre keeps less.`},
  {id: 'grip-slide', word: 'Slide angle', meaning: 'The slide angle is the angle between the way a tyre points and the way it travels.'},
].map(Object.freeze));

const FORMULA = 'grip kept (%) = grip kept as a fraction × 100';
// The fraction is shown to three places so that the multiplication comes out on a calculator as the grip reading beside the dial.
const fractionOf = slideDeg => Math.round(runAt(slideDeg).grip * 1000) / 1000;
const formulaRow = (slideDeg, worked = true) => [{
  title: 'Grip as a percentage',
  formula: FORMULA,
  worked: worked ? `${fractionOf(slideDeg).toFixed(3)} × 100 = ${pct(fractionOf(slideDeg))}%` : '',
  note: worked
    ? 'The fraction is 1.000 when the tyre keeps all of its grip.'
    : 'The result appears after the run.',
}];

const CHECKS = Object.freeze({
  'check-best': {
    question: 'Which angle is closest to the tyre’s best angle: 3, 4.5 or 9 degrees?',
    answers: ['3 degrees is closest.', '4.5 degrees is closest.', '9 degrees is closest.'], correct: 1,
    reasons: [
      `The best angle is ${BEST} degrees. 3 degrees is 1.3 degrees below it, and 4.5 degrees is only 0.2 degrees above it, so 4.5 degrees is closest.`,
      `The best angle is ${BEST} degrees, so 4.5 degrees is closest.`,
      `The best angle is ${BEST} degrees. 9 degrees is 4.7 degrees past it, so 4.5 degrees is closest.`,
    ],
  },
  'check-loss': {
    question: 'How much grip does the tyre keep at 12 degrees, the farthest it can slide?',
    answers: ['All of its grip, 100%.', 'Most of its grip, 90%.', 'Half of its grip, 50%.'], correct: 1,
    reasons: [
      `At 12 degrees the tyre keeps ${showPct(12)}%, not 100%, because 12 degrees is far past the best angle of ${BEST} degrees.`,
      `At 12 degrees the tyre keeps ${showPct(12)}% of its grip, so it has lost ${pct(1 - runAt(12).grip)}%.`,
      `At 12 degrees the tyre keeps ${showPct(12)}%, far more than half. Sliding that far costs it only ${pct(1 - runAt(12).grip)}%.`,
    ],
  },
  'check-driving': {
    question: 'For the most cornering, how far should the tyre slide?',
    answers: [`As far as the best angle, ${BEST} degrees, and no farther.`, 'Far past the best angle.', 'Not at all, at zero slide.'], correct: 0,
    reasons: [
      `Up to ${BEST} degrees the tyre keeps all of its grip, and past it the grip falls. So the fastest corner slides the tyre to ${BEST} degrees and no farther.`,
      `Past ${BEST} degrees the tyre keeps less grip, and at 12 degrees only ${showPct(12)}%. The fastest corner slides to ${BEST} degrees and no farther.`,
      `A tyre turns the car by sliding a little sideways, so at zero slide it cannot turn the car. The fastest corner slides to ${BEST} degrees.`,
    ],
  },
});

// The two predictions: each card names how much grip the tyre keeps. Card 0 is right at 4.5 degrees, card 1 at 9 degrees.
const PREDICTIONS = Object.freeze({
  'try-edge': {
    question: 'How much grip does the tyre keep at 4.5 degrees?',
    answers: ['The tyre keeps more than 99% of its grip, but not all of it.', 'The tyre keeps between 90% and 99% of its grip.', 'The tyre keeps all of its grip, 100%.'],
    correct: 0,
  },
  'try-far': {
    question: 'Does the tyre keep more or less grip at 9 degrees than at 4.5 degrees?',
    answers: ['At 9 degrees the tyre keeps more grip than at 4.5 degrees.', 'At 9 degrees the tyre keeps less grip than at 4.5 degrees.', 'At 9 degrees the tyre keeps all of its grip.'],
    correct: 1,
  },
});

const slideSet = slideDeg => `The dial reads ${slideDeg} degrees, so the tyre points ${slideDeg} degrees away from the way it travels.`;

export function createModel() {
  const freeTested = new Set(), freeRows = [], challengeRows = [];
  let slideDeg = BASE;
  let m = {index: 0, time: 0, phase: 'ready', say: '', guess: null, auto: null, lastPress: -1, watchDone: false};
  const step = () => STEPS[m.index];
  const id = () => step().id;
  const result = () => runAt(slideDeg);
  const challengeMet = () => gripBench.goalMet(challengeRows.map(input => ({input, result: runAt(input.slideDeg), settings: input})));
  const freeTarget = () => [3, 4.5, 9].find(value => !freeTested.has(settingsKey(value))) ?? [0, .5, 1].find(value => !freeTested.has(settingsKey(value)));
  const goal = () => {
    if (id() === 'word-slide') return 2;
    if (id() === 'try-free') return freeTarget();
    if (id() === 'try-far') return 9;
    if (id() === 'challenge') {
      return challengeRows.some(row => row.slideDeg >= 3 && runAt(row.slideDeg).grip === 1) ? 4.5 : 4;
    }
    return 4;
  };
  const targetAction = () => {
    if (id() === 'try-free' && freeTested.size >= FREE_RUNS) return null;
    if (id() === 'challenge' && challengeMet()) return null;
    return Math.abs(slideDeg - goal()) > 1e-9 ? 'set:best' : 'run';
  };

  function enter(index) {
    m = {index, time: 0, phase: 'ready', say: '', guess: null, auto: null, lastPress: -1, watchDone: false};
    if (id() === 'wonder') slideDeg = 0;
    if (id() === 'word-slide') slideDeg = 1.5;
    if (id() === 'word-grip' || id() === 'word-limit' || id() === 'formula') slideDeg = 4;
    if (id() === 'watch') { slideDeg = WATCH_ANGLES[0]; freeRows.splice(0); }
    if (id() === 'try-edge') { slideDeg = 4.5; m.phase = 'guess'; }
    if (id() === 'try-far') { slideDeg = 9; m.phase = 'guess'; }
    if (id() === 'try-free') { slideDeg = BASE; freeTested.clear(); freeRows.splice(0); }
    if (id() === 'challenge') { slideDeg = BASE; challengeRows.splice(0); }
    if (CHECKS[id()]) m.phase = 'ask';
  }

  function targetSetting() { return goal(); }
  function targetName(value) { return `${value} degrees`; }

  function move(direction, automatic = false, held = false) {
    if (m.auto && !automatic) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = slideDeg;
    slideDeg = clamp(slideDeg + direction * STEP);
    if (before === slideDeg) {
      if (held) return null;
      m.say = `The dial is already at ${slideDeg} degrees.`;
      return {kind: 'progress', say: m.say};
    }
    m.lastPress = m.time;
    if (id() === 'word-slide' && slideDeg === 2 && m.phase !== 'done') {
      m.phase = 'done';
      m.say = slideSet(2);
      return {kind: 'right', say: m.say};
    }
    m.say = `The dial now reads ${slideDeg} degrees. The tyre keeps ${showPct(slideDeg)}% of its grip.`;
    return {kind: 'progress', say: m.say};
  }

  function row(kind) {
    const value = result();
    return {kind, slideDeg, slip: value.slip, grip: value.grip, percent: showPct(slideDeg)};
  }

  function record() {
    if (id() === 'try-free') {
      const key = settingsKey(slideDeg);
      if (freeTested.has(key)) {
        m.say = `The ${slideDeg}-degree setting is already in the table. Change the dial before recording another run.`;
        return {kind: 'progress', say: m.say};
      }
      freeTested.add(key); freeRows.push(row('free'));
      m.say = `At ${slideDeg} degrees, the tyre keeps ${showPct(slideDeg)}% of its grip. Change the dial before comparing another setting.`;
      if (freeTested.size >= FREE_RUNS) m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'try-edge' || id() === 'try-far') {
      m.phase = 'done';
      const correct = m.guess === PREDICTIONS[id()].correct;
      if (id() === 'try-edge') {
        const lost = `100% minus ${showPct(4.5)}% is ${pct(1 - runAt(4.5).grip)}% lost.`;
        m.say = correct
          ? `That is right. At 4.5 degrees the tyre keeps ${showPct(4.5)}% of its grip. ${lost}`
          : m.guess === 1
            ? `At 4.5 degrees the tyre keeps ${showPct(4.5)}% of its grip, which is more than 99%. ${lost}`
            : `At 4.5 degrees the tyre keeps ${showPct(4.5)}%, not 100%, because 4.5 degrees is past the best angle of ${BEST} degrees. ${lost}`;
      } else {
        m.say = correct
          ? `That is right. At 9 degrees the tyre keeps ${showPct(9)}% of its grip, less than the ${showPct(4.5)}% at 4.5 degrees. A tyre that slides farther loses more grip.`
          : m.guess === 0
            ? `At 9 degrees the tyre keeps ${showPct(9)}%, less than the ${showPct(4.5)}% at 4.5 degrees. The farther a tyre slides past ${BEST} degrees, the more grip it loses.`
            : `At 9 degrees the tyre keeps ${showPct(9)}%, not 100%. Past ${BEST} degrees the grip keeps falling as the slide grows.`;
      }
      return {kind: correct ? 'right' : 'wrong', say: m.say};
    }
    if (id() === 'challenge') {
      challengeRows.push({slideDeg});
      if (challengeMet()) {
        m.phase = 'done';
        m.say = `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% of its grip. ` +
          'Together with your earlier run, this meets both targets from the Grip challenge.';
        return {kind: 'pass', say: m.say};
      }
      const hasFull = challengeRows.some(item => item.slideDeg >= 3 && runAt(item.slideDeg).grip === 1);
      const hasLoss = challengeRows.some(item => runAt(item.slideDeg).grip < 1);
      m.say = hasFull
        ? `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% of its grip. The full-grip run is recorded; now test past ${BEST} degrees to find a loss.`
        : hasLoss
          ? `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% of its grip. This shows a loss; now find full grip at 3 degrees or more.`
          : `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% of its grip, which meets neither target yet. ` +
            'Use 3 or 4 degrees for full grip, or 4.5 degrees to find a loss.';
      return {kind: hasFull || hasLoss ? 'progress' : 'fail', say: m.say};
    }
    return null;
  }

  function autoText(target) {
    if (id() === 'try-free') return `I will set the dial to ${targetName(target)} and record a different run.`;
    if (id() === 'challenge') return `I will set the dial to ${targetName(target)} and run the tyre.`;
    return `I will set the dial to ${targetName(target)}.`;
  }

  function startAuto() {
    if (m.auto) return null;
    m.auto = targetSetting(); m.lastPress = m.time; m.say = autoText(m.auto);
    return {kind: 'progress', say: m.say};
  }

  function act(action) {
    const held = action.endsWith(':held');
    const [kind, raw] = (held ? action.slice(0, -5) : action).split(':');
    if (kind === 'replay' && (id() === 'wonder' || id() === 'watch')) { enter(m.index); return null; }
    if (kind === 'set' && raw === 'best') return startAuto();
    if (kind === 'slide' && (['ready', 'set'].includes(m.phase) || id() === 'word-slide' && m.phase === 'done')) return move(raw === 'up' ? 1 : -1, false, held);
    if (kind === 'run' && (['ready', 'set'].includes(m.phase) || id() === 'try-free' && m.phase === 'done')) return record();
    if (kind === 'answer' && (m.phase === 'guess' || m.phase === 'ask')) {
      const picked = Number(raw);
      if (!Number.isInteger(picked) || picked < 0 || picked > 2) return null;
      m.guess = picked; m.phase = 'set';
      if (CHECKS[id()]) {
        const check = CHECKS[id()];
        m.phase = 'done'; m.say = check.reasons[picked];
        return {kind: picked === check.correct ? 'right' : 'wrong', say: m.say};
      }
      m.say = `Your prediction is recorded. The dial is set to ${id() === 'try-far' ? 9 : 4.5} degrees, so run the tyre to see the grip.`;
      return {kind: 'progress', say: m.say};
    }
    return null;
  }

  const watchRow = value => ({kind: 'watch', slideDeg: value, slip: runAt(value).slip, grip: runAt(value).grip, percent: showPct(value)});

  function tick(dt) {
    m.time += dt;
    if (id() === 'wonder' && m.phase !== 'done') slideDeg = Math.min(MAX, m.time / WONDER_SWEEP_S * MAX);
    if (m.auto) {
      if (m.time - m.lastPress < AUTO_GAP_S) return null;
      m.lastPress = m.time;
      if (slideDeg !== m.auto) return move(Math.sign(m.auto - slideDeg), true);
      m.auto = null;
      if (id() === 'try-free' || id() === 'challenge') return record();
      if (id() === 'word-slide') { m.phase = 'done'; m.say = slideSet(2); return {kind: 'right', say: m.say}; }
    }
    if (id() === 'watch' && !m.watchDone) {
      // Each angle is held for a quarter of the run, and its row joins the table as the tyre reaches it.
      const segment = Math.min(WATCH_ANGLES.length - 1, Math.floor(m.time / WATCH_SEGMENT_S));
      slideDeg = WATCH_ANGLES[segment];
      while (freeRows.length <= segment) freeRows.push(watchRow(WATCH_ANGLES[freeRows.length]));
    }
    if (id() === 'watch' && !m.watchDone && m.time >= WATCH_S) {
      m.watchDone = true;
      m.say = `At 2, 3 and 4 degrees the tyre keeps 100% of its grip. At 12 degrees it keeps ${showPct(12)}%, so the grip falls as the slide grows past ${BEST} degrees.`;
      m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'wonder' && m.phase !== 'done' && m.time >= WATCH_S) {
      slideDeg = MAX;
      m.phase = 'done'; m.say = 'The tyre has slid from 0 to 12 degrees. What happened to its grip along the way?';
      return {kind: 'right', say: m.say};
    }
    return null;
  }

  function formulasForView(current, answersOpen) {
    if (current === 'word-slide') return [{
      title: 'Measure the slide angle',
      formula: 'slide angle = angle between tyre direction and travel direction',
      worked: `${slideDeg.toFixed(1)} degrees`,
      note: 'The dial measures this angle in degrees.',
    }];
    if (current === 'word-grip') return [{
      title: 'Grip as a percentage', formula: FORMULA, worked: '',
      note: 'The grip reading under the dial shows the percentage.',
    }];
    if (current === 'word-limit') return [{
      title: 'The best angle', formula: 'The tyre keeps all of its grip up to its best slide angle.', worked: '',
      note: `The best angle is ${BEST} degrees.`,
    }];
    if (current === 'formula' || current === 'watch' || current === 'try-free' || current === 'challenge' || current === 'recap') return formulaRow(slideDeg, true);
    if (answersOpen || ['try-edge', 'try-far'].includes(current) && m.phase !== 'done') return formulaRow(slideDeg, false);
    return [];
  }

  function view() {
    const current = id(), done = m.phase === 'done';
    const answersOpen = m.phase === 'guess' || m.phase === 'ask';
    const resultHidden = answersOpen || ['try-edge', 'try-far'].includes(current) && m.phase !== 'done';
    const controlsOn = ['word-slide', 'formula', 'try-free', 'challenge'].includes(current) || ['try-edge', 'try-far'].includes(current) && m.phase === 'set';
    const keys = {};
    if (controlsOn && !m.auto && (!done || current === 'word-slide' || current === 'try-free')) {
      Object.assign(keys, DIRECTIONS);
      if (current === 'try-free' || current === 'challenge') keys.Space = 'run';
      if (['try-edge', 'try-far'].includes(current) && m.phase === 'set') keys.Space = 'run';
    }
    if (answersOpen) Object.assign(keys, {1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
    const answers = CHECKS[current]?.answers ?? PREDICTIONS[current]?.answers ?? [];
    const cards = answersOpen ? answers.map((label, i) => ({id: `answer:${i}`, key: String(i + 1), label, picture: {kind: 'grip', percent: null}, state: null})) : [];
    const base = {
      scene: current, time: m.time, slideDeg, bestSlideDeg: goal(), slip: result().slip, grip: resultHidden ? null : result().grip,
      percent: resultHidden ? null : showPct(slideDeg), predictionPending: resultHidden, rows: freeRows.map(item => ({...item})),
      challengeAttempts: challengeRows.map(item => ({...item})), formulas: formulasForView(current, answersOpen),
      actions: done && ['wonder', 'watch'].includes(current) ? ['replay'] : [], buttons: [], cards, keys,
      repeat: Object.keys(keys).filter(key => key === '↑' || key === '↓'),
      hints: [], target: null, glow: null, waiting: false, ready: done || current === 'recap', asking: answersOpen,
      say: m.say, prompt: '', pointOnly: answersOpen,
    };
    if (current === 'wonder') return {...base, waiting: !done, ready: done,
      say: done ? m.say : 'A tyre rolls on the road strip while the dial slides it sideways from 0 to 12 degrees. The graph shows how much grip the tyre keeps.',
      prompt: done ? 'Press Enter to continue.' : 'Watch the dial, the graph and the grip reading as the tyre slides.',
      hints: ['Watch the dial beside the rolling road.', 'The yellow dot follows the tyre along the blue line.', 'Wait for Brian to finish.']};
    if (current === 'word-slide') return {...base, waiting: !done, ready: done, target: done ? null : 'set:best', glow: 'slide',
      say: done ? m.say : 'A tyre turns a car by sliding a little sideways, which is called slip. The angle between the way the tyre points and the way it travels is its slide angle.',
      prompt: done ? 'Press Enter to continue, or keep turning the dial.' : 'Turn the dial up to 2 degrees and watch the tyre point away from the way it travels.',
      hints: [
        'The dial is beside the rolling road.',
        'Raise the dial until it reads 2 degrees.',
        'Watch my pointer. I will set the dial to 2 degrees.',
      ]};
    if (current === 'word-grip') return {...base, ready: true,
      say: 'Grip is the push a tyre gets from rubber pressing against the road. The grip reading shows what share of its full grip the tyre keeps.',
      prompt: 'Press Enter to learn the tyre’s best angle.',
      hints: ['Rubber presses on the road.', 'The grip reading is a percentage of full grip.', 'Press Enter to continue.']};
    if (current === 'word-limit') return {...base, ready: true,
      say: `The best angle is ${BEST} degrees. Up to that angle the tyre keeps all of its grip, and past it the tyre keeps less.`,
      prompt: 'Press Enter to see how the panel works out the percentage.',
      hints: ['The dashed line on the graph marks the best angle.', 'The grip reading is 100% up to the dashed line.', 'Press Enter to continue.']};
    if (current === 'formula') return {...base, ready: true,
      say: 'The panel shows grip as a fraction, where 1 is all of the grip. Multiply the fraction by 100 to get the percentage on the grip reading.',
      prompt: 'Turn the dial and check each multiplication against the grip reading, then press Enter.',
      hints: ['The panel beside the picture shows the multiplication.', 'The result matches the grip reading under the dial.', 'Press Enter to continue.']};
    if (current === 'watch') return {...base, waiting: !done, ready: done,
      say: done ? m.say : 'I will test the tyre at 2, 3, 4 and 12 degrees. Watch the dot on the graph and the grip reading at each angle.',
      prompt: done ? 'Press Enter to continue.' : 'Watch the readings change.',
      hints: ['Watch the dot move along the blue graph.', 'Watch the grip reading under the dial at each angle.', 'Wait for Brian to finish.']};
    if ((current === 'try-edge' || current === 'try-far') && answersOpen) return {...base, waiting: true, ready: false, target: 'answer:0', glow: 'answer',
      say: PREDICTIONS[current].question,
      prompt: 'Pick the card with your prediction.',
      hints: current === 'try-edge'
        ? [`4.5 degrees is just past the best angle of ${BEST} degrees.`, 'The panel will not show the answer before the run.', 'Pick the card that matches your prediction.']
        : ['9 degrees is farther past the best angle.', 'Compare the amount of slide at 9 and 4.5 degrees.', 'Pick the card that matches what you learned.']};
    if (current === 'try-edge' || current === 'try-far') {
      const angle = current === 'try-far' ? 9 : 4.5;
      return {...base, waiting: !done, ready: done, target: done ? null : 'run', glow: 'slide',
        say: m.say || `Your prediction is recorded. The dial is already set to ${angle} degrees.`,
        prompt: done ? 'Press Enter to continue.' : `Run the tyre at ${angle} degrees to see its grip.`,
        hints: [`The dial is already at ${angle} degrees.`, 'Run the tyre at this setting.', `Watch my pointer. I will run the tyre at ${angle} degrees.`]};
    }
    if (current === 'try-free') return {...base, waiting: !done, ready: done, target: done ? null : targetAction(), glow: 'settings',
      say: m.say || 'Which angles keep full grip? Record three different angles and compare each reading in the table.',
      prompt: done ? 'Press Enter to continue, or keep testing new settings.'
        : `Record three different angles. Recorded so far: ${freeTested.size} of ${FREE_RUNS}.`,
      hints: ['Change the dial before each run.', 'The table counts only different angles.', 'Watch my pointer. I will choose a new angle and record it.']};
    if (current === 'challenge') return {...base, waiting: !done, ready: done, target: done ? null : targetAction(), glow: 'settings',
      say: done ? m.say : m.say || 'Find one angle with full grip and one where grip has begun to fall. Record a run at 3 degrees or more with full grip, and a run past the best angle.',
      prompt: done ? 'Press Enter to continue.' : challengeRows.some(item => item.slideDeg >= 3 && runAt(item.slideDeg).grip === 1)
        ? 'The full-grip run is recorded. Now record a run at 4.5 degrees to find a loss.'
        : challengeRows.some(item => runAt(item.slideDeg).grip < 1)
          ? 'The run with lost grip is recorded. Now record a run at 3 or 4 degrees with full grip.'
          : `The dial reads ${slideDeg} degrees and the tyre keeps ${showPct(slideDeg)}% of its grip. Record a run at 3 or 4 degrees for full grip, or at 4.5 degrees to find a loss.`,
      hints: [
        'A full-grip run must be at 3 degrees or more.',
        'Use 3 or 4 degrees for full grip, and 4.5 degrees for a loss.',
        'Watch my pointer. I will set a qualifying angle and run the tyre.',
      ]};
    if (CHECKS[current]) return {...base, waiting: !done, ready: done, asking: !done,
      say: CHECKS[current].question, prompt: done ? 'Press Enter to continue.' : 'Pick the card with your answer.',
      hints: ['Think about the best angle and what the grip reading showed.', 'Use the earlier tyre tests before you choose.', 'Pick the card that matches the rule.']};
    return {...base, ready: true, waiting: false, ideas: KEY_IDEAS,
      say: `Up to ${BEST} degrees of slide, a tyre keeps all of its grip. ` +
        'Past that, it keeps less, and the driver feels the car start to skid.',
      prompt: 'Press Enter to finish and open the Grip challenge.', hints: KEY_IDEAS.map(item => item.text)};
  }

  function state() { return {slideDeg, rows: freeRows.map(item => ({...item})), challengeAttempts: challengeRows.map(item => ({...item}))}; }
  return {enter, act, tick, view, state};
}

export const PASS_SAY = 'You found full grip at 3 degrees or more, and an angle where grip has started to fall.';
export const lesson = Object.freeze({
  id: 'grip', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', passSay: PASS_SAY,
  benchAttempts: view => view.challengeAttempts.map(({slideDeg}) => ({
    input: {slideDeg, driver: 'casual'},
    controls: [{id: 'slideDeg', value: slideDeg}, {id: 'driver', value: 'casual'}],
  })),
});
