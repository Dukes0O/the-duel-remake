import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {Course} from '../src/course.js';
import {buildTrackScript, TRACK_SCRIPT} from '../src/track-script.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {sampleCourseLightPath, lightPathLook} from '../src/light-path.js';
import {addCircuitLandmarks, scoreboardText} from '../src/circuit-landmarks.js';
import {syncScene} from '../src/scene-systems.js';
import {disposeTree} from '../src/world.js';
import {readFileSync} from 'node:fs';
import {compareFrameCosts} from './scenarios/p4-panorama-frames.mjs';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, a + ' != ' + b);
const course = new Course(PANORAMA_RIDGE, 1989);

test('approved 13 m ridge keeps the original centreline and other width targets', () => {
  const originalScript = PANORAMA_RIDGE.script.map(entry => {
    const options = entry.at(-1);
    return options.name === 'The Cutting'
      ? [...entry.slice(0, -1), {...options, width: 11}] : entry;
  });
  const originalRoad = buildTrackScript({...PANORAMA_RIDGE, script: originalScript});
  const road = course.script, cutting = road.pieces.find(piece => piece.name === 'The Cutting');
  const elbow = road.pieces.find(piece => piece.name === 'Forrest Elbow');
  const conrod = road.pieces.find(piece => piece.name === 'Conrod Straight');
  assert.ok(cutting.index < elbow.index && elbow.index < conrod.index);
  for (const piece of road.pieces) {
    const onRidge = piece.index >= cutting.index && piece.index <= elbow.index;
    assert.equal(piece.width, onRidge ? 13 : originalRoad.pieces[piece.index].width,
      piece.name + ' resolved width');
    if (onRidge) near(road.halfWidthAt(piece.s0 + (piece.s1 - piece.s0) * .9), 6.5);
  }
  assert.equal(conrod.width, 16);
  const entryWidth = road.halfWidthAt(cutting.s0 + 20);
  assert.ok(entryWidth > 6.5 && entryWidth < 7.5, 'original approach blends into 13 m ridge');
  const exitWidth = road.halfWidthAt(conrod.s0 + 20);
  assert.ok(exitWidth > 6.5 && exitWidth < 8, 'ridge blends into original 16 m Conrod');
  for (let s = 0; s < road.length; s += 11) {
    if (s < cutting.s0 - road.step || s > conrod.s0 + TRACK_SCRIPT.blendLength + road.step)
      near(road.halfWidthAt(s), originalRoad.halfWidthAt(s));
  }
  assert.deepEqual(road.samples, originalRoad.samples, 'entire original centreline/height/heading stays exact');
  for (const fence of PANORAMA_RIDGE.kitPlacements.filter(entry => entry.id === 'catch-fence'))
    near(Math.abs(fence.lateral), road.halfWidthAt(fence.s) + 1.8);
});
test('approved full-kit frame policy keeps absolute boundaries and sample guards', () => {
  const row = (look, ms) => ({look, scales: [1], ratios: [1], gpuSupported: true,
    pacing: {cpu: {samples: 360, p95: ms}, gpu: {samples: 300, p95: ms},
      delivered: {samples: 359, p95: ms}}, update: {samples: 360, p95: ms},
    combined: {samples: 360, p95: ms}, witness: {constructionMs: 999.999}});
  const off = row('off', 10), on = row('on', 18.5);
  let result = compareFrameCosts(off, on);
  assert.equal(result.passed, true, '18.5 ms and strict sub1000 construction meet absolute policy');
  assert.ok(Object.values(result.costs).every(cost => cost.informational && !cost.passed),
    'every failed relative diagnostic stays reported');
  for (const leg of [off, on]) {
    const delivered = leg.pacing.delivered.p95;
    leg.pacing.delivered.p95 = 18.500001;
    assert.equal(compareFrameCosts(off, on).passed, false, 'both day/dusk require18.5ms');
    leg.pacing.delivered.p95 = delivered;
    leg.witness.constructionMs = 1000;
    assert.equal(compareFrameCosts(off, on).passed, false, 'construction is strictly under1s');
    for (const invalid of [undefined, null, NaN, Infinity, -1]) {
      leg.witness.constructionMs = invalid;
      assert.throws(() => compareFrameCosts(off, on), /construction timing missing/);
    }
    leg.witness.constructionMs = 0;
    assert.equal(compareFrameCosts(off, on).passed, true, 'zero construction remains valid');
    leg.witness.constructionMs = 999.999;
  }
  on.pacing.cpu.samples = 359;
  assert.throws(() => compareFrameCosts(off, on), /Incomplete full-view cpu samples/);
  on.pacing.cpu.samples = 360; on.pacing.gpu.samples = 287;
  assert.throws(() => compareFrameCosts(off, on), /Incomplete full-view GPU samples/);
  on.pacing.gpu.samples = 300; off.combined.p95 = 0;
  assert.throws(() => compareFrameCosts(off, on), /Incomplete full-view combined samples/);
});
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

