import {CARS, DRIVE} from '../../config.js';
import {ARSENAL_WEAPONS, WEAPON_IDS} from '../../weapon-upgrades.js';
import {arenaActor, arenaParticipant, outOfPlay} from '../../combat-teams.js';
import {worldPose} from '../arena-floor.js';
import {point, predictedPoint} from '../../combat-actors.js';
import {thinkBrain} from '../arena-brains.js';
import {addHazard} from '../../arsenal/hazards.js';
import {carEffect, setCarEffect} from '../../arsenal/car-effects.js';
import {targetFor} from '../../arsenal/targeting.js';
import {scablandsActorHeightAt} from '../../world/scablands-ground.js';
import {stepMover, TRUCK_GRADE} from '../../world/scablands-movers.js';
import {RIDER_RULE as R} from '../../world/jobs/rider-rule.js';

const sides = ['front', 'back', 'left', 'right'];
const diff = duel => R.difficulty[duel.state.cpuDifficulty] ?? R.difficulty.medium;
const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const RIDER_PREFIX = 'road-rider/';
const key = (stepIndex, id) => RIDER_PREFIX + stepIndex + '/' + id;

// Each enemy is built by the native arena roster, with its normal car, armour, weapons and contact pipeline.
// Reserve future-step cars out of the physical field until the job reaches them.
export function riderOpponentSpecs(job, original, maxAllies) {
  const authored = job.riderAllies ?? [];
  if (!Array.isArray(authored) || original.length + authored.length > maxAllies) return null;
  const originalIds = original.map(car=>car.jobId).filter(Boolean);
  const taken = new Set(originalIds);
  if (taken.size !== originalIds.length || originalIds.some(id=>typeof id !== 'string' || id.startsWith(RIDER_PREFIX))) return null;
  for (const ally of authored) {
    if (typeof ally?.jobId !== 'string' || !ally.jobId || ally.jobId.startsWith(RIDER_PREFIX) || taken.has(ally.jobId) || !Object.hasOwn(CARS,ally.car) || !validPoint(ally.start)) return null;
    taken.add(ally.jobId);
  }
  const allies = [...original,...authored], specs = [...allies];
  const steps = job.steps;
  for (const [index, step] of steps.entries()) {
    if (step.kind !== 'rider-fight') continue;
    if (step.targetId && step.targetId !== 'player' && !allies.some((car,i) => car.jobId === step.targetId || `cpu-${i+1}` === step.targetId)) return null;
    if (!Array.isArray(step.riders) || !step.riders.length || step.riders.length > R.maximumField) return null;
    const ids = new Set();
    for (const rider of step.riders) {
      if (typeof rider?.id !== 'string' || !rider.id || ids.has(rider.id) || !Object.hasOwn(CARS,rider.car) ||
          !(rider.weapon === 'ash-sack' || WEAPON_IDS.includes(rider.weapon) || Object.hasOwn(ARSENAL_WEAPONS,rider.weapon)) ||
          !validPoint(rider.start) || !validPoint(rider.home)) return null;
      ids.add(rider.id);
      specs.push({jobId:key(index,rider.id), car:rider.car, brain:'rammer'});
    }
  }
  return specs;
}

function placeJobCar(duel, car, at, heading) {
  const near = duel.course.nearest(at.x,at.z);
  car.s = car.prevS = near.s;
  car.lateral = car.prevLateral = near.lateral;
  car.headingError = (at.heading ?? heading) - duel.course.at(near.s).heading;
  car.groundHeight = car.prevGroundHeight = scablandsActorHeightAt(at.x,at.z,at.y);
  car.speedMph = at.speedMph || 0;
}

export function reserveRoadRiders(duel, world) {
  const state = duel.state, arena = state.arena;
  const reserved = state.opponents.filter(car => car.jobId?.startsWith(RIDER_PREFIX));
  if (!reserved.length) return;
  for (const ally of world.definition.riderAllies ?? []) {
    const car=state.opponents.find(car=>car.jobId===ally.jobId);
    placeJobCar(duel,car,ally.start,0);
    arenaParticipant(duel,car).team='player';
  }
  world.riderReserve = reserved.map(car => ({car, participant:arenaParticipant(duel,car)}));
  state.opponents = state.opponents.filter(car => !reserved.includes(car));
  arena.participants = arena.participants.filter(p => !world.riderReserve.some(entry => entry.participant === p));
  state.opponentCount = state.opponents.length;
  startRoadFight(duel, world);
}

