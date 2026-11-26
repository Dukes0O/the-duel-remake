import {CARS, DRIVE} from '../../config.js';
import {ARSENAL_WEAPONS, WEAPON_IDS} from '../../weapon-upgrades.js';
import {arenaActor, arenaParticipant, outOfPlay} from '../../combat-teams.js';
import {wrapHeading} from '../../offroad-physics.js';
import {worldPose} from '../arena-floor.js';
import {armorKitBonus} from '../../armor-kits.js';
import {completeCombatRecovery, maxArmorForMass} from '../../combat-armor.js';
import {createFighter} from '../../onfoot.js';
import {freshDamageZones} from '../../sim-common.js';
import {COMBAT_TUNING} from '../../wasteland-tuning.js';
import {ROAD_GROUPS} from '../../world/open/content/checkpoints.js';
import {ROAD_REQUEST, nearestRoadPoint} from '../../world/open/encounter-rule.js';
import {nameOf} from '../../world/open/register.js';
import {SOUND_BANK} from '../../sound-bank.js';
import {point, predictedPoint} from '../../combat-actors.js';
import {thinkBrain} from '../arena-brains.js';
import {addHazard} from '../../arsenal/hazards.js';
import {carEffect, setCarEffect} from '../../arsenal/car-effects.js';
import {targetFor} from '../../arsenal/targeting.js';
import {scablandsActorHeightAt} from '../../world/scablands-ground.js';
import {stepMover, TRUCK_GRADE} from '../../world/scablands-movers.js';
import {RIDER_RULE as R} from '../../world/jobs/rider-rule.js';
import {AMBUSH_RUN_DOWN_METRES, AMBUSH_RUN_DOWN_MPS} from '../../world/jobs/steps/escort.js';
import {fightBoxed} from '../../world/open/content/mission-kinds.js';

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

export function startRoadFight(duel, world, checkpoint = null) {
  // OPEN-CHECKPOINTS: a fight can start within the current step at the encounter's own car poses.
  if (checkpoint) return startCheckpointFight(duel, world, checkpoint);
  const index = world.job.stepIndex, step = world.job.steps[index];
  if (step?.kind !== 'rider-fight' || world.riderFight?.index === index) return;
  const state = duel.state;
  if (world.riderFight) {
    removeRoadCars(duel, world.riderFight.riders);
    world.actors = world.actors.filter(actor => !actor.riderCrew);
  }
  state.opponentCount = state.opponents.length;
  const completed = world.completedRiderFights?.[index];
  if (completed) {
    world.riderFight = {...completed, riders:[], ash:[], elapsed:completed.endedAt + R.aftermathSec};
    return;
  }
  const target = step.targetId && step.targetId !== 'player' ? state.opponents.find(car => car.jobId === step.targetId || car.arenaId === step.targetId) : state;
  const targetId = target === state ? 'player' : target?.arenaId ?? step.targetId;
  const fight = world.riderFight = {index, targetId, riders:[], ash:[], smothered:[], heldSec:0, elapsed:0, outcome:null};
  // A previous step may have removed the protected car. The next tick records a normal loss.
  if (!target) return;
  if (index === 0 && Number.isFinite(step.carStart?.speedMph)) state.speedMph=step.carStart.speedMph;
  if (target !== state) arenaParticipant(duel,target).team = 'player';
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
      targetId, phase:'fighting', ashWait:0, approach:definition.approach === true,
      circle:definition.circle ?? null, getawayMetres:step.getawayMetres ?? 0};
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

