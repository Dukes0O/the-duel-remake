import assert from 'node:assert/strict';
import { winRateFailures } from './balance-targets.mjs';

const samples = (easy, medium, hard, races = 10) => ({
  easy: { wins: easy, races },
  medium: { wins: medium, races },
  hard: { wins: hard, races },
});

assert.deepEqual(winRateFailures(samples(8, 5, 2)), [], 'lower allowed ten-race values pass');
assert.deepEqual(winRateFailures(samples(9, 6, 4)), [], 'upper allowed ten-race values pass');
assert.deepEqual(winRateFailures(samples(10, 7, 1)).map(item => item.split(' win rate ')[0]),
  ['easy', 'medium', 'hard'], 'out-of-band results fail each difficulty');
assert.deepEqual(winRateFailures(samples(80, 45, 20, 100)), [], 'exact lower bounds pass');
assert.deepEqual(winRateFailures(samples(95, 65, 40, 100)), [], 'exact upper bounds pass');
assert.equal(winRateFailures(samples(79, 45, 20, 100)).length, 1, 'below lower bound fails');
assert.equal(winRateFailures(samples(95, 66, 40, 100)).length, 1, 'above upper bound fails');
assert.deepEqual(winRateFailures({ easy: { wins: 8, races: 10 } }).length, 2, 'missing difficulties fail closed');
assert.equal(winRateFailures(samples(8, 5, 2, 0)).length, 3, 'zero races fail closed');
assert.equal(winRateFailures(samples(11, 5, 2)).length, 1, 'more wins than races fails');

console.log('Balance win-rate targets passed.');
