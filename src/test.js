// test.js — Duel canon + invariant tests. Headless: `npm test`.
import { CARS, COURSE, LIVES, DIFFICULTY, CPU_DIFFICULTY, DEFAULT_CPU_DIFFICULTY, POLICE, DRIVE, BOOST, SCORING } from './config.js';
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
eq(LIVES.stageWinRepair, 2, 'stage win restores up to two crash slots');
eq(LIVES.missedStationCost, 1, 'missed station = -1 life');

// --- CANON two core cars (F40 / 959 homages, fictional names) ---
ok(CARS.falcone_f42 && /F40/.test(CARS.falcone_f42.homage), 'Falcone F42 present (F40 homage)');
ok(CARS.stuttgart_959s && /959/.test(CARS.stuttgart_959s.homage), 'Stuttgart 959-S present (959 homage)');
ok(!/ferrari|porsche/i.test(JSON.stringify(CARS)), 'no real trademarks in car data');

// --- Mixed-biome circuits close cleanly and keep the driving lanes clear ---
eq(COURSE.filter(course => !course.kind).length, 3, 'three mixed circuits in the campaign');
eq(COURSE.filter(course => course.kind === 'circuit').length, 6, 'six standalone expansion circuits');
eq(new Set(COURSE.filter(course => course.kind === 'circuit').map(course => course.id)).size, 6, 'expansion circuits have unique stable identities');
ok(COURSE.some(course => course.kind === 'arena'), 'the monster arena is a separate event');
for (const definition of COURSE) {
  const course = new Course(definition, 611);
  const start = course.at(0), finish = course.at(course.length), before = course.at(course.length - .01), after = course.at(.01);
  ok(Math.hypot(start.x - finish.x, start.z - finish.z) < .001 && Math.hypot(before.x - after.x, before.z - after.z) < .04, `${definition.name}: the circuit closes without a position jump`);
  eq(course.raceLength, course.length * 2, `${definition.name}: a complete event covers two laps`);
  if (!['arena', 'chase', 'drift', 'circuit'].includes(definition.kind)) ok(new Set(course.sections.map(section => section.theme)).size >= 2, `${definition.name}: several landscapes appear within one lap`);
  if (definition.kind === 'circuit') ok(course.sections.length >= 3 && course.sections.every(section => typeof section.name === 'string' && section.name.trim()), `${definition.name}: standalone circuit has named driving sections without requiring mixed biomes`);
  let clear = true;
  for (let s = 8; s < course.length; s += 32) {
    for (const lateral of [-DRIVE.laneOffset, DRIVE.laneOffset]) {
      const point = course.groundAt(s, lateral);
      if (course.obstaclesNear(s).some(obstacle => sweepObstacle(point, point, obstacle, point.heading))) clear = false;
    }
  }
  ok(clear, `${definition.name}: scenery leaves both driving lanes clear`);
  const world = course.groundAt(course.length + 900, 40), recovered = course.nearest(world.x, world.z, course.length + 900);
  ok(Math.abs(recovered.s - course.length - 900) < .04 && Math.abs(recovered.lateral - 40) < .04, `${definition.name}: world contacts preserve the absolute lap phase`);
  ok(course.features.turns.every(turn => turn.signS < turn.s - 80), `${definition.name}: hard-turn signs give advance warning`);
  if (definition.kind !== 'arena') ok(course.features.flocks.length >= 15, `${definition.name}: the stage contains many chicken flock bonuses`);
}

// --- CANON stage 1 of the default course has a radar trap AND the rival ---
ok(COURSE[0].hasRadar && COURSE[0].hasRival, 'default stage 1 declares radar + rival');
{
  const c = new Course(COURSE[0], 1989);
  ok(c.features.radarTraps.length >= 1, 'stage 1 course has a radar trap');
  ok(c.rivalStartS != null, 'stage 1 course spawns a rival');
  ok(c.features.lapGates.length >= 3 && c.features.checkpoints.some(cp => cp.kind === 'finish' && cp.s === c.raceLength), 'checkpoint gates validate two laps before the finish');
}

// --- Course generation is deterministic ---
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

// --- A clean final lap cannot overfill the crash reserve; invalid arrival is harmless ---
{
  const d = new Duel({ seed: 21 });
  d.startCampaign({ mode: 'timetrial' });
  const s = d.state;
  s.status = 'racing';
  s.completedLaps = 1; s.nextLapGate = d._lapGates.length;
  s.s = d.raceLength - 1; s.lateral = 0; s.speedMph = 60; s.traffic = []; s.rival = null;
  const lives0 = s.lives;
  for (let i = 0; i < 5 && s.status === 'racing'; i++) d.step(1 / 60);
  eq(s.status, 'stage_result', 'crossing the line on-road reaches stage_result');
  eq(s.lives, lives0, 'clean stage keeps the full five-slot reserve');
}
{
  const d = new Duel({ seed: 21 });
  d.startCampaign({ mode: 'timetrial' });
  const s = d.state;
  s.status = 'racing';
  s.completedLaps = 1; s.nextLapGate = d._lapGates.length;
  s.s = d.raceLength - 1; s.lateral = 12; s.speedMph = 60; s.traffic = []; s.rival = null;
  const lives0 = s.lives;
  for (let i = 0; i < 5 && s.status === 'racing'; i++) d.step(1 / 60);
  eq(s.status, 'racing', 'an off-road finish must be crossed again on the course');
  eq(s.lives, lives0, 'missing a finish gate does not cost a life');
  ok(s.s < d.raceLength - 100 && s.results === null, 'an invalid finish restores the last checkpoint without awarding results');
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
  s.completedLaps = 1; s.nextLapGate = d._lapGates.length;
  s.s = d.raceLength - 2; s.speedMph = 120; s.lateral = -DRIVE.laneOffset;
  s.traffic = [{ s: d.raceLength - 1, dir: 1, lateral: -DRIVE.laneOffset, speedMph: 0, alive: true }];
  d.step(1 / 60);
  eq(s.status, 'gameover', 'gameover is not overwritten by the same-frame finish');
  ok(s.lives <= 0, 'no clean-stage resurrection after the fatal crash');
}

