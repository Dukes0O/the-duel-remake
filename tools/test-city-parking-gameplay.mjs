import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { COURSE } from '../src/config.js';
import { sweepObstacle } from '../src/collision.js';

let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const cityEvents=COURSE.filter(event=>event.kind==='chase'||event.kind==='drift');
for(const definition of cityEvents)for(const actorKind of['player','rival','police']){
  const d=new Duel({seed:1989});d.startCampaign({startStage:definition.stage});d.state.status='racing';
  const parked=d.course.features.parkedCars[0];check(!!parked,'city routes include parked collision hulls');
  const heading=parked.heading+Math.PI/2,dx=Math.sin(heading),dz=Math.cos(heading);
  const from=d.course.nearest(parked.x-dx*9,parked.z-dz*9,parked.s),to=d.course.nearest(parked.x,parked.z,parked.s);
  const pose={prevS:from.s,prevLateral:from.lateral,s:to.s,lateral:to.lateral,speedMph:100,
    headingError:Math.atan2(Math.sin(heading-d.course.at(to.s).heading),Math.cos(heading-d.course.at(to.s).heading)),yawVelocity:0,pushVelocity:0,slipAngle:0};
  const actor=actorKind==='player'?Object.assign(d.state,pose):pose;
  if(actorKind==='rival')d.state.rival=actor;
  if(actorKind==='police'){actor.car='police';d.state.police.pursuit=actor;}
  check(d._obstacles(from.s,to.s).some(obstacle=>obstacle.id===parked.id),'parked cars are included in the shared obstacle index');
  d._staticContacts(actor,actorKind==='player');
  const point=d.course.worldAt(actor.s,actor.lateral),bodyHeading=d.course.at(actor.s).heading+(actor.headingError||0);
  check(!sweepObstacle(point,point,parked,bodyHeading,d._vehicleSpec(actor)),'player, rival and pursuit actors cannot finish inside a parked car');
  check(actor.speedMph<30,'a hard parked-car contact removes forward speed');
  if(actorKind==='player')check(d.state.majorCrashes===1&&d.state.lastCrashReason==='prop','a hard parked-car impact uses normal major-impact handling');
  else check(d.state.majorCrashes===0,'NPC contact cannot charge the player with a crash');
}

const outcomes=[];
for(const definition of cityEvents)for(const cpuDifficulty of['easy','medium','hard']){
  const app=new App();app.autopilot=true;app._scriptedCrashDone=true;
  app.duel.startCampaign({startStage:definition.stage,cpuDifficulty,seed:1989});let frames=0;
  while(!['stage_result','gameover'].includes(app.duel.state.status)&&frames++<120*220)app.advance(1/120);
  const state=app.duel.state,result=state.results;
  check(result?.completed&&result.won&&state.completedLaps===2,`${definition.id}/${cpuDifficulty}: normal driving inputs still finish the event's actual objectives`);
  check(state.majorCrashes===0&&state.boundaryResets===0,`${definition.id}/${cpuDifficulty}: parked bays do not obstruct normal driving or trigger recovery`);
  outcomes.push({event:definition.id,cpuDifficulty,cars:app.duel.course.features.parkedCars.length,time:result.timeSec,won:result.won,driftScore:result.driftScore??null});
}
console.log(JSON.stringify({cityParkingReplays:outcomes}));
console.log(`City parking gameplay: ${checks} checks passed across player/rival/police contacts and six complete input replays.`);
