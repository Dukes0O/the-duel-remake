import {isSummitAttack} from './summit-attack.js';
import {makeRng} from './rng.js';
import {actorBody, startKnock} from './vehicle-knock.js';
import {solveVehicleImpact} from './vehicle-collision.js';
import {DRIVE} from './config.js';

export const AVALANCHE = Object.freeze({trigger:10000,decision:9950,split:10100,
  from:10420,to:10580,rejoin:10900,tellSec:3,slideSec:2.5,shoveMps:8.94,slowSec:.5,slowMph:30});
export function avalancheEnabled(duel) {
  return (duel.course?.def.id==='summit-run'||isSummitAttack(duel.course?.def)) && duel.featureFlags?.enabled('summit-run')===true;
}
export function resetSummitAvalanche(duel) {
  const actors=[duel.state,...(duel.state.opponents ?? [])];
  for(const actor of actors){
    if(actor.knock?.summitAvalanche)delete actor.knock;
    delete actor.summitRoute;
  }
  delete duel.state.avalanche;
}
export function initializeSummitAvalanche(duel) {
  if(!avalancheEnabled(duel))return;
  duel.state.avalanche={id:`summit-avalanche-${duel.seed}`,phase:'waiting',
    delaySec:makeRng(duel.seed^0x4156414c).range(6,12),crossedAt:null,
    tellAt:null,slideAt:null,endAt:null,hits:[]};
}
export function openRoadAt(course,distance,lateral) {
  const surface=course.surfaceAt(distance,lateral);
  return surface.shortcutId==='summit-open-road' && surface.road===true;
}
export function avalancheDriftAt(duel,distance,lateral) {
  return avalancheEnabled(duel) && duel.state.avalanche?.phase==='after' &&
    distance>=AVALANCHE.from && distance<=AVALANCHE.to && openRoadAt(duel.course,distance,lateral);
}
const actorsOf=duel=>[duel.state,...duel.state.opponents];
const actorId=(duel,actor)=>actor===duel.state?'player':actor.id ?? `opponent-${duel.state.opponents.indexOf(actor)}`;
export function isAvalancheKnock(duel,actor) {
  const event=duel.state.avalanche;
  return avalancheEnabled(duel) && !!event && actor.knock?.summitAvalanche===event.id &&
    event.hits.some(hit=>hit.actorId===actorId(duel,actor));
}
function shove(duel,actor,event) {
  const body=actorBody(duel,actor),frame=duel.course.at(actor.s);
  const cut=duel.course.features.shortcuts.find(row=>row.id==='summit-open-road');
  const out={x:Math.cos(frame.heading)*cut.side,z:-Math.sin(frame.heading)*cut.side};
  const virtual={...body,x:body.x-out.x*body.halfWidth*2,z:body.z-out.z*body.halfWidth*2,
    vx:out.x*AVALANCHE.shoveMps,vz:out.z*AVALANCHE.shoveMps,spin:0};
  const contact={normal:out,point:{x:body.x-out.x*body.halfWidth,z:body.z-out.z*body.halfWidth}};
  const impact=solveVehicleImpact(body,virtual,contact);
  startKnock(actor,{...impact.a,severity:'nudge',heading:body.heading,player:actor===duel.state});
  actor.knock.summitAvalanche=event.id;
  event.hits.push({actorId:actorId(duel,actor),atTime:duel.state.stageTimeSec,
    fromSpeed:Math.max(30,actor.speedMph),mass:body.mass,virtualMass:virtual.mass,
    direction:out,impact:impact.a});
}
function applyHits(duel) {
  const event=duel.state.avalanche;
  if(event?.phase!=='slide')return;
  for(const actor of actorsOf(duel)){
    if(actor.finished || actor.s<AVALANCHE.from || actor.s>AVALANCHE.to ||
      !openRoadAt(duel.course,actor.s,actor.lateral) || event.hits.some(hit=>hit.actorId===actorId(duel,actor)))continue;
    shove(duel,actor,event);
  }
}
// Post-motion observation catches the actual first crossing and late slide entrants.
export function observeSummitAvalanche(duel) {
  if(!avalancheEnabled(duel) || duel.state.status!=='racing')return;
  const event=duel.state.avalanche,now=duel.state.stageTimeSec;
  if(!event)return;
  if(event.crossedAt===null && actorsOf(duel).some(actor=>actor.s>=AVALANCHE.trigger)){
    event.crossedAt=now;event.slideAt=now+event.delaySec;
    event.tellAt=event.slideAt-AVALANCHE.tellSec;event.endAt=event.slideAt+AVALANCHE.slideSec;
  }
  applyHits(duel);
}
// Uses the simulation clock, never a renderer clock. Call before driver choices.
export function stepSummitAvalanche(duel) {
  if(!avalancheEnabled(duel) || duel.state.status!=='racing')return;
  const event=duel.state.avalanche,now=duel.state.stageTimeSec;
  if(!event)return;
  if(event.crossedAt!==null){
    const next=now>=event.endAt?'after':now>=event.slideAt?'slide':now>=event.tellAt?'tell':'waiting';
    if(next!==event.phase){
      event.phase=next;
      if(next==='tell' || next==='slide'){
        const point=duel.course.groundAt(10500,0);
        duel.emit({summitAvalanche:{id:event.id,phase:next,cue:'avalanche.'+(next==='tell'?'rumble':'slide'),
          point:{x:point.x,y:point.y+25,z:point.z}}});
        if(next==='tell')duel._callout(duel.state.s<AVALANCHE.split?'AVALANCHE!  < GALLERY':'AVALANCHE!',3);
      }
    }
  }
  applyHits(duel);
  for(const actor of actorsOf(duel)){
    const hit=event.hits.find(row=>row.actorId===actorId(duel,actor));
    if(!hit || hit.slowDone)continue;
    if(now-hit.atTime>=AVALANCHE.slowSec)hit.slowDone=true;
    if(actor.speedMph<=AVALANCHE.slowMph)continue;
    const cap=AVALANCHE.slowMph+(hit.fromSpeed-AVALANCHE.slowMph)*Math.max(0,1-(now-hit.atTime)/AVALANCHE.slowSec);
    if(actor.speedMph<=cap)continue;
    const heading=actorBody(duel,actor).heading,delta=(actor.speedMph-cap)*DRIVE.mphToWorld;
    actor.speedMph=cap;
    if(actor.knock){actor.knock.vx-=Math.sin(heading)*delta;actor.knock.vz-=Math.cos(heading)*delta;}
  }
}
export function observeSummitRoute(duel,actor,aggression) {
  if(!avalancheEnabled(duel) || !duel.state.avalanche)return undefined;
  if(actor.s>=AVALANCHE.decision && actor.summitRoute===undefined){
    actor.summitRoute=actor.s>=AVALANCHE.split
      ? openRoadAt(duel.course,actor.s,actor.lateral)?'summit-open-road':'gallery'
      : duel.state.avalanche.phase==='waiting' && aggression>=.55?'summit-open-road':'gallery';
  }
  return actor.summitRoute ?? null;
}
