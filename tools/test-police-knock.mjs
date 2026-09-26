import assert from 'node:assert/strict';
import {LegacyRoadsideDuel} from './legacy-roadside-duel.mjs';
import {KNOCK, startKnock} from '../src/vehicle-knock.js';

function fixture() {
  const duel = new LegacyRoadsideDuel({seed: 624,
    featureFlags: {'crash-physics': true}});
  duel.startCampaign({mode: 'duel', car: 'banshee_muscle', startStage: 0});
  const state = duel.state;
  state.status = 'racing';
  state.s = state.prevS = 1000;
  state.lateral = state.prevLateral = 0;
  state.speedMph = 80;
  state.traffic = [];
  state.opponents = [];
  const pursuit = duel._newPursuit(600);
  state.police.pursuit = pursuit;
  return {duel, pursuit};
}

{
  const {duel, pursuit} = fixture();
  startKnock(pursuit, {vx: 9, vz: 4, spin: 1.2, severity: 'knocked',
    heading: duel.course.at(pursuit.s).heading});
  const before = {s: pursuit.s, lateral: pursuit.lateral};
  duel._movePolice(pursuit, .1);
  assert.ok(pursuit.knock?.age >= .1,
    'police advance the same free-body knock clock as every other computer car');
  assert.ok(pursuit.s !== before.s || pursuit.lateral !== before.lateral,
    'the knocked police car moves from the solver velocity');
}

{
  const {duel, pursuit} = fixture();
  startKnock(pursuit, {vx: .01, vz: 0, spin: 0, severity: 'knocked',
    heading: duel.course.at(pursuit.s).heading});
  pursuit.knock.age = KNOCK.minSec;
  const before = {s: pursuit.s, lateral: pursuit.lateral};
  duel._movePolice(pursuit, .1);
  assert.equal(pursuit.knock, null, 'the settled police knock clears');
  assert.ok(Math.abs(pursuit.s - before.s) < .05 &&
    Math.abs(pursuit.lateral - before.lateral) < .05,
  'the settlement tick does not also apply normal police driving');
  assert.ok(Number.isFinite(pursuit.gapU) && Number.isFinite(pursuit.distanceU),
    'pursuit distance bookkeeping survives the consumed knock tick');
}

console.log('Police knock: free-body motion and one-tick settlement passed.');
