// The instructor's lessons (docs/HELICOPTER.md section 7). Pure goal checks
// that read the session's view each step and say when a lesson passes,
// when to coach and when to try again. The session holds the lesson; the
// save remembers which are done.
import {HELI_LESSONS} from './heli-save.js';

export const LESSON_RULES = Object.freeze({
  liftoff: Object.freeze({low: 2.5, high: 4.5, holdSeconds: 5}),
  hover: Object.freeze({radius: 4, low: 2, high: 5, holdSeconds: 10}),
  // The landing counts only after a real climb of at least 2 m.
  landing: Object.freeze({radius: 3, sink: 1, climbFirst: 2}),
  carry: Object.freeze({crateKg: 500, distance: 200, radius: 10}),
  coachEvery: 6,
});

export const LESSON_ORDER = HELI_LESSONS;

// What each lesson opens (section 7's table).
export const LESSON_OPENS = Object.freeze({
  liftoff: 'hover', hover: 'landing', landing: 'fuel-and-dispatch', carry: 'carrying-cars',
});

export function lessonOpen(lessons, id) {
  const index = LESSON_ORDER.indexOf(id);
  if (index < 0) return false;
  return index === 0 || lessons[LESSON_ORDER[index - 1]] === true;
}

// Skipping the opening marks lessons 1 and 2 done.
export const SKIP_MARKS = Object.freeze(['liftoff', 'hover']);

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
    lesson.coachIn = LESSON_RULES.coachEvery;
  }
  const crash = events.some(e => e.type === 'crashed');
  const hard = events.some(e => e.type === 'touchdown' && e.result === 'hard');
  if (crash || hard) return retry(lesson, out);
  lesson.coachIn -= dt;
  const rules = LESSON_RULES[lesson.id];
  if (!view.heli) return out;
  if (lesson.id === 'liftoff') {
    const h = height(view);
    if (h >= rules.low && h <= rules.high && !view.heli.onGround) {
      if (lesson.held === 0 && !lesson.heldSaid) { out.radio ??= 'heli.radio.liftoff.hold'; lesson.heldSaid = true; }
      lesson.held += dt;
    } else lesson.held = 0;
    if (lesson.held >= rules.holdSeconds) return pass(lesson, out);
  } else if (lesson.id === 'hover') {
    const h = height(view), inside = fromPad(view, lesson.spot) <= rules.radius;
    if (inside && h >= rules.low && h <= rules.high && !view.heli.onGround) lesson.held += dt;
    else {
      if (lesson.held > 0 && lesson.coachIn <= 0) { out.radio ??= 'heli.radio.hover.drift'; lesson.coachIn = LESSON_RULES.coachEvery; }
      lesson.held = 0;
    }
    if (lesson.held >= rules.holdSeconds) return pass(lesson, out);
  } else if (lesson.id === 'landing') {
    if (!view.heli.onGround && height(view) >= rules.climbFirst) lesson.sawLift = true;
    const touch = events.find(e => e.type === 'touchdown');
    if (touch && lesson.sawLift) {
      if (touch.result === 'good' && touch.sink < rules.sink && fromPad(view, lesson.spot) <= rules.radius) return pass(lesson, out);
      return retry(lesson, out);
    }
  } else if (lesson.id === 'carry') {
    if (view.load?.hooked && lesson.coachIn <= 0 && events.some(e => e.type === 'cargoHit')) {
      out.radio ??= 'heli.radio.carry.swing'; lesson.coachIn = LESSON_RULES.coachEvery;
    }
    // Only the crate counts: letting go of any other load is not the lesson.
    const released = events.find(e => (e.type === 'released' || e.type === 'releasedHigh') && e.id === 'crate');
    const dropped = events.find(e => e.type === 'drop' && e.id === 'crate');
    if (dropped) return retry(lesson, out);
    if (released?.type === 'released' && view.load && lesson.target &&
        Math.hypot(view.load.x - lesson.target.x, view.load.z - lesson.target.z) <= rules.radius) return pass(lesson, out);
    if (released?.type === 'released' && view.load && lesson.target) return retry(lesson, out);
  }
  return out;
}

function pass(lesson, out) {
  lesson.done = true;
  return {result: 'passed', radio: `heli.radio.${lesson.id}.pass`};
}

function retry(lesson, out) {
  lesson.held = 0;
  lesson.failed = true;
  lesson.sawLift = false;
  return {result: 'retry', radio: out.radio ?? 'heli.radio.retry'};
}
