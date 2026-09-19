import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { createRenderWarmup, compileWarmupScene, isRenderWarmupEnabled } from '../src/render-warmup.js';

let checks=0;
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const check=(value,message)=>{assert.ok(value,message);checks++;};
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
globalThis.window=new EventTarget();window.location={search:''};globalThis.Element=class{};
const frames=new Map();let serial=0;
globalThis.requestAnimationFrame=callback=>{frames.set(++serial,callback);return serial;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
const pending=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};

for(const search of ['','?warmup=0','?warmup=true','?other=1','?warmup=01','?warmup='])equal(isRenderWarmupEnabled(search),false,'default and nonexplicit URLs do not enable the experiment');
for(const search of ['?warmup=1','?route=b&warmup=1','warmup=1'])equal(isRenderWarmupEnabled(search),true,'explicit URL enables the experiment');

{
  const camera={},scene={},screen={},composerTarget={},work=pending();let target=screen,face=2,level=3,submissions=0;
  const renderer={getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>level,
    setRenderTarget(next,nextFace=0,nextLevel=0){target=next;face=nextFace;level=nextLevel;},
    compileAsync(nextScene,nextCamera){equal(nextScene,scene);equal(nextCamera,camera);equal(target,composerTarget,'submission uses the exact offscreen composer target');submissions++;return work.promise;},
  };
  const result=compileWarmupScene(renderer,scene,camera,composerTarget);
  equal(result,work.promise,'the native completion promise is retained');equal(submissions,1);
  equal([target,face,level],[screen,2,3],'target, cube face and mip level restore synchronously before the compile resolves');
  work.resolve();await result;
  const failure=new Error('compile submission failed');renderer.compileAsync=()=>{throw failure;};
  assert.throws(()=>compileWarmupScene(renderer,scene,camera,composerTarget),error=>error===failure);checks++;
  equal([target,face,level],[screen,2,3],'a synchronous compile error still restores the render target');
}

const app=new App();app.audio.unlock=()=>{};app.audio.setPaused=()=>{};app.audio.update=()=>{};
check(app.visualReady,'default and headless App have no rendering dependency');
app.startCampaign({car:'falcone_f42',mode:'timetrial',startStage:0,seed:1989});
const initialCountdown=app.duel.state.countdown;
app._simulate(.05);check(app.duel.state.countdown!==initialCountdown||app.duel.state.stageTimeSec>0,'normal simulation still advances without a renderer gate');

const firstOwner={},secondOwner={};
app.claimVisualReadiness(firstOwner);
const snapshot=()=>JSON.stringify({state:app.duel.state,profile:app.profile,players:app.players,leaderboard:app.leaderboard,ghosts:app.ghosts});
let before=snapshot();app._stepAccumulator=.007;
for(let frame=0;frame<200;frame++)app._simulate(.05);
equal(snapshot(),before,'countdown, race state, rewards, profiles and ghost stores do not advance during loading');
equal(app._stepAccumulator,0,'blocked frames accumulate no catch-up debt');
check(!app.visualReady,'first draw is required');
const state=app.duel.state,course=app.duel.course;
equal(app.presentVisualFrame({},state,course),false,'another renderer cannot release this gate');
equal(app.presentVisualFrame(firstOwner,{},course),false,'stale state cannot release the gate');
equal(app.presentVisualFrame(firstOwner,state,{}),false,'stale course cannot release the gate');
app.lastT=1;equal(app.presentVisualFrame(firstOwner,state,course),true);equal(app.lastT,null,'a long GPU frame cannot become simulation catch-up');
check(app.visualReady);app._simulate(1/120);check(snapshot()!==before,'simulation resumes on the next fixed step after the first completed draw');

