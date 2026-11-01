// Projectile motion as a classroom lesson (docs/board/cards/LAB-CLASSROOM-PROJECTILE.md, "Claude's script").
// Teaching state only, no DOM and no saves. Every water path and landing comes from waterTrace(), which steps
// the bucket's own parcels (heli-bucket.js), the ones the challenge's buoys are hit by; the stone is the same
// fall with no air.
import {GRAVITY, HELI_STEP} from '../../heli/heli-flight.js';
import {BUCKET} from '../../heli/heli-bucket.js';
import {stoneDrop, stoneFallAfter, waterTrace} from '../benches/projectile.js';

// Heights in metres above the lake; the run-up before the let-go post; the lesson buoy's ring; how close a
// flag counts as right; where the board ends.
export const HIGH_M = 30, LOW_M = 10, RUNUP_M = 8, RING_M = 4, CLOSE_M = 2, END_M = 70, FLAG_MAX_M = 45;
export const TOP_FALL_MS = BUCKET.fallSpeed;
// Brian's job: the buoy, how fast she flies, and where letting go hits it.
export const JOB = Object.freeze({speed: 10, buoyM: 30});
const WONDER = Object.freeze({speed: 15, buoyM: 15});
const SETTLE_S = .9, LEAD_S = 1.3;
export const metres = value => `${Math.round(Math.abs(value))} m`;

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
// Where a stone or the water lands, let go from h metres up at v m/s: metres ahead and seconds.
export function landing(kind, h, v) {
  if (kind === 'stone') { const s = stoneDrop(h, v); return {distanceM: s.distanceM, seconds: s.seconds}; }
  const last = trace(h, v).at(-1);
  return {distanceM: last.distanceM, seconds: last.seconds};
}
// Where a drop is t seconds after she let go: metres ahead of where she let go, and metres up.
export function dropPoint(kind, h, v, t) {
  if (kind === 'stone') {
    const s = Math.min(Math.max(0, t), stoneDrop(h, v).seconds);
    return {x: v * s, y: Math.max(0, h - GRAVITY * s * s / 2)};
  }
  const rows = trace(h, v), at = Math.min(rows.length - 1, Math.max(0, t / HELI_STEP)), i = Math.floor(at), k = at - i, a = rows[i], b = rows[Math.min(rows.length - 1, i + 1)];
  return {x: a.distanceM + (b.distanceM - a.distanceM) * k, y: a.heightM + (b.heightM - a.heightM) * k};
}
const water = (v, h = HIGH_M) => landing('water', h, v).distanceM;
export const BEST_LET_GO_M = JOB.buoyM - water(JOB.speed);

export const STEPS = Object.freeze([
  {id: 'wonder', part: 0, title: 'Why did it miss?'},
  {id: 'word-gravity', part: 1, title: 'Gravity', word: 'projectile-gravity'},
  {id: 'word-forward-speed', part: 1, title: 'Forward speed', word: 'projectile-forward-speed'},
  {id: 'word-arc', part: 1, title: 'Arc', word: 'projectile-arc'},
  {id: 'watch-water', part: 2, title: 'A stone and water'},
  {id: 'watch-speeds', part: 2, title: 'Slow, medium, fast'},
  {id: 'try-flag', part: 3, title: 'Where will it land?'},
  {id: 'try-height', part: 3, title: 'Low or high?'},
  {id: 'alone', part: 4, title: 'Brian’s job'},
  {id: 'check-over', part: 5, title: 'Question 1 of 3'},
  {id: 'check-faster', part: 5, title: 'Question 2 of 3'},
  {id: 'check-game', part: 5, title: 'Question 3 of 3'},
  {id: 'recap', part: 6, title: 'What you found out', voice: 'lab.brian.projectile.explain'},
].map(Object.freeze));