function openingGoal(duel, car, target, me, participant) {
  const rider=car.roadRider, at=worldPose(duel,target), elapsed=duel.state.arena.worldJob.riderFight.elapsed;
  const gap=dist(me,at), bearing=wrapHeading(Math.atan2(at.x-me.x,at.z-me.z)-me.heading);
  if (elapsed < R.openingSafeSec && rider.chargeAt === undefined) {
    const outward=Math.atan2(me.x-at.x,me.z-at.z), offNose=wrapHeading(outward-at.heading);
    // If the driver charges down an approach lane, skirt their nose before committing to the ram.
    if (rider.openingPass === undefined && target.speedMph*Math.cos(offNose) > R.openingAvoidMph)
      rider.openingPass=outward+Math.sign(offNose || 1)*R.openingAvoidTurn;
    if (rider.openingPass !== undefined) {
      return {x:me.x+Math.sin(rider.openingPass)*R.openingAvoidLook,
        z:me.z+Math.cos(rider.openingPass)*R.openingAvoidLook,speedMph:diff(duel).approachMph,boost:false};
    }
  }
  if (rider.chargeAt === undefined && gap <= R.openingTellMetres && Math.abs(bearing) <= R.openingAlignRadians) {
    rider.chargeAt=elapsed+R.openingTellSec;
    car.arenaTellSec=R.openingTellSec;
    duel.emit({arenaTell:{id:participant.id,targetId:rider.targetId,cue:'arena.tell',
      seconds:R.openingTellSec,position:point(duel,car)}});
  }
  car.arenaTellSec=Math.max(0,(rider.chargeAt ?? elapsed)-elapsed);
  if (rider.chargeAt !== undefined && elapsed >= rider.chargeAt) {
    rider.approach=false;
    participant.chargeReady=true;
    return null;
  }
  const speed=Math.min(diff(duel).approachMph,Math.max(0,(gap-R.openingBrakeMetres)*R.openingBrakeGain));
  return {...at,speedMph:car.arenaTellSec > 0 ? Math.min(speed,R.openingTellMph) : speed,boost:false};
}

export function roadRiderGoal(duel,car,dt) {
  const rider=car.roadRider, me=worldPose(duel,car);
  // OPEN-CHECKPOINTS: neutral cars have a road goal and never get an attack turn.
  if (rider.checkpoint && rider.phase === 'passing') return checkpointRouteGoal(duel, car, me);
  if (rider.phase === 'withdrawing') {
    if (dist(me,rider.home) <= R.homeRadius) {
      if (rider.checkpoint) return {...me, speedMph:0, boost:false};
      // NIGHT-2-TRY-FIXES item 3: a rider that gets away is seen leaving. A car at 'home' is no longer drawn, so on a fight
      // that names a getaway distance it keeps driving away from the player until it is that far off, and only then is gone.
      const state=duel.state, you=state.onFoot && state.fighter ? state.fighter : worldPose(duel,state);
      if (rider.getawayMetres && dist(me,you) < rider.getawayMetres) {
        const away=Math.atan2(me.x-you.x,me.z-you.z);
        rider.home={x:me.x+Math.sin(away)*R.getawayLegMetres,z:me.z+Math.cos(away)*R.getawayLegMetres};
        return reachableGoal(duel,car,{...rider.home,speedMph:R.retreatMph,boost:false});
      }
      rider.phase='home'; car.finished=true; car.contactExempt=true; car.speedMph=0;
    } else return reachableGoal(duel,car,{...rider.home,speedMph:R.retreatMph,boost:false});
  }
  if (rider.phase !== 'fighting') return {...me,speedMph:0,boost:false};
  // Open escort riders want the load. The native car still takes rams and shots from the player.
  const escort = rider.escort && duel.state.arena.worldJob.open?.parts.missions?.active;
  if (escort && escort.id === rider.escort) {
    const {truck, speed} = escort.state, side = rider.escortSide;
    const sin = Math.sin(truck.heading), cos = Math.cos(truck.heading);
    const goal = {x: truck.x - sin * 8 + cos * side, z: truck.z - cos * 8 - sin * side};
    const forward = (goal.x - me.x) * sin + (goal.z - me.z) * cos;
    const sideways = (goal.x - me.x) * cos - (goal.z - me.z) * sin;
    const aim = dist(me, goal) > 35 ? goal : {x: me.x + sin * 30 + cos * sideways, z: me.z + cos * 30 - sin * sideways};
    return reachableGoal(duel, car, {...aim, speedMph: Math.max(0, Math.min(42, speed * 2.236936 + forward * .8)), boost: false});
  }
  if (rider.standingArmor !== undefined) {
    if (car.armor >= rider.standingArmor) return {...me, speedMph: 0, boost: false};
    delete rider.standingArmor;
  }
  // STORY-NIGHT-2-FLOW: a rider laying siege drives its circle round the camp until the others are beaten.
  if (rider.circle) {
    const c=rider.circle, angle=Math.atan2(me.z-c.z,me.x-c.x)+R.circleLeadRadians;
    return reachableGoal(duel,car,{x:c.x+Math.cos(angle)*c.radius,z:c.z+Math.sin(angle)*c.radius,speedMph:R.circleMph,boost:false});
  }
  const target=arenaActor(duel,rider.targetId);
  if (!target || outOfPlay(duel,target)) return {...me,speedMph:0,boost:false};
  if (rider.slot !== null) {
    const goal = reachableGoal(duel,car,boxGoal(duel,car,target));
    return rider.missionPace ? {...goal, speedMph: Math.min(goal.speedMph, rider.missionPace), boost: false} : goal;
  }
  const participant=arenaParticipant(duel,car);
  const opening=rider.approach && openingGoal(duel,car,target,me,participant);
  const brain=opening || thinkBrain(duel,participant,car,dt);
  const tune=diff(duel);
  let speedMph=opening ? brain.speedMph : brain.speedMph*tune.pace, boost=brain.boost;
  if (!opening && rider.chargeAt !== undefined && duel.state.arena.worldJob.riderFight.elapsed < rider.chargeAt+R.openingChargeSec) {
    speedMph=Math.min(speedMph,tune.openingChargeMph);
    boost=false;
  }
  const goal=reachableGoal(duel,car,{...brain,speedMph,boost});
  const turn=wrapHeading(Math.atan2(goal.x-me.x,goal.z-me.z)-me.heading);
  if (!car._arenaUTurn && Math.abs(turn) < R.turnRadians) return goal;
  // The arena pilot normally takes its U-turn speed from the floor limit.
  // Brake into the turn so an open-land rider can recover from an overshoot.
  const brakingMph=Math.abs(car.speedMph)-DRIVE.brakeAccel*dt;
  return {...goal,boost:false,speedCapMph:Math.max(R.turnMph,brakingMph)};
}

