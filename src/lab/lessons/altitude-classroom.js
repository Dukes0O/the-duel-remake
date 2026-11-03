// Air and altitude as a classroom lesson (docs/board/cards/LAB-CLASSROOM-ALTITUDE.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every lift is the altitude bench's own run (altitudeBench, the
// challenge's bench, which reads the helicopter's thrust at each place), and every weight is the Lift lesson's pad.
import {altitudeBench, SITES} from '../benches/altitude.js';
import {KESTREL, PAD, padForces} from '../benches/lift-pad.js';

// The three places, foot of the mountain to the top, and what the stand measures at each.
export const PLACES = Object.freeze(Object.keys(SITES));
const RUNS = PLACES.map(site => altitudeBench.run({site}));
export const NAME = Object.freeze(PLACES.map(p => SITES[p].name));
export const HEIGHT = Object.freeze(RUNS.map(r => r.altitudeM));
// The most her rotor pushes near the ground at each place, as the Lift lesson's 3,887 kg at sea level.
export const MOST = Object.freeze(RUNS.map(r => r.liftKg));
// The air a jar scooped there holds, of the sea's 100 (the true air), and her push against the sea's.
export const AIR = Object.freeze(RUNS.map(r => r.trueShare));
export const LIFT_SHARE = Object.freeze(RUNS.map(r => r.liftShare));
const SEA = 0, RIDGE = 1, SUMMIT = 2;

export const OWN_KG = padForces({fuel: KESTREL.tankKg}, 0).massKg;
export const CRATE_KG = PAD.crateKg, CAR_KG = PAD.carKg;
// The rack holds one crate more than she can lift at sea, so too many can be tried everywhere.
export const RACK = 5;
export const weightOf = ({crates = 0, car = 0} = {}) => OWN_KG + crates * CRATE_KG + car * CAR_KG;
// How far up the lever has to go for her to hover: her weight over the most she can push there.
export const hoverShare = (place, load = {}) => weightOf(load) / MOST[place];
export const bestCrates = place => Math.floor((MOST[place] - OWN_KG) / CRATE_KG);
// The flight rule's burn: a little at idle, more for every bit of lever.
export const fuelPerMinute = lever => (KESTREL.burnIdle + KESTREL.burnPerCollective * Math.min(1, lever)) * 60;
// The challenge's crate (lab-challenges.js, CHALLENGE_RULES.altitude).
export const GAME_CRATE_KG = 300;

export const kg = value => `${Math.round(value).toLocaleString('en-GB')} kg`;
export const pct = share => `${Math.round(share * 100)}%`;
export const metres = value => `${value.toLocaleString('en-GB')} m`;
export const bits = share => Math.round(share * 100);
const perMinute = value => `${value.toFixed(1)} kg a minute`;
const CAR_W = weightOf({car: 1}), HOVER_SEA = hoverShare(SEA), HOVER_TOP = hoverShare(SUMMIT);
const GAME_SEA = hoverShare(SEA, {crates: GAME_CRATE_KG / CRATE_KG}), GAME_TOP = hoverShare(SUMMIT, {crates: GAME_CRATE_KG / CRATE_KG});
const CRATE_WORDS = ['no crates', 'one crate', 'two crates', 'three crates', 'four crates', 'five crates'];
const crateWords = n => CRATE_WORDS[n] ?? `${n} crates`;
const cap = s => s[0].toUpperCase() + s.slice(1);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why won’t it lift up there?'},
  {id: 'word-altitude', part: 1, title: 'Altitude', word: 'altitude-altitude'},
  {id: 'word-density', part: 1, title: 'Air density', word: 'altitude-air-density'},
  {id: 'word-thin', part: 1, title: 'Thin air', word: 'altitude-thin-air'},
  {id: 'watch', part: 2, title: 'Three places', voice: 'lab.brian.altitude.intro'},
  {id: 'try-car', part: 3, title: 'The Dusthawk up high'},
  {id: 'try-lever', part: 3, title: 'The lever up high'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-why', part: 5, title: 'Question 1 of 3'},
  {id: 'check-car', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.altitude.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'thin', text: `Higher up the air is thinner: at ${NAME[SUMMIT]}, ${metres(HEIGHT[SUMMIT])} up, a jar holds ${bits(AIR[SUMMIT])} bits of air where the sea’s holds 100.`},
  {id: 'load', text: `Thin air, less lift: ${kg(MOST[SEA])} at the sea, ${kg(MOST[SUMMIT])} at the top. Plan the load: ${bestCrates(SEA)} crates, then ${bestCrates(SUMMIT)}.`},
  {id: 'fuel', text: `Up high she needs more lever just to hover, ${pct(HOVER_TOP)} instead of ${pct(HOVER_SEA)}, so she burns fuel faster. Fly straight there.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Thin air, less lift.',
  text: `Carry a ${GAME_CRATE_KG} kg crate up to ${NAME[SUMMIT]} and land with 30% of the tank left. Fly straight there: up high every minute burns more fuel.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'altitude-altitude', word: 'Altitude', meaning: 'Altitude is how high a place is above the sea, in metres.'},
  {id: 'altitude-air-density', word: 'Air density', meaning: 'Air density is how much air is packed into one space, such as one jar.'},
  {id: 'altitude-thin-air', word: 'Thin air', meaning: 'Thin air is air with less packed in, as it is high up. It gives a rotor less to push on.'},
].map(Object.freeze));

