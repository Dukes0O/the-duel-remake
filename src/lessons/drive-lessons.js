import {passed, retry, tickCoach, coachDue, coachSaid} from './lesson-core.js';

export const DRIVE_LESSON_CORNERS = Object.freeze([
  Object.freeze({courseId: 'panorama-ridge', cornerName: 'The Cutting', gateBefore: 'The Cutting', gateOffsetM: 180, rollingMph: 100}),
  Object.freeze({courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin', gateBefore: 'Beaver Kink', gateOffsetM: 150, rollingMph: 75}),
]);

const line = suffix => 'drive.radio.corner.' + suffix;
const rounded = value => Math.round(value * 1e12) / 1e12;
const clamp = value => Math.max(0, Math.min(1, value));
const answer = (radio = null, cones = []) => ({result: 'running', radio, cones});

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError('Invalid ' + name);
}

// These plans come from the instructor run. Distances must be unwrapped along
// the course, so start < cone 1 < cone 2 < cone 3 < finish, even across a lap.
// This module only scores the plans; it does not generate an instructor run.
export function createDriveLesson(id, {corner, instructor} = {}) {
  if (id !== 'corner' || !corner || !instructor) throw new TypeError('Invalid driving lesson');
  for (const key of ['startS', 'finishS', 'dir']) finite(corner[key], key);
  if (corner.finishS <= corner.startS || Math.abs(corner.dir) !== 1) throw new TypeError('Invalid corner gates');
  finite(instructor.timeSec, 'instructor time');
  finite(instructor.redBoardS, 'red board');
  if (instructor.timeSec <= 0 || instructor.cones?.length !== 3) throw new TypeError('Invalid instructor plan');
  let previousS = corner.startS;
  const cones = instructor.cones.map((cone, index) => {
    for (const key of ['s', 'lateral', 'x', 'z']) finite(cone[key], 'cone ' + key);
    if (cone.id !== index + 1 || cone.s <= previousS || cone.s >= corner.finishS) throw new TypeError('Invalid cone order');
    previousS = cone.s;
    return {...cone};
  });
  return {
    id, corner: {...corner}, instructor: {...instructor, cones},
    stage: 'late', phase: 'ready', done: false, failed: false, held: 0,
    streak: 0, bestMargin: 0, coachIn: 0, attempt: null, lastAttempt: null,
  };
}

function checkView(view, dt) {
  for (const key of ['s', 'lateral', 'speedMph', 'brake', 'throttle', 'tyreSlip']) finite(view[key], key);
  finite(view.world?.x, 'world x');
  finite(view.world?.z, 'world z');
  finite(dt, 'step time');
  if (dt < 0) throw new TypeError('Negative step time');
}

function copyView(view) {
  return {...view, world: {...view.world}};
}

function startAttempt(lesson, view) {
  if (view.s > lesson.corner.startS) throw new TypeError('Attempt must start before or at its gate');
  if (lesson.phase === 'result') {
    if (lesson.stage === 'late') lesson.stage = 'right';
    else if (lesson.stage === 'right' && lesson.lastAttempt.passed) lesson.stage = 'challenge';
  }
  lesson.phase = 'driving';
  lesson.failed = false;
  lesson.attempt = {
    elapsedSeconds: 0, screechSeconds: 0, offRoadSeconds: 0,
    timerStarted: view.s === lesson.corner.startS,
    firstBrakeS: view.brake >= .5 ? view.s : null,
    cones: [], tipped: [], throttleBeforeExit: view.throttle >= .8 && view.s < lesson.instructor.cones[2].s,
    exitWide: false, previous: copyView(view),
  };
  return answer(line(lesson.stage + '.start'));
}

function interpolate(from, to, fraction) {
  return {
    s: from.s + (to.s - from.s) * fraction,
    lateral: from.lateral + (to.lateral - from.lateral) * fraction,
    world: {
      x: from.world.x + (to.world.x - from.world.x) * fraction,
      z: from.world.z + (to.world.z - from.world.z) * fraction,
    },
  };
}

function coneDistance(from, to, cone) {
  const dx = to.world.x - from.world.x;
  const dz = to.world.z - from.world.z;
  const length2 = dx * dx + dz * dz;
  const fraction = length2 ? clamp(((cone.x - from.world.x) * dx + (cone.z - from.world.z) * dz) / length2) : 0;
  return Math.hypot(from.world.x + dx * fraction - cone.x, from.world.z + dz * fraction - cone.z);
}

function observeCones(lesson, from, to) {
  const attempt = lesson.attempt;
  const events = [];
  for (const cone of lesson.instructor.cones) {
    const distance = coneDistance(from, to, cone);
    if (distance <= 2.5 && !attempt.cones.some(row => row.id === cone.id)) {
      attempt.cones.push({id: cone.id});
    }
    if (distance <= .8 && !attempt.tipped.includes(cone.id)) {
      attempt.tipped.push(cone.id);
      events.push({id: cone.id, tipped: true, cue: 'lesson.cone'});
    }
  }
  return events;
}

function finishAttempt(lesson, reason, cones) {
  const attempt = lesson.attempt;
  const firstCone = lesson.instructor.cones[0];
  const rules = [
    attempt.firstBrakeS !== null && attempt.firstBrakeS >= firstCone.s - 15 && attempt.firstBrakeS <= firstCone.s + 5,
    attempt.cones.some(row => row.id === 2),
    attempt.throttleBeforeExit && attempt.exitWide,
    attempt.screechSeconds < .3,
  ];
  const finished = reason === 'finish';
  lesson.lastAttempt = {
    elapsedSeconds: rounded(attempt.elapsedSeconds), screechSeconds: rounded(attempt.screechSeconds),
    firstBrakeS: attempt.firstBrakeS, cones: attempt.cones.map(row => ({...row})), rules,
    endReason: reason, finished,
    passed: finished && (lesson.stage === 'challenge'
      ? attempt.elapsedSeconds < lesson.instructor.timeSec : rules.every(Boolean)),
    // An unfinished attempt reports progress instead of inventing a finish time.
    progressM: Math.max(0, Math.min(lesson.corner.finishS, attempt.previous.s) - lesson.corner.startS),
    timeLostSeconds: finished ? rounded(attempt.elapsedSeconds - lesson.instructor.timeSec) : null,
  };
  lesson.phase = 'result';
  if (lesson.stage === 'late') {
    const early = attempt.firstBrakeS !== null && attempt.firstBrakeS < lesson.instructor.redBoardS;
    return answer(line(early ? 'late.early' : 'late.result'), cones);
  }
  if (lesson.stage === 'right') {
    if (lesson.lastAttempt.passed) return answer(line('right.pass'), cones);
    const failedRule = rules.findIndex(value => !value);
    const coach = ['brake', 'inside', 'exit', 'screech'][failedRule];
    // A physical failure can occur after every driving rule passed. Do not
    // blame a successful brake input, and keep the shared coaching cadence.
    const radio = coach && coachDue(lesson) ? line('coach.' + coach) : null;
    if (radio) coachSaid(lesson);
    return {...retry(lesson, radio), cones};
  }
  if (!finished || attempt.elapsedSeconds >= lesson.instructor.timeSec) {
    lesson.streak = 0;
    return {...retry(lesson, line('challenge.reset')), cones};
  }
  lesson.streak++;
  lesson.bestMargin = Math.max(lesson.bestMargin, rounded(lesson.instructor.timeSec - attempt.elapsedSeconds));
  if (lesson.streak === 3) return {...passed(lesson, line('pass')), cones};
  return answer(line(lesson.streak === 1 ? 'challenge.one' : 'challenge.two'), cones);
}

// Only lesson state is mutable. Views and events are observations supplied by
// the host. No simulation, input injection, reward, profile or storage writes.
export function stepDriveLesson(lesson, view, events = {}, dt = 0) {
  checkView(view, dt);
  if (view.paused || view.status !== 'racing' || lesson.done) return answer();
  if (events.start && lesson.phase !== 'driving') return startAttempt(lesson, view);
  if (lesson.phase !== 'driving') return answer();
  const attempt = lesson.attempt;
  const previous = attempt.previous;
  const advance = view.s - previous.s;
  if (dt === 0 && (advance !== 0 || view.world.x !== previous.world.x || view.world.z !== previous.world.z)) {
    throw new TypeError('Movement needs positive elapsed time');
  }
  tickCoach(lesson, dt);
  const crossesStart = advance > 0 && previous.s <= lesson.corner.startS && view.s >= lesson.corner.startS;
  const fromFraction = !attempt.timerStarted && crossesStart
    ? clamp((lesson.corner.startS - previous.s) / advance) : 0;
  const toFraction = advance > 0 ? clamp((lesson.corner.finishS - previous.s) / advance) : 1;
  const inside = attempt.timerStarted || crossesStart;
  // Once the start gate is crossed, reversing behind it cannot erase time.
  if (crossesStart) attempt.timerStarted = true;
  const activeTime = inside ? dt * Math.max(0, toFraction - fromFraction) : 0;
  attempt.elapsedSeconds = rounded(attempt.elapsedSeconds + activeTime);
  if (view.tyreSlip > 1) attempt.screechSeconds = rounded(attempt.screechSeconds + activeTime);
  attempt.offRoadSeconds = view.offRoad ? rounded(attempt.offRoadSeconds + activeTime) : 0;
  if (attempt.firstBrakeS === null && view.brake >= .5 && inside) attempt.firstBrakeS = view.s;
  const exitS = lesson.instructor.cones[2].s;
  if (inside && view.throttle >= .8 && view.s < exitS) attempt.throttleBeforeExit = true;
  if (advance > 0 && previous.s <= exitS && view.s >= exitS) {
    const atExit = interpolate(previous, view, (exitS - previous.s) / advance);
    attempt.exitWide = lesson.corner.dir * atExit.lateral <= 0;
  }
  const cones = inside ? observeCones(lesson, interpolate(previous, view, fromFraction), interpolate(previous, view, toFraction)) : [];
  attempt.previous = copyView(view);
  let reason = null;
  if (events.wallHit || events.crashed) reason = 'wall';
  else if (attempt.offRoadSeconds > 1) reason = 'offroad';
  else if (view.speedMph <= 0) reason = 'stop';
  else if (view.s >= lesson.corner.finishS) reason = 'finish';
  return reason ? finishAttempt(lesson, reason, cones) : answer(null, cones);
}
