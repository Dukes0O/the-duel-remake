import {CARS,COURSE,DRIVE} from './config.js';
import {ALL_CIRCUITS} from './circuits/index.js';
import {DRIVERS,driverModifierSignature} from './drivers.js';
import {getUpgradeLevels,playerName} from './progression.js';
import {getRouteVariantForSeed,supportsRouteVariants} from './route-variants.js';
import {analyseLap} from './track-analysis.js';

export const TELEMETRY_KEY='the-duel-lap-telemetry-v1';
export const MAX_TELEMETRY_BYTES=500_000;
export const MAX_TELEMETRY_RECORDS=128;
export const MAX_TELEMETRY_SAMPLES=1_024;
const SAMPLE_METRES=20;
const MAX_LAP_MS=3_600_000;
const byteLength=value=>new TextEncoder().encode(value).length;
const clone=value=>structuredClone(value);
const validId=value=>typeof value==='string'&&/^[\w-]{1,80}$/.test(value);
const finiteRange=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const integerRange=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const emptyStore=()=>({version:1,laps:[]});
const sameBuild=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const upgrades=(values,car)=>getUpgradeLevels({upgrades:{[car]:values}},car);

export function telemetryRoute(eventId,seed){
  if(![...COURSE,...ALL_CIRCUITS].some(event=>event.id===eventId))return null;
  return supportsRouteVariants(eventId)?getRouteVariantForSeed(seed)?.id??null:'fixed';
}
export function telemetryKey({playerId,eventId,route,courseFingerprint}){
  return JSON.stringify([playerId,eventId,route,courseFingerprint]);
}

function validLap(record){
  if(!record||!validId(record.playerId)||!playerName(record.playerName)||
    !Object.hasOwn(CARS,record.car)||!Object.hasOwn(DRIVERS,record.driverId)||
    !integerRange(record.seed,0,0xffffffff)||telemetryRoute(record.eventId,record.seed)!==record.route||
    !record.route||!/^track-v1-[0-9a-f]{8}$/.test(record.courseFingerprint)||
    record.key!==telemetryKey(record)||!finiteRange(record.courseLength,20,20_460)||
    !integerRange(record.lapMs,1,MAX_LAP_MS)||!Number.isFinite(record.recordedAt)||
    !integerRange(record.layoutVersion,1,1_000_000)||typeof record.mode!=='string'||record.mode.length>32||
    !['casual','pro'].includes(record.difficulty)||!['easy','medium','hard'].includes(record.cpuDifficulty)||
    !['summer','winter'].includes(record.tyre)||typeof record.driverSignature!=='string'||
    !record.upgrades||!sameBuild(record.upgrades,upgrades(record.upgrades,record.car)))return false;
  const {trace,controls,sectorMs,corners}=record;
  const expected=Math.ceil(record.courseLength/SAMPLE_METRES)+1;
  if(!Array.isArray(trace)||trace.length!==expected||trace.length>MAX_TELEMETRY_SAMPLES||
    !Array.isArray(controls)||controls.length!==trace.length||
    !Array.isArray(sectorMs)||sectorMs.length!==3||sectorMs.some(value=>!integerRange(value,1,record.lapMs))||
    sectorMs.reduce((sum,value)=>sum+value,0)!==record.lapMs||!Array.isArray(corners)||corners.length>256)return false;
  for(let index=0;index<trace.length;index++){
    const row=trace[index],control=controls[index],distance=index===trace.length-1?record.courseLength:index*SAMPLE_METRES;
    if(!Array.isArray(row)||row.length!==2||row[0]!==distance||!integerRange(row[1],0,1500)||
      !Array.isArray(control)||control.length!==5||
      !integerRange(control[0],0,record.lapMs)||!integerRange(control[1],0,100)||!integerRange(control[2],0,100)||
      !integerRange(control[3],-10_000_000,10_000_000)||!integerRange(control[4],-1,15)||
      (index>0&&control[0]<=controls[index-1][0]))return false;
  }
  if(controls[0][0]!==0||controls.at(-1)[0]!==record.lapMs)return false;
  const ids=new Set();
  for(const corner of corners){
    if(!corner||typeof corner.id!=='string'||!corner.id||corner.id.length>120||ids.has(corner.id)||
      !finiteRange(corner.s,0,record.courseLength)||!finiteRange(corner.brakeS,0,record.courseLength)||
      !integerRange(corner.entryKph,0,1500)||!integerRange(corner.minKph,0,1500)||!integerRange(corner.exitKph,0,1500)||
      !(corner.gear==='R'||integerRange(corner.gear,1,16))||!integerRange(corner.elapsedMs,1,record.lapMs))return false;
    ids.add(corner.id);
  }
  return true;
}
function readStore(storage){
  try{
    if(!storage?.getItem)return {status:'unavailable',message:'Lap storage is unavailable.',store:null};
    const raw=storage.getItem(TELEMETRY_KEY);
    if(raw===null)return {status:'ready',store:emptyStore()};
    if(byteLength(raw)>MAX_TELEMETRY_BYTES)throw Error('Stored laps exceed the telemetry limit.');
    const value=JSON.parse(raw),keys=new Set();
    if(value?.version!==1||!Array.isArray(value.laps)||value.laps.length>MAX_TELEMETRY_RECORDS)throw Error('Stored laps use an unsupported format.');
    for(const record of value.laps){
      if(!validLap(record)||keys.has(record.key))throw Error('Stored lap data could not be verified.');
      keys.add(record.key);
    }
    return {status:'ready',store:value};
  }catch{return {status:'unavailable',store:null,message:'Stored lap data is unavailable. Existing saved data has been kept.'};}
}

