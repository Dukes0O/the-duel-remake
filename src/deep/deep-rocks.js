// DEEP-EXPLORER, then DEEP-ROCKS-PUSH: seabed rocks never stop the car and never
// move it anywhere. A small rock bounces the car off; a large rock slides away
// under the push. The rocks are part of one dive: they are rebuilt from the zone
// seed when the dive starts and changed only by the car, so a dive repeats from
// its seed and inputs. Nothing here is saved, and no contact damages the car,
// wrecks it or reaches the race contact events (docs/THE_DEEP.md section 3).
import {zoneSeed, ZONE_CAPS} from './zone-floor.js';
import {createLog} from './deep-log.js';
import {createSirena} from './deep-sirena.js';
import {sweepObstacle} from '../collision.js';

// Half of the seabed rocks are smaller than this (radius in metres, about 1.8 m
// across): they bounce the car. The rest are pushed aside.
export const SMALL_ROCK = 1;
const BIGGEST_ROCK = 2.95;          // the largest size the layout makes
export const BOUNCE_KEEPS = .7;     // a bounce keeps at least this share of the speed
const PUSH_KEEPS_FIRST = .85;       // pushing a just-large rock keeps this share
const PUSH_KEEPS_LAST = .5;         // pushing the biggest rock keeps about half
export const CRAWL_MPH = 6;         // a push never slows the car below this
const TURN_RATE = 9;                // rad/s the car swings round to glance off
const CLEAR = .03;                  // metres left between car and rock after a push
const EPISODE_GAP = .15;            // seconds without contact that end one touch
const GOAL_MARGIN = 2;              // a rock this close to a goal never moves

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Everything the player looks for in a dive, as world points. They are laid out
// from the trail, never from a rock, so no rock carries any of them. A rock that
// happens to sit on one stays put (the bounce kind), so a push can never slide
// a rock over a goal and hide it.
export function deepGoalPoints(zone) {
  const on = {enabled: true}, log = createLog(zone, {}, on);
  return [...log.spots, ...log.pearls, ...createSirena(zone, {}, on).finds];
}

// A fresh layout from the zone seed: the run's own copy, which only the car changes.
export function deepRocks(zone, floor) {
  const rocks = floor.rockPlacements(zoneSeed(zone.id), ZONE_CAPS.rocks), goals = deepGoalPoints(zone);
  for (const rock of rocks) {
    const covers = goals.some(goal => Math.hypot(goal.x - rock.x, goal.z - rock.z) < rock.size + GOAL_MARGIN);
    // Fixed for the whole dive: only the car changes where a rock is.
    rock.pushable = rock.size >= SMALL_ROCK && !covers;
  }
  return rocks;
}

// How much speed a car keeps while pushing a rock of this size.
export const pushKeeps = size => PUSH_KEEPS_FIRST -
  (PUSH_KEEPS_FIRST - PUSH_KEEPS_LAST) * clamp((size - SMALL_ROCK) / (BIGGEST_ROCK - SMALL_ROCK), 0, 1);

export function rockContact(rocks, start, end, heading = 0) {
  let first = null;
  for (const rock of rocks) {
    const hit = sweepObstacle(start, end, {x: rock.x, z: rock.z, heading: rock.yaw,
      halfX: rock.size, halfZ: rock.size * .9, shape: 'ellipse'} , heading);
    if (hit && (!first || hit.t < first.t)) first = {...hit, rock};
  }
  return first;
}

// Move the car by a world distance, in the course frame the Deep drives in
// (state.s along the trail, state.lateral across it). The Deep's course gives the
// exact frame place of any world point (DEEP-TRAIL-JOINTS), so the car lands on
// the pushed-out point and nowhere else. The car keeps facing the same way in
// the world.
function shiftCar(duel, dx, dz) {
  const state = duel.state, course = duel.course, heading = course.at(state.s).heading + state.headingError;
  const from = course.worldAt(state.s, state.lateral), to = course.nearest(from.x + dx, from.z + dz, state.s);
  state.s = to.s; state.lateral = to.lateral;
  state.headingError = wrap(heading - course.at(to.s).heading);
}

// Put a pushed rock back on the sea floor at its new place, at the same height
// above the ground. Returns false where there is no ground to rest on.
function settle(rock, floor, x, z) {
  if (!floor.sample(x, z)) return false;
  rock.x = x; rock.z = z; rock.y = floor.floorHeight(x, z) + rock.size * .12;
  return true;
}

// Called after the car's own drive step, with the world point it started from.
// Deals with every rock the step ran into. Small rock: the car steps out along
// the contact normal and glances off. Large rock: the car is not moved at all,
// the rock slides away instead and the car pays some speed for its size.
export function driveIntoDeepRocks(duel, start, dt = 1 / 120) {
  const state = duel.state, runtime = duel.deepRuntime, course = duel.course;
  let touched = false;
  for (let pass = 0; pass < 4; pass++) {
    const end = course.worldAt(state.s, state.lateral);
    const heading = course.at(state.s).heading + state.headingError;
    const hit = rockContact(runtime.rocks, start, end, heading);
    if (!hit) break;
    touched = true;
    const {nx, nz, rock} = hit;
    const cx = start.x + (end.x - start.x) * hit.t, cz = start.z + (end.z - start.z) * hit.t;
    // How far the car's end point sits inside the rock, along the contact normal.
    const depth = hit.penetration + (cx - end.x) * nx + (cz - end.z) * nz;
    const episode = runtime.rockEpisode ??= {entry: 0, idle: 0};
    episode.idle = 0;
    episode.entry = Math.max(episode.entry, Math.abs(state.speedMph));
    const push = Math.max(0, depth) + CLEAR;
    if (rock.pushable && settle(rock, runtime.floor, rock.x - nx * push, rock.z - nz * push)) {
      // The rock gives way. Speed is held to a share of what the touch began
      // with, never below a slow crawl, so the car can always drive on.
      const cap = Math.max(CRAWL_MPH, pushKeeps(rock.size) * episode.entry);
      if (Math.abs(state.speedMph) > cap) state.speedMph = Math.sign(state.speedMph) * cap;
      continue;
    }
    // A bounce: step out along the normal, drop the part of the speed that points
    // into the rock (keeping at least 70% of the speed the touch began with) and
    // swing the car round towards the way it now slides.
    if (depth > 0) shiftCar(duel, nx * push, nz * push);
    else shiftCar(duel, cx + nx * CLEAR - end.x, cz + nz * CLEAR - end.z);
    const sign = state.speedMph < 0 ? -1 : 1, speed = Math.abs(state.speedMph);
    const dx = Math.sin(heading) * sign, dz = Math.cos(heading) * sign, into = dx * nx + dz * nz;
    if (into >= 0 || speed === 0) continue;
    let tx = dx - into * nx, tz = dz - into * nz;
    const slide = Math.hypot(tx, tz);
    if (slide < 1e-3) { const side = (dx * nz - dz * nx) >= 0 ? 1 : -1; tx = nz * side; tz = -nx * side; }
    else { tx /= slide; tz /= slide; }
    state.speedMph = sign * Math.min(speed, Math.max(speed * slide, BOUNCE_KEEPS * episode.entry));
    const aim = Math.atan2(tx * sign, tz * sign), turn = clamp(wrap(aim - heading), -TURN_RATE * dt, TURN_RATE * dt);
    state.headingError = wrap(state.headingError + turn);
  }
  if (!touched && runtime.rockEpisode && (runtime.rockEpisode.idle += dt) > EPISODE_GAP) runtime.rockEpisode = null;
}
