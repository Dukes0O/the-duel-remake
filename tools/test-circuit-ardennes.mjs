import assert from 'node:assert/strict';
import test from 'node:test';
import {ARDENNES_FOREST, manifest} from '../src/circuits/ardennes-forest.js';
import {CIRCUIT_ENTRIES, CIRCUIT_MANIFESTS, BASE_COURSE_COUNT} from '../src/circuit-manifests.js';
import {ALL_CIRCUITS, CIRCUITS, circuitsEnabled} from '../src/circuits/index.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES} from '../src/course-access.js';
import {COURSE} from '../src/config.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import * as THREE from 'three';
import {sampleCourseLightPath, lightPathLook} from '../src/light-path.js';
import {addCircuitEffects} from '../src/circuit-effects.js';
import {syncScene} from '../src/scene-systems.js';
import {disposeTree} from '../src/world.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {terrainGeometry, farTerrainGeometry} from '../src/world-surfaces.js';
import {createTrackKits} from '../src/track-kits.js';
import {addCircuitLandmarks} from '../src/circuit-landmarks.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mkdtempSync, readFileSync, readdirSync, rmdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ardennesPlayerCrashAccepted} from './scenarios/ardennes-views.mjs';
import {createPavedRoadMaterial, bindPavedDampRoad} from '../src/road-surface.js';

// Ardennes Forest road layout (docs/CIRCUITS.md section 5.5, P4-ARDENNES-ROAD).
// The original road acceptance remains intact beside the P4-ARDENNES source acceptance.
const near = (a, b, tolerance, message = '') => assert.ok(Math.abs(a - b) <= tolerance, `${message} ${a} differs from ${b}`);
const road = buildTrackScript(ARDENNES_FOREST), report = road.report;
const piece = name => road.pieces.find(item => item.name === name);

test('the fitted script closes, runs 6.6 to 6.8 km and keeps every grade at or under 25%', () => {
  assert.equal(road.pieces.length, 35, 'the 35 pieces of the section 5.5 table');
  assert.ok(road.length > 6600 && road.length < 6800, `length ${road.length.toFixed(1)} m`);
  assert.equal(road.length, ARDENNES_FOREST.lengthU);
  assert.ok(report.closureGap < 2, `gap before closing ${report.closureGap.toFixed(2)} m`);
  for (const change of report.straightChanges) assert.ok(Math.abs(change.percent) <= .1, `piece ${change.index + 1} changes ${change.percent.toFixed(3)}%`);
  near(Math.abs(report.turnSumDeg), 360, 2, 'turns add up to one lap');
  near(report.elevationLeftover, 0, 1e-9, 'climbs add up');
  const first = road.samples[0], last = road.samples.at(-1);
  near(Math.hypot(first.x - last.x, first.z - last.z), 0, 1e-6, 'first and last sample meet');
  assert.ok(report.highestGradePercent <= 25, `steepest ${report.highestGradePercent.toFixed(1)}%`);
  assert.ok(report.highestGradePercent > 22, 'The Wall is the steep one');
  assert.ok(report.highestGradeAt > piece('The Wall').s0 && report.highestGradeAt < piece('Wall Crest').s1, 'the steepest grade is on The Wall');
  assert.ok(road.pieces.filter(item => item.kind === 'turn').every(item => item.radius >= 16), 'tightest radius is 16 m');
});

test('the named corners are all there, in lap order', () => {
  const named = road.pieces.map(item => item.name).filter(Boolean);
  const order = ['Pit Straight', 'La Fontaine', 'The Plunge', 'Red Water', 'The Wall', 'Wall Crest', 'Kestrel Straight',
    'Les Combes', 'Combes Exit', 'Malmedy', 'Riverside', 'Woodland Left', 'Long Left', 'Fagnes', 'Fagnes Exit', 'Campus',
    'Stavelot', 'Forest Run', 'Woodcutter', 'Whitewood', 'Bus Stop', 'Bus Stop 2', 'Bus Stop Exit'];
  assert.deepEqual(named, order);
  const at = order.map(name => piece(name).s0);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], `${order[i]} comes after ${order[i - 1]}`);
  assert.equal(piece('La Fontaine').radius, 16); assert.equal(piece('La Fontaine').dir, -1, 'a right-hander');
  assert.equal(piece('Whitewood').radius, 400); assert.equal(piece('Whitewood').dir, 1, 'a left');
  assert.equal(piece('Wall Crest').crest, 2.5);
  assert.ok(piece('Kestrel Straight').s1 - piece('Kestrel Straight').s0 > 1000, 'the long climb to Les Combes');
  assert.equal(road.startAt, 60); assert.equal(road.pieceAt(0).name, 'Pit Straight');
});

test('widths: 15 m, 16 m on Kestrel Straight, 13 m through the Bus Stop; no full-length walls', () => {
  const widths = Object.fromEntries(road.pieces.map(item => [item.index + 1, item.width]));
  // Table pieces 1 to 7: 15 m, then Kestrel Straight (7) at 16 m; 8 to 30 back at 15 m; 31 to 34 (Bus Stop to its exit) at 13 m; 35 at 15 m.
  for (let n = 1; n <= 35; n++) assert.equal(widths[n], n === 7 ? 16 : n >= 31 && n <= 34 ? 13 : 15, `piece ${n} width`);
  near(road.halfWidthAt(piece('Pit Straight').s0 + 150) * 2, 15, 1e-9);
  const kestrel = piece('Kestrel Straight');
  near(road.halfWidthAt((kestrel.s0 + kestrel.s1) / 2) * 2, 16, 1e-9);
  near(road.halfWidthAt(piece('Malmedy').s0 + 20) * 2, 15, 1e-9, 'back to 15 m well after Les Combes');
  near(road.halfWidthAt(piece('Bus Stop 2').s0 + 20) * 2, 13, 1e-9, 'through the Bus Stop');
  assert.equal(road.walls.length, 0, 'no wall spans');
  assert.ok(road.pieces.every(item => item.walls === 'none'));
  near(road.runoffAt(100, 1), 12, 0); near(road.runoffAt(100, -1), 12, 0);
  // The only wall-shaped boxes are the pit lane's own divider on Pit Straight.
  assert.equal(new Course(ARDENNES_FOREST, 1989).features.walls.filter(wall => !wall.pitWall).length, 0);
});

test('separate stretches of road stay at least 90 m apart, centre to centre', () => {
  const samples = road.samples, length = road.length;
  let closest = Infinity, where = null;
  for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) {
    const along = Math.min(samples[j].s - samples[i].s, length - (samples[j].s - samples[i].s));
    if (along <= 400) continue;
    const gap = Math.hypot(samples[i].x - samples[j].x, samples[i].z - samples[j].z);
    if (gap < closest) { closest = gap; where = [samples[i].s, samples[j].s]; }
  }
  assert.ok(closest >= 90, `closest separate stretches ${closest.toFixed(1)} m apart at s ${where?.map(Math.round)}`);
});

test('the pit lane runs along the right of Pit Straight', () => {
  const course = new Course(ARDENNES_FOREST, 1989);
  assert.deepEqual([ARDENNES_FOREST.pitLane.straight, ARDENNES_FOREST.pitLane.side], ['Pit Straight', 'right']);
  assert.equal(course.pitLane.straight, 'Pit Straight'); assert.equal(course.pitLane.side, -1);
  assert.ok(course.pitLane.exit - course.pitLane.entry > 300);
});

