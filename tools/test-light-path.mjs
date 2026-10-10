import assert from 'node:assert/strict';
import {summarizeFrameTiming} from './scenarios/p4-daynight.mjs';
import * as THREE from 'three';
import { sampleLightPath, lightPathLook } from '../src/light-path.js';
import { resolveLightingSettings } from '../src/lighting-moods.js';
import { createSceneLighting, createPathNightDetails } from '../src/scene-lighting.js';
import * as vehicles from '../src/vehicles.js';
import { createVehicleAssets } from '../src/vehicle-assets.js';
import { disposeTree } from '../src/world.js';
import { createCityInteriorMaterial } from '../src/city-interiors.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, label) => check(Math.abs(actual - expected) < 1e-10, label);
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
// A broken supported timer must never turn zero/zero into a passing NaN ratio.
assert.throws(() => summarizeFrameTiming(Array(360).fill(0)), /positive p95/,
  'all-zero timings cannot qualify as frame-cost evidence');checks++;
assert.throws(() => summarizeFrameTiming([...Array(359).fill(0), 1]), /positive p95/,
  'a zero p95 is invalid even when one timing sample is positive');checks++;
equal(summarizeFrameTiming([1, 3, 2]), {samples: 3, p50: 2, p95: 3},
  'valid frame timing keeps the established percentile recipe');

const looks = ['day', 'golden', 'dusk', 'night'];
const path = freeze({axis: 'race-progress', keyframes: looks.map((look, i) => ({at: i / 3, look}))});
const sample = (distance, extra = {}) => sampleLightPath(path, {distance, raceLength: 3000, theme: 'coast', ...extra});

for (const look of looks) {
  const value = lightPathLook(look, 'coast');
  check(Object.isFrozen(value), `${look}: shared look is immutable`);
  for (const key of ['fog', 'top', 'horizon', 'ground', 'sunColor', 'cloudTint']) {
    check(Object.isFrozen(value[key]) && value[key].length === 3 &&
      value[key].every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 1), `${look}: linear RGB ${key}`);
  }
  for (const key of ['sun', 'hemi', 'env', 'sunStrength', 'cloudCover', 'stars', 'moon', 'nightAmount', 'lightLevel'])
    check(Number.isFinite(value[key]) && value[key] >= 0, `${look}: finite ${key}`);
  check(value.fogNear > 0 && value.fogFar > value.fogNear && value.exposure > 0, `${look}: usable fog and exposure`);
}
for (const theme of ['desert', 'coast', 'alpine', 'arena']) for (const look of ['day', 'golden']) {
  const value = lightPathLook(look, theme), old = resolveLightingSettings(theme, {mood: look === 'day' ? 'clear' : 'golden'});
  for (const key of ['fog', 'top', 'horizon', 'ground', 'sunColor'])
    equal(value[key], new THREE.Color(old[key]).toArray(), `${theme}/${look}: existing palette converted to linear RGB`);
  for (const key of ['sun', 'hemi', 'env', 'fogNear', 'fogFar'])
    equal(value[key], old[key], `${theme}/${look}: existing strength retained`);
}
const day = lightPathLook('day', 'coast'), golden = lightPathLook('golden', 'coast');
const dusk = lightPathLook('dusk', 'coast'), night = lightPathLook('night', 'coast');
check(day.sun > golden.sun && golden.sun > dusk.sun && dusk.sun > night.sun, 'sun dims through all four looks');
check(day.sunOffset.y > golden.sunOffset.y && golden.sunOffset.y > dusk.sunOffset.y, 'sun drops toward the horizon');
check(night.hemi > 0 && night.env > 0, 'night keeps visible road and car fill');
equal([day.stars, day.moon, day.nightAmount], [0, 0, 0], 'day contains no night extras');
equal([night.stars, night.moon, night.nightAmount], [1, 1, 1], 'night enables the complete night presentation');
equal(dusk.nightAmount, .55, 'dusk uses the settled blend');

for (let i = 0; i < looks.length; i++)
  equal(sample(i * 1000).settings, lightPathLook(looks[i], 'coast'), `exact ${looks[i]} keyframe`);
