import assert from 'node:assert/strict';
import {playRound} from './arena-balance.mjs';
import {WARLORD_RULES} from '../src/arena/warlord-event.js';

const failures = [];
let checks = 0, mean = NaN;
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(name + ': ' + error.message); }
}

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
