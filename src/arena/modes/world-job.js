import {createJob, stepJob} from '../../world/jobs/job-engine.js';
import {createRaidZones} from '../../raiders.js';
import {COMBAT_TUNING} from '../../wasteland-tuning.js';
import {initializeCrewGear} from '../../crew-gear/signature.js';
import {clearScablandsTownLayout} from '../../world/scablands-ground.js';
import {oldSmokeVentTargets} from '../../world/jobs/old-smoke.js';
import {nearestIronLineDistance, sampleIronLine} from '../../world/iron-line.js';

const position = (duel, actor) => {
  const at = duel.course.worldAt(actor.s, actor.lateral);
  return {x: at.x, y: at.y, z: at.z};
};
const EMPTY_HIT_TARGETS = [];
const WELL_WEAR_RANGE = 10;
const WELL_WEAR_PER_SECOND = 1;

export function createWorldJob(definition) {
  if (!definition) throw new TypeError('World Job mode needs a job definition');
  return {job: createJob(definition, definition.seed ?? 0), definition,
    marker: null, follow: null, spawnedWaves: 0, spawnedWaveKeys: [],
    clearedWaves: [], hitTargets: [], settled: false};
}

export function initializeWorldJob(duel, definition) {
  const state = duel.state, arena = state.arena;
  const worldJob = arena?.worldJob;
  if (!worldJob) return false;
  // Loaned car weapons belong to this run. They never touch the player profile.
  worldJob.originalWeaponLoadout = [...(state.weaponLoadout || [])];
  worldJob.originalCrewId = state.crewId;
  worldJob.originalFootWeaponSelected = state.footWeapons?.selected ?? null;
  worldJob.activeLoan = null;
  applyStepLoan(duel, worldJob);
  if(definition.kind==='town-drive')duel.course.townLayout=definition.layout??null;
  worldJob.raidSeed = duel.seed ^ 0x51ab1e;
  worldJob.actors = [];
  state.worldJobThingsHit = [];
  if(definition.kind==='town-drive'&&definition.layout?.start){
    const start=definition.layout.start,pose=duel.course.nearest(start.x,start.z);
    state.s=pose.s;state.lateral=pose.lateral;state.prevS=pose.s;state.prevLateral=pose.lateral;
    state.speedMph=0;state.headingError=0;state.townGatePrompt='';
  }
  return true;
}

export function cleanupWorldJobLoan(duel) {
  const worldJob = duel.state.arena?.mode === 'world-job' ? duel.state.arena.worldJob : null;
  if (!worldJob || !Array.isArray(worldJob.originalWeaponLoadout)) return false;
  duel.state.weaponLoadout = [...worldJob.originalWeaponLoadout];
  if (worldJob.originalCrewId) duel.state.crewId = worldJob.originalCrewId;
  if (worldJob.originalFootWeaponSelected && duel.state.footWeapons)
    duel.state.footWeapons.selected = worldJob.originalFootWeaponSelected;
  initializeCrewGear(duel);
  if(worldJob.definition.kind==='town-drive'){
    clearScablandsTownLayout();
    duel.course.townLayout=null;
    duel._obstacleQueryCache?.clear();
  }
  worldJob.activeLoan = null;
  worldJob.settled = true;
  return true;
}

function applyStepLoan(duel, worldJob) {
  const state = duel.state;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const loan = step?.lentWeapon ?? (worldJob.job.stepIndex === 0 ? worldJob.definition.lend?.[0] : null);
  worldJob.activeLoan = typeof loan === 'string' ? loan : null;
  state.weaponLoadout = [...(worldJob.originalWeaponLoadout || [])];
  if (worldJob.activeLoan === 'flamethrower') {
    const slot = Math.min(state.weaponLoadout.length, 3);
    state.weaponLoadout[slot] = worldJob.activeLoan;
  } else if (worldJob.activeLoan === 'cinders-hand-flamer') {
    state.crewId = 'cinder';
    initializeCrewGear(duel);
    if (state.footWeapons) state.footWeapons.selected = 'hand-flamer';
  } else if (worldJob.originalCrewId) {
    state.crewId = worldJob.originalCrewId;
    if (worldJob.originalFootWeaponSelected && state.footWeapons)
      state.footWeapons.selected = worldJob.originalFootWeaponSelected;
    initializeCrewGear(duel);
  }
  const stepCrew=worldJob.job.steps[worldJob.job.stepIndex]?.lentCrew;
  if(stepCrew&&state.crewId!==stepCrew) {state.crewId=stepCrew;initializeCrewGear(duel);}
}

