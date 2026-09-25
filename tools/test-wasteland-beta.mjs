import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeatureFlags, EXPERIMENTAL_KEY, FEATURE_STATES } from '../src/feature-flags.js';
import { experimentalPanel } from '../src/experimental-ui.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    values,
    storage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
};

test('actual Wasteland beta catalog is opt-in and survives recreated memory-only sessions', () => {
  assert.deepEqual(FEATURE_STATES, {
    'career-backup': 'dev', wasteland2: 'beta', 'hidden-road': 'beta',
  });
  const { values, storage } = memoryStorage();
  const make = (search = '') => createFeatureFlags({ storage, qa: false, search });
  const names = ['wasteland2', 'hidden-road'];
  const initial = make('?flags=wasteland2,hidden-road,career-backup');
  assert.deepEqual(initial.betaFeatures(), names);
  assert.equal(initial.experimental(), false);
  for (const name of [...names, 'career-backup']) assert.equal(initial.enabled(name), false);
  assert.equal(initial.enabled('roadside-destruction'), false);
  assert.equal(initial.enabled('unknown'), false);
  const panel = experimentalPanel(initial);
  assert.match(panel, /WASTELAND2/);
  assert.match(panel, /HIDDEN ROAD/);
  assert.doesNotMatch(panel, /CAREER BACKUP|ROADSIDE DESTRUCTION|No early features are available yet/);

  assert.deepEqual(initial.setExperimental(true), { enabled: true, saved: true });
  assert.equal(values.get(EXPERIMENTAL_KEY), 'true');
  const reopened = make();
  assert.equal(reopened.experimental(), true);
  for (const name of names) assert.equal(reopened.enabled(name), true);
  assert.equal(reopened.enabled('career-backup'), false);
  assert.equal(reopened.enabled('roadside-destruction'), false);

  assert.deepEqual(reopened.setExperimental(false), { enabled: false, saved: true });
  assert.equal(values.get(EXPERIMENTAL_KEY), 'false');
  const afterOptOut = make();
  for (const name of [...names, 'career-backup']) assert.equal(afterOptOut.enabled(name), false);
  assert.equal(afterOptOut.experimental(), false);
});

test('production URL requests cannot enable dev or beta, while QA keeps named isolation', () => {
  const search = '?flags=wasteland2,hidden-road,career-backup,unknown,roadside-destruction';
  const production = createFeatureFlags({ storage: null, qa: false, search });
  for (const name of ['wasteland2', 'hidden-road', 'career-backup', 'unknown',
    'roadside-destruction']) assert.equal(production.enabled(name), false);

  const qa = createFeatureFlags({ storage: null, qa: true, search });
  for (const name of ['wasteland2', 'hidden-road', 'career-backup']) {
    assert.equal(qa.enabled(name), true);
  }
  assert.equal(qa.enabled('unknown'), false);
  assert.equal(qa.enabled('roadside-destruction'), false);
  const plainQa = createFeatureFlags({ storage: null, qa: true });
  for (const name of ['wasteland2', 'hidden-road', 'career-backup']) {
    assert.equal(plainQa.enabled(name), false);
  }
});