export const KEY_IDEAS = Object.freeze([
  {id: 'keep', text: 'A dropped thing keeps her forward speed, so it lands ahead of where she let go.'},
  {id: 'faster', text: 'Faster forward speed, further ahead. Air slows water, so it lands shorter than a stone.'},
  {id: 'early', text: 'In the game: hold H to pour before you reach the buoy, sooner when you fly faster.'},
].map(Object.freeze));
export const CHALLENGE_CARD = Object.freeze({title: 'Let go before the buoy.', text: 'The water keeps your forward speed: hold H to pour before you reach it.'});
// The notebook's words, under the ids the old lesson saved, so a player's notebook keeps them.
export const WORDS = Object.freeze([
  {id: 'projectile-gravity', word: 'Gravity', meaning: 'Gravity is the Earth’s pull that makes things fall. A falling thing goes faster every second.'},
  {id: 'projectile-forward-speed', word: 'Forward speed', meaning: 'Forward speed is how fast she moves along when she lets go. 10 m/s is 10 metres every second.'},
  {id: 'projectile-arc', word: 'Arc', meaning: 'An arc is the curved path a falling thing follows.'},
].map(Object.freeze));

// ---- the helicopters ----
// A run: she waits at the start, sets off on Space and is at full speed over the post (release, metres).
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
// The moment she passed a point, for letting go exactly over it.
function passedAt(c, x) {
  if (c.cruise) return c.setAt + (x - c.start) / c.speed;
  const up = 2 * RUNUP_M / c.speed, past = x - (c.start + RUNUP_M);
  return past >= 0 ? c.setAt + up + past / c.speed : c.setAt + Math.sqrt(2 * (x - c.start) / (c.speed * c.speed / (2 * RUNUP_M)));
}

// ---- keys (the screen shows them on its buttons and the board) ----
const FLAG_KEYS = Object.freeze({'←': 'flag:left', '→': 'flag:right', A: 'flag:left', D: 'flag:right'});
const FLAG_REPEAT = Object.freeze(['←', '→', 'A', 'D']);
const PICK_KEYS = Object.freeze({1: 'answer:0', 2: 'answer:1', 3: 'answer:2'});
const HEIGHT_GUESSES = Object.freeze([
  {id: 'further', label: 'Much further', picture: {kind: 'height', move: 'further'}},
  {id: 'same', label: 'About the same', picture: {kind: 'height', move: 'same'}},
  {id: 'shorter', label: 'Shorter', picture: {kind: 'height', move: 'shorter'}},
]);
const between = () => `between the ${metres(water(10))} it went at 10 m/s and the ${metres(water(20))} at 20 m/s`;
const lowHigh = () => `${metres(water(10, LOW_M))} from ${LOW_M} m up, ${metres(water(10))} from ${HIGH_M} m up`;

const SHOWING = 'Watch: I let go 10 m before the buoy.';
const DONE_HINTS = Object.freeze(['Press R to watch it again.', 'Press Enter to go on.', 'Press Enter to go on.']);
// The miss Brian says on the job, in whole metres: past is plus, short is minus.
const missSaid = (d, end) => Math.round(end.distanceM) - Math.round(JOB.buoyM - d.x0);
// Space sets her off (or lets go); the button says which. Brian's pointer may aim at a better press than the key's.
const space = (label, target = 'drop') => ({keys: {Space: 'drop'}, buttons: [{action: 'drop', label, key: 'Space'}], waiting: true, target, glow: target});

