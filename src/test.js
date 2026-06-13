// test.js — Duel canon + invariant tests. Headless: `npm test`.
import { CARS, COURSE, LIVES, DIFFICULTY, POLICE, DRIVE } from './config.js';
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
  ok(Number.isFinite(a.at(1000).x) && a.samples.length > 2 && a.samples[a.samples.length - 1].s >= a.length,
    'centerline sampled to full course length');
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

// --- Clean stage +1 life; missed station -1 life ---
{
  const d = new Duel({ seed: 21 });
  d.startCampaign({ mode: 'timetrial' });
  const s = d.state;
  s.status = 'racing';
  s.s = d.course.length - 1; s.lateral = 0; s.speedMph = 60;
  const lives0 = s.lives;
  for (let i = 0; i < 5 && s.status === 'racing'; i++) d.step(1 / 60);
  eq(s.status, 'stage_result', 'crossing the line on-road reaches stage_result');
  eq(s.lives, lives0 + LIVES.cleanStageReward, 'clean stage awards +1 life');
}
{
  const d = new Duel({ seed: 21 });
  d.startCampaign({ mode: 'timetrial' });
  const s = d.state;
  s.status = 'racing';
  s.s = d.course.length - 1; s.lateral = 9; s.speedMph = 60; // off-road, short of the crash margin
  const lives0 = s.lives;
  for (let i = 0; i < 5 && s.status === 'racing'; i++) d.step(1 / 60);
  eq(s.status, 'stage_result', 'an off-road arrival still ends the stage');
  eq(s.lives, lives0 - LIVES.missedStationCost, 'missing the gas station costs a life');
  ok(s.results.missedStation, 'results flag the missed station');
}

// --- Pursuit: dawdling gets you caught (ticket), outrunning escapes ---
{
  const d = new Duel({ seed: 22 });
  d.startCampaign();
  const s = d.state;
  s.status = 'racing';
  s.police.triggered = true;
  s.police.pursuit = { active: true, gapU: POLICE.pursuitStartGapU, caught: false };
  const pen0 = s.penaltySec;
  let guard = 0;
  while (s.status === 'racing' && guard++ < 5000) { s.speedMph = 50; d.step(1 / 60); }
  eq(s.status, 'ticket', 'a driver slower than the cruiser is caught');
  eq(s.penaltySec - pen0, POLICE.ticketPenaltySec, 'the ticket adds its configured penalty');
  ok(s.police.ticket && s.police.ticket.fine === POLICE.ticketBaseFine, 'ticket screen carries the fine');
  d.ackTicket();
  eq(s.status, 'racing', 'ackTicket resumes the stage');
}
{
  const d = new Duel({ seed: 23 });
  d.startCampaign();
  const s = d.state;
  s.status = 'racing';
  s.police.triggered = true;
  s.police.pursuit = { active: true, gapU: POLICE.pursuitStartGapU, caught: false };
  let escaped = false;
  d.onChange((st, ev) => { if (ev && ev.escaped) escaped = true; });
  let guard = 0;
  while (s.police.pursuit && s.police.pursuit.active && guard++ < 30000) {
    s.speedMph = 200;
    d.step(1 / 60);
    s.s = 100; // hold position so the stage cannot end before the pursuit resolves
    if (s.status !== 'racing') break;
  }
  ok(escaped, 'outrunning the cruiser escapes the pursuit');
  ok(s.status === 'racing' && (!s.police.pursuit || !s.police.pursuit.caught), 'an outrun pursuit never tickets');
}

// --- Pro engine blow: riding the limiter without upshifting lets go ---
{
  const d = new Duel({ seed: 24 });
  d.startCampaign({ difficulty: 'pro' });
  const s = d.state;
  s.status = 'racing';
  d.setInput({ throttle: 1, brake: 0, steer: 0 });
  let guard = 0;
  while (s.lastCrashReason == null && guard++ < 2000) d.step(1 / 60);
  eq(s.lastCrashReason, 'engine_blew', 'holding first gear at the limiter blows a Pro engine');
  eq(s.lives, LIVES.start - 1, 'the blown engine costs a life');
}

// --- Campaign restart clears penalties and crash banners ---
{
  const d = new Duel({ seed: 25 });
  d.startCampaign();
  d.state.status = 'racing';
  d._crash('test');
  ok(d.state.penaltySec > 0, 'crash penalty applied');
  d.startCampaign();
  eq(d.state.penaltySec, 0, 'restart clears accumulated penalties');
  eq(d.state.lastCrashReason, null, 'restart clears the crash banner');
}

// --- A final-life crash on the finish-crossing frame stays a gameover ---
{
  const d = new Duel({ seed: 26 });
  d.startCampaign();
  const s = d.state;
  s.status = 'racing';
  s.lives = 1;
  s.s = d.course.length - 2; s.speedMph = 120; s.lateral = -DRIVE.laneOffset;
  s.traffic.push({ s: d.course.length - 1, dir: 1, lateral: -DRIVE.laneOffset, speedMph: 0, alive: true });
  d.step(1 / 60);
  eq(s.status, 'gameover', 'gameover is not overwritten by the same-frame finish');
  ok(s.lives <= 0, 'no clean-stage resurrection after the fatal crash');
}

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
