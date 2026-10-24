import assert from 'node:assert/strict';
import test from 'node:test';
import { defineZone, ZONE_FORMAT_VERSION } from '../src/deep/deep-zone.js';
import { createZoneFloor } from '../src/deep/zone-floor.js';

// Authored test data only: no course registry or production coast coordinates.
const creatures = ['silver-school', 'reef-fish', 'turtle', 'ray', 'manta',
  'sea-lion', 'otter', 'crab', 'moray', 'grouper', 'reef-shark', 'jellyfish',
  'whale', 'octopus'];
const pearlIds = ['kelp-1', 'kelp-2', 'kelp-3', 'reef-1', 'reef-2', 'reef-3',
  'night-1', 'night-2', 'night-3'];
function authoredZone() {
  return {
    id: 'test-zone', circuit: 'test-circuit', switch: 'the-deep',
    ramp: { atDistance: 0, side: 'left', length: 120, endDepth: 8 },
    trail: [
      { x: 0, z: 0, depth: 4, width: 8, surface: 'sea-floor' },
      { x: 0, z: 40, depth: 8, width: 10, surface: 'sea-floor', kelp: 1, grass: .5, rock: 0 },
      { x: 30, z: 40, depth: 12, width: 12, surface: 'sea-floor', kelp: 0, grass: 1, rock: .5 },
      { x: 30, z: 0, depth: 6, width: 8, surface: 'sea-floor', kelp: .25, grass: 0, rock: 1 },
    ],
    places: [{ id: 'test-shallows', name: ' Test Shallows ', fromIndex: 3, toIndex: 1 }],
    pearls: pearlIds.map((id, i) => ({ id, trailIndex: i % 4, offset: i - 4 })),
    spots: creatures.map((creature, i) => ({ creature, trailIndex: i % 4, count: i + 1 })),
  };
}
function rejected(change, path) {
  const data = authoredZone();
  change(data);
  assert.throws(() => defineZone(data), error => error instanceof TypeError &&
    error.message.includes(path), `invalid ${path} must be reported to the author`);
}
function frozen(value) {
  if (value && typeof value === 'object') {
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) frozen(child);
  }
}

test('version 1 preserves the complete authored contract and defaults only absent look', () => {
  assert.equal(ZONE_FORMAT_VERSION, 1);
  const source = authoredZone(), before = structuredClone(source), zone = defineZone(source);
  assert.deepEqual(source, before);
  assert.deepEqual(Object.keys(zone), ['id', 'circuit', 'switch', 'ramp', 'trail', 'places', 'pearls', 'spots']);
  assert.deepEqual(zone.ramp, source.ramp);
  assert.deepEqual(zone.places, source.places);
  assert.deepEqual(zone.pearls, source.pearls);
  assert.deepEqual(zone.spots, source.spots);
  assert.deepEqual(zone.trail[0], { x: 0, z: 0, depth: 4, width: 8,
    surface: 'sea-floor', kelp: 0, grass: 0, rock: 0 });
  assert.deepEqual(zone.trail.slice(1), source.trail.slice(1));
  assert.equal(zone.trail.length, 4, 'closing segment is implicit, not a fifth point');
  assert.equal(zone.places[0].name, ' Test Shallows ', 'authored text is not normalized');
  assert.deepEqual(JSON.parse(JSON.stringify(zone)), zone, 'output is plain serializable data');
  frozen(zone);
});

