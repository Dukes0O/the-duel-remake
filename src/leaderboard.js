import {CARS,COURSE} from './config.js';
import {eventKey,isValidFinish,stageEventId,playerName,getUpgradeLevels} from './progression.js';

export const LEADERBOARD_KEY='the-duel-leaderboard-v1';
export function createLeaderboard(){return {version:1,entries:[]};}
const isDriftRow=row=>COURSE.find(stage=>stage.id===row.eventId)?.kind==='drift';
function better(row,prior,drift){return !prior||drift&&!Number.isFinite(prior.driftScore)||(drift&&row.driftScore!==prior.driftScore?row.driftScore>prior.driftScore:row.timeSec<prior.timeSec-.005);}
function driftMetadata(result,stage){return {discipline:'drift',driftScore:Math.round(result.driftScore),driftTarget:stage.driftTrial.targets[result.cpuDifficulty||'easy'],driftBestChain:Math.round(result.driftBestChain||0),driftMeters:Math.round((result.driftMeters||0)*10)/10};}
function checkpointMetadata(result){return {discipline:'checkpoint',checkpointsPassed:result.checkpointsPassed,checkpointsRequired:result.checkpointsRequired,checkpointMisses:result.checkpointMisses};}
function normalize(value){
  if(value?.version!==1||!Array.isArray(value.entries))return createLeaderboard();
  const best=new Map();
  for(const row of value.entries){
    if(!row||typeof row.playerId!=='string'||!playerName(row.playerName)||typeof row.eventKey!=='string'||!Object.hasOwn(CARS,row.car)||!Number.isFinite(row.timeSec)||row.timeSec<=0||!Number.isInteger(row.laps)||row.laps<1)continue;
    const stageIndex=COURSE.findIndex((stage,index)=>stageEventId(index)===row.eventId&&(stage.laps||2)===row.laps);
    if(stageIndex<0||row.eventKey!==eventKey({stageIndex,seed:row.seed,laps:row.laps}))continue;
    const stage=COURSE[stageIndex],drift=stage.kind==='drift',cpu=['easy','medium','hard'].includes(row.cpuDifficulty)?row.cpuDifficulty:'easy';
    if(drift&&(!Number.isInteger(row.driftScore)||row.driftTarget!==stage.driftTrial.targets[cpu]||!isValidFinish({...row,stageIndex,cpuDifficulty:cpu,completed:true,won:true,targetsMet:true})||!Number.isFinite(row.driftBestChain)||row.driftBestChain<0||row.driftBestChain>row.driftScore||!Number.isFinite(row.driftMeters)||row.driftMeters<0||row.driftMeters>stage.lengthU*row.laps))continue;
    if(stage.kind==='checkpoint'&&!isValidFinish({...row,stageIndex,cpuDifficulty:cpu,completed:true,won:true,targetsMet:true}))continue;
    const key=[row.playerId,row.eventKey,row.car].join('|'),prior=best.get(key);
    if(better(row,prior,drift))best.set(key,{...row,...(drift?driftMetadata({...row,cpuDifficulty:cpu},stage):{}),playerName:playerName(row.playerName),cpuDifficulty:cpu,difficulty:row.difficulty==='pro'?'pro':'casual',mode:row.mode==='timetrial'?'timetrial':'duel',recordedAt:Number.isFinite(row.recordedAt)?row.recordedAt:0,upgrades:getUpgradeLevels({upgrades:{[row.car]:row.upgrades}},row.car)});
  }
  return {version:1,entries:[...best.values()]};
}
export function loadLeaderboard(storage){try{const raw=(storage??globalThis.localStorage)?.getItem(LEADERBOARD_KEY);return raw?normalize(JSON.parse(raw)):createLeaderboard();}catch{return createLeaderboard();}}
export function saveLeaderboard(board,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(LEADERBOARD_KEY,JSON.stringify(normalize(board)));return true;}catch{return false;}}
export function mergeLeaderboards(...boards){return normalize({version:1,entries:boards.flatMap(board=>board?.entries||[])});}
export function recordFinish(board,result,player){
  if(!isValidFinish(result)||!player?.id||!playerName(player.name))return {board,recorded:false};
  const event=eventKey(result),id=stageEventId(result.stageIndex),key=[player.id,event,result.car].join('|');
  const index=board.entries.findIndex(row=>[row.playerId,row.eventKey,row.car].join('|')===key),old=board.entries[index];
  const stage=COURSE[result.stageIndex],drift=stage.kind==='drift',cpu=['easy','medium','hard'].includes(result.cpuDifficulty)?result.cpuDifficulty:'easy';
  if(!better(result,old,drift))return {board,recorded:false,best:old.timeSec,...(drift?{scoreBest:old.driftScore,scoreImproved:false}:{})};
  const entry={playerId:player.id,playerName:playerName(player.name),eventKey:event,eventId:id,eventName:COURSE[result.stageIndex].name,layoutVersion:COURSE[result.stageIndex].layoutVersion??1,seed:(result.seed??1989)>>>0,laps:result.laps,car:result.car,timeSec:result.timeSec,
    cpuDifficulty:['easy','medium','hard'].includes(result.cpuDifficulty)?result.cpuDifficulty:'easy',difficulty:result.difficulty==='pro'?'pro':'casual',mode:result.mode==='timetrial'?'timetrial':'duel',
    upgrades:getUpgradeLevels({upgrades:{[result.car]:result.upgrades}},result.car),lapTimes:(result.lapTimes||[]).filter(v=>Number.isFinite(v)&&v>0).slice(0,result.laps),recordedAt:Date.now(),...(drift?driftMetadata({...result,cpuDifficulty:cpu},stage):{}),...(stage.kind==='checkpoint'?checkpointMetadata(result):{})};
  const entries=board.entries.slice();if(index>=0)entries[index]=entry;else entries.push(entry);
  return {board:{version:1,entries},recorded:true,best:entry.timeSec,...(drift?{scoreBest:entry.driftScore,scoreImproved:!!old&&entry.driftScore>old.driftScore}:{})};
}
export function getLeaderboard(board,{eventId='',event='',car='',playerId=''}={}){
  return board.entries.filter(row=>(!eventId||row.eventId===eventId)&&(!event||row.eventKey===event)&&(!car||row.car===car)&&(!playerId||row.playerId===playerId))
    .slice().sort((a,b)=>Number(isDriftRow(a))-Number(isDriftRow(b))||(isDriftRow(a)?b.driftScore-a.driftScore:0)||a.timeSec-b.timeSec||a.recordedAt-b.recordedAt||a.playerName.localeCompare(b.playerName));
}
