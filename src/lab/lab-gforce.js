// The G-force lap (docs/LAB.md 4.2): drive a lap of any owned course and reach 2 g in three different corners without
// leaving the road. A pure monitor: the race's own numbers go in each step (distance along the course, speed, yaw rate and
// whether the car is off the road) and a read-only view comes out. It never touches the race; the caller feeds it.
import {DRIVE} from '../config.js';
import {lateralG} from './benches/gforce.js';

export const GFORCE_LAP = Object.freeze({targetG: 2, corners: 3});

const finite = value => Number.isFinite(value) ? value : 0;
// The push the driver feels, in g, by the bench's own formula (v squared over r): the car turns at its yaw rate, so the
// circle it is following has the radius speed / yaw rate.
export function lateralGOf({speedMph, yawVelocity}) {
  const speed = finite(speedMph) * DRIVE.mphToWorld, turning = Math.abs(finite(yawVelocity));
  return speed > 0 && turning > 0 ? lateralG(speedMph, speed / turning) : 0;
}

// corners: detectCorners() of the course ({number, entryS, exitS}); length: the course length in metres. A corner may run
// across the start line (its exit is before its entry).
export function createGforceMonitor({corners = [], length = 0} = {}) {
  const list = corners.filter(c => Number.isFinite(c?.entryS) && Number.isFinite(c?.exitS) && Number.isSafeInteger(c?.number))
    .map(c => ({number: c.number, entryS: c.entryS, exitS: c.exitS}));
  return {corners: list, length: finite(length), current: null, peak: 0, clean: true, g: 0, best: 0, reached: [], done: false};
}

const inside = (corner, s) => {
  if (corner.entryS <= corner.exitS) return s >= corner.entryS && s <= corner.exitS;
  return s >= corner.entryS || s <= corner.exitS;
};

// One race step. Returns the events: {type: 'gforceCorner', number, count} when a corner counts (reached 2 g and left it on
// the road) and {type: 'gforcePass'} when the third one does.
export function stepGforceMonitor(monitor, sample) {
  if (monitor.done) return [];
  const events = [];
  const along = finite(sample?.s), s = monitor.length > 0 ? ((along % monitor.length) + monitor.length) % monitor.length : along;
  const g = lateralGOf(sample ?? {});
  monitor.g = g;
  const corner = monitor.corners.find(item => inside(item, s)) ?? null;
  const number = corner ? corner.number : null;
  if (number !== monitor.current) {
    // Leaving a corner: it counts if 2 g was reached in it and the car never left the road there.
    const left = monitor.current;
    if (left !== null && monitor.peak >= GFORCE_LAP.targetG && monitor.clean && !monitor.reached.includes(left)) {
      monitor.reached.push(left);
      events.push({type: 'gforceCorner', number: left, count: monitor.reached.length});
      if (monitor.reached.length >= GFORCE_LAP.corners) { monitor.done = true; events.push({type: 'gforcePass'}); }
    }
    monitor.current = number; monitor.peak = 0; monitor.clean = true;
  }
  if (number !== null && !monitor.done) {
    if (sample?.offRoad === true) { monitor.clean = false; monitor.peak = 0; }
    else if (monitor.clean && sample?.sliding !== true) monitor.peak = Math.max(monitor.peak, g);
  }
  monitor.best = Math.max(monitor.best, sample?.offRoad === true ? 0 : g);
  return events;
}

// What the strip on screen shows: the g now, the corners counted, and what the corner in hand is doing.
export function gforceView(monitor) {
  const hand = monitor.current !== null && !monitor.reached.includes(monitor.current);
  const state = monitor.done ? 'passed' : !hand ? 'between' : !monitor.clean ? 'off the road' : monitor.peak >= GFORCE_LAP.targetG ? 'counting' : 'building';
  return Object.freeze({g: monitor.g, best: monitor.best, count: monitor.reached.length, need: GFORCE_LAP.corners, corner: monitor.current,
    state, reached: Object.freeze([...monitor.reached]), done: monitor.done});
}
