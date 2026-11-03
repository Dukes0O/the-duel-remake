// Launch angles as a classroom lesson (docs/board/cards/LAB-CLASSROOM-LAUNCH.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every distance is the launch bench's own run (launchBench, the challenge's
// bench) with the skier's own air and a level landing; question 2's landing is the bench's 10 m lower one.
import {launchBench, rangeOf, TARGET} from '../benches/launch.js';

export const MPH = 2.2369362920544;
// The ramp tilts 5 degrees a press on the bench's 1-degree grid; the speed dial moves 1 m/s a press, shown in mph.
export const ANGLE_STEP = 5, MIN_ANGLE = 15, MAX_ANGLE = 75;
export const SPEED_STEP = 1, MIN_MS = 13, MAX_MS = 24;
// A launch flies faster than life so the watch is not a wait; the tape is read for a moment after it lands.
export const FLY_RATE = 1.6, LAND_HOLD_S = .7;
const HELD_GAP_S = .14, GAP_S = .5;

const runOf = (angle, ms, lower = false) => launchBench.run({angleDeg: angle, speedMs: ms, air: 'air', landing: lower ? '10 m lower' : 'level'});
export const distanceOf = (angle, ms, lower = false) => runOf(angle, ms, lower).rangeM;
export const secondsOf = (angle, ms, lower = false) => runOf(angle, ms, lower).seconds;
// The flight's path, from the bench's own rule: [metres along, metres up, seconds].
export function pathOf(angle, ms, lower = false) {
  const points = [];
  rangeOf(angle, ms, {air: true, lower, points});
  return points;
}
export const mph = ms => Math.round(ms * MPH);
export const m1 = value => `${value.toFixed(1)} m`;
export const deg = angle => `${angle}°`;
export const FLAG_M = TARGET.rangeM, WITHIN_M = TARGET.withinM;
export const hits = (flag, angle, ms) => Math.abs(distanceOf(angle, ms) - flag) <= WITHIN_M;

// The wonder's two launches and the watch's five, all at 45 mph (20 m/s).
export const SHOW_MS = 20;
export const WONDER_ANGLES = Object.freeze([60, 30]);
export const WATCH_ANGLES = Object.freeze([15, 30, 45, 60, 75]);
// Try 2 slows the dial from 45 mph to 40 mph (18 m/s).
export const SLOW_MS = 18;
// Brian's job: three marks. The first fixes the ramp, the second the speed, the third is the bench's own 30 m mark.
export const MARKS = Object.freeze([
  {flag: 42, fixed: 'angle', angle: 45, ms: 20},
  {flag: 27, fixed: 'speed', angle: 45, ms: 22},
  {flag: FLAG_M, fixed: null, angle: 75, ms: 16},
].map(Object.freeze));

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Two jumps, one spot'},
  {id: 'word-angle', part: 1, title: 'Launch angle', word: 'launch-launch-angle'},
  {id: 'word-speed', part: 1, title: 'Speed', word: 'launch-speed'},
  {id: 'word-distance', part: 1, title: 'Distance', word: 'launch-distance'},
  {id: 'watch', part: 2, title: 'Five ramps, one speed', voice: 'lab.brian.launch.intro'},
  {id: 'try-flag', part: 3, title: 'Past the flag'},
  {id: 'try-speed', part: 3, title: 'A little slower'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-pair', part: 5, title: 'Question 1 of 3'},
  {id: 'check-lower', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.launch.explain'},
].map(Object.freeze));

