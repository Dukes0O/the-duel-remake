// Projectile motion as a classroom lesson (docs/board/cards/LAB-CLASSROOM-PROJECTILE.md, "Claude's script";
// its wording and formulas follow LAB-CLASSROOM-LANGUAGE.md). Teaching state only, no DOM and no saves. Every
// water path and landing comes from waterTrace(), which steps the bucket's own parcels (heli-bucket.js), the ones
// the challenge's buoys are hit by; the stone is the same fall with no air.
import {GRAVITY, HELI_STEP, WATER_TOP_SPEED_MS, stoneDrop, stoneFallAfter, waterTrace} from '../benches/projectile.js';

// Heights in metres above the lake; the run-up before the release post; the lesson buoy's ring; how close a
// flag counts as right; where the board ends.
export const HIGH_M = 30, LOW_M = 10, RUNUP_M = 8, RING_M = 4, CLOSE_M = 2, END_M = 70, FLAG_MAX_M = 45;
export const TOP_FALL_MS = WATER_TOP_SPEED_MS;
// Brian's job: the buoy, the helicopter's speed, and where a release hits the buoy.
export const JOB = Object.freeze({speed: 10, buoyM: 30});
// The free test's dials, and how many tests it asks for before Continue opens.
export const FREE_SPEEDS = Object.freeze([5, 10, 15, 20]), FREE_HEIGHTS = Object.freeze([10, 20, 30, 40]), FREE_TRIES = 3;
const WONDER = Object.freeze({speed: 15, buoyM: 15});
const SETTLE_S = .9, LEAD_S = 1.3, METRES_SECONDS = 3;
const G_SHOWN = 9.8, DRAG_SHOWN = .12, KMH_PER_MS = 3.6;
export const metres = value => `${Math.round(Math.abs(value))} m`;
const tenth = value => (Math.round(value * 10) / 10).toFixed(1);
const hundredth = value => (Math.round(value * 100) / 100).toFixed(2);
const kmh = ms => Math.round(ms * KMH_PER_MS);

// ---- the falls ----
const traces = new Map();
function trace(h, v) {
  const key = `${h}/${v.toFixed(3)}`;
  if (!traces.has(key)) {
    if (traces.size >= 24) traces.delete(traces.keys().next().value);
    traces.set(key, waterTrace(h, v));
  }
  return traces.get(key);
}
// Where a stone or the water lands, released from h metres up at v m/s: metres ahead and seconds.
export function landing(kind, h, v) {
  if (kind === 'stone') { const s = stoneDrop(h, v); return {distanceM: s.distanceM, seconds: s.seconds}; }
  const last = trace(h, v).at(-1);
  return {distanceM: last.distanceM, seconds: last.seconds};
}
// Where a drop is t seconds after its release: metres ahead of the release point, and metres up.
export function dropPoint(kind, h, v, t) {
  if (kind === 'stone') {
    const s = Math.min(Math.max(0, t), stoneDrop(h, v).seconds);
    return {x: v * s, y: Math.max(0, h - GRAVITY * s * s / 2)};
  }
  const rows = trace(h, v), at = Math.min(rows.length - 1, Math.max(0, t / HELI_STEP)), i = Math.floor(at), k = at - i, a = rows[i], b = rows[Math.min(rows.length - 1, i + 1)];
  return {x: a.distanceM + (b.distanceM - a.distanceM) * k, y: a.heightM + (b.heightM - a.heightM) * k};
}
// How fast a drop is moving t seconds after its release: forward and downward, in m/s.
export function dropSpeed(kind, h, v, t) {
  const end = landing(kind, h, v).seconds, s = Math.min(Math.max(0, t), end);
  if (kind === 'stone') return {forward: v, down: GRAVITY * s};
  const span = HELI_STEP * 2, from = Math.max(0, s - span), to = Math.min(end, Math.max(s, span)), a = dropPoint(kind, h, v, from), b = dropPoint(kind, h, v, to), dt = Math.max(1e-6, to - from);
  return {forward: (b.x - a.x) / dt, down: (a.y - b.y) / dt};
}
const water = (v, h = HIGH_M) => landing('water', h, v).distanceM;
export const BEST_LET_GO_M = JOB.buoyM - water(JOB.speed);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did the water miss?'},
  {id: 'word-metres', part: 1, title: 'Metres per second', word: 'projectile-metres-per-second'},
  {id: 'word-gravity', part: 1, title: 'Gravity and acceleration', word: 'projectile-gravity', words: ['projectile-acceleration']},
  {id: 'word-forward-speed', part: 1, title: 'Forward speed', word: 'projectile-forward-speed'},
  {id: 'word-arc', part: 1, title: 'Arc', word: 'projectile-arc'},
  {id: 'watch-water', part: 2, title: 'A stone and water together'},
  {id: 'watch-speeds', part: 2, title: 'Three forward speeds'},
  {id: 'try-free', part: 3, title: 'Test your own settings'},
  {id: 'try-flag', part: 3, title: 'Where will the water land?'},
  {id: 'try-height', part: 3, title: 'Does height matter for water?'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-over', part: 5, title: 'Question 1 of 3'},
  {id: 'check-faster', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.projectile.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'keep', text: 'An object released from a moving helicopter keeps its forward speed, so it lands ahead of the point of release.'},
  {id: 'faster', text: 'Greater forward speed carries an object further. Air friction slows water far more than a stone, so water lands closer to the point of release.'},
  {id: 'early', text: 'In the game, hold H to start pouring before you reach the buoy, and start sooner when you are flying faster.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Release the water before the buoy.', text: 'The bucket is already on the hook. Fill it by lowering it into the lake, then hold H to start pouring before you reach each buoy, because the water keeps moving forward after it is released.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'projectile-metres-per-second', word: 'Metres per second (m/s)', meaning: 'A measure of speed: the number of metres an object travels during each second. To convert m/s to km/h, multiply by 3.6.'},
  {id: 'projectile-gravity', word: 'Gravity', meaning: 'The pull of the Earth that makes objects fall.'},
  {id: 'projectile-acceleration', word: 'Acceleration (m/s²)', meaning: 'How quickly a speed is changing. Gravity accelerates a falling object at 9.8 m/s², which adds 9.8 m/s to its speed during every second of the fall.'},
  {id: 'projectile-forward-speed', word: 'Forward speed', meaning: 'How fast an object is moving along, parallel to the ground, at the moment it is released.'},
  {id: 'projectile-arc', word: 'Arc', meaning: 'The curved path of a falling object that is also moving forward.'},
].map(Object.freeze));

