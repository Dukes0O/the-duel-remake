import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createFeatureFlags, FEATURE_STATES } from '../src/feature-flags.js';

test('the Wasteland switches are released and the Experimental panel is gone', () => {
  // Released on 4 October 2026: Fuel Run, Bounty Hunt, Arsenal, Salt Flats, Crew gear.
  // Released on 9 October 2026: Convoy Raid, Tollkeeper, Baron Blackiron, Warlord cards,
  // Arsenal wave three, Fight Voices, computer crews, Ambush Alley and Gunn.
  // Released on 10 October 2026: seeker rockets.
  // The complete switch list is pinned once, in test-feature-flags. This suite
  // checks the Wasteland switches it exists for.
  for (const name of ['seeker-rockets', 'convoy-raid', 'bounty-hunt', 'hidden-road', 'fuel-run', 'arsenal',
    'salt-flats', 'crew-gear', 'fight-voices', 'arsenal-wave3', 'cpu-crews', 'ambush-alley', 'gunn',
    'tollkeeper', 'blackiron', 'warlord-cards'])
    assert.equal(FEATURE_STATES[name], 'on', name + ' is released');
  assert.equal(FEATURE_STATES['career-backup'], 'dev');
  for (const manifest of CIRCUIT_MANIFESTS) assert.equal(FEATURE_STATES[manifest.flag], manifest.state, manifest.id);
  for (const retired of ['wasteland2', 'warlords', 'scrapdome', 'experimental'])
    assert.equal(Object.hasOwn(FEATURE_STATES, retired), false, retired + ' has no switch');
  const flags = createFeatureFlags({ storage: null, qa: false });
  assert.equal(flags.enabled('wasteland2'), false);
  assert.equal(flags.enabled('hidden-road'), true);
  assert.equal(flags.enabled('career-backup'), false);
  assert.equal(flags.enabled('seeker-rockets'), true);
  assert.equal(flags.enabled('warlords'), false);
  assert.equal(flags.enabled('fuel-run'), true);
  assert.equal(flags.enabled('tollkeeper'), true);
  assert.equal(flags.enabled('blackiron'), true);
  assert.deepEqual(flags.betaFeatures(), CIRCUIT_MANIFESTS.filter(manifest => manifest.state === 'beta').map(manifest => manifest.flag));
  assert.equal(existsSync(new URL('../src/experimental-ui.js', import.meta.url)), false);
  const router = readFileSync(new URL('../src/screen-router.js', import.meta.url), 'utf8');
  const menu = readFileSync(new URL('../src/screen-menu.js', import.meta.url), 'utf8');
  assert.doesNotMatch(router + menu, /experimental|foot-camera-control/i);
});

test('production URL requests cannot enable dev switches, while QA keeps named isolation', () => {
  const search = '?flags=career-backup,unknown,roadside-destruction';
  const production = createFeatureFlags({ storage: null, qa: false, search });
  for (const name of ['career-backup', 'unknown', 'roadside-destruction'])
    assert.equal(production.enabled(name), false);
  const qa = createFeatureFlags({ storage: null, qa: true, search });
  assert.equal(qa.enabled('career-backup'), true);
  assert.equal(qa.enabled('unknown'), false);
  assert.equal(createFeatureFlags({ storage: null, qa: true }).enabled('career-backup'), false);
});

// A development switch stays isolated from production URLs and unnamed QA
// builds. Fuel Run is released now, so the rule is proved with it pinned to dev.
test('a development switch is isolated from production URLs and unnamed QA builds', () => {
  const catalog = {...FEATURE_STATES, 'fuel-run': 'dev'};
  const production = createFeatureFlags({catalog, storage:null, qa:false, search:'?flags=fuel-run'});
  assert.equal(production.enabled('fuel-run'), false);
  const qa = createFeatureFlags({catalog, storage:null, qa:true, search:'?flags=fuel-run'});
  assert.equal(qa.enabled('fuel-run'), true);
  assert.equal(createFeatureFlags({catalog, storage:null, qa:true}).enabled('fuel-run'), false);
});

