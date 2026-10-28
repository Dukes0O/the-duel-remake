// Saved series rules. Native race classification supplies every finishing place.
const cup = (id,name,events) => Object.freeze({id,name,events:Object.freeze(events)});
export const CUPS=Object.freeze([
  cup('mountain','Mountain Cup',['tremblant-woods','panorama-ridge','summit-run']),
  cup('night','Night Cup',['harbour-lights','panorama-ridge-night','neon-docks']),
  cup('winter','Winter Cup',['tremblant-snow','summit-run','alpine-serpent']),
  cup('grand-tour','Grand Tour',['panorama-ridge','harbour-lights','tremblant-woods','summit-run','eifel-crown']),
]);
export const CUP_POINTS=Object.freeze([10,8,6,5,4,3,2,1]);
const difficulties=['easy','medium','hard'];
const findCup=id=>CUPS.find(row=>row.id===id);
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=128;
const uint=value=>Number.isSafeInteger(value)&&value>=0&&value<=0xffffffff;
const trophyKey=value=>typeof value==='string'&&CUPS.some(cup=>difficulties.some(cpu=>value===cup.id+':'+cpu));
const roster=Object.freeze(['player',...Array.from({length:7},(_,index)=>'gp-'+(index+1))]);

function classification(value){
  if(!Array.isArray(value)||value.length!==8)return null;
  if(new Set(value.map(row=>row?.id)).size!==8||new Set(value.map(row=>row?.position)).size!==8)return null;
  if(!value.every(row=>roster.includes(row?.id)&&Number.isInteger(row.position)&&row.position>=1&&row.position<=8))return null;
  return value.map(row=>({id:row.id,name:typeof row.name==='string'?row.name.slice(0,48):row.id,
    position:row.position,you:row.id==='player'})).sort((a,b)=>a.position-b.position);
}
function activeRun(value){
  const definition=findCup(value?.cupId);
  if(!definition||!identifier(value.id)||!identifier(value.ownerId)||!identifier(value.car)||
    !difficulties.includes(value.cpuDifficulty)||!['casual','pro'].includes(value.difficulty)||!uint(value.fieldSeed)||
    !Array.isArray(value.results)||value.results.length>definition.events.length)return null;
  const ids=new Set(),results=[];
  for(const [index,result] of value.results.entries()){
    const field=classification(result?.field);
    if(!field||!identifier(result.runId)||!Number.isSafeInteger(result.stageIndex)||result.stageIndex<0||
      result.settlementKey!==result.runId+':'+result.stageIndex||ids.has(result.runId)||result.eventId!==definition.events[index])return null;
    ids.add(result.runId);results.push({runId:result.runId,eventId:result.eventId,stageIndex:result.stageIndex,settlementKey:result.settlementKey,field});
  }
  return {id:value.id,ownerId:value.ownerId,cupId:definition.id,cpuDifficulty:value.cpuDifficulty,
    difficulty:value.difficulty,car:value.car,fieldSeed:value.fieldSeed,results};
}
export function normalizeCups(value){
  // Keep a future schema intact, but no v1 operation can act on it.
  if(value&&Number.isInteger(value.version)&&value.version>1)return value;
  if(value?.version!==1)value=null;
  return {version:1,trophies:[...new Set((Array.isArray(value?.trophies)?value.trophies:[]).filter(trophyKey))],
    settled:[...new Set((Array.isArray(value?.settled)?value.settled:[]).filter(identifier))].slice(-200),
    active:value?.version===1?activeRun(value.active):null};
}
export function cupBonus(cupId,cpuDifficulty){
  const index=difficulties.indexOf(cpuDifficulty);
  return findCup(cupId)&&index>=0?[900,1500,2250][index]*(cupId==='grand-tour'?2:1):0;
}
export function cupAvailability(value,cupId,{courses=[],owns=()=>false,enabled=false}={}){
  const definition=findCup(cupId),state=normalizeCups(value);
  const no=reason=>({ok:false,reason});
  if(!enabled||!definition||state.version!==1)return no('Cups are not available.');
  if(cupId==='grand-tour'&&!CUPS.slice(0,3).every(cup=>state.trophies.some(key=>key.startsWith(cup.id+':'))))
    return no('Win the Mountain, Night and Winter Cups first.');
  for(const id of definition.events){
    const course=courses.find(row=>row.id===id);
    if(!course)return no('This cup opens when every course is available.');
    if(!owns(course))return no('Unlock every course in this cup first.');
  }
  return {ok:true,reason:''};
}
export function beginCup(value,options,admission){
  const state=normalizeCups(value),availability=cupAvailability(state,options?.cupId,admission);
  if(!availability.ok)return {ok:false,cups:value,reason:availability.reason};
  if(state.active)return {ok:false,cups:value,reason:'Finish or abandon your current cup first.'};
  const active=activeRun({...options,results:[]});
  if(!active||state.settled.includes(active.id))return {ok:false,cups:value,reason:'Choose a new valid cup run.'};
  return {ok:true,cups:{...state,active},reason:''};
}
export function cupStandings(results){
  const fields=results.map(result=>classification(result.field??result));
  if(!fields.length||fields.some(field=>!field))return [];
  const rows=roster.map(id=>({id,name:fields[0].find(row=>row.id===id).name,you:id==='player',points:0,
    finishes:fields.map(field=>field.find(row=>row.id===id).position)}));
  for(const row of rows)row.points=row.finishes.reduce((sum,position)=>sum+CUP_POINTS[position-1],0);
  rows.sort((a,b)=>{
    if(a.points!==b.points)return b.points-a.points;
    const best=Math.min(...a.finishes)-Math.min(...b.finishes);if(best)return best;
    for(let position=2;position<=8;position++){
      const count=b.finishes.filter(p=>p===position).length-a.finishes.filter(p=>p===position).length;
      if(count)return count;
    }
    return a.finishes.at(-1)-b.finishes.at(-1);
  });
  return rows.map((row,index)=>({...row,position:index+1}));
}
export function recordCupRace(value,receipt){
  const state=normalizeCups(value),active=state.active,field=classification(receipt?.field);
  const no=()=>({cups:value,recorded:false,finished:false});
  if(state.version!==1||!active||!field||receipt.ownerId!==active.ownerId||receipt.seriesId!==active.id||
    receipt.mode!=='grandprix'||receipt.completed!==true||receipt.qualifying!==false||
    receipt.car!==active.car||receipt.cpuDifficulty!==active.cpuDifficulty||receipt.fieldSeed!==active.fieldSeed||
    !identifier(receipt.runId)||!Number.isSafeInteger(receipt.stageIndex)||receipt.stageIndex<0||active.results.some(row=>row.runId===receipt.runId))return no();
  const definition=findCup(active.cupId),index=active.results.length;
  if(receipt.eventId!==definition.events[index])return no();
  const results=[...active.results,{runId:receipt.runId,eventId:receipt.eventId,stageIndex:receipt.stageIndex,settlementKey:receipt.runId+':'+receipt.stageIndex,field}];
  return {cups:{...state,active:{...active,results}},recorded:true,finished:results.length===definition.events.length};
}
export function abandonCup(value,ownerId){
  const state=normalizeCups(value);
  return state.version===1&&state.active?.ownerId===ownerId?{...state,active:null}:value;
}
