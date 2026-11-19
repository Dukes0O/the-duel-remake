// Downforce as a classroom lesson (docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md, "Claude's script"; its wording and
// formulas follow LAB-CLASSROOM-LANGUAGE.md).
// Teaching state only, no DOM and no saves. Every push and drag is the downforce bench's own (downforceBench, the
// challenge's bench), the car on the scale is the bench's car, and question 3 is the Tune page's own Wing angle rule.
// The model holds each fan speed as whole km/h, in tens, and gives the bench's rule the same speed in the game's own unit.
import {downforceBench, downforce, tunnelCar, kgForce, WING} from '../benches/tunnel.js';
import {DRIVE} from '../../config.js';
import {LAB_TUNE} from '../lab-tune.js';
import {MORE} from '../classroom/brian-text.js';

// The fan dial reads whole km/h and moves 10 km/h a press.
export const SPEED_STEP = 10, MIN_SPEED = 50, MAX_SPEED = 150;
export const KMH_PER_MS = 3.6;
// The game's own speed unit in m/s, for the bench's rule, the car's top speed and the Tune page's reference speed.
const MS_PER_GAME = DRIVE.mphToWorld;
const gameSpeed = speed => speed / (MS_PER_GAME * KMH_PER_MS);
// A dial speed as the panel shows it (m/s to two decimals, and every sum is worked from that). The dial's own km/h are
// whole already; kmh rounds only the fan's speed while the fan spins up.
export const msOf = speed => Number((speed / KMH_PER_MS).toFixed(2));
export const kmh = speed => Math.round(speed);
// The bench's three wings, named for how far they tilt.
export const WINGS = Object.freeze(['flat', 'small', 'big']);
export const WING_NAME = Object.freeze({flat: 'Flat', small: 'Tilted', big: 'Steep'});
export const CAR_KG = Math.round(tunnelCar.kg), TOP_MS = Number((tunnelCar.topMph * MS_PER_GAME).toFixed(3));
// The fan spins up, holds while the scale is read, then the run is judged; in the job the car then drives the course.
export const RAMP_S = 1.2, HOLD_S = .9, DRIVE_S = 2.4;
const WONDER_RAMP_S = 2.2, WATCH_HOLD_S = 1.6, HELD_GAP_S = .14;

// The bench's own rule at a fan speed in km/h. The bench's dial stops only on its own steps, so the lesson asks the rule
// that the bench runs on. A wing's share of the top speed is the same at every fan speed, so that comes from a bench run.
const runOf = (speed, wing) => downforce(gameSpeed(speed), wing);
// At any fan speed while it spins up, by the bench's own rule.
export const pushAt = (speed, wing) => speed > 0 ? runOf(speed, wing).downforceKg : 0;
export const dragAt = (speed, wing) => speed > 0 ? kgForce(runOf(speed, wing).dragN) : 0;
export const pushKg = (speed, wing) => Math.round(runOf(speed, wing).downforceKg);
export const dragKg = (speed, wing) => Math.round(kgForce(runOf(speed, wing).dragN));
export const topOf = wing => Math.round(tunnelCar.topMph * MS_PER_GAME * KMH_PER_MS * downforceBench.run({wing}).topSpeedShare);
export const kg = value => `${Math.round(value).toLocaleString('en-GB')} kg`;
const wingWord = wing => WING_NAME[wing].toLowerCase();

// Brian's job: three courses, each with the speed it is driven at and the push its bend needs (none on a straight).
// The least wing that holds wins, since more wing means a lower top speed.
export const COURSES = Object.freeze([
  {speed: 100, needKg: 40, bend: true},
  {speed: 70, needKg: 40, bend: true},
  {speed: 150, needKg: 0, bend: false},
].map(Object.freeze));
export const bestWing = course => WINGS.find(wing => runOf(course.speed, wing).downforceKg >= course.needKg);