test('private beta journey evidence distinguishes fixtures from production actions', async () => {
  const { validateBetaJourneyEvidence } = await import('./scenarios/wasteland-beta.mjs');
  const playerId = 'memory-only-review-player';
  const report = {
    storage: { memoryOnly: true, qaTab: true },
    flags: {
      urlOverride: false,
      released: ['hidden-road'],
      menuSettings: [],
      preDiscovery: { mode: 'wasteland', hiddenRoad: true, newRules: false },
    },
    fixtures: [
      { kind: 'pacific-finish-eligibility', value: 10 },
      { kind: 'route-placement', phase: 'departure', s: 1408 },
      { kind: 'route-placement', phase: 'gate', s: 2300 },
    ],
    events: [
      { kind: 'departure', status: 'driving', playerId, source: 'keyboard', stepCount: 120 },
      { kind: 'invitation', status: 'invited', playerId, source: 'production' },
      { kind: 'enter-choice', status: 'selected', playerId, source: 'ui' },
      { kind: 'arrived-yard', status: 'yard', playerId, source: 'production' },
      { kind: 'yard-menu', status: 'returned', playerId, source: 'ui' },
      { kind: 'wasteland-start', status: 'started', playerId, source: 'ui' },
    ],
    result: { mode: 'wasteland', status: 'racing', discoveredGate: true,
      forcedCompletion: false, forcedDiscovery: false, playerId },
  };
  assert.equal(validateBetaJourneyEvidence(report).passed, true);
  const changed = modify => {
    const copy = structuredClone(report);
    modify(copy);
    assert.throws(() => validateBetaJourneyEvidence(copy));
  };
  changed(copy => { copy.storage.memoryOnly = false; });
  changed(copy => { copy.storage.qaTab = false; });
  changed(copy => { copy.flags.urlOverride = true; });
  changed(copy => { copy.flags.released = []; });
  changed(copy => { copy.flags.menuSettings = ['#experimental-open']; });
  changed(copy => { copy.flags.preDiscovery.mode = 'duel'; });
  changed(copy => { copy.flags.preDiscovery.newRules = true; });
  changed(copy => { copy.fixtures = []; });
  changed(copy => { copy.events.splice(1, 1); });
  changed(copy => { [copy.events[1], copy.events[2]] = [copy.events[2], copy.events[1]]; });
  changed(copy => { copy.events[1].source = 'ui'; });
  changed(copy => { copy.events[4].playerId = 'different-player'; });
  changed(copy => { copy.result.forcedCompletion = true; });
  changed(copy => { copy.result.forcedDiscovery = true; });
  changed(copy => { copy.result.status = 'results'; });
});

// ARS-CORE proved the Arsenal switch on the actual catalog while it was in
// development. It is released now; the same isolation is kept with it pinned to dev.
const arsenalDev = options => createFeatureFlags({catalog: {...FEATURE_STATES, arsenal: 'dev', 'fuel-run': 'dev'}, storage:null, ...options});
test('released Arsenal is on in production; a dev Arsenal stays off by default', () => {
  assert.equal(createFeatureFlags({storage:null, qa:false, search:''}).enabled('arsenal'), true);
  assert.equal(arsenalDev({qa:false, search:''}).enabled('arsenal'), false);
});
test('production URLs cannot enable a dev Arsenal', () => {
  assert.equal(arsenalDev({qa:false, search:'?flags=arsenal'}).enabled('arsenal'), false);
});
test('an explicit private QA URL can enable only the named dev Arsenal flag', () => {
  const qa = arsenalDev({qa:true, search:'?flags=arsenal'});
  assert.equal(qa.enabled('arsenal'), true, 'a dev Arsenal is available only when explicitly requested in QA');
  assert.equal(qa.enabled('fuel-run'), false, 'requesting Arsenal does not implicitly enable a dev Fuel Run');
});
test('unnamed QA and a different named QA request leave a dev Arsenal off', () => {
  assert.equal(arsenalDev({qa:true, search:''}).enabled('arsenal'), false);
  const other = arsenalDev({qa:true, search:'?flags=fuel-run'});
  assert.equal(other.enabled('fuel-run'), true, 'the other dev flag remains explicitly available');
  assert.equal(other.enabled('arsenal'), false, 'a request for another feature does not enable Arsenal');
});
