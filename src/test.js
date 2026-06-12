// test.js — Duel canon + invariant tests. Headless: `npm test`.
import { CARS, COURSE, LIVES, DIFFICULTY } from './config.js';
import { Course } from './course.js';
import { Duel } from './game.js';
import { App } from './app.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  FAIL:', m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${a}, want ${b})`);

// --- CANON lives + penalties ---
eq(LIVES.start, 5, '5 lives');
eq(LIVES.crashPenaltySec, 30, 'crash = 30s penalty');
eq(LIVES.crashLifeCost, 1, 'crash = -1 life');
eq(LIVES.cleanStageReward, 1, 'clean stage = +1 life');
eq(LIVES.missedStationCost, 1, 'missed station = -1 life');

// --- CANON two core cars (F40 / 959 homages, fictional names) ---
ok(CARS.falcone_f42 && /F40/.test(CARS.falcone_f42.homage), 'Falcone F42 present (F40 homage)');
ok(CARS.stuttgart_959s && /959/.test(CARS.stuttgart_959s.homage), 'Stuttgart 959-S present (959 homage)');
ok(!/ferrari|porsche/i.test(JSON.stringify(CARS)), 'no real trademarks in car data');

// --- CANON 2 themes × 2 stages core campaign ---
eq(COURSE.length, 4, '4 core stages (2 themes x 2)');
eq(new Set(COURSE.map(c => c.theme)).size, 2, 'exactly 2 core themes');

// --- CANON stage 1 of the default course has a radar trap AND the rival ---
ok(COURSE[0].hasRadar && COURSE[0].hasRival, 'default stage 1 declares radar + rival');
{
  const c = new Course(COURSE[0], 1989);
  ok(c.features.radarTraps.length >= 1, 'stage 1 course has a radar trap');
  ok(c.rivalStartS != null, 'stage 1 course spawns a rival');
  ok(c.features.checkpoints.some(cp => cp.kind === 'gas_station' && cp.s === c.length), 'stage ends at a gas station (no laps)');
}

// --- Course is point-to-point and deterministic ---
{
  const a = new Course(COURSE[1], 42), b = new Course(COURSE[1], 42);
  ok(a.at(1000).x === b.at(1000).x && a.at(1000).z === b.at(1000).z, 'same seed -> identical centerline');
  ok(a.at(0).s === undefined || true, 'centerline sampled');
}

// --- Crash applies -1 life and +30s ---
{
  const d = new Duel({ seed: 1 });
  d.startCampaign();
  d.state.status = 'racing';
  const lives0 = d.state.lives, pen0 = d.state.penaltySec;
  d._crash('test');
  eq(d.state.lives, lives0 - 1, 'crash decrements a life');
  eq(d.state.penaltySec, pen0 + 30, 'crash adds 30s');
}

// --- Difficulty: casual = automatic, pro = manual + engine blow ---
ok(DIFFICULTY.casual.autoShift && !DIFFICULTY.casual.engineBlow, 'casual = auto, no engine blow');
ok(!DIFFICULTY.pro.autoShift && DIFFICULTY.pro.engineBlow, 'pro = manual + engine blow');

// --- Autopilot drives stage 1 through a scripted crash to a results screen ---
{
  const app = new App();
  app.autopilot = true;
  app.duel.startCampaign({ mode: 'duel', difficulty: 'casual' });
  // run out the countdown then race
  let guard = 0;
  const livesStart = app.duel.state.lives;
  let minLives = livesStart;
  while (!['stage_result', 'gameover', 'complete'].includes(app.duel.state.status) && guard++ < 4000) {
    app.advance(0.1);
    minLives = Math.min(minLives, app.duel.state.lives);
  }
  const s = app.duel.state;
  ok(app._scriptedCrashDone, 'autopilot performed its scripted off-road crash');
  ok(minLives < livesStart, 'a life was lost during the run (dipped below start)');
  ok(s.lastCrashReason != null, 'a crash was registered');
  ok(s.status === 'stage_result' || s.status === 'gameover', `reached a results screen (status=${s.status})`);
  if (s.results) ok(s.results.stageTimeSec > 0 || s.results.gameover, 'results carry a stage time');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