// ---- the flight on the pad: where she is, her load and the lever (0 to 1, as the game's collective) ----
export const HOVER_M = 1, CEILING_M = 4;
const SETTLE_S = 1.6, LEVER_RATE = .8;
const flight = (place, load = {}) => ({place, crates: load.crates ?? 0, car: load.car ?? 0, lever: 0, h: 0});
const loaded = f => f.crates > 0 || f.car > 0;
const liftOf = f => f.lever * MOST[f.place];
function want(f) {
  const w = weightOf(f), lift = liftOf(f);
  return lift > w + .5 ? 'climb' : lift >= w - .5 ? 'hover' : 'down';
}
function fly(f, dt) {
  const mode = want(f), w = weightOf(f);
  if (mode === 'climb') f.h = Math.min(CEILING_M, f.h + Math.min(3, .8 + (liftOf(f) - w) / 600) * dt);
  else if (mode === 'hover') f.h = f.h < HOVER_M ? Math.min(HOVER_M, f.h + dt) : Math.max(HOVER_M, f.h - dt);
  else f.h = Math.max(0, f.h - 2.5 * dt);
}
export function status(f) {
  const mode = want(f);
  if (mode === 'down') return f.h > 0 ? 'sinking' : f.lever > 0 && loaded(f) ? 'stays' : 'pad';
  if (mode === 'hover') return f.h >= HOVER_M - .01 ? 'hovering' : 'rising';
  return 'climbing';
}
// Notches of a tenth, the red line and the top. A held key stops at the red line; a fresh press goes past it.
function levels(f) {
  const out = Array.from({length: 11}, (_, i) => i / 10), r = hoverShare(f.place, f);
  if (r < 1) out.push(r);
  return [...new Set(out)].sort((a, b) => a - b);
}
function notch(f, dir, held) {
  if (held && Math.abs(f.lever - hoverShare(f.place, f)) < 1e-6) return false;
  const all = levels(f), next = dir > 0 ? all.find(n => n > f.lever + 1e-6) : [...all].reverse().find(n => n < f.lever - 1e-6);
  if (next === undefined) return false;
  f.lever = next; return true;
}
// A drag sets the lever anywhere; it clicks onto the red line or the top stop when close.
function setLever(f, value) {
  const r = hoverShare(f.place, f);
  let lever = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  if (r <= 1 && Math.abs(lever - r) <= .04) lever = r;
  else if (1 - lever <= .03) lever = 1;
  else lever = Math.round(lever * 100) / 100;
  if (Math.abs(lever - f.lever) < 1e-6) return false;
  f.lever = lever; return true;
}
const drawn = f => f && ({place: f.place, crates: f.crates, car: f.car, lever: f.lever, lift: liftOf(f), weight: weightOf(f), most: MOST[f.place],
  hover: hoverShare(f.place, f), h: f.h, status: status(f), air: AIR[f.place], name: NAME[f.place], height: HEIGHT[f.place]});

// ---- keys (the screen shows them on its buttons and the board) ----
const PLACE_KEYS = Object.freeze({'↑': 'place:up', '↓': 'place:down'});
const LEVER_KEYS = Object.freeze({W: 'lever:up', '↑': 'lever:up', S: 'lever:down', '↓': 'lever:down'});
const LEVER_REPEAT = Object.freeze(['W', '↑', 'S', '↓']);
const LOAD_KEYS = Object.freeze({1: 'crate:add', 2: 'crate:remove', Space: 'go'});
const PICK_KEYS = n => Object.fromEntries(Array.from({length: n}, (_, i) => [String(i + 1), `${n === 2 ? 'guess' : 'answer'}:${i}`]));
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const UP_HINTS = ['The mountain is on the left: Sea level at the foot, Summit Run at the top.', 'Press ↑ until the stand is at Summit Run, or click Summit Run.', 'Watch my pointer: it is on Summit Run.'];

