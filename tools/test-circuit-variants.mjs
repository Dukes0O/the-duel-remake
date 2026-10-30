import {renderedGroundHeight} from '../src/rendered-ground.js';
import * as panoramaReverse from '../src/circuits/panorama-ridge-reverse.js';
import * as harbourReverse from '../src/circuits/harbour-lights-reverse.js';
import * as woodsReverse from '../src/circuits/tremblant-woods-reverse.js';
import {TREMBLANT_WOODS} from '../src/circuits/tremblant-woods.js';
import {createHash} from 'node:crypto';
import {hillHeight, basinReach} from '../src/circuit-hills.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {PANORAMA_RIDGE_NIGHT, manifest as nightManifest} from '../src/circuits/panorama-ridge-night.js';
import {HARBOUR_LIGHTS_DUSK, manifest as duskManifest} from '../src/circuits/harbour-lights-dusk.js';
import * as nightKogane from '../src/circuits/kogane-pass-night.js';
import {KOGANE_PASS} from '../src/circuits/kogane-pass.js';
import * as koganeReverse from '../src/circuits/kogane-pass-reverse.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {CIRCUIT_ENTRIES, circuitDefinitions} from '../src/circuit-manifests.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {sampleCourseLightPath, lightPathLook} from '../src/light-path.js';
import {isCourseUnlocked} from '../src/course-access.js';
import {createProfile} from '../src/progression.js';

const lighting = [[PANORAMA_RIDGE_NIGHT, nightManifest, PANORAMA_RIDGE, 'night', 7],
  [HARBOUR_LIGHTS_DUSK, duskManifest, HARBOUR_LIGHTS, 'dusk', 8]];

test('lighting variants are separate released events with access found from the air', () => {
  const ordinary = createFeatureFlags({storage: null, qa: false, search: ''});
  const off = createFeatureFlags({storage: null, qa: false, search: '', overrides: Object.fromEntries(lighting.map(([d]) => [d.flag, false]))});
  const defaultIds = circuitDefinitions(ordinary).map(d => d.id);
  const offIds = circuitDefinitions(off).map(d => d.id);
  for (const [definition, manifest, parent, , order] of lighting) {
    assert.equal(manifest.state, 'on');assert.equal(manifest.price, 0);
    assert.equal(manifest.releaseOrder, order);assert.equal(definition.flag, definition.id);
    assert.equal(definition.stage, parent.stage, 'same physical generation identity');
    assert.deepEqual(manifest.unlock, {kind: 'spotted-from-air', defaultEventId: parent.id});
    assert.ok(defaultIds.includes(definition.id), 'the ordinary game has it');assert.ok(!offIds.includes(definition.id), 'its own switch can still hide it');
    assert.equal(CIRCUIT_ENTRIES.find(e => e.manifest.id === definition.id).definition, definition);
    const added = !COURSE.includes(definition);if (added) COURSE.push(definition);
    try {
      const profile = {...createProfile(), courses: {version: 1, unlocked: [parent.id]}};
      assert.equal(isCourseUnlocked(profile, definition), false);
      const found = {heli: {version: 1, map: {version: 1, seen: [], found: [definition.id], table: false}}};
      assert.equal(isCourseUnlocked({...profile, grandPrixPodiums: [parent.id]}, definition), false, 'a podium no longer opens it');
      assert.equal(isCourseUnlocked({...profile, ...found}, definition), true);
      assert.equal(isCourseUnlocked({...profile, courses: {version: 1, unlocked: []}, ...found}, definition), false);
    } finally {if (added) COURSE.splice(COURSE.indexOf(definition), 1);}
  }
});

