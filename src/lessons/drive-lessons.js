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

// A native instructor trace supplies these points. Never move a cone or the
// board to rescue a run that cannot teach the settled braking lesson.
export function placeCones(poses, {course, turnInS, turnOutS, exitSearchEndS, dir}) {
  for (const value of [turnInS, turnOutS, exitSearchEndS, dir]) finite(value, 'corner geometry');
  if (!(turnInS < turnOutS && turnOutS <= exitSearchEndS) || Math.abs(dir) !== 1) throw new TypeError('Invalid corner geometry');
  if (!Array.isArray(poses) || poses.length < 3) throw new TypeError('Instructor trace missing');
  let previous = -Infinity;
  for (const pose of poses) {
    for (const key of ['s', 'lateral', 'brake']) finite(pose[key], 'instructor pose');
    if (pose.s < previous) throw new TypeError('Instructor trace reversed');
    previous = pose.s;
  }
  const brake = poses.find(pose => pose.s <= turnInS && pose.brake > 0);
  const closest = (rows, gap) => rows.reduce((best, pose) => !best || gap(pose) < gap(best) ? pose : best, null);
  const inside = closest(poses.filter(pose => pose.s >= turnInS && pose.s <= turnOutS),
    pose => -dir * pose.lateral);
  const endS = inside && Math.min(inside.s + 120, exitSearchEndS);
  if (inside && poses.at(-1).s < endS) throw new Error('Instructor trace has not covered the 120m exit search');
  const outside = inside && closest(poses.filter(pose => pose.s > inside.s && pose.s <= endS),
    pose => dir * pose.lateral);
  const inward = brake && inside ? dir * (inside.lateral - brake.lateral) : null;
  const outward = inside && outside ? dir * (inside.lateral - outside.lateral) : null;
  if (!brake || !inside || !outside || inward < 2 || outward < 2) {
    throw new Error('Instructor line needs at least 2m inward and outward movement: '+JSON.stringify({
      dir,turnInS,turnOutS,exitSearchEndS,inward,outward,brake,inside,outside}));
  }
  const cones = [brake, inside, outside].map((pose, index) => {
    const edge = course.roadHalfWidthAt(pose.s) - .5;
    if (!Number.isFinite(edge) || edge <= 0) throw new Error('Instructor cone needs a valid road edge');
    const offset = index === 1 ? dir : -dir;
    const lateral = Math.max(-edge, Math.min(edge, pose.lateral + offset));
    return {id: index + 1, s: pose.s, lateral, ...course.groundAt(pose.s, lateral)};
  });
  return {cones, redBoardS: Math.min(brake.s + 25, turnInS), finishS: outside.s + 60};
}

// Observation may extend beyond the lesson to find the widest exit point.
// Keep only the gate-to-gate trace. A fault on a tick that starts before the
// finish remains a fault even if that tick ends beyond it.
export function finishInstructorTrace(poses, finishS, faults = []) {
  const at = poses.findIndex(pose => pose.s >= finishS);
  const fault = faults.find(item => !Number.isFinite(item.fromS) || item.fromS < finishS);
  if (at <= 0 || fault) throw new Error('Instructor did not finish cleanly: '+JSON.stringify(fault ?? {finishS}));
  const a = poses[at - 1], b = poses[at];
  const fraction = (finishS - a.s) / (b.s - a.s);
  const timeSec = a.t + (b.t - a.t) * fraction;
  const finish = Object.fromEntries(Object.entries(b).map(([key, value]) => [key,
    Number.isFinite(value) && Number.isFinite(a[key]) ? a[key] + (value - a[key]) * fraction : value]));
  finish.s = finishS; finish.t = timeSec;
  finish.heading = a.heading + Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading)) * fraction;
  return {timeSec, poses: [...poses.slice(0, at), finish]};
}

