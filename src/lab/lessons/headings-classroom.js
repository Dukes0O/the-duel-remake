// Headings and maps as a classroom lesson (docs/board/cards/LAB-CLASSROOM-HEADINGS.md, "Claude's script"; its wording
// and formulas follow LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. A heading is the number on
// the helicopter's HEADING gauge: turning the helicopter right makes the number count up, turning it left makes the number
// count down, and past 359 the number comes round to 000. Every direction comes from the gauge's own compass, and the
// job's smoke is the game challenge's (070, 550 m).
import {SMOKE, compassBearing, compassDirection} from '../benches/headings.js';
import {MORE} from '../classroom/brian-text.js';

// One press of A or D; how fast the helicopter turns and flies when Brian has the controls (its real turn rate, and a
// cruise it can reach); one map box; how close counts as over the smoke (the challenge's own ring); the map.
export const TURN_STEP = 5, TURN_RATE = 60, CRUISE_MS = 50, BOX_M = 100, RING_M = SMOKE.radius, RULER_STEP_M = 50;
export const MAP = Object.freeze({west: -460, east: 720, south: -340, north: 700});
export const FREE_TRIES = 3;
// The ruler stays on its 50 m steps, so a longer or shorter press always reaches the hut again.
const RULER_MAX_M = Math.floor(MAP.east / RULER_STEP_M) * RULER_STEP_M;
// The free test's flight lengths: the shortest and the longest stay on the map on every heading.
export const FREE_MIN_M = 100, FREE_MAX_M = 300;
export const JOB = Object.freeze({headingDeg: SMOKE.headingDeg, distanceM: SMOKE.distanceM});
const HUT = Object.freeze({headingDeg: 90, distanceM: 300});
const WATCH = Object.freeze({headingDeg: 120, distanceM: 400});
const WRAP = Object.freeze({headingDeg: 340, distanceM: 450, startDeg: 20});
const SUM_HUT = Object.freeze({east: 300, north: 300});
const HELD_GAP_S = .14;
// The two steps with a marker: where the marker starts, where the step asks for it, and how far it may go.
const MARKERS = Object.freeze({
  'word-sums': Object.freeze({start: {east: 100, north: 100}, goal: {east: 300, north: 400}, min: {east: 0, north: 100}, max: {east: 600, north: 600}}),
  'word-distance': Object.freeze({start: {east: 300, north: 400}, goal: {east: 400, north: 300}, min: {east: 0, north: 100}, max: {east: 600, north: 600}}),
  'word-quarters': Object.freeze({start: {east: 300, north: 400}, goal: {east: 300, north: -200}, min: {east: -400, north: -300}, max: {east: 700, north: 700}}),
});
// What Show me tries on the free test: each press takes the first setting not yet tested.
const FREE_SHOW = Object.freeze([[45, 300], [135, 200], [225, 300], [315, 250], [90, 100], [180, 150]].map(([headingDeg, distanceM]) => Object.freeze({headingDeg, distanceM})));

export const three = deg => String(Math.round(wrap(deg)) % 360).padStart(3, '0');
export const wrap = deg => ((deg % 360) + 360) % 360;
// How far right (plus) or left (minus) of the wanted heading the helicopter points, -180 to 180.
export const offBy = (deg, want) => ((deg - want + 540) % 360) - 180;
const metres = value => `${Math.round(Math.abs(value)).toLocaleString('en-GB')} m`;
// The map: metres from the pad, east to the right and north up, as on any map. The gauge's east is the world's
// -x, so a world offset {x, z} is {x: -x, y: z} here.
export const toMap = ({x, z}) => ({x: -x, y: z});
export const pointAt = (deg, distanceM) => { const d = toMap(compassDirection(deg)); return {x: d.x * distanceM, y: d.y * distanceM}; };
// The gauge's own heading to a place on the map.
export const headingTo = (east, north) => compassBearing(-east, north);
// The closest a straight flight of length d on heading h comes to a point.
function closest(h, d, p) {
  const u = pointAt(h, 1), along = Math.max(0, Math.min(d, p.x * u.x + p.y * u.y));
  return Math.hypot(p.x - u.x * along, p.y - u.y * along);
}
// A position in words: "282 m east and 103 m north".
const place = (east, north) => `${metres(east)} ${Math.round(east) < 0 ? 'west' : 'east'} and ${metres(north)} ${Math.round(north) < 0 ? 'south' : 'north'}`;
const minus = value => String(value).replace('-', '−');
// A decimal for the panel, never showing a minus sign on a zero (cos 270° is a tiny negative number).
const fixed = (value, places) => minus(Number(value.toFixed(places)) === 0 ? (0).toFixed(places) : value.toFixed(places));

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did the helicopter miss?'},
  {id: 'word-heading', part: 1, title: 'Heading', word: 'headings-heading'},
  {id: 'word-compass', part: 1, title: 'North, east, south, west', words: ['headings-north', 'headings-east', 'headings-south', 'headings-west']},
  {id: 'word-scale', part: 1, title: 'Scale', word: 'headings-scale'},
  {id: 'word-sums', part: 1, title: 'Finding a heading from a map'},
  {id: 'word-distance', part: 1, title: 'The length of the straight line'},
  {id: 'word-quarters', part: 1, title: 'South and west of the pad'},
  {id: 'watch', part: 2, title: 'Brian flies a job'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-turn', part: 3, title: 'The heading of the smoke'},
  {id: 'try-wrap', part: 3, title: 'The short way round'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-west', part: 5, title: 'Question 1 of 4'},
  {id: 'check-wrap', part: 5, title: 'Question 2 of 4'},
  {id: 'check-sum', part: 5, title: 'Question 3 of 4'},
  {id: 'check-scale', part: 5, title: 'Question 4 of 4'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.headings.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'heading', text: 'A heading is a direction measured clockwise from north, in degrees. North is heading 000, east is 090, south is 180 and west is 270.'},
  {id: 'turn', text: 'Turning the helicopter to the right makes the number count up, and turning it to the left makes the number count down. After 359 the number comes round to 000.'},
  {id: 'scale', text: `A map’s scale turns boxes into metres, and here one box is ${BOX_M} m. With the distances east and north, the rule atan(east ÷ north) gives the heading and the rule of Pythagoras gives the distance.`},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: `Turn until the gauge reads ${three(JOB.headingDeg)}.`,
  text: `D turns the helicopter to the right and the number counts up, and A turns it to the left and the number counts down. Then fly on to the smoke, which is ${metres(JOB.distanceM)} from the pad.`});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'headings-heading', word: 'Heading', meaning: 'The direction in which the helicopter is pointing, measured clockwise from north, in degrees.'},
  {id: 'headings-north', word: 'North', meaning: 'Heading 000, the direction towards the top of the map.'},
  {id: 'headings-east', word: 'East', meaning: 'Heading 090, a quarter turn clockwise from north.'},
  {id: 'headings-south', word: 'South', meaning: 'Heading 180, half of a full turn from north.'},
  {id: 'headings-west', word: 'West', meaning: 'Heading 270, three quarter turns clockwise from north.'},
  {id: 'headings-scale', word: 'Scale', meaning: `What one box of a map stands for on the ground, which is ${BOX_M} m on this map.`},
].map(Object.freeze));

