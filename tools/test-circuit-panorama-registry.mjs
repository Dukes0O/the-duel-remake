import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES, isCourseUnlocked, purchaseCourse} from '../src/course-access.js';
import {COURSE} from '../src/config.js';
import {supportsCombat} from '../src/combat-weapons.js';
import {CIRCUIT_MANIFESTS, BASE_COURSE_COUNT} from '../src/circuit-manifests.js';
import {createProfile} from '../src/progression.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import {GRAND_PRIX_COURSES} from '../src/race-field.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {manifest as ownedManifest, PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';

// Independent accepted metadata belongs to this course, so another course can join without a shared edit.
test('panorama-ridge retains its accepted registry identity and access', () => {
  const id = 'panorama-ridge', definition = PANORAMA_RIDGE;
  assert.deepEqual([definition.id, definition.flag, definition.stage], [id, id, 16]);
  assert.deepEqual([ownedManifest.id, ownedManifest.flag, ownedManifest.state, ownedManifest.price, ownedManifest.grandPrix, ownedManifest.releaseOrder],
    [id, id, 'on', 1600, true, 3]);
  assert.equal(FEATURE_STATES[id], 'on');
  assert.equal(COURSE_PRICES[id], 1600);
  assert.equal(GRAND_PRIX_COURSES.includes(id), true);
  assert.equal(createFeatureFlags({storage:null, qa:false}).enabled(id), true);
  assert.equal(supportsCombat(definition), false);
  assert.equal(definition.noCombat, true); assert.equal(definition.hasRival, true);
  const enabled = CIRCUIT_MANIFESTS.filter(row => row.state === 'on');
  const publicIndex = COURSE.findIndex(row => row.id === id);
  assert.equal(publicIndex, BASE_COURSE_COUNT + enabled.findIndex(row => row.id === id));
  assert.equal(publicIndex, 19, 'Panorama Ridge keeps its historical public position after Harbour Lights');
  assert.deepEqual(COURSE.slice(publicIndex).map(row => row.id), ['panorama-ridge', 'summit-run', 'summit-time-attack'], 'the two approved Summit events append after Panorama');
  assert.equal(COURSE[publicIndex - 1].id, 'harbour-lights');
  const fresh = createProfile();
  assert.equal(isCourseUnlocked(fresh, id), false);
  const poor = purchaseCourse({...fresh, credits:1599}, id);
  assert.equal(poor.ok, false); assert.equal(poor.profile.credits, 1599);
  const rich = {...fresh, credits:2500}, bought = purchaseCourse(rich, id);
  assert.equal(bought.ok, true); assert.equal(bought.cost, 1600); assert.equal(bought.profile.credits, 900);
  assert.deepEqual(bought.profile.courses.unlocked, [...rich.courses.unlocked, id].filter(value => COURSE.some(row => row.id === value)));
  assert.equal(isCourseUnlocked(bought.profile, id), true); assert.equal(isCourseUnlocked(bought.profile, 'pacific-canyon'), true);
  for (const other of CIRCUIT_MANIFESTS.filter(row => row.id !== id)) assert.equal(isCourseUnlocked(bought.profile, other.id), false, 'buying this course never grants another paid course');
  const unowned = courseAccessPanel(fresh, 0, ''), owned = courseAccessPanel(bought.profile, publicIndex, '');
  assert.match(unowned, /Panorama Ridge/); assert.match(unowned, /1,?600 CR/);
  assert.doesNotMatch(unowned, /UNLOCKED<\/span><h3>Panorama Ridge/);
  assert.match(owned, /UNLOCKED<\/span><h3>Panorama Ridge/);
});
