import {CARS,COURSE} from './config.js';
import {eventKey,isValidFinish,stageEventId,playerName,getUpgradeLevels} from './progression.js';
import {DEFAULT_DRIVER,normalizeDriverId,driverModifierSignature,driverRecordMetadata,isCurrentDriverRecord} from './drivers.js';
import {normalizeRival,rivalSignature} from './rival-settings.js';

export const LEADERBOARD_KEY='the-duel-leaderboard-v1';
export function createLeaderboard(){return {version:1,entries:[],archivedEntries:[]};}
const isDriftRow=row=>COURSE.find(stage=>stage.id===row.eventId)?.kind==='drift';
const currentRow=row=>{const stageIndex=COURSE.findIndex((stage,index)=>stageEventId(index)===row.eventId);return stageIndex>=0&&!COURSE[stageIndex].practice&&row.laps===(COURSE[stageIndex].laps||2)&&row.eventKey===eventKey({...row,stageIndex})&&isCurrentDriverRecord(row);};
const rowKey=row=>[row.playerId,row.eventKey,row.car,...(row.mode==='wasteland'?['wasteland']:[]),row.driverSignature??driverModifierSignature(row.driverId,row.car),rivalSignature({...row,stageIndex:COURSE.findIndex(stage=>stage.id===row.eventId)})].join('|');
function better(row,prior,drift){return !prior||drift&&!Number.isFinite(prior.driftScore)||(drift&&row.driftScore!==prior.driftScore?row.driftScore>prior.driftScore:row.timeSec<prior.timeSec-.005);}
function driftMetadata(result,stage){return {discipline:'drift',driftScore:Math.round(result.driftScore),driftTarget:stage.driftTrial.targets[result.cpuDifficulty||'easy'],driftBestChain:Math.round(result.driftBestChain||0),driftMeters:Math.round((result.driftMeters||0)*10)/10};}
function checkpointMetadata(result){return {discipline:'checkpoint',checkpointsPassed:result.checkpointsPassed,checkpointsRequired:result.checkpointsRequired,checkpointMisses:result.checkpointMisses};}
function stuntMetadata(result){return {discipline:'stunt',jumps:result.jumps,crushCount:result.crushCount};}
function normalize(value){
  if(value?.version!==1||!Array.isArray(value.entries))return createLeaderboard();
  const best=new Map();
  for(const row of [...value.entries,...(Array.isArray(value.archivedEntries)?value.archivedEntries:[])]){
    if(!row||typeof row.playerId!=='string'||!playerName(row.playerName)||typeof row.eventKey!=='string'||!Object.hasOwn(CARS,row.car)||!Number.isFinite(row.timeSec)||row.timeSec<=0||!Number.isInteger(row.laps)||row.laps<1)continue;
    const driver=driverRecordMetadata(row);if(!driver)continue;
    const stageIndex=COURSE.findIndex((stage,index)=>stageEventId(index)===row.eventId);
    const layoutVersion=row.layoutVersion??Number(row.eventKey.match(/\|layout:([1-9]\d*)\|seed:/)?.[1]);
    if(stageIndex<0||!Number.isSafeInteger(layoutVersion)||layoutVersion<1||row.eventKey!==eventKey({stageIndex,seed:row.seed,laps:row.laps},layoutVersion))continue;
    const stage=COURSE[stageIndex],drift=stage.kind==='drift',cpu=['easy','medium','hard'].includes(row.cpuDifficulty)?row.cpuDifficulty:'easy';
    if(stage.practice)continue;
    const current=layoutVersion===(stage.layoutVersion??1);
    if(current&&row.laps!==(stage.laps||2))continue;
    if(drift&&(!Number.isInteger(row.driftScore)||row.driftScore<0||!Number.isFinite(row.driftTarget)||row.driftTarget<=0||row.driftScore<row.driftTarget||!Number.isFinite(row.driftBestChain)||row.driftBestChain<0||row.driftBestChain>row.driftScore||!Number.isFinite(row.driftMeters)||row.driftMeters<0))continue;
    if(current&&drift&&(row.driftTarget!==stage.driftTrial.targets[cpu]||!isValidFinish({...row,stageIndex,cpuDifficulty:cpu,completed:true,won:true,targetsMet:true})||row.driftMeters>stage.lengthU*row.laps))continue;
    if(current&&stage.kind==='checkpoint'&&!isValidFinish({...row,stageIndex,cpuDifficulty:cpu,completed:true,won:true,targetsMet:true}))continue;
    // Earlier stunt rows did not retain objective evidence. Keep those existing
    // records, but validate every new evidence-bearing row on save and reload.
    if(current&&stage.stuntTrial&&(row.discipline==='stunt'||row.jumps!=null||row.crushCount!=null)&&!isValidFinish({...row,stageIndex,cpuDifficulty:cpu,completed:true,won:true,targetsMet:true}))continue;
    const key=rowKey({...row,...driver}),prior=best.get(key);
    if(better(row,prior,drift))best.set(key,{...row,...driver,...(current&&drift?driftMetadata({...row,cpuDifficulty:cpu},stage):{}),layoutVersion,playerName:playerName(row.playerName),cpuDifficulty:cpu,difficulty:row.difficulty==='pro'?'pro':'casual',mode:row.mode==='timetrial'?'timetrial':'duel',recordedAt:Number.isFinite(row.recordedAt)?row.recordedAt:0,upgrades:getUpgradeLevels({upgrades:{[row.car]:row.upgrades}},row.car)});
  }
  const rows=[...best.values()];return {version:1,entries:rows.filter(currentRow),archivedEntries:rows.filter(row=>!currentRow(row))};
}
export function loadLeaderboard(storage){try{const raw=(storage??globalThis.localStorage)?.getItem(LEADERBOARD_KEY);return raw?normalize(JSON.parse(raw)):createLeaderboard();}catch{return createLeaderboard();}}
export function saveLeaderboard(board,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(LEADERBOARD_KEY,JSON.stringify(normalize(board)));return true;}catch{return false;}}
export function mergeLeaderboards(...boards){return normalize({version:1,entries:boards.flatMap(board=>board?.entries||[]),archivedEntries:boards.flatMap(board=>board?.archivedEntries||[])});}
export function recordFinish(board,result,player){
  if(!isValidFinish(result)||!player?.id||!playerName(player.name))return {board,recorded:false};
  board=normalize(board);
  const driverId=normalizeDriverId(result.driverId),driverSignature=driverModifierSignature(driverId,result.car);
  const event=eventKey(result),id=stageEventId(result.stageIndex),key=rowKey({playerId:player.id,eventKey:event,eventId:id,car:result.car,driverId,driverSignature,mode:result.mode,rival:result.rival});
  const index=board.entries.findIndex(row=>rowKey(row)===key),old=board.entries[index];
  const stage=COURSE[result.stageIndex],drift=stage.kind==='drift',cpu=['easy','medium','hard'].includes(result.cpuDifficulty)?result.cpuDifficulty:'easy';
  if(!better(result,old,drift))return {board,recorded:false,best:old.timeSec,...(drift?{scoreBest:old.driftScore,scoreImproved:false}:{})};
  const entry={playerId:player.id,playerName:playerName(player.name),eventKey:event,eventId:id,eventName:COURSE[result.stageIndex].name,layoutVersion:COURSE[result.stageIndex].layoutVersion??1,seed:(result.seed??1989)>>>0,laps:result.laps,car:result.car,timeSec:result.timeSec,
    cpuDifficulty:['easy','medium','hard'].includes(result.cpuDifficulty)?result.cpuDifficulty:'easy',difficulty:result.difficulty==='pro'?'pro':'casual',mode:result.mode==='wasteland'?'wasteland':result.mode==='timetrial'?'timetrial':'duel',driverId,driverSignature,
    ...(rivalSignature(result)?{rival:normalizeRival(result.rival)}:{}),upgrades:getUpgradeLevels({upgrades:{[result.car]:result.upgrades}},result.car),lapTimes:(result.lapTimes||[]).filter(v=>Number.isFinite(v)&&v>0).slice(0,result.laps),recordedAt:Date.now(),...(drift?driftMetadata({...result,cpuDifficulty:cpu},stage):{}),...(stage.kind==='checkpoint'?checkpointMetadata(result):{}),...(stage.stuntTrial?stuntMetadata(result):{})};
  const entries=board.entries.slice();if(index>=0)entries[index]=entry;else entries.push(entry);
  return {board:{version:1,entries,archivedEntries:board.archivedEntries},recorded:true,best:entry.timeSec,...(drift?{scoreBest:entry.driftScore,scoreImproved:!!old&&entry.driftScore>old.driftScore}:{})};
}
export function getLeaderboard(board,{eventId='',event='',car='',playerId='',driverId=DEFAULT_DRIVER}={}){
  return board.entries.filter(row=>currentRow(row)&&(row.driverSignature??'')===driverModifierSignature(driverId,row.car)&&(!eventId||row.eventId===eventId)&&(!event||row.eventKey===event)&&(!car||row.car===car)&&(!playerId||row.playerId===playerId))
    .slice().sort((a,b)=>Number(isDriftRow(a))-Number(isDriftRow(b))||(isDriftRow(a)?b.driftScore-a.driftScore:0)||a.timeSec-b.timeSec||a.recordedAt-b.recordedAt||a.playerName.localeCompare(b.playerName));
}