// Check actual cars in the player's own four directions. Merely assigning a rider to a slot confers no hold.
function boxPressure(duel, cars, dt, minimum = R.minimumBoxRiders) {
  const target=duel.state, at=worldPose(duel,target), sin=Math.sin(at.heading), cos=Math.cos(at.heading), occupied=new Set();
  if (target.onFoot || cars.filter(car=>car.roadRider.slot !== null && car.roadRider.phase==='fighting').length<minimum) return false;
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
  return minimum === 2 ? (occupied.has('front') && occupied.has('back') ||
    occupied.has('left') && occupied.has('right')) : sides.every(side=>occupied.has(side));
}

// A door that opens onto the player's car puts its man on the ground beside it, never standing in it (STORY-NIGHT-2-FLOW,
// Kyle's picture of 19 November 2026): the point is moved out of the car's box, the short way.
function inCarBox(x, z, carAt) {
  const sin=Math.sin(carAt.heading), cos=Math.cos(carAt.heading), dx=x-carAt.x, dz=z-carAt.z;
  return Math.abs(dx*cos-dz*sin)<R.crewClearHalfWidth && Math.abs(dx*sin+dz*cos)<R.crewClearHalfLength;
}
function besideCar(x, z, carAt) {
  const sin=Math.sin(carAt.heading), cos=Math.cos(carAt.heading), dx=x-carAt.x, dz=z-carAt.z;
  const side=dx*cos-dz*sin, ahead=dx*sin+dz*cos;
  const outSide=R.crewClearHalfWidth-Math.abs(side), outAhead=R.crewClearHalfLength-Math.abs(ahead);
  if (outSide<=0 || outAhead<=0) return {x,z};
  const lateral=outSide<=outAhead, push=lateral ? (Math.sign(side)||1)*outSide : (Math.sign(ahead)||1)*outAhead;
  return lateral ? {x:x+cos*push,z:z-sin*push} : {x:x+sin*push,z:z+cos*push};
}

