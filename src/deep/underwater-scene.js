// The Deep's scene for any zone (docs/THE_DEEP.md section 10.1, scene hook).
// The approved look test (DEEP-LOOK) made general: the ground, kelp, seagrass,
// rocks, light, surface and drifting specks are all worked out from the zone's
// trail, so the Kelp Coast, Wreck Reef and Night Harbour share one scene.
//
//   const deep = createUnderwaterScene({ zone, quality, renderer, scene });
//   deep.attachCar(carObject);              // the player's car looks wet and lit
//   each frame: deep.update({ car, camera, seconds });
//   deepRaised: deep.raised(findId);           // sea life may react (the whale, on 'sirena-car')
//   on the way back up: deep.dispose();
//
// `car` is read-only { x, y, z, heading, speed }. Nothing here touches race
// state, saves or random streams: the layout comes from the zone id alone.
import * as THREE from 'three';
import { CAUSTIC_ON_PAINT, createUnderwaterLook } from './underwater-look.js';
import { createFloorTiles, createPebbles, createRocks, createSeagrass } from './sea-floor.js';
import { createKelp } from './kelp.js';
import { createHeadlights } from './headlights.js';
import { createContactShadow } from './contact-shadow.js';
import { lookQuality } from './look-quality.js';
import { createZoneFloor, zoneSeed } from './zone-floor.js';
import { createSeaLife } from './sea-life.js';
import {deepRocks} from './deep-rocks.js'; // DEEP-EXPLORER

// The look test's crops were sized for about 200 m of forest and 300 m of
// ground; a zone gets the same thickness per metre of trail that asks for them.
const LOOK_STRETCH = 200;
const scaled = (base, metres) => Math.round(base * Math.min(6, Math.max(0.15, metres / LOOK_STRETCH)));

// Headlights come on where daylight fails: the drop-off, caves, wrecks.
export const HEADLIGHT_DEPTH = 16;

export function createUnderwaterScene({ zone, quality = 'high', renderer, scene, loadSeaLife }) {
  if (!renderer || !scene) throw new Error('createUnderwaterScene needs the renderer and the scene.');
  const profile = lookQuality(quality);
  const shape = createZoneFloor(zone);
  const seed = zoneSeed(zone.id);
  const look = createUnderwaterLook({ renderer, scene, quality });

  const group = new THREE.Group();
  group.name = `The Deep: ${zone.id}`;
  const floor = createFloorTiles(look.uniforms, shape, { cell: quality === 'high' ? 1 : 1.5 });
  const kelpMetres = shape.coverLength('kelp'), grassMetres = shape.coverLength('grass');
  const kelp = createKelp(look.uniforms, {
    placements: shape.kelpPlacements(seed, scaled(profile.kelpStems, kelpMetres)),
    blades: profile.kelpBlades, distance: profile.kelpDistance, castShadow: profile.shadowKelp });
  const seagrass = createSeagrass(look.uniforms, { seed, placements: shape.seagrassPlacements(seed, scaled(profile.seagrassTufts, grassMetres)) });
  // DEEP-EXPLORER: visible solids must agree with simulation on both qualities.
  const rocks = createRocks(look.uniforms, { seed, detail: 1, placements: deepRocks(zone, shape) });
  const pebbles = createPebbles(look.uniforms, { seed, placements: shape.pebblePlacements(seed, scaled(profile.pebbles, shape.length * 0.65)) });
  // The zone's creatures (its `spots`): none for a zone without any. Models load
  // as they arrive; one that fails is skipped and the dive goes on.
  const sea = createSeaLife({ zone, shape, uniforms: look.uniforms, quality, fishBudget: profile.fish, ...(loadSeaLife ? { load: loadSeaLife } : {}) });
  group.add(floor.group, kelp.group, seagrass.group, rocks.group, pebbles.group, sea.group);
  scene.add(group);

  // Build the ground around the start of the trail before the first frame.
  const start = shape.frameAt(0);
  floor.prime({ x: start.x, z: start.z });

  const cars = [];
  const focus = new THREE.Vector3(), tint = [1, 1, 1];
  let disposed = false;

  return {
    group, shape, look, sea,
    counts: { kelp: kelp.count, seagrass: seagrass.count, rocks: rocks.count, pebbles: pebbles.count, floorTiles: floor.tileCount },
    get builtTiles() { return floor.builtCount; },
    // A find was raised (the duel's deepRaised event): the whale may pass.
    raised(findId) { return sea.raised(findId); },
    // A car under water: caustics on the paint, a soft shadow under it, and
    // headlights that switch on in the dark. The car wears copies of its own
    // materials while it is down here; dispose gives it back its originals and
    // shadow flags, so it surfaces exactly as it went in. Never moved.
    attachCar(object) {
      if (cars.some(c => c.object === object)) return;
      const restore = [];
      object.traverse(o => {
        if (!o.isMesh) return;
        const original = o.material;
        restore.push({ mesh: o, material: original, castShadow: o.castShadow, receiveShadow: o.receiveShadow });
        const copy = m => {
          if (!m?.isMeshStandardMaterial) return m;
          const c = m.clone();
          c.envMapIntensity = 1.8;
          return c;
        };
        o.material = Array.isArray(original) ? original.map(copy) : copy(original);
        o.castShadow = true; o.receiveShadow = true;
      });
      look.applyTo(object, { fragmentExtra: CAUSTIC_ON_PAINT });
      const shadow = createContactShadow(object);
      const lights = createHeadlights(object, look.uniforms, { direct: profile.pipeline === 'direct' });
      cars.push({ object, shadow, lights, restore });
    },
    update({ car = null, camera, seconds, lifeState }) {
      // Under the kelp the water takes an olive-green cast; in open water none.
      const shade = shape.forestShade(camera.position.x, camera.position.z);
      tint[0] = 1 - 0.18 * shade; tint[1] = 1 - 0.02 * shade; tint[2] = 1 - 0.38 * shade;
      look.setTint(tint);
      look.update(camera, seconds);
      const cy = car ? car.y : camera.position.y;
      focus.set(car ? (camera.position.x + car.x) / 2 : camera.position.x, Math.max(cy, camera.position.y - 4),
        car ? (camera.position.z + car.z) / 2 : camera.position.z);
      look.focusSun(focus);
      floor.update(camera);
      kelp.update(camera);
      seagrass.update(camera);
      sea.update({ car, camera, seconds, lifeState }); // DEEP-EXPLORER
      const dark = -cy > HEADLIGHT_DEPTH;
      for (const c of cars) c.lights.setOn(dark);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const c of cars) {
        c.shadow.dispose(); c.lights.dispose();
        for (const r of c.restore) {
          const worn = Array.isArray(r.mesh.material) ? r.mesh.material : [r.mesh.material];
          const own = new Set(Array.isArray(r.material) ? r.material : [r.material]);
          worn.forEach(m => { if (m && !own.has(m)) m.dispose(); });
          Object.assign(r.mesh, { material: r.material, castShadow: r.castShadow, receiveShadow: r.receiveShadow });
        }
      }
      cars.length = 0;
      sea.dispose();
      floor.dispose(); kelp.dispose(); seagrass.dispose?.(); rocks.dispose?.(); pebbles.dispose?.();
      scene.remove(group);
      look.dispose();
    },
  };
}
