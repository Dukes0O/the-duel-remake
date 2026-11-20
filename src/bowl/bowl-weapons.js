// Close-range show weapons for the Bowl. Distances are metres and timers are seconds.
import {pilotStep} from '../arena/arena-pilot.js';
import {worldPose} from '../arena/arena-floor.js';
import {applyArmorDamage} from '../combat-armor.js';
import {combatOwnerId} from '../combat-teams.js';
import {outsideGateAt} from './bowl-outside.js';
import {freshDamageZones} from '../sim-common.js';

export const SHOW_WEAPONS = Object.freeze({
  hammer: {name:'Hammer', reach:4, rest:2.5, cue:'bowl.hammer.rise', picture:'🔨', line:'Swing at a truck in front. A miss holds you still.'},
  saw: {name:'Saw', reach:.35, rest:3, cue:'bowl.saw.spin', picture:'⚙', line:'Hold F against a truck to cut. Four seconds of cutting heats the saw.'},
  launcher: {name:'Launcher', reach:2.5, rest:4, cue:'bowl.launcher.fire', picture:'↗', line:'Throw a truck over the wall. An empty shot hops your own truck.'},
  horn: {reach:.6, rest:2.5, cue:'bowl.rhino.horn'},
  fire: {reach:6, rest:1, cue:'bowl.dragon.fire'},
});
const RIVALS = {'rust-rhino':'horn','big-kettle':'hammer','tin-lizard':'saw','old-bess':'launcher','dragon-wagon':'fire'};
const TELLS = {easy:.8,medium:.6,hard:.4};
const cue = (duel,id) => duel.emit({bowlWeaponCue:id});

function fit(actor, kind) {
  actor.bowlWeapon = {kind, phase:'ready', time:0, cutSeconds:0};
  actor.damageZones = freshDamageZones();
  delete actor.bowlFlight;
  delete actor.bowlLastHitBy;
  actor.bowlNoSteer=actor.bowlHeldStill=0;
  actor.bowlCut=actor.bowlWasCut=actor.bowlRighting=false;
  actor.bowlPose=null;
}

export function prepareShowWeapons(duel, night, choices) {
  const s=duel.state;
  night.event.weaponChoices = [...choices];
  night.event.returnSeconds = null;
  for(const rival of s.opponents) fit(rival,RIVALS[rival.bowlRival]);
  fit(s, null);
  s.status='bowl_weapon_pick';
}

export function chooseShowWeapon(duel, kind) {
  const s=duel.state, event=s.bowlNight?.event;
  if(s.status!=='bowl_weapon_pick' || !event?.weaponChoices?.includes(kind)) return false;
  s.bowlWeapon.kind=kind;
  s.status='countdown';
  cue(duel,'bowl.weapon.pick');
  return true;
}

export function bowlHealthLoss(duel,actor,fraction,owner,side='front',styleHit=true) {
  const removed=applyArmorDamage(duel,actor,'fixed',{amount:fraction*actor.maxArmor,owner,contactFace:side,styleHit});
  if(removed>0) {
    actor.damageZones[side]=Math.min(5,actor.damageZones[side]+5*removed/actor.maxArmor);
    if(owner) actor.bowlLastHitBy=owner;
  }
  return removed;
}

// Measure from the nose to the nearest point on the target truck's oriented body.
export function showTarget(duel,actor,reach) {
  const origin=worldPose(duel,actor), own=duel._vehicleSpec(actor);
  const sx=Math.sin(origin.heading), cz=Math.cos(origin.heading);
  const noseX=origin.x+sx*own.halfLength, noseZ=origin.z+cz*own.halfLength;
  let best=null, closest=Infinity;
  for(const other of [duel.state,...duel.state.opponents]) {
    if(other===actor || other.combatWrecking || other.airHeight>2 || !other.bowlWeapon) continue;
    const p=worldPose(duel,other), dx=p.x-noseX, dz=p.z-noseZ, body=duel._vehicleSpec(other);
    if((p.x-origin.x)*sx+(p.z-origin.z)*cz<=0) continue;
    const sin=Math.sin(p.heading), cos=Math.cos(p.heading);
    const right=dx*cos-dz*sin, forward=dx*sin+dz*cos;
    const distance=Math.hypot(Math.max(0,Math.abs(right)-body.halfWidth),Math.max(0,Math.abs(forward)-body.halfLength));
    if(distance>reach || distance>=closest) continue;
    const side=Math.abs(right)/body.halfWidth>Math.abs(forward)/body.halfLength
      ? (right>0?'right':'left') : (forward>0?'rear':'front');
    best={actor:other,side}; closest=distance;
  }
  return best;
}

