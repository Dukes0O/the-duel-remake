// Old Smoke's furnace, seen before it is fought (docs/board/cards/EVERBURN-RUN-AT-TOWN.md, "Seen before fought").
// In jobs 1, 3 and 4 of the Everburn story the Scablands scene draws the furnace where the player will see it. It is
// no actor, has no collision and follows no rule. Where it stands is worked out from the job's own state and clock
// (and Big Bess's own place on her road), so the same inputs always give the same picture. Nothing here draws or
// changes a race; the scene reads `furnaceSighting` and the job engine reads `pathShare`.
import {OLD_SMOKE} from './old-smoke.js';
import {LAND} from '../scablands-names.js';
import {sees, WATCH} from '../scablands-ways.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';

// The skyline furnace watches the car, not the driver on foot. Cover resets
// the uninterrupted time in view. The caller owns the state and the effects.
const skylineOptions = {heightAt: scablandsSurfaceHeightAt, actorFloors: true, tunnels: null, eye: WATCH.furnace.eye, range: WATCH.furnace.range, step: 5};
const ridgeOptions = {heightAt: scablandsSurfaceHeightAt, actorFloors: true, tunnels: null, eye: WATCH.lookout.eye, range: WATCH.lookout.range, step: 5};
export function stepSkylineSight(state, car, dt, heightAt = scablandsSurfaceHeightAt, tunnels = null, refresh = true) {
  skylineOptions.heightAt = heightAt; skylineOptions.actorFloors = heightAt === scablandsSurfaceHeightAt; skylineOptions.tunnels = tunnels;
  const visible = refresh ? !!car && sees(FURNACE_SKYLINE, car, skylineOptions) : !!state.visible;
  state.change = visible === !!state.visible ? null : visible ? 'seen' : 'lost';
  state.seconds = visible ? (state.seconds ?? 0) + Math.max(0, dt) : 0;
  state.visible = visible;
  return state;
}

export const FURNACE_PATIENCE_SECONDS = 8;

// Hot Delivery's glass uses the job clock. Its closed round is supplied by the
// named land plan; neither a renderer nor a wall clock advances these rules.
export const FURNACE_GLASS = Object.freeze({
  glassRadius: 30,
  roundSeconds: 40,
  captionMetres: 150,
  lostRiderSightSeconds: 5,
  riderEye: 1.5,
  riderSightStep: 5,
  pursuitSeconds: 90,
  crossingKmh: 50,
  crossingSpareSeconds: 1,
  drawSegments: 48,
  drawRings: 6,
  drawLift: .08,
  // Turning points stay in the watch's sight. Between them the moving beam
  // passes behind rock; the same land sight rule blocks exposure there.
  roundMarks: Object.freeze([
    Object.freeze({from:'yard', to:'the-steps', share:.38, north:0}),
    Object.freeze({from:'yard', to:'the-steps', share:.45, north:0}),
    Object.freeze({from:'the-steps', to:'tin-town', share:.035, north:0}),
    Object.freeze({from:'the-steps', to:'tin-town', share:.105, north:0}),
    Object.freeze({from:'the-steps', to:'tin-town', share:.025, north:40}),
    Object.freeze({from:'yard', to:'the-steps', share:.45, north:50}),
    Object.freeze({from:'yard', to:'the-steps', share:.44, north:90}),
    Object.freeze({from:'yard', to:'the-steps', share:.42, north:90}),
    Object.freeze({from:'yard', to:'the-steps', share:.43, north:40}),
  ]),
});

export function furnaceGlassRound(land = LAND) {
  return FURNACE_GLASS.roundMarks.map(mark =>
    land.between(mark.from, mark.to, mark.share, 0, -mark.north));
}

const platesGlassRound = furnaceGlassRound();
// Every view reads the same job clock, including while paused. No view owns time.
export function hotDeliveryGlass(worldJob) {
  if (worldJob?.definition?.id !== 'everburn-hot-delivery' ||
      worldJob.job?.done || worldJob.settled) return null;
  return glassOnRound(platesGlassRound, worldJob.clockSec ?? 0);
}

export function glassOnRound(points, clockSeconds) {
  if (points.length < 2) throw new RangeError('The glass needs a closed round.');
  const lengths = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.x - point.x, next.z - point.z);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!(total > 0)) throw new RangeError('The glass round needs some length.');
  const phase = ((clockSeconds % FURNACE_GLASS.roundSeconds) + FURNACE_GLASS.roundSeconds) % FURNACE_GLASS.roundSeconds;
  let remaining = total * phase / FURNACE_GLASS.roundSeconds;
  for (let index = 0; index < points.length; index++) {
    const length = lengths[index];
    if (length === 0) continue;
    if (remaining < length) {
      const from = points[index], to = points[(index + 1) % points.length];
      const share = remaining / length;
      return {x:from.x + (to.x - from.x) * share, z:from.z + (to.z - from.z) * share,
        radius:FURNACE_GLASS.glassRadius};
    }
    remaining -= length;
  }
  return {...points[0], radius:FURNACE_GLASS.glassRadius};
}

// Sight and the moving patch are separate facts. Rock may hide a car even
// inside the circle. A dark or unloaded pot never adds to the count.
export function stepGlassSeen(state, {car, glass, loaded, visible}, dt) {
  const illuminated = !!car && !!glass &&
    Math.hypot(car.x - glass.x, car.z - glass.z) <= FURNACE_GLASS.glassRadius;
  const seen = !!loaded && !!visible && illuminated;
  const elapsed = Math.max(0, dt);
  state.seenSeconds = Math.max(0, Math.min(FURNACE_PATIENCE_SECONDS,
    (state.seenSeconds ?? 0) + (seen ? elapsed : -elapsed)));
  state.inGlass = seen;
  return state;
}

