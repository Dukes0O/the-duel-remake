import assert from 'node:assert/strict';
import test from 'node:test';
import {run} from './combat-balance.mjs';
import {Duel} from '../src/game.js';
import {stepRaiders} from '../src/raiders.js';

test('strong pursuit uses a complete real race to wreck an opponent for the player', () => {
  const first = run('pursuit', 'easy', 1989, {flags: ['wasteland2']});
  const repeated = run('pursuit', 'easy', 1989, {flags: ['wasteland2']});
  assert.equal(first.completed, true);
  assert.ok(first.shots.crossbow >= 9, 'strong play must create repeated firing opportunities');
  assert.ok(first.playerOpponentWrecks >= 1, 'traffic or raider-owned wrecks cannot satisfy payoff');
  assert.deepEqual(first, repeated, 'same seed and inputs repeat the full result');
});

test('Easy pinned no-weapon race remains in the existing enemy hit band', () => {
  const result = run('none', 'easy', 1989, {flags: ['wasteland2']});
  assert.equal(result.completed, true);
  assert.ok(result.cpuHits >= 0 && result.cpuHits <= 3, `Easy hits: ${result.cpuHits}`);
});

for (const difficulty of ['easy', 'medium', 'hard']) {
  for (const fps of [30, 60, 144]) test(`${difficulty} camp cadence and lap renewal at ${fps} FPS`, () => {
    const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
    duel.startCampaign({mode: 'wasteland', cpuDifficulty: difficulty});
    const s = duel.state, zone = s.raids.zones[0];
    s.status = 'racing'; s.opponents = []; s.speedMph = 50;
    s.s = zone.s; s.raids.zones = [zone];
    const times = [];
    duel.onChange((_, e) => { if(e.raiderShot) times.push(s.stageTimeSec); });
    const gap = difficulty === 'easy' ? 1.6 : .8;
    for (let frame = 0; frame <= Math.ceil(gap * 3 * fps); frame++) {
      s.stageTimeSec = frame / fps;
      stepRaiders(duel, 1 / fps);
    }
    assert.equal(times.length, 3, 'each member fires once, without per-frame repeats');
    for(let i=1;i<times.length;i++) {
      assert.ok(times[i]-times[i-1] >= gap-1e-8, `shot spacing ${times[i]-times[i-1]}`);
      assert.ok(times[i]-times[i-1] <= gap+1/fps+1e-8, 'fires at the next eligible frame');
    }
    s.currentLap++;
    s.stageTimeSec += gap;
    stepRaiders(duel, 1 / fps);
    assert.equal(times.length, 4, 'a new lap renews eligibility');
  });
}
