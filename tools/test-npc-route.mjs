import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { CARS, DRIVE, CPU_DIFFICULTY } from '../src/config.js';
import { NpcRoutePlanner } from '../src/npc-route.js';
import { App } from '../src/app.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const d = new Duel({ seed: 1989 }); d.startCampaign({ cpuDifficulty: 'hard' });
const car = CARS[d.state.car], course = d.course;
let samples = 0;
const planner = new NpcRoutePlanner(course, { car, surfaceAt: (s, off) => { samples++; return d._drivingSurface(s, off, car); } });
const cut = course.features.shortcuts[0], profile = planner.profile(cut.id, 'hard');
const actor = (lap = 0) => ({ s: profile.entry + 1 + lap * course.length, lateral: -DRIVE.laneOffset, speedMph: 120, headingError: 0 });
check(profile.savingSeconds > .25 && profile.branch.meters < profile.main.meters, 'the selected Pacific branch saves physical distance and predicted time');
check(profile.branch.samples.some(p => Math.abs(p.relativeHeading) > .2), 'cached samples retain the branch tangent instead of the main-road tangent');
check(profile.branch.samples.every(p => Number.isFinite(p.curvature) && p.speedMph <= Math.min(p.speedLimit, car.topSpeed * CPU_DIFFICULTY.hard.skill) + 1e-8), 'every route speed respects tire curvature, surface and unchanged CPU pace');
for (let i = 0; i < profile.branch.samples.length - 1; i++) {
  const a = profile.branch.samples[i], b = profile.branch.samples[i + 1];
  check((a.speedMph * DRIVE.mphToWorld) ** 2 <= (b.speedMph * DRIVE.mphToWorld) ** 2 + 2 * DRIVE.brakeAccel * car.braking * DRIVE.mphToWorld * b.distance + 1e-6, 'the profile can brake before the next corner');
}
const cachedSamples = samples;
check(planner.profile(cut.id, 'hard') === profile && samples === cachedSamples, 'cached planning avoids repeated surface queries');
check(planner.update(actor(), { difficulty: 'easy' }) === null, 'Easy keeps the main road');
check(planner.update(actor(), { difficulty: 'medium' }) === null, 'Medium keeps the main road on lap one');
const late = actor(1), latePlan = planner.update(late, { difficulty: 'medium' });
check(latePlan?.routeLap === 2 && latePlan.entryS > course.length && latePlan.exitS > course.length, 'Medium chooses a useful lap-two branch with absolute entry and exit');
for (const lap of [0, 1]) check(planner.update(actor(lap), { difficulty: 'hard' })?.routeLap === lap + 1, 'Hard can choose a clear useful branch on either lap');
const middle = actor(); middle.s = (cut.start + cut.end) / 2;
check(planner.update(middle, { difficulty: 'hard' }) === null, 'a main-road NPC never enters a branch through its middle');
const blocked = actor(), truck = { s: blocked.s + 15, lateral: -3.4, speedMph: 20, alive: true, dir: 1 };
check(planner.update(blocked, { difficulty: 'hard', traffic: [truck] }) === null, 'a slow vehicle blocks the entry rather than being driven through');
check(planner.update(blocked, { difficulty: 'hard', traffic: [{ ...truck, lateral: 50 }] })?.routeId === cut.id, 'a remote vehicle fifty metres away does not block the branch');
const follower = actor(), before = JSON.stringify(follower);
planner.update(follower, { difficulty: 'hard' });
check(JSON.stringify(follower) === before, 'planning does not alter actor position, heading, speed or progress');
follower.s = (cut.start + cut.end) / 2; follower.lateral = course.shortcutOffset(cut, follower.s);
const ordinary = planner.update(follower, { difficulty: 'hard' });
const player = { s: follower.s + 12, lateral: ordinary.targetLateral, speedMph: 35, headingError: 0 };
const yieldPlan = planner.update(follower, { difficulty: 'hard', player, yieldingToPlayer: true });
check(yieldPlan.mustYield && yieldPlan.targetSpeedMph <= 35, 'player cut-in yielding overrides shortcut acceleration');
check(yieldPlan.routeId === ordinary.routeId, 'yielding preserves a safe committed branch rather than steering across the gap');
follower.s = cut.end + 40; follower.lateral = planner.update(follower, { difficulty: 'hard' }).targetLateral;
const merge = planner.update(follower, { difficulty: 'hard', player: { s: follower.s + 10, lateral: -3.4, speedMph: 25 } });
check(merge.phase === 'exit' && merge.mustYield && merge.targetSpeedMph <= 25, 'a blocked merge brakes while preserving the route exit');
planner.reset(follower);
check(planner.routeFor(follower) === null && planner.update(follower, { difficulty: 'hard' }) === null, 'recovery clears route intent and cannot re-enter the same branch halfway through');
const tracked = actor(); planner.update(tracked, { difficulty: 'hard' });
const afterWarmup = samples;
for (let i = 0; i < 1200; i++) { tracked.s = profile.entry + i * .5; planner.update(tracked, { difficulty: 'hard' }); }
check(samples === afterWarmup, 'twelve hundred route-following decisions use cached geometry without terrain or surface scans');
tracked.s = profile.exit + 1;
check(planner.update(tracked, { difficulty: 'hard' }) === null && planner.routeFor(tracked) === null, 'the branch hands back control after the physical merge');