test('Ardennes Forest is a dev circuit: registered after Summit, priced, off by default, and COURSE is unchanged without its switch', () => {
  assert.equal(ARDENNES_FOREST.id, 'ardennes-forest'); assert.equal(ARDENNES_FOREST.flag, 'ardennes-forest');
  assert.equal(ARDENNES_FOREST.name, 'Ardennes Forest'); assert.equal(ARDENNES_FOREST.kind, 'circuit');
  assert.equal(ARDENNES_FOREST.closed, true); assert.equal(ARDENNES_FOREST.laps, 2); assert.equal(ARDENNES_FOREST.layoutVersion, 1);
  assert.equal(ARDENNES_FOREST.noTraffic, true); assert.equal(ARDENNES_FOREST.noCombat, true);
  assert.equal(ARDENNES_FOREST.hasRival, true); assert.equal(ARDENNES_FOREST.hasRadar, false);
  assert.equal(ARDENNES_FOREST.markings, 'circuit'); assert.equal(ARDENNES_FOREST.scriptStart, 60);
  assert.equal(ARDENNES_FOREST.stage, 21, 'generation identity after Summit Run (20)');
  assert.deepEqual(ARDENNES_FOREST.sections.map(row => row.name), ['Pit and Plunge', 'Kestrel and Combes', 'Forest Descent', 'Forest Run']);
  near(ARDENNES_FOREST.sections.reduce((sum, row) => sum + row.share, 0), 1, 1e-9, 'section shares');
  assert.ok(Object.isFrozen(manifest) && Object.isFrozen(manifest.driver));
  assert.deepEqual([manifest.id, manifest.flag, manifest.state, manifest.price, manifest.grandPrix],
    ['ardennes-forest', 'ardennes-forest', 'dev', 2000, true]);
  assert.equal(COURSE_PRICES['ardennes-forest'], 2000);
  assert.equal(FEATURE_STATES['ardennes-forest'], 'dev');
  const entry = CIRCUIT_ENTRIES.find(row => row.manifest.id === 'ardennes-forest');
  assert.equal(entry.definition, ARDENNES_FOREST, 'registry keeps the exact authored definition');
  assert.equal(entry.generationStage, 21);
  const index = CIRCUIT_MANIFESTS.findIndex(row => row.id === 'ardennes-forest');
  assert.equal(index, 5, 'Ardennes keeps its original registered position');
  assert.equal(manifest.releaseOrder, 5);
  assert.equal(CIRCUIT_MANIFESTS[index - 1].id, 'summit-run', 'straight after Summit Run');
  assert.deepEqual([CIRCUIT_MANIFESTS[index + 1].id, CIRCUIT_MANIFESTS[index + 1].releaseOrder],
    ['summit-time-attack', 6], 'the accepted solo child appends after Ardennes');
  assert.ok(CIRCUIT_MANIFESTS.slice(0, index).every(row => row.releaseOrder < manifest.releaseOrder), 'earlier courses keep their places');
  assert.ok(CIRCUIT_MANIFESTS.slice(index + 1).every(row => row.releaseOrder > manifest.releaseOrder), 'later courses append after Ardennes');
  assert.equal(ALL_CIRCUITS[index], ARDENNES_FOREST);
  // Switch off: players and tests see COURSE exactly as before.
  const released = CIRCUIT_MANIFESTS.filter(row => row.state === 'on').map(row => row.id);
  assert.ok(!CIRCUITS.some(circuit => circuit.id === 'ardennes-forest'));
  assert.ok(!COURSE.some(event => event.id === 'ardennes-forest'));
  assert.equal(COURSE.length, BASE_COURSE_COUNT + released.length);
  assert.deepEqual(COURSE.slice(BASE_COURSE_COUNT).map(row => row.id), released, 'COURSE is the base events plus the released circuits only');
  const player = createFeatureFlags({storage: null, qa: false, search: '?flags=ardennes-forest'});
  assert.equal(player.enabled('ardennes-forest'), false, 'a player build ignores the dev switch');
  assert.deepEqual(circuitsEnabled(player).map(circuit => circuit.id), released);
  // Switch on in a QA build: it joins the end of the list after every released course.
  const qa = createFeatureFlags({storage: null, qa: true, search: '?flags=ardennes-forest'});
  assert.equal(qa.enabled('ardennes-forest'), true);
  assert.deepEqual(circuitsEnabled(qa).map(circuit => circuit.id), [...released, 'ardennes-forest']);
});