const D = (angle, ms = SHOW_MS, lower = false) => m1(distanceOf(angle, ms, lower));
export const KEY_IDEAS = Object.freeze([
  {id: 'angle', text: `About 45 degrees goes furthest on level ground: ${D(45)} at 45 mph. Steeper climbs and lands short, flatter comes down soon, and each pair either side lands close: 30° ${D(30)}, 60° ${D(60)}.`},
  {id: 'speed', text: `More speed, further: at 45 degrees, 40 mph lands ${D(45, SLOW_MS)}, 45 mph ${D(45)} and 49 mph ${D(45, 22)}.`},
  {id: 'lower', text: 'A lower landing wants a flatter ramp. On the Aerials run the kicker sets the angle, so tuck on the inrun (hold Shift) for speed.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'About 45 degrees goes furthest; speed carries it.',
  text: 'The Aerials run is open on the mountain. The kicker sets the angle, so tuck on the inrun (hold Shift) to come off faster: higher and further.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'launch-launch-angle', word: 'Launch angle', meaning: 'Launch angle is how far the ramp points up from level ground.'},
  {id: 'launch-speed', word: 'Speed', meaning: 'Speed is how fast the skier leaves the ramp, shown here in mph.'},
  {id: 'launch-distance', word: 'Distance', meaning: 'Distance is how far the skier lands along the ground, shown in metres.'},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons and the board) ----
const ANGLE_KEYS = Object.freeze({'↑': 'angle:up', '↓': 'angle:down'});
const SPEED_KEYS = Object.freeze({'→': 'speed:up', '←': 'speed:down'});
const ANSWER_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const DONE = Object.freeze(['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']);
const LAUNCH = Object.freeze({action: 'go', label: 'Launch', key: 'Space'});

// Try 1's guesses: which way to tilt a ramp whose skier lands past the flag.
const TILT_GUESSES = Object.freeze([['steeper', 'Steeper'], ['flatter', 'Flatter'], ['either', 'Either way']].map(([way, label]) => ({way, label})));
// Try 2's guesses: three places on the tape.
const SLOW_GUESSES = Object.freeze([34, 30, 20].map(at => ({at, label: `About ${at} m`})));

const A50 = distanceOf(50, SHOW_MS);
const CHECKS = {
  'check-pair': {
    question: `At 45 mph the 50 degree ramp lands ${m1(A50)}. Which other ramp lands close to it?`,
    answers: [40, 55, 70].map(angle => ({label: `${angle} degrees`, picture: {kind: 'ramp', angle}})),
    correct: 0,
    right: () => `Yes: 40 degrees lands ${D(40)}, beside ${m1(A50)}. 40 is as far below 45 as 50 is above, so the pair lands close together.`,
    wrong: picked => picked === 1 ? `55 degrees lands ${D(55)}, ${m1(A50 - distanceOf(55, SHOW_MS))} shorter. 40 is as far below 45 as 50 is above: ${D(40)}.`
      : `70 degrees is far too steep: ${D(70)}. 40 is as far below 45 as 50 is above: ${D(40)}.`,
    hints: ['Think of the pairs in the Watch: 30 and 60, 15 and 75.', '50 is 5 degrees above 45. Which ramp is 5 degrees below?', 'Pick 40 degrees.'],
  },
  'check-lower': {
    question: 'The landing is 10 m lower, like the Aerials hill below its kicker. At 45 mph, which ramp goes furthest?',
    answers: [40, 45, 55].map(angle => ({label: `${angle} degrees`, picture: {kind: 'ramp', angle, lower: true}})),
    correct: 0,
    right: () => `Yes: 40 degrees goes ${D(40, SHOW_MS, true)}, 45 degrees ${D(45, SHOW_MS, true)}. The skier has longer to fall, so a flatter ramp that sends more of its speed forward wins.`,
    wrong: picked => picked === 1 ? `45 degrees goes ${D(45, SHOW_MS, true)}; 40 degrees goes ${D(40, SHOW_MS, true)}. The skier has longer to fall, so a flatter ramp that sends more of its speed forward wins.`
      : `55 degrees goes only ${D(55, SHOW_MS, true)}: steeper loses even more when the landing is lower. 40 degrees goes ${D(40, SHOW_MS, true)}.`,
    hints: ['A lower landing gives the skier longer in the air.', 'With longer to fall, send more of the speed forward: flatter.', 'Pick 40 degrees.'],
  },
  'check-game': {
    question: 'On the Aerials run the kicker always throws you at about 50 degrees. To fly higher and further, what do you do?',
    answers: [{label: 'Tuck on the inrun (hold Shift) to come off faster', picture: {kind: 'kicker', what: 'tuck'}},
      {label: 'Lean back to make the kicker steeper', picture: {kind: 'kicker', what: 'lean'}},
      {label: 'Ski slower so the kicker throws you higher', picture: {kind: 'kicker', what: 'slow'}}],
    correct: 0,
    right: () => `Yes. The kicker sets the angle; your speed is yours. On the launcher at 50 degrees, 40 mph lands ${D(50, SLOW_MS)} and 49 mph ${D(50, 22)}.`,
    wrong: picked => picked === 1 ? 'The kicker is snow: its angle is fixed. Your speed is yours: tuck on the inrun (hold Shift) to come off faster.'
      : `Slower lands lower and shorter: on the launcher at 50 degrees, 40 mph lands ${D(50, SLOW_MS)} and 49 mph ${D(50, 22)}. Tuck on the inrun for speed.`,
    hints: ['You cannot change the kicker’s angle.', 'What did more speed do on the launcher?', 'Pick the first card.'],
  },
};

const clampAngle = a => Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, a));
const clampSpeed = s => Math.max(MIN_MS, Math.min(MAX_MS, s));
// What to change after a miss, from where the ramp is. Short: tilt toward 45, or more speed. Past: away from 45, or less.
function angleFix(angle, short) {
  if (short) return angle < 45 ? 'tilt it steeper, toward 45: press ↑' : angle > 45 ? 'tilt it flatter, toward 45: press ↓' : null;
  return angle < 45 ? 'tilt it flatter, further from 45: press ↓' : angle > 45 ? 'tilt it steeper, further from 45: press ↑' : 'tilt it steeper or flatter, since 45 goes furthest: press ↑ or ↓';
}
// Speed advice only while the dial can still turn that way.
const speedFix = (short, ms) => short ? (ms < MAX_MS ? 'more speed: press →' : null) : (ms > MIN_MS ? 'less speed: press ←' : null);
const sentence = s => s[0].toUpperCase() + s.slice(1);
export function missSay(flag, angle, ms, fixed) {
  const d = distanceOf(angle, ms), short = d < flag, by = m1(Math.abs(d - flag));
  const turn = angleFix(angle, short), speed = speedFix(short, ms);
  const fix = fixed === 'angle' || !turn ? speed ?? turn : fixed === 'speed' || !speed ? turn : `${turn}, or ${speed}`;
  return `It landed ${m1(d)}, ${by} ${short ? 'short of' : 'past'} the ${flag} m flag. ${sentence(fix)}, then Space.`;
}

