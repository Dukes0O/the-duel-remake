// Grip follows the same tyre rule as the rolling-road challenge.
import {gripBench} from '../benches/tunnel.js';

const BASE = 2;
const MIN = 0, MAX = 12, STEP = .5;
const FREE_RUNS = 3;
const HELD_GAP_S = .14, AUTO_GAP_S = .14;
const DIRECTIONS = Object.freeze({'↑': 'slide:up', '↓': 'slide:down'});
const clamp = value => Math.max(MIN, Math.min(MAX, value));
const pct = grip => Math.round(grip * 1000) / 10;
const runAt = slideDeg => gripBench.run({slideDeg, driver: 'casual'});
const showPct = slideDeg => pct(runAt(slideDeg).grip);
const roundedPercent = slideDeg => Math.round(runAt(slideDeg).grip * 1000) / 10;
const percentText = slideDeg => roundedPercent(slideDeg).toFixed(1);
const settingsKey = slideDeg => String(slideDeg);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'What changes as a tyre slides?', voice: 'lab.brian.grip.intro'},
  {id: 'word-slide', part: 1, title: 'Measure sideways slide', word: 'grip-slide'},
  {id: 'word-grip', part: 1, title: 'What grip means', word: 'grip'},
  {id: 'word-limit', part: 1, title: 'The best angle'},
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
  {id: 'sideways', text: 'Rubber grips because it presses against the road. A tyre needs a small slide angle to turn the car.'},
  {id: 'limit', text: 'At a small slide angle, the tyre pushes harder as the angle grows. Its best angle is about 4.3 degrees.'},
  {id: 'target', text: 'Past the best angle, the tyre slides more and pushes less. The driver feels the car start to skid; a corner at the best angle is fastest.'},
].map(Object.freeze));

export const CHALLENGE_CARD = Object.freeze({
  title: 'Find full grip, then find where it starts to fall.',
  text: 'Run this tyre at 3 degrees or more while it keeps full grip, then run it again after grip has started to fall.',
});

// Keep the earlier notebook identifiers so saved Lab notes still match.
export const WORDS = Object.freeze([
  {id: 'grip', word: 'Grip', meaning: 'Grip is the push a tyre gets from rubber pressing against the road.'},
  {id: 'slip', word: 'Slip', meaning: 'Slip is another word for a tyre sliding a little sideways as it turns.'},
  {id: 'limit', word: 'Best angle', meaning: 'The best angle is about 4.3 degrees in this game; past it, the tyre slides more and pushes less.'},
].map(Object.freeze));

const FORMULA = 'grip kept (%) = grip kept as a fraction × 100';
const formulaRow = (slideDeg, worked = true) => {
  const fraction = runAt(slideDeg).grip;
  const roundedFraction = Number(fraction.toFixed(2));
  const workedText = `${roundedFraction.toFixed(2)} × 100 = ${(roundedFraction * 100).toFixed(0)}%`;
  return [{
    title: 'Grip as a percentage',
    formula: FORMULA,
    worked: worked ? workedText : '',
    note: worked
      ? 'In this game, grip changes as the tyre slides farther.'
      : 'The guess is still open, so the panel shows only the general percent rule.',
  }];
};

const CHECKS = Object.freeze({
  'check-best': {
    question: 'Which angle is closest to this tyre’s best grip: 3, 4.5 or 9 degrees?',
    answers: ['3 degrees is closest.', '4.5 degrees is closest.', '9 degrees is closest.'], correct: 1,
    reason: 'The best angle is about 4.3 degrees, so 4.5 degrees is closest.',
  },
  'check-loss': {
    question: 'Which is the lowest setting past the best angle: 4, 4.5 or 9 degrees?',
    answers: ['4 degrees is past it.', '4.5 degrees is the lowest setting past it.', '9 degrees is the lowest setting past it.'], correct: 1,
    reason: 'Four degrees is before the best angle. Both 4.5 and 9 are past it, and 4.5 is the lower setting.',
  },
  'check-driving': {
    question: 'For the fastest corner, where should the tyre’s slide angle be?',
    answers: ['Near the best angle, before it slides too far.', 'Far past the best angle.', 'At zero slide, so the car cannot turn.'], correct: 0,
    reason: 'A corner at the best angle is fastest because the tyre pushes hardest there.',
  },
});