test('Ardennes admits the genuine eight-car field for two laps without traffic or combat', () => {
  const added = !COURSE.some(def => def.id === ARDENNES_FOREST.id);
  if (added) COURSE.push(ARDENNES_FOREST);
  try {
    const duel = new Duel({seed: 1989, featureFlags: {'grand-prix': true}});
    duel.startCampaign({mode: 'grandprix', startStage: COURSE.findIndex(def => def.id === ARDENNES_FOREST.id),
      car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium'});
    assert.equal(duel.course.def.id, 'ardennes-forest');
    assert.equal(duel.state.mode, 'grandprix');
    assert.equal(duel.state.field.size, 8);
    assert.equal(duel.state.opponents.length, 7);
    assert.equal(duel.state.lapsTotal, 2);
    assert.equal(duel.state.traffic.length, 0);
    assert.equal(duel.course.features.radarTraps.length, 0);
    assert.equal(duel.course.def.noCombat, true);
    assert.equal(duel.state.police.pursuit, null);
  } finally {
    if (added) COURSE.splice(COURSE.findIndex(def => def.id === ARDENNES_FOREST.id), 1);
  }
});

test('the forest and safety kit leave the original run-off and native pit road open', () => {
  const course = new Course(ARDENNES_FOREST, 1989);
  const rows = ARDENNES_FOREST.kitPlacements;
  assert.ok(Object.isFrozen(rows) && rows.every(Object.isFrozen));
  assert.ok(rows.some(row => row.id === 'start-gantry' && row.s === 0));
  assert.ok(rows.filter(row => row.id === 'pit-garage').length >= 12);
  assert.ok(rows.filter(row => row.id === 'grandstand').length >= 6);
  assert.ok(rows.some(row => row.id === 'armco' && row.solid === true));
  assert.ok(rows.filter(row => row.id === 'catch-fence').length > 1000);
  for (const row of rows.filter(row => ['armco', 'catch-fence'].includes(row.id))) {
    assert.ok(Math.abs(row.lateral) >= course.roadHalfWidthAt(row.s) + 12.5, 'safety sits outside the unchanged 12 m run-off');
    if (row.lateral < 0 && row.s <= piece('Pit Straight').s1 + 15)
      assert.fail('no safety piece may close the pit entrance or exit');
  }
  assert.deepEqual(ARDENNES_FOREST.pitLane, {straight: 'Pit Straight', side: 'right'});
  assert.ok(rows.filter(row => row.id === 'pit-wall').every(row => row.solid !== true), 'visual divider retains the original native pit collision');
  assert.ok(course.features.walls.some(wall => wall.pitWall));
  assert.ok(course.features.kitSolids.length > 0);
  assert.ok(course.features.kitSolids.every(box => course.features.obstacles.includes(box)));
  assert.ok(course.features.trees.length > 1000, 'dense existing seeded forest');
  for (const tree of course.features.trees) {
    const nearest = course.nearest(tree.x, tree.z);
    assert.ok(nearest.distance >= course.roadHalfWidthAt(nearest.s) + 12, 'trees stay outside every road run-off');
  }
  assert.deepEqual(new Course(ARDENNES_FOREST, 1989).features.trees, course.features.trees, 'same seed gives the same forest');
});


test('the damp forest road keeps the original asphalt grip and alpine sound biome', () => {
  const course = new Course(ARDENNES_FOREST, 1989);
  assert.deepEqual(ARDENNES_FOREST.wetRoad, {performanceShare: .5});
  const dry = new Course({...ARDENNES_FOREST, wetRoad: undefined}, 1989);
  for (let s = 0; s < course.length; s += 53) {
    assert.equal(course.themeAt(s), 'alpine');
    for (const off of [0, -3, 3, -23, 23])
      assert.equal(course.gripKindAt(s, off), dry.gripKindAt(s, off), 'wet look cannot change the road or run-off grip');
  }
});


test('morning light clears by lap two and reuses the renderer buffer', () => {
  const course = new Course(ARDENNES_FOREST, 1989), output = {};
  const original = structuredClone(lightPathLook('golden', 'alpine'));
  const start = sampleCourseLightPath(course, {distance: 0}, output);
  assert.equal(start, output);
  assert.equal(start.settings.fogNear, 90);
  const settings = start.settings, fog = start.settings.fog;
  const middle = sampleCourseLightPath(course, {distance: course.length / 2}, output);
  assert.equal(middle.settings, settings); assert.equal(middle.settings.fog, fog);
  assert.ok(middle.settings.fogNear > 90 && middle.settings.fogNear < 360);
  const clear = sampleCourseLightPath(course, {distance: course.length}, output);
  assert.equal(clear.settings.fogNear, 360);
  assert.deepEqual(clear.settings, sampleCourseLightPath(course, {distance: course.raceLength}, {}).settings);
  assert.deepEqual(lightPathLook('golden', 'alpine'), original, 'default alpine palette remains exact');
});

test('real grounded valley mist clears from native lap progress without race writes', () => {
  const course = new Course(ARDENNES_FOREST, 1989), world = new THREE.Group();
  const originalLoad = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  try {addCircuitEffects(world, course);} finally {THREE.TextureLoader.prototype.load = originalLoad;}
  const banks = []; world.traverse(node => {if (node.name === 'Ardennes valley mist') banks.push(node);});
  assert.ok(banks.length >= 12);
  const originalPositions = banks.map(bank => bank.position.toArray());
  for (const bank of banks) {
    const anchor = bank.userData.valleyAnchor, at = course.groundAt(anchor.s, anchor.lateral);
    const ground = renderedGroundHeight(course, {...at, s: anchor.s, off: anchor.lateral}, {requireSurface: true});
    near(bank.position.y, ground + anchor.height, 1e-6);
  }
  const state = Object.freeze({status: 'racing', s: 0, completedLaps: 0, lapsTotal: 2});
  const before = JSON.stringify(state); syncScene(world, state, 1 / 60);
  assert.equal(JSON.stringify(state), before);
  assert.ok(banks.every(bank => bank.material.opacity > 0));
  syncScene(world, Object.freeze({...state, completedLaps: 1}), 1 / 144);
  assert.ok(banks.every(bank => bank.material.opacity === 0));
  assert.deepEqual(banks.map(bank => bank.position.toArray()), originalPositions);
  const resources = new Set(), disposed = new Map();
  world.traverse(node => {for (const material of [].concat(node.material || [])) {
    resources.add(material); if (material.map) resources.add(material.map);
  }});
  for (const resource of resources) {disposed.set(resource, 0); resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));}
  disposeTree(world);
  assert.ok([...disposed.values()].every(count => count === 1), 'owned mist resources dispose exactly once');
});

test('the stream uses actual ground and leaves the whole road and shoulder uncovered', () => {
  const course = new Course(ARDENNES_FOREST, 1989), world = new THREE.Group();
  const originalLoad = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  try {addCircuitEffects(world, course);} finally {THREE.TextureLoader.prototype.load = originalLoad;}
  const stream = world.getObjectByName('Ardennes red-brown stream');
  assert.ok(stream?.isMesh);
  const position = stream.geometry.attributes.position;
  const sides = new Set();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), at = course.nearest(x, z);
    sides.add(Math.sign(at.lateral));
    assert.ok(at.distance > course.roadHalfWidthAt(at.s) + 2, 'no ribbon covers either road shoulder');
    const ground = renderedGroundHeight(course, {x, z, s: at.s, off: at.lateral}, {requireSurface: true});
    near(position.getY(i), ground + .04, .002);
  }
  assert.deepEqual([...sides].sort(), [-1, 1]);
  disposeTree(world);
});

test('leaf colour owns its material and leaves an ordinary kit owner unchanged', async () => {
  const source = colour => {
    const group = new THREE.Group(), material = new THREE.MeshStandardMaterial({name: 'autumn-tree-leaves-0', color: colour});
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1).translate(0, 2, 0), material));
    return {scene: group, material};
  };
  const course = new Course(ARDENNES_FOREST, 1989), donor = source(0xb05a14);
  const owner = createTrackKits(course, {placements: [{id: 'autumn-tree', s: 1400, lateral: 60}], loadAsset: async () => donor});
  try {
    assert.equal(await owner.ready, true, owner.error?.message);
    const colours = []; owner.group.traverse(node => {if (node.isMesh) colours.push(node.material.color.getHex());});
    assert.ok(colours.length > 0 && colours.every(colour => colour === ARDENNES_FOREST.kitLook['autumn-tree'].leafColour));
    assert.equal(donor.material.color.getHex(), 0xb05a14, 'source material not recoloured');
    const ordinary = source(0xb05a14), plain = createTrackKits(new Course({...ARDENNES_FOREST, kitLook: undefined}, 1989),
      {placements: [{id: 'autumn-tree', s: 1400, lateral: 60}], loadAsset: async () => ordinary});
    try {assert.equal(await plain.ready, true); assert.equal(ordinary.material.color.getHex(), 0xb05a14);} finally {plain.dispose();}
  } finally {owner.dispose();}
});

// Model exports are required before this source can claim a green lane. Hold
// preparation does not substitute a fake model or relax these real budgets.
test('three original landmarks have actual grounded High and LOD meshes within budget', async () => {
  const provenance = JSON.parse(readFileSync(new URL('../tools/art/ardennes-landmarks.json', import.meta.url), 'utf8'));
  const budgets = {'stone-stream-bridge': [2500, 800], 'forest-footbridge': [3500, 1000], 'forest-timing-tower': [4000, 1200]};
  assert.deepEqual(provenance.models.map(row => row.id).sort(), Object.keys(budgets).sort());
  const loader = new GLTFLoader();
  for (const row of provenance.models) {
    assert.equal(row.original, true); assert.equal(row.recipe, 'tools/blender/ardennes-landmarks.py');
    let bytesTotal = 0;
    for (const [index, suffix] of ['', '-lod'].entries()) {
      const bytes = readFileSync(new URL('../public/assets/models/circuits/kits/' + row.id + suffix + '.glb', import.meta.url));
      bytesTotal += bytes.length;
      assert.equal(bytes.length, row.files[index].bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), row.files[index].sha256, 'actual exported content matches provenance');
      const asset = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      let triangles = 0; asset.scene.updateMatrixWorld(true);
      asset.scene.traverse(node => {if (node.isMesh) {
        const positions = node.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) for (const value of [positions.getX(i), positions.getY(i), positions.getZ(i)]) assert.ok(Number.isFinite(value));
        triangles += (node.geometry.index?.count ?? positions.count) / 3;
      }});
      assert.ok(triangles > 0 && triangles <= budgets[row.id][index]);
      const bounds = new THREE.Box3().setFromObject(asset.scene);
      near(bounds.min.y, 0, .025);
      assert.ok(bounds.max.y > 3 && bounds.max.x > 2 && bounds.max.z > 1, 'actual landmark dimensions');
      assert.equal(triangles, row[index === 0 ? 'highTriangles' : 'lowTriangles']);
      disposeTree(asset.scene);
    }
    assert.ok(bytesTotal <= 250000); assert.equal(bytesTotal, row.bytes);
  }
});


