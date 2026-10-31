// Pendulums as a classroom lesson (docs/board/cards/LAB-CLASSROOM.md section 4).
// Teaching state only, no DOM and no saves. Every swing time on screen comes
// from stringPeriod(), the function the pendulum bench and its tests use.
import {stringPeriod} from '../benches/pendulum.js';

export const LENGTHS = Object.freeze([5, 15, 25]);
export const WEIGHTS = Object.freeze({light: 20, heavy: 200});
export const SWING_RAD = 20 * Math.PI / 180;
export const PULL_S = .6; // Space eases the weight out to the start mark before letting go.
export const HOOK_X = Object.freeze({5: 230, 15: 430, 25: 630});
export const REFERENCE_X = 850;
const T = stringPeriod;
const s1 = seconds => `${seconds.toFixed(1)} s`;
const MIN_DRAG_RAD = 4 * Math.PI / 180, MAX_DRAG_RAD = 32 * Math.PI / 180;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does it keep swinging?'},
  {id: 'word-pendulum', part: 1, title: 'Pendulum', word: 'pendulum-pendulum'},
  {id: 'word-swing-time', part: 1, title: 'Swing time', word: 'pendulum-swing-time'},
  {id: 'word-length', part: 1, title: 'Length', word: 'pendulum-length'},
  {id: 'watch-lengths', part: 2, title: 'Three lengths', voice: 'lab.brian.pendulum.intro'},
  {id: 'watch-weights', part: 2, title: 'Light and heavy'},
  {id: 'try-short', part: 3, title: 'The short string'},
  {id: 'try-heavy', part: 3, title: 'The heavy weight'},
  {id: 'alone', part: 4, title: 'Brian’s crane'},
  {id: 'check-slowest', part: 5, title: 'Question 1 of 3'},
  {id: 'check-heavy', part: 5, title: 'Question 2 of 3'},
  {id: 'check-settle', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.pendulum.explain'},
].map(Object.freeze));