// This companion store never normalizes, rewrites or evicts another save key.
// The production career facade admits one writer; rereading here also keeps
// imports and other callers in this same document visible before a faster save.
export class LapTelemetryStore {
  constructor(storage){
    try{this.storage=storage??globalThis.localStorage;}catch{this.storage=null;}
    this.session=new Map();
  }
  best(options){
    const key=telemetryKey(options),loaded=readStore(this.storage);
    const persisted=loaded.store?.laps.find(record=>record.key===key),session=this.session.get(key);
    if(session&&(!persisted||session.lapMs<persisted.lapMs)){
      return {lap:clone(session),status:'session-only',message:'Your best lap is available for this session only.'};
    }
    if(persisted)return {lap:clone(persisted),status:'saved',message:''};
    return {lap:null,status:loaded.status==='ready'?'empty':'unavailable',
      message:loaded.message??'Complete a clean lap on this route to compare your driving.'};
  }
  record(record){
    if(this.pending)return this.pending.then(()=>this.record(record));
    if(!validLap(record))return {saved:false,changed:false,status:'unavailable',message:'This lap could not be verified.'};
    const loaded=readStore(this.storage),persisted=loaded.store?.laps.find(row=>row.key===record.key);
    const session=this.session.get(record.key);
    if((persisted&&persisted.lapMs<=record.lapMs)||(session&&session.lapMs<=record.lapMs)){
      const view=this.best(record);
      return {saved:view.status==='saved',changed:false,status:view.status,message:view.message};
    }
    const candidate=clone(record);
    const hold=message=>{
      this.session.set(candidate.key,candidate);
      return {saved:false,changed:true,status:'session-only',message:message+' Your best lap is available for this session only.'};
    };
    if(!loaded.store)return hold(loaded.message);
    const next={...loaded.store,laps:[...loaded.store.laps.filter(row=>row.key!==candidate.key),candidate]};
    const serialized=JSON.stringify(next);
    if(next.laps.length>MAX_TELEMETRY_RECORDS||byteLength(serialized)>MAX_TELEMETRY_BYTES){
      return hold('Lap storage is full. Existing laps have been kept.');
    }
    const complete=()=>{
      this.session.delete(candidate.key);
      return {saved:true,changed:true,status:'saved',message:''};
    };
    try{
      const saved=this.storage.setItem(TELEMETRY_KEY,serialized);
      if(saved?.then){
        this.session.set(candidate.key,candidate);
        const pending=saved.then(complete,()=>hold('This lap could not be saved. Existing laps have been kept.'))
          .finally(()=>{if(this.pending===pending)this.pending=null;});
        this.pending=pending;
        return pending;
      }
      return complete();
    }catch{return hold('This lap could not be saved. Existing laps have been kept.');}
  }
}