export function startRoadFight(duel, world) {
  const index = world.job.stepIndex, step = world.job.steps[index];
  if (step?.kind !== 'rider-fight' || world.riderFight?.index === index) return;
  const state = duel.state;
  if (world.riderFight) {
    const previous = new Set(world.riderFight.riders);
    const former = state.opponents;
    state.opponents = former.filter(car => !previous.has(car.arenaId));
    // Native contact latches use field indices. An arriving car cannot inherit a departed car's ram.
    for (const key of duel._combatRamIncidents ?? []) {
      if (key.split(':').some(slot => slot >= 0 && former[slot] !== state.opponents[slot])) duel._combatRamIncidents.delete(key);
    }
    state.arena.participants = state.arena.participants.filter(entry => !previous.has(entry.id));
    world.actors = world.actors.filter(actor => !actor.riderCrew);
  }
  const target = step.targetId && step.targetId !== 'player' ? state.opponents.find(car => car.jobId === step.targetId || car.arenaId === step.targetId) : state;
  if (!target) throw new Error(`Rider fight needs the named allied arena car: ${step.targetId}`);
  if (index === 0 && Number.isFinite(step.carStart?.speedMph)) state.speedMph=step.carStart.speedMph;
  const targetId = target === state ? 'player' : target.arenaId;
  if (target !== state) arenaParticipant(duel,target).team = 'player';
  const fight = world.riderFight = {index, targetId, riders:[], ash:[], smothered:[], heldSec:0, elapsed:0, outcome:null};
  let slot = 0;
  for (const definition of step.riders) {
    const entry = world.riderReserve.find(entry => entry.car.jobId === key(index,definition.id));
    const {car, participant} = entry, at = definition.start;
    const targetAt = worldPose(duel,target);
    placeJobCar(duel,car,at,Math.atan2(targetAt.x-at.x,targetAt.z-at.z));
    car.armor = car.maxArmor *= diff(duel).armor;
    car.weaponLoadout = [definition.weapon];
    car.roadRider = {id:definition.id, weapon:definition.weapon, home:definition.home,
      fightToEnd:definition.fightToEnd === true, slot:definition.boxIn ? slot++ : null,
      targetId, phase:'fighting', ashWait:0};
    Object.assign(participant,{name:definition.name || definition.id, team:'road-riders', targetId});
    state.opponents.push(car); state.arena.participants.push(participant); fight.riders.push(car.arenaId);
  }
  world.riderReserve = world.riderReserve.filter(entry => !fight.riders.includes(entry.car.arenaId));
  state.opponentCount = state.opponents.length;
}

function boxAssignment(slot) {
  switch (slot) {
    case 0: return [0,R.boxHalfLength];
    case 1: return [0,-R.boxHalfLength];
    case 2: return [-R.boxHalfWidth,0];
    case 3: return [R.boxHalfWidth,0];
    default: return [slot % 2 ? -R.boxFifthOffset : R.boxFifthOffset,R.boxHalfLength];
  }
}

function boxGoal(duel, car, target) {
  const me=worldPose(duel,car), at=worldPose(duel,target), rider=car.roadRider;
  const [side,ahead]=boxAssignment(rider.slot), sin=Math.sin(at.heading), cos=Math.cos(at.heading);
  const spot={x:at.x+cos*side+sin*ahead,z:at.z-sin*side+cos*ahead};
  const gap=dist(me,spot), targetSpeed=Math.max(0,target.speedMph || 0);
  const forward=(spot.x-me.x)*sin+(spot.z-me.z)*cos;
  if (gap > R.boxJoinMetres) {
    const lead=Math.min(R.boxInterceptSec,gap/(R.boxPaceMph*DRIVE.mphToWorld));
    return {x:spot.x+sin*targetSpeed*DRIVE.mphToWorld*lead,z:spot.z+cos*targetSpeed*DRIVE.mphToWorld*lead,
      speedMph:Math.min(R.boxPaceMph,targetSpeed+gap*R.boxChaseGain),boost:false};
  }
  // Follow a parallel line. A rider ahead eases off and lets the player reach the roadblock.
  // Steering at a point behind its own bumper makes an arena car turn round instead.
  const sideError=(spot.x-me.x)*cos-(spot.z-me.z)*sin;
  const look=R.boxLook;
  const frontBrake = rider.slot === 0 && gap < R.boxStopMetres && forward < 0;
  return {x:me.x+sin*look+cos*sideError,z:me.z+cos*look-sin*sideError,
    speedMph: frontBrake ? 0 : Math.max(0,Math.min(R.boxPaceMph,targetSpeed+forward*R.boxBrakeGain)),boost:false};
}

