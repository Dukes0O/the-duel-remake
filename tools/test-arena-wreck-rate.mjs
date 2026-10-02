import assert from 'node:assert/strict';
import {playRound} from './arena-balance.mjs';
import {WARLORD_RULES, startWarlordEvent} from '../src/arena/warlord-event.js';
import {Duel} from '../src/game.js';

const failures = [];
let checks = 0, mean = NaN;
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(name + ': ' + error.message); }
}

check('Ordinary arena armor increases without changing warlord armor', () => {
  const flags = {wasteland2: true, scrapdome: true, warlords: true};
  const ordinary = new Duel({seed: 1989, featureFlags: flags});
  assert.ok(ordinary.startArenaEvent({car: 'falcone_f42', cpuDifficulty: 'medium', seed: 1989,
    opponents: [{car: 'banshee_muscle'}]}));
  assert.ok(ordinary.state.maxArmor > 50, 'ordinary cars need more than the released half-race armor');
});

check('Every car retains its released warlord arena armor', () => {
  const released = {
    falcone_f42: 50, stuttgart_959s: 50, falcone_heritage: 50, aurora_gt: 50,
    dusthawk_rally: 46.977617561176274, banshee_muscle: 55.863133238052576,
    viper_proto: 40.25778999364488, titan_monster: 80, koenigsegg_jesko: 48.954588386972794,
  };
  for (const [car, armor] of Object.entries(released)) {
    const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true, scrapdome: true}});
    assert.ok(duel.startArenaEvent({mode: 'warlord', car, cpuDifficulty: 'medium', seed: 1989,
      opponents: [{car}]}));
    assert.equal(duel.state.maxArmor, armor, car + ' player warlord armor');
    assert.equal(duel.state.opponents[0].maxArmor, armor, car + ' base warlord armor');
    assert.equal(duel.state.armor, armor, car + ' player starts full');
    assert.equal(duel.state.opponents[0].armor, armor, car + ' boss starts full');
  }
});

check('Sal retains her released absolute armor at every difficulty', () => {
  for (const cpuDifficulty of ['easy', 'medium', 'hard']) {
    const duel = new Duel({seed: 1989,
      featureFlags: {wasteland2: true, scrapdome: true, warlords: true}});
    assert.ok(startWarlordEvent(duel, {warlordId: 'sal', car: 'falcone_f42', cpuDifficulty, seed: 1989}));
    assert.equal(duel.state.maxArmor, 50, 'warlord player armor stays released');
    assert.equal(duel.state.opponents[0].maxArmor, 83.79469985707887, 'Sal armor stays released');
    assert.equal(duel.state.opponents[0].armor, 83.79469985707887, 'Sal starts full');
  }
});

check('Medium full-field wrecks return to 10 to 14 per round', () => {
  const rows = [];
  for (const seed of [1989, 7, 42, 2024]) {
    for (const car of ['banshee_muscle', 'viper_proto', 'falcone_f42']) {
      rows.push(playRound({difficulty: 'medium', seed, car, field: 3}));
    }
  }
  mean = rows.reduce((sum, row) => sum + row.wrecks, 0) / rows.length;
  assert.ok(mean >= 10 && mean <= 14,
    'Medium full-field mean must be 10 to 14 wrecks; got ' + mean.toFixed(3) + ' across 12 rounds');
});

check('Sal keeps the warlord armor multiplier', () => {
  assert.equal(WARLORD_RULES.armorScale, 1.5, 'Sal warlord armor multiplier must stay 1.5');
});

for (const failure of failures) console.error(failure);
console.log('Arena wreck rate: ' + (checks - failures.length) + '/' + checks +
  ' checks passed; Medium full-field mean ' + mean.toFixed(3));
if (failures.length) process.exitCode = 1;
