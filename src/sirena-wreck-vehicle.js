import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createDriver} from './driver.js';
import {prepareVehicleDamage} from './vehicles.js';
import {SIRENA_VEHICLE_DIMENSIONS, SIRENA_WHEEL_RADIUS} from './sirena-vehicle.js';

// The authored crust is a complete car. Keep its wheel hierarchy, and restore
// the runtime-only driver, lamps, nitro and damage contract omitted by export.
export async function loadSirenaWreck() {
  const {scene} = await new GLTFLoader().loadAsync('/assets/models/sirena/sea-wreck.glb');
  scene.traverse(node => {
    for (const material of [node.material].flat().filter(Boolean))
      for (const value of Object.values(material)) if (value?.isTexture) value.userData.sharedAsset = true;
  });
  return () => createSirenaWreck(scene);
}

export function createSirenaWreck(source) {
  const vehicle = source.clone(true), data = vehicle.userData = {};
  const materials = new Map();
  Object.assign(data, {wheels: [], wheelPivots: [], brakeLights: [], boostFlames: [], damageMeshes: [],
    size: {...SIRENA_VEHICLE_DIMENSIONS.falcone_sirena}, sirenaKey: 'falcone_sirena', finish: 'sea-wreck',
    damageSpace: {scale: [1,.72,1], offset: [0,0,0], frontGlassZ: .30, rearGlassZ: -.98}});
  vehicle.traverse(node => {
    if (!node.isMesh) return;
    node.geometry = node.geometry.clone();
    const privateMaterial = original => {
      if (!materials.has(original)) materials.set(original, original.clone());
      return materials.get(original);
    };
    node.material = Array.isArray(node.material) ? node.material.map(privateMaterial) : privateMaterial(node.material);
    node.castShadow = !node.material.transparent;
    node.receiveShadow = true;
    if (node.material.name === 'Lacquered body') data.paint = node.material;
    if (node.material.name === 'Brake lenses') data.brakeLights.push(node);
    let ancestor = node, wheel = false;
    while (ancestor && ancestor !== vehicle) { if (ancestor.name.startsWith('steer-')) wheel = true; ancestor = ancestor.parent; }
    if (!wheel) data.damageMeshes.push({mesh: node, rest: node.geometry.attributes.position.array.slice()});
  });
  if (!data.paint) throw Error('Sea wreck is missing its body paint.');
  data.originalColor = data.paint.color.clone();
  for (const end of ['front-left','front-right','rear-left','rear-right']) {
    const pivot = vehicle.getObjectByName(`steer-${end}`), spin = vehicle.getObjectByName(`spin-${end}`);
    if (!pivot || spin?.parent !== pivot) throw Error(`Sea wreck is missing wheel ${end}.`);
    pivot.userData = {front: end.startsWith('front'), radius: SIRENA_WHEEL_RADIUS, restPosition: pivot.position.clone()};
    data.wheelPivots.push(pivot); data.wheels.push(spin);
  }
  // The source steering wheel is the sole non-wheel group at this location.
  vehicle.traverse(node => {
    if (!node.isMesh && Math.abs(node.position.x - .33) < .001 && Math.abs(node.position.z - .2056) < .001) data.steeringPivot = node;
  });
  const driver = createDriver({hero: true, suitColor: 0xf1ede2});
  driver.position.set(.33,-.11,-.30); driver.scale.setScalar(.80);
  vehicle.add(driver); data.driver = driver;
  const flameMaterial = new THREE.MeshBasicMaterial({name: 'Nitro flame', color: 0x82d9ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false});
  const flameGeometry = new THREE.ConeGeometry(.052 * 1.45,.7,12).rotateX(-Math.PI/2).translate(0,0,-.35);
  for (const x of [-.30,.30]) {
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.name = 'Nitro exhaust flame'; flame.position.set(x,.27,-2.21); flame.visible = false;
    vehicle.add(flame); data.boostFlames.push(flame);
  }
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}
