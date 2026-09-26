import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';

const duel = new Duel({seed: 2609,
  featureFlags: {wasteland2: true, 'crash-physics': true}});
duel.startCampaign({mode: 'duel', startStage: COURSE.findIndex(stage =>
  !stage.kind && stage.hasRival), car: 'falcone_f42'});
const state = duel.state;
state.status = 'racing';
state.countdown = 0;
state.invulnerableSec = 0;
state.speedMph = 0;
state.pushVelocity = 0;
state.headingError = 0;
state.input.throttle = 1;
state.input.brake = 0;
state.knock = {vx: 0, vz: 0, spin: 0, severity: 'knocked', age: .31, vy: 0};

duel._drive(1 / 60);
assert.equal(state.knock, null, 'the settled knock releases control');
assert.equal(state.speedMph, 0,
  'driver input does not advance the car again on the knock settlement tick');

duel._drive(1 / 60);
assert.ok(state.speedMph > 0, 'driver input resumes on the following tick');

console.log('Vehicle knock integration: settlement consumes one simulation tick.');
