import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COURSE } from '../src/config.js';
import { Duel } from '../src/game.js';

const fixturePath = fileURLToPath(new URL('./replays/recorded-inputs.json', import.meta.url));
const expectedPath = fileURLToPath(new URL('./replays/expected-fingerprints.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const expectedCategories = ['duel', 'time trial', 'Mad Max', 'chase', 'drift', 'checkpoint rush', 'stunt', 'practice'];
const number = value => Number.isFinite(value) ? +value.toFixed(5) : value ?? null;
const pick = (object, keys) => object ? Object.fromEntries(keys.map(key => [key, number(object[key])])) : null;

function validateFixture() {
  assert.equal(fixture.version, 1);
  assert.equal(fixture.stepHz, 120);
  assert.deepEqual(fixture.framesPerSecond, [30, 60, 144]);
  assert.ok(Number.isSafeInteger(fixture.seed));
  assert.ok(Number.isInteger(fixture.durationTicks) && fixture.durationTicks >= 120 * 5);
  assert.equal(COURSE.length, 16, 'fixture must be reviewed if the event roster changes');
  assert.equal(fixture.cases.length, 18, '16 primary events plus time trial and Mad Max');
  const eventIds = new Set(COURSE.map(event => event.id));
  const primary = new Set();
  const ids = new Set();
  for (const race of fixture.cases) {
    assert.ok(eventIds.has(race.eventId), `unknown event ${race.eventId}`);
    assert.ok(!ids.has(race.id), `duplicate replay ${race.id}`);
    ids.add(race.id);
    if (!['time trial', 'Mad Max'].includes(race.category)) {
      assert.ok(!primary.has(race.eventId), `duplicate primary event ${race.eventId}`);
      primary.add(race.eventId);
    }
  }
  assert.deepEqual([...primary].sort(), [...eventIds].sort(), 'every event needs one primary replay');
  assert.deepEqual([...new Set(fixture.cases.map(race => race.category))].sort(), expectedCategories.sort());
  for (const list of [fixture.inputs, fixture.weaponInputs]) {
    assert.ok(list.every((input, index) => Number.isInteger(input.atTick) && input.atTick >= 0 &&
      input.atTick < fixture.durationTicks && (index === 0 || input.atTick > list[index - 1].atTick)),
    'recorded inputs must have strictly increasing in-range tick numbers');
  }
}

function sample(state, tick) {
  return {
    tick,
    status: state.status,
    mode: state.mode,
    position: pick(state, ['s', 'lateral', 'speedMph', 'headingError', 'yawVelocity']),
    driving: pick(state, ['gear', 'revs', 'boost', 'boosting', 'offRoad', 'preparedGravel', 'airborne', 'airHeight', 'roughness', 'slipAngle', 'drifting']),
    progress: pick(state, ['completedLaps', 'nextLapGate', 'stageTimeSec', 'timeRemaining', 'score', 'stageStyleScore', 'nearMisses', 'jumps', 'crushCount', 'majorCrashes', 'lives', 'boundaryResets']),
    rival: pick(state.rival, ['s', 'lateral', 'speedMph', 'completedLaps', 'nextLapGate', 'finished']),
    traffic: state.traffic.slice(0, 3).map(actor => pick(actor, ['s', 'lateral', 'speedMph', 'alive'])),
    police: { triggered: state.police.triggered, tickets: state.police.ticketCount,
      pursuit: pick(state.police.pursuit, ['s', 'gapU', 'active']) },
    drift: pick(state.drift, ['bankedScore', 'bestChain', 'driftMeters']),
    checkpoint: pick(state.checkpointRush, ['passed', 'missed', 'nextGate']),
    combat: state.combat ? { hits: state.combat.hits, shield: number(state.combat.shield),
      projectiles: state.combat.projectiles.length, bursts: state.combat.bursts.length } : null,
    result: state.results ? pick(state.results, ['completed', 'won', 'timeSec', 'score', 'laps']) : null,
  };
}

function replay(race, fps) {
  const index = COURSE.findIndex(event => event.id === race.eventId);
  const duel = new Duel({ seed: fixture.seed });
  duel.startCampaign({
    startStage: index, seed: fixture.seed, mode: race.mode, car: race.car,
    difficulty: 'casual', cpuDifficulty: 'easy',
  });
  assert.equal(duel.state.stageIndex, index, `${race.id}: wrong event`);
  assert.equal(duel.state.car, race.car, `${race.id}: wrong car`);
  assert.equal(duel.state.mode, race.mode, `${race.id}: wrong mode`);
  assert.equal(duel.state.practice, race.category === 'practice', `${race.id}: practice mismatch`);
  const specialKinds = { chase: 'chase', drift: 'drift', 'checkpoint rush': 'checkpoint' };
  if (specialKinds[race.category]) assert.equal(COURSE[index].kind, specialKinds[race.category], `${race.id}: wrong event kind`);
  if (race.category === 'stunt') assert.ok(COURSE[index].stuntTrial && duel.state.objective, `${race.id}: no stunt objective`);
  if (race.category === 'Mad Max') assert.ok(duel.state.combat, `${race.id}: combat is inactive`);
  if (race.category === 'practice') assert.equal(duel.state.timeLimitSec, null, `${race.id}: practice has a deadline`);
  const samples = [];
  let tick = 0, inputIndex = 0, weaponIndex = 0;
  const frames = Math.ceil(fixture.durationTicks * fps / fixture.stepHz);
  for (let frame = 1; frame <= frames; frame++) {
    const targetTick = Math.min(fixture.durationTicks, Math.floor(frame * fixture.stepHz / fps + 1e-9));
    while (tick < targetTick) {
      if (fixture.inputs[inputIndex]?.atTick === tick) duel.setInput(fixture.inputs[inputIndex++]);
      if (race.mode === 'wasteland' && fixture.weaponInputs[weaponIndex]?.atTick === tick) {
        duel.fireWeapon(fixture.weaponInputs[weaponIndex++].weapon);
      }
      duel.step(1 / fixture.stepHz);
      tick++;
      if (tick % fixture.stepHz === 0 || tick === fixture.durationTicks) samples.push(sample(duel.state, tick));
    }
  }
  assert.equal(tick, fixture.durationTicks, `${race.id}: frame schedule lost simulation ticks`);
  assert.ok(duel.state.stageTimeSec > 0, `${race.id}: replay never started driving`);
  assert.ok(samples.some(row => row.position.s > 20), `${race.id}: recorded inputs did not drive the event`);
  return createHash('sha256').update(JSON.stringify({ id: race.id, eventId: race.eventId, fpsIndependentSamples: samples })).digest('hex');
}

validateFixture();
const recording = process.argv.length === 3 && process.argv[2] === '--record';
assert.ok(recording || process.argv.length === 2, 'usage: node tools/test-replays.mjs [--record]');
const baseline = recording ? { version: 1, fixtureVersion: fixture.version, stepHz: fixture.stepHz, fingerprints: {} }
  : JSON.parse(readFileSync(expectedPath, 'utf8'));
if (!recording) {
  assert.equal(baseline.version, 1);
  assert.equal(baseline.fixtureVersion, fixture.version);
  assert.equal(baseline.stepHz, fixture.stepHz);
  assert.deepEqual(Object.keys(baseline.fingerprints).sort(), fixture.cases.map(race => race.id).sort());
}
let checks = 0;
for (const race of fixture.cases) {
  const first = replay(race, fixture.framesPerSecond[0]);
  if (recording) baseline.fingerprints[race.id] = Object.fromEntries(fixture.framesPerSecond.map(fps => [fps, replay(race, fps)]));
  else {
    for (const fps of fixture.framesPerSecond) {
      for (let run = 1; run <= 3; run++) {
        const actual = run === 1 && fps === fixture.framesPerSecond[0] ? first : replay(race, fps);
        assert.equal(actual, baseline.fingerprints[race.id][fps],
          `${race.id} at ${fps} FPS, run ${run}: physics fingerprint changed`);
        assert.equal(actual, first, `${race.id} at ${fps} FPS, run ${run}: frame cadence changed physics`);
        checks++;
      }
    }
  }
}
if (recording) {
  writeFileSync(expectedPath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  console.log(`Recorded ${fixture.cases.length} replay cases at 30, 60 and 144 FPS in ${expectedPath}.`);
} else {
  console.log(`Replay fingerprints: ${checks} checks passed across ${fixture.cases.length} cases, 16 events, eight categories, three FPS values and three runs.`);
}