function nativePoint(state){
  const values=[state.s,state.lateral,state.speedMph,state.stageTimeSec,state.racePenaltySec,
    state.input?.throttle,state.input?.brake,state.gear];
  if(!values.every(Number.isFinite)||!integerRange(state.gear,-1,15)||
    !finiteRange(state.input.throttle,0,1)||!finiteRange(state.input.brake,0,1))return null;
  return {s:state.s,lateral:state.lateral,mph:state.speedMph,physicsTime:state.stageTimeSec,
    clock:state.stageTimeSec+state.racePenaltySec,throttle:state.input.throttle,brake:state.input.brake,gear:state.gear};
}
function crossing(previous,current,distance){
  const mix=Math.max(0,Math.min(1,(distance-previous.s)/(current.s-previous.s)));
  return {s:distance,clock:previous.clock+(current.clock-previous.clock)*mix,
    physicsTime:previous.physicsTime+(current.physicsTime-previous.physicsTime)*mix,
    mph:previous.mph+(current.mph-previous.mph)*mix,
    lateral:previous.lateral+(current.lateral-previous.lateral)*mix,
    // Input and gear are held by the native physics step, not blended commands.
    throttle:current.throttle,brake:current.brake,gear:current.gear};
}

// Observes native state only. It cannot complete a lap, write race state, or
// draw randomness. Each completed native lap is emitted at most once.
export class LapTelemetryRecorder {
  constructor({course,...context}){
    this.course=course;
    this.context={...context,eventId:COURSE[context.stageIndex]?.id,
      upgrades:upgrades(context.upgrades,context.car),tyre:context.tyre??'summer'};
    this.context.route=telemetryRoute(this.context.eventId,context.seed);
    this.context.driverSignature=driverModifierSignature(context.driverId,context.car);
    this.disabled=!this.context.route||!course||course.closed===false||course.def?.practice||
      Math.ceil(course.length/SAMPLE_METRES)+1>MAX_TELEMETRY_SAMPLES;
    this.previous=null;this.samples=[];this.invalid=false;this.lapIndex=null;this.lapStart=0;
  }
  discontinuity(){this.invalid=true;}
  // Qualifying rebases distance at its first legal native line crossing. Carry
  // the observed approach point through the same rebase, then interpolate the
  // actual crossing. No simulated state, lap clock or validity rule is changed.
  armQualifying(state){
    if(this.disabled||state.paused||state.status!=='racing'||!this._matches(state)||
      state.qualifying?.phase!=='driving'||state.qualifying.timing!=='timed'||
      state.completedLaps!==0||!this.previous)return false;
    const current=nativePoint(state),previous={...this.previous,s:this.previous.s-this.course.length};
    const clock=state.lapStartedAt;
    if(!current||!(previous.s<0&&current.s>=0)||!Number.isFinite(clock)||
      clock<previous.clock-1e-6||clock>current.clock+1e-6)return false;
    const elapsed=current.physicsTime-previous.physicsTime,delta=current.s-previous.s;
    if(elapsed<=0||current.clock<previous.clock||
      delta>Math.max(20,Math.max(Math.abs(previous.mph),Math.abs(current.mph))*DRIVE.mphToWorld*elapsed*4+12))return false;
    const start={...crossing(previous,current,0),clock};
    this._start(0,clock,start);this.previous=start;
    this.observe(state);
    return !this.invalid;
  }
  _matches(state){
    const context=this.context;
    return state.playerId===context.playerId&&state.stageIndex===context.stageIndex&&state.seed===context.seed&&
      state.car===context.car&&state.driverId===context.driverId&&state.mode===context.mode&&
      (state.tyre??'summer')===context.tyre&&sameBuild(upgrades(state.upgrades,state.car),context.upgrades);
  }
  _start(index,clock,point){
    this.lapIndex=index;this.lapStart=clock;this.invalid=false;
    this.samples=[{...point,s:0,t:0}];
  }
  _forward(previous,current){
    const base=this.lapIndex*this.course.length;
    let distance=this.samples.at(-1)?.s+SAMPLE_METRES;
    if(!Number.isFinite(distance))return;
    while(distance<this.course.length&&base+distance<=current.s+1e-8){
      if(base+distance<previous.s-1e-8){this.invalid=true;break;}
      const point=crossing(previous,current,base+distance);
      this.samples.push({...point,s:distance,t:point.clock-this.lapStart});
      distance+=SAMPLE_METRES;
    }
  }
  _record(state,finish){
    const seconds=state.lapTimes?.[this.lapIndex],lapMs=Math.round(seconds*1000);
    if(this.invalid||state.assistedLaps?.[this.lapIndex]===true||
      !integerRange(lapMs,1,MAX_LAP_MS)||Math.abs((finish.clock-this.lapStart)*1000-lapMs)>1.1)return null;
    const trace=[...this.samples,{...finish,s:this.course.length,t:lapMs/1000}];
    if(trace.length!==Math.ceil(this.course.length/SAMPLE_METRES)+1)return null;
    let analysis;
    try{analysis=analyseLap(this.course,{trace,lapMs,route:this.context.route});}
    catch{return null;}
    const record={...this.context,...analysis,courseLength:this.course.length,
      layoutVersion:this.course.def.layoutVersion??1,recordedAt:Date.now(),
      trace:[...analysis.trace,[this.course.length,Math.round(Math.abs(finish.mph)*1.609344)]],
      controls:trace.map(row=>[Math.round(row.t*1000),Math.round(row.throttle*100),
        Math.round(row.brake*100),Math.round(row.lateral*100),row.gear])};
    delete record.stageIndex;
    record.key=telemetryKey(record);
    return validLap(record)?record:null;
  }
  observe(state){
    if(this.disabled||state.paused||!['racing','ticket','stage_result','gameover','complete'].includes(state.status))return null;
    if(!this._matches(state)){this.disabled=true;return null;}
    const current=nativePoint(state);
    if(!current||!integerRange(state.completedLaps,0,1000)){
      this.invalid=true;this.previous=null;return null;
    }
    if(this.lapIndex===null){
      const start=state.lapStartedAt??0;
      this._start(state.completedLaps,start,current);
      if(Math.abs(current.s-state.completedLaps*this.course.length)>1e-6||Math.abs(current.clock-start)>.001)this.invalid=true;
    }
    if(state.assistedLap===true)this.invalid=true;
    const previous=this.previous;
    this.previous=current;
    if(!previous)return null;
    const elapsed=current.physicsTime-previous.physicsTime,delta=current.s-previous.s;
    if(elapsed<0||current.clock<previous.clock||(elapsed===0&&Math.abs(delta)>1e-6)||
      Math.abs(delta)>Math.max(20,Math.max(Math.abs(previous.mph),Math.abs(current.mph))*DRIVE.mphToWorld*elapsed*4+12))this.invalid=true;
    if(state.completedLaps<this.lapIndex||state.completedLaps>this.lapIndex+1){this.disabled=true;return null;}
    if(delta<0){
      const distance=current.s-this.lapIndex*this.course.length;
      while(this.samples.length>1&&this.samples.at(-1).s>=distance-1e-8)this.samples.pop();
    }
    if(delta>0)this._forward(previous,current);
    if(state.completedLaps===this.lapIndex)return null;
    const finishS=(this.lapIndex+1)*this.course.length;
    const finishClock=state.lapStartedAt;
    if(!(previous.s<finishS&&current.s>=finishS)||!Number.isFinite(finishClock)||
      finishClock<previous.clock-1e-6||finishClock>current.clock+1e-6){this.disabled=true;return null;}
    const finish={...crossing(previous,current,finishS),clock:finishClock};
    const record=this._record(state,finish);
    this._start(state.completedLaps,finishClock,finish);
    if(current.s>finishS)this._forward(finish,current);
    return record;
  }
}