// ---- keys (the screen shows them on its buttons) ----
const TURN_KEYS = Object.freeze({A: 'turn:left', D: 'turn:right'});
const RULER_KEYS = Object.freeze({'←': 'ruler:shorter', '→': 'ruler:longer'});
const LENGTH_KEYS = Object.freeze({'←': 'length:shorter', '→': 'length:longer'});
const MARKER_KEYS = Object.freeze({'←': 'marker:west', '→': 'marker:east', '↑': 'marker:north', '↓': 'marker:south'});
const PICK_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const TURN_BUTTONS = Object.freeze([{action: 'turn:left', label: 'Turn left', key: 'A'}, {action: 'turn:right', label: 'Turn right', key: 'D'}]);
const RULER_BUTTONS = Object.freeze([{action: 'ruler:shorter', label: 'Shorter', key: '←'}, {action: 'ruler:longer', label: 'Longer', key: '→'}]);
const MARKER_BUTTONS = Object.freeze([{action: 'marker:west', label: 'West', key: '←'}, {action: 'marker:east', label: 'East', key: '→'}, {action: 'marker:north', label: 'North', key: '↑'}, {action: 'marker:south', label: 'South', key: '↓'}]);
const CONTINUE = 'Continue when you are ready.';
const DONE_HINTS = Object.freeze([CONTINUE, CONTINUE, CONTINUE]);
const REPLAY_HINTS = Object.freeze(['Watch again to see it once more.', CONTINUE, CONTINUE]);
const turning = (space, target = 'turn:best') => ({keys: {...TURN_KEYS, ...(space ? {Space: space.action} : {})}, repeat: ['A', 'D'],
  buttons: [...TURN_BUTTONS, ...(space ? [space] : [])], waiting: true, target, glow: 'compass', dragCompass: true});
// A word step stays open after its answer: the keys still turn the helicopter, and nothing is asked.
const stillTurning = () => ({...turning(null), waiting: false, target: null, glow: null});
// Which way to turn and until when, right from wherever the gauge reads now. The screen shows the keys.
// The prompt: it never asks for a turn that is already done.
const turnPrompt = (deg, want, then = 'fly') => offBy(deg, want) === 0 ? `The gauge reads ${three(want)}, so ${then}.` : `The gauge reads ${three(deg)}. Turn the helicopter until the gauge reads ${three(want)}, then ${then}.`;
function turnHint(deg, want, then = 'fly') {
  const off = offBy(deg, want);
  return off === 0 ? `The gauge already reads ${three(want)}, so ${then}.` : `Turn the helicopter to the ${off > 0 ? 'left' : 'right'} until the gauge reads ${three(want)}, then ${then}.`;
}
// What a wrong heading was, and which way back.
function turnSay(deg, want) {
  const off = offBy(deg, want);
  return `${Math.abs(off)} degrees too far to the ${off > 0 ? 'right' : 'left'}`;
}
const turnBack = (deg, want) => offBy(deg, want) > 0 ? 'Turn the helicopter back to the left, and the number goes down.' : 'Turn the helicopter to the right, and the number goes up.';

// ---- the formulas beside the board (each one comes out on a calculator from the figures it shows) ----
const QUARTER = Object.freeze({title: 'A quarter turn', formula: 'quarter turn = 360° ÷ 4', worked: '360° ÷ 4 = 90°', note: 'Each of the four main directions is a quarter turn from the next one.'});
const shareSum = deg => ({title: 'How much of a full turn', formula: 'share of a full turn = heading ÷ 360°', worked: `${Math.round(deg)}° ÷ 360° = ${(Math.round(deg) / 360).toFixed(3)}`, note: 'A heading is measured clockwise from north, and a full turn is 360°.'});
const scaleSum = length => ({title: 'From boxes to metres', formula: `distance = boxes × ${BOX_M} m`, worked: `${(Math.round(length) / BOX_M).toFixed(2)} boxes × ${BOX_M} m = ${Math.round(length)} m`, note: 'The scale of this map is one box for every 100 m on the ground.'});
function headingSum(east, north) {
  const e = Math.round(east), n = Math.round(north), sum = {title: 'Heading', formula: 'heading = atan(east ÷ north)'};
  if (n === 0) return {...sum, worked: e === 0 ? 'The target is on the pad, so there is no direction to measure.' : `The north distance is 0 m and you cannot divide by 0. The target lies straight ${e > 0 ? 'east, on heading 090' : 'west, on heading 270'}.`};
  return {...sum, worked: `atan(${minus(e)} ÷ ${minus(n)}) = ${minus(atanOf(e, n).toFixed(1))}°`, note: 'The angle is measured at the pad, clockwise from north.'};
}
const atanOf = (e, n) => Math.atan(e / n) * 180 / Math.PI;
// atan on a calculator gives only -90 to 90 degrees, so a target south, or north and west, needs the correction.
function correctionSum(east, north) {
  const e = Math.round(east), n = Math.round(north), raw = Number(atanOf(e, n).toFixed(1));
  const worked = e === 0 && n === 0 ? 'No correction is needed, because the target is on the pad.'
    : n === 0 ? 'No correction is needed, because the target lies straight east or straight west.'
    : n < 0 ? `${minus(raw.toFixed(1))}° + 180° = ${(raw + 180).toFixed(1)}°`
      : e < 0 ? `${minus(raw.toFixed(1))}° + 360° = ${(raw + 360).toFixed(1)}°`
        : 'No correction is needed north and east of the pad.';
  return {title: 'The correction', formula: 'If the target is south of the pad, add 180°. If it is north and west of the pad, add 360°.', worked};
}
function distanceSum(east, north) {
  const e = Math.abs(Math.round(east)), n = Math.abs(Math.round(north));
  return {title: 'Distance', formula: 'distance = √(east² + north²)', worked: `√(${e}² + ${n}²) = ${Math.hypot(e, n).toFixed(1)} m`, note: 'This is the rule of Pythagoras for the longest side of a right-angled triangle. A small 2 means a number multiplied by itself, and √ means the square root.'};
}
const SPEED_SUM = Object.freeze({title: 'Speed', formula: 'speed = distance ÷ time', worked: `${WATCH.distanceM} m ÷ ${WATCH.distanceM / CRUISE_MS} s = ${CRUISE_MS} m/s`, note: 'm/s means metres during each second.'});
const timeSum = (distanceM, title = 'Time to arrive') => ({title, formula: 'time = distance ÷ speed', worked: `${Math.round(distanceM)} m ÷ ${CRUISE_MS} m/s = ${(Math.round(distanceM) / CRUISE_MS).toFixed(1)} s`});
const flightEast = (deg, distanceM, title = 'Where the flight ends: east') => {
  const h = Math.round(wrap(deg)), a = h * Math.PI / 180;
  return {title, formula: 'east = distance × sin(heading)', worked: `${Math.round(distanceM)} × sin ${h}° = ${fixed(Math.round(distanceM) * Math.sin(a), 1)} m`, note: `sin ${h}° is ${fixed(Math.sin(a), 2)}, the share of the flight that goes east. A minus sign means west.`};
};
const flightNorth = (deg, distanceM, title = 'Where the flight ends: north') => {
  const h = Math.round(wrap(deg)), a = h * Math.PI / 180;
  return {title, formula: 'north = distance × cos(heading)', worked: `${Math.round(distanceM)} × cos ${h}° = ${fixed(Math.round(distanceM) * Math.cos(a), 1)} m`, note: `cos ${h}° is ${fixed(Math.cos(a), 2)}, the share of the flight that goes north. A minus sign means south.`};
};
// The turn from the gauge to the wanted heading, the short way round.
function turnNeeded(deg, want) {
  const h = Math.round(wrap(deg)), difference = want - h, way = d => d > 0 ? `${d}° to the right` : `${-d}° to the left`;
  const worked = difference === 0 ? `${want}° − ${h}° = 0°, so no turn is needed.`
    : Math.abs(difference) === 180 ? `${want}° − ${h}° = ${minus(difference)}°, which is half a turn. Either way is 180°, so a turn of 180° to the right will do.`
    : Math.abs(difference) <= 180 ? `${want}° − ${h}° = ${minus(difference)}°, which is ${way(difference)}.`
      : difference > 0 ? `${want}° − ${h}° = ${difference}°, and ${difference}° − 360° = ${minus(difference - 360)}°, which is ${way(difference - 360)}.`
        : `${want}° − ${h}° = ${minus(difference)}°, and ${minus(difference)}° + 360° = ${difference + 360}°, which is ${way(difference + 360)}.`;
  return {title: 'The turn still needed', formula: 'turn = wanted heading − gauge reading', worked, note: 'A plus sign means a turn to the right and a minus sign means a turn to the left. An answer beyond 180° means that the other way round is shorter, so 360° is added or taken away.'};
}

