// The Deep, a whole zone through createUnderwaterScene (card DEEP-WATER).
// Opened by tools/deep-look.html?zone=sample. The sample loop (tools/fixtures/
// deep-sample-zone.js) is not a place in the game: it proves the approved look
// works for any zone in the 10.1 format. No saves, no race state.
//
//   window.__deepLook: views, showView(i), info()   (same handle as the look test)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createUnderwaterScene } from '../src/deep/underwater-scene.js';
import { lookQuality } from '../src/deep/look-quality.js';
import { sampleZone } from './fixtures/deep-sample-zone.js';

const query = new URLSearchParams(location.search);
const qualityName = query.get('quality') === 'performance' ? 'performance' : 'high';
const profile = lookQuality(qualityName);
const WIDTH = 1280, HEIGHT = 720;
if (query.get('clean')) document.body.classList.add('clean');

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
let composer = null;
if (profile.pipeline === 'composite') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.22, 0.6, 1.5));
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass(WIDTH, HEIGHT));
  composer.setPixelRatio(renderer.getPixelRatio());
}

const built = performance.now();
const zone = sampleZone();
// ?life=1: the Kelp Coast's creatures along the sample loop (DEEP-LIFE pictures). The sample loop
// is not the Kelp Coast, so the spots sit where its shallows, forest and deep lip are.
if (query.get('life')) {
  zone.spots = [
    { creature: 'crab', trailIndex: 5, count: 4 }, { creature: 'ray', trailIndex: 9, count: 1 },
    { creature: 'turtle', trailIndex: 13, count: 2 }, { creature: 'silver-school', trailIndex: 40, count: 3 },
    { creature: 'sea-lion', trailIndex: 62, count: 2 }, { creature: 'otter', trailIndex: 80, count: 1 },
    { creature: 'whale', trailIndex: 118, count: 1 },
  ];
}
const deep = createUnderwaterScene({ zone, quality: qualityName, renderer, scene });
const buildMs = performance.now() - built;
const { shape } = deep;

const car = createClassicVehicle({ key: 'falcone_f42' });
car.name = 'Falcone F42 (scale and light reference)';
scene.add(car);
deep.attachCar(car);

// The car on the trail at a share of the way round, facing along it.
const carState = { x: 0, y: 0, z: 0, heading: 0, speed: 0 };
function placeCar(share, lateral = 0) {
  const along = share * shape.length, f = shape.frameAt(along), p = shape.pointAt(along, lateral);
  const heading = Math.atan2(f.tx, f.tz), y = shape.floorHeight(p.x, p.z) - 0.05;
  car.position.set(p.x, y, p.z);
  car.rotation.set(0, heading, 0, 'YXZ');
  car.updateMatrixWorld(true);
  Object.assign(carState, { x: p.x, y: y + 0.7, z: p.z, heading, speed: 0 });
  return { along, f, p, y };
}
// A point relative to the car: forward, left and up in metres.
const rel = (at, forward, left, up) => [at.p.x + at.f.tx * forward + at.f.tz * left, at.y + up, at.p.z + at.f.tz * forward - at.f.tx * left];

// The car anywhere, facing a heading, for tools that frame their own pictures.
function placeCarAt(x, z, heading = 0) {
  const y = shape.floorHeight(x, z) - 0.05;
  car.position.set(x, y, z);
  car.rotation.set(0, heading, 0, 'YXZ');
  car.updateMatrixWorld(true);
  Object.assign(carState, { x, y: y + 0.7, z, heading, speed: 0 });
  return carState;
}

const VIEWS = [
  { name: 'Ramp shallows, seagrass in sun', share: 0.03, time: 3.2, fov: 62,
    camera: at => rel(at, -9, 5, 2.2), target: at => rel(at, 4, 0, 1.2) },
  { name: 'Into the kelp forest', share: 0.19, time: 9.5, fov: 60,
    camera: at => rel(at, -11, -6, 2.6), target: at => rel(at, 6, 1, 2.4) },
  { name: 'Low chase in the forest', share: 0.31, time: 11.0, fov: 55,
    camera: at => rel(at, -8.7, 0, 3.65), target: at => rel(at, 26, 0, 1.6) },
  { name: 'Up through the canopy', share: 0.36, time: 14.0, fov: 70,
    camera: at => rel(at, -3, 7, 1.0), target: at => rel(at, 6, 9, 16) },
  { name: 'The deep lip, headlights', share: 0.63, time: 6.0, fov: 60,
    camera: at => rel(at, 7, 6, 1.6), target: at => rel(at, -1, 0, 0.8) },
  { name: 'Across the channel', share: 0.86, time: 8.0, fov: 64,
    camera: at => rel(at, -16, 24, 3.2), target: at => rel(at, 12, -8, 0.8) },
];

let current = null;
function setView(index, options = {}) {
  const view = VIEWS[index - 1];
  if (!view) throw new Error(`No view ${index}`);
  const at = placeCar(view.share);
  const [cx, cy, cz] = view.camera(at), [tx, ty, tz] = view.target(at);
  camera.position.set(cx, Math.min(cy, -0.6), cz);
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(tx, ty, tz);
  current = { index, view, time: options.time ?? view.time };
  return view;
}

const readout = document.getElementById('readout');
function renderFrame(seconds) {
  renderer.info.autoReset = false;
  renderer.info.reset();
  deep.update({ car: carState, camera, seconds });
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (!query.get('clean')) {
    readout.textContent = `${current ? `${current.index}. ${current.view.name}` : ''}  ${qualityName}  zone ${zone.id}\n` +
      `depth ${Math.max(0, -camera.position.y).toFixed(1)} m   tiles ${deep.builtTiles}/${deep.counts.floorTiles}   draws ${renderer.info.render.calls}   tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k`;
  }
}

function info() {
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return { quality: qualityName, pipeline: profile.pipeline, zone: zone.id, zoneLength: Math.round(shape.length),
    buildMs: Math.round(buildMs), ...deep.counts, builtTiles: deep.builtTiles,
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown' };
}

window.__deepLook = {
  views: VIEWS.map(v => v.name),
  info,
  // Place the view and draw it n times at its fixed time; tiles build as frames pass.
  showView(index, { frames = 3, time } = {}) {
    setView(index, { time });
    const t = current.time;
    for (let i = 0; i < Math.max(frames, 20); i++) renderFrame(t + i / 60);
    return current.view.name;
  },
  debug: { scene, camera, renderer, deep, car, carState, placeCarAt, renderFrame: seconds => renderFrame(seconds), setView },
};

setView(Number(query.get('view')) || 1, { time: query.get('time') ? Number(query.get('time')) : undefined });
if (!query.get('still')) {
  const t0 = performance.now();
  const loop = () => { if (!window.__deepLook.paused) renderFrame(current.time + (performance.now() - t0) / 1000); requestAnimationFrame(loop); };
  if (!query.get('manual')) requestAnimationFrame(loop);
}
window.__deepLook.ready = true;
