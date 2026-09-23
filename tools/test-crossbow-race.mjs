import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {DEFAULT_DRIVER} from '../src/drivers.js';

globalThis.cancelAnimationFrame=()=>{};
const memoryStorage=()=>{
  const rows=new Map();
  return {getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,String(value)),
    removeItem:key=>rows.delete(key)};
};

// Reproduce the reported 1/26 Medium race with the original "fire whenever ready"
// policy. Record where the rival was at each shot; this is a diagnostic, not the
// 35–60% acceptance test, which has an explicit front-target precondition.
globalThis.localStorage=memoryStorage();
const app=new App();
assert.ok(app.startCampaign({startStage:0,seed:1989,mode:'wasteland',car:'falcone_f42',
  difficulty:'casual',cpuDifficulty:'medium',driverId:DEFAULT_DRIVER}));
app.autopilot=true;
app._scriptedCrashDone=true;
const duel=app.duel,shotGaps=[];
for(let frame=0;frame<30*600&&['countdown','racing'].includes(duel.state.status);frame++){
  const s=duel.state;
  if(s.status==='racing'&&s.rival&&!s.rival.finished&&s.combat.cooldowns.crossbow<=0){
    const gap=duel.relativeS(s.rival.s,s.s)-s.s;
    if(duel.fireWeapon('crossbow'))shotGaps.push(+gap.toFixed(1));
  }
  app.advance(1/30,1/30);
}
const result={completed:duel.state.results?.completed===true,shots:shotGaps.length,
  hits:duel.state.combat.hits,behind:shotGaps.filter(gap=>gap<0).length,
  frontWithin120:shotGaps.filter(gap=>gap>=0&&gap<=120).length};
app.dispose();
console.log(JSON.stringify(result));
assert.ok(result.completed,'full-race crossbow replay completes');
assert.ok(result.shots>0,'full-race replay exercises crossbow firing');