test('the three real landmarks retain all original triangle clearance rules', async () => {
  const course = new Course(ARDENNES_FOREST, 1989), loader = new GLTFLoader();
  const loadedBounds = new Map();
  const ids = new Set(['stone-stream-bridge', 'forest-footbridge', 'forest-timing-tower']);
  const owner = createTrackKits(course, {placements: ARDENNES_FOREST.kitPlacements.filter(row => ids.has(row.id)),
    loadAsset: async path => {
      const bytes = readFileSync(new URL('../public' + path, import.meta.url));
      const asset = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      asset.scene.updateMatrixWorld(true);
      loadedBounds.set(path, new THREE.Box3().setFromObject(asset.scene));
      return asset;
    }});
  try {
    assert.equal(await owner.ready, true, owner.error?.message);
    assert.equal(owner.placements.length, 3);
    assert.equal(owner.stats.clearance.runtimeSkipped, 0, 'no triangle or headroom exemption');
    for (let index = 0; index < owner.placements.length; index++) {
      const row = owner.placements[index], matrix = owner.getPlacementPose(index), point = course.groundAt(row.s, row.lateral);
      const ground = renderedGroundHeight(course, {...point, s: row.s, off: row.lateral}, {requireSurface: true});
      for (const suffix of ['', '-lod']) {
        const bounds = loadedBounds.get('/assets/models/circuits/kits/' + row.id + suffix + '.glb');
        assert.ok(bounds, 'actual High and LOD model bounds exist');
        const transformed = bounds.clone().applyMatrix4(matrix);
        near(transformed.min.y, ground, 1e-6, 'actual transformed High/LOD mesh base');
      }
    }
  } finally {owner.dispose();}
});


test('courses without Ardennes effects retain their existing scene and owned inputs', () => {
  const course = new Course({...ARDENNES_FOREST, effects: undefined, kitPlacements: [], kitLook: undefined}, 1989);
  const before = JSON.stringify(course.def), world = new THREE.Group();
  addCircuitEffects(world, course);
  assert.equal(world.getObjectByName('Ardennes valley mist'), undefined);
  assert.equal(world.getObjectByName('Ardennes red-brown stream'), undefined);
  syncScene(world, Object.freeze({status: 'racing', s: 900, completedLaps: 1, lapsTotal: 2}), 1 / 30);
  assert.equal(JSON.stringify(course.def), before);
  disposeTree(world);
});


