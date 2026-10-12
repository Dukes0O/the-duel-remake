import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES} from '../src/course-access.js';
import {COURSE} from '../src/config.js';
import {supportsCombat} from '../src/combat-weapons.js';
import {GRAND_PRIX_COURSES} from '../src/race-field.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {manifest as ownedManifest, PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';

// Independent accepted metadata belongs to this course, so another course can join without a shared edit.
test('panorama-ridge retains its accepted registry identity and access', () => {
  const id = 'panorama-ridge', definition = PANORAMA_RIDGE;
  assert.deepEqual([definition.id, definition.flag, definition.stage], [id, id, 16]);
  assert.deepEqual([ownedManifest.id, ownedManifest.flag, ownedManifest.state, ownedManifest.price, ownedManifest.grandPrix, ownedManifest.releaseOrder],
    [id, id, 'dev', 1600, false, 3]);
  assert.equal(FEATURE_STATES[id], 'dev');
  assert.equal(COURSE_PRICES[id], 1600);
  assert.equal(GRAND_PRIX_COURSES.includes(id), false);
  assert.equal(createFeatureFlags({storage:null, qa:false}).enabled(id), false);
  assert.equal(supportsCombat(definition), false);
  assert.equal(definition.noCombat, true); assert.equal(definition.hasRival, true);
  const publicIndex = COURSE.findIndex(row => row.id === id);
  assert.equal(publicIndex, -1);
});
