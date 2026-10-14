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
import {compareFrameCosts} from './panorama-frame-cost.mjs';
import {PIT} from '../src/pit-lane.js';

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
test('Panorama uses its drawn kit divider once, with only the existing pit openings', () => {
  const pits = PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id === 'pit-wall');
  const solids = course.features.kitSolids.filter(box => box.id.endsWith('-pit-wall'));
  const lane = course.pitLane;
  assert.equal(PANORAMA_RIDGE.pitLane.kitDivider, true);
  assert.ok(pits.length > 0 && pits.every(piece => piece.solid === true));
  assert.equal(solids.length, pits.length);
  assert.ok(solids.every(box => course.features.obstacles.includes(box)));
  assert.ok(solids.every(box => [...course.obstacleBuckets.values()].some(bucket => bucket.includes(box))),
    'actual pit kit boxes participate in native collision queries');
  assert.equal(course.features.walls.filter(wall => wall.pitWall).length, 0);
  assert.equal(course.features.obstacles.filter(wall => wall.pitWall).length, 0);
  assert.ok(pits[0].s - 2 >= lane.entry + PIT.taper);
  assert.ok(pits.at(-1).s + 2 <= lane.exit - PIT.taper);
  for (let i = 1; i < pits.length; i++) near(pits[i].s - pits[i - 1].s, 4);
  const legacy = new Course({...PANORAMA_RIDGE,
    pitLane: {...PANORAMA_RIDGE.pitLane, kitDivider: false},
    kitPlacements: PANORAMA_RIDGE.kitPlacements.map(piece => ({...piece, solid: false}))}, 1989);
  assert.deepEqual(course.features.trees, legacy.features.trees, 'divider replacement keeps seeded trees exact');
  assert.deepEqual(pits.map(piece => piece.s), legacy.features.walls.filter(wall => wall.pitWall).map(wall => wall.s));
  assert.ok(course.features.walls.length > 0, 'all ridge script walls remain');
});

