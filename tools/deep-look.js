// The Deep, look test (card D0). A ~300 m stretch of sea floor from 5 m of
// water, through a kelp forest, down a slope to about 30 m, with one car on
// the sand and a fish school. Nothing here is reachable from the game: it
// builds its own scene from src/deep/ and the existing car model, reads no
// saves and touches no race state.
//
//   /tools/deep-look.html?quality=high|performance&view=1..6&time=SECONDS&clean=1
//   window.__deepLook: showView(i), info()
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { installIsolatedStorage } from './qa-storage.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { CAUSTIC_ON_PAINT, createUnderwaterLook } from '../src/deep/underwater-look.js';
import { createContactShadow } from '../src/deep/contact-shadow.js';
import { createFloorMesh, createPebbles, createRocks, createSeagrass } from '../src/deep/sea-floor.js';
import { createKelp } from '../src/deep/kelp.js';
import { createFishSchool } from '../src/deep/fish-school.js';
import { createHeadlights } from '../src/deep/headlights.js';
import { floorHeight, forestShade } from '../src/deep/sea-floor-shape.js';
import { lookQuality } from '../src/deep/look-quality.js';

const query = new URLSearchParams(location.search);
const qualityName = query.get('quality') === 'performance' ? 'performance' : 'high';
const profile = lookQuality(qualityName);
const WIDTH = 1280, HEIGHT = 720;
if (query.get('clean')) document.body.classList.add('clean');

// ---- renderer, the way the game's High and Performance set it up ------------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatioMax));
renderer.setSize(WIDTH, HEIGHT);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, WIDTH / HEIGHT, 0.15, 700);
let composer = null, bloom = null;
if (profile.pipeline === 'composite') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.22, 0.6, 1.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass(WIDTH, HEIGHT));
  composer.setPixelRatio(renderer.getPixelRatio());
}

// ---- the world ---------------------------------------------------------
const look = createUnderwaterLook({ renderer, scene, quality: qualityName });
const floor = createFloorMesh(look.uniforms, { cell: qualityName === 'high' ? 1 : 1.5 });
const seagrass = createSeagrass(look.uniforms, { tufts: profile.seagrassTufts });
const rocks = createRocks(look.uniforms, { count: profile.rocks, detail: 1 });
const pebbles = createPebbles(look.uniforms, { count: profile.pebbles });
const kelp = createKelp(look.uniforms, { stems: profile.kelpStems, blades: profile.kelpBlades, distance: profile.kelpDistance, castShadow: profile.shadowKelp });
scene.add(floor, seagrass.group, rocks.group, pebbles.group, kelp.group);

const car = createClassicVehicle({ key: 'falcone_f42' });
car.name = 'Falcone F42 (scale and light reference)';
look.applyTo(car, { fragmentExtra: CAUSTIC_ON_PAINT });
car.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.isMeshStandardMaterial) m.envMapIntensity = 1.8; }); });
car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
scene.add(car);
createContactShadow(car);
const headlights = createHeadlights(car, look.uniforms, { direct: profile.pipeline === 'direct' });

const school = createFishSchool(look.uniforms, { count: profile.fish, seed: 11, floorAt: floorHeight });
scene.add(school.mesh);

// Put the car on the floor: tilted to the ground under its four wheels (the
// axles are at +1.35 and -1.41 m, the tracks at 0.95 m) and sunk a little into
// the sand, as a heavy car sits.
const carPos = new THREE.Vector3();
const AXLE_FRONT = 1.35, AXLE_BACK = -1.41, TRACK = 0.95, SINK = 0.05;
function placeCar(x, z, heading) {
  const s = Math.sin(heading), c = Math.cos(heading);
  const at = (fx, fz) => floorHeight(x + s * fz + c * fx, z + c * fz - s * fx);
  // The car's own +x is its left side.
  const fl = at(TRACK, AXLE_FRONT), fr = at(-TRACK, AXLE_FRONT), bl = at(TRACK, AXLE_BACK), br = at(-TRACK, AXLE_BACK);
  const front = (fl + fr) / 2, back = (bl + br) / 2, left = (fl + bl) / 2, right = (fr + br) / 2;
  const pitch = Math.atan2(front - back, AXLE_FRONT - AXLE_BACK), roll = Math.atan2(left - right, TRACK * 2);
  // Height at the car's middle (z = 0) from the front and back lines.
  const middle = back + (front - back) * (0 - AXLE_BACK) / (AXLE_FRONT - AXLE_BACK);
  const y = Math.min(middle, (fl + fr + bl + br) / 4) - SINK;
  car.position.set(x, y, z);
  car.rotation.set(-pitch, heading, roll, 'YXZ');
  carPos.set(x, y + 0.7, z);
  car.updateMatrixWorld(true);
}

