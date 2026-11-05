import {createJob, stepJob} from '../../world/jobs/job-engine.js';
import {createRaidZones} from '../../raiders.js';

const position = (duel, actor) => {
  const at = duel.course.worldAt(actor.s, actor.lateral);
  return {x: at.x, y: at.y, z: at.z};
};

export function createWorldJob(definition) {
  if (!definition) throw new TypeError('World Job mode needs a job definition');
  return {job: createJob(definition, definition.seed ?? 0), definition,
    marker: null, follow: null, spawnedWaves: 0, spawnedWaveKeys: [],
    clearedWaves: [], settled: false};
}

export function initializeWorldJob(duel, definition) {
  const state = duel.state, arena = state.arena;
  const worldJob = arena?.worldJob;
  if (!worldJob) return false;
  // Loaned car weapons belong to this run. They never touch the player profile.
  worldJob.originalWeaponLoadout = [...(state.weaponLoadout || [])];
  worldJob.activeLoan = null;
  applyStepLoan(state, worldJob);
  worldJob.raidSeed = duel.seed ^ 0x51ab1e;
  worldJob.actors = [];
  return true;
}

function applyStepLoan(state, worldJob) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const loan = step?.lentWeapon ?? (worldJob.job.stepIndex === 0 ? worldJob.definition.lend?.[0] : null);
  worldJob.activeLoan = typeof loan === 'string' ? loan : null;
  state.weaponLoadout = [...new Set([...(worldJob.originalWeaponLoadout || []),
    ...(worldJob.activeLoan ? [worldJob.activeLoan] : [])])];
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
      pathProgress: 0, speed: 0};
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
    const place = duel.course.nearest(at.x, at.z, zone.s);
    zone.s = place.s; zone.side = Math.sign(place.lateral || 1);
    zone.lateral = place.lateral;
    zone.raiders.forEach((raider, index) => {
      const pose = duel.course.worldAt(place.s + (index - 1) * 5, place.lateral);
      Object.assign(raider, {s: pose.s, lateral: pose.lateral, x: pose.x,
        y: pose.y, z: pose.z, groundY: pose.y});
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
    if (request.type === 'marker') worldJob.marker = request.place ?? null;
    else if (request.type === 'follow') worldJob.follow = {...request,
      actorId: request.actorId ?? worldJob.job.steps[worldJob.job.stepIndex]?.targetId};
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
  }
}

export function stepWorldJob(duel, dt) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || worldJob.settled || state.arena.result) return null;
  const waveKey = `${worldJob.job.stepIndex}:${worldJob.job.stepState.wave ?? 0}`;
  const waveZone = worldJob.waveZones?.[waveKey];
  const waveNumber = worldJob.job.stepState.wave ?? 0;
  if (waveZone?.raiders.length && waveZone.raiders.every(raider => raider.knockedDown) &&
      !worldJob.clearedWaves.includes(waveNumber)) worldJob.clearedWaves.push(waveNumber);
  const player = state.onFoot && state.fighter ? state.fighter : state;
  const point = position(duel, player);
  const playerView = {position: point, s: player.s, lateral: player.lateral};
  const targetActor = worldJob.actors.find(actor => actor.id === worldJob.job.steps[worldJob.job.stepIndex]?.targetId);
  const contact = targetActor && Math.hypot(point.x - targetActor.position.x, point.z - targetActor.position.z) <=
    (worldJob.job.steps[worldJob.job.stepIndex]?.contactRadius ?? 3)
    ? targetActor.id : null;
  const actors = [...worldJob.actors.map((actor, index) => ({id: actor.id ?? `raider-${index}`,
    position: actor.position ?? {x: actor.x, y: actor.y, z: actor.z}, health: actor.knockedDown ? 0 : actor.health,
    pathProgress: actor.pathProgress, atDestination: actor.atDestination})),
  ...state.opponents.map((actor, index) => ({id: actor.jobId ?? `cpu-${index + 1}`,
    position: position(duel, actor), health: actor.armor}))];
  const view = {player: playerView, onFoot: !!state.onFoot, fighter: state.fighter,
    actors, crashSize: state.lastCrashSize || 0,
    thingsHit: state.worldJobThingsHit || (state.onFoot && state.input?.interact ? [{id: worldJob.job.steps[worldJob.job.stepIndex]?.takeId, kind: 'take'}] : []),
    carrying: worldJob.carrying, inventory: worldJob.inventory ?? [], lamps: worldJob.job.steps[worldJob.job.stepIndex]?.lamps ?? [],
    places: worldJob.places ?? {}, placeHealth: worldJob.placeHealth,
    contact, waveCleared: worldJob.clearedWaves};
  const previousStep = worldJob.job.stepIndex;
  const next = stepJob(worldJob.job, view, dt);
  worldJob.job = next;
  updateJobActors(worldJob, dt);
  if (next.stepIndex !== previousStep) worldJob.clearedWaves = [];
  if (next.stepIndex !== previousStep) applyStepLoan(state, worldJob);
  for (const event of next.events) {
    if (event.type === 'waveRestarted') {
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
    if (event.type === 'done') {
      worldJob.settled = true;
      state.weaponLoadout = [...(worldJob.originalWeaponLoadout || [])];
      return {reason: 'job-complete', winnerId: 'player'};
    }
  }
  applyRequests(duel, worldJob, next.requests);
  return null;
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
