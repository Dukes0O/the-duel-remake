// The instructor's lessons (docs/HELICOPTER.md section 7). Pure goal checks
// that read the session's view each step and say when a lesson passes,
// when to coach and when to try again. The session holds the lesson; the
// save remembers which are done.
import {HELI_LESSONS} from './heli-save.js';
import {COACH_EVERY, lessonOpen as openIn, tickCoach, coachDue, coachSaid, passed, retry as tryAgain} from '../lessons/lesson-core.js';

export const LESSON_RULES = Object.freeze({
  liftoff: Object.freeze({low: 2.5, high: 4.5, holdSeconds: 5}),
  hover: Object.freeze({radius: 4, low: 2, high: 5, holdSeconds: 10}),
  // The landing counts only after a real climb of at least 2 m.
  landing: Object.freeze({radius: 3, sink: 1, climbFirst: 2}),
  carry: Object.freeze({crateKg: 500, distance: 200, radius: 10}),
  coachEvery: COACH_EVERY,
});

export const LESSON_ORDER = HELI_LESSONS;

// What each lesson opens (section 7's table).
export const LESSON_OPENS = Object.freeze({
  liftoff: 'hover', hover: 'landing', landing: 'fuel-and-dispatch', carry: 'carrying-cars',
});

export function lessonOpen(lessons, id) {
  return openIn(LESSON_ORDER, lessons, id);
}

// Skipping the opening marks lessons 1 and 2 done.
export const SKIP_MARKS = Object.freeze(['liftoff', 'hover']);

// Read-only guidance uses the same horizontal boundary as the pass check.
export function carryGuidance(lesson, load, groundY = 0) {
  if (lesson?.id !== 'carry' || !lesson.target || load?.id !== 'crate' || !load.hooked) return null;
  const distance = Math.hypot(load.x - lesson.target.x, load.z - lesson.target.z);
  return Object.freeze({distance, height: load.onGround ? 0 : Math.max(0, load.y - (load.restHeight ?? 0.7) - groundY),
    ready: distance <= LESSON_RULES.carry.radius && load.onGround === true});
}

const height = view => view.heli.y - view.heli.groundY;
const fromPad = (view, spot) => Math.hypot(view.heli.x - spot.x, view.heli.z - spot.z);

// spot: {x, z} the pad's H; target: {x, z} the crate's circle (carry only).
export function createLesson(id, {spot, target = null} = {}) {
  if (!Object.hasOwn(LESSON_RULES, id) || id === 'coachEvery') throw new Error(`Unknown lesson ${id}`);
  return {id, spot, target, held: 0, coachIn: 0, started: false, done: false, failed: false, sawLift: false, heldSaid: false};
}

// One step. view: the session's view; events: this step's session events.
// Returns {result: 'running'|'passed'|'retry', radio: line id or null}.
export function stepLesson(lesson, view, events = [], dt = 1 / 120) {
  const out = {result: 'running', radio: null};
  if (lesson.done) return {result: 'passed', radio: null};
  if (!lesson.started) {
    lesson.started = true;
    out.radio = `heli.radio.${lesson.id}.start`;
    coachSaid(lesson, LESSON_RULES.coachEvery);
  }
  const crash = events.some(e => e.type === 'crashed');
  const hard = events.some(e => e.type === 'touchdown' && e.result === 'hard');
  if (crash || hard) return retry(lesson, out);
  tickCoach(lesson, dt);
  const rules = LESSON_RULES[lesson.id];
  if (!view.heli) return out;
  if (lesson.id === 'liftoff') {
    const h = height(view);
    if (h >= rules.low && h <= rules.high && !view.heli.onGround) {
      if (lesson.held === 0 && !lesson.heldSaid) { out.radio ??= 'heli.radio.liftoff.hold'; lesson.heldSaid = true; }
      lesson.held += dt;
    } else lesson.held = 0;
    if (lesson.held >= rules.holdSeconds) return pass(lesson);
  } else if (lesson.id === 'hover') {
    const h = height(view), inside = fromPad(view, lesson.spot) <= rules.radius;
    if (inside && h >= rules.low && h <= rules.high && !view.heli.onGround) lesson.held += dt;
    else {
      if (lesson.held > 0 && coachDue(lesson)) { out.radio ??= 'heli.radio.hover.drift'; coachSaid(lesson, LESSON_RULES.coachEvery); }
      lesson.held = 0;
    }
    if (lesson.held >= rules.holdSeconds) return pass(lesson);
  } else if (lesson.id === 'landing') {
    if (!view.heli.onGround && height(view) >= rules.climbFirst) lesson.sawLift = true;
    const touch = events.find(e => e.type === 'touchdown');
    if (touch && lesson.sawLift) {
      if (touch.result === 'good' && touch.sink < rules.sink && fromPad(view, lesson.spot) <= rules.radius) return pass(lesson);
      return retry(lesson, out);
    }
  } else if (lesson.id === 'carry') {
    if (view.load?.hooked && coachDue(lesson) && events.some(e => e.type === 'cargoHit')) {
      out.radio ??= 'heli.radio.carry.swing'; coachSaid(lesson, LESSON_RULES.coachEvery);
    }
    // Only the crate counts: letting go of any other load is not the lesson.
    const released = events.find(e => (e.type === 'released' || e.type === 'releasedHigh') && e.id === 'crate');
    const dropped = events.find(e => e.type === 'drop' && e.id === 'crate');
    const setDown = released?.crateRelease ?? view.load;
    if (dropped) return retry(lesson, out, 'It dropped: lower it gently first');
    if (released?.type === 'released' && !setDown?.onGround)
      return retry(lesson, out, 'Let go only once the crate sits on the ground');
    if (released?.type === 'released' && setDown && lesson.target &&
        Math.hypot(setDown.x - lesson.target.x, setDown.z - lesson.target.z) <= rules.radius) return pass(lesson);
    if (released?.type === 'released' && setDown && lesson.target)
      return retry(lesson, out, `The crate was ${Math.round(Math.hypot(setDown.x - lesson.target.x, setDown.z - lesson.target.z))} m from the centre: set it down inside the circle`);
  }
  return out;
}

function pass(lesson) {
  return passed(lesson, `heli.radio.${lesson.id}.pass`);
}

function retry(lesson, out, reason = null) {
  lesson.sawLift = false;
  return {...tryAgain(lesson, out.radio ?? 'heli.radio.retry'), ...(reason ? {reason} : {})};
}
