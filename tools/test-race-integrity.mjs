import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { App } from '../src/app.js';
import { COURSE, LIVES, ROAD_SHOULDER_WIDTH } from '../src/config.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const chaseIndex = COURSE.findIndex(event => event.kind === 'chase');
const harborIndex = COURSE.findIndex(event => event.id === 'harbor-highlands');
function chase() {
  const d = new Duel({ seed: 1989 }); d.startCampaign({ startStage: chaseIndex });
  d.state.status = 'racing'; d.state.traffic = []; d.state.police.pursuit = null; return d;
}

// Harbor Route C: a clean physical crossing on the visible shoulder or just
// inside a finish post must not silently invalidate the lap. Use real driving
// steps here, including static collision checks, rather than awarding a gate.
for (const side of [-1, 1]) for (const line of ['checkpoint', 'lap', 'finish']) {
  const d = new Duel({ seed: 17 }); d.startCampaign({ startStage: harborIndex, mode: 'timetrial' });
  const s = d.state, lap = line === 'finish' ? 1 : 0;
  const threshold = lap * d.course.length + (line === 'checkpoint' ? d._lapGates[0] : d.course.length);
  const lateral = side * (line === 'checkpoint' ? 7.4 : 7.1), events = [];
  d.onChange((_, event) => events.push(event));
  Object.assign(s, { status: 'racing', traffic: [], s: threshold - .6, prevS: threshold - .6,
    lateral, prevLateral: lateral, speedMph: 60, stageTimeSec: 100, completedLaps: lap,
    nextLapGate: line === 'checkpoint' ? 0 : d._lapGates.length });
  const beforeLives = s.lives;
  for (let step = 0; step < 8 && s.s < threshold; step++) d.step(1 / 120);
  check(s.s >= threshold, `${line}: a real edge crossing keeps its position`);
  check(line === 'checkpoint' ? s.nextLapGate === 1 : s.completedLaps === lap + 1,
    `${line}: the collision-free visible crossing registers on side ${side}`);
  check(s.majorCrashes === 0 && s.lives === beforeLives && !s.impactTimer &&
    Object.values(s.damageZones).every(value => value === 0), 'the edge crossing does not hit a post or other scenery');
  check(!events.some(event => event.checkpointReset), 'a clean edge crossing never triggers the delayed missed-checkpoint reset');
  if (line === 'finish') check(s.results?.completed && s.results.laps === 2, 'the final edge crossing produces a completed two-lap result');
}

function crossLine(d, actor, threshold, lateral, nextLateral = lateral) {
  Object.assign(actor, { prevS: threshold - .5, s: threshold + .5, prevLateral: lateral, lateral: nextLateral, speedMph: 100 });
  d.state.stageTimeSec += 10;
  d._advanceLaps(actor, 1 / 60);
}

// Each campaign route, both road edges, both racers and both laps use the
// same bounded envelope. Shoulder acceptance must not turn gravel into asphalt.
for (const seed of [1989, 42, 17]) for (const event of COURSE.filter(event => !event.kind)) for (const side of [-1, 1]) {
  const d = new Duel({ seed }); d.startCampaign({ startStage: event.stage });
  const s = d.state; s.status = 'racing'; s.traffic = [];
  for (const actor of [s, s.rival]) for (let lap = 0; lap < 2; lap++) {
    for (const [index, gate] of d._lapGates.entries()) {
      const threshold = lap * d.course.length + gate, lateral = side * (d.course.roadHalfWidthAt(threshold) + ROAD_SHOULDER_WIDTH);
      crossLine(d, actor, threshold, lateral);
      check(actor.nextLapGate === index + 1, 'every ordered gate accepts the exact shoulder edge');
      const surface = d._drivingSurface(threshold, lateral);
      check(!surface.mainRoad && !surface.boostAllowed && surface.traction < 1, 'the accepted shoulder keeps off-road grip and boost rules');
    }
    const threshold = (lap + 1) * d.course.length;
    crossLine(d, actor, threshold, side * (d.course.roadHalfWidthAt(threshold) + .1));
    check(actor.completedLaps === lap + 1 && actor.s === threshold + .5, 'each completed lap keeps the racer at the crossed line');
  }
}

