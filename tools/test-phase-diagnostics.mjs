import assert from 'node:assert/strict';
import {createPhaseDiagnostics} from '../src/phase-diagnostics.js';
import {App} from '../src/app.js';
import {readFileSync} from 'node:fs';
let checks=0;
const check=(value,label)=>{assert(value,label);checks++;};
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
for(const capacity of [0,-1,1.5,601,NaN]){assert.throws(()=>createPhaseDiagnostics({capacity}),RangeError);checks++;}
let clocks=0;
const probe=createPhaseDiagnostics({capacity:4,clock:()=>++clocks});
check(!probe.active,'diagnostics are off until an explicit sample');
equal(probe.recordAppFrame(1,1,1,1),false,'disabled probe cannot collect');
equal(probe.summary().cpuMs.simulation,null,'missing measurements are null, not a made-up zero');
equal(clocks,0,'creation and summaries never read the clock');
probe.start({afterTimestamp:10,hud:'production HUD'});
check(probe.active,'explicit start enables bounded collection');
equal(probe.recordAppFrame(10,1,1,1),false,'warmup timestamp is excluded');
for(const values of [[NaN,1,1,1],[11,-1,1,1],[11,1,Infinity,1],[11,1,1,NaN]])
  equal(probe.recordAppFrame(...values),false,'invalid phase samples are rejected without changing game code');
check(probe.recordRendererFrame(11,2,6),'renderer phase can arrive before the App callback');
check(!probe.recordRendererFrame(11,99,99),'duplicate renderer callback is not counted twice');
for(const [t,sim,audio,hud]of [[11,1,2,3],[12,2,4,6],[13,3,6,9],[14,4,8,12]])
  check(probe.recordAppFrame(t,sim,audio,hud),'valid App phase records exactly one frame');
check(!probe.active,'frame budget automatically disables the probe');
check(!probe.recordAppFrame(15,100,100,100),'capture never grows beyond its frame budget');
const report=probe.summary();
equal(report.appFrames,4,'App sample count is explicit');equal(report.rendererFrames,1,'renderer callback count remains independent');
equal(report.hudSource,'production HUD','report states exactly which HUD callback was measured');
equal(report.cpuMs.simulation,{samples:4,p50Ms:2,p95Ms:4,maxMs:4},'nearest-rank phase percentiles include the slowest frame');
equal(report.cpuMs.appTotal,{samples:4,p50Ms:12,p95Ms:24,maxMs:24},'App total is the three measured sequential phases');
equal(report.cpuMs.rendererUpdate,{samples:1,p50Ms:2,p95Ms:2,maxMs:2},'pre-render CPU work is separate from submission');
equal(report.cpuMs.renderSubmit,{samples:1,p50Ms:6,p95Ms:6,maxMs:6},'submission is labelled CPU, not GPU');
probe.start({hud:'visual-check telemetry (not production HUD)'});
equal(probe.summary().appFrames,0,'a fresh sample drops prior timing values');
check(probe.recordAppFrame(0,0,0,0),'zero-cost measurements are valid');
check(!probe.recordAppFrame(-1,1,1,1),'rewound App timestamps do not corrupt the sample');
probe.stop();check(!probe.active,'stop is explicit and idempotent');probe.stop();
check(!probe.recordRendererFrame(2,1,1),'cancelled capture cannot collect later renderer work');
equal(clocks,0,'recording and reporting allocate no hidden clock reads');
assert.throws(()=>probe.start({afterTimestamp:NaN}),TypeError);checks++;