function reachableGoal(duel, car, goal) {
  const me=worldPose(duel,car), deltaX=goal.x-me.x, deltaZ=goal.z-me.z;
  const distance=Math.hypot(deltaX,deltaZ);
  if (distance < R.probeRadius) return goal;
  const direction=Math.atan2(deltaX,deltaZ), reach=Math.min(R.probeMetres,distance);
  const probe=angle=>{
    const to={x:me.x+Math.sin(angle)*reach,z:me.z+Math.cos(angle)*reach};
    return stepMover(me,to,{radius:R.probeRadius,grade:TRUCK_GRADE,grid:duel.state.arena.worldJob.solidGrid?.movers ?? duel.course.solidGrid,height:car.groundHeight});
  };
  if (!probe(direction).blocked) return goal;
  for (const angle of [direction+R.swerveRadians,direction-R.swerveRadians]) {
    const side=probe(angle);
    if (!side.blocked) return {x:side.x,z:side.z,speedMph:Math.min(goal.speedMph,R.swerveMph),boost:false};
  }
  return {...me,speedMph:0,boost:false};
}

export function roadRiderGoal(duel,car,dt) {
  const rider=car.roadRider, me=worldPose(duel,car);
  if (rider.phase === 'withdrawing') {
    if (dist(me,rider.home) <= R.homeRadius) {
      rider.phase='home'; car.finished=true; car.contactExempt=true; car.speedMph=0;
    } else return reachableGoal(duel,car,{...rider.home,speedMph:R.retreatMph,boost:false});
  }
  if (rider.phase !== 'fighting') return {...me,speedMph:0,boost:false};
  const target=arenaActor(duel,rider.targetId);
  if (!target || outOfPlay(duel,target)) return {...me,speedMph:0,boost:false};
  if (rider.slot !== null) return reachableGoal(duel,car,boxGoal(duel,car,target));
  const goal=thinkBrain(duel,arenaParticipant(duel,car),car,dt);
  return reachableGoal(duel,car,{...goal,speedMph:goal.speedMph*diff(duel).pace});
}

// Check actual cars in the player's own four directions. Merely assigning a rider to a slot confers no hold.
function boxPressure(duel, cars, dt) {
  const target=duel.state, at=worldPose(duel,target), sin=Math.sin(at.heading), cos=Math.cos(at.heading), occupied=new Set();
  if (target.onFoot || cars.filter(car=>car.roadRider.slot !== null && car.roadRider.phase==='fighting').length<R.minimumBoxRiders) return false;
  for (const car of cars) {
    if (car.roadRider.slot === null || car.roadRider.phase !== 'fighting') continue;
    const me=worldPose(duel,car), dx=me.x-at.x, dz=me.z-at.z;
    if (Math.hypot(dx,dz)>R.boxRange || Math.abs((car.groundHeight??0)-(target.groundHeight??0))>R.verticalReach) continue;
    const ahead=dx*sin+dz*cos, side=dx*cos-dz*sin;
    if (ahead>0 && ahead<R.bumperLength && Math.abs(side)<R.bumperHalfWidth) {
      const leadSpeed=Math.max(0,car.speedMph*Math.cos(me.heading-at.heading));
      if(target.speedMph>leadSpeed) target.speedMph=Math.max(leadSpeed,target.speedMph-R.boxBrakeMphSec*dt);
    }
    if (Math.abs(side)<Math.abs(ahead)*R.axisShare) occupied.add(ahead>0?'front':'back');
    if (Math.abs(ahead)<Math.abs(side)*R.axisShare) occupied.add(side>0?'right':'left');
  }
  return sides.every(side=>occupied.has(side));
}

function crewBail(duel, world, car) {
  const at=worldPose(duel,car), target=worldPose(duel,duel.state), away=Math.atan2(at.x-target.x,at.z-target.z);
  for(let index=0;index<R.crewPerCar;index++) {
    const side=index%2 ? 1 : -1;
    const x=at.x+Math.cos(at.heading)*side*R.crewDoor, z=at.z-Math.sin(at.heading)*side*R.crewDoor;
    const yaw=away+side*R.swerveRadians;
    world.actors.push({id:car.jobId+'/crew/'+index,riderCrew:true,steps:0,x,y:scablandsActorHeightAt(x,z,car.groundHeight),z,yaw,
      health:1,approachSpeed:R.crewMps,approachTarget:{x:x+Math.sin(yaw)*R.crewRunMetres,z:z+Math.cos(yaw)*R.crewRunMetres}});
  }
}

