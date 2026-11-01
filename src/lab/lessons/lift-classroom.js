// Lift and weight as a classroom lesson (docs/board/cards/LAB-CLASSROOM-LIFT.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every weight and lift on screen comes from padForces(),
// which reads the helicopter's own flight rules (heliMass, availableThrust) with a full tank.
import {GRAVITY, KESTREL, PAD, padForces} from '../benches/lift-pad.js';

const forces = load => padForces({fuel: KESTREL.tankKg, crates: load.crates ?? 0, car: load.car ?? 0}, 0);
export const weightOf = load => forces(load).massKg;
export const OWN_KG = weightOf({});
// The most the rotor can push close to the ground, with the lever all the way up.
export const MOST_KG = forces({}).maximumN / GRAVITY;
export const CRATE_KG = PAD.crateKg, CAR_KG = PAD.carKg, MAX_CRATES = PAD.maxCrates;
// The lever moves a notch at a time; a notch is one crate's worth of lift.
export const NOTCH_KG = PAD.crateKg;
const SNAP_KG = 150;
export const kg = value => `${Math.round(value).toLocaleString('en-GB')} kg`;
const MOST = kg(Math.floor(MOST_KG));
const over = load => Math.ceil(weightOf(load) - MOST_KG);
// The most crates she can lift with the Dusthawk on the hook: the answer to Brian's job.
export const BEST_CRATES = Math.floor((MOST_KG - weightOf({car: 1})) / CRATE_KG);
// Heights in metres above the pad: the hover mark, the board's top, the game challenge's band.
export const HOVER_M = 1, CEILING_M = 10, BAND_M = Object.freeze([2, 5]);
const TAUT_S = 1.2, SETTLE_S = 1.6;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why won’t it lift?'},
  {id: 'word-weight', part: 1, title: 'Weight', word: 'lift-weight'},
  {id: 'word-lift', part: 1, title: 'Lift', word: 'lift-lift'},
  {id: 'word-collective', part: 1, title: 'Collective', word: 'lift-collective'},
  {id: 'word-hover', part: 1, title: 'Hover', word: 'lift-hover'},
  {id: 'watch-lever', part: 2, title: 'Less, the same, more'},
  {id: 'watch-loads', part: 2, title: 'Three loads', voice: 'lab.brian.lift.intro'},
  {id: 'try-car', part: 3, title: 'The Dusthawk'},
  {id: 'try-heavy', part: 3, title: 'Two more crates'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-heavy', part: 5, title: 'Question 1 of 3'},
  {id: 'check-more', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.lift.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'match', text: 'Lift pushes up, weight pulls down. When they are the same, she hovers.'},
  {id: 'most', text: 'Every rotor has a most it can push. Too heavy, and the load stays down.'},
  {id: 'ease', text: 'In the game: once the car is up, ease back on S until she hovers.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Lift must match weight.', text: 'Once the car is up, ease back on S until she holds still.'});

