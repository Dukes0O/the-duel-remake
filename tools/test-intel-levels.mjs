import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIntel,intelLevel,recordIntelLap,recordIntelFinish,purchaseIntel,INTEL_PRICES} from '../src/intel-levels.js';
const id='panorama-ridge',owned={owned:true};
const profile=()=>({version:2,credits:1500,other:{keep:'exact'}});
const lap=(runId,n)=>({runId,lap:n,valid:true});
const finish=(position,extra={})=>({mode:'grandprix',completed:true,position,fieldSize:8,timeSec:100,laps:3,...extra});
const freeze=value=>{Object.freeze(value);for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return value;};

test('ownership grants the map without adding any field to old profiles',()=>{
 const p=freeze(profile()),bytes=JSON.stringify(p);
 assert.equal(intelLevel(p,id,owned),1);assert.equal(intelLevel(p,id),0);
 assert.equal(JSON.stringify(p),bytes);assert.equal(Object.hasOwn(p,'intel'),false);
 assert.deepEqual(normalizeIntel(),{version:1,events:{}});
});
test('three distinct valid native laps earn notes per event and profile, idempotently',()=>{
 const first=freeze(profile());let p=recordIntelLap(first,id,lap('run-a',1),owned);
 assert.equal(p.intel.events[id].laps,1);assert.equal(intelLevel(p,id,owned),1);
 assert.equal(recordIntelLap(p,id,lap('run-a',1),owned),p);
 p=recordIntelLap(p,id,lap('run-a',2),owned);p=recordIntelLap(p,id,lap('run-b',1),owned);
 assert.equal(intelLevel(p,id,owned),2);assert.equal(p.intel.events[id].laps,3);
 assert.equal(recordIntelLap(p,id,lap('run-c',1),owned),p,'saturated progress needs no growing receipt history');
 assert.equal(intelLevel(first,id,owned),1);assert.equal(intelLevel(p,'harbour-lights',owned),1);
 assert.equal(intelLevel(profile(),id,owned),1);
 for(const receipt of [{},lap('',1),lap('run-x',0),{...lap('run-x',1),valid:false}])assert.equal(recordIntelLap(first,id,receipt,owned),first);
 assert.equal(recordIntelLap(first,id,lap('run-x',1)),first,'unowned tracks earn nothing');
});
test('only validated completed explicit positions earn telemetry or the reference ghost',()=>{
 const p=freeze(profile());
 for(const [position,level] of [[8,1],[6,1],[5,3],[4,3],[3,4],[2,4],[1,4]]){
  const next=recordIntelFinish(p,id,finish(position),{...owned,validated:true});
  assert.equal(intelLevel(next,id,owned),level);
  assert.equal(recordIntelFinish(next,id,finish(position),{...owned,validated:true}),next);
 }
 for(const bad of [finish(0),finish(9),finish(1,{completed:false}),finish(1,{timeSec:0}),finish(1,{laps:0}),finish(1,{mode:'timetrial'}),finish(undefined)])
  assert.equal(recordIntelFinish(p,id,bad,{...owned,validated:true}),p);
 assert.equal(recordIntelFinish(p,id,finish(1),owned),p,'structural result alone bypasses no native finish validation');
});
test('stated purchases debit once, include lower levels and never consume other player data',()=>{
 assert.deepEqual(INTEL_PRICES,{3:400,4:800});const p=freeze(profile());
 const bought=purchaseIntel(p,id,3,owned);assert.ok(bought.ok&&bought.changed);assert.equal(bought.cost,400);assert.equal(bought.profile.credits,1100);assert.equal(intelLevel(bought.profile,id,owned),3);
 assert.equal(bought.profile.other,p.other);assert.equal(p.credits,1500);
 const again=purchaseIntel(bought.profile,id,3,owned);assert.ok(again.ok&&!again.changed);assert.equal(again.cost,0);assert.equal(again.profile,bought.profile);
 const ghost=purchaseIntel(p,id,4,owned);assert.equal(ghost.cost,800);assert.equal(ghost.profile.credits,700);assert.equal(intelLevel(ghost.profile,id,owned),4);
 assert.equal(purchaseIntel(ghost.profile,id,3,owned).cost,0);
 const earned=recordIntelFinish(p,id,finish(1),{...owned,validated:true});assert.equal(purchaseIntel(earned,id,4,owned).cost,0);
});
test('invalid purchases and insufficient wallets are exact no-ops',()=>{
 for(const [p,event,level,options] of [[profile(),id,2,owned],[profile(),id,5,owned],[profile(),'__proto__',3,owned],[profile(),id,3,{}],[{...profile(),credits:399},id,3,owned],[{...profile(),credits:799},id,4,owned],[{...profile(),credits:NaN},id,3,owned]]){
  freeze(p);const r=purchaseIntel(p,event,level,options);assert.equal(r.ok,false);assert.equal(r.cost,0);assert.equal(r.profile,p);
 }
});
test('normalization and each update preserve additive fields and future versions',()=>{
 const p=freeze({...profile(),intel:{version:1,extra:{keep:1},events:{[id]:{level:3,laps:1,lapKeys:['old'],extra:'keep'},'future-event':{level:4,laps:3,unknown:'exact'}}}});
 const n=normalizeIntel(p.intel);assert.deepEqual(n.extra,{keep:1});assert.equal(n.events[id].extra,'keep');assert.deepEqual(n.events['future-event'],p.intel.events['future-event']);
 const next=recordIntelLap(p,id,lap('run',1),owned);assert.equal(next.intel.events[id].extra,'keep');assert.equal(next.intel.events['future-event'],p.intel.events['future-event']);
 const future=freeze({...profile(),intel:{version:7,opaque:[1,2,3]}});assert.equal(normalizeIntel(future.intel),future.intel);
 assert.equal(recordIntelLap(future,id,lap('run',1),owned),future);assert.equal(recordIntelFinish(future,id,finish(1),{...owned,validated:true}),future);assert.equal(purchaseIntel(future,id,4,owned).profile,future);
});
