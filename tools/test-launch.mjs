// FIX-LAUNCH (docs/board/cards/FIX-LAUNCH.md): 0 to 60 mph for every car
// through the real driving step on flat asphalt, full throttle, Casual gearbox,
// at the engine level each car races at (stock cars level 0, factory-maxed 3).
import assert from 'node:assert/strict';
import test from 'node:test';
import { CARS } from '../src/config.js';
import { Course } from '../src/course.js';
import { Duel } from '../src/game.js';

const DT = 1 / 120; // src/app.js SIMULATION_STEP
const def = { id: 'test-launch', name: 'Test only', kind: 'circuit', closed: true,
  airborne: false, theme: 'alpine', noTraffic: true, hasRival: false, hasRadar: false,
  script: [['straight', 4000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100],
    ['straight', 4000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100]] };

export function zeroToSixty(car) {
  const duel = new Duel({ seed: 1989, car });
  duel.startCampaign({ car, opponentCount: 0, difficulty: 'casual' });
  duel.course = new Course(def);
  Object.assign(duel.state, { status: 'racing', s: 300, prevS: 300, lateral: 0,
    countdown: 0, traffic: [], speedMph: 0, gear: 0 });
  duel.setInput({ throttle: 1, brake: 0, steer: 0, boost: false });
  let steps = 0;
  while (duel.state.speedMph < 60 && steps < 120 * 20) { duel._drive(DT); steps++; }
  return { seconds: steps * DT, car: duel.car, upgrades: duel.state.upgrades };
}

const ids = Object.keys(CARS);
const runs = Object.fromEntries(ids.map(id => [id, zeroToSixty(id)]));

test('every car races at its own engine level on the Casual gearbox', () => {
  for (const id of ids) assert.equal(runs[id].upgrades.engine, CARS[id].factoryMaxed ? 3 : 0, id);
});

test('0 to 60 mph: fastest car 2.4 to 2.8 s, slowest stock car 3.6 to 4.2 s', () => {
  const times = ids.map(id => runs[id].seconds);
  const fastest = Math.min(...times);
  const slowestStock = Math.max(...ids.filter(id => !CARS[id].factoryMaxed).map(id => runs[id].seconds));
  assert.ok(fastest >= 2.4 && fastest <= 2.8, `fastest 0 to 60 is ${fastest.toFixed(3)} s`);
  assert.ok(slowestStock >= 3.6 && slowestStock <= 4.2, `slowest stock 0 to 60 is ${slowestStock.toFixed(3)} s`);
});

// The order of 0 to 60 before FIX-LAUNCH (fastest first); ties are the same car.
const ORDER = ['koenigsegg_jesko', 'ferrari_enzo', 'banshee_muscle', 'viper_proto', 'dusthawk_rally',
  'aurora_gt', 'titan_monster', 'falcone_f42', 'stuttgart_959s'];
test('acceleration order is unchanged and top speeds stay as built', () => {
  for (let i = 1; i < ORDER.length; i++)
    assert.ok(runs[ORDER[i - 1]].seconds < runs[ORDER[i]].seconds, `${ORDER[i - 1]} must launch faster than ${ORDER[i]}`);
  assert.equal(runs.falcone_heritage.seconds, runs.falcone_f42.seconds);
  for (const id of ids) {
    const base = CARS[id], engine = 1 + (base.factoryMaxed ? 3 : 0) * .035;
    assert.ok(Math.abs(runs[id].car.topSpeed - base.topSpeed * engine) < 1e-9, `${id} top speed`);
  }
  assert.equal(CARS.koenigsegg_jesko.topSpeed, 298);
});

if (process.argv.includes('--print')) for (const id of ids)
  console.log(id.padEnd(20), runs[id].seconds.toFixed(3), runs[id].car.accel.toFixed(2));