test('night and dusk use existing approved looks all race and leave parent geometry untouched', () => {
  for (const [definition, , parent, look] of lighting) {
    const before = JSON.stringify(parent);
    const inherited = Object.getOwnPropertyDescriptor(parent, 'kitPlacements');
    assert.equal(Object.getOwnPropertyDescriptor(definition, 'kitPlacements').get, inherited.get, 'preserve lazy kit getter');
    for (const seed of [1989, 42, 17]) {
      const course = new Course(definition, seed), donor = new Course(parent, seed);
      assert.deepEqual(course.samples, donor.samples, 'physical road is exactly the parent');
      assert.deepEqual(course.features.obstacles, donor.features.obstacles, 'physical obstacles unchanged');
      for (const distance of [0, course.length * .5, course.raceLength]) {
        const actual = sampleCourseLightPath(course, {distance});
        const expected = lightPathLook(look, parent.theme, parent.lightPath?.palette);
        assert.deepEqual(actual.settings, expected, 'use the current look without new lighting numbers');
      }
    }
    assert.equal(JSON.stringify(parent), before, 'immutable parent data');
  }
});

// Reverse acceptance uses the actual Course and native road builder, not a copied fixture.
const reverses = [panoramaReverse, harbourReverse, woodsReverse];
const parents = [PANORAMA_RIDGE, HARBOUR_LIGHTS, TREMBLANT_WOODS];
const parentPins = ['4344a85539f43631172bbb8f438c0f0499d3e4fd003015d53ff09d943ffbef1e',
  '4f5c15e528892111535bbdc305a764279516c37a5d8c7ec93a6ffa4955f304bd',
  'ffc85aaa625a8bee6c73fd003700ed6c3598fbd92547ddd53e70dba7bd4bfebb'];

test('released parents keep exact pre-edit road, ground and obstacle fingerprints', () => {
  parents.forEach((d, n) => {
    const hash = createHash('sha256');
    for (const seed of [1989, 42, 17]) {
      const c = new Course(d, seed), ground = [];
      for (let i = 0; i < 79; i++) for (const off of [-180, -70, -15, 0, 15, 70, 180]) ground.push(c.groundAt(c.length * i / 79, off));
      hash.update(JSON.stringify({samples: c.samples, ground, obstacles: c.features.obstacles}));
    }
    assert.equal(hash.digest('hex'), parentPins[n], d.id);
  });
});

test('reverse roads and terrain follow the physical donor, with rebuilt boards, kerbs and full pit', () => {
  reverses.forEach((module, n) => {
    const d = module.definition, parent = parents[n], before = JSON.stringify(parent);
    assert.equal(module.manifest.state, 'on');assert.equal(module.manifest.releaseOrder, 9 + n);
    assert.deepEqual(module.manifest.unlock, {kind: 'spotted-from-air', defaultEventId: parent.id});
    for (const seed of [1989, 42, 17]) {
      const c = new Course(d, seed), donor = new Course(parent, seed), offset = d.terrainDonor.offset;
      const anchor = donor.worldAt(offset);
      assert.ok(Math.abs(c.length - donor.length) < 1e-6);
      for (let i = 0; i < 97; i++) for (const off of [-110, -40, -10, 0, 10, 40, 110]) {
        const s = c.length * (i + .25) / 97, a = c.worldAt(s, off), b = donor.worldAt(offset - s, -off);
        const centre = c.worldAt(s), oldCentre = donor.worldAt(offset - s);
        assert.ok(Math.hypot(centre.x - (anchor.x - oldCentre.x), centre.z - (anchor.z - oldCentre.z)) < .01, 'native road centre within one centimetre');
        const headingError = Math.abs(Math.atan2(Math.sin(a.heading - b.heading), Math.cos(a.heading - b.heading)));
        assert.ok(headingError < .0002, 'native road tangent interpolation');
        assert.ok(Math.hypot(a.x - (anchor.x - b.x), a.z - (anchor.z - b.z)) < .01 + Math.abs(off) * .0002, 'road-space offset follows the native centre/tangent bounds');
        assert.ok(Math.abs(a.y - b.y) < .002, 'native reversed elevation');
        // Native pit paving is deliberately rebuilt at the moved start, not donor ground.
        if (!c.pitLane || s < c.pitLane.entry || s > c.pitLane.exit || Math.abs(off) > 25)
          assert.ok(Math.abs(c.groundAt(s, off).y - donor.groundAt(offset - s, -off).y) < 1e-8, 'same physical terrain');
      }
      assert.deepEqual(c.features.boards, c.script.boards, 'boards rebuilt for incoming reverse corners');
      assert.deepEqual(c.features.kerbs, c.script.kerbs);
      const oldTurns = donor.script.pieces.filter(p => p.kind === 'turn');
      for (const p of c.script.pieces.filter(p => p.kind === 'turn')) assert.equal(p.dir, -oldTurns.find(o => o.name === p.name).dir);
      if (n === 0) {
        assert.equal(c.pitLane.side, 1);assert.equal(d.ridgeLandform.side, 1);
        assert.ok(Math.abs(c.pitLane.exit - c.pitLane.entry - 451.9821523470663) < 1e-6, 'full no-wrap service bay');
        assert.ok(d.kitPlacements.filter(p => p.id === 'pit-garage').every(p => p.lateral > 0 && p.s > c.pitLane.entry && p.s < c.pitLane.exit));
      } else assert.equal(c.pitLane, undefined, 'visual paddock only');
    }
    assert.equal(JSON.stringify(parent), before, 'parent descriptor and lazy kit data immutable');
  });
});

