// Fuel and weight as a classroom lesson (docs/board/cards/LAB-CLASSROOM-FUEL.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every kilogram and every time to sixty is the fuel bench's own run
// (fuelBench, the challenge's bench), and Brian's job uses the game's Grand Prix tank from the tuning table.
import {fuelRun, fuelKg, dragAt, TANK_LITRES, POUR_LITRES, PETROL_KG_PER_LITRE, WATER_KG_PER_LITRE, GRAND_PRIX, lastsShare, litresFor} from '../benches/fuel.js';

export const HALF = TANK_LITRES / 2;
// Try 2 asks for the petrol by its weight: 50 litres, 37.0 kg.
export const WEIGH_LITRES = 50;
export const WEIGH_KG = fuelKg(WEIGH_LITRES);
// A held key pours 5 litres every so often; Show me pours at the same pace. The jug fills in about a second.
const HELD_GAP_S = .14, SETTLE_S = .8, FILL_S = 1.2, DRAIN_LPS = 20, LEVEL_LPS = 60;
// Brian's job races run this long when the petrol lasts to the flag.
export const RACE_S = 2.6;
export const kg1 = kg => `${kg.toFixed(1)} kg`;
export const kg2 = kg => `${kg.toFixed(2)} kg`;
export const s2 = seconds => `${seconds.toFixed(2)} s`;
export const pct = share => `${Math.round(share * 100)}%`;
export const gapWords = metres => metres >= 1 ? `${metres.toFixed(1)} m` : `${Math.round(metres * 100)} cm`;
export const secondsTo60 = litres => fuelRun(litres).zeroToSixtyS;
// How far behind the winner a car was at the moment the winner reached sixty.
export const gapAtWin = (winner, other) => dragAt(winner, secondsTo60(winner)).metres - dragAt(other, secondsTo60(winner)).metres;