// ---- the checks ----
const CHECKS = {
  'check-over': {
    question: 'She flies at 10 m/s and lets go right over the buoy. Where does the water land?',
    answers: [{label: 'Short of the buoy', where: 'short'}, {label: 'On the buoy', where: 'on'}, {label: 'Past the buoy', where: 'past'}].map(a => ({...a, picture: {kind: 'landing', where: a.where}})),
    correct: 2, buoy: 20,
    demo: () => [heli(10, HIGH_M, {release: 20, cruise: true, start: -4})],
    right: () => `Yes. It keeps her forward speed and lands ${metres(water(10))} past the buoy.`,
    wrong: () => `The water keeps her forward speed, so it carries on forward as it falls: it lands ${metres(water(10))} past the buoy.`,
    hints: ['Think of the stone that stayed right under her.', 'The water keeps moving forward as it falls.', 'Pick “Past the buoy”.'],
  },
  'check-faster': {
    question: 'Now she flies twice as fast, 20 m/s. To hit the buoy, where does she let go?',
    answers: [{label: 'Further before the buoy', where: 'further'}, {label: 'The same place', where: 'same'}, {label: 'Closer to the buoy', where: 'closer'}].map(a => ({...a, picture: {kind: 'release', where: a.where}})),
    correct: 0, buoy: 36,
    demo: () => [heli(20, HIGH_M, {release: 36 - water(20), cruise: true, start: -8})],
    right: () => `Yes. At 20 m/s the water lands ${metres(water(20))} ahead, so she lets go ${metres(water(20))} before the buoy.`,
    wrong: () => `At 20 m/s the water lands ${metres(water(20))} ahead, not ${metres(water(10))}, so she lets go ${metres(water(20))} before the buoy: further back.`,
    hints: ['Faster forward speed carries the water further.', 'If it lands further ahead, she must let go further back.', 'Pick “Further before the buoy”.'],
  },
  'check-game': {
    question: 'In the game you fly to each buoy with water in the bucket. What hits the buoy?',
    answers: [{label: 'Pour right over the buoy', what: 'over'}, {label: 'Start pouring before it', what: 'before'}, {label: 'Fly very high', what: 'high'}].map(a => ({...a, picture: {kind: 'game', what: a.what}})),
    correct: 1, buoy: JOB.buoyM,
    demo: () => [heli(JOB.speed, HIGH_M, {release: BEST_LET_GO_M, cruise: true, start: -4})],
    right: () => 'Yes. Hold H to pour before you reach the buoy, sooner when you fly faster.',
    wrong: picked => picked === 0 ? 'Right over it, the water carries on forward and splashes past. Start pouring (hold H) before you get there.'
      : 'Height hardly changes where water lands: the air takes its forward speed. Start pouring (hold H) before you reach the buoy.',
    hints: ['Where did the water land when she let go right over the buoy?', 'The water carries on forward, so start before the buoy.', 'Pick “Start pouring before it”.'],
  },
};