function crewBail(duel, world, car, goal) {
  const at=worldPose(duel,car), target=worldPose(duel,duel.state), away=Math.atan2(at.x-target.x,at.z-target.z);
  for(let index=0;index<R.crewPerCar;index++) {
    let side=index%2 ? 1 : -1, along=0;
    const door=(s,a)=>({x:at.x+Math.cos(at.heading)*s*R.crewDoor+Math.sin(at.heading)*a, z:at.z-Math.sin(at.heading)*s*R.crewDoor+Math.cos(at.heading)*a});
    // A door against the player's car is shut: that man climbs out of the far door, a little ahead of his mate.
    if (inCarBox(door(side,0).x, door(side,0).z, target)) { side=-side; along=R.crewFarDoorAhead; }
    const {x,z}=besideCar(door(side,along).x, door(side,along).z, target);
    // At the Wash they run for the Walkers' camp; elsewhere they scatter away from the player.
    const yaw=goal ? Math.atan2(goal.x-x,goal.z-z) : away+side*R.swerveRadians;
    const run=goal ? {x:goal.x,z:goal.z} : {x:x+Math.sin(yaw)*R.crewRunMetres,z:z+Math.cos(yaw)*R.crewRunMetres};
    world.actors.push({id:car.jobId+'/crew/'+index,riderCrew:true,steps:0,x,y:scablandsActorHeightAt(x,z,car.groundHeight),z,yaw,
      health:1,approachSpeed:R.crewMps,approachTarget:run});
  }
  duel.emit({arenaTell:{id:car.arenaId,cue:'rider.crew-bail',position:point(duel,car)}});
}

// STORY-NIGHT-2-FLOW: on a step with a crew goal, the crews run for it. A hit from the player's car (the ambush rule: its middle
// within 2.2 m while it moves at 4 m/s or more) knocks one flat for good; the first to reach the goal takes it. A man who has
// come no nearer the goal (by crewProgressMetres) in crewStuckSec has given up the run, even if he slides about in a corner.
function stepRiderCrew(duel, world, step, dt) {
  const goal=step?.crewGoal;
  if (!goal) return;
  const state=duel.state, car=worldPose(duel,state);
  const moving=!state.onFoot && !state.combatWrecking && Math.abs(state.speedMph || 0)*DRIVE.mphToWorld >= AMBUSH_RUN_DOWN_MPS;
  for (const crew of world.actors) {
    if (!crew.riderCrew || crew.knockedDown || crew.atGoal || crew.gaveUp) continue;
    if (moving && dist(car,crew) <= AMBUSH_RUN_DOWN_METRES) {
      Object.assign(crew,{knockedDown:true,health:0,approachSpeed:0,approachTarget:null});
      duel.emit({arenaTell:{id:crew.id,targetId:'player',seconds:0,cue:'night.ash-man.down',position:{x:crew.x,y:crew.y,z:crew.z}}});
      continue;
    }
    if (dist(crew,goal) <= goal.radius) {
      Object.assign(crew,{atGoal:true,approachSpeed:0,approachTarget:null});
      world.crewGoalTaken=true;
      continue;
    }
    const gap=dist(crew,goal);
    if (!(crew.bestGoalGap-gap<R.crewProgressMetres)) { crew.bestGoalGap=gap; crew.stuckSec=0; }
    else crew.stuckSec=(crew.stuckSec ?? 0)+dt;
    if (crew.stuckSec>=R.crewStuckSec) Object.assign(crew,{gaveUp:true,approachSpeed:0,approachTarget:null});
  }
}
const crewLoose=(world, step) => !!step?.crewGoal && !world.crewGoalTaken &&
  world.actors.some(crew => crew.riderCrew && !crew.knockedDown && !crew.atGoal && !crew.gaveUp);

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
      // OPEN-DOORS: a sack coats the outing car where it lands.
      if (car === duel.state && world.serviceSheds) world.ashHit = true;
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