export function prepareWorldJobControls(duel) {
  const worldJob=duel.state.arena?.mode==='world-job'?duel.state.arena.worldJob:null;
  if(!worldJob)return false;
  const step=worldJob?.job.steps[worldJob.job.stepIndex];
  const input=duel.state.input??{};
  worldJob.controls={whistle:input.boost===true||duel.state.fighterInput?.jump===true};
  if(step?.kind!=='drivetrain') return false;
  Object.assign(worldJob.controls,{throttle:input.throttle??0,brake:input.brake??0});
  input.throttle=0;input.brake=0;input.steer=0;input.boost=false;
  duel.state.speedMph=0;duel.state.pushVelocity=0;
  return true;
}

function updateJobActors(worldJob, dt) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const actorDef = step?.actor;
  if (!actorDef) return;
  let actor = worldJob.actors.find(item => item.id === actorDef.id);
  if (!actor) {
    const start = actorDef.path?.[0]?.position ?? actorDef.path?.[0];
    if (!start) return;
    actor = {id: actorDef.id, position: {...start}, health: actorDef.health ?? 100,
      pathProgress: 0, speed: 0, renderCar: actorDef.renderCar ?? null,
      ...(actorDef.id === 'old-smoke-furnace' ? {startedAtSec: worldJob.clockSec ?? 0} : {})};
    worldJob.actors.push(actor);
  }
  const follow = worldJob.follow;
  if (!follow || follow.actorId && follow.actorId !== actor.id || !actorDef.path?.length) return;
  const path = actorDef.path.map(item => item.position ?? item);
  const index = Math.min(actor.pathIndex ?? 0, path.length - 1);
  const target = path[index];
  const dx = target.x - actor.position.x, dz = target.z - actor.position.z;
  const gap = Math.hypot(dx, dz), travel = Math.max(0, follow.speed ?? actorDef.speed ?? 0) * dt;
  if (gap <= travel || gap < .01) {
    actor.position = {...target};
    actor.pathIndex = Math.min(index + 1, path.length - 1);
    actor.pathProgress = path.length <= 1 ? 1 : actor.pathIndex / (path.length - 1);
  } else {
    actor.position.x += dx / gap * travel;
    actor.position.z += dz / gap * travel;
  }
  if (actor.pathProgress >= 1 && actorDef.escort) actor.atDestination = true;
}

function spawnWave(duel, worldJob, request, key) {
  if (worldJob.spawnedWaveKeys.includes(key)) return;
  const zones = createRaidZones(duel.course, worldJob.raidSeed + worldJob.spawnedWaves++);
  const zone = zones[0];
  const at = request.at?.position ?? request.at;
  if (at && Number.isFinite(at.x) && Number.isFinite(at.z)) {
    const center = request.from?.position ?? request.from ?? at;
    const dx = at.x - center.x, dz = at.z - center.z, distance = Math.hypot(dx, dz) || 1;
    const sideX = dz / distance, sideZ = -dx / distance;
    const hold = request.hold?.position ?? request.hold;
    const stop = Math.max(0, request.stopDistance || 0);
    const approachTarget = hold && Number.isFinite(hold.x) && Number.isFinite(hold.z)
      ? {...hold} : {x: at.x - dx / distance * stop,
        y: at.y, z: at.z - dz / distance * stop};
    zone.raiders.forEach((raider, index) => {
      const offset = (index - (request.n - 1) / 2) * .5;
      const x = center.x + sideX * offset, z = center.z + sideZ * offset;
      const ground = duel.course.nearest(x, z, zone.s);
      Object.assign(raider, {s: ground.s, lateral: ground.lateral, x, y: ground.y,
        z, groundY: ground.y, approachTarget, approachSpeed: request.approachSpeed || 0});
    });
  }
  const count = Math.max(1, Math.min(zone.raiders.length, Math.floor(request.n) || 1));
  zone.raiders = zone.raiders.slice(0, count);
  duel.state.raids ??= {zones: [], shots: 0};
  duel.state.raids.zones.push(zone);
  worldJob.actors.push(...zone.raiders);
  worldJob.waveZones ??= {};
  worldJob.waveZones[key] = zone;
  worldJob.spawnedWaveKeys.push(key);
}

