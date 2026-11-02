// Braking as a classroom lesson (docs/board/cards/LAB-CLASSROOM-BRAKING.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every stop is the braking bench's own run (brakingBench, the challenge's
// bench, which brakes the Falcone F42 as the game does), and question 3 is the Tune page's own Brake balance rule.
import {brakingBench, frontLoadShare} from '../benches/tunnel.js';
import {LAB_TUNE} from '../lab-tune.js';

// The speed dial and the brake lever move in the bench's own steps' multiples: 10 mph and 10% a press.
export const SPEED_STEP = 10, MIN_MPH = 20, MAX_MPH = 150, LEVER_STEP = 10, MIN_FRONT = 40, MAX_FRONT = 90;
export const STEADY_FRONT = 70;
// A car arrives at its speed for a moment before the brake line, brakes at real speed, then rests a moment.
export const RUNUP_S = .6;
const SETTLE_S = .7, HELD_GAP_S = .14;
const MPS = 0.44704;
export const stopOf = (speed, front = STEADY_FRONT) => brakingBench.run({speedMph: speed, frontShare: front});
export const metresFrom = speed => stopOf(speed).stopMetres;
export const m1 = metres => `${metres.toFixed(1)} m`;
export const pct = share => `${Math.round(share * 100)}%`;
export const FRONT_LOAD = frontLoadShare(), REAR_LOAD = 1 - FRONT_LOAD;
// Where a car is t seconds after it appears: arriving at a steady speed, then braking evenly to a stop.
export function laneAt(speed, front, t) {
  const r = stopOf(speed, front), T = r.stopSeconds, D = r.stopMetres;
  if (t < RUNUP_S) return {metres: -(RUNUP_S - t) * speed * MPS, mph: speed, braking: false, done: false, brakeShare: 0};
  const tb = Math.min(t - RUNUP_S, T), k = tb / T;
  return {metres: D * (1 - (1 - k) ** 2), mph: speed * (1 - k), braking: t - RUNUP_S < T, done: t - RUNUP_S >= T, brakeShare: k};
}
const runEnd = lanes => RUNUP_S + Math.max(...lanes.map(l => stopOf(l.speed, l.front).stopSeconds)) + SETTLE_S;

// Brian's job: three corners, each with a braking marker this far before it. The fastest steady stop in time: 60, 100, 120 mph.
export const CORNERS = Object.freeze([20, 50, 70]);
export const fastestFor = gap => {
  let best = null;
  for (let s = MIN_MPH; s <= MAX_MPH; s += SPEED_STEP) if (metresFrom(s) <= gap) best = s;
  return best;
};
// The wonder's line, 30 m on: the 50 mph car stops before it, the 100 mph car runs past.
export const LINE_M = 30;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why so much further?'},
  {id: 'word-stopping', part: 1, title: 'Stopping distance', word: 'braking-word-0'},
  {id: 'word-weight', part: 1, title: 'Weight shift', word: 'braking-word-1'},
  {id: 'word-balance', part: 1, title: 'Brake balance', word: 'braking-word-2'},
  {id: 'watch', part: 2, title: 'Fifty, a hundred, and a slide', voice: 'lab.brian.braking.intro'},
  {id: 'try-speed', part: 3, title: 'Twice the speed'},
  {id: 'try-slide', part: 3, title: 'A steady back'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-four', part: 5, title: 'Question 1 of 3'},
  {id: 'check-balance', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.braking.explain'},
].map(Object.freeze));

