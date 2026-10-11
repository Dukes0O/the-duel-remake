import assert from 'node:assert/strict';
import { createRenderWarmup } from '../src/render-warmup.js';
import * as warmupModule from '../src/render-warmup.js';

let checks=0;
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const check=(value,message)=>{assert.ok(value,message);checks++;};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function fixture(){
  let serial=0;
  const queued=new Map(),timers=new Map();
  const controller=createRenderWarmup({
    schedule:callback=>{const id=++serial;queued.set(id,callback);return id;},cancelSchedule:id=>queued.delete(id),
    setTimer:(callback,delay)=>{const id=++serial;timers.set(id,{callback,delay});return id;},clearTimer:id=>timers.delete(id),timeoutMs:100,
  });
  return{controller,queued,timers,paint(){const callbacks=[...queued.values()];queued.clear();callbacks.forEach(fn=>fn());},timeout(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(({callback})=>callback());}};
}

{
  const f=fixture(),work=deferred();let submissions=0;
  equal(f.controller.state.status,'idle','no warmup before an actual world exists');
  const ticket=f.controller.request('world-1',()=>{submissions++;return work.promise;});
  equal(f.controller.state.status,'scheduled');equal(submissions,0,'compile does not run in the initiating UI event');
  equal(f.controller.canDraw('world-1'),false,'first composer frame waits');
  equal(f.controller.request('world-1',()=>assert.fail('duplicate compile')),ticket,'same world revision reuses its job');
  f.paint();equal(submissions,1);equal(ticket.state.status,'compiling');
  for(let i=0;i<60;i++)equal(f.controller.request('world-1',()=>assert.fail('frame compile')),ticket,'animation frames cannot resubmit a pending shader compile');
  work.resolve();await flush();
  equal((await ticket.promise).status,'ready');equal(f.controller.canDraw('world-1'),true);equal(f.controller.canDraw('world-2'),false);
  equal(f.timers.size,0,'successful work removes its loading deadline');
  equal(f.controller.request('world-1',()=>assert.fail('ready recompile')),ticket,'ready key is not compiled again');
  check(Object.isFrozen(ticket)&&Object.isFrozen(ticket.state),'observations cannot alter job state');
  let release=0;f.controller.releaseWhenSettled(ticket,()=>release++);equal(release,1,'completed-world cleanup happens immediately');
}
{
  const f=fixture();let oldSubmitted=0,newSubmitted=0;
  const old=f.controller.request('old',()=>oldSubmitted++),fresh=f.controller.request('fresh',()=>newSubmitted++);
  equal((await old.promise).status,'stale','a newer route invalidates the old UI ticket immediately');
  equal(f.queued.size,1,'unstarted obsolete work is removed');
  f.paint();await flush();equal(oldSubmitted,0,'a rapid menu change never compiles an unused world');equal(newSubmitted,1);
  equal((await fresh.promise).status,'ready');equal(f.controller.isCurrent(old),false);equal(f.controller.isCurrent(fresh),true);
}
{
  const f=fixture(),oldWork=deferred(),newWork=deferred();let released=0;
  const old=f.controller.request('old',()=>oldWork.promise);f.paint();
  const fresh=f.controller.request('fresh',()=>newWork.promise);f.paint();
  f.controller.releaseWhenSettled(old,()=>released++);
  equal(released,0,'old GPU poll retains the old material lifetime');
  oldWork.resolve();await flush();equal(released,1,'old resources release only after its native compiler settles');
  equal(f.controller.state.status,'compiling','stale completion cannot release the new loading gate');
  equal(f.controller.canDraw('fresh'),false);equal((await old.promise).status,'stale');
  newWork.resolve();await flush();equal(f.controller.canDraw('fresh'),true);
  equal(fresh.state.status,'ready');
}
{
  const f=fixture(),oldWork=deferred(),newWork=deferred();
  const old=f.controller.request('old',()=>oldWork.promise);f.paint();
  const fresh=f.controller.request('fresh',()=>newWork.promise);f.paint();
  newWork.resolve();await flush();const state=f.controller.state;
  oldWork.reject(new Error('obsolete compile'));await flush();
  equal(f.controller.state,state,'late rejection cannot overwrite a ready new scene');
  equal((await old.promise).status,'stale');equal((await fresh.promise).status,'ready');
}
for(const synchronous of [false,true]){
  const f=fixture(),failure=new Error('driver rejected shader');
  const ticket=f.controller.request('broken',()=>{if(synchronous)throw failure;return Promise.reject(failure);});
  f.paint();await flush();
  equal((await ticket.promise).status,'fallback','compile failure enables ordinary rendering instead of trapping the loading UI');
  equal(ticket.state.error,failure);equal(f.controller.canDraw('broken'),true);equal(f.timers.size,0);
  equal(f.controller.request('broken',()=>assert.fail('retry every frame')),ticket,'a failed world does not repeatedly submit shaders');
}
{
  const f=fixture(),work=deferred();let released=0;
  const ticket=f.controller.request('slow',()=>work.promise);f.paint();f.timeout();
  equal((await ticket.promise).status,'fallback','deadline prevents a hung loading gate');
  equal(f.controller.canDraw('slow'),true);
  f.controller.releaseWhenSettled(ticket,()=>released++);equal(released,0,'timeout is not cancellation of native Three shader polling');
  work.resolve();await flush();equal(released,1);equal(ticket.state.status,'fallback','late success retains the observed timeout result');
}
{
  const f=fixture();let submissions=0;
  const ticket=f.controller.request('background-tab',()=>submissions++);f.timeout();f.paint();await flush();
  equal((await ticket.promise).status,'fallback','deadline also handles a suspended paint scheduler');
  equal(submissions,0,'timed-out queued work stays cancelled');equal(f.queued.size,0);
}
{
  const f=fixture(),work=deferred();let releases=0;
  const ticket=f.controller.request('active',()=>work.promise);f.paint();
  const release=()=>releases++;
  f.controller.dispose(release);f.controller.dispose(release);
  equal((await ticket.promise).status,'disposed');equal(f.controller.state.status,'disposed');equal(f.controller.canDraw('active'),false);
  equal(f.controller.request('after-dispose',()=>assert.fail('disposed submit')),null);
  equal(releases,0,'renderer resources stay alive until active Three polling stops');
  equal(f.timers.size,0,'disposal removes controller timers');
  work.resolve();await flush();equal(releases,1,'repeated disposal requests release resources once');equal(f.controller.state.status,'disposed');
}
{
  const f=fixture();let submissions=0,releases=0;
  const ticket=f.controller.request('queued',()=>submissions++);f.controller.dispose(()=>releases++);f.paint();await flush();
  equal((await ticket.promise).status,'disposed');equal(submissions,0);equal(releases,1,'unused renderer needs no delayed cleanup');equal(f.queued.size,0);
}
{
  const f=fixture(),a=deferred(),b=deferred();let allReleased=0,worldReleased=0,retiredReleased=0;
  const first=f.controller.request('a',()=>a.promise);f.paint();
  f.controller.request('b',()=>b.promise);f.paint();
  f.controller.releaseWhenSettled(first,()=>{throw new Error('cleanup failure');});
  f.controller.releaseWhenSettled(first,()=>worldReleased++);
  f.controller.releaseWhenIdle(()=>retiredReleased++);
  f.controller.dispose(()=>allReleased++);
  b.resolve();await flush();equal(allReleased,0,'full renderer cleanup waits for all submitted scene revisions');
  equal(retiredReleased,0,'retired scene material cleanup also waits for every active poll');
  a.resolve();await flush();equal(allReleased,1);equal(retiredReleased,1,'retired resources release once the final poll finishes');equal(worldReleased,1,'one cleanup exception does not prevent other owned resources from releasing');equal(first.releaseErrors.length,1);
}

