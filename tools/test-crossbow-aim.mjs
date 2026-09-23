import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE} from '../src/config.js';
import {supportsCombat,stepCombat} from '../src/combat.js';

const stages=COURSE.map((stage,index)=>supportsCombat(stage)?{stage,index}:null).filter(Boolean);
assert.equal(stages.length,11,'moving-rival probe covers every combat course');
const seeds=[42,1989];
const speeds=[[65,60],[90,80],[130,115]];
const gaps=[15,45,75,105];
const difficulties=['easy','medium','hard'];
const cases=[];
for(const cpuDifficulty of difficulties){
let caseIndex=0;
for(const {stage,index:stageIndex} of stages){
  for(const seed of seeds){
    for(const [playerSpeed,rivalSpeed] of speeds){
      for(const gap of gaps){
        const duel=new Duel({seed});
        duel.startCampaign({mode:'wasteland',startStage:stageIndex,
          car:stage.requiredCar??'falcone_f42',cpuDifficulty});
        const s=duel.state,lateral=((caseIndex*3)%7-3)*.85;
        s.status='racing';s.s=s.prevS=100+(caseIndex*379)%(duel.course.length-300);
        s.lateral=s.prevLateral=0;s.speedMph=playerSpeed;s.traffic=[];
        s.rival.s=s.rival.prevS=s.s+gap;
        s.rival.lateral=s.rival.prevLateral=lateral;s.rival.speedMph=rivalSpeed;
        s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
        const front=duel.relativeS(s.rival.s,s.s)-s.s;
        assert.ok(front>0&&front<=120,`case ${caseIndex} has a rival ahead within 120 m`);
        assert.ok(duel.fireWeapon('crossbow'),`crossbow fires on case ${caseIndex}`);
        for(let tick=0;tick<150&&s.combat.projectiles.length;tick++){
          s.prevS=s.s;s.s+=s.speedMph*DRIVE.mphToWorld*.02;
          duel._rival(.02);
          stepCombat(duel,.02);
        }
        cases.push({course:stage.id,seed,cpuDifficulty,playerSpeed,rivalSpeed,gap,lateral,
          hit:s.combat.hits>0,shielded:s.combat.rivalShield>0});
        caseIndex++;
      }
    }
  }
}
}

const summarize=(field)=>Object.fromEntries([...new Set(cases.map(row=>row[field]))].map(value=>{
  const rows=cases.filter(row=>row[field]===value);
  return [value,{shots:rows.length,hits:rows.filter(row=>row.hit).length}];
}));
const shots=cases.length,hits=cases.filter(row=>row.hit).length,rate=hits/shots;
const summary={shots,hits,rate:+rate.toFixed(3),shielded:cases.filter(row=>row.shielded).length,
  byDifficulty:summarize('cpuDifficulty'),byGap:summarize('gap'),
  bySpeed:summarize('playerSpeed'),byCourse:summarize('course')};
console.log(JSON.stringify(summary));
assert.equal(shots,11*2*3*4*3,'all 792 seeded, moving-rival cases ran');
for(const difficulty of difficulties){
  const rows=cases.filter(row=>row.cpuDifficulty===difficulty),hitRate=rows.filter(row=>row.hit).length/rows.length;
  assert.equal(rows.filter(row=>row.shielded).length,0,
    `${difficulty} CPU cannot auto-shield bolts arriving unseen from behind`);
  assert.ok(hitRate>=.35&&hitRate<=.60,
    `${difficulty} front-target crossbow hit rate ${(hitRate*100).toFixed(1)}% must be 35–60%`);
}