test("authored mountain cut and ridge fall away while the road stays exact", () => {
  const legacy = new Course({...PANORAMA_RIDGE, ridgeLandform: undefined}, 1989);
  const middle = name => {const p=course.script.pieces.find(p=>p.name===name);return (p.s0+p.s1)/2;};
  for(let distance=0;distance<course.length;distance+=11) {
    assert.deepEqual(course.worldAt(distance),legacy.worldAt(distance));
    assert.equal(course.roadHalfWidthAt(distance),legacy.roadHalfWidthAt(distance));
    for(const off of [-course.roadHalfWidthAt(distance),0,course.roadHalfWidthAt(distance)])
      assert.deepEqual(course.groundAt(distance,off),legacy.groundAt(distance,off));
  }
  const climb=middle("Mountain Straight"),hill=course.groundAt(climb,-64),valley=course.groundAt(climb,64);
  assert.ok(hill.y-course.worldAt(climb).y>25,"hillside bank rises beside climb");
  assert.ok(valley.y<course.worldAt(climb).y-10,"opposite side falls to valley");
  for(const name of ["Ridge Top","Skyline","The Esses 1"]) {
    const at=middle(name),top=course.worldAt(at).y;
    for(const side of [-1,1]) assert.ok(course.groundAt(at,side*64).y<top-35,name+" steep ridge drop");
  }
});
test("Panorama warm sunlight and readable violet dusk have their own palette",()=>{
  const defaultCourse={...course,def:{...course.def,lightPath:{...course.def.lightPath,palette:undefined}}};
  const golden=sampleCourseLightPath(course,{distance:0}).settings;
  assert.ok(golden.sunOffset.y<sampleCourseLightPath(defaultCourse,{distance:0}).settings.sunOffset.y);
  const dusk=sampleCourseLightPath(course,{distance:course.raceLength}).settings;
  assert.ok(dusk.hemi>lightPathLook("dusk","alpine").hemi);
  assert.ok(dusk.env>lightPathLook("dusk","alpine").env);
  near(dusk.nightAmount,.55);
  assert.deepEqual(sampleCourseLightPath(defaultCourse,{distance:course.raceLength}).settings,lightPathLook("dusk","alpine"));
});

test('every native mountain tree root uses the actual upper drawn triangles', async()=>{
  const {addPineTrees}=await import('../src/vegetation.js');
  const {renderedGroundHeight}=await import('../src/rendered-ground.js');
  const load=THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
  const group=new THREE.Group();
  try {
    addPineTrees(group,course.features.trees,course);
    const matrix=new THREE.Matrix4();let roots=0;
    for(const mesh of group.children.filter(m=>m.name.startsWith('Pine trunks'))) {
      const entries=mesh.userData.vegetationCell.entries;
      entries.forEach(({feature},index)=>{
        mesh.getMatrixAt(index,matrix);
        const ground=renderedGroundHeight(course,feature,{requireSurface:true});
        assert.ok(Number.isFinite(ground));near(matrix.elements[13],ground-.24,2e-4);roots++;
      });
    }
    assert.equal(roots,course.features.trees.length);assert.ok(roots>400);
  }finally{THREE.TextureLoader.prototype.load=load;disposeTree(group);}
});

test('mountain chase and snapshot camera floor follows actual terrain; dry cameras stay exact',async()=>{
  const {constrainMountainCamera}=await import('../src/render3d.js');
  const {renderedGroundHeight}=await import('../src/rendered-ground.js');
  const ridge=course.script.pieces.find(p=>p.name==='Ridge Top');
  const pose=course.worldAt(ridge.s0,-16),nearest=course.nearest(pose.x,pose.z);
  const ground=renderedGroundHeight(course,{...pose,s:nearest.s,off:nearest.lateral},{requireSurface:true});
  const camera=new THREE.Vector3(pose.x,ground-10,pose.z);
  assert.equal(constrainMountainCamera(course,camera,ridge.s0),camera);nearEqual(camera.y,ground+.7);
  const dry={...course,def:{...course.def,ridgeLandform:undefined}},below=camera.clone().setY(-500),before=below.clone();
  constrainMountainCamera(dry,below,ridge.s0);assert.deepEqual(below,before);
  function nearEqual(a,b){near(a,b,1e-6);}
});

