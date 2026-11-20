// Ten seeded, 90-second drives per skill on the real floor, with memory-only race state.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {BOWL_NIGHT_RULES} from '../src/bowl/bowl-night.js';

const DT = 1 / 120, RUNS = 10;

function freestyleDuel(cpuDifficulty) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  duel.startBowlNight({night: 1, cpuDifficulty});
  Object.assign(duel.state.bowlNight, {show: {night: 1, eventIndex: 1, complete: false}, phase: 'result'});
  duel.continueBowlNight();
  return duel;
}

export function driveFreestyle(cpuDifficulty, seed, skill = 'child') {
  const duel = freestyleDuel(cpuDifficulty), rng = makeRng(seed), course = duel.course, length = course.length;
  const ramps = course.features.ramps;
  const bigJumpIndex = ramps.findIndex(ramp => ramp.id === 'big-jump');
  const bigJump = ramps[bigJumpIndex];
  const route = skill === 'child' ? 'kickers' : 'big';
  let airTicks = 0;
  const landed = new Set();
  duel.onChange((_, ev) => {
    const trick = ev.bowlTrick;
    if (!trick) return;
    landed.add(trick.kind);
    if (trick.turns >= 2 && trick.kind === 'backflip') landed.add('double backflip');
    if (trick.combo >= 2) landed.add('combo');
  });
  let lap = -1, pace = 28, steer = 0, react = 0, result = null;
  duel.onChange((_, ev) => { if (ev.bowlEventResult) result = ev.bowlEventResult; });
  for (let i = 0; i < 120 * 100 && !result; i++) {
    const s = duel.state;
    if (s.status !== 'racing' && s.status !== 'countdown') { duel.step(DT); continue; }
    const at = ((s.s % length) + length) % length, n = Math.floor(s.s / length);
    if (n !== lap) { lap = n; pace = (skill === 'child' ? 24 : 48) + rng.float() * 8; }
    // The line: over a ramp on this lap's route as it comes up, the centre line otherwise.
    let line = 0;
    const ramp = ramps.find(r => at > r.start - 30 && at < r.end + 2 && (route === 'big' ? (r.off ?? 0) < 0 : (r.off ?? 0) === 0));
    if (ramp) line = ramp.off ?? 0;
    if (route === 'big' && (at < bigJump.end + 4 || at > length - 35)) line = bigJump.off;
    // Slower in the round ends, as a child brakes for a turn.
    const bend = Math.abs(course.at(s.s + 12).curvature) > .02;
    const target = bend ? Math.min(pace, 24) : pace;
    react -= DT;
    if (react <= 0) {
      react = .12 + rng.float() * .1;
      steer = Math.max(-1, Math.min(1, (s.lateral - line) * .22 + (s.headingError || 0) * 1.4 + (rng.float() - .5) * .3));
    }
    const input = {throttle: s.speedMph < target ? 1 : 0, brake: s.speedMph > target + 6 ? .6 : 0, steer, boost: false};
    const seconds = s.stageTimeSec;
    if (seconds < 5) Object.assign(input, {throttle: 1, brake: 0, steer: 1, boost: true});
    else if (seconds < 6.6) Object.assign(input, {throttle: 1, brake: 0, steer: 0, boost: true});
    if (s.airborne) {
      airTicks++;
      const big = s._jumpOrigin?.rampId === 'ramp-' + bigJumpIndex;
      const turns = skill === 'expert' && big ? 216 : 120;
      Object.assign(input, {boost: false, throttle: 0, brake: skill !== 'child' && airTicks > 2 && airTicks <= turns + 2 ? 1 : 0,
        steer: skill === 'expert' && airTicks > 2 && airTicks <= 110 ? 1 : 0});
    } else airTicks = 0;
    duel.setInput(input);
    duel.step(DT);
  }
  return {...result, kinds: [...landed]};
}


export function balance() {
  const levels = ['easy', 'medium', 'hard'];
  const rows = ['child', 'middle', 'expert'].map((skill, i) => {
    const runs = Array.from({length: RUNS}, (_, seed) => driveFreestyle(levels[i], seed + 1, skill));
    const scores = runs.map(run => run.score).sort((a, b) => a - b);
    return {skill, scores, kinds: [...new Set(runs.flatMap(run => run.kinds))],
      target: Math.floor(scores[1] / 10) * 10};
  });
  const targets = BOWL_NIGHT_RULES.freestyle.target;
  for (const row of rows) console.log(row.skill + ' measured target ' + row.target + ', scores ' + row.scores + ', tricks ' + row.kinds);
  rows.forEach((row, i) => assert.equal(row.target, targets[levels[i]], levels[i] + ' target follows measured drives'));
  assert.ok(rows[0].scores.filter(s => s >= targets.easy).length >= 9);
  assert.ok(rows[0].scores.every(s => s < targets.hard));
  assert.ok(['wheelie', 'donut'].every(kind => rows[0].kinds.includes(kind)) && !rows[0].kinds.includes('backflip'));
  assert.ok(rows[1].kinds.includes('backflip') && rows[1].scores.every(s => s < targets.hard));
  assert.ok(['double backflip', 'combo', 'spin'].every(kind => rows[2].kinds.includes(kind)));
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  balance();
}