// Actual rival integration: compare the same car and pace on the same course.
// Only the planner is disabled in the control replay; no actor progress is
// written after initialization, and all scenery/boundary contacts remain live.
const replays = [];
for (const stage of [0, 5]) for (const difficulty of ['medium', 'hard']) {
  const fixture = new Duel({ seed: 1989 }); fixture.startCampaign({ startStage: stage, cpuDifficulty: difficulty });
  const branch = fixture.course.features.shortcuts[0], lapBase = difficulty === 'medium' ? fixture.course.length : 0;
  const snapshot = structuredClone(fixture.state);
  Object.assign(snapshot, { status: 'racing', traffic: [], s: -10000, lateral: 1000 });
  Object.assign(snapshot.rival, { s: lapBase + branch.start - 145, prevS: lapBase + branch.start - 145, lateral: -3.4, speedMph: 140,
    completedLaps: difficulty === 'medium' ? 1 : 0, nextLapGate: 0 });
  const row = { stage, difficulty };
  for (const enabled of [false, true]) {
    const race = new Duel({ seed: 1989 }); race.state = structuredClone(snapshot); race.course = fixture.course; race._lapGates = fixture._lapGates;
    race._obstacleQueryCache = new Map(); race._obstacleArray = race.course.features.obstacles;
    if (!enabled) race._npcRoutePlanner = { course: race.course, car: CARS[race.state.car], update: () => null };
    const rival = race.state.rival, end = lapBase + branch.end + 100;
    let elapsed = 0, chosen = false, maxError = 0, contactFrames = 0, previous = rival.s;
    while (rival.s < end && elapsed < 80) {
      previous = rival.s; race._rival(1 / 120); elapsed += 1 / 120;
      chosen ||= Boolean(rival.routeId); contactFrames += rival.contactCooldown > 0 ? 1 : 0;
      if (rival.routeId && rival.s >= lapBase + branch.start && rival.s <= lapBase + branch.end) maxError = Math.max(maxError, Math.abs(rival.lateral - race.course.shortcutOffset(branch, rival.s)));
      check(rival.s >= previous - .001, 'route following never jumps backward or resets through scenery');
    }
    check(rival.s >= end && !contactFrames, 'the rival completes the entry, branch and merge without hitting scenery');
    check(enabled ? chosen && maxError < 1 : !chosen, 'the enabled rival follows the real branch within one metre while the control stays on the main route');
    row[enabled ? 'branchSeconds' : 'mainSeconds'] = +(elapsed - (rival.s - end) / (rival.s - previous) / 120).toFixed(3);
    if (enabled) row.maxTrackingError = +maxError.toFixed(3);
  }
  check(row.branchSeconds < row.mainSeconds - .25, 'route strategy gains time through actual driving at unchanged pace');
  replays.push(row);
}

