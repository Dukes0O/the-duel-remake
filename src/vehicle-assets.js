import { CARS } from './config.js';
import { createClassicVehicle, CLASSIC_VEHICLE_DIMENSIONS } from './classic-vehicles.js';
import { createUnlockedVehicle, UNLOCK_VEHICLE_DIMENSIONS } from './unlock-vehicles.js';
import { createKoenigseggVehicle, KOENIGSEGG_VEHICLE_DIMENSIONS } from './koenigsegg-vehicle.js';
import { createEnzoVehicle, ENZO_VEHICLE_DIMENSIONS } from './enzo-vehicle.js';
import { createMclarenF1Vehicle, MCLAREN_F1_VEHICLE_DIMENSIONS } from './mclaren-f1-vehicle.js';
import { createBolideVehicle, BOLIDE_VEHICLE_DIMENSIONS } from './bolide-vehicle.js';
import { createSirenaVehicle, SIRENA_VEHICLE_DIMENSIONS } from './sirena-vehicle.js';
import { loadHeroVehicle } from './hero-vehicle.js';

// One source of model selection for the player, rival and personal-best ghost.
// Nine original models are ready synchronously. Heritage and Aurora share the
// licensed GLB, with the former F42 sport trim and the separate GT package.
// A pending or failed import never substitutes an earlier coupe silhouette.
export function createVehicleAssets({ loadHero = loadHeroVehicle } = {}) {
  let hero, pending, failed = false;
  const earnedFactories = { ferrari_enzo: createEnzoVehicle, mclaren_f1: createMclarenF1Vehicle, bugatti_bolide: createBolideVehicle, falcone_sirena: createSirenaVehicle };
  const earnedDimensions = { ...ENZO_VEHICLE_DIMENSIONS, ...MCLAREN_F1_VEHICLE_DIMENSIONS, ...BOLIDE_VEHICLE_DIMENSIONS, ...SIRENA_VEHICLE_DIMENSIONS };
  const licensedKinds = { falcone_heritage: 'sport', aurora_gt: 'gt' };
  const source = key => Object.hasOwn(CLASSIC_VEHICLE_DIMENSIONS,key) ? 'classic' : Object.hasOwn(UNLOCK_VEHICLE_DIMENSIONS,key) ? 'unlock' : Object.hasOwn(KOENIGSEGG_VEHICLE_DIMENSIONS,key) ? 'ultimate' : Object.hasOwn(earnedDimensions,key) ? 'earned' : Object.hasOwn(licensedKinds,key) ? 'licensed' : null;
  const status = key => source(key) === 'licensed' ? hero ? 'ready' : failed ? 'error' : pending ? 'loading' : 'idle' : source(key) ? 'ready' : 'error';
  function load(key, { retry = false } = {}) {
    if (source(key) !== 'licensed') return Promise.resolve(status(key) === 'ready');
    if (hero) return Promise.resolve(true);
    if (pending) return pending;
    if (failed && !retry) return Promise.resolve(false);
    failed = false;
    pending = Promise.resolve().then(loadHero).then(factory => {
      if (typeof factory !== 'function') throw new TypeError('Vehicle asset did not return a model factory.');
      hero = factory; return true;
    }).catch(() => { failed = true; return false; }).finally(() => { pending = null; });
    return pending;
  }
  function create(key, options = {}) {
    if (status(key) !== 'ready') return null;
    const appearance = { color: CARS[key].color, accent: CARS[key].accent, ...options, key };
    const vehicle = source(key) === 'classic' ? createClassicVehicle(appearance) : source(key) === 'unlock' ? createUnlockedVehicle(appearance) : source(key) === 'ultimate' ? createKoenigseggVehicle(appearance) : source(key) === 'earned' ? earnedFactories[key](appearance) : hero({ ...appearance, kind: licensedKinds[key] });
    vehicle.userData.vehicleKey = key;
    vehicle.userData.vehicleSource = source(key);
    return vehicle;
  }
  return { source, status, load, create };
}
