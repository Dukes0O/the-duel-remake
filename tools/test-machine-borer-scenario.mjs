import assert from 'node:assert/strict';
import {page} from './scenarios/machine-borer.mjs';

for (const expression of Object.values(page)) assert.doesNotThrow(() => new Function(`return ${expression};`));
const delta = Array(1024).fill(0);
delta[1 * 32 + 1] = 0.3;
delta[1 * 32 + 2] = 0.6;
delta[1 * 32 + 3] = 0.3;
// A separate yard edit must not be counted as spoil.
delta[20 * 32 + 20] = 4;
const window = {__theDig:{simulation:{borer:{spoilBank:{origin:{x:0,z:1},direction:{x:1,z:0},far:5}},
  ground:{toSave:()=>({chunks:[{x:0,z:0,delta}]})}}}};
const measurement = new Function('window', `return ${page.spoil};`)(window);
assert.deepEqual(measurement, {far:5,cells:3,crest:0.6,steepestSide:0.6});
console.log('Mabel scenario: page expressions parse and the heap measurement reads filled ground cells.');