{
  const race = new Duel({ seed: 1989 }); race.startCampaign({ cpuDifficulty: 'hard' });
  const st = race.state, r = st.rival, branch = race.course.features.shortcuts[0];
  Object.assign(st, { status: 'racing', traffic: [], s: -10000, lateral: 1000 });
  Object.assign(r, { s: branch.start - 135, lateral: -3.4, speedMph: 160 }); race._rival(1 / 120);
  check(r.routeId === branch.id, 'the rival commits before the cutoff regression begins');
  Object.assign(r, { s: (branch.start + branch.end) / 2, lateral: race.course.shortcutOffset(branch, (branch.start + branch.end) / 2), headingError: 0 });
  Object.assign(st, { s: r.s + 8, lateral: r.lateral, headingError: 0, speedMph: 20 });
  const beforeSpeed = r.speedMph, beforeLives = st.lives;
  race._rival(.05);
  check(r.yieldingToPlayer && r.braking && r.speedMph < beforeSpeed - 5, 'a fast shortcut rival brakes promptly for a slow player cutting in');
  race._vehicleContact(st, r, 'rival');
  check(st.majorCrashes === 0 && st.lives === beforeLives, 'a yielding shortcut rival cannot charge the player a crash or life');
  race._safeReset(r);
  check(r.routeId === null && race._npcRoutePlanner.routeFor(r) === null, 'rival safe recovery clears both exposed and cached branch intent');
  race._rival(1 / 120);
  check(!r.routeId && Math.abs(r.lateral) < 7, 'the recovered rival stays on the main road until a future valid entry');
}

{
  const race = new Duel({ seed: 1989 }); race.startCampaign({ startStage: 5, cpuDifficulty: 'hard' });
  const st = race.state, r = st.rival, branch = race.course.features.shortcuts[0];
  Object.assign(st, { status: 'racing', traffic: [], s: -10000, lateral: 1000 });
  Object.assign(r, { s: branch.start - 135, lateral: -3.4, speedMph: 120 }); race._rival(1 / 120);
  r.s = (branch.start + branch.end) / 2; r.lateral = race.course.shortcutOffset(branch, r.s) + 9;
  r.headingError = 0; r.speedMph = 110;
  const before = r.lateral; race._rival(1 / 120);
  check(r.routeId === branch.id && r.offRoad && Math.abs(r.lateral - before) < .5, 'a shoulder shove stays a gradual physical recovery on the chosen branch');
  for (let frame = 0; frame < 360; frame++) race._rival(1 / 120);
  check(r.routeId === branch.id && Math.abs(r.lateral - race.course.shortcutOffset(branch, r.s)) < 1, 'the rival returns to its nearby branch rather than crossing the wide field to the main road');
}

const raceOutcomes = [];
for (const stage of [0, 5]) for (const difficulty of ['medium', 'hard']) {
  const outcomes = [];
  for (const fps of [30, 144]) {
    const app = new App(); app.autopilot = true; app.duel.seed = 1989;
    app.duel.startCampaign({ startStage: stage, cpuDifficulty: difficulty }); app._scriptedCrashDone = true;
    const choices = new Set(); let frames = 0;
    while (!['stage_result', 'gameover'].includes(app.duel.state.status) && frames++ < fps * 260) {
      app.advance(1 / fps); const r = app.duel.state.rival;
      if (r?.routeId) choices.add(`${r.routeLap}:${r.routeId}`);
    }
    const st = app.duel.state;
    outcomes.push({ status: st.status, time: st.results?.timeSec, won: st.results?.won, score: st.score,
      majorCrashes: st.majorCrashes, resets: st.boundaryResets, rivalTime: st.rival.finishTime, choices: [...choices] });
  }
  check(outcomes.every(o => o.status === 'stage_result' && o.majorCrashes === 0 && o.resets === 0), 'complete races retain solid clean routes and reach a valid two-lap result');
  check(JSON.stringify(outcomes[0]) === JSON.stringify(outcomes[1]), 'rival decisions, finish, score and outcome agree at30 and144 display FPS');
  check(outcomes[0].choices.length > 0 && (difficulty === 'hard' || outcomes[0].choices.every(choice => choice.startsWith('2:'))), 'full-race choices follow the difficulty policy');
  if (difficulty === 'medium') check(outcomes[0].won, 'Medium remains winnable for a clean main-road driver');
  raceOutcomes.push({ stage, difficulty, ...outcomes[0] });
}
console.log(JSON.stringify({ physicalReplays: replays }));
console.log(JSON.stringify({ raceOutcomes }));
console.log(`NPC route planning: ${checks} checks passed.`);
