// Grip and slip follow the same tyre rule as the rolling-road challenge.
import {TYRE_SLIP} from '../../config.js';
import {gripBench, bestSlideDegrees} from '../benches/tunnel.js';

const BASE = 2;
const MIN = 0, MAX = 12, STEP = .5;
const FREE_RUNS = 3;
const HELD_GAP_S = .14, AUTO_GAP_S = .14;
const DIRECTIONS = Object.freeze({'↑': 'slide:up', '↓': 'slide:down'});
const clamp = value => Math.max(MIN, Math.min(MAX, value));
const pct = grip => grip === 1 ? 100 : Math.min(99, Math.round(grip * 100));
const runAt = slideDeg => gripBench.run({slideDeg, driver: 'casual'});
const showPct = slideDeg => pct(runAt(slideDeg).grip);
const slipText = value => value.toFixed(6);
const settingsKey = slideDeg => String(slideDeg);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'What changes as a tyre slides?', voice: 'lab.brian.grip.intro'},
  {id: 'word-slide', part: 1, title: 'Measure sideways slide', word: 'grip-slide'},
  {id: 'word-grip', part: 1, title: 'What grip means', word: 'grip'},
  {id: 'word-slip', part: 1, title: 'The tyre limit', word: 'grip-slip'},
  {id: 'formula', part: 1, title: 'How this tyre model counts grip'},
  {id: 'watch', part: 2, title: 'Watch the grip reading'},
  {id: 'try-edge', part: 3, title: 'Predict at 4.5 degrees'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'challenge', part: 4, title: "Brian's two-run test"},
  {id: 'check-band', part: 5, title: 'Check the target band'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.grip.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'sideways', text: 'The rolling-road dial measures how far the tyre points away from its path, in degrees.'},
  {id: 'limit', text: `In this game, the tyre reaches its best grip at about ${bestSlideDegrees().toFixed(3)} degrees. Grip begins to fall after that point.`},
  {id: 'target', text: `The Grip challenge needs full grip at 3 degrees or more, then a run with less than full grip. On this dial, 3 or 4 degrees and 4.5 degrees meet those two targets.`},
].map(Object.freeze));

export const CHALLENGE_CARD = Object.freeze({
  title: 'Find full grip, then find where it starts to fall.',
  text: 'Run this tyre at 3 degrees or more while it keeps full grip, then run it again after grip has started to fall.',
});

// Keep the earlier notebook identifiers so saved Lab notes still match.
export const WORDS = Object.freeze([
  {id: 'grip', word: 'Grip', meaning: "Grip is a tyre's ability to push against the road without sliding farther."},
  {id: 'slip', word: 'Slip', meaning: "Slip is the tyre's sideways movement compared with the point where grip is strongest."},
  {id: 'limit', word: 'Limit', meaning: `The limit is the point where this game's tyre model starts to lower grip, at about ${bestSlideDegrees().toFixed(3)} degrees.`},
].map(Object.freeze));

const SLIDE_GRIP = TYRE_SLIP.casual.slideGrip;
const SLIP_WIDTH = TYRE_SLIP.width;
const FORMULA = `grip kept = 1 − (1 − ${SLIDE_GRIP.toFixed(2)}) × clamp((slip − 1) ÷ ${SLIP_WIDTH.toFixed(2)}, 0, 1)`;
const formulaRow = (slideDeg, worked = true) => {
  const result = runAt(slideDeg);
  const normalized = Math.max(0, Math.min(1, (result.slip - 1) / TYRE_SLIP.width));
  const computed = 1 - (1 - SLIDE_GRIP) * normalized;
  const slip = slipText(result.slip);
  return [{
    title: 'The casual tyre rule in this game',
    formula: FORMULA,
    worked: worked ? `1 − (1 − ${SLIDE_GRIP.toFixed(2)}) × clamp((${slip} − 1) ÷ ${SLIP_WIDTH.toFixed(2)}, 0, 1) = ${computed.toFixed(6)} (${(computed * 100).toFixed(4)}%)` : '',
    note: worked
      ? 'The result comes from the same tyre function as the challenge. The board shows a whole percent and never rounds a real grip loss up to 100%.'
      : 'The rule starts to lower grip after slip passes 1. The question is still open, so the panel does not show a worked result.',
  }];
};

