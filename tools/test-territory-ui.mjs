import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createProfile} from '../src/progression.js';
import {territoryPanel} from '../src/screen-territory.js';

let checks = 0;
const equal = (actual, expected, message) => {
  checks += 1;
  assert.deepEqual(actual, expected, message);
};
const match = (actual, expected, message) => {
  checks += 1;
  assert.match(actual, expected, message);
};
const noMatch = (actual, expected, message) => {
  checks += 1;
  assert.doesNotMatch(actual, expected, message);
};

function profileFor({hold = 0, claimed = false, defeated = false,
    wins = 0, losses = 0} = {}) {
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.wasteland.territories.sal = {hold, claimed};
  profile.wasteland.warlords.sal = {defeated, wins, losses};
  return profile;
}

const salBuilt = Object.freeze({builtWarlordIds: Object.freeze(['sal'])});

test('hold stays a plain progress state until all four wins are earned', () => {
  const panel = territoryPanel(profileFor({hold: 75}), salBuilt);
  match(panel, /75 \/ 100 HOLD/, 'the real territory card shows earned hold');
  noMatch(panel, /<img\b|warlord-(?:poster|portrait)|card-image/,
    'the real map does not revive the superseded poster or card-image system');
  noMatch(panel, />FIGHT</, 'a built fight stays locked below full hold');
  noMatch(panel, />REMATCH</, 'an unbeaten territory cannot offer a rematch');
  noMatch(panel, /EARNED/, 'hold alone never grants or advertises a reward');
});

test('a full hold offers FIGHT only when that warlord fight is actually built', () => {
  const full = profileFor({hold: 100});
  const unavailable = territoryPanel(full, {builtWarlordIds: []});
  match(unavailable, /WARLORD FIGHT COMING LATER/,
    'an unbuilt full-hold fight says exactly what is missing');
  noMatch(unavailable, /<button[^>]*>\s*FIGHT\s*<\/button>/,
    'an unbuilt fight has no fake launch button');
  noMatch(unavailable, /EARNED/, 'an unbuilt fight has no fake reward claim');

  const available = territoryPanel(full, salBuilt);
  match(available, /SAWTOOTH SAL IS WAITING/,
    'full hold names the built warlord who is waiting');
  match(available, /<button[^>]*data-warlord="sal"[^>]*>\s*FIGHT\s*<\/button>/,
    'the real launch control identifies Sal');
  noMatch(available, /DEFEATED|EARNED|REMATCH/,
    'opening the fight does not claim a win or reward');
});

test('a saved defeat shows claimed territory and REMATCH without advertising an unbuilt reward', () => {
  const panel = territoryPanel(profileFor({hold: 100, claimed: true,
    defeated: true, wins: 1}), salBuilt);
  match(panel, /DEFEATED/, 'the saved defeat is retained');
  noMatch(panel, /SIDE SAWS EARNED/, 'WAR-02a-REWARD has not supplied a working reward');
  match(panel, /CLAIMED/, 'the matching territory carries its claimed banner');
  match(panel, /<button[^>]*data-warlord="sal"[^>]*>\s*REMATCH\s*<\/button>/,
    'a defeated built fight offers REMATCH, tied to Sal');
  noMatch(panel, />\s*FIGHT\s*</, 'the first-fight label is gone after a win');
});

test('saved defeat data cannot expose a launch or reward in a build without the fight', () => {
  const panel = territoryPanel(profileFor({hold: 100, claimed: true,
    defeated: true, wins: 1}), {builtWarlordIds: []});
  match(panel, /WARLORD FIGHT COMING LATER/,
    'availability comes from shipped behavior, not save bytes');
  noMatch(panel, /<button/, 'no launch control is rendered for an unbuilt fight');
  noMatch(panel, /SIDE SAWS EARNED|REMATCH/,
    'an older build does not advertise a future implementation');
});

test('territory rendering is read-only and keeps named-player progress separate', () => {
  const first = profileFor({hold: 100, claimed: true, defeated: true, wins: 2});
  first.wasteland.warlords.sal.futureField = {kept: true};
  const second = profileFor({hold: 50});
  const before = structuredClone(first);
  let writes = 0;
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: () => null,
    setItem: () => { writes += 1; },
    removeItem: () => { writes += 1; },
  }});
  try {
    territoryPanel(first, salBuilt);
    equal(first, before, 'rendering does not mutate save data or unknown fields');
    equal(writes, 0, 'rendering does not write browser storage');
    const otherPanel = territoryPanel(second, salBuilt);
    match(otherPanel, /50 \/ 100 HOLD/, 'the other named player keeps their own hold');
    noMatch(otherPanel, /DEFEATED|EARNED|REMATCH/,
      'the other named player does not inherit the first player\'s defeat');
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
});

test.after(() => console.log(`Territory warlord UI: ${checks} display and safety checks executed.`));