// --- Autopilot can return from a shoulder excursion without damage ---
{
  const app = new App();
  app.autopilot = true;
  // Isolate shoulder handling; seeded traffic is covered by the campaign matrix.
  app.duel.startCampaign({ mode: 'timetrial', difficulty: 'casual' });
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
  for (const mode of ['wide', 'front', 'back', 'right', 'left', 'chase']) {
    app.cycleCamera(); eq(app.cameraMode, mode, `camera cycles to ${mode}`);
  }
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
  ok(dirt.speedMph < road.speedMph * .9 && dirt.speedMph > 55, 'dirt slows the road car but leaves enough speed to recover');
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

// Ordinary impacts can exhaust the crash allowance without reaching the
// separate high-speed structural-damage limit. That is a valid losing end.
{
  const d = new Duel({ seed: 2026 }); d.startCampaign();
  const s = d.state; s.status = 'racing'; s.traffic = [];
  for (let crash = 0; crash < LIVES.start / LIVES.crashLifeCost; crash++) {
    s.impactTimer = 0; s.speedMph = 20; d._crash('traffic', 0, 20);
  }
  eq(s.lives, 0, 'ordinary crashes can exhaust all lives');
  eq(s.status, 'gameover', 'life exhaustion ends the race without waiting for major damage');
  ok(!s.catastrophic && s.majorCrashes === 0, 'ordinary life exhaustion is not a catastrophic crash');
  ok(s.results.gameover && !s.results.completed && !s.results.won, 'life exhaustion records a loss, never a completed win');
  eq(d._finishStage(), false, 'an exhausted race cannot claim finish rewards');
}

// --- Campaign simulation is independent of display frame rate ---
if (!process.env.DUEL_SKIP_CAMPAIGNS) {
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
          runs.push({ seed, car, difficulty, fps, status: s.status, stage: s.stageIndex, lap: s.completedLaps, gate: s.nextLapGate,
            position: +s.s.toFixed(2), speedMph: +s.speedMph.toFixed(2),
            complete: s.status === 'complete' && stages === COURSE.filter(course => !course.kind).length,
            catastrophic: s.status === 'gameover' && s.catastrophic && s.majorCrashes === DRIVE.majorCrashLimit,
            exhausted: s.status === 'gameover' && s.lives === 0 && !s.catastrophic && s.stageCrashes > 0 &&
              s.results?.gameover === true && s.results.completed === false && s.results.won === false,
            finite, wins, stages });
          frames.push({ time: s.totalTimeSec, lives: s.lives, score: s.score, hits:s.majorCrashes,status:s.status });
        }
        ok(frames.every(f => Math.abs(f.time - frames[0].time) < 0.001 && f.lives === frames[0].lives && f.score === frames[0].score && f.hits===frames[0].hits && f.status===frames[0].status),
          `seed ${seed}, ${car}, ${difficulty}: same outcome at 30, 60 and 144 FPS`);
      }
    }
  }
  const unfinished = runs.filter(r => !r.complete && !r.catastrophic && !r.exhausted);
  ok(unfinished.length === 0, `all 60 campaigns complete or end with a valid crash-limit loss${unfinished.length ? `; unfinished runs: ${JSON.stringify(unfinished)}` : ''}`);
  ok(runs.some(r=>r.complete), 'the stricter damage limit still permits complete campaigns');
  console.log(`  Campaign outcomes: ${runs.filter(r=>r.complete).length} completed, ${runs.filter(r=>r.catastrophic).length} catastrophic, ${runs.filter(r=>r.exhausted).length} life-exhausted`);
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

