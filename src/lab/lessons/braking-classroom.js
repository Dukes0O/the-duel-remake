// Braking as a classroom lesson (docs/board/cards/LAB-CLASSROOM-BRAKING.md, "Claude's script"; its wording and formulas
// follow LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. Every stop is the braking bench's own run
// (brakingBench, the challenge's bench, which brakes each car as the game does), and question 3 is the Tune page's own
// Brake balance rule. The dial moves on the bench's own steps, shown in km/h; the sums use m/s.
import {CARS, DRIVE} from '../../config.js';
import {carMassKg} from '../../heli/heli-cable.js';
import {brakingBench, frontLoadShare, BRAKE_RIG} from '../benches/tunnel.js';
import {LAB_TUNE} from '../lab-tune.js';

// `speed` everywhere below is the bench's own setting. The speed dial and the brake lever move in the bench's steps'
// multiples: one dial step (about 16 km/h) and 10% a press.
export const SPEED_STEP = 10, MIN_SPEED = 20, MAX_SPEED = 150, LEVER_STEP = 10, MIN_FRONT = 40, MAX_FRONT = 90;
export const STEADY_FRONT = 70;
// A car arrives at its speed for a moment before the brake line, brakes at real speed, then rests a moment.
export const RUNUP_S = .6;
const SETTLE_S = .7, HELD_GAP_S = .14;
const MS_PER_SPEED = DRIVE.mphToWorld, KMH_PER_MS = 3.6;
// The bench's own car, the slow and fast settings of "twice the speed", and the cars of the free test (their brakes all differ).
const CAR_IDS = Object.keys(CARS);
export const BENCH_CAR = CAR_IDS[0], SLOW = 50, FAST = 100;
export const TEST_CARS = Object.freeze(['falcone_f42', 'stuttgart_959s', 'titan_monster', 'viper_proto', 'mcmurtry_speirling']);
export const FREE_TRIES = 3;

// The numbers as the panel shows them: rounded first, so that every sum comes out on a calculator.
export const msOf = speed => Number((speed * MS_PER_SPEED).toFixed(2));
export const kmh = speed => Math.round(speed * MS_PER_SPEED * KMH_PER_MS);
export const BRAKES_BASE = Number((DRIVE.brakeAccel * MS_PER_SPEED).toFixed(3)), DRAG_SHOWN = Number((DRIVE.dragCoeff * MS_PER_SPEED).toFixed(2));
export const brakesOf = (car = BENCH_CAR) => Number((BRAKES_BASE * CARS[car].braking).toFixed(2));
export const aOf = (car = BENCH_CAR) => Number((brakesOf(car) + DRAG_SHOWN).toFixed(2));
export const sumOf = (speed, car = BENCH_CAR) => msOf(speed) ** 2 / (2 * aOf(car));
export const stopOf = (speed, front = STEADY_FRONT, car = BENCH_CAR) => brakingBench.run({car, speedMph: speed, frontShare: front});
export const metresFrom = (speed, car = BENCH_CAR) => stopOf(speed, STEADY_FRONT, car).stopMetres;
export const m1 = metres => `${metres.toFixed(1)} m`;
const m2 = metres => `${metres.toFixed(2)} m`;
const ms2 = value => value.toFixed(2);
const whole = value => Math.round(value).toLocaleString('en-GB');
export const pct = share => `${Math.round(share * 100)}%`;
export const FRONT_LOAD = frontLoadShare(), REAR_LOAD = 1 - FRONT_LOAD;
export const carName = id => CARS[id].name;

// Where a car is t seconds after it appears: arriving at a steady speed, then braking evenly to a stop. ms is its speed now, in m/s.
export function laneAt(speed, front, t, car = BENCH_CAR) {
  const r = stopOf(speed, front, car), T = r.stopSeconds, D = r.stopMetres, full = speed * MS_PER_SPEED;
  if (t < RUNUP_S) return {metres: -(RUNUP_S - t) * full, ms: full, braking: false, done: false, brakeShare: 0};
  const tb = Math.min(t - RUNUP_S, T), k = tb / T;
  return {metres: D * (1 - (1 - k) ** 2), ms: full * (1 - k), braking: t - RUNUP_S < T, done: t - RUNUP_S >= T, brakeShare: k};
}
const runEnd = lanes => RUNUP_S + Math.max(...lanes.map(l => stopOf(l.speed, l.front, l.car).stopSeconds)) + SETTLE_S;

