import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import {WARLORDS, BUILT_WARLORD_IDS, WARLORD_LADDER} from '../src/warlords.js';
import {FIGHT_WARLORD_IDS, warlordFight} from '../src/warlords/index.js';
import {Duel} from '../src/game.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';

// WAR-HOOKS (docs/SCRAPDOME.md section 7, Warlord files): every warlord lives
// in its own file; shared arena files call hooks and never name a warlord.
const SHARED = ['src/arena/arena-brains.js', 'src/arena/arena-event.js', 'src/arena/warlord-event.js',
  'src/arena/warlord-settlement.js', 'src/arena/arena-tell-view.js', 'src/vehicle-contact-modifiers.js',
  'src/combat-armor.js', 'src/sim-contacts.js', 'src/combat.js', 'src/combat-scene.js', 'src/render3d.js'];
const root = new URL('../', import.meta.url);
const ids = Object.keys(WARLORDS);
let checks = 0;
const ok = (value, message) => { checks++; assert.ok(value, message); };
test.after(() => console.log('Warlord hooks: ' + checks + ' checks.'));

test('shared arena files never name a warlord', () => {
  for (const file of SHARED) {
    const source = readFileSync(new URL(file, root), 'utf8');
    for (const id of ids) ok(!new RegExp(`['"\`]${id}['"\`]`).test(source), `${file} names warlord ${id}`);
  }
});

test('every built warlord has its own fight file and a place on the ladder', () => {
  const files = readdirSync(new URL('src/warlords/', root)).filter(name => name !== 'index.js');
  for (const id of BUILT_WARLORD_IDS) {
    ok(FIGHT_WARLORD_IDS.includes(id), `${id} is in the fight list`);
    ok(files.some(name => name.startsWith(id === 'sal' ? 'sal' : id)), `${id} has its own file`);
    ok(WARLORD_LADDER.includes(id), `${id} is on the ladder`);
    ok(WARLORDS[id].car && WARLORDS[id].brain, `${id} names its car and brain`);
    // The Decoy Drone weapon is ARS-03; until it lands its warlord names it unbuilt.
    ok(WARLORDS[id].rewardKit || WARLORDS[id].rewardWeapon ||
      WARLORDS[id].rewardBuilt === false && WARLORDS[id].reward, `${id} names its reward`);
  }
});

test('hooks apply only to the fighting warlord', () => {
  const duel = new Duel({seed: 7, featureFlags: {wasteland2: true, scrapdome: true, warlords: true}});
  ok(startWarlordEvent(duel, {warlordId: 'dustmonger', car: 'falcone_f42', cpuDifficulty: 'medium'}), 'fight starts');
  const boss = duel.state.opponents[0];
  ok(warlordFight(duel, boss) !== null, 'the boss has fight hooks');
  ok(warlordFight(duel, duel.state) === null, 'the player never does');
  const off = new Duel({seed: 7, featureFlags: {wasteland2: true, scrapdome: true, warlords: false}});
  ok(!startWarlordEvent(off, {warlordId: 'dustmonger', car: 'falcone_f42'}), 'the switch still gates the fight');
});
