// FUN-TITAN-LAUNCH (docs/board/decisions.md "Keep these"): the Titan takes big air when its wheels drive up onto
// another car at speed; every other car keeps today's contact rules. Scripted, headless, 120 Hz steps.
import assert from 'node:assert/strict';
import test from 'node:test';
import { Duel } from '../src/game.js';
import { COURSE } from '../src/config.js';

const DT = 1 / 120, practice = COURSE.findIndex(def => def.practice);
const parked = (s, lateral) => ({ s, prevS: s, lateral, prevLateral: lateral, speedMph: 0, headingError: 0, pushVelocity: 0, dir: 1,
  car: 'falcone_f42', alive: true, damageZones: { front: 0, rear: 0, left: 0, right: 0 } });

// A flat test road, as in test-offroad-physics: the car under test meets one parked Falcone at 30 mph.
function flat(car) {
  const d = new Duel({ seed: 1989 });
  d.startCampaign({ car, startStage: practice, difficulty: 'casual', mode: 'timetrial' });
  const point = (s, lateral = 0) => ({ x: lateral, y: 0, z: s, heading: 0, curvature: 0 });
  d.course = { def: { id: 'launch-test', practice: true, kind: 'arena', theme: 'desert' }, closed: false, length: 10000, raceLength: 20000,
    features: { obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: [] },
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({ s: z, lateral: x }), phase: s => s,
    surfaceAt: (_, lateral) => ({ mainRoad: Math.abs(lateral) <= 7, road: Math.abs(lateral) <= 7, roadHalfWidth: 7 }),
    themeAt: () => 'desert', roadHalfWidthAt: () => 7, nearestRadar: () => null, obstaclesNear: () => d.course.features.obstacles };
  d._obstacleArray = d.course.features.obstacles; d._obstacleQueryCache.clear(); d._lapGates = [];
  const target = parked(40, 30);
  Object.assign(d.state, { status: 'racing', s: 28, prevS: 28, lateral: 30, prevLateral: 30, speedMph: 30, traffic: [target] });
  return { d, target };
}

// The same meeting on a real road course (Pacific Canyon), in the right-hand lane.
function road(car) {
  const d = new Duel({ seed: 1989 });
  d.startCampaign({ car, startStage: 0, difficulty: 'casual', mode: 'timetrial' });
  const lane = 3.4, target = parked(340, lane);
  Object.assign(d.state, { status: 'racing', countdown: 0, s: 328, prevS: 328, lateral: lane, prevLateral: lane, speedMph: 30, gear: 0,
    traffic: [target], rival: null, opponents: [] });
  return { d, target };
}

function fly({ d, target }, seconds = 5) {
  const s = d.state, flight = { airSec: 0, peak: 0, tumbled: false, landedAt: null };
  for (let i = 0; i < seconds / DT; i++) {
    d.setInput({ throttle: .15, brake: 0, steer: 0, boost: false });
    d.step(DT);
    if (s.airborne) { flight.airSec += DT; flight.peak = Math.max(flight.peak, s.airHeight || 0); }
    else if (flight.airSec > 0 && flight.landedAt == null) flight.landedAt = i * DT;
    if (s.tumble) flight.tumbled = true;
  }
  return { ...flight, crushed: !!target.crushed, state: s };
}

for (const [name, make] of [['a flat test road', flat], ['Pacific Canyon', road]]) {
  test(`Titan at 30 mph over a parked car on ${name}: at least 1.0 s and 2.5 m of air, lands on its wheels`, () => {
    const result = fly(make('titan_monster'));
    assert.ok(result.crushed, 'the parked car is flattened');
    assert.ok(result.airSec >= 1.0, `air time ${result.airSec.toFixed(2)} s`);
    assert.ok(result.peak >= 2.5, `peak height ${result.peak.toFixed(2)} m`);
    assert.ok(result.landedAt != null, 'it comes down again');
    const s = result.state;
    assert.equal(result.tumbled, false, 'no rollover');
    assert.equal(s.stageCrashes, 0, 'no crash');
    assert.equal(s.boundaryResets, 0, 'no reset');
    assert.equal(s.status, 'racing');
    assert.ok(s.speedMph > 10, `still rolling at ${s.speedMph.toFixed(1)} mph`);
  });

  test(`a faster Titan takes more air on ${name}`, () => {
    const slow = make('titan_monster'), fast = make('titan_monster');
    fast.d.state.speedMph = 60;
    assert.ok(fly(fast).peak > fly(slow).peak + .5);
  });

  for (const car of ['falcone_f42', 'dusthawk_rally']) {
    test(`${car} keeps today's contact rules on ${name} (no launch)`, () => {
      const result = fly(make(car), 3);
      assert.ok(result.peak < 1, `${car} peak ${result.peak.toFixed(2)} m`);
    });
  }
}
