import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {supportsCombat} from '../src/combat.js';

globalThis.cancelAnimationFrame=()=>{};
function run(stageIndex,cpuDifficulty){
  const memory=new Map();
  globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  const app=new App(),stage=COURSE[stageIndex];
  app.duel.startCampaign({mode:'wasteland',startStage:stageIndex,seed:1989,car:stage.requiredCar??'falcone_f42',difficulty:'casual',cpuDifficulty});
  app.autopilot=true;app._scriptedCrashDone=true;
  let cpuShots=0,cpuBombs=0,cpuShields=0,cpuHits=0,frame=0;
  const details=[];
  app.duel.onChange((_,event)=>{
    if(event.weaponFired==='crossbow'){cpuShots++;details.push({kind:'crossbow',gap:Math.round(app.duel.state.s-app.duel.state.rival.s),time:+(frame/30).toFixed(1)});}
    if(event.weaponFired==='bomb'){cpuBombs++;details.push({kind:'bomb',gap:Math.round(app.duel.state.s-app.duel.state.rival.s),time:+(frame/30).toFixed(1)});}
    if(event.weaponFired==='star')cpuShields++;
    if(event.combatHit&&event.enemy&&event.victim==='player')cpuHits++;
  });
  for(frame=0;frame<30*600&&['countdown','racing','ticket'].includes(app.duel.state.status);frame++){
    if(app.duel.state.status==='ticket')app.duel.ackTicket();
    app.advance(1/30,1/30);
  }
  const result={stage:stage.id,cpuDifficulty,completed:app.duel.state.results?.completed===true,
    hits:cpuHits,shots:cpuShots,bombs:cpuBombs,shields:cpuShields,
    time:app.duel.state.results?.timeSec??null,details};
  app.dispose();return result;
}
const selectedStage=process.argv.find(value=>!value.startsWith('--')&&value!==process.argv[0]&&value!==process.argv[1]);
const stages=COURSE.map((stage,index)=>supportsCombat(stage)?index:null).filter(index=>index!=null)
  .filter(index=>!selectedStage||COURSE[index].id===selectedStage);
const rows=[];
for(const stage of stages)for(const cpuDifficulty of ['easy','medium','hard'])rows.push(run(stage,cpuDifficulty));
const bands={easy:[0,3],medium:[2,6],hard:[4,10]};
const summary=Object.fromEntries(Object.entries(bands).map(([difficulty,[low,high]])=>{
  const races=rows.filter(row=>row.cpuDifficulty===difficulty);
  return [difficulty,{withinBand:races.filter(row=>row.hits>=low&&row.hits<=high).length,
    races:races.length,totalHits:races.reduce((sum,row)=>sum+row.hits,0)}];
}));
if(!process.argv.includes('--details'))for(const row of rows)delete row.details;
console.log(JSON.stringify({summary,rows}));
