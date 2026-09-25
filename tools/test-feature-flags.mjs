import assert from 'node:assert/strict';
import { createFeatureFlags, EXPERIMENTAL_KEY, FEATURE_STATES } from '../src/feature-flags.js';
import { experimentalPanel } from '../src/experimental-ui.js';

const catalog = { photo: 'dev', crew: 'beta', arena: 'on' };
const data = new Map();
const storage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
};
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

check(FEATURE_STATES['career-backup'] === 'dev' && FEATURE_STATES.wasteland2 === 'beta'
  && FEATURE_STATES['hidden-road'] === 'beta' && !Object.hasOwn(FEATURE_STATES, 'roadside-destruction')
  && Object.keys(FEATURE_STATES).length === 3,
  'career backup stays in QA; Wasteland 2 and Hidden Road are Experimental beta; roadside destruction has no switch');
const productionData = new Map();
const productionStorage = {
  getItem: key => productionData.get(key) ?? null,
  setItem: (key, value) => productionData.set(key, value),
};
const productionFlags = createFeatureFlags({ storage: productionStorage, qa: false });
check(!productionFlags.enabled('roadside-destruction'), 'retired roadside switch is no longer recognized');
check(!productionFlags.enabled('wasteland2'), 'production starts with Wasteland 2 switched off');
check(!productionFlags.enabled('hidden-road'), 'production starts with Hidden Road switched off');
check(!productionFlags.betaFeatures().includes('roadside-destruction'), 'Experimental cannot list the retired switch');
productionFlags.setExperimental(true);
check(productionFlags.enabled('wasteland2') && productionFlags.enabled('hidden-road'),
  'an explicit production opt-in enables both beta features');
check(!productionFlags.enabled('roadside-destruction') && !productionFlags.enabled('career-backup'),
  'Experimental cannot restore the retired switch or QA-only career backup');
productionFlags.setExperimental(false);
check(!productionFlags.enabled('wasteland2') && !productionFlags.enabled('hidden-road'),
  'an explicit production opt-out disables both beta features');
check(!productionFlags.enabled('roadside-destruction'), 'turning off Experimental does not restore the retired switch');
const productionQuery = createFeatureFlags({ storage: productionStorage, qa: false,
  search: '?flags=wasteland2,hidden-road,career-backup' });
check(!productionQuery.enabled('wasteland2') && !productionQuery.enabled('hidden-road')
  && !productionQuery.enabled('career-backup'), 'production URL flags cannot enable beta or dev');
const productionPanel = experimentalPanel(productionQuery);
check(productionPanel.includes('WASTELAND2') && productionPanel.includes('HIDDEN ROAD')
  && !productionPanel.includes('CAREER BACKUP') && !productionPanel.includes('ROADSIDE DESTRUCTION'),
  'real Experimental menu lists exactly the eligible beta features');
const release = createFeatureFlags({ catalog, storage, search: '?flags=photo,crew', qa: false });
check(!release.enabled('photo') && !release.enabled('crew'), 'release ignores QA URL switches');
check(release.enabled('arena') && !release.enabled('unknown'), 'only known on switches are active');
check(release.state('crew') === 'beta' && release.state('unknown') === null, 'states are explicit');
check(release.betaFeatures().join(',') === 'crew', 'menu lists only beta features');
const panel = experimentalPanel(release);
check(panel.includes('CREW') && !panel.includes('PHOTO') && !panel.includes('ARENA'), 'panel shows beta features only');
check(panel.includes('id="experimental-toggle"') && !panel.includes('checked'), 'panel begins switched off');

const saved = release.setExperimental(true);
check(saved.enabled && saved.saved && data.get(EXPERIMENTAL_KEY) === 'true', 'toggle saves on this computer');
check(release.enabled('crew') && !release.enabled('photo'), 'Experimental enables beta but never dev');
check(experimentalPanel(release).includes('type="checkbox" checked'), 'panel reflects the saved choice');
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