// ---- the guided tries ----
const CAR_GUESSES = Object.freeze([
  {id: 'up', label: 'Yes, she lifts it', picture: {kind: 'verdict', up: true}},
  {id: 'down', label: 'No, it stays down', picture: {kind: 'verdict', up: false}},
]);
const LEVER_GUESSES = Object.freeze([
  {id: 'lower', label: `Lower than ${pct(HOVER_SEA)}`, picture: {kind: 'lever', at: .3, ghost: HOVER_SEA}},
  {id: 'same', label: `The same, ${pct(HOVER_SEA)}`, picture: {kind: 'lever', at: HOVER_SEA, ghost: HOVER_SEA}},
  {id: 'higher', label: `Higher than ${pct(HOVER_SEA)}`, picture: {kind: 'lever', at: HOVER_TOP, ghost: HOVER_SEA}},
]);
const tooHeavy = MOST_TOP => kg(CAR_W - MOST_TOP);
const leverWhy = `Thinner air, so more lever just to hover, and more fuel: ${perMinute(fuelPerMinute(HOVER_TOP))}, against ${fuelPerMinute(HOVER_SEA).toFixed(1)} at the sea.`;

// ---- the checks ----
const CHECKS = {
  'check-why': {
    question: `Why can she push less at ${NAME[SUMMIT]}?`,
    answers: [{label: 'The air is thinner: less air for the blades to throw down', picture: {kind: 'jars'}},
      {label: 'She is heavier up there', picture: {kind: 'heavier'}}, {label: 'Her rotor spins slower up there', picture: {kind: 'slower'}}],
    correct: 0,
    right: () => `Yes. A jar of air at ${NAME[SUMMIT]} holds ${bits(AIR[SUMMIT])} bits where the sea’s holds 100, so each sweep of the blades has less to throw down.`,
    wrong: picked => picked === 1 ? `Her weight is the same everywhere: ${kg(OWN_KG)} at the sea and on the summit. What changes is the air: ${bits(AIR[SUMMIT])} bits in a jar instead of 100.`
      : `Her rotor spins just as fast up there. What changes is the air: each sweep has ${bits(AIR[SUMMIT])} bits to throw down where the sea had 100.`,
    hints: ['Think of the two jars.', 'Her weight and her rotor are the same at every place. What is not?', 'Pick “The air is thinner”.'],
  },
  'check-car': {
    question: `Where can she lift the Dusthawk (${kg(CAR_W)} with her)?`,
    answers: [{label: 'Only at Sea level', lifts: [true, false, false]}, {label: 'Sea level and Panorama Ridge', lifts: [true, true, false]}, {label: 'All three places', lifts: [true, true, true]}]
      .map(a => ({...a, picture: {kind: 'places', lifts: a.lifts}})),
    correct: 1,
    right: () => `Yes. ${kg(CAR_W)} is less than ${kg(MOST[SEA])} at the sea and ${kg(MOST[RIDGE])} at the Ridge, but more than the ${kg(MOST[SUMMIT])} she can push at ${NAME[SUMMIT]}.`,
    wrong: picked => picked === 0 ? `At ${NAME[RIDGE]} she can still push ${kg(MOST[RIDGE])}, more than ${kg(CAR_W)}: she lifts it there too. Only ${NAME[SUMMIT]} is too high.`
      : `At ${NAME[SUMMIT]} she can push only ${kg(MOST[SUMMIT])}: ${tooHeavy(MOST[SUMMIT])} short of ${kg(CAR_W)}, so it stays down there.`,
    hints: [`The most she can push: ${kg(MOST[SEA])}, ${kg(MOST[RIDGE])}, ${kg(MOST[SUMMIT])}.`, `Which of those are more than ${kg(CAR_W)}?`, 'Pick “Sea level and Panorama Ridge”.'],
  },
  'check-game': {
    question: `In the game you carry a ${GAME_CRATE_KG} kg crate up to ${NAME[SUMMIT]} and must land with 30% of the tank left. What helps?`,
    answers: [{label: 'Fly straight there and land', picture: {kind: 'route', what: 'straight'}},
      {label: 'Keep the lever all the way up', picture: {kind: 'route', what: 'lever'}}, {label: 'Fill up at a pump on the way', picture: {kind: 'route', what: 'pump'}}],
    correct: 0,
    right: () => `Yes. With the crate she needs ${pct(GAME_TOP)} of the lever to hover at ${NAME[SUMMIT]}, against ${pct(GAME_SEA)} at the sea: ${perMinute(fuelPerMinute(GAME_TOP))} instead of ${perMinute(fuelPerMinute(GAME_SEA))}. Don’t hang about up there.`,
    wrong: picked => picked === 1 ? `The lever all the way up burns the most: ${perMinute(fuelPerMinute(1))}. Use only the lever she needs, and fly straight there.`
      : 'Refuelling once the crate is on the hook does not count in this challenge: it is one tank. Fly straight there.',
    hints: ['Up high, every minute burns more fuel.', 'More lever, more fuel. And this challenge is one tank.', 'Pick “Fly straight there and land”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];

  function enter(index) {
    m = {index, time: 0, phase: 'set', f: null, sets: null, guess: null, answered: null, result: null, say: '', settleAt: null, scoop: null, rows: [], delivery: 0};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.sets = [flight(SEA, {car: 1}), flight(SUMMIT, {car: 1})]; m.phase = 'running'; }
    if (id === 'word-altitude') m.f = flight(SEA);
    if (id === 'word-density' || id === 'word-thin') m.f = flight(SUMMIT);
    if (id === 'watch') { m.f = flight(SEA); m.phase = 'running'; }
    if (id === 'try-car') { m.f = flight(SEA, {car: 1}); m.phase = 'setup'; }
    if (id === 'try-lever') { m.f = flight(SEA); m.phase = 'setup'; }
    if (id === 'alone') m.f = flight(SEA);
    if (CHECKS[id]) m.phase = 'ask';
  }

  // ↑ and ↓ move the stand a place up or down the mountain; a click goes straight to a place.
  function move(kind, value) {
    const f = m.f, to = value === 'up' ? f.place + 1 : value === 'down' ? f.place - 1 : Number(value);
    if (!Number.isInteger(to)) return null;
    if (to < SEA) return {kind: 'note', say: 'Sea level is as low as she goes: 0 m.'};
    if (to > SUMMIT) return {kind: 'note', say: `${NAME[SUMMIT]} is as high as the stand goes: ${metres(HEIGHT[SUMMIT])}.`};
    if (to === f.place) return null;
    f.place = to; f.lever = 0; f.h = 0;
    return {kind: 'sound', sound: 'lab.tick'};
  }
  const placeLine = place => `${NAME[place]}: ${metres(HEIGHT[place])} above the sea.`;

  function act(action) {
    const id = step().id, [kind, value, extra] = action.split(':');
    if (kind === 'replay') return replay();
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (id === 'word-altitude') {
      if (kind !== 'place' || seen.has(id)) return null;
      const moved = move(kind, value);
      if (moved?.kind !== 'sound') return moved;
      if (m.f.place === SUMMIT) { seen.add(id); m.say = `${placeLine(SUMMIT)} That is its altitude: how high a place is above the sea.`; return {kind: 'right', sound: 'lab.tick', say: m.say}; }
      return {kind: 'progress', sound: 'lab.tick', say: m.f.place === RIDGE ? `${placeLine(RIDGE)} Once more, up to ${NAME[SUMMIT]}.` : `${placeLine(SEA)} Up to ${NAME[SUMMIT]}.`};
    }
    if (id === 'word-density') {
      if (kind !== 'scoop' || m.phase !== 'set') return null;
      m.phase = 'running'; m.scoop = {at: m.time};
      return {kind: 'progress', say: 'The lid comes off, the jar fills with the air up here, and the lid goes back on.'};
    }
    if (id === 'word-thin') {
      if (kind !== 'rotor' || m.phase !== 'set') return null;
      m.phase = 'running'; m.settleAt = null;
      return {kind: 'progress', say: 'Rotor on, and the lever all the way up. Watch the green arrow: her push.'};
    }
    if (id === 'try-car' || id === 'try-lever') return tryAct(id, kind, value, extra);
    if (id === 'alone' && kind === 'crate') return load(value);
    if (id === 'alone' && kind === 'go') return liftOff();
    return null;
  }

  function moveLever(kind, value, extra) {
    const f = m.f;
    if (kind === 'lever' && value === 'up') return notch(f, 1, extra === 'held');
    if (kind === 'lever' && value === 'down') return notch(f, -1, extra === 'held');
    if (kind === 'lever' && value === 'top') return setLever(f, 1);
    if (kind === 'lever' && value === 'weight') return setLever(f, hoverShare(f.place, f));
    if (kind === 'hold') return setLever(f, Number(value));
    return false;
  }

  function tryAct(id, kind, value, extra) {
    const f = m.f, car = id === 'try-car';
    if (m.phase === 'setup') {
      if (kind !== 'place') return null;
      const moved = move(kind, value);
      if (moved?.kind !== 'sound') return moved;
      if (f.place !== SUMMIT) return {kind: 'progress', sound: 'lab.tick', say: f.place === RIDGE ? `${placeLine(RIDGE)} Once more, up to ${NAME[SUMMIT]}.` : `${placeLine(SEA)} Up to ${NAME[SUMMIT]}.`};
      m.phase = 'guess';
      return {kind: 'progress', sound: 'lab.tick', say: car ? `${NAME[SUMMIT]}, ${metres(HEIGHT[SUMMIT])}. With the Dusthawk she weighs ${kg(CAR_W)}, and up here the most she can push is ${kg(MOST[SUMMIT])}. Will it lift?`
        : `${NAME[SUMMIT]}, ${metres(HEIGHT[SUMMIT])}. At Sea level the red line was at ${pct(HOVER_SEA)}. Up here, where will it be?`};
    }
    if (m.phase === 'guess') {
      const picks = car ? CAR_GUESSES : LEVER_GUESSES, kindOf = car ? 'guess' : 'answer', pick = picks[Number(value)];
      if (kind !== kindOf || !pick) return null;
      m.guess = pick.id; m.phase = 'lever';
      return {kind: 'progress', say: car ? 'Now pull the lever all the way up: hold W.' : `Here it is: the red line is at ${pct(HOVER_TOP)}. Pull the lever up to it: hold W.`};
    }
    if (m.phase !== 'lever' || !moveLever(kind, value, extra)) return null;
    if (car) {
      if (f.lever >= 1 - 1e-6) { m.phase = 'running'; m.settleAt = m.time + SETTLE_S; return {kind: 'progress', say: 'Lever all the way up. Watch the Dusthawk.'}; }
      return null;
    }
    const mode = want(f);
    if (mode === 'climb') return {kind: 'fail', say: `Past the red line: ${kg(liftOf(f))} of push against her ${kg(OWN_KG)}, so she climbs. Bring the lever back to the line with S.`};
    if (mode === 'hover') { m.phase = 'running'; m.settleAt = m.time + SETTLE_S; return {kind: 'progress', say: 'On the red line. Watch her.'}; }
    return null;
  }

  // Brian's job: one delivery at each place, as many crates as she can lift and still hover.
  function load(way) {
    const f = m.f;
    if (m.phase !== 'set') return null;
    if (way === 'add' && f.crates >= RACK) return {kind: 'note', say: `All ${RACK} crates are on.`};
    if (way === 'remove' && f.crates <= 0) return {kind: 'note', say: 'There are no crates on her to take off.'};
    f.crates += way === 'add' ? 1 : -1; f.lever = 0; f.h = 0;
    return {kind: 'sound', sound: 'lab.clunk'};
  }
  function liftOff() {
    if (m.phase !== 'set') return null;
    m.phase = 'running'; m.settleAt = null;
    return {kind: 'progress', say: `${cap(crateWords(m.f.crates))}, ${kg(weightOf(m.f))}. Lever up: watch her.`};
  }

  function judgeJob() {
    const f = m.f, w = weightOf(f), most = MOST[f.place], best = bestCrates(f.place), here = NAME[f.place];
    m.settleAt = null;
    const reset = () => { m.phase = 'set'; f.lever = 0; f.h = 0; };
    if (w > most + .5) { reset(); return {kind: 'fail', say: `${kg(w)} is ${kg(w - most)} more than the ${kg(most)} she can push at ${here}: the load stays down. Take a crate off with 2.`}; }
    if (f.crates < best) { reset(); return {kind: 'fail', say: `She hovers with ${kg(w)}, and at ${here} she can push ${kg(most)}: room for ${kg(most - w)} more. A crate is ${kg(CRATE_KG)}. Add one with 1.`}; }
    m.delivery += 1;
    if (m.delivery >= PLACES.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `${cap(crateWords(bestCrates(SEA)))} at Sea level, ${crateWords(bestCrates(RIDGE))} at ${NAME[RIDGE]}, ${crateWords(bestCrates(SUMMIT))} at ${NAME[SUMMIT]}. The higher the place, the thinner the air, and the less she can carry. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    m.say = `Right: ${crateWords(f.crates)}, ${kg(w)}, and she hovers. One more would be too heavy. Next: ${NAME[m.delivery]}, ${metres(HEIGHT[m.delivery])} up.`;
    m.f = flight(m.delivery); m.phase = 'set';
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    for (const f of m.sets ?? []) fly(f, dt);
    if (id === 'wonder') return wonder();
    if (id === 'watch') return watch(dt);
    if (m.f) fly(m.f, dt);
    if (id === 'word-density' && m.phase === 'running' && m.time - m.scoop.at >= 1.4) {
      m.phase = 'done'; seen.add(id);
      m.say = `The same jar holds only ${bits(AIR[SUMMIT])} bits of air up here, where the sea’s held 100. Less air packed into the same space: lower air density.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-thin' && m.phase === 'running') {
      if (m.f.lever < 1) { m.f.lever = Math.min(1, m.f.lever + LEVER_RATE * dt); if (m.f.lever >= 1) m.settleAt = m.time + 1; return null; }
      if (m.time < m.settleAt) return null;
      m.phase = 'done'; seen.add(id);
      m.say = `Lever all the way up: ${kg(MOST[SUMMIT])} of push here, against ${kg(MOST[SEA])} at Sea level, ${pct(LIFT_SHARE[SUMMIT])} as much. Fewer bits of air for the blades to throw down, and the engine breathes the same thin air.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'alone' && m.phase === 'running') {
      const goal = Math.min(1, hoverShare(m.f.place, m.f));
      if (m.f.lever < goal) { m.f.lever = Math.min(goal, m.f.lever + LEVER_RATE * dt); if (m.f.lever >= goal) m.settleAt = m.time + SETTLE_S; return null; }
      if (m.settleAt == null) m.settleAt = m.time + SETTLE_S;
      if (m.time >= m.settleAt) return judgeJob();
      return null;
    }
    if ((id === 'try-car' || id === 'try-lever') && m.phase === 'running' && m.time >= m.settleAt) return finishTry(id);
    return null;
  }

  function finishTry(id) {
    m.phase = 'result'; m.settleAt = null; seen.add(id);
    if (id === 'try-car') {
      const right = m.guess === 'down';
      m.result = {actual: 'down', right};
      m.say = right ? `Right! ${kg(CAR_W)} against the ${kg(MOST[SUMMIT])} she can push up here: ${tooHeavy(MOST[SUMMIT])} too heavy, so it stays down. The load did not change; the air did.`
        : `It stays down: ${kg(CAR_W)} against the ${kg(MOST[SUMMIT])} she can push up here, ${tooHeavy(MOST[SUMMIT])} too heavy. At the sea she had ${kg(MOST[SEA])}. The load did not change; the air did.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    const right = m.guess === 'higher';
    m.result = {actual: 'higher', right};
    m.say = right ? `Right: ${pct(HOVER_TOP)}. ${leverWhy}` : `It went higher: ${pct(HOVER_TOP)}, not ${m.guess === 'same' ? pct(HOVER_SEA) : `under ${pct(HOVER_SEA)}`}. ${leverWhy}`;
    return {kind: right ? 'right' : 'wrong', say: m.say};
  }

  // The wonder: the same load, the lever all the way up at both places; it lifts at the sea and stays down up high.
  function wonder() {
    const t = m.time;
    if (t >= .6) for (const f of m.sets) f.lever = 1;
    if (t >= 4.5 && !seen.has('wonder')) seen.add('wonder');
    return null;
  }
  // The watch: the stand visits each place in turn, the lever goes all the way up, and the table fills in.
  const WATCH_AT = [.6, 3.8, 7], WATCH_END = 10.2;
  function watch(dt) {
    const t = m.time, f = m.f, at = WATCH_AT.findLastIndex(a => t >= a);
    if (at >= 0 && f.place !== at) { f.place = at; f.lever = 0; f.h = 0; }
    if (at >= 0 && t >= WATCH_AT[at] + .5) f.lever = Math.min(1, f.lever + LEVER_RATE * dt);
    fly(f, dt);
    for (let i = 0; i < PLACES.length; i++) if (t >= WATCH_AT[i] + 2.3 && !m.rows[i]) m.rows[i] = {name: NAME[i], height: HEIGHT[i], air: AIR[i], most: MOST[i]};
    if (t >= WATCH_END && !seen.has('watch')) { seen.add('watch'); m.phase = 'done'; }
    return null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  function view() {
    const id = step().id;
    const base = {scene: 'stand', time: m.time, flight: drawn(m.f), sets: m.sets?.map(drawn) ?? null, keys: {}, repeat: [], cards: [], actions: [], target: null, glow: null,
      waiting: false, ready: seen.has(id), mountain: true, jar: null, readouts: null, lever: null, table: null, rack: false};
    const here = m.f?.place ?? SEA;
    if (id === 'wonder') return {...base, scene: 'wonder', actions: ['replay'],
      say: seen.has(id) ? `Same helicopter, same Dusthawk, the lever all the way up. At Sea level she lifts it. At ${NAME[SUMMIT]} it will not leave the ground. What changed?`
        : `Kestrel One with the Dusthawk on her hook, at Sea level and at ${NAME[SUMMIT]}. Both pull the lever all the way up.`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the two pads.',
      hints: ['Watch the two cars.', 'Same helicopter, same car. Only the place is different.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch, then press Enter.']};
    if (id === 'word-altitude') {
      const done = seen.has(id);
      return {...base, keys: done ? {} : PLACE_KEYS, waiting: !done, target: done ? null : 'place:2', glow: done ? null : 'mountain',
        say: done ? m.say : `Altitude is how high a place is above the sea. Kestrel One’s stand is at Sea level, 0 m. Take her up to ${NAME[SUMMIT]}.`,
        prompt: done ? 'Press Enter to go on.' : `Press ↑ to move the stand up the mountain, or click ${NAME[SUMMIT]}.`, hints: done ? DONE : UP_HINTS};
    }
    if (id === 'word-density') {
      const done = m.phase === 'done', filling = m.phase === 'running';
      const fill = done ? AIR[SUMMIT] : filling ? AIR[SUMMIT] * Math.min(1, (m.time - m.scoop.at) / 1.2) : 0;
      return {...base, jar: {share: fill, sea: true, scooping: filling}, keys: m.phase === 'set' ? {Space: 'scoop'} : {}, waiting: m.phase === 'set', target: m.phase === 'set' ? 'scoop' : null, glow: m.phase === 'set' ? 'jar' : null,
        say: done ? m.say : 'Air density is how much air is packed into one space. The jar on the right was filled at Sea level: 100 bits of air. Scoop a jar of the air up here.',
        prompt: done ? 'Press Enter to go on.' : filling ? 'Watch the jar.' : 'Press Space to scoop, or click the empty jar.',
        hints: done ? DONE : ['The empty jar is on the right, beside the sea’s.', 'Press Space.', 'Watch my pointer: it is on the jar.']};
    }
    if (id === 'word-thin') {
      const done = m.phase === 'done', set = m.phase === 'set';
      return {...base, jar: {share: AIR[SUMMIT]}, readouts: {most: true, seaMost: true}, lever: {red: false}, air: !set,
        keys: set ? {Space: 'rotor'} : {}, waiting: set, target: set ? 'rotor' : null, glow: set ? 'rotor' : null,
        say: done ? m.say : `Thin air is air with less packed in, as it is up here. Start her rotor and pull the lever all the way up, and see what thin air does to her push.`,
        prompt: done ? 'Press Enter to go on.' : set ? 'Press Space to start the rotor, or click it.' : 'Watch the green arrow.',
        hints: done ? DONE : ['The rotor is the long blades on top of Kestrel One.', 'Press Space.', 'Watch my pointer: it is on the rotor.']};
    }
    if (id === 'watch') {
      const done = seen.has(id);
      return {...base, jar: {share: AIR[here]}, readouts: {most: true}, lever: {red: false}, air: m.f.lever > 0, actions: ['replay', 'slow'],
        table: PLACES.map((_, i) => m.rows[i] ?? null),
        say: done ? `The higher the place, the less air in a jar, and the less she can push: ${kg(MOST[SEA])}, ${kg(MOST[RIDGE])}, ${kg(MOST[SUMMIT])}.`
          : 'The stand visits each place in turn. At each, the lever goes all the way up and we write down her push.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the jar and the green arrow.',
        hints: ['Watch the jar at each place.', 'And watch the most she can push.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-car' || id === 'try-lever') return tryView(id, base);
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: 'check', mountain: false, keys: answered ? {} : PICK_KEYS(3), waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        check: id, answered,
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', mountain: false, ready: true, ideas: KEY_IDEAS,
      say: `Higher up the air is thinner, so the rotor has less to push on. Plan your load for the high country, and fly straight there: up high she burns fuel faster.`,
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function tryView(id, base) {
    const f = m.f, car = id === 'try-car';
    const common = {...base, jar: {share: AIR[f.place]}, readouts: {most: true, weight: true, hover: !car && m.phase !== 'setup' && m.phase !== 'guess'},
      lever: {red: !car && m.phase !== 'setup' && m.phase !== 'guess', ghost: car ? null : HOVER_SEA, unknown: !car && (m.phase === 'setup' || m.phase === 'guess')}, air: f.lever > 0};
    if (m.phase === 'setup') return {...common, keys: PLACE_KEYS, waiting: true, target: 'place:2', glow: 'mountain',
      say: m.say || (car ? `At Sea level she lifts the Dusthawk: ${kg(CAR_W)} against the ${kg(MOST[SEA])} she can push. Take her up to ${NAME[SUMMIT]} with it.`
        : `No load now. At Sea level the red line, the lever that hovers her, is at ${pct(HOVER_SEA)}. Take her up to ${NAME[SUMMIT]}.`),
      prompt: `Press ↑ to move the stand up, or click ${NAME[SUMMIT]}.`, hints: UP_HINTS};
    if (m.phase === 'guess') {
      const picks = car ? CAR_GUESSES : LEVER_GUESSES;
      return {...common, keys: PICK_KEYS(picks.length), waiting: true,
        cards: picks.map((g, i) => ({id: `${car ? 'guess' : 'answer'}:${i}`, key: String(i + 1), label: g.label, picture: g.picture, state: null})),
        say: car ? `With the Dusthawk she weighs ${kg(CAR_W)}. Up here the most she can push is ${kg(MOST[SUMMIT])}. Will it lift?` : `At Sea level the red line was at ${pct(HOVER_SEA)}. Up here, where will it be?`,
        prompt: `Pick a card: click it, or press 1${picks.length === 3 ? ', 2 or 3' : ' or 2'}.`,
        hints: car ? [`Compare ${kg(CAR_W)} of weight with ${kg(MOST[SUMMIT])} of push.`, 'If the weight is bigger than the most push, it stays down.', 'Any guess is fine. Pick one, then we test it.']
          : ['Up here each sweep of the blades throws less air.', 'Less push for the same lever. So to push her weight, the lever must go…', 'Any guess is fine. Pick one, then we test it.']};
    }
    if (m.phase === 'lever') {
      const target = car ? 'lever:top' : 'lever:weight';
      return {...common, keys: LEVER_KEYS, repeat: LEVER_REPEAT, waiting: true, target, glow: target, guess: m.guess,
        say: car ? 'Now pull the lever all the way up.' : `The red line is at ${pct(HOVER_TOP)}. Pull the lever up to it.`,
        prompt: car ? 'Hold W (or ↑), or drag the lever, all the way to the top.' : 'Hold W (or ↑), or drag the lever, up to the red line.',
        hints: car ? ['The lever is on the left of the pad.', 'Hold W until the lever stops at the top.', 'Watch my pointer: it is on the top of the lever.']
          : ['The red line is her weight at this place.', 'Hold W until the lever reaches the red line. It stops there for you.', 'Watch my pointer: it is on the red line.']};
    }
    if (m.phase === 'running') return {...common, guess: m.guess, say: car ? 'Lever all the way up. Watch the Dusthawk.' : 'On the red line. Watch her.', prompt: 'Watch the pad.', hints: ['Watch the load.', 'Watch the push and the weight.', 'Wait a moment.']};
    const picks = car ? CAR_GUESSES : LEVER_GUESSES;
    return {...common, ready: true, mood: m.result.right ? 'cheer' : 'explain', guess: m.guess, readouts: {...common.readouts, fuel: !car},
      cards: picks.map((g, i) => ({id: `${car ? 'guess' : 'answer'}:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: g.id === m.result.actual ? 'right' : g.id === m.guess ? 'wrong' : null})),
      say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
  }

  function jobView(base) {
    const f = m.f, best = bestCrates(f.place), done = m.phase === 'done';
    const job = {delivery: Math.min(m.delivery, PLACES.length - 1) + 1, of: PLACES.length, done};
    const common = {...base, jar: {share: AIR[f.place]}, readouts: {most: true, weight: true}, lever: {red: true}, rack: true, job, air: f.lever > 0};
    if (done) return {...common, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (m.phase === 'running') return {...common, say: `${cap(crateWords(f.crates))}, ${kg(weightOf(f))}. Lever up: watch her.`, prompt: 'Watch the pad.', hints: ['Does she lift the crates?', 'And does she hover, with no room for another?', 'Wait a moment.']};
    const target = f.crates < best ? 'crate:add' : f.crates > best ? 'crate:remove' : 'go';
    return {...common, keys: LOAD_KEYS, waiting: true, target, glow: target,
      say: m.delivery === 0 && !m.say ? `Brian’s job: three deliveries, one to each place. Load as many ${kg(CRATE_KG)} crates as she can lift and still hover, then lift off. First: Sea level.` : m.say,
      prompt: `${NAME[f.place]}: ${crateWords(f.crates)} on. 1 adds a crate, 2 takes one off, Space lifts off.`,
      hints: [`Here she can push ${kg(MOST[f.place])}. She weighs ${kg(OWN_KG)} on her own, and each crate is ${kg(CRATE_KG)}.`,
        `${kg(MOST[f.place])} take away ${kg(OWN_KG)} leaves ${kg(MOST[f.place] - OWN_KG)}. How many ${kg(CRATE_KG)} crates fit in that?`,
        target === 'go' ? 'Watch my pointer: it is on the pad. Lift off.' : target === 'crate:add' ? 'Watch my pointer: it is on the crates.' : 'Watch my pointer: it is on the crate to take off.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'altitude', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
