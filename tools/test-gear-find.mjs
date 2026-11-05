import assert from 'node:assert/strict';
import {yardThingsToTry} from '../src/yard-things-to-try.js';
import {arenaYardPanel} from '../src/screen-arena.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {createProfile} from '../src/progression.js';
import {equipCarWeapon} from '../src/car-loadout.js';

const flags = {enabled: name => ['gear-find', 'ambush-alley', 'arsenal', 'hidden-road', 'crew-gear'].includes(name)};
const profile = rank => ({...createProfile(), wasteland: {...createProfile().wasteland,
  discoveredGate: true, rank, xp: rank === 9 ? 7400 : 0,
  weapons: {version: 1, unlocked: ['ufo', 'bomb', 'crossbow', 'star', ...(rank >= 9 ? ['flamethrower'] : [])], levels: {}}}});
const rankOneRows = yardThingsToTry(profile(1));
for (const title of ['FLAMETHROWER', 'GETTING OUT', "CINDER'S HAND FLAMER", 'AMBUSH ALLEY']) {
  assert.match(rankOneRows, new RegExp(title));
}
assert.equal((rankOneRows.match(/<button/g) || []).length, 4);
assert.match(rankOneRows, /Rank 9: you are rank 1/);
assert.match(rankOneRows, /Rank 12: you are rank 1/);
const rankNine = yardThingsToTry(profile(9));
assert.match(rankNine, /FLAMETHROWER[\s\S]*?OPEN/);
assert.match(rankNine, /GETTING OUT[\s\S]*?Hold F/);

const armory = createArmoryScreen({profile: () => profile(9), credits: value => value,
  escapeHTML: value => String(value), getGarageMessage: () => '', kitsEnabled: () => true,
  loadoutsEnabled: () => true, arsenalEnabled: () => true, action: () => '' , featureFlags: flags});
const markup = armory();
assert.match(markup, /FLAMETHROWER/);
assert.match(markup, /NEW/);
assert.match(markup, /data-weapon-fit="flamethrower"/);
assert.match(markup, /Rank 13 · you are rank 9/);
assert.match(markup, /FLAMETHROWER <span>NEW<\/span>[\s\S]*?data-weapon-fit="flamethrower"/);
const fitted = equipCarWeapon(profile(9), 0, 'flamethrower', {wastelandEnabled: true, arsenalEnabled: true});
assert.equal(fitted.ok, true, 'FIT action uses equipCarWeapon');
assert.equal(fitted.profile.wasteland.loadout[0], 'flamethrower');

const lockedModes = arenaYardPanel({profile: profile(1), featureFlags: flags});
assert.match(lockedModes, /AMBUSH ALLEY · RANK 12/);
assert.match(lockedModes, /disabled aria-label="Ambush Alley locked at rank 12"/);
assert.match(lockedModes, /Progress to Ambush Alley rank 12/);
assert.doesNotMatch(lockedModes, /data-arena-mode="ambush-alley"/);
console.log('Gear find: yard rows, rank gates, Armory discoverability and locked Scrapdome mode pass.');
