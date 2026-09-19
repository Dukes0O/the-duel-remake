// test.js — Duel canon + invariant tests. Headless: `npm test`.
import { CARS, COURSE, LIVES, DIFFICULTY, POLICE, DRIVE, BOOST, SCORING } from './config.js';
import { Course } from './course.js';
import { Duel } from './game.js';
import { App } from './app.js';
import { sweepObstacle, sweepBox, contactZone } from './collision.js';

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

// --- The campaign now includes the coastal and city scenes ---
eq(COURSE.length, 6, 'six stages in the expanded campaign');
eq(new Set(COURSE.map(c => c.theme)).size, 4, 'four distinct scene themes');
for (const definition of COURSE) {
  const course = new Course(definition, 611);
  ok(course.samples.slice(1).every((point, index) => point.z > course.samples[index].z), `${definition.name}: the highway never doubles back across itself`);
  let clear = true;
  for (let s = 8; s < course.length; s += 32) {
    for (const lateral of [-DRIVE.laneOffset, DRIVE.laneOffset]) {
      const point = course.groundAt(s, lateral);
      if (course.obstaclesNear(s).some(obstacle => sweepObstacle(point, point, obstacle, point.heading))) clear = false;
    }
  }
  ok(clear, `${definition.name}: scenery leaves both driving lanes clear`);
  const world = course.groundAt(900, 40), recovered = course.nearest(world.x, world.z);
  ok(Math.abs(recovered.s - 900) < .01 && Math.abs(recovered.lateral - 40) < .01, `${definition.name}: world contacts project back onto the same road position`);
  ok(course.features.turns.every(turn => turn.signS < turn.s - 80), `${definition.name}: hard-turn signs give advance warning`);
  ok(course.features.flocks.length >= 20, `${definition.name}: the stage contains many chicken flock bonuses`);
}

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
  eq(s.lives, lives, 'a stationary overlap separates without charging another crash');
  ok(Math.abs(s.s-s.traffic[0].s)>=5 || Math.abs(s.lateral-s.traffic[0].lateral)>=2.24,'protected traffic remains physically solid');
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
  ok(Math.abs(s.lateral) < DRIVE.roadHalfWidth, 'road recovery selects a safe lane after the impact finishes');
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
          let guard = 0, stages = 0, wins = 0, finite = true;
          while (!['gameover', 'complete'].includes(app.duel.state.status) && guard++ < fps * 900) {
            app.advance(1 / fps, 1 / fps);
            const s = app.duel.state;
            finite &&= [s.s, s.lateral, s.speedMph, s.revs, s.boost, s.stageTimeSec, s.headingError, s.yawVelocity, s.roughness, s.impactTimer, s.crashSpin].every(Number.isFinite);
            if (s.status === 'stage_result') { stages++; if (s.results.won) wins++; app.duel.nextStage(); }
          }
          const s = app.duel.state;
          runs.push({ complete: s.status === 'complete' && stages === COURSE.length, catastrophic: s.status === 'gameover' && s.catastrophic && s.majorCrashes === DRIVE.majorCrashLimit, finite, wins, stages });
          frames.push({ time: s.totalTimeSec, lives: s.lives, score: s.score, hits:s.majorCrashes,status:s.status });
        }
        ok(frames.every(f => Math.abs(f.time - frames[0].time) < 0.001 && f.lives === frames[0].lives && f.score === frames[0].score && f.hits===frames[0].hits && f.status===frames[0].status),
          `seed ${seed}, ${car}, ${difficulty}: same outcome at 30, 60 and 144 FPS`);
      }
    }
  }
  ok(runs.every(r => r.complete || r.catastrophic), 'all 60 campaigns end with every stage completed or the major crash limit');
  ok(runs.some(r=>r.complete), 'the stricter damage limit still permits complete campaigns');
  console.log(`  Campaign outcomes: ${runs.filter(r=>r.complete).length} completed, ${runs.filter(r=>r.catastrophic).length} catastrophic`);
  console.log(`  Course wins: ${runs.reduce((sum, run) => sum + run.wins, 0)} / ${runs.reduce((sum, run) => sum + run.stages, 0)} finished stages`);
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
  d.state.mode = 'duel'; d.state.upgrades.engine = 1;
  eq(d._bestFor('scoped leaderboard regression'), null, 'upgraded cars have separate best times from stock cars');
  d.state.upgrades.engine = 0;
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
  const courseFrame=d.course.at.bind(d.course);
  s.s=20;s.prevS=20;s.lateral=12;s.speedMph=80;d.course.at=()=>({curvature:0});
  d.setInput({throttle:1});for(let i=0;i<240;i++)d.step(1/120);
  eq(s.majorCrashes,0,'two seconds of off-road driving does not count as a crash');eq(s.lives,5,'off-road driving does not lose lives');
  ok(s.offRoad&&s.speedMph>40,'car keeps driving on open dirt');
  d.course.at=courseFrame;
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