test('every actual two-to-six-lap choice clears after lap one and keeps clear light afterward', () => {
  const added = !COURSE.some(def => def.id === ARDENNES_FOREST.id);
  if (added) COURSE.push(ARDENNES_FOREST);
  try {
    for (const laps of [2, 3, 4, 5, 6]) {
      const duel = new Duel({seed: 1989, featureFlags: {'grand-prix': true, 'lap-choice': true}});
      duel.startCampaign({mode: 'grandprix', laps, startStage: COURSE.findIndex(def => def.id === ARDENNES_FOREST.id),
        car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium'});
      const course = duel.course;
      assert.equal(duel.state.lapsTotal, laps, 'actual native lap admission');
      assert.equal(sampleCourseLightPath(course, {distance: 0}).settings.fogNear, 90);
      assert.equal(sampleCourseLightPath(course, {distance: course.length}).settings.fogNear, 360);
      assert.equal(sampleCourseLightPath(course, {distance: course.length * 1.25}).settings.fogNear, 360);
      assert.equal(sampleCourseLightPath(course, {distance: course.length * laps}).settings.fogNear, 360);
      assert.equal(sampleCourseLightPath(course, {distance: course.length * laps, menu: true}).settings.fogNear, 90);
    }
  } finally {
    if (added) COURSE.splice(COURSE.findIndex(def => def.id === ARDENNES_FOREST.id), 1);
  }
});

test('ordinary closed distance paths still wrap and reject invalid wrap metadata', () => {
  const course = new Course(ARDENNES_FOREST, 1989), {wrap, ...ordinaryPath} = ARDENNES_FOREST.lightPath;
  assert.equal(wrap, false);
  const ordinary = {...course, def: {...course.def, lightPath: Object.freeze(ordinaryPath)}};
  const before = JSON.stringify(ordinary.def);
  const initial = sampleCourseLightPath(ordinary, {distance: 0});
  assert.deepEqual(sampleCourseLightPath(ordinary, {distance: course.length}).settings, initial.settings);
  assert.deepEqual(sampleCourseLightPath(ordinary, {distance: course.length * 4}).settings, initial.settings);
  assert.equal(JSON.stringify(ordinary.def), before);
  for (const invalid of ['false', 0, null, {}])
    assert.equal(sampleCourseLightPath({...ordinary, def: {...ordinary.def, lightPath: {...ordinaryPath, wrap: invalid}}}, {distance: 0}), null);
  assert.equal(sampleCourseLightPath({...ordinary, def: {...ordinary.def,
    lightPath: {axis: 'race-progress', wrap: false, keyframes: [{at: 0, look: 'golden'}, {at: 1, look: 'day'}]}}}, {distance: 0}), null);
});

test('native first-lap mist endpoints do not depend on lap choice or presentation FPS', () => {
  const course = new Course(ARDENNES_FOREST, 1989), world = new THREE.Group();
  const originalLoad = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  try {addCircuitEffects(world, course);} finally {THREE.TextureLoader.prototype.load = originalLoad;}
  const banks = []; world.traverse(node => {if (node.name === 'Ardennes valley mist') banks.push(node);});
  const positions = banks.map(bank => bank.position.toArray());
  for (const lapsTotal of [2, 3, 4, 5, 6]) for (const fps of [30, 60, 144]) {
    const start = Object.freeze({status: 'racing', lapsTotal, completedLaps: 0, s: 0});
    syncScene(world, start, 1 / fps);
    const opacity = banks.map(bank => bank.material.opacity);
    const midpoint = Object.freeze({...start, s: course.length / 2});
    const before = JSON.stringify(midpoint); syncScene(world, midpoint, 1 / fps);
    assert.equal(JSON.stringify(midpoint), before);
    banks.forEach((bank, index) => near(bank.material.opacity, opacity[index] / 2, 1e-12, 'same native first-lap midpoint'));
    const after = Object.freeze({...start, completedLaps: 1});
    const afterBefore = JSON.stringify(after); syncScene(world, after, 1 / fps);
    assert.equal(JSON.stringify(after), afterBefore);
    assert.ok(banks.every(bank => bank.material.opacity === 0), 'first lap clears regardless of total laps');
    syncScene(world, Object.freeze({...after, completedLaps: lapsTotal - 1, s: course.length / 2}), 1 / fps);
    assert.ok(banks.every(bank => bank.material.opacity === 0), 'later laps stay clear');
  }
  assert.deepEqual(banks.map(bank => bank.position.toArray()), positions);
  disposeTree(world);
});

test('gravel-only terrain builds finite native vertex colours without fallen leaves', () => {
  const course = new Course(ARDENNES_FOREST, 1989);
  const before = JSON.stringify(ARDENNES_FOREST.groundLeaves);
  assert.equal(ARDENNES_FOREST.groundLeaves.strength, 0);
  assert.equal(ARDENNES_FOREST.groundLeaves.colours, undefined, 'no extra fallen-leaf palette is authored');
  for (const build of [terrainGeometry, farTerrainGeometry]) {
    const geometry = build(course);
    try {
      const colours = geometry.getAttribute('color');
      assert.ok(colours?.count > 0, 'the actual native terrain has vertex colours');
      assert.ok([...colours.array].every(Number.isFinite), 'every actual native colour component is finite');
    } finally {geometry.dispose();}
  }
  assert.equal(JSON.stringify(ARDENNES_FOREST.groundLeaves), before, 'native terrain does not change authored metadata');
});


test('the current Stavelot village authors two frozen nonempty streets and a grounded stone church', () => {
  const town = ARDENNES_FOREST.circuitLandmarks.find(row => row.id === 'stavelot-valley-town');
  const church = ARDENNES_FOREST.circuitLandmarks.find(row => row.id === 'stavelot-church');
  assert.equal(town?.type, 'town'); assert.equal(church?.type, 'church');
  assert.ok(Object.isFrozen(town) && Object.isFrozen(town.houses) && town.houses.length > 0);
  assert.ok(town.houses.every(Object.isFrozen));
  assert.deepEqual(town.roofColours, [0x414a50, 0x5a352c, 0x50545a]);
  assert.ok(Object.isFrozen(town.roofColours));
  const streets = new Set(town.houses.map(house => {
    assert.ok([house.s, house.lateral, house.heading, house.width, house.depth].every(Number.isFinite));
    assert.ok(house.width > 0 && house.depth > 0 && [1, 2].includes(house.storeys));
    assert.equal(Math.abs(house.heading), Math.PI / 2);
    const centre = house.lateral + Math.sign(house.heading) * 8.5;
    return Math.round(centre - 1.2 * Math.sin((house.s - piece('Stavelot').s0) / 70));
  }));
  assert.deepEqual([...streets].sort((a, b) => a - b), [28, 48]);
  assert.ok(Object.isFrozen(church)); assert.equal(church.churchStyle, 'stone');
  assert.equal(church.grounding, 'footprint');
});

test('every actual current town foundation and veranda has drawn-terrain support without mutation or leaked owners', () => {
  const course = new Course(ARDENNES_FOREST, 1989), world = new THREE.Group();
  const before = JSON.stringify({definition: ARDENNES_FOREST, features: course.features});
  const spec = ARDENNES_FOREST.circuitLandmarks.find(row => row.id === 'stavelot-valley-town');
  assert.ok(spec.houses.length > 0);
  const terrainMaterial = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
  const terrain = [terrainGeometry, farTerrainGeometry].map(build => new THREE.Mesh(build(course), terrainMaterial));
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), owned = new Map(), measurements = [];
  let disposed = false;
  try {
    const group = addCircuitLandmarks(world, course); world.updateMatrixWorld(true);
    const town = group.getObjectByName(spec.id), footings = town.getObjectByName('town footings'),
      houses = town.getObjectByName('town houses'), roofs = town.getObjectByName('town roofs'),
      verandas = town.getObjectByName('town verandas'), doors = town.getObjectByName('town doors'),
      posts = town.getObjectByName('town veranda posts');
    for (const mesh of [footings, houses, roofs, verandas]) {
      assert.ok(mesh?.isInstancedMesh); assert.equal(mesh.count, spec.houses.length);
    }
    assert.equal(posts.count, spec.houses.length * 3); assert.equal(doors.count, spec.houses.length * 2);
    const matrixAt = (mesh, index) => {
      const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); return mesh.matrixWorld.clone().multiply(matrix);
    };
    const support = (x, z, label, actualRay = false) => {
      const near = course.nearest(x, z);
      assert.ok(near.distance >= course.roadHalfWidthAt(near.s) + 3, label + ': actual footprint clears every road');
      if (actualRay) {
        ray.set(new THREE.Vector3(x, 2000, z), down);
        const hit = ray.intersectObjects(terrain, false)[0];
        assert.ok(hit, label + ': actual near/far drawn triangle exists'); return hit.point.y;
      }
      const ground = renderedGroundHeight(course, {x, z, s: near.s, off: near.lateral}, {requireSurface: true});
      assert.ok(Number.isFinite(ground), label + ': actual drawn terrain support is finite'); return ground;
    };
    for (let index = 0; index < spec.houses.length; index++) {
      const footing = matrixAt(footings, index), house = matrixAt(houses, index), deck = matrixAt(doors, index * 2);
      const floor = new THREE.Vector3(0, -.5, 0).applyMatrix4(house).y;
      const expectedColours = spec.roofColours.map(value => new THREE.Color(value).toArray().map(Math.fround));
      assert.ok(expectedColours.some(value => JSON.stringify(value) === JSON.stringify(Array.from(roofs.instanceColor.array.slice(index * 3, index * 3 + 3)))));
      let samples = 0, maximumBottom = -Infinity, minimumFloor = Infinity;
      const checkFooting = (u, v, actualRay = false) => {
        const bottom = new THREE.Vector3(u, -.5, v).applyMatrix4(footing), top = new THREE.Vector3(u, .5, v).applyMatrix4(footing);
        const label = 'house ' + index + ' footing ' + u + ',' + v, ground = support(bottom.x, bottom.z, label, actualRay);
        assert.ok(bottom.y <= ground && top.y >= ground,
          label + ': actual foundation [' + bottom.y + ',' + top.y + '] must span drawn ground ' + ground);
        assert.ok(floor >= ground, label + ': actual house floor must clear drawn support');
        maximumBottom = Math.max(maximumBottom, bottom.y - ground); minimumFloor = Math.min(minimumFloor, floor - ground); samples++;
      };
      for (const u of [-.5, 0, .5]) for (const v of [-.5, 0, .5]) checkFooting(u, v, true);
      const nx = Math.ceil(Math.hypot(...footing.elements.slice(0, 3)) / .5), nz = Math.ceil(Math.hypot(...footing.elements.slice(8, 11)) / .5);
      for (let x = 0; x <= nx; x++) for (let z = 0; z <= nz; z++) checkFooting(-.5 + x / nx, -.5 + z / nz);
      const dx = Math.ceil(Math.hypot(...deck.elements.slice(0, 3)) / .5), dz = Math.ceil(Math.hypot(...deck.elements.slice(8, 11)) / .5);
      for (let x = 0; x <= dx; x++) for (let z = 0; z <= dz; z++) {
        const point = new THREE.Vector3(-.5 + x / dx, .5, -.5 + z / dz).applyMatrix4(deck);
        assert.ok(point.y >= support(point.x, point.z, 'house ' + index + ' veranda'), 'actual veranda deck clears its whole sampled ground footprint');
      }
      for (let post = 0; post < 3; post++) {
        const matrix = matrixAt(posts, index * 3 + post), vertices = posts.geometry.getAttribute('position');
        const bottom = posts.geometry.boundingBox ?? (posts.geometry.computeBoundingBox(), posts.geometry.boundingBox);
        for (let vertex = 0; vertex < vertices.count; vertex++) if (vertices.getY(vertex) === bottom.min.y) {
          const point = new THREE.Vector3().fromBufferAttribute(vertices, vertex).applyMatrix4(matrix), ground = support(point.x, point.z, 'house ' + index + ' veranda post');
          assert.ok(point.y <= ground, 'actual veranda post base reaches drawn ground');
          assert.ok(new THREE.Vector3(0, .5, 0).applyMatrix4(matrix).y >= ground, 'actual veranda post spans support');
        }
      }
      measurements.push({index, s: spec.houses[index].s, lateral: spec.houses[index].lateral, samples, maximumBottom, minimumFloor});
    }
    assert.equal(measurements.length, spec.houses.length);
    assert.equal(JSON.stringify({definition: ARDENNES_FOREST, features: course.features}), before, 'actual town construction/support checks never change course or features');
    world.traverse(object => {
      for (const resource of [object.isInstancedMesh ? object : null, object.geometry, ...[].concat(object.material ?? [])])
        if (resource && !resource.userData.sharedAsset && !owned.has(resource)) {
          owned.set(resource, 0); resource.addEventListener('dispose', () => owned.set(resource, owned.get(resource) + 1));
        }
    });
    assert.ok(owned.size > 0); disposeTree(world); disposed = true;
    assert.ok([...owned.values()].every(count => count === 1), 'each actual owned town/church resource disposes exactly once');
    console.log('Ardennes actual current town support: ' + JSON.stringify(measurements));
  } finally {
    if (!disposed) disposeTree(world);
    for (const mesh of terrain) mesh.geometry.dispose(); terrainMaterial.dispose();
  }
});

