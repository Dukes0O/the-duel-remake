// BOWL-HOOKS: how often a young driver wins Show Night's Freestyle on each level.
// A child-pace driver (24 to 32 mph, slower in the ends, a reaction lag and a
// wobble in its steering) takes a different line each lap: the kickers, the big
// jumps on the Spine side, or the launch cars. Ten seeded drivers per level, plus
// the game's own test driver through the App, as the browser scenario drives it.
// Headless, memory-only. Run: node tools/bowl-freestyle-balance.mjs
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {BOWL_NIGHT_RULES, bowlLayout} from '../src/bowl/bowl-night.js';

const DT = 1 / 120, RUNS = 10;

function freestyleDuel(cpuDifficulty) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  duel.startBowlNight({night: 1, cpuDifficulty});
  Object.assign(duel.state.bowlNight, {show: {night: 1, eventIndex: 1, complete: false}, phase: 'result'});
  duel.continueBowlNight();
  return duel;
}

export function childFreestyle(cpuDifficulty, seed) {
  const duel = freestyleDuel(cpuDifficulty), rng = makeRng(seed), course = duel.course, length = course.length;
  const layout = bowlLayout(course), ramps = course.features.ramps;
  let route = 'kickers', lap = -1, pace = 28, steer = 0, react = 0, result = null;
  duel.onChange((_, ev) => { if (ev.bowlEventResult) result = ev.bowlEventResult; });
  for (let i = 0; i < 120 * 100 && !result; i++) {
    const s = duel.state;
    if (s.status !== 'racing' && s.status !== 'countdown') { duel.step(DT); continue; }
    const at = ((s.s % length) + length) % length, n = Math.floor(s.s / length);
    if (n !== lap) { lap = n; route = ['kickers', 'big', 'cars'][Math.floor(rng.float() * 3)]; pace = 24 + rng.float() * 8; }
    // The line: over a ramp on this lap's route as it comes up, the centre line otherwise.
    let line = 0;
    const ramp = ramps.find(r => at > r.start - 30 && at < r.end + 2 && (route === 'big' ? (r.off ?? 0) < 0 : (r.off ?? 0) === 0));
    if (ramp) line = ramp.off ?? 0;
    const car = layout.parked.find(c => route === 'cars' && at > c.s - 16 && at < c.s + 2);
    if (car) line = car.lateral;
    // Slower in the round ends, as a child brakes for a turn.
    const bend = Math.abs(course.at(s.s + 12).curvature) > .02;
    const target = bend ? Math.min(pace, 24) : pace;
    react -= DT;
    if (react <= 0) {
      react = .12 + rng.float() * .1;
      steer = Math.max(-1, Math.min(1, (s.lateral - line) * .22 + (s.headingError || 0) * 1.4 + (rng.float() - .5) * .3));
    }
    duel.setInput({throttle: s.speedMph < target ? 1 : 0, brake: s.speedMph > target + 6 ? .6 : 0, steer, boost: false});
    duel.step(DT);
  }
  return result;
}

async function appTestDriver(cpuDifficulty) {
  const memory = new Map();
  globalThis.localStorage = {getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)),
    removeItem: k => memory.delete(k), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; }};
  globalThis.window ??= new EventTarget(); window.location = {search: ''};
  globalThis.Element ??= class {}; globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  const {App} = await import('../src/app.js');
  const app = new App(), released = app.duel.featureFlags.base || app.duel.featureFlags;
  const flags = {...released, enabled: name => name === 'titan-bowl' || released.enabled(name)}; flags.base = flags;
  app.duel.featureFlags = flags;
  app.addPlayer('Balance');
  app.startShowNight(1, {from: 'menu', cpuDifficulty});
  Object.assign(app.duel.state.bowlNight, {show: {night: 1, eventIndex: 1, complete: false}, phase: 'result'});
  app.continueShowNight();
  app.autopilot = true;
  for (let t = 0; t < 110 && app.duel.state.status !== 'bowl_break'; t += 1) app.advance(1);
  const result = app.duel.state.bowlNight.lastResult;
  app.dispose?.();
  return result;
}

export async function balance() {
  const rows = [];
  for (const level of ['easy', 'medium', 'hard']) {
    const runs = Array.from({length: RUNS}, (_, seed) => childFreestyle(level, seed + 1));
    const test = await appTestDriver(level);
    rows.push({level, target: BOWL_NIGHT_RULES.freestyle.target[level], wins: runs.filter(run => run?.won).length,
      scores: runs.map(run => run?.score ?? 0), testDriver: {won: !!test?.won, score: test?.score ?? 0}});
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const row of await balance())
    console.log(`${row.level}: target ${row.target}, child-pace driver won ${row.wins} of ${RUNS} (scores ${row.scores.join(', ')}); ` +
      `the game's test driver ${row.testDriver.won ? 'won' : 'lost'} with ${row.testDriver.score}`);
}