export function createModel() {
  let m = null;
  const seen = new Set(), runs = [];
  // The ramp and the dial carry from step to step, as the player left them.
  const set = {angle: 45, ms: SHOW_MS};
  const step = () => STEPS[m.index];
  const row = (angle, ms) => ({angle, speed: mph(ms), ms, distance: distanceOf(angle, ms)});

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', flight: null, queue: [], trails: [], rows: [], guess: null, answered: null, say: '', auto: null, lastPress: -1,
      mark: 0, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { set.ms = SHOW_MS; queueLaunches(WONDER_ANGLES); }
    if (id === 'word-angle') { set.angle = 60; set.ms = SHOW_MS; m.phase = 'tilt'; }
    if (id === 'word-speed') { set.angle = 45; set.ms = SLOW_MS; m.phase = 'turn'; }
    if (id === 'word-distance') { set.angle = 45; set.ms = SHOW_MS; m.phase = 'ready'; }
    if (id === 'watch') { set.ms = SHOW_MS; queueLaunches(WATCH_ANGLES); }
    if (id === 'try-flag') { set.angle = 45; set.ms = SHOW_MS; m.rows = [row(45, SHOW_MS)]; m.phase = 'guess'; }
    if (id === 'try-speed') { set.angle = 45; set.ms = SHOW_MS; m.rows = [row(45, SHOW_MS)]; m.phase = 'set'; }
    if (id === 'alone') startMark();
    if (CHECKS[id]) m.phase = m.answered === null ? 'ask' : 'answered';
  }
  // Each mark starts where Brian sets it, away from its answer.
  function startMark() {
    const mark = MARKS[m.mark];
    set.angle = mark.angle; set.ms = mark.ms; m.trails = []; m.phase = 'set';
  }
  // The wonder and the watch launch by themselves, one after another.
  function queueLaunches(angles) {
    m.queue = [...angles]; m.phase = 'running';
    launch(m.queue.shift(), set.ms, .6);
  }
  function launch(angle, ms, delay = 0) {
    set.angle = angle;
    m.flight = {angle, ms, t: -delay, seconds: secondsOf(angle, ms), distance: distanceOf(angle, ms)};
    runs.push({angle, ms});
    if (m.phase !== 'running') m.phase = 'flying';
  }
  const setting = () => ['try-flag', 'try-speed', 'alone'].includes(step().id) && m.phase === 'set';
  const mark = () => MARKS[Math.min(m.mark, MARKS.length - 1)];
  const canAngle = () => (setting() && (step().id === 'try-flag' || (step().id === 'alone' && mark().fixed !== 'angle'))) || (step().id === 'word-angle' && m.phase === 'tilt');
  const canSpeed = () => (setting() && (step().id === 'try-speed' || (step().id === 'alone' && mark().fixed !== 'speed'))) || (step().id === 'word-speed' && m.phase === 'turn');
  // What Show me sets and launches.
  function goal() {
    const id = step().id;
    if (id === 'word-angle') return {angle: 45, ms: set.ms};
    if (id === 'word-speed') return {angle: set.angle, ms: SHOW_MS};
    if (id === 'try-flag') return {angle: set.angle > 45 ? 60 : 30, ms: set.ms};
    if (id === 'try-speed') return {angle: set.angle, ms: SLOW_MS};
    if (id === 'alone') {
      const k = mark();
      if (k.fixed === 'angle') return {angle: set.angle, ms: 22};
      if (k.fixed === 'speed') return {angle: set.angle < 45 ? 20 : 70, ms: set.ms};
      return {angle: 45, ms: SLOW_MS};
    }
    return {angle: set.angle, ms: set.ms};
  }
  function autoSay() {
    const id = step().id, g = goal();
    if (id === 'word-angle') return 'Watch: I tilt it to 45 degrees.';
    if (id === 'word-speed') return 'Watch: I turn the dial to 45 mph.';
    if (id === 'try-speed') return 'Watch: I turn the dial to 40 mph. Then you guess where it lands.';
    const parts = [g.angle !== set.angle ? `tilt the ramp to ${g.angle} degrees` : null, g.ms !== set.ms ? `turn the dial to ${mph(g.ms)} mph` : null].filter(Boolean);
    return parts.length ? `Watch: I ${parts.join(' and ')}, then launch.` : 'Watch: I launch.';
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
      if (m.auto || !(setting() || canAngle() || canSpeed())) return null;
      m.auto = goal();
      return {kind: 'progress', say: autoSay()};
    }
    if (kind === 'angle') return tilt(value, held === 'held');
    if (kind === 'speed') return turn(value, held === 'held');
    if (kind === 'answer' && m.phase === 'guess') {
      const picked = Number(value);
      if (id === 'try-flag' && TILT_GUESSES[picked]) {
        m.guess = picked; m.phase = 'set';
        m.say = `You said: ${TILT_GUESSES[picked].label.toLowerCase()}. Tilt the ramp with ↑ or ↓, then launch until the skier lands on the flag.`;
        return {kind: 'progress', say: m.say};
      }
      if (id === 'try-speed' && SLOW_GUESSES[picked]) {
        m.guess = picked; launch(set.angle, set.ms);
        m.say = `You said: about ${SLOW_GUESSES[picked].at} m. Watch the tape.`;
        return {kind: 'progress', say: m.say};
      }
      return null;
    }
    if (kind === 'go') return go();
    return null;
  }

  // ↑ tilts the ramp 5 degrees steeper, ↓ 5 degrees flatter, between 15 and 75.
  function tilt(way, held) {
    if (!canAngle() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.angle;
    set.angle = clampAngle(before + (way === 'up' ? ANGLE_STEP : -ANGLE_STEP));
    if (set.angle === before) return held ? null : {kind: 'note', say: way === 'up' ? `${MAX_ANGLE} degrees is as steep as the ramp goes.` : `${MIN_ANGLE} degrees is as flat as the ramp goes.`};
    m.lastPress = m.time;
    if (step().id === 'word-angle' && set.angle === 45) return tilted();
    return held ? null : {kind: 'sound', sound: 'lab.clunk'};
  }
  function tilted() {
    m.phase = 'done'; m.auto = null; seen.add('word-angle');
    m.say = '45 degrees: halfway between level and straight up. That is the launch angle.';
    return {kind: 'right', sound: 'lab.clunk', say: m.say};
  }
  // → turns the speed dial 1 m/s faster, ← 1 m/s slower, shown in mph.
  function turn(way, held) {
    if (!canSpeed() || m.auto || (way !== 'up' && way !== 'down')) return null;
    if (held && m.time - m.lastPress < HELD_GAP_S) return null;
    const before = set.ms;
    set.ms = clampSpeed(before + (way === 'up' ? SPEED_STEP : -SPEED_STEP));
    if (set.ms === before) return held ? null : {kind: 'note', say: way === 'up' ? `${mph(MAX_MS)} mph is the top of the dial.` : `${mph(MIN_MS)} mph is the bottom of the dial.`};
    m.lastPress = m.time;
    if (step().id === 'word-speed' && set.ms === SHOW_MS) return turned();
    return held ? null : {kind: 'sound', sound: 'lab.tick'};
  }
  function turned() {
    m.phase = 'done'; m.auto = null; seen.add('word-speed');
    m.say = '45 mph: how fast the skier leaves the end of the ramp. That is the speed.';
    return {kind: 'right', sound: 'lab.tick', say: m.say};
  }

  function go() {
    const id = step().id;
    if (id === 'word-distance' && m.phase === 'ready') {
      launch(set.angle, set.ms);
      m.say = 'Launch! Watch the tape.';
      return {kind: 'progress', say: m.say};
    }
    if (!setting() || m.auto) return null;
    if (id === 'try-flag' && set.angle === 45) return {kind: 'note', say: `At 45 degrees it lands ${D(45)}, past the flag: tilt the ramp first, ↑ or ↓.`};
    if (id === 'try-speed') {
      if (set.ms !== SLOW_MS) return {kind: 'note', say: `This try is at ${mph(SLOW_MS)} mph: press ← until the dial reads ${mph(SLOW_MS)}.`};
      m.phase = 'guess';
      m.say = `At 45 mph it landed ${D(45)}. At ${mph(SLOW_MS)} mph, where will it land? Pick a card.`;
      return {kind: 'progress', say: m.say};
    }
    launch(set.angle, set.ms);
    m.say = `${deg(set.angle)} at ${mph(set.ms)} mph: launch!`;
    return {kind: 'progress', say: m.say};
  }

  // The skier has landed and the tape has been read: judge the launch, or launch the next one in the queue.
  function judge() {
    const id = step().id, {angle, ms, distance} = m.flight;
    m.trails = [...m.trails, {angle, ms, distance}].slice(-6);
    m.flight = null;
    if (id === 'wonder' || id === 'watch') {
      m.rows = [...m.rows, row(angle, ms)];
      if (m.queue.length) { m.gap = GAP_S; return {kind: 'sound', sound: 'lab.tick'}; }
      m.phase = 'done'; seen.add(id); return null;
    }
    if (id === 'word-distance') {
      m.phase = 'done'; seen.add(id); m.rows = [row(angle, ms)];
      m.say = `The tape reads ${m1(distance)}: further than the 60 degree and 30 degree jumps. Distance is measured along the ground from the end of the ramp.`;
      return {kind: 'right', say: m.say};
    }
    m.rows = [...m.rows, row(angle, ms)];
    if (id === 'try-flag') {
      m.phase = 'set';
      if (!hits(FLAG_M, angle, ms)) { m.say = missSay(FLAG_M, angle, ms, 'speed'); return {kind: 'fail', say: m.say}; }
      m.phase = 'done'; seen.add(id);
      const other = angle > 45 ? 30 : 60, either = TILT_GUESSES[m.guess]?.way === 'either';
      m.say = `${deg(angle)} lands ${m1(distance)}: on the flag. ${either ? 'Right: either way works.' : `${sentence(TILT_GUESSES[m.guess]?.way ?? 'steeper')} works, and so does the other way.`} ${other} degrees lands ${D(other)}. 45 is the top of the hill; both sides come down.`;
      return {kind: 'right', say: m.say};
    }
    if (id === 'try-speed') {
      m.phase = 'done'; seen.add(id);
      const right = m.guess === 1, cost = m1(distanceOf(45, SHOW_MS) - distance);
      m.say = right ? `Right: ${m1(distance)}. 5 mph less cost ${cost}: a slower skier goes forward slower and comes down sooner, so both cut the jump.`
        : m.guess === 0 ? `Speed counts for more than that: ${m1(distance)}. A slower skier goes forward slower and comes down sooner, so both cut the jump.`
          : `Not that much: ${m1(distance)}. 5 mph less cost ${cost}, not half the jump.`;
      return {kind: right ? 'right' : 'wrong', say: m.say};
    }
    // Brian's job.
    const k = mark();
    if (!hits(k.flag, angle, ms)) { m.phase = 'set'; m.say = missSay(k.flag, angle, ms, k.fixed); return {kind: 'fail', say: m.say}; }
    m.mark += 1;
    if (m.mark >= MARKS.length) {
      m.phase = 'done'; seen.add('alone');
      m.say = `${deg(angle)} at ${mph(ms)} mph lands ${m1(distance)}: on my 30 m mark. Job done: speed for the far flag, the angle for the near one, and both for mine.`;
      return {kind: 'pass', say: m.say};
    }
    startMark();
    const next = MARKS[m.mark];
    if (m.mark === 1) {
      m.say = `Right: ${mph(ms)} mph lands ${m1(distance)}, on the 42 m flag. More speed, further. Mark 2: a flag at ${next.flag} m with the speed fixed at ${mph(next.ms)} mph: set the angle.`;
    } else {
      const other = angle > 45 ? 20 : 70;
      m.say = `Right: ${deg(angle)} lands ${m1(distance)}, on the 27 m flag; ${other} degrees would too, ${m1(distanceOf(other, ms))}. Mark 3: my ${next.flag} m mark, everything yours. I have set ${next.angle} degrees and ${mph(next.ms)} mph.`;
    }
    return {kind: 'right', say: m.say};
  }

  function tick(dt) {
    m.time += dt;
    if (m.auto && m.time - m.lastPress >= HELD_GAP_S) {
      const a = m.auto, id = step().id;
      m.lastPress = m.time;
      if (set.angle !== a.angle) {
        set.angle += Math.sign(a.angle - set.angle) * ANGLE_STEP;
        return id === 'word-angle' && set.angle === 45 ? tilted() : null;
      }
      if (set.ms !== a.ms) {
        set.ms += Math.sign(a.ms - set.ms) * SPEED_STEP;
        return id === 'word-speed' && set.ms === SHOW_MS ? turned() : null;
      }
      m.auto = null;
      return go();
    }
    if (m.gap > 0) {
      m.gap -= dt;
      if (m.gap <= 0) { m.gap = 0; launch(m.queue.shift(), set.ms); }
      return null;
    }
    const f = m.flight;
    if (!f) return null;
    f.t += dt * FLY_RATE;
    return f.t >= f.seconds + LAND_HOLD_S * FLY_RATE ? judge() : null;
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') enter(m.index);
    return null;
  }

  // The launcher as the board draws it: the ramp, the dial, the skier in the air, and the trails of this step's launches.
  function rig() {
    const f = m.flight;
    return {angle: set.angle, ms: set.ms, mph: mph(set.ms),
      flight: f ? {angle: f.angle, ms: f.ms, t: Math.max(0, Math.min(f.t, f.seconds)), seconds: f.seconds, distance: f.distance, landed: f.t >= f.seconds} : null,
      trails: m.trails.map(t => ({...t}))};
  }

  function view() {
    const id = step().id;
    const base = {scene: 'launcher', low: 'table', time: m.time, rig: rig(), ramp: null, dial: null, flag: null, rows: m.rows.map(r => ({...r})), job: null, runs: runs.map(r => ({...r})),
      focus: null, keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), asking: false};
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      const arcs = id === 'check-pair' ? [50, ...(answered ? [40, 55, 70] : [])].map(angle => ({angle, ms: SHOW_MS, lower: false, distance: distanceOf(angle, SHOW_MS)}))
        : id === 'check-lower' ? (answered ? [40, 45, 55] : []).map(angle => ({angle, ms: SHOW_MS, lower: true, distance: distanceOf(angle, SHOW_MS, true)})) : null;
      return {...base, scene: id, asking: !answered, answered, rig: null, arcs,
        kicker: id === 'check-game' ? {arcs: answered ? [SLOW_MS, 22].map(ms => ({ms, distance: distanceOf(50, ms)})) : []} : null,
        keys: answered ? {} : ANSWER_KEYS, waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE : check.hints};
    }
    if (id === 'recap') return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS, rig: null,
      say: 'About 45 degrees goes furthest. More speed goes further. A lower landing wants a flatter ramp. On the Aerials run the kicker sets the angle, so speed is yours.',
      prompt: 'Enter finishes the lesson and opens the Aerials run on the mountain.', hints: KEY_IDEAS.map(i => i.text)};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'], focus: 'tape',
        say: done ? `60 degrees went high and slow: ${D(60)}. 30 degrees went low and fast: ${D(30)}. Two very different jumps, nearly the same spot. Is there an angle that goes further than both?`
          : 'My launcher throws a skier at 45 mph. First the ramp at 60 degrees, then at 30. Watch where each one lands.',
        prompt: done ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch the tape.',
        hints: ['Watch where each skier lands on the tape.', 'One goes high, one goes low.', done ? 'Press Enter when you are ready to find out.' : 'Watch, then press Enter.']};
    }
    if (id === 'word-angle') {
      const done = m.phase === 'done';
      return {...base, ramp: {angle: set.angle, locked: done}, focus: 'ramp', low: 'angle', best: goal(),
        ...(done ? {} : {keys: ANGLE_KEYS, repeat: ['↑', '↓'], waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'ramp'}),
        say: done ? m.say : m.auto ? autoSay() : `Launch angle is how far the ramp points up from level ground. It is at ${set.angle} degrees. Tilt it to 45.`,
        prompt: done ? 'Press Enter to go on.' : `${deg(set.angle)}. Press ↓ to tilt it flatter, ↑ steeper, or click the ramp panel.`,
        hints: done ? DONE : ['Watch the angle on the ramp panel.', 'Press ↓ until it reads 45°.', 'Watch my pointer: I tilt it.']};
    }
    if (id === 'word-speed') {
      const done = m.phase === 'done';
      return {...base, ramp: {angle: set.angle, locked: true}, dial: {ms: set.ms, mph: mph(set.ms), locked: done}, focus: 'dial', low: 'speed', best: goal(),
        ...(done ? {} : {keys: SPEED_KEYS, repeat: ['←', '→'], waiting: !m.auto, target: m.auto ? null : 'set:best', glow: 'dial'}),
        say: done ? m.say : m.auto ? autoSay() : `Speed is how fast the skier leaves the ramp. The dial reads ${mph(set.ms)} mph: turn it to 45.`,
        prompt: done ? 'Press Enter to go on.' : `${mph(set.ms)} mph. Press → for faster, ← for slower, or click the dial.`,
        hints: done ? DONE : ['The speed dial is on the right.', 'Press → until it reads 45 mph.', 'Watch my pointer: I turn it.']};
    }
    if (id === 'word-distance') {
      const ready = m.phase === 'ready', done = m.phase === 'done';
      return {...base, ramp: {angle: set.angle, locked: true}, dial: {ms: set.ms, mph: mph(set.ms), locked: true}, focus: 'tape', low: 'tape',
        ...(ready ? {keys: {Space: 'go'}, waiting: true, target: 'go', glow: 'launcher', buttons: [LAUNCH]} : {}),
        say: done ? m.say : 'Distance is how far the skier lands along the ground, read on the tape. 45 degrees, 45 mph: launch.',
        prompt: ready ? 'Press Space to launch, or click the launcher.' : done ? 'Press Enter to go on.' : 'Watch the tape.',
        hints: done ? DONE : ['The tape runs along the floor from the end of the ramp.', 'Press Space.', 'Watch my pointer: I launch.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay', 'slow'], ramp: {angle: set.angle, locked: true}, dial: {ms: set.ms, mph: mph(set.ms), locked: true}, focus: 'tape',
        say: done ? `About 45 goes furthest: ${D(45)}. Steeper climbs high and lands short; flatter comes down soon. Each pair either side of 45 lands close: 30 and 60, 15 and 75.`
          : 'Five launches at 45 mph: 15, 30, 45, 60 and 75 degrees. Watch the tape and the table.',
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the tape.',
        hints: ['Watch the distances in the table.', 'Which angle went furthest?', done ? 'Press R to watch again.' : 'Wait a moment.']};
    }
    // The tries and Brian's job: the ramp panel, the speed dial and the launcher.
    const setNow = setting() && !m.auto, g = goal(), atGoal = set.angle === g.angle && set.ms === g.ms;
    const keys = !setNow ? {} : {...(canAngle() ? ANGLE_KEYS : {}), ...(canSpeed() ? SPEED_KEYS : {}), Space: 'go'};
    const flying = m.phase === 'flying';
    const v = {...base, ramp: {angle: set.angle, locked: !canAngle()}, dial: {ms: set.ms, mph: mph(set.ms), locked: !canSpeed()}, keys, buttons: setNow ? [LAUNCH] : [],
      repeat: setNow ? [...(canAngle() ? ['↑', '↓'] : []), ...(canSpeed() ? ['←', '→'] : [])] : [], target: !setNow ? null : atGoal ? 'go' : 'set:best',
      glow: setNow ? 'set' : null, waiting: setNow || m.phase === 'guess', best: g};
    if (id === 'try-flag') {
      const flagged = {...v, flag: FLAG_M};
      if (m.phase === 'guess') return {...flagged, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: TILT_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'tilt', way: c.way}, state: null})),
        say: `A flag at ${FLAG_M} m. At 45 degrees and 45 mph the skier lands ${D(45)}, past it. The speed stays at 45 mph: which way do you tilt the ramp?`,
        prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: ['45 degrees goes furthest.', 'Does steeper land shorter? Does flatter?', 'Pick a card; any guess goes on.']};
      if (flying) return {...flagged, focus: 'tape', say: m.say, prompt: 'Watch the tape.', hints: ['Watch where it lands against the flag.', 'Compare with the 45 degree row.', 'Wait a moment.']};
      if (m.phase === 'done') return {...flagged, focus: 'tape', mood: TILT_GUESSES[m.guess]?.way === 'either' ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...flagged, say: m.auto ? autoSay() : m.say,
        prompt: `${deg(set.angle)} at 45 mph. ↑ steeper, ↓ flatter, Space to launch.`,
        hints: ['The flag is at 30 m; 45 degrees lands past it.', `Tilt the ramp away from 45, steeper or flatter, then Space. ${set.angle > 45 ? 60 : 30} degrees will do.`, 'Watch my pointer: I tilt it and launch.']};
    }
    if (id === 'try-speed') {
      if (m.phase === 'guess') return {...v, keys: ANSWER_KEYS, buttons: [], target: null, glow: null, waiting: true,
        cards: SLOW_GUESSES.map((c, i) => ({id: `answer:${i}`, key: String(i + 1), label: c.label, picture: {kind: 'tape', at: [distanceOf(45, SHOW_MS), c.at]}, state: null})),
        say: m.say, prompt: 'Pick a card: click it, or press 1, 2 or 3.', hints: [`At 45 mph it landed ${D(45)}.`, 'Slower lands shorter, but how much?', 'Pick a card; any guess goes on.']};
      if (flying) return {...v, focus: 'tape', say: m.say, prompt: 'Watch the tape.', hints: ['Watch where it lands.', 'Compare it with the first row.', 'Wait a moment.']};
      if (m.phase === 'done') return {...v, focus: 'tape', mood: m.guess === 1 ? 'cheer' : 'explain', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
      return {...v, say: m.auto ? autoSay() : m.say || `The ramp at 45 degrees. At 45 mph it landed ${D(45)}. Turn the dial to ${mph(SLOW_MS)} mph, then launch and guess where it lands.`,
        prompt: `${mph(set.ms)} mph. Press ← for slower, → for faster, Space to launch.`,
        hints: ['The speed dial is on the right.', `Press ← until it reads ${mph(SLOW_MS)} mph, then Space.`, 'Watch my pointer: I turn it and launch.']};
    }
    // Brian's job.
    const k = mark();
    const job = {mark: Math.min(m.mark, MARKS.length - 1) + 1, of: MARKS.length, flag: k.flag, fixed: k.fixed, done: m.phase === 'done'};
    const jv = {...v, job, flag: k.flag, low: 'job', focus: flying ? 'tape' : null};
    if (m.phase === 'done') return {...jv, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: DONE};
    if (flying) return {...jv, say: m.say, prompt: 'Watch the tape.', hints: ['Watch where it lands against the flag.', 'Short or past?', 'Wait a moment.']};
    const intro = `Brian’s job: three marks. 1: a flag at ${MARKS[0].flag} m with the ramp fixed at 45 degrees: set the speed.`;
    const what = k.fixed === 'angle' ? 'The ramp is fixed: set the speed.' : k.fixed === 'speed' ? 'The speed is fixed: set the angle.' : 'Everything is yours.';
    return {...jv,
      say: m.auto ? autoSay() : m.mark === 0 && !m.say ? intro : m.say,
      prompt: `Mark ${job.mark}: flag at ${k.flag} m. ${what} ${deg(set.angle)}, ${mph(set.ms)} mph. Space to launch.`,
      hints: k.fixed === 'angle' ? ['More speed lands further.', `At 45 degrees, ${mph(22)} mph lands ${D(45, 22)}. Press → until the dial reads ${mph(22)}, then Space.`, 'Watch my pointer: I turn it and launch.']
        : k.fixed === 'speed' ? ['The flag is nearer than 45 degrees lands: tilt away from 45.', `At ${mph(22)} mph: 20 degrees lands ${D(20, 22)}, 70 degrees ${D(70, 22)}. Pick one, then Space.`, 'Watch my pointer: I tilt it and launch.']
          : ['Start from 45 degrees, the furthest, then find the speed.', `45 degrees at ${mph(SLOW_MS)} mph lands ${D(45, SLOW_MS)}. Set those, then Space.`, 'Watch my pointer: I set it and launch.']};
  }

  return {enter, act, tick, view, state: () => m};
}

// The lesson's own launches, as the bench's challenge reads them: the bench's goal (a landing within 2 m of the 30 m mark)
// passes on these. Several steps land on 30 m (the wonder's 60 degrees, the flag try, mark 3), so a finished lesson has one.
export const benchAttempts = view => (view?.runs ?? []).map(({angle, ms}) => ({controls: [{id: 'angleDeg'}, {id: 'speedMs'}, {id: 'air'}, {id: 'landing'}],
  input: {angleDeg: angle, speedMs: ms, air: 'air', landing: 'level'}}));

// What Brian says when finishing passes the lesson; the classroom stays open on it until the player leaves.
export const PASS_SAY = 'Launch angles passed! The Aerials run is open on the mountain: the kicker sets the angle, so tuck on the inrun for speed.';

export const lesson = Object.freeze({id: 'launch', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS,
  finishLabel: 'Finish the lesson', benchAttempts, passSay: PASS_SAY});