// Ownership survives HMR: neither completion nor disposal from an old renderer
// is allowed to release the replacement renderer's pending frame.
app.claimVisualReadiness(secondOwner);equal(app.releaseVisualReadiness(firstOwner),false);
equal(app.presentVisualFrame(firstOwner,app.duel.state,app.duel.course),false);check(!app.visualReady);
equal(app.holdVisualReadiness(firstOwner),false);equal(app.presentVisualFrame(secondOwner,app.duel.state,app.duel.course),true);
check(app.visualReady);app.duel.state.status='racing';app.duel.state.paused=true;
app.holdVisualReadiness(secondOwner);before=snapshot();app._simulate(5);equal(snapshot(),before,'loading preserves a user-paused race exactly');
app.presentVisualFrame(secondOwner,app.duel.state,app.duel.course);app._simulate(.05);equal(app.duel.state.paused,true,'first draw never unpauses the user');

app.duel.state.paused=false;app.holdVisualReadiness(secondOwner);before=snapshot();app._simulate(10);equal(snapshot(),before,'racing clocks and positions stay fixed during shader compilation');
app.releaseVisualReadiness(secondOwner);check(app.visualReady,'renderer disposal releases only its own gate');
const time=app.duel.state.stageTimeSec;app._simulate(1/120);check(app.duel.state.stageTimeSec>time,'App remains usable after renderer disposal');

// Starting/restarting a Course invalidates the acknowledged state immediately,
// before the renderer's next animation callback sees the new scene.
app.claimVisualReadiness(secondOwner);app.presentVisualFrame(secondOwner,app.duel.state,app.duel.course);
const previousState=app.duel.state,previousCourse=app.duel.course;
app.restart();check(!app.visualReady,'a restarted race requires its own completed visual frame');
before=snapshot();app._simulate(.1);equal(snapshot(),before,'restart cannot consume countdown time before its first draw');
equal(app.presentVisualFrame(secondOwner,previousState,previousCourse),false,'previous run completion is stale even on the same route');
app.presentVisualFrame(secondOwner,app.duel.state,app.duel.course);

// Exercise real App gating against asynchronous compiler outcomes. A compile
// result merely permits rendering: the simulation gate remains held until the
// caller confirms that the first composer frame actually completed.
for(const outcome of ['success','rejection','timeout']){
  const scheduled=[],timers=[],work=pending();
  const controller=createRenderWarmup({schedule:callback=>(scheduled.push(callback),callback),cancelSchedule:callback=>{const i=scheduled.indexOf(callback);if(i>=0)scheduled.splice(i,1);},setTimer:callback=>(timers.push(callback),callback),clearTimer:callback=>{const i=timers.indexOf(callback);if(i>=0)timers.splice(i,1);},timeoutMs:10});
  app.holdVisualReadiness(secondOwner);const ticket=controller.request(outcome,()=>work.promise);scheduled.shift()();
  if(outcome==='success')work.resolve();else if(outcome==='rejection')work.reject(new Error('compile failed'));else timers.shift()();
  await flush();check(controller.canDraw(outcome),`${outcome}: bounded warmup permits first draw`);
  check(!app.visualReady,`${outcome}: compilation alone does not start the race clock`);
  before=snapshot();app._simulate(.1);equal(snapshot(),before);
  app.presentVisualFrame(secondOwner,app.duel.state,app.duel.course);check(app.visualReady,`${outcome}: completed draw opens the simulation gate`);
  controller.dispose();if(outcome==='timeout'){work.resolve();await flush();}
  equal((await ticket.promise).status,outcome==='success'?'ready':'fallback');
}

// The ordinary App loop keeps receiving HUD frames while loading, and clears
// its clock at presentation so no large elapsed warmup interval is replayed.
let hudFrames=0;app.onFrame=()=>hudFrames++;app.claimVisualReadiness(secondOwner);app.start();
const runFrame=t=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(t));};
before=snapshot();runFrame(100);runFrame(20100);equal(snapshot(),before);equal(hudFrames,2,'loading does not stop the App/HUD animation loop');
app.presentVisualFrame(secondOwner,app.duel.state,app.duel.course);before=snapshot();runFrame(30100);equal(snapshot(),before,'first loop after presentation establishes a fresh clock');
app.dispose();check(app.visualReady,'App disposal clears its optional gate');equal(frames.size,0,'App disposal stops its frame loop');
console.log(`Render readiness: ${checks} checks passed; explicit opt-in, correct compile target, frozen loading clocks/rewards, first-draw release, pause preservation and stale renderer ownership.`);
