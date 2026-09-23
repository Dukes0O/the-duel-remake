import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFeelArgs, runRace, summarizeFeel } from './feel-lab.mjs';

test('feel lab constrains sample count and output options', () => {
  assert.deepEqual(parseFeelArgs(['--seeds=2']).seeds, [1, 42]);
  assert.throws(() => parseFeelArgs(['--seeds=0']), /1–100/);
  assert.throws(() => parseFeelArgs(['--seeds=101']), /1–100/);
  assert.throws(() => parseFeelArgs(['--port=5174']), /Unknown/);
});

test('a fixed scripted race reports reproducible real simulation events', () => {
  const options = { seed: 1989, difficulty: 'medium', mode: 'wasteland' };
  const first = runRace(options), second = runRace(options);
  assert.deepEqual(first, second);
  assert.equal(first.status, 'stage_result');
  assert.ok(first.firstCombatSec > 0);
  assert.ok(first.weaponFired > 0);
  assert.ok(first.offensiveShots > 0);
  const hits = first.events.filter(event => event.kind === 'combatHit');
  assert.ok(hits.length > 0);
  assert.ok(hits.every(event =>
    typeof event.enemy === 'boolean' && ['player', 'rival', 'traffic'].includes(event.victim)));
  assert.ok(first.raceTimeSec > 30);
  assert.equal(first.cpuCrewExits, null);
  const summary = summarizeFeel([first, { ...first, mode: 'duel', raceTimeSec: first.raceTimeSec * 2 }]);
  assert.equal(summary.byDifficulty.medium.races, 1);
  assert.equal(summary.byDifficulty.medium.raceTimeRatio, .5);
});