// --- Stage wins repair damage; five unrepaired hard impacts are final ---
{
  const d=new Duel({seed:1989});d.startCampaign();const s=d.state,events=[];d.onChange((_,ev)=>events.push(ev));
  s.status='racing';s.traffic=[];s.speedMph=110;d._crash('head_on');
  eq(s.majorCrashes,1,'a head-on impact causes one major crash');eq(s.status,'racing','first major crash can recover');
  d._crash('head_on');eq(s.majorCrashes,1,'one impact cannot count twice');
  while(s.impactTimer>0)d.step(1/120);
  s.s=d.raceLength;s.completedLaps=s.lapsTotal;s.lateral=0;d._finishStage();d.nextStage();
  eq(s.majorCrashes,0,'a stage win repairs the single structural impact');
  s.status='racing';s.traffic=[];s.speedMph=120;d._crash('rock');
  eq(s.majorCrashes,1,'a hard rock impact adds fresh structural damage');
  while(s.impactTimer>0)d.step(1/120);
  for(let hit=2;hit<=5;hit++){
    s.speedMph=130;d._crash('head_on');
    if(hit<5){eq(s.status,'racing',`major crash ${hit} remains recoverable`);while(s.impactTimer>0)d.step(1/120);}
  }
  eq(s.majorCrashes,5,'fifth major impact reaches the limit');
  eq(s.status,'gameover','fifth unrepaired major crash ends the campaign');
  ok(s.catastrophic&&s.results.catastrophic,'fifth unrepaired hit causes the catastrophic defeat');
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
  const rock=d.course.features.rocks.find(candidate=>{
    const from=d.course.worldAt(candidate.s-15,candidate.off),to=d.course.worldAt(candidate.s+15,candidate.off);from.y=to.y=undefined;
    const first=d.course.obstaclesNear(candidate.s-15,candidate.s+15).map(obstacle=>sweepObstacle(from,to,obstacle,to.heading,d._vehicleSpec(s))).filter(Boolean).sort((a,b)=>a.t-b.t)[0];
    return first?.obstacle.source===candidate&&first.t>0;
  });
  ok(!!rock,'the rock contact fixture has an unobstructed real approach');
  s.prevS=rock.s-15;s.s=rock.s+15;s.prevLateral=s.lateral=rock.off;s.speedMph=100;
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
  d.course.features.obstacles = []; d.course.features.flocks = []; d.course.features.shortcuts = [];
  d.course.obstaclesNear = () => d.course.features.obstacles;
  d.course.closed = false;
  d.course.themeAt = () => d.course.def.theme;
  d.course.surfaceAt = (_, lateral) => ({road: Math.abs(lateral) <= DRIVE.roadHalfWidth, mainRoad: Math.abs(lateral) <= DRIVE.roadHalfWidth, roadHalfWidth: DRIVE.roadHalfWidth, shortcutId: null});
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
  // Hold a stationary blocker at the recovery edge. A still-steering 105 mph
  // player was a moving prediction, not a sustained stopped-lane obstruction.
  s.headingError = 0; s.speedMph = 0; s.pushVelocity = 0;
  for (let i = 0; i < 1200; i++) { const lateral = r.lateral; s.s = r.s; d._rival(1 / 120); maxStep = Math.max(maxStep, Math.abs(r.lateral - lateral)); }
  ok(r.yieldingToPlayer && r.speedMph < 5, 'the opponent waits while the player continues to block its recovery corridor');
  s.lateral = s.prevLateral = -DRIVE.laneOffset; s.headingError = 0; s.speedMph = 0;
  for (let i = 0; i < 1200; i++) { const lateral = r.lateral; s.s = r.s; d._rival(1 / 120); maxStep = Math.max(maxStep, Math.abs(r.lateral - lateral)); }
  ok(Math.abs(r.lateral) < DRIVE.roadHalfWidth && maxStep < .4, 'after the player clears, the opponent recovers gradually using steering and traction');
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
  eq(s.damageZones.rear, 0, 'a late CPU rear approach cannot cosmetically damage the player');
  eq(r.damageZones?.front ?? 0, 0, 'safe yielding does not create an NPC impact dent');
  eq(s.damageZones.front + s.damageZones.left + s.damageZones.right, 0, 'a rear contact leaves unrelated player panels intact');
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
  eq(s.damageZones.rear, 0, 'a faster NPC arriving from behind yields without rear damage');
  Object.assign(s, { prevS: 110, s: 100, speedMph: -22, gear: -1 });
  Object.assign(rearCar, { prevS: 98, s: 98, speedMph: 0 });
  d._vehicleContact(s, rearCar, 'traffic');
  ok(s.damageZones.rear > 0 && s.damageZones.front === 0, 'player reversing into a stopped car damages the rear');
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
  const selectedStage = COURSE.findLastIndex(definition => !definition.practice);
  d.startCampaign({ startStage: selectedStage, upgrades: { engine: 3, nitro: 3, handling: 2, tires: 1 } });
  eq(d.state.stageIndex, selectedStage, 'scene selection starts a fresh run at the chosen racing stage');
  const base = CARS[d.state.car];
  ok(d.car.topSpeed > base.topSpeed && d.car.accel > base.accel && d.car.gears[0] > base.gears[0], 'engine upgrades improve speed, acceleration and gearing');
  ok(d.car.grip > base.grip && d.car.braking > base.braking, 'handling and tire upgrades improve control');
  eq(base.gears[0], CARS[d.state.car].gears[0], 'upgrade calculation preserves the base car data');
  const s = d.state; s.status = 'racing'; s.traffic = []; s.rival = null; s.speedMph = d.car.topSpeed; s.gear = d.car.gears.length - 1;
  const realAt = d.course.at.bind(d.course);
  d.course.at = distance => ({ ...realAt(distance), curvature: 0 }); d.setInput({ throttle: 1, boost: true }); d.step(1 / 120);
  ok(1 - s.boost < BOOST.drainPerSec / 120, 'nitro upgrades reduce boost drain');
  d.startCampaign({ startStage: -100, upgrades: { engine: 99, nitro: -4, handling: NaN, tires: 2.8 } });
  eq(d.state.stageIndex, 0, 'invalid negative scene index clamps safely');
  eq(d.state.upgrades.engine, 3, 'upgrade levels have a fixed maximum');
  eq(d.state.upgrades.nitro, 0, 'negative upgrade levels clamp to zero');
  eq(d.state.upgrades.handling, 0, 'non-finite upgrade data is ignored');
  eq(d.state.upgrades.tires, 2, 'upgrade levels stay integral');
  s.status = 'racing'; s.s = d.raceLength; s.completedLaps = s.lapsTotal; s.stageTimeSec = 60; s.rival = { finishTime: 70 };
  d._finishStage(); ok(s.results.won, 'beating the opponent records a race win');
}

// --- Sequential checkpoint gates validate two continuous laps ---
function crossGate(duel, actor, gate, lateral = 0) {
  actor.prevS = gate - .5; actor.s = gate + .5;
  actor.prevLateral = actor.lateral = lateral; actor.speedMph = 100;
  duel.state.stageTimeSec += 10;
  duel._advanceLaps(actor, 1 / 60);
}
{
  const d = new Duel({seed:611}); d.startCampaign({mode:'timetrial'});
  const s = d.state; s.status = 'racing'; s.traffic = [];
  for (const gate of d._lapGates) crossGate(d, s, gate);
  eq(s.nextLapGate, d._lapGates.length, 'all first-lap checkpoints register in order');
  crossGate(d, s, d.course.length);
  eq(s.completedLaps, 1, 'the first complete circuit awards one lap');
  eq(s.currentLap, 2, 'the HUD advances to lap two');
  eq(s.s, d.course.length + .5, 'a valid lap does not teleport or reposition the car');
  eq(s.lapTimes.length, 1, 'a completed lap records its own time');
  eq(d._finishStage(), false, 'one lap cannot finish a two-lap race');
  eq(s.results, null, 'one lap cannot produce a rewarded result');
  for (const gate of d._lapGates) crossGate(d, s, d.course.length + gate);
  s.racePenaltySec = 30;
  crossGate(d, s, d.raceLength);
  ok(d._finishStage(), 'the second validated lap completes the event');
  eq(s.results.completed, true, 'only full races expose completed results');
  eq(s.results.laps, 2, 'the result records both completed laps');
  eq(s.results.timeSec, s.stageTimeSec + 30, 'race result time includes this race’s penalties');
  eq(s.results.lapTimes.length, 2, 'both individual lap times reach the result');
  ok(Math.abs(s.results.lapTimes.reduce((sum,time)=>sum+time,0)-s.results.timeSec)<.03, 'lap times include penalties and add up to total race time');
  const score = s.score; d._finishStage(); eq(s.score, score, 'a completed event cannot award its score twice');
}
{
  const d = new Duel({seed:612}); d.startCampaign({mode:'timetrial'});
  const s = d.state; s.status = 'racing'; s.traffic=[];
  crossGate(d,s,d.course.length);
  eq(s.completedLaps,0,'crossing the start alone cannot award a lap');
  ok(s.s < 20 && s.invulnerableSec > 2,'missing every checkpoint restores the start safely');
  eq(s.lives,LIVES.start,'invalid lap recovery preserves lives');
  eq(s.majorCrashes,0,'invalid lap recovery does not count as a crash');
  const gate=d._lapGates[0]; crossGate(d,s,gate,65);
  eq(s.nextLapGate,0,'passing outside a checkpoint does not validate it');
  s.prevS=gate+.5;s.s=gate-.5;d._advanceLaps(s,1/60);
  eq(s.nextLapGate,0,'wrong-way checkpoint crossings do not validate progress');
  s.prevS=0;s.s=d.raceLength+1;s.speedMph=200;d._advanceLaps(s,1/60);
  eq(s.completedLaps,0,'a position jump cannot substitute for two laps');
  s.completedLaps=1;s.s=d.course.length+80;s.lateral=79;d._boundary(s);
  ok(s.s>=d.course.length&&s.s<d.raceLength,'safe recovery preserves the current absolute lap');
}
{
  const d=new Duel({seed:613});d.startCampaign();const s=d.state,r=s.rival;s.status='racing';s.traffic=[];s.s=800;
  r.s=d.course.length-.1;r.nextLapGate=d._lapGates.length;r.speedMph=100;d._rival(1/60);
  eq(r.completedLaps,1,'the CPU validates the same first lap');
  ok(!r.finished,'the CPU cannot finish after one lap');
  r.s=d.raceLength-.1;r.nextLapGate=d._lapGates.length;r.speedMph=100;d._rival(1/60);
  ok(r.finished&&r.completedLaps===2,'the CPU finishes only after its second full lap');
}