function launch(duel,attacker,victim,side) {
  const self=attacker===victim, at=worldPose(duel,victim), heading=worldPose(duel,attacker).heading;
  const height=self?1.5:6;
  const feet=victim._jumpY??duel.course.groundAt(victim.s,victim.lateral).y;
  victim.bowlFlight={x:at.x,z:at.z,y:feet,heading,height,range:self?0:12,
    elapsed:0, duration:Math.sqrt(8*height/18), owner:self?null:combatOwnerId(duel,attacker),side};
  if(!self) victim.bowlLastHitBy=victim.bowlFlight.owner;
  victim.knock=null; victim._jumpOrigin=null; victim.airTime=0; victim.airDistance=0;
  victim.airborne=true;
}

function rest(weapon,seconds) {
  weapon.phase='rest'; weapon.time=seconds; weapon.cutSeconds=0;
}

function fire(duel,actor,weapon,target) {
  const kind=weapon.kind, rules=SHOW_WEAPONS[kind], owner=combatOwnerId(duel,actor);
  if(kind==='hammer') {
    if(target) {
      bowlHealthLoss(duel,target.actor,.3,owner,target.side);
      target.actor.bowlNoSteer=1;
    } else actor.bowlHeldStill=.5;
    cue(duel,target?'bowl.hammer.hit':'bowl.hammer.miss');
  } else if(kind==='launcher') {
    launch(duel,actor,target?.actor??actor,target?.side);
    cue(duel,'bowl.launcher.fire');
  } else if(kind==='horn' && target) {
    bowlHealthLoss(duel,target.actor,Math.max(0,Math.abs(actor.speedMph)-20)/100,owner,target.side);
  }
  rest(weapon,rules.rest);
}

function tickWeapon(duel,actor,night,dt) {
  const weapon=actor.bowlWeapon;
  if(!weapon?.kind || actor.combatWrecking) return;
  const kind=weapon.kind, rules=SHOW_WEAPONS[kind], player=actor===duel.state;
  const pressed=player && actor.input.interact && !weapon.wasHeld;
  if(player) weapon.wasHeld=!!actor.input.interact;
  if(weapon.phase==='rest') {
    weapon.time-=dt;
    if(weapon.time>1e-8) return;
    weapon.phase='ready';
    if(kind==='launcher') cue(duel,'bowl.launcher.fill');
  }
  if(actor.bowlFlight || actor.bowlHeldStill>0) return;
  const target=showTarget(duel,actor,rules.reach);
  const held=player ? actor.input.interact : !!target;
  if(weapon.phase==='ready') {
    if(!held || actor.airborne || player && kind!=='saw' && !pressed) return;
    weapon.phase='tell'; weapon.time=player?(kind==='hammer'?.4:0):TELLS[night.cpuDifficulty];
    if (!player || kind !== 'launcher') cue(duel,kind==='launcher'?'bowl.launcher.tell':rules.cue);
    actor.arenaTellSec=weapon.time;
  }
  if(weapon.phase==='tell') {
    weapon.time-=dt;
    if(weapon.time>1e-8) return;
    if(!player && !target) { weapon.phase='ready'; return; }
    if(kind==='saw' || kind==='fire') weapon.phase='active';
    else {fire(duel,actor,weapon,target); return;}
  }
  if(!held) {weapon.phase='ready';weapon.cutting=false;return;}
  if(!target) {weapon.cutting=false;return;}
  const owner=combatOwnerId(duel,actor);
  if(kind==='saw') {
    if(!weapon.cutting) cue(duel,'bowl.saw.cut');
    weapon.cutting=true;
    actor.bowlCut=target.actor.bowlCut=true;
    const cut=Math.min(dt,4-weapon.cutSeconds);
    bowlHealthLoss(duel,target.actor,cut/8,owner,target.side,false);
    weapon.cutSeconds+=cut;
    if(weapon.cutSeconds>=4-1e-8) {rest(weapon,3);weapon.cutting=false;cue(duel,'bowl.saw.hot');}
  } else bowlHealthLoss(duel,target.actor,dt/10,owner,target.side,false);
}