// ---- the checks ----
const CHECKS = {
  'check-west': {
    question: 'Which heading points the helicopter west?',
    answers: [{label: 'Heading 090', deg: 90}, {label: 'Heading 180', deg: 180}, {label: 'Heading 270', deg: 270}].map(a => ({...a, picture: {kind: 'heading', deg: a.deg}})),
    correct: 2, demo: {from: 0, to: 270, way: 'right'},
    right: () => 'Correct. Heading 270 points west, because west is three quarter turns clockwise from north, and 3 × 90° = 270°.',
    wrong: picked => `${['Heading 090 points east', 'Heading 180 points south'][picked]}. West is heading 270, because west is three quarter turns clockwise from north, and 3 × 90° = 270°.`,
    hints: ['North is heading 000, and the number counts up as the helicopter turns to the right.', 'East is heading 090 and south is heading 180. Keep going round.', 'Pick heading 270.'],
    open: () => [{title: 'Heading', formula: 'heading = angle clockwise from north', note: 'A full turn is 360°, and a quarter turn is 90°.'}],
    shown: () => [{title: 'Three quarter turns', formula: 'west = 3 × a quarter turn', worked: '3 × 90° = 270°'}],
  },
  'check-wrap': {
    question: 'The helicopter is on heading 350 and the smoke is on heading 010. Which turn reaches heading 010 with the smaller change of direction?',
    answers: [{label: 'The turn to the right', way: 'right'}, {label: 'The turn to the left', way: 'left'}, {label: 'Both turns are the same size', way: 'same'}].map(a => ({...a, picture: {kind: 'wrap', way: a.way}})),
    correct: 0, demo: {from: 350, to: 10, way: 'right', seconds: 2},
    right: () => 'Correct. Past 359 the number comes round to 000, so turning to the right takes the helicopter only 20 degrees to reach 010, while turning to the left would be 340 degrees.',
    wrong: picked => picked === 1 ? 'Turning to the left would reach heading 010, but it is the long way round, a turn of 340 degrees. Past 359 the number comes round to 000, so turning to the right takes the helicopter only 20 degrees to reach 010.'
      : 'The two turns are not the same size. Past 359 the number comes round to 000, so the turn to the right is 20 degrees and the turn to the left is 340 degrees.',
    hints: ['What number comes after 359?', 'Turning to the right, 350 goes on to 355, 000, 005 and 010.', 'Pick the turn to the right.'],
    open: () => [{title: 'Two ways round', formula: 'turn to the right + turn to the left = 360°', note: 'Together the two ways make one full turn.'}],
    shown: () => [{title: 'To the right, past 000', formula: 'right = wanted + 360° − gauge', worked: '10° + 360° − 350° = 20°'}, {title: 'To the left', formula: 'left = 360° − right', worked: '360° − 20° = 340°'}],
  },
  'check-sum': {
    question: `A hut is ${SUM_HUT.east} m east and ${SUM_HUT.north} m north of the pad. Which heading points the helicopter straight at the hut?`,
    answers: [{label: 'Heading 045', deg: 45}, {label: 'Heading 090', deg: 90}, {label: 'Heading 135', deg: 135}].map(a => ({...a, picture: {kind: 'heading', deg: a.deg}})),
    correct: 0, demo: {from: 0, to: 45, way: 'right'},
    right: () => 'Correct. East ÷ north is 300 ÷ 300 = 1, and atan(1) is 45°, so the heading is 045, which is halfway between north and east.',
    wrong: picked => `${picked === 1 ? 'Heading 090 points straight east, but the hut is north of the pad as well.' : 'Heading 135 points south of east, but the hut is north of the pad.'} East ÷ north is 300 ÷ 300 = 1, and atan(1) is 45°, so the heading is 045.`,
    hints: ['Divide the east distance by the north distance.', 'When the two distances are equal, the hut lies halfway between north and east.', 'Pick heading 045.'],
    open: () => [{title: 'Heading', formula: 'heading = atan(east ÷ north)', note: 'The angle is measured at the pad, clockwise from north.'}],
    shown: () => [headingSum(SUM_HUT.east, SUM_HUT.north), distanceSum(SUM_HUT.east, SUM_HUT.north)],
  },
  'check-scale': {
    question: `On this map one box stands for ${BOX_M} m. The smoke is five and a half boxes from the pad. How many metres is that?`,
    answers: [{label: '55 m', m: 55}, {label: '550 m', m: 550}, {label: '5,500 m', m: 5500}].map(a => ({...a, picture: {kind: 'boxes', m: a.m}})),
    correct: 1, demo: {ruler: JOB.distanceM},
    right: () => `Correct. Each box stands for ${BOX_M} m, so five and a half boxes is 5.5 × ${BOX_M} m = 550 m.`,
    wrong: () => `Each box stands for ${BOX_M} m, so five boxes is 500 m, and half a box adds 50 m, which makes 550 m.`,
    hints: [`One box stands for ${BOX_M} m on the ground.`, 'Five boxes is 500 m. Then add half a box.', 'Pick 550 m.'],
    open: () => [{title: 'From boxes to metres', formula: 'distance = boxes × metres in one box'}],
    shown: () => [{title: 'From boxes to metres', formula: `distance = boxes × ${BOX_M} m`, worked: `5.5 boxes × ${BOX_M} m = 550 m`}],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];
  const goal = () => ({'word-compass': HUT, 'word-scale': HUT, watch: WATCH, 'try-turn': JOB, 'try-wrap': WRAP, alone: JOB})[step().id] ?? null;
  const smoke = () => ({...pointAt(JOB.headingDeg, JOB.distanceM), kind: 'smoke', label: 'Smoke'});

  // The helicopter sits on the pad at (0, 0) map metres, pointing along its heading. A flight is straight on its heading.
  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', heading: 0, x: 0, y: 0, flown: 0, track: [], ghosts: [], ruler: null, target: null, auto: null, marker: null, noted: false, lastPress: -1,
      say: '', autoSay: '', answered: null, firstLeft: false, turned: 0, rightRun: 0, result: null, rows: [], tested: new Set(), tries: 0, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.target = smoke(); m.auto = {turnTo: null, fly: JOB.distanceM, at: .6}; m.phase = 'auto'; }
    if (id === 'word-heading') m.phase = 'turn';
    if (id === 'word-compass') { m.phase = 'turn'; m.target = {...pointAt(HUT.headingDeg, HUT.distanceM), kind: 'lake', label: 'The lake'}; }
    if (id === 'word-scale') { m.heading = 90; m.ruler = 100; m.phase = 'ruler'; m.target = {...pointAt(HUT.headingDeg, HUT.distanceM), kind: 'hut', label: 'The hut'}; }
    if (MARKERS[id]) { m.marker = {...MARKERS[id].start}; m.phase = 'marker'; aimAtMarker(); }
    if (id === 'watch') { m.target = {...pointAt(WATCH.headingDeg, WATCH.distanceM), kind: 'hut', label: 'The hut'}; m.auto = {turnTo: WATCH.headingDeg, fly: WATCH.distanceM, at: .6}; m.phase = 'auto'; }
    if (id === 'try-free') { m.heading = 45; m.ruler = FREE_MAX_M; m.phase = 'set'; }
    if (id === 'try-turn') { m.phase = 'turn'; m.target = smoke(); }
    if (id === 'try-wrap') { m.heading = WRAP.startDeg; m.phase = 'turn'; m.target = {...pointAt(WRAP.headingDeg, WRAP.distanceM), kind: 'smoke', label: 'Smoke'}; }
    if (id === 'alone') { m.phase = 'turn'; m.target = smoke(); }
    if (CHECKS[id]) {
      m.phase = m.answered === null ? 'ask' : 'answered'; m.heading = CHECKS[id].demo.from ?? 0;
      m.target = id === 'check-scale' ? smoke() : id === 'check-sum' ? {x: SUM_HUT.east, y: SUM_HUT.north, kind: 'hut', label: 'The hut'} : null;
    }
  }
  // Back on the pad, keeping its heading, with the last flight left on the map as a faint track.
  function home() { if (m.track.length > 1) m.ghosts = [...m.ghosts.slice(-3), m.track]; m.x = 0; m.y = 0; m.flown = 0; m.track = []; }
  // turned adds up the whole turn (the long way round is over 180); rightRun is the turn right since A was last pressed.
  function turn(by) { m.heading = wrap(m.heading + by); m.turned += by; m.rightRun = by > 0 ? m.rightRun + by : by < 0 ? 0 : m.rightRun; }
  function steer(kind, value) {
    if (kind === 'hold') { const at = Math.round(Number(value) / TURN_STEP) * TURN_STEP; if (Number.isFinite(at)) turn(offBy(at, m.heading)); }
    else turn(value === 'left' ? -TURN_STEP : TURN_STEP);
  }
  // The helicopter points at the marker, so the gauge reads the sum's answer. On the pad itself there is no direction, so it stays.
  function aimAtMarker() { if (m.marker.east || m.marker.north) m.heading = headingTo(m.marker.east, m.marker.north); }

  function act(action) {
    const id = step().id, [kind, value, held] = action.split(':');
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
    if (MARKERS[id]) return markerAct(id, kind, value, held);
    if (id === 'try-free') return freeAct(kind, value);
    if (id === 'word-scale') return m.phase === 'ruler' || m.phase === 'result' ? rulerAct(kind, value) : null;
    // A word step stays open after its answer: the keys go on turning the helicopter and the sums go on changing.
    if (m.phase === 'result' && (id === 'word-heading' || id === 'word-compass')) {
      if ((kind === 'turn' && value !== 'best') || kind === 'hold') steer(kind, value);
      return null;
    }
    if (m.phase === 'turn' || (m.phase === 'result' && (id === 'try-turn' || id === 'try-wrap'))) {
      if (kind === 'turn' || kind === 'hold') {
        if (m.phase === 'result') { m.phase = 'turn'; home(); }
        if (kind === 'turn' && value === 'best') return showTurn(id);
        steer(kind, value);
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
  // Show me: Brian turns the helicopter (right, on Heading; the short way on the try, from where it starts) and flies it.
  function showTurn(id) {
    if (id === 'word-heading') { m.auto = {turnTo: goalHeading(), way: 'right', fly: null, at: 0}; m.autoSay = 'I will turn the helicopter to the right, and the number will go up.'; }
    else {
      if (id === 'try-wrap') { m.heading = WRAP.startDeg; m.turned = 0; }
      m.auto = {turnTo: goal().headingDeg, way: id === 'try-wrap' ? 'left' : null, fly: null, at: 0, then: 'fly'};
      m.autoSay = id === 'try-wrap' ? `I will start again from heading ${three(WRAP.startDeg)}, turn the helicopter left to heading ${three(WRAP.headingDeg)} and then fly ${metres(WRAP.distanceM)}.`
        : id === 'word-compass' ? `I will turn the helicopter to heading ${three(HUT.headingDeg)}, which is east.`
          : `I will turn the helicopter to heading ${three(goal().headingDeg)} and then fly ${metres(goal().distanceM)}.`;
    }
    m.phase = 'auto-turn';
    return {kind: 'progress', say: m.autoSay};
  }

  function afterTurn(id, value) {
    if (id === 'word-heading') {
      if (m.rightRun >= 30) {
        m.phase = 'result'; seen.add(id);
        m.say = `The gauge read ${three(m.heading)} after the helicopter had turned ${Math.round(m.rightRun)} degrees to the right. The number went up because a turn to the right is clockwise, which moves the helicopter further round from north. Past 359 the number comes round to 000, because a full turn brings the helicopter back to north.${MORE}Turning the helicopter to the left makes the number go down. You can keep turning the helicopter to watch the angle and the formula change.`;
        return {kind: 'right', say: m.say};
      }
      if (value === 'left' && !m.firstLeft) {
        m.firstLeft = true;
        return {kind: 'progress', say: m.heading === 360 - TURN_STEP
          ? 'The helicopter turned to the left, which is the opposite of clockwise. The gauge went from 000 to 355, because 5° to the left of north is the same direction as 355° clockwise from north. Each further turn to the left makes the number go down. Now turn to the right.'
          : 'The number went down, because the helicopter turned to the left. Now turn to the right.'};
      }
    }
    return null;
  }

  // Space: the helicopter flies on its heading. In the tries it flies the set distance; on the job it flies until Space again.
  function fly(id, brian) {
    if (id === 'word-heading') return null;
    if (id === 'word-compass') {
      if (Math.abs(offBy(m.heading, HUT.headingDeg)) < TURN_STEP) {
        m.phase = 'result'; seen.add(id);
        m.say = 'Heading 090 points east, towards the lake. If you keep turning to the right, heading 180 points south, heading 270 points west, and a full turn of 360° brings the helicopter back to north, which the gauge shows as 000. You can keep turning the helicopter to watch the formulas change.';
        return {kind: 'right', say: m.say};
      }
      return {kind: 'fail', say: `The gauge read ${three(m.heading)} when you said it was east, which is ${turnSay(m.heading, HUT.headingDeg)}. ${turnBack(m.heading, HUT.headingDeg)} East is heading 090.`};
    }
    if (brian) { m.auto = {turnTo: goal().headingDeg, fly: goal().distanceM, at: 0, brian: true}; m.phase = 'auto'; return {kind: 'progress', say: `I will turn the helicopter to heading ${three(goal().headingDeg)}, fly ${metres(goal().distanceM)} and stop over the smoke.`}; }
    if (id === 'alone') { m.phase = 'flying'; m.auto = {turnTo: null, fly: Infinity, at: 0}; return {kind: 'progress', say: `Stop when the FLOWN panel reads ${metres(JOB.distanceM)}.`}; }
    const far = id === 'try-free' ? m.ruler : goal().distanceM;
    m.phase = 'auto'; m.auto = {turnTo: null, fly: far, at: 0, judge: true};
    m.say = `On heading ${three(m.heading)} the helicopter will fly ${metres(far)}. Watch where it ends up.`;
    return {kind: 'progress', say: m.say};
  }
  function stop() { m.auto = null; return judgeJob(); }

  function rulerAct(kind, value) {
    if (kind === 'ruler' && value === 'best') { m.auto = {ruler: HUT.distanceM, at: 0}; m.phase = 'auto-ruler'; m.autoSay = 'I will set the ruler so that it reaches the hut.'; return {kind: 'progress', say: m.autoSay}; }
    if (kind === 'ruler') { m.ruler = Math.max(RULER_STEP_M, Math.min(RULER_MAX_M, m.ruler + (value === 'shorter' ? -RULER_STEP_M : RULER_STEP_M))); return null; }
    if (kind === 'hold') { const at = Math.round(Number(value) / RULER_STEP_M) * RULER_STEP_M; if (Number.isFinite(at)) m.ruler = Math.max(RULER_STEP_M, Math.min(RULER_MAX_M, at)); return null; }
    if (kind === 'fly' && m.phase === 'ruler') return judgeRuler();
    return null;
  }
  function judgeRuler() {
    const boxes = m.ruler / BOX_M;
    if (m.ruler === HUT.distanceM) { m.phase = 'result'; seen.add('word-scale'); m.say = `The hut is three boxes from the pad and each box stands for ${BOX_M} m, so the hut is 300 m from the pad. You can keep moving the ruler to watch the formula change.`; return {kind: 'right', say: m.say}; }
    return {kind: 'fail', say: `The ruler read ${metres(m.ruler)} when you said it reached the hut, which is ${boxWords(boxes)}. The hut is three boxes from the pad, which is 300 m.`};
  }

  // The marker moves one box a press. Its steps open Continue when it reaches the place asked for, and stay open.
  function markerAct(id, kind, value, held) {
    const rule = MARKERS[id];
    if (kind === 'marker' && value === 'best') {
      if (m.phase !== 'marker') return null;
      m.auto = {marker: true, at: 0}; m.phase = 'auto-marker'; m.lastPress = m.time;
      m.autoSay = `I will move the marker to ${place(rule.goal.east, rule.goal.north)} of the pad.`;
      return {kind: 'progress', say: m.autoSay};
    }
    if (kind !== 'marker' || m.phase === 'auto-marker') return null;
    if (held === 'held' && m.time - m.lastPress < HELD_GAP_S) return null;
    const axis = value === 'east' || value === 'west' ? 'east' : 'north', by = value === 'east' || value === 'north' ? BOX_M : -BOX_M;
    const to = Math.max(rule.min[axis], Math.min(rule.max[axis], m.marker[axis] + by));
    if (to === m.marker[axis]) { if (held === 'held') return null; m.noted = true; return {kind: 'note', say: 'The marker cannot go any further that way.'}; }
    m.marker = {...m.marker, [axis]: to}; m.lastPress = m.time;
    aimAtMarker();
    if (m.phase === 'marker' && atMarkerGoal(rule)) return markerDone(id);
    if (m.noted) { m.noted = false; return {kind: 'note'}; }
    return null;
  }
  const atMarkerGoal = rule => m.marker.east === rule.goal.east && m.marker.north === rule.goal.north;
  function markerDone(id) {
    m.phase = 'result'; m.auto = null; seen.add(id);
    m.say = id === 'word-sums'
      ? 'At 300 m east and 400 m north, east ÷ north is 300 ÷ 400 = 0.75, and atan(0.75) is 36.9°. The gauge shows whole degrees, so a helicopter pointing at that place reads 037. You can keep moving the marker to watch the heading change.'
      : id === 'word-distance' ? 'At 400 m east and 300 m north, the distance is √(400² + 300²) = √(160,000 + 90,000) = √250,000 = 500 m. That is the same distance as 300 m east and 400 m north, although the heading is different. You can keep moving the marker to watch the distance change.'
      : 'At 300 m east and 200 m south, atan(300 ÷ −200) gives −56.3°, and that angle alone would point the helicopter north and west, which is the wrong way. Adding 180° gives 123.7°, which points the helicopter south and east, towards that place. You can now move the marker north and west of the pad, where the correction adds 360° instead.';
    return {kind: 'right', say: m.say};
  }

  // The free test: any heading and any flight length. Only different settings count, and three open Continue.
  const settingOf = (deg, distanceM) => `${Math.round(wrap(deg))}/${distanceM}`;
  function freeAct(kind, value) {
    if (m.phase !== 'set' && m.phase !== 'result') return null;
    const back = () => { if (m.phase === 'result') { m.phase = 'set'; home(); } };
    if (kind === 'free') {
      const next = FREE_SHOW.find(s => !m.tested.has(settingOf(s.headingDeg, s.distanceM))) ?? FREE_SHOW[0];
      back();
      m.ruler = next.distanceM; m.auto = {turnTo: next.headingDeg, fly: null, at: 0, then: 'fly'}; m.phase = 'auto-turn';
      m.autoSay = `I will test a different setting. I will turn the helicopter to heading ${three(next.headingDeg)}, set the flight to ${metres(next.distanceM)} and then fly.`;
      return {kind: 'progress', say: m.autoSay};
    }
    if (kind === 'turn' || kind === 'hold') { back(); steer(kind, value); return null; }
    if (kind === 'length') { back(); m.ruler = Math.max(FREE_MIN_M, Math.min(FREE_MAX_M, m.ruler + (value === 'shorter' ? -RULER_STEP_M : RULER_STEP_M))); return null; }
    if (kind === 'fly') { back(); return fly('try-free', false); }
    return null;
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id, a = m.auto;
    if (!a) return null;
    if (m.time < a.at) return null;
    if (a.marker) {
      const rule = MARKERS[id];
      if (m.time - m.lastPress < HELD_GAP_S) return null;
      m.lastPress = m.time;
      const axis = m.marker.east !== rule.goal.east ? 'east' : 'north';
      m.marker = {...m.marker, [axis]: m.marker[axis] + Math.sign(rule.goal[axis] - m.marker[axis]) * BOX_M};
      aimAtMarker();
      return atMarkerGoal(rule) ? markerDone(id) : null;
    }
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
      // The helicopter turns the short way round at its real rate, unless told which way.
      const off = offBy(a.turnTo, m.heading), dir = a.way === 'right' ? 1 : a.way === 'left' ? -1 : Math.sign(off) || 1;
      const left = dir > 0 ? wrap(a.turnTo - m.heading) : wrap(m.heading - a.turnTo);
      if (a.rate == null && a.seconds != null) a.rate = left / a.seconds;
      turn(dir * Math.min(left, (a.rate ?? TURN_RATE) * dt));
      if (Math.abs(offBy(a.turnTo, m.heading)) > 1e-6) return null;
      m.heading = wrap(a.turnTo); a.turnTo = null;
      if (m.phase === 'auto-turn') {
        m.auto = null; m.phase = id === 'try-free' ? 'set' : 'turn';
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
      // A practice flight ends at the map's edge and is judged there; the job's brings the helicopter back to the pad.
      if (a.judge && offMap()) { m.auto = null; return judgeTry(id); }
      if (id === 'alone' && m.phase === 'flying' && offMap()) {
        m.auto = null; m.phase = 'missed';
        const flown = m.flown;
        home();
        return {kind: 'fail', say: `The helicopter flew off the map after ${metres(flown)}, so it has come back to the pad. Fly again, and stop when the FLOWN panel reads ${metres(JOB.distanceM)}.`};
      }
      if (m.flown < a.fly - 1e-9) return null;
      m.auto = null;
      if (a.brian) return judgeJob();
      if (a.judge) return judgeTry(id);
      m.phase = 'done'; seen.add(id);
      return null;
    }
    return null;
  }
  const offMap = () => m.x < MAP.west || m.x > MAP.east || m.y < MAP.south || m.y > MAP.north;

  // A try: the helicopter flew the set distance on its heading, and is over the smoke if it was on the smoke's heading.
  function judgeTry(id) {
    m.phase = 'result';
    if (id === 'try-free') {
      const seconds = m.ruler / CRUISE_MS;
      m.tested.add(settingOf(m.heading, m.ruler)); m.tries = m.tested.size;
      m.rows = [...m.rows, {heading: Math.round(m.heading), distance: m.ruler, east: Math.round(m.x), north: Math.round(m.y)}];
      if (m.tries >= FREE_TRIES) seen.add(id);
      m.say = `On heading ${three(m.heading)} the helicopter flew ${metres(m.ruler)} and ended up ${place(m.x, m.y)} of the pad, as the formulas predicted. The flight lasted ${seconds} seconds at ${CRUISE_MS} m/s. ${m.tries >= FREE_TRIES ? 'You have tested enough settings, so continue when you are ready.' : 'Change the heading or the distance, and test a different setting.'}`;
      return {kind: 'right', say: m.say};
    }
    const want = goal(), off = offBy(m.heading, want.headingDeg), gap = closest(m.heading, want.distanceM, m.target);
    const longWay = id === 'try-wrap' && Math.abs(m.turned) > 180;
    seen.add(id);
    m.result = {right: Math.abs(off) < TURN_STEP};
    if (m.result.right) {
      m.say = longWay ? `The helicopter reached the smoke, but A was the short way round. A turn of 40 degrees to the left would have done, instead of your ${Math.round(Math.abs(m.turned))} degrees. Below 000 the number comes round to 355, and then on down to 340.`
        : id === 'try-wrap' ? 'The helicopter turned left past 000, round to 355 and on to 340, which is a turn of only 40 degrees.'
          : `The helicopter flew right over the smoke. Heading ${three(want.headingDeg)} points at the smoke, and ${metres(want.distanceM)} is how far away the smoke is, so the flight lasted ${want.distanceM / CRUISE_MS} seconds at ${CRUISE_MS} m/s.`;
      return {kind: 'right', say: m.say};
    }
    m.say = `You flew on heading ${three(m.heading)}, which is ${turnSay(m.heading, want.headingDeg)}, and the helicopter passed ${metres(gap)} from the smoke. ${turnBack(m.heading, want.headingDeg)} Then fly again.`;
    return {kind: 'wrong', say: m.say};
  }

  // Brian's job: the helicopter stopped over the smoke, or Brian says what to change, with the numbers.
  function judgeJob() {
    const gap = Math.hypot(m.x - m.target.x, m.y - m.target.y), off = offBy(m.heading, JOB.headingDeg), flown = m.flown;
    if (gap <= RING_M) { m.phase = 'done'; seen.add('alone'); m.say = `The helicopter stopped over the smoke. It flew on heading ${three(m.heading)} for ${metres(flown)}, so a heading and a distance together were all that was needed to find the smoke, and that finishes the job.`; return {kind: 'pass', say: m.say}; }
    m.phase = 'missed'; home();
    if (Math.abs(off) >= TURN_STEP) m.say = `You flew on heading ${three(m.heading)}, which is ${turnSay(m.heading, JOB.headingDeg)}, and stopped ${metres(gap)} from the smoke. Turn the helicopter to heading ${three(JOB.headingDeg)} by turning it to the ${off > 0 ? 'left' : 'right'}, then fly.`;
    else if (flown < JOB.distanceM) m.say = `You flew on the right heading, but you stopped after ${metres(flown)}, which is ${metres(JOB.distanceM - flown)} short. Watch the FLOWN panel and stop at ${metres(JOB.distanceM)}. Fly again.`;
    else m.say = `You flew on the right heading, but you stopped after ${metres(flown)}, which is ${metres(flown - JOB.distanceM)} past the smoke. Stop when the FLOWN panel reads ${metres(JOB.distanceM)}. Fly again.`;
    return {kind: 'fail', say: m.say};
  }

  function demo(d) {
    if (d.ruler != null) { m.heading = JOB.headingDeg; m.ruler = 0; m.auto = {ruler: d.ruler, at: .3, demo: true}; m.phase = 'answered'; return; }
    m.heading = d.from; m.auto = {turnTo: d.to, way: d.way, fly: null, at: .4, seconds: d.seconds};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch') { enter(m.index); return null; }
    if (CHECKS[id] && m.phase === 'answered') { const answered = m.answered; enter(m.index, {answered}); demo(CHECKS[id].demo); return null; }
    return null;
  }

  // The formulas for this step, from the numbers on the board now. While a question is open they settle nothing.
  function formulas(id) {
    const h = m.heading, s = pointAt(JOB.headingDeg, JOB.distanceM);
    if (id === 'wonder') return [];
    if (id === 'word-heading') return [shareSum(h)];
    if (id === 'word-compass') return [shareSum(h), QUARTER];
    if (id === 'word-scale') return [scaleSum(m.ruler ?? 0)];
    if (id === 'word-sums') return [headingSum(m.marker.east, m.marker.north)];
    if (id === 'word-distance') return [headingSum(m.marker.east, m.marker.north), distanceSum(m.marker.east, m.marker.north)];
    if (id === 'word-quarters') return [headingSum(m.marker.east, m.marker.north), correctionSum(m.marker.east, m.marker.north), distanceSum(m.marker.east, m.marker.north)];
    if (id === 'watch') {
      const t = pointAt(WATCH.headingDeg, WATCH.distanceM);
      return [headingSum(t.x, t.y), correctionSum(t.x, t.y), distanceSum(t.x, t.y), SPEED_SUM, m.flown > 0 ? timeSum(m.flown, 'Time so far') : timeSum(WATCH.distanceM)];
    }
    if (id === 'try-free') return [flightEast(h, m.ruler), flightNorth(h, m.ruler), timeSum(m.ruler)];
    if (id === 'try-turn') return [headingSum(s.x, s.y), turnNeeded(h, JOB.headingDeg), flightEast(h, JOB.distanceM, 'Where this heading leads: east'), flightNorth(h, JOB.distanceM, 'Where this heading leads: north')];
    if (id === 'try-wrap') {
      const t = pointAt(WRAP.headingDeg, WRAP.distanceM), start = WRAP.startDeg, right = WRAP.headingDeg - start;
      return [headingSum(t.x, t.y), correctionSum(t.x, t.y), m.result
        ? {title: 'Two ways round', formula: 'turn to the right + turn to the left = 360°', worked: `To the right, ${WRAP.headingDeg}° − ${start}° = ${right}°. To the left, 360° − ${right}° = ${360 - right}°.`}
        : {title: 'Two ways round', formula: 'turn to the right + turn to the left = 360°', note: 'Together the two ways make one full turn.'}, flightEast(h, WRAP.distanceM, 'Where this heading leads: east')];
    }
    if (id === 'alone') return [headingSum(s.x, s.y), distanceSum(s.x, s.y), m.flown > 0 ? timeSum(m.flown, 'Time so far') : timeSum(JOB.distanceM)];
    if (CHECKS[id]) return m.answered === null ? CHECKS[id].open() : CHECKS[id].shown();
    return [headingSum(s.x, s.y), distanceSum(s.x, s.y), timeSum(JOB.distanceM)];
  }
  // The right-angled triangle on the map: north from the pad, then east, then the straight line back.
  function triangle(id) {
    if (m.marker) return {east: m.marker.east, north: m.marker.north, line: true, arc: true};
    if (id === 'try-free') return m.phase === 'result' ? {east: m.x, north: m.y, line: false, arc: true} : null;
    if (id === 'watch' || id === 'try-turn' || id === 'try-wrap') return {east: m.target.x, north: m.target.y, line: true, arc: false};
    if (id === 'check-sum') return {east: SUM_HUT.east, north: SUM_HUT.north, line: m.answered !== null, arc: false};
    return null;
  }

  function view() {
    const id = step().id, free = id === 'try-free', planning = free && (m.phase === 'set' || m.phase === 'auto-turn');
    const base = {scene: 'map', time: m.time, heli: {x: m.x, y: m.y, heading: m.heading}, flown: m.phase === 'flying' || m.flown > 0 ? m.flown : null, track: m.track, ghosts: m.ghosts,
      spot: m.marker ? {x: m.marker.east, y: m.marker.north, kind: 'marker', label: 'Marker'} : m.target, ruler: m.ruler == null || (free && !planning) ? null : {heading: m.heading, length: m.ruler},
      compass: !m.marker && !(free && m.phase === 'result'), gauge: three(m.heading), marker: m.marker, plan: planning ? m.ruler : null, rows: m.rows, labelGhosts: free, triangle: triangle(id),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], glow: null, waiting: false, ready: seen.has(id), dragCompass: false, dragRuler: false, grid: Boolean(m.marker),
      formulas: formulas(id), aim: m.phase === 'turn' ? goalHeading() : null};
    // Brian has the controls (Show me): no keys, and he says what he is doing.
    if (m.phase === 'auto-turn' || m.phase === 'auto-ruler' || m.phase === 'auto-marker') return {...base, rose: id === 'word-compass', ...(id === 'word-scale' ? {grid: true, compass: false} : {}),
      say: m.autoSay, prompt: 'Watch Brian.', hints: ['Watch Brian.', 'Watch the gauge.', 'Wait a moment.']};
    if (id === 'wonder') {
      const done = m.phase === 'done';
      return {...base, actions: ['replay'],
        say: done ? `The helicopter flew ${metres(JOB.distanceM)} straight up the map, but it passed ${metres(closest(0, JOB.distanceM, m.target))} from the smoke, because the smoke does not lie straight up the map. The number 070 in the message describes a direction. What does a heading of 070 mean, and how could you work out such a number from a map?`
          : `The fire crew have radioed our helicopter, Kestrel One, with this message: “Smoke at heading 070, ${JOB.distanceM} metres from the pad.” Watch what happens when the helicopter flies straight up the map for that distance.${MORE}The pad is the landing circle marked H on the map, and a distance in metres is written with the letter m, so ${JOB.distanceM} metres is ${metres(JOB.distanceM)}.`,
        prompt: seen.has(id) ? 'Continue when you are ready to find out, or watch again.' : 'Watch the helicopter.',
        hints: ['Watch which way the nose of the helicopter points, and the number on the gauge.', 'The helicopter flies straight up the map, and the smoke lies off to the right of its path.', seen.has(id) ? 'Continue when you are ready to find out.' : 'Watch until the helicopter stops.']};
    }
    if (id === 'word-heading') {
      const done = m.phase === 'result';
      return {...base, ...(done ? stillTurning() : turning(null)),
        say: done ? m.say : `A degree, written 1°, is one of the 360 equal parts of a full turn. A heading is the direction the helicopter points, measured in degrees clockwise from north, the way the hands of a clock turn. Turn the helicopter to the right, and watch the shaded angle from north and the HEADING gauge grow.${MORE}A compass is an instrument that shows direction, and every direction on a compass is measured from north, which is at the top of this map. A quarter turn is 90°. The HEADING gauge always shows three figures, so a heading of 30° reads 030.`,
        prompt: done ? 'Continue when you are ready, or keep turning the helicopter to watch the angle change.' : 'Turn the helicopter to the right a few times, and watch the HEADING gauge count up.',
        hints: done ? DONE_HINTS : ['The number on the right is the heading of the helicopter.', 'Turn the helicopter to the right several times, and the number goes up.', 'Watch my pointer. I will turn the helicopter to the right.']};
    }
    if (id === 'word-compass') {
      const done = m.phase === 'result';
      return {...base, ...(done ? stillTurning() : turning({action: 'fly', label: 'That is east', key: 'Space'})), rose: true,
        say: done ? m.say : `The four main directions on a compass are north, east, south and west, and each one is a quarter turn, or 90°, from the next. North is heading 000, east is heading 090, south is heading 180 and west is heading 270. Turn the helicopter to face east, towards the lake.${MORE}A whole turn of 360° brings the helicopter back to north, so the gauge never shows 360 and reads 000 instead.`,
        prompt: done ? 'Continue when you are ready, or keep turning the helicopter to watch the angle change.' : turnPrompt(m.heading, HUT.headingDeg, 'click That is east'),
        hints: done ? DONE_HINTS : ['East is a quarter turn to the right from north.', turnHint(m.heading, HUT.headingDeg, 'click That is east'), 'Watch my pointer. I will turn the helicopter to heading 090.']};
    }
    if (id === 'word-scale') {
      const done = m.phase === 'result';
      return {...base, ...(done ? {keys: {...RULER_KEYS}, repeat: ['←', '→'], dragRuler: true, buttons: [...RULER_BUTTONS]} : {keys: {...RULER_KEYS, Space: 'fly'}, repeat: ['←', '→'], waiting: true, target: 'ruler:best', glow: 'ruler', dragRuler: true,
        buttons: [...RULER_BUTTONS, {action: 'fly', label: 'That is the hut', key: 'Space'}]}),
        grid: true, compass: false, say: done ? m.say : `A map is much smaller than the ground, so every map has a scale. Lines divide this map into equal boxes, and the scale says that one box stands for ${BOX_M} m on the ground. Stretch the ruler from the pad to the hut to see how many metres the ruler covers.`,
        prompt: done ? 'Continue when you are ready, or keep moving the ruler to watch the formula change.' : m.ruler === HUT.distanceM ? 'The ruler reaches the hut, so click That is the hut.' : `The ruler reads ${metres(m.ruler)}. Make it longer or shorter, or drag its end, until it reaches the hut. Then click That is the hut.`,
        hints: done ? DONE_HINTS : ['Count the boxes from the pad to the hut.', m.ruler === HUT.distanceM ? 'The ruler already reaches the hut, so click That is the hut.' : `The hut is three boxes away, so make the ruler ${m.ruler < HUT.distanceM ? 'longer' : 'shorter'} until it reads 300 m, then click That is the hut.`, 'Watch my pointer. I will set the ruler so that it reaches the hut.']};
    }
    if (MARKERS[id]) {
      const done = m.phase === 'result', rule = MARKERS[id], {east, north} = m.marker;
      const next = east !== rule.goal.east ? ['the east distance', east < rule.goal.east ? 'east' : 'west'] : ['the north distance', north < rule.goal.north ? 'north' : 'south'];
      return {...base, keys: {...MARKER_KEYS}, repeat: ['←', '→', '↑', '↓'], buttons: [...MARKER_BUTTONS], ...(done ? {} : {waiting: true, target: 'marker:best'}),
        say: done ? m.say : id === 'word-sums'
          ? `What heading would point the helicopter at the marker? It is the angle at the pad between north and the straight line to the marker, worked out from the distances east and north. Move the marker from 100 m east and 100 m north to 300 m east and 400 m north, and watch the heading change.${MORE}The east distance, the north distance and the straight line from the pad to the marker make a triangle with one right angle, a corner like the corner of a page, so it is called a right-angled triangle. Dividing the east distance by the north distance gives one number, and each direction has its own number. Atan, short for arctangent, is the calculator button that gives the angle belonging to that number, so the rule atan(east ÷ north) gives the heading. For example, atan(1) is 45°.`
          : id === 'word-distance' ? `To square a number is to multiply it by itself, so 300² is 300 × 300, which is 90,000. The rule of Pythagoras gives the straight-line distance to the marker: square the east and north distances, add them, and take the square root. Move the marker to 400 m east and 300 m north to see the rule work.${MORE}The square root of a number, written √, is the number that gives it when multiplied by itself, so √25 is 5 because 5 × 5 = 25. The straight line is the longest side of the triangle.`
          : `The rule needs a correction for places south or west of the pad, because a calculator’s atan button only gives angles between −90° and 90°. Move the marker south of the pad, to 300 m east and 200 m south, and watch the correction appear.${MORE}We count a distance west of the pad as a negative east distance, and a distance south of the pad as a negative north distance. When the target is south of the pad, you add 180° to the result. When the target is north and west of the pad, you add 360°. North and east of the pad, the rule needs no correction.`,
        prompt: done ? 'Continue when you are ready, or keep moving the marker to watch the formulas change.' : `The marker is ${place(east, north)} of the pad. Move it to ${place(rule.goal.east, rule.goal.north)}.`,
        hints: done ? DONE_HINTS : ['Each move takes the marker one box, which is 100 m.', `Move the marker ${next[1]} to change ${next[0]}.`, 'Watch my pointer. I will move the marker.']};
    }
    if (id === 'watch') {
      const done = m.phase === 'done', t = pointAt(WATCH.headingDeg, WATCH.distanceM);
      return {...base, actions: ['replay', 'slow'],
        say: done ? `The helicopter turned to the right from heading 000 to heading ${three(WATCH.headingDeg)}, and then flew ${metres(WATCH.distanceM)}, which is the length of four boxes on the map, in ${WATCH.distanceM / CRUISE_MS} seconds. With a heading and a distance together, you know exactly where to go.`
          : `Now I will fly a job, to show you how the pieces fit together. The hut is ${place(t.x, t.y)} of the pad, so the formulas beside the picture give heading ${three(WATCH.headingDeg)} and a distance of ${metres(WATCH.distanceM)}.${MORE}The helicopter flies at ${CRUISE_MS} metres per second, which is written ${CRUISE_MS} m/s and means ${CRUISE_MS} metres during each second. At that speed a flight of ${metres(WATCH.distanceM)} lasts ${WATCH.distanceM / CRUISE_MS} seconds. Watch the gauge as I turn the helicopter, and then watch the FLOWN panel count the metres.`,
        prompt: done ? 'Continue when you are ready, or watch again.' : 'Watch the gauge, and then the FLOWN panel.',
        hints: ['Watch the HEADING gauge count up as the helicopter turns to the right.', 'Then watch the FLOWN panel count the metres.', done ? 'Watch again to see it once more.' : 'Wait a moment.']};
    }
    if (free) {
      const tested = seen.has(id);
      if (m.phase === 'auto') return {...base, say: m.say, prompt: 'Watch the helicopter.', hints: ['Watch where the helicopter ends up.', 'Compare the flight with the formulas and the table.', 'Wait a moment.']};
      return {...base, keys: {...TURN_KEYS, ...LENGTH_KEYS, Space: 'fly'}, repeat: ['A', 'D', '←', '→'], buttons: [...TURN_BUTTONS, {action: 'length:shorter', label: 'Shorter', key: '←'}, {action: 'length:longer', label: 'Longer', key: '→'}, {action: 'fly', label: 'Fly', key: 'Space'}],
        waiting: !tested, target: 'free:best', glow: 'compass', dragCompass: true,
        say: m.say || `Now you can test any heading and any flight length. Test at least ${FREE_TRIES} different settings, and predict where the helicopter will end up before you fly.${MORE}To predict the place, you need two more calculator buttons. The sine of the heading, written sin, gives the share of the flight that goes east, and the cosine, written cos, gives the share that goes north. The formulas beside the picture use them. The map and the table keep your results so that you can compare them.`,
        prompt: tested ? 'Continue when you are ready, or test another setting.' : `Change the settings, then fly. Different settings tested so far: ${m.tries} of ${FREE_TRIES}.`,
        hints: ['Fly to test the settings as they are.', 'Try a heading in each quarter of the compass, and a short and a long flight.', 'Watch my pointer. I will test a different setting.']};
    }
    if (id === 'try-turn' || id === 'try-wrap') {
      const want = goal(), wrapStep = id === 'try-wrap';
      if (m.phase === 'turn') return {...base, ...turning({action: 'fly', label: 'Fly', key: 'Space'}),
        say: wrapStep ? `The smoke is now on heading ${three(want.headingDeg)}, ${metres(want.distanceM)} from the pad, and the helicopter points at heading ${three(WRAP.startDeg)}. The helicopter could turn either way round the compass, so which way round is the shorter turn? Turn the helicopter the way you think is shorter, then fly.`
          : `We will find the heading of the smoke and fly to it. The smoke is ${place(m.target.x, m.target.y)} of the pad, so the formulas beside the picture give heading ${three(want.headingDeg)} and a distance of ${metres(want.distanceM)}. First, turn the helicopter to heading ${three(want.headingDeg)}.${MORE}When you fly, the helicopter goes ${metres(want.distanceM)} on whatever heading the gauge shows.`,
        prompt: turnPrompt(m.heading, want.headingDeg),
        hints: wrapStep ? ['When you turn to the left, the number goes down, and below 000 comes 355.', `From heading ${three(WRAP.startDeg)}, a turn of 40° to the left reaches heading ${three(want.headingDeg)}.`, `Watch my pointer. I will start again from heading ${three(WRAP.startDeg)}, turn the helicopter left to heading ${three(want.headingDeg)} and then fly.`]
          : [`Heading ${three(want.headingDeg)} is a little less than a quarter turn to the right of north.`, turnHint(m.heading, want.headingDeg), `Watch my pointer. I will turn the helicopter to heading ${three(want.headingDeg)} and then fly.`]};
      if (m.phase === 'result') return {...base, ...turning({action: 'fly', label: 'Fly again', key: 'Space'}), waiting: false, target: null, glow: null, mood: m.result?.right ? 'cheer' : 'explain', say: m.say,
        prompt: 'Continue when you are ready, or turn the helicopter and fly again.', hints: DONE_HINTS};
      return {...base, say: m.say, prompt: 'Watch the helicopter.', hints: ['Watch where the helicopter goes.', 'Watch the smoke.', 'Wait a moment.']};
    }
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, compass: id !== 'check-scale', grid: id === 'check-scale' || id === 'check-sum', keys: answered ? {} : PICK_KEYS, actions: answered ? ['replay'] : [], waiting: !answered,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Continue when you are ready, or watch again.' : 'Pick the card with your answer.', hints: answered ? REPLAY_HINTS : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: `A heading is the direction in which a helicopter is pointing, measured clockwise from north, in degrees. North is heading 000, east is heading 090, south is heading 180 and west is heading 270.${MORE}To find a heading from a map, you measure how far the target lies to the east and to the north, and the rule atan(east ÷ north) gives the angle. The rule of Pythagoras gives the distance, and a map’s scale says how many metres one box stands for. Dividing the distance by the speed gives the time the flight will last.`,
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function jobView(base) {
    const hints = [`The smoke is on heading ${three(JOB.headingDeg)}, ${metres(JOB.distanceM)} from the pad.`, `Turn the helicopter until the gauge reads ${three(JOB.headingDeg)}, fly, and stop when the FLOWN panel reads ${metres(JOB.distanceM)}.`,
      'Watch my pointer. I will turn the helicopter and fly the job.'];
    const say = `Your job is to find the smoke. The smoke is on heading ${three(JOB.headingDeg)}, ${metres(JOB.distanceM)} from the pad, and at ${CRUISE_MS} m/s the flight lasts ${JOB.distanceM / CRUISE_MS} seconds. Turn the helicopter to that heading, fly, and stop over the smoke.${MORE}The helicopter counts as over the smoke when it is within ${RING_M} m of it, which is the dashed ring on the map.`;
    if (m.phase === 'turn') return {...base, ...turning({action: 'fly', label: 'Fly', key: 'Space'}, 'fly:best'), say, prompt: turnPrompt(m.heading, JOB.headingDeg, 'fly'), hints};
    if (m.phase === 'auto-turn' || (m.phase === 'auto' && m.auto?.brian)) return {...base, say: `I will turn the helicopter to heading ${three(JOB.headingDeg)}, fly ${metres(JOB.distanceM)} and stop over the smoke.`,
      prompt: 'Watch Brian fly the job.', hints: ['Watch the gauge.', 'Then watch the FLOWN panel.', 'Watch where I stop.']};
    if (m.phase === 'flying') return {...base, keys: {Space: 'fly'}, buttons: [{action: 'fly', label: 'Stop', key: 'Space'}], waiting: true, target: null, say: `Stop when the FLOWN panel reads ${metres(JOB.distanceM)}.`, prompt: 'Stop over the smoke.',
      hints: [hints[0], 'The FLOWN panel on the right counts the metres.', `Stop when the FLOWN panel reads ${metres(JOB.distanceM)}.`]};
    if (m.phase === 'missed') return {...base, ...turning({action: 'fly', label: 'Fly', key: 'Space'}, 'fly:best'), say: m.say, mood: 'explain', prompt: `The gauge reads ${three(m.heading)}. Turn the helicopter if you need to, then fly again.`, hints};
    return {...base, ready: true, mood: 'cheer', say: m.say, prompt: CONTINUE, hints: DONE_HINTS};
  }

  return {enter, act, tick, view, state: () => m};
}

function boxWords(boxes) {
  const whole = Math.floor(boxes), half = boxes - whole >= .5;
  if (whole === 0) return 'half a box';
  const n = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][whole] ?? String(whole);
  return `${n}${half ? ' and a half' : ''} ${whole === 1 && !half ? 'box' : 'boxes'}`;
}

export const lesson = Object.freeze({id: 'headings', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