export function updateRoadFight(duel, world, dt) {
  const fight=world.riderFight;
  if (!fight) return;
  fight.elapsed+=dt;
  const step=fight.checkpointStep ?? world.job.steps[fight.index];
  stepAsh(duel,world,step,dt);
  const cars=fight.riders.map(id=>arenaActor(duel,id)).filter(Boolean);
  stepRiderCrew(duel,world,step,dt);
  for (const car of cars) {
    const rider=car.roadRider;
    rider.ashWait=Math.max(0,rider.ashWait-dt);
    if (car.combatWrecking && rider.phase!=='wrecked') {
      rider.phase='wrecked'; crewBail(duel,world,car,step?.crewGoal);
      car.arenaTellSec=0;
    } else if (!fight.outcome && rider.phase==='fighting' && !rider.fightToEnd && car.armor<=car.maxArmor*R.retreatFraction) {
      rider.phase='withdrawing';
      car.arenaTellSec=0;
      duel.emit({arenaTell:{id:rider.id,targetId:rider.targetId,seconds:0,cue:'rider.breaks-off',sourceId:car.arenaId,position:point(duel,car)}});
    }
  }
  // The rider laying siege breaks off last, once every other rider is wrecked or gone.
  if (!fight.outcome && !crewLoose(world,step) && cars.every(car => car.roadRider.circle || car.roadRider.phase!=='fighting')) {
    for (const car of cars) {
      const rider=car.roadRider;
      if (!rider.circle || rider.phase!=='fighting') continue;
      rider.phase='withdrawing';
      car.arenaTellSec=0;
      duel.emit({arenaTell:{id:rider.id,targetId:rider.targetId,seconds:0,cue:'rider.breaks-off',sourceId:car.arenaId,position:point(duel,car)}});
    }
  }
  if (fight.outcome) return;
  const boxed = fight.targetId === 'player' && (step.missionRule ? fightBoxed(
    {...worldPose(duel,duel.state), y: duel.state.groundHeight, speedMph: duel.state.speedMph}, cars.map(car => ({...worldPose(duel,car), y: car.groundHeight,
      wrecked: car.combatWrecking})), worldPose(duel,duel.state).heading) : boxPressure(duel,cars,dt,step.box?.cars));
  if (boxed) {
    // Opposing tyres resist the drivetrain only while four actual bodies hold the car.
    const speed=duel.state.speedMph;
    duel.state.speedMph=Math.sign(speed)*Math.max(0,Math.abs(speed)-R.boxBrakeMphSec*dt);
  }
  fight.heldSec = boxed && Math.abs(duel.state.speedMph)<R.boxMph ? fight.heldSec+dt : 0;
  const target=arenaActor(duel,fight.targetId);
  const outcome=duel.state.combatWrecking || !target || target.combatWrecking || target.finished || target.crushed
    ? 'lost' : fight.heldSec >= (step.missionRule?.boxedInSeconds ?? step.box?.seconds ?? R.boxSeconds) ? 'surrounded' :
    step.missionRule?.winWrecks && cars.filter(car => car.combatWrecking).length >= step.missionRule.winWrecks ? 'won' :
    cars.every(car=>car.roadRider.phase!=='fighting') && !crewLoose(world,step) ? 'won' : null;
  if (!outcome) return;
  fight.outcome=outcome; fight.endedAt=fight.elapsed;
  if (!fight.checkpointStep) (world.completedRiderFights ??= {})[fight.index]=fight;
  for (const car of cars) if (car.roadRider.phase==='fighting') {
    car.roadRider.phase='holding';
    car.arenaTellSec=0;
  }
  duel.emit({riderFight:{id:step.id,outcome,smothered:[...fight.smothered]}});
  const cue=outcome==='won' ? 'rider.won' : outcome==='surrounded' ? 'rider.surrounded' : null;
  if (cue) duel.emit({arenaTell:{id:step.id,cue,position:point(duel,duel.state)}});
  if (fight.checkpointStep) return {type:'riderFight', id:step.id, outcome,
    wrecks:cars.filter(car => car.combatWrecking && arenaParticipant(duel,car)?.lastHitBy === 'player').length};
}

// OPEN-CHECKPOINTS: the adapter between the open land's requests and the existing arena cars.
const TRACK_PREFIX = 'open-checkpoint-track/';
const RIVAL_DRAW_RANGE = 650;
const REMOVAL_MARGIN = 40;