// Brian's job: three corners, each with a braking marker this far before it. The fastest steady stop in time: 97, 161 and 193 km/h.
export const CORNERS = Object.freeze([20, 50, 70]);
export const fastestFor = gap => {
  let best = null;
  for (let s = MIN_SPEED; s <= MAX_SPEED; s += SPEED_STEP) if (metresFrom(s) <= gap) best = s;
  return best;
};
// The wonder's line, 30 m on: the slower car stops before it, the faster car runs past.
export const LINE_M = 30;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why so much further?'},
  {id: 'word-speed', part: 1, title: 'Kilometres per hour and metres per second', word: 'braking-metres-per-second'},
  {id: 'word-stopping', part: 1, title: 'Stopping distance', word: 'braking-word-0'},
  {id: 'word-deceleration', part: 1, title: 'Deceleration', word: 'braking-deceleration'},
  {id: 'word-energy', part: 1, title: 'Energy of motion', word: 'braking-energy'},
  {id: 'word-weight', part: 1, title: 'Weight shift', word: 'braking-word-1'},
  {id: 'word-balance', part: 1, title: 'Brake balance', word: 'braking-word-2'},
  {id: 'watch', part: 2, title: 'Three cars at the same line', voice: 'lab.brian.braking.intro'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-speed', part: 3, title: 'Twice the speed'},
  {id: 'try-slide', part: 3, title: 'Keeping the back in line'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-four', part: 5, title: 'Question 1 of 3'},
  {id: 'check-balance', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.braking.explain'},
].map(Object.freeze));

export const S50 = metresFrom(SLOW), S100 = metresFrom(FAST);
const K50 = kmh(SLOW), K100 = kmh(FAST), V50 = msOf(SLOW), V100 = msOf(FAST);
export const KEY_IDEAS = Object.freeze([
  {id: 'four', text: `Twice the speed needs four times the road, because it carries four times the energy of motion for the same brakes to remove. The car needs ${m1(S50)} from ${K50} km/h and ${m1(S100)} from ${K100} km/h.`},
  {id: 'weight', text: `Braking moves weight forward. In a steady stop the front tyres carry ${pct(FRONT_LOAD)} of the weight, so the front brakes can do most of the work.`},
  {id: 'balance', text: `If the back brakes do more than the ${pct(REAR_LOAD)} of the weight on the back tyres, the back of the car slides. The Tune page in the garage calls this setting Brake balance.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Twice the speed needs four times the road.',
  text: 'Brake balance is on the Tune page in the garage. Moving it toward the rear makes the car brake a little harder, and moving it toward the front keeps more grip for turning while the car brakes.'});
// The notebook's words. The three old words keep the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'braking-metres-per-second', word: 'Metres per second (m/s)', meaning: 'Metres per second measure speed, as the number of metres an object travels during each second. To change m/s into kilometres per hour (km/h), multiply by 3.6.'},
  {id: 'braking-word-0', word: 'Stopping distance', meaning: 'Stopping distance is the length of road that a car uses while its brakes slow it to a stop.'},
  {id: 'braking-deceleration', word: 'Deceleration (m/s²)', meaning: 'Deceleration is how quickly a speed falls. A deceleration of 10 m/s² removes 10 m/s of speed during every second.'},
  {id: 'braking-energy', word: 'Energy of motion', meaning: 'Energy of motion is the energy that an object carries because it is moving. It equals ½ × mass × speed², so twice the speed carries four times the energy.'},
  {id: 'braking-word-1', word: 'Weight shift', meaning: 'Weight shift is the change in how much of a car’s weight presses on its front and back tyres. Braking moves weight onto the front tyres.'},
  {id: 'braking-word-2', word: 'Brake balance', meaning: 'Brake balance is how the braking is divided between the front brakes and the back brakes.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const DIAL_KEYS = Object.freeze({'↑': 'speed:up', '↓': 'speed:down'});
const LEVER_KEYS = Object.freeze({'→': 'lever:front', '←': 'lever:back'});
const CAR_KEYS = Object.freeze({'→': 'car:next', '←': 'car:prev'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const BRAKE = Object.freeze({action: 'go', label: 'Brake', key: 'Space'});
const leverButtons = () => [{action: 'lever:back', label: 'Toward the back', key: '←'}, {action: 'lever:front', label: 'Toward the front', key: '→'}];

// The guess in "Twice the speed": three pictures of where the faster car stops.
const GUESSES = Object.freeze([{label: 'About 24 m, which is twice as far', metres: 2 * S50}, {label: 'About 47 m, which is four times as far', metres: 4 * S50}, {label: 'About 94 m, which is eight times as far', metres: 8 * S50}]);

// The Tune page's own line for two steps toward the rear (tune-view.js effectLine), from the same table.
const signed = share => `${share > 0 ? '+' : ''}${Math.round(share * 100)}%`;
export const REAR_TWO_LINE = `Braking ${signed(2 * LAB_TUNE.brakes.brakingPerStep)}; cornering grip while braking ${signed(2 * LAB_TUNE.brakes.cornerLeftPerStep)}.`;
const SHOWN_LINE = REAR_TWO_LINE.replace('-', '−');
const CHECKS = {
  'check-four': {
    question: `A car brakes from ${K100} km/h instead of ${K50} km/h, which is twice the speed. How much road does the car need, compared with the road it needs from ${K50} km/h?`,
    answers: [{label: 'Twice as much road', picture: {kind: 'stops', metres: [S50, 2 * S50]}}, {label: 'Four times as much road', picture: {kind: 'stops', metres: [S50, S100]}}, {label: 'The same amount of road', picture: {kind: 'stops', metres: [S50, S50]}}],
    correct: 1,
    right: () => `Correct. The car needs ${m1(S50)} from ${K50} km/h and ${m1(S100)} from ${K100} km/h, which is four times the road for twice the speed, because twice the speed carries four times the energy of motion.`,
    wrong: picked => picked === 0 ? `The car needs more than twice as much road. It needs ${m1(S50)} from ${K50} km/h and ${m1(S100)} from ${K100} km/h, which is four times as far, because twice the speed carries four times the energy of motion.`
      : `The two distances are not the same. The car needs ${m1(S50)} from ${K50} km/h and ${m1(S100)} from ${K100} km/h, so the faster car needs four times the road.`,
    hints: [`Think of the two cars that you watched, from ${K50} km/h and from ${K100} km/h.`, `The two distances were ${m1(S50)} and ${m1(S100)}. How many times does the first go into the second?`, 'Pick “Four times as much road”.'],
  },
  'check-balance': {
    question: 'Which of these brake balances lets the car stop with the back of the car in line behind the front?',
    answers: [50, 60, 80].map(front => ({label: `${front}% front, ${100 - front}% back`, picture: {kind: 'lever', front}})),
    correct: 2,
    right: () => `Correct. While the car brakes, the back tyres carry only ${pct(REAR_LOAD)} of the weight. At 80% front the back brakes do 20% of the braking, which is less than ${pct(REAR_LOAD)}, so the back of the car stays in line.`,
    wrong: picked => `At ${[50, 60][picked]}% front the back brakes do ${100 - [50, 60][picked]}% of the braking, but the back tyres carry only ${pct(REAR_LOAD)} of the weight while the car brakes, so the back tyres lock and the back of the car slides. At 80% front the car stops steadily.`,
    hints: [`While the car brakes, the back tyres carry ${pct(REAR_LOAD)} of the weight.`, 'The back brakes must do a smaller share of the braking than that.', 'Pick 80% front.'],
  },
  'check-game': {
    question: 'On the Tune page in the garage, you move Brake balance two steps toward the rear. What changes when you race the car?',
    answers: [{label: `The car brakes ${signed(2 * LAB_TUNE.brakes.brakingPerStep).slice(1)} harder, but it has ${signed(2 * LAB_TUNE.brakes.cornerLeftPerStep).slice(1)} less grip for turning while it brakes`, picture: {kind: 'game', what: 'trade'}},
      {label: 'The car stops in a shorter distance and also turns better', picture: {kind: 'game', what: 'both'}}, {label: 'Nothing changes', picture: {kind: 'game', what: 'same'}}],
    correct: 0,
    right: () => 'Correct. The back brakes add a little stopping power, but the car has less grip for turning while it brakes, because the back of the car is closer to sliding. Moving the setting toward the front has the opposite effect.',
    wrong: picked => picked === 1 ? `It is a trade rather than a gain in both. The Tune page shows “${SHOWN_LINE}” More rear brake stops the car a little harder, but the car has less grip in a turn while it brakes.`
      : `The setting does change the car. The Tune page shows “${SHOWN_LINE}” Moving the setting toward the front has the opposite effect.`,
    hints: ['Think of the back of the car sliding when the back brakes did too much.', 'The car gains a little braking and loses a little of something else.', 'Pick the first card.'],
  },
};

// ---- the formulas beside the board (the numbers are the ones on the dial and the lever now) ----
const kmhFormula = speed => ({title: 'From m/s to km/h', formula: 'km/h = m/s × 3.6', worked: `${ms2(msOf(speed))} m/s × 3.6 = ${(msOf(speed) * KMH_PER_MS).toFixed(2)} km/h`, note: 'An hour has 3,600 seconds and a kilometre has 1,000 metres, and 3,600 ÷ 1,000 = 3.6. The dial shows the result to the nearest whole number.'});
const brakesFormula = (car = BENCH_CAR) => ({title: `The brakes of the ${carName(car)}`, formula: `brakes = ${BRAKES_BASE} m/s^2 × brake strength`, worked: `${BRAKES_BASE} m/s^2 × ${CARS[car].braking.toFixed(2)} = ${ms2(brakesOf(car))} m/s^2`, note: `In this game every car has a brake strength, and ${BRAKES_BASE} m/s² is what a brake strength of 1 gives.`});
const aFormula = (car = BENCH_CAR) => ({title: 'Deceleration, written a', formula: 'a = brakes + passive drag', worked: `${ms2(brakesOf(car))} m/s^2 + ${DRAG_SHOWN} m/s^2 = ${ms2(aOf(car))} m/s^2`, note: `Passive drag is a small steady slowing of ${DRAG_SHOWN} m/s² that the game applies to a moving car even without its brakes.`});
const timeFormula = (speed, car = BENCH_CAR) => ({title: 'Time taken to stop', formula: 't = v ÷ a', worked: `${ms2(msOf(speed))} m/s ÷ ${ms2(aOf(car))} m/s^2 = ${(msOf(speed) / aOf(car)).toFixed(2)} s`, note: 'v is the speed when the brakes go on.'});
const leftFormula = (speed, t, car = BENCH_CAR) => { const at = Number(t.toFixed(2)), left = Math.max(0, msOf(speed) - aOf(car) * at); return {title: 'Speed left after t seconds', formula: 'speed left = v − a × t', worked: `${ms2(msOf(speed))} m/s − ${ms2(aOf(car))} m/s^2 × ${at.toFixed(2)} s = ${left.toFixed(2)} m/s`}; };
const energyFormula = (speed, car = BENCH_CAR) => ({title: 'Energy of motion', formula: 'energy = ½ × m × v^2', worked: `½ × ${whole(carMassKg(car))} kg × (${ms2(msOf(speed))} m/s)^2 = ${whole(carMassKg(car) * msOf(speed) ** 2 / 2)} J`, note: 'm is the mass of the car, and energy is measured in joules, written J. The speed is multiplied by itself, so twice the speed gives four times the energy.'});
const perMetreFormula = (car = BENCH_CAR) => ({title: 'Energy removed during each metre', formula: 'energy per metre = m × a', worked: `${whole(carMassKg(car))} kg × ${ms2(aOf(car))} m/s^2 = ${whole(carMassKg(car) * aOf(car))} J per metre`, note: 'The same brakes remove the same energy during every metre, whatever the speed.'});
const SUM_NOTE = 'The sum uses rounded numbers, and the game works out each stop in steps of 1/120 of a second, so the two can differ by a few centimetres.';
function stopFormula(speed, car = BENCH_CAR, {tape = true, title = 'Stopping distance', full = false} = {}) {
  const without = msOf(speed) ** 2 / (2 * brakesOf(car)) - sumOf(speed, car);
  return {title, formula: 'd = v^2 ÷ (2 × a)', worked: `(${ms2(msOf(speed))} m/s)^2 ÷ (2 × ${ms2(aOf(car))} m/s^2) = ${m2(sumOf(speed, car))}`,
    note: !tape ? 'd is the stopping distance, v is the speed and a is the deceleration.' : full ? `The tape reads ${m1(metresFrom(speed, car))}. ${SUM_NOTE} The passive drag is part of a; without it the stop would be ${m1(without)} longer.` : `The tape reads ${m1(metresFrom(speed, car))}.`};
}
const generalStop = () => ({title: 'Stopping distance', formula: 'd = v^2 ÷ (2 × a)', note: `d is the stopping distance, v is the speed and a is the deceleration, which is ${ms2(aOf())} m/s² for this car.`});
const ratioFormula = speed => ({title: `Compared with ${K50} km/h`, formula: `road needed = (v ÷ ${ms2(V50)} m/s)^2`, worked: `(${ms2(msOf(speed))} m/s ÷ ${ms2(V50)} m/s)^2 = ${((msOf(speed) / V50) ** 2).toFixed(2)} times the road`});
const maxFormula = gap => { const v = Math.sqrt(2 * aOf() * gap); return {title: 'The fastest speed that stops in the gap', formula: 'v = √(2 × a × d)', worked: `√(2 × ${ms2(aOf())} m/s^2 × ${gap} m) = ${v.toFixed(2)} m/s`, note: `That is ${(v * KMH_PER_MS).toFixed(1)} km/h. Choose the highest reading on the dial that does not go above it.`}; };
const frontFormula = () => ({title: 'Share of the weight on the front tyres', formula: 'front share = 0.5 + h ÷ L', worked: `0.5 + ${BRAKE_RIG.centreHeightM} m ÷ ${BRAKE_RIG.wheelbaseM} m = ${FRONT_LOAD.toFixed(2)}`, note: 'h is the height of the car’s centre of mass and L is the distance between the front and back wheels. This is the share in a steady stop at 9.8 m/s², and in this game the bench uses it for every stop.'});
const balanceFormula = front => ({title: 'Does the back of the car slide?', formula: 'the back slides if back brakes > back weight', worked: stopOf(SLOW, front).rearSlides ? `${100 - front}% > ${pct(REAR_LOAD)}, so the back slides` : `${100 - front}% < ${pct(REAR_LOAD)}, so the back stays in line`, note: `At ${front}% front the back brakes do ${100 - front}% of the braking. The back tyres carry ${pct(REAR_LOAD)} of the weight.`});

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The dial and the lever carry from step to step, as the player left them. The free test also chooses a car.
  const set = {speed: SLOW, front: 50, car: BENCH_CAR};
  const step = () => STEPS[m.index];
  const lane = (speed, front, label, car = BENCH_CAR) => ({speed, front, label, car});
  const from = speed => `From ${kmh(speed)} km/h`;

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', lanes: [], race: null, guess: null, answered: null, say: '', auto: null, lastPress: -1, corner: 0, slid: false, rows: [], tries: 0, tested: new Set(), ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.lanes = [lane(SLOW, STEADY_FRONT, from(SLOW)), lane(FAST, STEADY_FRONT, from(FAST))]; m.race = {at: .5, t: null}; m.phase = 'running'; }
    if (id === 'word-speed') { set.speed = SLOW; m.phase = 'turn'; }
    if (id === 'word-stopping' || id === 'word-weight') { m.lanes = [lane(SLOW, STEADY_FRONT, from(SLOW))]; m.phase = 'ready'; }
    if (id === 'word-deceleration') { m.lanes = [lane(FAST, STEADY_FRONT, from(FAST))]; m.phase = 'ready'; }
    if (id === 'word-energy') { set.speed = FAST; m.phase = 'ready'; }
    if (id === 'word-balance') { set.front = 50; m.phase = 'lever'; }
    if (id === 'watch') { m.lanes = [lane(SLOW, STEADY_FRONT, `${K50} km/h, 70% front`), lane(FAST, STEADY_FRONT, `${K100} km/h, 70% front`), lane(SLOW, 50, `${K50} km/h, 50% front`)]; m.race = {at: .8, t: null}; m.phase = 'running'; }
    if (id === 'try-free') { set.speed = SLOW; set.car = BENCH_CAR; set.front = Math.max(set.front, STEADY_FRONT); m.phase = 'set'; }
    if (id === 'try-speed') { set.speed = SLOW; set.front = Math.max(set.front, STEADY_FRONT); m.phase = 'set'; }
    if (id === 'try-slide') { set.speed = SLOW; set.front = 50; m.phase = 'set'; }
    if (id === 'alone') { set.speed = SLOW; m.phase = 'set'; }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  const setting = () => ['try-free', 'try-speed', 'try-slide', 'alone'].includes(step().id) && m.phase === 'set';
  const canDial = () => (setting() && step().id !== 'try-slide') || step().id === 'word-speed' || (step().id === 'word-energy' && m.phase !== 'running');
  // A steady back: the lever opens once the player has braked as it is and seen the back slide. The word step's lever stays free after its answer.
  const canLever = () => (setting() && !['try-speed', 'try-free'].includes(step().id) && !(step().id === 'try-slide' && !m.slid)) || step().id === 'word-balance';
  // Show me on the free test tries a setting not yet tested: the dial as it is, or the next speed on this list.
  const untestedSpeed = () => [set.speed, SLOW, FAST, 70, 130, 30, 150].find(s => !m.tested.has(`${set.car}/${s}`)) ?? set.speed;
  // What Show me sets and brakes.
  function goal() {
    const id = step().id;
    if (id === 'word-speed' || id === 'try-speed') return {speed: FAST, front: set.front};
    if (id === 'try-free') return {speed: untestedSpeed(), front: set.front};
    if (id === 'try-slide') return {speed: SLOW, front: m.slid ? STEADY_FRONT : 50};
    if (id === 'word-balance') return {speed: set.speed, front: STEADY_FRONT};
    return {speed: fastestFor(CORNERS[Math.min(m.corner, CORNERS.length - 1)]), front: Math.max(set.front, STEADY_FRONT)};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'word-speed') return `I will turn the dial to ${K100} km/h.`;
    if (id === 'word-balance') return `I will move the lever to ${STEADY_FRONT}% front.`;
    if (id === 'try-speed') return `I will turn the dial to ${K100} km/h, and then you can guess where the car will stop.`;
    if (id === 'try-slide') return m.slid ? `I will move the lever to ${STEADY_FRONT}% front, and then brake.` : 'I will brake with the lever as it is, at 50% front.';
    if (id === 'try-free') return `I will turn the dial to ${kmh(g.speed)} km/h, which you have not tested with this car, and then brake.`;
    return `I will set the dial to ${kmh(g.speed)} km/h and the lever to ${g.front}% front, and then brake.`;
  }
  const dialAnswer = () => {
    m.phase = 'done'; m.auto = null; seen.add('word-speed');
    m.say = `A dial reading of ${K100} km/h is ${ms2(V100)} m/s, so the car travels ${ms2(V100)} metres during every second. That is exactly twice ${ms2(V50)} m/s, the speed that the dial shows as ${K50} km/h. The dial rounds to whole numbers, which is why twice ${K50} reads as ${K100} here: the exact figures are ${(V50 * KMH_PER_MS).toFixed(2)} km/h and ${(V100 * KMH_PER_MS).toFixed(2)} km/h. You can keep turning the dial to watch the sums change.`;
    return {kind: 'right', sound: 'lab.tick', say: m.say};
  };
  const leverAnswer = () => {
    m.phase = 'done'; m.auto = null; seen.add('word-balance');
    m.say = `At ${STEADY_FRONT}% front, the front brakes do ${STEADY_FRONT}% of the braking and the back brakes do ${100 - STEADY_FRONT}%. That is less than the ${pct(REAR_LOAD)} of the weight on the back tyres, so the back of the car stays in line. This division of the braking is the brake balance. You can keep moving the lever to watch the sum change.`;
    return {kind: 'right', sound: 'lab.clunk', say: m.say};
  };

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
      if (m.auto || !(setting() || canLever() || canDial())) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'speed') return dial(value, held === 'held');
    if (kind === 'lever') return lever(value, held === 'held');
    if (kind === 'car') return carTurn(value);
    if (kind === 'answer' && id === 'try-speed' && m.phase === 'guess') {
      const picked = Number(value);
      if (!GUESSES[picked]) return null;
      m.guess = picked; startRun();
      m.say = `You guessed ${GUESSES[picked].label.toLowerCase()}. Watch the tape.`;
      return {kind: 'progress', say: m.say};
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ and ↓ turn the speed dial one step a press, between 32 and 241 km/h.
  function dial(way, held) {
    if (!canDial() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.speed;
    set.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, before + (way === 'up' ? SPEED_STEP : -SPEED_STEP)));
    if (set.speed === before) return held ? null : {kind: 'note', say: way === 'up' ? `${kmh(MAX_SPEED)} km/h is the top of the dial.` : `${kmh(MIN_SPEED)} km/h is the bottom of the dial.`};
    m.lastPress = m.time; m.lanes = [];
    if (step().id === 'word-speed' && m.phase === 'turn' && set.speed === FAST) return dialAnswer();
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  // → moves the lever 10% toward the front brakes, ← toward the back, between 40% and 90% front.
  function lever(way, held) {
    if (!canLever() || m.auto || (way !== 'front' && way !== 'back')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.front;
    set.front = Math.max(MIN_FRONT, Math.min(MAX_FRONT, before + (way === 'front' ? LEVER_STEP : -LEVER_STEP)));
    if (set.front === before) return held ? null : {kind: 'note', say: way === 'front' ? `${MAX_FRONT}% front is as far forward as the lever goes.` : `${MIN_FRONT}% front is as far back as the lever goes.`};
    m.lastPress = m.time;
    if (step().id !== 'word-balance') { m.lanes = []; return held ? null : {kind: 'sound', sound: 'lab.clunk'}; }
    if (m.phase === 'lever' && set.front >= STEADY_FRONT) return leverAnswer();
    return held ? null : {kind: 'sound', sound: 'lab.clunk'};
  }
  // In the free test, ← and → choose the car.
  function carTurn(way) {
    if (step().id !== 'try-free' || !setting() || m.auto) return null;
    const at = TEST_CARS.indexOf(set.car), n = TEST_CARS.length;
    set.car = TEST_CARS[(at + (way === 'next' ? 1 : -1) + n) % n];
    m.lanes = [];
    return {kind: 'sound', sound: 'lab.tick'};
  }

  function go() {
    const id = step().id;
    if (['word-stopping', 'word-deceleration', 'word-weight'].includes(id) && m.phase === 'ready') {
      m.phase = 'running'; m.race = {at: .1, t: null}; runs.push({speed: m.lanes[0].speed, front: STEADY_FRONT, car: BENCH_CAR});
      return {kind: 'progress', say: id === 'word-stopping' ? 'The brakes go on at the yellow line. Watch the tape.' : id === 'word-weight' ? 'Watch the numbers on the two pads as the car brakes.' : 'Watch the marks on the road, one for each half second.'};
    }
    if (id === 'word-energy' && m.phase !== 'running' && !m.auto) {
      m.lanes = [lane(SLOW, STEADY_FRONT, from(SLOW)), lane(set.speed, STEADY_FRONT, from(set.speed))];
      m.phase = 'running'; m.race = {at: .1, t: null}; runs.push({speed: set.speed, front: STEADY_FRONT, car: BENCH_CAR});
      return {kind: 'progress', say: 'Watch the gold blocks disappear as each car uses up its road.'};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-speed') {
      if (set.speed !== FAST) return {kind: 'note', say: `This test is from ${K100} km/h, so press ${set.speed < FAST ? '↑' : '↓'} until the dial reads ${K100} km/h.`};
      m.phase = 'guess'; m.lanes = [];
      m.say = `From ${K50} km/h the car stopped in ${m1(S50)}. Where do you think the car will stop from ${K100} km/h? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    startRun();
    m.say = id === 'try-free' ? `The ${carName(set.car)} is braking from ${kmh(set.speed)} km/h. Watch the tape.` : `The dial reads ${kmh(set.speed)} km/h and the lever is at ${set.front}% front. The brakes go on at the yellow line.`;
    return {kind: 'progress', say: m.say};
  }
  function startRun() {
    const id = step().id, car = id === 'try-free' ? set.car : BENCH_CAR;
    m.lanes = [lane(set.speed, set.front, id === 'alone' ? `Corner ${m.corner + 1}` : `${kmh(set.speed)} km/h`, car)];
    m.phase = 'running'; m.race = {at: .1, t: null};
    runs.push({speed: set.speed, front: set.front, car});
  }

  // The run has stopped: the word's result, the free test's row, the guess, the back of the car, or the corner.
  function judge() {
    const id = step().id, l = m.lanes.at(-1), r = stopOf(l.speed, l.front, l.car);
    if (id === 'word-stopping') { m.phase = 'done'; seen.add(id); m.say = `The tape reads ${m1(r.stopMetres)}, so the stopping distance from ${K50} km/h is ${m1(r.stopMetres)}. The car used that much road between the moment the brakes went on and the moment it stopped.`; return {kind: 'right', say: m.say}; }
    if (id === 'word-deceleration') {
      m.phase = 'done'; seen.add(id);
      m.say = `The car lost the same ${(aOf() / 2).toFixed(1)} m/s during every half second, which is what a steady deceleration means. The marks grew closer together, because a slower car covers less road in the same time. The stop took ${ms2(V100)} m/s ÷ ${ms2(aOf())} m/s² = ${(V100 / aOf()).toFixed(2)} s. A road car on a dry road in real life can brake at about 10 m/s², so the cars in this game brake about twice as hard as that, but the rules that follow are the same.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-energy') {
      m.phase = 'done'; seen.add(id);
      m.say = `Each block takes the same ${m1(S50)} of road to remove, so a car from ${K100} km/h uses four stretches of road where a car from ${K50} km/h uses one. That is where the sum comes from. The energy of motion is ½ × mass × speed², and the brakes remove mass × deceleration during each metre. When you divide the first by the second, the mass cancels and leaves d = v² ÷ (2 × a). The time tells the same story, because a car at twice the speed brakes for twice as long at twice the average speed, and 2 × 2 = 4. You can turn the dial and brake again to test other speeds.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-weight') { m.phase = 'done'; seen.add(id); m.say = `When the car stands still, each end carries half of its weight. In a steady stop at 9.8 m/s², the front tyres carry ${pct(FRONT_LOAD)} of the weight and the back tyres carry ${pct(REAR_LOAD)}. Harder braking would move even more of the weight forward, but in this game the bench uses the figures of that steady stop for every run.`; return {kind: 'right', say: m.say}; }
    if (id === 'try-free') {
      m.phase = 'set'; m.tested.add(`${l.car}/${l.speed}`); m.tries = m.tested.size;
      if (m.tries >= FREE_TRIES) seen.add(id);
      m.rows = [...m.rows, {car: carName(l.car), kmh: kmh(l.speed), a: aOf(l.car), sum: sumOf(l.speed, l.car), strip: r.stopMetres}].slice(-6);
      m.say = `The ${carName(l.car)} stopped from ${kmh(l.speed)} km/h in ${m1(r.stopMetres)}. The sum predicted ${m2(sumOf(l.speed, l.car))}, using a deceleration of ${ms2(aOf(l.car))} m/s². ${m.tries >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change the car or the speed and test a different setting.'}`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-speed') {
      m.phase = 'done'; seen.add(id);
      const right = m.guess === 1;
      m.say = right ? `Correct. The tape reads ${m1(r.stopMetres)}, which is 4 × ${m1(S50)}, because twice the speed carries four times the energy of motion for the same brakes to remove.`
        : m.guess === 0 ? `The car needed ${m1(r.stopMetres)}, not twice ${m1(S50)}. Twice the speed carries four times the energy of motion, so the car needs four times the road: 4 × ${m1(S50)} = ${m1(r.stopMetres)}.`
          : `The car needed ${m1(r.stopMetres)}, which is four times ${m1(S50)} rather than eight times. The speed is multiplied by itself in the sum, so twice the speed gives 2 × 2 = 4 times the road.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    m.phase = 'set';
    const why = `the back brakes did ${100 - l.front}% of the braking, which is more than the ${pct(REAR_LOAD)} of the weight on the back tyres`;
    if (id === 'try-slide') {
      if (r.rearSlides && !m.slid) { m.slid = true; m.say = `The back of the car slid, because ${why}. Press → to move the lever toward the front, then brake again.`; return {kind: 'progress', say: m.say}; }
      if (r.rearSlides) { m.say = `The back of the car is still sliding at ${l.front}% front, because ${why}. Press → again, then brake.`; return {kind: 'fail', say: m.say}; }
      m.phase = 'done'; seen.add(id);
      m.say = `At ${l.front}% front the back brakes did ${100 - l.front}% of the braking, which is less than the ${pct(REAR_LOAD)} of the weight on the back tyres, so the back of the car stayed in line. The car stopped steadily in ${m1(r.stopMetres)}.`;
      return {kind: 'right', say: m.say};
    }
    // Brian's job: the fastest steady stop before the corner.
    const gap = CORNERS[m.corner], best = fastestFor(gap);
    if (r.rearSlides) { m.say = `The back of the car slid, because ${why}. Move the lever toward the front, then try that corner again.`; return {kind: 'fail', say: m.say}; }
    if (r.stopMetres > gap) { m.say = `From ${kmh(l.speed)} km/h the car needs ${m1(r.stopMetres)}, but the gap is only ${gap} m, so the car ran ${m1(r.stopMetres - gap)} past the corner. Press ↓ to arrive more slowly.`; return {kind: 'fail', say: m.say}; }
    if (l.speed < best) { m.say = `The car stopped ${m1(gap - r.stopMetres)} short of the corner. From ${kmh(l.speed + SPEED_STEP)} km/h the car would still stop in time, in ${m1(metresFrom(l.speed + SPEED_STEP))}, so press ↑ to arrive faster.`; return {kind: 'fail', say: m.say}; }
    m.corner += 1;
    if (m.corner >= CORNERS.length) {
      m.phase = 'done'; seen.add(id);
      m.say = `You reached all three corners as fast as the gaps allow, at ${kmh(fastestFor(CORNERS[0]))}, ${kmh(fastestFor(CORNERS[1]))} and ${kmh(fastestFor(CORNERS[2]))} km/h. The speed at the third corner, ${ms2(msOf(fastestFor(CORNERS[2])))} m/s, is twice the speed at the first, ${ms2(msOf(fastestFor(CORNERS[0])))} m/s, and its stop of ${m1(metresFrom(fastestFor(CORNERS[2])))} is about four times the first stop of ${m1(metresFrom(fastestFor(CORNERS[0])))}. That finishes the job.`;
      return {kind: 'pass', say: m.say};
    }
    m.lanes = [];
    m.say = `Correct. From ${kmh(l.speed)} km/h the car stops in ${m1(r.stopMetres)}, which is inside the ${gap} m gap, and from ${kmh(l.speed + SPEED_STEP)} km/h it would not. At the next corner, the marker is ${CORNERS[m.corner]} m before the corner.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto;
      m.lastPress = m.time;
      if (set.front !== a.front) { set.front += Math.sign(a.front - set.front) * LEVER_STEP; m.lanes = []; return id === 'word-balance' && set.front >= STEADY_FRONT ? leverAnswer() : null; }
      if (set.speed !== a.speed) { set.speed += Math.sign(a.speed - set.speed) * SPEED_STEP; m.lanes = []; return id === 'word-speed' && set.speed === FAST ? dialAnswer() : null; }
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
    else if (['word-stopping', 'word-deceleration', 'word-weight'].includes(id) && m.phase === 'done') { m.phase = 'running'; m.race = {at: .1, t: null}; }
    return null;
  }

  function laneViews() {
    const t = m.race?.t;
    return m.lanes.map(l => {
      const r = stopOf(l.speed, l.front, l.car), at = t == null ? {metres: -RUNUP_S * l.speed * MS_PER_SPEED, ms: l.speed * MS_PER_SPEED, braking: false, done: false, brakeShare: 0} : laneAt(l.speed, l.front, t, l.car);
      return {label: l.label, speed: l.speed, front: l.front, startMs: l.speed * MS_PER_SPEED, metres: at.metres, ms: at.ms, braking: at.braking, done: at.done, stopMetres: r.stopMetres,
        slides: r.rearSlides, slide: r.rearSlides ? at.brakeShare : 0, waiting: t == null};
    });
  }
  // Seconds since the brakes went on in the current run.
  const braked = () => Math.max(0, (m.race?.t ?? 0) - RUNUP_S);
  // The deceleration step's marks: where the car was at each half second, and its speed then.
  function timeMarks() {
    const l = m.lanes[0];
    if (!l || m.race?.t == null) return [];
    const out = [], T = stopOf(l.speed, l.front).stopSeconds;
    for (let t = .5; t <= Math.min(braked(), T); t += .5) { out.push({t, metres: laneAt(l.speed, l.front, RUNUP_S + t).metres, ms: Math.max(0, msOf(l.speed) - aOf() * t)}); }
    return out;
  }

  function formulas(id) {
    const s = set.speed;
    if (id === 'word-speed') return [{title: 'Speed', formula: 'speed = distance ÷ time', worked: `${ms2(msOf(s))} m ÷ 1 s = ${ms2(msOf(s))} m/s`, note: 'The result is in metres per second, written m/s.'}, kmhFormula(s)];
    if (id === 'word-stopping') return [kmhFormula(SLOW), {title: 'Stopping distance', formula: 'measured from the yellow line to the stopped car', worked: seen.has(id) ? `The tape reads ${m1(S50)}` : `The tape will show the distance from ${K50} km/h`}];
    if (id === 'word-deceleration') return [brakesFormula(), aFormula(), timeFormula(FAST), leftFormula(FAST, Math.min(braked(), V100 / aOf()))];
    if (id === 'word-energy') return [energyFormula(s), perMetreFormula(), stopFormula(s, BENCH_CAR, {full: true}), ratioFormula(s)];
    if (id === 'word-weight') return [frontFormula(), {title: 'Share of the weight on the back tyres', formula: 'back share = 1 − front share', worked: `1 − ${FRONT_LOAD.toFixed(2)} = ${(1 - Number(FRONT_LOAD.toFixed(2))).toFixed(2)}`}];
    if (id === 'word-balance') return [balanceFormula(set.front), frontFormula()];
    if (id === 'watch') return [stopFormula(SLOW, BENCH_CAR, {title: `From ${K50} km/h`, tape: false}), stopFormula(FAST, BENCH_CAR, {title: `From ${K100} km/h`}), balanceFormula(50)];
    if (id === 'try-free') return [brakesFormula(set.car), aFormula(set.car), kmhFormula(s), stopFormula(s, set.car, {full: true})];
    // The guess stays open until the car has stopped: until then the panel shows only the general sum, with no result.
    if (id === 'try-speed') return m.phase === 'done' ? [kmhFormula(s), stopFormula(s), ratioFormula(s)] : [kmhFormula(s), generalStop()];
    if (id === 'try-slide') return [balanceFormula(set.front), stopFormula(s)];
    if (id === 'alone') return [maxFormula(CORNERS[Math.min(m.corner, CORNERS.length - 1)]), stopFormula(s), balanceFormula(set.front)];
    if (id === 'check-four') return m.answered === null ? [generalStop()] : [stopFormula(SLOW, BENCH_CAR, {title: `From ${K50} km/h`, tape: false}), stopFormula(FAST, BENCH_CAR, {title: `From ${K100} km/h`})];
    if (id === 'check-balance') return m.answered === null ? [{title: 'Does the back of the car slide?', formula: 'the back slides if back brakes > back weight', note: 'Compare the share of the braking that the back brakes do with the share of the weight on the back tyres.'}] : [balanceFormula(50), balanceFormula(60), balanceFormula(80)];
    if (id === 'check-game') return m.answered === null ? [{title: 'What a step of Brake balance does', note: 'Each step toward the rear gives the back brakes a larger share of the braking.'}]
      : [{title: 'Braking, two steps toward the rear', worked: `2 × ${signed(LAB_TUNE.brakes.brakingPerStep)} = ${signed(2 * LAB_TUNE.brakes.brakingPerStep)}`}, {title: 'Grip for turning while braking', worked: `2 × ${signed(LAB_TUNE.brakes.cornerLeftPerStep).replace('-', '−')} = ${signed(2 * LAB_TUNE.brakes.cornerLeftPerStep).replace('-', '−')}`}];
    if (id === 'recap') return [kmhFormula(FAST), aFormula(), energyFormula(FAST), stopFormula(FAST), frontFormula()];
    return [];
  }

  function view() {
    const id = step().id;
    const lanes = laneViews(), braking = lanes.some(l => l.braking);
    const close = {front: braking ? FRONT_LOAD : .5, locked: braking && lanes[0]?.slides === true, braking};
    const dialView = locked => ({speed: set.speed, kmh: kmh(set.speed), ms: msOf(set.speed), locked});
    const base = {scene: 'rig', time: m.time, lanes, line: null, close, dial: null, lever: null, car: null, table: null, job: null, runs: runs.map(r => ({...r})), formulas: formulas(id),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, lanes: [], close: null,
        tune: id === 'check-game' ? {effect: answered ? REAR_TWO_LINE : null} : null,
        stops: id === 'check-four' ? [{kmh: K50, metres: S50}, {kmh: K100, metres: S100}] : null,
        balances: id === 'check-balance' ? [50, 60, 80].map(front => ({front, slides: stopOf(SLOW, front).rearSlides})) : null,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, close: null,
      say: 'A car’s stopping distance grows with the square of its speed, because twice the speed carries four times the energy of motion, and the same brakes remove the same energy during each metre of road. Braking moves weight forward onto the front tyres, so the front brakes can do most of the work. If the back brakes do more of the braking than the weight on the back tyres allows, the back tyres lock and the back of the car slides.',
      prompt: 'Press Enter to finish the lesson and open Brake balance on the Tune page in the garage.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') return {...base, close: {...close, plain: true}, line: LINE_M, actions: ['replay'],
      say: seen.has(id) ? `The car from ${K50} km/h stopped in ${S50.toFixed(1)} metres, written ${m1(S50)}, before the chequered line ${LINE_M} m ahead. The car from ${K100} km/h ran past that line and needed ${m1(S100)}. The second car was only twice as fast, yet it needed four times as much road. Why did twice the speed need four times the road?`
        : `Two identical cars will now brake at the same yellow line. One is travelling at ${K50} kilometres per hour, which is written km/h, and the other is travelling at ${K100} km/h, which is twice as fast. Both readings are rounded to whole numbers, and the next step shows the exact figures. Watch where each car stops.`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out why, or press R to watch again.' : 'Watch the two cars.',
      hints: ['Watch where each car stops.', 'One car arrived twice as fast as the other.', seen.has(id) ? 'Press Enter when you are ready to find out why.' : 'Watch the cars stop, then press Enter.']};
    if (id === 'word-speed') {
      const done = m.phase === 'done';
      return {...base, close: {...close, plain: true}, dial: dialView(false), perSecond: msOf(set.speed), best: goal(), keys: DIAL_KEYS, repeat: ['↑', '↓'],
        ...(done ? {} : {waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'dial'}),
        say: done ? m.say : m.auto ? autoSay() : `The dial in this lesson shows speed in kilometres per hour, which is how far the car would travel in one hour at that speed. The sums use metres per second, written m/s, which is how many metres the car travels during each second. An hour has 3,600 seconds and a kilometre has 1,000 metres, so you change m/s into km/h by multiplying by 3.6. The dial starts at ${K50} km/h. Turn it up to ${K100} km/h, and watch the marks on the road and the sums beside the picture.`,
        prompt: done ? 'Press Enter to continue, or keep turning the dial with ↑ and ↓.' : `The dial reads ${kmh(set.speed)} km/h. Press ↑ to turn it up or ↓ to turn it down, or click Faster or Slower.`,
        hints: done ? DONE : ['The speed dial is at the top right.', `Press ↑ until the dial reads ${K100} km/h.`, 'Watch my pointer. I will turn the dial.']};
    }
    if (id === 'word-stopping' || id === 'word-deceleration' || id === 'word-weight') {
      const ready = m.phase === 'ready', done = m.phase === 'done', slowing = id === 'word-deceleration', stopping = id === 'word-stopping';
      return {...base, close: {...close, plain: id !== 'word-weight'}, ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'strip', buttons: [BRAKE]} : {}), forces: id === 'word-weight', timeMarks: slowing ? timeMarks() : null, actions: done ? ['replay', 'slow'] : ['slow'],
        say: done ? m.say : stopping ? `Stopping distance is the length of road that a car uses while its brakes slow it to a stop. We measure it from the yellow line, where the brakes go on, to the place where the car stops. Press Space to brake from ${K50} km/h, and read the tape.`
          : slowing ? `Deceleration is how quickly a speed falls. We measure it in metres per second, per second, which is written m/s². A deceleration of 10 m/s² removes 10 m/s of speed during every second. This car’s brakes give a deceleration of ${ms2(brakesOf())} m/s². The game also applies a passive drag, which is a small steady slowing of ${DRAG_SHOWN} m/s² that acts on a moving car even without its brakes. Together they make ${ms2(aOf())} m/s². Press Space to brake from ${K100} km/h, and watch the marks on the road, which show where the car was at each half second.`
            : `Weight shift is the change in how much of the car’s weight presses on each pair of tyres. The tyres slow the car at the road, but the car’s centre of mass, which is the point where its mass balances, sits about ${BRAKE_RIG.centreHeightM} m above the road and carries on moving forward, which presses the front tyres down and lifts some of the load off the back tyres. A weighing pad under each pair of tyres shows the share of the weight that it carries. Press Space to brake, and watch the two pads.`,
        prompt: ready ? 'Press Space to brake, or click the road.' : done ? 'Press Enter to continue, or press R to watch again.' : stopping ? 'Watch the tape.' : slowing ? 'Watch the marks on the road.' : 'Watch the pads.',
        hints: done ? DONE : [stopping ? 'The tape measures from the yellow line to the place where the car stops.' : slowing ? 'Each mark shows where the car was after another half second.' : 'Watch the numbers on the two pads.', 'Press Space.', 'Watch my pointer. I will brake.']};
    }
    if (id === 'word-energy') {
      const running = m.phase === 'running';
      return {...base, close: null, dial: dialView(running), energy: true, keys: running ? {} : {...DIAL_KEYS, Space: 'go'}, repeat: running ? [] : ['↑', '↓'], buttons: running ? [] : [BRAKE], target: running ? null : 'go', waiting: m.phase === 'ready',
        say: m.phase === 'done' || (running && seen.has(id)) ? m.say : `Now we can answer the question. A moving car carries energy of motion, which is the energy that it has because it is moving. The brakes must remove all of that energy before the car can stop, and they turn it into heat. Energy of motion depends on the square of the speed, which means the speed multiplied by itself, so twice the speed carries 2 × 2 = 4 times the energy. The same brakes remove the same amount of energy during each metre of road, so four times the energy needs four times the road. Each gold block shows the energy of the car at ${K50} km/h. Press Space to brake, and watch the blocks disappear along the road.`,
        prompt: running ? 'Watch the blocks and the road.' : seen.has(id) ? 'Press Enter to continue, or change the speed with ↑ and ↓ and press Space.' : 'Press Space to brake, or change the speed with ↑ and ↓ first.',
        hints: running ? ['Watch the blocks and the road.', 'Each block lasts for the same length of road.', 'Wait a moment.'] : ['Each block is the energy of the car at the lower speed.', 'Press Space.', 'Watch my pointer. I will brake.']};
    }
    if (id === 'word-balance') {
      const done = m.phase === 'done';
      return {...base, lever: {front: set.front, locked: false}, balance: true, best: goal(), keys: LEVER_KEYS, repeat: ['←', '→'], buttons: leverButtons(), ...(done ? {} : {waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'lever'}),
        say: done ? m.say : m.auto ? autoSay() : `Brake balance is how the braking is divided between the front brakes and the back brakes. A tyre can grip the road only in proportion to the weight pressing it down, so the back tyres, which carry only ${pct(REAR_LOAD)} of the weight while the car brakes, can do only about ${pct(REAR_LOAD)} of the braking. If the back brakes ask for more than that, the back tyres stop turning, which is called locking, and a locked tyre slides. The lever starts at 50% front. Move it to ${STEADY_FRONT}% front, and watch the sum beside the picture.`,
        prompt: done ? 'Press Enter to continue, or keep moving the lever with ← and →.' : `The lever is at ${set.front}% front and ${100 - set.front}% back. Press → to move it toward the front, or click the lever.`,
        hints: done ? DONE : ['The lever slides between the back brakes and the front brakes.', `Press → until the lever reads ${STEADY_FRONT}% front.`, 'Watch my pointer. I will move the lever.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'],
        say: done ? `The car from ${K50} km/h stopped in ${m1(S50)} and the car from ${K100} km/h stopped in ${m1(S100)}, which is four times the road for twice the speed. The back brakes of the third car did 50% of the braking, which is more than the ${pct(REAR_LOAD)} of the weight on its back tyres, so those tyres locked and the back of the car slid.`
          : `Three identical cars will now brake at the same line. Two have the lever at 70% front, one from ${K50} km/h and one from ${K100} km/h. The third brakes from ${K50} km/h with the lever at 50% front. Watch where each car stops, and watch the back of the third car.`,
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the three cars.',
        hints: ['Watch where each car stops.', 'Then watch the back of the bottom car.', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The tries and Brian's job: the dial, the lever or the car, and the strip.
    const setNow = setting() && !m.auto, g = goal(), atGoal = set.speed === g.speed && set.front === g.front, free = id === 'try-free';
    const keys = !setNow ? {} : {...(canDial() ? DIAL_KEYS : {}), ...(canLever() ? LEVER_KEYS : {}), ...(free ? CAR_KEYS : {}), Space: 'go'};
    // The dial, the lever and the car are on the board, each with its keys; the bar keeps only Brake, so it stays readable.
    const buttons = !setNow ? [] : [BRAKE];
    const v = {...base, dial: dialView(!canDial()), lever: free ? null : {front: set.front, locked: !canLever()}, keys, buttons,
      repeat: setNow ? [...(canDial() ? ['↑', '↓'] : []), ...(canLever() ? ['←', '→'] : [])] : [], target: !setNow ? null : atGoal ? 'go' : 'set:best', glow: setNow ? 'set' : null,
      waiting: setNow || m.phase === 'guess', best: g};
    if (free) {
      const fv = {...v, close: null, car: {id: set.car, name: carName(set.car), a: aOf(set.car)}, table: m.rows};
      if (m.phase === 'running') return {...fv, say: m.say, prompt: 'Watch the tape.', hints: ['Watch where the car stops.', 'Compare the tape with the sum beside the picture.', 'Wait a moment.']};
      return {...fv, waiting: !seen.has(id),
        say: m.auto ? autoSay() : m.say || `Now you can experiment. Press ↑ and ↓ to change the speed, and ← and → to choose a different car. The sums beside the picture change as you do, so you can predict the stopping distance before you press Space. Test at least ${FREE_TRIES} different settings. The table keeps your results so that you can compare them.`,
        prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the settings, then press Space to brake. Different settings tested so far: ${m.tries} of ${FREE_TRIES}.`,
        hints: ['Press Space to test the settings as they are.', 'Try a low speed and a high speed, and try a car with stronger brakes.', g.speed === set.speed ? 'Watch my pointer. I will brake with the settings as they are.' : `Watch my pointer. I will turn the dial to ${kmh(g.speed)} km/h, and then brake.`]};
    }
    if (id === 'try-speed') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'stops', metres: [S50, c.metres]}, state: null})),
        say: m.say, prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: [`From ${K50} km/h the car needed ${m1(S50)}.`, 'Twice the speed carries four times the energy of motion.', 'Pick a card. Any guess lets you go on.']};
      if (m.phase === 'running') return {...v, say: m.say, prompt: 'Watch the tape.', hints: ['Watch where the car stops.', 'Count the marks every 10 m.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `From ${K50} km/h the car stopped in ${m1(S50)}. Turn the dial to ${K100} km/h, which is twice as fast, and watch the sum beside the picture. Then press Space, and you can guess where the car will stop.`,
        prompt: `The dial reads ${kmh(set.speed)} km/h. Press ↑ for faster or ↓ for slower, then Space to brake.`,
        hints: ['The speed dial is at the top right.', set.speed === FAST ? 'The dial is set, so press Space.' : `Press ${set.speed < FAST ? '↑' : '↓'} until the dial reads ${K100} km/h, then press Space.`, set.speed === FAST ? 'Watch my pointer. I will press Space, and then you can guess where the car will stop.' : 'Watch my pointer. I will turn the dial, and then you can guess where the car will stop.']};
    }
    if (id === 'try-slide') {
      if (m.phase === 'running') return {...v, say: m.say, prompt: 'Watch the back of the car.', hints: ['Watch the back tyre.', 'Does the back of the car slide?', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `I have moved the lever to 50% front. Press Space to brake from ${K50} km/h with the lever as it is, and watch the back of the car.`,
        prompt: m.slid ? `The lever is at ${set.front}% front. Press → to move it toward the front or ← toward the back, then Space to brake.` : 'Press Space to brake with the lever as it is.',
        hints: m.slid ? [`The back tyres carry ${pct(REAR_LOAD)} of the weight while the car brakes.`, set.front >= STEADY_FRONT ? 'The lever is far enough toward the front, so press Space.' : `Press → until the lever reads ${STEADY_FRONT}% front, then press Space.`, set.front === STEADY_FRONT ? 'Watch my pointer. I will brake.' : 'Watch my pointer. I will move the lever and then brake.']
          : ['Brake first, and watch the back of the car.', 'Press Space.', 'Watch my pointer. I will brake.']};
    }
    // Brian's job.
    const corner = Math.min(m.corner, CORNERS.length - 1);
    const job = {corner: corner + 1, of: CORNERS.length, gap: CORNERS[corner], done: m.phase === 'done'};
    const jv = {...v, job, line: CORNERS[corner]};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (m.phase === 'running') return {...jv, say: m.say, prompt: 'Watch the car and the corner.', hints: ['Does the car stop before the corner?', 'Does the back of the car stay in line?', 'Wait a moment.']};
    return {...jv,
      say: m.auto ? autoSay() : m.corner === 0 && !m.say ? `Here is a job for you. There are three corners, and each has a braking marker before it. Arrive as fast as you can while still stopping before the corner, with the back of the car in line. The sum beside the picture gives the fastest speed for each gap. At the first corner, the marker is ${CORNERS[0]} m before the corner.` : m.say,
      prompt: `The dial reads ${kmh(set.speed)} km/h and the lever is at ${set.front}% front, so the car needs ${m1(metresFrom(set.speed))}. Press ↑ or ↓ to change the speed, ← or → to move the lever, and Space to brake.`,
      hints: [`The gap is ${CORNERS[corner]} m, and the road has a mark every 10 m.`, `From ${kmh(fastestFor(CORNERS[corner]))} km/h the car stops in ${m1(metresFrom(fastestFor(CORNERS[corner])))}, which is inside ${CORNERS[corner]} m. Keep the lever at ${STEADY_FRONT}% front or more.`, atGoal ? 'Watch my pointer. I will brake.' : 'Watch my pointer. I will set the dial and the lever, and then brake.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own braking runs, as the bench's challenge reads them: the bench's goal (a run from each of its two speeds)
// must pass on these, so finishing the lesson can never pass without them.
export const benchAttempts = view => (view?.runs ?? []).map(({speed, front, car}) => ({controls: [{id: 'car'}, {id: 'speedMph'}, {id: 'frontShare'}], input: {car, speedMph: speed, frontShare: front}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = 'You have passed Braking, and Brake balance is now open on the Tune page in the garage. Moving it toward the rear makes the car brake a little harder, and moving it toward the front keeps more grip for turning while the car brakes.';

export const lesson = Object.freeze({id: 'braking', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
