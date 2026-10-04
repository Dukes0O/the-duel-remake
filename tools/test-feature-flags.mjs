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

check(FEATURE_STATES['career-backup'] === 'dev' && !Object.hasOwn(FEATURE_STATES, 'wasteland2')
  && FEATURE_STATES['hidden-road'] === 'on' && !Object.hasOwn(FEATURE_STATES, 'roadside-destruction')
  && !Object.hasOwn(FEATURE_STATES, 'scrapdome') && !Object.hasOwn(FEATURE_STATES, 'crash-physics')
  && !Object.hasOwn(FEATURE_STATES, 'crash-effects')
  && !Object.hasOwn(FEATURE_STATES, 'titan-climb') && !Object.hasOwn(FEATURE_STATES, 'muddy-hollow')
  && !Object.hasOwn(FEATURE_STATES, 'warlords') && FEATURE_STATES['fuel-run'] === 'on'
  && FEATURE_STATES.arsenal === 'on' && FEATURE_STATES['salt-flats'] === 'on'
  && FEATURE_STATES['bounty-hunt'] === 'on' && FEATURE_STATES['crew-gear'] === 'on'
  && Object.keys(FEATURE_STATES).length === 7,
  'Fuel Run, Bounty Hunt, Arsenal, Salt Flats and Crew gear are released (on, 4 October 2026); only career backup stays dev; Wasteland 2, Scrapdome, Titan climbing, Muddy Hollow and Warlords are released without switches');
const productionFlags = createFeatureFlags({ storage: null, qa: false });
check(!productionFlags.enabled('roadside-destruction'), 'retired roadside switch is no longer recognized');
check(!productionFlags.enabled('wasteland2') && productionFlags.enabled('hidden-road'),
  'retired Wasteland rules switch is absent and Hidden Road is released');
check(!productionFlags.enabled('career-backup'), 'production keeps career backup off');
check(productionFlags.enabled('fuel-run') && productionFlags.enabled('bounty-hunt') &&
  productionFlags.enabled('arsenal') && productionFlags.enabled('salt-flats') &&
  productionFlags.enabled('crew-gear'), 'production has the five released Wasteland features on');
check(!productionFlags.enabled('warlords'), 'retired Warlord switch is not recognized');
check(!productionFlags.enabled('scrapdome') && !productionFlags.enabled('titan-climb') &&
  !productionFlags.enabled('muddy-hollow'),
  'retired Scrapdome, Titan and Muddy Hollow switches are not recognized');
check(!productionFlags.enabled('crash-physics') && !productionFlags.enabled('crash-effects'),
  'retired crash switches are no longer recognized (CRASH-SWITCH-REMOVE)');
const productionQuery = createFeatureFlags({ storage: null, qa: false, search: '?flags=career-backup' });
check(!productionQuery.enabled('career-backup'), 'production URL flags cannot enable dev');
check(createFeatureFlags({storage: null, qa: false, search: '?flags=fuel-run'}).enabled('fuel-run'),
  'a released switch stays on whatever the URL says');
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

// Arsenal is released (on, 4 October 2026). Its development-switch isolation, which
// ARS-CORE proved on the real catalog, is kept by pinning that one switch to dev.
const arsenalDev = options => createFeatureFlags({catalog: {...FEATURE_STATES, arsenal: 'dev'}, storage: null, ...options});
check(!arsenalDev({qa:false, search:''}).enabled('arsenal'), 'a dev Arsenal is off by default');
check(!arsenalDev({qa:false, search:'?flags=arsenal'}).enabled('arsenal'), 'production URL flags cannot enable a dev Arsenal');
check(!arsenalDev({qa:true, search:''}).enabled('arsenal'), 'unnamed QA keeps a dev Arsenal off');
check(!arsenalDev({qa:true, search:'?flags=fuel-run'}).enabled('arsenal'), 'requesting another switch does not enable a dev Arsenal');
check(arsenalDev({qa:true, search:'?flags=arsenal'}).enabled('arsenal'), 'explicit private QA enables a dev Arsenal');
check(createFeatureFlags({storage:null, qa:false, search:''}).enabled('arsenal'), 'the released catalog has Arsenal on');

console.log(`Feature switches: ${checks} state, QA, persistence and override checks passed.`);