export function createModel() {
  let m = null;
  const seen = new Set();
  const step = () => STEPS[m.index];

  function enter(index, keep = {}) {
    m = {index, time: 0, phase: 'ready', helis: [], drops: [], marks: [], ghosts: [], flag: null, buoy: null, guess: null, answered: null,
      result: null, say: '', lastLand: null, auto: null, letGo: null, autoStart: null, ...keep};
    const id = STEPS[index].id;
    if (id === 'wonder') { m.buoy = WONDER.buoyM; m.helis = [heli(WONDER.speed, HIGH_M, {release: WONDER.buoyM, cruise: true, start: -6})]; m.autoStart = .4; }
    if (id === 'word-gravity') m.helis = [heli(0, HIGH_M, {release: null, loads: ['stone']})];
    if (id === 'word-forward-speed') m.helis = [heli(10, HIGH_M, {loads: ['stone']})];
    if (id === 'word-arc') { m.helis = [heli(20, HIGH_M, {loads: ['stone']})]; m.ghosts = [{kind: 'stone', h: HIGH_M, v: 10, x0: 0, label: '10 m/s'}]; }
    if (id === 'watch-water') { m.helis = [heli(10, HIGH_M, {loads: ['stone', 'water']})]; m.autoStart = .6; }
    if (id === 'watch-speeds') { m.helis = [5, 10, 20].map((s, i) => heli(s, HIGH_M, {cruise: true, start: -s * LEAD_S, colour: i})); m.autoStart = .3; }
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

  function act(action) {
    const id = step().id, [kind, value] = action.split(':');
    if (kind === 'replay') return replay();
    if (id.startsWith('word-')) {
      if (kind !== 'drop' || m.phase !== 'ready') return null;
      m.phase = 'running';
      if (id === 'word-gravity') { letGo(m.helis[0]); return {kind: 'progress', say: 'Watch the stone, and the marks beside it.'}; }
      setOff();
      return {kind: 'progress', say: 'Watch the stone. She lets go over the post.'};
    }
    if (id === 'try-flag') {
      if (m.phase !== 'flag') return null;
      if (kind === 'flag') { m.flag = Math.max(0, Math.min(FLAG_MAX_M, m.flag + (value === 'left' ? -1 : 1))); return null; }
      if (kind === 'hold') { const at = Math.round(Number(value)); if (Number.isFinite(at)) m.flag = Math.max(0, Math.min(FLAG_MAX_M, at)); return null; }
      if (kind !== 'drop') return null;
      m.phase = 'running'; setOff();
      return {kind: 'progress', say: `Your flag is at ${metres(m.flag)}. Watch where the water lands.`};
    }
    if (id === 'try-height') {
      if (m.phase === 'guess' && kind === 'answer' && HEIGHT_GUESSES[Number(value)]) { m.guess = HEIGHT_GUESSES[Number(value)].id; m.phase = 'ready'; return {kind: 'progress', say: 'Now let them both go and see.'}; }
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

  // Brian's job. Space sets her off and Space again lets go; Show me (drop:best) flies a run and lets go
  // at the right place, from wherever she is: past that place, she comes round and he starts again.
  const home = () => Object.assign(m.helis[0], heli(JOB.speed, HIGH_M, {release: null}));
  function jobAct(kind, value) {
    const c = m.helis[0], best = value === 'best';
    if (kind !== 'drop' || m.phase === 'falling' || m.phase === 'done') return null;
    if (m.phase === 'flying') {
      if (m.auto != null) return null; // Brian is flying this run.
      if (best && c.x < BEST_LET_GO_M) { m.auto = BEST_LET_GO_M; return {kind: 'progress', say: SHOWING}; }
      if (!best && c.x < 0) return {kind: 'progress', say: `Not yet: she is still speeding up. Let go after she passes the ${JOB.buoyM} mark.`};
      if (!best) { letGo(c); m.phase = 'falling'; return {kind: 'progress', say: 'Watch the water.'}; }
    }
    // Ready, going round again after a miss, or Show me too late in a run: from the start and away.
    home(); m.drops = [];
    m.phase = 'flying'; m.auto = best ? BEST_LET_GO_M : null; setOff();
    return {kind: 'progress', say: best ? SHOWING : 'Let go before the buoy: press Space.'};
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
    for (const d of m.drops) {
      if (d.landed) continue;
      d.t = m.time - d.at;
      const end = landing(d.kind, d.h, d.v);
      if (d.t >= end.seconds) { d.landed = true; m.lastLand = m.time; m.marks.push({...markOf(id, d, end), at: m.time}); out ??= {kind: 'sound', sound: 'lab.splash'}; if (id === 'alone') return {...judge(d, end), sound: 'lab.splash'}; }
    }
    if (id === 'alone' && m.phase === 'flying' && m.helis[0].x > END_M) {
      m.phase = 'missed'; home();
      return {kind: 'fail', say: 'She flew past without letting go. Press Space to go round again, and let go before the buoy.'};
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
      return {kind: d.kind, x, colour: d.colour, label: Math.abs(off) <= RING_M ? 'on the buoy' : `${metres(off)} ${off > 0 ? 'past' : 'short'}`};
    }
    if (id === 'alone') { const said = missSaid(d, end); return {kind: d.kind, x, colour: d.colour, label: Math.abs(said) <= RING_M ? 'hit!' : `${metres(said)} ${said > 0 ? 'past' : 'short'}`}; }
    return {kind: d.kind, x, colour: d.colour, label: metres(end.distanceM)};
  }

  function finish(id) {
    m.phase = 'result';
    seen.add(id);
    const stone = landing('stone', HIGH_M, m.helis[0].speed);
    if (id === 'word-gravity') {
      const one = stoneFallAfter(1), two = stoneFallAfter(2);
      return {kind: 'right', say: `It fell ${metres(one)} in the first second and ${metres(two - one)} more in the next: faster every second. It reached the water after ${stone.seconds.toFixed(1)} s.`};
    }
    if (id === 'word-forward-speed') return {kind: 'right', say: `The stone kept her forward speed, 10 metres every second, so it stayed right under her and landed ${metres(stone.distanceM)} ahead of the post.`};
    if (id === 'word-arc') return {kind: 'right', say: `At 20 m/s the arc is longer: ${metres(stone.distanceM)} ahead, about twice the ${metres(landing('stone', HIGH_M, 10).distanceM)} at 10 m/s. Faster forward speed, further ahead.`};
    if (id === 'try-flag') {
      // Judged in the whole metres the board and Brian show: the flag is on a whole metre.
      const where = water(15), off = Math.round(where) - m.flag;
      m.result = {right: Math.abs(off) <= CLOSE_M};
      if (m.result.right) return {kind: 'right', say: `Right! The water landed ${metres(where)} ahead, ${off === 0 ? 'right by' : `${metres(off)} from`} your flag.`};
      return {kind: 'wrong', say: off > 0 ? `It landed ${metres(where)} ahead, ${metres(off)} past your flag. At 15 m/s it carries on forward further than that: ${between()}.`
        : `It landed ${metres(where)} ahead, ${metres(off)} short of your flag. Air slows the spray, so it lands short of where a stone would: ${between()}.`};
    }
    if (id === 'try-height') {
      m.result = {right: m.guess === 'same'};
      if (m.result.right) return {kind: 'right', say: `Right! ${lowHigh()}. The air soon takes the spray’s forward speed, so height hardly matters.`};
      return {kind: 'wrong', say: m.guess === 'further' ? `Only a little further: ${lowHigh()}. The air soon takes the spray’s forward speed, so height hardly matters.`
        : `Higher never lands shorter, but only a little further for water: ${lowHigh()}.`};
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
    // Judged on the numbers Brian says, which add up: metres before the buoy, plus the miss, make the metres it carried on.
    const before = Math.round(m.buoy - d.x0), ahead = metres(end.distanceM), said = missSaid(d, end), little = Math.abs(said) <= 8 ? ' a little' : '';
    if (Math.abs(said) <= RING_M) {
      m.phase = 'done'; seen.add('alone');
      return {kind: 'pass', say: `Splash on the buoy! You let go ${metres(before)} before it, and the water carried on forward ${ahead}. Job done.`};
    }
    // She comes round to the start, ready for another go.
    m.phase = 'missed'; home();
    if (before <= 0) return {kind: 'fail', say: `You let go ${before < 0 ? 'after the buoy' : 'right over the buoy'}. The water keeps her forward speed and lands ${ahead} ahead, so it splashed ${metres(said)} past. Let go ${ahead} before the buoy. Press Space to go round again.`};
    if (said > 0) return {kind: 'fail', say: `You let go ${metres(before)} before the buoy, but the water lands ${ahead} ahead, so it splashed ${metres(said)} past. Let go${little} sooner. Press Space to go round again.`};
    return {kind: 'fail', say: `You let go ${metres(before)} before the buoy. The water lands ${ahead} ahead, so it fell ${metres(said)} short. Let go${little} later. Press Space to go round again.`};
  }

  function replay() {
    const id = step().id;
    if (id === 'wonder' || id === 'watch-water' || id === 'watch-speeds') { enter(m.index); return null; }
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

  function view() {
    const id = step().id;
    const base = {scene: 'lake', time: m.time, ...drawn(), flag: m.flag, buoy: m.buoy, ruler: 'post', post: true, letGo: null, clock: false, fallMarks: false,
      keys: {}, repeat: [], buttons: [], cards: [], actions: [], target: null, glow: null, waiting: false, ready: seen.has(id), table: null};
    if (id === 'wonder') return {...base, post: false, ruler: null, letGo: WONDER.buoyM, actions: ['replay'],
      say: `Kestrel One let go of her water right over the buoy, but it splashed ${metres(water(WONDER.speed))} past it. Why did it miss?`,
      prompt: seen.has(id) ? 'Press Enter when you are ready to find out why, or R to watch again.' : 'Watch the water.',
      hints: ['Watch where the water goes after she lets go.', 'It keeps moving forward as it falls.', 'Press Enter when you are ready to find out why.']};
    if (id.startsWith('word-')) {
      const ready = m.phase === 'ready';
      const say = {
        'word-gravity': `Gravity is the Earth’s pull that makes things fall. A falling thing goes faster every second it falls. She is hovering ${HIGH_M} m up with a stone on her hook.`,
        'word-forward-speed': 'Forward speed is how fast she moves along when she lets go. She flies at 10 m/s: 10 metres every second. Watch where the stone goes.',
        'word-arc': 'The curved path a falling thing follows is an arc. Now she flies twice as fast, 20 m/s. The faint arc is the 10 m/s one.',
      }[id];
      return {...base, post: id !== 'word-gravity', clock: id === 'word-gravity', fallMarks: id === 'word-gravity', underHer: id === 'word-forward-speed', actions: m.phase === 'result' ? ['replay'] : [],
        ...(ready ? space(id === 'word-gravity' ? 'Let go' : 'Fly') : {}), say,
        prompt: ready ? (id === 'word-gravity' ? 'Let go of the stone: press Space, or click it.' : 'Set her off: press Space. She lets go over the post.')
          : m.phase === 'running' ? 'Watch the stone.' : 'Press Enter to go on, or R to watch again.',
        hints: m.phase === 'running' ? ['Watch the stone.', 'Watch the marks beside it.', 'Wait a moment.'] : !ready ? DONE_HINTS : id === 'word-gravity' ? ['The stone hangs on her hook.', 'Press Space, or click the stone.', 'Watch my pointer: it is on the stone.']
          : ['She waits on the left. Space sets her off.', 'Press Space, or click Kestrel One.', 'Watch my pointer: it is on Kestrel One.']};
    }
    if (id === 'watch-water' || id === 'watch-speeds') {
      const done = seen.has(id), marks = m.marks;
      const table = id === 'watch-water'
        ? [{label: 'The stone lands', value: marks.find(k => k.kind === 'stone')?.label ? `${marks.find(k => k.kind === 'stone').label} ahead` : null},
          {label: 'The water lands', value: marks.find(k => k.kind === 'water')?.label ? `${marks.find(k => k.kind === 'water').label} ahead` : null},
          {label: 'Water falls no faster than', value: done ? `${TOP_FALL_MS} m/s` : null}]
        : [5, 10, 20].map((s, i) => ({label: `${s} m/s`, value: marks.find(k => k.colour === i)?.label ?? null, colour: i}));
      return {...base, actions: ['replay', 'slow'], table, clock: id === 'watch-speeds',
        say: id === 'watch-water'
          ? (done ? `The stone landed ${metres(landing('stone', HIGH_M, 10).distanceM)} ahead, the water only ${metres(water(10))}. Air slows a spray of water: it never falls faster than ${TOP_FALL_MS} m/s, and it soon loses its forward speed. But it still lands ahead of where she let go.`
            : 'Watch: I let go of a stone and some water together, at 10 m/s.')
          : (done ? `Faster, further: ${metres(water(5))}, ${metres(water(10))} and ${metres(water(20))}. And all three splashed at nearly the same moment: falling takes the same time, and forward speed decides how far along.`
            : 'Three helicopters let go over the post at the same moment: 5, 10 and 20 m/s.'),
        prompt: done ? 'Press Enter to go on, or R to watch again.' : 'Watch the splashes.',
        hints: id === 'watch-water' ? ['Watch the grey stone and the blue water.', 'The water slows in the air; the stone hardly does.', 'Press R to watch again.']
          : ['Watch the three splashes.', 'The fastest one lands furthest ahead.', 'Press R to watch again.']};
    }
    if (id === 'try-flag') {
      if (m.phase === 'flag') return {...base, keys: {...FLAG_KEYS, Space: 'drop'}, repeat: FLAG_REPEAT, buttons: [{action: 'drop', label: 'Let go', key: 'Space'}], waiting: true, target: 'drop', glow: 'flag', dragFlag: true,
        say: `Your turn. She flies at 15 m/s this time, ${HIGH_M} m up. Where will the water land? Put the flag there.`,
        prompt: 'Move the flag with ← and → (or drag it on the water), then press Space to let go.',
        hints: [`At 10 m/s the water landed ${metres(water(10))} ahead, at 20 m/s ${metres(water(20))}. This is 15 m/s.`, 'Somewhere between those two. Move the flag, then press Space.', 'Any guess is fine. Watch my pointer: I will let go.']};
      if (m.phase === 'running') return {...base, say: `Your flag is at ${metres(m.flag)}. Watch where the water lands.`, prompt: 'Watch the water.', hints: ['Watch the water.', 'Watch the flag.', 'Wait a moment.']};
      return {...base, actions: ['replay'], mood: m.result.right ? 'cheer' : 'explain', say: m.say,
        prompt: 'Press Enter to go on, or R to watch again.', hints: ['Press R to watch it again.', 'Press Enter to go on.', 'Press Enter to go on.']};
    }
    if (id === 'try-height') {
      const cards = HEIGHT_GUESSES.map((g, i) => ({id: `answer:${i}`, key: String(i + 1), label: g.label, picture: g.picture,
        state: m.phase !== 'result' ? null : g.id === 'same' ? 'right' : g.id === m.guess ? 'wrong' : null}));
      const question = `Both fly at 10 m/s and let go over the post, one ${LOW_M} m up and one ${HIGH_M} m up. Where does the high one’s water land?`;
      if (m.phase === 'guess') return {...base, keys: PICK_KEYS, waiting: true, cards, say: question, prompt: 'Pick a card: click it, or press 1, 2 or 3.',
        hints: ['Remember the stone and the water: air slows the water.', 'The high one falls for longer. Does the water keep moving forward all that time?', 'Any guess is fine. Pick one, then we test it.']};
      if (m.phase === 'ready') return {...base, ...space('Let go'), cards: [], say: 'Now let them both go and see.', prompt: 'Press Space: both let go over the post.',
        hints: ['Space sets them both off.', 'Press Space, or click a helicopter.', 'Watch my pointer: it is on Kestrel One.']};
      if (m.phase === 'running') return {...base, say: 'Watch both splashes.', prompt: 'Watch the two splashes.', hints: ['Watch the two splashes.', 'Which lands further ahead?', 'Wait a moment.']};
      return {...base, cards, actions: ['replay'], mood: m.result.right ? 'cheer' : 'explain', say: m.say,
        prompt: 'Press Enter to go on, or R to watch again.', hints: ['Press R to watch it again.', 'Press Enter to go on.', 'Press Enter to go on.']};
    }
    if (id === 'alone') return jobView(base);
    if (CHECKS[id]) {
      const check = CHECKS[id], answered = m.answered !== null;
      return {...base, ruler: null, post: false, keys: answered ? {} : PICK_KEYS, actions: answered ? ['replay'] : [], waiting: !answered,
        letGo: answered && id !== 'check-over' ? m.helis[0].release : null, ghostLetGo: answered && id === 'check-faster' ? check.buoy - water(10) : null,
        cards: check.answers.map((a, i) => ({id: `answer:${i}`, key: String(i + 1), label: a.label, picture: a.picture,
          state: !answered ? null : i === check.correct ? 'right' : i === m.answered ? 'wrong' : null})),
        say: check.question, prompt: answered ? 'Press Enter to go on, or R to watch again.' : 'Pick a picture: click it, or press 1, 2 or 3.', hints: answered ? DONE_HINTS : check.hints};
    }
    return {...base, scene: 'recap', ready: true, ideas: KEY_IDEAS,
      say: 'A dropped thing keeps the forward speed it had, so it lands ahead of where you let go, and it falls faster every second. Air slows a spray of water more than a stone, so water lands shorter.',
      prompt: 'Try it for real in the helicopter, or go back to the Lab.', hints: KEY_IDEAS.map(i => i.text)};
  }

  function jobView(base) {
    const common = {...base, ruler: 'buoy', post: false, letGo: m.phase === 'missed' || m.phase === 'done' || m.phase === 'falling' ? m.letGo : null};
    const hints = [`At 10 m/s the water lands ${metres(water(JOB.speed))} ahead of where she lets go.`, `So let go when the bucket is ${metres(water(JOB.speed))} before the buoy: the ${Math.round(water(JOB.speed))} mark on the water.`,
      'Watch my pointer: I will fly it and let go at the right place.'];
    if (m.phase === 'ready') return {...common, ...space('Fly', 'drop:best'),
      say: `A job for you: hit the buoy. She flies at ${JOB.speed} m/s, ${HIGH_M} m up. Let go so the water lands inside the buoy’s ring.`,
      prompt: 'Press Space to set off, then press Space again to let go.', hints};
    if (m.phase === 'flying' && m.auto != null) return {...common, say: SHOWING, prompt: 'Watch Brian let go.', hints: ['Watch where I let go.', 'I let go 10 m before the buoy.', 'Watch the water.']};
    if (m.phase === 'flying') return {...common, keys: {Space: 'drop'}, buttons: [{action: 'drop', label: 'Let go', key: 'Space'}], waiting: true, target: 'drop:best',
      say: 'Let go before the buoy!', prompt: 'Press Space to let go.', hints};
    if (m.phase === 'falling') return {...common, say: 'Watch the water.', prompt: 'Watch the water.', hints};
    if (m.phase === 'missed') return {...common, ...space('Go round again', 'drop:best'),
      say: 'Have another go.', prompt: 'Press Space to go round again.', hints};
    return {...common, ready: true, mood: 'cheer', say: m.say, prompt: 'Press Enter to go on.', hints: ['Press Enter to go on.', 'Press Enter to go on.', 'Press Enter to go on.']};
  }

  return {enter, act, tick, view, state: () => m};
}

export const lesson = Object.freeze({id: 'projectile', steps: STEPS, createModel, keyIdeas: KEY_IDEAS, challengeCard: CHALLENGE_CARD, words: WORDS});