// --- Cars, pickups and static contacts stay solid across the lap seam ---
{
  const d=collisionArena(),s=d.state;d.course.closed=true;d.course.length=1000;d.course.raceLength=2000;
  s.prevS=990;s.s=1002;s.speedMph=140;
  const other={s:3,prevS:3,lateral:0,prevLateral:0,speedMph:20,dir:1};
  d._vehicleContact(s,other,'traffic');
  ok(d.relativeS(other.s,s.s)-s.s>=5,'a car beyond the start line remains solid to a car finishing the lap');
  eq(s.lastCrashReason,'traffic','wrapped physical contact uses the usual damage rules');
  const finish=collisionArena(),f=finish.state;f.prevS=90;f.s=115;f.speedMph=120;
  f.rival={s:110,prevS:110,lateral:0,prevLateral:0,speedMph:0,headingError:0,finished:true,finishTime:30};
  finish._collisions();
  ok(f.s<f.rival.s&&f.rival.s-f.s>=5,'the visible finished opponent remains solid');
  f.rival.speedMph=80;const stoppedAt=f.rival.s;finish._rival(.05);
  ok(f.rival.s>stoppedAt&&f.rival.speedMph<80&&f.rival.braking,'a finished CPU car coasts down using its brakes');
  eq(f.rival.finishTime,30,'post-finish braking cannot change the CPU finish time');
  const cpu=collisionArena(),p=cpu.state;cpu.course.closed=true;cpu.course.length=1000;
  p.prevS=p.s=1010;p.speedMph=25;
  const r=p.rival={prevS:990,s:1014,lateral:0,prevLateral:0,speedMph:170,headingError:0,pushVelocity:0};
  cpu._vehicleContact(p,r,'rival');
  eq(p.lives,LIVES.start,'CPU cut-in yielding remains harmless at a lap seam');
  ok(r.s<p.s-5&&r.speedMph<25,'the CPU yields behind the player across the seam');
  const pick=collisionArena(),q=pick.state;pick.course.closed=true;pick.course.length=1000;
  pick.course.features.flocks=[{id:'wrap-flock',s:5,off:0,radius:3.5}];
  q.prevS=999;q.s=1010;q.boost=.2;pick._flockBonuses();
  eq(q.boost,1,'flocks are collectible on the second lap using wrapped positions');
  q.prevS=1999;q.s=2010;q.boost=.2;pick._flockBonuses();
  eq(q.boost,.2,'the same flock cannot be farmed on later laps');
}
{
  const d=new Duel({seed:614});d.startCampaign({mode:'timetrial'});const s=d.state;s.status='racing';s.traffic=[];
  const point=d.course.worldAt(100,0);
  d.course.features.obstacles=[{id:'lap-wall',kind:'building',shape:'box',s:100,off:0,...point,halfX:5,halfZ:3}];
  d.course.obstaclesNear=()=>d.course.features.obstacles;
  s.prevS=d.course.length+80;s.s=d.course.length+120;s.prevLateral=s.lateral=0;s.speedMph=120;
  d._staticContacts(s,true);
  ok(s.s>d.course.length+80&&s.s<d.course.length+100,'a second-lap wall collision preserves the absolute race position');
  eq(s.majorCrashes,1,'a second-lap building impact causes normal structural damage');
}

// --- Vehicle choice, CPU level and paid upgrades alter real driving behavior ---
{
  const distances=[];
  for(const level of Object.keys(CPU_DIFFICULTY)){
    const d=collisionArena();d.state.cpuDifficulty=level;d.state.s=900;
    d.state.rival={s:100,lateral:-3.4,speedMph:0,headingError:0,pushVelocity:0,completedLaps:0,nextLapGate:0,lapTimes:[],lapStartedAt:0};
    for(let i=0;i<1200;i++)d._rival(1/120);
    distances.push(d.state.rival.s);
  }
  ok(distances[0]<distances[1]&&distances[1]<distances[2],'higher CPU levels make progressively more race progress');
  const d=collisionArena();d.startCampaign({cpuDifficulty:'invalid'});eq(d.state.cpuDifficulty,DEFAULT_CPU_DIFFICULTY,'invalid CPU level uses the configured default');
  const speeds=[];
  for(const car of ['falcone_f42','dusthawk_rally']){
    const race=collisionArena();race.state.car=car;race.state.lateral=20;race.state.speedMph=120;
    for(let i=0;i<120;i++)race._drive(1/120);speeds.push(race.state.speedMph);
  }
  ok(speeds[1]>speeds[0]+25,'the rally car retains substantially more speed on dirt');
  const stock=collisionArena(),upgraded=collisionArena();
  upgraded.state.upgrades={...upgraded.state.upgrades,brakes:3,suspension:3,tank:3};
  for(const race of [stock,upgraded]){race.state.speedMph=100;race.setInput({brake:1});for(let i=0;i<120;i++)race._drive(1/120);}
  ok(stock.state.speedMph<55,'standard brakes shed at least 45 mph in a second');
  ok(upgraded.state.speedMph<stock.state.speedMph-12,'brake upgrades reduce stopping time');
  ok(upgraded.car.offRoadGrip>stock.car.offRoadGrip&&upgraded.car.roughnessScale<stock.car.roughnessScale,'suspension improves dirt grip and reduces shake');
  for(const race of [stock,upgraded]){race.state.speedMph=100;race.state.boost=1;race.setInput({brake:0,boost:true});race._drive(1/120);}
  ok(1-upgraded.state.boost<(1-stock.state.boost)*.6,'tank upgrades add usable nitro capacity');
  const wall={x:0,z:0,halfX:1,halfZ:1};
  eq(sweepObstacle({x:2.3,z:-10},{x:2.3,z:10},wall),null,'a narrow road car clears a close obstacle');
  ok(!!sweepObstacle({x:2.3,z:-10},{x:2.3,z:10},wall,0,CARS.titan_monster.collision),'the wider monster truck collides with the same obstacle');
}
{
  const d=new Duel();const arena=COURSE.findIndex(course=>course.kind==='arena');d.startCampaign({startStage:arena,car:'titan_monster'});
  d.state.status='stage_result';d.nextStage();eq(d.state.status,'complete','the arena is one standalone event');
  d.startCampaign({startStage:arena-1});d.state.status='stage_result';d.nextStage();
  eq(d.state.status,'complete','the main campaign finishes before the standalone events');
}

