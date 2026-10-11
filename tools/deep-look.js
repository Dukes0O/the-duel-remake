// The Deep, look test (card D0). A ~300 m stretch of sea floor from 5 m of
// water, through a kelp forest, down a slope to about 30 m, with one car on
// the sand and a fish school. Nothing here is reachable from the game: it
// builds its own scene from src/deep/ and the existing car model, reads no
// saves and touches no race state.
//
//   /tools/deep-look.html?quality=high|performance&view=1..6&time=SECONDS&clean=1
//   window.__deepLook: showView(i), measure(i, frames), info()
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createUnderwaterLook } from '../src/deep/underwater-look.js';
import { createFloorMesh, createRocks, createSeagrass } from '../src/deep/sea-floor.js';
import { createKelp } from '../src/deep/kelp.js';
import { createFishSchool } from '../src/deep/fish-school.js';
import { createHeadlights } from '../src/deep/headlights.js';
import { floorHeight } from '../src/deep/sea-floor-shape.js';
import { lookQuality } from '../src/deep/look-quality.js';

const constructionStart = performance.now();
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
const rocks = createRocks(look.uniforms, { count: profile.rocks, detail: qualityName === 'high' ? 3 : 2 });
const kelp = createKelp(look.uniforms, { stems: profile.kelpStems, blades: profile.kelpBlades, distance: profile.kelpDistance, castShadow: profile.shadowKelp });
scene.add(floor, seagrass.mesh, rocks.group, kelp.group);

const car = createClassicVehicle({ key: 'falcone_f42' });
car.name = 'Falcone F42 (scale and light reference)';
look.applyTo(car);
car.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.isMeshStandardMaterial) m.envMapIntensity = 1.8; }); });
car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
scene.add(car);
const headlights = createHeadlights(car, look.uniforms, { direct: profile.pipeline === 'direct' });

const school = createFishSchool(look.uniforms, { count: profile.fish, seed: 11, floorAt: floorHeight });
scene.add(school.mesh);

// Put the car on the floor, tilted to the ground under its wheels.
const carPos = new THREE.Vector3();
function placeCar(x, z, heading) {
  const s = Math.sin(heading), c = Math.cos(heading), halfLength = 1.6, halfWidth = 0.95;
  const at = (fx, fz) => floorHeight(x + s * fz + c * fx, z + c * fz - s * fx);
  // The car's own +x is its left side, so 'right' here is the +x side of the model.
  const front = (at(-halfWidth, halfLength) + at(halfWidth, halfLength)) / 2;
  const back = (at(-halfWidth, -halfLength) + at(halfWidth, -halfLength)) / 2;
  const left = (at(-halfWidth, halfLength) + at(-halfWidth, -halfLength)) / 2;
  const right = (at(halfWidth, halfLength) + at(halfWidth, -halfLength)) / 2;
  const y = (front + back + left + right) / 4 + 0.03;
  car.position.set(x, y, z);
  car.rotation.set(-Math.atan2(front - back, halfLength * 2), heading, Math.atan2(right - left, halfWidth * 2), 'YXZ');
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
  { name: 'Fish school parts around the car', car: [0, 66, 0.1], time: 20.4, school: [0, 66],
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
  return { x, y: floorHeight(x, z) + 1.5, z };
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
  look.update(camera, seconds);
  look.focusSun(new THREE.Vector3((camera.position.x + carPos.x) / 2, Math.max(carPos.y, camera.position.y - 4), (camera.position.z + carPos.z) / 2));
  kelp.update(camera);
  school.update(seconds, carPos);
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (!query.get('clean')) {
    const r = look.readout(camera);
    readout.textContent = `${current ? `${current.index}. ${current.view.name}` : ''}  ${qualityName}\ndepth ${r.depth.toFixed(1)} m   caustics ${(r.caustics * 100).toFixed(0)}%   draws ${renderer.info.render.calls}   tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k`;
  }
}

// ---- measuring ---------------------------------------------------------
function percentile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]; }
// GPU time per frame, when the browser offers a timer. Wraps the whole frame
// (every post-processing pass included).
function createGpuTimer() {
  const gl = renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  const pending = [], done = [];
  return {
    begin() { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); pending.push(q); },
    end() { gl.endQuery(ext.TIME_ELAPSED_EXT); },
    poll() {
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = pending.shift();
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) done.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(q);
      }
    },
    results: () => done,
  };
}

