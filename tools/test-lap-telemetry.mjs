import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as teamRoom from '../src/screen-team-room.js';
import {App} from '../src/app.js';
import {COURSE,DRIVE} from '../src/config.js';
import {Course} from '../src/course.js';
import {analyseLap,courseFingerprint} from '../src/track-analysis.js';
import {captureCareer,createCareerExport,parseCareerExport} from '../src/career-backup.js';
import {ownTestCourses} from './career-fixture.mjs';
import {LapTelemetryRecorder,LapTelemetryStore,TELEMETRY_KEY,MAX_TELEMETRY_BYTES,
  MAX_TELEMETRY_RECORDS,MAX_TELEMETRY_SAMPLES,telemetryKey,telemetryRoute,compareLapTelemetry} from '../src/lap-telemetry.js';

function circle(length=400){
  const radius=length/(2*Math.PI);
  const at=s=>({x:radius*Math.sin(s/radius),y:0,z:radius*Math.cos(s/radius),heading:s/radius});
  return {closed:true,length,def:COURSE[0],features:{ramps:[]},at,groundAt:at,halfWidthAt:()=>7};
}
const course=circle(),player={id:'telemetry-kyle',name:'Kyle'};
const context={course,playerId:player.id,playerName:player.name,stageIndex:0,seed:1989,
  car:'falcone_f42',driverId:'club',mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',upgrades:{engine:0},tyre:'summer'};
function state(overrides={}){
  return {playerId:player.id,stageIndex:0,seed:1989,car:'falcone_f42',driverId:'club',upgrades:{engine:0},tyre:'summer',
    mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',status:'racing',paused:false,
    s:0,lateral:0,speedMph:20/DRIVE.mphToWorld,gear:1,stageTimeSec:0,racePenaltySec:0,
    input:{throttle:.6,brake:0},completedLaps:0,lapTimes:[],lapStartedAt:0,assistedLaps:[],assistedLap:false,...overrides};
}
function drive({seconds=20,step=7,recordContext=context,mutate=()=>{}}={}){
  const recorder=new LapTelemetryRecorder(recordContext),length=recordContext.course.length;
  let last=null;const initial=state({speedMph:length/seconds/DRIVE.mphToWorld});recorder.observe(initial);
  const steps=Math.ceil(length/step);
  for(let i=1;i<=steps;i++){
    const distance=Math.min(length,i*step),time=distance/length*seconds;
    const sample=state({s:distance,stageTimeSec:time,speedMph:length/seconds/DRIVE.mphToWorld,
      lateral:distance/length*2,input:{throttle:.6,brake:i%3?.1:0},
      completedLaps:i===steps?1:0,lapTimes:i===steps?[seconds]:[],lapStartedAt:i===steps?seconds:0,
      assistedLaps:i===steps?[false]:[]});
    mutate(sample,i,recorder);last=recorder.observe(sample)||last;
  }
  return {recorder,record:last};
}
function memoryStorage(initial={}){
  const rows=new Map(Object.entries(initial));let writes=0,denied=false;
  return {get length(){return rows.size;},key:index=>[...rows.keys()][index]??null,
    getItem:key=>rows.get(String(key))??null,setItem(key,value){if(denied)throw Error('Synthetic quota denial');writes++;rows.set(String(key),String(value));},
    removeItem:key=>rows.delete(String(key)),dump:()=>Object.fromEntries(rows),get writes(){return writes;},deny(value=true){denied=value;}};
}
function query(record){return {playerId:record.playerId,eventId:record.eventId,route:record.route,courseFingerprint:record.courseFingerprint};}
function rekey(record,patch){const next={...structuredClone(record),...patch};next.key=telemetryKey(next);return next;}
let passes=0;const failures=[];
async function test(name,run){try{await run();passes++;console.log('PASS '+name);}catch(error){failures.push(name);console.error('FAIL '+name+': '+error.stack);}}

await test('actual 20 m crossings and complete endpoints use shared lap analysis',()=>{
  const {record}=drive();assert.ok(record);assert.equal(record.lapMs,20000);
  assert.equal(record.trace.length,21);assert.deepEqual(record.trace.map(row=>row[0]),Array.from({length:21},(_,i)=>i*20));
  assert.equal(record.controls.length,record.trace.length);assert.equal(record.controls[0][0],0);assert.equal(record.controls.at(-1)[0],20000);
  assert.ok(record.controls.every(row=>row.length===5&&row.every(Number.isSafeInteger)));
  assert.deepEqual(record.controls.at(-1).slice(3),[200,1]);
  assert.equal(record.courseFingerprint,courseFingerprint(course,{route:'route_a'}));
  assert.equal(record.sectorMs.reduce((a,b)=>a+b,0),record.lapMs);
  const nativeTrace=record.trace.map(([s,kph],i)=>({s,mph:kph/1.609344,t:record.controls[i][0]/1000,gear:record.controls[i][4]}));
  const analysis=analyseLap(course,{trace:nativeTrace,lapMs:record.lapMs,route:'route_a'});
  assert.deepEqual(record.sectorMs,analysis.sectorMs);
  assert.deepEqual(record.corners.map(row=>[row.id,row.elapsedMs]),analysis.corners.map(row=>[row.id,row.elapsedMs]));
  assert.equal(record.car,context.car);assert.equal(record.driverId,'club');assert.equal(record.tyre,'summer');
});
await test('crossing capture is stable across different native observation sizes',()=>{
  const fine=drive({step:2}).record,coarse=drive({step:13}).record;
  assert.deepEqual(fine.trace,coarse.trace);assert.deepEqual(fine.sectorMs,coarse.sectorMs);
  assert.deepEqual(fine.controls.map(row=>[row[0],row[3]]),coarse.controls.map(row=>[row[0],row[3]]));
});
await test('distance coverage alone cannot fabricate a completed native lap',()=>{
  assert.equal(drive({mutate:sample=>{sample.completedLaps=0;sample.lapTimes=[];sample.lapStartedAt=0;}}).record,null);
  assert.equal(drive({mutate:sample=>{if(sample.completedLaps)sample.lapTimes=[];}}).record,null);
  assert.equal(drive({mutate:sample=>{if(sample.completedLaps)sample.lapStartedAt=0;}}).record,null);
});
await test('pauses and countdown observations cannot advance or poison valid capture',()=>{
  const recorder=new LapTelemetryRecorder(context);recorder.observe(state({status:'countdown',s:900,stageTimeSec:999}));
  recorder.observe(state());recorder.observe(state({paused:true,s:900,stageTimeSec:999}));
  let record;
  for(let i=1;i<=40;i++)record=recorder.observe(state({s:i*10,stageTimeSec:i*.5,
    completedLaps:i===40?1:0,lapTimes:i===40?[20]:[],lapStartedAt:i===40?20:0,assistedLaps:i===40?[false]:[]}))||record;
  assert.ok(record);assert.equal(record.lapMs,20000);
});
await test('reset, impossible jump and assisted travel invalidate the affected lap',()=>{
  for(const alter of [
    (sample,i,recorder)=>{if(i===4)recorder.discontinuity();},
    (sample,i)=>{if(i===4)sample.s+=200;},
    sample=>{if(sample.completedLaps)sample.assistedLaps=[true];},
    (sample,i)=>{if(i===4)sample.assistedLap=true;},
    (sample,i)=>{if(i===4)sample.input.throttle=NaN;},
    (sample,i)=>{if(i===4)sample.input.brake=1.1;},
    (sample,i)=>{if(i===4)sample.lateral=Infinity;},
  ])assert.equal(drive({mutate:alter}).record,null);
});
await test('a later clean lap survives an invalid first lap with a real seam endpoint',()=>{
  const recorder=new LapTelemetryRecorder(context);recorder.observe(state());let first=null,second=null;
  for(let i=1;i<=80;i++){
    if(i===8)recorder.discontinuity();
    const completed=Math.floor(i/40),laps=Array.from({length:completed},()=>20);
    const result=recorder.observe(state({s:i*10,stageTimeSec:i*.5,completedLaps:completed,lapTimes:laps,
      lapStartedAt:completed*20,assistedLaps: Array(completed).fill(false)}));
    if(i===40)first=result;if(i===80)second=result;
  }
  assert.equal(first,null);assert.ok(second);assert.equal(second.lapMs,20000);
  assert.equal(second.controls[0][0],0);assert.equal(second.controls.at(-1)[0],20000);assert.equal(second.trace.at(-1)[0],400);
});
await test('legal reverse detour replaces superseded crossings and keeps all elapsed time',()=>{
  const recorder=new LapTelemetryRecorder(context);recorder.observe(state());
  for(let s=10;s<=100;s+=10)recorder.observe(state({s,stageTimeSec:s/20}));
  for(let s=90;s>=40;s-=10)recorder.observe(state({s,stageTimeSec:5+(100-s)/10,speedMph:-10/DRIVE.mphToWorld,gear:-1}));
  let record=null;
  for(let s=50;s<=400;s+=10){
    const t=11+(s-40)/20;
    record=recorder.observe(state({s,stageTimeSec:t,completedLaps:s===400?1:0,lapTimes:s===400?[29]:[],
      lapStartedAt:s===400?29:0,assistedLaps:s===400?[false]:[]}))||record;
  }
  assert.ok(record);assert.equal(record.lapMs,29000);assert.equal(record.controls[2][0],11000);
  assert.equal(record.controls[5][0],14000);assert.ok(record.controls.every((row,i)=>!i||row[0]>record.controls[i-1][0]));
  assert.equal(record.sectorMs.reduce((a,b)=>a+b,0),29000);
  assert.ok(record.sectorMs[0]>12000,'reverse delay remains in the first sector');
});
await test('reverse before the start line keeps native t=0 and signed gear data',()=>{
  const recorder=new LapTelemetryRecorder(context);recorder.observe(state({gear:-1,speedMph:0}));
  recorder.observe(state({s:-10,stageTimeSec:1,speedMph:-10/DRIVE.mphToWorld,gear:-1}));
  recorder.observe(state({s:0,stageTimeSec:2,speedMph:10/DRIVE.mphToWorld,gear:-1}));
  let record=null;
  for(let s=10;s<=400;s+=10){
    const t=2+s/20;
    record=recorder.observe(state({s,stageTimeSec:t,gear:-1,speedMph:20/DRIVE.mphToWorld,
      completedLaps:s===400?1:0,lapTimes:s===400?[22]:[],lapStartedAt:s===400?22:0,assistedLaps:s===400?[false]:[]}))||record;
  }
  assert.ok(record);assert.equal(record.controls[0][0],0);assert.equal(record.controls[1][0],3000);
  assert.ok(record.controls.every(row=>row[4]===-1));assert.ok(record.trace.every(row=>row[1]>=0));
  assert.ok(record.corners.some(row=>row.gear==='R'));
});
await test('changing player, car, driver or build cannot relabel an active recording',()=>{
  for(const patch of [{playerId:'another'},{car:'stuttgart_959s'},{driverId:'mara_vale'},{upgrades:{engine:1}},{seed:42},{tyre:'winter'}]){
    assert.equal(drive({mutate:(sample,i)=>{if(i>=4)Object.assign(sample,patch);}}).record,null);
  }
});
await test('curated route identity has no arbitrary-seed fallback',()=>{
  assert.equal(telemetryRoute('pacific-canyon',1989),'route_a');assert.equal(telemetryRoute('pacific-canyon',42),'route_b');
  assert.equal(telemetryRoute('pacific-canyon',17),'route_c');assert.equal(telemetryRoute('pacific-canyon',123),null);
  assert.equal(telemetryRoute('panorama-ridge',1989),'fixed');
  assert.equal(drive({recordContext:{...context,seed:123},mutate:sample=>{sample.seed=123;}}).record,null);
});
await test('storage replaces only a faster lap for the exact player/event/route/geometry',()=>{
  const storage=memoryStorage(),store=new LapTelemetryStore(storage),base=drive().record,faster=drive({seconds:18}).record;
  assert.equal(store.record(base).saved,true);const writes=storage.writes;
  assert.equal(store.record(base).changed,false);assert.equal(store.record(drive({seconds:23}).record).changed,false);
  assert.equal(storage.writes,writes);assert.equal(store.record(faster).saved,true);
  assert.equal(store.best(query(base)).lap.lapMs,18000);
  for(const patch of [{playerId:'son'},{route:'route_b',seed:42},{courseFingerprint:'track-v1-12345678'}]){
    const other=rekey(base,patch);assert.equal(store.record(other).saved,true);assert.equal(store.best(query(other)).lap.lapMs,20000);
  }
  assert.equal(store.best({...query(base),playerId:'unrecorded'}).lap,null);
  assert.equal(JSON.parse(storage.getItem(TELEMETRY_KEY)).laps.length,4);
});
await test('malformed, future and over-limit stores preserve all raw bytes',()=>{
  const base=drive().record;
  const malformed=structuredClone(base);malformed.controls[1][0]=-3;
  for(const raw of ['{bad',JSON.stringify({version:9,laps:[base],future:'kept'}),
    JSON.stringify({version:1,laps:[malformed]}),' '.repeat(MAX_TELEMETRY_BYTES+1)]){
    const storage=memoryStorage({[TELEMETRY_KEY]:raw}),store=new LapTelemetryStore(storage);
    assert.equal(store.best(query(base)).lap,null);assert.equal(store.record(base).saved,false);
    assert.equal(storage.getItem(TELEMETRY_KEY),raw);assert.equal(storage.writes,0);
    assert.equal(store.best(query(base)).status,'session-only');
  }
});
await test('quota denial retains a session lap without changing durable data or another player',()=>{
  const storage=memoryStorage(),store=new LapTelemetryStore(storage),base=drive().record;
  const son=rekey(base,{playerId:'son'});store.record(base);store.record(son);
  const before=storage.dump();storage.deny();const faster=drive({seconds:17}).record;
  const result=store.record(faster);assert.equal(result.saved,false);assert.equal(result.changed,true);
  assert.match(result.message,/session/i);assert.deepEqual(storage.dump(),before);
  assert.equal(store.best(query(base)).lap.lapMs,17000);assert.equal(store.best(query(son)).lap.lapMs,20000);
});
await test('reading current companion data preserves an external newer best',()=>{
  const storage=memoryStorage(),first=new LapTelemetryStore(storage),second=new LapTelemetryStore(storage);
  const base=drive().record;first.record(base);second.record(drive({seconds:16}).record);
  const before=storage.writes;assert.equal(first.record(drive({seconds:18}).record).changed,false);
  assert.equal(storage.writes,before);assert.equal(first.best(query(base)).lap.lapMs,16000);
});
await test('record and byte caps reject new writes without evicting existing laps',()=>{
  const base=drive().record,storage=memoryStorage(),store=new LapTelemetryStore(storage);
  for(let i=0;i<MAX_TELEMETRY_RECORDS;i++)assert.equal(store.record(rekey(base,{playerId:'player-'+i})).saved,true);
  const before=storage.getItem(TELEMETRY_KEY),extra=rekey(base,{playerId:'one-too-many'});
  assert.equal(store.record(extra).saved,false);assert.equal(storage.getItem(TELEMETRY_KEY),before);
  assert.equal(store.best(query(extra)).status,'session-only');
  const wide=rekey(base,{courseLength:20000,lapMs:1_000_000,sectorMs:[333333,333334,333333],
    trace:Array.from({length:1001},(_,i)=>[i*20,72]),controls:Array.from({length:1001},(_,i)=>[i*1000,80,0,0,2])});
  assert.ok(wide.trace.length<=MAX_TELEMETRY_SAMPLES);
  const bytesStorage=memoryStorage(),bytesStore=new LapTelemetryStore(bytesStorage);let stopped=false;
  for(let i=0;i<MAX_TELEMETRY_RECORDS;i++){
    const prior=bytesStorage.getItem(TELEMETRY_KEY),result=bytesStore.record(rekey(wide,{playerId:'wide-'+i}));
    if(!result.saved){assert.equal(bytesStorage.getItem(TELEMETRY_KEY),prior);stopped=true;break;}
  }
  assert.ok(stopped);assert.ok(new TextEncoder().encode(bytesStorage.getItem(TELEMETRY_KEY)).length<=MAX_TELEMETRY_BYTES);
});
await test('all seven historical saves stay exact and companion backup round-trips',async()=>{
  const files=(await readdir(new URL('./fixtures/saves/',import.meta.url))).filter(name=>/^0[1-7].*\.json$/.test(name));
  assert.equal(files.length,7);const base=drive().record;
  for(const file of files){
    const fixture=JSON.parse(await readFile(new URL('./fixtures/saves/'+file,import.meta.url),'utf8'));
    const original=Object.fromEntries(Object.entries(fixture.storage).map(([key,value])=>[key,JSON.stringify(value)]));
    const storage=memoryStorage(original),store=new LapTelemetryStore(storage);assert.deepEqual(storage.dump(),original);
    assert.equal(store.record(base).saved,true);
    for(const [key,value] of Object.entries(original))assert.equal(storage.getItem(key),value,file+' preserves '+key);
    const exported=JSON.parse(createCareerExport(storage));assert.equal(exported.entries[TELEMETRY_KEY],storage.getItem(TELEMETRY_KEY));
    const imported=memoryStorage(exported.entries);assert.deepEqual(new LapTelemetryStore(imported).best(query(base)).lap,base);
  }
});
await test('comparison uses matching geometry and ranks measured positive corner losses',()=>{
  const base=drive().record,reference={...base,car:'stuttgart_959s',sectorMs:[6000,6000,8000],
    corners:Array.from({length:4},(_,i)=>({id:'c'+(i+1),s:40+i*70,brakeS:20+i*70,entryKph:110,minKph:80,exitKph:110,gear:3,elapsedMs:1000}))};
  const playerLap={...base,car:'falcone_f42',sectorMs:[7000,6000,7000],corners:reference.corners.map((row,i)=>({...row,elapsedMs:1000+[300,100,700,-100][i],entryKph:90,exitKph:100}))};
  const comparison=compareLapTelemetry(playerLap,reference);assert.equal(comparison.status,'ready');
  assert.equal(comparison.referenceLabel,'Reference lap: Stuttgart 959-S');
  assert.deepEqual(comparison.losses.map(row=>[row.id,row.lossMs]),[['c3',700],['c1',300],['c2',100]]);
  assert.deepEqual(comparison.sectors.map(row=>row.deltaMs),[1000,0,-1000]);
  assert.ok(comparison.losses.every(row=>row.cause.includes('km/h')&&!/brake earlier|brake later|throttle/i.test(row.cause)));
  for(const patch of [{route:'route_b'},{courseFingerprint:'track-v1-00000000'},{eventId:'high-country'}]){
    assert.equal(compareLapTelemetry(playerLap,{...reference,...patch}).status,'unavailable');
  }
});
await test('comparison panel shows sectors, measured losses and session notice without mismatched traces',()=>{
  const lap=drive().record,reference=drive({seconds:18}).record;
  const dossier={reference,analysis:{corners:[]},telemetry:{lap,status:'session-only',message:'Session only.'}};
  const before=JSON.stringify(dossier),html=teamRoom.telemetryMarkup(dossier);
  assert.match(html,/Your best lap/);assert.match(html,/Reference lap: Stuttgart 959-S/);
  assert.match(html,/Session only/);assert.match(html,/Sector 1/);assert.match(html,/data-telemetry-speed/);
  assert.match(html,/data-telemetry-loss/);assert.equal(JSON.stringify(dossier),before);
  const mismatch=teamRoom.telemetryMarkup({...dossier,reference:{...reference,route:'other'}});
  assert.doesNotMatch(mismatch,/data-telemetry-speed/);assert.match(mismatch,/unavailable/);
  const empty=teamRoom.telemetryMarkup({...dossier,telemetry:{lap:null,status:'empty',message:'Complete a clean lap.'}});
  assert.match(empty,/Complete a clean lap/);assert.doesNotMatch(empty,/data-telemetry-speed/);
});
await test('native App capture leaves race and reward fingerprints unchanged',()=>{
  const priorStorage=globalThis.localStorage,outputs=[];let enabledApp;
  try{
    for(const enabled of [false,true]){
      const storage=memoryStorage();globalThis.localStorage=storage;const app=ownTestCourses(new App());
      const original=app.duel.featureFlags;
      app.duel.featureFlags={enabled:name=>name==='grand-prix'?enabled:original.enabled(name)};
      app.autopilot=true;const stageIndex=COURSE.findIndex(row=>row.id==='harbor-highlands');
      app.startCampaign({startStage:stageIndex,routeVariant:'route_c',car:'falcone_f42',mode:'timetrial',cpuDifficulty:'medium'});
      const events=[];app.duel.onChange((_,event)=>{if(event.lapCompleted||event.lapCheckpoint||event.checkpointReset)events.push(event);});
      for(let i=0;i<3000&&['countdown','racing','ticket'].includes(app.duel.state.status);i++)app.advance(.1);
      const s=app.duel.state;assert.equal(s.results?.completed,true);
      const fingerprint=JSON.stringify({status:s.status,s:s.s,lateral:s.lateral,speed:s.speedMph,score:s.score,lapTimes:s.lapTimes,
        majorCrashes:s.majorCrashes,boundaryResets:s.boundaryResets,credits:app.profile.credits,events,
        traffic:s.traffic.map(row=>[row.s,row.speedMph,row.lateral]),opponents:s.opponents.map(row=>[row.s,row.speedMph,row.lateral])});
      outputs.push(createHash('sha256').update(fingerprint).digest('hex'));
      if(enabled){
        const best=app.getLapTelemetry({eventId:COURSE[stageIndex].id,route:'route_c',courseFingerprint:courseFingerprint(app.duel.course,{route:'route_c'})});
        assert.ok(best.lap);assert.equal(best.lap.lapMs,Math.round(Math.min(...s.lapTimes)*1000));assert.equal(best.status,'saved');
        assert.equal(best.lap.playerId,app.player.id);assert.equal(best.lap.controls.length,best.lap.trace.length);
        const before=storage.getItem(TELEMETRY_KEY);app.duel.emit({stageResult:s.results});assert.equal(storage.getItem(TELEMETRY_KEY),before);
        enabledApp=app;
      }else assert.equal(storage.getItem(TELEMETRY_KEY),null);
    }
    assert.equal(outputs[0],outputs[1]);console.log('Native telemetry race fingerprint: '+outputs[0]);
    enabledApp.returnToMenu();assert.equal(enabledApp.lapTelemetryRecorder,null);
    const oldPlayer=enabledApp.player.id;enabledApp.addPlayer('Second Driver');
    assert.equal(enabledApp.getLapTelemetry({eventId:'harbor-highlands',route:'route_c',courseFingerprint:courseFingerprint(enabledApp.duel.course,{route:'route_c'})}).lap,null);
    enabledApp.selectPlayer(oldPlayer);
  }finally{if(priorStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=priorStorage;}
});
console.log(`Lap telemetry: ${passes} passed, ${failures.length} failed.`);
if(failures.length)process.exitCode=1;