// Default browser scheduling allows a real paint between the UI change and
// compilation, and cancellation clears both animation-frame handles.
{
  const oldRAF=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
  const callbacks=new Map();let next=0,submitted=0;
  globalThis.requestAnimationFrame=callback=>{callbacks.set(++next,callback);return next;};
  globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
  try{
    const controller=createRenderWarmup(),ticket=controller.request({},()=>submitted++);
    const frame=()=>{const active=[...callbacks.values()];callbacks.clear();active.forEach(fn=>fn());};
    frame();equal(submitted,0,'first animation frame gives the browser a chance to paint the loading overlay');
    frame();await flush();equal(submitted,1,'GPU submission begins on the following frame');equal((await ticket.promise).status,'ready');
    controller.request({},()=>submitted++);frame();controller.dispose();frame();await flush();equal(submitted,1,'disposal between frames prevents queued submission');equal(callbacks.size,0);
  }finally{
    if(oldRAF===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=oldRAF;
    if(oldCancel===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=oldCancel;
  }
}
// Final DAY round: submit real night variants before readiness. These tests
// deliberately fail before the bounded adapter is implemented.
check(typeof warmupModule.compileWarmupLighting === 'function', 'night material variants have an actual warmup entry point');
for (const high of [false, true]) for (const failure of [null, 'reject', 'throw']) {
  const f = fixture(), waits = [], calls = [], original = {name: 'original'}, linear = {name: 'linear'};
  const scene = {name: 'native scene'}, camera = {name: 'native camera'};
  const composer = {readBuffer: linear, writeBuffer: {name: 'write'}, passes: [], renderToScreen: false};
  let target = original, face = 3, level = 2, bound = false, releases = 0;
  const renderer = {
    getRenderTarget: () => target, getActiveCubeFace: () => face, getActiveMipmapLevel: () => level,
    setRenderTarget(next, nextFace = 0, nextLevel = 0) {target = next;face = nextFace;level = nextLevel;},
    compileAsync(actual, view) {
      equal([actual, view], [scene, camera], 'night adapter compiles the real scene/camera');
      calls.push({bound, target});
      if (bound && failure === 'throw' && calls.filter(row => row.bound).length === 1) throw Error('native submit failed');
      const work = deferred();waits.push({work, bound});return work.promise;
    },
    render() {assert.fail('warmup must not draw');}, clear() {assert.fail('warmup must not clear');},
  };
  const withNightMaterials = submit => {
    equal(bound, false, 'variant scope never nests bindings');bound = true;
    try {return submit();} finally {bound = false;}
  };
  const ticket = f.controller.request('authored-day', () => warmupModule.compileWarmupLighting(
    renderer, scene, camera, composer, {high, withNightMaterials}));
  f.paint();await flush();
  equal([target, face, level, bound], [original, 3, 2, false], 'first submission restores target and actual scene binding immediately');
  equal(ticket.state.status, 'compiling', 'readiness waits for the actual initial compiler');
  f.controller.releaseWhenSettled(ticket, () => releases++);
  let processed = 0, rejected = false;
  for (let step = 0; step < 12; step++) {
    while (processed < waits.length) {
      const row = waits[processed++];
      if (row.bound && failure === 'reject' && !rejected) {row.work.reject(Error('native compile failed'));rejected = true;}
      else row.work.resolve();
    }
    await flush();
    equal([target, face, level, bound], [original, 3, 2, false], 'every submitted variant restores targets/bindings before yielding');
    if (waits.length > processed) {
      equal(ticket.state.status, 'compiling', 'a later native variant keeps the readiness gate held');
      equal(releases, 0, 'resources survive until every requested native variant settles');
    }
  }
  const state = await ticket.promise;
  equal(state.status, failure ? 'fallback' : 'ready', 'native variant failure is retained after all work settles');
  equal(releases, 1, 'variant resources release once after complete settlement');
  const variantTargets = calls.filter(row => row.bound).map(row => row.target);
  equal(variantTargets, high ? [linear] : [null, linear], 'night shaders prepare each actual main/mirror output mode');
  equal(f.controller.request('authored-day', () => assert.fail('night progress cannot recompile')), ticket,
    'unchanged structural readiness survives lighting progress');
  f.controller.dispose();
}
// An early variant failure cannot complete the ticket while the final actual
// native compile is deliberately unresolved (unlike the drain loop above).
for (const failure of ['reject', 'throw']) {
  const f = fixture(), first = deferred(), last = deferred();
  const scene = {}, camera = {}, linear = {}, original = {};
  let target = original, bound = false, calls = 0, lastSubmitted = false, releases = 0;
  const renderer = {getRenderTarget: () => target, setRenderTarget: next => {target = next;},
    compileAsync() {
      calls++;
      if (!bound) return first.promise;
      if (target === null) {
        if (failure === 'throw') throw Error('earlier submit failed');
        return Promise.reject(Error('earlier program failed'));
      }
      lastSubmitted = true;return last.promise;
    }};
  const withNightMaterials = submit => {bound = true;try{return submit();}finally{bound = false;}};
  const ticket = f.controller.request('authored-pending-last', () => warmupModule.compileWarmupLighting(
    renderer, scene, camera, {readBuffer: linear}, {high: false, withNightMaterials}));
  f.paint();f.controller.releaseWhenSettled(ticket, () => releases++);first.resolve();
  for (let i = 0; i < 20 && !lastSubmitted; i++) await flush();
  equal(lastSubmitted, true, 'later native variant is submitted even when the earlier variant fails');
  await flush();await flush();
  equal(ticket.state.status, 'compiling', 'earlier failure cannot finish readiness while final native compile is pending');
  equal(releases, 0, 'earlier failure cannot release actual resources held by final native poll');
  equal([target, bound], [original, false], 'pending final poll retains no temporary target or material binding');
  last.resolve();for (let i = 0; i < 12; i++) await flush();
  equal((await ticket.promise).status, 'fallback', 'earlier failure is reported only after last native compile settles');
  equal(releases, 1, 'actual material resources release exactly once after final settlement');
  equal(calls, 3, 'failure causes no implicit retry or extra scene compilation');f.controller.dispose();
}
// Replacing/disposal after the original submit must not bind a new world's
// night materials through the stale job when that first promise resolves.
check(typeof warmupModule.guardLightingWarmup === 'function', 'production night preparation has a stale-world submission guard');
for (const dispose of [false, true]) {
  const f = fixture(), initial = deferred(), fresh = deferred(), oldWorld = {}, newWorld = {};
  let currentWorld = oldWorld, currentRevision = 'old', stopped = false, bound = 0, releases = 0, submissions = 0;
  const renderer = {getRenderTarget: () => null, setRenderTarget() {},
    compileAsync() {submissions++;return initial.promise;}};
  const capturedWorld = currentWorld, capturedRevision = currentRevision;
  const withNightMaterials = warmupModule.guardLightingWarmup(
    () => !stopped && currentWorld === capturedWorld && currentRevision === capturedRevision,
    submit => {bound++;return submit();});
  const oldTicket = f.controller.request('old', () => warmupModule.compileWarmupLighting(
    renderer, {}, {}, {readBuffer: {}}, {high: false, withNightMaterials}));
  f.paint();f.controller.releaseWhenSettled(oldTicket, () => releases++);
  if (dispose) {stopped = true;f.controller.dispose();}
  else {currentWorld = newWorld;currentRevision = 'new';f.controller.request('new', () => fresh.promise);f.paint();}
  equal(releases, 0, 'stale/disposed job retains its original native compiler resources');
  initial.resolve();for (let i = 0; i < 12; i++) await flush();
  equal(bound, 0, 'stale/disposed callback cannot bind any new active night materials');
  equal(submissions, 1, 'stale/disposed callback submits no late output-mode variant');
  equal(releases, 1, 'original resources release only after the old compiler settles');
  equal((await oldTicket.promise).status, dispose ? 'disposed' : 'stale', 'old compiler cannot claim fresh readiness');
  fresh.resolve();for (let i = 0; i < 12; i++) await flush();f.controller.dispose();
}
console.log(`Render warmup controller: ${checks} checks passed; one compile per actual revision, paint opportunity, stale-result isolation, bounded loading, deferred GPU-resource release and no post-disposal work.`);