// The wonder's run and the watch's three speeds.
export const WONDER_SPEED = 100;
export const WATCH_SPEEDS = Object.freeze([50, 100, 150]);
// Try 1 starts here and doubles the fan.
export const TRY_FROM = 60, TRY_TO = 120;
// The free test asks for this many different settings before Continue opens.
export const FREE_TRIES = 3;
// The settings Show me tries on the free test, in order, skipping any the player has already tested.
const FREE_PLAN = Object.freeze([[50, 'big'], [100, 'big'], [100, 'small'], [50, 'small'], [150, 'big'], [150, 'small'], [50, 'flat'], [100, 'flat'], [150, 'flat']]);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'What pushed the car down?'},
  {id: 'word-speed', part: 1, title: 'Fan speed'},
  {id: 'word-wing', part: 1, title: 'Wing', word: 'downforce-word-0'},
  {id: 'word-downforce', part: 1, title: 'Downforce', word: 'downforce-word-1'},
  {id: 'word-drag', part: 1, title: 'Drag', word: 'downforce-word-2'},
  {id: 'watch', part: 2, title: 'Three fan speeds', voice: 'lab.brian.downforce.intro'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-speed', part: 3, title: 'Twice the speed'},
  {id: 'try-cost', part: 3, title: 'What more wing does to top speed'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-nine', part: 5, title: 'Question 1 of 3'},
  {id: 'check-bend', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.downforce.explain'},
].map(Object.freeze));

const P50 = pushKg(50, 'big'), P100 = pushKg(100, 'big'), P150 = pushKg(150, 'big');
const K50 = kmh(50), K100 = kmh(100), K150 = kmh(150);
// Try 1's first push, unrounded, so its guesses are the real twice, four and eight times.
const T60 = pushKg(TRY_FROM, 'small'), T60_EXACT = runOf(TRY_FROM, 'small').downforceKg;
export const KEY_IDEAS = Object.freeze([
  {id: 'push', text: `Twice the speed gives four times the push, because the push grows with the square of the speed. To the nearest whole number, the steep wing pushes ${kg(P50)} at ${K50} km/h, ${kg(P100)} at ${K100} km/h and ${kg(P150)} at ${K150} km/h.`},
  {id: 'drag', text: `A wing adds drag as well as downforce, so the top speed falls. The Falcone F42 reaches ${topOf('flat')} km/h with the wing flat, ${topOf('small')} km/h with the wing tilted and ${topOf('big')} km/h with the wing steep.`},
  {id: 'choose', text: 'More wing presses the tyres harder, which helps in fast bends. Less wing gives a higher top speed on long straights. You can set this on the Tune page under Wing angle.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'More wing gives more grip and a lower top speed.',
  text: 'Wing angle is on the Tune page in the garage. More wing grips harder in fast corners, most of all at high speed. Less wing gives a higher top speed on the straights.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'downforce-word-0', word: 'Wing', meaning: 'A shaped blade that turns the air flowing past it. A racing wing turns the air upward, so the air pushes the wing and the car downward.'},
  {id: 'downforce-word-1', word: 'Downforce', meaning: 'The push of the air that presses a moving car down onto the road. It presses the tyres harder, so they grip harder in a bend, and it grows with the square of the speed.'},
  {id: 'downforce-word-2', word: 'Drag', meaning: 'The push of the air against a moving car, which slows the car. In the wind tunnel a rope holds the car still, and the gauge on the rope reads the drag.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const DIAL_KEYS = Object.freeze({'↑': 'speed:up', '↓': 'speed:down'});
const WING_KEYS = Object.freeze({'→': 'wing:steeper', '←': 'wing:flatter'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']);
const FAN = Object.freeze({action: 'go', label: 'Run the fan', key: 'Space'});
const TO_GUESS = Object.freeze({action: 'go', label: 'Go to the guess', key: 'Space'});

// Try 1's guesses: three pictures of the push at twice the speed.
const GUESSES = Object.freeze([[2, 'twice'], [4, 'four times'], [8, 'eight times']].map(([n, word]) =>
  ({label: `About ${kg(n * T60_EXACT)}, which is ${word} as much`, kg: n * T60_EXACT})));
const COST_GUESSES = WINGS.map(wing => ({label: `The ${wingWord(wing)} wing`, wing}));

// The Tune page's own numbers for two steps of More wing, from the same table its effect line reads. Its reference speed
// is the game's own, so TUNE_KMH is a result and not a round number. TUNE_FAST is the higher speed the panel compares.
const signedPct = share => `${share > 0 ? '+' : '-'}${Math.round(Math.abs(share) * 1000) / 10}%`;
const TUNE = LAB_TUNE.wing, TUNE_KMH = Math.round(TUNE.referenceMph * MS_PER_GAME * KMH_PER_MS), TUNE_MS = Number((TUNE.referenceMph * MS_PER_GAME).toFixed(2)), TUNE_FAST = 200;
export const WING_TWO_LINE = `Grip at ${TUNE_KMH} km/h ${signedPct(2 * TUNE.gripAtReference)}, more at higher speed; top speed ${signedPct(2 * TUNE.topSpeedPerStep)}.`;
const gripTwo = Math.round(2 * TUNE.gripAtReference * 100), topTwo = Math.round(-2 * TUNE.topSpeedPerStep * 100);
const TWO_STEPS = `Two steps toward More wing give ${gripTwo}% more grip at ${TUNE_KMH} km/h and more still at higher speeds, and they lower the top speed by ${topTwo}%.`;
const CHECKS = {
  'check-nine': {
    question: `The steep wing is in the tunnel, and the fan speed rises from ${K50} km/h to ${K150} km/h, which is three times as fast. How many times greater is the push?`,
    answers: [{label: 'Three times as great', picture: {kind: 'push', kg: [P50, 3 * P50]}}, {label: 'Six times as great', picture: {kind: 'push', kg: [P50, 6 * P50]}},
      {label: 'Nine times as great', picture: {kind: 'push', kg: [P50, P150]}}],
    correct: 2,
    right: () => `Correct. The steep wing pushes ${kg(P50)} at ${K50} km/h and ${kg(P150)} at ${K150} km/h, which is about nine times as much. The push grows with the square of the speed, and 3 × 3 = 9.`,
    wrong: picked => picked === 0 ? `The push grows by more than that. The steep wing pushes ${kg(P50)} at ${K50} km/h and ${kg(P150)} at ${K150} km/h, which is about nine times as much, because the push grows with the square of the speed and 3 × 3 = 9.`
      : `The push is nine times as great, not six times. To the nearest kilogram, the steep wing pushes ${kg(P50)} at ${K50} km/h and ${kg(P150)} at ${K150} km/h. Three times the speed gives 3 × 3 = 9 times the push, not 3 + 3.`,
    hints: [`Think of what you watched at ${K50}, ${K100} and ${K150} km/h.`, 'The push grows with the square of the speed. What is 3 × 3?', 'Pick “Nine times as great”.'],
  },
  'check-bend': {
    question: `A car with the steep wing takes three bends. A hairpin, which is a very tight bend, is taken at ${K50} km/h, an ordinary bend at ${K100} km/h and a sweeper, which is a long fast bend, at ${K150} km/h. In which bend does the wing press the car down hardest?`,
    answers: [[50, `The hairpin at ${K50} km/h`], [100, `The ordinary bend at ${K100} km/h`], [150, `The sweeper at ${K150} km/h`]].map(([speed, label]) => ({label, picture: {kind: 'bend', kmh: kmh(speed)}})),
    correct: 2,
    right: () => `Correct. The steep wing pushes ${kg(P150)} at ${K150} km/h, against ${kg(P100)} at ${K100} km/h and only ${kg(P50)} at ${K50} km/h, so a wing helps most in the fastest bends.`,
    wrong: picked => `At ${[K50, K100][picked]} km/h the steep wing pushes ${kg([P50, P100][picked])}, but at ${K150} km/h the steep wing pushes ${kg(P150)}. The faster the car takes a bend, the harder the wing presses the car down, so a wing helps most in the fastest bends.`,
    hints: ['The push grows with the square of the speed.', 'In which bend is the car moving fastest?', `Pick the sweeper at ${K150} km/h.`],
  },
  'check-game': {
    question: 'On the Tune page in the garage, you move Wing angle two steps toward More wing. What changes in a race?',
    answers: [{label: `The car grips ${gripTwo}% harder in a ${TUNE_KMH} km/h corner and harder still at higher speeds, but the top speed falls by ${topTwo}%`, picture: {kind: 'game', what: 'trade'}},
      {label: 'The car becomes faster everywhere', picture: {kind: 'game', what: 'both'}}, {label: 'Nothing changes', picture: {kind: 'game', what: 'same'}}],
    correct: 0,
    right: () => 'Correct. More wing holds the fast corners better and lowers the speed on the straights a little. Less wing does the opposite.',
    wrong: picked => picked === 1 ? `The car does not become faster everywhere. ${TWO_STEPS} The drag of the wing lowers the speed on the straights.`
      : `The setting does change the car. ${TWO_STEPS} Less wing does the opposite.`,
    hints: ['Think of what the steep wing did to the top speed.', 'The car gains grip and loses something else.', 'Pick the first card.'],
  },
};

// ---- the formulas beside the board (the numbers are the ones on the dial and the wing panel now) ----
const G = Number((1 / kgForce(1)).toFixed(2));
const shown = k => k === 0 ? '0' : k.toFixed(5);
// The panel's numbers. Each sum is worked from the rounded numbers it shows, and comes to the bench's own reading.
export const pushK = wing => Number((0.5 * WING.airDensity * WING.wings[wing] / G).toFixed(5));
export const dragK = wing => Number((0.5 * WING.airDensity * (WING.bodyDragArea + WING.dragPerLift * WING.wings[wing]) / G).toFixed(5));
export const pushSum = (speed, wing) => pushK(wing) * msOf(speed) ** 2;
export const dragSum = (speed, wing) => dragK(wing) * msOf(speed) ** 2;
export const topMsSum = wing => Number((TOP_MS * Math.cbrt(dragK('flat') / dragK(wing))).toFixed(3));
export const timesSum = (speed, base = 50) => { const ratio = Number((msOf(speed) / msOf(base)).toFixed(2)); return {ratio, times: Number((ratio * ratio).toFixed(2))}; };

const speedRow = speed => ({title: 'Speed in km/h and m/s', formula: 'm/s = km/h ÷ 3.6', worked: `${speed} km/h ÷ 3.6 = ${msOf(speed).toFixed(2)} m/s`, note: 'The panel shows this to two decimal places. An hour has 3,600 seconds and a kilometre has 1,000 metres, and 3,600 ÷ 1,000 = 3.6.'});
const numberRow = wing => ({title: 'The wing’s number, k', formula: 'k = ½ × density × area ÷ g', worked: `0.5 × ${WING.airDensity} × ${WING.wings[wing]} ÷ ${G} = ${shown(pushK(wing))}`, note: `The density of air is ${WING.airDensity} kg in each cubic metre. In this game the wing area, in square metres (m²), is 0 when flat, ${WING.wings.small} when tilted and ${WING.wings.big} when steep, so a steeper wing turns more air. g is the pull of gravity, ${G} metres per second per second (m/s²), and dividing by g gives the kilograms that a scale shows.`});
const pushRow = (speed, wing) => ({title: 'Downforce', formula: 'push = k × speed^2', worked: `${shown(pushK(wing))} × ${msOf(speed).toFixed(2)}^2 = ${pushSum(speed, wing).toFixed(1)} kg`, note: `speed^2 is the square of the speed in m/s, which means the speed multiplied by itself: ${msOf(speed).toFixed(2)} × ${msOf(speed).toFixed(2)} = ${(msOf(speed) ** 2).toFixed(1)}.`});
function timesRow(speed, wing, base = 50) {
  const {ratio, times} = timesSum(speed, base), from = msOf(base).toFixed(2);
  return {title: `Compared with ${kmh(base)} km/h`, formula: `times the push = (speed ÷ ${from})^2`, worked: `(${msOf(speed).toFixed(2)} ÷ ${from})^2 = ${ratio.toFixed(2)}^2 = ${times.toFixed(2)} times`,
    note: wing === 'flat' ? 'In this game the flat wing pushes 0 kg at any speed, and any number of times 0 kg is still 0 kg.' : `To the nearest kilogram, this wing pushes ${kg(pushKg(base, wing))} at ${kmh(base)} km/h and ${kg(pushKg(speed, wing))} at ${kmh(speed)} km/h.`};
}
const dragRow = (speed, wing) => ({title: 'Drag, read on the rope', formula: 'drag = d × speed^2', worked: `${dragK(wing).toFixed(5)} × ${msOf(speed).toFixed(2)}^2 = ${dragSum(speed, wing).toFixed(1)} kg`, note: 'Drag grows with the square of the speed in the same way as the push. d is the number for the car and the wing together.'});
const dragNumberRow = wing => ({title: '', formula: 'd = ½ × density × drag area ÷ g', worked: `0.5 × ${WING.airDensity} × (${WING.bodyDragArea} + ${WING.dragPerLift} × ${WING.wings[wing]}) ÷ ${G} = ${dragK(wing).toFixed(5)}`, note: `In this game the car’s body has a drag area of ${WING.bodyDragArea} m², and each square metre of wing area adds ${WING.dragPerLift} m².`});
const topRow = wing => ({title: 'Top speed', formula: 'top speed = flat top speed × ∛(flat d ÷ this d)', worked: `${TOP_MS.toFixed(3)} × ∛(${dragK('flat').toFixed(5)} ÷ ${dragK(wing).toFixed(5)}) = ${topMsSum(wing).toFixed(3)} m/s`, note: 'The power that drag uses up is drag × speed, so that power grows with speed × speed × speed. In this game the engine’s power stays fixed, so the top speed follows the cube root, written ∛, of the drag. A cube root is the number that gives the number inside when it is multiplied by itself three times.'});
const topKmhRow = wing => ({title: '', formula: '', worked: `${topMsSum(wing).toFixed(3)} m/s × 3.6 = ${(topMsSum(wing) * KMH_PER_MS).toFixed(2)} km/h`, note: 'The table shows this to the nearest whole number.'});
const brief = row => ({...row, note: ''});
const RULES = Object.freeze({push: {title: 'Downforce', formula: 'push = k × speed^2'}, drag: {title: 'Drag, read on the rope', formula: 'drag = d × speed^2'}});

const clampSpeed = s => Math.max(MIN_SPEED, Math.min(MAX_SPEED, s));

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The fan dial and the wing carry from step to step, as the player left them.
  const set = {speed: 50, wing: 'flat'};
  const step = () => STEPS[m.index];
  // The fan: off (null), spinning up to a speed, or holding it. `rows` is the step's table of readings.
  const row = (speed, wing) => ({speed, kmh: kmh(speed), wing, push: pushKg(speed, wing), drag: dragKg(speed, wing), top: topOf(wing)});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', fan: null, spin: null, drive: null, rows: [], guess: null, answered: null, say: '', auto: null, lastPress: -1,
      course: 0, tried: [], tested: new Set(), tries: 0, watch: 0, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { set.wing = 'big'; spinTo(WONDER_SPEED, {ramp: WONDER_RAMP_S, from: 0, delay: .6}); }
    if (id === 'word-speed') { set.speed = 50; set.wing = 'big'; m.fan = {speed: 50}; m.phase = 'turn'; }
    if (id === 'word-wing') { set.speed = 50; set.wing = 'flat'; m.fan = {speed: 50}; m.phase = 'tilt'; }
    if (id === 'word-downforce' || id === 'word-drag') { set.speed = 50; set.wing = 'big'; m.phase = 'ready'; }
    if (id === 'watch') { set.wing = 'big'; m.watch = 0; spinTo(WATCH_SPEEDS[0], {from: 0, hold: WATCH_HOLD_S, delay: .6}); }
    if (id === 'try-free') { set.speed = 50; set.wing = 'big'; m.phase = 'set'; }
    if (id === 'try-speed') { set.speed = TRY_FROM; set.wing = 'small'; m.fan = {speed: TRY_FROM}; m.rows = [row(TRY_FROM, 'small')]; m.phase = 'set'; }
    if (id === 'try-cost') { set.speed = 100; m.phase = 'guess'; }
    // The job starts on the steep wing, away from course 1's answer, whatever wing the tries left.
    if (id === 'alone') { set.speed = COURSES[m.course].speed; if (m.course === 0) set.wing = 'big'; m.phase = 'set'; }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  // The fan spins from where it is (or `from`) up to a speed, holds, then the step goes on.
  function spinTo(speed, {ramp = RAMP_S, hold = HOLD_S, from = m.fan?.speed ?? 0, delay = 0} = {}) {
    set.speed = speed;
    m.spin = {from, to: speed, t: -delay, ramp, hold}; m.fan = {speed: from}; m.phase = 'running';
  }
  const setting = () => ['try-free', 'try-speed', 'try-cost', 'alone'].includes(step().id) && m.phase === 'set';
  // The word steps stay open after their answer, so the player can go on watching the sums change. The fan keeps running there.
  const wordOpen = () => (step().id === 'word-downforce' || step().id === 'word-drag') && m.phase === 'done';
  const canDial = () => (setting() && (step().id === 'try-speed' || step().id === 'try-free')) || step().id === 'word-speed' || wordOpen();
  const canWing = () => (setting() && step().id !== 'try-speed') || step().id === 'word-wing' || wordOpen();
  const fanStaysOn = () => step().id === 'word-speed' || step().id === 'word-wing' || wordOpen();
  const dialOf = locked => ({speed: set.speed, kmh: kmh(set.speed), ms: msOf(set.speed), locked});
  // What Show me sets and runs.
  function goal() {
    const id = step().id;
    if (id === 'try-speed') return {speed: TRY_TO, wing: set.wing};
    if (id === 'word-speed') return {speed: 100, wing: set.wing};
    if (id === 'word-wing') return {speed: set.speed, wing: 'big'};
    if (id === 'try-free') {
      if (!m.tested.has(`${set.speed}/${set.wing}`)) return {speed: set.speed, wing: set.wing};
      const [speed, wing] = FREE_PLAN.find(([s, w]) => !m.tested.has(`${s}/${w}`)) ?? [set.speed, set.wing];
      return {speed, wing};
    }
    if (id === 'try-cost') return {speed: set.speed, wing: m.tried.includes(set.wing) ? WINGS.find(w => !m.tried.includes(w)) ?? set.wing : set.wing};
    return {speed: set.speed, wing: bestWing(COURSES[Math.min(m.course, COURSES.length - 1)])};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-speed') return `I will turn the dial to ${kmh(TRY_TO)} km/h, and then you can guess how hard the tilted wing will push.`;
    if (id === 'try-free') return `I will set the ${wingWord(g.wing)} wing and turn the dial to ${kmh(g.speed)} km/h, and then I will run the fan.`;
    if (id === 'word-speed') return `I will turn the dial to ${K100} km/h.`;
    if (id === 'word-wing') return 'I will tilt the wing until it is steep.';
    return g.wing === set.wing ? `I will run the fan with the ${wingWord(g.wing)} wing.` : `I will set the ${wingWord(g.wing)} wing and then run the fan.`;
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
      if (m.auto || !(setting() || canWing() || canDial())) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'speed') return dial(value, held === 'held');
    if (kind === 'wing') return tilt(value, held === 'held');
    if (kind === 'answer' && m.phase === 'guess') {
      const picked = Number(value);
      if (id === 'try-speed' && GUESSES[picked]) {
        m.guess = picked; startRun();
        m.say = `You chose ${GUESSES[picked].label.toLowerCase()}. Watch the scale.`;
        return {kind: 'progress', say: m.say};
      }
      if (id === 'try-cost' && COST_GUESSES[picked]) {
        m.guess = picked; m.phase = 'set';
        m.say = `You chose the ${wingWord(COST_GUESSES[picked].wing)} wing. Now run all three wings at ${kmh(set.speed)} km/h, and read the rope and the top speed each time.`;
        return {kind: 'progress', say: m.say};
      }
      return null;
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ and ↓ turn the fan dial 10 km/h a press. A turn stops the fan until it runs again, except on the word steps.
  function dial(way, held) {
    if (!canDial() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.speed;
    set.speed = clampSpeed(before + (way === 'up' ? SPEED_STEP : -SPEED_STEP));
    if (set.speed === before) return held ? null : {kind: 'note', say: way === 'up' ? `${kmh(MAX_SPEED)} km/h is the top of the dial.` : `${kmh(MIN_SPEED)} km/h is the bottom of the dial.`};
    m.lastPress = m.time; m.fan = fanStaysOn() ? {speed: set.speed} : null;
    if (step().id === 'word-speed' && m.phase === 'turn' && set.speed === 100) return turned();
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  function turned() {
    m.phase = 'done'; m.auto = null; seen.add('word-speed');
    m.say = `A dial reading of ${K100} km/h is about the same as ${msOf(100).toFixed(1)} m/s, so the air moves ${msOf(100).toFixed(1)} metres past the car during each second. That is the speed the fan reached when the scale read ${kg(CAR_KG + P100)}. You can keep turning the dial to watch the sum change.`;
    return {kind: 'right', sound: 'lab.tick', say: m.say};
  }
  // → tilts the wing one notch steeper, ← one notch flatter: Flat, Tilted, Steep.
  function tilt(way, held) {
    if (!canWing() || m.auto || (way !== 'steeper' && way !== 'flatter')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const at = WINGS.indexOf(set.wing), to = Math.max(0, Math.min(WINGS.length - 1, at + (way === 'steeper' ? 1 : -1)));
    if (to === at) return held ? null : {kind: 'note', say: way === 'steeper' ? 'Steep is as far as the wing tilts.' : 'Flat is as flat as the wing goes.'};
    set.wing = WINGS[to]; m.lastPress = m.time;
    return afterTilt(held);
  }
  function afterTilt(held) {
    if (!fanStaysOn()) { m.fan = null; m.drive = null; return held ? null : {kind: 'sound', sound: 'lab.clunk'}; }
    if (step().id === 'word-wing' && m.phase === 'tilt' && set.wing === 'big') return tiltedSteep();
    return held ? null : {kind: 'sound', sound: 'lab.clunk'};
  }
  function tiltedSteep() {
    m.phase = 'done'; m.auto = null; seen.add('word-wing');
    m.say = 'A steep wing turns the air upward, which is why the smoke bends upward behind the wing. To turn the air upward, the wing must push on the air, and the air pushes back on the wing just as hard, so the wing is pushed downward. The wing is fixed to the car, so the air presses the car down as well. An aeroplane’s wing has the same shape turned the other way up, so an aeroplane’s wing turns the air downward and is pushed upward. You can keep tilting the wing to watch the smoke and the sum change.';
    return {kind: 'right', sound: 'lab.clunk', say: m.say};
  }

  function go() {
    const id = step().id;
    if ((id === 'word-downforce' || id === 'word-drag') && m.phase === 'ready') {
      spinTo(50, {from: 0}); runs.push({speed: 50, wing: set.wing});
      m.say = id === 'word-downforce' ? 'The fan is running. Watch the scale.' : 'The fan is running. Watch the gauge on the rope.';
      return {kind: 'progress', say: m.say};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-speed') {
      if (set.speed !== TRY_TO) return {kind: 'note', say: `This test is at ${kmh(TRY_TO)} km/h, so press ${set.speed < TRY_TO ? '↑' : '↓'} until the dial reads ${kmh(TRY_TO)} km/h.`};
      m.phase = 'guess'; m.fan = null;
      m.say = `At ${kmh(TRY_FROM)} km/h the tilted wing pushed ${kg(T60)}. At ${kmh(TRY_TO)} km/h, which is twice as fast, how hard do you think the tilted wing will push? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    if (id === 'try-cost' && m.tried.includes(set.wing)) return {kind: 'note', say: `You have already run the ${wingWord(set.wing)} wing. Press ← or → to choose another wing.`};
    startRun();
    m.say = `The fan is running at ${kmh(set.speed)} km/h with the ${wingWord(set.wing)} wing. Watch the scale and the rope.`;
    return {kind: 'progress', say: m.say};
  }
  function startRun() {
    spinTo(set.speed, {from: 0}); m.drive = null;
    runs.push({speed: set.speed, wing: set.wing});
  }

  // The fan has held its speed: the reading is judged, or the watch goes on to its next speed.
  function judge() {
    const id = step().id, speed = m.spin.to, wing = set.wing;
    m.spin = null; m.fan = {speed};
    if (id === 'wonder') { m.phase = 'done'; seen.add(id); return null; }
    if (id === 'watch') {
      m.rows = [...m.rows, row(speed, wing)];
      m.watch += 1;
      if (m.watch < WATCH_SPEEDS.length) { spinTo(WATCH_SPEEDS[m.watch], {hold: WATCH_HOLD_S}); return {kind: 'sound', sound: 'lab.tick'}; }
      m.phase = 'done'; seen.add(id); return null;
    }
    if (id === 'word-downforce') {
      m.phase = 'done'; seen.add(id);
      m.say = `With the fan at ${K50} km/h and the steep wing, the scale read ${kg(CAR_KG + P50)}, which is the car’s ${kg(CAR_KG)} and ${kg(P50)} of downforce. A car goes round a bend only because its tyres grip the road, and a tyre grips harder when it is pressed onto the road harder. Downforce therefore lets a car hold a faster bend. The panel shows the rule: the push is the wing’s number, k, multiplied by the square of the speed, and the square of a number is that number multiplied by itself. You can turn the dial and tilt the wing to watch the sum and the scale change.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-drag') {
      m.phase = 'done'; seen.add(id);
      m.say = `With the fan at ${K50} km/h and the steep wing, the rope’s gauge read ${kg(dragKg(50, 'big'))}, which means that the air pushed the car back as hard as a weight of ${kg(dragKg(50, 'big'))} would pull on the rope. On the road, that push slows the car. The car’s body causes some of the drag, and turning the air with a wing adds more. The car stops gaining speed when drag uses up all of the engine’s power, so more wing means a lower top speed. The steep wing lowers the top speed of this car, a Falcone F42, from ${topOf('flat')} km/h to ${topOf('big')} km/h. You can turn the dial and tilt the wing to watch the sums change.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-free') {
      m.rows = [...m.rows, row(speed, wing)]; m.phase = 'set';
      m.tested.add(`${speed}/${wing}`); m.tries = m.tested.size;
      if (m.tries >= FREE_TRIES) seen.add(id);
      m.say = `With the ${wingWord(wing)} wing and the fan at ${kmh(speed)} km/h, the scale read ${kg(CAR_KG + pushKg(speed, wing))}, which is the car’s ${kg(CAR_KG)} and ${kg(pushKg(speed, wing))} of downforce. The rope read ${kg(dragKg(speed, wing))}, and this wing leaves a top speed of ${topOf(wing)} km/h. ${m.tries >= FREE_TRIES ? 'Press Enter when you have tested enough settings.' : 'Change a setting and test a different one.'}`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-speed') {
      m.phase = 'done'; seen.add(id); m.rows = [...m.rows, row(speed, wing)];
      const right = m.guess === 1, got = pushKg(speed, wing), from = kmh(TRY_FROM);
      const why = `The speed went from ${from} km/h to ${kmh(TRY_TO)} km/h, which is exactly twice as fast, and 2 × 2 = 4.`;
      m.say = right ? `Correct. The tilted wing pushed ${kg(got)}, which is about four times as much as at ${from} km/h. ${why}`
        : m.guess === 0 ? `The tilted wing pushed ${kg(got)}, which is about four times as much as at ${from} km/h, not twice as much. ${why}`
          : `The tilted wing pushed ${kg(got)}, which is about four times as much as at ${from} km/h, not eight times as much. ${why}`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    if (id === 'try-cost') {
      m.rows = [...m.rows, row(speed, wing)]; m.tried = [...m.tried, wing];
      m.phase = 'set';
      if (m.tried.length < WINGS.length) {
        const left = WINGS.filter(w => !m.tried.includes(w)).map(wingWord).join(' wing and the ');
        m.say = `The ${wingWord(wing)} wing gave ${kg(pushKg(speed, wing))} of push and ${kg(dragKg(speed, wing))} on the rope, and it leaves a top speed of ${topOf(wing)} km/h. Now test the ${left} wing. Press ← or → to change the wing, then press Space.`;
        return {kind: 'progress', say: m.say};
      }
      m.phase = 'done'; seen.add(id);
      const picked = COST_GUESSES[m.guess]?.wing, flat = `The flat wing has the least drag, ${kg(dragKg(speed, 'flat'))}, which comes from the car’s body alone, and it leaves the full top speed of ${topOf('flat')} km/h.`;
      m.say = picked === 'flat' ? `Correct. ${flat} More wing gives more push and also more drag, and the table shows all three results.`
        : `The ${wingWord(picked)} wing gives more push, ${kg(pushKg(speed, picked))}, but it also has more drag, so the top speed is only ${topOf(picked)} km/h. ${flat}`;
      return {kind: picked === 'flat' ? 'right' : 'wrong', say: m.say};
    }
    // Brian's job: the fan has run at the course's speed; now the car drives it.
    m.drive = {t: 0}; m.phase = 'driving';
    return null;
  }
  // The car has driven the course: did it hold, and with no more wing than it needed?
  function judgeCourse() {
    const course = COURSES[m.course], wing = set.wing, best = bestWing(course), push = runOf(course.speed, wing).downforceKg, at = kmh(course.speed);
    m.phase = 'set';
    if (course.bend && push < course.needKg) {
      m.say = `At ${at} km/h the ${wingWord(wing)} wing pushes ${kg(push)}, but this bend needs ${kg(course.needKg)}, so the car slid wide. Press → for a steeper wing, then press Space.`;
      return {kind: 'fail', say: m.say};
    }
    if (!course.bend && wing !== best) {
      m.say = `This course has no bend, so the car needs no push, and the ${wingWord(wing)} wing lowers the top speed to ${topOf(wing)} km/h instead of ${topOf(best)} km/h. Press ← for a flatter wing, then press Space.`;
      return {kind: 'fail', say: m.say};
    }
    if (wing !== best) {
      m.say = `The car held the bend with ${kg(push)} of push, but the ${wingWord(best)} wing gives enough with ${kg(pushKg(course.speed, best))} and leaves a top speed of ${topOf(best)} km/h instead of ${topOf(wing)} km/h. Press ← for a flatter wing, then press Space.`;
      return {kind: 'fail', say: m.say};
    }
    m.course += 1;
    if (m.course >= COURSES.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `The flat wing leaves the full top speed of ${topOf('flat')} km/h on the straight. Those three courses needed three different wings: the tilted wing for the bend at ${kmh(COURSES[0].speed)} km/h, the steep wing for the bend at ${kmh(COURSES[1].speed)} km/h and the flat wing for the straight. That finishes the job.`;
      return {kind: 'pass', say: m.say};
    }
    const next = COURSES[m.course], to = kmh(next.speed);
    set.speed = next.speed; m.fan = null; m.drive = null;
    m.say = m.course === 1
      ? `Correct. The tilted wing pushes ${kg(push)}, which is more than the ${kg(course.needKg)} that the bend needs, and it leaves a top speed of ${topOf(wing)} km/h. Course 2 is a tighter bend taken at ${to} km/h, and it also needs ${kg(next.needKg)} of push. I have set the fan to ${to} km/h.`
      : `Correct. At ${at} km/h the tilted wing gives only ${kg(pushKg(course.speed, 'small'))}, while the steep wing gives ${kg(push)}. At a lower speed the air pushes less, so the car needs more wing for the same push. Course 3 is one long straight with no bends. I have set the fan to ${to} km/h.`;
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto;
      m.lastPress = m.time;
      if (set.wing !== a.wing) {
        set.wing = WINGS[WINGS.indexOf(set.wing) + Math.sign(WINGS.indexOf(a.wing) - WINGS.indexOf(set.wing))];
        if (id === 'word-wing') return set.wing === 'big' ? tiltedSteep() : null;
        m.fan = null; m.drive = null; return null;
      }
      if (set.speed !== a.speed) {
        set.speed += Math.sign(a.speed - set.speed) * SPEED_STEP;
        m.fan = fanStaysOn() ? {speed: set.speed} : null;
        return id === 'word-speed' && set.speed === a.speed ? turned() : null;
      }
      m.auto = null;
      return go();
    }
    if (m.drive && m.phase === 'driving') {
      m.drive.t = Math.min(DRIVE_S, m.drive.t + dt);
      return m.drive.t >= DRIVE_S ? judgeCourse() : null;
    }
    const s = m.spin;
    if (!s) return null;
    s.t += dt;
    if (s.t < 0) return null;
    const k = Math.min(1, s.t / s.ramp);
    m.fan = {speed: s.from + (s.to - s.from) * (1 - (1 - k) ** 2)};
    return s.t >= s.ramp + s.hold ? judge() : null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The tunnel as the board draws it: the fan's speed now, the wing, and the scale and the rope's readings.
  function rig() {
    const speed = m.fan?.speed ?? 0, push = pushAt(speed, set.wing), drag = dragAt(speed, set.wing);
    return {speed, kmh: kmh(speed), ms: speed / KMH_PER_MS, on: m.fan !== null, wing: set.wing, push, drag, scale: CAR_KG + push, top: topOf(set.wing)};
  }
  // The sums for a step: only what has been explained so far, on the numbers now on the dial and the wing panel.
  function sums(id) {
    const s = set.speed, w = set.wing;
    if (id === 'word-speed') return [speedRow(s)];
    if (id === 'word-wing') return [brief(speedRow(s)), numberRow(w)];
    if (id === 'word-downforce') return [brief(speedRow(s)), brief(numberRow(w)), pushRow(s, w)];
    if (id === 'word-drag') return [dragRow(s, w), dragNumberRow(w), topRow(w), topKmhRow(w)];
    if (id === 'watch') return [brief(speedRow(s)), pushRow(s, w), timesRow(s, w)];
    if (id === 'try-free') return [brief(speedRow(s)), brief(pushRow(s, w)), timesRow(s, w), brief(dragRow(s, w)), brief(topRow(w)), topKmhRow(w)];
    // A guess is coming or open: the panel shows the rules, and no sum that settles it, until the guess is made.
    if (id === 'try-speed' && !['running', 'done'].includes(m.phase)) return [brief(speedRow(s)), RULES.push];
    if (id === 'try-speed') return [brief(speedRow(s)), brief(pushRow(s, w)), timesRow(s, w, TRY_FROM)];
    if (id === 'try-cost' && m.phase === 'guess') return [RULES.push, RULES.drag];
    if (id === 'try-cost') return [brief(numberRow(w)), brief(pushRow(s, w)), brief(dragRow(s, w)), brief(dragNumberRow(w)), brief(topRow(w)), topKmhRow(w)];
    if (id === 'alone') return [brief(speedRow(s)), brief(pushRow(s, w)), brief(topRow(w)), topKmhRow(w)];
    return [brief(pushRow(100, 'big')), brief(timesRow(100, 'big')), brief(dragRow(100, 'big')), brief(topRow('big')), topKmhRow('big')];
  }
  // A question's sums wait for the answer, so the panel does not give the answer away.
  function checkSums(id, answered) {
    if (!answered) return [RULES.push];
    const pushAtSpeed = s => ({...brief(pushRow(s, 'big')), title: `Downforce at ${kmh(s)} km/h`});
    if (id === 'check-nine') return [pushAtSpeed(50), pushAtSpeed(150), timesRow(150, 'big')];
    if (id === 'check-bend') return WATCH_SPEEDS.map(pushAtSpeed);
    const fast = msOf(TUNE_FAST), gripPct = TUNE.gripAtReference * 100, topPct = -TUNE.topSpeedPerStep * 100;
    return [{title: 'Extra grip on the Tune page', formula: `extra grip = steps × ${gripPct}% × (speed ÷ ${TUNE_MS.toFixed(2)})^2`, worked: `2 × ${gripPct}% × (${TUNE_MS.toFixed(2)} ÷ ${TUNE_MS.toFixed(2)})^2 = ${gripTwo}%`},
      {title: `At ${TUNE_FAST} km/h`, formula: '', worked: `2 × ${gripPct}% × (${fast.toFixed(2)} ÷ ${TUNE_MS.toFixed(2)})^2 = ${(2 * gripPct * (fast / TUNE_MS) ** 2).toFixed(1)}%`, note: 'The extra grip grows with the square of the speed, as the push does.'},
      {title: 'Top speed on the Tune page', formula: `change = steps × −${topPct}%`, worked: `2 × −${topPct}% = −${topTwo}%`, note: 'In this game each step on the Tune page is a smaller change than the difference between two wings in the tunnel.'}];
  }

  function view() {
    const id = step().id;
    const base = {scene: 'tunnel', low: 'table', time: m.time, rig: rig(), formulas: id === 'wonder' ? [] : CHECKS[id] ? [] : sums(id), dragKnown: m.index >= STEPS.findIndex(s => s.id === 'word-drag'), dial: null, wingPanel: null, rows: m.rows.map(r => ({...r})), job: null, runs: runs.map(r => ({...r})),
      focus: null, keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, rig: null, formulas: checkSums(id, answered),
        tune: id === 'check-game' ? {effect: answered ? WING_TWO_LINE : null} : null,
        pushes: id === 'check-nine' ? [{kmh: K50, kg: P50}, {kmh: K150, kg: P150}] : null,
        bends: id === 'check-bend' ? WATCH_SPEEDS.map((speed, i) => ({name: ['Hairpin', 'Ordinary bend', 'Sweeper'][i], kmh: kmh(speed), kg: pushKg(speed, 'big')})) : null,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue.' : 'Pick a card by clicking it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, rig: null,
      say: `A racing wing turns the air upward, so the air pushes the wing and the car downward, and that push is called downforce. Downforce presses the tyres harder onto the road, so the tyres grip harder in a bend.${MORE}The push grows with the square of the speed, so twice the speed gives four times the push. A wing also adds drag, which lowers the top speed, so you choose more wing for fast bends and less wing for long straights.`,
      prompt: 'Enter finishes the lesson and opens Wing angle on the Tune page in the garage.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'], focus: 'scale', low: 'scale',
        say: done ? `The car has a mass of ${kg(CAR_KG)}, but with the fan at ${kmh(WONDER_SPEED)} km/h the scale read ${kg(CAR_KG + P100)}, even though nothing solid pressed down on the car. Where did the extra ${kg(P100)} come from?`
          : `The car is standing on a scale that measures in kilograms, written kg, and the scale reads ${kg(CAR_KG)}. A fan will now blow air past the car at ${kmh(WONDER_SPEED)} kilometres per hour, written km/h. Watch the scale.`,
        prompt: done ? 'Press Enter when you are ready to find out, or press R to watch again.' : 'Watch the scale.',
        hints: ['Watch the number on the scale.', 'The fan moves only air.', done ? 'Press Enter when you are ready to find out.' : 'Watch the scale, then press Enter.']};
    }
    if (id === 'word-speed') {
      const done = m.phase === 'done';
      return {...base, dial: dialOf(false), focus: 'dial', low: 'speed', best: goal(), keys: DIAL_KEYS, repeat: ['↑', '↓'],
        ...(done ? {} : {waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'dial'}),
        say: done ? m.say : m.auto ? autoSay() : `A speed in kilometres per hour, written km/h, is the number of kilometres travelled in one hour. The sums in this lesson use metres per second, written m/s, which is the number of metres travelled during each second. Turn the dial up to ${K100} km/h, and watch the sum beside the picture change.${MORE}To change km/h into m/s you divide by 3.6, because an hour has 3,600 seconds and a kilometre has 1,000 metres. The fan dial starts at ${K50} km/h.`,
        prompt: done ? 'Press Enter to continue, or keep turning the dial with ↑ and ↓.' : `The dial reads ${kmh(set.speed)} km/h. Press ↑ for faster or ↓ for slower, or click Faster or Slower.`,
        hints: done ? DONE : ['The fan dial is on the right.', `Press ↑ until the dial reads ${K100} km/h.`, 'Watch my pointer. I will turn the dial.']};
    }
    if (id === 'word-wing') {
      const done = m.phase === 'done';
      return {...base, dial: dialOf(true), wingPanel: {wing: set.wing, locked: false}, focus: 'wing', low: 'wing', best: goal(), keys: WING_KEYS, repeat: ['←', '→'],
        ...(done ? {} : {waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'wing'}),
        say: done ? m.say : m.auto ? autoSay() : `A wing is a shaped blade that turns the air flowing past it. The fan is running at ${K50} km/h and the wing is flat, so the smoke flows straight past. Tilt the wing until it is steep, and watch the smoke behind the wing.`,
        prompt: done ? 'Press Enter to continue, or keep tilting the wing with ← and →.' : `The wing is ${wingWord(set.wing)}. Press → to tilt the wing steeper, or click the wing panel.`,
        hints: done ? DONE : ['Watch the smoke behind the wing.', 'Press → until the wing panel shows Steep.', 'Watch my pointer. I will tilt the wing.']};
    }
    if (id === 'word-downforce' || id === 'word-drag') {
      const ready = m.phase === 'ready', done = m.phase === 'done', push = id === 'word-downforce';
      return {...base, dial: dialOf(!done), wingPanel: {wing: set.wing, locked: !done}, focus: push ? 'scale' : 'rope', low: push ? 'scale' : 'rope',
        ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'fan', buttons: [FAN]} : {}),
        ...(done ? {keys: {...DIAL_KEYS, ...WING_KEYS}, repeat: ['↑', '↓', '←', '→']} : {}),
        say: done ? m.say : !ready ? m.say : push ? `Downforce is the push of the air that presses a car down onto the road. The wing is steep. Run the fan at ${K50} km/h and read the scale.`
          : 'Drag is the push of the air against a moving car, which slows the car. In the tunnel the car stands still and the air moves, so a rope holds the car against the wind, and a gauge on the rope reads how hard the air pushes the car back. Run the fan and read the gauge.',
        prompt: ready ? 'Press Space to run the fan, or click the fan.' : done ? 'Press Enter to continue, or keep turning the dial and tilting the wing.' : push ? 'Watch the scale.' : 'Watch the gauge on the rope.',
        hints: done ? DONE : [push ? 'The scale is under the car.' : 'The gauge is on the rope at the front of the car.', 'Press Space.', 'Watch my pointer. I will run the fan.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], dial: dialOf(true), wingPanel: {wing: set.wing, locked: true}, focus: 'scale', times: true,
        say: done ? `The steep wing pushed ${kg(P50)} at ${K50} km/h and ${kg(P100)} at ${K100} km/h, which is twice the speed and about four times the push. At ${K150} km/h the steep wing pushed ${kg(P150)}, which is three times the speed and about nine times the push.${MORE}There are two reasons for the four times. When the air moves twice as fast, the wing meets twice as much air during each second, and the wing has to turn each kilogram of that air twice as hard. Two times two makes four. The drag on the rope grew in the same way, with the square of the speed.`
          : `The wing is now steep, and the fan will run at ${K50} km/h, then at ${K100} km/h and then at ${K150} km/h. Watch the scale and the table.`,
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the scale.',
        hints: ['Watch the push in the table.', 'How many times greater is each push than the first one?', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The tries and Brian's job: the fan dial, the wing panel and the fan.
    const setNow = setting() && !m.auto, g = goal(), atGoal = set.speed === g.speed && set.wing === g.wing;
    const keys = !setNow ? {} : {...(canDial() ? DIAL_KEYS : {}), ...(canWing() ? WING_KEYS : {}), Space: 'go'};
    const v = {...base, dial: dialOf(!canDial()), wingPanel: {wing: set.wing, locked: !canWing()}, keys, buttons: setNow ? [FAN] : [],
      repeat: setNow ? [...(canDial() ? ['↑', '↓'] : []), ...(canWing() ? ['←', '→'] : [])] : [], target: !setNow ? null : atGoal ? 'go' : 'set:best',
      glow: setNow ? 'set' : null, waiting: setNow || m.phase === 'guess', best: g};
    if (id === 'try-free') {
      if (m.phase === 'running') return {...v, focus: 'scale', say: m.say, prompt: 'Watch the scale and the rope.', hints: ['Read the scale and the rope.', 'The table keeps each run.', 'Wait a moment.']};
      return {...v, say: m.auto ? autoSay() : m.say || `Now you can experiment. Press ↑ and ↓ to change the fan speed, and ← and → to tilt the wing. Watch the sums change as you do, and predict what the scale and the rope will read before you press Space.${MORE}Try doubling the speed with the same wing. Test at least ${FREE_TRIES} different settings. The table keeps your results so that you can compare them.`,
        waiting: !seen.has(id), prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the settings, then press Space to run the fan. You have tested ${m.tries} of ${FREE_TRIES} different settings so far.`,
        hints: ['Press Space to test the settings as they are.', `Try ${K50} km/h and then ${K100} km/h with the same wing, and try a different wing as well.`, atGoal ? 'Watch my pointer. I will run the fan with the settings as they are.' : 'Watch my pointer. I will change to a setting you have not tested and run the fan.']};
    }
    if (id === 'try-speed') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'push', kg: [T60, c.kg]}, state: null})),
        say: m.say || `At ${kmh(TRY_FROM)} km/h the tilted wing pushed ${kg(T60)}. At ${kmh(TRY_TO)} km/h, which is twice as fast, how hard do you think the tilted wing will push? Pick a card.`,
        prompt: 'Pick a card by clicking it, or press 1, 2 or 3.', hints: [`At ${kmh(TRY_FROM)} km/h the tilted wing pushed ${kg(T60)}.`, 'Twice the speed gives more than twice the push.', 'Pick a card. Any guess lets you go on.']};
      if (m.phase === 'running') return {...v, focus: 'scale', say: m.say, prompt: 'Watch the scale.', hints: ['Watch the push on the scale.', 'Compare the push with the first row of the table.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, focus: 'scale', times: true, mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      return {...v, buttons: setNow ? [TO_GUESS] : [], spaceWords: 'goes to the guess', say: m.auto ? autoSay() : m.say || `The tilted wing pushes ${kg(T60)} at ${kmh(TRY_FROM)} km/h. Turn the fan up to ${kmh(TRY_TO)} km/h, which is twice as fast, and then press Space, and you can guess how hard the tilted wing will push.`,
        prompt: `The dial reads ${kmh(set.speed)} km/h. Press ↑ for faster or ↓ for slower, then press Space to go to the guess.`,
        hints: ['The fan dial is on the right.', set.speed === TRY_TO ? 'The dial is set, so press Space.' : `Press ${set.speed < TRY_TO ? '↑' : '↓'} until the dial reads ${kmh(TRY_TO)} km/h, then press Space.`, atGoal ? 'Watch my pointer. I will take you to the guess.' : 'Watch my pointer. I will turn the dial, and then you can guess.']};
    }
    if (id === 'try-cost') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: COST_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'wing', wing: c.wing}, state: null})),
        say: `The fan is now set to ${kmh(set.speed)} km/h. Which wing will leave the car with the highest top speed: the flat wing, the tilted wing or the steep wing? Pick a card, and then you will test all three.`,
        prompt: 'Pick a card by clicking it, or press 1, 2 or 3.', hints: ['The car stops gaining speed when drag uses up all of the engine’s power.', 'Which wing turns the least air?', 'Pick a card. Any guess lets you go on.']};
      if (m.phase === 'running') return {...v, focus: 'rope', say: m.say, prompt: 'Watch the scale and the rope.', hints: ['Read the push and the drag.', 'The table keeps each wing.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: COST_GUESSES[m.guess]?.wing === 'flat' ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
      const left = WINGS.filter(w => !m.tried.includes(w)).map(wingWord).join(' wing and the ');
      return {...v, say: m.auto ? autoSay() : m.say,
        prompt: `The wing is ${wingWord(set.wing)}. Press ← for flatter or → for steeper, then Space to run the fan. You still have to test the ${left} wing.`,
        hints: ['Run each wing once, and the table will keep them all.', m.tried.includes(set.wing) ? 'Press ← or → to choose a wing you have not run, then press Space.' : 'Press Space to run this wing.', atGoal ? 'Watch my pointer. I will run the fan.' : 'Watch my pointer. I will set the wing and run the fan.']};
    }
    // Brian's job.
    const at = Math.min(m.course, COURSES.length - 1), course = COURSES[at], best = bestWing(course), courseKmh = kmh(course.speed);
    const drive = m.drive ? {t: m.drive.t / DRIVE_S, holds: !course.bend || runOf(course.speed, set.wing).downforceKg >= course.needKg, wing: set.wing} : null;
    const job = {course: at + 1, of: COURSES.length, speed: course.speed, kmh: courseKmh, needKg: course.needKg, bend: course.bend, done: m.phase === 'done', drive};
    const jv = {...v, job, low: 'course', focus: m.phase === 'running' ? 'scale' : null};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: DONE};
    if (m.phase === 'running' || m.phase === 'driving') return {...jv, say: m.say, prompt: m.phase === 'running' ? 'Watch the scale.' : 'Watch the car on the course.',
      hints: ['Read the push on the scale.', course.bend ? 'Does the car hold the bend?' : 'How fast does the car go?', 'Wait a moment.']};
    const intro = `Here is a job for you, with three courses. I will set the fan to the speed of each course, and you choose the least wing that lets the car hold the course, because more wing means a lower top speed.${MORE}Course 1 is a bend taken at ${kmh(COURSES[0].speed)} km/h, and the car needs ${kg(COURSES[0].needKg)} of push to hold it.`;
    return {...jv,
      say: m.auto ? autoSay() : m.course === 0 && !m.say ? intro : m.say,
      prompt: course.bend ? `Course ${at + 1} is the bend at ${courseKmh} km/h, which needs ${kg(course.needKg)} of push. The wing is ${wingWord(set.wing)}. Press ← for flatter or → for steeper, then Space to run the fan.`
        : `Course ${at + 1} is one long straight. The wing is ${wingWord(set.wing)}. Press ← for flatter or → for steeper, then Space to run the fan.`,
      hints: course.bend ? [`The bend needs ${kg(course.needKg)} at ${courseKmh} km/h, and the least wing that gives that much leaves the highest top speed.`,
        `At ${courseKmh} km/h the tilted wing gives ${kg(pushKg(course.speed, 'small'))} and the steep wing gives ${kg(pushKg(course.speed, 'big'))}. Choose the ${wingWord(best)} wing, then press Space.`, atGoal ? 'Watch my pointer. I will run the fan.' : 'Watch my pointer. I will set the wing and run the fan.']
        : ['A straight has no bend, so the car needs no push.', set.wing === 'flat' ? 'The flat wing leaves the highest top speed, and the wing is flat, so press Space.' : 'The flat wing leaves the highest top speed. Press ← until the wing panel shows Flat, then press Space.', atGoal ? 'Watch my pointer. I will run the fan.' : 'Watch my pointer. I will set the wing and run the fan.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own fan runs, as the bench's challenge reads them: the bench's goal (a wing at each of two fan speeds)
// must pass on these, so finishing the lesson can never pass without them. The bench's goal is a wing at its dial's
// steps of 50 and 100, one speed and twice that speed. The lesson's runs at 50 km/h and 100 km/h are that pair, so each
// run goes to the bench under the dial step with the same number.
export const benchAttempts = view => (view?.runs ?? []).map(({speed, wing}) => ({controls: [{id: 'speedMph'}, {id: 'wing'}], input: {speedMph: speed, wing}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = 'You have passed Downforce, so Wing angle is open on the Tune page in the garage. More wing grips harder in fast corners, and less wing gives a higher top speed on the straights.';

export const lesson = Object.freeze({id: 'downforce', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