// --- Arena ramps launch the truck, land cleanly and reward each ramp once per lap ---
{
  const d=new Duel({seed:615});d.startCampaign({startStage:COURSE.findIndex(course=>course.kind==='arena'),car:'titan_monster'});
  const s=d.state,events=[];s.status='racing';s.traffic=[];s.rival=null;d.onChange((_,event)=>events.push(event));
  const ramp=d.course.features.ramps[0];
  const jump=lap=>{s.s=ramp.start-20+lap*d.course.length;s.lateral=s.prevLateral=0;s.speedMph=90;s._jumpY=null;s._verticalSpeed=0;s.airborne=false;s.airHeight=0;
    let highest=0;for(let i=0;i<500;i++){s.prevS=s.s;s.s+=90*DRIVE.mphToWorld/120;d._jump(s,1/120);highest=Math.max(highest,s.airHeight);}return highest;};
  const highest=jump(0);
  ok(highest>1&&highest<8,'ramp speed produces a visible, bounded gravity arc');
  ok(!s.airborne&&s.airHeight===0,'the truck lands back on the terrain');
  eq(s.jumps,1,'one airborne ramp crossing records one jump');
  ok(s.jumpScore>100&&s.bestJumpMeters>25,'jump distance produces a meaningful style score');
  eq(events.filter(event=>event.jumpLanded).length,1,'landing emits one distance event');
  const points=s.jumpScore;jump(0);eq(s.jumpScore,points,'revisiting the same ramp on one lap cannot farm points');
  jump(-1);eq(s.jumps,1,'reversing before the start cannot create a lap-zero jump reward');
  jump(1);eq(s.jumps,1,'jumping ahead without a validated lap cannot create another reward');
  s.completedLaps=1;jump(1);eq(s.jumps,2,'the same ramp can reward a new validated lap');
  jump(0);eq(s.jumps,2,'returning to a previous lap cannot create another jump reward');
  eq(s.lives,LIVES.start,'a clean jump and landing never cause crash damage');
  const contact=collisionArena(),a=contact.state;a.car='titan_monster';a.airborne=true;a.airHeight=5;a.prevS=90;a.s=115;a.speedMph=90;
  contact.course.groundAt=(distance,lateral)=>({x:lateral,y:0,z:distance});
  const below={s:110,prevS:110,lateral:0,prevLateral:0,speedMph:0,dir:1};
  eq(contact._vehicleContact(a,below,'traffic'),false,'a truck can jump over a car it visibly clears');
  a.airHeight=.5;ok(contact._vehicleContact(a,below,'traffic'),'a low jump remains solid when the vehicle bodies overlap');
  s.s=ramp.start+10;s.airborne=true;s.airHeight=2;d._safeReset(s);
  ok(!s.airborne&&s.airHeight===0&&s._jumpY===null,'safe recovery clears airborne state');
  d._loadStage(0);eq(s.jumpScore,0,'a new event starts with fresh jump rewards');
}

