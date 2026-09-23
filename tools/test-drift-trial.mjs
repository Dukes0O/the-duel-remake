import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { Course } from '../src/course.js';
import { COURSE, LIVES } from '../src/config.js';
import {isValidFinish} from '../src/progression.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const index = COURSE.findIndex(event => event.id === 'neon-drift-trial');
function trial(cpuDifficulty = 'hard') {
  const d = new Duel({ seed: 1989 }); d.startCampaign({ startStage: index, cpuDifficulty, car: 'banshee_muscle', mode: 'timetrial' }); return d;
}
for (const [level, target, limit] of [['easy', 3500, 150], ['medium', 5000, 125], ['hard', 6000, 110]]) {
  const d = trial(level), s = d.state;
  check(s.car === 'banshee_muscle' && s.mode === 'duel' && s.lapsTotal === 2, 'the intended Banshee drift fixture retains the chosen car, objective mode and two laps');
  check(!s.rival && !s.traffic.length && !s.police.pursuit && !d.course.features.radarTraps.length, 'closed city streets have no rival, traffic or pursuit');
  check(s.objective.kind === 'driftTrial' && s.objective.targetScore === target && s.timeLimitSec === limit && s.timeRemaining === limit, `${level} uses its stated score and time goals`);
  check(s.drift.bankedScore === 0 && s.drift.chainScore === 0 && s.drift.visitedTo === 0, 'each entry starts fresh scoring and visited intervals');
}
{
  const d = trial(), chase = new Course(COURSE.find(event => event.kind === 'chase'), 1989);
  for (let s = 0; s < d.course.length; s += 32) {
    const a = d.course.at(s), b = chase.at(s);
    check(Math.hypot(a.x - b.x, a.z - b.z) < 1e-8, 'the trial shares the tested closed city centerline');
  }
}
{
  const d = trial(), s = d.state;
  Object.assign(s, { status: 'racing', s: d.raceLength, stageTimeSec: 60 }); s.drift.bankedScore = 9000;
  check(!d._finishStage() && !s.results, 'score alone cannot skip the required checkpoint-validated laps');
  s.completedLaps = 1; check(!d._finishStage(), 'one completed lap cannot become a drift win');
  d.startCampaign(); check(s.drift === null && s.objective === null && s.timeRemaining === null, 'ordinary races do not retain drift-trial scoring');
}
for (const meetsTarget of [false, true]) {
  const d = trial(), s = d.state, events = [];
  d.onChange((_, event) => events.push(event));
  Object.assign(s, { status: 'racing', s: d.raceLength, completedLaps: 2, stageTimeSec: 60 });
  Object.assign(s.drift, { bankedScore: s.objective.targetScore - 10, chainScore: meetsTarget ? 20 : 0, chainMeters: 10 });
  d._finishStage(); const result = s.results;
  check(result.completed && result.won === meetsTarget && result.targetsMet === meetsTarget && result.objectiveMissed === !meetsTarget, 'a valid finish needs both drift score and its deadline to win');
  check(result.driftTrial && result.driftTarget === 6000 && result.driftScore === (meetsTarget ? 6010 : 5990) && result.challengeLimitSec === 110, 'results expose banked score, target and limit accurately');
  check(isValidFinish({...result,car:s.car,cpuDifficulty:s.cpuDifficulty})===meetsTarget,
    'a completed score failure cannot enter per-player best comparisons');
  check(s.drift.finished && s.drift.chainScore === 0, 'a completed event closes and banks its last active chain once');
  d._finishStage(); check(events.filter(event => event.stageResult).length === 1, 'repeated finish calls emit one result');
  d.nextStage(); check(s.status === 'complete', 'the drift trial is standalone rather than joining the campaign');
}
{
  const d = trial(), s = d.state, events = [];
  d.onChange((_, event) => events.push(event));
  Object.assign(s, { status: 'racing', stageTimeSec: 102, racePenaltySec: 8, s: 500 });
  Object.assign(s.drift, { bankedScore: 5500, chainScore: 1000, chainMeters: 150 }); d._deadline();
  check(s.results.timeout && !s.results.completed && !s.results.won && s.results.driftScore === 5500, 'an expired trial loses its unbanked chain instead of using it to meet the goal');
  check(s.timeRemaining === 0 && !s.catastrophic && s.lives === LIVES.start, 'a timeout uses the penalty-adjusted clock and preserves the vehicle');
  d._deadline(); d._finishStage(); check(events.filter(event => event.stageResult).length === 1, 'a timeout settles exactly once');
  const late = trial(); Object.assign(late.state, { status: 'racing', s: late.raceLength, completedLaps: 2, stageTimeSec: 110 }); late.state.drift.bankedScore = 7000; late._finishStage();
  check(late.state.results.timeout && !late.state.results.completed && !late.state.results.won, 'a direct late finish cannot bypass the challenge clock');
}
for (const invulnerable of [0, 2]) {
  const d = trial(), s = d.state, wall = d.course.features.obstacles.find(obstacle => obstacle.kind === 'building');
  Object.assign(s, { status: 'racing', prevS: wall.s - 1, s: wall.s, lateral: wall.off, prevLateral: wall.off,
    speedMph: 2, headingError: 0, invulnerableSec: invulnerable });
  Object.assign(s.drift, { bankedScore: 1000, chainScore: 300, chainMeters: 40 });
  d._staticContacts(s, true);
  check(s.drift.bankedScore === 1000 && s.drift.chainScore === 0 && s.drift.lastEvent?.reason === 'hit', 'even a protected gentle wall contact breaks the pending chain without taking banked points');
  check(!s.majorCrashes && !s.impactTimer, 'drift eligibility does not turn a gentle contact into a damaging crash');
}
{
  const d = trial('easy'), s = d.state;
  Object.assign(s, { status: 'racing', s: 500, prevS: 500, speedMph: 100 });
  Object.assign(s.drift, { bankedScore: 1000, chainScore: 500, chainMeters: 70, visitedTo: 700, lastS: 500 });
  for (let hit = 0; hit < 7; hit++) { s.impactTimer = 0; s.speedMph = 100; d._crash('building'); }
  check(s.status === 'racing' && s.majorCrashes === 7 && !s.catastrophic && s.lives === LIVES.start && s.racePenaltySec === 56, 'seven severe trial impacts cost time but never destroy the Banshee');
  check(s.drift.bankedScore === 1000 && s.drift.chainScore === 0 && s.drift.visitedTo === 700, 'crashes lose pending points while preserving banked score and anti-farming history');
  s.impactTimer = 0; s.drift.chainScore = 100; d._safeReset(s);
  check(s.drift.chainScore === 0 && s.drift.visitedTo === 700 && s.drift.lastEvent.reason === 'reset', 'safe recovery reports and clears a chain without rewinding its visited interval');
}