// Isolate contacts from random course placement while exercising the exact
// production sweep, resolution, damage and steering code.
function collisionArena() {
  const d = new Duel({ seed: 611 }); d.startCampaign();
  d.state.status = 'racing'; d.state.s = d.state.prevS = 100;
  d.state.lateral = d.state.prevLateral = 0; d.state.speedMph = 80;
  d.state.traffic = []; d.state.rival = null;
  d.course.at = () => ({ x: 0, y: 0, z: 0, heading: 0, curvature: 0 });
  d.course.worldAt = (s, lateral = 0) => ({ x: lateral, y: 0, z: s, heading: 0 });
  d.course.nearest = (x, z) => ({ s: z, lateral: x, distance: Math.abs(x) });
  d.course.features.obstacles = []; d.course.features.flocks = [];
  d.course.obstaclesNear = () => d.course.features.obstacles;
  return d;
}

// --- Bounds return either car to an empty paved position without damage ---
{
  const d = collisionArena(), s = d.state, events = [];
  d.onChange((_, event) => events.push(event));
  s.lateral = 62; d.step(1 / 120);
  ok(s.boundaryWarning && s.callout.includes('BOUNDARY'), 'the course warns before its outer boundary');
  eq(s.majorCrashes, 0, 'the outer shoulder warning is harmless');
  s.lateral = 79; s.speedMph = 100; s.headingError = .6;
  s.traffic = [{ s: s.s, lateral: -DRIVE.laneOffset, speedMph: 0, dir: 1, alive: true }];
  const lives = s.lives, penalties = s.penaltySec;
  d.step(1 / 120);
  ok(Math.abs(s.lateral) < DRIVE.roadHalfWidth && !s.boundaryWarning, 'crossing the boundary returns to the paved course');
  ok(Math.abs(s.lateral - s.traffic[0].lateral) > 2.7 || Math.abs(s.s - s.traffic[0].s) > 12, 'reset avoids an occupied lane');
  ok(s.speedMph <= 28 && s.invulnerableSec > 2, 'boundary reset slows the car and grants brief protection');
  eq(s.lives, lives, 'boundary reset preserves lives'); eq(s.penaltySec, penalties, 'boundary reset adds no crash penalty');
  eq(s.majorCrashes, 0, 'boundary reset adds no structural damage'); eq(s.boundaryResets, 1, 'one crossing records one reset');
  eq(events.filter(event => event.boundaryReset).length, 1, 'one boundary reset emits one event');
  s.rival = { s: 160, lateral: -82, speedMph: 100, pushVelocity: -5, headingError: -.4 };
  d._boundary(s.rival);
  ok(Math.abs(s.rival.lateral) < DRIVE.roadHalfWidth && s.rival.speedMph <= 28, 'the rival obeys the same course boundary');
}