function addCheckpointCars(duel, world, vehicles, group, phase) {
  const state = duel.state, encounter = world.checkpointRoad, tune = ROAD_GROUPS[group];
  // The arena has already scaled the player's native armor, including their fitted kit.
  const playerBase = maxArmorForMass(CARS[state.car].mass) +
    armorKitBonus(state.combatArmorKit, {carbonPlates:state.combatCarbonPlates === true});
  const maxArmor = maxArmorForMass(CARS[tune.car].mass) * (state.maxArmor / playerBase);
  return vehicles.map(({start, home, route}, index) => {
    const id = encounter.id + '/car-' + (encounter.cars.length + index + 1);
    const car = {arenaId:id, jobId:id, car:tune.car, maxArmor, armor:maxArmor, damageZones:freshDamageZones(),
      boost:1, damageCooldown:0, contactCooldown:0, yawVelocity:0, pushVelocity:0, airHeight:0, prevAirHeight:0,
      paint:{color:tune.color, accent:tune.accent}, weaponLoadout:[],
      roadRider:{id, checkpoint:true, phase, home, route, routeIndex:0, pace:tune.pace,
        scout:encounter.scout, ashWait:0, slot:null}};
    placeJobCar(duel, car, start, start.heading);
    state.opponents.push(car);
    state.arena.participants.push({id, name:nameOf(group), team:encounter.id, kind:'cpu', brain:'rammer',
      wrecks:0, wrecked:0, damageDealt:0, lastHitBy:null, lastHitAt:-Infinity, protectedSec:0, targetId:null,
      targetHeldSec:0, reactionSec:0, goal:null, wreckCounted:false});
    if (phase === 'stopped') {
      const {x, z, heading} = start;
      const at = {x:x - Math.cos(heading) * 2.8, z:z + Math.sin(heading) * 2.8};
      encounter.driver = id + '/driver';
      world.actors.push({...at, y:scablandsActorHeightAt(at.x, at.z), id:encounter.driver, riderCrew:true,
        steps:0, yaw:heading, health:1});
    }
    return id;
  });
}

function startCheckpointFight(duel, world, request) {
  const active = world.checkpointRoad;
  const added = addCheckpointCars(duel, world, request.vehicles, request.group, 'fighting');
  const ids = added.length ? added : active.cars;
  active.cars.push(...added);
  const target = worldPose(duel, duel.state), tune = ROAD_GROUPS[request.group];
  world.riderFight = {index:world.job.stepIndex, checkpointStep:{id:request.id, box:request.box, missionRule: request.missionRule}, targetId:'player',
    riders:[...ids], ash:[], smothered:[], heldSec:0, elapsed:0, outcome:null};
  for (const id of ids) {
    const car = arenaActor(duel,id), rider = car.roadRider, at = worldPose(duel,car);
    car.maxArmor *= diff(duel).armor;
    car.armor = Math.min(car.armor, car.maxArmor);
    car.weaponLoadout = [tune.weapon];
    Object.assign(rider, {phase:'fighting', approach:true, targetId:'player', weapon:tune.weapon});
    rider.fightToEnd = request.fightToEnd === true;
    if (request.escort) {
      Object.assign(rider, {escort: request.escort, escortSide: ids.indexOf(id) % 2 ? -3.5 : 3.5, approach: false});
      car.weaponLoadout = [];
    }
    if (request.firstCarStanding && id === ids[0]) {
      car.armor = 1;
      rider.standingArmor = car.armor;
    }
    if (request.missionRule) {
      const rule = request.missionRule;
      rider.mass = rule.mass;
      rider.fightToEnd = true;
      rider.slot = 2 + ids.indexOf(id) % 2;
      rider.missionPace = Math.min(tune.pace, (CARS[duel.state.car].offRoadSpeed ?? 52) * .75);
      if (rule.shoot === false) { rider.weapon = null; car.weaponLoadout = []; car.weaponsDisabledUntil = Infinity; }
    }
    if (!rider.home) {
      // A provoked passer retreats in the direction it was already driving.
      const distance = Math.max(1300, dist(at,target) + 900);
      rider.home = {x:at.x + Math.sin(at.heading) * distance, z:at.z + Math.cos(at.heading) * distance};
    }
    arenaParticipant(duel,car).targetId = 'player';
  }
  duel.state.opponentCount = duel.state.opponents.length;
}

function checkpointRouteGoal(duel, car, at) {
  const rider = car.roadRider, route = rider.route;
  let next = route[rider.routeIndex];
  while (next && dist(at, next) < 14) next = route[++rider.routeIndex];
  if (!next) return {...at, speedMph:0, boost:false};
  const nearPlayer = rider.scout && dist(at, worldPose(duel,duel.state)) < 60;
  return reachableGoal(duel, car, {...next, speedMph:nearPlayer ? 14 : rider.pace, boost:false});
}

