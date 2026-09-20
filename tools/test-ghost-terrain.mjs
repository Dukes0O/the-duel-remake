import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {GhostRecorder,normalizeGhostStore,sampleGhost,saveGhosts,loadGhosts} from '../src/ghost.js';

let checks=0;const check=(ok,label)=>{assert.ok(ok,label);checks++;};const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const stageIndex=0,stage=COURSE[stageIndex],duration=120,length=stage.lengthU*stage.laps;
const context={playerId:'terrain-player',stageIndex,seed:1989,laps:stage.laps,car:'dusthawk_rally',driverId:'club',mode:'timetrial',difficulty:'casual',cpuDifficulty:'easy',upgrades:{}};
const player={id:context.playerId,name:'Terrain replay'};
function recording(terrain=true){
  const recorder=new GhostRecorder(context),state={...context,status:'racing',racePenaltySec:0,headingError:0,speedMph:150,airHeight:0,lateral:0};
  for(let frame=0;frame<=600;frame++){
    const time=frame/5;Object.assign(state,{stageTimeSec:time,s:length*time/duration});
    if(terrain)Object.assign(state,{groundHeight:100+Math.sin(time*.1)*40,terrainPitch:Math.sin(time*.2)*.3,terrainRoll:Math.cos(time*.2)*.4,tumble:null});
    recorder.observe(state);
  }
  return {recorder,state,record:recorder.finish({stageIndex,completed:true,won:true,laps:stage.laps,timeSec:duration},state,player)};
}
const {record}=recording();check(!!record,'a finite complete terrain run records normally');check(record.samples.every(row=>row.length===11&&row[10]===7),'extended samples carry explicit ground/pitch/roll presence bits');
const replay=sampleGhost(record,12.1),a=record.samples.find(row=>row[0]===12000),b=record.samples.find(row=>row[0]===12200);
same(replay.groundHeight,(a[7]+b[7])/200,'absolute physical ground height interpolates in metres');same(replay.terrainPitch,(a[8]+b[8])/20000,'physical pitch interpolates in radians');same(replay.terrainRoll,(a[9]+b[9])/20000,'physical cross-slope interpolates in radians');same(replay.tumble,false,'ground slope does not imply tumbling');
const old=recording(false).record;check(old.samples.every(row=>row.length===7),'ordinary missing-pose fixtures retain the exact legacy sample shape');
const buffer={groundHeight:999,terrainPitch:2,terrainRoll:3,tumble:true};same(sampleGhost(old,10,buffer),buffer,'playback still reuses a supplied buffer');same([buffer.groundHeight,buffer.terrainPitch,buffer.terrainRoll,buffer.tumble],[null,null,null,false],'legacy replay clears optional fields rather than leaking a preceding mountain pose');
const mixed=structuredClone(record);mixed.samples[0]=mixed.samples[0].slice(0,7);check(normalizeGhostStore({version:1,records:[mixed]}).records.length===1,'mixed initial legacy and terrain samples survive load');same(sampleGhost(mixed,0).groundHeight,null,'initial sample without support retains the original renderer path');check(Number.isFinite(sampleGhost(mixed,.1).groundHeight),'the first available terrain support remains finite across the transition');
const spin={...record,timeSec:1,samples:[[0,0,0,0,0,10,0,12000,1000,0,15],[1000,100,0,0,0,10,0,14000,3000,62832,15]]};
same(sampleGhost(spin,.5).groundHeight,130,'tumble keeps absolute physical chassis support');same(sampleGhost(spin,.5).terrainPitch,.2,'tumble pitch interpolates independently');check(Math.abs(sampleGhost(spin,.5).terrainRoll-Math.PI)<.00001,'one full tumble uses continuous angle interpolation, not a zero-angle shortcut');same(sampleGhost(spin,.5).tumble,true,'renderer can distinguish raw tumble angles from ground grades');
const snapped=structuredClone(spin);snapped.samples[1][6]=1;same(sampleGhost(snapped,.9).groundHeight,120,'recovery gap holds the previous ground height');same(sampleGhost(snapped,.9).terrainRoll,0,'recovery gap cannot spin through scenery');same(sampleGhost(snapped,1).groundHeight,140,'recovery endpoint snaps to its recorded support');
for(const field of ['groundHeight','terrainPitch','terrainRoll'])for(const value of [NaN,Infinity,-Infinity]){
  const recorder=new GhostRecorder(context);recorder.observe({...context,status:'racing',stageTimeSec:0,s:0,speedMph:0,[field]:value});check(recorder.invalid,`non-finite ${field} invalidates the recording`);
}
for(const [column,value]of [[7,1000001],[7,-1000001],[8,800001],[9,-800001],[10,16],[10,-1],[7,1.5]]){
  const invalid=structuredClone(record);invalid.samples[4][column]=value;same(normalizeGhostStore({version:1,records:[invalid]}).records.length,0,'terrain values and presence flags remain strictly bounded integers');
}
const badLength=structuredClone(record);badLength.samples[2].pop();same(normalizeGhostStore({version:1,records:[badLength]}).records.length,0,'partial extensions cannot silently misalign columns');
const roaming=structuredClone(record);roaming.samples[100][2]=25000;roaming.samples[101][1]=-200000;
same(normalizeGhostStore({version:1,records:[roaming]}).records.length,1,'capable off-road cars can retain a completed replay after roaming beyond the former road bounds');
const impossible=structuredClone(record);impossible.samples[100][2]=Math.ceil((duration*500*.44704+180)*100)+1;
same(normalizeGhostStore({version:1,records:[impossible]}).records.length,0,'off-road roam bounds still reject impossible time/speed reach');
const road={...roaming,car:'falcone_f42',key:roaming.key.replace('dusthawk_rally','falcone_f42')};
same(normalizeGhostStore({version:1,records:[road]}).records.length,0,'ordinary road cars retain their strict legacy route bounds');
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};check(saveGhosts({version:1,records:[record]},storage),'terrain recording saves through the ordinary store');const loaded=loadGhosts(storage).records[0];same(loaded.samples,record.samples,'terrain pose integers survive serialization');same(sampleGhost(loaded,12.1),replay,'loaded terrain playback matches the original exactly');
const archived={...record,layoutVersion:stage.layoutVersion-1,key:record.key.replace(`layout:${stage.layoutVersion}`,`layout:${stage.layoutVersion-1}`)};const store=normalizeGhostStore({version:1,records:[archived]});same(store.archivedRecords[0]?.samples,record.samples,'layout archiving preserves terrain pose fields');same(sampleGhost(store.archivedRecords[0],12),null,'archived terrain ghosts cannot play on a new route');
console.log(`Ghost terrain poses: ${checks} legacy compatibility, physical support, interpolation, tumble, reset, bounds and save/archive checks passed.`);
