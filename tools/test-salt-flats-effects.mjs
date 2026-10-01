import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildEnvironment, disposeTree} from '../src/world.js';
import {animateScene, syncScene} from '../src/scene-systems.js';
import {resolveLightingSettings} from '../src/lighting-moods.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {SALT_FLATS_VENUE, SCRAPDOME_VENUE} from '../src/arena/venues.js';
import {createFeatureFlags} from '../src/feature-flags.js';

// Real native scene, triangles and material fog participation. These headless
// checks do not judge how heat looks. Claude judges actual game captures
// from the browser companion in scenarios/salt-flats.mjs.
const root = resolve(import.meta.dirname, '..');
const candidate = resolve(process.env.SALT_FLATS_RENDER_ASSET ||
  resolve(root, '.evidence/ARENA-06/render-candidate/venue.glb'));
const local = relative(root, candidate);
assert(!isAbsolute(local) && !local.startsWith('..') && /^(?:\.evidence|\.qa-dist)[\\/]/.test(local),
  'effects checks read only the exact private native Salt candidate');
const bytes = readFileSync(candidate);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes), '7c47ce36ccf10a6fdc923236bb89d4c2dd513c60c9785e8efbe5d9ff71b4fc67');
const originalDocument = globalThis.document;
const originalTextureLoad = THREE.TextureLoader.prototype.load;
const context = new Proxy({measureText: text => ({width: String(text).length * 8}),
  createLinearGradient: () => ({addColorStop(){}}), createRadialGradient: () => ({addColorStop(){}}),
  getImageData: () => ({data: new Uint8ClampedArray(4)}),
  createImageData: (w,h) => ({data: new Uint8ClampedArray(w*h*4)})},
  {get: (target, key) => key in target ? target[key] : () => {}});
globalThis.document = {createElement: () => ({width: 0, height: 0, getContext: () => context})};
THREE.TextureLoader.prototype.load = function(){return new THREE.Texture();};
const summary = {checks: 0, passed: 0, failed: 0, rayWitnesses: [],
  candidateSha256: hash(bytes), scope: 'Native outside-bowl presentation only; no heat/look/frame clearance.'};
