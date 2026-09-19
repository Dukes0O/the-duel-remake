// test.js — Duel canon + invariant tests. Headless: `npm test`.
import { CARS, COURSE, LIVES, DIFFICULTY, POLICE, DRIVE, BOOST, SCORING } from './config.js';
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
  d.course.at = () => ({ curvature: 0 }); // isolate pursuit speed from steering
  s.traffic = [];
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
  d.course.at = () => ({ curvature: 0 }); // isolate pursuit speed from steering
  d.state.traffic = [];
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
  d.course.at = () => ({ curvature: 0 }); // limiter test runs on a straight
  d.state.traffic = [];
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

// --- Autopilot can return from a shoulder excursion without damage ---
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
  ok(app._scriptedCrashDone, 'autopilot performed its scripted shoulder excursion');
  eq(minLives,livesStart,'ordinary shoulder driving does not cost a life');
  eq(s.majorCrashes,0,'ordinary shoulder driving does not cause structural damage');
  ok(s.status === 'stage_result' || s.status === 'gameover', `reached a results screen (status=${s.status})`);
  if (s.results) ok(s.results.stageTimeSec > 0 || s.results.gameover, 'results carry a stage time');
}

// --- Remake: steering follows the screen and eases into a lane change ---
{
  const d = new Duel({ seed: 90 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; s.speedMph = 100; s.traffic = [];
  d.course.at = () => ({ curvature: 0 });
  d.setInput({ steer: -1 }); d.step(1 / 60);
  ok(s.lateral > 0, 'left input moves toward screen-left (positive world normal)');
  ok(s.steerVisual < 0 && s.steerVisual > -1, 'steering eases in rather than snapping');
  const moved = s.lateral;
  d.setInput({ steer: 0 });
  for (let i = 0; i < 120; i++) d.step(1 / 60);
  ok(Math.abs(s.steerVisual) < 0.00001, 'released steering settles to neutral');
  ok(Math.abs(s.yawVelocity) < 0.00001 && s.headingError > 0 && s.lateral > moved,
    'released steering stops yaw but retains the physical heading');
}

// --- Boost is a finite resource, exceeds normal top speed and refills on release ---
{
  const d = new Duel({ seed: 91 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; s.speedMph = d.car.topSpeed; s.gear = d.car.gears.length - 1; s.traffic = [];
  d.course.at = () => ({ curvature: 0 });
  d.setInput({ throttle: 1, boost: true }); d.step(1 / 60);
  ok(s.boosting && s.boost < 1, 'boost activates and spends charge');
  ok(s.speedMph > d.car.topSpeed, 'boost can exceed the normal speed cap');
  for (let i = 0; i < 360; i++) d.step(1 / 60);
  eq(s.boost, 0, 'holding boost drains the full charge');
  ok(!s.boosting, 'empty boost cannot oscillate on and off while held');
  d.setInput({ boost: false }); d.step(1 / 60);
  ok(s.boost > 0 && s.boost <= BOOST.refillPerSec / 60 + 0.00001, 'released boost recharges at its configured rate');
  d.setInput({ boost: true, brake: 1 }); d.step(1 / 60);
  ok(!s.boosting, 'braking overrides boost');
}

// --- Near misses reward an actual pass once; repeated passes build a timed combo ---
{
  const d = new Duel({ seed: 92 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; s.speedMph = 100; s.boost = 0.2;
  s.prevS = 98; s.s = 102; s.lateral = 0;
  s.traffic = [{ s: 100, prevS: 100, lateral: 3.4, speedMph: 0, dir: 1, alive: true }];
  d._collisions();
  eq(s.nearMisses, 1, 'a close completed pass records a near miss');
  eq(s.combo, 1, 'first near miss starts a combo');
  eq(s.score, SCORING.nearMissPoints, 'near miss awards style score');
  ok(s.boost > 0.2, 'near miss restores boost');
  d._collisions();
  eq(s.nearMisses, 1, 'the same car cannot reward multiple passes');
  s.traffic.push({ s: 100, prevS: 100, lateral: -3.4, speedMph: 0, dir: 1, alive: true });
  d._collisions();
  eq(s.combo, 2, 'another near miss builds the combo');
  eq(s.score, SCORING.nearMissPoints * 3, 'second pass earns a double multiplier');
  s.traffic = []; s.comboTimer = 0.001; d.step(1 / 60);
  eq(s.combo, 0, 'inactive combo expires');
}

// --- Crash grace prevents a second traffic impact consuming another life ---
{
  const d = new Duel({ seed: 93 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; d._crash('traffic');
  const lives = s.lives;
  s.traffic = [{ s: s.s, lateral: s.lateral, speedMph: 0, dir: 1, alive: true }];
  d._collisions(); eq(s.lives, lives, 'recovery grants brief traffic protection');
  s.traffic = [];
  while (s.impactTimer > 0) d.step(1 / 120);
  s.traffic = [{ s: s.s, lateral: s.lateral, speedMph: 0, dir: 1, alive: true }];
  s.prevS = s.s; s.invulnerableSec = 0; d._collisions();
  eq(s.lives, lives - 1, 'traffic collisions return when recovery ends');
}

// --- Pause freezes countdown and racing without changing the status contract ---
{
  const app = new App(); app.startCampaign({ car: 'stuttgart_959s', difficulty: 'pro', mode: 'timetrial' });
  const s = app.duel.state;
  app.togglePause(); app.advance(1);
  eq(s.status, 'countdown', 'pausing preserves countdown status');
  eq(s.countdown, 3, 'pause freezes countdown');
  ok(app.audio.paused, 'pause silences the audio mixer');
  app.resume(); app.advance(3.1);
  eq(s.status, 'racing', 'resume continues countdown into racing');
  s.speedMph = 100; s.boost = 0.5;
  app.togglePause(); const distance = s.s, time = s.stageTimeSec; app.advance(2);
  eq(s.s, distance, 'paused car cannot move'); eq(s.stageTimeSec, time, 'paused clock cannot advance');
  eq(s.boost, 0.5, 'pause cannot farm boost');
  app.restart();
  eq(s.car, 'stuttgart_959s', 'restart retains selected car');
  eq(s.difficulty, 'pro', 'restart retains difficulty');
  eq(s.mode, 'timetrial', 'restart retains race mode');
  ok(!s.paused && !app.audio.paused, 'restart exits pause');
  app.cycleCamera(); eq(app.cameraMode, 'hood', 'camera switches to hood');
  app.cycleCamera(); app.cycleCamera(); eq(app.cameraMode, 'chase', 'camera modes cycle back to chase');
  app.returnToMenu(); eq(s.status, 'menu', 'return-to-menu stops the campaign');
  eq(app.audio.context, null, 'headless app never creates an audio context');
}

// --- Heading dynamics require real steering around a bend ---
{
  const straight = new Duel({ seed: 1989 }); straight.startCampaign();
  const s = straight.state; s.status = 'racing'; s.traffic = [];
  straight.setInput({ throttle: 1 });
  for (let i = 0; i < 1200 && !s.offRoad; i++) straight.step(1 / 120);
  ok(s.offRoad, 'holding throttle without steering leaves a curved road');
  eq(s.majorCrashes,0,'leaving the road alone is harmless to the chassis');
  ok(Math.abs(s.headingError) > .08, 'the road bends away from the unchanged vehicle heading');
  const app = new App(); app.autopilot = true; app.startCampaign(); app._scriptedCrashDone = true;
  app.advance(65);
  ok(app.duel.state.s > 3000, 'steering input can negotiate the same course at racing speed');
  eq(app.duel.state.lastCrashReason, null, 'a driver steering through the bends avoids crashes');
}

// --- Loose shoulders scrub speed and progressively reduce steering traction ---
{
  const states = [];
  for (const offRoad of [false, true]) {
    const d = new Duel({ seed: 97 }); d.startCampaign();
    const s = d.state; s.status = 'racing'; s.traffic = []; s.speedMph = 120;
    s.lateral = offRoad ? 8 : 0;
    d.course.at = () => ({ curvature: 0 });
    d.setInput({ steer: offRoad ? .15 : -.15 });
    for (let i = 0; i < 60; i++) d.step(1 / 120);
    states.push({ ...s });
  }
  const [road, dirt] = states;
  ok(dirt.speedMph < road.speedMph * .9 && dirt.speedMph > road.speedMph*.65, 'dirt slows the car but leaves enough speed to recover');
  ok(dirt.roughness > .3 && dirt.offRoadTime > .45, 'roughness and time off the road build while on the shoulder');
  const yaw = [];
  for (const offRoad of [false, true]) {
    const d = new Duel({ seed: 97 }); d.startCampaign();
    const s = d.state; s.status = 'racing'; s.traffic = []; s.lateral = offRoad ? 8 : 0;
    d.course.at = () => ({ curvature: 0 }); d.setInput({ steer: offRoad ? .15 : -.15 });
    // Hold the same test speed to isolate traction from the earlier scrub.
    for (let i = 0; i < 36; i++) { s.speedMph = 120; d.step(1 / 120); }
    yaw.push(Math.abs(s.yawVelocity));
  }
  ok(yaw[1] < yaw[0] * .85 && yaw[1] > yaw[0]*.65, 'off-road steering preserves most of its authority');
}

// --- Physical distance agrees with metre-scale assets and the displayed mph ---
{
  const d = new Duel({ seed: 99 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; s.traffic = []; s.speedMph = 60;
  d.course.at = () => ({ curvature: 0 });
  for (let i = 0; i < 120; i++) d.step(1 / 120);
  ok(Math.abs(s.s - 26.8224) < .2, '60 mph travels about 26.8 metres in one second, allowing coast drag');
  s.traffic = [{ s: 100, dir: -1, speedMph: 60, alive: true }]; d._traffic(1);
  ok(Math.abs(s.traffic[0].s - 73.1776) < .0001, 'traffic uses the same mph-to-metres conversion');
}

// --- An impact holds the crash location, locks controls, and respects pause ---
{
  const d = new Duel({ seed: 98 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; s.traffic = []; s.speedMph = 160;
  s.lateral = 10; s.headingError = .2; s.s = d.course.length - 3;
  d._crash('off_road');
  eq(s.lateral, 10, 'impact does not instantly teleport the car to the road');
  ok(s.speedMph <= 40 && s.impactTimer >= 1.7, 'impact sharply slows the car and starts a visible recovery');
  d.setInput({ throttle: 1, steer: -1, boost: true }); d.step(.05);
  ok(s.speedMph < 40 && !s.boosting && s.crashSpin !== 0, 'impact overrides acceleration and steering while the car spins');
  eq(s.status, 'racing', 'finish cannot replace an impact effect');
  const frozen = [s.s, s.lateral, s.impactTimer, s.crashSpin];
  s.paused = true; d.step(.5);
  ok([s.s, s.lateral, s.impactTimer, s.crashSpin].every((value, i) => value === frozen[i]), 'pause freezes the entire crash effect');
  s.paused = false;
  while (s.impactTimer > 0) d.step(1 / 120);
  eq(s.lateral, 0, 'road recovery occurs after the impact finishes');
  eq(s.headingError, 0, 'recovery places the car facing down the road');
  eq(s.lives, LIVES.start - 1, 'the complete impact consumes exactly one life');
}

// --- Campaign simulation is independent of display frame rate ---
{
  const runs = [];
  for (const seed of [1, 42, 1989, 2026, 90517]) {
    for (const car of ['falcone_f42', 'stuttgart_959s']) {
      for (const difficulty of ['casual', 'pro']) {
        const frames = [];
        for (const fps of [30, 60, 144]) {
          const app = new App(); app.duel.seed = seed; app.autopilot = true;
          app.startCampaign({ car, difficulty });
          let guard = 0, stages = 0, finite = true;
          while (!['gameover', 'complete'].includes(app.duel.state.status) && guard++ < fps * 900) {
            app.advance(1 / fps, 1 / fps);
            const s = app.duel.state;
            finite &&= [s.s, s.lateral, s.speedMph, s.revs, s.boost, s.stageTimeSec, s.headingError, s.yawVelocity, s.roughness, s.impactTimer, s.crashSpin].every(Number.isFinite);
            if (s.status === 'stage_result') { stages++; app.duel.nextStage(); }
          }
          const s = app.duel.state;
          runs.push({ complete: s.status === 'complete' && stages === 4, catastrophic: s.status === 'gameover' && s.catastrophic && s.majorCrashes === DRIVE.majorCrashLimit, finite });
          frames.push({ time: s.totalTimeSec, lives: s.lives, score: s.score, hits:s.majorCrashes,status:s.status });
        }
        ok(frames.every(f => Math.abs(f.time - frames[0].time) < 0.001 && f.lives === frames[0].lives && f.score === frames[0].score && f.hits===frames[0].hits && f.status===frames[0].status),
          `seed ${seed}, ${car}, ${difficulty}: same outcome at 30, 60 and 144 FPS`);
      }
    }
  }
  ok(runs.every(r => r.complete || r.catastrophic), 'all 60 campaigns end with four completed stages or the major crash limit');
  ok(runs.some(r=>r.complete), 'the stricter damage limit still permits complete campaigns');
  console.log(`  Campaign outcomes: ${runs.filter(r=>r.complete).length} completed, ${runs.filter(r=>r.catastrophic).length} catastrophic`);
  ok(runs.every(r => r.finite), 'all 60 campaign runs keep finite simulation state');
}

// --- Lifecycle calls and storage failures cannot skip stages or break finishing ---
{
  const d = new Duel({ seed: 95 }); d.nextStage();
  eq(d.state.status, 'menu', 'nextStage cannot skip the menu');
  d.startCampaign(); d.nextStage();
  eq(d.state.stageIndex, 0, 'nextStage cannot skip an unfinished stage');
  d.state.status = 'stage_result'; d.nextStage(); d.nextStage();
  eq(d.state.stageIndex, 1, 'double nextStage clicks only advance once');
  const previous = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => 'null', setItem: () => {} };
    d._recordBest('storage regression', 12);
    eq(d._bestFor('storage regression'), 12, 'corrupt storage preserves a usable memory fallback');
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
  const app = new App(); app.startCampaign();
  app.advance(1, 0); app.advance(Infinity); app.advance(-1);
  eq(app.duel.state.countdown, 3, 'invalid advance arguments cannot hang or corrupt the simulation');
}

// --- Best times compare the same car, difficulty, mode and physics version ---
{
  const d = new Duel({ seed: 100 }); d.startCampaign();
  d._recordBest('scoped leaderboard regression', 45);
  eq(d._bestFor('scoped leaderboard regression'), 45, 'best time is saved for the selected setup');
  d.state.car = 'stuttgart_959s';
  eq(d._bestFor('scoped leaderboard regression'), null, 'best times are separate for each car');
  d.state.car = 'falcone_f42'; d.state.difficulty = 'pro';
  eq(d._bestFor('scoped leaderboard regression'), null, 'best times are separate for each difficulty');
  d.state.difficulty = 'casual'; d.state.mode = 'timetrial';
  eq(d._bestFor('scoped leaderboard regression'), null, 'best times are separate for each race mode');
  const previous = globalThis.localStorage;
  try {
    d.state.mode = 'duel';
    globalThis.localStorage = {
      getItem: key => key === 'duel_best' ? JSON.stringify({ 'legacy regression|falcone_f42|casual|duel': 1 }) : null,
      setItem: () => {},
    };
    eq(d._bestFor('legacy regression'), null, 'records from the old physics version are ignored');
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
}

// --- Untrusted URL/input settings cannot corrupt the driving state ---
{
  const d = new Duel({ car: 'missing', difficulty: 'missing' }); d.startCampaign({ car: 'missing', difficulty: 'missing' });
  ok(!!d.car && !!d.diff, 'invalid car and difficulty fall back to safe defaults');
  d.setInput({ steer: 99, throttle: -10, brake: NaN });
  eq(d.state.input.steer, 1, 'steering input is clamped'); eq(d.state.input.throttle, 0, 'throttle input is clamped');
  eq(d.state.input.brake, 0, 'non-finite input is ignored');
}

// --- Structural damage survives stage repair; the fifth hard impact is final ---
{
  const d=new Duel({seed:1989});d.startCampaign();const s=d.state,events=[];d.onChange((_,ev)=>events.push(ev));
  s.status='racing';s.traffic=[];s.speedMph=110;d._crash('head_on');
  eq(s.majorCrashes,1,'a head-on impact causes one major crash');eq(s.status,'racing','first major crash can recover');
  d._crash('head_on');eq(s.majorCrashes,1,'one impact cannot count twice');
  while(s.impactTimer>0)d.step(1/120);
  s.s=d.course.length;s.lateral=0;d._finishStage();d.nextStage();
  eq(s.majorCrashes,1,'checkpoint repairs do not erase structural damage');
  s.status='racing';s.traffic=[];s.speedMph=120;d._crash('rock');
  eq(s.majorCrashes,2,'a hard rock impact adds structural damage');
  while(s.impactTimer>0)d.step(1/120);
  for(let hit=3;hit<=5;hit++){
    s.speedMph=130;d._crash('head_on');
    if(hit<5){eq(s.status,'racing',`major crash ${hit} remains recoverable`);while(s.impactTimer>0)d.step(1/120);}
  }
  eq(s.majorCrashes,5,'fifth major impact reaches the limit');
  eq(s.status,'gameover','fifth major crash ends the campaign despite remaining lives');
  ok(s.lives>0&&s.catastrophic&&s.results.catastrophic,'catastrophic defeat is independent of legacy life rewards');
  eq(events.filter(e=>e.explosion).length,1,'catastrophe emits exactly one explosion event');
  const remaining=s.impactTimer;s.paused=true;d.step(.5);eq(s.impactTimer,remaining,'paused catastrophic animation is frozen');s.paused=false;
  for(let i=0;i<600;i++)d.step(1/120);
  eq(s.impactTimer,0,'fatal impact animation completes');eq(s.status,'gameover','fatal impact never recovers');
  d.nextStage();eq(s.status,'gameover','next-stage cannot bypass catastrophic defeat');
  d._crash('head_on');eq(s.majorCrashes,5,'further impacts cannot mutate a finished run');
  d.startCampaign();eq(s.majorCrashes,0,'restart resets major crashes');eq(s.catastrophic,false,'restart clears the burning wreck');
  s.status='racing';d._crash('engine_blew');eq(s.majorCrashes,0,'mechanical engine failure is not a major physical crash');
}

// --- Contacts, not terrain flags, classify major damage ---
{
  const d=new Duel({seed:73});d.startCampaign();const s=d.state;s.status='racing';s.traffic=[];
  s.s=20;s.prevS=20;s.lateral=12;s.speedMph=80;d.course.at=()=>({curvature:0});
  d.setInput({throttle:1});for(let i=0;i<240;i++)d.step(1/120);
  eq(s.majorCrashes,0,'two seconds of off-road driving does not count as a crash');eq(s.lives,5,'off-road driving does not lose lives');
  ok(s.offRoad&&s.speedMph>40,'car keeps driving on open dirt');
  const rock=d.course.features.rocks[0];s.prevS=rock.s-15;s.s=rock.s+15;s.prevLateral=s.lateral=rock.off;s.speedMph=100;
  d._collisions();eq(s.lastCrashReason,'rock','swept rock collision cannot tunnel through scenery');eq(s.majorCrashes,1,'hard hit on a visible rock counts');
  while(s.impactTimer>0)d.step(1/120);
  s.invulnerableSec=0;s.prevS=s.s=rock.s;s.prevLateral=s.lateral=rock.off;s.speedMph=12;
  d._collisions();eq(s.majorCrashes,1,'low-speed rock contact does not count as major');
}

// --- A responsive turn creates controllable body slip without reversing travel ---
{
  const d=new Duel({seed:54});d.startCampaign();const s=d.state;s.status='racing';s.traffic=[];s.speedMph=100;s.gear=2;
  d.course.at=()=>({curvature:0});d.setInput({steer:-.7,throttle:.5});
  for(let i=0;i<30;i++)d.step(1/120);
  ok(s.lateral>0&&s.yawVelocity>.3,'steering moves in the requested direction within a quarter second');
  ok(s.drifting&&s.slipAngle>.075,'a fast corner develops visible rear slip');
  d.setInput({steer:0});for(let i=0;i<70;i++)d.step(1/120);
  ok(Math.abs(s.slipAngle)<.01,'releasing the steering settles the drift');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