export function createModel() {
  const freeTested = new Set(), freeRows = [], challengeRows = [];
  let slideDeg = BASE;
  let m = {index: 0, time: 0, phase: 'ready', say: '', guess: null, auto: null, lastPress: -1, watchDone: false};
  const step = () => STEPS[m.index];
  const id = () => step().id;
  const result = () => runAt(slideDeg);
  const currentGrip = () => result().grip;
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
    if (id() === 'watch') slideDeg = 2;
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
      m.say = 'The dial now reads 2 degrees. You have set the sideways slide angle.';
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
      m.say = `At ${slideDeg} degrees, the tyre keeps about ${percentText(slideDeg)}% grip. Change the dial before comparing another setting.`;
      if (freeTested.size >= FREE_RUNS) m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'try-edge' || id() === 'try-far') {
      const g = currentGrip();
      m.phase = 'done';
      const correct = m.guess === (id() === 'try-edge' ? 0 : 1);
      m.say = id() === 'try-edge'
        ? correct
          ? `That is right. At 4.5 degrees the tyre keeps about ${percentText(4.5)}% grip. 100% less 99.7% is about 0.3% lost.`
          : `At 4.5 degrees the tyre keeps about ${percentText(4.5)}% grip. 100% less 99.7% is about 0.3% lost, not more than 10%.`
        : correct
          ? `That is right. At 9 degrees the tyre keeps about ${percentText(9)}% grip, less than the about ${percentText(4.5)}% at 4.5 degrees. ` +
            'Its greater slide means a greater loss.'
          : `At 9 degrees the tyre keeps about ${percentText(9)}% grip, less than the about ${percentText(4.5)}% at 4.5 degrees. ` +
            'It has lost more than a little because it slides much farther.';
      return {kind: correct ? 'right' : 'wrong', say: m.say};
    }
    if (id() === 'challenge') {
      challengeRows.push({slideDeg});
      if (challengeMet()) {
        m.phase = 'done';
        m.say = `At ${slideDeg} degrees the tyre kept about ${percentText(slideDeg)}% grip. ` +
          'Together with your earlier run, this meets both targets from the Grip challenge.';
        return {kind: 'pass', say: m.say};
      }
      const hasFull = challengeRows.some(item => item.slideDeg >= 3 && runAt(item.slideDeg).grip === 1);
      const hasLoss = challengeRows.some(item => runAt(item.slideDeg).grip < 1);
      m.say = hasFull
        ? `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% grip. The full-grip run is recorded; now test beyond about 4.3 degrees to find a loss.`
        : hasLoss
          ? `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% grip. This shows a loss; now find full grip at 3 degrees or more.`
          : `At ${slideDeg} degrees the tyre kept ${showPct(slideDeg)}% grip. ` +
            'This run meets neither target yet; use 3 or 4 degrees for full grip, or 4.5 degrees to find a loss.';
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
        m.phase = 'done'; m.say = check.reason;
        return {kind: picked === check.correct ? 'right' : 'wrong', say: m.say};
      }
      m.say = id() === 'try-far'
        ? 'Your prediction is recorded. Press Space to test the tyre at 9 degrees.'
        : 'Your prediction is recorded. Press Space to run the tyre at 4.5 degrees.';
      return {kind: 'progress', say: m.say};
    }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    if (id() === 'wonder' && m.phase !== 'done') slideDeg = [0, 2, 4][Math.min(2, Math.floor(m.time / .8))];
    if (m.auto) {
      if (m.time - m.lastPress < AUTO_GAP_S) return null;
      m.lastPress = m.time;
      if (slideDeg !== m.auto) return move(Math.sign(m.auto - slideDeg), true);
      m.auto = null;
      if (id() === 'try-free' || id() === 'challenge') return record();
      if (id() === 'word-slide') { m.phase = 'done'; m.say = 'The dial now reads 2 degrees. You have set the sideways slide angle.'; return {kind: 'right', say: m.say}; }
    }
    if (id() === 'watch' && !m.watchDone) {
      slideDeg = [2, 3, 4, 12][Math.min(3, Math.floor(m.time / .8))];
    }
    if (id() === 'watch' && !m.watchDone && m.time >= 3.2) {
      m.watchDone = true;
      m.say = `At 2, 3 and 4 degrees the tyre keeps 100% grip. At 12 degrees it keeps about ${percentText(12)}%; the loss grows as the tyre slides farther.`;
      const readings = [2, 3, 4, 12].map(value => ({
        kind: 'watch', slideDeg: value, slip: runAt(value).slip,
        grip: runAt(value).grip, percent: showPct(value),
      }));
      freeRows.splice(0, freeRows.length, ...readings);
      m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'wonder' && m.phase !== 'done' && m.time >= 2.2) {
      m.phase = 'done'; m.say = 'What changes as the tyre moves farther sideways?';
      return {kind: 'right', say: m.say};
    }
    return null;
  }

  function formulasForView(current, answersOpen) {
    if (current === 'word-slide') return [{
      title: 'Measure the slide angle',
      formula: 'slide angle = angle between tyre direction and travel direction',
      worked: `${slideDeg.toFixed(1)} degrees`,
      note: 'This dial measures the angle in degrees.',
    }];
    if (current === 'word-grip') return [{
      title: 'Grip as a percentage', formula: 'grip kept (%) = grip kept × 100', worked: '',
      note: 'In this game, the reading is shown as a percent after each run.',
    }];
    if (current === 'word-limit') return [{
      title: 'The best angle', formula: 'The tyre pushes hardest near its best slide angle.', worked: '',
      note: 'In this game, the best angle is about 4.3 degrees.',
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
    const predictionAnswers = current === 'try-far'
      ? ['At 9 degrees, grip has fallen less than at 4.5 degrees.', 'At 9 degrees, grip has fallen more than at 4.5 degrees.', 'At 9 degrees, grip is still full.']
      : ['At 4.5 degrees, grip loss is less than 1%.', 'At 4.5 degrees, grip loss is more than 10%.', 'At 4.5 degrees, grip is still full.'];
    const answers = CHECKS[current]?.answers ?? predictionAnswers;
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
      say: done ? m.say : 'A tyre rolls against a road strip while the dial turns it sideways, and a graph shows how much grip remains.',
      prompt: done ? 'Press Enter to continue.' : 'Watch the dial and the blue graph as the tyre slides.',
      hints: ['Watch the dial beside the rolling road.', 'The blue mark follows the tyre.', 'Wait for Brian to finish.']};
    if (current === 'word-slide') return {...base, waiting: !done, ready: done, target: done ? null : 'set:best', glow: 'slide',
      say: done ? m.say : 'A tyre points in one direction but travels a little sideways. The angle between those directions is its slide angle.',
      prompt: done ? 'Press Enter to continue, or keep changing the dial.' : `Set the slide angle to 2 degrees. The dial reads ${slideDeg} degrees.`,
      hints: [
        'The dial is beside the rolling road.',
        'Use the arrows to change the angle until it reads 2 degrees.',
        'Watch my pointer. I will set the dial to 2 degrees.',
      ]};
    if (current === 'word-grip') return {...base, ready: true,
      say: "Rubber presses against the road, and that lets the tyre push the car. A tyre needs a little sideways slide to turn.",
      prompt: 'Press Enter to find the angle where the tyre pushes hardest.',
      hints: ['Rubber presses on the road.', 'A small slide helps the tyre turn the car.', 'Press Enter to continue.']};
    if (current === 'word-limit') return {...base, ready: true,
      say: 'As the slide angle grows, the tyre pushes harder up to its best angle. In this game, that angle is about 4.3 degrees.',
      prompt: 'Press Enter to see what happens past the best angle.',
      hints: ['The best angle is about 4.3 degrees.', 'Grip grows up to the best angle.', 'Press Enter to continue.']};
    if (current === 'formula') return {...base, ready: true,
      say: 'Past the best angle, this game lets the tyre slide more and push less. Grip as a fraction times 100 gives grip as a percent.',
      prompt: 'Press Enter to watch the rolling-road readings.',
      hints: ['Past the best angle, grip falls as the tyre slides farther.', 'The loss grows as the tyre slides farther.', 'Press Enter to continue.']};
    if (current === 'watch') return {...base, waiting: !done, ready: done,
      say: done ? m.say : 'I will test 3, 4, 4.5 and 9 degrees. Watch the tyre, the graph and the grip reading as the angle changes.',
      prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the readings change.',
      hints: ['At 3 degrees, the squeal begins while grip stays full.', 'The tyre crosses its peak between 4 and 4.5 degrees.', 'Wait for Brian to finish.']};
    if (current === 'try-edge' && answersOpen) return {...base, waiting: true, ready: false, target: 'answer:0', glow: 'answer',
      say: 'At 4.5 degrees, is the grip loss less than 1% or more than 10%?',
      prompt: 'Pick a card by clicking it, or press 1, 2 or 3.',
      hints: ['The angle is just past the best angle.', 'The panel will not show the answer before the run.', 'Pick the sentence that matches your prediction.']};
    if (current === 'try-far' && answersOpen) return {...base, waiting: true, ready: false, target: 'answer:0', glow: 'answer',
      say: 'At 9 degrees, has the tyre lost more grip than it has at 4.5 degrees?',
      prompt: 'Pick a card by clicking it, or press 1, 2 or 3.',
      hints: ['The angle is farther past the best angle.', 'Compare the amount of slide at 9 and 4.5 degrees.', 'Pick the sentence that matches what you learned.']};
    if (current === 'try-edge') return {...base, waiting: !done, ready: done, target: done ? null : 'run', glow: 'slide',
      say: m.say || 'Your prediction is recorded. The dial is already set to 4.5 degrees.',
      prompt: done ? 'Press Enter to continue.' : 'Press Space to run the tyre at 4.5 degrees.',
      hints: ['The angle is already 4.5 degrees.', 'Press Space to run this setting.', 'Watch my pointer. I will run the tyre at 4.5 degrees.']};
    if (current === 'try-far') return {...base, waiting: !done, ready: done, target: done ? null : 'run', glow: 'slide',
      say: m.say || 'Your prediction is recorded. The dial is already set to 9 degrees.',
      prompt: done ? 'Press Enter to continue.' : 'Press Space to run the tyre at 9 degrees.',
      hints: ['The angle is already 9 degrees.', 'Press Space to run this setting.', 'Watch my pointer. I will run the tyre at 9 degrees.']};
    if (current === 'try-free') return {...base, waiting: !done, ready: done, target: done ? null : targetAction(), glow: 'settings',
      say: m.say || 'You can change the angle freely, and the formula follows the dial. The table keeps three different settings so you can compare each result.',
      prompt: done ? 'Press Enter to continue, or keep testing new settings.'
        : `Change the angle, then press Space to record a run. Different settings tested: ${freeTested.size} of ${FREE_RUNS}.`,
      hints: ['Change the dial before recording a run.', 'The table counts only different settings.', 'Watch my pointer. I will choose a new angle and record it.']};
    if (current === 'challenge') return {...base, waiting: !done, ready: done, target: done ? null : targetAction(), glow: 'settings',
      say: done ? m.say : m.say || 'Run the tyre at 3 degrees or more while it keeps full grip, then run it again after grip starts to fall.',
      prompt: done ? 'Press Enter to continue.' : challengeRows.some(item => item.slideDeg >= 3 && runAt(item.slideDeg).grip === 1)
        ? 'The full-grip run is recorded. Set 4.5 degrees, then press Space to find a loss.'
        : challengeRows.some(item => runAt(item.slideDeg).grip < 1)
          ? 'The grip loss is recorded. Set 3 or 4 degrees for full grip, then press Space.'
          : `The dial reads ${slideDeg} degrees and keeps ${showPct(slideDeg)}% grip. Set 3 or 4 degrees for full grip, or 4.5 degrees to find a loss, then press Space.`,
      hints: [
        'A full-grip result must be at 3 degrees or more.',
        'Use 3 or 4 degrees for full grip, and 4.5 degrees for a loss.',
        'Watch my pointer. I will set a qualifying angle and run the tyre.',
      ]};
    if (CHECKS[current]) return {...base, waiting: !done, ready: done, asking: !done,
      say: CHECKS[current].question, prompt: done ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.',
      hints: ['Think about the best angle and what a driver feels.', 'Use the earlier tyre tests before you choose.', 'Pick the sentence that matches the rule.']};
    return {...base, ready: true, waiting: false, ideas: KEY_IDEAS,
      say: 'At a small slide angle, the tyre pushes harder as the angle grows, up to its best angle. ' +
        'Past that, it slides more and pushes less; the driver feels the car start to skid.',
      prompt: 'Press Enter to finish and open the Grip challenge.', hints: KEY_IDEAS.map(item => item.text)};
  }

  function state() { return {slideDeg, rows: freeRows.map(item => ({...item})), challengeAttempts: challengeRows.map(item => ({...item}))}; }
  return {enter, act, tick, view, state};
}

export const PASS_SAY = 'You have found full grip at 3 degrees or more and found a setting where grip has started to fall.';
export const lesson = Object.freeze({
  id: 'grip', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', passSay: PASS_SAY,
  benchAttempts: view => view.challengeAttempts.map(({slideDeg}) => ({
    input: {slideDeg, driver: 'casual'},
    controls: [{id: 'slideDeg', value: slideDeg}, {id: 'driver', value: 'casual'}],
  })),
});