// ---- the helicopters ----
// A run: the helicopter waits at the start, sets off on Space and is at full speed over the post (release, metres).
// A cruising run is at full speed from the start. A hovering one (speed 0) waits over the post.
const heli = (speed, h, {release = 0, loads = ['water'], start = speed ? -RUNUP_M : 0, cruise = false, colour = 0} = {}) =>
  ({speed, h, release, loads, carries: loads.includes('water') ? 'water' : 'stone', start, cruise, colour, x: start, v: cruise ? speed : 0, setAt: null, released: false});
function place(c, now) {
  if (c.setAt == null || !c.speed) return;
  const t = now - c.setAt;
  if (c.cruise) { c.x = c.start + c.speed * t; c.v = c.speed; return; }
  const up = 2 * RUNUP_M / c.speed, a = c.speed * c.speed / (2 * RUNUP_M);
  if (t < up) { c.x = c.start + a * t * t / 2; c.v = a * t; } else { c.x = c.start + RUNUP_M + (t - up) * c.speed; c.v = c.speed; }
}
// The moment the helicopter passed a point, for a release exactly over it.
function passedAt(c, x) {
  if (c.cruise) return c.setAt + (x - c.start) / c.speed;
  const up = 2 * RUNUP_M / c.speed, past = x - (c.start + RUNUP_M);
  return past >= 0 ? c.setAt + up + past / c.speed : c.setAt + Math.sqrt(2 * (x - c.start) / (c.speed * c.speed / (2 * RUNUP_M)));
}

// ---- keys (the screen shows them on its buttons and the board) ----
const FLAG_KEYS = Object.freeze({'←': 'flag:left', '→': 'flag:right', A: 'flag:left', D: 'flag:right'});
const FLAG_REPEAT = Object.freeze(['←', '→', 'A', 'D']);
const PICK_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const SPEED_KEYS = Object.freeze({'←': 'speed:down', '→': 'speed:up'});
const SPEED_BUTTONS = Object.freeze([{action: 'speed:down', label: 'Slower', key: '←'}, {action: 'speed:up', label: 'Faster', key: '→'}]);
const HEIGHT_BUTTONS = Object.freeze([{action: 'height:up', label: 'Higher', key: '↑'}, {action: 'height:down', label: 'Lower', key: '↓'}]);
const HEIGHT_GUESSES = Object.freeze([
  {id: 'further', label: 'Much further', picture: {kind: 'height', move: 'further'}},
  {id: 'same', label: 'About the same distance', picture: {kind: 'height', move: 'same'}},
  {id: 'shorter', label: 'Not as far', picture: {kind: 'height', move: 'shorter'}},
]);
const between = () => `between the ${metres(water(10))} it reached at 10 m/s and the ${metres(water(20))} it reached at 20 m/s`;
const lowHigh = () => `the water from ${LOW_M} m landed ${metres(water(10, LOW_M))} ahead and the water from ${HIGH_M} m landed ${metres(water(10))} ahead`;
const HEIGHT_WHY = 'The higher water does fall for longer, but the friction of the air has already removed nearly all of its forward speed early in the fall, so the extra height adds very little distance.';

const SHOWING = `I will release the water ${metres(water(JOB.speed))} before the buoy.`;
const DONE_HINTS = Object.freeze(['Press R to watch it again.', 'Press Enter to continue.', 'Press Enter to continue.']);
// The miss Brian says on the job, in whole metres: past is plus, short is minus.
const missSaid = (d, end) => Math.round(end.distanceM) - Math.round(JOB.buoyM - d.x0);
// Space sets the helicopter off (or releases the load); the button says which. Brian's pointer may aim at a better press than the key's.
const space = (label, target = 'drop') => ({keys: {Space: 'drop'}, buttons: [{action: 'drop', label, key: 'Space'}], waiting: true, target, glow: target});

// ---- the formulas beside the board (the numbers are the ones on the board now) ----
const speedFormula = v => ({title: 'Speed', formula: 'speed = distance ÷ time', worked: `${v} m ÷ 1 s = ${v} m/s`, note: 'The result is in metres per second, written m/s.'});
const kmhFormula = v => ({title: 'From m/s to km/h', formula: 'km/h = m/s × 3.6', worked: `${v} m/s × 3.6 = ${kmh(v)} km/h`, note: 'An hour has 3,600 seconds and a kilometre has 1,000 metres, and 3,600 ÷ 1,000 = 3.6.'});
const gainFormula = t => ({title: 'Downward speed gained', formula: 'downward speed = g × t', worked: `${G_SHOWN} m/s^2 × ${hundredth(t)} s = ${tenth(G_SHOWN * t)} m/s`, note: 'g is the acceleration caused by gravity. t is the time since the release.'});
const fallFormula = t => ({title: 'Distance fallen', formula: 'distance fallen = ½ × g × t^2', worked: `½ × ${G_SHOWN} m/s^2 × (${hundredth(t)} s)^2 = ${tenth(G_SHOWN * Number(hundredth(t)) ** 2 / 2)} m`});
const timeFormula = h => ({title: 'Time taken to fall', formula: 't = √(2 × h ÷ g)', worked: `√(2 × ${h} m ÷ ${G_SHOWN} m/s^2) = ${hundredth(stoneDrop(h, 0).seconds)} s`, note: 'h is the height. Forward speed does not appear in this formula, so forward speed does not change the time.'});
const forwardFormula = (v, t) => ({title: 'Distance travelled forward', formula: 'distance = forward speed × t', worked: `${v} m/s × ${hundredth(t)} s = ${tenth(v * Number(hundredth(t)))} m`});
const dragFormula = v => ({title: 'How quickly air slows the droplets', formula: 'slowing = 0.12 × speed^2', worked: `${DRAG_SHOWN} × (${v} m/s)^2 = ${tenth(DRAG_SHOWN * v * v)} m/s^2`, note: '0.12 belongs to these small droplets. For a stone the number is so small that we leave it out, which is why the stone’s forward speed stays the same.'});
const topFormula = () => ({title: 'Top falling speed of the droplets', formula: 'top speed = √(g ÷ 0.12)', worked: `√(${G_SHOWN} ÷ 0.12) = ${TOP_FALL_MS} m/s`, note: 'At this speed the air slows a droplet as strongly as gravity speeds it up, so the droplet falls no faster.'});
const ruleFormula = () => ({title: 'For water, the stone’s sum is too big', formula: 'distance < forward speed × t', note: 'The water’s forward speed keeps shrinking, so the water travels less than forward speed × time.'});