equal(sample(-20), sample(0), 'progress before start clamps to start');
equal(sample(3200), sample(3000), 'progress after finish clamps to finish');
const quarter = sample(250), mix = .25 * .25 * (3 - 2 * .25);
for (const key of ['sun', 'hemi', 'env', 'fogNear', 'fogFar', 'stars', 'moon', 'nightAmount'])
  near(quarter.settings[key], day[key] + (golden[key] - day[key]) * mix, `smoothstep scalar ${key}`);
for (const key of ['fog', 'top', 'horizon', 'ground', 'sunColor', 'cloudTint'])
  for (let i = 0; i < 3; i++) near(quarter.settings[key][i], day[key][i] + (golden[key][i] - day[key][i]) * mix, `linear-light ${key} channel ${i}`);
near(quarter.settings.sunOffset.y, day.sunOffset.y + (golden.sunOffset.y - day.sunOffset.y) * mix, 'sun height blends');
check(sample(2001).settings.nightAmount >= sample(1999).settings.nightAmount, 'second-lap distance does not restart the sunset');
equal(sample(1000), sample(1000), 'repeated and paused progress is repeatable');
equal(sample(2500), sampleLightPath(path, {distance: 2500, raceLength: 3000, theme: 'coast', elapsed: 1e12}), 'wall time does not control the look');
const byDistance = freeze({axis: 'distance', keyframes: [{at: 100, look: 'day'}, {at: 900, look: 'night'}]});
equal(sampleLightPath(byDistance, {distance: 500, raceLength: 1000, theme: 'coast'}), sampleLightPath(byDistance, {distance: 500, raceLength: 99999, theme: 'coast'}), 'distance paths ignore race length');
equal(sampleLightPath({axis: 'distance', keyframes: [{at: 250, look: 'dusk'}]}, {distance: 1000, theme: 'coast'}).settings,
  lightPathLook('dusk', 'coast'), 'single keyframe is a fixed look');
equal(sampleLightPath(byDistance, {distance: -20, theme: 'coast'}).settings, day, 'distance before start clamps to day');
equal(sampleLightPath(byDistance, {distance: 14000, theme: 'coast'}).settings, night, 'point-to-point finish stays at final night keyframe');
const output = {};
const firstOutput = sampleLightPath(path, {distance: 700, raceLength: 3000}, output);
equal(firstOutput, output, 'renderer may supply one reusable sample buffer');
const colorBuffer = output.settings.fog, offsetBuffer = output.settings.sunOffset;
for (let i = 0; i < 30; i++) {
  check(sampleLightPath(path, {distance: i * 100, raceLength: 3000}, output) === output, 'per-frame sample output is reused');
  check(output.settings.fog === colorBuffer && output.settings.sunOffset === offsetBuffer, 'per-frame RGB and vector buffers are reused');
}
for (const invalid of [null, undefined, {}, {axis: 'clock', keyframes: path.keyframes},
  {axis: 'distance', keyframes: []}, {axis: 'distance', keyframes: [{at: 0, look: 'unknown'}]},
  {axis: 'distance', keyframes: [{at: NaN, look: 'day'}]},
  {axis: 'distance', keyframes: [{at: 2, look: 'day'}, {at: 1, look: 'night'}]},
  {axis: 'distance', keyframes: [{at: 1, look: 'day'}, {at: 1, look: 'night'}]},
  {axis: 'race-progress', keyframes: [{at: -.1, look: 'day'}, {at: 1, look: 'night'}]}])
  equal(sampleLightPath(invalid, {distance: 100, raceLength: 3000}), null, 'invalid path leaves legacy appearance in control');
for (const raceLength of [0, -1, NaN, Infinity])
  equal(sampleLightPath(path, {distance: 10, raceLength}), null, 'invalid race length cannot produce a progress path');
for (const distance of [NaN, Infinity, -Infinity])
  equal(sampleLightPath(path, {distance, raceLength: 3000}), null, 'invalid position cannot leak NaN to lighting');