// --- Chase impacts cost time while the car survives; pursuit and deadlines remain real ---
{
  const index=COURSE.findIndex(course=>course.kind==='chase'),d=new Duel({seed:616});d.startCampaign({startStage:index,car:'banshee_muscle'});
  const s=d.state,events=[];s.status='racing';s.traffic=[];d.onChange((_,event)=>events.push(event));
  ok(s.police.pursuit?.active,'the chase starts with a continuous police pursuit');
  for(let i=0;i<7;i++){s.speedMph=100;s.impactTimer=0;d._crash('head_on');}
  eq(s.majorCrashes,7,'chase bodywork still records repeated major impacts');
  eq(s.lives,LIVES.start,'recoverable chase crashes do not consume lives');
  eq(s.racePenaltySec,7*COURSE[index].chaseCrashPenaltySec,'each chase crash has its shorter recovery penalty');
  ok(s.status==='racing'&&!s.catastrophic,'the chase car survives more than five major crashes');
  eq(events.filter(event=>event.explosion).length,0,'chase impacts never trigger an explosion');
  d.startCampaign({startStage:index,car:'banshee_muscle'});s.status='racing';s.police.pursuit.s=s.s-1;s.police.pursuit.lateral=0;s.speedMph=0;d._police(1/120);
  eq(s.status,'ticket','the pursuing police can catch the chase car');
  eq(s.racePenaltySec,COURSE[index].chaseCatchPenaltySec,'a police catch costs chase time');
  d.ackTicket();ok(s.police.pursuit?.active&&s.police.pursuit.gapU>200,'police resume the chase after the catch');
  const limit=s.timeLimitSec;s.stageTimeSec=limit-s.racePenaltySec-.005;s.traffic=[];d.step(.01);
  eq(s.status,'stage_result','missing the chase deadline produces an event result');
  ok(s.results.timeout&&!s.results.won&&!s.results.completed,'a timeout cannot claim a completed race or win');
  ok(!s.catastrophic&&s.lives===LIVES.start,'a chase timeout leaves the car intact');
  d.nextStage();eq(s.status,'complete','finishing a chase never enters the next standalone event');
  d.startCampaign({startStage:index,car:'banshee_muscle'});s.status='racing';s.s=d.raceLength;s.completedLaps=s.lapsTotal;s.stageTimeSec=s.timeLimitSec-1;
  d._finishStage();ok(s.results.won&&s.results.completed,'two validated laps before the chase deadline win');
  d.startCampaign({mode:'timetrial',cpuDifficulty:'easy'});const easy=d.state.parTimeSec;
  d.startCampaign({mode:'timetrial',cpuDifficulty:'hard'});ok(d.state.parTimeSec<easy*.8,'Hard time trials require a substantially faster finish than Easy');
}
{
  for(const cpuDifficulty of Object.keys(CPU_DIFFICULTY)){
    const d=collisionArena(),s=d.state;s.cpuDifficulty=cpuDifficulty;s.s=130;s.lateral=8;s.speedMph=70;s.headingError=-.75;
    s.rival={s:100,lateral:0,speedMph:190,headingError:0,pushVelocity:0,finished:false};
    d._rival(1/60);
    ok(s.rival.braking&&s.rival.yieldingToPlayer&&s.rival.speedMph<189,`${cpuDifficulty}: even a fast CPU brakes for an imminent cut-in`);
    eq(s.lives,LIVES.start,`${cpuDifficulty}: emergency CPU braking never charges the player a crash`);
  }
  const d=new Duel({seed:617});d.startCampaign();const lane=d.course.features.passingLanes[0],distance=(lane.start+lane.end)/2;
  ok(d._surface(distance,8).mainRoad,'the added passing lane is real driveable asphalt');
  const cut=d.course.features.shortcuts[0],middle=(cut.start+cut.end)/2,lateral=d.course.shortcutOffset(cut,middle),surface=d._surface(middle,lateral);
  ok(surface.road&&surface.shortcutId&&!surface.mainRoad,'the shortcut is a legal gravel corridor with separate traction');
  const frame=d.course.at(middle);
  ok(1-frame.curvature*lateral<1,'the inside shortcut covers more course progress per metre of travel');
  d.startCampaign({startStage:COURSE.findIndex(course=>course.kind==='rally'),car:'dusthawk_rally'});
  ok(d._surface(500,0).road&&!d._surface(500,0).mainRoad,'the rally route is legal racing surface with gravel grip');
  d.state.status='stage_result';d.nextStage();eq(d.state.status,'complete','the rally stays a standalone event');
}
if (!process.env.DUEL_SKIP_CAMPAIGNS) {
  for(const event of COURSE.filter(course=>course.kind&&!course.practice)){
    const outcomes=[];
    for(const fps of [30,144]){
      const app=new App();app.autopilot=true;app.duel.seed=1989;
      app.duel.startCampaign({startStage:event.stage,car:event.requiredCar||'falcone_f42',cpuDifficulty:'easy'});app._scriptedCrashDone=true;
      let frames=0;while(!['stage_result','gameover'].includes(app.duel.state.status)&&frames++<fps*400)app.advance(1/fps);
      const s=app.duel.state;outcomes.push({status:s.status,time:s.totalTimeSec,score:s.score,hits:s.majorCrashes,jumps:s.jumps,won:s.results?.won,laps:s.completedLaps});
    }
    ok(outcomes.every(outcome=>outcome.status==='stage_result'&&outcome.laps===2&&outcome.won),`${event.name}: its recommended/default car can win both complete laps`);
    ok(outcomes.every(outcome=>Math.abs(outcome.time-outcomes[0].time)<.001&&outcome.score===outcomes[0].score&&outcome.hits===outcomes[0].hits&&outcome.jumps===outcomes[0].jumps),`${event.name}: event and jump scoring agree across display frame rates`);
    if(event.kind==='arena')eq(outcomes[0].jumps,6,'the complete arena demo scores every ramp on both laps');
  }
  const app=new App();app.autopilot=true;app.duel.startCampaign({startStage:COURSE.findIndex(course=>course.kind==='chase'),car:'banshee_muscle',cpuDifficulty:'hard'});app._scriptedCrashDone=true;
  let impacts=0,frames=0;
  while(app.duel.state.status!=='stage_result'&&frames++<120*300){const s=app.duel.state;
    if(s.status==='racing'&&!s.impactTimer&&s.s>(impacts+1)*900&&impacts<3){s.speedMph=90;app.duel._crash('head_on');impacts++;}app.advance(1/120);}
  ok(app.duel.state.results?.won&&impacts===3,'Hard chase remains winnable after three recoverable major crashes');
  ok(app.duel.state.racePenaltySec>=24&&app.duel.state.racePenaltySec<=36,'three chase crashes and at most one police catch stay within the recovery budget');
}