// --- Coastal recovery keeps both cars above the sea ---
{
  const d = collisionArena(), s = d.state;
  d.course.def = { ...d.course.def, theme: 'coast' };
  d.course.groundAt = (distance, lateral) => ({ x: lateral, y: lateral > 28 ? -(lateral - 28) * .55 : 0, z: distance, heading: 0 });
  s.lateral = 40; d._boundary(s);
  eq(s.lateral, 40, 'dry coastal dirt remains drivable');
  ok(!s.boundaryWarning, 'dry coastal dirt does not show a water warning');
  s.lateral = 48; d._boundary(s);
  ok(s.boundaryWarning && s.callout.includes('WATER'), 'the sea approach warns before the water line');
  eq(s.boundaryResets, 0, 'the sea warning alone does not reset the car');
  s.lateral = 55; const lives = s.lives, hits = s.majorCrashes;
  d._boundary(s);
  ok(Math.abs(s.lateral) < DRIVE.roadHalfWidth && d.course.groundAt(s.s, s.lateral).y > -14, 'seaward driving resets before the car reaches sea level');
  eq(s.lives, lives, 'a sea-edge reset costs no life'); eq(s.majorCrashes, hits, 'a sea-edge reset causes no structural damage');
  const r = s.rival = { s: 160, lateral: 55, speedMph: 80, headingError: 0, pushVelocity: 0 };
  d._boundary(r);
  ok(Math.abs(r.lateral) < DRIVE.roadHalfWidth && r.speedMph <= 28, 'the opponent also resets before driving underwater');
  s.lateral = -55; d._boundary(s); eq(s.lateral, -55, 'the inland side retains its normal course boundary');
}

// --- Continuous solid scenery, including during damage protection ---
for (const kind of ['rock', 'mountain', 'building']) {
  const d = collisionArena(), s = d.state;
  const obstacle = { id: kind, kind, x: 0, z: 110, s: 110, off: 0, heading: 0, halfX: 4, halfZ: 3, shape: kind === 'building' ? 'box' : 'ellipse' };
  d.course.features.obstacles = [obstacle];
  s.prevS = 90; s.s = 135; s.speedMph = 120;
  d._collisions();
  ok(s.s < 105, `${kind}: a fast swept contact stops on the near face`);
  eq(s.majorCrashes, 1, `${kind}: a hard impact counts once`);
  ok(s.damageZones.front > .5, `${kind}: a frontal hit visibly damages the front`);
  const lives = s.lives; d._collisions();
  eq(s.lives, lives, `${kind}: repeated overlap cannot consume another life`);
  s.impactTimer = 0; s.prevS = 90; s.s = 135; s.prevLateral = s.lateral = 0; s.speedMph = 120; s.invulnerableSec = 1;
  d._collisions();
  ok(s.s < 105, `${kind}: invulnerability never permits passing through scenery`);
  eq(s.majorCrashes, 1, `${kind}: protected contact adds no damage`);
  const rival = { s: 135, prevS: 90, lateral: 0, prevLateral: 0, speedMph: 120, headingError: 0, pushVelocity: 0 };
  d._staticContacts(rival, false);
  ok(rival.s < 105 && rival.speedMph < 30, `${kind}: the rival also stops against solid scenery`);
}

{
  const d = collisionArena(), s = d.state;
  d.course.features.obstacles = [{ id: 'wall', kind: 'building', x: 0, z: 110, heading: 0, halfX: 4, halfZ: 3 }];
  s.prevS = 102; s.s = 110; s.speedMph = 12;
  d._collisions();
  eq(s.lives, LIVES.start, 'gentle scenery contact does not consume a life');
  eq(s.majorCrashes, 0, 'gentle scenery contact is not a major crash');
  ok(s.s < 105 && s.damageZones.front > 0, 'gentle contact separates and records a small visible scrape');
  const damage = s.damageZones.front; d._collisions();
  eq(s.damageZones.front, damage, 'scrape cooldown prevents one wall contact accumulating damage every frame');
  // Sweeping a rotated box must use its actual heading, and ellipse corners
  // remain traversable instead of behaving like invisible rectangular walls.
  const rotated = { x: 0, z: 0, halfX: 1, halfZ: 8, heading: Math.PI / 2 };
  ok(!!sweepObstacle({ x: -20, z: 0 }, { x: 20, z: 0 }, rotated), 'rotated building contact uses the world orientation');
  const ellipse = { x: 0, z: 0, halfX: 20, halfZ: 20, heading: 0, shape: 'ellipse' };
  eq(sweepObstacle({ x: 19, z: 19 }, { x: 20, z: 20 }, ellipse), null, 'rounded mountain corners do not create invisible box walls');
}