test('reverse hill, lake and chairlift keep their physical orientation', () => {
  const d = reverses[2].definition, hill = d.hills[0], old = TREMBLANT_WOODS.hills[0];
  for (const du of [-80, -20, 0, 62, 100]) for (const dv of [-60, -12, 0, 40])
    assert.ok(Math.abs(hillHeight(hill, -du, -dv) - hillHeight(old, du, dv)) < 1e-10);
  for (const du of [-200, -90, 10, 190]) for (const dv of [-70, 20, 60])
    assert.ok(Math.abs(basinReach(d.basins[0], -du, -dv) - basinReach(TREMBLANT_WOODS.basins[0], du, dv)) < 1e-10);
  assert.deepEqual(d.effects.lift.towers, TREMBLANT_WOODS.effects.lift.towers.map(x => -x).reverse());
  const towers = d.kitPlacements.filter(p => p.id === 'chairlift-tower');
  assert.deepEqual(towers.map(p => p.lateral), d.effects.lift.towers, 'actual animation tower order is increasing');
  const oldChairs = TREMBLANT_WOODS.kitPlacements.filter(p => p.ride?.role === 'chair');
  const chairs = d.kitPlacements.filter(p => p.ride?.role === 'chair');
  chairs.forEach((p, i) => {
    assert.equal(p.ride.line, 1 - oldChairs[i].ride.line, 'physical return cable stays the return cable');
    assert.equal(p.ride.k, (p.ride.count - oldChairs[i].ride.k) % p.ride.count, 'initial chair position follows physical reversal');
  });
  assert.deepEqual(d.effects.lift.lines, TREMBLANT_WOODS.effects.lift.lines.map(x => -x).reverse());
});


test('Woods reverse authored distance boards face the incoming corner rather than its exit', () => {
  const d = woodsReverse.definition, c = new Course(d, 1989), wrap = s => ((s % c.length) + c.length) % c.length;
  const boards = d.kitPlacements.filter(p => /^braking-board-/.test(p.id));
  assert.ok(boards.length > 0, 'keep the additional authored approach boards');
  const marked = new Set(c.features.boards.map(p => p.name));
  for (const board of boards) {
    const distance = Number(board.id.split('-').at(-1));
    const corner = c.script.pieces.find(p => p.kind === 'turn' && Math.abs(wrap(board.s + distance) - wrap(p.s0)) < 1e-6);
    assert.ok(corner, 'every actual kit board gives its true incoming-corner distance');
    marked.add(corner.name);
    assert.ok(!c.features.boards.some(p => p.name === corner.name && p.distance === distance), 'do not double the existing native board');
    assert.equal(Math.sign(board.lateral), -corner.dir, 'outside of the incoming turn');
    assert.ok(Math.abs(Math.atan2(Math.sin(board.heading - Math.PI), Math.cos(board.heading - Math.PI))) < 1e-12, 'numbered face points at approaching traffic');
  }
  for (const name of ['Ridge Corner', 'Lodge Bend', 'Final Turn', 'Beaver Hairpin']) assert.ok(marked.has(name), 'retain authored warning at ' + name);
});


