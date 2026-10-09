import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {run} from './combat-balance.mjs';

let checks = 0;
const originalDrive = App.prototype._driveAutopilot;
const originalAdvance = App.prototype.advance;
try {
  for (const seed of [-11, 0, 42, 1989, 2018, 9001]) {
    for (const [label, normal, speed, rivalSpeed, expected] of [
      ['turn braking', {throttle: 0, brake: .8}, 160, 190, {throttle: 0, brake: .8}],
      ['coast into turn', {throttle: 0, brake: 0}, 160, 190, {throttle: 0, brake: 0}],
      ['slow target on straight', {throttle: 1, brake: 0}, 90, 60, {throttle: 0, brake: .45}],
      ['accelerate on straight', {throttle: 1, brake: 0}, 50, 90, {throttle: 1, brake: 0}],
    ]) {
      App.prototype._driveAutopilot = function() {
        this.duel.setInput({...normal, steer: .25, boost: false});
      };
      App.prototype.advance = function() {
        const state = this.duel.state;
        Object.assign(state, {status: 'racing', impactTimer: 0, s: 100, speedMph: speed});
        Object.assign(state.rival, {s: 130, finished: false, speedMph: rivalSpeed});
        this._driveAutopilot(1 / 30);
        assert.equal(state.input.throttle, expected.throttle, label + ' throttle, seed ' + seed);
        assert.equal(state.input.brake, expected.brake, label + ' brake, seed ' + seed);
        assert.equal(state.input.steer, .25, 'pursuit preserves ordinary steering, seed ' + seed);
        assert.equal(state.input.boost, false, 'pursuit uses legal unboosted inputs');
        checks++;
      };
      run('pursuit', 'medium', seed, {maxFrames: 1});
    }
    App.prototype.advance = function() {
      const state = this.duel.state;
      Object.assign(state, {status: 'racing', impactTimer: 0});
      this._driveAutopilot(1 / 30);
      assert.equal(state.input.throttle, 1, 'ordinary report driver is unchanged');
      assert.equal(state.input.brake, 0, 'ordinary report driver is unchanged');
      checks++;
    };
    run('none', 'hard', seed, {maxFrames: 1});
  }
} finally {
  App.prototype._driveAutopilot = originalDrive;
  App.prototype.advance = originalAdvance;
}
console.log('All-seed pursuit braking: ' + checks + ' cases passed.');
