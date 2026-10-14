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
import {createTrackKits} from '../src/track-kits.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

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

test('Ardennes Forest is a dev circuit: registered last, priced, off by default, and COURSE is unchanged without its switch', () => {
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
  assert.equal(CIRCUIT_MANIFESTS.at(-1).id, 'ardennes-forest', 'last in release order');
  assert.equal(CIRCUIT_MANIFESTS.at(-2).id, 'summit-run', 'straight after Summit Run');
  assert.ok(CIRCUIT_MANIFESTS.every(row => row.id === 'ardennes-forest' || row.releaseOrder < manifest.releaseOrder), 'released courses keep their places');
  assert.equal(ALL_CIRCUITS.at(-1), ARDENNES_FOREST);
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
  addCircuitEffects(world, course);
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
  addCircuitEffects(world, course);
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
  const ids = new Set(['stone-stream-bridge', 'forest-footbridge', 'forest-timing-tower']);
  const owner = createTrackKits(course, {placements: ARDENNES_FOREST.kitPlacements.filter(row => ids.has(row.id)),
    loadAsset: async path => {
      const bytes = readFileSync(new URL('../public' + path, import.meta.url));
      return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    }});
  try {
    assert.equal(await owner.ready, true, owner.error?.message);
    assert.equal(owner.placements.length, 3);
    assert.equal(owner.stats.clearance.runtimeSkipped, 0, 'no triangle or headroom exemption');
    for (let index = 0; index < owner.placements.length; index++) {
      const row = owner.placements[index], matrix = owner.getPlacementPose(index), point = course.groundAt(row.s, row.lateral);
      const ground = renderedGroundHeight(course, {...point, s: row.s, off: row.lateral}, {requireSurface: true});
      near(matrix.elements[13], ground, 1e-6, 'actual ground pivot');
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
  addCircuitEffects(world, course);
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
