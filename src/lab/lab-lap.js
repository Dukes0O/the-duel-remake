// The G-force lap, armed from the Lab and run during an ordinary race (docs/LAB.md 4.2). This controller owns the monitor
// (lab-gforce.js) for the race in progress: it is fed the race state read-only once per fixed step and reports the corners
// that count. It never writes to the race, so a race's result and replay are the same armed or not.
import {sampleCourse, detectCorners} from '../track-analysis.js';
import {createGforceMonitor, stepGforceMonitor, gforceView} from './lab-gforce.js';
import {DRIVE} from '../config.js';

// A car further from the middle than the road's half width is off the road. The race's own off-road flag is true all the time on
// the off-road courses, so the lap measures the road itself; a car turned further than this from the road is sliding or spinning.
export const SLIDE_LIMIT = 0.6;
export function leftRoad(state, course) {
  const half = course.roadHalfWidthAt?.(state.s) ?? DRIVE.roadHalfWidth;
  return state.offRoad === true && Math.abs(state.lateral) > half;
}

export function createLabLap({onPass = () => {}} = {}) {
  let armed = false, run = null, passedHere = false, saveNote = '';
  const lap = {
    get armed() { return armed; },
    // Armed and still to be passed: what the menu reminds the player of.
    get waiting() { return armed && !passedHere; },
    arm() { armed = true; run = null; passedHere = false; saveNote = ''; },
    disarm() { armed = false; run = null; passedHere = false; saveNote = ''; },
    // state: the race state (read only); course: the race's course. A race starts when the status becomes 'racing'.
    step(state, course) {
      if (!armed || !state || !course) return [];
      if (state.status !== 'racing') {
        // The race has ended: a passed lap's watch ends with it; an unpassed one waits for the next race.
        if (passedHere) lap.disarm(); else run = null;
        return [];
      }
      if (state.paused === true) return [];
      if (!run) run = {monitor: createGforceMonitor({corners: detectCorners(sampleCourse(course)), length: course.length}), state};
      const events = stepGforceMonitor(run.monitor, {s: state.s, speedMph: state.speedMph, yawVelocity: state.yawVelocity,
        offRoad: leftRoad(state, course), sliding: Math.abs(state.headingError ?? 0) > SLIDE_LIMIT});
      if (!passedHere && events.some(event => event.type === 'gforcePass')) {
        passedHere = true;
        // The pass is saved by the caller; if it is refused the strip says so instead of claiming a pass.
        const saved = onPass();
        if (saved && saved.ok === false) saveNote = String(saved.reason ?? 'The pass could not be saved.');
      }
      return events;
    },
    // The strip's numbers while a race is on and the lap is armed, else null.
    view() { return armed && run && run.state.status === 'racing' ? Object.freeze({...gforceView(run.monitor), saveNote}) : null; },
  };
  return lap;
}
