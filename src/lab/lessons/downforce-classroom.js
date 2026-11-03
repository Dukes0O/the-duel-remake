// Downforce as a classroom lesson (docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every push and drag is the downforce bench's own (downforceBench, the
// challenge's bench), the car on the scale is the bench's car, and question 3 is the Tune page's own Wing angle line.
import {downforceBench, downforce, tunnelCar, kgForce} from '../benches/tunnel.js';
import {LAB_TUNE} from '../lab-tune.js';

// The fan dial moves in the bench's own step, 10 mph a press, from 50 to 150.
export const SPEED_STEP = 10, MIN_MPH = 50, MAX_MPH = 150;
// The bench's three wings, named for how far they tilt.
export const WINGS = Object.freeze(['flat', 'small', 'big']);
export const WING_NAME = Object.freeze({flat: 'Flat', small: 'Tilted', big: 'Steep'});
export const CAR_KG = Math.round(tunnelCar.kg), TOP_MPH = tunnelCar.topMph;
// The fan spins up, holds while the scale is read, then the run is judged; in the job the car then drives the course.
export const RAMP_S = 1.2, HOLD_S = .9, DRIVE_S = 2.4;
const WONDER_RAMP_S = 2.2, WATCH_HOLD_S = 1.6, HELD_GAP_S = .14;

const runOf = (speed, wing) => downforceBench.run({speedMph: speed, wing});
// At any fan speed while it spins up, by the bench's own rule.
export const pushAt = (speed, wing) => speed > 0 ? downforce(speed, wing).downforceKg : 0;
export const dragAt = (speed, wing) => speed > 0 ? kgForce(downforce(speed, wing).dragN) : 0;
export const pushKg = (speed, wing) => Math.round(runOf(speed, wing).downforceKg);
export const dragKg = (speed, wing) => Math.round(kgForce(runOf(speed, wing).dragN));
export const topOf = wing => Math.round(TOP_MPH * runOf(MIN_MPH, wing).topSpeedShare);
export const kg = value => `${Math.round(value).toLocaleString('en-GB')} kg`;
const wingWord = wing => WING_NAME[wing].toLowerCase();

// Brian's job: three courses, each with the speed it is driven at and the push its bend needs (none on a straight).
// The least wing that holds wins, since every bit of wing costs top speed.
export const COURSES = Object.freeze([
  {mph: 100, needKg: 100, bend: true},
  {mph: 70, needKg: 100, bend: true},
  {mph: 150, needKg: 0, bend: false},
].map(Object.freeze));
export const bestWing = course => WINGS.find(wing => runOf(course.mph, wing).downforceKg >= course.needKg);

// The wonder's run and the watch's three speeds.
export const WONDER_MPH = 100;
export const WATCH_MPH = Object.freeze([50, 100, 150]);
// Try 1 starts here and doubles the fan.
export const TRY_FROM = 60, TRY_TO = 120;

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'What pushed it down?'},
  {id: 'word-wing', part: 1, title: 'Wing', word: 'downforce-word-0'},
  {id: 'word-downforce', part: 1, title: 'Downforce', word: 'downforce-word-1'},
  {id: 'word-drag', part: 1, title: 'Drag', word: 'downforce-word-2'},
  {id: 'watch', part: 2, title: 'Fifty, a hundred, a hundred and fifty', voice: 'lab.brian.downforce.intro'},
  {id: 'try-speed', part: 3, title: 'Twice the speed'},
  {id: 'try-cost', part: 3, title: 'What the wing costs'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-nine', part: 5, title: 'Question 1 of 3'},
  {id: 'check-bend', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.downforce.explain'},
].map(Object.freeze));