test('zone and place ids fit the existing persisted 80-character boundary', () => {
  const source = authoredZone(), eighty = 'a'.repeat(80);
  source.id = eighty;
  source.places[0].id = eighty;
  source.circuit = 'c'.repeat(81);
  const zone = defineZone(source);
  assert.equal(zone.id, eighty);
  assert.equal(zone.places[0].id, eighty);
  assert.equal(zone.circuit, source.circuit, 'circuit metadata has no persisted id bound');
  rejected(data => { data.id = 'a'.repeat(81); }, 'id');
  rejected(data => { data.places[0].id = 'a'.repeat(81); }, 'places[0].id');
});
test('the frozen copy shares no mutable data with its caller', () => {
  const source = authoredZone(), zone = defineZone(source), expected = structuredClone(zone);
  assert.equal(Object.isFrozen(source), false);
  source.id = 'changed';
  source.ramp.length = 9;
  source.trail[0].x = 90;
  source.trail[1].kelp = 0;
  source.places[0].name = 'Changed';
  source.pearls[0].offset = 90;
  source.spots[0].count = 90;
  for (const key of ['trail', 'places', 'pearls', 'spots']) source[key].push({});
  assert.deepEqual(zone, expected);
  assert.throws(() => { zone.ramp.length = 9; }, TypeError);
  assert.throws(() => zone.spots.push({}), TypeError);
  assert.throws(() => { zone.trail[1].kelp = 0; }, TypeError);
});

test('authored subsets, wrapped places and repeated creature spots are valid', () => {
  const source = authoredZone();
  source.ramp.side = 'right';
  source.ramp.endDepth = 0;
  source.trail[0].depth = 0;
  source.pearls = [];
  source.spots = [{ creature: 'turtle', trailIndex: 0, count: 1 },
    { creature: 'turtle', trailIndex: 3, count: 2 }];
  const zone = defineZone(source);
  assert.deepEqual(zone, { ...source, trail: source.trail.map((p, i) =>
    i === 0 ? { ...p, kelp: 0, grass: 0, rock: 0 } : p) });
  source.places = [];
  source.spots = [];
  assert.equal(defineZone(source).places.length, 0);
  assert.equal(defineZone(source).spots.length, 0);
  Object.assign(source.trail[0], { x: -5, z: -10 });
  assert.equal(defineZone(source).trail[0].x, -5);
  assert.equal(defineZone(source).trail[0].z, -10);
});

test('ids, switch, exact record shapes and required lists fail before consumption', () => {
  for (const input of [null, [], new Date(), 'zone']) assert.throws(() => defineZone(input), TypeError);
  for (const key of ['id', 'circuit']) for (const value of ['', 'Upper', 'bad slug', '-bad', 'bad-', 'a--b', 7])
    rejected(data => { data[key] = value; }, key);
  rejected(data => { data.switch = 'hidden-road'; }, 'switch');
  rejected(data => { delete data.switch; }, 'switch');
  rejected(data => { data.extra = true; }, 'extra');
  rejected(data => { data.ramp = new Date(); }, 'ramp');
  rejected(data => { data.ramp.extra = true; }, 'ramp.extra');
  rejected(data => { data.trail[0].extra = true; }, 'trail[0].extra');
  for (const key of ['trail', 'places', 'pearls', 'spots']) {
    rejected(data => { delete data[key]; }, key);
    rejected(data => { data[key] = {}; }, key);
    rejected(data => { data[key] = [null]; }, key);
  }
});

test('ramp metadata must be finite, nonnegative and positive where required', () => {
  for (const key of ['atDistance', 'length', 'endDepth']) {
    for (const value of [NaN, Infinity, -Infinity, -1, '8', null, undefined])
      rejected(data => { data.ramp[key] = value; }, `ramp.${key}`);
    rejected(data => { delete data.ramp[key]; }, `ramp.${key}`);
  }
  rejected(data => { data.ramp.length = 0; }, 'ramp.length');
  for (const side of ['', 'LEFT', 'up', null]) rejected(data => { data.ramp.side = side; }, 'ramp.side');
});

