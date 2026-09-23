import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE} from '../src/config.js';
import {fireWeapon,stepCombat} from '../src/combat.js';

function make(cpuDifficulty='medium'){
  const duel=new Duel({seed:1989});
  duel.startCampaign({mode:'wasteland',startStage:0,cpuDifficulty});
  const s=duel.state;
  s.status='racing';s.s=s.prevS=160;s.lateral=s.prevLateral=0;s.speedMph=0;
  s.rival.s=s.rival.prevS=80;s.rival.lateral=s.rival.prevLateral=0;
  s.rival.speedMph=0;s.traffic=[];s.combat.pickupTimer=Infinity;
  return duel;
}

for(const [difficulty,seconds] of [['easy',10],['medium',6.8],['hard',5.3]]){
  const duel=make(difficulty),s=duel.state;
  stepCombat(duel,.1);
  assert.ok(Math.abs(s.combat.aiTimer-(seconds-.1))<.001,
    `${difficulty} CPU first fire interval is ${seconds} seconds`);
  s.combat.aiTimer=.01;
  stepCombat(duel,.02);
  assert.ok(Math.abs(s.combat.aiTimer-seconds)<.001,
    `${difficulty} CPU repeats its ${seconds}-second fire interval`);
}

{
  const duel=make('hard'),s=duel.state;
  s.s=s.prevS=200;s.rival.s=s.rival.prevS=80;
  s.speedMph=140;s.headingError=.4;
  s.combat.aiTimer=Infinity;
  assert.ok(fireWeapon(duel,'crossbow',true));
  const projectile=s.combat.projectiles.at(-1),target=duel.course.groundAt(s.s,s.lateral),
    shooter=duel.course.groundAt(s.rival.s,s.rival.lateral);
  const length=Math.hypot(target.x-shooter.x,target.z-shooter.z);
  const currentX=(target.x-shooter.x)/length,currentZ=(target.z-shooter.z)/length;
  const sideX=Math.cos(target.heading),sideZ=-Math.sin(target.heading);
  const currentSide=currentX*sideX+currentZ*sideZ;
  const projectileLength=Math.hypot(projectile.vx,projectile.vz);
  const aimedSide=(projectile.vx*sideX+projectile.vz*sideZ)/projectileLength;
  assert.ok(aimedSide>currentSide+.02,'Hard CPU leads a player moving sideways');
}

{
  const errors={};
  for(const difficulty of ['easy','medium','hard']){
    const duel=make(difficulty),s=duel.state;
    s.s=s.prevS=200;s.rival.s=s.rival.prevS=80;
    s.speedMph=140;s.headingError=.4;
    s.combat.aiTimer=Infinity;
    assert.ok(fireWeapon(duel,'crossbow',true));
    const projectile=s.combat.projectiles.at(-1),target=duel.course.groundAt(s.s,s.lateral),
      shooter=duel.course.groundAt(s.rival.s,s.rival.lateral);
    const travel=Math.min(.75,Math.hypot(target.x-shooter.x,target.z-shooter.z)/200);
    const speed=s.speedMph*DRIVE.mphToWorld,frame=duel.course.at(s.s);
    const future=duel.course.groundAt(s.s+Math.cos(s.headingError)*speed*travel/
      Math.max(.25,1-frame.curvature*s.lateral),
      s.lateral+Math.sin(s.headingError)*speed*travel);
    const ideal=Math.atan2(future.x-shooter.x,future.z-shooter.z);
    const actual=Math.atan2(projectile.vx,projectile.vz);
    errors[difficulty]=Math.abs(Math.atan2(Math.sin(actual-ideal),Math.cos(actual-ideal)));
  }
  assert.ok(errors.easy>errors.medium&&errors.medium>errors.hard,
    'seeded CPU aim error shrinks from Easy through Hard');
  assert.ok(errors.easy<=.12+1e-6&&errors.medium<=.055+1e-6&&errors.hard<=.018+1e-6,
    'CPU aim error stays inside each difficulty cone');
}

{
  const duel=make('medium'),s=duel.state;
  s.s=s.prevS=100;s.rival.s=s.rival.prevS=120;
  s.combat.aiTimer=0;
  stepCombat(duel,.02);
  assert.ok(s.combat.projectiles.some(projectile=>projectile.enemy&&projectile.kind==='bomb'),
    'CPU bombs a player who is close');
}

{
  const duel=make('medium'),s=duel.state;
  s.s=s.prevS=100;s.rival.s=s.rival.prevS=100;s.combat.aiTimer=Infinity;
  const hits=[];
  duel.onChange((_,event)=>{if(event.combatHit&&event.enemy&&event.victim==='player')hits.push(event);});
  assert.ok(fireWeapon(duel,'bomb',true));
  for(const bomb of s.combat.projectiles)bomb.age=1.5;
  stepCombat(duel,.02);
  assert.equal(hits.length,1,'one overlapping bomb volley causes one physical impact per car');
}