// ---- the flight on the pad: the load, the lever and where she is ----
// h: how high the lifted set is above the pad (the load's bottom, or her skids with no load).
// taut: 0 to 1, how far she has lifted herself to take up the slack in the cable.
const flight = (load = {}, liftKg = 0) => ({crates: load.crates ?? 0, car: load.car ?? 0, lift: liftKg, h: 0, taut: 0, dropped: 0});
const loaded = f => f.crates > 0 || f.car > 0;
function want(f) {
  const w = weightOf(f);
  return f.lift > w + .5 ? 'climb' : f.lift >= w - .5 ? 'hover' : 'down';
}
function fly(f, dt) {
  const w = weightOf(f), mode = want(f), freeToRise = !loaded(f) || f.taut >= 1;
  if (loaded(f)) {
    if (f.lift >= OWN_KG - .5) f.taut = Math.min(1, f.taut + dt / TAUT_S);
    else if (f.h <= 0) f.taut = Math.max(0, f.taut - dt / TAUT_S);
  } else f.taut = 0;
  if (mode === 'climb' && freeToRise) f.h = Math.min(CEILING_M, f.h + Math.min(4, .8 + (f.lift - w) / 250) * dt);
  if (mode === 'hover' && freeToRise && f.h < HOVER_M) f.h = Math.min(HOVER_M, f.h + dt);
  if (mode === 'down') f.h = Math.max(0, f.h - 2.5 * dt);
}
// Where she is, in a few words, for the board and Brian.
export function status(f) {
  const mode = want(f);
  if (f.h <= 0 && (!loaded(f) || f.taut <= 0)) return mode === 'down' ? 'pad' : 'rising';
  if (loaded(f) && f.h <= 0) return mode === 'down' ? 'taut' : 'rising';
  if (mode === 'down') return 'sinking';
  if (mode === 'climb') return f.h >= CEILING_M ? 'high' : 'climbing';
  return f.h >= HOVER_M - .01 ? 'hovering' : 'rising';
}
// What the pad feels: everything still resting on it, less the rotor's push.
const padFeels = f => f.h > 0 ? 0 : Math.max(0, weightOf(f) - f.lift);
function levels(f) {
  const out = [0], w = weightOf(f);
  for (let n = NOTCH_KG; n < MOST_KG; n += NOTCH_KG) out.push(n);
  if (w < MOST_KG) out.push(w);
  out.push(MOST_KG);
  return [...new Set(out)].sort((a, b) => a - b);
}
// One notch up or down. A held key stops at the red line; a fresh press goes past it.
function notch(f, dir, held) {
  const w = weightOf(f);
  if (held && Math.abs(f.lift - w) < .5) return false;
  const all = levels(f), next = dir > 0 ? all.find(n => n > f.lift + .5) : [...all].reverse().find(n => n < f.lift - .5);
  if (next === undefined) return false;
  f.lift = next; return true;
}
// A drag sets the lever anywhere, and it clicks onto the red line or the top stop when close.
function setLever(f, value) {
  const w = weightOf(f);
  let lift = Math.max(0, Math.min(MOST_KG, Number.isFinite(value) ? value : 0));
  if (w <= MOST_KG && Math.abs(lift - w) <= SNAP_KG) lift = w;
  else if (MOST_KG - lift <= SNAP_KG / 2) lift = MOST_KG;
  else lift = Math.round(lift / 10) * 10;
  if (Math.abs(lift - f.lift) < .5) return false;
  f.lift = lift; return true;
}
const parts = f => [`Kestrel One ${kg(OWN_KG)}`, ...(f.car ? [`Dusthawk ${kg(CAR_KG)}`] : []), ...(f.crates ? [`${f.crates} crate${f.crates > 1 ? 's' : ''} ${kg(f.crates * CRATE_KG)}`] : [])];
function drawn(f) {
  return {crates: f.crates, car: f.car, lift: f.lift, weight: weightOf(f), most: MOST_KG, h: f.h, taut: f.taut, dropped: f.dropped,
    status: status(f), pad: padFeels(f), parts: parts(f)};
}

// ---- keys (the screen shows them on its buttons and the board) ----
const LEVER_KEYS = Object.freeze({W: 'lever:up', '↑': 'lever:up', S: 'lever:down', '↓': 'lever:down'});
const REPEAT = Object.freeze(['W', '↑', 'S', '↓']);
const LOAD_KEYS = Object.freeze({1: 'crate:add', 2: 'crate:remove', 3: 'car'});
const PICK_KEYS = n => Object.fromEntries(Array.from({length: n}, (_, i) => [String(i + 1), `${n === 2 ? 'guess' : 'answer'}:${i}`]));
const GUESSES = Object.freeze([
  {id: 'yes', label: 'Yes, she can lift it', picture: {kind: 'verdict', up: true}},
  {id: 'no', label: 'No, it is too heavy', picture: {kind: 'verdict', up: false}},
]);

