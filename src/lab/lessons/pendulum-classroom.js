// Pendulums as a classroom lesson (docs/board/cards/LAB-CLASSROOM.md section 4; its wording and formulas follow
// LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. Every swing time on screen comes from
// stringPeriod(), the function the pendulum bench and its tests use.
import {GRAVITY, stringPeriod} from '../benches/pendulum.js';
import {MORE} from '../classroom/brian-text.js';

export const LENGTHS = Object.freeze([5, 15, 25]);
export const WEIGHTS = Object.freeze({light: 20, heavy: 200});
export const SWING_RAD = 20 * Math.PI / 180;
export const PULL_S = .6; // Space eases the weight out to the start mark before letting go.
export const HOOK_X = Object.freeze({5: 230, 15: 430, 25: 630});
export const REFERENCE_X = 850;
// The free test asks for this many different settings before Continue opens. ↑ and ↓ move the pull-back 5 degrees a press.
export const FREE_TRIES = 3;
export const PULL_STEP = 5, MIN_PULL = 5, MAX_PULL = 30, START_PULL = 20;
const T = stringPeriod;
const s1 = seconds => `${seconds.toFixed(1)} s`;
const nb = value => value.replace(' ', '\u00a0'); // A number and its unit stay on one line of a recap card.
const RAD = Math.PI / 180, MIN_DRAG_RAD = 4 * RAD, MAX_DRAG_RAD = 32 * RAD;

// The sums as the panel shows them, computed from exactly the numbers on the screen, so that a calculator agrees.
export const PI_SHOWN = 3.14, G_SHOWN = GRAVITY, DEG_SHOWN = 57.3;
export const sumSeconds = lengthM => Number((2 * PI_SHOWN * Math.sqrt(lengthM / G_SHOWN)).toFixed(2));
export const tripMetres = (lengthM, deg) => Number((4 * lengthM * (deg / DEG_SHOWN)).toFixed(1));
const SWING_FORMULA = 'T = 2 × π × √(L ÷ g)';
const SWING_NOTE = 'T is the swing time in seconds and L is the string length in metres. π is about 3.14, √ means the square root, and g is 9.81 m/s².';
const swingWorked = lengthM => `2 × ${PI_SHOWN} × √(${lengthM} ÷ ${G_SHOWN}) = ${sumSeconds(lengthM).toFixed(2)} s`;
const swingEntry = (lengthM, title = 'Swing time', note = SWING_NOTE) => ({title, formula: SWING_FORMULA, worked: swingWorked(lengthM), note});
const pullWorked = kg => `(${kg} × ${G_SHOWN}) ÷ ${kg} = ${G_SHOWN.toFixed(2)} m/s²`;
const pullOf = kg => (kg * G_SHOWN).toFixed(1);
const pullEntry = (kg, title = 'Why the weight makes no difference', note = `The pull of gravity on ${kg} kg is ${kg} × ${G_SHOWN} = ${pullOf(kg)} newtons, and a newton is the unit of force. Dividing by the weight gives how quickly the weight speeds up, and the answer is the same for every weight.`) =>
  ({title, formula: 'speeding up = (weight × g) ÷ weight', worked: pullWorked(kg), note});
function freeEntries(lengthM, kg, deg) {
  const trip = tripMetres(lengthM, deg), sum = sumSeconds(lengthM);
  return [swingEntry(lengthM, 'Swing time', 'String length is the only setting in this sum.'), pullEntry(kg, 'Why the weight makes no difference', `The weight appears twice, so it cancels out and the answer stays at ${G_SHOWN.toFixed(2)} m/s².`),
    {title: 'The trip of one swing', formula: `trip = 4 × L × (angle ÷ ${DEG_SHOWN})`, worked: `4 × ${lengthM} × (${deg} ÷ ${DEG_SHOWN}) = ${trip.toFixed(1)} m`,
      note: `One swing covers the pull-back distance four times. A curve of ${DEG_SHOWN} degrees on a circle is as long as the string.`},
    {title: 'The average speed on that trip', formula: 'average speed = trip ÷ T', worked: `${trip.toFixed(1)} ÷ ${sum.toFixed(2)} = ${(trip / sum).toFixed(2)} m/s`,
      note: 'Pull back twice as far and the trip and the speed both double, so T stays the same. In this game that holds for every pull-back. A real pendulum pulled back very far needs slightly longer.'}];
}

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why does the car keep swinging?'},
  {id: 'word-pendulum', part: 1, title: 'Pendulum', word: 'pendulum-pendulum'},
  {id: 'word-length', part: 1, title: 'String length and metres', word: 'pendulum-length'},
  {id: 'word-swing-time', part: 1, title: 'Swing time', word: 'pendulum-swing-time'},
  {id: 'watch-lengths', part: 2, title: 'Two lengths', voice: 'lab.brian.pendulum.intro'},
  {id: 'try-short', part: 3, title: 'The short string'},
  {id: 'try-heavy', part: 3, title: 'The heavy weight'},
  {id: 'try-formula', part: 3, title: 'The swing time formula'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'alone', part: 4, title: 'Brian’s crane'},
  {id: 'check-slowest', part: 5, title: 'Question 1 of 3'},
  {id: 'check-heavy', part: 5, title: 'Question 2 of 3'},
  {id: 'check-settle', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.pendulum.explain'},
].map(Object.freeze));