const P50 = pushKg(50, 'big'), P100 = pushKg(100, 'big'), P150 = pushKg(150, 'big');
// Try 1's first push, unrounded, so its guesses are the real twice, four and eight times.
const T60 = pushKg(TRY_FROM, 'small'), T60_EXACT = runOf(TRY_FROM, 'small').downforceKg;
export const KEY_IDEAS = Object.freeze([
  {id: 'push', text: `Twice the speed, four times the push: the steep wing pushes ${kg(P50)} at 50 mph, ${kg(P100)} at 100 and ${kg(P150)} at 150.`},
  {id: 'drag', text: `A wing drags too, so top speed falls: the Falcone F42 reaches ${topOf('flat')} mph with the wing flat, ${topOf('small')} tilted and ${topOf('big')} steep.`},
  {id: 'choose', text: 'More wing grips more in fast bends; less wing is faster on the straights. On the Tune page: Wing angle.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'More wing, more grip, less top speed.',
  text: 'Wing angle is on the Tune page in the garage: more wing grips more in fast corners, most of all at speed; less wing is faster on the straights.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'downforce-word-0', word: 'Wing', meaning: 'A wing is a shaped blade that turns the air.'},
  {id: 'downforce-word-1', word: 'Downforce', meaning: 'Downforce is air pushing the car down onto the road.'},
  {id: 'downforce-word-2', word: 'Drag', meaning: 'Drag is air pushing back and slowing the car.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const DIAL_KEYS = Object.freeze({'↑': 'speed:up', '↓': 'speed:down'});
const WING_KEYS = Object.freeze({'→': 'wing:steeper', '←': 'wing:flatter'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const FAN = Object.freeze({action: 'go', label: 'Run the fan', key: 'Space'});

// Try 1's guesses: three pictures of the push at 120 mph.
const GUESSES = Object.freeze([[2, 'twice'], [4, 'four times'], [8, 'eight times']].map(([n, word]) =>
  ({label: `About ${kg(n * T60_EXACT)}: ${word} as much`, kg: n * T60_EXACT})));
const COST_GUESSES = WINGS.map(wing => ({label: WING_NAME[wing], wing}));

// The Tune page's own line for two steps of More wing (tune-view.js effectLine), from the same table.
const signedPct = share => `${share > 0 ? '+' : '-'}${Math.round(Math.abs(share) * 1000) / 10}%`;
export const WING_TWO_LINE = `Grip at 100 mph ${signedPct(2 * LAB_TUNE.wing.gripAtReference)}, more at higher speed; top speed ${signedPct(2 * LAB_TUNE.wing.topSpeedPerStep)}.`;
const gripTwo = Math.round(2 * LAB_TUNE.wing.gripAtReference * 100), topTwo = Math.round(-2 * LAB_TUNE.wing.topSpeedPerStep * 100);
const CHECKS = {
  'check-nine': {
    question: 'The steep wing, from 50 mph to 150 mph: three times as fast. How much more push?',
    answers: [{label: 'Three times as much', picture: {kind: 'push', kg: [P50, 3 * P50]}}, {label: 'Six times as much', picture: {kind: 'push', kg: [P50, 6 * P50]}},
      {label: 'Nine times as much', picture: {kind: 'push', kg: [P50, P150]}}],
    correct: 2,
    right: () => `Yes: ${kg(P50)} at 50 mph, ${kg(P150)} at 150. Three times the speed, three times three the push: nine times.`,
    wrong: picked => picked === 0 ? `More than three times: ${kg(P50)} at 50 mph, ${kg(P150)} at 150, nine times as much. The push grows with the speed times the speed: 3 × 3 = 9.`
      : `Not six: ${kg(P50)} at 50 mph, ${kg(P150)} at 150, nine times. Three times the speed gives 3 × 3 = 9 times the push, not 3 + 3.`,
    hints: ['Think of the Watch: 50, 100 and 150 mph.', `${kg(P50)} at 50 mph and ${kg(P150)} at 150: how many times is that?`, 'Pick “Nine times as much”.'],
  },
  'check-bend': {
    question: 'The steep wing on. In which bend does it push the car down hardest?',
    answers: [[50, 'The 50 mph hairpin'], [100, 'The 100 mph bend'], [150, 'The 150 mph sweeper']].map(([mph, label]) => ({label, picture: {kind: 'bend', mph}})),
    correct: 2,
    right: () => `Yes: ${kg(P150)} at 150 mph, against ${kg(P100)} at 100 and only ${kg(P50)} at 50. A wing helps most in the fastest bends.`,
    wrong: picked => `At ${[50, 100][picked]} mph it pushes ${kg([P50, P100][picked])}; at 150 mph, ${kg(P150)}. The faster the bend, the harder the wing pushes: it helps most in the fastest bends.`,
    hints: ['The push grows with the speed times the speed.', 'Which bend is taken fastest?', 'Pick the 150 mph sweeper.'],
  },
  'check-game': {
    question: 'On the Tune page you move Wing angle two steps toward More wing. What happens in a race?',
    answers: [{label: `It grips ${gripTwo}% more in a 100 mph corner, more when faster, but has ${topTwo}% less top speed`, picture: {kind: 'game', what: 'trade'}},
      {label: 'It is faster everywhere', picture: {kind: 'game', what: 'both'}}, {label: 'Nothing changes', picture: {kind: 'game', what: 'same'}}],
    correct: 0,
    right: () => 'Yes. More wing holds the fast corners better and costs a little speed on the straights. Less wing is the other way round.',
    wrong: picked => picked === 1 ? `Not everywhere: ${WING_TWO_LINE.replace('-', '−')} The wing’s drag costs top speed on the straights.`
      : `It changes the car: ${WING_TWO_LINE.replace('-', '−')} Less wing is the other way round.`,
    hints: ['Think of what the steep wing did to top speed.', 'More grip, and less of something else.', 'Pick the first card.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The fan dial and the wing carry from step to step, as the player left them.
  const set = {speed: 50, wing: 'flat'};
  const step = () => STEPS[m.index];
  // The fan: off (null), spinning up to a speed, or holding it. `rows` is the step's table of readings.
  const row = (speed, wing) => ({speed, wing, push: pushKg(speed, wing), drag: dragKg(speed, wing), top: topOf(wing)});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', fan: null, spin: null, drive: null, rows: [], guess: null, answered: null, say: '', auto: null, lastPress: -1,
      course: 0, tried: [], watch: 0, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { set.wing = 'big'; spinTo(WONDER_MPH, {ramp: WONDER_RAMP_S, from: 0, delay: .6}); }
    if (id === 'word-wing') { set.speed = 50; set.wing = 'flat'; m.fan = {mph: 50}; m.phase = 'tilt'; }
    if (id === 'word-downforce' || id === 'word-drag') { set.speed = 50; set.wing = 'big'; m.phase = 'ready'; }
    if (id === 'watch') { set.wing = 'big'; m.watch = 0; spinTo(WATCH_MPH[0], {from: 0, hold: WATCH_HOLD_S, delay: .6}); }
    if (id === 'try-speed') { set.speed = TRY_FROM; set.wing = 'small'; m.fan = {mph: TRY_FROM}; m.rows = [row(TRY_FROM, 'small')]; m.phase = 'set'; }
    if (id === 'try-cost') { set.speed = 100; m.phase = 'guess'; }
    // The job starts on the steep wing, away from course 1's answer, whatever wing the tries left.
    if (id === 'alone') { set.speed = COURSES[m.course].mph; if (m.course === 0) set.wing = 'big'; m.phase = 'set'; }
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  // The fan spins from where it is (or `from`) up to `mph`, holds, then the step goes on.
  function spinTo(mph, {ramp = RAMP_S, hold = HOLD_S, from = m.fan?.mph ?? 0, delay = 0} = {}) {
    m.spin = {from, to: mph, t: -delay, ramp, hold}; m.fan = {mph: from}; m.phase = 'running';
  }
  const setting = () => ['try-speed', 'try-cost', 'alone'].includes(step().id) && m.phase === 'set';
  const canDial = () => setting() && step().id === 'try-speed';
  const canWing = () => (setting() && step().id !== 'try-speed') || (step().id === 'word-wing' && m.phase === 'tilt');
  // What Show me sets and runs.
  function goal() {
    const id = step().id;
    if (id === 'try-speed') return {speed: TRY_TO, wing: set.wing};
    if (id === 'word-wing') return {speed: set.speed, wing: 'big'};
    if (id === 'try-cost') return {speed: set.speed, wing: m.tried.includes(set.wing) ? WINGS.find(w => !m.tried.includes(w)) ?? set.wing : set.wing};
    return {speed: set.speed, wing: bestWing(COURSES[Math.min(m.course, COURSES.length - 1)])};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'try-speed') return `Watch: I turn the dial to ${TRY_TO} mph, then run the fan.`;
    if (id === 'word-wing') return 'Watch: I tilt it steep.';
    return g.wing === set.wing ? `Watch: the ${wingWord(g.wing)} wing, then I run the fan.` : `Watch: I set the wing ${wingWord(g.wing)}, then run the fan.`;
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
      if (m.auto || !(setting() || canWing())) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'speed') return dial(value, held === 'held');
    if (kind === 'wing') return tilt(value, held === 'held');
    if (kind === 'answer' && m.phase === 'guess') {
      const picked = Number(value);
      if (id === 'try-speed' && GUESSES[picked]) {
        m.guess = picked; startRun();
        m.say = `You said: ${GUESSES[picked].label.toLowerCase()}. Watch the scale.`;
        return {kind: 'progress', say: m.say};
      }
      if (id === 'try-cost' && COST_GUESSES[picked]) {
        m.guess = picked; m.phase = 'set';
        m.say = `You said: ${WING_NAME[COST_GUESSES[picked].wing].toLowerCase()}. Now run all three wings at 100 mph and read the rope and the top speed.`;
        return {kind: 'progress', say: m.say};
      }
      return null;
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ and ↓ turn the fan dial 10 mph a press, between 50 and 150. A turn stops the fan until it runs again.
  function dial(way, held) {
    if (!canDial() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.speed;
    set.speed = Math.max(MIN_MPH, Math.min(MAX_MPH, before + (way === 'up' ? SPEED_STEP : -SPEED_STEP)));
    if (set.speed === before) return held ? null : {kind: 'note', say: way === 'up' ? `${MAX_MPH} mph is the top of the dial.` : `${MIN_MPH} mph is the bottom of the dial.`};
    m.lastPress = m.time; m.fan = null;
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
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
    if (step().id !== 'word-wing') { m.fan = null; m.drive = null; return held ? null : {kind: 'sound', sound: 'lab.clunk'}; }
    if (set.wing === 'big') return tiltedSteep();
    return held ? null : {kind: 'sound', sound: 'lab.clunk'};
  }
  function tiltedSteep() {
    m.phase = 'done'; m.auto = null; seen.add('word-wing');
    m.say = 'Steep: the wing throws the air up behind it, so the air pushes the wing down. A plane’s wing is the same blade the other way up: it throws the air down and is pushed up.';
    return {kind: 'right', sound: 'lab.clunk', say: m.say};
  }

  function go() {
    const id = step().id;
    if ((id === 'word-downforce' || id === 'word-drag') && m.phase === 'ready') {
      spinTo(50, {from: 0}); runs.push({speed: 50, wing: set.wing});
      m.say = id === 'word-downforce' ? 'The fan is on. Watch the scale.' : 'The fan is on. Watch the gauge on the rope.';
      return {kind: 'progress', say: m.say};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-speed') {
      if (set.speed !== TRY_TO) return {kind: 'note', say: `This try is at ${TRY_TO} mph: press ↑ until the dial reads ${TRY_TO}.`};
      m.phase = 'guess'; m.fan = null;
      m.say = `At ${TRY_FROM} mph the tilted wing pushed ${kg(T60)}. At ${TRY_TO} mph, twice as fast: how much? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    if (id === 'try-cost' && m.tried.includes(set.wing)) return {kind: 'note', say: `You have run the ${wingWord(set.wing)} wing: press ← or → for another.`};
    startRun();
    m.say = id === 'alone' ? `The ${wingWord(set.wing)} wing at ${set.speed} mph: the fan is on.` : `${set.speed} mph, the ${wingWord(set.wing)} wing: the fan is on.`;
    return {kind: 'progress', say: m.say};
  }
  function startRun() {
    spinTo(set.speed, {from: 0}); m.drive = null;
    runs.push({speed: set.speed, wing: set.wing});
  }

  // The fan has held its speed: the reading is judged, or the watch goes on to its next speed.
  function judge() {
    const id = step().id, mph = m.spin.to, wing = set.wing;
    m.spin = null; m.fan = {mph};
    if (id === 'wonder') { m.phase = 'done'; seen.add(id); return null; }
    if (id === 'watch') {
      m.rows = [...m.rows, row(mph, wing)];
      m.watch += 1;
      if (m.watch < WATCH_MPH.length) { spinTo(WATCH_MPH[m.watch], {hold: WATCH_HOLD_S}); return {kind: 'sound', sound: 'lab.tick'}; }
      m.phase = 'done'; seen.add(id); return null;
    }
    if (id === 'word-downforce') {
      m.phase = 'done'; seen.add(id);
      m.say = `The scale reads ${kg(CAR_KG + P50)}: the car’s ${kg(CAR_KG)} and ${kg(P50)} of air pushing it down. That push is downforce. Pressed harder onto the road, the tyres grip harder.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'word-drag') {
      m.phase = 'done'; seen.add(id);
      m.say = `The rope’s gauge reads ${kg(dragKg(50, 'big'))}: the air pushes the car back as hard as ${kg(dragKg(50, 'big'))} hanging on a rope would. That is drag, and it slows the car.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-speed') {
      m.phase = 'done'; seen.add(id); m.rows = [...m.rows, row(mph, wing)];
      const right = m.guess === 1, got = pushKg(mph, wing);
      m.say = right ? `Right: ${kg(got)}, four times as much as at ${TRY_FROM} mph. Twice the speed, four times the push.`
        : m.guess === 0 ? `It pushed ${kg(got)}: four times as much as at ${TRY_FROM} mph, not twice. Twice the speed gives four times the push.`
          : `It pushed ${kg(got)}: four times as much as at ${TRY_FROM} mph, not eight. Twice the speed, four times the push.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    if (id === 'try-cost') {
      m.rows = [...m.rows, row(mph, wing)]; m.tried = [...m.tried, wing];
      m.phase = 'set';
      if (m.tried.length < WINGS.length) {
        const next = WINGS.filter(w => !m.tried.includes(w)).map(wingWord).join(' and the ');
        m.say = `The ${wingWord(wing)} wing: ${kg(pushKg(mph, wing))} of push, ${kg(dragKg(mph, wing))} on the rope, top speed ${topOf(wing)} mph. Now the ${next}: press ← or →, then Space.`;
        return {kind: 'progress', say: m.say};
      }
      m.phase = 'done'; seen.add(id);
      const picked = COST_GUESSES[m.guess]?.wing, flat = `Flat drags least, ${kg(dragKg(mph, 'flat'))}, the car’s body alone, and keeps all ${topOf('flat')} mph.`;
      m.say = picked === 'flat' ? `Right. ${flat} More wing, more push, and more drag: the table shows all three.`
        : `The ${wingWord(picked)} wing pushes more, ${kg(pushKg(mph, picked))}, but drags more too: only ${topOf(picked)} mph. ${flat}`;
      return {kind: picked === 'flat' ? 'right' : 'wrong', say: m.say};
    }
    // Brian's job: the fan has run at the course's speed; now the car drives it.
    m.drive = {t: 0}; m.phase = 'driving';
    return null;
  }
  // The car has driven the course: did it hold, and with no more wing than it needed?
  function judgeCourse() {
    const course = COURSES[m.course], wing = set.wing, best = bestWing(course), push = runOf(course.mph, wing).downforceKg;
    m.phase = 'set';
    if (course.bend && push < course.needKg) {
      m.say = `At ${course.mph} mph the ${wingWord(wing)} wing pushes ${kg(push)}; this bend needs ${kg(course.needKg)}, so the car slid wide. Steeper: press →, then Space.`;
      return {kind: 'fail', say: m.say};
    }
    if (!course.bend && wing !== best) {
      m.say = `No bend needs push here, and the ${wingWord(wing)} wing costs top speed: ${topOf(wing)} mph, not ${topOf(best)}. Flatter: press ←, then Space.`;
      return {kind: 'fail', say: m.say};
    }
    if (wing !== best) {
      m.say = `It held with ${kg(push)}, but the ${wingWord(best)} wing does it with ${kg(pushKg(course.mph, best))} and keeps ${topOf(best)} mph, not ${topOf(wing)}. Flatter: press ←, then Space.`;
      return {kind: 'fail', say: m.say};
    }
    m.course += 1;
    if (m.course >= COURSES.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `Flat for the straight: all ${topOf('flat')} mph. Three courses, three wings: tilted for the 100 mph bend, steep for the 70 mph bend, flat for the straight. Job done.`;
      return {kind: 'pass', say: m.say};
    }
    const next = COURSES[m.course];
    set.speed = next.mph; m.fan = null; m.drive = null;
    m.say = m.course === 1
      ? `Right: the tilted wing pushes ${kg(push)}, enough for ${kg(course.needKg)}, and keeps ${topOf(wing)} mph. Course 2: a slower bend, ${next.mph} mph, that needs ${kg(next.needKg)} too. I have set the fan to ${next.mph}.`
      : `Right: at ${course.mph} mph the tilted wing gives only ${kg(pushKg(course.mph, 'small'))}; the steep one gives ${kg(push)}. A slower bend needs more wing for the same push. Course 3: one long straight, no bends. The fan is at ${next.mph}.`;
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
      if (set.speed !== a.speed) { set.speed += Math.sign(a.speed - set.speed) * SPEED_STEP; m.fan = null; return null; }
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
    m.fan = {mph: s.from + (s.to - s.from) * (1 - (1 - k) ** 2)};
    return s.t >= s.ramp + s.hold ? judge() : null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The tunnel as the board draws it: the fan's speed now, the wing, and the scale and the rope's readings.
  function rig() {
    const mph = m.fan?.mph ?? 0, push = pushAt(mph, set.wing), drag = dragAt(mph, set.wing);
    return {mph, on: m.fan !== null, wing: set.wing, push, drag, scale: CAR_KG + push};
  }

  function view() {
    const id = step().id;
    const base = {scene: 'tunnel', low: 'table', time: m.time, rig: rig(), dial: null, wingPanel: null, rows: m.rows.map(r => ({...r})), job: null, runs: runs.map(r => ({...r})),
      focus: null, keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, scene: id, asking: !answered, answered, rig: null,
        tune: id === 'check-game' ? {effect: answered ? WING_TWO_LINE : null} : null,
        pushes: id === 'check-nine' ? [{speed: 50, kg: P50}, {speed: 150, kg: P150}] : null,
        bends: id === 'check-bend' ? [50, 100, 150].map(mph => ({mph, kg: pushKg(mph, 'big')})) : null,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, rig: null,
      say: 'Twice the speed, four times the push. A wing drags too, so top speed falls. More wing for fast bends, less for long straights: choose for the track.',
      prompt: 'Enter finishes the lesson and opens Wing angle on the Tune page in the garage.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'], focus: 'scale', low: 'scale',
        say: done ? `The car weighs ${kg(CAR_KG)}. At ${WONDER_MPH} mph the scale read ${kg(CAR_KG + P100)}, and nothing touched the car. Where did ${kg(P100)} come from?`
          : `The car stands on the scale: ${kg(CAR_KG)}. Now the fan comes on. Watch the scale.`,
        prompt: done ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the scale.',
        hints: ['Watch the number on the scale.', 'Only the air touches the car.', done ? 'Press Enter when you are ready to find out.' : 'Watch the scale, then press Enter.']};
    }
    if (id === 'word-wing') {
      const done = m.phase === 'done';
      return {...base, wingPanel: {wing: set.wing, locked: done}, focus: 'wing', low: 'wing', best: goal(),
        ...(done ? {} : {keys: WING_KEYS, repeat: ['←', '→'], waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'wing'}),
        say: done ? m.say : m.auto ? autoSay() : `A wing is a shaped blade that turns the air. The fan is on at 50 mph and the wing is ${wingWord(set.wing)}. Tilt it steep and watch the smoke.`,
        prompt: done ? 'Press Enter to go on.' : `${WING_NAME[set.wing]}. Press → to tilt it steeper, or click the wing panel.`,
        hints: done ? DONE : ['Watch the smoke behind the wing.', 'Press → until the wing reads Steep.', 'Watch my pointer: I tilt it.']};
    }
    if (id === 'word-downforce' || id === 'word-drag') {
      const ready = m.phase === 'ready', done = m.phase === 'done', push = id === 'word-downforce';
      return {...base, wingPanel: {wing: set.wing, locked: true}, focus: push ? 'scale' : 'rope', low: push ? 'scale' : 'rope',
        ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'fan', buttons: [FAN]} : {}),
        say: done ? m.say : push ? 'Downforce is air pushing the car down onto the road. The wing is steep. Run the fan at 50 mph and watch the scale.'
          : 'Drag is air pushing back and slowing the car. The rope holds the car against the wind; its gauge reads how hard. Run the fan.',
        prompt: ready ? 'Press Space to run the fan, or click it.' : done ? 'Press Enter to go on.' : push ? 'Watch the scale.' : 'Watch the gauge on the rope.',
        hints: done ? DONE : [push ? 'The scale is under the car.' : 'The gauge is on the rope at the car’s nose.', 'Press Space.', 'Watch my pointer: I run the fan.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], wingPanel: {wing: set.wing, locked: true}, focus: 'scale',
        say: done ? `${kg(P50)} at 50 mph, ${kg(P100)} at 100: twice the speed, four times the push. ${kg(P150)} at 150: three times the speed, nine times the push. The drag on the rope grew the same way.`
          : 'The steep wing. The fan runs at 50, then 100, then 150 mph. Watch the scale and the table.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the scale.',
        hints: ['Watch the push in the table.', 'How many times bigger is each one?', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The tries and Brian's job: the fan dial, the wing panel and the fan.
    const setNow = setting() && !m.auto, g = goal(), atGoal = set.speed === g.speed && set.wing === g.wing;
    const keys = !setNow ? {} : {...(canDial() ? DIAL_KEYS : {}), ...(canWing() ? WING_KEYS : {}), Space: 'go'};
    const v = {...base, dial: {speed: set.speed, locked: !canDial()}, wingPanel: {wing: set.wing, locked: !canWing()}, keys, buttons: setNow ? [FAN] : [],
      repeat: setNow ? [...(canDial() ? ['↑', '↓'] : []), ...(canWing() ? ['←', '→'] : [])] : [], target: !setNow ? null : atGoal ? 'go' : 'set:best',
      glow: setNow ? 'set' : null, waiting: setNow || m.phase === 'guess', best: g};
    if (id === 'try-speed') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'push', kg: [T60, c.kg]}, state: null})),
        say: m.say || `At ${TRY_FROM} mph the tilted wing pushed ${kg(T60)}. At ${TRY_TO} mph, twice as fast: how much? Pick a card.`,
        prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: [`At ${TRY_FROM} mph it pushed ${kg(T60)}.`, 'Twice the speed gives more than twice the push.', 'Pick a card; any guess goes on.']};
      if (m.phase === 'running') return {...v, focus: 'scale', say: m.say, prompt: 'Watch the scale.', hints: ['Watch the push on the scale.', 'Compare it with the first row.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, focus: 'scale', mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `The tilted wing pushes ${kg(T60)} at ${TRY_FROM} mph. Turn the fan to ${TRY_TO} mph, twice as fast, then run it.`,
        prompt: `${set.speed} mph. Press ↑ for faster, ↓ for slower, Space to run the fan.`,
        hints: ['The fan dial is on the right.', `Press ↑ until it reads ${TRY_TO} mph, then Space.`, 'Watch my pointer: I turn it and run the fan.']};
    }
    if (id === 'try-cost') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: COST_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'wing', wing: c.wing}, state: null})),
        say: 'The fan at 100 mph. Which wing will keep the most top speed: flat, tilted or steep? Pick a card, then try all three.',
        prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: ['Top speed is what the engine reaches against the drag.', 'Which wing turns the air least?', 'Pick a card; any guess goes on.']};
      if (m.phase === 'running') return {...v, focus: 'rope', say: m.say, prompt: 'Watch the scale and the rope.', hints: ['Read the push and the drag.', 'The table keeps each wing.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, mood: COST_GUESSES[m.guess]?.wing === 'flat' ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      const left = WINGS.filter(w => !m.tried.includes(w)).map(wingWord);
      return {...v, say: m.auto ? autoSay() : m.say,
        prompt: `${WING_NAME[set.wing]} wing. ← flatter, → steeper, Space to run the fan. Still to run: ${left.join(', ')}.`,
        hints: ['Run each wing once: the table keeps them all.', m.tried.includes(set.wing) ? 'Press ← or → for a wing you have not run, then Space.' : 'Press Space to run this wing.', 'Watch my pointer: I set it and run the fan.']};
    }
    // Brian's job.
    const at = Math.min(m.course, COURSES.length - 1), course = COURSES[at], best = bestWing(course);
    const drive = m.drive ? {t: m.drive.t / DRIVE_S, holds: !course.bend || runOf(course.mph, set.wing).downforceKg >= course.needKg, wing: set.wing} : null;
    const job = {course: at + 1, of: COURSES.length, mph: course.mph, needKg: course.needKg, bend: course.bend, done: m.phase === 'done', drive};
    const jv = {...v, job, low: 'course', focus: m.phase === 'running' ? 'scale' : null};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (m.phase === 'running' || m.phase === 'driving') return {...jv, say: m.say, prompt: m.phase === 'running' ? 'Watch the scale.' : 'Watch the car on the course.',
      hints: ['Read the push on the scale.', course.bend ? 'Does it hold the bend?' : 'How fast does it go?', 'Wait a moment.']};
    const intro = `Brian’s job: three courses. I set the fan to each one’s speed; you pick the least wing that holds, since every bit of wing costs top speed. Course 1: a ${COURSES[0].mph} mph bend that needs ${kg(COURSES[0].needKg)} of push.`;
    return {...jv,
      say: m.auto ? autoSay() : m.course === 0 && !m.say ? intro : m.say,
      prompt: course.bend ? `Course ${at + 1}: ${course.mph} mph, needs ${kg(course.needKg)}. ${WING_NAME[set.wing]} wing. ← flatter, → steeper, Space to run the fan.`
        : `Course ${at + 1}: one long straight. ${WING_NAME[set.wing]} wing. ← flatter, → steeper, Space to run the fan.`,
      hints: course.bend ? [`The bend needs ${kg(course.needKg)} at ${course.mph} mph; the least wing that gives that keeps the most top speed.`,
        `At ${course.mph} mph: tilted ${kg(pushKg(course.mph, 'small'))}, steep ${kg(pushKg(course.mph, 'big'))}. Pick ${wingWord(best)}, then Space.`, 'Watch my pointer: I set it and run the fan.']
        : ['No bend: no push is needed.', 'Flat keeps the most top speed. Press ← until it reads Flat, then Space.', 'Watch my pointer: I set it and run the fan.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own fan runs, as the bench's challenge reads them: the bench's goal (a wing at 50 mph and at 100 mph)
// must pass on these, so finishing the lesson can never pass without them.
export const benchAttempts = view => (view?.runs ?? []).map(({speed, wing}) => ({controls: [{id: 'speedMph'}, {id: 'wing'}], input: {speedMph: speed, wing}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = 'Downforce passed! Wing angle is open on the Tune page in the garage: more wing grips more in fast corners, less wing is faster on the straights.';

export const lesson = Object.freeze({id: 'downforce', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
