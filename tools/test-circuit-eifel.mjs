import assert from 'node:assert/strict';
import test from 'node:test';
import {EIFEL_CROWN, manifest} from '../src/circuits/eifel-crown.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {applyCircuits} from '../src/circuits/index.js';
import {registerCircuits, CIRCUIT_ENTRIES} from '../src/circuit-manifests.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {EXPANSION_COURSES} from '../src/expansion-courses.js';
import {GRAND_PRIX_COURSES} from '../src/grand-prix-career.js';
import {driveCircuit} from './track-script-drive.mjs';
import {traceCourse, buildPilotMap} from './build-pilot-map.mjs';
import {installReferenceFixture} from './build-reference-laps.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTrackKits, normalizeKitPlacements} from '../src/track-kits.js';
import {KIT_FOOTPRINTS} from '../src/kit-footprints.js';
import {beechTreePlacements} from '../src/vegetation.js';

const road = buildTrackScript(EIFEL_CROWN);
const named = name => road.pieces.find(piece => piece.name === name);

test('Eifel keeps its identity and closes the approved 34-piece road at 14 m wide', () => {
  assert.deepEqual([EIFEL_CROWN.id, EIFEL_CROWN.stage, EIFEL_CROWN.layoutSeed, EIFEL_CROWN.layoutVersion],
    ['eifel-crown', 9, 1989, 3]);
  assert.equal(road.pieces.length, 34);
  assert.equal(road.pieces.filter(piece => piece.kind === 'turn').length, 17);
  assert.ok(Math.abs(road.length - 5600) < 10);
  const first = road.samples[0], last = road.samples.at(-1);
  assert.ok(Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) < .001);
  assert.ok(Math.abs(Math.sin(first.heading - last.heading)) < .001);
  for (let s = 0; s < road.length; s += 2) assert.equal(road.halfWidthAt(s), 7);
  assert.ok(road.report.straightChanges.every(row => Math.abs(row.percent) <= 1.2));
  assert.ok(road.report.highestGradePercent < 22);
  const heights = road.samples.map(p => p.y);
  assert.ok(Math.min(...heights) >= 13 && Math.max(...heights) > 110 && Math.max(...heights) < 113);
  assert.equal(named('Forest Dip').crest, 2.5);
  assert.deepEqual(EIFEL_CROWN.sections.map(s => [s.name, s.share, s.theme]), [
    ['Forest Esses', .42, 'alpine'], ['Crown Ridge', .35, 'alpine'], ['Valley Sweep', .23, 'alpine'],
  ]);
});

test('separate road stretches keep at least 468 m of centreline separation', () => {
  // Neighbours around a bend are one stretch. Compare points at least 750 m
  // apart along the lap, sampling every 8 m, as in the packet's fitted loop.
  const points = road.samples.filter((_, i) => i % 4 === 0);
  let separation = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    const along = Math.abs(points[i].s - points[j].s);
    if (Math.min(along, road.length - along) < 750) continue;
    separation = Math.min(separation, Math.hypot(points[i].x - points[j].x, points[i].z - points[j].z));
  }
  assert.ok(separation >= 468, `closest separate stretches: ${separation} m`);
});

test('every turn has kerbs and the three braking corners have all three boards off the road', () => {
  for (const turn of road.pieces.filter(p => p.kind === 'turn')) {
    assert.ok(road.kerbs.some(kerb => kerb.piece === turn.index));
  }
  for (const name of ['Crag Corner', 'Castle Bend', 'Last Turn']) for (const distance of [150, 100, 50]) {
    const corner = named(name), s = road.phase(corner.s0 - distance);
    const board = EIFEL_CROWN.kitPlacements.find(row => row.id === `braking-board-${distance}` && Math.abs(row.s - s) < .001);
    assert.ok(board, `${name}: ${distance} m board`);
    assert.equal(Math.sign(board.lateral), -corner.dir);
    assert.ok(Math.abs(board.lateral) > road.halfWidthAt(s) + 2);
    assert.equal(board.solid, undefined);
  }
  assert.equal(EIFEL_CROWN.expansion, undefined);
  assert.equal(EIFEL_CROWN.noTraffic, undefined);
  assert.equal(EIFEL_CROWN.noCombat, undefined);
});