// Native retry 12 October: a car bumped wide at Hell Gate ran onto open grass and
// rejoined behind the open start of the Mountain Straight right wall (s 539),
// where it could never reach the road again.
const hellGate = course.script.pieces.find(piece => piece.name === 'Hell Gate');
const hellWall = PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id === 'concrete-wall');
test('a solid concrete wall closes the outside of Hell Gate up to the Mountain Straight wall', () => {
  const outer = -hellGate.dir, boxes = course.features.kitSolids.filter(box => box.id.endsWith('-concrete-wall'));
  assert.ok(hellWall.length > 0 && hellWall.every(piece => piece.solid === true && Math.sign(piece.lateral) === outer));
  assert.equal(boxes.length, hellWall.length);
  assert.ok(boxes.every(box => box.barrier && course.features.obstacles.includes(box)));
  const firstWall = course.features.walls.filter(wall => wall.side === outer && wall.trackWall && !wall.pitWall)
    .reduce((best, wall) => wall.s < best.s ? wall : best);
  near(firstWall.s - firstWall.halfZ, hellGate.s1, .2);
  for (const piece of hellWall)
    near(Math.abs(piece.lateral) - .36, Math.abs(firstWall.off) - firstWall.halfX, 1e-9);
  assert.ok(hellWall[0].s <= hellGate.s0 && hellWall[0].s - 2 > course.pitLane.exit, 'starts after the pit lane has merged');
  assert.ok(hellWall.at(-1).s + 2 >= firstWall.s - firstWall.halfZ, 'reaches the first Mountain Straight wall box');
  for (let i = 1; i < boxes.length; i++)
    assert.ok(Math.hypot(boxes[i].x - boxes[i - 1].x, boxes[i].z - boxes[i - 1].z) < boxes[i].halfX * 2,
      'adjacent 4 m pieces overlap around the outer arc');
  const without = new Course({...PANORAMA_RIDGE, kitPlacements: PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id !== 'concrete-wall')}, 1989);
  assert.deepEqual(course.features.trees, without.features.trees, 'seeded trees stay exact');
  assert.deepEqual(course.features.rocks, without.features.rocks, 'seeded rocks stay exact');
  assert.deepEqual(course.features.walls, without.features.walls, 'script walls stay exact');
});
// Placed on the road three metres in from the outer edge, aimed 0.3 rad outward with the foot down.
function slideWide(def, share, mph) {
  COURSE.push(def);
  try {
    const d = new Duel({seed: 1989, featureFlags: {'grand-prix': true}});
    d.startCampaign({mode: 'grandprix', startStage: COURSE.length - 1,
      car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium'});
    for (let frames = 0; d.state.status !== 'racing' && frames < 2000; frames++) d.step(1 / 60);
    assert.equal(d.state.status, 'racing');
    const state = d.state, outer = -hellGate.dir, s = hellGate.s0 + (hellGate.s1 - hellGate.s0) * share;
    Object.assign(state, {s, lateral: outer * (d.course.roadHalfWidthAt(s) - 3), headingError: outer * .3, speedMph: mph,
      airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0});
    state.prevS = state.s; state.prevLateral = state.lateral;
    d._terrainPose();
    let farthest = -Infinity;
    for (let frame = 0; frame < 240; frame++) {
      d.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
      d.step(1 / 60);
      farthest = Math.max(farthest, outer * state.lateral - d.course.roadHalfWidthAt(state.s));
      if (state.impactTimer > 0) break;
    }
    return farthest;
  } finally {COURSE.pop();}
}
test('a car sliding wide at Hell Gate stops against the wall instead of leaving the road', () => {
  const open = {...PANORAMA_RIDGE, kitPlacements: PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id !== 'concrete-wall')};
  for (const share of [.2, .5]) for (const mph of [40, 70]) {
    const walled = slideWide(PANORAMA_RIDGE, share, mph), before = slideWide(open, share, mph);
    assert.ok(before > TRACK_SCRIPT.wallSetback + 5, `old open run-off: ${before.toFixed(1)} m past the edge`);
    // The face stands one metre out; the car's own half width keeps its centre on the road.
    assert.ok(walled > -1.5 && walled <= 0, `share ${share}, ${mph} mph: centre ${walled.toFixed(2)} m past the edge`);
  }
});

test('approved full-kit frame policy keeps absolute boundaries and sample guards', () => {
  const row = {look: 'final-dusk', scales: [1], ratios: [1], gpuSupported: true,
    pacing: {cpu: {samples: 360, p95: 18.5}, gpu: {samples: 300, p95: 18.5},
      delivered: {samples: 359, p95: 18.5}}, update: {samples: 360, p95: 18.5},
    combined: {samples: 360, p95: 18.5}, witness: {constructionMs: 999.999}};
  assert.equal(compareFrameCosts(row).passed, true,
    '18.5 ms and strict sub1000 construction meet absolute policy');
  row.pacing.delivered.p95 = 18.500001;
  assert.equal(compareFrameCosts(row).passed, false, 'final dusk requires18.5ms');
  row.pacing.delivered.p95 = 18.5;
  row.witness.constructionMs = 1000;
  assert.equal(compareFrameCosts(row).passed, false, 'construction is strictly under1s');
  for (const invalid of [undefined, null, NaN, Infinity, -1]) {
    row.witness.constructionMs = invalid;
    assert.throws(() => compareFrameCosts(row), /construction timing missing/);
  }
  row.witness.constructionMs = 0;
  assert.equal(compareFrameCosts(row).passed, true, 'zero construction remains valid');
  row.witness.constructionMs = 999.999;
  row.pacing.cpu.samples = 359;
  assert.throws(() => compareFrameCosts(row), /Incomplete full-view cpu samples/);
  row.pacing.cpu.samples = 360; row.pacing.gpu.samples = 287;
  assert.throws(() => compareFrameCosts(row), /Incomplete full-view GPU samples/);
  row.pacing.gpu.samples = 300; row.combined.p95 = 0;
  assert.throws(() => compareFrameCosts(row), /Incomplete full-view combined samples/);
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
  assert.equal(landmarks.children.length, 4);
  // PANORAMA-TOWN: the valley town is a few instanced meshes of real houses, not kit shopfronts.
  const town = landmarks.getObjectByName('valley-town');
  assert.equal(town.getObjectByName('town houses').count, PANORAMA_RIDGE.circuitLandmarks.find(l => l.type === 'town').houses.length);
  assert.ok(town.getObjectByName('town houses').count >= 50 && town.children.length <= 12);
  assert.ok(town.getObjectByName('town lit windows').count > town.getObjectByName('town dark windows').count);
  assert.equal(PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id.startsWith('shopfront')).length, 0);
  // No two houses share ground (footprint with veranda and eaves), and no lamp stands in a house or the church.
  const spec = PANORAMA_RIDGE.circuitLandmarks.find(l => l.type === 'town'), churchSpec = PANORAMA_RIDGE.circuitLandmarks.find(l => l.type === 'church');
  const boxes = spec.houses.map(h => ({s: h.s, lateral: h.lateral, along: h.width / 2 + .5, across: (h.depth + 2.3) / 2 + .4}));
  boxes.push({s: churchSpec.s, lateral: churchSpec.lateral, along: 10, across: 5.5});
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(Math.abs(a.s - b.s) >= a.along + b.along || Math.abs(a.lateral - b.lateral) >= a.across + b.across, `town footprints ${i} and ${j} overlap`);
  }
  for (const lamp of spec.lamps) for (const box of boxes)
    assert.ok(Math.abs(lamp.s - box.s) >= box.along || Math.abs(lamp.lateral - box.lateral) >= box.across, 'a street lamp stands inside a building');
  // PANORAMA-TOWN: the valley town's church stands on terrain with windows the dusk lighting can find.
  const church = landmarks.getObjectByName('town-church'); church.updateWorldMatrix(true, true);
  const steeple = new THREE.Box3().setFromObject(church);
  assert.ok(steeple.max.y - steeple.min.y > 20);
  let windows = 0; church.traverse(mesh => {if (mesh.material?.name === 'church window') windows++;});
  assert.ok(windows >= 8);
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
  const town = PANORAMA_RIDGE.circuitLandmarks.find(l => l.type === 'town');
  const onRoad = new Course({...PANORAMA_RIDGE, circuitLandmarks: [{...town, houses: [...town.houses, {...town.houses[0], lateral: 2}]}]}, 1989);
  assert.throws(() => addCircuitLandmarks(new THREE.Group(), onRoad), /town hides the road/);
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
    const straight = d.course.script.pieces.find(piece => piece.name === 'Pit Straight');
    const hell = d.course.script.pieces.find(piece => piece.name === 'Hell Gate');
    const grid = [d.state, ...d.state.opponents];
    near(Math.min(...grid.map(racer => racer.s)), -77);
    assert.ok(grid.every(racer => racer.s - 2.5 >= straight.s0 && racer.s + 2.5 < straight.s1));
    for (const racer of grid) for (const body of [-2.5, 2.5]) {
      const phase = d.course.phase(racer.s + body);
      assert.ok(phase < d.course.pitLane.entry || phase > d.course.pitLane.exit,
        'the whole native grid stays clear of both pit openings');
    }
    for (let at = straight.s1 - 150; at < hell.s1; at += 5) near(d.course.roadHalfWidthAt(at), 7.5);
    assert.deepEqual(d.course.def.fieldPace, {easy: .75, medium: .725, hard: .716});
    assert.deepEqual(d.course.def.racingLine, {lineMargin: 2.6, lineSwing: .6, holdRacers: true});
    assert.deepEqual(d.course.def.fieldFollow, {leadBraking: 1.6, wallRoom: 1,
      firstLap: {margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4}});
    for (const key of ['fieldForm', 'fieldSpread', 'fieldAggression'])
      assert.equal(d.course.def[key] ?? 1, 1, key + ' retains standard difficulty tuning');
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
  const group=new THREE.Group(),fence=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:new THREE.Texture()})),other=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({name:'untouched'}));
  fence.userData.trackKitId='catch-fence';group.add(fence,other);const key=other.material.customProgramCacheKey();
  await finishRidgeKitMaterials({ready:Promise.resolve(true),group});const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>'};fence.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/vRidgeFenceHeight/);assert.doesNotMatch(shader.fragmentShader,/#include <map_fragment>/);assert.equal(other.material.name,'untouched');assert.equal(other.material.customProgramCacheKey(),key);disposeTree(group);
});

test('the valley town windows and lamps light at dusk through the native night lighting',async()=>{
  const {createPathNightDetails}=await import('../src/scene-lighting.js');
  const world=new THREE.Group();addCircuitLandmarks(world,course);
  const town=world.getObjectByName('valley-town'),source=town.getObjectByName('town lit windows').material;
  const details=createPathNightDetails({world,course});
  try{details.update({position:new THREE.Vector3(),heading:0,distance:0,high:true,amount:.8,headlights:1});
    const bound=town.getObjectByName('town lit windows').material;
    assert.notEqual(bound,source,'night lighting binds the town windows');assert.ok(bound.emissiveIntensity>0);
    assert.ok(town.getObjectByName('town lamp heads').material.emissiveIntensity>0);
    assert.equal(town.getObjectByName('town dark windows').material.name,'town unlit pane');
  }finally{details.dispose();disposeTree(world);}
});