test('trail geometry, surface and authored look reject invalid values without coercion', () => {
  rejected(data => { data.trail = data.trail.slice(0, 2); }, 'trail');
  for (const key of ['x', 'z', 'depth', 'width']) {
    for (const value of [NaN, Infinity, -Infinity, '4', null, undefined])
      rejected(data => { data.trail[0][key] = value; }, `trail[0].${key}`);
    rejected(data => { delete data.trail[0][key]; }, `trail[0].${key}`);
  }
  rejected(data => { data.trail[0].depth = -1; }, 'trail[0].depth');
  for (const width of [0, -1]) rejected(data => { data.trail[0].width = width; }, 'trail[0].width');
  rejected(data => { data.trail[0].surface = 'asphalt'; }, 'trail[0].surface');
  for (const key of ['kelp', 'grass', 'rock']) for (const value of [-.01, 1.01, NaN, Infinity, '0', null, undefined])
    rejected(data => { data.trail[0][key] = value; }, `trail[0].${key}`);
  rejected(data => { Object.assign(data.trail[1], { x: 0, z: 0 }); }, 'trail[1]');
  rejected(data => { Object.assign(data.trail[3], { x: 0, z: 0 }); }, 'trail[3]');
  rejected(data => { data.trail.push({ ...data.trail[0] }); }, 'trail[4]');
});

test('places have unique slug ids, names and in-bounds integer references', () => {
  for (const id of ['', 'Bad Place', 'place_1']) rejected(data => { data.places[0].id = id; }, 'places[0].id');
  for (const name of ['', '  ', null, 3]) rejected(data => { data.places[0].name = name; }, 'places[0].name');
  rejected(data => { data.places.push({ ...data.places[0] }); }, 'places[1].id');
  for (const key of ['fromIndex', 'toIndex']) for (const value of [-1, 4, .5, NaN, Infinity, '0', null])
    rejected(data => { data.places[0][key] = value; }, `places[0].${key}`);
  rejected(data => { data.places[0].extra = true; }, 'places[0].extra');
});

test('pearls use only the nine ids once each, with valid references and signed offsets', () => {
  for (const id of ['kelp-0', 'kelp-4', 'reef-4', 'night-4', 'KELP-1', 'unknown'])
    rejected(data => { data.pearls[0].id = id; }, 'pearls[0].id');
  rejected(data => { data.pearls.push({ ...data.pearls[0] }); }, 'pearls[9].id');
  for (const value of [-1, 4, .5, NaN, Infinity, '0', null])
    rejected(data => { data.pearls[0].trailIndex = value; }, 'pearls[0].trailIndex');
  for (const value of [NaN, Infinity, -Infinity, '0', null, undefined])
    rejected(data => { data.pearls[0].offset = value; }, 'pearls[0].offset');
  rejected(data => { data.pearls[0].extra = true; }, 'pearls[0].extra');
});

test('spots use all fourteen creature ids, valid references and positive whole counts', () => {
  for (const creature of ['shark', 'plankton', 'TURTLE', '', null])
    rejected(data => { data.spots[0].creature = creature; }, 'spots[0].creature');
  for (const value of [-1, 4, .5, NaN, Infinity, '0', null])
    rejected(data => { data.spots[0].trailIndex = value; }, 'spots[0].trailIndex');
  for (const count of [0, -1, .5, NaN, Infinity, '1', null, undefined])
    rejected(data => { data.spots[0].count = count; }, 'spots[0].count');
  rejected(data => { data.spots[0].extra = true; }, 'spots[0].extra');
});

