import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { FEATURE_STATES, createFeatureFlags } from '../src/feature-flags.js';

let muddyHollow = {};
try {
  muddyHollow = await import('../src/muddy-hollow.js');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

const seed = 1989;
const highCountry = COURSE.find(course => course.id === 'high-country');
const pacificCanyon = COURSE.find(course => course.id === 'pacific-canyon');
let checks = 0;
const failures = [];

function check(name, run) {
  checks++;
  try {
    run();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function api(name) {
  assert.equal(typeof muddyHollow[name], 'function', `${name} exists`);
  return muddyHollow[name];
}

function courseFor(definition = highCountry, enabled = true) {
  return new Course(definition, seed, { muddyHollow: enabled });
}

function zoneFor(course) {
  assert.ok(course.muddyHollow,
    'enabled High Country must expose its authored muddyHollow zone');
  return course.muddyHollow;
}

function pointFor(feature, label) {
  const point = feature?.center ?? feature?.point ?? feature;
  assert.ok(Number.isFinite(point?.x) && Number.isFinite(point?.z),
    `${label} exposes a finite world-space centre`);
  return point;
}

function spanFor(feature) {
  if (Number.isFinite(feature?.span)) return feature.span;
  if (Number.isFinite(feature?.diameter)) return feature.diameter;
  if (Number.isFinite(feature?.radius)) return feature.radius * 2;
  if (Number.isFinite(feature?.halfWidth)) return feature.halfWidth * 2;
  const bounds = feature?.bounds;
  if (bounds && [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite)) {
    return Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  }
  return NaN;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function ordinaryFingerprint(course) {
  return hash({
    samples: course.samples,
    sections: course.sections,
    features: course.features,
  });
}

check('muddy-hollow is a QA-only dev switch', () => {
  assert.equal(FEATURE_STATES['muddy-hollow'], 'dev',
    'muddy-hollow starts in dev');
  assert.equal(createFeatureFlags({ storage: null, qa: false,
    search: '?flags=muddy-hollow' }).enabled('muddy-hollow'), false,
  'production cannot enable a dev switch');
  assert.equal(createFeatureFlags({ storage: null, qa: true }).enabled('muddy-hollow'), false,
    'QA does not enable the Hollow unless it is requested');
  assert.equal(createFeatureFlags({ storage: null, qa: true,
    search: '?flags=muddy-hollow' }).enabled('muddy-hollow'), true,
  'an explicit QA request enables the Hollow');
});

check('installer affects High Country only', () => {
  const installMuddyHollow = api('installMuddyHollow');
  const high = courseFor(highCountry, false);
  installMuddyHollow(high);
  zoneFor(high);

  const other = courseFor(pacificCanyon, false);
  const before = ordinaryFingerprint(other);
  installMuddyHollow(other);
  assert.equal(other.muddyHollow, undefined,
    'installMuddyHollow ignores every course except high-country');
  assert.equal(ordinaryFingerprint(other), before,
    'an ignored install does not mutate another course');
});

check('course construction gates the zone explicitly', () => {
  assert.equal(courseFor(highCountry, false).muddyHollow, undefined,
    'flag-off High Country has no Hollow');
  zoneFor(courseFor(highCountry, true));
  assert.equal(courseFor(pacificCanyon, true).muddyHollow, undefined,
    'the enabled option cannot install the zone on another course');
});

check('zone exposes every phase-one authored landform', () => {
  const course = courseFor();
  const zone = zoneFor(course);
  const landforms = zone.landforms;
  assert.ok(landforms && typeof landforms === 'object',
    'the zone exposes authored landforms for later physics and rendering');
  assert.ok(landforms.ridge, 'the Alpine Summit ridge exists');
  assert.ok(landforms.valleyBowl, 'the Hollow valley bowl exists');
  assert.ok(landforms.hill, 'King of the Hill terrain exists');
  assert.equal(landforms.pits?.length, 3, 'the zone has exactly three mud-pit beds');
  assert.ok(landforms.pondBed, 'the shallow pond bed exists');
  assert.ok(Array.isArray(landforms.ramps) && landforms.ramps.length > 0,
    'the zone includes authored ramp terrain');

  const ridge = pointFor(landforms.ridge, 'ridge');
  const alpine = course.nearest(ridge.x, ridge.z, course.length / 2);
  assert.equal(course.sectionAt(alpine.s).name, 'Alpine Summit',
    'the hidden ridge belongs to the Alpine Summit section');
  const valleySpan = spanFor(landforms.valleyBowl);
  assert.ok(valleySpan >= 240 && valleySpan <= 360,
    `the Hollow valley is about 300 metres across (got ${valleySpan})`);
});

check('containment and height queries cover the authored geometry', () => {
  const zone = zoneFor(courseFor());
  assert.equal(typeof zone.contains, 'function', 'zone exposes contains(x, z)');
  assert.equal(typeof zone.heightAt, 'function', 'zone exposes heightAt(x, z)');

  const landforms = zone.landforms;
  const named = [
    ['ridge', landforms.ridge],
    ['valley bowl', landforms.valleyBowl],
    ['hill', landforms.hill],
    ['pond bed', landforms.pondBed],
    ...landforms.pits.map((pit, index) => [`mud pit ${index + 1}`, pit]),
    ...landforms.ramps.map((ramp, index) => [`ramp ${index + 1}`, ramp]),
  ];
  const heights = new Map();
  for (const [label, feature] of named) {
    const point = pointFor(feature, label);
    assert.equal(zone.contains(point.x, point.z), true,
      `${label} lies inside Muddy Hollow`);
    const height = zone.heightAt(point.x, point.z);
    assert.ok(Number.isFinite(height), `${label} has a finite authored height`);
    heights.set(label, height);
  }
  assert.ok(heights.get('ridge') > heights.get('valley bowl'),
    'the ridge rises above the valley bowl');
  assert.ok(heights.get('hill') > heights.get('valley bowl'),
    'King of the Hill rises above the valley bowl');
  assert.ok(landforms.pits.every((_, index) =>
    heights.get(`mud pit ${index + 1}`) < heights.get('valley bowl')),
  'all three pit beds sit below the valley floor');
  assert.ok(heights.get('pond bed') < heights.get('valley bowl'),
    'the pond bed sits below the valley floor');
  assert.equal(zone.contains(1_000_000, 1_000_000), false,
    'containment is bounded to the hidden valley');
});

check('zone geometry is deterministic for the same course seed', () => {
  const first = zoneFor(courseFor());
  const second = zoneFor(courseFor());
  assert.equal(hash(first.landforms), hash(second.landforms),
    'authored landform data repeats exactly');

  const points = [first.landforms.ridge, first.landforms.valleyBowl,
    first.landforms.hill, first.landforms.pondBed,
    ...first.landforms.pits, ...first.landforms.ramps]
    .map((feature, index) => pointFor(feature, `landform ${index + 1}`));
  assert.deepEqual(
    points.map(point => first.heightAt(point.x, point.z)),
    points.map(point => second.heightAt(point.x, point.z)),
    'height queries repeat exactly',
  );
  assert.deepEqual(
    points.map(point => first.contains(point.x, point.z)),
    points.map(point => second.contains(point.x, point.z)),
    'containment queries repeat exactly',
  );
});

check('installation preserves the racing line, scenery and RNG stream', () => {
  const ordinary = courseFor(highCountry, false);
  const enabled = courseFor(highCountry, true);
  zoneFor(enabled);

  assert.equal(ordinaryFingerprint(enabled), ordinaryFingerprint(ordinary),
    'Muddy Hollow does not change High Country samples, sections or scenery');
  assert.deepEqual(
    Array.from({ length: 16 }, () => enabled.rng.float()),
    Array.from({ length: 16 }, () => ordinary.rng.float()),
    'Muddy Hollow consumes no values from the course random stream',
  );
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Muddy Hollow phase 1: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