const before = JSON.stringify(path), originalRandom = Math.random;
try {
  Math.random = () => { throw Error('Presentation sampled randomness'); };
  for (let i = 0; i < 25; i++) sampleLightPath(path, freeze({distance: i * 120, raceLength: 3000, theme: 'coast'}));
} finally { Math.random = originalRandom; }
equal(JSON.stringify(path), before, 'frozen course data survives sampling unchanged');
equal(sample(0).headlights, 0, 'day lamps are off');
equal(sample(3000).headlights, 1, 'night lamps are fully lit');
check(sample(2000).headlights > 0, 'dusk turns on car lamps');
const tunnel = sample(0, {tunnel: true});
equal(tunnel.headlights, 1, 'day tunnel still needs headlights');
equal(tunnel.settings.stars, 0, 'tunnel cannot turn daytime sky into night');

// Native scene owner: deterministic light phase and legacy restoration without a GPU.
const originalLoader = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = () => new THREE.Texture();
try {
  const scene = new THREE.Scene(), renderer = {toneMappingExposure: 1}, bloom = {strength: 0}, host = {dataset: {}};
  const lighting = createSceneLighting({scene, renderer, bloom, host}, {
    createPMREM: () => ({fromScene: () => ({texture: new THREE.Texture(), dispose() {}}), dispose() {}}),
    createRoom: () => ({dispose() {}}), loadEnvironment: () => {},
  });
  const legacy = {def: {theme: 'coast'}, features: {poles: []}, themeAt: () => 'coast', tunnelAt: () => false};
  const authored = {...legacy, def: {...legacy.def, lightPath: path}, raceLength: 3000};
  const sky = scene.getObjectByName('Atmosphere and cloud deck');
  const countLights = () => scene.children.filter(item => item.isLight).length;
  const originalCount = countLights(), legacySkyMaterial = sky.material;
  lighting.apply({course: legacy, mood: 'clear'});
  const original = {sun: lighting.sun.intensity, fog: scene.fog.color.toArray(), top: sky.material.uniforms.top.value.toArray(),
    exposure: renderer.toneMappingExposure, bloom: bloom.strength};
  const state = freeze({s: 3000, seed: 41, armor: 60});
  lighting.apply({course: authored, distance: state.s, raceLength: 3000, mood: 'clear', blend: 1});
  near(lighting.sun.intensity, night.sun, 'native scene consumes night keyframe');
  near(sky.material.uniforms.stars.value, 1, 'native sky receives stars');
  near(sky.material.uniforms.moon.value, 1, 'native sky receives moon');
  equal(countLights(), originalCount, 'path adds no new real light pool');
  const player = new THREE.Group(), position = {x: 0, y: 0, z: 0};
  lighting.updateVehicles({course: authored, position, player, police: null, distance: 3000, tall: false, now: 0, high: true, menu: false});
  equal(scene.children.filter(item => item.isSpotLight && !item.name && item.intensity > 0).length, 2, 'only the existing two player headlamps cast light');
  const distancePath = {axis: 'distance', keyframes: [{at: 0, look: 'day'}, {at: 1000, look: 'night'}]};
  const circuit = {...legacy, length: 1000, closed: true, def: {...legacy.def, lightPath: distancePath}};
  lighting.apply({course: circuit, distance: 1000, blend: 1});
  near(lighting.sun.intensity, day.sun, 'native owner wraps a closed-road distance path at the next lap');
  lighting.apply({course: circuit, distance: -20, blend: 1});
  near(lighting.sun.intensity, day.sun, 'negative grid position clamps to start before closed-road phasing');
  const openRoad = {...circuit, closed: false};
  lighting.apply({course: openRoad, distance: 1000, blend: 1});
  near(lighting.sun.intensity, night.sun, 'native owner preserves point-to-point finish night');
  lighting.apply({course: openRoad, distance: 1200, blend: 1});
  near(lighting.sun.intensity, night.sun, 'native owner clamps past an open-road finish');
  lighting.apply({course: legacy, mood: 'clear', blend: 1});
  equal({sun: lighting.sun.intensity, fog: scene.fog.color.toArray(), top: sky.material.uniforms.top.value.toArray(),
    exposure: renderer.toneMappingExposure, bloom: bloom.strength}, original, 'returning to an old course restores exact legacy settings');
  check(sky.material === legacySkyMaterial && !Object.hasOwn(sky.material.uniforms, 'stars') &&
    !Object.hasOwn(sky.material.uniforms, 'moon'), 'old courses restore their exact shader and inherit no night uniforms');
  equal(state, {s: 3000, seed: 41, armor: 60}, 'presentation leaves frozen race state untouched');
  lighting.dispose(); lighting.dispose();
  equal(scene.children.length, 0, 'scene resources are removed on disposal');
} finally { THREE.TextureLoader.prototype.load = originalLoader; }

