import assert from 'node:assert/strict';
import {test} from 'node:test';
import {territoryPanel} from '../src/screen-territory.js';
import {createProfile} from '../src/progression.js';

test('territory panel is scoped to discovered players and shows earned hold', () => {
  const undiscovered = createProfile();
  assert.equal(territoryPanel(undiscovered), '');
  const discovered = createProfile();
  discovered.wasteland.discoveredGate = true;
  discovered.wasteland.territories.sal.hold = 75;
  // Mirage's fight is not built yet; the Dustmonger's is (WAR-02b).
  discovered.wasteland.territories.mirage.hold = 100;
  discovered.wasteland.territories.dustmonger.hold = 100;
  const panel = territoryPanel(discovered);
  assert.match(panel, /TERRITORY MAP/);
  assert.match(panel, /Sawtooth Sal/);
  assert.match(panel, /75 \/ 100/);
  assert.match(panel, /Pacific Canyon/);
  assert.match(panel, /Warlord fight coming later/);
  assert.match(panel, /data-warlord="dustmonger">FIGHT/);
  assert.match(panel, /Scrapdome/);
  assert.doesNotMatch(panel, /Scrapdome \(coming later\)/, 'the arena venue is playable');
  assert.match(panel, /Salt Flats Convoy Raid \(coming later\)/);
});