// The key ideas, shown on the recap and on the card in the corner during the game challenge.
export const KEY_IDEAS = Object.freeze([
  {id: 'lengths', text: 'Longer string, slower swing.'},
  {id: 'weights', text: 'Weight does not change the swing time.'},
  {id: 'settle', text: 'In the game: hover still and let the swing settle before you set down.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Length sets the swing time.', text: 'Hover still and let it settle.'});

// ---- swinging ----
export const pendulum = (id, x, lengthM, weightKg, extra = {}) => ({id, x, lengthM, weightKg, pullAt: null, amplitude: SWING_RAD, held: 0, ghost: false, ...extra});
export function swingAngle(p, time) {
  if (p.pullAt === null) return p.held;
  const since = time - p.pullAt;
  if (since < PULL_S) { const k = Math.max(0, since / PULL_S); return p.amplitude * k * k * (3 - 2 * k); }
  return p.amplitude * Math.cos(2 * Math.PI * (since - PULL_S) / T(p.lengthM));
}
export const swingElapsed = (p, time) => p.pullAt === null ? null : Math.max(0, time - p.pullAt - PULL_S);
function letGo(p, time, like = null) {
  const held = like ? like.held : p.held;
  if (Math.abs(held) >= MIN_DRAG_RAD) { p.amplitude = Math.min(MAX_DRAG_RAD, Math.abs(held)) * Math.sign(held); p.pullAt = time - PULL_S; }
  else { p.amplitude = SWING_RAD; p.pullAt = time; }
}
const stop = p => { p.pullAt = null; p.held = 0; };
function drawn(p, time) {
  const elapsed = swingElapsed(p, time), period = T(p.lengthM);
  return {id: p.id, x: p.x, lengthM: p.lengthM, weightKg: p.weightKg, ghost: p.ghost, angle: swingAngle(p, time),
    held: p.pullAt === null && p.held !== 0, swinging: p.pullAt !== null, periodS: period, amplitude: p.amplitude,
    stopwatch: elapsed === null ? null : {elapsed: Math.min(elapsed, period), done: elapsed >= period},
    swings: elapsed === null ? 0 : Math.floor(elapsed / period)};
}
const compare = (mine, reference) => Math.abs(mine - reference) < .05 ? 'same' : mine < reference ? 'quicker' : 'slower';

// ---- the keys each phase uses (the screen shows them on its buttons) ----
const SETUP_KEYS = Object.freeze({1: 'hook:5', 2: 'hook:15', 3: 'hook:25', 4: 'weight:light', 5: 'weight:heavy', Space: 'release'});
const PICK_KEYS = prefix => ({1: `${prefix}:0`, 2: `${prefix}:1`, 3: `${prefix}:2`});
const GUESSES = Object.freeze([
  {id: 'quicker', label: 'Quicker', picture: {kind: 'compare', mine: 'quicker'}},
  {id: 'slower', label: 'Slower', picture: {kind: 'compare', mine: 'slower'}},
  {id: 'same', label: 'The same', picture: {kind: 'compare', mine: 'same'}},
]);

// ---- the guided tries ----
const TRIES = {
  'try-short': {
    goal: p => p.lengthM === 5 && p.weightKg === WEIGHTS.light,
    setupSay: 'Your turn. Hang the weight on the short 5 m hook.',
    setupPrompt: 'Click the 5 m hook, or press 1.',
    target: 'hook:5',
    wrongSetup: (p, kind) => kind === 'weight' ? 'Keep the light 20 kg weight for now, so we change only one thing: the string.' : `That is the ${p.lengthM} m hook. The short 5 m hook is on the left.`,
    setupHints: ['Each hook has its length on a plate. Which one is shortest?', 'Click the hook on the left marked 5 m, or press 1.', 'Watch my pointer: it is on the 5 m hook.'],
    guessHints: ['Think about the trip: a short string has a short way to go.', 'Short strings swing quicker. Long strings swing slower.', 'Any guess is fine. Pick the card you think, then we test it.'],
    right: () => `Right! ${s1(T(5))} against ${s1(T(15))}. Shorter string, shorter trip, quicker swing.`,
    wrong: () => `It came back in ${s1(T(5))}, sooner than the grey one’s ${s1(T(15))}. A shorter string has a shorter trip, so it swings quicker.`,
  },
  'try-heavy': {
    goal: p => p.lengthM === 15 && p.weightKg === WEIGHTS.heavy,
    setupSay: 'Now change only the weight. Swap in the heavy 200 kg one.',
    setupPrompt: 'Click the 200 kg weight on the shelf, or press 5.',
    target: 'weight:heavy',
    wrongSetup: (p, kind) => kind === 'hook' ? 'Keep it on the 15 m hook, so we change only one thing: the weight.' : 'That is the light weight. Pick the big 200 kg one.',
    setupHints: ['The weights sit on the shelf on the left.', 'Click the big 200 kg weight on the shelf, or press 5.', 'Watch my pointer: it is on the 200 kg weight.'],
    guessHints: ['The string is still 15 m. Only the weight changed.', 'Remember the light and heavy weights on 15 m: they stayed in step.', 'Any guess is fine. Pick the card you think, then we test it.'],
    right: () => `Right! Both took ${s1(T(15))}. Weight does not change the swing time.`,
    wrong: () => `Both took ${s1(T(15))}. The heavy weight is pulled harder, but it is harder to get moving too, so it keeps the same pace.`,
  },
};
const RELEASE_HINTS = ['Your weight is the brass ball on the string you chose.', 'Press Space to let go, or drag your weight sideways and let go.', 'Watch my pointer: it is on your weight. Press Space.'];

// ---- the checks ----
const CHECKS = {
  'check-slowest': {
    question: 'Which one swings slowest?',
    answers: [
      {label: '5 m, 20 kg', picture: {kind: 'setup', lengthM: 5, weightKg: 20}},
      {label: '25 m, 20 kg', picture: {kind: 'setup', lengthM: 25, weightKg: 20}},
      {label: '5 m, 200 kg', picture: {kind: 'setup', lengthM: 5, weightKg: 200}},
    ], correct: 1,
    board: () => [pendulum('a', 300, 5, 20), pendulum('b', 500, 25, 20), pendulum('c', 700, 5, 200)],
    right: () => 'Yes. The longest string swings slowest, whatever the weight.',
    wrong: () => `The 25 m string swings slowest: ${s1(T(25))}. Weight does not matter, length does.`,
    hints: ['Which string is longest?', 'Length sets the swing time. The longest string swings slowest.', 'Pick the 25 m string.'],
  },
  'check-heavy': {
    question: `20 kg on a 15 m string takes ${s1(T(15))}. How long will 200 kg on 15 m take?`,
    answers: [5, 15, 25].map(length => ({label: s1(T(length)), picture: {kind: 'watch', seconds: T(length)}})), correct: 1,
    board: () => [pendulum('light', 380, 15, 20), pendulum('heavy', 620, 15, 200)],
    right: () => `Yes, ${s1(T(15))}. Same length, same swing time.`,
    wrong: () => `It takes ${s1(T(15))}, the same as the light one. Only length changes the swing time.`,
    hints: ['When the light and heavy weights hung on 15 m, did they stay in step?', 'Weight does not change the swing time.', `Pick ${s1(T(15))}.`],
  },
  'check-settle': {
    question: 'The car is swinging under the helicopter. What should you do before you set it down?',
    answers: [
      {label: 'Hover still and let it settle', picture: {kind: 'heli', move: 'hover'}},
      {label: 'Fly forward fast', picture: {kind: 'heli', move: 'forward'}},
      {label: 'Let go of it now', picture: {kind: 'heli', move: 'drop'}},
    ], correct: 0,
    board: () => [],
    right: () => 'Yes. Hover still, give it a swing or two, and it settles.',
    wrong: () => 'Moving or letting go while it swings throws the car sideways. Hover still and let it settle first.',
    hints: ['Think about what makes a swing die down.', 'A swing settles when you keep still and wait.', 'Pick “Hover still and let it settle”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];
  const all = () => [m.player, m.reference, ...(m.board ?? [])].filter(Boolean);

  function enter(index) {
    m = {index, time: 0, phase: 'setup', guess: null, result: null, chosen: null, goodTaps: 0, lastSwings: {}, lastTry: null, answered: null, board: null, player: null, reference: null};
    const id = STEPS[index].id;
    if (id === 'word-pendulum') m.board = [pendulum('bob', 500, 15, 20)];
    if (id === 'word-swing-time') { m.board = [pendulum('bob', 500, 15, 20)]; letGo(m.board[0], 0); }
    if (id === 'word-length') m.board = LENGTHS.map((length, i) => pendulum(`l${length}`, 300 + i * 200, length, 20));
    if (id === 'watch-lengths') { m.board = LENGTHS.map((length, i) => pendulum(`l${length}`, 280 + i * 220, length, 20)); m.board.forEach(p => letGo(p, .4)); }
    if (id === 'watch-weights') { m.board = [pendulum('light', 380, 15, 20), pendulum('heavy', 620, 15, 200)]; m.board.forEach(p => letGo(p, .4)); }
    if (TRIES[id] || id === 'alone') {
      m.player = pendulum('you', HOOK_X[15], 15, 20);
      if (TRIES[id]) m.reference = pendulum('reference', REFERENCE_X, 15, 20, {ghost: true});
    }
    if (CHECKS[id]) { m.phase = 'ask'; m.board = CHECKS[id].board(); }
  }

  // A stopwatch ticks once as each weight finishes its first full swing.
  function swingEvents() {
    let tick = null;
    for (const p of all()) {
      const swings = drawn(p, m.time).swings;
      if (swings > (m.lastSwings[p.id] ?? 0)) tick = {kind: 'sound', sound: 'lab.tick'};
      m.lastSwings[p.id] = swings;
    }
    return tick;
  }

  function act(action) {
    const id = step().id, [kind, value] = action.split(':');
    if (kind === 'replay') return replay();
    if (id === 'word-pendulum') {
      const bob = m.board[0];
      if (kind === 'hold' && bob.pullAt === null) bob.held = clamp(Number(value));
      if (kind === 'release' && bob.pullAt === null) { letGo(bob, m.time); bob.held = 0; seen.add(id); return {kind: 'right', say: 'That is a pendulum swinging. Its weight pulls it back to the middle every time.'}; }
      return null;
    }
    if (id === 'word-swing-time' && kind === 'tap') return tap();
    if (id === 'word-length' && kind === 'measure') {
      const length = Number(value);
      if (!LENGTHS.includes(length) || m.chosen === 25) return null;
      m.chosen = length;
      if (length === 25) { seen.add(id); return {kind: 'right', say: 'Yes, 25 m is the longest. Length is measured from the hook to the middle of the weight.'}; }
      return {kind: 'fail', say: `That one is ${length} m. Look for the weight that hangs lowest.`};
    }
    if (TRIES[id] || id === 'alone') return tryAct(id, kind, value);
    if (CHECKS[id] && kind === 'answer' && m.phase === 'ask') {
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      for (const p of m.board) letGo(p, m.time);
      m.settleFrom = m.time;
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong()};
    }
    return null;
  }

  function tap() {
    const bob = m.board[0], elapsed = swingElapsed(bob, m.time);
    if (elapsed === null) return null;
    const period = T(bob.lengthM), phase = (elapsed % period) / period;
    if (phase > .88 || phase < .12 && elapsed > period / 2) {
      m.goodTaps++; seen.add('word-swing-time');
      return {kind: 'right', say: `Yes! Out and back to the green mark: one full swing. That took ${s1(period)}.`};
    }
    if (elapsed < period * .5) return {kind: 'fail', say: 'It has only just set off. Wait for it to swing out and come all the way back.'};
    if (phase >= .3 && phase <= .7) return {kind: 'fail', say: 'That was the far side. One swing ends when it is back at the green mark.'};
    if (phase > .7) return {kind: 'fail', say: 'Nearly! Wait until it touches the green mark.'};
    return {kind: 'fail', say: 'A little late: it had already left the green mark. Tap just as it gets back.'};
  }

  function tryAct(id, kind, value) {
    const p = m.player, guided = TRIES[id];
    if (m.phase === 'setup' && (kind === 'hook' || kind === 'weight')) {
      // A press that changes nothing is not a mistake.
      if (kind === 'hook' ? Number(value) === p.lengthM : WEIGHTS[value] === p.weightKg) return null;
      if (kind === 'hook') { const length = Number(value); if (!LENGTHS.includes(length)) return null; p.lengthM = length; p.x = HOOK_X[length]; }
      else { if (!Object.hasOwn(WEIGHTS, value)) return null; p.weightKg = WEIGHTS[value]; }
      stop(p);
      if (!guided) return {kind: 'sound', sound: 'lab.clunk'};
      if (guided.goal(p)) { m.phase = 'guess'; return {kind: 'progress', sound: 'lab.clunk', say: 'Good. Before you let go, guess: quicker, slower or the same as the grey 15 m one?'}; }
      return {kind: 'fail', sound: 'lab.clunk', say: guided.wrongSetup(p, kind)};
    }
    if (m.phase === 'guess' && kind === 'guess') {
      const pick = GUESSES[Number(value)];
      if (!pick) return null;
      m.guess = pick.id; m.phase = 'release';
      return {kind: 'progress', say: 'Now let go. Your weight and the grey one start together.'};
    }
    const canLetGo = guided ? m.phase === 'release' : m.phase === 'setup';
    if (canLetGo && kind === 'hold') { p.held = clamp(Number(value)); return null; }
    if (canLetGo && kind === 'release') {
      letGo(p, m.time);
      if (m.reference) { m.reference.held = p.held; letGo(m.reference, m.time); m.reference.held = 0; }
      p.held = 0; m.phase = 'running';
      // On their own, a test run is not a step forward: Brian's help stays where it was.
      return {kind: guided ? 'progress' : 'run', say: guided ? 'Watch the two stopwatches.' : 'Watch the stopwatch.'};
    }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    const sound = swingEvents(), id = step().id;
    if (m.phase === 'running') {
      const swingers = [m.player, m.reference].filter(Boolean);
      if (swingers.every(p => swingElapsed(p, m.time) >= T(p.lengthM) + .3)) return finishRun(id);
    }
    if ((id === 'watch-lengths' || id === 'watch-weights') && m.board.every(p => swingElapsed(p, m.time) >= T(p.lengthM))) seen.add(id);
    if (id === 'wonder' && m.time >= 5) seen.add(id);
    return sound;
  }

  function finishRun(id) {
    const p = m.player, period = T(p.lengthM);
    if (TRIES[id]) {
      m.phase = 'result'; seen.add(id);
      const actual = compare(period, T(m.reference.lengthM));
      m.result = {actual, right: actual === m.guess};
      // A wrong guess replays the two swings side by side while Brian explains.
      if (!m.result.right) restart([m.player, m.reference]);
      return m.result.right ? {kind: 'right', say: TRIES[id].right()} : {kind: 'wrong', say: TRIES[id].wrong()};
    }
    m.lastTry = {lengthM: p.lengthM, weightKg: p.weightKg, periodS: period};
    if (Math.abs(period - T(25)) < .05) { m.phase = 'result'; seen.add(id); return {kind: 'pass', say: `That’s it: ${s1(period)} on the 25 m string. My crane is ready.`}; }
    stop(p); m.phase = 'setup';
    const heavyAndStill = p.weightKg === WEIGHTS.heavy && p.lengthM !== 25;
    return {kind: 'fail', say: heavyAndStill ? `That took ${s1(period)}. The heavy weight did not slow it down. Try a longer string.`
      : `That swing took ${s1(period)}. Too quick: a longer string swings slower.`};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder') { m.time = 0; return null; }
    if (id === 'watch-lengths' || id === 'watch-weights' || id === 'word-swing-time') { m.board.forEach(p => letGo(p, m.time)); m.lastSwings = {}; return null; }
    if (m.phase === 'result' && (TRIES[id] || id === 'alone')) { restart([m.player, m.reference].filter(Boolean)); return null; }
    if (CHECKS[id] && m.phase === 'answered') { m.board.forEach(p => letGo(p, m.time)); m.settleFrom = m.time; return null; }
    return null;
  }

  // Start again together, exactly as the player let go.
  function restart(swingers) {
    for (const p of swingers) p.pullAt = m.time - (m.player.amplitude === SWING_RAD ? 0 : PULL_S);
    m.lastSwings = {};
  }

  function view({help = 0, assist = false} = {}) {
    const s = step(), id = s.id, base = {scene: 'board', time: m.time, pendulums: all().map(p => drawn(p, m.time)), keys: {}, cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id)};
    if (id === 'wonder') return {...base, scene: 'wonder', ready: seen.has(id), actions: ['replay'],
      say: 'The helicopter stopped, but the car kept swinging. Why? And how long does one swing take?',
      prompt: 'Watch the car under the helicopter.', hints: ['Watch where the car goes when the helicopter stops.', 'The car keeps moving after the helicopter stops, so it swings.', 'Press Enter when you are ready to find out why.']};
    if (id === 'word-pendulum') {
      const swinging = m.board[0].pullAt !== null;
      return {...base, labels: true, keys: {Space: 'release'}, waiting: !swinging, target: swinging ? null : 'release', glow: swinging ? null : 'release',
        say: 'A pendulum is a weight on a string that can swing.', prompt: swinging ? 'That is it swinging. Press Enter to go on.' : 'Pull the weight aside and let go: drag it, or press Space.',
        hints: ['Find the brass weight at the bottom of the string.', 'Press Space, or drag the weight sideways and let go.', 'Watch my pointer: it is on the weight. Press Space.']};
    }
    if (id === 'word-swing-time') {
      const bob = m.board[0], elapsed = swingElapsed(bob, m.time) ?? 0, period = T(bob.lengthM), phase = (elapsed % period) / period;
      return {...base, startMark: true, outAndBack: true, keys: {Space: 'tap'}, actions: ['tap'], waiting: m.goodTaps === 0, target: 'tap', pointOnly: true,
        tapFlash: (assist || help >= 2) && elapsed > period / 2 && (phase > .9 || phase < .04),
        lap: {elapsed: elapsed % period, last: elapsed >= period ? period : null},
        say: 'One swing is out and back to where it started. Swing time is how long that takes.',
        prompt: m.goodTaps ? 'That was one full swing. Press Enter to go on.' : 'Press Space (or Tap) the moment the weight is back at the green mark.',
        hints: ['Watch the weight leave the green mark, swing out, and come back.', `Tap just as the weight touches the green mark again. That happens every ${s1(period)}.`, 'Watch the ring on the green mark: tap when it flashes.']};
    }
    if (id === 'word-length') return {...base, keys: {1: 'measure:5', 2: 'measure:15', 3: 'measure:25'}, waiting: m.chosen !== 25, target: m.chosen === 25 ? null : 'measure:25',
      tapes: m.chosen === 25 ? LENGTHS : m.chosen ? [m.chosen] : [], numbered: true,
      say: 'Length is how far it is from the hook to the middle of the weight.', prompt: m.chosen === 25 ? 'Press Enter to go on.' : 'Click the longest string, or press its number: 1, 2 or 3.',
      hints: ['Which weight hangs lowest?', 'The string on the right is the longest. Click it, or press 3.', 'Watch my pointer: it is on the longest string.']};
    if (id === 'watch-lengths' || id === 'watch-weights') {
      const finished = m.board.every(p => swingElapsed(p, m.time) >= T(p.lengthM)), lengths = id === 'watch-lengths';
      return {...base, actions: ['replay', 'slow'], stopwatches: true,
        table: m.board.map(p => ({label: lengths ? `${p.lengthM} m` : `${p.weightKg} kg on ${p.lengthM} m`, value: swingElapsed(p, m.time) >= T(p.lengthM) ? s1(T(p.lengthM)) : null})),
        say: lengths ? (finished ? 'Shortest string, quickest swing. Longest string, slowest swing.' : 'Three weights on three strings, then a heavier weight on the same string. The stopwatch times every swing.')
          : (finished ? 'Ten times the weight, the same swing time. Length matters, weight does not.' : 'Same 15 m string, but one weight is ten times heavier. Watch the two stopwatches.'),
        prompt: finished || seen.has(id) ? 'Press Enter to go on, or R to watch again.' : 'Watch each stopwatch stop when its weight is back.',
        hints: ['Watch the stopwatches above each hook.', 'Each stopwatch stops after one full swing.', 'Press R to watch again.']};
    }
    if (TRIES[id] || id === 'alone') return tryView(id, base, help);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id === 'check-settle' ? 'settle' : 'board', settle: answered ? {from: m.settleFrom, right: m.answered === check.correct} : null, stopwatches: answered,
        keys: answered ? {} : PICK_KEYS('answer'), actions: answered ? ['replay'] : [], waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a picture: click it, or press 1, 2 or 3.', hints: check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'A swing takes longer on a longer string, and the weight makes no difference. Slow swings are gentler and easier to calm, but a longer cable needs more height.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function tryView(id, base, help) {
    const guided = TRIES[id], p = m.player, shelf = true;
    const common = {...base, hooks: true, shelf, chosen: {lengthM: p.lengthM, weightKg: p.weightKg}, stopwatches: true};
    if (m.phase === 'setup') {
      const target = guided ? guided.target : p.lengthM !== 25 ? 'hook:25' : 'release';
      return {...common, keys: guided ? SETUP_KEYS_NO_RELEASE : SETUP_KEYS, waiting: true, target, glow: guided ? guided.target : null,
        lastTry: m.lastTry,
        say: guided ? guided.setupSay : 'My crane needs a slow swing that takes about 10 seconds. Set it up, then let go to test it.',
        prompt: guided ? guided.setupPrompt : 'Pick a hook (1, 2, 3) and a weight (4, 5), then press Space to let go.',
        hints: guided ? guided.setupHints : ['Which makes a swing slower: a longer string, or a heavier weight?', 'Only length changes the swing time. The longest string swings slowest.',
          p.lengthM !== 25 ? 'Watch my pointer: it is on the 25 m hook.' : 'Watch my pointer: it is on your weight. Press Space.']};
    }
    if (m.phase === 'guess') return {...common, keys: PICK_KEYS('guess'), waiting: true,
      cards: GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture, state: null})),
      say: 'Guess first. Will yours swing quicker, slower or the same as the grey 15 m one?', prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: guided.guessHints};
    if (m.phase === 'release') return {...common, keys: {Space: 'release'}, waiting: true, target: 'release', glow: 'release', guess: m.guess,
      say: 'Let go when you are ready. Both weights start together.', prompt: 'Drag your weight aside and let go, or press Space.', hints: RELEASE_HINTS};
    if (m.phase === 'running') return {...common, guess: m.guess, say: guided ? 'Watch the two stopwatches.' : 'Watch the stopwatch.', prompt: 'Each stopwatch stops after one full swing.', hints: ['Watch the stopwatches.', 'Each stops after one full swing.', 'Wait for both to stop.']};
    const right = guided ? m.result.right : true;
    return {...common, actions: ['replay'], guess: m.guess, ready: true,
      cards: guided ? GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: g.id === m.result.actual ? 'right' : g.id === m.guess ? 'wrong' : null})) : [],
      say: guided ? (right ? guided.right() : guided.wrong()) : `That’s it: ${s1(T(p.lengthM))} on the 25 m string. My crane is ready.`,
      mood: right ? 'cheer' : 'explain', prompt: 'Press Enter to go on, or R to watch again.', hints: [guided ? 'Press R to watch the two swings again.' : 'Press R to watch the swing again.', 'Press Enter to go on.', 'Press Enter to go on.']};
  }

  return {enter, act, tick, view, state: () => m};
}
const SETUP_KEYS_NO_RELEASE = Object.freeze(Object.fromEntries(Object.entries(SETUP_KEYS).filter(([key]) => key !== 'Space')));
const clamp = value => Number.isFinite(value) ? Math.max(-MAX_DRAG_RAD, Math.min(MAX_DRAG_RAD, value)) : 0;

export const lesson = Object.freeze({id: 'pendulum', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD});
