import assert from 'node:assert/strict';
import { createFeatureFlags, EXPERIMENTAL_KEY, FEATURE_STATES } from '../src/feature-flags.js';

const catalog = { photo: 'dev', crew: 'beta', arena: 'on' };
const data = new Map();
const storage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
};
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

check(FEATURE_STATES['career-backup'] === 'dev' && FEATURE_STATES.wasteland2 === 'on'
  && FEATURE_STATES['hidden-road'] === 'on' && !Object.hasOwn(FEATURE_STATES, 'roadside-destruction')
  && FEATURE_STATES.scrapdome === 'dev' && Object.keys(FEATURE_STATES).length === 4,
  'career backup and the Scrapdome stay in QA; Wasteland 2 and Hidden Road are released; roadside destruction has no switch');
const productionFlags = createFeatureFlags({ storage: null, qa: false });
check(!productionFlags.enabled('roadside-destruction'), 'retired roadside switch is no longer recognized');
check(productionFlags.enabled('wasteland2') && productionFlags.enabled('hidden-road'),
  'production has the released Wasteland switches on without any menu choice');
check(!productionFlags.enabled('career-backup') && !productionFlags.enabled('scrapdome'),
  'production keeps the QA-only career backup and Scrapdome off');
const productionQuery = createFeatureFlags({ storage: null, qa: false, search: '?flags=career-backup' });
check(!productionQuery.enabled('career-backup'), 'production URL flags cannot enable dev');
const release = createFeatureFlags({ catalog, storage, search: '?flags=photo,crew', qa: false });
check(!release.enabled('photo') && !release.enabled('crew'), 'release ignores QA URL switches');
check(release.enabled('arena') && !release.enabled('unknown'), 'only known on switches are active');
check(release.state('crew') === 'beta' && release.state('unknown') === null, 'states are explicit');
check(release.betaFeatures().join(',') === 'crew', 'only beta features count as beta');

const saved = release.setExperimental(true);
check(saved.enabled && saved.saved && data.get(EXPERIMENTAL_KEY) === 'true', 'toggle saves on this computer');
check(release.enabled('crew') && !release.enabled('photo'), 'Experimental enables beta but never dev');
const reopened = createFeatureFlags({ catalog, storage, qa: false });
check(reopened.experimental() && reopened.enabled('crew'), 'beta choice survives a new session');
reopened.setExperimental(false);
check(!createFeatureFlags({ catalog, storage, qa: false }).enabled('crew'), 'turning off persists');

const qa = createFeatureFlags({ catalog, storage, qa: true, search: '?flags=photo,crew,unknown' });
check(qa.enabled('photo') && qa.enabled('crew'), 'QA URL enables requested dev and beta switches');
check(!qa.enabled('unknown') && qa.enabled('arena'), 'unknown URL names are ignored');
const plainQa = createFeatureFlags({ catalog, storage, qa: true });
check(!plainQa.enabled('photo') && !plainQa.enabled('crew'), 'QA switches require an explicit request');

const overridden = createFeatureFlags({ catalog, storage, overrides: { photo: true, arena: false } });
check(overridden.enabled('photo') && !overridden.enabled('arena'), 'tests can override known switches');
check(!overridden.enabled('unknown'), 'test overrides cannot invent switches');
const blocked = createFeatureFlags({ catalog, storage: {
  getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); },
} });
check(!blocked.experimental(), 'blocked storage defaults off');
check(blocked.setExperimental(true).saved === false && blocked.enabled('crew'), 'blocked storage still allows a session preview');
assert.throws(() => createFeatureFlags({ catalog: { 'bad name': 'beta' } }), /Invalid feature switch/); checks++;
assert.throws(() => createFeatureFlags({ catalog: { future: 'released' } }), /Invalid feature switch/); checks++;

console.log(`Feature switches: ${checks} state, QA, persistence and override checks passed.`);
