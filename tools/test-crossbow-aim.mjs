import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE} from '../src/config.js';
import {supportsCombat,stepCombat} from '../src/combat.js';

const stages=COURSE.map((stage,index)=>supportsCombat(stage)?{stage,index}:null).filter(Boolean);
assert.equal(stages.length,11,'moving target probe covers all combat courses');
const cases=[];
for(let index=0;index<26;index++){
  const duel=new Duel({seed:1989+index});
  const event=stages[index%stages.length];
  duel.startCampaign({mode:'wasteland',startStage:event.index,
    car:event.stage.requiredCar??'falcone_f42'});
  const s=duel.state,gap=20+index%13*7,lateral=(index%7-3)*.85;
  s.status='racing';s.s=s.prevS=100+(index*379)%(duel.course.length-300);
  s.lateral=s.prevLateral=0;s.speedMph=85;s.traffic=[];
  s.rival.s=s.rival.prevS=s.s+gap;
  s.rival.lateral=lateral;s.rival.speedMph=75;
  s.combat.aiTimer=Infinity;
  assert.ok(duel.fireWeapon('crossbow'),`crossbow fires on case ${index}`);
  for(let tick=0;tick<150&&s.combat.projectiles.length;tick++){
    s.prevS=s.s;s.s+=s.speedMph*DRIVE.mphToWorld*.02;
    duel._rival(.02);
    stepCombat(duel,.02);
  }
  cases.push({event:event.stage.id,gap,lateral,hit:s.combat.hits>0});
}
const hits=cases.filter(item=>item.hit).length,rate=hits/cases.length;
console.log(JSON.stringify({shots:cases.length,hits,rate:+rate.toFixed(3),cases}));
assert.ok(rate>=.35&&rate<=.60,
  `moving-rival crossbow hit rate ${(rate*100).toFixed(1)}% must be 35–60%`);
