import { CARS } from './config.js';
import { createClassicVehicle, CLASSIC_VEHICLE_DIMENSIONS } from './classic-vehicles.js';
import { createUnlockedVehicle, UNLOCK_VEHICLE_DIMENSIONS } from './unlock-vehicles.js';
import { loadHeroVehicle } from './hero-vehicle.js';

// One source of model selection for the player, rival and personal-best ghost.
// Six original cars are ready synchronously. Only Aurora uses the licensed GLB.
// A pending or failed import never substitutes an earlier coupe silhouette.
export function createVehicleAssets({ loadHero = loadHeroVehicle } = {}) {
  let hero, pending, failed = false;
  const source = key => Object.hasOwn(CLASSIC_VEHICLE_DIMENSIONS,key) ? 'classic' : Object.hasOwn(UNLOCK_VEHICLE_DIMENSIONS,key) ? 'unlock' : key === 'aurora_gt' ? 'licensed' : null;
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
    const vehicle = source(key) === 'classic' ? createClassicVehicle(appearance) : source(key) === 'unlock' ? createUnlockedVehicle(appearance) : hero({ ...appearance, kind: 'gt' });
    vehicle.userData.vehicleKey = key;
    vehicle.userData.vehicleSource = source(key);
    return vehicle;
  }
  return { source, status, load, create };
}