function measure(index, frames = 240, { skip = 30 } = {}) {
  setView(index);
  configureSchool(current.view);
  const timer = createGpuTimer();
  return new Promise(resolve => {
    const intervals = [], cpu = [];
    let last = NaN, n = 0;
    const base = current.time;
    function tick(now) {
      const started = performance.now();
      // The clock runs, so kelp sways, caustics move and the school swims as in play.
      if (timer && n >= skip) timer.begin();
      renderFrame(base + n / 60);
      if (timer && n >= skip) timer.end();
      const spent = performance.now() - started;
      if (n >= skip && Number.isFinite(last)) { intervals.push(now - last); cpu.push(spent); }
      timer?.poll();
      last = now; n++;
      if (n < frames + skip) requestAnimationFrame(tick);
      else finish();
    }
    function finish() {
      // Let the last timer results arrive.
      let waits = 0;
      const settle = () => {
        timer?.poll();
        if (timer && timer.results().length < frames * 0.9 && waits++ < 60) return requestAnimationFrame(settle);
        const sorted = [...intervals].sort((a, b) => a - b), sortedCpu = [...cpu].sort((a, b) => a - b);
        const gpu = timer ? [...timer.results()].sort((a, b) => a - b) : [];
        resolve({
          view: index, quality: qualityName, samples: sorted.length,
          frameMsP50: percentile(sorted, 0.5), frameMsP95: percentile(sorted, 0.95), frameMsMax: sorted[sorted.length - 1],
          cpuSubmitMsP50: percentile(sortedCpu, 0.5), cpuSubmitMsP95: percentile(sortedCpu, 0.95),
          gpuMsP50: gpu.length ? percentile(gpu, 0.5) : null, gpuMsP95: gpu.length ? percentile(gpu, 0.95) : null,
          drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        });
      };
      settle();
    }
    requestAnimationFrame(tick);
  });
}

function info() {
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    quality: qualityName, pipeline: profile.pipeline, pixelRatio: renderer.getPixelRatio(),
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown',
    kelpStems: kelp.count, kelpChunks: kelp.chunkCount, seagrassTufts: seagrass.count, rocks: rocks.count, fish: school.count,
    snowSpecks: look.snow.count, lightShafts: look.shafts.count(), constructionMs: Math.round(constructionMs),
  };
}

const constructionMs = performance.now() - constructionStart;   // every mesh, the car, the reflection map
window.__deepLook = {
  views: VIEWS.map(v => v.name),
  info,
  measure,
  // Place the view and draw it n times at its fixed time.
  showView(index, { frames = 3, time } = {}) {
    const view = setView(index, { time });
    configureSchool(view);
    const t = current.time;
    for (let i = 0; i < frames; i++) renderFrame(t + i / 60);
    return view.name;
  },
  constructionMs,
  // Handles for poking at the scene from the console while tuning.
  debug: { scene, camera, renderer, look, car, school, kelp, floor, seagrass, rocks, headlights, renderFrame: seconds => renderFrame(seconds), setView },
};

// Live preview when opened by hand: view 1 and a running clock.
setView(Number(query.get('view')) || 1, { time: query.get('time') ? Number(query.get('time')) : undefined });
configureSchool(current.view);
if (!query.get('still')) {
  const t0 = performance.now();
  const loop = () => { if (!window.__deepLook.paused) renderFrame(current.time + (performance.now() - t0) / 1000); requestAnimationFrame(loop); };
  if (!query.get('manual')) requestAnimationFrame(loop);
}
window.__deepLook.ready = true;
