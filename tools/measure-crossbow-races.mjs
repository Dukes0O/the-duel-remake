import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {supportsCombat} from '../src/combat.js';

globalThis.cancelAnimationFrame=()=>{};
function run(stageIndex,cpuDifficulty){
  const memory=new Map();
  globalThis.localStorage={getItem:key=>memory.get(key)??null,
    setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  const app=new App(),stage=COURSE[stageIndex];
  app.duel.startCampaign({mode:'wasteland',startStage:stageIndex,seed:1989,
    car:stage.requiredCar??'falcone_f42',difficulty:'casual',cpuDifficulty});
  app.autopilot=true;app._scriptedCrashDone=true;
  const gaps=[];
  for(let frame=0;frame<30*600&&['countdown','racing','ticket'].includes(app.duel.state.status);frame++){
    const s=app.duel.state;
    if(s.status==='ticket')app.duel.ackTicket();
    if(s.status==='racing'&&s.rival&&!s.rival.finished&&s.combat.cooldowns.crossbow<=0){
      const gap=app.duel.relativeS(s.rival.s,s.s)-s.s;
      if(gap>=0&&gap<=120&&app.duel.fireWeapon('crossbow'))gaps.push(+gap.toFixed(1));
    }
    app.advance(1/30,1/30);
  }
  const s=app.duel.state;
  const result={course:stage.id,cpuDifficulty,completed:s.results?.completed===true,
    shots:gaps.length,hits:s.combat?.hits??0,gaps};
  app.dispose();return result;
}
const stages=COURSE.map((stage,index)=>supportsCombat(stage)?index:null).filter(index=>index!=null);
const rows=[];
for(const stage of stages)for(const cpu of ['medium','hard'])rows.push(run(stage,cpu));
const shots=rows.reduce((sum,row)=>sum+row.shots,0),hits=rows.reduce((sum,row)=>sum+row.hits,0);
const gaps=rows.flatMap(row=>row.gaps);
const summary={races:rows.length,completed:rows.filter(row=>row.completed).length,
  shots,hits,rate:shots?+(hits/shots).toFixed(3):0,
  gapBins:{'0-29':gaps.filter(g=>g<30).length,'30-59':gaps.filter(g=>g>=30&&g<60).length,
    '60-89':gaps.filter(g=>g>=60&&g<90).length,'90-120':gaps.filter(g=>g>=90).length}};
if(!process.argv.includes('--details'))for(const row of rows)delete row.gaps;
console.log(JSON.stringify({summary,rows}));