export function glassWarningDue(sight, warned) {
  return !warned && sight.inGlass && sight.seenSeconds >= FURNACE_PATIENCE_SECONDS;
}

// A returning pair must finish leaving before another horn can call them.
// Wrecks stay in the world; only the riders who went home can return.
export function glassPursuitReady(state, riders) {
  if (state.ridersRetreating) return false;
  if (!state.skylineWarned) return true;
  const gone = rider => state.furnaceRidersGone?.includes(rider.id);
  return !!state.furnaceRidersReturning && riders.some(gone) &&
    riders.every(rider => gone(rider) || state.actors?.some(actor => actor.id === rider.id && actor.health <= 0));
}

export function beginGlassPursuit(state) {
  state.skylineWarned = true;
  state.furnaceRidersReturning = false;
  state.furnaceRidersGone = [];
  state.furnaceLostSightSeconds = 0;
  state.furnacePursuitSeconds = 0;
}

// Either rider can keep the chase alive. Once both lose the car, the same
// job clock counts five seconds before they return. The watch is irrelevant.
export function stepGlassPursuit(state, riderVisible, dt) {
  if (state.furnaceRidersReturning) return state;
  const elapsed = Math.max(0, dt);
  state.furnacePursuitSeconds = (state.furnacePursuitSeconds ?? 0) + elapsed;
  state.furnaceLostSightSeconds = riderVisible ? 0 :
    (state.furnaceLostSightSeconds ?? 0) + elapsed;
  if (state.furnaceLostSightSeconds >= FURNACE_GLASS.lostRiderSightSeconds ||
      state.ridersRetreating || state.furnacePursuitSeconds >= FURNACE_GLASS.pursuitSeconds) {
    state.furnaceRidersReturning = true;
    if (state.skylineSight) state.skylineSight.seenSeconds = 0;
  }
  return state;
}

// Sound the warning once, after more than the allowed uninterrupted time in view.
export function skylineWarningDue(sight, warned) {
  return !warned && sight.visible && sight.seconds > FURNACE_PATIENCE_SECONDS;
}

// The Ridge lookout uses the same view as the route map, with closer samples
// so narrow banks and scarps can also hide a car.
const RIDGE_WATCH = LAND.at('ridge');
export function stepRidgeSight(state, car, heightAt = scablandsSurfaceHeightAt, tunnels = null, refresh = true) {
  ridgeOptions.heightAt = heightAt; ridgeOptions.actorFloors = heightAt === scablandsSurfaceHeightAt; ridgeOptions.tunnels = tunnels;
  const visible = refresh ? !!car && sees(RIDGE_WATCH, car, ridgeOptions) : !!state.visible;
  state.change = visible === !!state.visible ? null : visible ? 'seen' : 'lost';
  state.visible = visible;
  return state;
}

// Where the furnace is seen in jobs 1 and 3, from a land (src/world/scablands-names.js), so that the marks move with the places they stand by.
// Job 1: standing on high ground north of the Steps until the pot is delivered.
// Job 3: rolling away west from the Boneyard's far end for 20 seconds from the moment the thief is caught, then gone.
export function furnaceMarks(land) {
  const skyline = land.at('furnace-watch');
  const from = land.at('boneyard', -284, 166), to = land.at('boneyard', -484, 136);
  return Object.freeze({
    skyline: Object.freeze({x: skyline.x, z: skyline.z}),
    leaving: Object.freeze({from: Object.freeze({x: from.x, z: from.z}), to: Object.freeze({x: to.x, z: to.z}), seconds: 20}),
  });
}
const MARKS = furnaceMarks(LAND);
export const FURNACE_SKYLINE = MARKS.skyline;
export const FURNACE_LEAVING = MARKS.leaving;
// Job 4: 90 m to the north of Big Bess and 40 m ahead of her along her direction of travel, while she is between 30% and 70% of
// her road, at her speed (RUN-GAS: it was 150 m abeam, out of the player's view). Past 70% it turns away north, at its own base
// pace, and is gone once it has gone 220 m.
export const FURNACE_PACING = Object.freeze({fromShare: .3, toShare: .7, northMetres: 90, aheadMetres: 40, turnMetres: 30, goneMetres: 220});

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
    if (share <= pacing.toShare) return {x: pose.x + Math.sin(pose.heading) * pacing.aheadMetres,
      z: pose.z + Math.cos(pose.heading) * pacing.aheadMetres - pacing.northMetres, heading: pose.heading};
    // Past 70% the furnace turns away: it keeps its place from the 70% mark, turns to the north over `turnMetres`, and
    // goes on north at its own pace (the share of her road she has gone since, scaled by how much faster it is).
    const mark = pointAlong(path, pacing.toShare * total), travelled = (share - pacing.toShare) * total *
      OLD_SMOKE.baseSpeed / Math.max(1, step.speed ?? 9);
    if (travelled >= pacing.goneMetres) return {hidden: true};
    const turn = wrap(NORTH - mark.heading), first = Math.min(travelled, pacing.turnMetres);
    let x = mark.x + Math.sin(mark.heading) * pacing.aheadMetres, z = mark.z + Math.cos(mark.heading) * pacing.aheadMetres - pacing.northMetres;
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
