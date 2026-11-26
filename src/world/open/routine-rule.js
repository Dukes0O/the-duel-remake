// An outing's clock selects a pose. Its live cast follows that pose through the mover.
import {namedThrow} from '../../story/ledger.js';
import {LAND} from '../scablands-names.js';
import {FOOT_GRADE, stepMover} from '../scablands-movers.js';

const separation = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const heading = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const pose = (position, yaw, task) => ({...position, yaw, task});
const mix = (a, b, share) => ({x: a.x + (b.x - a.x) * share, z: a.z + (b.z - a.z) * share});

// namedThrow compares one fixed draw with a probability. Recover its quantile
// to metre-scale precision without introducing a second source of randomness.
export function routineDraw(seed, name) {
  let low = 0, high = 1;
  for (let bit = 0; bit < 16; bit++) {
    const middle = (low + high) / 2;
    if (namedThrow({seed}, name, middle)) high = middle;
    else low = middle;
  }
  return (low + high) / 2;
}

export function routinePose(routine, seconds, seed, partOfDay = 'day') {
  const plan = routine[partOfDay] ?? routine.day ?? routine;
  const pace = routine.pace ?? plan.pace ?? 1.2;
  const at = routine.resolveAt ?? ((place) => LAND.at(...place));
  const time = Math.max(0, seconds);
  if (plan.kind === 'post') return pose(at(plan.at), plan.yaw ?? 0, plan.task);
  if (plan.kind === 'track') {
    const stops = plan.loop === false ? [...plan.stops, ...plan.stops.slice(1, -1).reverse()] : plan.stops;
    const legs = stops.map((stop, i) => {
      const from = at(stop.at), to = at(stops[(i + 1) % stops.length].at);
      return {from, to, stop, travel: separation(from, to) / pace};
    });
    const cycle = legs.reduce((sum, leg) => sum + leg.stop.seconds + leg.travel, 0);
    let left = cycle ? time % cycle : 0;
    for (const {from, to, stop, travel} of legs) {
      const yaw = travel ? heading(from, to) : stop.yaw ?? 0;
      if (left < stop.seconds || !cycle) return pose(from, yaw, stop.task);
      left -= stop.seconds;
      if (left < travel) return pose(mix(from, to, left / travel), yaw, 'walk');
      left -= travel;
    }
    return pose(legs[0].from, 0, stops[0].task);
  }
  if (plan.kind !== 'wander') throw new TypeError('Unknown routine kind: ' + plan.kind);
  const centre = at(plan.around);
  const draw = (index, name) => routineDraw(seed, 'routine/' + (routine.id ?? 'wander') + '/' + partOfDay + '/' + index + '/' + name);
  // Fixed-length slots make seeking to any clock constant time. Draw the pause
  // and use the rest of the slot to reach the next point within walking pace.
  const slot = 2 * plan.radius / pace + plan.pause[1];
  const index = Math.floor(time / slot);
  const point = i => {
    if (i < 0) return centre;
    const angle = draw(i, 'angle') * 2 * Math.PI;
    const radius = Math.sqrt(draw(i, 'radius')) * plan.radius;
    return {x: centre.x + Math.sin(angle) * radius, z: centre.z + Math.cos(angle) * radius};
  };
  const from = point(index - 1), to = point(index);
  const pause = plan.pause[0] + (plan.pause[1] - plan.pause[0]) * draw(index, 'pause');
  const travel = slot - pause;
  const elapsed = time % slot, yaw = heading(from, to);
  return elapsed < travel ? pose(mix(from, to, elapsed / travel), yaw, 'walk') : pose(to, yaw, plan.task ?? 'stand');
}

export function followRoutine(person, target, dt, {pace, radius, car, grid}) {
  const from = person.position;
  const walk = (goal, amount) => {
    const distance = separation(from, goal);
    if (!distance) return from;
    const candidate = stepMover(from, mix(from, goal, Math.min(1, amount / distance)),
      {radius, grade: FOOT_GRADE, grid, height: from.y, moverId: person.id});
    // A push out of a solid may be longer than the permitted walking step.
    return separation(from, candidate) <= amount + 1e-7 ? candidate : from;
  };
  const amount = pace * dt;
  const nearCar = car && separation(from, car) < 3 && Math.abs(from.y - (car.y ?? from.y)) < 1.5;
  const avoid = nearCar && separation(from, car) > .001
    ? mix(car, from, 3.2 / separation(from, car)) : target;
  let next = walk(avoid, amount);
  if (separation(from, next) < amount * .1 && separation(from, avoid) > amount) {
    const yaw = heading(from, avoid);
    for (const turn of [Math.PI / 2, -Math.PI / 2]) {
      const side = {x: from.x + Math.sin(yaw + turn) * amount, z: from.z + Math.cos(yaw + turn) * amount};
      next = walk(side, amount);
      if (next !== from && separation(from, next) > amount * .1) break;
    }
  }
  const distance = separation(from, next);
  return {...person, position: {x: next.x, y: next.y, z: next.z},
    yaw: distance > .001 ? heading(from, next) : person.yaw,
    distance: person.distance + distance, task: distance > .001 ? 'walk' : target.task};
}