function applyRequests(duel, worldJob, requests) {
  for (const request of requests) {
    if (request.type === 'marker') {
      worldJob.marker = request.place ?? null;
      const at = request.place?.position ?? request.place;
      duel.state.arena.markers = at && Number.isFinite(at.x) && Number.isFinite(at.z)
        ? [{kind: 'ring', id: 'world-job-marker', x: at.x, y: at.y ?? 0,
          z: at.z, radius: request.place?.radius ?? 4}] : [];
    }
    else if (request.type === 'follow') worldJob.follow = {...request,
      actorId: request.actorId ?? worldJob.job.steps[worldJob.job.stepIndex]?.targetId};
    else if(request.type==='train') {
      let actor=worldJob.actors.find(item=>item.id===request.actorId);
      if(!actor) {actor={id:request.actorId,health:9999,renderCar:'falcone_heritage'};worldJob.actors.push(actor);}
      actor.renderCar??='falcone_heritage';
      Object.assign(actor,{position:{...request.position},pathProgress:request.progress??actor.pathProgress??0,
        speed:request.speed??0,train:true});
      const path=request.path??worldJob.job.steps[worldJob.job.stepIndex]?.path;
      const metres=request.metres??0;
      actor.roofPlates=(request.roofPlates??['tank-wagon-2','tank-wagon-1']).map(id=>{
        const behind=id==='tank-wagon-2'?42:22;
        const sample=sampleIronLine(path,Math.max(0,metres-behind));
        return {id,position:sample?{...sample,y:sample.y+(request.roofHeight??3.5)}:actor.position,radius:4};
      });
      const cab=sampleIronLine(path,Math.max(0,metres-8))??actor.position;
      actor.coupling={x:cab.x-Math.sin(cab.heading??0)*4,y:cab.y+1,z:cab.z-Math.cos(cab.heading??0)*4};
      actor.trainLength=request.pathLength??0;
    }
    else if (request.type === 'spawnWave') {
      const key = `${worldJob.job.stepIndex}:${worldJob.job.stepState.wave ?? 0}`;
      spawnWave(duel, worldJob, request, key);
    }
    else if (request.type === 'say' && request.lineId) {
      const caption = worldJob.definition.captions?.[request.lineId] ?? request.lineId;
      duel._callout(caption, 2.2);
    }
    else if (request.type === 'lendWeapon' && typeof request.weapon === 'string') {
      duel.state.weaponLoadout = [...new Set([...(duel.state.weaponLoadout || []), request.weapon])];
    }
    else if (request.type === 'refill') {
      const {combat, footWeapons, footGear} = duel.state;
      if (request.carWeapon && combat?.cooldowns?.[request.carWeapon] !== undefined)
        combat.cooldowns[request.carWeapon] = 0;
      if (request.footAmmo === 'rpg' && footWeapons) {
        footWeapons.ammo = COMBAT_TUNING.foot.rpgAmmo;
        if (footGear?.name === 'LONGHORN RPG') footGear.ammo = footWeapons.ammo;
      }
      const at = request.place?.position ?? request.place;
      if (request.crateId && at) worldJob.refillCrate = {id: request.crateId, position: {...at}};
    }
  }
}

