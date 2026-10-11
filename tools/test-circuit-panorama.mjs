import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {sampleCourseLightPath, lightPathLook} from '../src/light-path.js';
import {addCircuitLandmarks, scoreboardText} from '../src/circuit-landmarks.js';
import {syncScene} from '../src/scene-systems.js';
import {disposeTree} from '../src/world.js';
import {readFileSync} from 'node:fs';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, a + ' != ' + b);
const course = new Course(PANORAMA_RIDGE, 1989);

test('Sunset remains golden on lap one and reaches dusk for the whole last lap', () => {
  for (const fraction of [0, .1, 1 / 3]) {
    const sample = sampleCourseLightPath(course, {distance: fraction * course.raceLength});
    near(sample.settings.nightAmount, lightPathLook('golden', 'alpine').nightAmount);
  }
  const before = sampleCourseLightPath(course, {distance: course.length * 2 - .001});
  const after = sampleCourseLightPath(course, {distance: course.length * 2 + .001});
  near(before.settings.nightAmount, after.settings.nightAmount, 1e-8);
  for (const fraction of [2 / 3, .9, 1]) near(
    sampleCourseLightPath(course, {distance: fraction * course.raceLength}).settings.nightAmount,
    lightPathLook('dusk', 'alpine').nightAmount);
  const menu = sampleCourseLightPath(course, {distance: course.raceLength, menu: true});
  near(menu.settings.nightAmount, 0);
});
test('approved kit ids, physical start line and garages clear the real pit lane', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/models/circuits/kits/manifest.json', import.meta.url)));
  const sizes = new Map(manifest.pieces.map(piece => [piece.id, piece.size]));
  assert.equal(PANORAMA_RIDGE.id, 'panorama-ridge'); assert.equal(PANORAMA_RIDGE.laps, 3);
  const gantry = PANORAMA_RIDGE.kitPlacements.filter(p => p.id === 'start-gantry');
  assert.equal(gantry.length, 1); assert.equal(gantry[0].s, 0); assert.equal(gantry[0].lateral, 0);
  assert.ok(sizes.get('start-gantry')[0] * gantry[0].scale[0] > 18);
  assert.ok(course.pitLane); assert.equal(course.pitLane.straight, 'Pit Straight');
  for (const placement of PANORAMA_RIDGE.kitPlacements) {
    assert.ok(sizes.has(placement.id)); assert.ok(Object.isFrozen(placement));
    assert.ok(placement.s >= 0 && placement.s < course.length);
    if (placement.id === 'pit-wall') {
      const lane = course.pitLane, centre = Math.abs(lane.offsetAt(placement.s));
      const inner = centre - lane.width / 2;
      assert.ok(Math.abs(placement.lateral) + sizes.get('pit-wall')[2] / 2 < inner,
        'wall stays outside the lane, including tapers');
    }
  }
});
test('real lattice mast and timing tower stand on terrain outside the road', () => {
  const world = new THREE.Group(), landmarks = addCircuitLandmarks(world, course);
  assert.equal(landmarks.children.length, 2);
  const mast = landmarks.getObjectByName('ridge-radio');
  assert.ok(mast.getObjectByName('radio lattice and aerials').count > 70);
  assert.equal(mast.getObjectByName('radio mast guy wires').count, 4);
  mast.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(mast);
  assert.ok(bounds.max.y - bounds.min.y > 28);
  const state = Object.freeze({opponents: Object.freeze(Array(7).fill({})),
    field: Object.freeze({order: Object.freeze([Object.freeze({position: 1, you: true}), Object.freeze({position: 2, name: 'Mara Vale'})])})});
  const before = JSON.stringify(state); syncScene(world, state, 1 / 60);
  assert.equal(JSON.stringify(state), before);
  assert.match(scoreboardText(state, 'PANORAMA'), /1  YOU\n2  MARA VALE/);
  let releases = 0; const resources = new Set();
  world.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  for (const resource of resources) resource.addEventListener('dispose', () => releases++);
  disposeTree(world); assert.equal(releases, resources.size);
});
test('landmark metadata cannot put structures on the road or silently substitute unknown types', () => {
  for (const patch of [{lateral: 0}, {type: 'hut'}, {height: NaN}, {s: -1}]) {
    const bad = new Course({...PANORAMA_RIDGE, circuitLandmarks: [{...PANORAMA_RIDGE.circuitLandmarks[0], ...patch}]}, 1989);
    assert.throws(() => addCircuitLandmarks(new THREE.Group(), bad), /landmark|road/);
  }
});

test('every Panorama placement loads both approved GLBs on actual terrain and clears the road', async () => {
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const {createTrackKits}=await import('../src/track-kits.js');
  const parser=new GLTFLoader();
  parser.register(()=>({name:'PANORAMA_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const owner=createTrackKits(course,{loadAsset:async path=>{
    const bytes=readFileSync(new URL('../public'+path,import.meta.url));
    return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  }});
  try {
    assert.equal(await owner.ready,true,owner.error?.message);
    assert.equal(owner.placements.length,PANORAMA_RIDGE.kitPlacements.length);
    assert.ok(owner.group.children.length>0);
  } finally {owner.dispose();}
});

test('Panorama starts a genuine native three-lap eight-car Grand Prix', () => {
  const added = !COURSE.some(def => def.id === PANORAMA_RIDGE.id);
  if (added) COURSE.push(PANORAMA_RIDGE);
  try {
    const d = new Duel({seed: 1989, featureFlags: {'grand-prix': true}});
    d.startCampaign({mode: 'grandprix', startStage: COURSE.findIndex(def => def.id === PANORAMA_RIDGE.id),
      car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium'});
    assert.equal(d.state.mode, 'grandprix');
    assert.equal(d.state.opponents.length, 7);
    assert.equal(d.state.lapsTotal, 3);
    assert.equal(d.state.traffic.length, 0);
    assert.equal(d.course.features.radarTraps.length, 0);
    assert.ok(d.state.field);
    assert.equal(d.course.def.id, PANORAMA_RIDGE.id);
    assert.equal(d.course.def.script, PANORAMA_RIDGE.script);
    assert.equal(d.course.def.kitPlacements, PANORAMA_RIDGE.kitPlacements);
    assert.equal(d.course.def.grandPrix, true);
  } finally {if (added) COURSE.splice(COURSE.findIndex(def => def.id === PANORAMA_RIDGE.id), 1);}
});
