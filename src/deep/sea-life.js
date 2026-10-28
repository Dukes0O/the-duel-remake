// The Kelp Coast's sea life, drawn (docs/THE_DEEP.md sections 5 and 8, card
// DEEP-LIFE). The rules (where each animal lives, how it moves, how it reacts
// to the car) are in sea-life-rules.js and run in Node; this file only turns
// them into pictures.
//
//   const life = createSeaLife({ zone, shape, uniforms, quality });
//   each frame: life.update({ car, camera, seconds });   // car is read only
//   deepRaised: life.raised('sirena-car');                // the whale's second way to pass
//   on the way back up: life.dispose();
//
// Every type is one InstancedMesh of the Deep's model (turtle, sea lion, otter
// and crab move with a morph target played per animal, the ray flaps its wings
// in the shader), capped per type. The sardines are the existing fish schools
// with the sardine model. The gray whale is a single skinned mesh with its own
// swim clip, drawn only while it passes. Nothing here changes race state or
// uses the race's random streams: the car is only ever read.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { patchWaterMaterial } from './water-shader.js';
import { createFishSchool, fishGeometryFromModel } from './fish-school.js';
import {
  SEA_LIFE_CAPS, WHALE, createWhale, makeAnimal, planSeaLife, startWhalePass, stepAnimal, stepWhale,
} from './sea-life-rules.js';

export const SEA_LIFE_URL = id => `/assets/models/deep/${id}.glb`;
const defaultLoad = id => new GLTFLoader().loadAsync(SEA_LIFE_URL(id));

const RAY_PARS = /* glsl */`
attribute vec2 aWing;    // wing-beat strength, wing-beat clock
`;
// Wings are the sides of the body (x): they bend up and down along a travelling wave,
// more toward the tips, and not at all in the middle.
const RAY_SWAY = /* glsl */`
{
  float tip = abs(position.x);
  float wave = sin(aWing.y - position.z * 3.2);
  transformed.y += wave * aWing.x * (tip * tip) * 0.42;
}`;

function firstMesh(root) {
  let found = null;
  root.traverse(o => { if (!found && o.isMesh) found = o; });
  return found;
}
function loopedValue(track, time) {
  const duration = track.times[track.times.length - 1] || 1, tm = ((time % duration) + duration) % duration;
  return track.createInterpolant().evaluate(tm)[0];
}

