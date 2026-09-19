import {CARS,COURSE,DRIVE} from './config.js';
import {bestKey,isValidFinish,playerName,getUpgradeLevels,stageEventId} from './progression.js';

export const GHOST_KEY='the-duel-ghosts-v1',GHOST_ENABLED_KEY='duel_ghost_enabled';
export const MAX_GHOSTS=12,MAX_GHOST_SAMPLES=1800,MAX_GHOST_BYTES=1_250_000;
const round=(value,scale)=>Math.round(value*scale),clock=state=>(state.stageTimeSec??0)+(state.racePenaltySec??0);
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export const ghostKey=(playerId,options,layoutVersion)=>options?.mode==='timetrial'&&playerId?`${playerId}|${bestKey(options,layoutVersion)}`:'';
export function createGhostStore(){return {version:1,records:[],archivedRecords:[]};}
const validId=id=>typeof id==='string'&&/^[\w-]{1,80}$/.test(id);
const currentRecord=record=>{const stageIndex=COURSE.findIndex((stage,index)=>stageEventId(index)===record.eventId),stage=COURSE[stageIndex];return !!stage&&record.layoutVersion===(stage.layoutVersion??1)&&record.laps===(stage.laps||2)&&record.key===ghostKey(record.playerId,{...record,stageIndex});};
function validSamples(samples,timeSec,raceLength){
  if(!Array.isArray(samples)||samples.length<12||samples.length>MAX_GHOST_SAMPLES)return false;
  // A driver may reverse through the start and onto the preceding circuit.
  // Keep the old 80m recovery allowance, plus the most reverse travel physically
  // possible during this recording. Forward bounds remain unchanged.
  const minPosition=-(timeSec*DRIVE.reverseMaxMph*DRIVE.mphToWorld+80)*100;
  let prior=-1;
  for(const row of samples){if(!Array.isArray(row)||row.length!==7||!row.every(Number.isSafeInteger)||row[0]<=prior||row[0]<0||row[0]>(timeSec+.03)*1000||row[1]<minPosition||row[1]>(raceLength+24)*100||Math.abs(row[2])>18000||Math.abs(row[3])>400000||row[4]<0||row[4]>10000||Math.abs(row[5])>5000||![0,1].includes(row[6]))return false;prior=row[0];}
  return samples[0][0]===0&&Math.abs(samples[0][1])<=300&&Math.abs(samples.at(-1)[0]-timeSec*1000)<=30&&samples.at(-1)[1]>=raceLength*100-10;
}
function normalizeRecord(row){
  if(!row||!validId(row.playerId)||!playerName(row.playerName)||row.mode!=='timetrial'||!Object.hasOwn(CARS,row.car)||!Number.isFinite(row.timeSec)||row.timeSec<=0||row.timeSec>3600)return null;
  const stageIndex=COURSE.findIndex((def,index)=>stageEventId(index)===row.eventId),stage=COURSE[stageIndex];
  if(!stage||!Number.isSafeInteger(row.laps)||row.laps<1||!Number.isSafeInteger(row.layoutVersion)||row.layoutVersion<1||!['casual','pro'].includes(row.difficulty)||!['easy','medium','hard'].includes(row.cpuDifficulty))return null;
  const current=row.layoutVersion===(stage.layoutVersion??1);
  if(current&&row.laps!==(stage.laps||2))return null;
  const context={...row,stageIndex,seed:row.seed>>>0},key=ghostKey(row.playerId,context,row.layoutVersion);
  // Legacy ghosts did not retain the old route length. Their final sample is
  // the only available old finish position; never validate it against new roads.
  const raceLength=current?stage.lengthU*row.laps:row.raceLength??row.samples?.at(-1)?.[1]/100;
  if(!Number.isFinite(raceLength)||raceLength<=0||key!==row.key||!validSamples(row.samples,row.timeSec,raceLength))return null;
  return {key,playerId:row.playerId,playerName:playerName(row.playerName),stageIndex,eventId:row.eventId,layoutVersion:row.layoutVersion,seed:context.seed,laps:row.laps,raceLength,car:row.car,mode:row.mode,difficulty:row.difficulty,cpuDifficulty:row.cpuDifficulty,timeSec:row.timeSec,samples:row.samples,upgrades:getUpgradeLevels({upgrades:{[row.car]:row.upgrades}},row.car),recordedAt:Number.isFinite(row.recordedAt)?row.recordedAt:0,lastUsedAt:Number.isFinite(row.lastUsedAt)?row.lastUsedAt:0};
}
export function normalizeGhostStore(value){
  if(value?.version!==1||!Array.isArray(value.records))return createGhostStore();
  const best=new Map();for(const row of [...value.records,...(Array.isArray(value.archivedRecords)?value.archivedRecords:[])]){const record=normalizeRecord(row);if(!record)continue;const old=best.get(record.key);if(!old||record.timeSec<old.timeSec)best.set(record.key,record);else old.lastUsedAt=Math.max(old.lastUsedAt,record.lastUsedAt);}
  const all=[...best.values()].sort((a,b)=>b.lastUsedAt-a.lastUsedAt||b.recordedAt-a.recordedAt),records=all.filter(currentRecord).slice(0,MAX_GHOSTS),archivedRecords=all.filter(record=>!currentRecord(record));
  // Active playback keeps its existing budget. Archiving a layout must not
  // silently evict its recordings when new-layout recordings fill that budget.
  while(records.length&&bytes({version:1,records,archivedRecords:[]})>MAX_GHOST_BYTES)records.pop();
  return {version:1,records,archivedRecords};
}
export function loadGhosts(storage){try{const raw=(storage??globalThis.localStorage)?.getItem(GHOST_KEY);return raw?normalizeGhostStore(JSON.parse(raw)):createGhostStore();}catch{return createGhostStore();}}
export function saveGhosts(store,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(GHOST_KEY,JSON.stringify(normalizeGhostStore(store)));return true;}catch{return false;}}
export function readGhostEnabled(storage){try{return (storage??globalThis.localStorage)?.getItem(GHOST_ENABLED_KEY)!=='false';}catch{return true;}}
export function saveGhostEnabled(enabled,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(GHOST_ENABLED_KEY,String(!!enabled));return true;}catch{return false;}}
export function findGhost(store,playerId,options){const key=ghostKey(playerId,options);return key?store.records.find(record=>currentRecord(record)&&record.key===key)||null:null;}
export function mergeGhostStores(...stores){return normalizeGhostStore({version:1,records:stores.flatMap(store=>store?.records||[]),archivedRecords:stores.flatMap(store=>store?.archivedRecords||[])});}
export function storeGhost(store,record){
  const valid=normalizeRecord(record);if(!valid||!currentRecord(valid))return {store,saved:false};store=normalizeGhostStore(store);const prior=store.records.find(row=>row.key===valid.key);
  if(prior&&prior.timeSec<=valid.timeSec+.005)return {store,saved:false};
  return {store:normalizeGhostStore({version:1,records:[...store.records.filter(row=>row.key!==valid.key),valid],archivedRecords:store.archivedRecords}),saved:true};
}
function pack(state,snap=false){
  const values=[clock(state),state.s,state.lateral??0,(state.headingError??0)+(state.slipAngle??0)+(state.crashSpin??0),state.airHeight??0,state.speedMph??0];
  if(!values.every(Number.isFinite))return null;
  return [round(values[0],1000),round(values[1],100),round(values[2],100),round(values[3],10000),round(Math.max(0,values[4]),100),round(values[5],10),snap?1:0];
}
export class GhostRecorder {
  constructor(context){this.context={...context,upgrades:{...context.upgrades}};this.samples=[];this.interval=.2;this.next=0;this.previous=null;this.previousClock=null;this.invalid=false;this.pendingSnap=false;}
  discontinuity(){this.pendingSnap=true;}
  _append(row){
    if(!row){this.invalid=true;return;}
    const last=this.samples.at(-1);if(last&&row[0]===last[0]){row[6]=Math.max(row[6],last[6]);this.samples[this.samples.length-1]=row;return;}
    if(last&&row[0]<last[0]){this.invalid=true;return;}
    this.samples.push(row);
    if(this.samples.length>MAX_GHOST_SAMPLES){
      // Preserve discontinuity pairs and both endpoints while thinning long runs.
      this.samples=this.samples.filter((sample,index,array)=>index===0||index===array.length-1||index%2===0||sample[6]||array[index+1]?.[6]);this.interval*=2;
      if(this.samples.length>MAX_GHOST_SAMPLES)this.invalid=true;
    }
  }
  observe(state,final=false){
    if(this.invalid||state.paused||(!final&&!['racing','ticket'].includes(state.status)))return;
    const now=clock(state),row=pack(state);if(!row){this.invalid=true;return;}
    const delta=this.previousClock==null?0:now-this.previousClock;
    if(delta<-.001){this.invalid=true;return;}
    if(this.previous&&delta>0&&!this.pendingSnap&&Math.abs(state.s-this.previous[1]/100)>Math.max(20,Math.abs(state.speedMph||0)*DRIVE.mphToWorld*delta*4+12)){this.invalid=true;return;}
    const snap=this.pendingSnap||delta>.75;
    if(snap&&this.previous){this._append([...this.previous]);row[6]=1;}
    if(!this.samples.length||now+1e-6>=this.next||snap||final){this._append(row);this.next=now+this.interval;}
    this.previous=row;this.previousClock=now;this.pendingSnap=false;
  }
  finish(result,state,player){
    if(this.invalid||result.stageIndex!==this.context.stageIndex||player?.id!==this.context.playerId||state.playerId!==player.id||state.car!==this.context.car||state.mode!=='timetrial'||!isValidFinish({...result,car:state.car})||!playerName(player.name))return null;
    this.observe(state,true);if(this.invalid)return null;
    const stage=COURSE[result.stageIndex],timeSec=result.timeSec;
    const record={...this.context,key:ghostKey(player.id,this.context),playerId:player.id,playerName:player.name,eventId:stageEventId(result.stageIndex),layoutVersion:stage.layoutVersion??1,laps:result.laps,raceLength:stage.lengthU*result.laps,timeSec,recordedAt:Date.now(),lastUsedAt:Date.now(),samples:this.samples};
    return normalizeRecord(record);
  }
}
export function sampleGhost(record,timeSec,out={}){
  if(!record||!currentRecord(record)||!Number.isFinite(timeSec)||timeSec<0||timeSec>record.timeSec)return null;
  const rows=record.samples,t=timeSec*1000;let lo=0,hi=rows.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(rows[mid][0]<=t)lo=mid;else hi=mid-1;}
  const a=rows[lo],b=rows[Math.min(rows.length-1,lo+1)],blend=b[6]||b[0]===a[0]?0:Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))),mix=index=>a[index]+(b[index]-a[index])*blend;
  const angleA=a[3]/10000,angleB=b[3]/10000;
  Object.assign(out,{s:mix(1)/100,lateral:mix(2)/100,headingError:angleA+Math.atan2(Math.sin(angleB-angleA),Math.cos(angleB-angleA))*blend,airHeight:mix(4)/100,speedMph:mix(5)/10,car:record.car,playerId:record.playerId,timeSec,recordTimeSec:record.timeSec,upgrades:record.upgrades});return out;
}