async function check(name, action) {
  summary.checks++;
  try {await action(); summary.passed++; console.log('PASS ' + name);}
  catch (error) {summary.failed++; console.error('FAIL ' + name + '\n' + error.stack);}
}
async function asset() {
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'PRIVATE_HEADLESS_IMAGES', loadTexture: () => Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const flush = () => new Promise(done => setImmediate(done));
async function nativeWorld(course = new Course(SALT_FLATS_VENUE, 1989)) {
  const gltf = await asset();
  const world = buildEnvironment(course, {saltFlats: {loadAsset: async () => gltf}});
  await flush();
  assert.equal(world.getObjectByName('Salt Flats')?.userData.assetStatus, 'ready');
  world.updateMatrixWorld(true);
  return {world, gltf, course};
}
function geometrySnapshot(scene) {
  scene.updateMatrixWorld(true);
  const rows = [];
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    rows.push({name: mesh.name, matrix: mesh.matrixWorld.toArray(),
      index: mesh.geometry.index ? hash(Buffer.from(mesh.geometry.index.array.buffer,
        mesh.geometry.index.array.byteOffset, mesh.geometry.index.array.byteLength)) : null,
      attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, value]) =>
        [name, hash(Buffer.from(value.array.buffer, value.array.byteOffset, value.array.byteLength))]))});
  });
  return rows;
}
function resources(scene) {
  const found = new Set();
  scene.traverse(mesh => {
    if (mesh.geometry) found.add(mesh.geometry);
    for (const material of [].concat(mesh.material || [])) {
      found.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) found.add(value);
    }
  });
  return found;
}
try {
  for (const mood of ['clear', 'golden', 'overcast']) {
    await check(mood + ': real outside-bowl surfaces continue to the existing opaque-fog distance', async () => {
      const {world, gltf, course} = await nativeWorld();
      try {
        const ground = gltf.scene.getObjectByName('salt-flats-ground');
        const bounds = new THREE.Box3().setFromObject(ground);
        const center = bounds.getCenter(new THREE.Vector3());
        const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
        const fog = resolveLightingSettings(course.def.theme, {mood});
        assert.equal(fog.fogFar, {clear: 1650, golden: 1550, overcast: 1450}[mood],
          'reference fog distances stay frozen; Salt candidate tuning cannot weaken coverage');
        const ray = new THREE.Raycaster(), missing = [], unfogged = [];
        ray.set(new THREE.Vector3(center.x,bounds.max.y+100,center.z),new THREE.Vector3(0,-1,0));
        assert(ray.intersectObject(ground,true).length>0,
          'the same genuine triangle ray must hit the native bowl before probing outside coverage');
        let samples = 0, hits = 0;
        // Eight actual radial directions. Seventeen samples include the native
        // edge + existing .002 export precision and the existing fog endpoint.
        // These are observation stations, not a new scenery size/shape rule.
        for (let direction = 0; direction < 8; direction++) {
          const angle = direction * Math.PI / 4, x = Math.cos(angle), z = Math.sin(angle);
          const edge = Math.min(Math.abs(x) > 1e-10 ? half.x / Math.abs(x) : Infinity,
            Math.abs(z) > 1e-10 ? half.z / Math.abs(z) : Infinity);
          for (let station = 0; station <= 16; station++) {
            const distance = edge + .002 + (fog.fogFar - edge - .002) * station / 16;
            const at = [center.x + x * distance, center.z + z * distance];
            samples++;
            ray.set(new THREE.Vector3(at[0], bounds.max.y + 100, at[1]), new THREE.Vector3(0,-1,0));
            const contact = ray.intersectObject(world, true).find(hit => hit.object.isMesh && hit.object.visible);
            if (!contact) {missing.push({direction, station, distance, at}); continue;}
            hits++;
            const materials = [].concat(contact.object.material || []);
            const material = materials[contact.face?.materialIndex || 0];
            if (!material?.fog) unfogged.push({direction, station, mesh: contact.object.name});
          }
        }
        const witness = {mood, fogNear: fog.fogNear, fogFar: fog.fogFar, samples, hits,
          missingCount: missing.length, missingExamples: missing.slice(0,8),
          unfoggedCount: unfogged.length, unfoggedExamples: unfogged.slice(0,8)};
        summary.rayWitnesses.push(witness);
        console.log('NATIVE RAY WITNESS ' + JSON.stringify(witness));
        assert.equal(missing.length, 0,
          mood + ': actual visible outside salt must not end at a debug slab before the existing fog transition');
        assert.equal(unfogged.length, 0,
          mood + ': actual outside-bowl hit materials must participate in the real scene fog');
      } finally {disposeTree(world);}
    });
  }
  await check('native donor graph, prepared bowl and Course physical data remain exact', async () => {
    const course = new Course(SALT_FLATS_VENUE, 1989), before = JSON.stringify(course.features);
    assert.equal(course.features.obstacles.length,168,'all original tight native physical colliders remain present');
    assert.equal(course.features.ramps.length,2,'both native Course ramps remain present');
    const original = await asset(), pinned = geometrySnapshot(original.scene);
    const {world, gltf} = await nativeWorld(course);
    try {
      let meshes = 0, triangles = 0;
      gltf.scene.traverse(mesh => {if (mesh.isMesh) {meshes++;
        triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;}});
      assert.equal(meshes, 172); assert.equal(triangles, 184340);
      assert.deepEqual(geometrySnapshot(gltf.scene), pinned,
        'visual extension/effect cannot move or rewrite genuine native donor geometry');
      assert.equal(JSON.stringify(course.features), before,
        'outside scenic surfaces cannot add physical collisions or modify native Course features');
      const bounds = new THREE.Box3().setFromObject(gltf.scene.getObjectByName('salt-flats-ground'));
      assert(Math.abs(bounds.getSize(new THREE.Vector3()).x - 300) <= .002);
      assert(Math.abs(bounds.getSize(new THREE.Vector3()).z - 200) <= .002);
      for (let i=0; i<120; i++) {animateScene(world, i/60); syncScene(world, {status:'racing'}, 1/60);}
      assert.deepEqual(geometrySnapshot(gltf.scene), pinned);
      assert.equal(JSON.stringify(course.features), before);
    } finally {disposeTree(world); disposeTree(original.scene);}
  });
  await check('outside presentation updates preserve real Duel, physical queries and seeded RNG', async () => {
    const duel = new Duel({seed:1989, featureFlags:createFeatureFlags({storage:null, qa:true,
      search:'?flags=scrapdome,wasteland2'})});
    assert(duel.startArenaEvent({venueId:'salt-flats', car:'falcone_f42', seed:1989,
      opponents:[{car:'dusthawk_rally'}]}));
    const before = JSON.stringify(duel.state), features = JSON.stringify(duel.course.features);
    const queries = Array.from({length:32}, (_,i) => ({ground:duel.course.groundAt(i*duel.course.length/32, 0),
      closest:duel.course.nearest(150 * Math.cos(i*Math.PI/16), 100 * Math.sin(i*Math.PI/16))}));
    const {world} = await nativeWorld(duel.course);
    try {
      for (let i=0; i<240; i++) {animateScene(world, i/60); syncScene(world, duel.state, 1/60);}
      assert.equal(JSON.stringify(duel.state), before); assert.equal(JSON.stringify(duel.course.features), features);
      assert.deepEqual(Array.from({length:32}, (_,i) => ({ground:duel.course.groundAt(i*duel.course.length/32, 0),
        closest:duel.course.nearest(150 * Math.cos(i*Math.PI/16), 100 * Math.sin(i*Math.PI/16))})), queries);
      assert.equal(duel.course.rng.float(), new Course(SALT_FLATS_VENUE,1989).rng.float());
    } finally {disposeTree(world);}
  });
  await check('native and additional presentation resources retire exactly once and never resurrect', async () => {
    const {world} = await nativeWorld(), counts = new Map();
    for (const resource of resources(world)) {counts.set(resource,0);
      resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource)+1));}
    disposeTree(world); disposeTree(world);
    for (const [resource,count] of counts) assert.equal(count, resource.userData.sharedAsset ? 0 : 1);
    const retired = geometrySnapshot(world);
    animateScene(world, 999); syncScene(world, {status:'racing'}, 1);
    assert.deepEqual(geometrySnapshot(world), retired);
  });
  for (const definition of [SCRAPDOME_VENUE, COURSE[0]]) {
    await check(definition.id + ': Salt effects/scenery never load or change ordinary Course/RNG', async () => {
      const course = new Course(definition,1989), features = JSON.stringify(course.features);
      let loads = 0;
      const world = buildEnvironment(course, {saltFlats:{loadAsset:async()=>{loads++; throw Error('Salt must remain inactive');}}});
      try {
        await flush(); assert.equal(loads,0); assert.equal(world.getObjectByName('Salt Flats'),undefined);
        assert.equal(JSON.stringify(course.features), features);
        assert.equal(course.rng.float(),new Course(definition,1989).rng.float());
      } finally {disposeTree(world);}
    });
  }
} finally {
  THREE.TextureLoader.prototype.load = originalTextureLoad;
  if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
}
console.log('Salt outside presentation: ' + summary.checks + ' checks, ' + summary.passed + ' pass, ' + summary.failed + ' fail.');
console.log(JSON.stringify(summary));
if (summary.failed) process.exitCode = 1;
