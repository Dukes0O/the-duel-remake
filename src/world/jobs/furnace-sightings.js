// Old Smoke's furnace, seen before it is fought (docs/board/cards/EVERBURN-RUN-AT-TOWN.md, "Seen before fought").
// In jobs 1, 3 and 4 of the Everburn story the Scablands scene draws the furnace where the player will see it. It is
// no actor, has no collision and follows no rule. Where it stands is worked out from the job's own state and clock
// (and Big Bess's own place on her road), so the same inputs always give the same picture. Nothing here draws or
// changes a race; the scene reads `furnaceSighting` and the job engine reads `pathShare`.
import {OLD_SMOKE} from './old-smoke.js';

// Job 1: standing on the skyline north of the road (smaller z is north in the Scablands), until the pot is delivered.
export const FURNACE_SKYLINE = Object.freeze({x: 300, z: -120});
// Job 3: rolling away west from the Boneyard's far end for 20 seconds from the moment the thief is caught, then gone.
export const FURNACE_LEAVING = Object.freeze({from: Object.freeze({x: 140, z: 470}), to: Object.freeze({x: -60, z: 440}), seconds: 20});
// Job 4: 150 m north of Big Bess while she is between 30% and 70% of her road, at her speed. Past 70% it turns away
// north, at its own base pace, and is gone once it has gone 220 m.
export const FURNACE_PACING = Object.freeze({fromShare: .3, toShare: .7, northMetres: 150, turnMetres: 30, goneMetres: 220});

const NORTH = Math.PI;
const at = place => place?.position ?? place;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// How far along `path` something is, from the place it stands and the path point it is walking to (its `pathIndex`).
// Returns metres, the road's whole length, and the share between 0 and 1.
export function pathShare(position, pathIndex, path) {
  const points = (path ?? []).map(at);
  if (points.length < 2 || !position) return {metres: 0, total: 0, share: 0};
  const cumulative = [0];
  for (let i = 1; i < points.length; i++)
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  const total = cumulative.at(-1);
  const index = Math.max(1, Math.min(Number.isInteger(pathIndex) ? pathIndex : 1, points.length - 1));
  const from = points[index - 1];
  const metres = Math.min(total, cumulative[index - 1] + Math.hypot(position.x - from.x, position.z - from.z));
  return {metres, total, share: total > 0 ? metres / total : 0};
}

// The point and the way of travel at `metres` along the path.
function pointAlong(path, metres) {
  const points = path.map(at);
  let left = Math.max(0, metres);
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    if (left <= length || i === points.length - 1) {
      const t = length > 0 ? Math.min(1, left / length) : 1;
      return {x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, z: points[i - 1].z + (points[i].z - points[i - 1].z) * t,
        heading: Math.atan2(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)};
    }
    left -= length;
  }
  return {x: points[0].x, z: points[0].z, heading: 0};
}

// Where Big Bess is and which way she faces: her own heading, or the way along the road she is driving.
function bessPose(actor, path, pathIndex) {
  const points = path.map(at), index = Math.max(1, Math.min(Number.isInteger(pathIndex) ? pathIndex : 1, points.length - 1));
  const heading = Number.isFinite(actor.heading) ? actor.heading :
    Math.atan2(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z);
  return {x: actor.position.x, z: actor.position.z, heading};
}

// What the scene should show of the furnace in this job: null (the furnace stays where it stands in the Everburn, as
// outside the story), {hidden: true} (it is gone), or {x, z, heading} (it is standing or rolling there).
export function furnaceSighting(worldJob) {
  const definition = worldJob?.definition;
  if (definition?.storyId !== 'everburn' || worldJob.actors?.some(actor => actor.id === 'old-smoke-furnace')) return null;
  const job = worldJob.job, clock = worldJob.clockSec ?? 0, over = job?.done === true || worldJob.settled === true;
  if (definition.number === 1) {
    return over ? {hidden: true} : {x: FURNACE_SKYLINE.x, z: FURNACE_SKYLINE.z, heading: 0};
  }
  if (definition.number === 3) {
    if (!Number.isFinite(worldJob.wonAtSec)) return null;
    const t = clock - worldJob.wonAtSec, leaving = FURNACE_LEAVING;
    if (t < 0) return null;
    if (t >= leaving.seconds) return {hidden: true};
    const s = t / leaving.seconds, dx = leaving.to.x - leaving.from.x, dz = leaving.to.z - leaving.from.z;
    return {x: leaving.from.x + dx * s, z: leaving.from.z + dz * s, heading: Math.atan2(dx, dz)};
  }
  if (definition.number === 4) {
    const step = job?.steps?.[job.stepIndex], path = step?.path, bess = worldJob.actors?.find(actor => actor.id === step?.actorId);
    if (!bess?.position || !path?.length) return null;
    const {share, total} = pathShare(bess.position, bess.pathIndex, path), pacing = FURNACE_PACING;
    if (over || share < pacing.fromShare) return over ? {hidden: true} : null;
    const pose = bessPose(bess, path, bess.pathIndex);
    if (share <= pacing.toShare) return {x: pose.x, z: pose.z - pacing.northMetres, heading: pose.heading};
    // Past 70% the furnace turns away: it keeps its place from the 70% mark, turns to the north over `turnMetres`, and
    // goes on north at its own pace (the share of her road she has gone since, scaled by how much faster it is).
    const mark = pointAlong(path, pacing.toShare * total), travelled = (share - pacing.toShare) * total *
      OLD_SMOKE.baseSpeed / Math.max(1, step.speed ?? 9);
    if (travelled >= pacing.goneMetres) return {hidden: true};
    const turn = wrap(NORTH - mark.heading), first = Math.min(travelled, pacing.turnMetres);
    let x = mark.x, z = mark.z - pacing.northMetres;
    if (Math.abs(turn) > 1e-6) {
      const rate = turn / pacing.turnMetres;
      x += (-Math.cos(mark.heading + rate * first) + Math.cos(mark.heading)) / rate;
      z += (Math.sin(mark.heading + rate * first) - Math.sin(mark.heading)) / rate;
    } else {
      x += Math.sin(mark.heading) * first; z += Math.cos(mark.heading) * first;
    }
    z -= Math.max(0, travelled - pacing.turnMetres);
    return {x, z, heading: mark.heading + turn * Math.min(1, travelled / pacing.turnMetres)};
  }
  return null;
}