test('preview replaces only slot 9 and switch off retains the released road exactly', () => {
  const base = COURSE.slice(0, 16);
  base[9] = EXPANSION_COURSES.find(row => row.id === 'eifel-crown');
  const off = {enabled: flag => flag !== 'eifel-crown'};
  const on = {enabled: () => true};
  const before = applyCircuits(base, off), after = applyCircuits(base, on);
  assert.equal(manifest.state, 'dev');
  assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('eifel-crown'), false);
  assert.equal(before[9], base[9]);
  assert.equal(after[9], EIFEL_CROWN);
  assert.equal(before.length, after.length);
  assert.deepEqual(after.map(row => row.id), before.map(row => row.id));
  for (let i = 0; i < before.length; i++) if (i !== 9) assert.equal(after[i], before[i]);
  assert.equal(after.filter(row => row.id === 'eifel-crown').length, 1);
  assert.equal(GRAND_PRIX_COURSES.filter(id => id === 'eifel-crown').length, 1);
  assert.deepEqual([manifest.slot, manifest.price, manifest.grandPrix], [9, 1400, true]);
  const module = {manifest, EIFEL_CROWN};
  for (const slot of [-1, 16, 1.5]) assert.throws(() => registerCircuits([{...module, manifest: {...manifest, slot}}]), /slot/i);
  assert.throws(() => applyCircuits(base, on, [{...CIRCUIT_ENTRIES.find(row => row.manifest.id === manifest.id), manifest: {...manifest, slot: 8}}]), /same course id/);
  for (const seed of [1989, 42]) {
    const course = new Course(after[9], seed);
    assert.equal(course.def, EIFEL_CROWN);
    assert.ok(course.racingLine);
  }
});

test('pilot map retains the released outline and rebuilds the preview from the new road', () => {
  const map = buildPilotMap();
  assert.deepEqual(map.outlines['eifel-crown'], traceCourse(EXPANSION_COURSES.find(row => row.id === 'eifel-crown')));
  assert.equal(map.previews['eifel-crown'].flag, manifest.flag);
  assert.deepEqual(map.previews['eifel-crown'].outline, traceCourse(EIFEL_CROWN));
  assert.notDeepEqual(map.previews['eifel-crown'].outline, map.outlines['eifel-crown']);
});

test('one native lap stays on the road without crashes on Casual and Pro', () => {
  const original = COURSE[9], storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  COURSE[9] = EIFEL_CROWN;
  try {
    for (const difficulty of ['casual', 'pro']) {
      let fixture;
      const result = driveCircuit(EIFEL_CROWN, {car: 'stuttgart_959s', difficulty, seed: 1989, opponentCount: 0,
        mode: 'timetrial', stopAfterLaps: 1, maxSeconds: 240, onTick(state, duel) {
          // Existing isolated geometry-driver fixture removes traffic and police,
          // preserving all native physical steps, surfaces and lap legality.
          fixture ??= installReferenceFixture({duel}, {eventId: 'eifel-crown'});
        }});
      fixture?.dispose();
      assert.equal(result.laps, 1, difficulty);
      assert.equal(result.finite, true, difficulty);
      assert.equal(result.crashes, 0, difficulty);
      assert.ok(result.lapEdge[0] < 0, `${difficulty}: road edge ${result.lapEdge[0]}`);
    }
  } finally {
    COURSE[9] = original;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    else delete globalThis.localStorage;
  }
});

// ---------------------------------------------------------------------------
// C4 scenery, round 1

const KITS = new URL('../public/assets/models/circuits/kits/', import.meta.url);
const scenery = new Course(EIFEL_CROWN, 1989);
const placements = EIFEL_CROWN.kitPlacements;

test('the new wall and hedge are original recipe output inside their triangle and file budgets', () => {
  const budgets = {'drystone-wall': [600, 200], 'hedge-row': [500, 200]};
  const models = JSON.parse(readFileSync(new URL('./blender/eifel/scenery.json', import.meta.url), 'utf8')).models;
  assert.deepEqual(models.map(model => model.id), Object.keys(budgets));
  for (const model of models) for (const [i, file] of model.files.entries()) {
    const bytes = readFileSync(new URL(file.path, KITS));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path + ' is the recipe output');
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
    assert.equal(triangles, file.triangles);
    assert.ok(triangles > 0 && triangles <= budgets[model.id][i], `${file.path}: triangle cap ${budgets[model.id][i]}`);
    assert.ok(file.bytes < 250000, `${file.path}: file budget`);
  }
  for (const id of Object.keys(budgets)) {
    const high = models.find(model => model.id === id).files[0].size;
    for (const [i, key] of ['width', 'height', 'depth'].entries())
      assert.ok(Math.abs(high[i] - KIT_FOOTPRINTS[id][key]) < .02, `${id} ${key} matches its solid box`);
  }
});