// --- Police cars have physical poses, obey solids, and catch by real separation ---
{
  const d=new Duel({seed:1989});d.startCampaign({startStage:COURSE.findIndex(course=>course.kind==='chase'),car:'banshee_muscle'});
  const s=d.state,branch=d.course.features.shortcuts[0],gap=60;
  let playerS=branch.start+gap+5,largestChange=-1;
  for(let distance=branch.start+gap+5;distance<branch.end-5;distance+=20){const change=Math.abs(d.course.shortcutOffset(branch,distance)-d.course.shortcutOffset(branch,distance-gap));if(change>largestChange){largestChange=change;playerS=distance;}}
  const playerOffset=d.course.shortcutOffset(branch,playerS);
  Object.assign(s,{status:'racing',s:playerS,prevS:playerS,lateral:playerOffset,prevLateral:playerOffset,speedMph:80,traffic:[]});
  const p=s.police.pursuit=d._newPursuit(gap),cut=d.course.features.shortcuts.find(route=>route.id===p.routeId);
  ok(!!cut&&Math.abs(p.lateral-d.course.shortcutOffset(cut,p.s))<1e-8,'police use the branch offset at their own road position');
  ok(Math.abs(p.lateral-s.lateral)>1,'police never copy a distant player’s lateral offset');
  const position=d.course.groundAt(p.s,p.lateral);
  ok(d.course.obstaclesNear(p.s).every(obstacle=>!sweepObstacle(position,position,obstacle,position.heading+p.headingError)),'a changing branch offset spawns a solid, unobstructed police car');
  d._police(1/120);
  eq(s.status,'racing','a police car60 metres behind on a branch cannot issue a remote catch');
  ok(Math.abs(p.gapU-(s.s-p.s))<1e-9,'the displayed pursuit gap comes from real actor positions');
  const a=d.course.groundAt(s.s,s.lateral),b=d.course.groundAt(p.s,p.lateral);
  ok(Math.abs(p.distanceU-Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z))<1e-8,'actual police distance uses the full branch geometry');
}
{
  const d=collisionArena(),s=d.state;s.s=s.prevS=100;s.lateral=s.prevLateral=50;s.speedMph=60;
  const p=s.police.pursuit={...d._newPursuit(0),s:100,lateral:0,speedMph:30};
  d._police(1/120);
  eq(s.status,'racing','matching course progress50 metres away cannot catch the player');
  ok(p.distanceU>49&&Math.abs(p.gapU)<1,'catch logic uses real distance rather than the small longitudinal gap');
  s.lateral=s.prevLateral=0;s.speedMph=30;p.s=92;p.lateral=0;p.speedMph=50;d._police(1/120);
  eq(s.status,'ticket','the police can catch a nearby driver on the same road');
  eq(s.lives,LIVES.start,'being caught does not cost a chassis life');
}
{
  const d=collisionArena(),s=d.state;s.s=s.prevS=200;s.speedMph=60;
  d.course.features.obstacles=[{id:'police-wall',kind:'building',x:0,z:110,s:110,off:0,heading:0,halfX:4,halfZ:3}];
  const p=s.police.pursuit={...d._newPursuit(100),s:100,lateral:0,speedMph:300};
  d._police(.05);
  ok(p.s<105&&p.speedMph<30,'a fast police car cannot pass through a building');
  eq(s.lives,LIVES.start,'a remote police wall impact cannot damage the player');
  d.course.features.obstacles=[];s.s=300;s.prevS=300;s.traffic=[{s:120,prevS:120,lateral:0,prevLateral:0,speedMph:0,dir:1,alive:true}];
  Object.assign(p,{s:110,lateral:0,headingError:0,speedMph:250,contactCooldown:0});d._police(.05);
  ok(p.s<s.traffic[0].s&&s.traffic[0].s-p.s>=5,'the police remain solid against traffic');
}
{
  const d=collisionArena(),s=d.state;s.s=s.prevS=130;s.lateral=s.prevLateral=8;s.speedMph=70;s.headingError=-.75;
  const p=s.police.pursuit={...d._newPursuit(30),s:100,lateral:0,speedMph:190};
  d._police(1/60);
  ok(p.braking&&p.yieldingToPlayer&&p.speedMph<189,'police brake when the player cuts across their path');
  eq(s.lives,LIVES.start,'a police cut-in does not create a player crash');
  s.s=s.prevS=120;s.lateral=s.prevLateral=0;s.speedMph=25;s.headingError=0;
  Object.assign(p,{prevS:100,s:124,prevLateral:0,lateral:0,speedMph:170});d._vehicleContact(s,p,'police');
  ok(p.s<s.s-5&&p.speedMph<25,'a late police rear-end contact yields behind the player');
  eq(s.impactTimer,0,'police yielding cannot trigger the player impact animation');
}
{
  const d=collisionArena(),s=d.state;s.s=s.prevS=700;s.speedMph=80;
  const p=s.police.pursuit={...d._newPursuit(500),s:200,lateral:20,speedMph:120};
  d._police(1/120);
  ok(p.offRoad&&p.speedMph<120&&Math.abs(p.lateral-20)<.4,'a dirt excursion slows the cruiser and recovers through steering');
  d.course.closed=true;p.s=-20;p.lateral=82;p.speedMph=100;d._boundary(p);
  ok(p.s<0&&Math.abs(p.lateral)<DRIVE.roadHalfWidth&&p.speedMph<=28,'police boundary recovery preserves the unwrapped phase before the start');
  const real=new Duel({seed:619});real.startCampaign({startStage:4,car:'banshee_muscle'});const player=real.state;player.status='racing';player.traffic=[];
  player.s=player.prevS=real.course.length+5;player.lateral=player.prevLateral=0;player.speedMph=40;
  const police=player.police.pursuit={...real._newPursuit(12),lateral:0,speedMph:60};real._police(1/120);
  ok(police.s>real.course.length-10&&police.s<real.course.length,'the cruiser keeps its continuous position at the lap seam');
  eq(player.status,'ticket','physical catch distance remains correct across the closed-course seam');
}
{
  const d=collisionArena(),s=d.state;s.s=s.prevS=100;s.speedMph=80;
  const p=s.police.pursuit={...d._newPursuit(10),s:90,lateral:0,speedMph:100};
  d._crash('head_on');const before=p.s;d.step(1/120);
  ok(p.s>before,'the physical police car keeps moving during impact recovery');
  eq(s.status,'racing','a police catch cannot replace an active crash recovery animation');
}

