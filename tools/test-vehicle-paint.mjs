import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CARS } from '../src/config.js';
import { createVehicle, updateVehicleDamage } from '../src/vehicles.js';
import { createVehicleAssets } from '../src/vehicle-assets.js';
import { loadHeroVehicle } from '../src/hero-vehicle.js';
import { applyVehiclePaint } from '../src/vehicle-paint.js';
import { PAINT_PRESETS } from '../src/paint-presets.js';

let checks = 0;
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const ok = (value, message) => { assert.ok(value, message); checks++; };
const copper = PAINT_PRESETS.copper_metallic.appearance;
const glacier = PAINT_PRESETS.glacier_satin.appearance;
const finishKeys = ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness'];
const materialState = material => ({ color: material.color?.toArray(), ...Object.fromEntries(finishKeys.map(key => [key, material[key]])) });
const materials = vehicle => {
  const result = new Set();
  vehicle.traverse(object => { for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) result.add(material); });
  return result;
};
const inventory = vehicle => {
  const entries = [];
  vehicle.traverse(object => entries.push([object.uuid, object.geometry?.uuid, ...(Array.isArray(object.material) ? object.material : object.material ? [object.material] : []).map(material => material.uuid)]));
  return entries;
};

// Exercise the actual imported body meshes and materials offline. Only image
// bindings are removed because Node has no browser image decoder; all geometry,
// physical material factors, factory cloning and damage setup run unchanged.
async function importedFactory() {
  const source = await readFile(new URL('../public/assets/models/car-concept.glb', import.meta.url));
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.toString('utf8', 20, 20 + jsonLength));
  function stripTextures(value) {
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
      if (/Texture$/.test(key)) delete value[key];
      else stripTextures(value[key]);
    }
  }
  stripTextures(json.materials);
  delete json.images; delete json.textures; delete json.samplers;
  const text = Buffer.from(JSON.stringify(json));
  const paddedLength = Math.ceil(text.length / 4) * 4;
  const binary = source.subarray(20 + jsonLength);
  const glb = Buffer.alloc(20 + paddedLength + binary.length, 0x20);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(paddedLength, 12); glb.writeUInt32LE(0x4e4f534a, 16);
  text.copy(glb, 20); binary.copy(glb, 20 + paddedLength);
  const parsed = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  const originalLoad = GLTFLoader.prototype.loadAsync;
  try {
    GLTFLoader.prototype.loadAsync = async () => parsed;
    return await loadHeroVehicle();
  } finally { GLTFLoader.prototype.loadAsync = originalLoad; }
}

const hero = await importedFactory();
const assets=createVehicleAssets({loadHero:()=>hero});
await Promise.all(Object.keys(CARS).map(key=>assets.load(key)));
const fixtures = [];
for (const key of Object.keys(CARS)) fixtures.push([key, () => assets.create(key)]);
equal(fixtures.length,9,'Paint fixtures cover every current runtime car, including the Jesko reward');