export function createSeaLife({ zone, shape, uniforms, quality = 'high', fishBudget = 480, load = defaultLoad } = {}) {
  if (!zone || !shape || !uniforms) throw new Error('createSeaLife needs the zone, its floor and the water uniforms.');
  const plan = planSeaLife(zone, { fishBudget });
  const group = new THREE.Group();
  group.name = 'Sea life';
  const ctx = { floorAt: (x, z) => shape.floorHeight(x, z) };
  const types = new Map();          // id -> { mesh, animals, track, ... } once its model has loaded
  const schools = [];
  let whale = createWhale(plan.whale), externalLife = false; // DEEP-EXPLORER
  const status = {};                // id -> 'loading' | 'ready' | 'failed'
  const failures = [];
  const lastCar = { x: 0, y: 0, z: 0 };
  let lastSeconds = null, pendingRaise = false, whaleModel = null, disposed = false;
  const dummy = new THREE.Object3D();
  const influence = { morphTargetInfluences: [0] };

  function warn(id, error) {
    status[id] = 'failed';
    const message = String(error?.message || error);
    failures.push({ id, message });
    console.warn(`Sea life: ${id} did not load: ${message}`);
  }

  function buildInstanced(id, gltf, specs) {
    const source = firstMesh(gltf.scene);
    if (!source) throw new Error('the model has no mesh');
    const geometry = source.geometry, hasMorph = !!geometry.morphAttributes.position;
    const material = source.material.clone();
    if (geometry.attributes.color) material.vertexColors = true;
    const flap = id === 'ray';
    if (flap) geometry.setAttribute('aWing', new THREE.InstancedBufferAttribute(new Float32Array(specs.length * 2), 2).setUsage(THREE.DynamicDrawUsage));
    patchWaterMaterial(material, uniforms, { key: `life-${id}`, ...(flap ? { vertexPars: RAY_PARS, vertexSway: RAY_SWAY } : {}) });
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, specs.length));
    mesh.count = specs.length;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.name = `Sea life: ${id}`;
    const clip = gltf.animations?.[0];
    const track = hasMorph && clip ? clip.tracks.find(row => row.name.endsWith('morphTargetInfluences')) ?? null : null;
    const entry = { id, mesh, animals: specs.map(makeAnimal), track, geometry, material, wing: flap ? geometry.getAttribute('aWing') : null };
    types.set(id, entry);
    group.add(mesh);
    status[id] = 'ready';
    return entry;
  }

  function buildSchools(gltf) {
    let geometry = null;
    try { geometry = gltf ? fishGeometryFromModel(firstMesh(gltf.scene).geometry) : null; } catch (error) { warn('silver-school', error); }
    plan['silver-school'].forEach(spec => {
      const floor = shape.floorHeight(spec.x, spec.z);
      const school = createFishSchool(uniforms, {
        count: spec.count, seed: spec.seed, geometry: geometry ? geometry.clone() : null,
        anchor: { x: spec.x, y: floor + Math.max(3, spec.depth * 0.45), z: spec.z }, path: { phase: spec.phase },
        floorAt: ctx.floorAt,
      });
      group.add(school.mesh);
      schools.push(school);
    });
    geometry?.dispose();
    status['silver-school'] = 'ready';
  }

  function buildWhale(gltf) {
    const root = gltf.scene, clip = gltf.animations?.[0];
    root.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const own = Array.isArray(o.material) ? o.material : [o.material];
      const patched = own.map(m => {
        const c = m.clone();
        if (o.geometry.attributes.color) c.vertexColors = true;
        return patchWaterMaterial(c, uniforms, { key: 'life-whale' });
      });
      o.material = Array.isArray(o.material) ? patched : patched[0];
    });
    const mixer = new THREE.AnimationMixer(root);
    if (clip) mixer.clipAction(clip).play();
    root.visible = false;
    group.add(root);
    whaleModel = { root, mixer };
    status.whale = 'ready';
  }

  // Load each type's model. A model that fails is skipped (and reported); the dive goes on.
  const wanted = [];
  for (const id of ['turtle', 'ray', 'crab', 'sea-lion', 'otter']) if (plan[id].length) wanted.push(id);
  if (plan['silver-school'].length && plan['silver-school'][0].count > 0) wanted.push('silver-school');
  if (plan.whale) wanted.push('whale');
  for (const id of wanted) status[id] = 'loading';
  const ready = Promise.all(wanted.map(async id => {
    try {
      const gltf = await load(id);
      if (disposed) return;
      if (id === 'silver-school') buildSchools(gltf);
      else if (id === 'whale') buildWhale(gltf);
      else buildInstanced(id, gltf, plan[id]);
    } catch (error) {
      warn(id, error);
      if (id === 'silver-school' && !disposed) buildSchools(null);   // the approved procedural fish
    }
  }));

  function raised(findId) {
    if (externalLife || findId !== 'sirena-car' || !plan.whale || whale.passed || whale.state === 'passing') return false;
    if (!whaleModel) { pendingRaise = true; return false; }
    return startWhalePass(whale, lastSeconds ?? 0, shape, lastCar);
  }

  function write(entry, i, animal, size, time) {
    dummy.position.set(animal.x, animal.y, animal.z);
    dummy.rotation.set(-animal.pitch, animal.yaw, animal.roll, 'YXZ');
    dummy.scale.setScalar(size);
    dummy.updateMatrix();
    entry.mesh.setMatrixAt(i, dummy.matrix);
    if (entry.track) { influence.morphTargetInfluences[0] = loopedValue(entry.track, animal.anim); entry.mesh.setMorphAt(i, influence); }
    if (entry.wing) { entry.wing.setXY(i, animal.flap, animal.anim * 2.4); }
  }

  const camPos = new THREE.Vector3();
  return {
    group, plan, status, failures, ready, get whale() { return whale; },
    get loaded() { return Object.keys(status).filter(id => status[id] === 'ready'); },
    // Counts actually drawn, by type (sardines in fish).
    counts() {
      const out = {};
      for (const [id, entry] of types) out[id] = entry.animals.length;
      if (schools.length) out['silver-school'] = schools.reduce((n, s) => n + s.count, 0);
      out.whale = whale.state === 'passing' ? 1 : 0;
      return out;
    },
    // Where every animal is now (for the picture tool and the tests): { id: [{ x, y, z, yaw }] }.
    positions() {
      const out = {};
      for (const [id, entry] of types) out[id] = entry.animals.map(a => ({ x: a.x, y: a.y, z: a.z, yaw: a.yaw }));
      if (whale.state === 'passing') out.whale = [{ x: whale.x, y: whale.y, z: whale.z, yaw: whale.yaw }];
      return out;
    },
    raised,
    update({ car, camera, seconds, lifeState }) {
      // DEEP-EXPLORER: native dives draw the exact poses used for logging.
      externalLife = !!lifeState;
      if (lifeState) { seconds = lifeState.seconds; whale = lifeState.whale; }
      if (disposed || !car) return;
      const dt = lastSeconds == null ? 0 : Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      lastCar.x = car.x; lastCar.y = car.y; lastCar.z = car.z;
      camera?.getWorldPosition?.(camPos);
      for (const entry of types.values()) {
        if (lifeState) entry.animals = lifeState.animals[entry.id];
        entry.animals.forEach((animal, i) => {
          if (!lifeState) stepAnimal(animal, seconds, dt, lastCar, ctx);
          write(entry, i, animal, animal.spec.size ?? 1, seconds);
        });
        entry.mesh.instanceMatrix.needsUpdate = true;
        if (entry.track && entry.mesh.morphTexture) entry.mesh.morphTexture.needsUpdate = true;
        if (entry.wing) entry.wing.needsUpdate = true;
      }
      for (const school of schools) {
        const centre = school.centreAt(seconds);
        // Beyond the water's murk a school is not drawn or worked out.
        const far = camera ? Math.hypot(centre.x - camPos.x, centre.y - camPos.y, centre.z - camPos.z) > 170 : false;
        school.mesh.visible = !far;
        if (!far) school.update(seconds, car);
      }
      if (plan.whale && whaleModel) {
        // The Sirena came up before the whale's model had loaded: it passes now, where the car is.
        if (!lifeState && pendingRaise) { pendingRaise = false; raised('sirena-car'); }
        if (!lifeState && whale.state === 'waiting' && !whale.passed) {
          const d = Math.hypot(car.x - plan.whale.x, car.z - plan.whale.z);
          if (d < WHALE.triggerRange) startWhalePass(whale, seconds, shape, plan.whale);
        }
        if (!lifeState) stepWhale(whale, seconds, shape);
        const on = whale.state === 'passing';
        whaleModel.root.visible = on;
        if (on) {
          whaleModel.root.position.set(whale.x, whale.y, whale.z);
          whaleModel.root.rotation.set(-whale.pitch, whale.yaw, whale.roll, 'YXZ');
          whaleModel.mixer.setTime(whale.anim);
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const entry of types.values()) { entry.mesh.dispose?.(); entry.geometry.dispose(); entry.material.dispose(); }
      for (const school of schools) school.dispose();
      whaleModel?.root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => m.dispose()); } });
      types.clear(); schools.length = 0;
      group.parent?.remove(group);
    },
  };
}

export { SEA_LIFE_CAPS };