// The added shoulder is not permission to cut across the countryside. Measure
// lateral position at the crossing instant, not at either end of the step.
for (const side of [-1, 1]) {
  const d = new Duel({ seed: 17 }); d.startCampaign({ startStage: harborIndex, mode: 'timetrial' });
  const s = d.state, gate = d._lapGates[0], limit = d.course.roadHalfWidthAt(gate) + ROAD_SHOULDER_WIDTH;
  s.status = 'racing'; s.traffic = [];
  for (const distance of [limit + .001, 20, 65]) {
    crossLine(d, s, gate, side * distance);
    check(s.nextLapGate === 0, 'just beyond the shoulder and distant fields do not count');
  }
  crossLine(d, s, gate, side * (limit + 1), side * (limit - .5));
  check(s.nextLapGate === 0, 'returning to the shoulder after the line cannot repair an outside crossing');
  crossLine(d, s, gate, side * (limit - 1), side * (limit + .5));
  check(s.nextLapGate === 1, 'a valid interpolated crossing counts even if the step ends just outside');
  s.nextLapGate = 0;
  Object.assign(s, { prevS: gate + .5, s: gate - .5, prevLateral: side * limit, lateral: side * limit });
  d._advanceLaps(s, 1 / 60);
  check(s.nextLapGate === 0, 'reverse shoulder crossings cannot award progress');
  Object.assign(s, { prevS: gate - 100, s: gate + .5 }); d._advanceLaps(s, 1 / 60);
  check(s.nextLapGate === 0, 'teleporting across a shoulder gate cannot award progress');
  crossLine(d, s, d._lapGates[1], side * limit);
  check(s.nextLapGate === 0, 'crossing a later shoulder gate does not skip the missing earlier gate');
  crossLine(d, s, d.course.length, side * 7.1);
  check(s.completedLaps === 0 && s.s < gate, 'a valid finish opening still rejects an incomplete circuit');
  s.nextLapGate = d._lapGates.length;
  crossLine(d, s, d.course.length, side * (limit + .001));
  check(s.completedLaps === 0, 'driving outside the finish opening cannot complete a lap');
}

// The long legacy campaign matrix does not contain Route C. Keep its Harbor
// full-race regression here, so even quick runs cover this reported route.
{
  const previousStorage = globalThis.localStorage, outcomes = [];
  try {
    for (const fps of [30, 144]) {
      const memory = new Map();
      globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)) };
      const app = new App(), events = []; app.autopilot = true;
      app.startCampaign({ startStage: harborIndex, routeVariant: 'route_c', car: 'falcone_f42', mode: 'timetrial', cpuDifficulty: 'medium' });
      app.duel.onChange((_, event) => {
        if (event.lapCheckpoint || event.lapCompleted || event.checkpointReset) events.push(event);
      });
      for (let frame = 0; frame < fps * 240 && ['countdown', 'racing', 'ticket'].includes(app.duel.state.status); frame++) app.advance(1 / fps);
      const s = app.duel.state;
      check(s.seed === 17 && s.results?.completed && s.results.won && s.completedLaps === 2, 'ordinary inputs complete Harbor Route C on Medium');
      check(events.filter(event => event.lapCheckpoint).length === 6 && events.filter(event => event.lapCompleted).length === 2,
        'the full race drives through all six checkpoints and both lap lines');
      check(!events.some(event => event.checkpointReset) && !s.boundaryResets && !s.majorCrashes, 'the full Route C race has no false reset or crash');
      outcomes.push({ time: s.results.timeSec, score: s.score, lapTimes: s.lapTimes, events });
    }
    assert.deepEqual(outcomes[0], outcomes[1]); checks++;
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
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
