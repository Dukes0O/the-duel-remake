import assert from 'node:assert/strict';
import test from 'node:test';
import {PANORAMA_RIDGE_NIGHT, manifest as nightManifest} from '../src/circuits/panorama-ridge-night.js';
import {HARBOUR_LIGHTS_DUSK, manifest as duskManifest} from '../src/circuits/harbour-lights-dusk.js';
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

test('lighting variants append as separate dev events with native parent-podium access', () => {
  const off = createFeatureFlags({storage: null, qa: false, search: ''});
  const on = createFeatureFlags({storage: null, qa: false, search: '', overrides: Object.fromEntries(lighting.map(([d]) => [d.flag, true]))});
  const defaultIds = circuitDefinitions(off).map(d => d.id);
  const qaIds = circuitDefinitions(on).map(d => d.id);
  for (const [definition, manifest, parent, , order] of lighting) {
    assert.equal(manifest.state, 'dev');assert.equal(manifest.price, 0);
    assert.equal(manifest.releaseOrder, order);assert.equal(definition.flag, definition.id);
    assert.equal(definition.stage, parent.stage, 'same physical generation identity');
    assert.deepEqual(manifest.unlock, {kind: 'default-gp-podium', defaultEventId: parent.id});
    assert.ok(!defaultIds.includes(definition.id));assert.ok(qaIds.includes(definition.id));
    assert.equal(CIRCUIT_ENTRIES.find(e => e.manifest.id === definition.id).definition, definition);
    const added = !COURSE.includes(definition);if (added) COURSE.push(definition);
    try {
      const profile = {...createProfile(), courses: {version: 1, unlocked: [parent.id]}};
      assert.equal(isCourseUnlocked(profile, definition), false);
      assert.equal(isCourseUnlocked({...profile, grandPrixPodiums: [parent.id]}, definition), true);
      assert.equal(isCourseUnlocked({...profile, courses: {version: 1, unlocked: []}, grandPrixPodiums: [parent.id]}, definition), false);
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