// --- Ramming transfers motion and the rival recovers by steering ---
{
  const d = collisionArena(), s = d.state;
  const r = s.rival = { s: 100, prevS: 100, lateral: 6.4, prevLateral: 6.4, speedMph: 100, headingError: 0, pushVelocity: 0, finished: false };
  s.prevLateral = 3.8; s.lateral = 5.3; s.headingError = .3; s.speedMph = 105;
  d._vehicleContact(s, r, 'rival');
  ok(r.lateral > 7 && r.pushVelocity > 0 && r.offRoad, 'a sideswipe physically pushes the opponent off the road');
  ok(Math.abs(r.lateral - s.lateral) >= 2.24, 'cars separate after the sideswipe');
  eq(s.majorCrashes, 0, 'an ordinary side ram is not a major head-on crash');
  eq(s.lives, LIVES.start, 'a side ram preserves the player life');
  const before = r.lateral, speed = r.speedMph; d._rival(1 / 120);
  ok(Math.abs(r.lateral - before) < .4 && r.lateral > 7, 'the rival cannot snap back into its lane');
  ok(r.speedMph < speed, 'an off-road opponent loses speed');
  let maxStep = 0;
  for (let i = 0; i < 1200; i++) { const lateral = r.lateral; s.s = r.s; d._rival(1 / 120); maxStep = Math.max(maxStep, Math.abs(r.lateral - lateral)); }
  ok(Math.abs(r.lateral) < DRIVE.roadHalfWidth && maxStep < .4, 'the opponent recovers gradually using steering and traction');
}

{
  const d = collisionArena(), s = d.state;
  s.s = 100; s.prevS = 80; s.speedMph = 130;
  const r = s.rival = { s: 95, prevS: 95, lateral: 0, prevLateral: 0, speedMph: 25, headingError: 0, pushVelocity: 0, finished: false };
  d._vehicleContact(s, r, 'rival');
  ok(s.s < r.s && r.s - s.s >= 5, 'a fast rear-end impact cannot tunnel through the opponent');
  ok(r.speedMph > 25, 'a rear-end hit transfers forward speed to the opponent');
  eq(s.lastCrashReason, 'rival', 'hard rival contact triggers the impact response');
  const traffic = { s: 140, prevS: 160, lateral: 0, prevLateral: 0, speedMph: 60, dir: -1, alive: true };
  r.prevS = 120; r.s = 150; r.prevLateral = r.lateral = 0; r.speedMph = 110;
  d._vehicleContact(r, traffic, 'traffic');
  ok(r.s < traffic.s && traffic.s - r.s >= 5, 'the opponent cannot pass through oncoming traffic');
}

