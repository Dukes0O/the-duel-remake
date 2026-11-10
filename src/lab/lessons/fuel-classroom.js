// Fuel and weight as a classroom lesson (docs/board/cards/LAB-CLASSROOM-FUEL.md, "Claude's script"; its wording and
// formulas follow LAB-CLASSROOM-LANGUAGE.md).
// Teaching state only, no DOM and no saves. Every kilogram is the fuel bench's own run (fuelBench, the challenge's bench),
// every time on the stopwatch is that run carried on to 100 km/h at the bench's own acceleration, and Brian's job uses
// the game's Grand Prix tank from the tuning table.
import {fuelBench, fuelRun, fuelKg, SIXTY_MS, TANK_LITRES, POUR_LITRES, PETROL_KG_PER_LITRE, WATER_KG_PER_LITRE, GRAND_PRIX, lastsShare, litresFor} from '../benches/fuel.js';
import {CARS} from '../../config.js';
import {MORE} from '../classroom/brian-text.js';

export const HALF = TANK_LITRES / 2;
// Try 2 asks for the petrol by its mass: 50 litres, 37.0 kg.
export const WEIGH_LITRES = 50;
export const WEIGH_KG = fuelKg(WEIGH_LITRES);
// A held key pours 5 litres every so often; Show me pours at the same pace. The jug fills in about a second.
const HELD_GAP_S = .14, SETTLE_S = .8, FILL_S = 1.2, DRAIN_LPS = 20, LEVEL_LPS = 60;
// Brian's job races run this long when the petrol lasts to the flag.
export const RACE_S = 2.6;
// The speed the lesson times the car to: 100 km/h. The sums use the rounded figure in metres per second.
export const KMH_PER_MS = 3.6;
export const TARGET_KMH = 100;
export const TARGET_MS = Number((TARGET_KMH / KMH_PER_MS).toFixed(3));
export const TARGET_TEXT = `${TARGET_KMH} km/h`;
// The fuel bench times its car to a lower speed. The lesson keeps the bench's own acceleration (the bench's speed
// divided by the bench's time) and carries it on to 100 km/h, so every time here is the bench's time scaled by the speeds.
const FINISH_MS = TARGET_KMH / KMH_PER_MS;
export const toTarget = benchSeconds => benchSeconds * FINISH_MS / SIXTY_MS;
// The free test's cars: the bench's own car, then a light, a heavy and a very heavy petrol car, all with the bench's 70 litre tank.
export const CAR = 'falcone_f42';
export const FREE_CARS = Object.freeze(['falcone_f42', 'falcone_sirena', 'banshee_muscle', 'titan_monster']);
export const FREE_TRIES = 3;
const FREE_ORDER = Object.freeze([35, 0, 70, 50, 20, 65, 5, 60, 10, 55, 15, 45, 25, 40, 30]);

export const kg1 = kg => `${kg.toFixed(1)} kg`;
export const kg2 = kg => `${kg.toFixed(2)} kg`;
export const s2 = seconds => `${seconds.toFixed(2)} s`;
export const pct = share => `${Math.round(share * 100)}%`;
// "55%" when that is exact, and "about 47%" when it is rounded.
export const pctAbout = share => Math.abs(share * 100 - Math.round(share * 100)) < 1e-9 ? pct(share) : `about ${pct(share)}`;
export const gapWords = metres => metres >= 1 ? `${metres.toFixed(1)} m` : `${Math.round(metres * 100)} cm`;
export const secondsTo100 = litres => toTarget(fuelRun(litres).zeroToSixtyS);
export const secondsOf = (litres, car = CAR) => toTarget(fuelBench.run({car, litres}).zeroToSixtyS);
// The car t seconds after the start, whichever car it is: the same push all the way to the speed, then that speed on.
function movedBy(seconds, t) {
  const a = FINISH_MS / seconds;
  if (t <= seconds) return {metres: a * t * t / 2, speed: a * t};
  return {metres: FINISH_MS * seconds / 2 + FINISH_MS * (t - seconds), speed: FINISH_MS};
}
// How far behind the winner a car was at the moment the winner reached the speed.
export const gapAtWin = (winner, other) => movedBy(secondsTo100(winner), secondsTo100(winner)).metres - movedBy(secondsTo100(other), secondsTo100(winner)).metres;
const num = value => value.toLocaleString('en-GB', {minimumFractionDigits: 1, maximumFractionDigits: 2});
const whole = value => value.toLocaleString('en-GB', {maximumFractionDigits: 0});
const lowerFirst = s => s[0].toLowerCase() + s.slice(1);

// The sums as the panel shows them, from rounded figures, so that they come out on a calculator from the numbers on the screen.
// The force is the bench's rule: the car's own acceleration with a full tank, multiplied by its mass with a full tank.
export function sumsOf(litres, car = CAR) {
  const full = fuelBench.run({car, litres: TANK_LITRES});
  const force = Math.round(full.carMassKg * SIXTY_MS / full.zeroToSixtyS), fuel = Number((litres * PETROL_KG_PER_LITRE).toFixed(2));
  const empty = Number((full.carMassKg - TANK_LITRES * PETROL_KG_PER_LITRE).toFixed(1)), total = Number((empty + fuel).toFixed(2));
  const accel = Number((force / total).toFixed(3));
  return {litres, fuel, empty, total, force, accel, time: Number((TARGET_MS / accel).toFixed(2))};
}