// ---- the guided tries ----
const TRIES = {
  'try-car': {
    start: {},
    goal: f => f.car === 1 && f.crates === 0,
    target: 'car',
    setupSay: 'Your turn. Hook the Dusthawk rally car under her.',
    setupPrompt: 'Click the Dusthawk, or press 3.',
    wrongSetup: () => 'Just the Dusthawk this time, no crates. Take the crate off with 2.',
    setupHints: ['The Dusthawk is the white rally car parked on the right.', 'Click the Dusthawk, or press 3.', 'Watch my pointer: it is on the Dusthawk.'],
    guessSay: () => `With the Dusthawk she weighs ${kg(weightOf({car: 1}))}. The most her rotor can push is ${MOST}. Can she lift it?`,
    guessHints: [`Compare the two numbers: ${kg(weightOf({car: 1}))} of weight and ${MOST} of lift.`, 'If the most lift is bigger than the weight, she can lift it.', 'Any guess is fine. Pick one, then we test it.'],
    leverTarget: 'lever:weight',
    leverSay: 'Now pull the lever up to the red line, her weight.',
    leverPrompt: 'Hold W (or ↑), or drag the lever, up to the red line.',
    actual: 'yes',
    right: () => `Right! She hovers with ${kg(weightOf({car: 1}))} of lift, and she still had ${kg(MOST_KG - weightOf({car: 1}))} to spare.`,
    wrong: () => `She can lift it: ${kg(weightOf({car: 1}))} is less than the ${MOST} her rotor can push, so there is lift to spare.`,
  },
  'try-heavy': {
    start: {car: 1},
    goal: f => f.car === 1 && f.crates === 2,
    target: 'crate:add',
    setupSay: 'Now add two crates to the Dusthawk.',
    setupPrompt: 'Click the crates, or press 1, twice.',
    wrongSetup: (f, kind) => kind === 'car' ? 'Keep the Dusthawk on the hook. We are adding crates to it.' : f.crates > 2 ? 'That is too many. Two crates: take one off with 2.' : 'Add crates with 1. We need two.',
    setupHints: ['The crates are stacked on the right, 500 kg each.', 'Click the crates, or press 1, until two are on the hook.', 'Watch my pointer: it is on the crates.'],
    guessSay: () => `Now she weighs ${kg(weightOf({car: 1, crates: 2}))}. The most her rotor can push is ${MOST}. Can she lift it?`,
    guessHints: [`Compare the two numbers: ${kg(weightOf({car: 1, crates: 2}))} of weight and ${MOST} of lift.`, 'If the weight is bigger than the most lift, she cannot lift it.', 'Any guess is fine. Pick one, then we test it.'],
    leverTarget: 'lever:top',
    leverSay: 'Pull the lever all the way up, as far as it goes.',
    leverPrompt: 'Hold W (or ↑), or drag the lever, to the top.',
    actual: 'no',
    right: () => `Right! ${kg(weightOf({car: 1, crates: 2}))} is ${kg(over({car: 1, crates: 2}))} more than the ${MOST} she can push, so the load stays down.`,
    wrong: () => `Even with the lever at the top she pushes ${MOST}, and the load weighs ${kg(weightOf({car: 1, crates: 2}))}: ${kg(over({car: 1, crates: 2}))} too heavy, so it stays down.`,
  },
};
const LEVER_HINTS = target => ['The lever is on the left. The red line is her weight.',
  target === 'lever:top' ? 'Hold W until the lever stops at the top.' : 'Hold W until the lever reaches the red line. It stops there for you.',
  target === 'lever:top' ? 'Watch my pointer: it is on the top of the lever.' : 'Watch my pointer: it is on the red line.'];