test('Long Left outside run-off has the approved local width and forty-metre transitions', () => {
  const script = buildTrackScript(ARDENNES_FOREST);
  const before = JSON.stringify(ARDENNES_FOREST.runoffBands);
  assert.deepEqual(ARDENNES_FOREST.runoffBands, [{s0: 3330, s1: 3730, side: -1, width: 20, taper: 40}]);
  assert.ok(Object.isFrozen(ARDENNES_FOREST.runoffBands) && ARDENNES_FOREST.runoffBands.every(Object.isFrozen));
  assert.ok(Object.isFrozen(script.runoffBands) && script.runoffBands.every(Object.isFrozen));
  for (const [station, expected] of [[3310, 12], [3330, 12], [3350, 16], [3370, 20],
    [3610.814, 20], [3690, 20], [3710, 16], [3730, 12], [3750, 12]]) {
    near(script.runoffAt(station, -1), expected, 1e-12);
    near(script.runoffWidthAt(station, -1, 12), expected, 1e-12, 'gravel and clear-ground share the same normalized width');
    near(script.runoffAt(station, 1), 12, 0, 'the inside is unchanged');
    near(script.runoffAt(station + script.length, -1), expected, 1e-12, 'later laps use the same course station');
  }
  assert.equal(script.runoffAt.call({wallSide: () => true}, 3500, -1), 0, 'an authored wall still takes precedence');
  const ordinary = buildTrackScript({...ARDENNES_FOREST, runoffBands: undefined});
  for (const station of [0, 100, 3330, 3500, 3610, 3730, 6000]) for (const side of [-1, 1]) {
    assert.equal(ordinary.runoffAt(station, side), 12, 'absence of the band keeps the native default exact');
    assert.equal(ordinary.runoffWidthAt(station, side, 16), 16, 'absence of the band keeps the original visual scalar exact');
  }
  assert.deepEqual(script.samples, ordinary.samples);
  assert.deepEqual(script.pieces, ordinary.pieces);
  assert.deepEqual(script.report, ordinary.report, 'no road fit, grade, width or closure changes');
  assert.equal(JSON.stringify(ARDENNES_FOREST.runoffBands), before);
});

test('run-off bands reject malformed data and normalize without mutating authored inputs', () => {
  const valid = {s0: 3330, s1: 3730, side: -1, width: 20, taper: 40};
  for (const invalid of [null, {}, [null], [{...valid, s0: NaN}], [{...valid, s0: -1}],
    [{...valid, s1: 7000}], [{...valid, s1: valid.s0}], [{...valid, side: 0}],
    [{...valid, side: 'right'}], [{...valid, width: Infinity}], [{...valid, width: 0}],
    [{...valid, taper: -1}], [{...valid, taper: 201}], [{...valid, ignored: true}],
    [valid, {...valid, s0: 3500}]])
    assert.throws(() => buildTrackScript({...ARDENNES_FOREST, runoffBands: invalid}), /runoff band/i);
  const authored = [{...valid}], before = JSON.stringify(authored);
  const normalized = buildTrackScript({...ARDENNES_FOREST, runoffBands: authored});
  assert.equal(JSON.stringify(authored), before);
  assert.notEqual(normalized.runoffBands, authored);
  assert.notEqual(normalized.runoffBands[0], authored[0]);
  authored[0].width = 99;
  assert.equal(normalized.runoffAt(3500, -1), 20, 'the normalized query does not retain a mutable descriptor');
});

test('only approved Long Left outside armco and catch fence follow the wider run-off', () => {
  const road = buildTrackScript(ARDENNES_FOREST), turn = road.pieces.find(piece => piece.name === 'Long Left');
  const rows = ARDENNES_FOREST.kitPlacements;
  for (const row of rows.filter(row => row.id === 'armco')) {
    const approved = row.lateral < 0 && row.s >= turn.s0 - 8 && row.s < turn.s1 + 8;
    const room = approved ? road.runoffWidthAt(row.s, -1, 12) : 12;
    near(Math.abs(row.lateral), road.halfWidthAt(row.s) + room + .8, 1e-9);
    if (!approved) assert.equal(Math.abs(row.lateral), road.halfWidthAt(row.s) + 12.8, 'all other armco stays byte-exact in its original arithmetic');
  }
  for (const row of rows.filter(row => row.id === 'catch-fence')) {
    if (row.lateral < 0 && row.s >= 3330 && row.s <= 3730)
      assert.equal(Math.abs(row.lateral), road.halfWidthAt(row.s) + road.runoffWidthAt(row.s, -1, 12) + 2.3,
        'the approved outside fence keeps its original 1.5 m beyond armco');
    else assert.equal(Math.abs(row.lateral), road.halfWidthAt(row.s) + 14.3,
      'every opposite or further catch fence keeps its exact original arithmetic');
  }
  for (const station of [3324, 3332, 3364, 3380, 3612, 3692, 3724, 3732]) for (const side of [-1, 1]) {
    const fence = rows.find(row => row.id === 'catch-fence' && Math.sign(row.lateral) === side && Math.abs(row.s - station) < 1e-6);
    assert.ok(fence, 'actual eight-metre fence station exists at both boundaries and sides');
    const approved = side === -1 && station >= 3330 && station <= 3730;
    const expected = approved ? side * (road.halfWidthAt(station) + road.runoffWidthAt(station, side, 12) + 2.3)
      : side * (road.halfWidthAt(station) + 14.3);
    assert.equal(fence.lateral, expected);
  }
  const struck = rows.find(row => row.id === 'catch-fence' && row.lateral < 0 && Math.abs(row.s - 3612) < 1e-6);
  assert.equal(struck.lateral, -29.8, 'the exact previously struck fence now has the approved 22.3 m setback');
});