function moveJobRaiders(worldJob, dt) {
  for (const actor of worldJob.actors) {
    if (!actor.approachTarget || actor.knockedDown || !(actor.approachSpeed > 0)) continue;
    const dx = actor.approachTarget.x - actor.x, dz = actor.approachTarget.z - actor.z;
    const gap = Math.hypot(dx, dz), travel = actor.approachSpeed * dt;
    if (gap <= travel) {
      actor.x = actor.approachTarget.x; actor.z = actor.approachTarget.z;
    } else {
      actor.x += dx / gap * travel; actor.z += dz / gap * travel;
    }
    actor.yaw = Math.atan2(dx, dz);
  }
}

export function stepWorldJob(duel, dt) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || worldJob.settled || state.arena.result) return null;
  if(worldJob.definition.kind==='town-drive'){
    const gate=worldJob.definition.layout?.gate;
    if(gate){
      const point=position(duel,state),near=Math.hypot(point.x-gate.x,point.z-gate.z)<=gate.halfWidth+8;
      state.townGatePrompt=near?gate.prompt:'';
      if(near&&state.input?.interact&&!worldJob.gateOpened){
        worldJob.gateOpened=true;duel.emit?.({townGate:true});
      }
    }
    return null;
  }
  worldJob.clockSec = state.stageTimeSec;
  const waveKey = `${worldJob.job.stepIndex}:${worldJob.job.stepState.wave ?? 0}`;
  const waveZone = worldJob.waveZones?.[waveKey];
  const waveNumber = worldJob.job.stepState.wave ?? 0;
  if (waveZone?.raiders.length && waveZone.raiders.every(raider => raider.knockedDown) &&
      !worldJob.clearedWaves.includes(waveNumber)) worldJob.clearedWaves.push(waveNumber);
  const player = state.onFoot && state.fighter ? state.fighter : state;
  const point = state.onFoot&&state.fighter?{x:state.fighter.x,y:state.fighter.y,z:state.fighter.z}:position(duel, player);
  const playerView = {position: point, s: player.s, lateral: player.lateral,
    speed: player.speedMph ?? 0};
  const currentStep = worldJob.job.steps[worldJob.job.stepIndex];
  const trainBefore=worldJob.actors.find(actor=>actor.train)?.position;
  const previousRoofStage=worldJob.job.stepState.stage==='roof';
  const trainMetresBefore=worldJob.job.stepState.trainMetres??0;
  if (currentStep?.kind === 'defend' && currentStep.placeId) {
    worldJob.places ??= {};
    const place = currentStep.place?.position ?? currentStep.place;
    const placeState = worldJob.places[currentStep.placeId] ??= {health: currentStep.health ?? 100};
    const difficultyScale = state.cpuDifficulty === 'easy' ? .1 : 1;
    let nearbyRaiders = 0;
    for (const raider of worldJob.actors) {
      if (raider.knockedDown || !Number.isFinite(raider.x) || !Number.isFinite(raider.z)) continue;
      if (Math.hypot(raider.x - place.x, raider.z - place.z) <= WELL_WEAR_RANGE) nearbyRaiders++;
    }
    placeState.health = Math.max(0, placeState.health - nearbyRaiders *
      WELL_WEAR_PER_SECOND * difficultyScale * dt);
  }
  const thingsHit = [...(state.worldJobThingsHit || []),
    ...(state.onFoot && state.input?.interact &&
      worldJob.job.steps[worldJob.job.stepIndex]?.kind === 'heist'
      ? [{id: worldJob.job.steps[worldJob.job.stepIndex].takeId, kind: 'take'}] : [])];
  for (const hit of thingsHit) {
    const targetId = hit.actorId ?? hit.id;
    const actor = worldJob.actors.find(item => item.id === targetId);
    if (actor && Number.isFinite(hit.damage)) actor.health = Math.max(0, actor.health - hit.damage);
  }
  const targetActor = worldJob.actors.find(actor => actor.id === worldJob.job.steps[worldJob.job.stepIndex]?.targetId);
  const contact = targetActor && Math.hypot(point.x - targetActor.position.x, point.z - targetActor.position.z) <=
    (worldJob.job.steps[worldJob.job.stepIndex]?.contactRadius ?? 3)
    ? targetActor.id : null;
  const actors = [...worldJob.actors.map((actor, index) => ({id: actor.id ?? `raider-${index}`,
    position: actor.position ?? {x: actor.x, y: actor.y, z: actor.z}, health: actor.knockedDown ? 0 : actor.health,
    pathProgress: actor.pathProgress, atDestination: actor.atDestination})),
  ...state.opponents.map((actor, index) => ({id: actor.jobId ?? `cpu-${index + 1}`,
    position: position(duel, actor), health: actor.armor}))];
  const view = {player: playerView, onFoot: !!state.onFoot,
    fighter: state.fighter ? {...state.fighter, position: point} : null,
    carPosition: position(duel, state),
    actors, crashSize: state.lastCrashSize || 0,
    thingsHit,
    carrying: worldJob.carrying, inventory: worldJob.inventory ?? [], lamps: worldJob.job.steps[worldJob.job.stepIndex]?.lamps ?? [],
    places: worldJob.places ?? {}, placeHealth: worldJob.placeHealth,
    difficulty: state.cpuDifficulty, controls:worldJob.controls??{}, interact:state.input?.interact===true,
    grapple:(state.crewGear?.id==='grapple'&&state.footWeapons?.selected===state.crewGear.id)||state.input?.interact===true,
    train:worldJob.actors.find(actor=>actor.train),
    contact, waveCleared: worldJob.clearedWaves};
  const previousStep = worldJob.job.stepIndex;
  const next = stepJob(worldJob.job, view, dt);
  worldJob.job = next;
  state.worldJobThingsHit = [];
  moveJobRaiders(worldJob, dt);
  updateJobActors(worldJob, dt);
  if (next.stepIndex !== previousStep) worldJob.clearedWaves = [];
  if (next.stepIndex !== previousStep) applyStepLoan(duel, worldJob);
  for (const event of next.events) {
    if (event.type === 'waveRestarted') {
      const step = next.steps[next.stepIndex];
      if (step?.kind === 'defend' && step.placeId) {
        worldJob.places ??= {};
        worldJob.places[step.placeId] = {health: step.health ?? 100};
      }
      const key = `${next.stepIndex}:${event.wave ?? 0}`;
      const zone = worldJob.waveZones?.[key];
      if (zone) {
        duel.state.raids.zones = duel.state.raids.zones.filter(candidate => candidate !== zone);
        worldJob.actors = worldJob.actors.filter(actor => !zone.raiders.includes(actor));
        delete worldJob.waveZones[key];
      }
      worldJob.spawnedWaveKeys = worldJob.spawnedWaveKeys.filter(existing => existing !== key);
    }
    if (event.type === 'waveCleared') worldJob.clearedWaves.push(event.wave);
    if (event.type === 'taken') {
      worldJob.carrying = event.id;
      worldJob.inventory = [...new Set([...(worldJob.inventory ?? []), event.id])];
    }
    if (event.type === 'say' && event.lineId) {
      duel._callout(worldJob.definition.captions?.[event.lineId] ?? event.lineId, 2.2);
    }
    if(event.type==='roofBoard'&&state.fighter) {
      Object.assign(state.fighter,{x:event.position.x,y:event.position.y,z:event.position.z,groundY:event.position.y});
      worldJob.roofRide={x:event.position.x,y:event.position.y,z:event.position.z};
    }
    if (event.type === 'done') {
      worldJob.settled = true;
      state.weaponLoadout = [...(worldJob.originalWeaponLoadout || [])];
      if (worldJob.originalCrewId) state.crewId = worldJob.originalCrewId;
      if (worldJob.originalFootWeaponSelected && state.footWeapons)
        state.footWeapons.selected = worldJob.originalFootWeaponSelected;
      initializeCrewGear(duel);
      return {reason: 'job-complete', winnerId: 'player'};
    }
  }
  applyRequests(duel, worldJob, next.requests);
  worldJob.controls=null;
  const train=worldJob.actors.find(actor=>actor.train);
  if(train&&state.onFoot&&state.fighter&&next.stepState.stage==='roof') {
    if(worldJob.roofRide&&trainBefore) {
      // A rider moves with their own place on the train, so a long train round a bend keeps them on it.
      const ridePath=currentStep.path, rideAt=nearestIronLineDistance(ridePath,{x:state.fighter.x,y:state.fighter.y-(currentStep.roofHeight??3.5),z:state.fighter.z}).metres;
      const from=sampleIronLine(ridePath,rideAt), to=sampleIronLine(ridePath,rideAt+(next.stepState.trainMetres??trainMetresBefore)-trainMetresBefore);
      state.fighter.x+=to.x-from.x;state.fighter.z+=to.z-from.z;
      state.fighter.y=train.roofPlates?.[next.stepState.index??0]?.position.y??
        state.fighter.y+train.position.y-trainBefore.y;
      state.fighter.groundY=state.fighter.y;
      worldJob.roofRide={x:state.fighter.x,y:state.fighter.y,z:state.fighter.z};
    } else if(!worldJob.roofRide) {
      const plate=train.roofPlates?.[next.stepState.index??0];
      if(plate)Object.assign(state.fighter,{x:plate.position.x,y:plate.position.y,z:plate.position.z,groundY:plate.position.y});
    }
  }
  if(train&&state.onFoot&&state.fighter&&previousRoofStage&&next.stepState.stage==='ground') {
    const ground=duel.course.nearest(state.fighter.x,state.fighter.z,state.s);
    state.fighter.y=state.fighter.groundY=ground.y;
  }
  if(next.stepState.stage!=='roof')worldJob.roofRide=null;
  if(train&&!state.onFoot) {
    const nearest=duel.course.nearest(train.position.x,train.position.z,state.s);
    state.s=state.prevS=nearest.s;state.lateral=state.prevLateral=nearest.lateral;
    state.headingError=0;state.speedMph=train.speed*2.236936;
  }
  return null;
}