// --- The CPU must yield when the player cuts in front ---
{
  const d = collisionArena(), s = d.state;
  s.s = s.prevS = 120; s.speedMph = 25;
  const r = s.rival = { prevS: 100, s: 124, prevLateral: 0, lateral: 0, speedMph: 170, headingError: 0, pushVelocity: 0, finished: false };
  const playerPosition = s.s, playerSpeed = s.speedMph;
  d._vehicleContact(s, r, 'rival');
  eq(s.s, playerPosition, 'a late CPU rear-end contact cannot shove the player forward');
  eq(s.speedMph, playerSpeed, 'cutting off the CPU does not cost player speed');
  ok(r.s < s.s - 5 && r.speedMph < s.speedMph, 'the CPU backs out of an overlap and slows below player speed');
  ok(r.braking && r.yieldingToPlayer, 'the CPU exposes its emergency-braking state');
  eq(s.lives, LIVES.start, 'a CPU rear-end contact costs no player life');
  eq(s.majorCrashes, 0, 'a CPU rear-end contact is not a player major crash');
  eq(s.impactTimer, 0, 'a CPU rear-end contact cannot start a player crash animation');
  eq(Object.values(s.damageZones).reduce((sum, damage) => sum + damage, 0), 0, 'the yielding CPU does not damage the player');
}

{
  const d = collisionArena(), s = d.state;
  s.s = 130; s.lateral = 8; s.speedMph = 70; s.headingError = -.75;
  const r = s.rival = { s: 100, lateral: 0, speedMph: 160, headingError: 0, pushVelocity: 0, finished: false };
  d._rival(1 / 60);
  ok(r.yieldingToPlayer && r.braking && r.speedMph < 159, 'the CPU brakes for a predicted cut-in before the player reaches its lane');
  // The same separation without sideways motion is a safe neighbouring lane.
  r.s = 100; r.lateral = 0; r.speedMph = 160; r.headingError = 0; s.headingError = 0;
  d._rival(1 / 60);
  ok(!r.yieldingToPlayer, 'the CPU can race past a car that stays in a separate lane');
  // A broadside car occupies more width and makes little forward progress.
  r.s = 100; r.lateral = 0; r.speedMph = 140; r.headingError = 0;
  s.lateral = 3.2; s.headingError = 1.25; s.speedMph = 90;
  d._rival(1 / 60);
  ok(r.braking && r.yieldingToPlayer, 'cut-in avoidance accounts for the player body angle and forward travel speed');
}

{
  const d = collisionArena(), s = d.state;
  s.s = 135; s.lateral = 3; s.speedMph = 70; s.headingError = -.5;
  const r = s.rival = { s: 100, lateral: 0, speedMph: 160, headingError: 0, pushVelocity: 0, finished: false };
  let slowed = false;
  for (let i = 0; i < 100; i++) { d.step(1 / 120); slowed ||= r.speedMph < 125; }
  ok(slowed, 'a real cut-in during fixed-step driving makes the CPU shed speed');
  eq(s.lives, LIVES.start, 'a simulated cut-in preserves the player life');
  eq(s.lastCrashReason, null, 'the CPU cannot turn a player cut-in into a crash');
  const headOn = collisionArena(), player = headOn.state;
  player.prevS = 100; player.s = 105; player.speedMph = 100;
  const oncoming = { prevS: 115, s: 105, prevLateral: 0, lateral: 0, speedMph: 70, dir: -1, alive: true };
  headOn._vehicleContact(player, oncoming, 'head_on');
  eq(player.majorCrashes, 1, 'true oncoming head-on collisions still cause major damage');
}

// --- Damage follows the actual side of contact, and persists between stages ---
{
  eq(contactZone(-1, 0, 0), 'left', 'world-left contact maps to the left panels');
  eq(contactZone(1, 0, 0), 'right', 'world-right contact maps to the right panels');
  eq(contactZone(0, 1, 0), 'rear', 'rear contact maps to rear bodywork');
  eq(contactZone(0, -1, Math.PI / 2), 'right', 'damage mapping follows the car heading');
  const d = collisionArena(), s = d.state;
  s.prevS = s.s = 100; s.speedMph = 30;
  const rearCar = { prevS: 90, s: 98, prevLateral: 0, lateral: 0, speedMph: 100, dir: 1, alive: true };
  d._vehicleContact(s, rearCar, 'traffic');
  ok(s.damageZones.rear > 0 && s.damageZones.front === 0, 'a faster car arriving from behind damages the rear');
  const rearDamage = s.damageZones.rear;
  d._loadStage(1); eq(s.damageZones.rear, rearDamage, 'stage transitions preserve localized damage');
  d.startCampaign(); eq(Object.values(s.damageZones).reduce((a, b) => a + b, 0), 0, 'a new campaign resets all damage zones');
}

