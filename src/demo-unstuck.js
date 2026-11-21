// Demo driver rescue (card DEMO-DRIVER-UNSTUCK). The scripted driver in app.js steers straight at the road, so a
// car knocked off the road into a pocket of scenery sits against the wall for ever. A person would back out and
// drive round. This returns an input only when the car has been nearly stopped off the road for a few seconds;
// every other frame it returns null and the ordinary driver is untouched, so runs that never stick keep their
// recorded fingerprints. Nothing here changes race rules: it only chooses throttle, brake and steering.
import { sweepObstacle } from './collision.js';
import { steerForYaw } from './config.js';
import { wrapHeading } from './offroad-physics.js';

export const UNSTUCK = Object.freeze({
  stuckMph: 4,        // slower than this, off the road...
  stuckSec: 2.5,      // ...for this long, starts the rescue
  castMetres: 22,     // how far ahead a heading is tested for scenery
  openMetres: 14,     // free run that makes a heading usable
  clearMetres: 22,    // free run to the road that hands the car back to the ordinary driver
    replanSec: .35,
  holdMetres: 7,      // a chosen heading is kept while this much stays free
  legMinSec: .6, legMaxSec: 2.5, pinnedMph: 1.5, // a turning leg ends when the car is pinned, or after legMaxSec
  giveUpSec: 40,      // enclosed for this long: reset to the road like the game's own boundary reset
  crawlMph: 18,       // pace while picking a way round
});

// Free metres along a heading, tested with the game's own swept collision against the course's obstacles.
function freeDistance(duel, x, z, heading, length, spec) {
  const dx = Math.sin(heading), dz = Math.cos(heading), centre = duel.state.s;
  const start = { x, z }, end = { x: x + dx * length, z: z + dz * length };
  let free = length;
  for (const obstacle of duel._obstacles(centre - length - 20, centre + length + 20)) {
    const hit = sweepObstacle(start, end, obstacle, heading, spec);
    if (!hit) continue;
    // A car already touching a wall is only blocked in the direction of that wall.
    if (hit.inside && hit.nx * dx + hit.nz * dz >= 0) continue;
    free = Math.min(free, hit.t * length);
  }
  return free;
}

function reset(memory, time) {
  memory.active = false; memory.since = null; memory.goal = null; memory.avoid = null; memory.leg = null;
  memory.coolUntil = time + 2;
}

// Only scripted drivers use this route. The ordinary wreck contact tells
// them when a light car has been held at a body for a full second.
export function titanWreckDetourLane(duel, actor) {
  const {course, state} = duel;
  if (course?.def?.id !== 'titan-arena') return null;
  const old = actor._titanWreckDetour, time = state.stageTimeSec;
  if (old?.lane != null && time >= old.since && actor.s <= old.clearS) return old.lane;

  const touch = actor._titanWreckContact;
  if (!touch || time < touch.at || time - touch.at > .2 || Math.abs(actor.speedMph) > 4 || state.crushedProps.includes(touch.id)) {
    if (old) delete actor._titanWreckDetour;
    return null;
  }
  const watch = old?.id === touch.id && old.lane == null ? old : {id: touch.id, since: time};
  actor._titanWreckDetour = watch;
  if (time - watch.since < 1 - 1e-8) return null;

  const props = course.features.crushables.filter(prop => !state.crushedProps.includes(prop.id));
  const wreck = props.find(prop => prop.id === touch.id);
  if (!wreck) return null;
  const spec = duel._vehicleSpec(actor), half = course.roadHalfWidthAt(actor.s) - spec.halfWidth;
  const clearance = wreck.halfX + spec.halfWidth + .9;
  const origin = duel.relativeS(wreck.s, actor.s);
  const nearby = props.map(prop => ({prop, s: duel.relativeS(prop.s, actor.s)}))
    .filter(row => row.s >= origin - 6 && row.s <= origin + 14);
  const lanes = [wreck.off - clearance, wreck.off + clearance].filter(lane => Math.abs(lane) < half)
    .sort((left, right) => Math.abs(left) - Math.abs(right));
  const lane = lanes.find(line => nearby.every(({prop}) => Math.abs(prop.off - line) >= prop.halfX + spec.halfWidth + .4));
  if (lane == null) return null;
  watch.lane = lane;
  watch.clearS = Math.max(...nearby.map(({prop, s}) => s + prop.halfZ + spec.halfLength + 1));
  return lane;
}

