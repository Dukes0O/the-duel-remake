import assert from 'node:assert/strict';
import {test} from 'node:test';
import {territoryPanel} from '../src/screen-territory.js';
import {createProfile} from '../src/progression.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';

test('territory panel is scoped to discovered players and shows earned hold', () => {
  const undiscovered = createProfile();
  assert.equal(territoryPanel(undiscovered), '');
  const discovered = createProfile();
  discovered.wasteland.discoveredGate = true;
  discovered.wasteland.territories.sal.hold = 75;
  // Gunn was released on 9 October 2026. The "coming later" status is still tested
  // with Gunn pinned to dev; the Dustmonger's fight is built (WAR-02b).
  discovered.wasteland.territories.gunn.hold = 100;
  discovered.wasteland.territories.dustmonger.hold = 100;
  const devGunn = createFeatureFlags({catalog: {...FEATURE_STATES, gunn: 'dev'}, storage: null, qa: false});
  const panel = territoryPanel(discovered, {featureFlags: devGunn});
  assert.match(panel, /TERRITORY MAP/);
  assert.match(panel, /Sawtooth Sal/);
  assert.match(panel, /75 \/ 100/);
  assert.match(panel, /Pacific Canyon/);
  assert.match(panel, /Warlord fight coming later/);
  assert.match(panel, /data-warlord="dustmonger">FIGHT/);
  assert.match(panel, /Scrapdome/);
  assert.doesNotMatch(panel, /Scrapdome \(coming later\)/, 'the arena venue is playable');
  assert.match(panel, /Salt Flats Convoy Raid/);
  assert.doesNotMatch(panel, /Salt Flats Convoy Raid \(coming later\)/, 'the existing Salt venue is playable');
});