test('actual terrain gravel expands only on the approved outside band without geometry changes', () => {
  const wide = new Course(ARDENNES_FOREST, 1989);
  const ordinary = new Course({...ARDENNES_FOREST, runoffBands: undefined}, 1989);
  const authoredBefore = JSON.stringify(ARDENNES_FOREST);
  const expanded = terrainGeometry(wide), original = terrainGeometry(ordinary);
  const offsets = [-64, -56, -48, -40, -32, -24, -18, -14, -10, -7, 0, 7, 10, 14, 18, 24, 32, 40, 48, 56, 64];
  try {
    for (const name of ['position', 'uv', 'biomeWeights', 'normal'])
      assert.deepEqual(expanded.getAttribute(name).array, original.getAttribute(name).array, 'ground geometry remains exact');
    assert.deepEqual(expanded.index.array, original.index.array);
    assert.deepEqual(expanded.groups, original.groups);
    const colours = expanded.getAttribute('color'), previous = original.getAttribute('color');
    let changes = 0, witness = false;
    for (let vertex = 0; vertex < colours.count; vertex++) {
      const s = Math.floor(vertex / offsets.length) * 4, off = offsets[vertex % offsets.length];
      const changed = [0, 1, 2].some(component => colours.array[vertex * 3 + component] !== previous.array[vertex * 3 + component]);
      if (changed) {
        changes++;
        assert.ok(s > 3330 && s < 3730 && off < 0, 'no colour outside the approved station/side band changes');
        if (s === 3600 && off === -24) witness = true;
      }
    }
    assert.ok(changes > 0 && witness, 'actual outside gravel vertices at the crash corner now receive the wider trap');
    assert.equal(JSON.stringify(ARDENNES_FOREST), authoredBefore, 'terrain colouring cannot mutate course data');
  } finally {expanded.dispose(); original.dispose();}
});


function knownPlayerIncident() {
  const placement = {...ARDENNES_FOREST.kitPlacements[1901]};
  return {
    setup: {id: 'ardennes-forest', seed: 1989, fieldSeed: 1000, car: 'stuttgart_959s',
      cpuDifficulty: 'medium', lineSkill: .95, stock: true, placement},
    final: {crashes: 1, stageCrashes: 1},
    observer: {restored: true, incidents: [{index: 2, t: 9}, {index: -1, t: 85.82}],
      playerIncidents: [{index: -1, t: 85.82}], cpuIncidents: [{index: 2, t: 9}], playerEvents: [{completedLaps: 0, s: 3618.56873672659,
      piece: {name: 'Long Left', s0: piece('Long Left').s0, s1: piece('Long Left').s1},
      event: {crash: 'prop'}, propIdentityVerified: true,
      contact: {verified: true, actualResolutionEnd: {x: -896.7851311862836, z: -944.4206584681774},
        expectedResolutionEnd: {x: -896.7851311862836, z: -944.4206584681774}, selectedProp: {id: 'kit-solid-1901-armco', kind: 'prop',
        kitSolid: true, barrier: true, halfX: 2, halfZ: .4, authoredPlacement: placement}}}]},
  };
}

test('native player exception admits zero or only the verified first-lap Long Left stock-driver incident', () => {
  const known = knownPlayerIncident();
  assert.equal(ardennesPlayerCrashAccepted(known.setup, known.final, known.observer), true);
  assert.equal(ardennesPlayerCrashAccepted(known.setup, {crashes: 0, stageCrashes: 0},
    {restored: true, incidents: [{index: 2, t: 9}], playerIncidents: [], cpuIncidents: [{index: 2, t: 9}], playerEvents: []}), true);
  for (const mutate of [
    row => {row.observer.playerEvents[0].propIdentityVerified = false;},
    row => {row.observer.playerEvents[0].contact.verified = false;},
    row => {row.observer.playerEvents[0].contact.actualResolutionEnd.x += .1;},
    row => {row.observer.playerEvents[0].contact.selectedProp = null;},
    row => {row.observer.playerEvents[0].contact.selectedProp.id = 'kit-solid-905-catch-fence';},
    row => {row.observer.playerEvents[0].contact.selectedProp.authoredPlacement.lateral = -30;},
    row => {row.observer.playerEvents[0].completedLaps = 1;},
    row => {row.observer.playerEvents[0].piece.name = 'Riverside';},
    row => {row.observer.playerEvents.push(structuredClone(row.observer.playerEvents[0])); row.final.crashes = 2;},
    row => {row.observer.playerEvents.push(structuredClone(row.observer.playerEvents[0]));},
    row => {row.setup.seed = 42;}, row => {row.setup.fieldSeed = 1001;},
    row => {row.setup.car = 'falcone_f42';}, row => {row.setup.stock = false;},
    row => {row.setup.lineSkill = .9;}, row => {row.setup.cpuDifficulty = 'hard';},
    row => {row.observer.restored = false;},
  ]) {
    const row = structuredClone(known); mutate(row);
    assert.equal(ardennesPlayerCrashAccepted(row.setup, row.final, row.observer), false);
  }
  assert.equal(ardennesPlayerCrashAccepted(known.setup, {crashes: 0}, known.observer), false);
  assert.equal(ardennesPlayerCrashAccepted(known.setup, known.final, {restored: true, playerEvents: []}), false);
});


test('native player exception rejects incomplete or inconsistent field incident receipts', () => {
  for (const mutate of [
    row => {delete row.observer.incidents;},
    row => {row.observer.incidents.push({index: 7, t: 12});},
    row => {row.observer.incidents.push({index: -2, t: 12});},
    row => {row.observer.incidents.push({index: .5, t: 12});},
    row => {row.observer.playerIncidents[0].t = 85;},
    row => {row.observer.cpuIncidents = [];},
    row => {row.observer.incidents = row.observer.incidents.filter(item => item.index !== -1); row.observer.playerIncidents = [];},
    row => {row.observer.incidents.push({index: -1, t: 86}); row.observer.playerIncidents.push({index: -1, t: 86});},
    row => {row.final.stageCrashes = 0;},
    row => {row.final.stageCrashes = 2;},
    row => {delete row.final.stageCrashes;},
  ]) {
    const row = knownPlayerIncident(); mutate(row);
    assert.equal(ardennesPlayerCrashAccepted(row.setup, row.final, row.observer), false);
  }
});