// Returns {throttle, brake, steer} while rescuing, otherwise null.
export function unstuckInput(driver, duel) {
  const st = duel.state;
  if (st.status !== 'racing' || st.onFoot || st.airborne || st.knock) return null;
  const detour = titanWreckDetourLane(duel, st);
  if (detour != null) {
    const {course} = duel, here = course.worldAt(st.s, st.lateral);
    const aim = course.worldAt(st.s + 4, detour);
    const heading = here.heading + (st.headingError || 0);
    const steer = steerForYaw(wrapHeading(Math.atan2(aim.x - here.x, aim.z - here.z) - heading) * 6,
      {speedMph: st.speedMph, grip: duel.car.grip, traction: duel._drivingSurface(st.s, st.lateral).traction, car: duel.car, brake: 0});
    return {throttle: +(st.speedMph < 23), brake: 0, steer};
  }
  const memory = driver._unstuck ??= { active: false, since: null, tries: 0, picks: 0, goal: null, avoid: null, leg: null, legStart: 0, replanAt: 0, coolUntil: 0 };
  const time = st.stageTimeSec;
  const stuck = st.offRoad && Math.abs(st.speedMph) < UNSTUCK.stuckMph;
  if (!memory.active) {
    if (!stuck || time < memory.coolUntil) { memory.since = null; return null; }
    memory.since ??= time;
    if (time - memory.since < UNSTUCK.stuckSec) return null;
    memory.active = true; memory.activeSince = time; memory.tries++; memory.replanAt = 0; memory.leg = null;
  }
  if (!st.offRoad) { reset(memory, time); return null; }

  // Enclosed on every side: no driving gets out. Do what the game does to a car that strays too far, and put
  // it back on the course (the same call as `_boundary`, counted as a boundary reset).
  if (time - memory.activeSince > UNSTUCK.giveUpSec) {
    duel._safeReset(st);
    st.boundaryResets++; st.invulnerableSec = Math.max(st.invulnerableSec, 2.2);
    duel._callout('BACK ON COURSE  /  NO DAMAGE', 2.8); duel.emit({ boundaryReset: true });
    reset(memory, time);
    return null;
  }
  const course = duel.course, spec = duel._vehicleSpec(st);
  const here = course.worldAt(st.s, st.lateral), road = course.worldAt(st.s, 0);
  const heading = course.at(st.s).heading + (st.headingError || 0);
  const toRoad = Math.atan2(road.x - here.x, road.z - here.z);
  const along = course.at(st.s).heading;

  const traction = duel._drivingSurface(st.s, st.lateral).traction;
  const steerTo = angle => steerForYaw(wrapHeading(angle - heading) * 6,
    { speedMph: st.speedMph, grip: duel.car.grip, traction, car: duel.car, brake: 0, tyreSlip: false });
  // Open line to the road and facing it: hand the car back to the ordinary driver.
  const straight = freeDistance(duel, here.x, here.z, toRoad, UNSTUCK.clearMetres, spec);
  if (straight >= UNSTUCK.clearMetres && Math.abs(wrapHeading(toRoad - heading)) < .9) {
    reset(memory, time);
    return null;
  }
  // Pick a heading: toward the road, then round the wall along the road either way (the side tried first
  // alternates with each pick), then wider angles. Kept while it stays open; the last failed one goes last.
  const blocked = memory.goal == null || freeDistance(duel, here.x, here.z, memory.goal, UNSTUCK.castMetres, spec) < UNSTUCK.holdMetres;
  if (blocked && time >= memory.replanAt) {
    memory.replanAt = time + UNSTUCK.replanSec; memory.picks++;
    const sides = memory.picks % 2 ? [along, along + Math.PI] : [along + Math.PI, along];
    let candidates = [toRoad, toRoad + .7, toRoad - .7, ...sides, toRoad + 1.4, toRoad - 1.4];
    if (memory.avoid != null) candidates = [...candidates.filter(a => Math.abs(wrapHeading(a - memory.avoid)) > .35),
      ...candidates.filter(a => Math.abs(wrapHeading(a - memory.avoid)) <= .35)];
    let best = toRoad, bestFree = -1;
    for (const angle of candidates) {
      const free = freeDistance(duel, here.x, here.z, angle, UNSTUCK.castMetres, spec);
      if (free >= UNSTUCK.openMetres) { best = angle; bestFree = free; break; }
      if (free > bestFree) { best = angle; bestFree = free; }
    }
    if (memory.goal != null) memory.avoid = memory.goal;
    memory.goal = best;
    memory.legStart = time; // restart the turn toward the new heading
  }
  if (memory.goal == null) return { throttle: 0, brake: 1, steer: 0 };
  // Multi-point turn: drive each leg until the car is pinned, then swap direction with the opposite lock.
  const legTime = time - memory.legStart;
  if (memory.leg == null) { memory.leg = freeDistance(duel, here.x, here.z, heading, 4, spec) >= 3 ? 'fwd' : 'rev'; memory.legStart = time; }
  else if ((legTime >= UNSTUCK.legMinSec && Math.abs(st.speedMph) < UNSTUCK.pinnedMph) || legTime >= UNSTUCK.legMaxSec) {
    memory.leg = memory.leg === 'fwd' ? 'rev' : 'fwd'; memory.legStart = time;
  }
  const facing = Math.abs(wrapHeading(memory.goal - heading)) < .35;
  if (memory.leg === 'rev' && !facing) return { throttle: 0, brake: 1, steer: -steerTo(memory.goal) };
  return { throttle: st.speedMph < UNSTUCK.crawlMph ? 1 : 0, brake: 0, steer: steerTo(memory.goal) };
}
