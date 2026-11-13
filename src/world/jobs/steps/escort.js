import {pathShare} from '../furnace-sightings.js';

// Raids on an escort (docs/board/cards/RUN-GAS.md, "Raids on an escort"). A step may carry `ambushes`: [{id, place, count}].
//   - When the truck comes within AMBUSH_ALERT_METRES of an ambush's place, its raiders appear (a spawnWave request).
//   - Once the truck is AMBUSH_GONE_METRES past it along the road, raiders still standing give up (a clearWave request).
//   - When the truck rests and restarts, the ambushes ahead of the place she restarts from are put back in place.
// Easy has one raider fewer in every ambush, never fewer than one. Everything here comes from the truck's place and the
// step's own state; there is no randomness. The raiders' damage to the truck is applied by the job mode (world-job.js).
export const AMBUSH_ALERT_METRES = 160;
export const AMBUSH_GONE_METRES = 60;
export const AMBUSH_WEAR_METRES = 30;
// The player's car knocks an ambush raider down when it moves at this speed (m/s) or more and its centre is this close (m).
export const AMBUSH_RUN_DOWN_MPS = 4;
export const AMBUSH_RUN_DOWN_METRES = 2.2;
// After a rest Big Bess has at least this much health (she keeps more if she had more when the stretch began).
export const REST_HEALTH_MINIMUM = 60;
// No ambush stands closer than this to the start of the road, measured along it.
export const AMBUSH_MIN_FROM_START_METRES = 180;
// Health a raider still standing within AMBUSH_WEAR_METRES takes off the truck every second.
export const AMBUSH_WEAR_PER_SECOND = Object.freeze({easy: 1.5, medium: 5, hard: 7});

const at = place => place?.position ?? place;

// EVERBURN-PLAY-FIXES, "An escort starts beside what it escorts": the player's car starts this far behind the truck's first
// place and this far to her right, facing along her road, so the truck is in the first picture. `heading` is the game's own
// (the direction of travel is (sin, cos)); her right-hand side is (-cos, sin).
export const ESCORT_START_BEHIND_METRES = 10;
export const ESCORT_START_RIGHT_METRES = 6;
export function escortCarStart(path, behind = ESCORT_START_BEHIND_METRES, right = ESCORT_START_RIGHT_METRES) {
  const from = at(path[0]), to = at(path[1]), length = Math.hypot(to.x - from.x, to.z - from.z);
  const forwardX = (to.x - from.x) / length, forwardZ = (to.z - from.z) / length, tenth = value => Math.round(value * 10) / 10;
  return Object.freeze({x: tenth(from.x - forwardX * behind - forwardZ * right), z: tenth(from.z - forwardZ * behind + forwardX * right),
    heading: Math.atan2(forwardX, forwardZ)});
}

// How far along `path` the point `place` lies (the nearest point of the road to it), and the road's unit direction there.
export function alongPath(path, place) {
  const points = (path ?? []).map(at), point = at(place);
  let walked = 0, best = {metres: 0, gap: Infinity, direction: {x: 0, z: 1}};
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x, dz = points[i].z - points[i - 1].z, length = Math.hypot(dx, dz);
    if (length > 0) {
      const t = Math.max(0, Math.min(1, ((point.x - points[i - 1].x) * dx + (point.z - points[i - 1].z) * dz) / (length * length)));
      const gap = Math.hypot(point.x - (points[i - 1].x + dx * t), point.z - (points[i - 1].z + dz * t));
      if (gap < best.gap) best = {metres: walked + length * t, gap, direction: {x: dx / length, z: dz / length}};
    }
    walked += length;
  }
  return best;
}

// How far along `path` its place number `index` lies.
export function metresAtPlace(path, index) {
  const points = (path ?? []).map(at);
  let walked = 0;
  for (let i = 1; i <= Math.min(index, points.length - 1); i++) walked += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return walked;
}

export const ambushRaiders = (ambush, difficulty) => difficulty === 'easy' ? Math.max(1, ambush.count - 1) : ambush.count;

function stepAmbushes(step, state, view, truck, requests) {
  const ambushes = step.ambushes ?? [];
  const next = {};
  if (!ambushes.length || !truck?.position) return next;
  let spawned = [...(state.spawned ?? [])], gone = [...(state.gone ?? [])];
  const along = pathShare(truck.position, truck.pathIndex, step.path).metres;
  for (const ambush of ambushes) {
    const where = alongPath(step.path, ambush.place).metres, place = at(ambush.place);
    if (spawned.includes(ambush.id)) {
      if (!gone.includes(ambush.id) && along >= where + AMBUSH_GONE_METRES) {
        gone.push(ambush.id);
        requests.push({type: 'clearWave', key: `ambush:${ambush.id}`});
      }
    } else if (along < where + AMBUSH_GONE_METRES && Math.hypot(truck.position.x - place.x, truck.position.z - place.z) <= AMBUSH_ALERT_METRES) {
      spawned.push(ambush.id);
      const direction = alongPath(step.path, ambush.place).direction;
      requests.push({type: 'spawnWave', ambush: true, key: `ambush:${ambush.id}`, n: ambushRaiders(ambush, view.difficulty),
        at: ambush.place, direction});
      if (step.raidLineId && !state.raidSaid && !next.raidSaid) {
        next.raidSaid = true;
        requests.push({type: 'say', lineId: step.raidLineId});
      }
    }
  }
  return {...next, spawned, gone};
}