// Brian's job: three races from the game's Grand Prix. The least the pump pours that lasts each one: 35, 50, 65 litres.
export const DAYS = Object.freeze([{share: .5, name: 'Half a Grand Prix'}, {share: .75, name: 'Three quarters of a Grand Prix'}, {share: 1, name: 'A whole Grand Prix'}].map(Object.freeze));
export const leastLitres = share => Math.ceil(litresFor(share) / POUR_LITRES - 1e-9) * POUR_LITRES;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did one car win?'},
  {id: 'word-litre', part: 1, title: 'Litre', word: 'fuel-word-1'},
  {id: 'word-kilogram', part: 1, title: 'Kilogram and density', word: 'fuel-word-2'},
  {id: 'word-fuel-load', part: 1, title: 'Fuel load', word: 'fuel-word-0'},
  {id: 'word-speed', part: 1, title: 'Speed and acceleration'},
  {id: 'watch', part: 2, title: 'Force, mass and acceleration'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-half', part: 3, title: 'Half a tank'},
  {id: 'try-weigh', part: 3, title: 'Pouring by mass'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-water', part: 5, title: 'Question 1 of 3'},
  {id: 'check-race', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.fuel.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'weight', text: `Every litre of petrol has a mass of ${PETROL_KG_PER_LITRE} kg, so a full tank of ${TANK_LITRES} litres adds ${kg1(fuelKg(TANK_LITRES))} to the car.`},
  {id: 'quicker', text: `The engine pushes with the same force whatever the tank holds, so the same car with less petrol accelerates faster and reaches ${TARGET_TEXT} sooner.`},
  {id: 'game', text: `Fuel load is on the Tune page in the garage. In a Grand Prix a half tank lasts only ${pct(lastsShare(HALF))} of the race, so carry the petrol you need and no more.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Carry the petrol you need, and no more.',
  text: 'Fuel load is on the Tune page in the garage. A half tank accelerates faster, but in a Grand Prix its petrol runs out just past half way, and the car is slow until it stops in the pit lane to refill.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'fuel-word-0', word: 'Fuel load', meaning: 'The amount of petrol that a car carries, measured in litres.'},
  {id: 'fuel-word-1', word: 'Litre', meaning: 'A measure of how much space a liquid fills, written L. One litre fills a box 10 cm wide, 10 cm deep and 10 cm tall.'},
  {id: 'fuel-word-2', word: 'Kilogram', meaning: 'A measure of mass, written kg. Mass is how much matter an object contains, and a scale reads it in kilograms.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const POUR_KEYS = Object.freeze({'↑': 'pour:in', '↓': 'pour:out'});
const CAR_KEYS = Object.freeze({'←': 'car:prev', '→': 'car:next'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const PICK = 'Pick a card by clicking it, or press 1, 2 or 3.';
// go: the Space button's words (Race, or Weigh it), or none.
const pouring = (go, target) => ({keys: {...POUR_KEYS, ...(go ? {Space: 'go'} : {})}, repeat: ['↑', '↓'], waiting: true, target, glow: 'pour',
  buttons: [{action: 'pour:out', label: 'Pour out', key: '↓'}, {action: 'pour:in', label: 'Pour in', key: '↑'}, ...(go ? [{action: 'go', label: go, key: 'Space'}] : [])]});

// ---- the formulas beside the board (the numbers are the ones on the gauge, the scale and the car now) ----
const DENSITY_NOTE = 'Density is the mass of one litre of a liquid.';
const FORCE_NOTE = 'In this game the engine’s force stays the same until the stopwatch stops. A real car’s force changes with its gears.';
const fuelSum = litres => ({title: 'Mass of the petrol', formula: 'mass of petrol = litres × density', worked: `${litres} litres × ${PETROL_KG_PER_LITRE} kg per litre = ${num(sumsOf(litres).fuel)} kg`, note: DENSITY_NOTE});
const totalSum = (litres, car = CAR) => { const s = sumsOf(litres, car); return {title: 'Total mass of the car', formula: 'total mass = car with an empty tank + petrol', worked: `${num(s.empty)} kg + ${num(s.fuel)} kg = ${num(s.total)} kg`}; };
const accelWorked = (litres, car = CAR) => { const s = sumsOf(litres, car); return `${whole(s.force)} N ÷ ${num(s.total)} kg = ${s.accel.toFixed(3)} m/s^2`; };
const timeWorked = (litres, car = CAR) => { const s = sumsOf(litres, car); return `${TARGET_MS} m/s ÷ ${s.accel.toFixed(3)} m/s^2 = ${s2(s.time)}`; };
const accelSum = (litres, car = CAR, note = FORCE_NOTE) => ({title: 'Acceleration', formula: 'acceleration = force ÷ total mass', worked: accelWorked(litres, car), note});
const timeSum = (litres, car = CAR) => ({title: `Time to reach ${TARGET_TEXT}`, formula: 'time = speed ÷ acceleration', worked: timeWorked(litres, car)});
const speedSum = () => ({title: 'Speed in metres per second', formula: 'm/s = km/h ÷ 3.6', worked: `${TARGET_TEXT} ÷ 3.6 = ${TARGET_MS} m/s`, note: `An hour has 3,600 seconds and a kilometre has 1,000 metres, so 1 m/s is the same as 3.6 km/h.`});
const allSums = (litres, car = CAR, note = FORCE_NOTE) => [fuelSum(litres), totalSum(litres, car), accelSum(litres, car, note), timeSum(litres, car)];
const raceSums = rows => rows.map(([label, litres]) => ({title: label, worked: accelWorked(litres), note: timeWorked(litres)}));
const shareSum = litres => ({title: 'How far the petrol lasts', formula: `share of a Grand Prix = litres ÷ ${TANK_LITRES} × ${pct(GRAND_PRIX.fullTankShare)}`,
  worked: litres == null ? null : `${litres} ÷ ${TANK_LITRES} × ${pct(GRAND_PRIX.fullTankShare)} = ${Number((lastsShare(litres) * 100).toFixed(1))}%`, note: `In this game a full tank of ${TANK_LITRES} litres lasts ${pct(GRAND_PRIX.fullTankShare)} of a Grand Prix.`});
const LITRE_SUM = Object.freeze([{title: 'One litre', formula: '1 litre = 10 cm × 10 cm × 10 cm', worked: '10 × 10 × 10 = 1,000 cubic centimetres', note: 'A cubic centimetre is the space inside a box that is 1 cm wide, 1 cm deep and 1 cm tall.'}]);

// ---- the checks ----
const FULL_S = secondsTo100(TANK_LITRES), HALF_S = secondsTo100(HALF), EMPTY_S = secondsTo100(0);
// The Tune page's own line for a half tank (tune-view.js effectLine), from the same table.
export const HALF_TANK_LINE = `Half tank. Acceleration and braking +${pct(2 * GRAND_PRIX.accelPerStep)}; the tank lasts ${pct(lastsShare(HALF))} of a Grand Prix.`;
const FULL_HALF = `The car with half a tank reached ${TARGET_TEXT} in ${s2(HALF_S)}, and the car with a full tank reached it in ${s2(FULL_S)}.`;
const CHECKS = {
  'check-water': {
    question: 'Which has the greater mass, a litre of water or a litre of petrol?',
    answers: [{label: 'The litre of water', picture: {kind: 'jug', what: 'water'}}, {label: 'The litre of petrol', picture: {kind: 'jug', what: 'petrol'}}, {label: 'They have the same mass', picture: {kind: 'jugs'}}],
    correct: 0,
    formulas: answered => [{title: 'Mass of a liquid', formula: 'mass = litres × density', note: answered ? null : DENSITY_NOTE},
      ...(answered ? [{title: 'Water', worked: `1 litre × ${WATER_KG_PER_LITRE.toFixed(2)} kg per litre = ${kg2(WATER_KG_PER_LITRE)}`}, {title: 'Petrol', worked: `1 litre × ${PETROL_KG_PER_LITRE} kg per litre = ${kg2(PETROL_KG_PER_LITRE)}`}] : [])],
    right: () => `Correct. Each jug holds one litre, but the water has a mass of ${kg2(WATER_KG_PER_LITRE)} and the petrol has a mass of ${kg2(PETROL_KG_PER_LITRE)}.`,
    wrong: picked => picked === 1 ? `A litre of petrol has a mass of ${kg2(PETROL_KG_PER_LITRE)} and a litre of water has a mass of ${kg2(WATER_KG_PER_LITRE)}. Petrol has the lower density, which is why petrol floats on water.`
      : `The two jugs hold the same space, one litre each, but they do not have the same mass. The water has a mass of ${kg2(WATER_KG_PER_LITRE)} and the petrol has a mass of ${kg2(PETROL_KG_PER_LITRE)}.`,
    hints: ['Think of the two jugs on the scale.', 'Both jugs held one litre. Which reading on the scale was bigger?', 'Pick “The litre of water”.'],
  },
  'check-race': {
    question: `Two identical cars with the same engine start together. One car has a full tank of petrol and the other has half a tank. Which car reaches ${TARGET_TEXT} first?`,
    answers: [{label: 'The car with the full tank', picture: {kind: 'car', litres: TANK_LITRES}}, {label: 'The car with the half tank', picture: {kind: 'car', litres: HALF}}, {label: 'Both cars reach it together', picture: {kind: 'cars'}}],
    correct: 1, race: true,
    formulas: answered => answered ? raceSums([['Full tank', TANK_LITRES], ['Half tank', HALF]]) : [{title: 'Acceleration', formula: 'acceleration = force ÷ total mass'}, {title: 'Time', formula: 'time = speed ÷ acceleration'}],
    right: () => `Correct. The car with half a tank carries ${kg1(fuelKg(TANK_LITRES - HALF))} less petrol, and the same force gives less mass more acceleration. ${FULL_HALF}`,
    wrong: picked => picked === 0 ? `The car with a full tank carries ${kg1(fuelKg(TANK_LITRES - HALF))} more petrol, so the same force gives that car less acceleration. ${FULL_HALF} Watch them race.`
      : `They do not arrive together. ${FULL_HALF} That left a gap of ${gapWords(gapAtWin(HALF, TANK_LITRES))}, because every kilogram makes a small difference. Watch them race.`,
    hints: ['Which car has less mass?', 'The same force gives less mass more acceleration.', 'Pick “The car with the half tank”.'],
  },
  'check-game': {
    question: 'In the game, you set Fuel load to Half tank on the Tune page for a Grand Prix. What happens during the race?',
    answers: [{label: 'The car accelerates faster, but its petrol runs out past half way, and it is slow until it stops in the pit lane to refill', picture: {kind: 'game', what: 'pit'}}, {label: 'The petrol lasts the whole race', picture: {kind: 'game', what: 'flag'}},
      {label: 'The car is slower for the whole race', picture: {kind: 'game', what: 'slow'}}],
    correct: 0,
    formulas: answered => [shareSum(answered ? HALF : null)],
    right: () => `Correct. A half tank lasts ${pct(lastsShare(HALF))} of a Grand Prix. After that the car has ${pct(GRAND_PRIX.dryPower)} of its acceleration until it stops in the pit lane to refill, and that stop is ${GRAND_PRIX.stopSec} s longer than usual.`,
    wrong: picked => picked === 1 ? `A full tank lasts ${pct(GRAND_PRIX.fullTankShare)} of a Grand Prix, so half a tank lasts ${pct(lastsShare(HALF))} and its petrol runs out just past half way. With an empty tank the car has ${pct(GRAND_PRIX.dryPower)} of its acceleration until it stops in the pit lane.`
      : `The same car with less mass accelerates faster, so in the game a half tank accelerates and brakes ${pct(2 * GRAND_PRIX.accelPerStep)} better. However, its petrol runs out just past half way, and the car is slow until it stops in the pit lane to refill.`,
    hints: ['Think of Brian’s job. How far does half a tank last?', `Half a tank lasts ${pct(lastsShare(HALF))} of a Grand Prix.`, 'Pick the first card.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  const step = () => STEPS[m.index];
  const lane = (litres, label, car = CAR) => ({litres, label, car});
  const freeLane = () => { m.lanes = [lane(m.litres, CARS[m.car].name, m.car)]; m.race = null; };

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', litres: TANK_LITRES, level: TANK_LITRES, lanes: [], race: null, jug: 0, weighed: [], auto: null, then: null,
      result: null, answered: null, say: '', day: 0, onScale: null, saved: 0, lastPour: -1, gp: null, can: 0, car: CAR, rows: [], tested: new Set(), tries: 0, noted: false, again: false, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.lanes = [lane(TANK_LITRES, 'Full tank'), lane(HALF, 'Half tank')]; m.race = {at: .6, t: null}; m.phase = 'running'; }
    if (id === 'word-fuel-load') { m.litres = 0; m.level = 0; m.phase = 'pour'; }
    if (id === 'word-litre') m.phase = 'jug';
    if (id === 'word-kilogram') m.phase = 'weigh';
    if (id === 'word-speed') { m.lanes = [lane(TANK_LITRES, CARS[CAR].name)]; m.phase = 'ready'; }
    if (id === 'watch') { m.phase = 'drain'; m.lanes = [lane(TANK_LITRES, 'Full tank'), lane(HALF, 'Half tank'), lane(0, 'Empty tank')]; }
    if (id === 'try-half' || id === 'try-weigh' || id === 'alone') m.phase = 'pour';
    if (id === 'try-free') { m.phase = 'pour'; freeLane(); }
    if (CHECKS[id]) {
      m.phase = m.answered === null ? 'ask' : 'answered';
      if (CHECKS[id].race) m.lanes = [lane(TANK_LITRES, 'Full tank'), lane(HALF, 'Half tank')];
    }
  }
  const startRace = (delay = 0) => { m.race = {at: m.time + delay, t: null}; };
  const pourable = () => (['word-fuel-load', 'try-free', 'try-half', 'try-weigh', 'alone'].includes(step().id) && (m.phase === 'pour' || m.phase === 'result')) || (step().id === 'word-fuel-load' && m.phase === 'done');
  // The next fuel load the free test has not tried on this car, so that Show me reaches a different setting each time.
  const freeGoal = () => [m.litres, ...FREE_ORDER].find(litres => !m.tested.has(`${m.car}/${litres}`)) ?? m.litres;
  // The litres the step asks for: what Show me pours to.
  function goal() {
    const id = step().id;
    return id === 'word-fuel-load' ? TANK_LITRES : id === 'try-free' ? freeGoal() : id === 'try-half' ? HALF : id === 'try-weigh' ? WEIGH_LITRES : leastLitres(DAYS[Math.min(m.day, DAYS.length - 1)].share);
  }

  // What Brian says while Show me pours, so his "That is how it is done." is about what he did.
  function autoSay() {
    const id = step().id, to = m.auto ?? goal();
    if (id === 'word-fuel-load') return `I will fill the tank to ${TANK_LITRES} litres.`;
    if (id === 'try-free') return `I will set the tank to ${to} litres, and then race.`;
    if (id === 'try-half') return `I will set the tank to ${HALF} litres, which is half of ${TANK_LITRES}, and then race.`;
    if (id === 'try-weigh') return `I will pour until the scale reads ${kg1(WEIGH_KG)}, and then weigh the petrol.`;
    return `I will set the tank to ${to} litres, the least that lasts this race, and then race.`;
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
    if (kind === 'car') return changeCar(value);
    if (kind === 'go') return go();
    if (id === 'word-litre' && kind === 'fill' && m.phase === 'jug') { m.phase = 'filling'; return {kind: 'progress', say: 'Watch the jug fill to its line.'}; }
    if (id === 'word-kilogram' && kind === 'weigh' && m.phase === 'weigh') {
      const what = value === 'best' ? ['water', 'petrol'].find(w => !m.weighed.includes(w)) : value;
      if (!['water', 'petrol'].includes(what)) return null;
      m.onScale = what;
      if (!m.weighed.includes(what)) m.weighed.push(what);
      if (m.weighed.length < 2) {
        m.say = what === 'water' ? `One litre of water has a mass of ${kg2(WATER_KG_PER_LITRE)}. Now weigh the litre of petrol by pressing 2.` : `One litre of petrol has a mass of ${kg2(PETROL_KG_PER_LITRE)}. Now weigh the litre of water by pressing 1.`;
        return {kind: 'progress', sound: 'lab.clunk', say: m.say};
      }
      m.phase = 'done'; seen.add(id);
      m.say = `Each jug holds the same space, one litre, but the water has a mass of ${kg2(WATER_KG_PER_LITRE)} and the petrol has a mass of ${kg2(PETROL_KG_PER_LITRE)}. So water has a density of ${WATER_KG_PER_LITRE.toFixed(2)} kg per litre and petrol has a density of ${PETROL_KG_PER_LITRE} kg per litre. Litres measure space, and kilograms measure mass.`;
      return {kind: 'right', sound: 'lab.clunk', say: m.say};
    }
    return null;
  }

  // ← and → choose the free test's car.
  function changeCar(way) {
    if (step().id !== 'try-free' || m.phase !== 'pour' || m.auto != null || (way !== 'prev' && way !== 'next')) return null;
    const at = FREE_CARS.indexOf(m.car), n = FREE_CARS.length;
    m.car = FREE_CARS[(at + (way === 'next' ? 1 : n - 1)) % n];
    freeLane();
    return {kind: 'sound', sound: 'lab.tick'};
  }

  // ↑ pours 5 litres in from the nozzle, ↓ lets 5 out through the tap into the jerry can.
  function pour(way, held) {
    if (!pourable()) return null;
    if (m.phase === 'result' && (way === 'best' || way === 'in' || way === 'out')) m.phase = 'pour';
    if (way === 'best') {
      m.auto = goal(); m.then = step().id === 'word-fuel-load' ? null : 'go';
      if (step().id === 'try-half') m.lanes = [];
      return {kind: 'progress', say: autoSay()};
    }
    if (way !== 'in' && way !== 'out') return null;
    if (held && m.time - m.lastPour < HELD_GAP_S) return null;
    const before = m.litres;
    m.litres = way === 'in' ? Math.min(TANK_LITRES, before + POUR_LITRES) : Math.max(0, before - POUR_LITRES);
    // Under the cloth Brian does not say the litres.
    const covered = step().id === 'try-weigh';
    if (m.litres === before) {
      if (held) return null;
      m.noted = true;
      return {kind: 'note', say: way === 'in' ? covered ? 'The tank is full.' : `The tank is full, with ${TANK_LITRES} litres.` : 'The tank is empty.'};
    }
    m.lastPour = m.time;
    if (way === 'out') m.can += POUR_LITRES;
    if (covered) m.say = '';
    // After a race the strip clears, ready for the next one with the new load.
    if (step().id === 'try-half') m.lanes = [];
    if (step().id === 'try-free') freeLane();
    return poured(held);
  }
  function poured(held) {
    const id = step().id, sound = held ? null : 'lab.splash';
    if (id === 'word-fuel-load' && m.phase === 'pour' && m.litres === TANK_LITRES) {
      m.phase = 'done'; m.auto = null; seen.add(id);
      m.say = `A full tank holds ${TANK_LITRES} litres of petrol, and that petrol has a mass of ${kg1(fuelKg(TANK_LITRES))}. You can keep pouring with ↑ and ↓ to watch the scale and the sum change.`;
      return {kind: 'right', say: m.say};
    }
    // "The tank is full" is true only until the next pour, so the next pour clears it.
    if (m.noted) { m.noted = false; return {kind: 'note', sound}; }
    return sound ? {kind: 'sound', sound} : null;
  }

  function go() {
    const id = step().id;
    if (id === 'word-speed' && m.phase === 'ready') {
      m.phase = 'running'; startRace(.2);
      return {kind: 'progress', say: 'Watch the speed climb on the graph.'};
    }
    if (!pourable() || m.auto != null) return null;
    if (id === 'try-free') {
      freeLane(); m.phase = 'running'; startRace(.2);
      return {kind: 'progress', say: `The ${CARS[m.car].name} is racing with ${m.litres} litres of petrol. Watch the stopwatch.`};
    }
    if (id === 'try-half') {
      m.lanes = [lane(m.litres, 'Your tank'), lane(TANK_LITRES, 'Full tank')]; m.phase = 'running'; startRace(.2);
      runs.push(m.litres, TANK_LITRES);
      return {kind: 'progress', say: `Your tank holds ${m.litres} litres and is racing a full tank. Watch the stopwatches.`};
    }
    // Pouring by mass: Space weighs the petrol. Right on 37.0 kg; otherwise the scale says how far off, and which way to pour.
    if (id === 'try-weigh') {
      const kg = fuelKg(m.litres), off = Math.abs(kg - WEIGH_KG);
      if (m.litres === WEIGH_LITRES) {
        m.phase = 'done'; seen.add(id);
        m.say = `The scale reads ${kg1(WEIGH_KG)}, which is correct. Every litre has a mass of ${PETROL_KG_PER_LITRE} kg, so ${kg1(WEIGH_KG)} of petrol fills ${WEIGH_LITRES} litres of the tank.`;
        return {kind: 'right', say: m.say};
      }
      m.say = kg > WEIGH_KG ? `The scale reads ${kg1(kg)}, which is ${kg1(off)} too heavy. Each press of ↓ lets out ${kg1(fuelKg(POUR_LITRES))}.`
        : `The scale reads ${kg1(kg)}, which is ${kg1(off)} too light. Each press of ↑ pours in ${kg1(fuelKg(POUR_LITRES))}.`;
      return {kind: 'fail', say: m.say};
    }
    if (id === 'alone') {
      const day = DAYS[m.day];
      m.phase = 'running'; m.gp = {litres: m.litres, share: day.share, t: 0, dryAt: null};
      runs.push(m.litres);
      return {kind: 'progress', say: `The car is racing ${lowerFirst(day.name)} on ${m.litres} litres.`};
    }
    return null;
  }

  // The free test: the table keeps the result; the sums showed it first, and the stopwatch is the bench's own run, carried on to 100 km/h.
  function judgeFree() {
    const {litres, car} = m.lanes[0], s = sumsOf(litres, car), seconds = secondsOf(litres, car), full = secondsOf(TANK_LITRES, car);
    m.phase = 'pour';
    m.rows = [...m.rows, {car: CARS[car].name, litres, total: s.total, accel: s.accel, seconds}];
    m.tested.add(`${car}/${litres}`); m.tries = m.tested.size;
    if (m.tries >= FREE_TRIES) seen.add('try-free');
    const saved = Number(full.toFixed(2)) - Number(seconds.toFixed(2));
    m.say = `The ${CARS[car].name} with ${litres} litres has a total mass of ${num(s.total)} kg and an acceleration of ${s.accel.toFixed(3)} m/s², and the stopwatch stopped at ${s2(seconds)}. ` +
      (litres === TANK_LITRES ? 'Its tank is full, so no fuel load gives this car a longer time.' : saved < .005 ? `With a full tank this car also stops the stopwatch at ${s2(full)}, so ${TANK_LITRES - litres} fewer litres made no difference that the stopwatch can show.` : `With a full tank this car stops the stopwatch at ${s2(full)}, so carrying ${TANK_LITRES - litres} fewer litres saved ${saved.toFixed(2)} s.`) +
      ` ${m.tries >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change a setting and test a different one.'}`;
    return {kind: 'right', say: m.say};
  }
  function judgeHalf() {
    const mine = m.lanes[0].litres, mineS = secondsTo100(mine);
    m.phase = 'result';
    if (mine === HALF) {
      seen.add('try-half'); m.result = {right: true};
      m.say = `A tank holding ${HALF} litres, half of ${TANK_LITRES}, carries ${kg1(fuelKg(HALF))} of petrol. That car reached ${TARGET_TEXT} in ${s2(HALF_S)} and the full tank reached it in ${s2(FULL_S)}, so the car with half a tank was ${gapWords(gapAtWin(HALF, TANK_LITRES))} ahead when it got there.`;
      return {kind: 'right', say: m.say};
    }
    m.result = {right: false};
    if (mine === TANK_LITRES) m.say = `Both tanks were full, with ${TANK_LITRES} litres each, so the two cars tied at ${s2(FULL_S)}. Half of ${TANK_LITRES} is ${HALF}, so pour out ${TANK_LITRES - HALF} litres with ↓ and race again.`;
    else if (mine > HALF) m.say = `${mine} litres is more than half, and that car stopped the stopwatch at ${s2(mineS)} against ${s2(FULL_S)} for the full tank. Half of ${TANK_LITRES} is ${HALF}, so pour out ${mine - HALF} more litres with ↓ and race again.`;
    else m.say = `${mine} litres is less than half. That car won, stopping the stopwatch at ${s2(mineS)} against ${s2(FULL_S)} for the full tank, but half of ${TANK_LITRES} is ${HALF}, so pour in ${HALF - mine} litres with ↑ and race again.`;
    return {kind: 'wrong', say: m.say};
  }

  // Brian's job: too little runs out before the flag, too much carries mass for nothing; that race again.
  function judgeJob() {
    const day = DAYS[m.day], litres = m.gp.litres, lasts = lastsShare(litres), least = leastLitres(day.share);
    m.phase = 'pour'; m.gp.over = true;
    if (lasts < day.share) {
      m.say = `${litres} litres lasts ${pctAbout(lasts)} of a Grand Prix, so the car ran out of petrol before the flag. ${day.name} uses about ${Math.ceil(litresFor(day.share))} litres and the pump pours ${POUR_LITRES} litres at a time, so set the tank to ${least} litres and race again.`;
      return {kind: 'fail', say: m.say};
    }
    if (litres > least) {
      m.say = `The car finished, but ${litres} litres lasts ${pctAbout(lasts)} of a Grand Prix, so ${litres - least} litres, which is ${kg1(fuelKg(litres - least))}, was extra mass that the car carried for nothing. Set the tank to ${least} litres and race again.`;
      return {kind: 'fail', say: m.say};
    }
    m.day += 1; m.saved += TANK_LITRES - litres;
    if (m.day >= DAYS.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `You finished all three races with just enough petrol. You left ${m.saved} litres behind, which is ${kg1(fuelKg(m.saved))} that the car never carried. That finishes the job.`;
      return {kind: 'pass', say: m.say};
    }
    m.litres = TANK_LITRES; m.gp = null; m.can = 0;
    m.say = `Correct. ${litres} litres lasts ${pctAbout(lasts)} of a Grand Prix, which is just enough for this race. The next race is ${lowerFirst(DAYS[m.day].name)}, and the tank is full again.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    m.level += Math.max(-LEVEL_LPS * dt, Math.min(LEVEL_LPS * dt, m.litres - m.level));
    if (m.auto != null && m.time - m.lastPour >= HELD_GAP_S) {
      if (m.litres === m.auto) { m.auto = null; const then = m.then; m.then = null; return then === 'go' ? go() : null; }
      const way = Math.sign(m.auto - m.litres);
      m.litres += way * POUR_LITRES; m.lastPour = m.time;
      if (way < 0) m.can += POUR_LITRES;
      if (id === 'try-free') freeLane();
      return poured(true);
    }
    if (id === 'word-litre' && m.phase === 'filling') {
      m.jug = Math.min(1, m.jug + dt / FILL_S);
      if (m.jug < 1) return null;
      m.phase = 'done'; seen.add(id);
      m.say = `This jug now holds one litre. The car’s tank holds ${TANK_LITRES} litres, which is ${TANK_LITRES} of these jugs.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'watch' && m.phase === 'drain') {
      m.litres = Math.max(0, m.litres - DRAIN_LPS * dt); m.level = m.litres; m.can = TANK_LITRES - m.litres;
      if (m.litres <= 0) { m.phase = 'running'; startRace(.5); }
      return null;
    }
    if (m.gp && !m.gp.over) return jobTick(dt);
    if (!m.race) return null;
    if (m.race.t == null) { if (m.time < m.race.at) return null; m.race.t = 0; }
    const end = Math.max(...m.lanes.map(l => secondsOf(l.litres, l.car))) + SETTLE_S, before = m.race.t;
    if (before >= end) return null;
    m.race.t = Math.min(end, before + dt);
    const crossed = m.lanes.some(l => before < secondsOf(l.litres, l.car) && m.race.t >= secondsOf(l.litres, l.car));
    if (m.race.t < end) return crossed ? {kind: 'sound', sound: 'lab.tick'} : null;
    // The race has just settled: a question's race only shows; the others are judged or done.
    if (CHECKS[id]) return null;
    if (id === 'try-half') return judgeHalf();
    if (id === 'try-free') return judgeFree();
    m.phase = 'done'; seen.add(id);
    if (id === 'word-speed') { m.say = speedResult(); return {kind: 'right', say: m.say}; }
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
    if (id === 'wonder' || id === 'watch') { enter(m.index); return null; }
    if (id === 'word-speed' && m.phase === 'done') { m.race = null; m.phase = 'running'; startRace(.2); return null; }
    if (CHECKS[id]?.race && m.phase === 'answered') { m.race = null; startRace(.3); return null; }
    if (id === 'try-half' && m.phase === 'result') return go();
    return null;
  }

  // The cars on the strip: one clock for every lane, so the lighter car is ahead of the heavier one all the way.
  function laneViews() {
    const seconds = l => secondsOf(l.litres, l.car);
    const fastest = Math.min(...m.lanes.map(seconds)), slowest = Math.max(...m.lanes.map(seconds));
    // The cars park where they are when the last one reaches the speed.
    const t = m.race?.t == null ? null : Math.min(m.race.t, slowest);
    const tie = m.lanes.every(l => seconds(l) === fastest), winner = m.lanes.find(l => seconds(l) === fastest);
    const won = !tie && t != null && t >= fastest;
    return m.lanes.map(l => {
      const at = t == null ? null : movedBy(seconds(l), t);
      return {label: l.label, car: l.car, carName: CARS[l.car].name, litres: l.litres, kg: fuelKg(l.litres), sums: sumsOf(l.litres, l.car),
        metres: at ? at.metres : 0, kmh: at ? at.speed * KMH_PER_MS : 0, seconds: t == null ? null : Math.min(t, seconds(l)), done: t != null && t >= seconds(l),
        winner: won && l === winner, behindM: won && l !== winner && seconds(l) > fastest ? gapAtWin(winner.litres, l.litres) : null,
        photoM: won ? movedBy(seconds(l), fastest).metres : null};
    });
  }

  function view() {
    const id = step().id;
    const base = {scene: 'shop', time: m.time, litres: m.litres, level: m.level, kg: fuelKg(m.litres), can: m.can, tank: false, scale: true, gauge: true, covered: false,
      half: false, jug: null, jugs: null, lanes: m.lanes.length ? laneViews() : [], plain: false, laneSums: false, graph: null, free: null, job: null, tune: null, best: null, runs: [...runs], formulas: [],
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (id === 'wonder') return {...base, actions: ['replay'], plain: true,
      say: m.phase === 'done' ? `The car with half a tank reached ${TARGET_TEXT} first, in ${s2(HALF_S)}, and the car with a full tank reached it in ${s2(FULL_S)}. The only difference between the cars was the petrol in their tanks, so why did the car with less petrol win?${MORE}The picture shows the moment when the first car got there, with the other car ${Math.round(gapAtWin(HALF, TANK_LITRES) * 100)} centimetres, written cm, behind.`
        : `Here are two identical cars with the same engine. One car has a full tank of petrol and the other has half a tank. Both start from a standstill and race until they reach ${TARGET_KMH} kilometres per hour, which is written km/h.${MORE}The road is marked in metres, written m, and the stopwatches count in seconds, written s. Watch which car gets there first.`,
      prompt: m.phase === 'done' ? 'Press Enter when you are ready to find out, or press R to watch again.' : seen.has(id) ? 'Watch the two cars, or press Enter when you are ready to find out.' : 'Watch the two cars.',
      hints: [`Watch which car reaches ${TARGET_TEXT} first.`, 'The only difference is the petrol in the tanks.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch until both stopwatches have stopped, then press Enter.']};
    if (id === 'word-litre') {
      const ready = m.phase === 'jug', done = m.phase === 'done';
      return {...base, scale: false, jug: {fill: m.jug}, formulas: LITRE_SUM, ...(ready ? {keys: {Space: 'fill'}, buttons: [{action: 'fill', label: 'Fill the jug', key: 'Space'}], waiting: true, target: 'fill', glow: 'jug'} : {}),
        say: done ? m.say : m.phase === 'filling' ? 'Watch the jug fill to its line.' : 'A litre, written L, measures how much space a liquid fills. One litre fills a box that is 10 cm wide, 10 cm deep and 10 cm tall. Fill this jug to its line.',
        prompt: ready ? 'Press Space to fill the jug, or click it.' : done ? 'Press Enter to continue.' : 'Watch the jug fill.',
        hints: done ? DONE : ['The jug has a line marked 1 litre.', 'Press Space, or click the jug.', 'Watch my pointer. I will fill the jug.']};
    }
    if (id === 'word-kilogram') {
      const done = m.phase === 'done', bestJug = ['water', 'petrol'].find(w => !m.weighed.includes(w));
      const rows = m.weighed.map(what => { const d = what === 'water' ? WATER_KG_PER_LITRE : PETROL_KG_PER_LITRE; return {title: what === 'water' ? 'Water' : 'Petrol', worked: `${kg2(d)} ÷ 1 litre = ${d.toFixed(2)} kg per litre`}; });
      return {...base, jugs: {weighed: [...m.weighed], on: m.onScale ?? null},
        formulas: [{title: 'Density', formula: 'density = mass ÷ litres', note: m.weighed.length ? null : 'Put a jug on the scale to fill in this sum.'}, ...rows],
        ...(done ? {} : {keys: {1: 'weigh:water', 2: 'weigh:petrol'}, waiting: true, target: 'weigh:best', glow: 'jugs',
          bestJug, buttons: [{action: 'weigh:water', label: 'Weigh the water', key: '1'}, {action: 'weigh:petrol', label: 'Weigh the petrol', key: '2'}]}),
        say: done || m.weighed.length ? m.say : `A kilogram, written kg, measures mass. Mass is how much matter an object contains, and a scale reads it in kilograms. Density is the mass of one litre of a liquid, written in kg per litre.${MORE}When people ask what something weighs, they usually mean its mass in kilograms. Here are one litre of water and one litre of petrol. Put each jug on the scale and compare the readings.`,
        prompt: done ? 'Press Enter to continue.' : m.weighed.length ? `Press ${bestJug === 'water' ? 1 : 2} to weigh the ${bestJug}, or click its jug.` : 'Press 1 for the water and 2 for the petrol, or click a jug.',
        hints: done ? DONE : ['Both jugs hold one litre.', `Press ${bestJug === 'water' ? 1 : 2} to weigh the ${bestJug}, and read the scale.`, `Watch my pointer. I will weigh the ${bestJug}.`]};
    }
    if (id === 'word-fuel-load') {
      const done = m.phase === 'done';
      return {...base, tank: true, formulas: [fuelSum(m.litres)],
        ...(done ? {keys: POUR_KEYS, repeat: ['↑', '↓'], buttons: [{action: 'pour:out', label: 'Pour out', key: '↓'}, {action: 'pour:in', label: 'Pour in', key: '↑'}]}
          : {keys: {'↑': 'pour:in'}, repeat: ['↑'], waiting: m.auto == null, target: m.auto == null ? 'pour:best' : null, glow: 'nozzle', best: TANK_LITRES, buttons: [{action: 'pour:in', label: 'Pour in', key: '↑'}]}),
        say: done ? m.say : m.auto != null ? autoSay() : `Fuel load is the amount of petrol that the car carries, and we measure it in litres. This tank is empty. Fill it, and watch the sum beside the picture change.${MORE}Every litre adds mass, so the scale under the tank reads higher as the tank fills.`,
        prompt: done ? `The tank holds ${m.litres} litres. Press Enter to continue, or keep pouring with ↑ and ↓.` : `The tank holds ${m.litres} litres. Press ↑ to pour petrol in (hold it to keep pouring), or click the nozzle.`,
        hints: done ? DONE : ['The pump nozzle is over the tank.', `Press ↑ until the gauge reads ${TANK_LITRES} litres.`, 'Watch my pointer. I will fill the tank.']};
    }
    if (id === 'word-speed') {
      const ready = m.phase === 'ready', done = m.phase === 'done', told = Boolean(m.say), seconds = secondsTo100(TANK_LITRES), rise = risePerSecond();
      return {...base, plain: true, actions: done ? ['replay'] : [], graph: {t: m.race?.t ?? 0, seconds, rise, done: told},
        formulas: [speedSum(), ...(told ? [{title: 'Acceleration', formula: 'acceleration = change in speed ÷ time', worked: `${TARGET_MS} m/s ÷ ${s2(seconds)} = ${rise.toFixed(2)} m/s^2`, note: 'Acceleration is measured in metres per second, per second, written m/s^2.'}] : [])],
        ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'strip', buttons: [{action: 'go', label: 'Race', key: 'Space'}]} : {}),
        say: told ? m.say : m.phase === 'running' ? 'Watch the speed climb on the graph.'
          : `Speed is how fast the car is moving. We usually give speed in km/h, but the sums use metres per second, written m/s, which is the number of metres travelled during each second.${MORE}To change km/h into m/s you divide by 3.6, because an hour has 3,600 seconds and a kilometre has 1,000 metres. The stopwatch stops when the car reaches ${TARGET_TEXT}, which is the same as ${TARGET_MS} m/s. Press Space to race the car to that speed, and watch how its speed grows.`,
        prompt: ready ? 'Press Space to race, or click the road.' : done ? 'Press Enter to continue, or press R to watch the race again.' : 'Watch the graph.',
        hints: done ? DONE : ['The graph shows the speed during every second of the race.', 'Press Space, or click the road.', 'Watch my pointer. I will start the race.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done', draining = m.phase === 'drain', shown = Math.round(m.litres);
      return {...base, tank: true, laneSums: !draining, actions: ['replay', 'slow'],
        formulas: draining ? [fuelSum(shown), totalSum(shown), accelSum(shown)] : [{title: 'Acceleration', formula: 'acceleration = force ÷ total mass', note: FORCE_NOTE}, ...raceSums([['Full tank', TANK_LITRES], ['Half tank', HALF], ['Empty tank', 0]])],
        say: done ? `The car with the least mass reached ${TARGET_TEXT} first, in ${s2(EMPTY_S)} with an empty tank, ${s2(HALF_S)} with half a tank and ${s2(FULL_S)} with a full tank. The reason is that the same force speeds up every kilogram of the car. With fewer kilograms to speed up, each kilogram receives a larger share of the force, so the whole car accelerates faster.${MORE}The sum shows the same thing, because when the total mass goes down and the force stays the same, the acceleration goes up. The difference is small, because a full tank is only ${kg1(fuelKg(TANK_LITRES))} of a ${whole(sumsOf(TANK_LITRES).total)} kg car, so the empty tank beat the full tank by only ${gapWords(gapAtWin(0, TANK_LITRES))}.`
          : draining ? `A force is a push or a pull, and we measure force in newtons, written N. One newton gives one kilogram an acceleration of 1 m/s². In this game the engine pushes this car with the same force, ${whole(sumsOf(TANK_LITRES).force)} N, whatever the tank holds.${MORE}Every litre of petrol adds ${PETROL_KG_PER_LITRE} kg to the car. Watch the scale as I empty the tank, and then three identical cars will race with a full tank, half a tank and an empty tank.`
            : 'Now three identical cars are racing, with a full tank, half a tank and an empty tank. Watch the stopwatches.',
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : draining ? 'Watch the scale.' : 'Watch the three cars.',
        hints: ['Watch the kilograms on the scale fall as the litres pour out.', `Watch which car reaches ${TARGET_TEXT} first.`, done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    if (id === 'try-free') {
      const running = m.phase === 'running', to = goal();
      const v = {...base, tank: true, laneSums: true, best: to, formulas: allSums(m.lanes[0].litres, m.lanes[0].car, 'Each car has its own engine, so each car has its own force. The force stays the same whatever the tank holds.'),
        free: {car: CARS[m.car].name, rows: m.rows.map(r => ({...r})), can: !running && m.auto == null}};
      if (running) return {...v, say: m.say || `The ${CARS[m.car].name} is racing with ${m.litres} litres of petrol.`, prompt: 'Watch the stopwatch.', hints: ['Watch the stopwatch.', 'Compare the time with the sum in the panel.', 'Wait a moment.']};
      const ready = seen.has(id);
      return {...v, ...pouring('Race', m.auto != null ? null : to === m.litres ? 'go' : 'pour:best'), keys: {...POUR_KEYS, ...CAR_KEYS, Space: 'go'}, waiting: !ready && m.auto == null, glow: null,
        say: m.auto != null ? autoSay() : m.say || `Now you can experiment. Press ↑ and ↓ to change the fuel load, and ← and → to change the car. The panel shows the sums for your settings before you race, so predict the time and then press Space to check it.${MORE}Every car in this test has a ${TANK_LITRES} litre tank, and each car has its own engine and its own mass. Test at least ${FREE_TRIES} different settings. The table keeps your results so that you can compare them.`,
        prompt: ready ? 'Press Enter to continue, or test another setting.' : `${to === m.litres ? 'Press Space to race with these settings, or change them first.' : 'Change a setting, then press Space to race.'} You have tested ${m.tries} of ${FREE_TRIES} different settings.`,
        hints: [to === m.litres ? 'Press Space to test the settings as they are.' : 'You have tested these settings, so change the fuel load or the car.', 'Try the same fuel load on the Falcone Sirena and on the Titan Monster, and compare how much time the petrol costs each car.', to === m.litres ? 'Watch my pointer. I will race with the settings as they are.' : `Watch my pointer. I will set the tank to ${to} litres, and then race.`]};
    }
    if (id === 'try-half' || id === 'try-weigh') {
      const weigh = id === 'try-weigh', want = weigh ? WEIGH_LITRES : HALF;
      const target = m.auto != null ? null : m.litres === want && m.phase === 'pour' ? 'go' : 'pour:best';
      const racing = m.lanes[0]?.litres ?? m.litres, press = m.litres > want ? '↓' : '↑';
      const off = Number((fuelKg(m.litres) - WEIGH_KG).toFixed(1));
      // Under the cloth the panel never shows the litres in the tank; the sum follows the scale instead.
      const weighSums = [{title: 'Mass of one press', formula: 'mass = litres × density', worked: `${POUR_LITRES} litres × ${PETROL_KG_PER_LITRE} kg per litre = ${kg1(fuelKg(POUR_LITRES))}`},
        {title: 'How far the scale is from the target', formula: `difference = reading on the scale − ${kg1(WEIGH_KG)}`, worked: `${kg1(fuelKg(m.litres))} − ${kg1(WEIGH_KG)} = ${off < 0 ? '−' : ''}${kg1(Math.abs(off))}`, note: 'A minus sign means that the scale reads too low.'},
        ...(m.phase === 'done' ? [{title: 'Litres in the tank', formula: 'litres = mass ÷ density', worked: `${kg1(WEIGH_KG)} ÷ ${PETROL_KG_PER_LITRE} kg per litre = ${WEIGH_LITRES} litres`}] : [])];
      const view = {...base, tank: true, covered: weigh, half: !weigh, best: want, laneSums: !weigh, formulas: weigh ? weighSums : allSums(m.phase === 'running' ? racing : m.litres)};
      if (m.phase === 'running') return {...view, say: `Your tank holds ${racing} litres and is racing a full tank.`, prompt: 'Watch the stopwatches.', hints: ['Watch the two cars.', `Which car reaches ${TARGET_TEXT} first?`, 'Wait a moment.']};
      if (m.phase === 'done' || m.phase === 'result' && m.result?.right) return {...view, ...(weigh ? {} : pouring('Race', null)), waiting: false, actions: weigh ? [] : ['replay'], mood: 'cheer', say: m.say,
        prompt: weigh ? 'Press Enter to continue.' : 'Press Enter to continue, or press R to watch the race again.', hints: DONE};
      return {...view, ...pouring(weigh ? 'Weigh it' : 'Race', target), waiting: m.auto == null, actions: m.phase === 'result' ? ['replay'] : [],
        say: m.auto != null ? autoSay() : m.phase === 'result' || weigh && m.say ? m.say : weigh ? `The gauge is covered, so you must use the scale. Pour petrol in or out until the scale reads ${kg1(WEIGH_KG)}, then press Space to weigh it.` : 'Pour petrol in or out until the tank is half full, then race it against a full tank.',
        prompt: weigh ? `The scale reads ${kg1(fuelKg(m.litres))}. ${m.litres === want ? 'Press Space to weigh it.' : 'Press ↓ to pour out, ↑ to pour in, or Space to weigh it.'}` : `The tank holds ${m.litres} litres of petrol, which is ${kg1(fuelKg(m.litres))}. ${m.litres === want ? 'Press Space to race.' : 'Press ↓ to pour out, ↑ to pour in, or Space to race.'}`,
        hints: weigh ? ['Watch the scale, because the gauge is covered.', `Every ${POUR_LITRES} litres has a mass of ${kg1(fuelKg(POUR_LITRES))}. ${m.litres === want ? `The scale reads ${kg1(WEIGH_KG)}, so press Space.` : `Press ${press} until the scale reads ${kg1(WEIGH_KG)}, then press Space.`}`, m.litres === want ? 'Watch my pointer. I will weigh the petrol.' : 'Watch my pointer. I will pour the petrol and weigh it.']
          : ['The gauge has a line at half.', `Half of ${TANK_LITRES} litres is ${HALF} litres. ${m.litres === want ? `The gauge reads ${HALF} litres, so press Space.` : `Press ${press} until the gauge reads ${HALF} litres, then press Space.`}`, m.litres === want ? 'Watch my pointer. I will race.' : 'Watch my pointer. I will pour the petrol and race.']};
    }
    if (id === 'alone') {
      const day = DAYS[Math.min(m.day, DAYS.length - 1)], least = leastLitres(day.share);
      const job = {name: day.name, share: day.share, day: Math.min(m.day, DAYS.length - 1) + 1, of: DAYS.length, lasts: lastsShare(m.litres), done: m.phase === 'done',
        race: m.gp ? {litres: m.gp.litres, at: Math.min(1, m.gp.dryAt != null ? lastsShare(m.gp.litres) / m.gp.share : m.gp.t / RACE_S), dry: m.gp.dryAt != null, over: Boolean(m.gp.over)} : null};
      const view = {...base, tank: true, job, best: least, formulas: [shareSum(m.litres), {title: 'This race', note: `This race is ${pct(day.share)} of a Grand Prix, so the petrol must last at least that far.`}, fuelSum(m.litres)]};
      if (m.phase === 'done') return {...view, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      if (m.phase === 'running') return {...view, say: `The car is racing ${lowerFirst(day.name)} on ${m.gp.litres} litres.`, prompt: 'Watch the race.', hints: ['Watch the car and its petrol.', 'Does the car reach the flag?', 'Wait a moment.']};
      const target = m.auto != null ? null : m.litres === least ? 'go' : 'pour:best';
      return {...view, ...pouring('Race', target), waiting: m.auto == null,
        say: m.auto != null ? autoSay() : m.day === 0 && !m.say ? `Here is a job for you. A Grand Prix is one of the game’s long races, on a course with a pit lane, which is the place where a car stops to refill its tank. Carry the petrol you need and no more, so pour the least that lasts the race and then press Space.${MORE}In this game a full tank lasts ${pct(GRAND_PRIX.fullTankShare)} of a Grand Prix, which is the whole race and a little more. You will run three races of different lengths, and the tank starts full each time. The first race is ${lowerFirst(DAYS[0].name)}.` : m.say,
        prompt: `The tank holds ${m.litres} litres, which lasts ${pctAbout(lastsShare(m.litres))} of a Grand Prix. This race is ${pct(day.share)} of a Grand Prix. ${m.litres === least ? 'Press Space to race.' : 'Pour petrol in or out, then press Space to race.'}`,
        hints: [`This race is ${pct(day.share)} of a Grand Prix. The card on the board shows how far your petrol lasts.`, m.litres === least ? 'The tank holds the least that lasts this race, so press Space.' : `Set the tank to ${least} litres, which is the least that lasts this race, then press Space.`, m.litres === least ? 'Watch my pointer. I will race.' : 'Watch my pointer. I will pour the petrol and race.']};
    }
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, laneSums: answered, formulas: check.formulas(answered),
        keys: answered ? {} : ANSWER_KEYS, actions: answered && check.race ? ['replay'] : [], waiting: !answered,
        tune: id === 'check-game' ? {picked: 2, effect: answered ? HALF_TANK_LINE : null} : null,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : PICK, hints: answered ? DONE : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, formulas: allSums(HALF),
      say: RECAP_SAY, prompt: 'Enter finishes the lesson and opens Fuel load on the Tune page in the garage.', hints: KEY_IDEAS.map(i => i.text)};
  }

  return {enter, act, tick, view, state: () => m};
}

// How fast the speed rises in the race on the graph, from the figures the screen shows.
const risePerSecond = () => Number((TARGET_MS / Number(secondsTo100(TANK_LITRES).toFixed(2))).toFixed(2));
function speedResult() {
  const rise = risePerSecond().toFixed(2);
  return `The car gained speed steadily and reached ${TARGET_MS} m/s in ${s2(secondsTo100(TANK_LITRES))}. How fast the speed changes is called acceleration, and we measure acceleration in metres per second, per second, written m/s².${MORE}This car’s acceleration is ${rise} m/s², which means that its speed rises by ${rise} m/s during every second. So m/s measures how fast the car is moving, and m/s² measures how fast that speed is changing.`;
}
const RECAP_SAY = `Every litre of petrol has a mass of ${PETROL_KG_PER_LITRE} kg, so a full tank of ${TANK_LITRES} litres adds ${kg1(fuelKg(TANK_LITRES))} to the car. The engine pushes with the same force whatever the tank holds, and acceleration is force divided by mass, so the same car with less petrol accelerates faster.${MORE}In a Grand Prix the petrol must still last the race, so carry the petrol you need and no more. All of this belongs to petrol cars. An electric car carries batteries instead, and a battery has the same mass whether it is full or empty, so an electric car has no Fuel load to set.`;

// The lesson's own races, as the bench's challenge reads them: the bench's goal (a full tank and half a tank or
// less) must pass on these, so finishing the lesson can never pass without them. The free test's races are the
// player's own experiment on several cars and do not count here.
export const benchAttempts = view => (view?.runs ?? []).map(litres => ({controls: [{id: 'litres'}], input: {litres}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = `You have passed Fuel and weight, and Fuel load is now open on the Tune page in the garage. A half tank accelerates faster, but in a Grand Prix its petrol runs out after ${pct(lastsShare(HALF))} of the race.`;

export const lesson = Object.freeze({id: 'fuel', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
