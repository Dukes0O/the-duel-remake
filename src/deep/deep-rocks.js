// DEEP-EXPLORER: the same solid layout on both qualities; kelp stays soft.
import {zoneSeed, ZONE_CAPS} from './zone-floor.js';
import {sweepObstacle} from '../collision.js';
export const deepRocks = (zone, floor) => floor.rockPlacements(zoneSeed(zone.id), ZONE_CAPS.rocks);
export function rockContact(rocks, start, end, heading = 0) {
  let first = null;
  for (const rock of rocks) {
    const hit = sweepObstacle(start, end, {x: rock.x, z: rock.z, heading: rock.yaw,
      halfX: rock.size, halfZ: rock.size * .9, shape: 'ellipse'} , heading);
    if (hit && (!first || hit.t < first.t)) first = hit;
  }
  return first;
}
export function stopAtDeepRock(duel, start) {
  const state = duel.state, runtime = duel.deepRuntime, end = duel.course.worldAt(state.s, state.lateral);
  const heading = duel.course.at(state.s).heading + state.headingError;
  const hit = rockContact(runtime.rocks, start, end, heading);
  if (!hit) return;
  const point = {x: start.x + (end.x - start.x) * hit.t + hit.nx * (hit.penetration + .03),
    z: start.z + (end.z - start.z) * hit.t + hit.nz * (hit.penetration + .03)};
  const near = duel.course.nearest(point.x, point.z, state.s);
  state.s = near.s; state.lateral = near.lateral;
  state.speedMph = 0; state.pushVelocity = state.yawVelocity = 0;
  // A gentle stop, with no damage, wreck or race contact event.
}