function stepAsh(duel,world,step,dt) {
  const fight=world.riderFight;
  if (!fight.ash.length) return;
  for (const sack of fight.ash) {
    sack.remaining-=dt;
    if (sack.remaining>0) continue;
    const at=sack.position, owner=arenaActor(duel,sack.ownerId);
    addHazard(duel,{kind:'smoke',shape:'circle',...at,radius:R.ashRadius,lifetime:R.ashLifetime,owner});
    const smothered=[];
    for (const car of [duel.state,...duel.state.opponents]) {
      if (dist(worldPose(duel,car),at)>R.ashRadius) continue;
      const id=car===duel.state?'player':car.arenaId;
      if(duel.state.combat.flameBurns?.[id]) {
        delete duel.state.combat.flameBurns[id]; setCarEffect(car,'burning',{duration:0}); smothered.push(id);
      }
    }
    for (const fire of step?.fires ?? []) {
      if (!fight.smothered.includes(fire.id) && dist(fire.position,at)<=R.ashRadius) {fight.smothered.push(fire.id);smothered.push(fire.id);}
    }
    duel.emit({riderAsh:{ownerId:sack.ownerId,position:at,smothered}});
  }
  fight.ash=fight.ash.filter(sack=>sack.remaining>0);
}

// The arena's scheduled CPU attack calls this only on its allotted turn. Ash is aimed at a point, so a moving car can dodge it.
export function throwRiderAsh(duel,car) {
  const rider=car.roadRider, fight=duel.state.arena?.worldJob?.riderFight;
  if (car.impactTimer>0 || car.weaponsDisabledUntil>duel.state.stageTimeSec || carEffect(car,'disabled') ||
      rider?.weapon!=='ash-sack' || rider.phase!=='fighting' || rider.ashWait>0 || !fight || fight.outcome) return false;
  const target=targetFor(duel,car,{range:R.ashRange}), at=worldPose(duel,car);
  if (!target) return false;
  const aim=predictedPoint(duel,target,R.ashFlightSec*diff(duel).lead);
  const bearing=Math.atan2(aim.x-at.x,aim.z-at.z)-at.heading;
  if (dist(at,aim)>R.ashRange || Math.abs(Math.atan2(Math.sin(bearing),Math.cos(bearing)))>diff(duel).aim) return false;
  const position={x:aim.x,y:scablandsActorHeightAt(aim.x,aim.z,target.groundHeight),z:aim.z};
  fight.ash.push({ownerId:car.arenaId,from:{x:at.x,y:car.groundHeight,z:at.z},position,remaining:R.ashFlightSec});
  rider.ashWait=R.ashCooldownSec;
  duel.emit({arenaTell:{id:rider.id,targetId:rider.targetId,seconds:R.ashFlightSec,cue:'world.ash.throw',position:point(duel,car)}});
  return true;
}

export function updateRoadFight(duel, world, step, dt) {
  const fight=world.riderFight;
  if (!fight) return;
  fight.elapsed+=dt;
  stepAsh(duel,world,step,dt);
  const cars=fight.riders.map(id=>arenaActor(duel,id));
  for (const car of duel.state.opponents) {
    if (!car.roadRider) continue;
    const rider=car.roadRider;
    rider.ashWait=Math.max(0,rider.ashWait-dt);
    if (car.combatWrecking && rider.phase!=='wrecked') {
      rider.phase='wrecked'; crewBail(duel,world,car);
    } else if (!fight.outcome && rider.phase==='fighting' && !rider.fightToEnd && car.armor<=car.maxArmor*R.retreatFraction) {
      rider.phase='withdrawing';
      duel.emit({arenaTell:{id:rider.id,targetId:rider.targetId,seconds:0,cue:'rider.breaks-off',sourceId:car.arenaId,position:point(duel,car)}});
    }
  }
  if (fight.outcome) return;
  const boxed = fight.targetId === 'player' && boxPressure(duel,cars,dt);
  if (boxed) {
    // Opposing tyres resist the drivetrain only while four actual bodies hold the car.
    const speed=duel.state.speedMph;
    duel.state.speedMph=Math.sign(speed)*Math.max(0,Math.abs(speed)-R.boxBrakeMphSec*dt);
  }
  fight.heldSec = boxed && Math.abs(duel.state.speedMph)<R.boxMph ? fight.heldSec+dt : 0;
  const target=arenaActor(duel,fight.targetId);
  const outcome=duel.state.combatWrecking || target?.combatWrecking ? 'lost' : fight.heldSec>=R.boxSeconds ? 'surrounded' :
    cars.every(car=>car.roadRider.phase!=='fighting') ? 'won' : null;
  if (!outcome) return;
  fight.outcome=outcome; fight.endedAt=fight.elapsed;
  for (const car of cars) if (car.roadRider.phase==='fighting') car.roadRider.phase='holding';
  duel.emit({riderFight:{id:step.id,outcome,smothered:[...fight.smothered]}});
}