test('mountain terrain closes the final fractional strip and grounds all seeded landscape',async()=>{
  const {terrainGeometry}=await import('../src/world-surfaces.js');
  const {renderedGroundHeight}=await import('../src/rendered-ground.js');
  const {addLandscapeDetail}=await import('../src/landscape-detail.js');
  const s=4840.939449867449,off=28.7352222324349,p=course.groundAt(s,off);
  const geometry=terrainGeometry(course),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(p.x,10000,p.z),new THREE.Vector3(0,-1,0));
  try {
    const hits=ray.intersectObject(mesh);assert.ok(hits.length,'actual final fractional terrain strip is drawn');
    near(renderedGroundHeight(course,{...p,s,off},{requireSurface:true}),hits[0].point.y,2e-5);
  }finally{geometry.dispose();material.dispose();}
  const group=new THREE.Group(),load=THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
  try{assert.doesNotThrow(()=>addLandscapeDetail(group,course,true));assert.ok(group.children.length>0);}
  finally{THREE.TextureLoader.prototype.load=load;disposeTree(group);}
});

// Final-round geometry/material controls, settled in Claude check-in7.
test('Panorama rounds existing ridge geometry, removes snow and keeps defaults exact',async()=>{
  const {buildMountainGeometry,createMountainMaterial}=await import('../src/mountain-landscape.js');
  const a=buildMountainGeometry(0),b=buildMountainGeometry(0,{ridgeOutcrops:true});
  try{const p=a.attributes.position,q=b.attributes.position;assert.equal(p.count,q.count);assert.deepEqual(a.index.array,b.index.array);
    for(let i=0;i<p.count;i++){near(q.getX(i),p.getX(i));near(q.getZ(i),p.getZ(i));near(q.getY(i),Math.sin(p.getY(i)*Math.PI/2),1e-6);}
    const dry=createMountainMaterial('alpine',new THREE.Texture()),ridge=createMountainMaterial('alpine',new THREE.Texture(),{ridgeOutcrops:true});
    for(const [m,expected]of [[dry,1],[ridge,0]]){const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <normal_fragment_maps>'};m.onBeforeCompile(shader);assert.equal(shader.uniforms.mountainSnow.value,expected);m.dispose();}
    assert.equal(dry.customProgramCacheKey(),'connected-mountain-v2-alpine');assert.notEqual(ridge.customProgramCacheKey(),dry.customProgramCacheKey());
  }finally{a.dispose();b.dispose();}
});
test('Panorama finish uses actual owner materials and leaves non-fence/default resources exact',async()=>{
  const {finishRidgeKitMaterials}=await import('../src/circuit-landmarks.js');assert.equal(typeof finishRidgeKitMaterials,'function');
  const group=new THREE.Group(),fence=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:new THREE.Texture()})),pane=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({name:'round-two-harbour-warm-amber-pane'})),other=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({name:'untouched'}));
  fence.userData.trackKitId='catch-fence';pane.userData.trackKitId='shopfront-a';group.add(fence,pane,other);const key=other.material.customProgramCacheKey();
  await finishRidgeKitMaterials({ready:Promise.resolve(true),group});const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>'};fence.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/vRidgeFenceHeight/);assert.doesNotMatch(shader.fragmentShader,/#include <map_fragment>/);assert.match(pane.material.name,/window/);assert.equal(other.material.name,'untouched');assert.equal(other.material.customProgramCacheKey(),key);disposeTree(group);
});

test('ready Panorama owner finishes windows before synchronous native night discovery',async()=>{
  const {finishRidgeKitMaterials}=await import('../src/circuit-landmarks.js');
  const {createPathNightDetails}=await import('../src/scene-lighting.js');
  const group=new THREE.Group(),source=new THREE.MeshStandardMaterial({name:'round-two-harbour-warm-amber-pane',emissive:0xffffff,emissiveIntensity:1.65}),pane=new THREE.Mesh(new THREE.BoxGeometry(),source);pane.userData.trackKitId='shopfront-a';group.add(pane);
  const finished=finishRidgeKitMaterials({status:'ready',ready:Promise.resolve(true),group});
  const details=createPathNightDetails({world:group,course});
  try{details.update({position:new THREE.Vector3(),heading:0,distance:0,high:true,amount:.55,headlights:1});assert.notEqual(pane.material,source,'native synchronous discovery must bind an already-ready window');assert.ok(pane.material.emissiveIntensity>0&&pane.material.emissiveIntensity<1.65);await finished;}finally{details.dispose();disposeTree(group);}
});
