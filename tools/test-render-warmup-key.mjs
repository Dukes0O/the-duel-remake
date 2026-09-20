import assert from 'node:assert/strict';
import {createRenderWarmup,preparationKey} from '../src/render-warmup.js';

let checks=0;
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const check=(value,label)=>{assert.ok(value,label);checks++;};
const base={worldBuildCount:1,car:'falcone_f42',high:true},key=preparationKey(base);
const dynamic=[
  {ghost:{car:'falcone_f42',s:80}},{traffic:[{s:100}]},{explosion:true},
  {environment:{uuid:'new-hdr'}},{mood:'overcast'},{sceneRevision:99},
  {camera:'hood'},{paused:true},{status:'racing'},{stageTimeSec:600},
];
for(const state of dynamic)equal(preparationKey({...base,...state}),key,'Ordinary presentation changes cannot replace the preparation key');
for(const structural of [{worldBuildCount:2},{car:'titan_monster'},{high:false}])check(preparationKey({...base,...structural})!==key,'World rebuild, car and quality each require structural preparation');
const sameEnvironment={seed:1989,id:'pacific-canyon'};
check(preparationKey({...base,environment:sameEnvironment})!==preparationKey({...base,worldBuildCount:2,environment:sameEnvironment}),'Rebuilding the same environment still prepares the new material owners');

let serial=0,submissions=0;
const queued=new Map(),timers=new Map();
const controller=createRenderWarmup({
  schedule:callback=>{queued.set(++serial,callback);return serial;},cancelSchedule:id=>queued.delete(id),
  setTimer:callback=>{timers.set(++serial,callback);return serial;},clearTimer:id=>timers.delete(id),
});
const submit=()=>{submissions++;return Promise.resolve();};
const prepare=async settings=>{
  const ticket=controller.request(preparationKey(settings),submit);
  for(const [id,callback]of queued){queued.delete(id);callback();}
  await ticket.promise;return ticket;
};
try{
  const first=await prepare(base);
  check(controller.canDraw(key),'Completed initial preparation permits the frame');
  for(const state of dynamic){
    equal(controller.request(preparationKey({...base,...state}),submit),first,'Dynamic race changes reuse the ready ticket');
    check(controller.canDraw(key),'Dynamic race changes never re-enter a loading hold');
  }
  equal(submissions,1,'Ghost, traffic, explosion, environment and mood cannot resubmit preparation');
  const rebuilt={...base,worldBuildCount:2,environment:sameEnvironment},ticket=controller.request(preparationKey(rebuilt),submit);
  check(ticket!==first&&!controller.canDraw(preparationKey(rebuilt)),'Equivalent new world owns a fresh bounded loading ticket');
  for(const [id,callback]of queued){queued.delete(id);callback();}
  await ticket.promise;equal(submissions,2,'Equivalent new world is prepared exactly once');
  equal(timers.size,0,'All completed structural preparations release their timers');
}finally{controller.dispose();}
console.log(`Warmup key: ${checks} structural-change, equivalent-world rebuild and uninterrupted dynamic-race checks passed.`);