// --- Arena junk cars deform once, reward only their crusher, and stay harmless ---
{
  const arena=COURSE.findIndex(course=>course.kind==='arena');
  const make=()=>{const duel=new Duel({seed:1989});duel.startCampaign({startStage:arena,car:'titan_monster'});duel.state.status='racing';return duel;};
  const pose=(actor,prop,extra={})=>Object.assign(actor,{prevS:prop.s-9,s:prop.s-1,prevLateral:prop.off,lateral:prop.off,
    speedMph:4,headingError:0,slipAngle:0,airborne:false,airHeight:0,prevAirHeight:0,_verticalSpeed:0,...extra});
  const d=make(),s=d.state,prop=d.course.features.crushables[0],events=[];d.onChange((_,event)=>events.push(event));
  eq(d.course.features.crushables.length,6,'the arena supplies six parked crushable cars');
  pose(s,prop);d._crushProps(s);
  ok(s.crushedProps.includes(prop.id)&&s.crushCount===1,'the monster can crush a junk car at walking speed');
  eq(s.crushScore,150,'each first player crush adds its style reward');
  ok(s.speedMph>2&&s.speedMph<4,'crushing sheds a modest amount of speed');
  ok(s.airborne&&s.airHeight>0&&s._verticalSpeed>1,'the truck rebounds on its suspension after crushing');
  ok(s.majorCrashes===0&&s.lives===LIVES.start&&s.impactTimer===0,'junk cars do not trigger major damage or crash recovery');
  ok(events[0].propCrushed.byPlayer&&s.crushBurst.serial===1,'crush effects carry the actor and an event serial');
  pose(s,prop,{prevS:prop.s+d.course.length-9,s:prop.s+d.course.length-1});d._crushProps(s);
  eq(s.crushCount,1,'the crushed shell cannot reward another pass or lap');
  const other=d.course.features.crushables[2];pose(s.rival,other);d._crushProps(s.rival);
  ok(s.crushedProps.includes(other.id)&&s.crushCount===1,'rival crushing deforms shared scenery without player credit');
  ok(events.at(-1).propCrushed.byPlayer===false&&s.crushBurst.serial===2,'rival crushing has a separate physical effect');
  pose(s,other);d._crushProps(s);eq(s.crushScore,150,'the player cannot claim a car already crushed by the rival');
  s.s=d.raceLength;s.completedLaps=s.lapsTotal;d._finishStage();
  ok(s.results.crushCount===1&&s.results.crushScore===150,'the final result preserves only the player crush rewards');
  d.startCampaign({startStage:arena,car:'titan_monster'});
  ok(s.crushedProps.length===0&&s.crushCount===0&&s.crushBurst===null,'a fresh event restores its junk cars and rewards');

  const air=make(),a=air.state,junk=air.course.features.crushables[0];
  pose(a,junk,{prevAirHeight:5,airHeight:5,airborne:true,speedMph:90});air._crushProps(a);
  eq(a.crushCount,0,'a high jump over a junk car cannot crush or score it');
  pose(a,junk,{prevS:junk.s,s:junk.s,prevAirHeight:5,airHeight:.6,airborne:true,_verticalSpeed:-8});air._crushProps(a);
  eq(a.crushCount,1,'landing on a roof crushes the car beneath the monster');
  const miss=make(),m=miss.state,missed=miss.course.features.crushables[0];
  pose(m,missed,{prevS:missed.s-10,s:missed.s+45,prevAirHeight:10,airHeight:.1,airborne:true});miss._crushProps(m);
  eq(m.crushCount,0,'landing beyond a jumped row does not claim an airborne overflight');
  const light=make(),l=light.state,solid=light.course.features.crushables[0];l.car='falcone_f42';
  pose(l,solid,{speedMph:40});light._crushProps(l);
  ok(l.crushCount===0&&l.s<solid.s-4&&l.majorCrashes===0,'a lightweight car meets a solid shell but cannot crush it');
  const moving=make(),truck=moving.state,target=moving.course.features.crushables[0];truck.rival=null;
  pose(truck,target,{s:target.s-7,prevS:target.s-7,speedMph:20});moving.setInput({throttle:1});
  for(let i=0;i<80&&!truck.crushCount;i++)moving.step(1/120);
  eq(truck.crushCount,1,'ordinary simulation steps sweep the monster into crushable scenery');
  const recovery=make(),rolling=recovery.state,wreck=recovery.course.features.crushables[0];rolling.rival=null;
  recovery._crash('head_on',1,90);pose(rolling,wreck,{s:wreck.s-3,prevS:wreck.s-3,speedMph:15});recovery.step(1/120);
  ok(rolling.crushCount===1&&rolling.majorCrashes===1,'a recovering truck can crush scenery without a second crash');
  ok(!rolling.airborne,'crushing during recovery cannot suspend its impact animation in the air');
  const ordinary=new Duel({seed:1989});ordinary.startCampaign();ordinary.course.features.crushables=[prop];
  pose(ordinary.state,prop);ordinary._crushProps(ordinary.state);eq(ordinary.state.crushCount,0,'crushing is restricted to the arena event');
}

// --- Known-height scenery respects clear jumps and solid tunnel cover ---
{
  const post={id:'low-post',kind:'prop',x:0,y:0,z:10,heading:0,halfX:1,halfZ:1,height:2};
  const shell={halfWidth:1,halfLength:2,height:1.5};
  eq(sweepObstacle({x:0,y:5,z:0},{x:0,y:5,z:20},post,0,shell),null,'a vehicle clears a post when its whole swept body is above it');
  ok(sweepObstacle({x:0,y:1,z:0},{x:0,y:1,z:20},post,0,shell),'a low flight still hits the same solid post');
  const landing=sweepObstacle({x:0,y:6,z:0},{x:0,y:0,z:15},post,0,shell);
  ok(landing&&Math.abs(landing.t-2/3)<1e-8,'a roof descent contacts at the vertical crossing time');
  eq(sweepObstacle({x:0,y:6,z:0},{x:0,y:0,z:40},post,0,shell),null,'descending after a cleared obstacle does not create a late false collision');
  eq(sweepObstacle({x:0,y:1,z:0},{x:0,y:1,z:20},{...post,minY:5,maxY:8},0,shell),null,'explicit elevated hulls allow a car that fits underneath');
  ok(sweepObstacle({x:0,y:50,z:0},{x:0,y:50,z:20},{...post,height:undefined},0,shell),'scenery without height metadata retains its existing solid behavior');
  const d=new Duel({seed:1989});d.startCampaign({startStage:COURSE.findIndex(course=>course.kind==='rally'),car:'dusthawk_rally'});
  const tunnel=d.course.features.tunnels[0],cover=d.course.features.obstacles.filter(obstacle=>obstacle.tunnelCover);
  ok(cover.length>20&&cover.every(obstacle=>obstacle.height>0),'the tunnel supplies visible-height outer rock collision cells');
  d.course.obstaclesNear=()=>cover;
  for(const name of ['player','rival','police']) {
    const actor=name==='player'?d.state:name==='rival'?d.state.rival:(d.state.police.pursuit={});
    Object.assign(actor,{prevS:tunnel.start-15,s:tunnel.start+18,prevLateral:20,lateral:20,speedMph:110,headingError:0,airHeight:0,prevAirHeight:0,airborne:false});
    d.state.status='racing';d.state.invulnerableSec=0;d._staticContacts(actor,name==='player');
    const point=d.course.worldAt(actor.s,actor.lateral);point.y=undefined;
    ok(actor.s<tunnel.start&&actor.speedMph<12,`${name}: the outer tunnel rock stops a lateral20m approach`);
    ok(cover.every(obstacle=>!sweepObstacle(point,point,obstacle,point.heading,d._vehicleSpec(actor))),`${name}: resolving the outer cover leaves no intersecting vehicle shell`);
  }
  eq(d.state.majorCrashes,1,'only the player’s own hard tunnel impact counts toward major damage');
  const flyer=d.state.rival;
  Object.assign(flyer,{prevS:tunnel.start-15,s:tunnel.start+18,prevLateral:20,lateral:20,speedMph:110,headingError:0,airHeight:40,prevAirHeight:40,airborne:true});
  d._staticContacts(flyer,false);ok(flyer.s>tunnel.start+17&&flyer.speedMph===110,'swept scenery permits a vehicle fully above the cover');
  Object.assign(flyer,{prevS:tunnel.start-15,s:tunnel.start+18,prevLateral:20,lateral:20,speedMph:110,headingError:0,airHeight:.5,prevAirHeight:.5,airborne:true});
  d._staticContacts(flyer,false);ok(flyer.s<tunnel.start&&flyer.speedMph<12,'a low airborne vehicle cannot pass through the tunnel hill');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
