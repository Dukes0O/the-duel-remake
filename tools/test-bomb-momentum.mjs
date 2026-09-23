import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {fireWeapon,stepCombat} from '../src/combat.js';

const make=()=>{
  const duel=new Duel({seed:1989});
  duel.startCampaign({mode:'wasteland',startStage:0});
  const s=duel.state;
  s.status='racing';s.s=s.prevS=100;s.lateral=s.prevLateral=0;
  s.invulnerableSec=0;s.traffic=[];s.combat.aiTimer=Infinity;
  s.rival.s=1000;
  return duel;
};

const rows=[];
for(const speedKmh of [48,97,193,320]){
  const speedMph=speedKmh/1.609344;
  const duel=make(),s=duel.state;
  s.speedMph=speedMph;
  assert.ok(duel.fireWeapon('bomb'),`bomb ring fires at ${speedMph} mph`);
  const roadHeading=duel.course.groundAt(s.s,s.lateral).heading;
  const first=s.combat.projectiles[0];
  const expectedVelocity=(27+speedMph*DRIVE.mphToWorld);
  const initialError=Math.hypot(first.vx-Math.sin(roadHeading)*expectedVelocity,
    first.vz-Math.cos(roadHeading)*expectedVelocity);
  let minimum=s.speedMph;
  for(let tick=0;tick<100&&s.combat.projectiles.length;tick++){
    s.prevS=s.s;
    s.s+=s.speedMph*DRIVE.mphToWorld*.02;
    stepCombat(duel,.02);
    minimum=Math.min(minimum,s.speedMph);
  }
  const speedLossPct=100*(1-minimum/speedMph);
  rows.push({speedKmh,speedLossPct:+speedLossPct.toFixed(2),
    initialVelocityError:+initialError.toFixed(3)});
}
console.log(JSON.stringify(rows));
for(const row of rows){
  assert.ok(row.speedLossPct<=15,
    `own bombs reduce speed ${row.speedLossPct}% at ${row.speedKmh} km/h, above 15%`);
  assert.ok(row.initialVelocityError<.001,
    `bomb ring inherits the thrower's velocity at ${row.speedKmh} km/h`);
}
{
  const duel=make(),s=duel.state;
  s.speedMph=60;s.headingError=.25;s.pushVelocity=3;
  assert.ok(duel.fireWeapon('bomb'),'moving player throws an angled bomb ring');
  const roadHeading=duel.course.groundAt(s.s,s.lateral).heading;
  const travelHeading=roadHeading+s.headingError;
  const carryX=Math.sin(travelHeading)*s.speedMph*DRIVE.mphToWorld+Math.cos(roadHeading)*s.pushVelocity;
  const carryZ=Math.cos(travelHeading)*s.speedMph*DRIVE.mphToWorld-Math.sin(roadHeading)*s.pushVelocity;
  for(let i=0;i<s.combat.projectiles.length;i++){
    const bomb=s.combat.projectiles[i],angle=roadHeading+i*Math.PI*2/s.combat.projectiles.length;
    assert.ok(Math.hypot(bomb.vx-(Math.sin(angle)*27+carryX),bomb.vz-(Math.cos(angle)*27+carryZ))<1e-9,
      `player bomb ${i} inherits forward and sideways car motion`);
  }
}
{
  const duel=make(),r=duel.state.rival;
  r.s=150;r.speedMph=80;r.headingError=-.2;r.pushVelocity=-2;
  assert.ok(fireWeapon(duel,'bomb',true),'moving rival throws a bomb ring');
  const roadHeading=duel.course.groundAt(r.s,r.lateral).heading;
  const travelHeading=roadHeading+r.headingError;
  const carryX=Math.sin(travelHeading)*r.speedMph*DRIVE.mphToWorld+Math.cos(roadHeading)*r.pushVelocity;
  const carryZ=Math.cos(travelHeading)*r.speedMph*DRIVE.mphToWorld-Math.sin(roadHeading)*r.pushVelocity;
  const bombs=duel.state.combat.projectiles;
  for(let i=0;i<bombs.length;i++){
    const angle=roadHeading+i*Math.PI*2/bombs.length;
    assert.ok(Math.hypot(bombs[i].vx-(Math.sin(angle)*27+carryX),bombs[i].vz-(Math.cos(angle)*27+carryZ))<1e-9,
      `rival bomb ${i} inherits forward and sideways car motion`);
  }
}
{
  const duel=make(),s=duel.state;
  s.rival.s=s.s;s.rival.lateral=s.lateral;
  const p=duel.course.groundAt(s.s,s.lateral),hits=[];
  duel.onChange((_,event)=>{if(event.combatHit)hits.push(event);});
  s.combat.projectiles.push({kind:'bomb',enemy:false,level:0,x:p.x,y:p.y+3,z:p.z,
    vx:0,vy:0,vz:0,age:1.5});
  stepCombat(duel,.01);
  const own=hits.find(hit=>hit.victim==='player'),rival=hits.find(hit=>hit.victim==='rival');
  assert.ok(own&&rival&&Math.abs(own.strength/rival.strength-.25)<1e-9,
    'a bomb blast hits its thrower with one-quarter of normal strength');
}
console.log('Bomb momentum: four speed cases retain at least 85% of thrower speed.');