// Combat paths call this after a real projectile or flame contact. It only
// records job evidence; it does not alter projectile, damage, or hit results.
export function reportWorldJobThingHit(duel, hit) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || !hit?.id) return false;
  state.worldJobThingsHit ??= [];
  if (state.worldJobThingsHit.some(item => item.id === hit.id)) return false;
  state.worldJobThingsHit.push({...hit});
  return true;
}

export function worldJobHitTargets(duel) {
  const worldJob = duel.state.arena?.worldJob;
  if (!worldJob || worldJob.settled || duel.state.arena?.result) return EMPTY_HIT_TARGETS;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const targets = worldJob.hitTargets;
  targets.length = 0;
  for (const actor of worldJob.actors) {
    if (actor.health > 0 && actor.position) {
      targets.push({id: actor.id, actorId: actor.id, kind: actor.id.includes('furnace') ? 'furnace' : 'vehicle',
        position: actor.position, radius: 3});
      if (actor.id === 'old-smoke-furnace')
        targets.push(...oldSmokeVentTargets(actor,
          Math.max(0, (worldJob.clockSec ?? 0) - actor.startedAtSec)));
    }
  }
  for (const barrier of step?.barriers ?? []) {
    const at = barrier.position ?? barrier;
    targets.push({id: barrier.id, kind: 'barricade', position: at,
      radius: 2, burnable: true});
  }
  return targets;
}

export function worldJobPilotGoal(duel, actor) {
  const follow = duel.state.arena?.worldJob?.follow;
  if (follow?.path?.length && (!follow.actorId || actor.jobId === follow.actorId ||
      actor.arenaId === follow.actorId || actor === duel.state.opponents[0])) {
    const target = follow.path[Math.min(duel.state.arena.worldJob.followIndex || 0,
      follow.path.length - 1)];
    const at = target.position ?? target;
    return {x: at.x, z: at.z, speedMph: follow.speed ?? 25, boost: false};
  }
  return null;
}
