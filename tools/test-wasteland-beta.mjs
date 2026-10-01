import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createFeatureFlags, FEATURE_STATES } from '../src/feature-flags.js';

test('the Wasteland switches are released and the Experimental panel is gone', () => {
  assert.deepEqual(FEATURE_STATES, {
    'career-backup': 'dev', wasteland2: 'on', 'hidden-road': 'on', scrapdome: 'on',
    'titan-climb': 'on',
    'muddy-hollow': 'on',
    warlords: 'on',
    'fuel-run': 'dev',
    arsenal: 'dev',
  });
  const flags = createFeatureFlags({ storage: null, qa: false });
  assert.equal(flags.enabled('wasteland2'), true);
  assert.equal(flags.enabled('hidden-road'), true);
  assert.equal(flags.enabled('career-backup'), false);
  assert.equal(flags.enabled('warlords'), true);
  assert.equal(flags.enabled('fuel-run'), false);
  assert.deepEqual(flags.betaFeatures(), []);
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

test('Fuel development flag is isolated from production URLs and unnamed QA builds', () => {
  const production = createFeatureFlags({storage:null, qa:false, search:'?flags=fuel-run'});
  assert.equal(production.enabled('fuel-run'), false);
  const qa = createFeatureFlags({storage:null, qa:true, search:'?flags=fuel-run'});
  assert.equal(qa.enabled('fuel-run'), true);
  assert.equal(createFeatureFlags({storage:null, qa:true}).enabled('fuel-run'), false);
});

test('private beta journey evidence distinguishes fixtures from production actions', async () => {
  const { validateBetaJourneyEvidence } = await import('./scenarios/wasteland-beta.mjs');
  const playerId = 'memory-only-review-player';
  const report = {
    storage: { memoryOnly: true, qaTab: true },
    flags: {
      urlOverride: false,
      released: ['wasteland2', 'hidden-road'],
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
  changed(copy => { copy.flags.released = ['wasteland2']; });
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

// ARS-CORE: the actual production catalog controls admission; tests never
// substitute a catalog or supply an override to invent the Arsenal switch.
test('Arsenal development flag stays off in production by default', () => {
  assert.equal(createFeatureFlags({storage:null, qa:false, search:''}).enabled('arsenal'), false);
});
test('production URLs cannot enable the Arsenal development flag', () => {
  assert.equal(createFeatureFlags({storage:null, qa:false, search:'?flags=arsenal'}).enabled('arsenal'), false);
});
test('an explicit private QA URL can enable only the named Arsenal development flag', () => {
  const qa = createFeatureFlags({storage:null, qa:true, search:'?flags=arsenal'});
  assert.equal(qa.enabled('arsenal'), true, 'actual registered Arsenal is available only when explicitly requested in QA');
  assert.equal(qa.enabled('fuel-run'), false, 'requesting Arsenal does not implicitly enable Fuel Run');
});
test('unnamed QA and a different named QA request leave Arsenal off', () => {
  assert.equal(createFeatureFlags({storage:null, qa:true, search:''}).enabled('arsenal'), false);
  const other = createFeatureFlags({storage:null, qa:true, search:'?flags=fuel-run'});
  assert.equal(other.enabled('fuel-run'), true, 'the other real dev flag remains explicitly available');
  assert.equal(other.enabled('arsenal'), false, 'a request for another feature does not enable Arsenal');
});