const CHECK = Object.freeze({
  question: 'Which setting is the first one past the point where grip starts to fall: 4, 4.5 or 9 degrees?',
  answers: [
    'At 4 degrees, the tyre has just started to lose grip.',
    'At 4.5 degrees, the tyre has just started to lose grip.',
    'At 9 degrees, the tyre has just started to lose grip.',
  ],
  correct: 1,
  right: `The peak is about ${bestSlideDegrees().toFixed(3)} degrees. At 4 degrees the tyre model gives 100%; at 4.5 degrees it gives ${(runAt(4.5).grip * 100).toFixed(4)}%, shown as 99%, and at 9 degrees it gives ${showPct(9)}%.`,
  wrong: `The peak is about ${bestSlideDegrees().toFixed(3)} degrees. At 4 degrees the tyre model gives 100%; at 4.5 degrees it gives ${(runAt(4.5).grip * 100).toFixed(4)}%, shown as 99%, and at 9 degrees it gives ${showPct(9)}%, so 4.5 degrees is first past the peak.`,
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
  const goal = () => id() === 'word-slide' ? 2 : id() === 'try-free' ? freeTarget() : id() === 'challenge' ? (challengeRows.some(row => row.slideDeg >= 3 && runAt(row.slideDeg).grip === 1) ? 4.5 : 4) : 4;
  const targetAction = () => {
    if (id() === 'try-free' && freeTested.size >= FREE_RUNS) return null;
    if (id() === 'challenge' && challengeMet()) return null;
    return Math.abs(slideDeg - goal()) > 1e-9 ? 'set:best' : 'run';
  };

  function enter(index) {
    m = {index, time: 0, phase: 'ready', say: '', guess: null, auto: null, lastPress: -1, watchDone: false};
    if (id() === 'wonder') slideDeg = 0;
    if (id() === 'word-slide') slideDeg = 1.5;
    if (id() === 'word-grip' || id() === 'word-slip' || id() === 'formula') slideDeg = 4;
    if (id() === 'watch') slideDeg = 3;
    if (id() === 'try-edge') { slideDeg = 4.5; m.phase = 'guess'; }
    if (id() === 'try-free') { slideDeg = BASE; freeTested.clear(); freeRows.splice(0); }
    if (id() === 'challenge') { slideDeg = BASE; challengeRows.splice(0); }
    if (id() === 'check-band') m.phase = 'ask';
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
      m.say = `At ${slideDeg} degrees, the tyre model returns ${result().grip.toFixed(7)} grip, shown as ${showPct(slideDeg)}%. Change the dial before comparing another setting.`;
      if (freeTested.size >= FREE_RUNS) m.phase = 'done';
      return {kind: 'right', say: m.say};
    }
    if (id() === 'try-edge') {
      const g = currentGrip();
      m.phase = 'done';
      m.say = m.guess === 1
        ? `That is right: at 4.5 degrees the peak is about ${bestSlideDegrees().toFixed(3)} degrees, so the tyre is ${Math.abs(4.5 - bestSlideDegrees()).toFixed(3)} degrees past it. The tyre model returns ${g.toFixed(7)} grip, or ${(g * 100).toFixed(4)}%, which the board shows as ${showPct(slideDeg)}%.`
        : `At 4.5 degrees the peak is about ${bestSlideDegrees().toFixed(3)} degrees, so the tyre is ${Math.abs(4.5 - bestSlideDegrees()).toFixed(3)} degrees past it. The tyre model returns ${g.toFixed(7)} grip, or ${(g * 100).toFixed(4)}%, which the board shows as ${showPct(slideDeg)}%; grip has started to fall.`;
      return {kind: m.guess === 1 ? 'right' : 'wrong', say: m.say};
    }
    if (id() === 'challenge') {
      challengeRows.push({slideDeg});
      const g = currentGrip();
      if (challengeMet()) {
        m.phase = 'done';
        m.say = `The ${slideDeg}-degree run returned ${g.toFixed(7)} grip, shown as ${showPct(slideDeg)}%. Together with your earlier run, this meets both targets from the Grip challenge.`;
        return {kind: 'pass', say: m.say};
      }
      const hasFull = challengeRows.some(item => item.slideDeg >= 3 && runAt(item.slideDeg).grip === 1);
      const hasLoss = challengeRows.some(item => runAt(item.slideDeg).grip < 1);
      m.say = hasFull
        ? `At ${slideDeg} degrees the tyre returned ${g.toFixed(7)} grip, shown as ${showPct(slideDeg)}%. The full-grip run is recorded; now test beyond ${bestSlideDegrees().toFixed(3)} degrees to find a loss.`
        : hasLoss
          ? `At ${slideDeg} degrees the tyre returned ${g.toFixed(7)} grip, shown as ${showPct(slideDeg)}%. This shows a loss; now find full grip at 3 degrees or more.`
          : `At ${slideDeg} degrees the tyre returned ${g.toFixed(7)} grip, shown as ${showPct(slideDeg)}%. This run meets neither target yet; use 3 or 4 degrees for full grip, or 4.5 degrees to find a loss.`;
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
      if (id() === 'check-band') {
        m.phase = 'done'; m.say = picked === CHECK.correct ? CHECK.right : CHECK.wrong;
        return {kind: picked === CHECK.correct ? 'right' : 'wrong', say: m.say};
      }
      m.say = picked === 1
        ? 'Your prediction is recorded. Press Space to run the tyre at 4.5 degrees.'
        : 'Your prediction is recorded. Press Space to compare it with the tyre at 4.5 degrees.';
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
      slideDeg = [3, 4, 4.5, 9][Math.min(3, Math.floor(m.time / .8))];
    }
    if (id() === 'watch' && !m.watchDone && m.time >= 3.2) {
      m.watchDone = true;
      m.say = `At 3 and 4 degrees the tyre keeps ${showPct(3)}% grip, while at 4.5 and 9 degrees it keeps ${showPct(4.5)}% and ${showPct(9)}%. The peak is about ${bestSlideDegrees().toFixed(3)} degrees, so the 4.5-degree run crosses it.`;
      freeRows.splice(0, freeRows.length, ...[3, 4, 4.5, 9].map(value => ({kind: 'watch', slideDeg: value, slip: runAt(value).slip, grip: runAt(value).grip, percent: showPct(value)})));
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
    if (['word-grip'].includes(current)) return [{title: 'Grip as a percentage', formula: 'grip kept (%) = grip kept × 100', worked: `1.000000 × 100 = ${showPct(slideDeg)}%`, note: 'The current result uses the rolling-road tyre function.'}];
    if (['word-slip'].includes(current)) return [{title: 'The slip scale', formula: 'slip = 1 at the strongest-grip point', worked: `${slipText(result().slip)} slip at ${slideDeg} degrees`, note: 'The dial angle is converted to slip by the same angle curve as the game.'}];
    if (current === 'formula' || current === 'watch' || current === 'try-free' || current === 'challenge' || current === 'recap') return formulaRow(slideDeg, true);
    if (answersOpen) return formulaRow(slideDeg, false);
    if (current === 'try-edge' && m.phase === 'set') return formulaRow(slideDeg, true);
    return [];
  }

  function view() {
    const current = id(), done = m.phase === 'done';
    const answersOpen = m.phase === 'guess' || m.phase === 'ask';
    const controlsOn = ['word-slide', 'formula', 'try-free', 'challenge'].includes(current) || current === 'try-edge' && m.phase === 'set';
    const keys = {};
    if (controlsOn && !m.auto && (!done || current === 'word-slide' || current === 'try-free')) {
      Object.assign(keys, DIRECTIONS);
      if (current === 'try-free' || current === 'challenge') keys.Space = 'run';
      if (current === 'try-edge' && m.phase === 'set') keys.Space = 'run';
    }
    if (answersOpen) Object.assign(keys, {1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
    const cards = answersOpen ? (current === 'check-band' ? CHECK.answers : [
      'This tyre keeps all its grip.', 'This tyre has lost some grip.', 'This tyre has lost at least 10% of its grip.',
    ]).map((label, i) => ({id: `answer:${i}`, key: String(i + 1), label, picture: {kind: 'grip', percent: null}, state: done ? i === CHECK.correct ? 'right' : i === m.guess ? 'wrong' : null : null})) : [];
    const base = {
      scene: current, time: m.time, slideDeg, bestSlideDeg: goal(), slip: result().slip, grip: answersOpen ? null : result().grip,
      percent: answersOpen ? null : showPct(slideDeg), rows: freeRows.map(item => ({...item})),
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
      say: done ? m.say : 'A tyre has sideways slide when it moves across the road instead of following the direction it points. This dial measures the slide angle in degrees; a degree is one small unit for measuring an angle.',
      prompt: done ? 'Press Enter to continue, or keep changing the dial.' : `The dial reads ${slideDeg} degrees. Press ↑ to raise it or ↓ to lower it until it reads 2 degrees.`,
      hints: ['The dial is beside the rolling road.', 'Press ↑ to raise the angle or ↓ to lower it until it reads 2 degrees.', 'Watch my pointer. I will set the dial to 2 degrees.']};
    if (current === 'word-grip') return {...base, ready: true,
      say: "Grip is a tyre's ability to push against the road without sliding farther. The blue graph shows how much of the tyre's full grip remains at each slide angle.",
      prompt: 'Press Enter to see how the tyre model describes a limit.', hints: ['The percentage is shown beside the graph.', 'The full reading is 100%.', 'Press Enter to continue.']};
    if (current === 'word-slip') return {...base, ready: true,
      say: `In this game, slip measures the tyre's sideways movement compared with the point where grip is strongest. The tyre reaches that point at about ${bestSlideDegrees().toFixed(3)} degrees; the model lowers grip after slip passes 1.`,
      prompt: 'Press Enter to see the rule that gives the grip reading.', hints: ['Slip 1 marks the strongest-grip point.', 'The dial angle is converted to slip by the tyre model.', 'Press Enter to continue.']};
    if (current === 'formula') return {...base, ready: true,
      say: 'The game keeps full grip through slip 1, then lowers the casual tyre reading toward 90% over the next 0.25 slip; clamp keeps that amount between zero and one. The dial and formula use the same tyre rule as the challenge.',
      prompt: 'Press Enter to watch the rolling-road readings.', hints: ['The rule starts after slip 1.', 'The casual tyre loses at most 10% in this model.', 'Press Enter to continue.']};
    if (current === 'watch') return {...base, waiting: !done, ready: done,
      say: done ? m.say : 'I will test 3, 4, 4.5 and 9 degrees. Watch the tyre, the graph and the grip reading as the angle changes.',
      prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the readings change.',
      hints: ['At 3 degrees, the squeal begins while grip stays full.', 'The tyre crosses its peak between 4 and 4.5 degrees.', 'Wait for Brian to finish.']};
    if (current === 'try-edge' && answersOpen) return {...base, waiting: true, ready: false, target: 'answer:0', glow: 'answer',
      say: 'At 4.5 degrees, has grip started to fall, or does the tyre still have all its grip?',
      prompt: 'Pick a card by clicking it, or press 1, 2 or 3.',
      hints: ['The peak is just below 4.5 degrees.', 'Choose whether grip has changed at this setting.', 'Pick the sentence that matches the tyre model.']};
    if (current === 'try-edge') return {...base, waiting: !done, ready: done, target: done ? null : 'run', glow: 'slide',
      say: m.say || 'Your prediction is recorded. The dial is already set to 4.5 degrees.',
      prompt: done ? 'Press Enter to continue.' : 'Press Space to run the tyre at 4.5 degrees.',
      hints: ['The angle is already 4.5 degrees.', 'Press Space to run this setting.', 'Watch my pointer. I will run the tyre at 4.5 degrees.']};
    if (current === 'try-free') return {...base, waiting: !done, ready: done, target: done ? null : targetAction(), glow: 'settings',
      say: m.say || 'You can change the angle freely, and the formula follows the dial. The table keeps three different settings so you can compare each result.',
      prompt: done ? 'Press Enter to continue, or keep testing new settings.' : `Change the angle, then press Space to record a run. Different settings tested: ${freeTested.size} of ${FREE_RUNS}.`,
      hints: ['Change the dial before recording a run.', 'The table counts only different settings.', 'Watch my pointer. I will choose a new angle and record it.']};
    if (current === 'challenge') return {...base, waiting: !done, ready: done, target: done ? null : targetAction(), glow: 'settings',
      say: done ? m.say : m.say || "Run the tyre at 3 degrees or more while it keeps full grip, then run it again after grip starts to fall. Predict from the formula before each run.",
      prompt: done ? 'Press Enter to continue.' : challengeRows.some(item => item.slideDeg >= 3 && runAt(item.slideDeg).grip === 1)
        ? `The full-grip run is recorded. Set 4.5 degrees to move past the ${bestSlideDegrees().toFixed(3)}-degree peak, then press Space.`
        : challengeRows.some(item => runAt(item.slideDeg).grip < 1)
          ? 'The grip loss is recorded. Set 3 or 4 degrees for full grip, then press Space.'
          : `The dial reads ${slideDeg} degrees and keeps ${showPct(slideDeg)}% grip. Set 3 or 4 degrees for full grip, or 4.5 degrees to find a loss, then press Space.`,
      hints: ['A full-grip result must be at 3 degrees or more.', 'Use 3 or 4 degrees for full grip, and 4.5 degrees for a loss.', 'Watch my pointer. I will set a qualifying angle and run the tyre.']};
    if (current === 'check-band') return {...base, waiting: !done, ready: done, asking: !done,
      say: CHECK.question, prompt: done ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.',
      hints: ['The limit is near 4.3 degrees.', 'Compare 4, 4.5 and 9 degrees with the limit.', 'Pick the sentence that matches the rule.']};
    return {...base, ready: true, waiting: false, ideas: KEY_IDEAS,
      say: 'This tyre keeps full grip through four degrees, and the game starts lowering grip after about four point three degrees. The Grip challenge asks for full grip at three degrees or more, then a run after grip has started to fall.',
      prompt: 'Press Enter to finish and open the Grip challenge.', hints: KEY_IDEAS.map(item => item.text)};
  }

  function state() { return {slideDeg, rows: freeRows.map(item => ({...item})), challengeAttempts: challengeRows.map(item => ({...item}))}; }
  return {enter, act, tick, view, state};
}

export const PASS_SAY = 'You have found full grip at 3 degrees or more and found a setting where grip has started to fall.';
export const lesson = Object.freeze({
  id: 'grip', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', passSay: PASS_SAY,
  benchAttempts: view => view.challengeAttempts.map(({slideDeg}) => ({input: {slideDeg, driver: 'casual'}, controls: [{id: 'slideDeg', value: slideDeg}, {id: 'driver', value: 'casual'}]})),
});