function leaveCheckpointRoad(duel, world) {
  const encounter = world.checkpointRoad, fight = world.riderFight;
  if (fight?.checkpointStep && !fight.outcome) fight.outcome = 'left';
  for (const id of encounter.cars) {
    const car = arenaActor(duel,id);
    if (car.combatWrecking) continue;
    const rider = car.roadRider;
    if (rider.phase === 'passing') continue;
    rider.phase = rider.route && rider.phase === 'stopped' ? 'passing' : 'withdrawing';
    car.arenaTellSec = 0;
    arenaParticipant(duel,car).targetId = null;
  }
  if (encounter.driver) {
    const driver = world.actors.find(actor => actor.id === encounter.driver);
    const car = arenaActor(duel,encounter.cars[0]), home = car?.roadRider.route?.at(-1) ?? car?.roadRider.home;
    if (driver && home) Object.assign(driver, {approachTarget:home, approachSpeed:R.crewMps});
  }
}

function removeRoadCars(duel, ids) {
  const state = duel.state, removed = new Set(ids), former = state.opponents;
  state.opponents = former.filter(car => !removed.has(car.arenaId));
  // Native contact latches use field indices. An arriving car cannot inherit a departed car's ram.
  for (const key of duel._combatRamIncidents ?? []) {
    if (key.split(':').some(slot => slot >= 0 && former[slot] !== state.opponents[slot])) duel._combatRamIncidents.delete(key);
  }
  state.opponentCount = state.opponents.length;
  state.arena.participants = state.arena.participants.filter(participant => !removed.has(participant.id));
}

function clearCheckpointRoad(duel, world) {
  const state = duel.state, encounter = world.checkpointRoad;
  removeRoadCars(duel, encounter.cars);
  world.actors = world.actors.filter(actor => !encounter.cars.some(id => actor.id?.startsWith(id + '/')));
  state.arena.markers = (state.arena.markers ?? []).filter(marker => !marker.id?.startsWith(TRACK_PREFIX));
  if (world.riderFight?.checkpointStep) delete world.riderFight;
  delete world.checkpointRoad;
}

function placeCheckpointFighter(duel, at) {
  const state = duel.state, fighter = state.fighter;
  const {s, lateral} = duel.course.nearest(at.x, at.z, fighter.s);
  const y = scablandsActorHeightAt(at.x, at.z);
  Object.assign(fighter, {x:at.x, y, z:at.z, groundY:y, s, lateral, airHeight:0, verticalSpeed:0, speed:0});
}

function walkFromWreck(duel, world) {
  const state = duel.state;
  world.checkpointRecovery = true;
  state.combatWreckTimer = state.impactTimer = 1;
  if (state.onFoot) return;
  let fighter;
  try {
    fighter = createFighter(duel.course, state);
  } catch {
    // Try a dry roadside shoulder if the wreck lies in water or against a solid.
    const at = worldPose(duel,state);
    const road = nearestRoadPoint(at).position;
    const candidates = [at, road].flatMap(point => [8, -8, 18, -18, 32, -32].flatMap(offset =>
      [{x:point.x + offset, z:point.z}, {x:point.x, z:point.z + offset}]));
    for (const point of candidates) {
      const near = duel.course.nearest(point.x, point.z, state.s);
      try { fighter = createFighter(duel.course, state, near); break; } catch { /* Try the next shoulder. */ }
    }
    if (!fighter) {
      // The route can still continue if no local ground supports a fighter.
      const near = duel.course.nearest(road.x, road.z, state.s);
      completeCombatRecovery(duel,state,{alreadyReset:true});
      placeJobCar(duel,state,road,duel.course.at(near.s).heading);
      delete world.checkpointRecovery;
      return;
    }
  }
  Object.assign(fighter, {crewId:state.crewId});
  Object.assign(state, {onFoot:true, fighter, fighterInput:{}, boarding:null, footPresentation:null});
  state.footTransition.needsRelease = true;
  state.footTransition.heldSeconds = 0;
}

