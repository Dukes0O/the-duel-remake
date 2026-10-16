// The lesson contract shared by the helicopter's lessons (docs/HELICOPTER.md
// section 7) and driving lessons (docs/DRIVING_LESSONS.md section 2). Each
// mode keeps its own goal checks and radio lines; these are the parts both
// use. Pure: no clock, no chance, no page.

// Each step answers {result, radio}: result is 'running', 'passed' or
// 'retry' (try again), radio is a line id or null.
export const LESSON_RESULTS = Object.freeze(['running', 'passed', 'retry']);

// At most one coaching line every 6 seconds.
export const COACH_EVERY = 6;

// A lesson is open when it is the first in its order or the one before it is done.
export function lessonOpen(order, done, id) {
  const index = order.indexOf(id);
  if (index < 0) return false;
  return index === 0 || done[order[index - 1]] === true;
}

// The coach timer: count down each step, coach only when it has run out,
// then start it again.
export function tickCoach(lesson, dt) { lesson.coachIn -= dt; }
export function coachDue(lesson) { return lesson.coachIn <= 0; }
export function coachSaid(lesson, every = COACH_EVERY) { lesson.coachIn = every; }

export function passed(lesson, line) {
  lesson.done = true;
  return {result: 'passed', radio: line};
}

export function retry(lesson, line) {
  lesson.held = 0;
  lesson.failed = true;
  return {result: 'retry', radio: line};
}