// --- Chicken flocks refill nitro once, without damage or repeated farming ---
{
  const d = collisionArena(), s = d.state, events = [];
  d.onChange((_, event) => events.push(event));
  d.course.features.flocks = [{ id: 'bonus-a', s: 110, off: 9, radius: 3.5, count: 8 }];
  s.boost = .1; s.prevS = 90; s.s = 130; s.prevLateral = s.lateral = 9; s.speedMph = 60;
  d._flockBonuses();
  eq(s.boost, 1, 'a swept pass through a flock refills nitro to full');
  eq(events.filter(event => event.chickenBonus).length, 1, 'flock crossing emits one comic scatter bonus event');
  eq(s.collectedFlocks[0], 'bonus-a', 'the collected flock ID is available to rendering');
  eq(s.lives, LIVES.start, 'a chicken bonus causes no injury or crash penalty');
  s.boost = .2; d._flockBonuses(); eq(s.boost, .2, 'a collected flock cannot repeatedly refill nitro');
  s.collectedFlocks = []; s.speedMph = 0; d._flockBonuses(); eq(s.boost, .2, 'parking next to chickens cannot collect the bonus');
  s.s = s.prevS = 110; s.speedMph = 1.5; d._flockBonuses(); eq(s.boost, 1, 'even a slow moving contact with a flock refills nitro');
  s.collectedFlocks = ['bonus-a']; d._loadStage(1); eq(s.collectedFlocks.length, 0, 'each stage starts with new flock pickups');
}

// --- Scene selection and purchased upgrades enter the same simulation ---
{
  const d = new Duel({ seed: 120 });
  d.startCampaign({ startStage: COURSE.length - 1, upgrades: { engine: 3, nitro: 3, handling: 2, tires: 1 } });
  eq(d.state.stageIndex, COURSE.length - 1, 'scene selection starts a fresh run at the chosen stage');
  const base = CARS[d.state.car];
  ok(d.car.topSpeed > base.topSpeed && d.car.accel > base.accel && d.car.gears[0] > base.gears[0], 'engine upgrades improve speed, acceleration and gearing');
  ok(d.car.grip > base.grip && d.car.braking > base.braking, 'handling and tire upgrades improve control');
  eq(base.gears[0], CARS[d.state.car].gears[0], 'upgrade calculation preserves the base car data');
  const s = d.state; s.status = 'racing'; s.traffic = []; s.rival = null; s.speedMph = d.car.topSpeed; s.gear = d.car.gears.length - 1;
  d.course.at = () => ({ curvature: 0 }); d.setInput({ throttle: 1, boost: true }); d.step(1 / 120);
  ok(1 - s.boost < BOOST.drainPerSec / 120, 'nitro upgrades reduce boost drain');
  d.startCampaign({ startStage: -100, upgrades: { engine: 99, nitro: -4, handling: NaN, tires: 2.8 } });
  eq(d.state.stageIndex, 0, 'invalid negative scene index clamps safely');
  eq(d.state.upgrades.engine, 3, 'upgrade levels have a fixed maximum');
  eq(d.state.upgrades.nitro, 0, 'negative upgrade levels clamp to zero');
  eq(d.state.upgrades.handling, 0, 'non-finite upgrade data is ignored');
  eq(d.state.upgrades.tires, 2, 'upgrade levels stay integral');
  s.status = 'racing'; s.s = d.course.length; s.stageTimeSec = 60; s.rival = { finishTime: 70 };
  d._finishStage(); ok(s.results.won, 'beating the opponent records a race win');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