test('actual negative native grid keeps initial mist and light during countdown and the first metres', () => {
  const added = !COURSE.some(def => def.id === ARDENNES_FOREST.id);
  if (added) COURSE.push(ARDENNES_FOREST);
  let world;
  try {
    for (const laps of [2, 3, 4, 5, 6]) {
      const duel = new Duel({seed: 1989, featureFlags: {'grand-prix': true, 'lap-choice': true}});
      duel.startCampaign({mode: 'grandprix', laps, startStage: COURSE.findIndex(def => def.id === ARDENNES_FOREST.id),
        car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium'});
      assert.equal(duel.state.status, 'countdown');
      assert.ok(duel.state.s < 0, 'the actual eighth-car grid is behind the start line');
      const course = duel.course;
      world = new THREE.Group();
      const originalLoad = THREE.TextureLoader.prototype.load;
      THREE.TextureLoader.prototype.load = () => new THREE.Texture();
      try {addCircuitEffects(world, course);} finally {THREE.TextureLoader.prototype.load = originalLoad;}
      const banks = []; world.traverse(node => {if (node.name === 'Ardennes valley mist') banks.push(node);});
      assert.ok(banks.length >= 12);
      const positions = banks.map(bank => bank.position.toArray());
      syncScene(world, Object.freeze({status: 'racing', s: 0, completedLaps: 0, lapsTotal: laps}), 1 / 60);
      const initial = banks.map(bank => bank.material.opacity);
      assert.ok(initial.every(value => value > 0));
      const countdown = Object.freeze(structuredClone(duel.state));
      for (const state of [countdown, Object.freeze({...countdown, status: 'racing'}),
        Object.freeze({...countdown, status: 'racing', s: -.001})]) {
        const before = JSON.stringify(state);
        syncScene(world, state, 1 / 60);
        assert.deepEqual(banks.map(bank => bank.material.opacity), initial, 'negative grid retains exactly the initial mist');
        assert.equal(sampleCourseLightPath(course, {distance: state.s}).settings.fogNear, 90,
          'photographer uses the same unwrapped native distance as production lighting');
        assert.equal(JSON.stringify(state), before, 'presentation cannot write frozen native state');
      }
      syncScene(world, Object.freeze({...countdown, status: 'menu', s: course.length / 2, completedLaps: 1}), 1 / 60);
      assert.deepEqual(banks.map(bank => bank.material.opacity), initial, 'menu behavior stays initial');
      assert.deepEqual(banks.map(bank => bank.position.toArray()), positions);
      disposeTree(world); world = null;
    }
  } finally {
    if (world) disposeTree(world);
    if (added) COURSE.splice(COURSE.findIndex(def => def.id === ARDENNES_FOREST.id), 1);
  }
});

// Invoke the original directory-plan CLI without importing Blender or writing outputs.
test('original landmark CLI plans default and bridge-only outputs in two empty roots without creating files', () => {
  const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
  const recipe = join(sourceRoot, 'tools/blender/ardennes-landmarks.py');
  const expected = ['stone-stream-bridge', 'forest-footbridge', 'forest-timing-tower']
    .flatMap(id => [id + '.glb', id + '-lod.glb']);
  const roots = [];
  try {
    for (const tag of ['a', 'b']) {
      const fixture = mkdtempSync(join(tmpdir(), 'duel-ardennes-plan-' + tag + '-'));
      roots.push(fixture);
      for (const selection of [[], ['--model', 'stone-stream-bridge']]) {
        const call = spawnSync('python', ['-I', '-B', '-S', recipe, '--', '--root', fixture, '--paths-only', ...selection],
          {cwd: sourceRoot, encoding: 'utf8', windowsHide: true, timeout: 10000});
        assert.equal(call.error, undefined, call.error?.message);
        assert.equal(call.status, 0, call.stderr || call.stdout);
        assert.equal(call.stderr, '');
        const plan = JSON.parse(call.stdout);
        assert.deepEqual(Object.keys(plan), ['runtime', 'files', 'provenance']);
        assert.equal(plan.runtime, resolve(fixture, 'public/assets/models/circuits/kits'));
        assert.deepEqual(plan.files, selection.length ? expected.slice(0, 2) : expected);
        assert.equal(plan.provenance, resolve(fixture, 'tools/art/ardennes-landmarks.json'));
        assert.deepEqual(readdirSync(fixture), [], 'paths-only must not create runtime, provenance or scratch files');
      }
      const malformed = spawnSync('python', ['-I', '-B', '-S', recipe, '--', '--root', fixture,
        '--paths-only', '--model', 'unregistered-landmark'],
        {cwd: sourceRoot, encoding: 'utf8', windowsHide: true, timeout: 10000});
      assert.equal(malformed.error, undefined, malformed.error?.message);
      assert.equal(malformed.status, 2);
      assert.match(malformed.stderr, /invalid choice/);
      assert.equal(malformed.stdout, '');
      assert.deepEqual(readdirSync(fixture), [], 'invalid selection must not create output');
    }
  } finally {
    // Only empty fixture roots are removed; unexpected writes remain for diagnosis.
    for (const fixture of roots) if (readdirSync(fixture).length === 0) rmdirSync(fixture);
  }
});

test('optional neutral damp road reads actual first-lap mist opacity without state writes or stale shader variants', () => {
  const added=!COURSE.some(def=>def.id===ARDENNES_FOREST.id);
  if(added)COURSE.push(ARDENNES_FOREST);
  const world=new THREE.Group(), asphalt=new THREE.Texture(); asphalt.userData.sharedAsset=true;
  let disposed=false;
  try {
    const duel=new Duel({seed:1989,featureFlags:{'grand-prix':true}});
    duel.startCampaign({mode:'grandprix',startStage:COURSE.findIndex(def=>def.id===ARDENNES_FOREST.id),
      car:'stuttgart_959s',seed:1989,fieldSeed:1000,cpuDifficulty:'medium'});
    assert.equal(duel.state.status,'countdown');assert.ok(duel.state.s<0);
    const course=duel.course, features=JSON.stringify(course.features), definition=JSON.stringify(course.def);
    const originalLoad=THREE.TextureLoader.prototype.load;
    THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
    try {addCircuitEffects(world,course);} finally {THREE.TextureLoader.prototype.load=originalLoad;}
    const material=createPavedRoadMaterial({asphalt,wet:true,dampRoad:course.def.dampRoad,
      courseLength:course.length,mistBanks:course.def.effects.valleyMist});
    world.add(new THREE.Mesh(new THREE.BufferGeometry(),material));
    bindPavedDampRoad(world,course,material);
    const shaders=[0,1].map(()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader}));
    shaders.forEach(shader=>material.onBeforeCompile(shader));
    const materials=[];world.traverse(node=>{if(node.name==='Ardennes valley mist'&&!materials.includes(node.material))materials.push(node.material);});
    assert.equal(materials.length,4);assert.equal(material.color.getHex(),0x747474);
    assert.equal(material.roughness,.9);assert.equal(material.metalness,0);
    assert.equal(shaders[0].uniforms.roadMistRanges,shaders[1].uniforms.roadMistRanges);
    assert.deepEqual(shaders[0].uniforms.roadShadeRanges.value.map(row=>row.toArray()),
      ['Kestrel Straight','Forest Run','Whitewood'].map(name=>{const p=course.script.pieces.find(row=>row.name===name);return[p.s0,p.s1];}));
    const countdown=structuredClone(duel.state);
    for(const state of [countdown,{...countdown,status:'racing',s:-.001},{...countdown,status:'racing',s:0},
      {...countdown,status:'racing',s:course.length/2},{...countdown,status:'racing',s:course.length,completedLaps:1},
      {...countdown,status:'menu',s:course.length/2,completedLaps:1}]) {
      Object.freeze(state);const before=JSON.stringify(state);
      syncScene(world,state,1/60);
      for(let i=0;i<4;i++)assert.equal(shaders[0].uniforms.roadMistRanges.value[i].z,
        materials[i].opacity/course.def.effects.valleyMist[i].opacity,'read actual shared bank fade after existing mist sync');
      assert.equal(JSON.stringify(state),before);
    }
    assert.equal(JSON.stringify(course.features),features);assert.equal(JSON.stringify(course.def),definition);
    const previous=shaders[0].uniforms.roadMistRanges.value.map(row=>row.z);
    disposeTree(world);disposed=true;
    syncScene(world,Object.freeze({...countdown,status:'racing',s:course.length,completedLaps:1}),1/60);
    assert.deepEqual(shaders[0].uniforms.roadMistRanges.value.map(row=>row.z),previous,'retired world cannot update captured uniforms');
  } finally {
    if(!disposed)disposeTree(world);asphalt.dispose();
    if(added)COURSE.splice(COURSE.findIndex(def=>def.id===ARDENNES_FOREST.id),1);
  }
});