// The steering law is the existing racing-line follower's look-ahead and yaw
// correction. It supplies inputs to the real rules, never a replacement pose.
// Helpers are supplied by the native factory below; plain tests can inspect
// the control calculation without constructing or advancing a simulator.
export function instructorControls(state, surface, plan) {
  const {car, course, line, profile, drive, steerForYaw} = plan;
  const pace = plan.difficulty === 'casual' ? .92 : .97;
  const speed = Math.max(0, state.speedMph) * drive.mphToWorld;
  const targetLat = line.offsetAt(state.s + Math.max(12, speed * .45));
  const headingTarget = Math.atan((targetLat - state.lateral) * 2.5 / Math.max(15, speed));
  const desiredYaw = course.at(state.s + speed * .18).curvature * speed + (headingTarget - state.headingError) * 6;
  const targetMph = Math.min(surface.speedLimit, profile.at(state.s) * pace);
  // Stop adding brake after turn-in: the backward speed plan owns slowing
  // on the approach. A missed target must fail native acceptance, not slide.
  const turning = Math.abs(course.at(state.s).curvature) > 1e-12;
  const brake = !turning && state.speedMph > targetMph + 3 ? Math.min(1, (state.speedMph - targetMph) / 14) : 0;
  const steerTarget = steerForYaw(desiredYaw, {speedMph: state.speedMph, grip: car.grip,
    traction: surface.traction, car, course, brake, tyreSlip: true});
  // Native steering is smoothed before tyre demand is measured. On the first
  // braking tick its retained unbraked input can exceed the new grip limit.
  // Invert that existing 120 Hz input filter; never overwrite its race state.
  const alpha = 1 - Math.exp(-drive.steerResponse / 120);
  const steer = Number.isFinite(state.steerVisual) && alpha > 0
    ? Math.max(-1, Math.min(1, (steerTarget - (1 - alpha) * state.steerVisual) / alpha)) : steerTarget;
  return {targetMph, throttle: state.speedMph < targetMph ? 1 : 0, brake, steer,
    shiftUp: state.revs > .95 && state.gear < car.gears.length - 1,
    shiftDown: state.revs < .48 && state.gear > 0, boost: false};
}