export function stepEscort(step, state, view, dt = 0) {
  const actors = view.actors ?? [];
  const truck = actors.find(actor => actor.id === step.actorId);
  if (truck && (truck.health ?? 1) <= 0) {
    // Rests are counted for the stretch she is on (the place she is heading for), so a run can never loop for ever (RUN-GAS).
    const stretch = String(truck.pathIndex ?? 1);
    if (!state.rested) return { state: { rested: true, restLeft: step.restSeconds ?? 0, stretchRests: {...(state.stretchRests ?? {}), [stretch]: (state.stretchRests?.[stretch] ?? 0) + 1} }, events: [{ type: 'rest', actorId: step.actorId }], requests: [{ type: 'say', lineId: step.restLineId }, { type: 'follow', path: step.path, speed: 0 }] };
    const restLeft = state.restLeft ?? 0;
    if (restLeft > 0) return { state: { restLeft: Math.max(0, restLeft - dt) }, complete: false, events: [], requests: [{ type: 'follow', path: step.path, speed: 0 }] };
    // The stretch starts again from the last place she reached; its ambush, and every ambush ahead of it, is back in place.
    const requests = [{ type: 'follow', path: step.path, speed: step.speed }, { type: 'marker', place: step.path?.[0] }];
    const from = metresAtPlace(step.path, Math.max(0, (truck.pathIndex ?? 1) - 1));
    const spawned = [], gone = [], gaveUp = [...(state.gaveUp ?? [])];
    // Rested twice on this stretch: the raiders at this stretch's ambush (and any still standing behind it) give up as she sets off
    // for the third time, and do not come back.
    const to = metresAtPlace(step.path, Math.min(truck.pathIndex ?? 1, (step.path?.length ?? 1) - 1));
    const giveUp = (state.stretchRests?.[stretch] ?? 0) >= 2;
    let gaveUpNow = false;
    for (const ambush of step.ambushes ?? []) {
      const where = alongPath(step.path, ambush.place).metres, wasSpawned = (state.spawned ?? []).includes(ambush.id), wasGone = (state.gone ?? []).includes(ambush.id);
      // In the battle (a step with a furnace) the furnace can finish her after she has passed an ambush, so an ambush on this
      // stretch that she had already passed gives up too; without that she would meet it again on every restart for ever.
      if (giveUp && where <= to + 1e-6 && (!wasGone || step.furnaceActor && where >= from - 1e-6)) {
        if (wasSpawned) requests.push({type: 'clearWave', key: `ambush:${ambush.id}`});
        spawned.push(ambush.id); gone.push(ambush.id); gaveUpNow = true;
      } else if (where < from - 1e-6 && wasSpawned) { spawned.push(ambush.id); if (wasGone) gone.push(ambush.id); }
      else if (wasSpawned) requests.push({type: 'clearWave', key: `ambush:${ambush.id}`});
    }
    if (gaveUpNow && step.giveUpLineId && !gaveUp.includes(stretch)) { gaveUp.push(stretch); requests.push({type: 'say', lineId: step.giveUpLineId}); }
    return { state: { rested: false, restLeft: 0, spawned, gone, gaveUp }, restart: true, events: [{ type: 'restarted', actorId: step.actorId }, ...(gaveUpNow ? [{type: 'ambushGaveUp', actorId: step.actorId}] : [])], requests };
  }
  // A missing truck is still being spawned. Never let an absent objective
  // count as a successful escort.
  const requests = [{ type: 'follow', path: step.path, speed: step.speed }, { type: 'marker', place: step.destination }];
  if (!truck) return {state, complete: false, requests};
  const ambushState = stepAmbushes(step, state, view, truck, requests);
  const complete = truck.atDestination === true || (truck.atDestination === undefined && truck.pathProgress >= 1);
  // A step with `arrival` closes with Moss's line for how Big Bess comes in (whole or hurt), then any extra lines it names.
  const arrival = complete ? step.arrival : null;
  // FIELD-BATTLE-ASH: the battle closes on Auntie Solder's line for how it ended, as the step saw it the moment Big Bess arrived:
  // the furnace dead ('won') or still rolling ('arrived'). The ending is kept in the step's state so that a door broken while the
  // line plays cannot change it.
  let ending = state.ending ?? null;
  if (arrival?.battle) {
    const furnace = actors.find(actor => actor.id === arrival.battle.furnaceId);
    ending ??= furnace && (furnace.health ?? 1) <= 0 ? 'won' : 'arrived';
  }
  const closingLines = arrival?.battle ? [...(ending === 'won' ? arrival.battle.wonLineIds : arrival.battle.arrivedLineIds)] :
    arrival ? [(truck.health ?? 0) >= arrival.hurtBelow ? arrival.wholeLineId : arrival.hurtLineId, ...(arrival.thenLineIds ?? [])] : null;
  return { state: {...state, ...ambushState, ...(ending ? {ending} : {})}, complete, requests, ...(closingLines ? {closingLines} : {}) };
}
