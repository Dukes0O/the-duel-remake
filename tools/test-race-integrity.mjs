import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { App } from '../src/app.js';
import { COURSE, LIVES } from '../src/config.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const chaseIndex = COURSE.findIndex(event => event.kind === 'chase');
function chase() {
  const d = new Duel({ seed: 1989 }); d.startCampaign({ startStage: chaseIndex });
  d.state.status = 'racing'; d.state.traffic = []; d.state.police.pursuit = null; return d;
}
{
  const d = new Duel({ seed: 1989 });
  d.startCampaign({ seed: 42 });
  check(d.seed === 42 && d.state.seed === 42 && d.course.seed === 42, 'an explicit route seed enters state and geometry together');
  d.seed = 17; d.startCampaign();
  check(d.state.seed === 17 && d.course.seed === 17, 'legacy direct seed overrides still sync when a new race starts');
  for (const seed of [Infinity, NaN, 2.5, '42', null]) { d.startCampaign({ seed }); check(d.state.seed === 17 && d.course.seed === 17, 'invalid route seeds cannot corrupt race identity'); }
  d.startCampaign({ seed: 0 }); check(d.state.seed === 0 && d.course.seed === 0, 'zero is a valid explicit seed');
  d._recordBest('route-identity-integrity', 60); d.state.seed = 42;
  check(d._bestFor('route-identity-integrity') === null, 'local personal-best comparisons do not cross route seeds');
  d.state.seed = 0; d.state.lapsTotal = 1;
  check(d._bestFor('route-identity-integrity') === null, 'a one-lap record cannot improve a two-lap personal best');
  d.state.lapsTotal = 2;
  check(d._bestFor('route-identity-integrity') === 60, 'returning to the matching route restores its own record');
  const ordinaryKey = d._bestKey('route-identity-integrity');
  d.course = { def: { ...d.course.def, layoutVersion: 99 } };
  check(d._bestKey('route-identity-integrity') !== ordinaryKey, 'changed route geometry has a distinct local timing identity');
}

// A skid can physically cross a timing line while lap processing is paused.
// Recovery must put the racer before the unvalidated line, then let ordinary
// movement validate it. It must not silently skip a lap or award one at reset.
for (const thresholdName of ['checkpoint', 'lap', 'finish']) {
  const d = chase(), s = d.state;
  const lap = thresholdName === 'finish' ? 1 : 0;
  const threshold = lap * d.course.length + (thresholdName === 'checkpoint' ? d._lapGates[0] : d.course.length);
  Object.assign(s, { s: threshold - .4, prevS: threshold - .4, speedMph: 100, lateral: 0, completedLaps: lap,
    nextLapGate: thresholdName === 'checkpoint' ? 0 : d._lapGates.length, stageTimeSec: 30, lapStartedAt: 0 });
  d._crash('head_on');
  let crossedDuringSkid = false;
  for (let i = 0; i < 600 && s.impactTimer > 0; i++) { d.step(1 / 120); crossedDuringSkid ||= s.s >= threshold; }
  check(thresholdName === 'finish' || crossedDuringSkid, 'the fixture exercises an interrupted timing-line crossing');
  check(s.s < threshold && s.completedLaps === lap, 'recovery stays before the pending line without awarding a lap');
  check(s.majorCrashes === 1 && s.lives === LIVES.start && !s.catastrophic, 'a chase crash remains recoverable and preserves the vehicle');
  for (let i = 0; i < 480 && s.status === 'racing'; i++) d.step(1 / 120);
  check(thresholdName === 'checkpoint' ? s.nextLapGate === 1 : s.completedLaps === lap + 1, 'ordinary driving after recovery validates the pending checkpoint or lap');
  if (thresholdName === 'finish') check(s.results?.completed && s.results.won && s.results.seed === s.seed, 'a final-line chase crash can still recover and complete with its route seed before the deadline');
}
{
  const d = chase(), s = d.state, gate = d._lapGates[0];
  Object.assign(s, { s: gate + 25, prevS: gate - 2, lateral: 90, speedMph: 100 });
  d._boundary(s);
  check(s.s < gate && s.s === s.prevS && s.nextLapGate === 0, 'an out-of-bounds reset cannot skip a pending checkpoint');
  check(s.lives === LIVES.start && s.majorCrashes === 0 && s.racePenaltySec === 0, 'checkpoint-safe boundary recovery stays harmless');
  Object.assign(s, { s: d.course.length + .2, prevS: d.course.length - .2, lateral: 90, speedMph: 100, nextLapGate: d._lapGates.length });
  d._boundary(s);
  check(s.s < d.course.length && s.completedLaps === 0, 'boundary recovery cannot lose the first lap finish crossing');
  const r = s.rival = { s: d.course.length + .2, prevS: d.course.length - .2, lateral: 90, speedMph: 120, completedLaps: 0, nextLapGate: d._lapGates.length };
  d._boundary(r); check(r.s < d.course.length && r.completedLaps === 0, 'the same lap protection applies to the rival');
}
{
  const d = new Duel({ seed: 1989 }); d.startCampaign(); const s = d.state, cut = d.course.features.shortcuts[0];
  const middle = (cut.start + cut.end) / 2;
  Object.assign(s, { status: 'racing', s: middle, prevS: middle - 1, lateral: d.course.shortcutOffset(cut, middle), speedMph: 100,
    nextLapGate: d._lapGates.filter(gate => gate < middle).length });
  const before = s.s; d._boundary(s);
  check(s.s === before && !s.boundaryResets, 'a wide legal branch remains valid during checkpoint-safe recovery changes');
  s.lateral += Math.sign(s.lateral) * 70; d._boundary(s);
  check(s.s <= before && s.s < d._lapGates[s.nextLapGate] && !s.majorCrashes, 'leaving a branch can only recover backward within the validated segment');
  Object.assign(s, { prevS: d.course.length - 2, s: d.course.length + 1, lateral: 0, prevLateral: 0, speedMph: 100, nextLapGate: 0 });
  d._advanceLaps(s, 1 / 120);
  check(s.completedLaps === 0 && s.s < d._lapGates[0], 'a missed checkpoint blocks a finish even after a shortcut excursion');
}