test('every reversed kit anchor has actual rendered terrain, including the mirrored lap-line paddock', () => {
  for (const {definition: d} of reverses) {
    const c = new Course(d,1989);
    for (const p of d.kitPlacements) {
      const point = c.groundAt(p.s,p.lateral);
      const height = renderedGroundHeight(c,{...point,s:p.s,off:p.lateral},{requireSurface:true});
      assert.ok(Number.isFinite(height), d.id + '/' + p.id + '@' + p.s + ': actual rendered terrain beneath anchor');
    }
  }
});


test('Panorama reverse fences stay behind the complete reversed road-width blend',()=>{
  const d=reverses[0].definition,c=new Course(d,1989);
  // Actual catch-fence asset x spans -2..2m, authored scaleX2 and heading PI/2.
  for(const p of d.kitPlacements.filter(p=>p.id==='catch-fence'))
    assert.ok(Math.abs(p.lateral)>=Math.max(...[-4,0,4].map(ds=>c.roadHalfWidthAt(p.s+ds)))+1.8-1e-12,
      'full4m half-panel keeps the approved fence setback');
});

// Kogane Pass (an open road, one run): Night is the parent in the existing night look from the start line, and
// Reverse is the same mountain climbed from the village. Both are free, found from the air and still behind their own switches.
test('Kogane Pass Night and Reverse: registered free, found from the air, behind their own switches', async () => {
  const {KOGANE_PASS, manifest: parentManifest} = await import('../src/circuits/kogane-pass.js');
  const {KOGANE_PASS_NIGHT, manifest: koganeNight} = await import('../src/circuits/kogane-pass-night.js');
  const koganeReverse = await import('../src/circuits/kogane-pass-reverse.js');
  const ordinary = createFeatureFlags({storage: null, qa: false, search: ''});
  const ids = circuitDefinitions(ordinary).map(d => d.id);
  for (const [definition, manifest, order] of [[KOGANE_PASS_NIGHT, koganeNight, 15], [koganeReverse.definition, koganeReverse.manifest, 16]]) {
    assert.deepEqual([manifest.state, manifest.price, manifest.grandPrix, manifest.releaseOrder], ['dev', 0, true, order]);
    assert.deepEqual(manifest.unlock, {kind: 'spotted-from-air', defaultEventId: 'kogane-pass'});
    assert.equal(definition.flag, definition.id);assert.equal(definition.stage, KOGANE_PASS.stage);
    assert.ok(manifest.releaseOrder > parentManifest.releaseOrder);
    assert.ok(!ids.includes(definition.id), 'nobody sees it before Kogane Pass is released');
    const on = createFeatureFlags({storage: null, qa: true, search: '?flags=' + definition.id});
    assert.ok(circuitDefinitions(on).some(d => d.id === definition.id), 'its own switch turns it on in a QA build');
  }
});

test('Kogane Pass Night is dark from the start line and leaves the road and kit exactly the parent\'s', () => {
  const night = nightKogane.KOGANE_PASS_NIGHT, parent = KOGANE_PASS;
  const course = new Course(night, 1989), donor = new Course(parent, 1989);
  assert.deepEqual(course.samples, donor.samples);
  assert.equal(Object.getOwnPropertyDescriptor(night, 'kitPlacements').get, Object.getOwnPropertyDescriptor(parent, 'kitPlacements').get);
  for (const distance of [0, 800, course.length * .5, course.raceLength])
    assert.deepEqual(sampleCourseLightPath(course, {distance}).settings, lightPathLook('night', parent.theme, parent.lightPath?.palette));
  assert.equal(sampleCourseLightPath(donor, {distance: 0}).settings.nightAmount < 1, true, 'the day course starts at dusk');
});

