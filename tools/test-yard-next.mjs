import assert from 'node:assert/strict';
import {test} from 'node:test';
import {yardHomeScreen, yardNextStep} from '../src/screen-yard-home.js';
import {createProfile} from '../src/progression.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {WARLORD_LADDER} from '../src/warlords.js';

// WATER-YARD-NEXT: the yard's "Next up" line names the real next step from
// the save, never a fixed "Sal is waiting".
const escapeHTML = value => String(value ?? '');
const career = (setup = () => {}) => {
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  setup(profile.wasteland);
  return profile;
};
const beat = (wasteland, ...ids) => {
  for (const id of ids) wasteland.warlords[id] = {...wasteland.warlords[id], defeated: true};
};
const yard = (profile, panel) => yardHomeScreen({profile, playerName: 'A', escapeHTML, panel,
  arenaMarkup: '<div>arena</div>', warlordsAvailable: true});

test('a new career is sent to Sal\'s roads with the wins still needed', () => {
  const line = yardNextStep(career());
  assert.match(line, /Sawtooth Sal/);
  assert.match(line, /Win 4 more Mad Max Duel races on Pacific Canyon Circuit or Red Mesa Corkscrew to open the fight\./);
  const half = yardNextStep(career(w => { w.territories.sal.hold = 50; }));
  assert.match(half, /Win 2 more Mad Max Duel races/);
  const one = yardNextStep(career(w => { w.territories.sal.hold = 75; }));
  assert.match(one, /Win 1 more Mad Max Duel race on/);
});

test('an open fight names the warlord and the button that starts it', () => {
  const line = yardNextStep(career(w => { w.territories.sal.hold = 100; }));
  assert.match(line, /Sawtooth Sal is waiting\. Open the TERRITORY MAP and press FIGHT\./);
});

test('after Sal falls the line moves on and never says Sal is waiting', () => {
  const profile = career(w => { w.territories.sal.hold = 100; beat(w, 'sal'); });
  const line = yardNextStep(profile);
  assert.doesNotMatch(line, /Sal/);
  assert.match(line, /The Dustmonger/);
  for (const panel of ['home', 'career']) {
    const markup = yard(profile, panel);
    assert.doesNotMatch(markup, /Sal is waiting|Fill Sal/, `${panel} panel has no stale Sal line`);
    assert.ok(markup.includes(line), `${panel} panel shows the next step`);
  }
});

test('Kettle and the Tollkeeper name their arena routes; a closed route says the rank', () => {
  const kettle = yardNextStep(career(w => beat(w, 'sal', 'dustmonger', 'mirage', 'gunn')));
  assert.match(kettle, /Kettle Kingpin/);
  assert.match(kettle, /Last Car Rolling games in the Scrapdome against two or more cars/);
  const flags = createFeatureFlags({storage: null, qa: true, overrides: {'salt-flats': true, 'convoy-raid': true}});
  const early = career(w => { w.rank = 5; beat(w, ...WARLORD_LADDER.slice(0, 6)); });
  assert.match(yardNextStep(early, {featureFlags: flags}), /Neon Docks Circuit, or Convoy Raids on the Salt Flats \(they open at rank 9\), to open the fight\./);
  early.wasteland.rank = 9;
  assert.match(yardNextStep(early, {featureFlags: flags}), /Convoy Raids on the Salt Flats, to open/);
});

test('the Baron waits for the other seven; a finished career says so', () => {
  const held = career(w => { w.territories.blackiron.hold = 100; beat(w, ...WARLORD_LADDER.slice(0, 6)); });
  assert.match(yardNextStep(held), /The Tollkeeper/);
  beat(held.wasteland, 'tollkeeper');
  assert.match(yardNextStep(held), /Baron Blackiron is waiting/);
  beat(held.wasteland, 'blackiron');
  assert.match(yardNextStep(held), /every warlord is beaten/);
});

test('reading the line never changes the save', () => {
  const profile = career(w => { w.territories.sal.hold = 100; });
  const before = structuredClone(profile);
  yard(profile, 'home'); yard(profile, 'career'); yardNextStep(profile);
  assert.deepEqual(profile, before);
});

test('a yard without warlord fights keeps its coming-later line', () => {
  const markup = yardHomeScreen({profile: career(), playerName: 'A', escapeHTML, panel: 'career'});
  assert.match(markup, /Warlord fights are coming later\./);
});