const S50 = metresFrom(50), S100 = metresFrom(100);
export const KEY_IDEAS = Object.freeze([
  {id: 'four', text: `Twice the speed needs four times the road: ${m1(S50)} from 50 mph, ${m1(S100)} from 100.`},
  {id: 'weight', text: `Braking tips the weight forward: the front tyres carry ${pct(FRONT_LOAD)}, so the front brakes do most of the work.`},
  {id: 'balance', text: `Give the back brakes more than the ${pct(REAR_LOAD)} the back tyres carry and the back slides. On the Tune page: Brake balance.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Twice the speed, four times the road.',
  text: 'Brake balance is on the Tune page in the garage: toward the rear brakes a little harder, toward the front keeps more grip to turn while braking.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'braking-word-0', word: 'Stopping distance', meaning: 'Stopping distance is the road a car uses while its brakes slow it to a stop.'},
  {id: 'braking-word-1', word: 'Weight shift', meaning: 'Weight shift is braking putting more of the car’s weight onto its front tyres.'},
  {id: 'braking-word-2', word: 'Brake balance', meaning: 'Brake balance is how much of the braking the front and back brakes do.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const DIAL_KEYS = Object.freeze({'↑': 'speed:up', '↓': 'speed:down'});
const LEVER_KEYS = Object.freeze({'→': 'lever:front', '←': 'lever:back'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const BRAKE = Object.freeze({action: 'go', label: 'Brake', key: 'Space'});
const leverButtons = () => [{action: 'lever:back', label: 'Toward the back', key: '←'}, {action: 'lever:front', label: 'Toward the front', key: '→'}];

// Too thin a guess: three pictures of where the 100 mph car stops.
const GUESSES = Object.freeze([{label: 'About 24 m: twice as far', metres: 2 * S50}, {label: 'About 47 m: four times as far', metres: 4 * S50}, {label: 'About 94 m: eight times as far', metres: 8 * S50}]);

// The Tune page's own line for two steps toward the rear (tune-view.js effectLine), from the same table.
const signed = share => `${share > 0 ? '+' : ''}${Math.round(share * 100)}%`;
export const REAR_TWO_LINE = `Braking ${signed(2 * LAB_TUNE.brakes.brakingPerStep)}; cornering grip while braking ${signed(2 * LAB_TUNE.brakes.cornerLeftPerStep)}.`;
const CHECKS = {
  'check-four': {
    question: 'Twice the speed. How much more road does the car need to stop?',
    answers: [{label: 'Twice as much', picture: {kind: 'stops', metres: [S50, 2 * S50]}}, {label: 'Four times as much', picture: {kind: 'stops', metres: [S50, S100]}}, {label: 'The same', picture: {kind: 'stops', metres: [S50, S50]}}],
    correct: 1,
    right: () => `Yes: ${m1(S50)} from 50 mph, ${m1(S100)} from 100. Twice the speed, four times the road.`,
    wrong: picked => picked === 0 ? `It is more than twice: ${m1(S50)} from 50 mph, ${m1(S100)} from 100, four times as far. Twice the speed, four times the road.`
      : `Not the same: ${m1(S50)} from 50 mph, ${m1(S100)} from 100. The faster car needs four times the road.`,
    hints: ['Think of the Watch: the 50 mph and the 100 mph cars.', `${m1(S50)} and ${m1(S100)}: how many times is that?`, 'Pick “Four times as much”.'],
  },
  'check-balance': {
    question: 'Which brake balance stops steady, with the back in line?',
    answers: [50, 60, 80].map(front => ({label: `${front}% front, ${100 - front}% back`, picture: {kind: 'lever', front}})),
    correct: 2,
    right: () => `Yes. Braking, the back tyres carry only ${pct(REAR_LOAD)} of the weight; at 80% front the back brakes do 20%, less than that, so the back stays in line.`,
    wrong: picked => `At ${[50, 60][picked]}% front the back brakes do ${100 - [50, 60][picked]}% of the braking, but the back tyres carry only ${pct(REAR_LOAD)} of the weight while braking: they lock and the back slides. 80% front stops steady.`,
    hints: [`Braking, the back tyres carry ${pct(REAR_LOAD)} of the weight.`, 'The back brakes must do less than that share.', 'Pick 80% front.'],
  },
  'check-game': {
    question: 'On the Tune page you move Brake balance two steps toward the rear. What happens in a race?',
    answers: [{label: `It brakes ${signed(2 * LAB_TUNE.brakes.brakingPerStep).slice(1)} harder, but has ${signed(2 * LAB_TUNE.brakes.cornerLeftPerStep).slice(1)} less grip to turn while braking`, picture: {kind: 'game', what: 'trade'}},
      {label: 'It stops shorter and turns better', picture: {kind: 'game', what: 'both'}}, {label: 'Nothing changes', picture: {kind: 'game', what: 'same'}}],
    correct: 0,
    right: () => 'Yes. The back brakes add a little stopping, but while you brake the car has less grip to turn: the back is nearer to sliding. Toward the front is the other way round.',
    wrong: picked => picked === 1 ? `It is a trade: ${REAR_TWO_LINE.replace('-', '−')} More rear brake stops a little harder but grips less in a turn while braking.`
      : `It changes the car: ${REAR_TWO_LINE.replace('-', '−')} Toward the front is the other way round.`,
    hints: ['Think of the back sliding when the back brakes did too much.', 'A little more braking, a little less of something else.', 'Pick the first card.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The dial and the lever carry from step to step, as the player left them.
  const set = {speed: 50, front: 50};
  const step = () => STEPS[m.index];
  const lane = (speed, front, label) => ({speed, front, label});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', lanes: [], race: null, guess: null, answered: null, say: '', auto: null, lastPress: -1, corner: 0, slid: false, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.lanes = [lane(50, STEADY_FRONT, 'From 50 mph'), lane(100, STEADY_FRONT, 'From 100 mph')]; m.race = {at: .5, t: null}; m.phase = 'running'; }
    if (id === 'word-stopping' || id === 'word-weight') { m.lanes = [lane(50, STEADY_FRONT, 'From 50 mph')]; m.phase = 'ready'; }
    if (id === 'word-balance') { set.front = 50; m.phase = 'lever'; }
    if (id === 'watch') { m.lanes = [lane(50, STEADY_FRONT, '50 mph, 70% front'), lane(100, STEADY_FRONT, '100 mph, 70% front'), lane(50, 50, '50 mph, 50% front')]; m.race = {at: .8, t: null}; m.phase = 'running'; }
    if (id === 'try-speed') { set.speed = 50; set.front = Math.max(set.front, STEADY_FRONT); m.phase = 'set'; }
    if (id === 'try-slide') { set.speed = 50; set.front = 50; m.phase = 'set'; }
    if (id === 'alone') { set.speed = 50; m.phase = 'set'; }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  const setting = () => ['try-speed', 'try-slide', 'alone'].includes(step().id) && m.phase === 'set';
  const canDial = () => setting() && step().id !== 'try-slide';
  const canLever = () => (setting() && step().id !== 'try-speed') || (step().id === 'word-balance' && m.phase === 'lever');
  // What Show me sets and brakes.
  function goal() {
    const id = step().id;
    if (id === 'try-speed') return {speed: 100, front: set.front};
    if (id === 'try-slide') return {speed: 50, front: m.slid ? STEADY_FRONT : 50};
    if (id === 'word-balance') return {speed: set.speed, front: STEADY_FRONT};
    return {speed: fastestFor(CORNERS[Math.min(m.corner, CORNERS.length - 1)]), front: Math.max(set.front, STEADY_FRONT)};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-speed') return 'Watch: I turn the dial to 100 mph, then brake.';
    if (id === 'try-slide') return m.slid ? `Watch: I move the lever to ${STEADY_FRONT}% front, then brake.` : 'Watch: I brake as it is, at 50% front.';
    return `Watch: ${g.speed} mph, the lever at ${g.front}% front, then I brake.`;
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
      if (m.auto || !(setting() || canLever())) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'speed') return dial(value, held === 'held');
    if (kind === 'lever') return lever(value, held === 'held');
    if (kind === 'answer' && id === 'try-speed' && m.phase === 'guess') {
      const picked = Number(value);
      if (!GUESSES[picked]) return null;
      m.guess = picked; startRun();
      return {kind: 'progress', say: `You said: ${GUESSES[picked].label.toLowerCase()}. Watch the tape.`};
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ and ↓ turn the speed dial 10 mph a press, between 20 and 150.
  function dial(way, held) {
    if (!canDial() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.speed;
    set.speed = Math.max(MIN_MPH, Math.min(MAX_MPH, before + (way === 'up' ? SPEED_STEP : -SPEED_STEP)));
    if (set.speed === before) return held ? null : {kind: 'note', say: way === 'up' ? `${MAX_MPH} mph is the top of the dial.` : `${MIN_MPH} mph is the bottom of the dial.`};
    m.lastPress = m.time; m.lanes = [];
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  // → moves the lever 10% toward the front brakes, ← toward the back, between 40% and 90% front.
  function lever(way, held) {
    if (!canLever() || m.auto || (way !== 'front' && way !== 'back')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.front;
    set.front = Math.max(MIN_FRONT, Math.min(MAX_FRONT, before + (way === 'front' ? LEVER_STEP : -LEVER_STEP)));
    if (set.front === before) return held ? null : {kind: 'note', say: way === 'front' ? `${MAX_FRONT}% front is as far as the lever goes.` : `${MIN_FRONT}% front is as far back as the lever goes.`};
    m.lastPress = m.time;
    if (step().id !== 'word-balance') { m.lanes = []; return held ? null : {kind: 'sound', sound: 'lab.clunk'}; }
    if (set.front >= STEADY_FRONT) {
      m.phase = 'done'; seen.add('word-balance');
      m.say = `${set.front}% front: the front brakes do ${set.front}% of the braking, the back brakes ${100 - set.front}%. That is the brake balance.`;
      return {kind: 'right', sound: 'lab.clunk', say: m.say};
    }
    return held ? null : {kind: 'sound', sound: 'lab.clunk'};
  }

  function go() {
    const id = step().id;
    if ((id === 'word-stopping' || id === 'word-weight') && m.phase === 'ready') {
      m.phase = 'running'; m.race = {at: .1, t: null}; runs.push({speed: 50, front: STEADY_FRONT});
      return {kind: 'progress', say: id === 'word-stopping' ? 'Brakes on at the line. Watch the tape.' : 'Watch the pads under the tyres as it brakes.'};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-speed') {
      if (set.speed !== 100) return {kind: 'note', say: 'This try is from 100 mph: press ↑ until the dial reads 100.'};
      m.phase = 'guess'; m.lanes = [];
      return {kind: 'progress', say: `From 50 mph it stopped in ${m1(S50)}. From 100 mph: where will it stop? Pick a card.`};
    }
    startRun();
    return {kind: 'progress', say: `${set.speed} mph, ${set.front}% front: brakes on at the line.`};
  }
  function startRun() {
    const corner = step().id === 'alone';
    m.lanes = [lane(set.speed, set.front, corner ? `Corner ${m.corner + 1}` : `${set.speed} mph`)];
    m.phase = 'running'; m.race = {at: .1, t: null};
    runs.push({speed: set.speed, front: set.front});
  }

  // The run has stopped: the guess is judged (Twice the speed), the back (A steady back), or the corner (Brian's job).
  function judge() {
    const id = step().id, l = m.lanes[0], r = stopOf(l.speed, l.front);
    if (id === 'word-stopping') { m.phase = 'done'; seen.add(id); m.say = `${m1(r.stopMetres)} from 50 mph. That is its stopping distance: the road it used from brakes on to stopped.`; return {kind: 'right', say: m.say}; }
    if (id === 'word-weight') { m.phase = 'done'; seen.add(id); m.say = `Standing, each end carries half the weight. Braking, the front tyres carried ${pct(FRONT_LOAD)} and the back ${pct(REAR_LOAD)}. That is weight shift.`; return {kind: 'right', say: m.say}; }
    if (id === 'try-speed') {
      m.phase = 'done'; seen.add(id);
      const right = m.guess === 1;
      m.say = right ? `Right: ${m1(r.stopMetres)}. Twice the speed, four times the road: 4 × ${m1(S50)}.`
        : m.guess === 0 ? `It needed ${m1(r.stopMetres)}, not twice ${m1(S50)}. Twice the speed needs four times the road: 4 × ${m1(S50)}.`
          : `It needed ${m1(r.stopMetres)}: four times ${m1(S50)}, not eight. Twice the speed, four times the road.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    m.phase = 'set';
    const why = `its brakes did ${100 - l.front}% of the braking, but braking leaves only ${pct(REAR_LOAD)} of the weight on the back tyres`;
    if (id === 'try-slide') {
      if (r.rearSlides && !m.slid) { m.slid = true; m.say = `The back slid: ${why}. Press → to move the lever toward the front, then brake again.`; return {kind: 'progress', say: m.say}; }
      if (r.rearSlides) { m.say = `Still sliding at ${l.front}% front: the back brakes did ${100 - l.front}%, more than the ${pct(REAR_LOAD)} on the back tyres. Press → again, then brake.`; return {kind: 'fail', say: m.say}; }
      m.phase = 'done'; seen.add(id);
      m.say = `${l.front}% front: the back brakes did ${100 - l.front}%, less than the ${pct(REAR_LOAD)} the back tyres carry, so the back stayed in line. ${m1(r.stopMetres)}, a steady stop.`;
      return {kind: 'right', say: m.say};
    }
    // Brian's job: the fastest steady stop before the corner.
    const gap = CORNERS[m.corner], best = fastestFor(gap);
    if (r.rearSlides) { m.say = `The back slid: its brakes did ${100 - l.front}%, more than the ${pct(REAR_LOAD)} on the back tyres. Move the lever toward the front, then try that corner again.`; return {kind: 'fail', say: m.say}; }
    if (r.stopMetres > gap) { m.say = `From ${l.speed} mph it needs ${m1(r.stopMetres)}, and the gap is ${gap} m: it ran ${m1(r.stopMetres - gap)} past the corner. Slower: press ↓.`; return {kind: 'fail', say: m.say}; }
    if (l.speed < best) { m.say = `Stopped ${m1(gap - r.stopMetres)} short of the corner. From ${l.speed + SPEED_STEP} mph it still stops in time (${m1(metresFrom(l.speed + SPEED_STEP))}). Arrive faster: press ↑.`; return {kind: 'fail', say: m.say}; }
    m.corner += 1;
    if (m.corner >= CORNERS.length) {
      m.phase = 'done'; seen.add(id);
      m.say = `Three corners, each as fast as it can stop in time: 60, 100 and 120 mph. Twice the gap does not mean twice the speed. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    m.lanes = [];
    m.say = `Right: ${l.speed} mph stops in ${m1(r.stopMetres)}, inside ${gap} m, and ${l.speed + SPEED_STEP} mph would not. Next corner: the marker is ${CORNERS[m.corner]} m before it.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto;
      m.lastPress = m.time;
      if (set.front !== a.front) { set.front += Math.sign(a.front - set.front) * LEVER_STEP; m.lanes = []; if (id === 'word-balance' && set.front >= STEADY_FRONT) { m.auto = null; m.phase = 'done'; seen.add(id); m.say = `${set.front}% front: the front brakes do ${set.front}% of the braking, the back brakes ${100 - set.front}%. That is the brake balance.`; return {kind: 'right', say: m.say}; } return null; }
      if (set.speed !== a.speed) { set.speed += Math.sign(a.speed - set.speed) * SPEED_STEP; m.lanes = []; return null; }
      m.auto = null;
      return go();
    }
    if (!m.race || m.phase !== 'running' && !(CHECKS[id])) return null;
    if (m.race.t == null) { if (m.time < m.race.at) return null; m.race.t = 0; }
    const end = runEnd(m.lanes), before = m.race.t;
    if (before >= end) return null;
    m.race.t = Math.min(end, before + dt);
    const brakeAt = RUNUP_S;
    if (before < brakeAt && m.race.t >= brakeAt) return {kind: 'sound', sound: 'lab.tick'};
    if (m.race.t < end) return null;
    if (id === 'wonder' || id === 'watch') { m.phase = 'done'; seen.add(id); return null; }
    return judge();
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  function laneViews() {
    const t = m.race?.t;
    return m.lanes.map(l => {
      const r = stopOf(l.speed, l.front), at = t == null ? {metres: -RUNUP_S * l.speed * MPS, mph: l.speed, braking: false, done: false, brakeShare: 0} : laneAt(l.speed, l.front, t);
      return {label: l.label, speed: l.speed, front: l.front, metres: at.metres, mph: at.mph, braking: at.braking, done: at.done, stopMetres: r.stopMetres,
        slides: r.rearSlides, slide: r.rearSlides ? at.brakeShare : 0, waiting: t == null};
    });
  }

  function view() {
    const id = step().id;
    const lanes = laneViews(), braking = lanes.some(l => l.braking);
    const close = {front: braking ? FRONT_LOAD : .5, locked: braking && lanes[0]?.slides === true, braking};
    const base = {scene: 'rig', time: m.time, lanes, line: null, close, dial: null, lever: null, job: null, runs: runs.map(r => ({...r})),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, lanes: [], close: null,
        tune: id === 'check-game' ? {effect: answered ? REAR_TWO_LINE : null} : null,
        stops: id === 'check-four' ? [{speed: 50, metres: S50}, {speed: 100, metres: S100}] : null,
        balances: id === 'check-balance' ? [50, 60, 80].map(front => ({front, slides: stopOf(50, front).rearSlides})) : null,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, close: null,
      say: 'Twice the speed, four times the road. Braking tips the weight onto the front tyres, so the front brakes do most of the work. Too much rear brake and the back slides.',
      prompt: 'Enter finishes the lesson and opens Brake balance on the Tune page in the garage.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') return {...base, line: LINE_M, actions: ['replay'],
      say: seen.has(id) ? `Same car, same brakes. From 50 mph it stopped in ${m1(S50)}. From 100 mph it ran past the line and needed ${m1(S100)}. Twice the speed: why four times the road?`
        : 'Two of the same car, brakes on at the same line. Watch where they stop.',
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the two cars.',
      hints: ['Watch where each car stops.', 'One came in twice as fast.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch them stop, then press Enter.']};
    if (id === 'word-stopping' || id === 'word-weight') {
      const ready = m.phase === 'ready', done = m.phase === 'done', stopping = id === 'word-stopping';
      return {...base, ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'strip', buttons: [BRAKE]} : {}), pads: !stopping,
        say: done ? m.say : stopping ? 'Stopping distance is the road a car uses while its brakes slow it to a stop. Brake from 50 mph.'
          : 'Weight shift: braking tips the car’s weight forward onto its front tyres. The pads under the tyres weigh each end. Brake and watch them.',
        prompt: ready ? 'Press Space to brake, or click the strip.' : done ? 'Press Enter to go on.' : stopping ? 'Watch the tape.' : 'Watch the pads.',
        hints: done ? DONE : [stopping ? 'The tape measures from the line to where it stops.' : 'Watch the numbers on the two pads.', 'Press Space.', 'Watch my pointer: I brake.']};
    }
    if (id === 'word-balance') {
      const done = m.phase === 'done';
      return {...base, lever: {front: set.front, locked: done}, pads: true, best: goal(), ...(done ? {} : {keys: LEVER_KEYS, repeat: ['←', '→'], waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'lever', buttons: leverButtons()}),
        say: done ? m.say : m.auto ? `Watch: I move it to ${STEADY_FRONT}% front.` : `Brake balance is how much of the braking the front and back brakes do. The lever is at ${set.front}% front. Move it to ${STEADY_FRONT}%.`,
        prompt: done ? 'Press Enter to go on.' : `${set.front}% front, ${100 - set.front}% back. Press → to move it toward the front, or click the lever.`,
        hints: done ? DONE : ['The lever slides between the back brakes and the front brakes.', `Press → until it reads ${STEADY_FRONT}% front.`, 'Watch my pointer: I move it.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], pads: true,
        say: done ? `${m1(S50)} from 50 mph and ${m1(S100)} from 100 mph: four times the road. And at 50% front the back brakes did more than the ${pct(REAR_LOAD)} of weight the back tyres carry, so the back slid.`
          : 'Three of the same car: 50 mph and 100 mph with the lever at 70% front, and 50 mph with it at 50%.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the three cars.',
        hints: ['Watch where each car stops.', 'And watch the back of the bottom car.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The tries and Brian's job: the dial, the lever and the strip.
    const setNow = setting() && !m.auto, g = goal(), atGoal = set.speed === g.speed && set.front === g.front;
    const keys = !setNow ? {} : {...(canDial() ? DIAL_KEYS : {}), ...(canLever() ? LEVER_KEYS : {}), Space: 'go'};
    // The dial and the lever are on the board, each with its keys; the bar keeps only Brake, so it stays readable.
    const buttons = !setNow ? [] : [BRAKE];
    const v = {...base, pads: true, dial: {speed: set.speed, locked: !canDial()}, lever: {front: set.front, locked: !canLever()}, keys, buttons,
      repeat: setNow ? [...(canDial() ? ['↑', '↓'] : []), ...(canLever() ? ['←', '→'] : [])] : [], target: !setNow ? null : atGoal ? 'go' : 'set:best', glow: setNow ? 'set' : null,
      waiting: setNow || m.phase === 'guess', best: g};
    if (id === 'try-speed') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: GUESSES.map((g, i) => ({id: `answer:${i}`, key: String(i + 1), label: g.label, picture: {kind: 'stops', metres: [S50, g.metres]}, state: null})),
        say: m.say, prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: [`From 50 mph it needed ${m1(S50)}.`, 'Twice the speed needs more than twice the road.', 'Pick a card; any guess goes on.']};
      if (m.phase === 'running') return {...v, say: m.say, prompt: 'Watch the tape.', hints: ['Watch where it stops.', 'Count the 10 m marks.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `From 50 mph the car stopped in ${m1(S50)}. Turn the dial to 100 mph, twice as fast, then brake.`,
        prompt: `${set.speed} mph. Press ↑ for faster, ↓ for slower, Space to brake.`,
        hints: ['The speed dial is beside the car.', 'Press ↑ until it reads 100 mph, then Space.', 'Watch my pointer: I turn it and brake.']};
    }
    if (id === 'try-slide') {
      if (m.phase === 'running') return {...v, say: m.say, prompt: 'Watch the back of the car.', hints: ['Watch the back tyre.', 'Does it slide?', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || 'I have moved the lever to 50% front. Brake from 50 mph as it is, and watch the back.',
        prompt: m.slid ? `${set.front}% front. Press → to move the lever toward the front, ← toward the back, Space to brake.` : 'Press Space to brake as it is.',
        hints: m.slid ? [`The back tyres carry ${pct(REAR_LOAD)} of the weight while braking.`, `Press → until the lever reads ${STEADY_FRONT}% front, then Space.`, 'Watch my pointer: I move it and brake.']
          : ['Brake first and watch the back.', 'Press Space.', 'Watch my pointer: I brake.']};
    }
    // Brian's job.
    const corner = Math.min(m.corner, CORNERS.length - 1);
    const job = {corner: corner + 1, of: CORNERS.length, gap: CORNERS[corner], done: m.phase === 'done'};
    const jv = {...v, job, line: CORNERS[corner]};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (m.phase === 'running') return {...jv, say: m.say, prompt: 'Watch the car and the corner.', hints: ['Does it stop before the corner?', 'And is the back steady?', 'Wait a moment.']};
    return {...jv,
      say: m.auto ? autoSay() : m.corner === 0 && !m.say ? `Brian’s job: three corners, each with a braking marker before it. Arrive as fast as you can and still stop before the corner, with the back steady. Corner 1: the marker is ${CORNERS[0]} m before it.` : m.say,
      prompt: `${set.speed} mph, ${set.front}% front: it needs ${m1(metresFrom(set.speed))}. ↑ ↓ the speed, ← → the lever, Space to brake.`,
      hints: [`The gap is ${CORNERS[corner]} m. The strip’s marks are every 10 m.`, `${fastestFor(CORNERS[corner])} mph stops in ${m1(metresFrom(fastestFor(CORNERS[corner])))}, inside ${CORNERS[corner]} m; keep the lever at ${STEADY_FRONT}% front or more.`, 'Watch my pointer: I set it and brake.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own braking runs, as the bench's challenge reads them: the bench's goal (a run from 50 mph and one from
// 100 mph) must pass on these, so finishing the lesson can never pass without them.
export const benchAttempts = view => (view?.runs ?? []).map(({speed, front}) => ({controls: [{id: 'speedMph'}, {id: 'frontShare'}], input: {speedMph: speed, frontShare: front}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = 'Braking passed! Brake balance is open on the Tune page in the garage: toward the rear brakes a little harder, toward the front keeps more grip to turn while braking.';

export const lesson = Object.freeze({id: 'braking', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