// ---- the checks ----
const CHECKS = {
  'check-over': {
    question: 'A helicopter flies at 10 m/s and releases its water directly above the buoy. Where will the water land?',
    answers: [{label: 'Short of the buoy', where: 'short'}, {label: 'On the buoy', where: 'on'}, {label: 'Beyond the buoy', where: 'past'}].map(a => ({...a, picture: {kind: 'landing', where: a.where}})),
    correct: 2, buoy: 20,
    demo: () => [heli(10, HIGH_M, {release: 20, cruise: true, start: -4})],
    right: () => `Correct. The water keeps moving forward after it is released, so it lands ${metres(water(10))} beyond the buoy.`,
    wrong: () => `The water does not fall straight down, because it keeps moving forward after it is released. It lands ${metres(water(10))} beyond the buoy.`,
    hints: ['Think of the stone, which stayed directly below the helicopter as it fell.', 'The water keeps moving forward while it falls.', 'Pick “Beyond the buoy”.'],
  },
  'check-faster': {
    question: 'The helicopter now flies twice as fast, at 20 m/s. Where must it release the water in order to hit the buoy?',
    answers: [{label: 'Further before the buoy', where: 'further'}, {label: 'At the same place as before', where: 'same'}, {label: 'Closer to the buoy', where: 'closer'}].map(a => ({...a, picture: {kind: 'release', where: a.where}})),
    correct: 0, buoy: 36,
    demo: () => [heli(20, HIGH_M, {release: 36 - water(20), cruise: true, start: -8})],
    right: () => `Correct. At 20 m/s the water travels ${metres(water(20))} forward, so the helicopter must release it ${metres(water(20))} before the buoy, which is further back than the ${metres(water(10))} needed at 10 m/s.`,
    wrong: () => `At 20 m/s the water travels ${metres(water(20))} forward rather than ${metres(water(10))}, so the helicopter must release it further back, ${metres(water(20))} before the buoy.`,
    hints: ['Greater forward speed carries the water further.', 'If the water lands further ahead, the helicopter must release it further back.', 'Pick “Further before the buoy”.'],
  },
  'check-game': {
    question: 'In the game you fly towards a buoy with water in the bucket. When should you start pouring so that the water lands on the buoy?',
    answers: [{label: 'When the bucket is directly above the buoy', what: 'over'}, {label: 'Before the bucket reaches the buoy', what: 'before'}, {label: 'After the bucket has passed the buoy', what: 'after'}].map(a => ({...a, picture: {kind: 'game', what: a.what}})),
    correct: 1, buoy: JOB.buoyM,
    demo: () => [heli(JOB.speed, HIGH_M, {release: BEST_LET_GO_M, cruise: true, start: -4})],
    right: () => 'Correct. Hold H to start pouring before you reach the buoy, and start sooner when you are flying faster.',
    wrong: picked => picked === 0 ? 'If you start pouring directly above the buoy, the water keeps moving forward and lands beyond the buoy. Hold H to start pouring before you get there.'
      : 'Water poured after the bucket has passed the buoy keeps moving forward, away from the buoy, so it can only land further beyond it. Hold H to start pouring before you get there.',
    hints: ['Where did the water land when the helicopter released it directly above the buoy?', 'The water keeps moving forward, so you must start before the buoy.', 'Pick “Before the bucket reaches the buoy”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', helis: [], drops: [], marks: [], ghosts: [], flag: null, buoy: null, guess: null, answered: null,
      result: null, say: '', lastLand: null, auto: null, letGo: null, autoStart: null, speed: 10, height: HIGH_M, tries: 0, tested: new Set(), ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.buoy = WONDER.buoyM; m.helis = [heli(WONDER.speed, HIGH_M, {release: WONDER.buoyM, cruise: true, start: -6})]; m.autoStart = .4; }
    if (id === 'word-metres') m.helis = [heli(m.speed, HIGH_M, {release: null, loads: []})];
    if (id === 'word-gravity') m.helis = [heli(0, HIGH_M, {release: null, loads: ['stone']})];
    if (id === 'word-forward-speed') m.helis = [heli(10, HIGH_M, {loads: ['stone']})];
    if (id === 'word-arc') { m.helis = [heli(20, HIGH_M, {loads: ['stone']})]; m.ghosts = [{kind: 'stone', h: HIGH_M, v: 10, x0: 0, label: '10 m/s'}]; }
    if (id === 'watch-water') { m.helis = [heli(10, HIGH_M, {loads: ['stone', 'water']})]; m.autoStart = .6; }
    if (id === 'watch-speeds') { m.helis = [5, 10, 20].map((s, i) => heli(s, HIGH_M, {cruise: true, start: -s * LEAD_S, colour: i})); m.autoStart = .3; }
    if (id === 'try-free') { m.phase = 'set'; m.helis = [heli(m.speed, m.height, {loads: ['stone']})]; }
    if (id === 'try-flag') { m.phase = 'flag'; m.flag ??= 0; m.helis = [heli(15, HIGH_M)]; }
    if (id === 'try-height') { m.phase = m.guess ? 'ready' : 'guess'; m.helis = [heli(10, LOW_M, {colour: 1}), heli(10, HIGH_M, {colour: 2})]; }
    if (id === 'alone') { m.buoy = JOB.buoyM; m.helis = [heli(JOB.speed, HIGH_M, {release: null})]; }
    if (CHECKS[id]) { m.phase = m.answered === null ? 'ask' : 'answered'; m.buoy = CHECKS[id].buoy; m.helis = CHECKS[id].demo(); }
  }

  function setOff() { for (const c of m.helis) if (c.setAt == null) c.setAt = m.time; }
  function letGo(c, at = m.time) {
    if (c.released) return;
    c.released = true;
    const x0 = c.x - c.v * (m.time - at);
    m.letGo = x0;
    for (const kind of c.loads) m.drops.push({kind, h: c.h, v: c.v, x0, at, t: m.time - at, colour: c.colour, landed: false});
  }
  const stepThrough = (list, now, way) => list[Math.max(0, Math.min(list.length - 1, list.indexOf(now) + (way === 'up' ? 1 : -1)))];

  function act(action) {
    const id = step().id, [kind, value] = action.split(':');
    if (kind === 'replay') return replay();
    if (id === 'word-metres') {
      if (m.phase === 'running') return null;
      if (kind === 'speed') {
        const speed = stepThrough(FREE_SPEEDS, m.speed, value);
        if (speed === m.speed) return {kind: 'note', say: `${speed} m/s is ${value === 'up' ? 'the fastest' : 'the slowest'} setting for this test.`};
        enter(m.index, {speed});
        return {kind: 'progress', sound: 'lab.tick', say: `The helicopter is now set to ${speed} m/s, which is the same as ${kmh(speed)} km/h. Press Space to watch it fly at that speed.`};
      }
      if (kind !== 'drop') return null;
      enter(m.index, {speed: m.speed});
      m.phase = 'running'; setOff();
      return {kind: 'progress', say: 'Watch the marks along the top of the picture. A new mark appears at the end of each second.'};
    }
    if (id.startsWith('word-')) {
      if (kind !== 'drop' || m.phase !== 'ready') return null;
      m.phase = 'running';
      if (id === 'word-gravity') { letGo(m.helis[0]); return {kind: 'progress', say: 'Watch the stone and the marks beside it. Each mark shows where the stone was at the end of a second.'}; }
      setOff();
      return {kind: 'progress', say: 'Watch the stone. The helicopter will release it directly above the post.'};
    }
    if (id === 'try-free') {
      if (m.phase !== 'set') return null;
      if (kind === 'speed' || kind === 'height') {
        const before = kind === 'speed' ? m.speed : m.height, after = kind === 'speed' ? stepThrough(FREE_SPEEDS, m.speed, value) : stepThrough(FREE_HEIGHTS, m.height, value);
        if (after === before) return {kind: 'note', say: kind === 'speed' ? `${after} m/s is ${value === 'up' ? 'the fastest' : 'the slowest'} setting for this test.` : `${after} m is ${value === 'up' ? 'the greatest' : 'the smallest'} height for this test.`};
        if (kind === 'speed') m.speed = after; else m.height = after;
        m.helis = [heli(m.speed, m.height, {loads: ['stone']})];
        return {kind: 'progress', sound: 'lab.tick', say: `The helicopter is now set to ${m.height} m above the lake at ${m.speed} m/s. Use the formulas to work out where the stone should land, then press Space to test your answer.`};
      }
      if (kind !== 'drop') return null;
      // Show me moves on to a speed that has not been tested at this height yet.
      if (value === 'best' && m.tested.has(`${m.height}/${m.speed}`)) {
        const fresh = FREE_SPEEDS.find(speed => !m.tested.has(`${m.height}/${speed}`)) ?? m.speed;
        m.speed = fresh; m.helis = [heli(m.speed, m.height, {loads: ['stone']})];
      }
      m.phase = 'running'; setOff();
      return {kind: 'progress', say: 'Watch the stone. The helicopter will release it directly above the post.'};
    }
    if (id === 'try-flag') {
      if (m.phase !== 'flag') return null;
      if (kind === 'flag') { m.flag = Math.max(0, Math.min(FLAG_MAX_M, m.flag + (value === 'left' ? -1 : 1))); return null; }
      if (kind === 'hold') { const at = Math.round(Number(value)); if (Number.isFinite(at)) m.flag = Math.max(0, Math.min(FLAG_MAX_M, at)); return null; }
      if (kind !== 'drop') return null;
      m.phase = 'running'; setOff();
      return {kind: 'progress', say: `Your flag is ${metres(m.flag)} from the post. Watch where the water lands.`};
    }
    if (id === 'try-height') {
      if (m.phase === 'guess' && kind === 'answer' && HEIGHT_GUESSES[Number(value)]) { m.guess = HEIGHT_GUESSES[Number(value)].id; m.phase = 'ready'; return {kind: 'progress', say: 'Now let both helicopters release their water, and compare the two splashes.'}; }
      if (m.phase === 'ready' && kind === 'drop') { m.phase = 'running'; setOff(); return {kind: 'progress', say: 'Watch both splashes.'}; }
      return null;
    }
    if (id === 'alone') return jobAct(kind, value);
    if (CHECKS[id] && kind === 'answer' && m.phase === 'ask') {
      const check = CHECKS[id], picked = Number(value);
      if (!check.answers[picked]) return null;
      m.answered = picked; m.phase = 'answered'; seen.add(id);
      setOff();
      return picked === check.correct ? {kind: 'right', say: check.right()} : {kind: 'wrong', say: check.wrong(picked)};
    }
    return null;
  }

  // Brian's job. Space sets the helicopter off and Space again releases the water; Show me (drop:best) flies a run
  // and releases at the right place, from wherever the helicopter is: past that place, it comes round and he starts again.
  const home = () => Object.assign(m.helis[0], heli(JOB.speed, HIGH_M, {release: null}));
  function jobAct(kind, value) {
    const c = m.helis[0], best = value === 'best';
    if (kind !== 'drop' || m.phase === 'falling' || m.phase === 'done') return null;
    if (m.phase === 'flying') {
      if (m.auto != null) return null; // Brian is flying this run.
      if (best && c.x < BEST_LET_GO_M) { m.auto = BEST_LET_GO_M; return {kind: 'progress', say: SHOWING}; }
      if (!best && c.x < 0) return {kind: 'progress', say: `Not yet, because the helicopter is still speeding up. Wait until it has passed the ${JOB.buoyM} mark on the water.`};
      if (!best) { letGo(c); m.phase = 'falling'; return {kind: 'progress', say: 'Watch where the water lands.'}; }
    }
    // Ready, going round again after a miss, or Show me too late in a run: from the start and away.
    home(); m.drops = [];
    m.phase = 'flying'; m.auto = best ? BEST_LET_GO_M : null; setOff();
    return {kind: 'progress', say: best ? SHOWING : 'Press Space to release the water before the helicopter reaches the buoy.'};
  }

  function tick(dt) {
    m.time += dt;
    const id = step().id;
    if (m.autoStart != null && m.time >= m.autoStart) { m.autoStart = null; setOff(); }
    let out = null;
    for (const c of m.helis) {
      place(c, m.time);
      if (!c.released && c.release != null && c.setAt != null && c.x >= c.release) letGo(c, passedAt(c, c.release));
      if (id === 'alone' && m.phase === 'flying' && m.auto != null && c.x >= m.auto) { letGo(c, passedAt(c, m.auto)); m.phase = 'falling'; m.auto = null; }
    }
    if (id === 'word-metres' && m.phase === 'running' && m.helis[0].x >= m.speed * METRES_SECONDS) { const e = finish(id); m.say = e.say; return e; }
    for (const d of m.drops) {
      if (d.landed) continue;
      d.t = m.time - d.at;
      const end = landing(d.kind, d.h, d.v);
      if (d.t >= end.seconds) { d.landed = true; m.lastLand = m.time; m.marks.push({...markOf(id, d, end), at: m.time}); out ??= {kind: 'sound', sound: 'lab.splash'}; if (id === 'alone') return {...judge(d, end), sound: 'lab.splash'}; }
    }
    if (id === 'alone' && m.phase === 'flying' && m.helis[0].x > END_M) {
      m.phase = 'missed'; home();
      return {kind: 'fail', say: 'The helicopter flew past the buoy without releasing any water. Press Space to go round again, and release the water before the buoy.'};
    }
    if (id === 'wonder') {
      if (m.lastLand != null && m.time - m.lastLand >= 1) seen.add(id);
      if (m.lastLand != null && m.time - m.lastLand >= 2.8) enter(m.index);
      return out;
    }
    const settled = m.drops.length > 0 && m.drops.every(d => d.landed) && m.helis.every(c => c.released || c.release == null) && m.time - m.lastLand >= SETTLE_S;
    if (settled && m.phase === 'running') { const e = finish(id); if (e) m.say = e.say; return e ?? out; }
    if (settled && (id === 'watch-water' || id === 'watch-speeds')) seen.add(id);
    return out;
  }

  function markOf(id, d, end) {
    const x = d.x0 + end.distanceM;
    if (id === 'wonder' || id === 'check-over' || id === 'check-game' || id === 'check-faster') {
      const off = x - m.buoy;
      return {kind: d.kind, x, colour: d.colour, label: Math.abs(off) <= RING_M ? 'on the buoy' : `${metres(off)} ${off > 0 ? 'beyond' : 'short'}`};
    }
    if (id === 'alone') { const said = missSaid(d, end); return {kind: d.kind, x, colour: d.colour, label: Math.abs(said) <= RING_M ? 'hit!' : `${metres(said)} ${said > 0 ? 'beyond' : 'short'}`}; }
    return {kind: d.kind, x, colour: d.colour, label: metres(end.distanceM)};
  }

  function finish(id) {
    m.phase = 'result';
    if (id !== 'try-free') seen.add(id);
    const stone = landing('stone', HIGH_M, m.helis[0].speed);
    if (id === 'word-metres') return {kind: 'right', say: `The helicopter travelled ${m.speed} metres during each second, so its speed was ${m.speed} m/s. Speeds on the road are usually given in kilometres per hour, which is written km/h. An hour has 3,600 seconds and a kilometre has 1,000 metres, so you convert m/s to km/h by multiplying by 3,600 and dividing by 1,000, which is the same as multiplying by 3.6. That makes ${m.speed} m/s the same as ${kmh(m.speed)} km/h. You can try another speed, or press Enter to continue.`};
    if (id === 'word-gravity') {
      const one = stoneFallAfter(1), two = stoneFallAfter(2);
      return {kind: 'right', say: `The stone fell ${tenth(one)} m during the first second and ${tenth(two - one)} m during the next second, because by then it was moving faster. It reached the water after ${tenth(stone.seconds)} s, moving at about ${Math.round(GRAVITY * stone.seconds)} m/s. This shows the difference between the two units: m/s tells you how fast an object is moving at one moment, and m/s² tells you how quickly that speed is changing.`};
    }
    if (id === 'word-forward-speed') return {kind: 'right', say: `The forward arrow stayed the same length, because nothing pushes the stone forward and the air barely holds it back. The stone therefore travelled 10 metres forward during every second, while the downward arrow kept growing. The fall took ${tenth(stone.seconds)} s, so the stone landed ${metres(stone.distanceM)} ahead of the post, and it stayed directly below the helicopter all the way down.`};
    if (id === 'word-arc') return {kind: 'right', say: `At 20 m/s the stone landed ${metres(stone.distanceM)} ahead of the post, about twice as far as the ${metres(landing('stone', HIGH_M, 10).distanceM)} it travelled at 10 m/s. The fall lasted the same ${tenth(stone.seconds)} s, because forward speed has no effect on how long a stone takes to fall. Twice the forward speed for the same time gives twice the distance.`};
    if (id === 'try-free') {
      const end = landing('stone', m.height, m.speed);
      m.tested.add(`${m.height}/${m.speed}`); m.tries = m.tested.size;
      m.ghosts = [...m.ghosts.slice(-3), {kind: 'stone', h: m.height, v: m.speed, x0: 0, label: `${m.height} m, ${m.speed} m/s`}];
      if (m.tries >= FREE_TRIES) seen.add(id);
      m.helis = [heli(m.speed, m.height, {loads: ['stone']})]; m.drops = []; m.marks = []; m.phase = 'set';
      const told = `From ${m.height} m at ${m.speed} m/s, the stone fell for ${tenth(end.seconds)} s and landed ${metres(end.distanceM)} ahead of the post.`;
      return {kind: 'right', say: m.tries >= FREE_TRIES ? `${told} Your earlier arcs remain on the picture so that you can compare them. Press Enter when you have tested enough settings.` : `${told} Change the height or the speed and test a different setting. Your earlier arc stays on the picture.`};
    }
    if (id === 'try-flag') {
      // Judged in the whole metres the board and Brian show: the flag is on a whole metre.
      const where = water(15), off = Math.round(where) - m.flag;
      m.result = {right: Math.abs(off) <= CLOSE_M};
      if (m.result.right) return {kind: 'right', say: `Well judged. The water landed ${metres(where)} ahead of the post, ${off === 0 ? 'right beside your flag' : `${metres(off)} from your flag`}.`};
      return {kind: 'wrong', say: off > 0 ? `The water landed ${metres(where)} ahead of the post, which is ${metres(off)} beyond your flag. At 15 m/s the water travels further than your flag suggests, and it landed ${between()}.`
        : `The water landed ${metres(where)} ahead of the post, which is ${metres(off)} short of your flag. The friction of the air slows the water, so it lands well short of where a stone would, ${between()}.`};
    }
    if (id === 'try-height') {
      m.result = {right: m.guess === 'same'};
      if (m.result.right) return {kind: 'right', say: `Correct: ${lowHigh()}. ${HEIGHT_WHY}`};
      return {kind: 'wrong', say: m.guess === 'further' ? `The higher water landed only a little further: ${lowHigh()}. ${HEIGHT_WHY}`
        : `The higher water did not land any closer: ${lowHigh()}. ${HEIGHT_WHY}`};
    }
    return null;
  }

  // Brian's job: the splash is inside the buoy's ring, or Brian says what to change, with the numbers.
  function judge(d, end) {
    const e = judgeSay(d, end);
    m.say = e.say;
    return e;
  }
  function judgeSay(d, end) {
    // Judged on the numbers Brian says, which add up: metres before the buoy, plus the miss, make the metres the water travelled.
    const before = Math.round(m.buoy - d.x0), ahead = metres(end.distanceM), said = missSaid(d, end), little = Math.abs(said) <= 8 ? ' a little' : '';
    if (Math.abs(said) <= RING_M) {
      m.phase = 'done'; seen.add('alone');
      return {kind: 'pass', say: `The water hit the buoy. You released it ${metres(before)} before the buoy, and it travelled ${ahead} forward as it fell. That finishes the job.`};
    }
    // The helicopter comes round to the start, ready for another go.
    m.phase = 'missed'; home();
    if (before <= 0) return {kind: 'fail', say: `You released the water ${before < 0 ? 'after passing the buoy' : 'directly above the buoy'}. The water keeps moving forward and travels ${ahead} after its release, so it landed ${metres(said)} beyond the buoy. Release it ${ahead} before the buoy. Press Space to go round again.`};
    if (said > 0) return {kind: 'fail', say: `You released the water ${metres(before)} before the buoy, but water at this speed travels ${ahead} forward, so it landed ${metres(said)} beyond the buoy. Release it${little} sooner. Press Space to go round again.`};
    return {kind: 'fail', say: `You released the water ${metres(before)} before the buoy, but water at this speed travels only ${ahead} forward, so it landed ${metres(said)} short of the buoy. Release it${little} later. Press Space to go round again.`};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch-water' || id === 'watch-speeds') { enter(m.index); return null; }
    if (id === 'word-metres' && m.phase === 'result') return act('drop');
    if ((id.startsWith('word-') || id === 'try-flag' || id === 'try-height') && m.phase === 'result') {
      const keep = {flag: m.flag, guess: m.guess, result: m.result};
      enter(m.index, keep); m.phase = 'running'; if (id === 'word-gravity') letGo(m.helis[0]); else setOff();
      return null;
    }
    if (CHECKS[id] && m.phase === 'answered') { enter(m.index, {answered: m.answered}); setOff(); return null; }
    return null;
  }

  function drawn() {
    return {helis: m.helis.map(c => ({x: c.x, h: c.h, speed: c.speed, v: c.v, loads: c.released ? [] : c.loads, carries: c.carries, colour: c.colour, set: c.setAt != null, dim: c.released && m.helis.length > 1})),
      drops: m.drops.map(d => ({...d})), marks: m.marks.map(k => ({...k, age: m.time - k.at})), ghosts: m.ghosts};
  }

  // The first drop's time in the air, stopping at its landing.
  const airTime = () => { const d = m.drops[0]; return d ? Math.min(d.t, landing(d.kind, d.h, d.v).seconds) : 0; };

  function formulas(id) {
    const c = m.helis[0], t = airTime();
    if (id === 'word-metres') return [speedFormula(m.speed), kmhFormula(m.speed)];
    if (id === 'word-gravity') return [gainFormula(t), fallFormula(t), timeFormula(HIGH_M)];
    if (id === 'word-forward-speed' || id === 'word-arc') return [forwardFormula(c.speed, m.drops.length ? t : landing('stone', HIGH_M, c.speed).seconds), timeFormula(HIGH_M), gainFormula(t)];
    if (id === 'watch-water') {
      const stone = m.drops.find(d => d.kind === 'stone'), drop = m.drops.find(d => d.kind === 'water');
      const now = d => d ? dropSpeed(d.kind, d.h, d.v, d.t).forward : 10;
      return [{title: 'Forward speed at this moment', worked: `Stone ${tenth(now(stone))} m/s, water ${tenth(now(drop))} m/s`}, dragFormula(Math.max(1, Math.round(now(drop)))), topFormula(), ruleFormula()];
    }
    if (id === 'watch-speeds') return [dragFormula(5), dragFormula(20), ruleFormula()];
    if (id === 'try-free') return [timeFormula(m.height), forwardFormula(m.speed, landing('stone', m.height, m.speed).seconds), kmhFormula(m.speed)];
    if (id === 'try-flag' && m.phase === 'running') return [ruleFormula()];
    if (id === 'try-flag') return [{title: 'For a stone, with no air friction', formula: 'distance = forward speed × t', worked: `15 m/s × ${hundredth(landing('stone', HIGH_M, 15).seconds)} s = ${tenth(landing('stone', HIGH_M, 15).distanceM)} m`}, ruleFormula(), {title: 'What the water has done so far', worked: `10 m/s: ${metres(water(10))}, 20 m/s: ${metres(water(20))}`}];
    // Nothing here settles the guess or the question that is open: the landings come only once it is answered.
    if (id === 'try-height' && m.phase !== 'result') return [dragFormula(10), ruleFormula()];
    if (CHECKS[id] && m.answered === null) return [ruleFormula()];
    if (id === 'try-height' || id === 'alone' || CHECKS[id]) return [{title: 'Water released at 10 m/s, from 30 m', worked: `travels ${metres(water(10))} forward`}, {title: 'Water released at 20 m/s, from 30 m', worked: `travels ${metres(water(20))} forward`}, ruleFormula()];
    if (id === 'recap') return [gainFormula(1), timeFormula(HIGH_M), forwardFormula(10, stoneDrop(HIGH_M, 0).seconds), dragFormula(10), topFormula()];
    return [];
  }
  // Second by second along the top of the picture: where the object has reached, at its forward speed.
  function scale(id) {
    if (id === 'word-metres') { const c = m.helis[0]; return c.setAt == null ? null : {x0: 0, v: m.speed, t: Math.max(0, m.time - passedAt(c, 0)), end: null, upTo: METRES_SECONDS}; }
    if (id !== 'word-forward-speed' && id !== 'word-arc') return null;
    const d = m.drops[0];
    return d ? {x0: d.x0, v: d.v, t: d.t, end: landing(d.kind, d.h, d.v).seconds, dots: true, h: d.h} : null;
  }

  function view() {
    const id = step().id;
    const base = {scene: 'lake', time: m.time, ...drawn(), flag: m.flag, buoy: m.buoy, ruler: 'post', post: true, letGo: null, clock: false, fallMarks: false, arrows: false, scale: scale(id),
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), table: null, formulas: formulas(id)};
    if (id === 'wonder') return {...base, post: false, ruler: null, letGo: WONDER.buoyM, actions: ['replay'],
      say: `Our helicopter, Kestrel One, released its water directly above the buoy, but the water landed ${metres(water(WONDER.speed))} beyond the buoy. Why did the water miss, when the helicopter was right above the buoy at the moment of release?`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out why, or press R to watch again.' : 'Watch the water.',
      hints: ['Watch where the water goes after the helicopter releases it.', 'The water keeps moving forward while it falls.', 'Press Enter when you are ready to find out why.']};
    if (id === 'word-metres') {
      const running = m.phase === 'running';
      return {...base, keys: running ? {} : {...SPEED_KEYS, Space: 'drop'}, buttons: running ? [] : [...SPEED_BUTTONS, {action: 'drop', label: 'Fly', key: 'Space'}], waiting: m.phase === 'ready', target: running ? null : 'drop', glow: running ? null : 'drop',
        say: m.phase === 'result' ? m.say : 'Before we can explain the miss, we need a way to measure speed. Speed is the distance an object travels in a certain amount of time. In this lesson we measure speed in metres per second, which is written m/s. An object moving at 10 m/s travels 10 metres during every second. Choose a speed for the helicopter with ← and →, then press Space and watch the marks appear along the top of the picture, one for each second.',
        prompt: running ? 'Watch the marks along the top of the picture.' : m.phase === 'result' ? 'Press Enter to continue, or choose another speed with ← and → and press Space.' : 'Choose a speed with ← and →, then press Space to fly.',
        hints: running ? ['Watch the marks appear.', 'Count the metres between two marks.', 'Wait a moment.'] : ['The helicopter waits on the left. Space sets it off.', 'Press Space, or click the helicopter.', 'Watch my pointer, which is on the helicopter.']};
    }
    if (id.startsWith('word-')) {
      const ready = m.phase === 'ready';
      const say = {
        'word-gravity': `Gravity is the pull of the Earth that makes objects fall. Gravity does not give a falling object one steady speed. Instead, it adds 9.8 m/s to the object’s downward speed during every second of the fall. A steady gain in speed like this is called acceleration, and we write it as 9.8 m/s², which is read as “metres per second, per second”. The helicopter is now hovering ${HIGH_M} m above the lake with a stone hanging from its hook. Release the stone and watch how far it falls during each second.`,
        'word-forward-speed': 'Forward speed is how fast an object is moving along, parallel to the ground, at the moment it is released. The helicopter will now fly at 10 m/s and release the stone directly above the post. The stone is already moving forward with the helicopter, so it does not stop moving forward when it is released. Watch the two arrows on the stone as it falls: one shows its forward speed and the other shows its downward speed.',
        'word-arc': 'The curved path of an object that falls while moving forward is called an arc. The path is curved because the forward speed stays the same while the downward speed keeps growing. The faint arc shows the path of the stone at 10 m/s. Now the helicopter will fly twice as fast, at 20 m/s, from the same height.',
      }[id];
      return {...base, post: id !== 'word-gravity', clock: id === 'word-gravity', fallMarks: id === 'word-gravity', arrows: true, underHelicopter: id === 'word-forward-speed', actions: m.phase === 'result' ? ['replay', 'slow'] : ['slow'],
        ...(ready ? space(id === 'word-gravity' ? 'Release' : 'Fly') : {}), say: m.phase === 'result' ? m.say : say,
        prompt: ready ? (id === 'word-gravity' ? 'Release the stone: press Space, or click it.' : 'Press Space to set the helicopter off. It will release the stone above the post.')
          : m.phase === 'running' ? 'Watch the stone.' : 'Press Enter to continue, or press R to watch again.',
        hints: m.phase === 'running' ? ['Watch the stone.', 'Watch the marks beside the stone.', 'Wait a moment.'] : !ready ? DONE_HINTS : id === 'word-gravity' ? ['The stone hangs from the hook.', 'Press Space, or click the stone.', 'Watch my pointer, which is on the stone.']
          : ['The helicopter waits on the left. Space sets it off.', 'Press Space, or click the helicopter.', 'Watch my pointer, which is on the helicopter.']};
    }
    if (id === 'watch-water' || id === 'watch-speeds') {
      const done = seen.has(id), marks = m.marks;
      const table = id === 'watch-water'
        ? [{label: 'The stone landed', value: marks.find(k => k.kind === 'stone')?.label ? `${marks.find(k => k.kind === 'stone').label} ahead` : null},
          {label: 'The water landed', value: marks.find(k => k.kind === 'water')?.label ? `${marks.find(k => k.kind === 'water').label} ahead` : null},
          {label: 'Top falling speed of water', value: done ? `${TOP_FALL_MS} m/s` : null}]
        : [5, 10, 20].map((s, i) => ({label: `${s} m/s (${kmh(s)} km/h)`, value: marks.find(k => k.colour === i)?.label ?? null, colour: i}));
      return {...base, actions: ['replay', 'slow'], table, clock: id === 'watch-speeds', arrows: id === 'watch-water',
        say: id === 'watch-water'
          ? (done ? `The stone landed ${metres(landing('stone', HIGH_M, 10).distanceM)} ahead of the post, but the water landed only ${metres(water(10))} ahead. The air causes the difference. Water leaving the bucket breaks up into small droplets, and a small droplet is very light for the amount of air it has to push aside. The friction of the air against the droplets therefore slows them quickly, and in the first second they lose more than half of their forward speed. The same friction stops the droplets from ever falling faster than ${TOP_FALL_MS} m/s. A stone is heavy for its size, so the air hardly slows it. The water still lands ahead of the release point, because it keeps moving forward until the air has slowed it.`
            : 'So far we have dropped a stone, and the air has barely affected it. Now the helicopter will fly at 10 m/s and release a stone and some water at the same moment. Watch the forward arrow on each one, and see which lands further ahead.')
          : (done ? `Forward speed determines how far ahead the water lands. It landed ${metres(water(5))} ahead at 5 m/s, ${metres(water(10))} ahead at 10 m/s and ${metres(water(20))} ahead at 20 m/s. Doubling the speed from 10 to 20 m/s does not double the distance, because the friction of the air grows quickly with speed and slows the faster water harder. All three splashes arrived at nearly the same moment, because forward speed has little effect on how long the fall takes. Height and gravity determine that.`
            : 'Three helicopters will now release water at the same moment while flying at 5, 10 and 20 m/s. Watch where each splash lands, and when it lands.'),
        prompt: done ? 'Press Enter to continue, or press R to watch again.' : 'Watch the splashes.',
        hints: id === 'watch-water' ? ['Watch the grey stone and the blue water.', 'The air slows the water, but hardly slows the stone.', 'Press R to watch again.']
          : ['Watch the three splashes.', 'The fastest helicopter’s water lands furthest ahead.', 'Press R to watch again.']};
    }
    if (id === 'try-free') {
      if (m.phase === 'running') return {...base, arrows: true, actions: ['slow'], say: 'Watch the stone. The helicopter will release it directly above the post.', prompt: 'Watch the stone.', hints: ['Watch the stone.', 'Compare this arc with the earlier ones.', 'Wait a moment.']};
      return {...base, keys: {...SPEED_KEYS, '↑': 'height:up', '↓': 'height:down', Space: 'drop'}, buttons: [...SPEED_BUTTONS, ...HEIGHT_BUTTONS, {action: 'drop', label: 'Fly and release', key: 'Space'}], waiting: !seen.has(id), target: 'drop:best', glow: 'drop',
        say: m.say || `Now you can experiment with a stone. Press ← and → to change the forward speed, and ↑ and ↓ to change the height. The formulas beside the picture change as you change the settings, so you can work out where the stone should land before you release it. Test at least ${FREE_TRIES} different settings and compare their arcs.`,
        prompt: seen.has(id) ? 'Press Enter to continue, or test another setting.' : `Change the settings, then press Space to test them. Different settings tested so far: ${m.tries} of ${FREE_TRIES}.`,
        hints: ['Press Space to test the settings as they are.', 'A greater height means a longer fall, and so a longer distance. Which change makes the stone land furthest?', 'Watch my pointer. I will choose a speed you have not tested yet, and release the stone.']};
    }
    if (id === 'try-flag') {
      if (m.phase === 'flag') return {...base, keys: {...FLAG_KEYS, Space: 'drop'}, repeat: FLAG_REPEAT, buttons: [{action: 'drop', label: 'Release', key: 'Space'}], waiting: true, target: 'drop', glow: 'flag', dragFlag: true,
        say: `It is your turn to predict. The helicopter will fly at 15 m/s, ${HIGH_M} m above the lake, and release water directly above the post. Where do you think the water will land? Put the flag on that spot.`,
        prompt: 'Move the flag with ← and → (or drag it along the water), then press Space to release the water.',
        hints: [`At 10 m/s the water landed ${metres(water(10))} ahead of the post, and at 20 m/s it landed ${metres(water(20))} ahead. This helicopter is flying at 15 m/s.`, 'The answer lies somewhere between those two distances. Move the flag, then press Space.', 'Any guess is fine. Watch my pointer, and I will release the water.']};
      if (m.phase === 'running') return {...base, say: `Your flag is ${metres(m.flag)} from the post. Watch where the water lands.`, prompt: 'Watch the water.', hints: ['Watch the water.', 'Watch the flag.', 'Wait a moment.']};
      return {...base, actions: ['replay'], mood: m.result.right ? 'cheer' : 'explain', say: m.say,
        prompt: 'Press Enter to continue, or press R to watch again.', hints: DONE_HINTS};
    }
    if (id === 'try-height') {
      const cards = HEIGHT_GUESSES.map((g, i) => ({id: `answer:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: m.phase !== 'result' ? null : g.id === 'same' ? 'right' : g.id === m.guess ? 'wrong' : null}));
      const question = `Two helicopters fly at 10 m/s and release water directly above the post. One is ${LOW_M} m above the lake and the other is ${HIGH_M} m above the lake. How far ahead will the water from the higher helicopter land, compared with the water from the lower one?`;
      if (m.phase === 'guess') return {...base, keys: PICK_KEYS, waiting: true, cards, say: question, prompt: 'Pick a card: click it, or press 1, 2 or 3.',
        hints: ['Remember the stone and the water: the air slows the water.', 'The higher water falls for longer. Is it still moving forward during all of that time?', 'Any guess is fine. Pick one, and then we will test it.']};
      if (m.phase === 'ready') return {...base, ...space('Release'), cards: [], say: 'Now let both helicopters release their water, and compare the two splashes.', prompt: 'Press Space: both helicopters will release their water above the post.',
        hints: ['Space sets both helicopters off.', 'Press Space, or click a helicopter.', 'Watch my pointer, which is on the helicopter.']};
      if (m.phase === 'running') return {...base, say: 'Watch both splashes.', prompt: 'Watch the two splashes.', hints: ['Watch the two splashes.', 'Which one lands further ahead?', 'Wait a moment.']};
      return {...base, cards, actions: ['replay'], mood: m.result.right ? 'cheer' : 'explain', say: m.say,
        prompt: 'Press Enter to continue, or press R to watch again.', hints: DONE_HINTS};
    }
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, ruler: null, post: false, keys: answered ? {} : PICK_KEYS, actions: answered ? ['replay'] : [], waiting: !answered,
        letGo: answered && id !== 'check-over' ? m.helis[0].release : null, ghostLetGo: answered && id === 'check-faster' ? check.buoy - water(10) : null,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to continue, or press R to watch again.' : 'Pick a picture: click it, or press 1, 2 or 3.', hints: answered ? DONE_HINTS : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'An object dropped from a moving helicopter keeps moving forward at the speed it had when it was released, so it lands ahead of the place where it was released. At the same time, gravity pulls the object downward, and its downward speed grows by 9.8 m/s during every second of the fall. The air slows a spray of water far more than it slows a stone, so the water does not travel as far forward and lands closer to the point of release than the stone does.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function jobView(base) {
    const common = {...base, ruler: 'buoy', post: false, letGo: m.phase === 'missed' || m.phase === 'done' || m.phase === 'falling' ? m.letGo : null};
    const hints = [`At 10 m/s the water travels ${metres(water(JOB.speed))} forward after its release.`, `So release the water when the bucket is ${metres(water(JOB.speed))} before the buoy, which is the ${Math.round(water(JOB.speed))} mark on the water.`,
      'Watch my pointer. I will fly the helicopter and release the water at the right place.'];
    if (m.phase === 'ready') return {...common, ...space('Fly', 'drop:best'),
      say: `Here is a job for you: hit the buoy with the water. The helicopter flies at ${JOB.speed} m/s, ${HIGH_M} m above the lake, and you choose the moment to release the water. The water must land inside the ring around the buoy. The numbers on the water show how many metres remain before the buoy.`,
      prompt: 'Press Space to set off, then press Space again to release the water.', hints};
    if (m.phase === 'flying' && m.auto != null) return {...common, say: SHOWING, prompt: 'Watch Brian release the water.', hints: ['Watch where I release the water.', `I will release it ${metres(water(JOB.speed))} before the buoy.`, 'Watch the water.']};
    if (m.phase === 'flying') return {...common, keys: {Space: 'drop'}, buttons: [{action: 'drop', label: 'Release', key: 'Space'}], waiting: true, target: 'drop:best',
      say: 'Press Space to release the water before the helicopter reaches the buoy.', prompt: 'Press Space to release the water.', hints};
    if (m.phase === 'falling') return {...common, say: 'Watch where the water lands.', prompt: 'Watch the water.', hints};
    if (m.phase === 'missed') return {...common, ...space('Go round again', 'drop:best'),
      say: 'Have another go.', prompt: 'Press Space to go round again.', hints};
    return {...common, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to continue.', hints: ['Press Enter to continue.', 'Press Enter to continue.', 'Press Enter to continue.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'projectile', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
