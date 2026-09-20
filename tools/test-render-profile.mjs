import assert from 'node:assert/strict';
import {startRenderProfile} from './render-profile.js';

function fixture({gpu=true}={}){
  let now=0,active=null,disjoint=false,available=true,deleted=0,created=0;
  const ext={TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2};
  const gl={CURRENT_QUERY:3,QUERY_RESULT_AVAILABLE:4,QUERY_RESULT:5,
    getExtension:()=>gpu?ext:null,getParameter:()=>disjoint,getQuery:()=>active,
    createQuery:()=>({id:++created}),beginQuery:(_,q)=>{active=q;},endQuery:()=>{active=null;},
    getQueryParameter:(_,key)=>key===4?available:2500000,deleteQuery:()=>deleted++};
  const renderer={getContext:()=>gl,info:{render:{calls:0,triangles:0}}};
  class ScenePass {render(r,fail=false){assert.equal(this,pass);r.info.render.calls+=5;r.info.render.triangles+=300;now+=2;if(fail)throw Error('test');return 42;}}
  const pass=new ScenePass(),original=pass.render,composer={passes:[pass]};
  return {renderer,composer,pass,original,clock:()=>now,get deleted(){return deleted;},get created(){return created;},set disjoint(v){disjoint=v;},set available(v){available=v;},set active(v){active=v;}};
}
for(const gpu of [true,false]){
  const f=fixture({gpu}),p=startRenderProfile(f,{frames:4,warmup:2,clock:f.clock});
  for(let i=0;i<12;i++)assert.equal(f.pass.render(f.renderer),42);
  const report=p.stop(),row=report.passes[0];
  assert.deepEqual(row.cpuMs,{samples:4,p50:2,p95:2,max:2});
  assert.equal(row.draws.p50,5);assert.equal(row.triangles.p50,300);
  assert.equal(row.gpuMs?.p50??null,gpu?2.5:null);
  assert.equal(f.pass.render,f.original);assert.equal(f.created,f.deleted);assert.equal(p.stop(),null);p.cancel();
}
{
  const f=fixture(),p=startRenderProfile(f,{frames:4,warmup:0,clock:f.clock});
  f.pass.render(f.renderer);f.disjoint=true;f.pass.render(f.renderer);
  const r=p.stop();assert.equal(r.passes[0].gpuMs,null);assert.match(r.gpuStatus,/disjoint/);assert.equal(f.created,f.deleted);
}
{
  const f=fixture(),p=startRenderProfile(f,{frames:100,warmup:0,clock:f.clock});f.available=false;
  for(let i=0;i<100;i++)f.pass.render(f.renderer);
  assert.equal(f.created,32);p.cancel();assert.equal(f.created,f.deleted);assert.equal(f.pass.render,f.original);
}
{
  const f=fixture(),p=startRenderProfile(f,{frames:4,warmup:0,clock:f.clock});
  assert.throws(()=>f.pass.render(f.renderer,true),/test/);p.cancel();assert.equal(f.created,f.deleted);assert.equal(f.pass.render,f.original);
}
{
  const f=fixture();f.active={};const p=startRenderProfile(f,{frames:4,warmup:0,clock:f.clock});f.pass.render(f.renderer);assert.equal(f.created,0);p.cancel();
}
assert.throws(()=>startRenderProfile(fixture(),{frames:601}),RangeError);
console.log('Render profile: bounded CPU/GPU samples, unsupported/disjoint/busy GPU, cleanup and exceptions passed.');