export function checkpointRoadView(duel, world) {
  const state = duel.state, road = world.checkpointRoad;
  if (world.checkpointRecovery) state.combatWreckTimer = state.impactTimer = 1;
  const wrench = state.footWeapons?.selected === 'wrench' && state.fighterInput?.fire === true && !state.fighter?.knockedDown;
  const player = state.onFoot ? state.fighter : worldPose(duel,state);
  const driver = road?.driver && world.actors.find(actor => actor.id === road.driver);
  if (driver && !driver.approachTarget) driver.yaw = Math.atan2(player.x - driver.x, player.z - driver.z);
  const cars = road?.cars.map(id => {
    const car = arenaActor(duel,id), at = worldPose(duel,car), rider = car.roadRider;
    const inDrawRange = Math.abs(duel.relativeS(car.s) - state.s) < RIVAL_DRAW_RANGE + REMOVAL_MARGIN;
    rider.flagVisible = dist(at,player) <= 60 && !car.combatWrecking;
    return {...at, id, y: car.groundHeight, wrecked: car.combatWrecking === true, fighting: rider.phase === 'fighting',
      speed: Math.abs(car.speedMph) * DRIVE.mphToWorld, hitByPlayer:arenaParticipant(duel,car)?.lastHitBy === 'player',
      routeDone:rider.route && rider.routeIndex === rider.route.length,
      visible:dist(at,player) < RIVAL_DRAW_RANGE || inDrawRange && dist(at,player) < 2600};
  });
  return {checkpointsEnabled:true, wrench, carSpeedMph: state.speedMph, recoveryPaid: world.missionRecoveryPaid === true,
    checkpointHeading:worldPose(duel,state).heading,
    road:road && {id:road.id, cars, external:road.external,
      ...(world.riderFight?.checkpointStep?.box ? {outcome:world.riderFight.outcome} : {})}};
}

export function applyCheckpointRoadRequest(duel, world, request) {
  const state = duel.state, {action, id} = request;
  let active = world.checkpointRoad;
  // The shared riders request carries the id, group and vehicles with their own start and home.
  if (request.type === 'riders') {
    if (active && request.replaceSurround && world.riderFight?.checkpointStep?.box &&
        world.riderFight.outcome === 'surrounded') {
      clearCheckpointRoad(duel, world);
      active = null;
    }
    if (active && active.id !== id || world.riderFight || !Array.isArray(request.vehicles) ||
        !Object.hasOwn(ROAD_GROUPS, request.group) || !active && !request.vehicles.length) return true;
    if (!active) {
      const external = request.checkpoint ? null :
        {id, group:request.group, phase:'fight', at:request.vehicles[0].start, external:true};
      world.checkpointRoad = {id, cars:[], external};
    }
    startRoadFight(duel,world,request);
    return true;
  }
  if (request.type !== ROAD_REQUEST) return false;
  if (action === 'cue') {
    // A cue that OPEN-SOUND has not registered yet is not played: the sound system refuses an unknown cue by throwing.
    if (!Object.hasOwn(SOUND_BANK, request.cue)) return true;
    const at = request.position;
    duel.emit({arenaTell:{id:request.cue, cue:request.cue, position:{...at, y:scablandsActorHeightAt(at.x,at.z)}}});
  } else if (action === 'mission-loss') {
    world.missionRecoveryPaid = true;
    state.combatWrecking = true;
    state.armor = 0;
    placeJobCar(duel,state,nearestRoadPoint(worldPose(duel,state)).position,0);
  } else if (action === 'walk') walkFromWreck(duel,world);
  else if (action === 'lift') placeCheckpointFighter(duel,request.at);
  else if (action === 'recover-car') {
    completeCombatRecovery(duel,state,{alreadyReset:true});
    placeJobCar(duel,state,request.at,0);
    if (state.onFoot && !world.checkpointRecovery) placeCheckpointFighter(duel,request.at);
    delete world.checkpointRecovery;
    delete world.missionRecoveryPaid;
  } else if (action === 'start' && !active) {
    const encounter = world.checkpointRoad = {id, cars:[], scout:request.scout};
    const phase = request.phase === 'trouble' ? 'stopped' : 'passing';
    encounter.cars.push(...addCheckpointCars(duel,world,request.vehicles,request.displayGroup,phase));
    state.opponentCount = state.opponents.length;
    if (request.tracks.length) {
      const tracks = request.tracks.map((at,index) => ({...at, kind:'tyre', id:TRACK_PREFIX + index,
        y:scablandsActorHeightAt(at.x,at.z)}));
      state.arena.markers = [...(state.arena.markers ?? []), ...tracks];
    }
  } else if (active?.id === id) {
    if (action === 'leave') leaveCheckpointRoad(duel,world);
    else if (action === 'clear') clearCheckpointRoad(duel,world);
  }
  return true;
}
