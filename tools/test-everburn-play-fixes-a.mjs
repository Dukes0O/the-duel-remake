import assert from 'node:assert/strict';
import {captionSeconds, createCaptionQueue} from '../src/story/caption-queue.js';
import {stepChase} from '../src/world/jobs/steps/chase.js';
import {emberNextUp} from '../src/story/ember-ui.js';
import {worldJobMapData} from '../src/route-map.js';

assert.equal(captionSeconds('x'), 2.5);
assert.equal(captionSeconds('x'.repeat(100)), 6.7);
assert.equal(captionSeconds('x'.repeat(200)), 7.5);
assert.equal(captionSeconds('x'.repeat(200), true), 5.25);
const q=createCaptionQueue();
q.add('first', false, 0); q.add('second', false, 0); q.add('third', false, 0); q.add('fourth', false, 0);
assert.equal(q.advance(2.5), 'second');
assert.equal(q.advance(5), 'third');
q.add('urgent', true, 5.1); assert.equal(q.advance(6.49), 'third');
assert.equal(q.advance(6.5), 'urgent'); assert.equal(q.advance(9), 'third');
q.clear(9); assert.equal(q.advance(100), '');
const crowded=createCaptionQueue(), long='x'.repeat(100);
crowded.add('short', false, 0);
for (let i=0;i<3;i++) crowded.add(long + i, false, 0);
assert.equal(crowded.advance(2.5), long+'0');
assert.equal(crowded.advance(7.23), long+'1');
assert.equal(crowded.advance(11.96), long+'2');
const step={targetId:'thief',leashDistance:150,leashLineId:'closer'}, view=gap=>({player:{position:{x:0,z:0}},actors:[{id:'thief',position:{x:gap,z:0}}]});
let result=stepChase(step,{},view(100),0); result=stepChase(step,result.state,view(121),7.9);
assert.equal(result.events.length,0); result=stepChase(step,result.state,view(119),.1); assert.equal(result.events.length,0);
result=stepChase(step,result.state,view(120),.1); assert.equal(result.events[0].lineId,'closer');
result=stepChase(step,result.state,view(151),.1); assert.equal(result.restart,true); assert.equal(result.events.length,0);
for (const [run, words] of [[null,'Replay any job from the Story Wall.'], [{},'Big Bess is loading gas for Tin Town.']]) {
 const next=emberNextUp({available:true,step:'done',run}); assert.ok(next.text.includes(words)); assert.match(next.button,/data-action="yard-cards"/);
}
const definition={name:'test',steps:[{kind:'escort',path:[{position:{x:0,z:0}},{position:{x:100,z:30}}]}]};
const state={s:5,lateral:4,arena:{mode:'world-job',worldJob:{definition,job:{steps:definition.steps,stepIndex:0},actors:[]}}};
const data=worldJobMapData({worldAt:(s,z)=>({x:s,z})},state);
assert.deepEqual(data.path,[{x:0,z:0},{x:100,z:30}]); assert.equal(data.marks[0].kind,'player');
console.log('everburn play fixes A: 24 checks passed');
