// Headings and maps as a classroom lesson (docs/board/cards/LAB-CLASSROOM-HEADINGS.md, "Claude's script").
// Teaching state only, no DOM and no saves. A heading is the number on the helicopter's HEADING gauge: D turns
// her right and it counts up, A turns her left and it counts down, and past 359 it comes round to 000. Every
// direction comes from the gauge's own compass, and the job's smoke is the game challenge's (070, 550 m).
import {SMOKE, compassDirection} from '../benches/headings.js';

// One press of A or D; how fast she turns and flies when Brian has the controls (her real turn rate, and a
// cruise she can reach); one map square; how close counts as over the smoke (the challenge's own ring); the map.
export const TURN_STEP = 5, TURN_RATE = 60, CRUISE_MS = 50, SQUARE_M = 100, RING_M = SMOKE.radius, RULER_STEP_M = 50;
export const MAP = Object.freeze({west: -460, east: 720, south: -340, north: 700});
// The ruler stays on its 50 m steps, so → and ← always reach the hut again.
const RULER_MAX_M = Math.floor(MAP.east / RULER_STEP_M) * RULER_STEP_M;
export const JOB = Object.freeze({headingDeg: SMOKE.headingDeg, distanceM: SMOKE.distanceM});
const HUT = Object.freeze({headingDeg: 90, distanceM: 300});
const WATCH = Object.freeze({headingDeg: 120, distanceM: 400});
const WRAP = Object.freeze({headingDeg: 340, distanceM: 450, startDeg: 20});
const SETTLE_S = .8;

