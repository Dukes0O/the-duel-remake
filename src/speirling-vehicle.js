import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Accepted original Blender model, recipe tools/blender/speirling-tries.py.
// Like loadHeroVehicle: preload once, then create private synchronous instances.
export const SPEIRLING_MODEL_URL = '/assets/models/unlocks/mcmurtry_speirling.glb';
export const SPEIRLING_VEHICLE_DIMENSIONS = Object.freeze({
  mcmurtry_speirling: Object.freeze({ width: 1.610, length: 3.204, height: 1.142, wheelRadius: .292 }),
});
const WHEEL_NAMES = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];
const { batch, cockpit } = originalVehicleParts;
const defaultLoad = () => new GLTFLoader().loadAsync(SPEIRLING_MODEL_URL);
let pending;

export function loadSpeirlingVehicle({ loadAsset = defaultLoad } = {}) {
  if (loadAsset !== defaultLoad) return loadFactory(loadAsset);
  pending ||= loadFactory(loadAsset).catch(error => { pending = null; throw error; });
  return pending;
}

async function loadFactory(loadAsset) {
  const { scene } = await loadAsset(SPEIRLING_MODEL_URL);
  scene.updateMatrixWorld(true);
  for (const name of WHEEL_NAMES) {
    const wheel = scene.getObjectByName(name);
    if (!wheel) throw new Error(`Speirling asset is missing ${name}`);
  }
  return options => createSpeirlingVehicle(options, scene);
}

// The source is supplied by the loader, never synthesized as a fallback body.
export function createSpeirlingVehicle({ key = 'mcmurtry_speirling', color, accent = 0xf1f3f5 } = {}, source) {
  if (!Object.hasOwn(SPEIRLING_VEHICLE_DIMENSIONS, key) || !source) return null;
  const vehicle = new THREE.Group();
  vehicle.name = key;
  const data = vehicle.userData;
  Object.assign(data, {
    wheels: [], wheelPivots: [], brakeLights: [], boostFlames: [], damageMeshes: [], fans: [],
    size: { ...SPEIRLING_VEHICLE_DIMENSIONS[key] }, ultimateKey: key,
    designFeatures: Object.freeze(['low-wide-stance', 'bubble-canopy', 'tall-front-fenders', 'bat-wing-intake', 'rear-haunch-intakes', 'central-spine', 'rear-mesh-grilles', 'swan-neck-wing', 'floor-skirt']),
    damageSpace: { scale: [.70, .60, .90], offset: [0, 0, 0], frontGlassZ: .40, rearGlassZ: -.25 },
  });
  const materials = new Map(), spins = new Map();
  for (const name of WHEEL_NAMES) {
    const pivot = new THREE.Group(), spin = new THREE.Group();
    pivot.name = name; spin.name = `${name}_spin`;
    source.getObjectByName(name).getWorldPosition(pivot.position);
    pivot.userData = { front: name.startsWith('wheel_f'), radius: .292, restPosition: pivot.position.clone() };
    pivot.add(spin); vehicle.add(pivot);
    data.wheels.push(spin); data.wheelPivots.push(pivot); spins.set(name, spin);
  }
  source.traverse(node => {
    if (!node.isMesh) return;
    let parent = node, wheelName;
    while (parent) { if (spins.has(parent.name)) { wheelName = parent.name; break; } parent = parent.parent; }
    const original = node.material;
    if (!materials.has(original.name)) {
      const m = original.clone(); m.userData.sharedAsset = false;
      if (original.name === 'metallic_blue_grey') {
        if (color !== undefined) m.color.set(color);
        m.name = 'Speirling blue-grey body'; m.clearcoat = .5;
        data.paint = m; data.originalColor = m.color.clone();
      }
      if (/glass/i.test(original.name)) { m.name = 'Glass'; m.depthWrite = false; }
      if (original.name === 'satin_carbon') m.name = 'Black bodywork';
      materials.set(original.name, m);
    }
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    if (wheelName) geometry.translate(...spins.get(wheelName).parent.position.clone().negate().toArray());
    geometry.userData.sharedAsset = false;
    const mesh = new THREE.Mesh(geometry, materials.get(original.name));
    mesh.name = node.name; mesh.castShadow = mesh.material.name !== 'Glass'; mesh.receiveShadow = true;
    (wheelName ? spins.get(wheelName) : vehicle).add(mesh);
    if (!wheelName) {
      data.damageMeshes.push({ mesh, rest: geometry.attributes.position.array.slice() });
      if (original.name === 'red_tail_lamps') data.brakeLights.push(mesh);
    }
  });
  const m = {
    accent: { color: new THREE.Color(accent) }, carbon: materials.get('satin_carbon'),
    alloy: materials.get('dark_machined_alloy'), exhaust: materials.get('satin_carbon'),
    plate: materials.get('dark_machined_alloy'), seat: materials.get('satin_carbon'),
  };
  const cabin = batch(vehicle);
  cockpit(vehicle, cabin, m, [0, -.07, .12], .70, false);
  cabin.finish(data);
  addFanEffects(vehicle, m.carbon);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// Keep only the moving fans and gameplay exhaust from the old body builder.
function addFanEffects(vehicle, carbon) {
  for (const side of [-1, 1]) {
    const fan = new THREE.Group(); fan.name = `Fan ${side > 0 ? 'left' : 'right'}`;
    fan.position.set(side * .37, .315, -1.36);
    const fb = batch(fan);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      fb.box(carbon, [.06, .13, .01], [Math.sin(a) * .09, Math.cos(a) * .09, 0], [0, 0, -a], 0);
    }
    fb.box(carbon, [.07, .07, .05], [0, 0, 0], [0, 0, 0], 0); fb.finish();
    vehicle.add(fan); vehicle.userData.fans.push(fan);
    const material = new THREE.MeshBasicMaterial({ name: 'Nitro flame', color: 0x82d9ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.12, .8, 14).rotateX(-Math.PI / 2).translate(0, 0, -.4), material);
    flame.name = 'Nitro exhaust flame'; flame.position.set(side * .37, .315, -1.58); flame.visible = false;
    vehicle.add(flame); vehicle.userData.boostFlames.push(flame);
  }
}