export function compareLapTelemetry(lap,reference){
  const referenceLabel='Reference lap: Stuttgart 959-S';
  if(!lap||!reference||lap.eventId!==reference.eventId||lap.route!==reference.route||
    lap.courseFingerprint!==reference.courseFingerprint){
    return {status:'unavailable',referenceLabel,sectors:[],losses:[]};
  }
  const sectors=lap.sectorMs.map((lapMs,index)=>({number:index+1,lapMs,
    referenceMs:reference.sectorMs[index],deltaMs:lapMs-reference.sectorMs[index]}));
  const byId=new Map(reference.corners.map(corner=>[corner.id,corner]));
  const losses=lap.corners.flatMap(corner=>{
    const target=byId.get(corner.id),lossMs=corner.elapsedMs-target?.elapsedMs;
    if(!Number.isFinite(lossMs)||lossMs<=0)return [];
    const differences=[['Entry speed',target.entryKph-corner.entryKph],['Minimum speed',target.minKph-corner.minKph],
      ['Exit speed',target.exitKph-corner.exitKph]].sort((a,b)=>b[1]-a[1]);
    const [label,difference]=differences[0];
    const cause=difference>0?`${label} was ${difference} km/h lower than the reference.`:'More time was spent in this corner.';
    return [{id:corner.id,s:corner.s,lossMs,cause,lapMs:corner.elapsedMs,referenceMs:target.elapsedMs}];
  }).sort((left,right)=>right.lossMs-left.lossMs||left.s-right.s).slice(0,3);
  return {status:'ready',referenceLabel,sectors,losses,deltaMs:lap.lapMs-reference.lapMs};
}