// Lamp adapters operate on existing lens materials and never add NPC light nodes.
check(typeof vehicles.createVehicleNightLighting === 'function', 'vehicle night adapter is exported');
const cars = Array.from({length: 8}, () => {
  const car = new THREE.Group();
  const head = new THREE.Mesh(new THREE.BoxGeometry(.4, .1, .05),
    new THREE.MeshStandardMaterial({name: 'Headlamp lenses', emissive: 0xffdb9a, emissiveIntensity: .85}));
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.4, .1, .05),
    new THREE.MeshStandardMaterial({name: 'Brake lenses', emissive: 0xff2116, emissiveIntensity: 1.4}));
  head.position.z = 2; tail.position.z = -2;
  car.add(head, tail); car.userData.brakeLights = [tail]; car.userData.size = {width: 2, length: 4.8, height: 1.5};
  return {car, head, tail, headMaterial: head.material, tailMaterial: tail.material};
});
for (const entry of cars) {
  const {car, head, tail, headMaterial, tailMaterial} = entry;
  const lamp = vehicles.createVehicleNightLighting(car);
  lamp.update({amount: 1, braking: false});
  check(head.material.emissiveIntensity > .85 && tail.material.emissiveIntensity >= 1.4, 'native lenses light at night');
  check(car.getObjectByName('Night headlight cones')?.visible, 'night has bounded cheap headlight beams');
  let lights = 0; car.traverse(item => { if (item.isLight) lights++; });
  equal(lights, 0, 'car adapter adds no real lights');
  const tailAtNight = tail.material.emissiveIntensity;
  lamp.update({amount: 1, braking: true});
  check(tail.material.emissiveIntensity > tailAtNight, 'braking stays brighter than tail lamps');
  const graph = car.children.map(item => item.uuid);
  for (let i = 0; i < 20; i++) lamp.update({amount: i / 20, braking: false});
  equal(car.children.map(item => item.uuid), graph, 'updates do not allocate another object tree');
  // Renderer writes braking before its lighting hook; leaving a path must keep that input.
  tail.material.emissiveIntensity = 4;
  lamp.restore({braking: true});
  equal(tail.material.emissiveIntensity, 4, 'legacy restoration keeps this frame braking');
  tailMaterial.emissiveIntensity = 1.4;
  lamp.restore();
  equal([head.material, tail.material], [headMaterial, tailMaterial], 'old-course restore retains original lens materials');
  equal([headMaterial.emissiveIntensity, tailMaterial.emissiveIntensity], [.85, 1.4], 'old-course original lamp strengths survive');
  lamp.dispose(); lamp.dispose();
  equal(car.children, [head, tail], 'path-only beam is removed once');
  for (const mesh of [head, tail]) { mesh.geometry.dispose(); mesh.material.dispose(); }
}
const sharedHead = new THREE.MeshStandardMaterial({name: 'Headlamp lenses', emissiveIntensity: .85});
const sharedTail = new THREE.MeshStandardMaterial({name: 'Brake lenses', emissiveIntensity: 1.4});
const sharing = [0, 1].map(() => {
  const car = new THREE.Group(), head = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), sharedHead);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), sharedTail);
  car.add(head, tail); car.userData.brakeLights = [tail]; car.userData.size = {width: 2, height: 1, length: 4};
  return {car, head, tail, lamps: vehicles.createVehicleNightLighting(car)};
});
sharing[0].lamps.update({amount: 1, braking: true});
sharing[1].lamps.update({amount: 1, braking: false});
check(sharing[0].tail.material !== sharing[1].tail.material, 'even shared source lamps become car-owned');
check(sharing[0].tail.material.emissiveIntensity > sharing[1].tail.material.emissiveIntensity, 'one car braking cannot brighten another');
equal([sharedHead.emissiveIntensity, sharedTail.emissiveIntensity], [.85, 1.4], 'night never mutates shared source materials');
for (const entry of sharing) { entry.lamps.dispose(); entry.head.geometry.dispose(); entry.tail.geometry.dispose(); }
sharedHead.dispose(); sharedTail.dispose();
// Production geometry (seven synchronous player models plus a traffic sedan),
// including intact/damaged lenses and a braking transition back to legacy.
{
  const assets = createVehicleAssets();
  const keys = ['falcone_f42', 'stuttgart_959s', 'dusthawk_rally', 'banshee_muscle',
    'viper_proto', 'titan_monster', 'koenigsegg_jesko'];
  const models = keys.map(key => assets.create(key));models.push(vehicles.createVehicle());
  for (const car of models) {
    check(!!car, 'native geometry is available without a substitute');
    const nativeHeads = [];
    car.traverse(mesh => { if (mesh.isMesh && (/^(Headlamp lenses|Headlight)$/.test(mesh.material?.name) ||
      mesh.material?.name === '' && mesh.material.emissive?.getHex() === 0xffdf97 && mesh.material.roughness === .2)) nativeHeads.push(mesh); });
    check(nativeHeads.length > 0 && car.userData.brakeLights.length > 0, car.name + ': actual head and tail lenses identified');
    vehicles.updateVehicleDamage(car, 2, false, 0, {front: 2, rear: 1, left: 0, right: 0});
    const lens = nativeHeads[0], source = lens.material, vertices = lens.geometry.attributes.position.array.slice();
    const wear = lens.geometry.attributes.panelWear.array.slice();
    check(wear.some(value => value > 0), car.name + ': actual damaged lens retains wear data');
    const lamps = vehicles.createVehicleNightLighting(car);
    lamps.update({amount: 0, braking: false});
    equal(lens.material.emissiveIntensity, 0, car.name + ': path day switches actual headlamps off');
    check(!car.getObjectByName('Night headlight cones').visible, car.name + ': day has no beam');
    lamps.update({amount: 1, braking: true});
    check(lens.material.emissiveIntensity > 0 && car.getObjectByName('Night headlight cones').visible, car.name + ': night activates actual lenses and beam');
    check(lens.material.onBeforeCompile === source.onBeforeCompile &&
      lens.material.customProgramCacheKey === source.customProgramCacheKey, car.name + ': damage shader callbacks remain active');
    equal(lens.geometry.attributes.position.array, vertices, car.name + ': lighting does not repair dents');
    equal(lens.geometry.attributes.panelWear.array, wear, car.name + ': lighting does not erase broken-lens wear');
    for (const tail of car.userData.brakeLights) tail.material.emissiveIntensity = 4;
    lamps.restore({braking: true});
    check(lens.material === source && car.userData.brakeLights.every(tail => tail.material.emissiveIntensity === 4), car.name + ': legacy retains current braking');
    lamps.restore({braking: false});
    check(car.userData.brakeLights.every(tail => tail.material.emissiveIntensity === 1.4), car.name + ': next legacy frame releases brakes');
    lamps.dispose();disposeTree(car);
  }
}