export const three = deg => String(Math.round(wrap(deg)) % 360).padStart(3, '0');
export const wrap = deg => ((deg % 360) + 360) % 360;
// How far right (plus) or left (minus) of the wanted heading she points, -180 to 180.
export const offBy = (deg, want) => ((deg - want + 540) % 360) - 180;
const metres = value => `${Math.round(Math.abs(value)).toLocaleString('en-GB')} m`;
// The map: metres from the pad, east to the right and north up, as on any map. The gauge's east is the world's
// -x, so a world offset {x, z} is {x: -x, y: z} here.
export const toMap = ({x, z}) => ({x: -x, y: z});
export const pointAt = (deg, distanceM) => { const d = toMap(compassDirection(deg)); return {x: d.x * distanceM, y: d.y * distanceM}; };
// The closest her straight flight of length d on heading h comes to a point.
function closest(h, d, p) {
  const u = pointAt(h, 1), along = Math.max(0, Math.min(d, p.x * u.x + p.y * u.y));
  return Math.hypot(p.x - u.x * along, p.y - u.y * along);
}

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did she miss?'},
  {id: 'word-heading', part: 1, title: 'Heading', word: 'headings-heading'},
  {id: 'word-compass', part: 1, title: 'North, east, south, west', words: ['headings-north', 'headings-east', 'headings-south', 'headings-west']},
  {id: 'word-scale', part: 1, title: 'Scale', word: 'headings-scale'},
  {id: 'watch', part: 2, title: 'Brian flies a job'},
  {id: 'try-turn', part: 3, title: 'The smoke’s heading'},
  {id: 'try-wrap', part: 3, title: 'The short way round'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-west', part: 5, title: 'Question 1 of 3'},
  {id: 'check-wrap', part: 5, title: 'Question 2 of 3'},
  {id: 'check-scale', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.headings.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'heading', text: 'A heading is the compass number her nose points at: 000 north, 090 east, 180 south, 270 west.'},
  {id: 'turn', text: 'D turns right: the number counts up. A turns left: it counts down. After 359 comes 000.'},
  {id: 'scale', text: 'A map’s scale turns squares into metres: here one square is 100 m.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: `Turn until the gauge reads ${three(JOB.headingDeg)}.`,
  text: `D turns right and counts up, A turns left and counts down; then fly on to the smoke, ${metres(JOB.distanceM)}.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'headings-heading', word: 'Heading', meaning: 'A heading is the compass direction her nose points, in degrees round from north.'},
  {id: 'headings-north', word: 'North', meaning: 'North is heading 000, the top of the map.'},
  {id: 'headings-east', word: 'East', meaning: 'East is heading 090, a quarter turn right from north.'},
  {id: 'headings-south', word: 'South', meaning: 'South is heading 180, half way round.'},
  {id: 'headings-west', word: 'West', meaning: 'West is heading 270, three quarters of the way round.'},
  {id: 'headings-scale', word: 'Scale', meaning: `A map’s scale says how far one square is on the ground: ${SQUARE_M} m here.`},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons) ----
const TURN_KEYS = Object.freeze({A: 'turn:left', D: 'turn:right'});
const RULER_KEYS = Object.freeze({'←': 'ruler:shorter', '→': 'ruler:longer'});
const PICK_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const TURN_BUTTONS = Object.freeze([{action: 'turn:left', label: 'Turn left', key: 'A'}, {action: 'turn:right', label: 'Turn right', key: 'D'}]);
const DONE_HINTS = Object.freeze(['Press R to watch it again.', 'Press Enter to go on.', 'Press Enter to go on.']);
const turning = (space, target = 'turn:best') => ({keys: {...TURN_KEYS, ...(space ? {Space: space.action} : {})}, repeat: ['A', 'D'],
  buttons: [...TURN_BUTTONS, ...(space ? [space] : [])], waiting: true, target, glow: 'compass', dragCompass: true});
// Which way and how far to turn, in the words Brian uses.
function turnSay(deg, want) {
  const off = offBy(deg, want);
  return `She reads ${three(deg)}: ${Math.abs(off)} degrees too far ${off > 0 ? 'right. A turns her back left: the number goes down' : 'left. D turns her right: the number goes up'}.`;
}

// ---- the checks ----
const CHECKS = {
  'check-west': {
    question: 'Which heading is west?',
    answers: [{label: '090', deg: 90}, {label: '180', deg: 180}, {label: '270', deg: 270}].map(a => ({...a, picture: {kind: 'heading', deg: a.deg}})),
    correct: 2, demo: {from: 0, to: 270, way: 'left'},
    right: () => 'Yes. West is 270: three quarters of the way round from north.',
    wrong: picked => `${['090 is east', '180 is south'][picked]}. West is 270: three quarters of the way round from north, or a quarter turn left.`,
    hints: ['North is 000 and the numbers count up as she turns right.', 'East is 090, south 180. Keep going round.', 'Pick 270.'],
  },
  'check-wrap': {
    question: 'She reads 350 and the smoke is at 010. Which way is shorter?',
    answers: [{label: 'D: right, 20°', way: 'right'}, {label: 'A: left, 340°', way: 'left'}, {label: 'Either: the same', way: 'same'}].map(a => ({...a, picture: {kind: 'wrap', way: a.way}})),
    correct: 0, demo: {from: 350, to: 10, way: 'right'},
    right: () => 'Yes. Past 359 the number comes round to 000: D turns her 20 degrees to 010.',
    wrong: picked => picked === 1 ? 'A works, but it is the long way, 340 degrees. Past 359 the number comes round to 000, so D turns her 20 degrees to 010.'
      : 'Not the same: past 359 the number comes round to 000, so D is 20 degrees and A is 340.',
    hints: ['What comes after 359?', 'Turning right, 350 goes 355, 000, 005, 010.', 'Pick “D: right, 20°”.'],
  },
  'check-scale': {
    question: `One square is ${SQUARE_M} m. The smoke is five and a half squares away. How far is it?`,
    answers: [{label: '55 m', m: 55}, {label: '550 m', m: 550}, {label: '5,500 m', m: 5500}].map(a => ({...a, picture: {kind: 'squares', m: a.m}})),
    correct: 1, demo: {ruler: JOB.distanceM},
    right: () => `Yes. Each square is ${SQUARE_M} m, so five and a half squares is 550 m.`,
    wrong: () => `Each square is ${SQUARE_M} m: five squares is 500 m, and half a square 50 m more, so it is 550 m.`,
    hints: [`One square stands for ${SQUARE_M} m on the ground.`, 'Five squares is 500 m. Add half a square.', 'Pick 550 m.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];
  const goal = () => ({'word-compass': HUT, 'word-scale': HUT, watch: WATCH, 'try-turn': JOB, 'try-wrap': WRAP, alone: JOB})[step().id] ?? null;

  // She sits on the pad at (0, 0) map metres, pointing her heading. A flight is straight on her heading.
  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', heading: 0, x: 0, y: 0, flown: 0, track: [], ghosts: [], ruler: null, target: null, auto: null,
      say: '', autoSay: '', answered: null, firstLeft: false, turned: 0, rightRun: 0, result: null, lastAt: null, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.target = smoke(); m.auto = {turnTo: null, fly: JOB.distanceM, at: .6}; m.phase = 'auto'; }
    if (id === 'word-heading') m.phase = 'turn';
    if (id === 'word-compass') { m.phase = 'turn'; m.target = {...pointAt(HUT.headingDeg, HUT.distanceM), kind: 'lake', label: 'The lake'}; }
    if (id === 'word-scale') { m.heading = 90; m.ruler = 100; m.phase = 'ruler'; m.target = {...pointAt(HUT.headingDeg, HUT.distanceM), kind: 'hut', label: 'The hut'}; }
    if (id === 'watch') { m.target = {...pointAt(WATCH.headingDeg, WATCH.distanceM), kind: 'hut', label: 'The hut'}; m.auto = {turnTo: WATCH.headingDeg, fly: WATCH.distanceM, at: .6}; m.phase = 'auto'; }
    if (id === 'try-turn') { m.phase = m.result ? 'result' : 'turn'; m.target = smoke(); }
    if (id === 'try-wrap') { m.heading = m.result ? m.heading : WRAP.startDeg; m.phase = m.result ? 'result' : 'turn'; m.target = {...pointAt(WRAP.headingDeg, WRAP.distanceM), kind: 'smoke', label: 'Smoke'}; }
    if (id === 'alone') { m.phase = 'turn'; m.target = smoke(); }
    if (CHECKS[id]) { m.phase = m.answered === null ? 'ask' : 'answered'; m.target = id === 'check-scale' ? smoke() : null; m.heading = CHECKS[id].demo.from ?? 0; }
  }
  const smoke = () => ({...pointAt(JOB.headingDeg, JOB.distanceM), kind: 'smoke', label: 'Smoke'});
  // Back on the pad, keeping her heading, with the last flight left on the map as a faint track.
  function home() { if (m.track.length > 1) m.ghosts = [...m.ghosts.slice(-2), m.track]; m.x = 0; m.y = 0; m.flown = 0; m.track = []; }
  // turned adds up the whole turn (the long way round is over 180); rightRun is the turn right since A was last pressed.
  function turn(by) { m.heading = wrap(m.heading + by); m.turned += by; m.rightRun = by > 0 ? m.rightRun + by : by < 0 ? 0 : m.rightRun; }

  function act(action) {
    const id = step().id, [kind, value] = action.split(':');
    if (kind === 'replay') return replay();
    if (kind === 'release') return null;
    if (CHECKS[id]) {
      if (kind !== 'answer' || m.phase !== 'ask') return null;
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      demo(check.demo);
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    if (m.phase === 'ruler') return rulerAct(kind, value);
    if (m.phase === 'turn' || (m.phase === 'result' && (id === 'try-turn' || id === 'try-wrap'))) {
      if (kind === 'turn' || kind === 'hold') {
        if (m.phase === 'result') { m.phase = 'turn'; home(); }
        if (kind === 'turn' && value === 'best') return showTurn(id);
        if (kind === 'hold') { const at = Math.round(Number(value) / TURN_STEP) * TURN_STEP; if (Number.isFinite(at)) turn(offBy(at, m.heading)); }
        else turn(value === 'left' ? -TURN_STEP : TURN_STEP);
        return afterTurn(id, value);
      }
      if (kind === 'fly' && m.phase === 'turn') return fly(id, value === 'best');
      if (kind === 'fly' && m.phase === 'result') { m.phase = 'turn'; home(); return fly(id, false); }
      return null;
    }
    if (m.phase === 'flying' && kind === 'fly' && id === 'alone' && m.auto?.brian !== true) return stop();
    if (m.phase === 'missed' && kind === 'fly') { home(); m.phase = 'turn'; return value === 'best' ? fly(id, true) : fly(id, false); }
    if (m.phase === 'missed' && (kind === 'turn' || kind === 'hold')) { home(); m.phase = 'turn'; return act(action); }
    return null;
  }
  const goalHeading = () => step().id === 'word-heading' ? wrap(m.heading + 45) : goal()?.headingDeg ?? null;
  // Show me: Brian turns her (right, on Heading; the short way on the try from where it starts) and flies it.
  function showTurn(id) {
    if (id === 'word-heading') { m.auto = {turnTo: goalHeading(), way: 'right', fly: null, at: 0}; m.autoSay = 'Watch: I turn her right with D. The number goes up.'; }
    else {
      if (id === 'try-wrap') { m.heading = WRAP.startDeg; m.turned = 0; }
      m.auto = {turnTo: goal().headingDeg, way: id === 'try-wrap' ? 'left' : null, fly: null, at: 0, then: 'fly'};
      m.autoSay = `Watch: I turn her to ${three(goal().headingDeg)}.`;
    }
    m.phase = 'auto-turn';
    return {kind: 'progress', say: m.autoSay};
  }

  function afterTurn(id, value) {
    if (id === 'word-heading') {
      if (m.rightRun >= 30) {
        m.phase = 'result'; seen.add(id);
        m.say = `She reads ${three(m.heading)}: the number went up as she turned right. A turns her left, and it goes down.`;
        return {kind: 'right', say: m.say};
      }
      if (value === 'left' && !m.firstLeft) { m.firstLeft = true; return {kind: 'progress', say: 'The number went down: A turns her left. Now try D.'}; }
    }
    return null;
  }

  // Space: she flies on her heading. In the tries she flies the set distance; on the job she flies until Space again.
  function fly(id, brian) {
    if (id === 'word-heading') return null;
    if (id === 'word-compass') {
      const off = offBy(m.heading, HUT.headingDeg);
      if (Math.abs(off) < TURN_STEP) { m.phase = 'result'; seen.add(id); m.say = 'Right: 090 is east, towards the lake. Keep turning right and 180 is south, 270 west, and 360 is north again: 000.'; return {kind: 'right', say: m.say}; }
      return {kind: 'fail', say: `${turnSay(m.heading, HUT.headingDeg)} East is 090.`};
    }
    if (brian) { m.auto = {turnTo: goal().headingDeg, fly: goal().distanceM, at: 0, brian: true}; m.phase = 'auto'; return {kind: 'progress', say: `Watch: ${three(goal().headingDeg)}, then I stop at ${metres(goal().distanceM)}.`}; }
    if (id === 'alone') { m.phase = 'flying'; m.auto = {turnTo: null, fly: Infinity, at: 0}; return {kind: 'progress', say: `Press Space when the FLOWN number reads ${metres(JOB.distanceM)}.`}; }
    m.phase = 'auto'; m.auto = {turnTo: null, fly: goal().distanceM, at: 0, judge: true};
    return {kind: 'progress', say: `${three(m.heading)} for ${metres(goal().distanceM)}. Watch where she goes.`};
  }
  function stop() { m.auto = null; return judgeJob(); }

  function rulerAct(kind, value) {
    if (kind === 'ruler' && value === 'best') { m.auto = {ruler: HUT.distanceM, at: 0}; m.phase = 'auto-ruler'; m.autoSay = 'Watch: I stretch it to the hut.'; return {kind: 'progress', say: m.autoSay}; }
    if (kind === 'ruler') { m.ruler = Math.max(RULER_STEP_M, Math.min(RULER_MAX_M, m.ruler + (value === 'shorter' ? -RULER_STEP_M : RULER_STEP_M))); return null; }
    if (kind === 'hold') { const at = Math.round(Number(value) / RULER_STEP_M) * RULER_STEP_M; if (Number.isFinite(at)) m.ruler = Math.max(RULER_STEP_M, Math.min(RULER_MAX_M, at)); return null; }
    if (kind === 'fly') return judgeRuler();
    return null;
  }
  function judgeRuler() {
    const squares = m.ruler / SQUARE_M;
    if (m.ruler === HUT.distanceM) { m.phase = 'result'; seen.add('word-scale'); m.say = `Right: three squares, and each square is ${SQUARE_M} m, so the hut is 300 m away.`; return {kind: 'right', say: m.say}; }
    return {kind: 'fail', say: `That is ${metres(m.ruler)}: ${squareWords(squares)}. The hut is 3 squares away: 300 m.`};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id, a = m.auto;
    if (!a) return null;
    if (m.time < a.at) return null;
    if (a.ruler != null) {
      // Brian stretches the ruler at 300 m a second.
      const left = a.ruler - m.ruler;
      m.ruler += Math.sign(left) * Math.min(Math.abs(left), 300 * dt);
      if (m.ruler !== a.ruler) return null;
      m.auto = null;
      if (a.demo) return null;
      m.phase = 'ruler';
      return judgeRuler();
    }
    if (a.turnTo != null) {
      // She turns the short way round at her real rate, unless told which way.
      const off = offBy(a.turnTo, m.heading), dir = a.way === 'right' ? 1 : a.way === 'left' ? -1 : Math.sign(off) || 1;
      const left = dir > 0 ? wrap(a.turnTo - m.heading) : wrap(m.heading - a.turnTo);
      turn(dir * Math.min(left, TURN_RATE * dt));
      if (Math.abs(offBy(a.turnTo, m.heading)) > 1e-6) return null;
      m.heading = wrap(a.turnTo); a.turnTo = null;
      if (m.phase === 'auto-turn') {
        m.auto = null; m.phase = 'turn';
        if (id === 'word-heading') return afterTurn(id, 'right');
        if (a.then === 'fly') return fly(id, false);
        return null;
      }
      if (a.fly == null) { m.auto = null; return null; }
    }
    if (a.fly != null) {
      if (!m.track.length) m.track.push({x: 0, y: 0});
      const go = Math.min(CRUISE_MS * dt, a.fly - m.flown), u = pointAt(m.heading, 1);
      m.flown += go; m.x += u.x * go; m.y += u.y * go;
      m.track.push({x: m.x, y: m.y});
      // A practice flight ends at the map's edge and is judged there; the job's brings her back to the pad.
      if (a.judge && offMap()) { m.auto = null; return judgeTry(id); }
      if (id === 'alone' && m.phase === 'flying' && offMap()) { m.auto = null; m.phase = 'missed'; home(); return {kind: 'fail', say: `She flew off the map after ${metres(m.ghosts.at(-1) ? lengthOf(m.ghosts.at(-1)) : 0)}. She is back on the pad: press Space to fly again, and stop at ${metres(JOB.distanceM)}.`}; }
      if (m.flown < a.fly - 1e-9) return null;
      m.auto = null;
      if (a.brian) return judgeJob();
      if (a.judge) return judgeTry(id);
      m.phase = 'done'; m.lastAt = m.time; seen.add(id);
      return null;
    }
    return null;
  }
  const offMap = () => m.x < MAP.west || m.x > MAP.east || m.y < MAP.south || m.y > MAP.north;
  const lengthOf = track => Math.hypot(track.at(-1).x - track[0].x, track.at(-1).y - track[0].y);

  // A try: she flew the set distance on her heading; over the smoke if she was on its heading.
  function judgeTry(id) {
    const want = goal(), off = offBy(m.heading, want.headingDeg), gap = closest(m.heading, want.distanceM, m.target);
    m.phase = 'result';
    const longWay = id === 'try-wrap' && Math.abs(m.turned) > 180;
    seen.add(id);
    m.result = {right: Math.abs(off) < TURN_STEP};
    if (m.result.right) {
      m.say = longWay ? `That worked, but A was the short way: 40 degrees instead of ${Math.round(Math.abs(m.turned))}. Past 000 the number comes round to 355, then 340.`
        : id === 'try-wrap' ? 'Right: A turned her left past 000, round to 355 and on to 340. Only 40 degrees.'
        : `Right over the smoke! ${three(want.headingDeg)} is its heading, and ${metres(want.distanceM)} took her there.`;
      return {kind: 'right', say: m.say};
    }
    m.say = `You flew heading ${three(m.heading)}: ${Math.abs(off)} degrees too far ${off > 0 ? 'right' : 'left'}, and passed ${metres(gap)} from the smoke. ${off > 0 ? 'A turns her back left: the number goes down' : 'D turns her right: the number goes up'}. Press Space to fly it again.`;
    return {kind: 'wrong', say: m.say};
  }

  // Brian's job: she stopped over the smoke, or Brian says what to change, with the numbers.
  function judgeJob() {
    const gap = Math.hypot(m.x - m.target.x, m.y - m.target.y), off = offBy(m.heading, JOB.headingDeg), flown = m.flown;
    if (gap <= RING_M) { m.phase = 'done'; seen.add('alone'); m.say = `Over the smoke! ${three(m.heading)} for ${metres(flown)}: heading and distance found it. Job done.`; return {kind: 'pass', say: m.say}; }
    m.phase = 'missed'; home();
    if (Math.abs(off) >= TURN_STEP) m.say = `You flew heading ${three(m.heading)}: ${Math.abs(off)} degrees too far ${off > 0 ? 'right' : 'left'}, and stopped ${metres(gap)} from the smoke. Turn her to ${three(JOB.headingDeg)} (${off > 0 ? 'A' : 'D'}), then Space to fly.`;
    else if (flown < JOB.distanceM) m.say = `Right heading, but you stopped after ${metres(flown)}, ${metres(JOB.distanceM - flown)} short. Watch the FLOWN number and stop at ${metres(JOB.distanceM)}. Space to fly again.`;
    else m.say = `Right heading, but you stopped after ${metres(flown)}, ${metres(flown - JOB.distanceM)} past it. Stop when the FLOWN number reads ${metres(JOB.distanceM)}. Space to fly again.`;
    return {kind: 'fail', say: m.say};
  }

  function demo(d) {
    if (d.ruler != null) { m.heading = JOB.headingDeg; m.ruler = 0; m.auto = {ruler: d.ruler, at: .3, demo: true}; m.phase = 'answered'; return; }
    m.heading = d.from; m.auto = {turnTo: d.to, way: d.way, fly: null, at: .4};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') { enter(m.index); return null; }
    if (CHECKS[id] && m.phase === 'answered') { const answered = m.answered; enter(m.index, {answered}); demo(CHECKS[id].demo); return null; }
    return null;
  }

  function view() {
    const id = step().id;
    const base = {scene: 'map', time: m.time, heli: {x: m.x, y: m.y, heading: m.heading}, flown: m.phase === 'flying' || m.flown > 0 ? m.flown : null, track: m.track, ghosts: m.ghosts,
      spot: m.target, ruler: m.ruler == null ? null : {heading: m.heading, length: m.ruler}, compass: true, gauge: three(m.heading),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], glow: null, waiting: false, ready: seen.has(id), dragCompass: false, dragRuler: false,
      aim: m.phase === 'turn' ? goalHeading() : null};
    // Brian has the controls (Show me): no keys, and he says what he is doing.
    if (m.phase === 'auto-turn' || m.phase === 'auto-ruler') return {...base, rose: id === 'word-compass', ...(id === 'word-scale' ? {squares: true, compass: false} : {}),
      say: m.autoSay, prompt: 'Watch Brian.', hints: ['Watch Brian.', 'Watch the gauge.', 'Wait a moment.']};
    if (id === 'wonder') return {...base, actions: ['replay'],
      say: `The radio says: smoke at heading ${three(JOB.headingDeg)}, ${metres(JOB.distanceM)} from the pad. She flew north, 000, and missed it. Which way is ${three(JOB.headingDeg)}?`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out, or R to watch again.' : 'Watch Kestrel One.',
      hints: ['Watch which way her nose points, and the number on the gauge.', 'She flew straight up the map, north, and the smoke is off to her right.', seen.has(id) ? 'Press Enter when you are ready to find out.' : 'Watch until she stops, then press Enter.']};
    if (id === 'word-heading') {
      const done = m.phase === 'result';
      return {...base, ...(done ? {actions: []} : turning(null)),
        say: done ? m.say || 'The number went up as she turned right.' : 'A heading is the way her nose points, in degrees round from north: 000 is straight up the map. D turns her right. Watch the gauge.',
        prompt: done ? 'Press Enter to go on.' : 'Press D a few times (or hold it), and watch the HEADING gauge count up.',
        hints: done ? DONE_HINTS.slice(1).concat('Press Enter to go on.') : ['The number on the right is her heading.', 'Press D: she turns right and the number goes up. Keep going past 030.', 'Watch my pointer: I turn her right.']};
    }
    if (id === 'word-compass') {
      const done = m.phase === 'result';
      return {...base, ...(done ? {} : turning({action: 'fly', label: 'That’s east', key: 'Space'})), rose: true,
        say: done ? m.say : 'North is 000, east 090, south 180 and west 270. A whole turn is 360, back to north. Turn her to face east, towards the lake.',
        prompt: done ? 'Press Enter to go on.' : 'Turn her with A and D until the gauge reads 090, then press Space.',
        hints: done ? ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.'] : ['East is a quarter turn right from north.', 'Turn with D until the gauge reads 090, then press Space.', 'Watch my pointer: I turn her to 090.']};
    }
    if (id === 'word-scale') {
      const done = m.phase === 'result';
      return {...base, ...(done || m.phase === 'auto-ruler' ? {} : {keys: {...RULER_KEYS, Space: 'fly'}, repeat: ['←', '→'], waiting: true, target: 'ruler:best', glow: 'ruler', dragRuler: true,
        buttons: [{action: 'ruler:shorter', label: 'Shorter', key: '←'}, {action: 'ruler:longer', label: 'Longer', key: '→'}, {action: 'fly', label: 'That’s the hut', key: 'Space'}]}),
        squares: true, compass: false, say: done ? m.say : `A map’s scale says how far one square is on the ground. Here one square is ${SQUARE_M} m. Stretch the ruler to the hut.`,
        prompt: done ? 'Press Enter to go on.' : 'Make the ruler longer with → (or drag its end) until it reaches the hut, then press Space.',
        hints: done ? ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.'] : ['Count the squares from the pad to the hut.', 'Three squares: press → until the ruler reads 300 m, then Space.', 'Watch my pointer: I stretch it to the hut.']};
    }
    if (id === 'watch') {
      const done = seen.has(id);
      return {...base, actions: ['replay', 'slow'],
        say: done ? `She turned right from 000 to ${three(WATCH.headingDeg)}, then flew ${metres(WATCH.distanceM)}: four squares. A heading and a distance.` : `A job for me: the hut at ${three(WATCH.headingDeg)}, ${metres(WATCH.distanceM)}. Watch the gauge as I turn her, then the FLOWN number as she goes.`,
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the gauge, then the FLOWN number.',
        hints: ['Watch the HEADING gauge count up as she turns right.', 'Then watch the FLOWN number count the metres.', 'Press R to watch again.']};
    }
    if (id === 'try-turn' || id === 'try-wrap') {
      const want = goal(), wrapStep = id === 'try-wrap';
      if (m.phase === 'turn') return {...base, ...turning({action: 'fly', label: 'Fly', key: 'Space'}),
        say: wrapStep ? `Smoke at ${three(want.headingDeg)}, ${metres(want.distanceM)}. She faces ${three(WRAP.startDeg)}. Which way round is shorter?` : `Your turn. Turn her to ${three(want.headingDeg)}, the smoke’s heading. Space flies her ${metres(want.distanceM)}.`,
        prompt: `Turn her with A and D until the gauge reads ${three(want.headingDeg)}, then press Space.`,
        hints: wrapStep ? ['Turning left, A, the number goes down: 020, 015, 010...', 'Below 000 comes 355. Keep pressing A to 340, then Space.', `Watch my pointer: I turn her to ${three(want.headingDeg)}.`]
          : [`The smoke is at ${three(want.headingDeg)}: a little less than a quarter turn right.`, `Press D until the gauge reads ${three(want.headingDeg)}, then Space.`, `Watch my pointer: I turn her to ${three(want.headingDeg)}.`]};
      if (m.phase === 'result') return {...base, ...turning({action: 'fly', label: 'Fly again', key: 'Space'}), waiting: false, target: null, mood: m.result?.right ? 'cheer' : 'explain', say: m.say,
        prompt: m.result?.right ? 'Press Enter to go on.' : 'Press Enter to go on, or turn her and press Space to fly again.', hints: ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']};
      return {...base, say: `${three(m.heading)} for ${metres(want.distanceM)}. Watch where she goes.`, prompt: 'Watch Kestrel One.', hints: ['Watch where she goes.', 'Watch the smoke.', 'Wait a moment.']};
    }
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, compass: id !== 'check-scale', squares: id === 'check-scale', keys: answered ? {} : PICK_KEYS, actions: answered ? ['replay'] : [], waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on, or R to watch again.' : 'Pick a card: click it, or press 1, 2 or 3.', hints: answered ? DONE_HINTS : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'A heading is the compass direction you point: 000 north, 090 east, 180 south, 270 west. A map’s scale says how many real metres a square stands for.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function jobView(base) {
    const hints = [`The smoke is at ${three(JOB.headingDeg)}, ${metres(JOB.distanceM)} away.`, `Turn her until the gauge reads ${three(JOB.headingDeg)}, press Space to fly, and Space again when the FLOWN number reads ${metres(JOB.distanceM)}.`,
      'Watch my pointer: I will turn her and fly it.'];
    const say = `The real one: smoke at ${three(JOB.headingDeg)}, ${metres(JOB.distanceM)}, and no arrow. Turn her, press Space to fly, and Space again to stop over the smoke.`;
    if (m.phase === 'turn') return {...base, ...turning({action: 'fly', label: 'Fly', key: 'Space'}, 'fly:best'), say, prompt: `Turn her to ${three(JOB.headingDeg)} with A and D, then press Space to fly.`, hints};
    if (m.phase === 'auto-turn' || (m.phase === 'auto' && m.auto?.brian)) return {...base, say: m.phase === 'auto' ? `Watch: ${three(JOB.headingDeg)}, then I stop at ${metres(JOB.distanceM)}.` : `Watch: I turn her to ${three(JOB.headingDeg)}.`,
      prompt: 'Watch Brian fly it.', hints: ['Watch the gauge.', 'Then watch the FLOWN number.', 'Watch where I stop.']};
    if (m.phase === 'flying') return {...base, keys: {Space: 'fly'}, buttons: [{action: 'fly', label: 'Stop', key: 'Space'}], waiting: true, target: null, say: `Stop when the FLOWN number reads ${metres(JOB.distanceM)}.`, prompt: 'Press Space to stop over the smoke.',
      hints: [hints[0], 'Watch the FLOWN number on the right.', `Press Space when the FLOWN number reads ${metres(JOB.distanceM)}.`]};
    if (m.phase === 'missed') return {...base, ...turning({action: 'fly', label: 'Fly', key: 'Space'}, 'fly:best'), say: m.say, mood: 'explain', prompt: 'Turn her if you need to, then press Space to fly again.', hints};
    return {...base, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']};
  }

  return {enter, act, tick, view, state: () => m};
}

function squareWords(squares) {
  const whole = Math.floor(squares), half = squares - whole >= .5;
  if (whole === 0) return 'half a square';
  const n = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][whole] ?? String(whole);
  return `${n}${half ? ' and a half' : ''} square${whole === 1 && !half ? '' : 's'}`;
}

export const lesson = Object.freeze({id: 'headings', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