function incoming(duel,distance,front=true){
  const s=duel.state,r=duel.course.groundAt(s.rival.s,s.rival.lateral);
  const direction=front?1:-1;
  const origin=duel.course.groundAt(s.rival.s+direction*distance,s.rival.lateral);
  const span=Math.hypot(r.x-origin.x,r.z-origin.z);
  s.combat.projectiles.push({kind:'crossbow',enemy:false,level:0,
    x:origin.x,z:origin.z,y:origin.y+2,
    vx:(r.x-origin.x)/span*200,vz:(r.z-origin.z)/span*200,
    vy:(r.y-origin.y)/span*200,age:0});
}
function shieldFixture(difficulty){
  const duel=make(difficulty),s=duel.state;
  s.s=s.prevS=100;s.rival.s=s.rival.prevS=120;s.combat.aiTimer=Infinity;
  return duel;
}
{
  const duel=shieldFixture('hard'),s=duel.state;
  incoming(duel,50);
  for(let tick=0;tick<15;tick++)stepCombat(duel,.02);
  assert.ok(s.combat.rivalShield>0,'Hard CPU sees a front bolt in time to shield');
  assert.equal(s.combat.hits,0,'reactive shield blocks that bolt');
  s.combat.rivalShield=0;s.combat.aiShieldCooldown=8;
  incoming(duel,50);
  for(let tick=0;tick<15;tick++)stepCombat(duel,.02);
  assert.equal(s.combat.rivalShield,0,'CPU shield observes its 16-second cooldown');
  assert.equal(s.combat.hits,1,'the bolt lands while the shield cools down');
}
{
  const close=shieldFixture('hard');
  incoming(close,2);
  stepCombat(close,.02);
  assert.equal(close.state.combat.rivalShield,0,'a bolt at contact range beats Hard reaction time');
  assert.equal(close.state.combat.hits,1,'the close front bolt lands');
  const rear=shieldFixture('hard');
  incoming(rear,50,false);
  for(let tick=0;tick<15;tick++)stepCombat(rear,.02);
  assert.equal(rear.state.combat.rivalShield,0,'CPU cannot see a bolt behind its car');
  assert.equal(rear.state.combat.hits,1,'the unseen rear bolt lands');
}
{
  const easy=shieldFixture('easy'),hard=shieldFixture('hard');
  incoming(easy,35);incoming(hard,35);
  for(let tick=0;tick<12;tick++){stepCombat(easy,.02);stepCombat(hard,.02);}
  assert.equal(easy.state.combat.hits,1,'Easy reaction is too slow for a 35 m bolt');
  assert.equal(hard.state.combat.hits,0,'Hard reacts to the same visible bolt');
  assert.ok(hard.state.combat.rivalShield>0,'Hard shield becomes visible');
}

globalThis.cancelAnimationFrame=()=>{};
function runRace(cpuDifficulty,stageId){
  const data=new Map();
  globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)};
  const app=new App();
  const stageIndex=COURSE.findIndex(stage=>stage.id===stageId);
  assert.ok(stageIndex>=0,`known course ${stageId}`);
  app.duel.startCampaign({mode:'wasteland',startStage:stageIndex,seed:1989,
    car:COURSE[stageIndex].requiredCar??'falcone_f42',difficulty:'casual',cpuDifficulty});
  app.autopilot=true;app._scriptedCrashDone=true;
  let hits=0;
  app.duel.onChange((_,event)=>{if(event.combatHit&&event.enemy&&event.victim==='player')hits++;});
  for(let frame=0;frame<30*600&&['countdown','racing','ticket'].includes(app.duel.state.status);frame++){
    if(app.duel.state.status==='ticket')app.duel.ackTicket();
    app.advance(1/30,1/30);
  }
  const completed=app.duel.state.results?.completed===true;
  const status=app.duel.state.status,crashes=app.duel.state.stageCrashes;
  app.dispose();
  return {stageId,cpuDifficulty,completed,status,crashes,hits};
}
const races=['easy','medium','hard'].map(difficulty=>runRace(difficulty,'titan-arena'));
const pacific=['easy','medium','hard'].map(difficulty=>runRace(difficulty,'pacific-canyon'));
console.log(JSON.stringify({races,pacific}));
for(const race of [...races,...pacific]){
  assert.ok(race.completed,`${race.cpuDifficulty} race completes`);
  const [min,max]={easy:[0,3],medium:[2,6],hard:[4,10]}[race.cpuDifficulty];
  assert.ok(race.hits>=min&&race.hits<=max,
    `${race.cpuDifficulty} CPU hits ${race.hits} must be ${min}–${max}`);
}
