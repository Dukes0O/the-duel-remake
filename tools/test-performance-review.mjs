import assert from 'node:assert/strict';
import {summarizeFrames} from './performance-review.js';
const frames=[16,17,15,34,80,18,16,17,16,17],copy=[...frames];
assert.deepEqual(summarizeFrames(frames),{frames:10,p50:17,p95:80,max:80,over33ms:2});
assert.deepEqual(frames,copy);
assert.deepEqual(summarizeFrames([16]),{frames:1,p50:16,p95:16,max:16,over33ms:0});
for(const invalid of [[],[0],[-1],[NaN],[Infinity]])assert.throws(()=>summarizeFrames(invalid));
console.log('Performance review: 8 sample summary, immutability and input checks passed.');
