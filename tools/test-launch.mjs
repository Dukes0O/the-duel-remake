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
const ORDER = ['bugatti_bolide', 'koenigsegg_jesko', 'ferrari_enzo', 'mclaren_f1', 'banshee_muscle', 'viper_proto', 'dusthawk_rally',
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

// Claude's 24 October answer (card FIX-LAUNCH): after a crash recovery the car pulls away with the old
// launch until it is back to 60 mph or 3 s have passed, so a crash costs what it did. A standing start
// with no crash keeps the gentle launch.
function recovered(id = 'banshee_muscle') {
  const duel = new Duel({ seed: 1989, car: id });
  duel.startCampaign({ car: id, opponentCount: 0, difficulty: 'casual' });
  duel.course = new Course(def);
  Object.assign(duel.state, { status: 'racing', s: 300, prevS: 300, lateral: 0, countdown: 0, traffic: [], speedMph: 90, gear: 2 });
  duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
  duel._crash('head_on');
  for (let i = 0; i < 120 * 6 && !duel.state.impactTimer === false; i++) duel._impact(DT);
  return duel;
}
function climb(duel, seconds) {
  duel.setInput({ throttle: 1, brake: 0, steer: 0, boost: false });
  const start = duel.state.speedMph;
  for (let i = 0; i < seconds * 120; i++) duel._drive(DT);
  return duel.state.speedMph - start;
}
test('a crash recovery pulls away with the old launch for up to 3 s or 60 mph; a standing start stays gentle', () => {
  const crashed = recovered(), fresh = new Duel({ seed: 1989, car: 'banshee_muscle' });
  assert.equal(crashed.state.speedMph, 12, 'recovery restarts at 12 mph');
  fresh.startCampaign({ car: 'banshee_muscle', opponentCount: 0, difficulty: 'casual' });
  fresh.course = new Course(def);
  Object.assign(fresh.state, { status: 'racing', s: 300, prevS: 300, lateral: 0, countdown: 0, traffic: [], speedMph: 12, gear: 0 });
  const quick = climb(crashed, 1), gentle = climb(fresh, 1);
  assert.ok(quick > gentle * 1.6, `recovery gains ${quick.toFixed(1)} mph in 1 s, a standing start ${gentle.toFixed(1)}`);
  assert.equal(Object.hasOwn(fresh.state, 'crashLaunchSec'), false, 'no crash, no quick window');
  // The window ends by 3 s: later seconds gain the gentle amount.
  climb(crashed, 2.5);
  const late = crashed.state.speedMph;
  assert.ok(late >= 60 || Object.hasOwn(crashed.state, 'crashLaunchSec') === false, 'window is over by 3 s or 60 mph');
});
