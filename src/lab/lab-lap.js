// The G-force lap, armed from the Lab and run during an ordinary race (docs/LAB.md 4.2). This controller owns the monitor
// (lab-gforce.js) for the race in progress: it is fed the race state read-only once per fixed step and reports the corners
// that count. It never writes to the race, so a race's result and replay are the same armed or not.
import {sampleCourse, detectCorners} from '../track-analysis.js';
import {createGforceMonitor, stepGforceMonitor, gforceView} from './lab-gforce.js';

export function createLabLap({onPass = () => {}} = {}) {
  let armed = false, run = null, passedHere = false;
  const lap = {
    get armed() { return armed; },
    // Armed and still to be passed: what the menu reminds the player of.
    get waiting() { return armed && !passedHere; },
    arm() { armed = true; run = null; passedHere = false; },
    disarm() { armed = false; run = null; passedHere = false; },
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
      const events = stepGforceMonitor(run.monitor, {s: state.s, speedMph: state.speedMph, yawVelocity: state.yawVelocity, offRoad: state.offRoad === true});
      if (!passedHere && events.some(event => event.type === 'gforcePass')) { passedHere = true; onPass(); }
      return events;
    },
    // The strip's numbers while a race is on and the lap is armed, else null.
    view() { return armed && run && run.state.status === 'racing' ? gforceView(run.monitor) : null; },
  };
  return lap;
}