// Replay one real ramp twice on the same validated lap. A checkpoint recovery
// may revisit scenery, but cannot multiply landed-jump objectives or rewards.
{
  const app = new App(); app.autopilot = true;
  app.duel.startCampaign({ startStage: COURSE.findIndex(event => event.id === 'titan-arena'), seed: 1989 });
  app._scriptedCrashDone = true;
  const d = app.duel, s = d.state; s.rival = null;
  let frames = 0;
  while (s.jumps < 1 && frames++ < 120 * 20) app.advance(1 / 120);
  check(s.jumps === 1 && s.collectedJumps.length === 1, 'the first physical ramp landing earns one jump');
  const score = s.jumpScore, key = s.collectedJumps[0], ramp = d.course.features.ramps[0];
  Object.assign(s, { s: ramp.start - 24, prevS: ramp.start - 24, lateral: 0, prevLateral: 0, speedMph: 90, headingError: 0,
    yawVelocity: 0, steerVisual: 0, airborne: false, airHeight: 0, prevAirHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null });
  let air = false; frames = 0;
  while (s.s < ramp.end + 100 && frames++ < 120 * 12) { app.advance(1 / 120); air ||= s.airborne; }
  check(air && s.jumps === 1 && s.jumpScore === score && s.collectedJumps[0] === key, 'a second flight from the same ramp/lap does not duplicate score or objective credit');
  Object.assign(s, { airborne: true, airHeight: 10, _jumpY: 10, _verticalSpeed: -1, _jumpOrigin: { s: s.s - 40, world: d.course.worldAt(s.s - 40, 0), rampId: 'ramp-1', lap: 1 } });
  d._safeReset(s); d._jump(s, 1 / 120);
  check(!s._jumpOrigin && s.jumps === 1 && s.jumpScore === score, 'an interrupted airborne recovery cannot fake a landing reward');
}
{
  const d = chase(), s = d.state; const events = [];
  d.onChange((_, event) => events.push(event));
  Object.assign(s, { s: 500, prevS: 500, speedMph: 100 });
  for (let hit = 0; hit < 7; hit++) {
    s.impactTimer = 0; s.invulnerableSec = 0; s.speedMph = 100; d._crash('building');
    check(s.status === 'racing' && s.lives === LIVES.start && !s.catastrophic, 'even repeated severe chase crashes preserve the car and run');
  }
  check(s.majorCrashes === 7 && s.racePenaltySec === 56, 'each chase impact has its normal time cost exactly once');
  s.stageTimeSec = s.timeLimitSec; s.impactTimer = 0; d.step(1 / 120); d.step(1 / 120); d._finishStage();
  check(s.results.timeout && !s.results.completed && !s.results.won && s.results.seed === s.seed && events.filter(event => event.stageResult).length === 1, 'an expired chase settles one loss with its route seed and cannot be converted into a completed win');
}
console.log(`Race integrity: ${checks} checks passed.`);
