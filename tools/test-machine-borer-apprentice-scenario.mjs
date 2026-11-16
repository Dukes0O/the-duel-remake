import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {run, page} from './scenarios/machine-borer-apprentice.mjs';

for (const expression of Object.values(page)) assert.doesNotThrow(()=>new Function(`return ${expression};`));
const pictures=[];
const context={
  outputDir:'.qa-dist',
  navigate:async()=>{},
  waitFor:async()=>{},
  evaluate:async expression=>expression===page.snapshot ? {machine:'excavator',order:{done:0},board:'Bore board.',lever:false} : true,
  screenshot:async name=>{pictures.push(name);},
};
await assert.rejects(run(context), error=>error.message.includes('The bore and board advance') && error.message.includes('Player cutting advances the same bore'));
assert.deepEqual(pictures,['machine-borer-apprentice-board','machine-borer-apprentice-face']);
const result=JSON.parse(await readFile('.qa-dist/machine-borer-apprentice-measurements.json','utf8'));
assert.ok(result.failures.length>=2);
assert.equal(result.pictures['machine-borer-apprentice-face'],'taken');
assert.ok(result['The bore and board advance']);
console.log('Apprentice scenario: page expressions parse and failures retain both pictures and measurements.');