// ---- the six views -----------------------------------------------------
const floorAt = (x, z) => floorHeight(x, z);
const VIEWS = [
  { name: 'Shallows in sun', car: [0, 24, -0.55], time: 3.2, school: null,
    // Looking toward the sun: the bright window and the sun's glow above, the car on the sand.
    camera: () => { const x = -5.1, z = 19.5; return [x, floorAt(x, z) + 1.0, z]; },
    target: () => { const x = -5.1, z = 19.5, y = floorAt(x, z) + 1.0; return [x + 0.74 * 9.4, y + 4.0, z + 0.67 * 9.4]; }, fov: 80, headlights: false },
  { name: 'Inside the kelp forest', car: [5, 112, 0.18], time: 9.5, school: [-9, 132],
    camera: () => [-4.6, floorAt(-4.6, 103) + 1.9, 103.5], target: () => [4.6, floorAt(5, 112) + 2.6, 113], fov: 62, headlights: false },
  { name: 'Up through the kelp', car: [8, 150, 0.7], time: 14.0, school: null,
    camera: () => { const y = floorAt(2, 140) + 1.0; return [2, y, 140]; }, target: () => { const y = floorAt(2, 140) + 1.0; return [2 + 0.42 * 20, y + 0.60 * 20, 140 + 0.40 * 20]; }, fov: 68, headlights: false },
  { name: 'Fish school parts around the car', car: [0, 66, 0.1], time: 20.4, school: [1.0, 64.2],
    camera: () => [5.4, floorAt(5.4, 61.4) + 1.35, 61.4], target: () => [0.3, floorAt(0, 66) + 2.3, 66.4], fov: 68, headlights: false },
  { name: 'Deep, 28 m, headlights', car: [-1, 289, 0.0], time: 6.0, school: null,
    camera: () => [8.6, floorAt(8.6, 287) + 1.5, 287.2], target: () => [-1.0, floorAt(-1, 292) + 1.0, 292.5], fov: 60, headlights: true },
  { name: 'Low chase view', car: [0, 46, 0.0], time: 11.0, school: null,
    camera: () => { const y = floorAt(0, 46) + 0.75; return [0, y + 3.65, 46 - 8.7]; }, target: () => [0, floorAt(0, 72) + 1.05 + 0.6, 72], fov: 55, headlights: true },
];

let current = null;
function setView(index, options = {}) {
  const view = VIEWS[index - 1];
  if (!view) throw new Error(`No view ${index}`);
  current = { index, view, time: options.time ?? view.time };
  schoolView = null;
  placeCar(view.car[0], view.car[1], view.car[2]);
  headlights.setOn(view.headlights);
  const [cx, cy, cz] = view.camera(), [tx, ty, tz] = view.target();
  camera.position.set(cx, cy, cz);
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(tx, ty, tz);
  return view;
}

// Fish are placed so the middle of the school crosses the car at the view's time.
function fishAnchor(view) {
  const [x, z] = view.school || [view.car[0], view.car[1]];
  return { x, y: floorHeight(x, z) + 1.2, z };
}
let schoolView = null;
const LOOP_RATE = (Math.PI * 2) / 60;
function configureSchool(view) {
  if (schoolView === view) return;
  schoolView = view;
  school.mesh.visible = view.school !== null;
  // Where the school is on its loop at the view's time: right over the car for
  // the school view, off to one side for the others.
  const want = view.school ? -0.05 : -0.9;
  school.reanchor(fishAnchor(view), want - LOOP_RATE * (current.time));
}

const readout = document.getElementById('readout');
function renderFrame(seconds) {
  renderer.info.autoReset = false;
  renderer.info.reset();
  // Under the kelp the water takes an olive-green cast; in open water none.
  const shade = forestShade(camera.position.x, camera.position.z);
  look.setTint([1 - 0.18 * shade, 1 - 0.02 * shade, 1 - 0.38 * shade]);
  look.update(camera, seconds);
  look.focusSun(new THREE.Vector3((camera.position.x + carPos.x) / 2, Math.max(carPos.y, camera.position.y - 4), (camera.position.z + carPos.z) / 2));
  kelp.update(camera);
  seagrass.update(camera);
  school.update(seconds, carPos);
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (!query.get('clean')) {
    const r = look.readout(camera);
    readout.textContent = `${current ? `${current.index}. ${current.view.name}` : ''}  ${qualityName}\ndepth ${r.depth.toFixed(1)} m   caustics ${(r.caustics * 100).toFixed(0)}%   draws ${renderer.info.render.calls}   tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k`;
  }
}

function info() {
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    quality: qualityName, pipeline: profile.pipeline, pixelRatio: renderer.getPixelRatio(),
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown',
    kelpStems: kelp.count, kelpChunks: kelp.chunkCount, seagrassTufts: seagrass.count, rocks: rocks.count, fish: school.count,
    snowSpecks: look.snow.count, lightShafts: look.shafts.count()
  };
}

window.__deepLook = {
  views: VIEWS.map(v => v.name),
  info,
  // Place the view and draw it n times at its fixed time.
  showView(index, { frames = 3, time } = {}) {
    const view = setView(index, { time });
    configureSchool(view);
    const t = current.time;
    for (let i = 0; i < frames; i++) renderFrame(t + i / 60);
    return view.name;
  },
  // Handles for poking at the scene from the console while tuning.
  debug: { scene, camera, renderer, look, car, school, kelp, floor, seagrass, rocks, headlights, renderFrame: seconds => renderFrame(seconds), setView },
};

// Photography reuses this page's module graph; ordinary look pages expose no hook.
if (typeof __DUEL_QA__ !== 'undefined' && __DUEL_QA__ === true && query.get('art-qa') === '1') {
  window.__deepLook.artQa = Object.freeze({ THREE, GLTFLoader, floorHeight, installIsolatedStorage });
}

// Live preview when opened by hand: view 1 and a running clock.
setView(Number(query.get('view')) || 1, { time: query.get('time') ? Number(query.get('time')) : undefined });
configureSchool(current.view);
if (!query.get('still')) {
  const t0 = performance.now();
  const loop = () => { if (!window.__deepLook.paused) renderFrame(current.time + (performance.now() - t0) / 1000); requestAnimationFrame(loop); };
  if (!query.get('manual')) requestAnimationFrame(loop);
}
window.__deepLook.ready = true;