// Run the actual RAF loop against deterministic timestamps. Storage is memory
// only; diagnostic clocks cannot alter simulation time or event ordering.
let storage=new Map(),rafId=0;
const rafs=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
globalThis.window=new EventTarget();window.location={search:''};globalThis.Element=class{};
globalThis.requestAnimationFrame=callback=>{rafs.set(++rafId,callback);return rafId;};
globalThis.cancelAnimationFrame=id=>rafs.delete(id);
const bootstrap=new App();bootstrap.dispose();const initialStorage=new Map(storage);
function run({timed=false,paused=false,menu=false,capacity=180}={}){
  storage=new Map(initialStorage);rafs.clear();
  const app=new App();
  if(!menu){app.startCampaign({car:'falcone_f42',startStage:0,mode:'timetrial',cpuDifficulty:'medium',difficulty:'casual',seed:1989});app.runId='phase-parity-run';app.duel.state.status='racing';app.duel.state.paused=paused;app.keys={KeyW:true};}
  let clockReads=0;const events=[],steps=[],original=app._simulate.bind(app),audio=app._updateAudio.bind(app);
  app._simulate=dt=>{events.push('simulation');steps.push(dt);return original(dt);};
  app._updateAudio=()=>{events.push('audio');return audio();};
  app.onFrame=(state,dt)=>{events.push('hud');assert.equal(state,app.duel.state);assert.equal(dt,steps.at(-1));};
  const diagnostics=createPhaseDiagnostics({capacity,clock:()=>{clockReads++;return clockReads*.25;}});
  if(timed){diagnostics.start({hud:'test HUD'});app.frameDiagnostics=diagnostics;}
  else app.frameDiagnostics=diagnostics;
  app.start();app.start();
  for(const t of [0,16,33,50,66,100,500,516,516,533]){
    const item=rafs.entries().next().value;assert(item,'App owns a live frame callback');rafs.delete(item[0]);item[1](t);
  }
  const result={state:JSON.parse(JSON.stringify(app.duel.state)),storage:[...storage],events,steps,clockReads,timings:diagnostics.summary(),frames:rafs.size};
  app.dispose();result.stopped=!diagnostics.active;result.detached=app.frameDiagnostics===null;return result;
}
for(const setup of [{},{paused:true},{menu:true}]){
  const normal=run(setup),timed=run({...setup,timed:true});
  equal(timed.state,normal.state,'timing leaves actual Duel state and physics identical');
  equal(timed.storage,normal.storage,'timing leaves every saved value unchanged');
  equal(timed.events,normal.events,'simulation, audio and HUD ordering is identical');
  equal(timed.steps,normal.steps,'RAF delta clamping and fixed-step catch-up are identical');
  equal(normal.clockReads,0,'inactive diagnostics add no normal-play clock reads');
  equal(timed.clockReads,40,'enabled diagnostics use exactly four clocks per actual App callback');
  equal(timed.frames,1,'diagnostics do not add frame loops');
  check(timed.stopped&&timed.detached,'App disposal stops and detaches its probe');
}
const bounded=run({timed:true,capacity:2});
equal(bounded.clockReads,8,'App stops reading clocks after the diagnostic frame budget');
equal(bounded.events.length,30,'all remaining normal frames still execute after the probe stops');
const review=readFileSync(new URL('./performance-review.js',import.meta.url),'utf8');
for(const key of ['app.duel.state.paused','app.autopilot','app.audio.muted','app.audio.sampleStatus','view.dataset.warmupStatus'])
  check(review.includes(key),`QA invalidates incomparable samples when ${key} changes`);
check(review.includes('diagnostics.start({afterTimestamp:now,hud:hudSource})'),'QA excludes warmup from phase attribution');
check(review.includes('phaseTiming')&&review.includes('passTiming'),'QA includes App attribution and per-pass reports');
check(review.includes('events.abort()')&&review.includes('passProfile?.cancel()'),'QA disposal cancels event listeners and pass wrappers');
check(readFileSync(new URL('./visual-check.js',import.meta.url),'utf8').includes('visual-check telemetry (not production HUD)'),'visual-only fixture never claims to measure the production HUD');
const realHudQa=readFileSync(new URL('./update-check.js',import.meta.url),'utf8');
check(realHudQa.includes("params.get('profile')==='1'")&&realHudQa.includes("hudSource:'production main HUD'"),'isolated update QA can explicitly measure the real production HUD');
check(review.includes('!app.running')&&review.includes("view.dataset.vehicleAsset!=='ready'"),'QA rejects stopped loops and unsettled vehicle loading');
check(review.includes("['scheduled','compiling']"),'QA rejects both scheduled and compiling startup phases');
check(review.includes('worldReadyMs:Number(view.dataset.worldReadyMs)'),'QA preserves build-to-first-presented wall time separately from CPU phases');
console.log(`Phase diagnostics: ${checks} opt-in, bounded sampling, attribution, exact RAF/state/save parity and lifecycle checks passed.`);