// Brian's job: three races from the game's Grand Prix. The least the can pours that lasts each one: 35, 50, 65 litres.
export const DAYS = Object.freeze([{share: .5, name: 'Half a Grand Prix'}, {share: .75, name: 'Three quarters of a Grand Prix'}, {share: 1, name: 'A whole Grand Prix'}].map(Object.freeze));
export const leastLitres = share => Math.ceil(litresFor(share) / POUR_LITRES - 1e-9) * POUR_LITRES;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did one win?'},
  {id: 'word-fuel-load', part: 1, title: 'Fuel load', word: 'fuel-word-0'},
  {id: 'word-litre', part: 1, title: 'Litre', word: 'fuel-word-1'},
  {id: 'word-kilogram', part: 1, title: 'Kilogram', word: 'fuel-word-2'},
  {id: 'watch', part: 2, title: 'Petrol on the scale'},
  {id: 'try-half', part: 3, title: 'Half a tank'},
  {id: 'try-weigh', part: 3, title: 'By weight'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-water', part: 5, title: 'Question 1 of 3'},
  {id: 'check-race', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.fuel.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'weight', text: `Petrol has weight: every litre weighs ${PETROL_KG_PER_LITRE} kg, so a full ${TANK_LITRES} litre tank weighs ${kg1(fuelKg(TANK_LITRES))}.`},
  {id: 'quicker', text: 'The same push moves a lighter car quicker: less fuel, sooner to 60 mph.'},
  {id: 'game', text: `On the Tune page, Fuel load: a half tank is quicker, but in a Grand Prix it runs dry at ${pct(lastsShare(HALF))}. Carry the fuel you need, no more.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Carry the fuel you need, no more.',
  text: 'Fuel load is on the Tune page in the garage: a half tank is quicker, but in a Grand Prix it runs dry past half way.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'fuel-word-0', word: 'Fuel load', meaning: 'Fuel load is the petrol the car carries.'},
  {id: 'fuel-word-1', word: 'Litre', meaning: 'A litre measures how much space a liquid takes up.'},
  {id: 'fuel-word-2', word: 'Kilogram', meaning: 'A kilogram measures mass, or how much stuff you carry.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const POUR_KEYS = Object.freeze({'↑': 'pour:in', '↓': 'pour:out'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const pouring = (race, target) => ({keys: {...POUR_KEYS, ...(race ? {Space: 'go'} : {})}, repeat: ['↑', '↓'], waiting: true, target, glow: 'pour',
  buttons: [{action: 'pour:out', label: 'Pour out', key: '↓'}, {action: 'pour:in', label: 'Pour in', key: '↑'}, ...(race ? [{action: 'go', label: 'Race', key: 'Space'}] : [])]});

// ---- the checks ----
const FULL_S = secondsTo60(TANK_LITRES), HALF_S = secondsTo60(HALF), EMPTY_S = secondsTo60(0);
// The Tune page's own line for a half tank (tune-view.js effectLine), from the same table.
export const HALF_TANK_LINE = `Half tank. Acceleration and braking +${pct(2 * GRAND_PRIX.accelPerStep)}; the tank lasts ${pct(lastsShare(HALF))} of a Grand Prix.`;
const CHECKS = {
  'check-water': {
    question: 'Which weighs more: a litre of water or a litre of petrol?',
    answers: [{label: 'The water', picture: {kind: 'jug', what: 'water'}}, {label: 'The petrol', picture: {kind: 'jug', what: 'petrol'}}, {label: 'They weigh the same', picture: {kind: 'jugs'}}],
    correct: 0,
    right: () => `Yes. Same space, one litre each, but the water weighs ${kg2(WATER_KG_PER_LITRE)} and the petrol ${kg2(PETROL_KG_PER_LITRE)}.`,
    wrong: picked => picked === 1 ? `No: a litre of petrol weighs ${kg2(PETROL_KG_PER_LITRE)} and a litre of water ${kg2(WATER_KG_PER_LITRE)}. Petrol is lighter, which is why it floats on water.`
      : `They take the same space, one litre each, but not the same mass: the water weighs ${kg2(WATER_KG_PER_LITRE)}, the petrol ${kg2(PETROL_KG_PER_LITRE)}.`,
    hints: ['Think of the two jugs on the scale.', 'Same space, but which reading was bigger?', 'Pick “The water”.'],
  },
  'check-race': {
    question: 'Same car, same engine. Which reaches 60 mph first?',
    answers: [{label: 'The full tank', picture: {kind: 'car', litres: TANK_LITRES}}, {label: 'The half tank', picture: {kind: 'car', litres: HALF}}, {label: 'Both together', picture: {kind: 'cars'}}],
    correct: 1, race: true,
    right: () => `Yes. The half tank carries ${kg1(fuelKg(TANK_LITRES - HALF))} less, and the same push moves less mass quicker: ${s2(HALF_S)} against ${s2(FULL_S)}.`,
    wrong: picked => picked === 0 ? `The full tank carries ${kg1(fuelKg(TANK_LITRES - HALF))} more petrol, so the same push moves it slower: the half tank took ${s2(HALF_S)}, the full one ${s2(FULL_S)}. Watch them race.`
      : `Close, but not together: ${s2(HALF_S)} against ${s2(FULL_S)}, ${gapWords(gapAtWin(HALF, TANK_LITRES))} apart. Every kilogram counts a little. Watch them race.`,
    hints: ['Which car is lighter?', 'The same push moves a lighter car quicker.', 'Pick “The half tank”.'],
  },
  'check-game': {
    question: 'In the game, you set Fuel load to Half tank for a Grand Prix. What happens?',
    answers: [{label: 'Quicker, but it runs dry past half way: pit to fill up', picture: {kind: 'game', what: 'pit'}}, {label: 'It lasts the whole race', picture: {kind: 'game', what: 'flag'}},
      {label: 'It is slower all race', picture: {kind: 'game', what: 'slow'}}],
    correct: 0,
    right: () => `Yes. A half tank lasts ${pct(lastsShare(HALF))} of a Grand Prix. Pit to fill it up; the stop takes ${GRAND_PRIX.stopSec} s longer.`,
    wrong: picked => picked === 1 ? `A full tank lasts ${pct(GRAND_PRIX.fullTankShare)} of a Grand Prix, so half a tank lasts ${pct(lastsShare(HALF))}: it runs dry past half way. Empty, the car has ${pct(GRAND_PRIX.dryPower)} of its power until you pit.`
      : `Lighter is quicker: in the game a half tank speeds up and brakes ${pct(2 * GRAND_PRIX.accelPerStep)} better. But it runs dry past half way, so you pit.`,
    hints: ['Think of Brian’s job: how far does half a tank last?', `Half a tank lasts ${pct(lastsShare(HALF))} of a Grand Prix.`, 'Pick the first card: quicker, but pit to fill up.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  const step = () => STEPS[m.index];
  const lane = (litres, label) => ({litres, label});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', litres: TANK_LITRES, level: TANK_LITRES, lanes: [], race: null, jug: 0, weighed: [], auto: null, then: null,
      result: null, answered: null, say: '', day: 0, onScale: null, saved: 0, lastPour: -1, gp: null, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.lanes = [lane(TANK_LITRES, 'Full tank'), lane(HALF, 'Half tank')]; m.race = {at: .6, t: null}; m.phase = 'running'; }
    if (id === 'word-fuel-load') { m.litres = 0; m.level = 0; m.phase = 'pour'; }
    if (id === 'word-litre') m.phase = 'jug';
    if (id === 'word-kilogram') m.phase = 'weigh';
    if (id === 'watch') { m.phase = 'drain'; m.lanes = [lane(TANK_LITRES, 'Full tank'), lane(HALF, 'Half tank'), lane(0, 'Empty tank')]; }
    if (id === 'try-half' || id === 'try-weigh' || id === 'alone') m.phase = 'pour';
    if (CHECKS[id]) {
      m.phase = m.answered === null ? 'ask' : 'answered';
      if (CHECKS[id].race) m.lanes = [lane(TANK_LITRES, 'Full tank'), lane(HALF, 'Half tank')];
    }
  }
  const startRace = (delay = 0) => { m.race = {at: m.time + delay, t: null}; };
  const pourable = () => ['word-fuel-load', 'try-half', 'try-weigh', 'alone'].includes(step().id) && (m.phase === 'pour' || m.phase === 'result');
  // The litres the step asks for: what Show me pours to.
  function goal() {
    const id = step().id;
    return id === 'word-fuel-load' ? TANK_LITRES : id === 'try-half' ? HALF : id === 'try-weigh' ? WEIGH_LITRES : leastLitres(DAYS[Math.min(m.day, DAYS.length - 1)].share);
  }

  function act(action) {
    const id = step().id, [kind, value, held] = action.split(':');
    if (kind === 'replay') return replay();
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; seen.add(id);
      enter(m.index, {answered: picked});
      if (check.race) startRace(.3);
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (kind === 'pour') return pour(value, held === 'held');
    if (kind === 'go') return go();
    if (id === 'word-litre' && kind === 'fill' && m.phase === 'jug') { m.phase = 'filling'; return {kind: 'progress', say: 'Watch the jug fill to its line.'}; }
    if (id === 'word-kilogram' && kind === 'weigh' && m.phase === 'weigh') {
      const what = value === 'best' ? ['water', 'petrol'].find(w => !m.weighed.includes(w)) : value;
      if (!['water', 'petrol'].includes(what)) return null;
      m.onScale = what;
      if (!m.weighed.includes(what)) m.weighed.push(what);
      if (m.weighed.length < 2) {
        m.say = what === 'water' ? `A litre of water: ${kg2(WATER_KG_PER_LITRE)}. Now the litre of petrol: press 2.` : `A litre of petrol: ${kg2(PETROL_KG_PER_LITRE)}. Now the litre of water: press 1.`;
        return {kind: 'progress', sound: 'lab.clunk', say: m.say};
      }
      m.phase = 'done'; seen.add(id);
      m.say = `Same space, one litre each. The water weighs ${kg2(WATER_KG_PER_LITRE)}, the petrol ${kg2(PETROL_KG_PER_LITRE)}. Litres say how much space; kilograms say how heavy.`;
      return {kind: 'right', sound: 'lab.clunk', say: m.say};
    }
    return null;
  }

  // ↑ pours 5 litres in from the nozzle, ↓ lets 5 out through the tap into the jerry can.
  function pour(way, held) {
    if (!pourable()) return null;
    if (m.phase === 'result' && (way === 'best' || way === 'in' || way === 'out')) m.phase = 'pour';
    if (way === 'best') {
      m.auto = goal(); m.then = step().id === 'try-half' || step().id === 'alone' ? 'go' : null;
      return {kind: 'progress', say: m.auto > m.litres ? 'Watch: I pour it in.' : 'Watch: I let it out.'};
    }
    if (way !== 'in' && way !== 'out') return null;
    if (held && m.time - m.lastPour < HELD_GAP_S) return null;
    const before = m.litres;
    m.litres = way === 'in' ? Math.min(TANK_LITRES, before + POUR_LITRES) : Math.max(0, before - POUR_LITRES);
    if (m.litres === before) return held ? null : {kind: 'note', say: way === 'in' ? `The tank is full: ${TANK_LITRES} litres.` : 'The tank is empty: 0 litres.'};
    m.lastPour = m.time;
    return poured(way, held);
  }
  function poured(way, held) {
    const id = step().id, sound = held ? null : 'lab.splash';
    if (id === 'word-fuel-load' && m.litres === TANK_LITRES) {
      m.phase = 'done'; seen.add(id);
      m.say = `Full: ${TANK_LITRES} litres. That is the car’s fuel load, the petrol it carries.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-weigh' && m.litres === WEIGH_LITRES) {
      m.phase = 'done'; seen.add(id); m.auto = null;
      m.say = `${kg1(WEIGH_KG)} on the scale: that is ${WEIGH_LITRES} litres. Every litre weighs ${PETROL_KG_PER_LITRE} kg, so ${WEIGH_LITRES} litres weighs ${kg1(WEIGH_KG)}.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-weigh' && way === 'out' && m.litres < WEIGH_LITRES)
      return {kind: 'wrong', say: `${kg1(fuelKg(m.litres))}: lighter than ${kg1(WEIGH_KG)}. Press ↑ to pour ${WEIGH_LITRES - m.litres} litres back in.`};
    return sound ? {kind: 'sound', sound} : null;
  }

  function go() {
    const id = step().id;
    if (!pourable() || m.auto != null) return null;
    if (id === 'try-half') {
      m.lanes = [lane(m.litres, 'Your tank'), lane(TANK_LITRES, 'Full tank')]; m.phase = 'running'; startRace(.2);
      runs.push(m.litres, TANK_LITRES);
      return {kind: 'progress', say: `Your tank, ${m.litres} litres, against a full tank. Watch the stopwatches.`};
    }
    if (id === 'alone') {
      const day = DAYS[m.day];
      m.phase = 'running'; m.gp = {litres: m.litres, share: day.share, t: 0, dryAt: null};
      runs.push(m.litres);
      return {kind: 'progress', say: `${day.name}, on ${m.litres} litres.`};
    }
    return null;
  }

  function judgeHalf() {
    const mine = m.lanes[0].litres, mineS = secondsTo60(mine);
    m.phase = 'result';
    if (mine === HALF) {
      seen.add('try-half'); m.result = {right: true};
      m.say = `Half a tank: ${HALF} litres, ${kg1(fuelKg(HALF))}. It reached 60 mph in ${s2(HALF_S)}, the full tank in ${s2(FULL_S)}: ${gapWords(gapAtWin(HALF, TANK_LITRES))} ahead.`;
      return {kind: 'right', say: m.say};
    }
    m.result = {right: false};
    if (mine === TANK_LITRES) m.say = `Both tanks were full, ${TANK_LITRES} litres: they tied at ${s2(FULL_S)}. Half of ${TANK_LITRES} is ${HALF}: pour out ${TANK_LITRES - HALF} litres with ↓, then race again.`;
    else if (mine > HALF) m.say = `${mine} litres is more than half: ${s2(mineS)} against ${s2(FULL_S)}. Half of ${TANK_LITRES} is ${HALF}: pour out ${mine - HALF} more with ↓, then race again.`;
    else m.say = `${mine} litres is less than half. It won, ${s2(mineS)} against ${s2(FULL_S)}, but half of ${TANK_LITRES} is ${HALF}: pour in ${HALF - mine} with ↑, then race again.`;
    return {kind: 'wrong', say: m.say};
  }

  // Brian's job: too little runs dry before the flag, too much carries weight it did not need; that race again.
  function judgeJob() {
    const day = DAYS[m.day], litres = m.gp.litres, lasts = lastsShare(litres), least = leastLitres(day.share);
    m.phase = 'pour'; m.gp.over = true;
    if (lasts < day.share) {
      m.say = `${litres} litres lasts ${pct(lasts)} of a Grand Prix: it ran dry before the flag. ${day.name} needs about ${Math.ceil(litresFor(day.share))} litres: pour in ${least - litres} and race again.`;
      return {kind: 'fail', say: m.say};
    }
    if (litres > least) {
      m.say = `It finished, but ${litres} litres lasts ${pct(lasts)} of a Grand Prix: it carried ${litres - least} litres, ${kg1(fuelKg(litres - least))}, it did not need. Pour out ${litres - least} and race again.`;
      return {kind: 'fail', say: m.say};
    }
    m.day += 1; m.saved += TANK_LITRES - litres;
    if (m.day >= DAYS.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `Three races, each on just enough. You left ${m.saved} litres behind, ${kg1(fuelKg(m.saved))} the car never had to carry. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    m.litres = TANK_LITRES; m.gp = null;
    m.say = `Right: ${litres} litres lasts ${pct(lasts)} of a Grand Prix, just enough. Next race: ${DAYS[m.day].name}. The tank is full again.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    m.level += Math.max(-LEVEL_LPS * dt, Math.min(LEVEL_LPS * dt, m.litres - m.level));
    if (m.auto != null && m.time - m.lastPour >= HELD_GAP_S) {
      if (m.litres === m.auto) { m.auto = null; const then = m.then; m.then = null; return then === 'go' ? go() : null; }
      m.litres += Math.sign(m.auto - m.litres) * POUR_LITRES; m.lastPour = m.time;
      return poured(m.auto > m.litres ? 'in' : 'out', true);
    }
    if (id === 'word-litre' && m.phase === 'filling') {
      m.jug = Math.min(1, m.jug + dt / FILL_S);
      if (m.jug < 1) return null;
      m.phase = 'done'; seen.add(id);
      m.say = `This jug holds one litre: that much space. The car’s tank holds ${TANK_LITRES} of them.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'watch' && m.phase === 'drain') {
      m.litres = Math.max(0, m.litres - DRAIN_LPS * dt); m.level = m.litres;
      if (m.litres <= 0) { m.phase = 'running'; startRace(.5); }
      return null;
    }
    if (m.gp && !m.gp.over) return jobTick(dt);
    if (!m.race) return null;
    if (m.race.t == null) { if (m.time < m.race.at) return null; m.race.t = 0; }
    const end = Math.max(...m.lanes.map(l => secondsTo60(l.litres))) + SETTLE_S, before = m.race.t;
    if (before >= end) return null;
    m.race.t = Math.min(end, before + dt);
    const crossed = m.lanes.some(l => before < secondsTo60(l.litres) && m.race.t >= secondsTo60(l.litres));
    if (m.race.t < end) return crossed ? {kind: 'sound', sound: 'lab.tick'} : null;
    // The race has just settled: a question's race only shows; the others are judged or done.
    if (CHECKS[id]) return null;
    if (id === 'try-half') return judgeHalf();
    m.phase = 'done'; seen.add(id);
    return null;
  }
  function jobTick(dt) {
    const gp = m.gp, lasts = lastsShare(gp.litres) / gp.share;
    gp.t += dt;
    if (lasts < 1 && gp.dryAt == null && gp.t / RACE_S >= lasts) { gp.dryAt = gp.t; return {kind: 'sound', sound: 'car.sputter'}; }
    if (gp.dryAt != null ? gp.t - gp.dryAt >= 1.2 : gp.t >= RACE_S + SETTLE_S) return judgeJob();
    return null;
  }

  function replay() {
    const id = step().id;
    if ((id === 'wonder' || id === 'watch') && m.phase === 'done') { enter(m.index); return null; }
    if (CHECKS[id]?.race && m.phase === 'answered') { m.race = null; startRace(.3); return null; }
    if (id === 'try-half' && m.phase === 'result') return go();
    return null;
  }

  // The cars on the strip: one clock for every lane, so the lighter car is ahead of the heavier one all the way.
  function laneViews() {
    const fastest = Math.min(...m.lanes.map(l => secondsTo60(l.litres))), slowest = Math.max(...m.lanes.map(l => secondsTo60(l.litres)));
    // The cars park where they are when the last one reaches sixty.
    const t = m.race?.t == null ? null : Math.min(m.race.t, slowest);
    const tie = m.lanes.every(l => secondsTo60(l.litres) === fastest), winner = m.lanes.find(l => secondsTo60(l.litres) === fastest);
    const won = !tie && t != null && t >= fastest;
    return m.lanes.map(l => {
      const at = t == null ? null : dragAt(l.litres, t), seconds = secondsTo60(l.litres);
      return {label: l.label, litres: l.litres, kg: fuelKg(l.litres),
        metres: at ? at.metres : 0, mph: at ? Math.min(60, at.mph) : 0, seconds: t == null ? null : Math.min(t, seconds), done: t != null && t >= seconds,
        winner: won && l === winner, behindM: won && l !== winner && seconds > fastest ? gapAtWin(winner.litres, l.litres) : null,
        photoM: won ? dragAt(l.litres, fastest).metres : null};
    });
  }

  function view() {
    const id = step().id;
    const base = {scene: 'shop', time: m.time, litres: m.litres, level: m.level, kg: fuelKg(m.litres), tank: false, scale: true, gauge: true, covered: false,
      half: false, jug: null, jugs: null, lanes: m.lanes.length ? laneViews() : [], job: null, tune: null, best: null, runs: [...runs],
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (id === 'wonder') return {...base, actions: m.phase === 'done' || seen.has(id) ? ['replay'] : [],
      say: seen.has(id) ? `Same car, same engine, same push. The half tank reached 60 mph first: ${s2(HALF_S)} against ${s2(FULL_S)}. Why?`
        : 'Two of the same car, nought to sixty miles an hour. Watch the stopwatches.',
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the two cars.',
      hints: ['Watch which car reaches 60 mph first.', 'The only difference is the petrol in their tanks.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch until both reach 60 mph, then press Enter.']};
    if (id === 'word-fuel-load') {
      const done = m.phase === 'done';
      return {...base, tank: true, scale: false, ...(done ? {} : {keys: {'↑': 'pour:in'}, repeat: ['↑'], waiting: m.auto == null, target: m.auto == null ? 'pour:best' : null, glow: 'nozzle', best: TANK_LITRES,
        buttons: [{action: 'pour:in', label: 'Pour in', key: '↑'}]}),
        say: done ? m.say : 'Fuel load is the petrol the car carries. This tank is empty: fill it.',
        prompt: done ? 'Press Enter to go on.' : m.litres ? `${m.litres} litres in. Keep pouring: press ↑ (hold it to keep pouring), or click the nozzle.` : 'Press ↑ to pour petrol in (hold it to keep pouring), or click the nozzle.',
        hints: done ? DONE : ['The pump nozzle is over the tank.', `Press ↑ until the gauge reads ${TANK_LITRES} litres.`, 'Watch my pointer: I fill it.']};
    }
    if (id === 'word-litre') {
      const ready = m.phase === 'jug', done = m.phase === 'done';
      return {...base, scale: false, jug: {fill: m.jug}, ...(ready ? {keys: {Space: 'fill'}, buttons: [{action: 'fill', label: 'Fill the jug', key: 'Space'}], waiting: true, target: 'fill', glow: 'jug'} : {}),
        say: done ? m.say : 'A litre measures how much space a liquid takes up. Fill this jug to its line.',
        prompt: ready ? 'Press Space to fill the jug, or click it.' : done ? 'Press Enter to go on.' : 'Watch the jug fill.',
        hints: done ? DONE : ['The jug has a line marked 1 litre.', 'Press Space, or click the jug.', 'Watch my pointer: I fill it.']};
    }
    if (id === 'word-kilogram') {
      const done = m.phase === 'done';
      return {...base, jugs: {weighed: [...m.weighed], on: m.onScale ?? null}, ...(done ? {} : {keys: {1: 'weigh:water', 2: 'weigh:petrol'}, waiting: true, target: 'weigh:best', glow: 'jugs',
        bestJug: ['water', 'petrol'].find(w => !m.weighed.includes(w)), buttons: [{action: 'weigh:water', label: 'Weigh the water', key: '1'}, {action: 'weigh:petrol', label: 'Weigh the petrol', key: '2'}]}),
        say: done || m.weighed.length ? m.say : 'A kilogram measures mass: how much stuff there is. Here are one litre of water and one litre of petrol. Put each on the scale.',
        prompt: done ? 'Press Enter to go on.' : 'Press 1 for the water and 2 for the petrol, or click a jug.',
        hints: done ? DONE : ['Both jugs hold one litre.', 'Press 1, then 2, and read the scale each time.', 'Watch my pointer: I weigh it.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, tank: true, actions: done ? ['replay', 'slow'] : ['slow'],
        say: done ? `Every litre out took ${PETROL_KG_PER_LITRE} kg off the scale. The lighter the car, the sooner it reached 60 mph: ${s2(EMPTY_S)}, ${s2(HALF_S)}, ${s2(FULL_S)}. Not by much: empty beat full by ${gapWords(gapAtWin(0, TANK_LITRES))}.`
          : m.phase === 'drain' ? `Every litre of petrol weighs ${PETROL_KG_PER_LITRE} kg. Watch the scale as I empty the tank: ${kg1(fuelKg(TANK_LITRES))} when it is full.`
            : 'Now three of the same car: a full tank, half a tank and an empty one.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : m.phase === 'drain' ? 'Watch the scale.' : 'Watch the three cars.',
        hints: ['Watch the scale’s kilograms fall as the litres pour out.', 'Watch which car reaches 60 mph first.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-half' || id === 'try-weigh') {
      const weigh = id === 'try-weigh', want = weigh ? WEIGH_LITRES : HALF;
      const target = m.auto != null ? null : !weigh && m.litres === HALF && m.phase === 'pour' ? 'go' : 'pour:best';
      const view = {...base, tank: true, covered: weigh, half: !weigh, best: want};
      if (m.phase === 'running') return {...view, say: `Your tank, ${m.lanes[0].litres} litres, against a full tank.`, prompt: 'Watch the stopwatches.', hints: ['Watch the two cars.', 'Which one reaches 60 mph first?', 'Wait a moment.']};
      if (m.phase === 'done' || m.phase === 'result' && m.result?.right) return {...view, ...(weigh ? {} : pouring(true, null)), waiting: false, actions: weigh ? [] : ['replay'], mood: 'cheer', say: m.say,
        prompt: weigh ? 'Press Enter to go on.' : 'Press Enter to go on, or R to race again.', hints: DONE};
      return {...view, ...pouring(!weigh, m.auto != null ? null : target), waiting: m.auto == null, actions: m.phase === 'result' ? ['replay'] : [],
        say: m.phase === 'result' ? m.say : weigh ? `The gauge is covered. Use the scale: pour until the petrol weighs ${kg1(WEIGH_KG)}.` : 'Pour out petrol until the tank is half full, then race it against a full tank.',
        prompt: weigh ? `The scale reads ${kg1(fuelKg(m.litres))}. Press ↓ to pour out, ↑ to pour in.` : `${m.litres} litres, ${kg1(fuelKg(m.litres))}. Press ↓ to pour out, ↑ to pour in, Space to race.`,
        hints: weigh ? ['Watch the scale, not the gauge.', `Every ${POUR_LITRES} litres is ${kg1(fuelKg(POUR_LITRES))}. Press ↓ until the scale reads ${kg1(WEIGH_KG)}.`, 'Watch my pointer: I pour.']
          : ['The gauge has a line at half.', `Half of ${TANK_LITRES} litres is ${HALF}. Press ↓ until the gauge reads ${HALF}, then Space.`, 'Watch my pointer: I pour and race.']};
    }
    if (id === 'alone') {
      const day = DAYS[Math.min(m.day, DAYS.length - 1)], least = leastLitres(day.share);
      const job = {name: day.name, share: day.share, day: Math.min(m.day, DAYS.length - 1) + 1, of: DAYS.length, lasts: lastsShare(m.litres), done: m.phase === 'done',
        race: m.gp ? {litres: m.gp.litres, at: Math.min(1, m.gp.dryAt != null ? lastsShare(m.gp.litres) / m.gp.share : m.gp.t / RACE_S), dry: m.gp.dryAt != null, over: Boolean(m.gp.over)} : null};
      const view = {...base, tank: true, job, best: least};
      if (m.phase === 'done') return {...view, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      if (m.phase === 'running') return {...view, say: `${day.name}, on ${m.gp.litres} litres.`, prompt: 'Watch the race.', hints: ['Watch the car and its petrol.', 'Does it reach the flag?', 'Wait a moment.']};
      const target = m.auto != null ? null : m.litres === least ? 'go' : 'pour:best';
      return {...view, ...pouring(true, target), waiting: m.auto == null,
        say: m.day === 0 && !m.say ? `Your job: three races from the game’s Grand Prix. The tank starts full each time. Carry the fuel you need, no more: pour the least that lasts the race. First: ${day.name}.` : m.say,
        prompt: `${m.litres} litres lasts ${pct(lastsShare(m.litres))} of a Grand Prix. Pour, then press Space to race.`,
        hints: [`${day.name} is ${pct(day.share)} of the race. The panel under the scale says how far the petrol lasts.`, `Pour to the least that lasts ${pct(day.share)}: ${least} litres. Then press Space.`, 'Watch my pointer: I pour it for you.']};
    }
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered,
        keys: answered ? {} : ANSWER_KEYS, actions: answered && check.race ? ['replay'] : [], waiting: !answered,
        tune: id === 'check-game' ? {picked: 2, effect: answered ? HALF_TANK_LINE : null} : null,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'Petrol weighs about three quarters of a kilo a litre. The same push moves a lighter car quicker, so carry the fuel you need, no more. Electric cars carry batteries, which weigh the same full or empty.',
      prompt: 'Enter finishes the lesson and opens Fuel load on the Tune page in the garage.', hints: KEY_IDEAS.map(i => i.text)};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own races, as the bench's challenge reads them: the bench's goal (a full tank and half a tank or
// less) must pass on these, so finishing the lesson can never pass without them.
export const benchAttempts = view => (view?.runs ?? []).map(litres => ({controls: [{id: 'litres'}], input: {litres}}));

export const lesson = Object.freeze({id: 'fuel', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts});
