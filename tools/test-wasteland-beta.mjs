import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createFeatureFlags, FEATURE_STATES } from '../src/feature-flags.js';

test('the Wasteland switches are released and the Experimental panel is gone', () => {
  assert.deepEqual(FEATURE_STATES, {
    'career-backup': 'dev', wasteland2: 'on', 'hidden-road': 'on', scrapdome: 'dev',
    'crash-physics': 'dev', 'crash-effects': 'dev', 'titan-climb': 'dev',
    'muddy-hollow': 'dev',
  });
  const flags = createFeatureFlags({ storage: null, qa: false });
  assert.equal(flags.enabled('wasteland2'), true);
  assert.equal(flags.enabled('hidden-road'), true);
  assert.equal(flags.enabled('career-backup'), false);
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
