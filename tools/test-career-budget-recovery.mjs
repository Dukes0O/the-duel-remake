import assert from 'node:assert/strict';
import * as budget from '../src/career-budget.js';
import {MAX_GHOST_BYTES,GHOST_KEY} from '../src/ghost.js';
import {createProfile,PLAYERS_KEY} from '../src/progression.js';
import {COURSE,DRIVE} from '../src/config.js';
import {LapTelemetryRecorder,LapTelemetryStore} from '../src/lap-telemetry.js';

const TELEMETRY_KEY='the-duel-lap-telemetry-v1';
const PRIMARY='origin-primary-v1';
const originalTimeout=globalThis.setTimeout;
// Model crashes explicitly, without surviving timers from a dead document.
const pendingTimers=[];
globalThis.setTimeout=callback=>{pendingTimers.push(callback);return pendingTimers.length;};
function memoryStorage(initial={}){
  const rows=new Map(Object.entries(initial));
  return {get length(){return rows.size;},key:index=>[...rows.keys()][index]??null,
    getItem:key=>rows.get(String(key))??null,setItem:(key,value)=>rows.set(String(key),String(value)),
    removeItem:key=>rows.delete(String(key)),dump:()=>Object.fromEntries(rows)};
}
function memoryIdb(initial=[]){
  const rows=new Map(initial.map(row=>[row.id,structuredClone(row)]));
  let saveHook=null,loadHook=null;
  return {rows,setSaveHook:hook=>{saveHook=hook;},setLoadHook:hook=>{loadHook=hook;},
    async save(value){if(saveHook)await saveHook(value);rows.set(value.id,structuredClone(value));},
    async load(id){if(loadHook)await loadHook(id);return structuredClone(rows.get(id));},
    dump:()=>[...rows.values()].map(value=>structuredClone(value))};
}
function fixture(entries={}){
  return {physical:memoryStorage({[budget.ORIGIN_POINTER_KEY]:JSON.stringify({version:1,id:PRIMARY})}),
    store:memoryIdb([{id:PRIMARY,version:1,revision:0,entries}])};
}
// Construct pre-change journals explicitly. New record writes go straight to
// IndexedDB, but every legacy recovery invariant must continue to hold.
function legacyWrite(context,key,value){
  const raw=context.physical.getItem(budget.ORIGIN_JOURNAL_KEY);
  const journal=raw?JSON.parse(raw):{version:1,baseRevision:0,operations:[]};
  journal.operations.push({key,oldLength:-1,oldHash:2166136261,prefix:0,suffix:0,insert:value,remove:false});
  context.physical.setItem(budget.ORIGIN_JOURNAL_KEY,JSON.stringify(journal));
}
function cloneFixture(context){return {physical:memoryStorage(context.physical.dump()),store:memoryIdb(context.store.dump())};}
function syntheticPlayers(){return JSON.stringify({version:2,activePlayerId:'kyle',players:[
  {id:'kyle',name:'Kyle',profile:createProfile()},
  {id:'son',name:'Son',profile:createProfile()},
]});}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function lockManager(){
  const held=new Map();
  return {held,request(name,options,callback){
    assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
    if(held.has(name))return Promise.resolve().then(()=>callback(null));
    const ended=deferred(),slot={ended};held.set(name,slot);
    const result=Promise.race([Promise.resolve().then(()=>callback({name,mode:'exclusive'})),ended.promise]);
    return result.finally(()=>{if(held.get(name)===slot)held.delete(name);});
  },close(name){held.get(name)?.ended.reject(new Error('Synthetic document destroyed'));}};
}
function lifecycle(){
  const listeners=new Map();let reloads=0;
  return {addEventListener(type,callback,options){assert.ok(options?.capture,'restoration listener must run before App handlers');listeners.set(type,callback);},
    fire(type,persisted=false){let stopped=false;listeners.get(type)?.({persisted,stopImmediatePropagation(){stopped=true;}});return stopped;},
    reload(){reloads++;},get reloads(){return reloads;}};
}
async function installed(context,writer){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try{return await budget.prepareCareerBudget({...context,writer,installGlobal:true});}
  finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
}
// Generate one semantically valid companion record through the real recorder.
// The circular course and all career data are synthetic, never player saves.
function recordedTelemetry(){
  const length=400,radius=length/(2*Math.PI);
  const at=s=>({x:radius*Math.sin(s/radius),y:0,z:radius*Math.cos(s/radius),heading:s/radius});
  const course={closed:true,length,def:COURSE[0],features:{ramps:[]},at,groundAt:at,halfWidthAt:()=>7};
  const context={course,playerId:'kyle',playerName:'Kyle',stageIndex:0,seed:1989,
    car:'falcone_f42',driverId:'club',mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',upgrades:{},tyre:'summer'};
  const recorder=new LapTelemetryRecorder(context);let record=null;
  for(let step=0;step<=80;step++){
    record=recorder.observe({...context,course:undefined,status:'racing',paused:false,
      s:step*5,lateral:0,speedMph:20/DRIVE.mphToWorld,gear:1,stageTimeSec:step/4,racePenaltySec:0,
      input:{throttle:.6,brake:0},completedLaps:step===80?1:0,lapTimes:step===80?[20]:[],
      lapStartedAt:step===80?20:0,assistedLaps:step===80?[false]:[],assistedLap:false})??record;
  }
  assert.ok(record,'the round-trip fixture must be emitted by the real recorder');
  return record;
}
let passes=0;const failures=[];
async function test(name,run){
  try{await run();passes++;console.log('PASS '+name);}
  catch(error){failures.push(name+': '+error.message);console.error('FAIL '+name+': '+error.message);}
  pendingTimers.length=0;
}
try{
  await test('accepted maximum ghost journal reloads without losing exact bytes',async()=>{
    const context=fixture({[PLAYERS_KEY]:syntheticPlayers(),'the-duel-archive-fixture':'unchanged'});
    legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    const {storage}=await budget.prepareCareerBudget(context);
    const size=budget.originStorageBytes(context.physical);
    assert.ok(size<budget.ORIGIN_BUDGET_BYTES);assert.ok(size>2_500_000);
    const restarted=cloneFixture(context),raw=restarted.physical.getItem(budget.ORIGIN_JOURNAL_KEY);
    const recovered=await budget.prepareCareerBudget(restarted);
    assert.equal(recovered.storage.getItem(GHOST_KEY),'x'.repeat(MAX_GHOST_BYTES));
    assert.equal(recovered.storage.getItem(PLAYERS_KEY),storage.getItem(PLAYERS_KEY));
    assert.equal(recovered.storage.getItem('the-duel-archive-fixture'),'unchanged');
    assert.equal(restarted.physical.getItem(budget.ORIGIN_JOURNAL_KEY),raw,'prepare must not trim recovery');
    await recovered.flush();assert.equal((await restarted.store.load(PRIMARY)).entries[GHOST_KEY],storage.getItem(GHOST_KEY));
  });
  await test('ghost and telemetry pending together allow player, settings and settlement writes',async()=>{
    const context=fixture({[PLAYERS_KEY]:syntheticPlayers()});
    legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    legacyWrite(context,TELEMETRY_KEY,JSON.stringify({version:1,padding:'t'.repeat(490_000)}));
    const {storage}=await budget.prepareCareerBudget(context);
    storage.setItem(PLAYERS_KEY,syntheticPlayers().replace('"credits":0','"credits":25'));
    storage.setItem('duel_route_variant','route_b');
    storage.setItem('the-duel-settlement-fixture',JSON.stringify({run:'native-result-fixture',paid:true}));
    storage.setItem('unrelated-tiny-setting','kept');
    assert.ok(budget.originStorageBytes(context.physical)<budget.ORIGIN_BUDGET_BYTES);
    const recovered=await budget.prepareCareerBudget(cloneFixture(context));
    for(const key of [GHOST_KEY,TELEMETRY_KEY,PLAYERS_KEY,'duel_route_variant','the-duel-settlement-fixture','unrelated-tiny-setting']){
      assert.equal(recovered.storage.getItem(key),storage.getItem(key));
    }
    await recovered.flush();
  });
  await test('Unicode and escaped record journals measure physical bytes and recover exactly',async()=>{
    for(const payload of ['é'.repeat(240_000),'🏁'.repeat(120_000),'\\"\n'.repeat(70_000)]){
      const context=fixture();
      legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
      legacyWrite(context,TELEMETRY_KEY,payload);
      const {storage}=await budget.prepareCareerBudget(context);
      const measured=Object.entries(context.physical.dump()).reduce((sum,[key,value])=>sum+2*(key.length+value.length),0);
      assert.equal(budget.originStorageBytes(context.physical),measured);assert.ok(measured<budget.ORIGIN_BUDGET_BYTES);
      const recovered=await budget.prepareCareerBudget(cloneFixture(context));
      assert.equal(recovered.storage.getItem(TELEMETRY_KEY),payload);await recovered.flush();
    }
  });
  await test('failed flush retains record plus subsequent ordinary writes through reload',async()=>{
    const context=fixture();legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    const {storage}=await budget.prepareCareerBudget(context);
    context.store.setSaveHook(()=>{throw new Error('Synthetic durable failure');});
    await assert.rejects(storage.flush(),/Synthetic durable failure/);
    storage.setItem('duel_route_variant','route_c');
    const recovered=await budget.prepareCareerBudget(cloneFixture(context));
    assert.equal(recovered.storage.getItem(GHOST_KEY),storage.getItem(GHOST_KEY));
    assert.equal(recovered.storage.getItem('duel_route_variant'),'route_c');await recovered.flush();
  });
  await test('writes accepted during delayed flush stay in the remaining journal',async()=>{
    const context=fixture();legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    const {storage}=await budget.prepareCareerBudget(context);
    const delay=deferred(),entered=deferred();
    context.store.setSaveHook(async()=>{entered.resolve();await delay.promise;});
    const flushing=storage.flush();await entered.promise;
    let recording;
    try{
      recording=storage.setItem(TELEMETRY_KEY,'t'.repeat(490_000));
      storage.setItem('duel_route_variant','route_b');
    }finally{context.store.setSaveHook(null);delay.resolve();await flushing;}
    await recording;
    const recovered=await budget.prepareCareerBudget(cloneFixture(context));
    assert.equal(recovered.storage.getItem(GHOST_KEY),storage.getItem(GHOST_KEY));
    assert.equal(recovered.storage.getItem(TELEMETRY_KEY),storage.getItem(TELEMETRY_KEY));
    assert.equal(recovered.storage.getItem('duel_route_variant'),'route_b');
  });
  await test('already consumed journal recovers once after failed cleanup',async()=>{
    const context=fixture();legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    const {storage}=await budget.prepareCareerBudget(context);
    const pending=context.physical.getItem(budget.ORIGIN_JOURNAL_KEY);await storage.flush();
    context.physical.setItem(budget.ORIGIN_JOURNAL_KEY,pending);
    const recovered=await budget.prepareCareerBudget(cloneFixture(context));
    assert.equal(recovered.storage.getItem(GHOST_KEY),'x'.repeat(MAX_GHOST_BYTES));
    assert.equal(recovered.storage.snapshotRevision,1);await recovered.flush();
    assert.equal(recovered.storage.snapshotRevision,1);
  });
  await test('corrupt recovery rejects without deleting or rewriting bytes',async()=>{
    const context=fixture();legacyWrite(context,GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    const {storage}=await budget.prepareCareerBudget(context);
    const valid=JSON.parse(context.physical.getItem(budget.ORIGIN_JOURNAL_KEY));
    const cases=['{',JSON.stringify({...valid,version:2}),JSON.stringify({...valid,baseRevision:77}),
      JSON.stringify({...valid,operations:valid.operations.map(op=>({...op,oldHash:17}))}),
      JSON.stringify({...valid,operations:valid.operations.map(op=>({...op,oldLength:91}))})];
    for(const raw of cases){
      const copy=cloneFixture(context);copy.physical.setItem(budget.ORIGIN_JOURNAL_KEY,raw);
      const before=copy.physical.dump();await assert.rejects(budget.prepareCareerBudget(copy));assert.deepEqual(copy.physical.dump(),before);
    }
    const missing=cloneFixture(context);missing.store.rows.delete(PRIMARY);const before=missing.physical.dump();
    await assert.rejects(budget.prepareCareerBudget(missing));assert.deepEqual(missing.physical.dump(),before);
  });
  await test('full physical cap rejects ordinary changes before mutation without a record reserve',async()=>{
    const context=fixture();const {storage}=await budget.prepareCareerBudget(context);
    await storage.setItem(GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
    await storage.setItem(TELEMETRY_KEY,'t'.repeat(490_000));
    await storage.setItem(TELEMETRY_KEY,'"'.repeat(490_000));
    assert.equal(storage.getItem(TELEMETRY_KEY),'"'.repeat(490_000));
    assert.ok(budget.originStorageBytes(context.physical)<2_000);
    storage.setItem('duel_oversized_ordinary','q'.repeat(210_000));
    assert.equal(storage.getItem('duel_oversized_ordinary').length,210_000);
    await storage.flush();
    const before=context.physical.dump();
    assert.throws(()=>storage.setItem('duel_full_ordinary','q'.repeat(2_000_000)),/budget is full/);
    assert.deepEqual(context.physical.dump(),before);
    assert.equal(storage.getItem('duel_full_ordinary'),null);
    const excess=cloneFixture(context);excess.physical.setItem('unrelated','x'.repeat(2_000_000));
    const original=excess.physical.dump();
    await assert.rejects(budget.prepareCareerBudget(excess),/Space used by unrelated/);
    assert.deepEqual(excess.physical.dump(),original);
  });
  await test('one writer acquires promptly while its lifetime request stays pending',async()=>{
    assert.equal(typeof budget.acquireCareerWriter,'function');
    const locks=lockManager(),events=lifecycle(),name='same-memory-career';
    const writer=await budget.acquireCareerWriter({locks,name,eventTarget:events,reload:()=>events.reload()});
    writer.assertActive();assert.equal(locks.held.size,1);
    await assert.rejects(budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()}),error=>error.code==='CAREER_WRITER_BUSY');
    const context=fixture();const {storage}=await installed(context,writer);
    await storage.setItem(TELEMETRY_KEY,'Kyle lap');await storage.flush();
    await assert.rejects(installed(context,writer),/already|claimed/i);
    assert.equal(events.fire('pagehide'),false);
    assert.throws(()=>storage.setItem(TELEMETRY_KEY,'stale overwrite'),/writer|reload|active/i);
    await assert.rejects(storage.flush(),/writer|reload|active/i);
    assert.equal(events.fire('pageshow',true),true);assert.equal(events.reloads,1);
    locks.close(name);await Promise.resolve();await Promise.resolve();
    const fresh=await budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()});
    const next=await installed(context,fresh);assert.equal(next.storage.getItem(TELEMETRY_KEY),'Kyle lap');
    await next.storage.setItem(TELEMETRY_KEY,'Kyle lap + son lap');await next.flush();
    assert.equal((await context.store.load(PRIMARY)).entries[TELEMETRY_KEY],'Kyle lap + son lap');
    locks.close(name);
  });
  await test('missing lock API and missing production lease fail before storage reads or writes',async()=>{
    assert.equal(typeof budget.acquireCareerWriter,'function');
    await assert.rejects(budget.acquireCareerWriter({locks:null}),error=>error.code==='CAREER_WRITER_UNAVAILABLE');
    const context=fixture();let reads=0;context.store.setLoadHook(()=>{reads++;});const before=context.physical.dump();
    await assert.rejects(installed(context),/writer|lease/i);assert.equal(reads,0);assert.deepEqual(context.physical.dump(),before);
  });
  await test('ownership is rechecked after an awaited startup read',async()=>{
    assert.equal(typeof budget.acquireCareerWriter,'function');
    const locks=lockManager(),events=lifecycle(),name='startup-stale';
    const writer=await budget.acquireCareerWriter({locks,name,eventTarget:events});
    const context=fixture(),gate=deferred(),entered=deferred();
    context.store.setLoadHook(async()=>{entered.resolve();await gate.promise;});
    const before=context.physical.dump(),starting=installed(context,writer);await entered.promise;
    events.fire('pagehide');gate.resolve();await assert.rejects(starting,/writer|reload|active/i);
    assert.deepEqual(context.physical.dump(),before);locks.close(name);
  });
  await test('simultaneous writer requests admit one document',async()=>{
    const locks=lockManager(),name='simultaneous-writers';
    const attempts=await Promise.allSettled([1,2].map(()=>budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()})));
    assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(attempts.filter(result=>result.status==='rejected'&&result.reason.code==='CAREER_WRITER_BUSY').length,1);
    locks.close(name);
  });
  await test('flush does not clean the journal after ownership is suspended during verification',async()=>{
    const locks=lockManager(),events=lifecycle(),name='flush-await';
    const writer=await budget.acquireCareerWriter({locks,name,eventTarget:events});
    const context=fixture();legacyWrite(context,TELEMETRY_KEY,'accepted lap');
    const {storage}=await installed(context,writer);const before=context.physical.dump();
    const gate=deferred(),entered=deferred();
    context.store.setLoadHook(async()=>{entered.resolve();await gate.promise;});
    const flushing=storage.flush();await entered.promise;
    await assert.rejects(budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()}),error=>error.code==='CAREER_WRITER_BUSY');
    events.fire('pagehide');gate.resolve();await assert.rejects(flushing,/writer|reload|active/i);
    assert.deepEqual(context.physical.dump(),before,'accepted recovery bytes remain after the durable write');
    assert.equal(context.store.rows.get(PRIMARY).entries[TELEMETRY_KEY],'accepted lap');
    locks.close(name);
  });
  await test('import checks ownership after reading the prior durable snapshot',async()=>{
    const locks=lockManager(),events=lifecycle(),name='import-await';
    const writer=await budget.acquireCareerWriter({locks,name,eventTarget:events});
    const context=fixture({[PLAYERS_KEY]:syntheticPlayers()}),{storage}=await installed(context,writer);
    const exported=budget.createBudgetCareerExport(storage),before=context.physical.dump(),beforeDb=context.store.dump();
    const gate=deferred(),entered=deferred();
    context.store.setLoadHook(async()=>{entered.resolve();await gate.promise;});
    const importing=budget.importBudgetCareer(exported,{storage,store:context.store});await entered.promise;
    await assert.rejects(budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()}),error=>error.code==='CAREER_WRITER_BUSY');
    events.fire('pagehide');gate.resolve();await assert.rejects(importing,/writer|reload|active/i);
    assert.deepEqual(context.physical.dump(),before);assert.deepEqual(context.store.dump(),beforeDb);
    locks.close(name);
  });
  await test('suspended import retains a completed replacement marker for the next owner',async()=>{
    const locks=lockManager(),events=lifecycle(),name='import-durable-await';
    const writer=await budget.acquireCareerWriter({locks,name,eventTarget:events});
    const context=fixture({[PLAYERS_KEY]:syntheticPlayers()}),{storage}=await installed(context,writer);
    const replacement=JSON.parse(budget.createBudgetCareerExport(storage));
    const players=JSON.parse(replacement.entries[PLAYERS_KEY]);players.players[0].name='Imported Kyle';
    replacement.entries[PLAYERS_KEY]=JSON.stringify(players);
    const gate=deferred(),entered=deferred();
    context.store.setSaveHook(async record=>{if(record.id===PRIMARY){entered.resolve();await gate.promise;}});
    const importing=budget.importBudgetCareer(JSON.stringify(replacement),{storage,store:context.store});await entered.promise;
    const marker=context.physical.getItem(budget.ORIGIN_POINTER_KEY);assert.ok(JSON.parse(marker).backupId);
    events.fire('pagehide');gate.resolve();await assert.rejects(importing,/Recovery backup|writer|reload|active/i);
    assert.equal(context.physical.getItem(budget.ORIGIN_POINTER_KEY),marker,'inactive old owner cannot roll back or clean the marker');
    assert.equal(JSON.parse(context.store.rows.get(PRIMARY).entries[PLAYERS_KEY]).players[0].name,'Imported Kyle');
    locks.close(name);await Promise.resolve();await Promise.resolve();
    context.store.setSaveHook(null);
    const fresh=await budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()});
    const recovered=await installed(context,fresh);
    assert.equal(JSON.parse(recovered.storage.getItem(PLAYERS_KEY)).players[0].name,'Imported Kyle');
    assert.deepEqual(JSON.parse(context.physical.getItem(budget.ORIGIN_POINTER_KEY)),{version:1,id:PRIMARY});
    locks.close(name);
  });
  for(const variant of ['valid','malformed','future']){
    await test(`guarded ${variant} telemetry survives direct commit, export, import and fresh reload exactly`,async()=>{
      const lap=recordedTelemetry(),locks=lockManager(),name='companion-roundtrip-'+variant;
      const events=lifecycle(),writer=await budget.acquireCareerWriter({locks,name,eventTarget:events});
      const sourceEntries={[PLAYERS_KEY]:syntheticPlayers(),
        [GHOST_KEY]:JSON.stringify({version:1,records:[],archivedRecords:[]}),
        'the-duel-preserved-fixture':'untouched é and 🏁'};
      const source=fixture(sourceEntries),first=await installed(source,writer);
      if(variant==='valid'){
        const saved=await new LapTelemetryStore(first.storage).record(lap);
        assert.equal(saved.saved,true);assert.equal(saved.status,'saved');
      }else{
        // Spaces and trailing newline make normalization detectable byte for byte.
        const raw=variant==='malformed'?' { "version": 1, "laps": [ broken 🏁 \n':
          JSON.stringify({version:9001,laps:[lap],unknown:{text:'keep é and 🏁'}},null,2)+'\n';
        await first.storage.setItem(TELEMETRY_KEY,raw);
      }
      const expectedRaw=first.storage.getItem(TELEMETRY_KEY);
      const pending=source.physical.getItem(budget.ORIGIN_JOURNAL_KEY);
      assert.equal(pending,null,'record payload must never enter the localStorage journal');
      assert.equal(source.store.rows.get(PRIMARY).entries[TELEMETRY_KEY],expectedRaw);
      events.fire('pagehide');locks.close(name);await Promise.resolve();await Promise.resolve();
      const recoveredContext=cloneFixture(source);
      const recoveredWriter=await budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()});
      const recovered=await installed(recoveredContext,recoveredWriter);
      assert.equal(recoveredContext.physical.getItem(budget.ORIGIN_JOURNAL_KEY),pending);
      assert.equal(recovered.storage.getItem(TELEMETRY_KEY),expectedRaw);
      const loaded=new LapTelemetryStore(recovered.storage).best(lap);
      if(variant==='valid'){assert.equal(loaded.status,'saved');assert.deepEqual(loaded.lap,lap);}
      else{
        assert.equal(loaded.status,'unavailable');assert.equal(loaded.lap,null);
        assert.equal(new LapTelemetryStore(recovered.storage).record(lap).status,'session-only');
        assert.equal(recovered.storage.getItem(TELEMETRY_KEY),expectedRaw);
        assert.equal(recoveredContext.physical.getItem(budget.ORIGIN_JOURNAL_KEY),pending);
      }
      const exported=budget.createBudgetCareerExport(recovered.storage);
      assert.deepEqual(JSON.parse(exported).entries,{...sourceEntries,[TELEMETRY_KEY]:expectedRaw});
      await recovered.flush();locks.close(name);await Promise.resolve();await Promise.resolve();
      const target=fixture({[PLAYERS_KEY]:syntheticPlayers(),'the-duel-prior-target':'recoverable before import'});
      const targetPrior=structuredClone(target.store.rows.get(PRIMARY).entries);
      const targetWriter=await budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()});
      const targetFacade=await installed(target,targetWriter);
      const imported=await budget.importBudgetCareer(exported,{storage:targetFacade.storage,store:target.store});
      assert.equal(imported.playerCount,2);
      assert.deepEqual(target.store.rows.get(imported.backupId).entries,targetPrior);
      assert.equal(targetFacade.storage.getItem(TELEMETRY_KEY),expectedRaw);
      assert.equal(target.store.rows.get(PRIMARY).entries[TELEMETRY_KEY],expectedRaw);
      locks.close(name);await Promise.resolve();await Promise.resolve();
      const reload=cloneFixture(target),reloadWriter=await budget.acquireCareerWriter({locks,name,eventTarget:lifecycle()});
      const final=await installed(reload,reloadWriter);
      assert.deepEqual(JSON.parse(budget.createBudgetCareerExport(final.storage)).entries,JSON.parse(exported).entries);
      const best=new LapTelemetryStore(final.storage).best(lap);
      if(variant==='valid'){assert.equal(best.status,'saved');assert.deepEqual(best.lap,lap);}
      else{assert.equal(best.status,'unavailable');assert.equal(best.lap,null);}
      assert.equal(final.storage.getItem(TELEMETRY_KEY),expectedRaw);
      assert.equal(reload.physical.getItem(budget.ORIGIN_JOURNAL_KEY),null);
      locks.close(name);await Promise.resolve();await Promise.resolve();
    });
  }
  await test('lock request denial becomes an unavailable-writer error',async()=>{
    await assert.rejects(budget.acquireCareerWriter({locks:{request(){throw new Error('Synthetic security policy');}}}),
      error=>error.code==='CAREER_WRITER_UNAVAILABLE');
  });
}finally{globalThis.setTimeout=originalTimeout;}
console.log(`Career recovery and writer tests: ${passes} passed, ${failures.length} failed.`);
if(failures.length)process.exitCode=1;