for (const [label, make] of fixtures) {
  const vehicle = make(), other = make(), data = vehicle.userData, paint = data.paint;
  equal(data.vehicleKey,label,`${label}: paint fixture uses the actual runtime model router`);
  if(label==='falcone_heritage')equal(data.aeroPackage,undefined,'Heritage retains the old sport body without Aurora carbon GT trim');
  if(label==='aurora_gt')equal(data.aeroPackage,'carbon-gt','Aurora retains its distinct GT package');
  const factory = materialState(paint), original = inventory(vehicle);
  const compile = paint.onBeforeCompile, program = paint.customProgramCacheKey;
  const fractures = data.fractures, fractureMeshes = fractures.map(item => item.mesh);
  const positionAttributes = data.damageMeshes.map(item => item.mesh.geometry.attributes.position);
  const trim = [...materials(vehicle)].filter(material => material !== paint).map(material => [material, materialState(material)]);
  const otherMaterials = [...materials(other)].map(material => [material, materialState(material)]);
  ok(paint !== other.userData.paint, `${label}: factory paint is private`);
  equal(applyVehiclePaint(vehicle, null), false, `${label}: untouched factory is a no-op`);
  equal(materialState(paint), factory, `${label}: initial factory finish is exact`);
  equal(applyVehiclePaint(vehicle, copper), true);
  equal(data.paintAppearance, { id: copper.id, name: copper.name });
  equal(paint.color.getHex(), copper.color);
  equal(data.originalColor.getHex(), copper.color);
  for (const key of finishKeys) equal(paint[key], copper[key]);
  equal(data.damageBase, { roughness: copper.roughness, clearcoat: copper.clearcoat });
  equal(paint.onBeforeCompile, compile, `${label}: wear/fleck shader is preserved`);
  equal(paint.customProgramCacheKey, program);
  const zones = { front: 1, rear: 0, left: 2, right: 0 };
  updateVehicleDamage(vehicle, 3, false, 0, zones);
  const damagedColor = new THREE.Color(copper.color).lerp(new THREE.Color(0x191a1b), 3 * .018);
  equal(paint.color.toArray(), damagedColor.toArray(), `${label}: damage uses selected color`);
  const damageKey = data.damageKey, damagedVertices = data.damageMeshes.map(item => item.mesh.geometry.attributes.position.array.slice());
  for (let repeat = 0; repeat < 100; repeat++) equal(applyVehiclePaint(vehicle, { ...copper }), false);
  equal(data.damageKey, damageKey, `${label}: repeated preview preserves damage cache`);
  equal(paint.color.toArray(), damagedColor.toArray(), `${label}: repeated paint does not erase wear`);
  equal(applyVehiclePaint(vehicle, glacier), true);
  equal(data.damageKey, null, `${label}: changed baseline is reapplied by normal damage update`);
  updateVehicleDamage(vehicle, 3, false, 0, zones);
  equal(paint.color.toArray(), new THREE.Color(glacier.color).lerp(new THREE.Color(0x191a1b), 3 * .018).toArray());
  for (let i = 0; i < data.damageMeshes.length; i++) equal(data.damageMeshes[i].mesh.geometry.attributes.position.array, damagedVertices[i], `${label}: repaint preserves dents`);
  updateVehicleDamage(vehicle, 5, true, 0, zones);
  equal(paint.roughness, .94); equal(paint.clearcoat, .05);
  equal(applyVehiclePaint(vehicle, glacier), false, `${label}: repeated preset cannot unburn a wreck`);
  updateVehicleDamage(vehicle, 0, false);
  equal(paint.color.getHex(), glacier.color);
  equal(paint.roughness, glacier.roughness); equal(paint.clearcoat, glacier.clearcoat);
  for (const item of data.damageMeshes) equal(item.mesh.geometry.attributes.position.array, item.rest, `${label}: reset restores geometry`);
  equal(applyVehiclePaint(vehicle, { id: 'factory', color: 0 }), true, `${label}: factory ignores custom overrides`);
  updateVehicleDamage(vehicle, 0, false);
  equal(materialState(paint), factory, `${label}: factory restores exact original finish`);
  equal(data.originalColor.toArray(), factory.color);
  equal(applyVehiclePaint(vehicle, null), false);
  for (const [material, before] of trim) equal(materialState(material), before, `${label}: trim/livery stays unchanged`);
  for (const [material, before] of otherMaterials) equal(materialState(material), before, `${label}: other instance is unchanged`);
  equal(inventory(vehicle), original, `${label}: no meshes, geometry or materials allocated`);
  equal(data.paint, paint); equal(data.fractures, fractures);
  for (let i = 0; i < fractures.length; i++) equal(fractures[i].mesh, fractureMeshes[i]);
  for (let i = 0; i < data.damageMeshes.length; i++) equal(data.damageMeshes[i].mesh.geometry.attributes.position, positionAttributes[i]);
  // A garage opened after a wreck must not capture burned paint as the factory.
  const late = make(), lateFactory = materialState(late.userData.paint);
  updateVehicleDamage(late, 5, true);
  applyVehiclePaint(late, copper); updateVehicleDamage(late, 0, false);
  applyVehiclePaint(late, null); updateVehicleDamage(late, 0, false);
  equal(materialState(late.userData.paint), lateFactory, `${label}: factory baseline survives late first use`);
}

const basic = createVehicle(), basicFactory = materialState(basic.userData.paint);
equal(applyVehiclePaint(basic, { id: 'partial', color: '#114466', roughness: .5 }), true);
equal(basic.userData.paint.color.getHex(), 0x114466);
equal(basic.userData.paint.metalness, basicFactory.metalness);
equal(applyVehiclePaint(basic, { id: 'partial', color: '#114466', roughness: .6 }), true, 'same id with changed parameters updates');
equal(basic.userData.paint.roughness, .6);
const version = basic.userData.paint.version;
applyVehiclePaint(basic, { id: 'dry', clearcoat: 0 });
ok(basic.userData.paint.version > version, 'zero clearcoat changes shader feature');
const dryVersion = basic.userData.paint.version;
equal(applyVehiclePaint(basic, { id: 'dry', clearcoat: 0 }), false);
equal(basic.userData.paint.version, dryVersion, 'repeated application does not recompile');
applyVehiclePaint(basic, { id: 'invalid', color: NaN, roughness: NaN, metalness: Infinity });
equal(basic.userData.paint.color.toArray(), basicFactory.color);
equal(basic.userData.paint.roughness, basicFactory.roughness);
equal(basic.userData.paint.metalness, basicFactory.metalness);
equal(applyVehiclePaint(null, copper), false);

// Shared materials are not used by current body factories. The guard keeps a
// future factory from recoloring another vehicle or disposing a shared asset.
const shared = new THREE.MeshPhysicalMaterial({ color: 0x990011, roughness: .3, clearcoat: 1 });
shared.userData.sharedAsset = true;
const sharedHook = shared.onBeforeCompile, sharedState = materialState(shared);
const group = new THREE.Group(), spectator = new THREE.Mesh(new THREE.BoxGeometry(), shared);
group.add(new THREE.Mesh(spectator.geometry, [shared, new THREE.MeshStandardMaterial()]));
group.userData.paint = shared;
applyVehiclePaint(group, copper);
ok(group.userData.paint !== shared);
equal(group.children[0].material[0], group.userData.paint);
equal(group.userData.paint.userData.sharedAsset, false);
equal(group.userData.paint.onBeforeCompile, sharedHook);
equal(materialState(spectator.material), sharedState);
const sharedInventory = inventory(group);
equal(applyVehiclePaint(group, copper), false);
equal(inventory(group), sharedInventory, 'shared guard clones only once');

console.log(`Vehicle paint: ${checks} checks passed across all ${fixtures.length} actual runtime cars; damage, factory restore, trim isolation and repeated updates preserve resources.`);