const replays = [];
for (const cpuDifficulty of ['easy', 'medium', 'hard']) for (const difficulty of ['casual', 'pro']) {
  const outcomes = [];
  for (const fps of [30, 144]) {
    const app = new App(); app.autopilot = true;
    app.duel.startCampaign({ startStage: index, car: 'banshee_muscle', cpuDifficulty, difficulty, seed: 1989 }); app._scriptedCrashDone = true;
    let frames = 0;
    while (!['stage_result', 'gameover'].includes(app.duel.state.status) && frames++ < fps * 200) app.advance(1 / fps);
    const s = app.duel.state, r = s.results;
    outcomes.push({ time: r?.timeSec, won: r?.won, completed: r?.completed, score: r?.driftScore, best: r?.driftBestChain,
      metres: r?.driftMeters, hits: s.majorCrashes, resets: s.boundaryResets, laps: s.completedLaps, styleScore: s.stageStyleScore });
  }
  check(outcomes.every(r => r.completed && r.won && r.laps === 2 && !r.hits && !r.resets), `${cpuDifficulty}/${difficulty}: ordinary steering and shifts can win cleanly`);
  assert.deepEqual(outcomes[0], outcomes[1]); checks++;
  check(outcomes[0].styleScore === outcomes[0].score*(difficulty==='pro'?2:1), 'banked drift points enter style score once, with the Pro multiplier');
  replays.push({ cpuDifficulty, difficulty, ...outcomes[0] });
}
const recoveryReplays = [];
for (const level of ['easy', 'medium', 'hard']) {
  const app = new App(); app.autopilot = true; app.duel.startCampaign({ startStage: index, car: 'banshee_muscle', cpuDifficulty: level, seed: 1989 }); app._scriptedCrashDone = true;
  let hit = false, frames = 0;
  while (!['stage_result', 'gameover'].includes(app.duel.state.status) && frames++ < 120 * 180) {
    const s = app.duel.state;
    if (!hit && s.s > 1800 && s.drift.chainScore > 40) { app.duel._crash('building'); hit = true; }
    app.advance(1 / 120);
  }
  const s = app.duel.state;
  check(hit && s.racePenaltySec === 8 && s.stageCrashes === 1 && s.majorCrashes === (s.results.won?0:1) && !s.catastrophic, 'the physical impact keeps its eight-second cost and stage evidence; only a win repairs it');
  check(level === 'hard' ? s.results.timeout && !s.results.won : s.results.completed && s.results.won, 'Easy and Medium allow this mistake; Hard requires a cleaner or faster drive');
  recoveryReplays.push({ level, time: s.results.timeSec, driftScore: s.results.driftScore, completed: s.results.completed, won: s.results.won });
}
console.log(JSON.stringify({ driftTrialReplays: replays }));
console.log(JSON.stringify({ recoveryReplays }));
console.log(`Neon Drift Trial: ${checks} checks passed.`);