// The key ideas, shown on the recap's cards.
export const KEY_IDEAS = Object.freeze([
  {id: 'lengths', text: `A longer string makes a slower swing. One swing needs ${nb(s1(T(5)))} on 5 m, ${nb(s1(T(15)))} on 15 m and ${nb(s1(T(25)))} on 25 m.`},
  {id: 'weights', text: 'The weight does not change the swing time, because a heavier weight is pulled harder and is also harder to get moving.'},
  {id: 'settle', text: 'In the helicopter, carry the car to the orange light. Hover still inside the ring until the car stops swinging, then set the car down.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Length sets the swing time.', text: 'Carry the car to the orange light. Hover still inside the ring until the car stops swinging, then set it down.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'pendulum-pendulum', word: 'Pendulum', meaning: 'A weight that hangs on a string and can swing freely from side to side.'},
  {id: 'pendulum-swing-time', word: 'Swing time', meaning: 'The time a pendulum needs for one full swing, out to the far side and back to where it started, measured in seconds.'},
  {id: 'pendulum-length', word: 'String length', meaning: 'The distance from the hook to the middle of the weight, measured in metres. A metre is about one long stride of a grown-up.'},
].map(Object.freeze));

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
const SETUP_KEYS_NO_RELEASE = Object.freeze(Object.fromEntries(Object.entries(SETUP_KEYS).filter(([key]) => key !== 'Space')));
const FREE_KEYS = Object.freeze({...SETUP_KEYS, '↑': 'pull:up', '↓': 'pull:down'});
const PICK_KEYS = prefix => ({1: `${prefix}:0`, 2: `${prefix}:1`, 3: `${prefix}:2`});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const PICK_CARD = 'Pick a card by clicking it, or press 1, 2 or 3.';
const GUESSES = Object.freeze([
  {id: 'quicker', label: 'Sooner than the grey weight', caption: 'sooner', picture: {kind: 'compare', mine: 'quicker'}},
  {id: 'slower', label: 'Later than the grey weight', caption: 'later', picture: {kind: 'compare', mine: 'slower'}},
  {id: 'same', label: 'At the same moment', caption: 'at the same moment', picture: {kind: 'compare', mine: 'same'}},
]);
export const GUESS_CAPTIONS = Object.freeze(Object.fromEntries(GUESSES.map(g => [g.id, g.caption])));

// The control that a target names, in the words of a prompt and of Brian's pointer. Every one of them is true from any setting,
// because the guided tries work out their target from what is hanging now.
const WHERE = {'hook:5': ['Click the 5 m hook on the left, or press 1.', 'press the 5 m hook'], 'hook:15': ['Click the 15 m hook in the middle, or press 2.', 'press the 15 m hook'],
  'hook:25': ['Click the 25 m hook on the right, or press 3.', 'press the 25 m hook'], 'weight:light': ['Click the 20 kg weight on the shelf, or press 4.', 'press the 20 kg weight'],
  'weight:heavy': ['Click the 200 kg weight on the shelf, or press 5.', 'press the 200 kg weight']};

// ---- the guided tries ----
const TRIES = {
  'try-short': {
    lengthM: 5, weightKg: WEIGHTS.light,
    setupSay: 'Now it is your turn. The grey weight on the right stays on its 15 m string with its 20 kg weight, so that you can compare your weight with it. Hang your weight on the short 5 m hook, and keep the 20 kg weight so that only the string changes.',
    weightFirst: true,
    still: p => p.weightKg !== WEIGHTS.light ? `The weight is now ${p.weightKg} kg, but this test changes only the string, so the weight must stay at 20 kg. Press 4 to put the 20 kg weight back.`
      : `The string is now ${p.lengthM} m, but this test needs the short 5 m string. Press 1 for the 5 m hook.`,
    question: 'Your weight hangs on the 5 m string and the grey weight hangs on the 15 m string. Both weights are 20 kg and both start together. Will your weight finish one full swing sooner than the grey weight, later than the grey weight, or at the same moment?',
    guessHints: ['Think about how far each weight has to travel in one swing.', 'A shorter string makes the weight follow a smaller circle, so the trip is shorter.', 'Any guess lets you go on. Pick a card, and then we will test it.'],
    why: `A shorter string makes the weight follow a smaller circle, so the weight has a shorter trip, and the labels under the weights show the two trips.${MORE}Gravity pulls along the path just as hard at the same angle, so the shorter trip needs less time.`,
    right: () => `Correct. Your weight finished in ${s1(T(5))} and the grey weight finished in ${s1(T(15))}. `,
    wrong: () => `Your weight finished first, in ${s1(T(5))}, and the grey weight needed ${s1(T(15))}. `,
  },
  'try-heavy': {
    lengthM: 15, weightKg: WEIGHTS.heavy,
    setupSay: 'Now we will change only the weight. Your string stays at 15 m, the same as the grey string. Swap your 20 kg weight for the heavy 200 kg weight, which is ten times as heavy.',
    weightFirst: false,
    still: p => p.lengthM !== 15 ? `The string is now ${p.lengthM} m, but this test changes only the weight, so the string must stay at 15 m. Press 2 to go back to the 15 m hook.`
      : 'The weight is still 20 kg, and this test needs the 200 kg weight. Press 5 for the 200 kg weight.',
    question: 'Both strings are 15 m long. Your weight is 200 kg and the grey weight is 20 kg, and both start together. Will your weight finish one full swing sooner than the grey weight, later than the grey weight, or at the same moment?',
    guessHints: ['Only the weight has changed, because the two strings have the same length.', 'A heavier weight is pulled harder, but what else is different about moving something heavy?', 'Any guess lets you go on. Pick a card, and then we will test it.'],
    why: 'Gravity pulls the 200 kg weight ten times as hard, but the 200 kg weight is also ten times as hard to get moving. Those two effects cancel out, so both weights speed up at the same rate and stay side by side. The sums beside the picture show this.',
    right: () => `Correct. Both weights needed ${s1(T(15))}. `,
    wrong: () => `Both weights needed ${s1(T(15))}, so they finished at the same moment. `,
  },
};
const goalMet = (guided, p) => p.lengthM === guided.lengthM && p.weightKg === guided.weightKg;
// What to press next: the guided try puts the wrong part right, whatever the player has pressed so far.
function guidedTarget(guided, p) {
  const hook = p.lengthM !== guided.lengthM ? `hook:${guided.lengthM}` : null, weight = p.weightKg !== guided.weightKg ? `weight:${guided.weightKg === WEIGHTS.heavy ? 'heavy' : 'light'}` : null;
  return guided.weightFirst ? weight ?? hook : hook ?? weight;
}
const RELEASE_HINTS = Object.freeze(['Your weight is the ball on the string that you chose.', 'Press Space, or drag your weight sideways and let go.', 'Watch my pointer. I will let your weight go.']);

// ---- the checks ----
const CHECKS = {
  'check-slowest': {
    question: 'Which of these three pendulums needs the most time for one full swing?',
    answers: [
      {label: '5 m string, 20 kg weight', picture: {kind: 'setup', lengthM: 5, weightKg: 20}},
      {label: '25 m string, 20 kg weight', picture: {kind: 'setup', lengthM: 25, weightKg: 20}},
      {label: '5 m string, 200 kg weight', picture: {kind: 'setup', lengthM: 5, weightKg: 200}},
    ], correct: 1,
    board: () => [pendulum('a', 300, 5, 20), pendulum('b', 500, 25, 20), pendulum('c', 700, 5, 200)],
    right: () => `Correct. The 25 m string needs ${s1(T(25))}, the most of the three, because the longest string makes the slowest swing, whatever the weight.`,
    wrong: picked => `${picked === 2 ? `The 200 kg weight does not slow the swing, so the 5 m string still needs only ${s1(T(5))}.` : `The 5 m string needs only ${s1(T(5))}.`} The 25 m string needs ${s1(T(25))}, the most of the three, because the length changes the swing time and the weight does not.`,
    hints: ['Which string is the longest?', 'The string length changes the swing time, so the longest string makes the slowest swing.', 'Pick the card for the 25 m string.'],
    formulas: () => [{title: 'Swing time', formula: SWING_FORMULA, note: SWING_NOTE}],
    answered: () => [swingEntry(5, 'The 5 m string'), swingEntry(25, 'The 25 m string', 'The weight is not in this sum, so the 200 kg weight on 5 m needs the same time as the 20 kg weight on 5 m.')],
  },
  'check-heavy': {
    question: `A 20 kg weight on a 15 m string needs ${s1(T(15))} for one full swing. How long will a 200 kg weight on a 15 m string need?`,
    answers: [5, 15, 25].map(length => ({label: s1(T(length)), picture: {kind: 'watch', seconds: T(length)}})), correct: 1,
    board: () => [pendulum('light', 380, 15, 20), pendulum('heavy', 620, 15, 200)],
    right: () => `Correct. The 200 kg weight also needs ${s1(T(15))}, because the two strings have the same length.`,
    wrong: () => `The 200 kg weight needs ${s1(T(15))}, the same as the 20 kg weight. The weight is pulled ten times as hard and is ten times as hard to get moving, so only the length changes the swing time.`,
    hints: ['When your 200 kg weight and the grey 20 kg weight hung on 15 m strings, did they finish together?', 'The weight does not change the swing time.', `Pick the card for ${s1(T(15))}.`],
    formulas: () => [],
    answered: () => [swingEntry(15), pullEntry(20, 'The 20 kg weight'), pullEntry(200, 'The 200 kg weight')],
  },
  'check-settle': {
    question: 'The car is swinging on its cable under the helicopter. To hover means to stay in one place in the air. What should you do before you set the car down?',
    answers: [
      {label: 'Hover still and wait for the car to stop swinging', picture: {kind: 'heli', move: 'hover'}},
      {label: 'Fly forward quickly', picture: {kind: 'heli', move: 'forward'}},
      {label: 'Release the car straight away', picture: {kind: 'heli', move: 'drop'}},
    ], correct: 0,
    board: () => [],
    right: () => `Correct. While the helicopter hovers still, nothing gives the car a new push, and the friction of the air and of the hook slowly use up the swing.${MORE}On the 15 m cable one swing needs about ${s1(T(15))}, and a swing of 3 m to one side falls below 1 m in about 16 seconds, which is about two full swings.`,
    wrong: picked => `${picked === 1 ? 'Flying forward pulls the top of the cable sideways, which gives the car a new push and makes the swing bigger.' : 'A car released while it is swinging is still moving sideways, so it does not land where you want it, and the challenge does not count it.'} Hover still instead, because then nothing gives the car a new push, and the friction of the air and of the hook slowly use up the swing.${MORE}On the 15 m cable a swing of 3 m to one side falls below 1 m in about 16 seconds.`,
    hints: ['Each time the helicopter moves, it pulls the top of the cable and pushes the car.', 'A swing gets smaller only when nothing keeps pushing it.', 'Pick the first card.'],
    formulas: () => [],
    answered: () => [swingEntry(15, 'The car on the 15 m cable', 'The car hangs on the helicopter’s 15 m cable, so the car swings like a weight on a 15 m string. The weight of the car makes no difference.')],
  },
};

// Show me on the free test tries these in turn, skipping any the player has already tested.
const FREE_SETTINGS = Object.freeze([[5, 20, 20], [25, 20, 20], [15, 200, 20], [15, 20, 30], [25, 200, 10], [5, 200, 30]]);
const settingKey = (lengthM, kg, deg) => `${lengthM}/${kg}/${deg}`;
const freeLine = (lengthM, kg, deg) => `a ${lengthM} m string, a ${kg} kg weight and a pull-back of ${deg} degrees`;

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];
  const all = () => [m.player, m.reference, ...(m.board ?? [])].filter(Boolean);

  function enter(index) {
    m = {index, time: 0, phase: 'setup', guess: null, result: null, chosen: null, goodTaps: 0, lastSwings: {}, lastTry: null, answered: null, board: null, player: null, reference: null,
      changedHook: false, changedWeight: false, pull: START_PULL, rows: [], tested: new Set(), auto: null, say: ''};
    const id = STEPS[index].id;
    if (id === 'word-pendulum') m.board = [pendulum('bob', 500, 15, 20)];
    if (id === 'word-swing-time') { m.board = [pendulum('bob', 500, 15, 20)]; letGo(m.board[0], 0); }
    if (id === 'word-length') m.board = LENGTHS.map((length, i) => pendulum(`l${length}`, 300 + i * 200, length, 20));
    if (id === 'watch-lengths') { m.board = [15, 25].map((length, i) => pendulum(`l${length}`, 340 + i * 280, length, 20)); m.board.forEach(p => letGo(p, .4)); }
    if (TRIES[id] || id === 'alone' || id === 'try-formula' || id === 'try-free') {
      m.player = pendulum('you', HOOK_X[15], 15, 20);
      if (TRIES[id]) m.reference = pendulum('reference', REFERENCE_X, 15, 20, {ghost: true});
    }
    if (id === 'try-free') holdPull();
    if (CHECKS[id]) { m.phase = 'ask'; m.board = CHECKS[id].board(); }
  }
  // On the free test the weight waits at the pull-back that the sums show.
  function holdPull() { m.player.held = (m.player.held < 0 ? -1 : 1) * m.pull * RAD; }

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
      if (kind === 'release' && bob.pullAt === null) {
        letGo(bob, m.time); bob.held = 0; seen.add(id);
        return {kind: 'right', say: 'The weight is now swinging on its string, so you have made a pendulum work. Gravity pulls the weight down towards the lowest point. The weight is moving fast when it gets there, so it carries on up the other side until gravity slows it and pulls it back. That is why a pendulum keeps swinging, and it is also why the car keeps swinging after the helicopter stops.'};
      }
      return null;
    }
    if (id === 'word-swing-time' && kind === 'tap') return tap();
    if (id === 'word-length' && kind === 'measure') {
      const length = Number(value);
      if (!LENGTHS.includes(length) || m.chosen === 25) return null;
      m.chosen = length;
      if (length === 25) { seen.add(id); return {kind: 'right', say: 'Correct. The string on the right is the longest, at 25 m. The tape measures from the hook to the middle of the weight, and that distance is the string length. The little person beside the strings shows the size of a metre.'}; }
      return {kind: 'fail', say: `That string is ${length} m long. Look for the weight that hangs lowest, because the lowest weight has the longest string.`};
    }
    if (id === 'try-formula') return formulaAct(kind, value);
    if (id === 'try-free') return freeAct(kind, value);
    if (TRIES[id] || id === 'alone') return tryAct(id, kind, value);
    if (CHECKS[id] && kind === 'answer' && m.phase === 'ask') {
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      for (const p of m.board) letGo(p, m.time);
      m.settleFrom = m.time;
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    return null;
  }

  function tap() {
    if (m.goodTaps) return null;
    const bob = m.board[0], elapsed = swingElapsed(bob, m.time);
    if (elapsed === null) return null;
    const period = T(bob.lengthM), phase = (elapsed % period) / period;
    if (phase > .88 || phase < .12 && elapsed > period / 2) {
      m.goodTaps++; seen.add('word-swing-time');
      return {kind: 'right', say: `Correct. The weight swung out to the far side and came back to the green flag, and that is one full swing. On this 15 m string one swing needs ${s1(period)}, so the swing time is ${s1(period)}.`};
    }
    if (phase >= .3 && phase <= .7) return {kind: 'fail', say: 'The weight is near the far side, so it is only halfway through the swing. One swing ends when the weight is back at the green flag.'};
    if (elapsed < period * .5) return {kind: 'fail', say: 'The weight has only just set off. Wait for the weight to swing out to the far side and come all the way back.'};
    if (phase > .7) return {kind: 'fail', say: 'That was nearly right, but the weight had not reached the green flag yet. Wait until the weight gets there.'};
    return {kind: 'fail', say: 'That was a little late, because the weight had already left the green flag. Press Space just as the weight gets back to the flag.'};
  }

  function setHook(p, value) {
    const length = Number(value);
    if (!LENGTHS.includes(length)) return false;
    p.lengthM = length; p.x = HOOK_X[length];
    return true;
  }
  function setWeight(p, value) {
    if (!Object.hasOwn(WEIGHTS, value)) return false;
    p.weightKg = WEIGHTS[value];
    return true;
  }

  function tryAct(id, kind, value) {
    const p = m.player, guided = TRIES[id];
    if (m.phase === 'setup' && (kind === 'hook' || kind === 'weight')) {
      // A press that changes nothing is not a mistake.
      if (kind === 'hook' ? Number(value) === p.lengthM : WEIGHTS[value] === p.weightKg) return null;
      if (!(kind === 'hook' ? setHook(p, value) : setWeight(p, value))) return null;
      stop(p);
      if (!guided) return {kind: 'sound', sound: 'lab.clunk'};
      if (goalMet(guided, p)) { m.phase = 'guess'; return {kind: 'progress', sound: 'lab.clunk', say: guided.question}; }
      // A press that puts part of the set-up right is a step forward, and Brian says what is still to do.
      const fixed = kind === 'hook' ? p.lengthM === guided.lengthM : p.weightKg === guided.weightKg;
      return {kind: fixed ? 'progress' : 'fail', sound: 'lab.clunk', say: guided.still(p)};
    }
    if (m.phase === 'guess' && kind === 'guess') {
      const pick = GUESSES[Number(value)];
      if (!pick) return null;
      m.guess = pick.id; m.phase = 'release';
      return {kind: 'progress', say: 'Now let your weight go, and the grey weight will start at the same moment.'};
    }
    const canLetGo = guided ? m.phase === 'release' : m.phase === 'setup';
    if (canLetGo && kind === 'hold') { p.held = clamp(Number(value)); return null; }
    if (canLetGo && kind === 'release') {
      letGo(p, m.time);
      if (m.reference) { m.reference.held = p.held; letGo(m.reference, m.time); m.reference.held = 0; }
      p.held = 0; m.phase = 'running';
      // On their own, a test run is not a step forward: Brian's help stays where it was.
      return {kind: guided ? 'progress' : 'run', say: guided ? 'Watch the two stopwatches. Each one stops after one full swing.' : 'Watch the stopwatch. It stops after one full swing.'};
    }
    return null;
  }

  // The formula step: the hooks and the weights move the sums, and nothing swings.
  function formulaAct(kind, value) {
    const p = m.player;
    if (kind !== 'hook' && kind !== 'weight') return null;
    if (kind === 'hook' ? Number(value) === p.lengthM : WEIGHTS[value] === p.weightKg) return null;
    if (!(kind === 'hook' ? setHook(p, value) : setWeight(p, value))) return null;
    if (kind === 'hook') m.changedHook = true; else m.changedWeight = true;
    if (m.changedHook && m.changedWeight && !seen.has('try-formula')) {
      seen.add('try-formula');
      return {kind: 'right', sound: 'lab.clunk', say: 'You have now seen both changes. A different hook puts a different L into the sum, so the swing time T changes. A different weight changes both numbers in the lower sum, but the answer stays at 9.81 m/s², so the weight speeds up at the same rate and T does not change. That is why length changes the swing time and weight does not. You can keep pressing the hooks and the weights to watch the sums change.'};
    }
    return {kind: 'sound', sound: 'lab.clunk'};
  }

  // The free test: any hook, any weight and any pull-back. Only different settings count.
  function freeAct(kind, value) {
    const p = m.player;
    if (kind === 'set' && value === 'best') {
      if (m.auto || m.phase !== 'setup') return null;
      const fresh = FREE_SETTINGS.find(([l, kg, deg]) => !m.tested.has(settingKey(l, kg, deg))) ?? [p.lengthM, p.weightKg, m.pull];
      m.auto = {lengthM: fresh[0], weightKg: fresh[1], pull: fresh[2], wait: .7};
      return {kind: 'progress', say: autoSay()};
    }
    if (m.phase !== 'setup' || m.auto) return null;
    if (kind === 'hook') { if (Number(value) === p.lengthM || !setHook(p, value)) return null; return {kind: 'sound', sound: 'lab.clunk'}; }
    if (kind === 'weight') { if (WEIGHTS[value] === p.weightKg || !setWeight(p, value)) return null; return {kind: 'sound', sound: 'lab.clunk'}; }
    if (kind === 'pull') {
      const next = Math.max(MIN_PULL, Math.min(MAX_PULL, m.pull + (value === 'up' ? PULL_STEP : -PULL_STEP)));
      if (next === m.pull) return {kind: 'note', say: value === 'up' ? `${MAX_PULL} degrees is as far as these keys pull the weight back.` : `${MIN_PULL} degrees is as small as these keys make the pull-back.`};
      m.pull = next; holdPull();
      return {kind: 'sound', sound: 'lab.tick'};
    }
    if (kind === 'hold') {
      const angle = clamp(Number(value)), deg = Math.max(4, Math.round(Math.abs(angle) / RAD));
      m.pull = deg; p.held = (angle < 0 ? -1 : 1) * deg * RAD;
      return null;
    }
    if (kind === 'release') {
      letGo(p, m.time); m.phase = 'running';
      m.say = `You have set ${freeLine(p.lengthM, p.weightKg, m.pull)}. Watch the stopwatch, which stops after one full swing.`;
      return {kind: 'progress', say: m.say};
    }
    return null;
  }
  function autoSay() {
    const a = m.auto;
    return `I will set ${freeLine(a.lengthM, a.weightKg, a.pull)}, and then I will let the weight go.`;
  }
  function freeResult() {
    const p = m.player, deg = m.pull, key = settingKey(p.lengthM, p.weightKg, deg), repeat = m.tested.has(key), previous = m.rows.at(-1);
    m.tested.add(key);
    if (m.tested.size >= FREE_TRIES) seen.add('try-free');
    const row = {lengthM: p.lengthM, weightKg: p.weightKg, deg, seconds: T(p.lengthM)};
    m.rows = [...m.rows, row];
    stop(p); holdPull(); m.phase = 'setup';
    let compared = '';
    if (repeat) compared = ' You have already tested this exact setting, so it does not count as a new one.';
    else if (previous) {
      const changed = [previous.weightKg !== row.weightKg ? 'the weight' : null, previous.deg !== row.deg ? 'the pull-back' : null].filter(Boolean).join(' and ');
      compared = previous.lengthM !== row.lengthM ? ` Compared with your last test, the string length changed, so the swing time changed from ${s1(previous.seconds)} to ${s1(row.seconds)}.`
        : ` Compared with your last test, the string length stayed the same, so the swing time stayed at ${s1(row.seconds)}, even though you changed ${changed}.`;
    }
    const close = m.tested.size >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change a setting and test a different one.';
    m.say = `With ${freeLine(row.lengthM, row.weightKg, deg)}, one swing needed ${s1(row.seconds)}, which is the sum’s ${sumSeconds(row.lengthM).toFixed(2)} s to one decimal place.${compared} ${close}`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const sound = swingEvents(), id = step().id;
    if (m.auto) {
      m.auto.wait -= dt;
      if (m.auto.wait <= 0) {
        const a = m.auto, p = m.player;
        setHook(p, a.lengthM); p.weightKg = a.weightKg; m.pull = a.pull; m.auto = null; holdPull();
        return freeAct('release');
      }
      return sound;
    }
    if (m.phase === 'running') {
      const swingers = [m.player, m.reference].filter(Boolean);
      if (swingers.every(p => swingElapsed(p, m.time) >= T(p.lengthM) + .3)) return id === 'try-free' ? freeResult() : finishRun(id);
    }
    if (id === 'watch-lengths' && m.board.every(p => swingElapsed(p, m.time) >= T(p.lengthM))) seen.add(id);
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
      return m.result.right ? {kind: 'right', say: triedSay(id)} : {kind: 'wrong', say: triedSay(id)};
    }
    m.lastTry = {lengthM: p.lengthM, weightKg: p.weightKg, periodS: period};
    if (Math.abs(period - T(25)) < .05) { m.phase = 'result'; seen.add(id); return {kind: 'pass', say: craneSay(p)}; }
    stop(p); m.phase = 'setup';
    const heavyAndStill = p.weightKg === WEIGHTS.heavy;
    return {kind: 'fail', say: `One swing needed ${s1(period)}, which is too quick for my crane, because the crane needs about 10 seconds. ${heavyAndStill ? 'The heavy weight did not slow the swing. ' : ''}A longer string makes a slower swing, so choose a longer hook and press Space again.`};
  }
  const craneSay = p => `Correct. One swing on the 25 m string needed ${s1(T(p.lengthM))}, which is what my crane needs. The weight of ${p.weightKg} kg made no difference, because only the string length is in the sum.`;
  function triedSay(id) {
    const guided = TRIES[id];
    return `${m.result.right ? guided.right() : guided.wrong()}${guided.why}`;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder') { m.time = 0; return null; }
    if (id === 'watch-lengths' || id === 'word-swing-time') { m.board.forEach(p => letGo(p, m.time)); m.lastSwings = {}; return null; }
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
    const s = step(), id = s.id, base = {scene: 'board', time: m.time, pendulums: all().map(p => drawn(p, m.time)), formulas: [], keys: {}, cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id)};
    if (id === 'wonder') {
      const ready = seen.has(id);
      return {...base, scene: 'wonder', actions: ['replay'],
        say: 'When the helicopter stopped, the car kept swinging on its cable under the helicopter. Why does the car keep swinging, and how long does one swing need? This lesson will answer both questions.',
        prompt: ready ? 'Press Enter to continue, or press R to watch again.' : 'Watch the car under the helicopter.',
        hints: ['Watch where the car goes when the helicopter stops.', 'The car is still moving when the helicopter stops, so the car swings past the point under the helicopter.', ready ? 'Press Enter to continue.' : 'The Continue button opens after a few seconds of watching.']};
    }
    if (id === 'word-pendulum') {
      const swinging = m.board[0].pullAt !== null;
      return {...base, labels: true, keys: {Space: 'release'}, waiting: !swinging, target: swinging ? null : 'release', glow: swinging ? null : 'release',
        say: `A pendulum is a weight that hangs on a string and can swing freely from side to side. The string hangs from a hook on a steel beam. The number on the weight is how heavy the weight is in kilograms, written kg.${MORE}A litre of water weighs one kilogram, so this weight is as heavy as 20 litres of water.`,
        prompt: swinging ? 'Press Enter to continue.' : 'Drag the weight sideways and let go, or press Space.',
        hints: swinging ? DONE : ['Find the ball at the bottom of the string, which is the weight.', 'Press Space, or drag the weight sideways and let go.', 'Watch my pointer. I will let the weight go.']};
    }
    if (id === 'word-swing-time') {
      const bob = m.board[0], elapsed = swingElapsed(bob, m.time) ?? 0, period = T(bob.lengthM), phase = (elapsed % period) / period, done = m.goodTaps > 0;
      return {...base, startMark: true, outAndBack: true, keys: done ? {} : {Space: 'tap'}, actions: done ? ['replay'] : ['tap'], waiting: !done, target: done ? null : 'tap', pointOnly: true,
        tapFlash: !done && (assist || help >= 2) && elapsed > period / 2 && (phase > .9 || phase < .04),
        lap: {elapsed: elapsed % period, last: elapsed >= period ? period : null},
        say: 'One full swing is the journey out to the far side and back to where the weight started. Swing time is how long that journey lasts, measured in seconds, written s. The weight starts at the green flag, and the stopwatch times the journey.',
        prompt: done ? 'Press Enter to continue.' : 'Wait for the weight to swing out and come back, then press Space, or click Tap, as the weight reaches the green flag.',
        hints: done ? DONE : ['Watch the weight leave the green flag, swing out to the far side, and come back.', `Press Space just as the weight gets back to the green flag, which happens every ${s1(period)}.`, 'Watch the ring on the green flag, and press Space when the ring flashes.']};
    }
    if (id === 'word-length') return {...base, keys: {1: 'measure:5', 2: 'measure:15', 3: 'measure:25'}, waiting: m.chosen !== 25, target: m.chosen === 25 ? null : 'measure:25',
      tapes: m.chosen === 25 ? LENGTHS : m.chosen ? [m.chosen] : [], numbered: true, scale: true,
      say: `We measure length in metres, written m. String length is the distance from the hook to the middle of the weight, so a 25 m string is 25 metres long. These three strings have different lengths.${MORE}A metre is about one long stride of a grown-up, and a door is about two metres tall.`,
      prompt: m.chosen === 25 ? 'Press Enter to continue.' : 'Click the longest string, or press its number, which is 1, 2 or 3.',
      hints: m.chosen === 25 ? DONE : ['Which weight hangs lowest?', 'The string on the right is the longest. Click it, or press 3.', 'Watch my pointer. I will click the longest string.']};
    if (id === 'watch-lengths') {
      const finished = m.board.every(p => swingElapsed(p, m.time) >= T(p.lengthM));
      return {...base, actions: ['replay', 'slow'], stopwatches: true,
        table: m.board.map(p => ({label: `${p.lengthM} m string`, value: swingElapsed(p, m.time) >= T(p.lengthM) ? s1(T(p.lengthM)) : null})),
        say: finished ? `The weight on the 15 m string needed ${s1(T(15))} for one full swing, and the weight on the 25 m string needed ${s1(T(25))}. Both strings carried the same 20 kg weight, so only the length was different.`
          : 'Here are two strings of different lengths, 15 metres and 25 metres, with the same 20 kilogram weight on each. Both weights start together, and a stopwatch above each string times one full swing.',
        prompt: finished || seen.has(id) ? 'Press Enter to continue, or press R to watch again.' : 'Watch each stopwatch stop when its weight is back.',
        hints: ['Watch the stopwatches above the two strings.', 'Each stopwatch stops after one full swing.', 'Press R to watch again.']};
    }
    if (id === 'try-formula') return formulaView(base);
    if (id === 'try-free') return freeView(base);
    if (TRIES[id] || id === 'alone') return tryView(id, base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id === 'check-settle' ? 'settle' : 'board', settle: answered ? {since: m.time - m.settleFrom, right: m.answered === check.correct} : null, stopwatches: answered,
        formulas: answered ? check.answered() : check.formulas(),
        keys: answered ? {} : PICK_KEYS('answer'), actions: answered ? ['replay'] : [], waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : PICK_CARD, hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, formulas: [swingEntry(15, 'The car on the 15 m cable', 'The car hangs on the helicopter’s 15 m cable, so the car swings like a weight on a 15 m string.')],
      say: `A longer string makes a slower swing, because the weight has further to travel. The weight makes no difference, because a heavier weight is pulled harder but is also harder to get moving. How far you pull the weight back makes no difference either, because a wider swing travels further but also faster.${MORE}In the helicopter, the car on its 15 metre cable is a pendulum too. Carry the car to the orange light, and hover still inside the ring until the car stops swinging. Then set the car down.`,
      prompt: 'Press Enter to fly the helicopter. Press H to hook the car, carry the car to the orange light, lower the car until it touches the ground inside the ring, and press H again to let go.',
      hints: KEY_IDEAS.map(i => i.text)};
  }

  function formulaView(base) {
    const p = m.player, done = seen.has('try-formula');
    const target = !m.changedHook ? `hook:${p.lengthM === 25 ? 5 : 25}` : !m.changedWeight ? `weight:${p.weightKg === WEIGHTS.heavy ? 'light' : 'heavy'}` : null;
    return {...base, hooks: true, shelf: true, chosen: {lengthM: p.lengthM, weightKg: p.weightKg}, keys: SETUP_KEYS_NO_RELEASE, waiting: !done, target, glow: target,
      formulas: [swingEntry(p.lengthM), pullEntry(p.weightKg)],
      say: `Here is the rule for the swing time, and it needs a few symbols. π is a Greek letter, said “pie”, and it stands for one number, about ${PI_SHOWN}.${MORE}The distance around any circle is about ${PI_SHOWN} times the distance across it, and π appears here because the weight follows part of a circle. √ means the square root, which is the number that gives you the starting number when you multiply it by itself, so √9 is 3, because 3 × 3 = 9. Speed can be measured in metres per second, written m/s, which is the number of metres travelled during each second. g is the acceleration caused by gravity, ${G_SHOWN} m/s², read as “metres per second, per second”, because gravity adds ${G_SHOWN} m/s to the speed of a falling object during every second. T is the swing time and L is the string length. The rule is T = 2 × π × √(L ÷ g), which is the sum beside the picture. The square root is there because a weight on a longer string has further to go but also moves faster, so five times the length gives only about 2.2 times the time, as 10.03 ÷ 4.48 shows.`,
      prompt: done ? 'Press Enter to continue, or keep pressing the hooks and the weights.' : `The string is ${p.lengthM} m and the weight is ${p.weightKg} kg. Press 1, 2 or 3 to change the hook, and press 4 or 5 to change the weight, and watch the sums change.`,
      hints: done ? DONE : [`Look at the sums beside the picture, which use the ${p.lengthM} m string and the ${p.weightKg} kg weight.`, target ? WHERE[target][0] : 'Press Enter to continue.', target ? `Watch my pointer. I will ${WHERE[target][1]}.` : 'Press Enter to continue.']};
  }

  function freeView(base) {
    const p = m.player, setting = m.phase === 'setup' && !m.auto, done = seen.has('try-free');
    const v = {...base, hooks: true, shelf: true, chosen: {lengthM: p.lengthM, weightKg: p.weightKg}, stopwatches: true, trips: true, pull: {deg: m.pull},
      formulas: m.auto ? freeEntries(m.auto.lengthM, m.auto.weightKg, m.auto.pull) : freeEntries(p.lengthM, p.weightKg, m.pull),
      freeRows: m.rows.map(r => ({label: `${r.lengthM} m, ${r.weightKg} kg, ${r.deg}°`, value: s1(r.seconds)}))};
    if (!setting) return {...v, say: m.auto ? autoSay() : m.say, prompt: m.auto ? 'Watch Brian change the settings.' : 'The stopwatch stops after one full swing.',
      hints: ['Watch the stopwatch.', 'The stopwatch stops after one full swing.', 'Wait for the stopwatch to stop.']};
    return {...v, keys: FREE_KEYS, waiting: !done, target: 'set:best', glow: 'release',
      say: m.say || `Now you can experiment with all three settings. Press 1, 2 or 3 to choose the string length, press 4 or 5 to choose the weight, and press ↑ or ↓ to change how far the weight is pulled back.${MORE}The pull-back is measured in degrees. A degree is a small step of turning, a full turn is 360 degrees, and a string hanging straight down is at 0 degrees. Watch the sums change as you press, and predict the stopwatch before you press Space. Test at least ${FREE_TRIES} different settings, and the table keeps your results so that you can compare them.`,
      prompt: done ? 'Press Enter to continue, or test another setting.' : `The string is ${p.lengthM} m, the weight is ${p.weightKg} kg and the pull-back is ${m.pull} degrees. Change the settings, then press Space to let go. Different settings tested so far: ${m.tested.size} of ${FREE_TRIES}.`,
      hints: ['Press Space to test the settings as they are.', 'Try the same string with the other weight, and then try a different string.', 'Watch my pointer. I will choose a setting you have not tested yet, and let the weight go.']};
  }

  function tryView(id, base) {
    const guided = TRIES[id], p = m.player;
    const common = {...base, hooks: true, shelf: true, chosen: {lengthM: p.lengthM, weightKg: p.weightKg}, stopwatches: true, formulas: guided ? [] : [swingEntry(p.lengthM), pullEntry(p.weightKg)]};
    if (m.phase === 'setup') {
      const target = guided ? guidedTarget(guided, p) : p.lengthM !== 25 ? 'hook:25' : 'release';
      return {...common, keys: guided ? SETUP_KEYS_NO_RELEASE : SETUP_KEYS, waiting: true, target, glow: guided ? target : null, lastTry: m.lastTry,
        say: guided ? guided.setupSay : 'Here is a job for you. A crane lifts heavy loads on a long cable, and my crane needs a slow swing that lasts about 10 seconds. Choose a hook and a weight, use the sums beside the picture to predict the time, and then let the weight go to test it.',
        prompt: guided ? WHERE[target][0] : 'Press 1, 2 or 3 to choose a hook and 4 or 5 to choose a weight, then press Space to let go.',
        hints: guided ? ['Each hook shows its length on a plate, and the weights sit on the shelf on the left.', WHERE[target][0], `Watch my pointer. I will ${WHERE[target][1]}.`]
          : ['Which makes a swing slower, a longer string or a heavier weight?', 'Only the string length changes the swing time, and the longest string is on the 25 m hook.',
            p.lengthM !== 25 ? 'Watch my pointer. I will press the 25 m hook.' : 'Watch my pointer. I will let your weight go.']};
    }
    if (m.phase === 'guess') return {...common, keys: PICK_KEYS('guess'), waiting: true,
      cards: GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture, state: null})),
      say: guided.question, prompt: PICK_CARD, hints: guided.guessHints};
    if (m.phase === 'release') return {...common, keys: {Space: 'release'}, waiting: true, target: 'release', glow: 'release', guess: m.guess,
      say: 'Now let your weight go, and the grey weight will start at the same moment.', prompt: 'Drag your weight sideways and let go, or press Space.', hints: RELEASE_HINTS};
    if (m.phase === 'running') return {...common, guess: m.guess, say: guided ? 'Watch the two stopwatches. Each one stops after one full swing.' : 'Watch the stopwatch. It stops after one full swing.', prompt: guided ? 'Each stopwatch stops after one full swing.' : 'The stopwatch stops after one full swing.',
      hints: ['Watch the numbers beside the stopwatch.', 'A stopwatch stops after one full swing.', 'Wait for the swing to finish.']};
    const right = guided ? m.result.right : true;
    return {...common, actions: ['replay'], guess: m.guess, ready: true, trips: id === 'try-short', pulls: id === 'try-heavy',
      formulas: id === 'try-heavy' ? [pullEntry(20, 'The 20 kg grey weight', `The pull of gravity on 20 kg is 20 × ${G_SHOWN} = ${pullOf(20)} newtons, and a newton is the unit of force. g is the acceleration caused by gravity, ${G_SHOWN} m/s², read as “metres per second, per second”, because gravity adds ${G_SHOWN} metres per second to the speed of a falling object during every second.`),
        pullEntry(200, 'Your 200 kg weight', `The pull is 200 × ${G_SHOWN} = ${pullOf(200)} newtons, ten times as strong, but it has to move ten times the weight, so the answer is the same.`)] : common.formulas,
      cards: guided ? GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: g.id === m.result.actual ? 'right' : g.id === m.guess ? 'wrong' : null})) : [],
      say: guided ? triedSay(id) : craneSay(p),
      mood: right ? 'cheer' : 'explain', prompt: 'Press Enter to continue, or press R to watch again.', hints: [guided ? 'Press R to watch the two swings again.' : 'Press R to watch the swing again.', 'Press Enter to continue.', 'Press Enter to continue.']};
  }

  return {enter, act, tick, view, state: () => m};
}
const clamp = value => Number.isFinite(value) ? Math.max(-MAX_DRAG_RAD, Math.min(MAX_DRAG_RAD, value)) : 0;

export const lesson = Object.freeze({id: 'pendulum', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