export function stepShowWeapons(duel,night,dt) {
  const actors=[duel.state,...duel.state.opponents], e=night.event;
  for(const actor of actors) actor.bowlCut=false;
  for(const actor of actors) tickWeapon(duel,actor,night,dt);
  for(const actor of actors) if(!actor.bowlCut) actor.bowlWasCut=false;
  const outside=duel.course.features.bowl.outside, wall=outside.wall;
  for(const actor of actors) {
    if(actor.combatWrecking || !actor.airborne || actor.lateral<=wall || actor.prevLateral>wall) continue;
    if(outsideGateAt(outside,duel.course.phase(actor.s))) continue;
    if(actor===duel.state) {
      if(e.returnSeconds==null) {e.returnSeconds=15; cue(duel,'bowl.out.of.the.bowl');}
    } else {
      cue(duel,'bowl.out.of.the.bowl');
      bowlHealthLoss(duel,actor,1,actor.bowlLastHitBy,'rear');
    }
  }
  if(e.returnSeconds!=null) {
    e.returnSeconds=Math.max(0,e.returnSeconds-dt);
    if(e.returnSeconds===0 && !duel.state.combatWrecking)
      bowlHealthLoss(duel,duel.state,1,duel.state.bowlLastHitBy,'rear');
  }
}

// Called from each combatant's ordinary movement branch while an effect is active.
// A held truck keeps its previous contact pose, so the world's collision sweep stays valid.
export function showMotion(duel,actor,dt,drive) {
  const flight=actor.bowlFlight;
  if(flight || actor.bowlHeldStill>0) {
    actor.prevS=actor.s;
    actor.prevLateral=actor.lateral;
    actor.prevAirHeight=actor.airHeight || 0;
    actor.prevGroundHeight=actor.groundHeight;
    actor.speedMph=actor.yawVelocity=actor.pushVelocity=0;
    if(!flight) {
      actor.bowlHeldStill=Math.max(0,actor.bowlHeldStill-dt);
      if(actor.bowlRighting) {
        actor.bowlPose={roll:Math.PI/2*actor.bowlHeldStill/2.5,pitch:0,yaw:0};
        if(!actor.bowlHeldStill) {actor.bowlRighting=false;actor.bowlPose=null;}
      }
      return true;
    }
    flight.elapsed=Math.min(flight.duration,flight.elapsed+dt);
    const t=flight.elapsed/flight.duration, step=flight.range*t;
    const at=duel._roadPosition({x:flight.x+Math.sin(flight.heading)*step,z:flight.z+Math.cos(flight.heading)*step},actor.s);
    actor.s=at.s; actor.lateral=at.lateral;
    const ground=duel._supportAt(actor.s,actor.lateral,actor).y;
    actor.groundHeight=ground;
    actor._jumpY=flight.y+4*flight.height*t*(1-t);
    actor._verticalSpeed=4*flight.height*(1-2*t)/flight.duration;
    actor.airHeight=Math.max(0,actor._jumpY-ground);
    actor.airborne=true;
    if(flight.owner) actor.bowlPose={roll:Math.PI/2*t,pitch:0,yaw:0};
    if(t>=1 || t>.5 && actor._jumpY<=ground) {
      actor.airHeight=actor._verticalSpeed=0; actor.airborne=false; actor._jumpY=ground;
      delete actor.bowlFlight;
      if(flight.owner) {
        actor.bowlHeldStill=2.5; actor.bowlRighting=true;
        actor.bowlPose={roll:Math.PI/2,pitch:0,yaw:0};
        bowlHealthLoss(duel,actor,1/6,flight.owner,flight.side);
      }
    }
    return true;
  }
  const locked=actor.bowlNoSteer>0, cutting=actor.bowlCut;
  if(!locked && !cutting) return false;
  if(locked) {
    actor.yawVelocity=actor.steerVisual=0;
    actor.bowlNoSteer=Math.max(0,actor.bowlNoSteer-dt);
  }
  const input=actor===duel.state?actor.input:null, steering=input?.steer;
  if(locked && input) input.steer=0;
  // Keep the halved road speed visible to contacts and the speedometer; on
  // the next cutting step undo that one scale before asking the pilot to move.
  if(cutting && actor.bowlWasCut) actor.speedMph*=2;
  drive(cutting?dt*.5:dt,locked);
  if(cutting) {actor.speedMph*=.5; actor.bowlWasCut=true;}
  if(locked && input) input.steer=steering;
  return true;
}

// The arena asks only for active show effects. A later normal arena can reuse
// the same player state, so the mounted weapon alone does not enable this path.
export function stepShowWeaponMotion(duel,actor,dt,pilotGoal=null) {
  if (!actor.bowlWeapon || duel.state.bowlNight?.event?.type !== 'lastTruckRolling' ||
      duel.featureFlags?.enabled('titan-bowl') !== true) return false;
  return showMotion(duel,actor,dt,(moveDt,locked)=>{
    if(actor===duel.state) {
      duel._drive(moveDt);
      duel._jump(actor,dt);
    } else {
      pilotStep(duel,actor,locked?{...pilotGoal,steeringScale:0}:pilotGoal,moveDt);
      if(!duel._ramFlight(actor,dt)) duel._jump(actor,dt);
    }
  });
}