test('Kogane Pass Reverse follows the physical mountain: an open road reversed, with its own boards and corners', () => {
  const d = koganeReverse.definition, parent = KOGANE_PASS;
  const before = JSON.stringify(parent);
  for (const seed of [1989, 42, 17]) {
    const c = new Course(d, seed), donor = new Course(parent, seed), end = donor.samples.at(-1);
    assert.ok(Math.abs(c.length - donor.length) < 1e-6);
    assert.equal(c.closed, false);assert.equal(d.terrainDonor.offset, donor.length);
    const turn = -(end.heading + Math.PI), anchor = donor.worldAt(donor.length);
    const turned = p => ({x: (p.x - anchor.x) * Math.cos(turn) + (p.z - anchor.z) * Math.sin(turn), z: -(p.x - anchor.x) * Math.sin(turn) + (p.z - anchor.z) * Math.cos(turn)});
    for (let i = 0; i < 97; i++) for (const off of [-60, -12, 0, 12, 60]) {
      const s = c.length * (i + .25) / 97, a = c.worldAt(s, off), b = donor.worldAt(donor.length - s, -off), t = turned(b);
      assert.ok(Math.hypot(a.x - t.x, a.z - t.z) < .01, 'the climbing road is the old road turned about its finish');
      assert.ok(Math.abs(a.y - b.y) < .002, 'same heights: the climb starts at the old finish height');
      assert.ok(Math.abs(c.groundAt(s, off).y - donor.groundAt(donor.length - s, -off).y) < 1e-8, 'same physical terrain');
    }
    assert.deepEqual(c.features.boards, c.script.boards, 'boards rebuilt for the incoming corners');
    const oldTurns = donor.script.pieces.filter(p => p.kind === 'turn');
    const newTurns = c.script.pieces.filter(p => p.kind === 'turn'), backwards = oldTurns.slice().reverse();
    newTurns.forEach((p, i) => assert.deepEqual([p.dir, p.name, p.radius], [-backwards[i].dir, backwards[i].name, backwards[i].radius]));
    assert.equal(c.sections[0].name, 'Village Run');assert.equal(c.sections.at(-1).name, 'Summit Lake');
    // The lake lies where it did (the other side of the road now), at the same place on the mountain.
    assert.equal(Math.round(d.basins[0].s), Math.round(c.length - parent.basins[0].s));assert.equal(d.basins[0].lateral, -parent.basins[0].lateral);
    assert.equal(Math.round(d.landmarkSound.s), Math.round(c.length - parent.landmarkSound.s));
  }
  // The lamp row and its light pools stay together: each pool lies at a lamp of the climb.
  const c = new Course(d, 1989), lamps = d.waterside.lamps[0];
  assert.equal(lamps.side, 1);
  for (const [x, z] of d.scenery.lampWash.pools) {
    const near = c.nearest(x, z);
    assert.ok(near.s >= lamps.from - 1 && near.s <= lamps.to + 1 && Math.abs((near.s - lamps.from) % lamps.every) < 1.5 ||
      Math.abs((near.s - lamps.from) % lamps.every - lamps.every) < 1.5, 'light pool at a lamp: ' + near.s);
  }
  assert.equal(JSON.stringify(parent), before, 'parent descriptor immutable');
});

test('Kogane Pass Reverse: every kit piece has real ground, walls hug the road and the gantries stand at both ends', () => {
  const d = koganeReverse.definition, c = new Course(d, 1989);
  for (const p of d.kitPlacements) assert.ok(Number.isFinite(renderedGroundHeight(c, {...c.groundAt(p.s, p.lateral), s: p.s, off: p.lateral}, {requireSurface: true})), p.id + '@' + p.s);
  const gantries = d.kitPlacements.filter(p => p.id === 'start-gantry').map(p => p.s).sort((a, b) => a - b);
  assert.deepEqual([gantries[0], Math.round(gantries[1])], [45, Math.round(c.length - 2)]);
  for (const p of d.kitPlacements.filter(p => p.id === 'armco-white')) assert.ok(Math.abs(p.lateral) > c.roadHalfWidthAt(p.s) + .9 && Math.abs(p.lateral) < c.roadHalfWidthAt(p.s) + 1.6, 'rail beside the climbing road edge');
});