// Path-only world decoration restores exact native maps/materials on exit.
{
  const world = new THREE.Group(), sign = new THREE.Group();sign.userData.roadSignId = 'native-test-board';
  const signMap = new THREE.Texture(), signMaterial = new THREE.MeshStandardMaterial({map: signMap});
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, .12), signMaterial);sign.add(board);world.add(sign);
  const windowMaterial = new THREE.MeshStandardMaterial({name: 'Blender lodge glazing', emissive: 0, emissiveIntensity: 0});
  const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1, .1), windowMaterial);world.add(window);
  const definition = freeze({theme: 'alpine', nightWindows: [{x: 80, y: 12, z: 240}, {x: 83, y: 12, z: 240}]});
  const course = {def: definition, length: 1000, closed: false, roadHalfWidthAt: () => 7,
    groundAt: (s, off) => ({x: off, y: 2, z: s, heading: 0})};
  const details = createPathNightDetails({world, course});
  details.update({amount: 1, headlights: 1, position: {x: 0, y: 2, z: 100}, heading: 0, distance: 100, high: true});
  check(board.material !== signMaterial && board.material.map === signMap, 'reflective sign preserves native text map');
  check(window.material !== windowMaterial && window.material.emissiveIntensity > 0, 'native landmark glazing lights at night');
  equal(signMaterial.emissiveIntensity, 1, 'source sign strength is not mutated');
  equal(windowMaterial.emissiveIntensity, 0, 'source landmark strength is not mutated');
  const reflectors = world.getObjectByName('Road reflectors');
  check(reflectors?.isInstancedMesh && reflectors.count > 0 && reflectors.count <= 64, 'road reflectors use a bounded native instance pool');
  const highCount = reflectors.count;
  const town = world.getObjectByName('Distant town windows');
  check(town?.isPoints && town.geometry.attributes.position.count === 2, 'authored town windows retain real world positions');
  const graph = world.children.map(item => item.uuid);
  details.update({amount: .55, headlights: .5, position: {x: 0, y: 2, z: 100}, heading: 0, distance: 100, high: false});
  check(reflectors.count < highCount, 'Performance reduces reflector instances');
  equal(world.children.map(item => item.uuid), graph, 'world updates reuse scene objects');
  let lights = 0;world.traverse(item => { if (item.isLight) lights++; });equal(lights, 0, 'reflectors and windows add no real lights');
  details.restore();
  check(board.material === signMaterial && window.material === windowMaterial, 'legacy world restores exact material identity');
  check(!world.getObjectByName('Authored night details').visible, 'legacy world hides every path-only instance');
  details.dispose();details.dispose();
  equal(world.children, [sign, window], 'world detail disposal removes only its own group');
  for (const item of [board, window]) { item.geometry.dispose();item.material.dispose(); }signMap.dispose();
}
// Real city panes replace Harbor fallback windows. Their native shader writes
// emissive radiance directly, so changing the material intensity alone is inert.
{
  const world = new THREE.Group(), source = createCityInteriorMaterial();
  const pane = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), source, 1);
  pane.name = 'City glass pane';world.add(pane);
  const course = {def: {}, length: 1000, closed: true, roadHalfWidthAt: () => 7,
    groundAt: (s, off) => ({x: off, y: 0, z: s, heading: 0})};
  const input = {amount: 1, headlights: 1, position: {x: 0, y: 0, z: 50}, distance: 50};
  const originalCompile = source.onBeforeCompile, originalKey = source.customProgramCacheKey();
  const details = createPathNightDetails({world, course});details.update(input);
  check(pane.material !== source, 'actual native city interior receives a path-only binding');
  const shader = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader};
  const nativeShader = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader};
  source.onBeforeCompile(nativeShader);pane.material.onBeforeCompile(shader);
  near(shader.uniforms.pathInteriorNight.value, 1.4, 'native city shader receives night strength');
  equal(shader.vertexShader, nativeShader.vertexShader, 'native city perspective vertex path stays exact');
  equal(shader.fragmentShader.replace('\nuniform float pathInteriorNight;', '')
    .replace('totalEmissiveRadiance=cityInteriorColor*cityInteriorLight*pathInteriorNight*vec3(1.0,.87,.69);',
      'totalEmissiveRadiance=cityInteriorColor*cityInteriorLight;'), nativeShader.fragmentShader,
    'native room-box/parallax shader stays exact apart from bounded night emission');
  check(pane.material.customProgramCacheKey() !== originalKey, 'path shader has a separate program key');
  details.update({...input, amount: 0});
  equal(shader.uniforms.pathInteriorNight.value, 0, 'day path removes native room emission');
  equal(source.emissiveIntensity, .7, 'original native interior intensity is unchanged');
  equal(source.onBeforeCompile, originalCompile, 'original native interior shader is unchanged');
  details.restore();equal(pane.material, source, 'leaving path restores the exact native city material');
  details.dispose();pane.geometry.dispose();source.dispose();
}
console.log(`Light paths: ${checks} acceptance checks passed.`);