// Heavy native work starts only when explicitly called, not on import. This
// owns a fresh Duel and never reads an App, profile, storage or live race.
// Frame partitioning only feeds the fixed 120 Hz race-rule clock.
export async function buildInstructorRun({courseId, car, upgrades = {}, difficulty = 'casual',
  driverId = 'club', seed = 1989, fps = 60, maxSeconds = 120} = {}) {
  if (!['casual', 'pro'].includes(difficulty) || !Number.isFinite(fps) || fps <= 0 ||
      !Number.isFinite(maxSeconds) || maxSeconds <= 0) throw new TypeError('Invalid instructor options');
  const row = DRIVE_LESSON_CORNERS.find(item => item.courseId === courseId);
  if (!row) throw new TypeError('Course has no driving lesson');
  const [{Duel}, {COURSE, CARS, DRIVE, steerForYaw}, {racingLineFor, buildSpeedProfile}] = await Promise.all([
    import('../game.js'), import('../config.js'), import('../race-lines.js'),
  ]);
  if (!Object.hasOwn(CARS, car)) throw new TypeError('Instructor needs the player car');
  const duel = new Duel({seed, featureFlags: {enabled: name => name === 'tyre-slip'}});
  duel.startCampaign({seed, car, upgrades: {...upgrades}, difficulty, driverId,
    mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(item => item.id === courseId)});
  const course = duel.course, state = duel.state;
  const pieces = course.script?.pieces;
  const turn = pieces?.find(piece => piece.name === row.cornerName);
  const gate = pieces?.find(piece => piece.name === row.gateBefore);
  if (!turn || !gate) throw new Error('Authored lesson corner missing');
  const next = pieces.find(piece => piece.kind === 'turn' && piece.s0 >= turn.s1);
  const exitSearchEndS = next?.s0 ?? course.length;
  const startS = gate.s0 - row.gateOffsetM;
  if (!(startS >= 0 && startS < turn.s0 && exitSearchEndS > turn.s1)) throw new Error('Lesson gates need an unwrapped corner');
  const line = racingLineFor(course), spec = duel.car;
  const profile = buildSpeedProfile(line, spec);
  const plan = {course, car: spec, line, profile, drive: DRIVE, steerForYaw,
    difficulty, turnInS: turn.s0, turnOutS: turn.s1};
  // Lesson rules explicitly use the new tyres even in a Casual lesson. This
  // is confined to this fresh scratch race; ordinary Casual remains exact.
  state.tyreSlipRules = true; state.tyreSlip = 0;
  state.status = 'racing'; state.countdown = 0; state.s = startS;
  state.lateral = line.offsetAt(startS); state.headingError = line.relHeadingAt(startS);
  state.speedMph = row.rollingMph;
  const rollingGear = spec.gears.findIndex(top => top * DRIVE.gearCeilFrac >= row.rollingMph);
  state.gear = rollingGear < 0 ? spec.gears.length - 1 : rollingGear;
  state.revs = state.speedMph / spec.gears[state.gear];
  state.yawVelocity = line.curvatureAt(startS) * state.speedMph * DRIVE.mphToWorld;
  state.traffic = []; state.opponents = [];
  state.nextLapGate = duel._lapGates.filter(s => s <= startS).length;
  const poses = [], faults = [];
  let tickStartS = startS;
  const capture = (t, brake = 0) => {
    const world = course.groundAt(state.s, state.lateral);
    return {t, s: state.s, lateral: state.lateral, brake, throttle: state.input.throttle,
      mph: state.speedMph, heading: course.at(state.s).heading + state.headingError,
      airHeight: state.airHeight || 0, groundHeight: state.groundHeight,
      terrainPitch: state.terrainPitch, terrainRoll: state.terrainRoll,
      x: world.x, y: world.y, z: world.z, tyreSlip: state.tyreSlip || 0};
  };
  const off = duel.onChange((current, event) => {
    if (event.crash || event.scrape || event.boundaryReset || event.checkpointReset) faults.push({fromS: tickStartS, s: current.s, reason: 'contact/reset'});
  });
  let ticks = 0, frames = 0, placement = null, searchEndS = null;
  poses.push(capture(0));
  try {
    // Finish observing the approved exit window before choosing its widest
    // point. Extra observations are trimmed from the actual lesson below.
    const needsTick = () => state.s < (placement?.finishS ?? Math.max(turn.s1, searchEndS ?? exitSearchEndS));
    while (needsTick() && ticks < maxSeconds * 120) {
      const frameTicks = Math.floor(++frames * 120 / fps + 1e-9);
      while (ticks < frameTicks && ticks < maxSeconds * 120 && needsTick()) {
        const controls = instructorControls(state, duel._drivingSurface(state.s, state.lateral), plan);
        // Inputs start at the current native pose, not one tick later.
        // Cone 1 must mark the actual first brake application.
        poses.at(-1).brake = controls.brake;
        poses.at(-1).throttle = controls.throttle;
        tickStartS = state.s;
        duel.setInput(controls);duel.step(1 / 120);ticks++;
        poses.push(capture(ticks / 120, controls.brake));
        if (!placement && state.s >= turn.s1) {
          if (searchEndS === null) {
            const insideRows = poses.filter(pose => pose.s >= turn.s0 && pose.s <= turn.s1);
            const apex = insideRows.reduce((a, b) => !a || turn.dir * b.lateral > turn.dir * a.lateral ? b : a, null);
            if (!apex) throw new Error('Instructor did not record the named corner');
            searchEndS = Math.min(apex.s + 120, exitSearchEndS);
          }
          if (state.s >= searchEndS) placement = placeCones(poses, {course,
            turnInS: turn.s0, turnOutS: turn.s1, exitSearchEndS, dir: turn.dir});
        }
        if (state.offRoad || state.tyreSlip > 1 || state.status !== 'racing' || state.impactTimer > 0) {
          faults.push({fromS: tickStartS, s: state.s, reason: 'offroad/slide/status',
            t: ticks / 120, lateral: state.lateral, mph: state.speedMph,
            headingError: state.headingError, offRoad: state.offRoad, tyreSlip: state.tyreSlip,
            status: state.status, impactTimer: state.impactTimer, input: {...state.input}});
        }
      }
    }
    if (!placement) throw new Error('Instructor did not complete the native exit-search observation');
    const {timeSec, poses: recorded} = finishInstructorTrace(poses, placement.finishS, faults);
    const corner = {id: row.cornerName, startS, finishS: placement.finishS, dir: turn.dir,
      turnInS: turn.s0, turnOutS: turn.s1};
    const instructor = {...placement, timeSec, poses: recorded};
    // Use the very same physical cone counter as the student's lesson.
    const lesson = createDriveLesson('corner', {corner, instructor});
    const carView = pose => ({s: pose.s, lateral: pose.lateral, world: {x: pose.x, z: pose.z},
      speedMph: pose.mph, brake: pose.brake, throttle: pose.throttle, tyreSlip: pose.tyreSlip, status: 'racing'});
    stepDriveLesson(lesson, carView(recorded[0]), {start: true}, 0);
    for (let i = 1; i < recorded.length; i++) stepDriveLesson(lesson, carView(recorded[i]), {}, recorded[i].t - recorded[i - 1].t);
    if (lesson.lastAttempt?.cones.length !== 3) throw new Error('Instructor missed a native cone');
    return {corner, instructor, courseId, car, upgrades: {...upgrades}, difficulty, seed};
  } finally { off(); }
}