test('validated data drives the unchanged floor loop, ground and left-positive coordinates', () => {
  const source = authoredZone(), raw = createZoneFloor(source), floor = createZoneFloor(defineZone(source));
  assert.equal(floor.length, 140);
  assert.deepEqual(floor.bounds, raw.bounds);
  assert.deepEqual(floor.pointAt(20, 3), { x: 3, z: 20 });
  assert.equal(floor.sample(3, 20).lateral, 3);
  assert.equal(floor.sample(-3, 20).lateral, -3);
  assert.equal(floor.floorHeight(3, 20), -6);
  assert.deepEqual(floor.pointAt(125, 0), { x: 15, z: 0 }, 'implicit last-to-first segment');
  assert.deepEqual(floor.pointAt(140, 0), { x: 0, z: 0 });
  assert.deepEqual(floor.pointAt(-15, 0), floor.pointAt(125, 0));
  for (let along = 0; along <= 280; along += 2) {
    assert.deepEqual(floor.frameAt(along), raw.frameAt(along));
    assert.equal(floor.trailHeight(along), raw.trailHeight(along));
    for (const lateral of [-20, -3, 0, 3, 20]) {
      const p = floor.pointAt(along, lateral);
      assert.deepEqual(p, raw.pointAt(along, lateral));
      assert.deepEqual(floor.sample(p.x, p.z), raw.sample(p.x, p.z));
      assert.equal(floor.floorHeight(p.x, p.z), raw.floorHeight(p.x, p.z));
    }
  }
  for (const look of ['kelp', 'grass', 'rock']) assert.equal(floor.coverLength(look), raw.coverLength(look));
  for (const method of ['kelpPlacements', 'seagrassPlacements', 'rockPlacements', 'pebblePlacements'])
    assert.deepEqual(floor[method](1989, 8), raw[method](1989, 8));
});

// THE_DEEP 10.1 story additions: the optional `finds` field is checked like pearls.
const finds = () => [
  { id: 'sirena-badge', trailIndex: 1, offset: 2 },
  { id: 'sirena-car', trailIndex: 3, offset: -1.5, below: 3 },
];
test('a zone with finds keeps them frozen, defaults below to 0, and one without loads exactly as before', () => {
  const source = authoredZone();
  assert.equal(Object.hasOwn(defineZone(source), 'finds'), false, 'no finds field is added to an older zone');
  source.finds = finds();
  const before = structuredClone(source), zone = defineZone(source);
  assert.deepEqual(source, before);
  assert.deepEqual(Object.keys(zone), ['id', 'circuit', 'switch', 'ramp', 'trail', 'places', 'pearls', 'spots', 'finds']);
  assert.deepEqual(zone.finds, [{ id: 'sirena-badge', trailIndex: 1, offset: 2, below: 0 },
    { id: 'sirena-car', trailIndex: 3, offset: -1.5, below: 3 }]);
  frozen(zone.finds);
  source.finds = [];
  assert.deepEqual(defineZone(source).finds, [], 'an empty list is still a list');
});

test('finds are checked like pearls: unique ids, trail indices in bounds, finite offsets, below from 0 to 10', () => {
  rejected(data => { data.finds = finds(); data.finds[1].id = 'sirena-badge'; }, 'finds[1].id');
  rejected(data => { data.finds = finds(); data.finds[0].id = 'Not A Slug'; }, 'finds[0].id');
  rejected(data => { data.finds = finds(); data.finds[0].trailIndex = 4; }, 'finds[0].trailIndex');
  rejected(data => { data.finds = finds(); data.finds[0].trailIndex = 1.5; }, 'finds[0].trailIndex');
  rejected(data => { data.finds = finds(); data.finds[1].offset = Infinity; }, 'finds[1].offset');
  rejected(data => { data.finds = finds(); delete data.finds[1].offset; }, 'finds[1].offset');
  rejected(data => { data.finds = finds(); data.finds[1].below = -.1; }, 'finds[1].below');
  rejected(data => { data.finds = finds(); data.finds[1].below = 10.1; }, 'finds[1].below');
  rejected(data => { data.finds = finds(); data.finds[1].below = NaN; }, 'finds[1].below');
  rejected(data => { data.finds = finds(); data.finds[0].depth = 1; }, 'finds[0].depth');
  rejected(data => { data.finds = 'sirena'; }, 'finds');
  const edge = authoredZone();
  edge.finds = [{ id: 'bottom', trailIndex: 0, offset: 0, below: 0 }, { id: 'top', trailIndex: 3, offset: 0, below: 10 }];
  assert.equal(defineZone(edge).finds.length, 2, 'below 0 and 10 are both allowed');
});