// ---- the checks ----
const CHECKS = {
  'check-heavy': {
    question: 'Which one stays on the ground, even with the lever all the way up?',
    answers: [{car: 1}, {crates: 3}, {car: 1, crates: 2}].map(load => ({label: `${[load.car ? 'Dusthawk' : '', load.crates ? `${load.crates} crates` : ''].filter(Boolean).join(' + ')} (${kg(weightOf(load) - OWN_KG)})`, picture: {kind: 'load', ...load}, load})),
    correct: 2,
    right: () => `Yes. ${kg(weightOf({car: 1, crates: 2}))} is more than the ${MOST} she can push.`,
    wrong: picked => `That one weighs ${kg(weightOf(CHECKS['check-heavy'].answers[picked].load))}, less than the ${MOST} she can push, so she lifts it. The Dusthawk and two crates make ${kg(weightOf({car: 1, crates: 2}))}: too heavy.`,
    hints: ['Add up each load with Kestrel One’s own 1,630 kg.', `Which one comes to more than ${MOST}?`, 'Pick the Dusthawk and two crates.'],
  },
  'check-more': {
    question: 'She is hovering with the Dusthawk. You pull the lever up a little more. What happens?',
    answers: [{label: 'She climbs', picture: {kind: 'motion', move: 'climb'}}, {label: 'She stays still', picture: {kind: 'motion', move: 'hover'}}, {label: 'She sinks', picture: {kind: 'motion', move: 'sink'}}],
    correct: 0,
    right: () => 'Yes. More lift than weight, so up she goes.',
    wrong: () => 'More lever makes more lift. With more lift than weight, she climbs.',
    hints: ['Hovering means lift and weight are the same.', 'More lever, more lift. What does more lift than weight do?', 'Pick “She climbs”.'],
  },
  'check-game': {
    question: `In the game you hold the Dusthawk ${BAND_M[0]} to ${BAND_M[1]} m off the ground. Once she lifts it, what do you do with the lever?`,
    answers: [{label: 'Keep it all the way up', picture: {kind: 'lever', at: 'top'}}, {label: 'Ease it back until she holds still', picture: {kind: 'lever', at: 'match'}}, {label: 'Push it all the way down', picture: {kind: 'lever', at: 'bottom'}}],
    correct: 1,
    right: () => 'Yes. Ease back until lift matches weight, and she holds still in the band.',
    wrong: picked => picked === 0 ? `All the way up she pushes ${MOST} against ${kg(weightOf({car: 1}))}, so she keeps climbing out of the band. Ease back until she holds still.`
      : 'With no lift she drops the car back on the ground. Ease back only until she holds still.',
    hints: ['To stay at one height, she must hover.', 'Hover means lift the same as weight. Too much lift and she climbs.', 'Pick “Ease it back until she holds still”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];

  function enter(index) {
    m = {index, time: 0, phase: 'setup', guess: null, result: null, settleAt: null, answered: null, script: null, f: null, sets: null, best: null};
    const id = STEPS[index].id;
    if (id === 'wonder') m.f = flight({car: 1, crates: 2}, MOST_KG);
    if (id === 'word-weight' || id === 'word-lift') m.f = flight();
    if (id === 'word-collective') m.f = flight({}, NOTCH_KG);
    if (id === 'word-hover') m.f = flight({}, 3 * NOTCH_KG);
    if (id === 'watch-lever') m.f = flight();
    if (id === 'watch-loads') m.sets = [{car: 1}, {car: 1, crates: 1}, {car: 1, crates: 2}].map(load => flight(load));
    if (TRIES[id]) m.f = flight(TRIES[id].start);
    if (id === 'alone') m.f = flight({car: 1});
    if (id === 'check-heavy') { m.phase = 'ask'; m.sets = CHECKS[id].answers.map(a => flight(a.load)); }
    if (id === 'check-more' || id === 'check-game') { m.phase = 'ask'; m.f = flight({car: 1}, weightOf({car: 1})); m.f.taut = 1; m.f.h = id === 'check-game' ? 3 : HOVER_M; }
  }

  function act(action) {
    const id = step().id, [kind, value, extra] = action.split(':');
    if (kind === 'replay') return replay();
    if (id === 'word-weight') {
      if (kind !== 'crate' || value !== 'add' || m.f.crates) return null;
      m.f.crates = 1; seen.add(id);
      return {kind: 'right', sound: 'lab.clunk', say: `The dial went from ${kg(OWN_KG)} to ${kg(weightOf({crates: 1}))}: one crate adds ${kg(CRATE_KG)}. Weight adds up.`};
    }
    if (id === 'word-lift') {
      if (kind !== 'rotor' || m.f.lift > 0) return null;
      m.f.lift = NOTCH_KG; seen.add(id);
      return {kind: 'right', say: `The blades throw air down, and the air pushes her up: ${kg(NOTCH_KG)} of lift. Now the pad only feels ${kg(OWN_KG - NOTCH_KG)}.`};
    }
    if (id === 'word-collective' || id === 'word-hover') return leverWord(id, kind, value, extra);
    if (TRIES[id] || id === 'alone') return tryAct(id, kind, value, extra);
    if (CHECKS[id] && kind === 'answer' && m.phase === 'ask') {
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      showAnswer(id);
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    return null;
  }

  function moveLever(kind, value, extra) {
    if (kind === 'lever' && value === 'up') return notch(m.f, 1, extra === 'held');
    if (kind === 'lever' && value === 'down') return notch(m.f, -1, extra === 'held');
    if (kind === 'lever' && value === 'weight') return setLever(m.f, Math.min(weightOf(m.f), MOST_KG));
    if (kind === 'lever' && value === 'top') return setLever(m.f, MOST_KG);
    if (kind === 'hold') { setLever(m.f, Number(value)); return false; }
    return kind === 'release';
  }

  function leverWord(id, kind, value, extra) {
    const moved = moveLever(kind, value, extra);
    if (!moved || seen.has(id)) return null;
    const f = m.f;
    if (id === 'word-collective') {
      if (f.lift < 2 * NOTCH_KG - .5) return null;
      seen.add(id);
      return {kind: 'right', say: f.lift >= OWN_KG - .5 ? `${kg(f.lift)} of lift, more than her ${kg(OWN_KG)}, so she is off the pad! More lever, more lift.`
        : `${kg(f.lift)} of lift now, so the pad only feels ${kg(OWN_KG - f.lift)}. More lever, more lift.`};
    }
    const mode = want(f);
    if (mode === 'hover') { seen.add(id); return {kind: 'right', say: `${kg(f.lift)} of lift, ${kg(OWN_KG)} of weight: the same, so she hovers.`}; }
    if (mode === 'climb') return {kind: 'fail', say: `${kg(f.lift)} of lift is more than her ${kg(OWN_KG)}, so she climbs. Bring the lever back down to the red line.`};
    return null;
  }

  function tryAct(id, kind, value, extra) {
    const f = m.f, guided = TRIES[id];
    if (m.phase === 'setup' && (kind === 'crate' || kind === 'car')) {
      if (kind === 'crate' && value === 'add' && f.crates >= MAX_CRATES) return null;
      if (kind === 'crate' && value === 'remove' && f.crates <= 0) return null;
      if (kind === 'car' && id === 'try-heavy') return {kind: 'fail', say: guided.wrongSetup(f, 'car')};
      if (kind === 'crate') f.crates += value === 'add' ? 1 : -1;
      else f.car = f.car ? 0 : 1;
      // Loading happens on the pad: she sets down first.
      f.lift = 0; f.h = 0; f.taut = 0;
      if (!guided) return {kind: 'sound', sound: 'lab.clunk'};
      if (guided.goal(f)) { m.phase = 'guess'; return {kind: 'progress', sound: 'lab.clunk', say: guided.guessSay()}; }
      if (id === 'try-heavy' && kind === 'crate' && value === 'add' && f.crates < 2) return {kind: 'progress', sound: 'lab.clunk', say: 'One crate on. One more.'};
      return {kind: 'fail', sound: 'lab.clunk', say: guided.wrongSetup(f, kind)};
    }
    if (m.phase === 'guess' && kind === 'guess') {
      const pick = GUESSES[Number(value)];
      if (!pick) return null;
      m.guess = pick.id; m.phase = 'lever';
      return {kind: 'progress', say: guided.leverSay};
    }
    const canFly = guided ? m.phase === 'lever' : m.phase === 'setup';
    if (!canFly || !moveLever(kind, value, extra)) return null;
    const w = weightOf(f), mode = want(f);
    if (guided) {
      if (mode === 'climb') return {kind: 'fail', say: `Past the red line: ${kg(f.lift)} of lift against ${kg(w)}, so she climbs. Bring the lever back to the line.`};
      if (mode === 'hover' || f.lift >= MOST_KG - .5) { m.phase = 'running'; m.settleAt = m.time + SETTLE_S; return {kind: 'progress', say: 'Watch the load.'}; }
      return null;
    }
    if (mode === 'hover' || f.lift >= MOST_KG - .5 && mode === 'down') { m.settleAt = m.time + SETTLE_S; m.phase = 'running'; return {kind: 'run'}; }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    // Watch again on a try: she sets down, then the lever goes back where the player left it.
    if (m.replayAt != null && m.time - m.replayAt >= .3) { m.f.lift = m.replayLift; m.replayAt = null; }
    if (m.f) fly(m.f, dt);
    for (const f of m.sets ?? []) fly(f, dt);
    if (id === 'wonder') wonder();
    if (id === 'watch-lever') watchLever();
    if (id === 'watch-loads') watchLoads();
    // A run ends once she has settled: hovering, or held down on a tight cable (or after a few seconds more).
    if (m.phase === 'running' && m.time >= m.settleAt && (['hovering', 'taut', 'pad', 'high'].includes(status(m.f)) || m.time >= m.settleAt + 3)) return finishRun(id);
    return null;
  }

  // The wonder: full lever and the load will not come up; a crate comes off, and up she goes.
  function wonder() {
    const t = m.time % 11, f = m.f;
    if (t < m.lastWonder) Object.assign(f, flight({car: 1, crates: 2}, MOST_KG));
    m.lastWonder = t;
    if (t >= 4.5 && f.crates === 2) { f.crates = 1; f.dropped = 1; }
    if (t >= 7.5) f.lift = weightOf(f);
    if (m.time >= 8) seen.add('wonder');
  }
  const LEVER_SCRIPT = [[0, 0], [1, 2 * NOTCH_KG], [3.5, OWN_KG], [6, 5 * NOTCH_KG], [7.5, OWN_KG], [10, 2 * NOTCH_KG]];
  function watchLever() {
    const t = m.time;
    m.f.lift = [...LEVER_SCRIPT].reverse().find(([at]) => t >= at)[1];
    m.best ??= {};
    const s = status(m.f);
    if (s === 'pad' && t > 1.5) m.best.down = true;
    if (s === 'hovering') m.best.hover = true;
    if (s === 'climbing') m.best.climb = true;
    if (t >= 13.5) seen.add('watch-lever');
  }
  function watchLoads() {
    m.sets.forEach((f, i) => { if (m.time >= .8 + i * 2.2) f.lift = Math.min(weightOf(f), MOST_KG); });
    if (m.time >= .8 + 2 * 2.2 + 2.4) seen.add('watch-loads');
  }

  function showAnswer(id) {
    if (id === 'check-heavy') m.sets.forEach(f => { f.lift = Math.min(weightOf(f), MOST_KG); });
    if (id === 'check-more') m.f.lift = weightOf(m.f) + NOTCH_KG;
    if (id === 'check-game') m.f.lift = weightOf(m.f);
    m.answerAt = m.time;
  }

  function finishRun(id) {
    const f = m.f, w = weightOf(f), guided = TRIES[id];
    m.phase = 'result'; m.settleAt = null;
    if (guided) {
      seen.add(id);
      m.result = {actual: guided.actual, right: m.guess === guided.actual};
      return m.result.right ? {kind: 'right', say: guided.right()} : {kind: 'wrong', say: guided.wrong()};
    }
    if (want(f) === 'hover' && f.car && f.crates === BEST_CRATES) { seen.add(id); return {kind: 'pass', say: jobDone(w)}; }
    m.phase = 'setup';
    if (want(f) === 'hover' && !f.car) return {kind: 'fail', say: 'She hovers, but the job needs the Dusthawk on the hook. Press 3 to hook it.'};
    if (want(f) === 'hover') return {kind: 'fail', say: `She hovers with ${kg(w)}, and she can push ${MOST}: room for ${kg(MOST_KG - w)} more. A crate is ${kg(CRATE_KG)}. Add one with 1.`};
    return {kind: 'fail', say: `${kg(w)} is ${kg(w - MOST_KG)} more than the ${MOST} she can push, so the load stays down. Take a crate off with 2.`};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch-lever') { enter(m.index); return null; }
    if (id === 'watch-loads') { m.sets.forEach(f => Object.assign(f, flight(f))); m.time = 0; return null; }
    if (CHECKS[id] && m.phase === 'answered') { const answered = m.answered; enter(m.index); m.answered = answered; m.phase = 'answered'; showAnswer(id); return null; }
    if (TRIES[id] && m.phase === 'result') {
      const f = m.f, lift = f.lift;
      Object.assign(f, {lift: 0, h: 0, taut: 0});
      m.replayAt = m.time; m.replayLift = lift;
      return null;
    }
    return null;
  }

  function view({help = 0} = {}) {
    const s = step(), id = s.id;
    const base = {scene: 'pad', time: m.time, flight: m.f ? drawn(m.f) : null, sets: m.sets?.map(drawn) ?? null, keys: {}, repeat: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), gauge: false, readouts: false, stock: false};
    if (id === 'wonder') return {...base, scene: 'wonder', actions: ['replay'],
      say: 'Kestrel One has the lever all the way up, but the load will not leave the ground. Then one crate comes off, and up she goes. Why?',
      prompt: 'Watch the load on the pad.', hints: ['Watch what happens when the crate comes off.', 'With one crate fewer, the load is lighter, and she can lift it.', 'Press Enter when you are ready to find out why.']};
    if (id === 'word-weight') {
      const done = m.f.crates > 0;
      return {...base, readouts: 'weight', stock: 'crates', keys: done ? {} : {1: 'crate:add'}, waiting: !done, target: done ? null : 'crate:add', glow: done ? null : 'crate:add',
        say: `Weight is how hard the Earth pulls something down. We measure it in kilograms. Kestrel One, her pilot and a full tank weigh ${kg(OWN_KG)}.`,
        prompt: done ? 'Press Enter to go on.' : 'Put a crate on the weighing pad: click the crates, or press 1.',
        hints: ['The crates are stacked on the right of the pad.', 'Click the crates, or press 1.', 'Watch my pointer: it is on the crates.']};
    }
    if (id === 'word-lift') {
      const done = m.f.lift > 0;
      return {...base, readouts: 'lift', keys: done ? {} : {Space: 'rotor'}, waiting: !done, target: done ? null : 'rotor', glow: done ? null : 'rotor', air: done,
        say: 'The rotor is the long blades on top. Spinning, they throw air down, and the air pushes her up. That push is lift, and we measure it in kilograms too.',
        prompt: done ? 'Press Enter to go on.' : 'Start the rotor: click it, or press Space.',
        hints: ['The rotor is on top of Kestrel One.', 'Click the rotor, or press Space.', 'Watch my pointer: it is on the rotor.']};
    }
    if (id === 'word-collective') {
      const done = seen.has(id);
      return {...base, readouts: 'lift', gauge: 'plain', air: true, keys: LEVER_KEYS, repeat: REPEAT, waiting: !done, target: done ? null : 'lever:up', glow: done ? null : 'lever:up', mark: 2 * NOTCH_KG,
        say: 'The collective is the lever by the pilot’s left hand. Pull it up, and every blade bites more air: more lift. In the helicopter, W pulls it up and S lets it down.',
        prompt: done ? 'Press Enter to go on, or try the lever more.' : `Pull the lever up to the ${kg(2 * NOTCH_KG)} mark: press W (or ↑), or drag it.`,
        hints: ['The lever is on the left, with kilograms up its side.', 'Press W once, or drag the lever handle up.', 'Watch my pointer: it is on the lever.']};
    }
    if (id === 'word-hover') {
      const done = seen.has(id);
      return {...base, readouts: 'both', gauge: 'weight', air: true, keys: LEVER_KEYS, repeat: REPEAT, waiting: !done, target: done ? null : 'lever:weight', glow: done ? null : 'lever:weight',
        say: 'To hover is to stay still in the air. She hovers when lift is exactly as big as weight. The red line on the lever is her weight.',
        prompt: done ? 'Press Enter to go on.' : 'Pull the lever up to the red line: press W (or ↑), or drag it.',
        hints: ['Find the red line on the lever: that is her weight.', 'Press W once more, or drag the lever onto the red line.', 'Watch my pointer: it is on the red line.']};
    }
    if (id === 'watch-lever') {
      const st = status(m.f), b = m.best ?? {};
      return {...base, readouts: 'both', gauge: 'weight', air: true, actions: ['replay', 'slow'],
        table: [{label: 'Less lift than weight', value: b.down ? 'stays down' : null}, {label: 'Lift the same as weight', value: b.hover ? 'hovers' : null}, {label: 'More lift than weight', value: b.climb ? 'climbs' : null}],
        say: seen.has(id) ? 'Less lift than weight: she stays down. The same: she hovers. More: she climbs. Less again, and she sinks back.' : `Watch me work the lever. She weighs ${kg(OWN_KG)}. ${caption(st, m.f)}`,
        prompt: seen.has(id) ? 'Press Enter to go on, or R to watch again.' : 'Watch the lift and the weight.',
        hints: ['Watch the green lift number and the red weight number.', 'When they are the same, she hovers.', 'Press R to watch again.']};
    }
    if (id === 'watch-loads') return {...base, scene: 'three', actions: ['replay', 'slow'],
      say: seen.has(id) ? `The Dusthawk and two crates weigh ${kg(weightOf({car: 1, crates: 2}))}, more than the ${MOST} her rotor can push. Every rotor has a most it can push.`
        : `Three loads, and Kestrel One’s lever goes up to her weight each time. The most her rotor can push, near the ground, is ${MOST}.`,
      prompt: seen.has(id) ? 'Press Enter to go on, or R to watch again.' : 'Watch each load in turn.',
      hints: ['Watch each lever go up.', 'The third load is heavier than the most lift.', 'Press R to watch again.']};
    if (TRIES[id] || id === 'alone') return tryView(id, base, help);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id === 'check-heavy' ? 'three' : 'pad', band: id === 'check-game', readouts: id === 'check-heavy' ? false : answered && 'both', gauge: id !== 'check-heavy' && answered && 'weight',
        keys: answered ? {} : PICK_KEYS(3), actions: answered ? ['replay'] : [], waiting: !answered, hideWeights: id === 'check-heavy' && !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a picture: click it, or press 1, 2 or 3.', hints: check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'To hover, the rotor has to push as hard as the Earth pulls her down. More weight needs more push, and every rotor has a most it can give.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function tryView(id, base, help) {
    const guided = TRIES[id], f = m.f;
    const common = {...base, readouts: 'both', gauge: 'weight', air: f.lift > 0, stock: 'all'};
    if (m.phase === 'setup' && guided) return {...common, keys: LOAD_KEYS, waiting: true, target: guided.target, glow: guided.target,
      say: guided.setupSay, prompt: guided.setupPrompt, hints: guided.setupHints};
    if (m.phase === 'setup') {
      const target = !f.car ? 'car' : f.crates < BEST_CRATES ? 'crate:add' : f.crates > BEST_CRATES ? 'crate:remove' : 'lever:weight';
      return {...common, keys: {...LOAD_KEYS, ...LEVER_KEYS}, repeat: REPEAT, waiting: true, target,
        say: 'A job for you: lift the Dusthawk with as many crates as she can carry. Load her up, then hover.',
        prompt: 'Crates: 1 adds, 2 takes off. Then hold W (or drag the lever) up to the red line.',
        hints: [`She can push ${MOST}. How much room is left with the Dusthawk on?`, `With the Dusthawk she weighs ${kg(weightOf({car: 1}))}. Each crate adds ${kg(CRATE_KG)}. How many fit under ${MOST}?`,
          target === 'lever:weight' ? 'Watch my pointer: it is on the red line.' : target === 'car' ? 'Watch my pointer: it is on the Dusthawk.' : 'Watch my pointer: it is on the crates.']};
    }
    if (m.phase === 'guess') return {...common, keys: PICK_KEYS(2), waiting: true,
      cards: GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture, state: null})),
      say: guided.guessSay(), prompt: 'Pick a card: click it, or press 1 or 2.', hints: guided.guessHints};
    if (m.phase === 'lever') return {...common, keys: LEVER_KEYS, repeat: REPEAT, waiting: true, target: guided.leverTarget, glow: guided.leverTarget, guess: m.guess,
      say: guided.leverSay, prompt: guided.leverPrompt, hints: LEVER_HINTS(guided.leverTarget)};
    if (m.phase === 'running') return {...common, guess: m.guess, say: 'Watch the load.', prompt: 'Watch the load on the pad.', hints: ['Watch the load.', 'Watch the lift and the weight.', 'Wait a moment.']};
    const right = guided ? m.result.right : true;
    return {...common, actions: ['replay'], guess: m.guess, ready: true, mood: right ? 'cheer' : 'explain',
      cards: guided ? GUESSES.map((g, i) => ({id: `guess:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: g.id === m.result.actual ? 'right' : g.id === m.guess ? 'wrong' : null})) : [],
      say: guided ? (right ? guided.right() : guided.wrong()) : jobDone(weightOf(f)),
      prompt: 'Press Enter to go on, or R to watch again.', hints: ['Press R to watch it again.', 'Press Enter to go on.', 'Press Enter to go on.']};
  }

  return {enter, act, tick, view, state: () => m};
}

const jobDone = w => `That’s it: the Dusthawk and ${BEST_CRATES} crate${BEST_CRATES > 1 ? 's' : ''}, ${kg(w)}, and she hovers. One more crate would be too heavy. Job done.`;
// What Brian says about where she is, during his lever demonstration.
function caption(st, f) {
  if (st === 'pad') return f.lift > 0 ? `${kg(f.lift)} of lift is less than her weight: she stays on the pad.` : 'The lever is down: no lift.';
  if (st === 'hovering') return `${kg(f.lift)} of lift, the same as her weight: she hovers.`;
  if (st === 'climbing' || st === 'high') return `${kg(f.lift)} of lift, more than her weight: she climbs.`;
  if (st === 'sinking') return `${kg(f.lift)}, less than her weight: she sinks.`;
  return 'Lift and weight are nearly the same.';
}

export const lesson = Object.freeze({id: 'lift', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD});
