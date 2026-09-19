import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,SCORING,LIVES,TRAFFIC} from '../src/config.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
function race(difficulty='casual',stage=0){
  const duel=new Duel({seed:1989});duel.startCampaign({difficulty,startStage:stage});
  Object.assign(duel.state,{status:'racing',traffic:[],rival:null,stageTimeSec:100});return duel;
}
function finish(duel){const s=duel.state;s.s=duel.raceLength;s.completedLaps=s.lapsTotal;return duel._finishStage();}
for(const difficulty of ['casual','pro']){
  const d=race(difficulty),s=d.state,m=difficulty==='pro'?2:1;
  // Close lane passes still count after tightening the earlier 7.2m range.
  Object.assign(s,{s:600,prevS:598,lateral:-3.1,prevLateral:-3.1,speedMph:80});
  s.traffic=[{s:599,prevS:601,lateral:3.1,prevLateral:3.1,speedMph:40,headingError:0,slipAngle:0,dir:-1,alive:true}];
  d._collisions();check(s.nearMisses===1&&s.score===SCORING.nearMissPoints*m,`${difficulty}: close lane pass earns points`);
  d._collisions();check(s.nearMisses===1,`${difficulty}: the same pass cannot farm points`);
  const outside=race(difficulty),o=outside.state;
  Object.assign(o,{s:600,prevS:598,lateral:0,speedMph:80});
  o.traffic=[{s:599,prevS:601,lateral:TRAFFIC.nearMissLatU+.2,speedMph:40,headingError:0,dir:-1,alive:true}];
  outside._collisions();check(o.nearMisses===0,`${difficulty}: distant traffic does not earn near miss points`);
  s.traffic=[];s.police.pursuit={active:true,caught:false};
  const previous=s.score;
  d._awardPoliceEscape('gap');check(s.policeEscapes===1&&s.score-previous===SCORING.policeEscapePoints*m,`${difficulty}: evasion earns the correct score`);
  d._awardPoliceEscape('gap');check(s.policeEscapes===1,`${difficulty}: one pursuit pays once`);
  s.police.pursuit={active:true,caught:false};finish(d);
  check(s.results.policeEscapes===2&&!s.police.pursuit.active,`${difficulty}: finishing clears and counts the live pursuit`);
  const score=s.score;finish(d);check(s.score===score,`${difficulty}: finish settlement cannot repeat`);
}
const auto=race(),manual=race('pro');finish(auto);finish(manual);
check(manual.state.results.score===auto.state.results.score*2,'Pro doubles total race points');
for(const [speed,clearance,expected]of[[64,6.2,0],[65,6.2,1],[80,6.39,1],[80,6.4,0],[80,6.8,0],[80,7.19,0],[80,1,0]]){
  const d=race(),s=d.state;
  Object.assign(s,{s:600,prevS:598,lateral:0,prevLateral:0,speedMph:speed});
  s.traffic=[{s:599,prevS:601,lateral:clearance,prevLateral:clearance,speedMph:40,headingError:0,slipAngle:0,dir:-1,alive:true}];
  d._collisions();check(s.nearMisses===expected,`near-miss boundary: ${speed}mph / ${clearance}m separation`);
  if(clearance===1)check(s.majorCrashes===1,'the wider near-miss zone does not replace a physical collision');
}
for(const hits of [0,1,2,4]){
  const d=race(),s=d.state;Object.assign(s,{majorCrashes:hits,stageCrashes:hits,lives:LIVES.start-hits,damageZones:{front:hits,rear:0,left:0,right:0}});
  finish(d);check(s.majorCrashes===Math.max(0,hits-2)&&s.lives===Math.min(5,7-hits),`${hits} hits: win restores exactly two slots up to five`);
  check(s.results.stageCrashes===hits&&s.results.majorCrashesBeforeRepair===hits,'finish retains pre-repair evidence for clean rewards');
  check(s.results.cleanStage===(hits===0),'repairs never turn a damaged stage into a clean run');
  check(s.damageZones.front<=hits&&s.damageZones.front>=0,'visual repair remains bounded');
  d.nextStage();check(s.stageCrashes===0&&s.policeEscapes===0,'next stage resets per-stage counters');
}
const loss=race();Object.assign(loss.state,{stageTimeSec:999,majorCrashes:3,lives:2,stageCrashes:3});finish(loss);
check(!loss.state.results.won&&loss.state.majorCrashes===3&&loss.state.lives===2,'a stage loss grants no repairs');
const chase=race('pro',COURSE.findIndex(c=>c.kind==='chase'));finish(chase);
check(chase.state.results.won&&chase.state.results.policeEscapes===1,'winning the chase counts the finish-line escape');
const timeout=race('casual',COURSE.findIndex(c=>c.kind==='chase'));timeout.state.stageTimeSec=999;finish(timeout);
check(!timeout.state.results.won&&timeout.state.policeEscapes===0,'timing out cannot claim a finish-line escape');
const caught=race();caught.state.police.pursuit={active:false,caught:true};finish(caught);
check(caught.state.results.policeEscapes===0,'a caught pursuit does not earn an escape at the finish');
console.log(`Driving rewards: ${checks} near-miss, Pro scoring, evasion and repair checks passed.`);