test('every scenery row uses an approved kit, stays off the road and run-off, and leaves corner exits open', () => {
  const allowed = new Set(['start-gantry', 'pit-garage', 'grandstand', 'armco', 'tyre-wall', 'marshal-post',
    'braking-board-150', 'braking-board-100', 'braking-board-50', 'drystone-wall', 'hedge-row']);
  assert.ok(placements.every(row => allowed.has(row.id)));
  assert.equal(normalizeKitPlacements(scenery, placements).length, placements.length);
  for (const row of placements.filter(row => ['armco', 'tyre-wall', 'drystone-wall', 'hedge-row'].includes(row.id))) {
    // The run-off is 12 m: no rail, wall or hedge starts inside it (marshals and boards have their own checks).
    const inner = Math.abs(row.lateral) - road.halfWidthAt(row.s) - KIT_FOOTPRINTS[row.id].depth / 2;
    assert.ok(inner >= 12, `${row.id} at s ${row.s.toFixed(0)}: ${inner.toFixed(2)} m from the edge`);
    assert.equal(row.solid, true);
  }
  for (const row of placements.filter(row => ['drystone-wall', 'hedge-row'].includes(row.id) && row.heading !== 0)) {
    const piece = road.pieceAt(row.s);
    assert.ok(piece.kind !== 'turn' || piece.radius >= 150 || Math.sign(row.lateral) !== piece.dir,
      `${row.id} at s ${row.s.toFixed(0)} is not on the inside of a tight corner`);
  }
  // Every armco row is on the outside of a corner; the three long bends stay open.
  for (const row of placements.filter(row => row.id === 'armco')) {
    const near = road.pieces.filter(piece => piece.kind === 'turn' && piece.radius < 150 &&
      row.s >= piece.s0 - 16 && row.s <= piece.s1 + 56 && Math.sign(row.lateral) === -piece.dir);
    assert.ok(near.length, `armco at s ${row.s.toFixed(0)} follows a corner outside`);
  }
  const wide = ['Start Kink', 'Hatch Sweep', 'Valley Brow'].map(named);
  for (const piece of wide) assert.ok(!placements.some(row => row.id === 'armco' && row.s > piece.s0 + 10 && row.s < piece.s1 - 10 &&
    road.pieceAt(row.s) === piece), piece.name + ' has no rail of its own');
});

test('the kits load from their real files and pass every triangle clearance rule', async () => {
  // The model reader looks for `self` (the browser's global); give it ours for this test only.
  const hadSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  globalThis.self ??= globalThis;
  const loader = new GLTFLoader();
  const owner = createTrackKits(scenery, {loadAsset: async path => {
    const bytes = readFileSync(new URL('../public' + path, import.meta.url));
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  }});
  try {
    assert.equal(await owner.ready, true, owner.error?.message);
    const beeches = beechTreePlacements(scenery).length;
    assert.equal(owner.placements.length, placements.length + beeches);
    assert.equal(owner.stats.clearance.runtimeSkipped, 0, 'no clearance exemption');
  } finally {
    owner.dispose();
    if (hadSelf) Object.defineProperty(globalThis, 'self', hadSelf); else delete globalThis.self;
  }
});

test('green and white kerbs, dark wet road, dull beech leaves and mixed forest are set; C5 rooms and the ridge meadows stay open', () => {
  assert.deepEqual(EIFEL_CROWN.kerbColours, [0x2f6b3c, 0xe8e6df]);
  assert.equal(EXPANSION_COURSES.find(row => row.id === 'eifel-crown').kerbColours, undefined);
  assert.equal(EIFEL_CROWN.effects.valleyMist.length, 4);
  assert.ok(EIFEL_CROWN.dampRoad.dampRoughness < EIFEL_CROWN.dampRoad.dryRoughness);
  const beeches = beechTreePlacements(scenery);
  assert.ok(beeches.length >= 150 && beeches.length <= 450, `beech count ${beeches.length}`);
  for (const row of beeches) assert.ok(Math.abs(row.lateral) >= road.halfWidthAt(row.s) + EIFEL_CROWN.scenery.forest.from, 'beeches stand in the wood, not on the run-off');
  assert.equal(EIFEL_CROWN.kitLook['ardennes-beech'].leafColour, 0x66755c);
  assert.ok(EIFEL_CROWN.groundLeaves.verge.from < EIFEL_CROWN.groundLeaves.verge.to);
  // The wood stands right behind the verge: spruce within 20 m of the road edge, and beech among it.
  const close = scenery.features.trees.filter(tree => !tree.farForest && Math.abs(tree.off) - road.halfWidthAt(tree.s) < 20);
  assert.ok(close.length > 700, `trees in the first 20 m: ${close.length}`);
  assert.ok(close.every(tree => Math.abs(tree.off) - road.halfWidthAt(tree.s) >= 12), 'nothing inside the run-off');
  assert.ok(beeches.some(row => Math.abs(row.lateral) - road.halfWidthAt(row.s) < 24), 'beech among the front rows');
  const near = scenery.features.trees.filter(tree => !tree.farForest).length;
  const far = scenery.features.trees.filter(tree => tree.farForest).length;
  assert.ok(near > 3000 && near <= 9000, `near trees ${near}`);
  assert.ok(far <= 5000, `far trees ${far}`);
  // Nothing planted in the rooms kept for the castle, village and reservoir (C5), nor the ridge meadows.
  const rooms = [
    [named('Castle Bend').s1 - 40, named('Wall Left').s1 + 40, -260, -90],
    [named('Castle Bend').s1 + 60, named('Beech Right').s0 + 80, -64, -12],
    [named('Reservoir Right').s0 - 120, named('Reservoir Right').s1 + 110, -260, -80],
    [named('Crown Climb').s0 - 30, named('Ridge Top').s1 + 30, -44, 44],
  ];
  for (const tree of scenery.features.trees) for (const [s0, s1, from, to] of rooms)
    assert.ok(!(tree.s >= s0 && tree.s <= s1 && tree.off >= from && tree.off <= to), `tree ${tree.id} stands in a kept-open room`);
});
