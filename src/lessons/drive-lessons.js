import {passed, retry, tickCoach, coachDue, coachSaid} from './lesson-core.js';

export const DRIVE_LESSON_CORNERS = Object.freeze([
  Object.freeze({courseId: 'panorama-ridge', cornerName: 'The Cutting', gateBefore: 'The Cutting', gateOffsetM: 180, rollingMph: 100}),
  Object.freeze({courseId: 'tremblant-woods', cornerName: 'Beaver Hairpin', gateBefore: 'Beaver Kink', gateOffsetM: 150, rollingMph: 75}),
]);

const line = suffix => 'drive.radio.corner.' + suffix;
// Lesson 2 (the racing line) has its own lines; its challenge counting, screech
// and exit coaching reuse lesson 1's (docs/DRIVING_LESSONS.md 12.7).
const LINE_LESSON_IDS = new Set(['middle.start', 'middle.result', 'right.start', 'coach.apex', 'coach.early',
  'right.pass', 'challenge.start', 'pass']);
// Lesson 4 (snow) has its own lines too; the inside-cone coaching and the challenge counts are lesson 1's.
const SNOW_LESSON_IDS = new Set(['late.start', 'late.result', 'right.start', 'coach.brake', 'coach.ice', 'coach.turn',
  'right.pass', 'challenge.start', 'winter.start', 'winter.result', 'pass']);
const radioFor = (lesson, suffix) => (lesson.id === 'line' && LINE_LESSON_IDS.has(suffix) ? 'drive.radio.line.'
  : lesson.id === 'snow' && SNOW_LESSON_IDS.has(suffix) ? 'drive.radio.snow.' : 'drive.radio.corner.') + suffix;
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
  if (!['corner', 'line', 'snow'].includes(id) || !corner || !instructor) throw new TypeError('Invalid driving lesson');
  for (const key of ['startS', 'finishS', 'dir']) finite(corner[key], key);
  if (corner.finishS <= corner.startS || Math.abs(corner.dir) !== 1) throw new TypeError('Invalid corner gates');
  finite(instructor.timeSec, 'instructor time');
  // Lesson 1 has a red board and exactly three cones; lesson 2 has an apex cone for
  // each corner and an exit cone, and no board.
  if (id !== 'line') finite(instructor.redBoardS, 'red board');
  if (id === 'snow') {
    // The snow lesson's ice stretches and, once the winter instructor has run, his time.
    if (!Array.isArray(instructor.ice) || instructor.ice.some(zone => !Number.isFinite(zone?.s0) || !(zone.s1 >= zone.s0)))
      throw new TypeError('Invalid ice stretches');
    if (instructor.winter !== undefined && !(instructor.winter?.timeSec > 0)) throw new TypeError('Invalid winter instructor');
  }
  if (instructor.timeSec <= 0 || !Array.isArray(instructor.cones) ||
      (id === 'line' ? instructor.cones.length < 2 : instructor.cones.length !== 3)) throw new TypeError('Invalid instructor plan');
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
    // Snow: three wins on summer tyres, then one run on winter tyres.
    else if (lesson.id === 'snow' && lesson.stage === 'challenge' && lesson.streak === 3 && lesson.instructor.winter) lesson.stage = 'winter';
  }
  lesson.phase = 'driving';
  lesson.failed = false;
  lesson.attempt = {
    elapsedSeconds: 0, screechSeconds: 0, offRoadSeconds: 0,
    timerStarted: view.s === lesson.corner.startS,
    firstBrakeS: view.brake >= .5 ? view.s : null,
    cones: [], tipped: [], ...(lesson.id === 'snow' ? {iceBrakeMax: 0} : {}), throttleBeforeExit: view.throttle >= .8 && view.s < lesson.instructor.cones.at(-1).s,
    exitWide: false, previous: copyView(view),
  };
  return answer(radioFor(lesson, lesson.id === 'line' && lesson.stage === 'late' ? 'middle.start' : lesson.stage + '.start'));
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

// A cone tips when the car's centre line passes this close (observeCones below).
export const TIP_DISTANCE_M = .8;

// The closest the instructor's path comes to each cone, in metres.
export function instructorConeDistances(poses, cones) {
  return cones.map(cone => Math.min(...poses.slice(1).map((pose, i) =>
    coneDistance({world: {x: poses[i].x, z: poses[i].z}}, {world: {x: pose.x, z: pose.z}}, cone))));
}

function observeCones(lesson, from, to) {
  const attempt = lesson.attempt;
  const events = [];
  for (const cone of lesson.instructor.cones) {
    const distance = coneDistance(from, to, cone);
    if (distance <= 2.5 && !attempt.cones.some(row => row.id === cone.id)) {
      attempt.cones.push({id: cone.id});
    }
    if (distance <= TIP_DISTANCE_M && !attempt.tipped.includes(cone.id)) {
      attempt.tipped.push(cone.id);
      events.push({id: cone.id, tipped: true, cue: 'lesson.cone'});
    }
  }
  return events;
}

function finishAttempt(lesson, reason, cones) {
  const attempt = lesson.attempt, kind = lesson.id;
  const firstCone = lesson.instructor.cones[0];
  const touched = id => attempt.cones.some(row => row.id === id);
  // Lesson 1: brake at cone 1, touch the inside cone, power out wide, no long screech.
  // Lesson 2: touch every apex cone, pass the exit cone on the outside half, no long screech.
  const rules = kind === 'snow' ? [
    // Brake at the snow cone, never hard on the ice, touch the inside cone, no long screech.
    attempt.firstBrakeS !== null && attempt.firstBrakeS >= firstCone.s - 15 && attempt.firstBrakeS <= firstCone.s + 5,
    attempt.iceBrakeMax < .2,
    touched(2),
    attempt.screechSeconds < .3,
  ] : kind === 'line' ? [
    lesson.instructor.cones.slice(0, -1).every(cone => touched(cone.id)),
    attempt.exitWide,
    attempt.screechSeconds < .3,
  ] : [
    attempt.firstBrakeS !== null && attempt.firstBrakeS >= firstCone.s - 15 && attempt.firstBrakeS <= firstCone.s + 5,
    touched(2),
    attempt.throttleBeforeExit && attempt.exitWide,
    attempt.screechSeconds < .3,
  ];
  const finished = reason === 'finish';
  // The winter run is measured against the winter instructor and passes however it ends.
  const winter = kind === 'snow' && lesson.stage === 'winter' && !!lesson.instructor.winter;
  const target = winter ? lesson.instructor.winter.timeSec : lesson.instructor.timeSec;
  lesson.lastAttempt = {
    elapsedSeconds: rounded(attempt.elapsedSeconds), screechSeconds: rounded(attempt.screechSeconds),
    firstBrakeS: attempt.firstBrakeS, cones: attempt.cones.map(row => ({...row})), rules,
    endReason: reason, finished,
    passed: winter || finished && (lesson.stage === 'challenge'
      ? attempt.elapsedSeconds < lesson.instructor.timeSec : rules.every(Boolean)),
    // An unfinished attempt reports progress instead of inventing a finish time.
    progressM: Math.max(0, Math.min(lesson.corner.finishS, attempt.previous.s) - lesson.corner.startS),
    timeLostSeconds: finished ? rounded(attempt.elapsedSeconds - target) : null,
    ...(kind === 'snow' ? {instructorSeconds: target, iceBrakeMax: rounded(attempt.iceBrakeMax)} : {}),
  };
  lesson.phase = 'result';
  if (winter) {
    // Passing the winter run finishes the lesson; the last line follows the explanation.
    return {...passed(lesson, radioFor(lesson, 'winter.result')), queued: [radioFor(lesson, 'pass')], cones};
  }
  if (lesson.stage === 'late') {
    // Snow's first try (braking at the dry board) only says its piece if the tyres really did slide or leave the road.
    if (kind === 'snow') {
      const slid = attempt.screechSeconds >= .5 || reason === 'wall' || reason === 'offroad';
      return answer(slid ? radioFor(lesson, 'late.result') : null, cones);
    }
    // Lesson 2's first try (the middle of the road) always gets its line; the card shows the numbers.
    if (kind === 'line') return answer(radioFor(lesson, 'middle.result'), cones);
    const early = attempt.firstBrakeS !== null && attempt.firstBrakeS < lesson.instructor.redBoardS;
    // On these tyres a late entry costs screech, not time, so the old "look at the
    // time you lost" line (late.result) would be untrue. The existing screech
    // coaching line fits; with no screech there is nothing to say.
    const screeched = attempt.screechSeconds >= .5;
    return answer(early ? line('late.early') : screeched ? line('coach.screech') : null, cones);
  }
  if (lesson.stage === 'right') {
    if (lesson.lastAttempt.passed) return answer(radioFor(lesson, 'right.pass'), cones);
    const failedRule = rules.findIndex(value => !value);
    const ranOut = reason === 'wall' || reason === 'offroad';
    const coach = (kind === 'line' ? [ranOut ? 'early' : 'apex', 'exit', 'screech']
      : kind === 'snow' ? ['brake', 'ice', 'inside', 'turn']
      : ['brake', 'inside', 'exit', 'screech'])[failedRule];
    // A physical failure can occur after every driving rule passed. Do not
    // blame a successful brake input, and keep the shared coaching cadence.
    const radio = coach && coachDue(lesson) ? radioFor(lesson, 'coach.' + coach) : null;
    if (radio) coachSaid(lesson);
    return {...retry(lesson, radio), cones};
  }
  if (!finished || attempt.elapsedSeconds >= lesson.instructor.timeSec) {
    lesson.streak = 0;
    return {...retry(lesson, line('challenge.reset')), cones};
  }
  lesson.streak++;
  lesson.bestMargin = Math.max(lesson.bestMargin, rounded(lesson.instructor.timeSec - attempt.elapsedSeconds));
  // Snow carries on to its winter run; the lesson passes there.
  if (lesson.streak === 3 && kind === 'snow' && lesson.instructor.winter) return answer(null, cones);
  if (lesson.streak === 3) return {...passed(lesson, radioFor(lesson, 'pass')), cones};
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
  // Snow: how hard the brake is pressed while the car is on the ice.
  if (inside && lesson.id === 'snow' && lesson.instructor.ice.some(zone => view.s >= zone.s0 && view.s <= zone.s1))
    attempt.iceBrakeMax = Math.max(attempt.iceBrakeMax, view.brake);
  const exitS = lesson.instructor.cones.at(-1).s;
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

// The lesson corner from the course's own corner analysis (the track
// script's turn piece): turn-in at its start, the apex at its apex share, the
// exit after the turn by the same distance as the apex sits before its end.
// Cones sit a fixed distance in from the road edge; the braking point is
// where the instructor's tyre speed plan starts braking for the corner.
export const LESSON_LINE = Object.freeze({
  outsideM: 1.5, insideM: 1.0, step: 1,
  accelShare: .75, // the plan counts on this share of the helper's acceleration, which the car does not quite reach at speed
  yawMargin: .96,  // the plan asks for this share of the tyre's yaw, so feedback never tips it past grip
  mainBrake: .8,   // share of full braking the plan uses in the corner's braking zone
  lightBrake: .45, // a lift for an earlier bend stays under the 50% brake rule
  roadSeconds: 3,  // lesson 2: seconds of road between the gate and the first braking point, at the gate speed
  gateStepM: 5,    // ... and how far back the gate moves at a time to find them
  gateClearM: 15,  // ... never closer than this to the end of the previous bend
  entryLeadM: 0,   // lesson 2: the outside-edge waypoint this far before the first turn-in (0 = none)
  lineYawMargin: .85, // lesson 2's esses leave the steering less spare grip, so its plan keeps more of it back
  iceClearM: 6,        // snow: the instructor has finished braking this far before the ice
  snowLockMargin: 1.2, // snow: the hairpin is limited by steering lock, not grip, so the plan may ask up to 120% of lock: below 30 mph the demand and the lock both grow with speed, so the line is just past lock at any speed
  coneClearM: 1.4, // the instructor's line passes the outside cones this far towards the middle of the road: more than 0.5 m past the 0.8 m tip distance
  apexClearM: .8,  // ... and the inside cone this far: the car ends about 0.3 to 1.4 m wide of the line it aims for at the apex, so it passes 1.5 to 2.3 m from the cone (past the tip distance, inside the 2.5 m that counts the cone)
  winterApexClearM: 1.3, // snow, winter run: the car holds the apex line better there, so the line aims further off the cone
  minClearM: .5,   // every instructor run clears every cone by at least this much beyond the 0.8 m tip distance
  holdShare: .5,   // lesson 2 holds its speed while the line curves at least this share of its tightest
});

export function cornerPoints({turnInS, turnOutS, dir, apexShare}) {
  for (const value of [turnInS, turnOutS, dir, apexShare]) finite(value, 'corner geometry');
  if (!(turnInS < turnOutS) || Math.abs(dir) !== 1 || !(apexShare > 0 && apexShare < 1)) throw new TypeError('Invalid corner geometry');
  const apexS = turnInS + (turnOutS - turnInS) * apexShare;
  return {turnInS, apexS, exitS: turnOutS + (turnOutS - apexS), dir};
}

// A smooth line through the corner points: on the outside up to turn-in,
// across to the inside at the apex and back out to the outside at the exit.
export function buildLessonLine(course, points, {startS, endS, clearM = 0, apexClearM = 0}) {
  const {turnInS, apexS, exitS, dir} = points;
  if (!(startS < turnInS && exitS < endS)) throw new TypeError('Lesson line needs the whole corner');
  const outside = s => -dir * (course.roadHalfWidthAt(s) - LESSON_LINE.outsideM - clearM);
  const inside = s => dir * (course.roadHalfWidthAt(s) - LESSON_LINE.insideM - apexClearM);
  const smooth = u => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, u)))) / 2;
  const lateralAt = s => {
    if (s <= turnInS || s >= exitS) return outside(s);
    const u = s < apexS ? smooth((s - turnInS) / (apexS - turnInS)) : 1 - smooth((s - apexS) / (exitS - apexS));
    return outside(s) + (inside(s) - outside(s)) * u;
  };
  return lineFromLateral(course, lateralAt, startS, endS, points);
}

// Samples a lateral-offset function into the tables the controller and the
// speed plan read: offset, heading error and curvature every metre.
export function lineFromLateral(course, lateralAt, startS, endS, points) {
  const step = LESSON_LINE.step, count = Math.ceil((endS - startS) / step) + 1;
  const offset = new Float64Array(count), px = new Float64Array(count), pz = new Float64Array(count);
  const heading = new Float64Array(count), relHeading = new Float64Array(count), curvature = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    offset[i] = lateralAt(startS + i * step);
    const p = course.groundAt(startS + i * step, offset[i]);
    px[i] = p.x; pz[i] = p.z;
  }
  const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  for (let i = 0; i < count; i++) {
    const a = Math.max(0, i - 1), b = Math.min(count - 1, i + 1);
    heading[i] = Math.atan2(px[b] - px[a], pz[b] - pz[a]);
    relHeading[i] = wrap(heading[i] - course.at(startS + i * step).heading);
  }
  for (let i = 0; i < count; i++) {
    const a = Math.max(0, i - 1), b = Math.min(count - 1, i + 1);
    const distance = Math.hypot(px[i] - px[a], pz[i] - pz[a]) + Math.hypot(px[b] - px[i], pz[b] - pz[i]);
    curvature[i] = distance > 1e-6 ? wrap(heading[b] - heading[a]) / distance : 0;
  }
  const at = (table, s) => {
    const p = Math.max(0, Math.min(count - 1, (s - startS) / step)), i = Math.min(count - 2, Math.floor(p));
    return table[i] + (table[i + 1] - table[i]) * (p - i);
  };
  return Object.freeze({startS, endS, step, count, offset, curvature, points, lateralAt,
    offsetAt: s => at(offset, s), relHeadingAt: s => at(relHeading, s), curvatureAt: s => at(curvature, s)});
}

// ---- lesson 2: the racing line (docs/DRIVING_LESSONS.md 12.2) --------------------

// Linked corners, each named as the course's own track-script turn pieces. The
// gate is 150 m before the first corner; the rolling speed is the speed the
// course's own racing-line profile has there, scaled by the instructor's pace.
export const DRIVE_LINE_ROWS = Object.freeze([
  Object.freeze({courseId: 'tremblant-woods', cornerNames: Object.freeze(['Fir Esses 1', 'Fir Esses 2']), gateOffsetM: 150, entryLeadM: 40}),
  Object.freeze({courseId: 'harbour-lights', cornerNames: Object.freeze(['Old Town Esses 1', 'Old Town Esses 2',
    'Old Town Esses 3', 'Old Town Esses 4']), gateOffsetM: 150, entryLeadM: 20}),
]);
const MARKER_SPACING = 10;   // metres between the markers down the middle of the road

// The corners, their apex points and the exit point of one row, from the course's own pieces.
export function linePointsFor(course, row, apexShare) {
  const pieces = course.script?.pieces ?? [];
  const corners = row.cornerNames.map(name => {
    const piece = pieces.find(item => item.kind === 'turn' && item.name === name);
    if (!piece) throw new Error('Authored lesson corner missing: ' + name);
    return piece;
  });
  for (let i = 1; i < corners.length; i++)
    if (!(corners[i].s0 >= corners[i - 1].s1 - 1e-6)) throw new Error('Lesson corners must follow each other');
  for (const corner of corners) finite(corner.dir, 'corner direction');
  const apexes = corners.map(corner => ({s: corner.s0 + (corner.s1 - corner.s0) * apexShare, dir: corner.dir, name: corner.name}));
  const last = corners.at(-1), lastApex = apexes.at(-1);
  // The gate is measured back from the first corner, or from a named piece before it (the snow lesson's Beaver Kink).
  const gate = row.gateBefore ? pieces.find(item => item.name === row.gateBefore) : corners[0];
  if (!gate) throw new Error('Authored lesson gate missing: ' + row.gateBefore);
  return {corners, apexes, startS: gate.s0 - row.gateOffsetM, turnInS: corners[0].s0, turnOutS: last.s1,
    exitS: last.s1 + (last.s1 - lastApex.s), dir: last.dir, apexS: lastApex.s};
}

// A smooth line through waypoints {s, lateral}: level before the first and after
// the last, with a cosine ease between neighbours.
export function buildWaypointLine(course, waypoints, {startS, endS, points, ease: easing = 'cosine'}) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) throw new TypeError('A line needs at least two waypoints');
  for (let i = 0; i < waypoints.length; i++) {
    finite(waypoints[i].s, 'waypoint s'); finite(waypoints[i].lateral, 'waypoint lateral');
    if (i && !(waypoints[i].s > waypoints[i - 1].s)) throw new TypeError('Waypoints must run forward');
  }
  // 'parabolic' is the S with the smallest peak curvature for a given swing: two
  // equal arcs. 'cosine' is lesson 1's easing.
  const ease = easing === 'parabolic'
    ? u => { u = Math.max(0, Math.min(1, u)); return u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); }
    : u => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, u)))) / 2;
  const lateralAt = s => {
    if (s <= waypoints[0].s) return waypoints[0].lateral;
    if (s >= waypoints.at(-1).s) return waypoints.at(-1).lateral;
    let k = 0;
    while (s > waypoints[k + 1].s) k++;
    const a = waypoints[k], b = waypoints[k + 1];
    return a.lateral + (b.lateral - a.lateral) * ease((s - a.s) / (b.s - a.s));
  };
  return lineFromLateral(course, lateralAt, startS, endS, points);
}

// Apex cones 1.0 m in from the inside edge, then the exit cone 1.5 m in from the
// outside edge; the first, middle and last waypoints of the instructor's line.
export function lineWaypoints(course, points, entryLeadM = 0, clearM = 0, apexClearM = 0, entryClearM = 0) {
  const half = s => {
    const value = course.roadHalfWidthAt(s);
    if (!Number.isFinite(value) || value <= LESSON_LINE.outsideM + 1) throw new Error('Lesson cone needs a valid road edge');
    return value;
  };
  const first = points.apexes[0];
  // Lesson 2's only outside cone is the exit cone, so only the exit waypoint keeps clear of it and the entry stays at
  // the edge; the snow lesson's braking cone is on the entry, which keeps clear by entryClearM.
  const out = (s, clear = 0) => half(s) - LESSON_LINE.outsideM - clear, inn = s => half(s) - LESSON_LINE.insideM - apexClearM;
  const rows = [{s: points.startS, lateral: -first.dir * out(points.startS, entryClearM), cone: false}];
  // Stay on the outside until just before the first turn-in, then sweep across to the apex.
  if (entryLeadM > 0) rows.push({s: Math.max(points.startS + 1, points.turnInS - entryLeadM),
    lateral: -first.dir * out(points.turnInS, entryClearM), cone: false});
  points.apexes.forEach(apex => rows.push({s: apex.s, lateral: apex.dir * inn(apex.s), cone: 'apex'}));
  rows.push({s: points.exitS, lateral: -points.dir * out(points.exitS, clearM), cone: 'exit'});
  return rows;
}

// The cones of lesson 2 and the middle markers. Like lesson 1's, never moved to
// rescue a run: the 2 m check applies to neighbouring cones' lateral positions.
export function placeLineCones(course, points) {
  const rows = lineWaypoints(course, points).filter(row => row.cone);
  for (let i = 1; i < rows.length; i++)
    if (!(Math.abs(rows[i].lateral - rows[i - 1].lateral) >= 2)) throw new Error('Lesson cones need at least 2m between neighbours');
  const cones = rows.map((row, index) => {
    const {x, y, z} = course.groundAt(row.s, row.lateral);
    return {id: index + 1, s: row.s, lateral: row.lateral, x, y, z};
  });
  const markers = [];
  for (let s = points.startS + MARKER_SPACING; s <= points.exitS + 1e-6; s += MARKER_SPACING) {
    const {x, y, z} = course.groundAt(s, 0);
    markers.push({s, lateral: 0, x, y, z});
  }
  return {cones, markers, finishS: points.exitS + 60};
}

// The instructor's speed plan from the tyre helper: in every bend the line's
// yaw stays within the tyre's peak (no screech) at the given pace, with the
// corner speed held from turn-in to the exit cone (no braking, no pull-away
// while the line is still swinging), straight-line braking before the
// corner and the car's real acceleration from the rolling start. `at` is
// divided by the pace because instructorControls applies the pace itself.
export function buildLessonPlan(line, {car, pace, rollingMph, tractionAt, speedLimitAt,
  brakeZoneS, drive, accelAt, tyreSlipSteering, holdMode = 'exit', yawMargin = LESSON_LINE.yawMargin, noBrakeZones = [], brakeByTraction = false, cruiseMph = Infinity, lockMargin = yawMargin}) {
  const {count, step, startS, curvature, points} = line;
  const mph = new Float64Array(count), toWorld = drive.mphToWorld;
  const cornerMph = s => {
    const k = Math.abs(line.curvatureAt(s)), traction = tractionAt(s, line.offsetAt(s));
    const fits = speedMph => {
      const {peakYaw, steerGain} = tyreSlipSteering({speedMph, grip: car.grip, traction, car, brake: 0});
      // The tyres' grip and the steering lock are separate limits; usually the same margin keeps both.
      return k * speedMph * toWorld <= Math.min(yawMargin * peakYaw, lockMargin * steerGain);
    };
    let low = 1, high = Math.min(car.topSpeed, speedLimitAt(s, line.offsetAt(s)));
    if (fits(high)) return high;
    for (let i = 0; i < 60; i++) { const mid = (low + high) / 2; if (fits(mid)) low = mid; else high = mid; }
    return low;
  };
  const index = s => Math.round((s - startS) / step);
  for (let i = 0; i < count; i++) mph[i] = Math.min(cornerMph(startS + i * step), cruiseMph) * pace;
  const turnIn = index(points.turnInS), apex = index(points.apexS), exit = index(points.exitS);
  // Lesson 1 holds one speed from turn-in to the exit cone. Lesson 2 ('curved')
  // holds it only while the line is still curving, so a driver whose line
  // straightens out earlier is not held back by a line that is still swinging.
  let held = Infinity, holdEnd = exit;
  if (holdMode === 'curved') {
    let peak = 0;
    for (let i = turnIn; i <= exit; i++) peak = Math.max(peak, Math.abs(curvature[i]));
    holdEnd = turnIn;
    for (let i = turnIn; i <= exit; i++) if (Math.abs(curvature[i]) >= peak * LESSON_LINE.holdShare) holdEnd = i;
    holdEnd = Math.max(holdEnd, apex);
  }
  for (let i = turnIn; i <= apex; i++) held = Math.min(held, mph[i]);
  for (let i = turnIn; i <= holdEnd; i++) mph[i] = Math.min(mph[i], held);
  // A stretch where the car must not brake or pull away (the ice patch on the snow lesson's spur):
  // the plan holds one speed across it, so all the slowing happens before it.
  const frozen = i => noBrakeZones.some(zone => startS + i * step >= zone.s0 && startS + i * step <= zone.s1);
  const fullBrake = drive.brakeAccel * car.braking * toWorld;
  for (let i = count - 2; i >= 0; i--) {
    const share = startS + i * step >= brakeZoneS ? LESSON_LINE.mainBrake : LESSON_LINE.lightBrake;
    // On snow and ice the brakes bite only as hard as the surface lets them.
    const bite = brakeByTraction ? tractionAt(startS + i * step, line.offsetAt(startS + i * step)) : 1;
    const v = mph[i + 1] * toWorld;
    mph[i] = Math.min(mph[i], frozen(i) ? mph[i + 1] : Math.sqrt(v * v + 2 * fullBrake * bite * share * step) / toWorld);
  }
  mph[0] = Math.min(mph[0], rollingMph);
  for (let i = 1; i < count; i++) {
    const v = mph[i - 1] * toWorld;
    mph[i] = Math.min(mph[i], frozen(i) ? mph[i - 1] : Math.sqrt(v * v + 2 * LESSON_LINE.accelShare * accelAt(car, mph[i - 1]) * toWorld * step) / toWorld);
  }
  // The corner's braking point: where the plan starts falling toward turn-in (or toward the start of a
  // no-braking zone, when the speed has to be settled before it).
  let brake = Math.min(turnIn, ...noBrakeZones.map(zone => Math.floor((zone.s0 - startS) / step)));
  while (brake > 0 && mph[brake - 1] > mph[brake] + 1e-9) brake--;
  const at = s => {
    const p = Math.max(0, Math.min(count - 1, (s - startS) / step)), i = Math.min(count - 2, Math.floor(p));
    return (mph[i] + (mph[i + 1] - mph[i]) * (p - i)) / pace;
  };
  return Object.freeze({mph, pace, brakeS: startS + brake * step, cornerMph: held, at});
}

// Cones from the corner points, never from a trace: braking point and exit
// 1.5 m in from the outside edge, apex 1.0 m in from the inside edge.
export function placeCones(course, {brakeS, apexS, exitS, turnInS, dir}) {
  for (const value of [brakeS, apexS, exitS, turnInS, dir]) finite(value, 'corner points');
  if (!(brakeS <= turnInS && turnInS < apexS && apexS < exitS) || Math.abs(dir) !== 1) throw new TypeError('Invalid corner points');
  const edge = s => {
    const half = course.roadHalfWidthAt(s);
    if (!Number.isFinite(half) || half <= LESSON_LINE.outsideM) throw new Error('Lesson cone needs a valid road edge');
    return half;
  };
  const rows = [[brakeS, -dir * (edge(brakeS) - LESSON_LINE.outsideM)],
    [apexS, dir * (edge(apexS) - LESSON_LINE.insideM)], [exitS, -dir * (edge(exitS) - LESSON_LINE.outsideM)]];
  const inward = dir * (rows[1][1] - rows[0][1]), outward = dir * (rows[1][1] - rows[2][1]);
  // A sanity check on the corner, not a tuning knob.
  if (!(inward >= 2 && outward >= 2)) {
    throw new Error('Lesson cones need at least 2m inward and outward movement: ' + JSON.stringify({dir, inward, outward, rows}));
  }
  const cones = rows.map(([s, lateral], index) => {
    const {x, y, z} = course.groundAt(s, lateral);
    return {id: index + 1, s, lateral, x, y, z};
  });
  return {cones, redBoardS: Math.min(brakeS + 25, turnInS), finishS: exitS + 60};
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
// correction, fed with the lesson line's own bend. It supplies inputs to the
// real rules, never a replacement pose. Helpers are supplied by the native
// factory below; plain tests can inspect the control calculation without
// constructing or advancing a simulator.
export function instructorControls(state, surface, plan) {
  const {car, course, line, profile, drive, steerForYaw} = plan;
  const pace = plan.difficulty === 'casual' ? .92 : .97;
  const speed = Math.max(0, state.speedMph) * drive.mphToWorld;
  const targetLat = line.offsetAt(state.s + Math.max(12, speed * .45));
  const headingTarget = Math.atan((targetLat - state.lateral) * 2.5 / Math.max(15, speed));
  const desiredYaw = line.curvatureAt(state.s + speed * .18) * speed + (headingTarget - state.headingError) * 6;
  const target = s => Math.min(surface.speedLimit, profile.at(s) * pace);
  const targetMph = target(state.s);
  // Brake on straight road, or on an earlier bend before the corner's braking
  // point (light braking only): the speed plan finishes slowing before turn-in. A missed target must fail native acceptance, not slide.
  // The planned slowing is fed forward so the car follows the braking curve
  // from its first metre; before the corner's braking point a lift stays
  // light, so the instructor's own first firm brake is at cone 1.
  const turning = Math.abs(course.at(state.s).curvature) > 1e-12;
  const ahead = target(state.s + 2) * drive.mphToWorld, now = targetMph * drive.mphToWorld;
  const fullBrake = (drive.brakeAccel ?? 52) * (car.braking ?? 1) * (surface.grip ?? 1) * drive.mphToWorld;
  const planned = Math.max(0, (now * now - ahead * ahead) / 4) / fullBrake;
  const cap = state.s < (plan.brakeS ?? -Infinity) ? LESSON_LINE.lightBrake : 1;
  const brake = (!turning || state.s < (plan.brakeS ?? -Infinity)) && (state.speedMph > targetMph + 1 || (planned > 0 && state.speedMph > targetMph - .5))
    ? Math.min(cap, Math.max(0, planned + (state.speedMph - targetMph) / 4)) : 0;
  const steerTarget = steerForYaw(desiredYaw, {speedMph: state.speedMph, grip: car.grip,
    traction: surface.traction, car, course, brake, tyreSlip: true});
  // Native steering is smoothed before tyre demand is measured. On the first
  // braking tick its retained unbraked input can exceed the new grip limit.
  // Invert that existing 120 Hz input filter; never overwrite its race state.
  const alpha = 1 - Math.exp(-drive.steerResponse / 120);
  const steer = Number.isFinite(state.steerVisual) && alpha > 0
    ? Math.max(-1, Math.min(1, (steerTarget - (1 - alpha) * state.steerVisual) / alpha)) : steerTarget;
  return {targetMph, throttle: state.speedMph < targetMph && !brake ? 1 : 0, brake, steer,
    shiftUp: state.revs > .95 && state.gear < car.gears.length - 1,
    shiftDown: state.revs < .48 && state.gear > 0, boost: false};
}

// The lesson's line and speed plan for one course, car and pace. The student
// checks use the very same plan as the instructor.
export async function lessonPlanFor(duel, row, pace) {
  const [{DRIVE, tyreSlipSteering}, {accelAt}, {TRACK_SCRIPT}] = await Promise.all([
    import('../config.js'), import('../race-lines.js'), import('../track-script.js'),
  ]);
  const course = duel.course, pieces = course.script?.pieces;
  const turn = pieces?.find(piece => piece.name === row.cornerName);
  const gate = pieces?.find(piece => piece.name === row.gateBefore);
  if (!turn || !gate) throw new Error('Authored lesson corner missing');
  const startS = gate.s0 - row.gateOffsetM;
  const points = cornerPoints({turnInS: turn.s0, turnOutS: turn.s1, dir: turn.dir, apexShare: TRACK_SCRIPT.apexShare});
  const endS = points.exitS + 60 + 40;
  if (!(startS >= 0 && endS < course.length)) throw new Error('Lesson gates need an unwrapped corner');
  const line = buildLessonLine(course, points, {startS, endS, clearM: LESSON_LINE.coneClearM, apexClearM: LESSON_LINE.apexClearM});
  // Firm braking belongs to the straight after the previous bend.
  const before = pieces.filter(piece => piece.kind === 'turn' && piece !== turn && piece.s1 <= turn.s0).at(-1);
  const profile = buildLessonPlan(line, {car: duel.car, pace, rollingMph: row.rollingMph, drive: DRIVE,
    accelAt, tyreSlipSteering, brakeZoneS: Math.max(startS, before?.s1 ?? startS),
    tractionAt: (s, lateral) => duel._drivingSurface(s, lateral).traction,
    speedLimitAt: (s, lateral) => duel._drivingSurface(s, lateral).speedLimit});
  const placement = placeCones(course, {...points, brakeS: profile.brakeS});
  return {startS, turn, points, line, profile, placement};
}

// Lesson 2's line and speed plan for one course, car and pace. With `middle` the
// line is the middle of the road instead of the racing line, for the proof that
// the racing line is faster (tools/test-drive-lesson-2.mjs).
export async function linePlanFor(duel, row, pace, {middle = false, rollingMph = null, ease = 'parabolic',
  entryLeadM = row.entryLeadM ?? LESSON_LINE.entryLeadM, startS: fixedStartS = null,
  yawMargin = LESSON_LINE.lineYawMargin, lockMargin = yawMargin, noBrakeZones = [], brakeByTraction = false, cruiseMph = Infinity, apexClearM = LESSON_LINE.apexClearM, entryClearM = 0} = {}) {
  const [{DRIVE, tyreSlipSteering}, {accelAt, racingLineFor, buildSpeedProfile}, {TRACK_SCRIPT}] = await Promise.all([
    import('../config.js'), import('../race-lines.js'), import('../track-script.js'),
  ]);
  const course = duel.course, pieces = course.script?.pieces ?? [];
  const found = linePointsFor(course, row, TRACK_SCRIPT.apexShare);
  const endS = found.exitS + 60 + 40;
  if (!(found.startS >= 0 && endS < course.length)) throw new Error('Lesson gates need an unwrapped corner');
  // Firm braking belongs to the straight after the previous bend.
  const before = pieces.filter(piece => piece.kind === 'turn' && !found.corners.includes(piece) && piece.s1 <= found.turnInS).at(-1);
  // The gate keeps clear of the bend before it (before the named gate piece, when the row has one).
  const gatePiece = row.gateBefore ? pieces.find(piece => piece.name === row.gateBefore) : null;
  const beforeGate = gatePiece
    ? pieces.filter(piece => piece.kind === 'turn' && piece.s1 <= gatePiece.s0).at(-1) : before;
  const racing = racingLineFor(course), racingProfile = buildSpeedProfile(racing, duel.car);
  const attempt = gateS => {
    const points = {...found, startS: gateS};
    const waypoints = middle ? [{s: gateS, lateral: 0}, {s: endS, lateral: 0}] : lineWaypoints(course, points, entryLeadM, LESSON_LINE.coneClearM, apexClearM, entryClearM);
    const line = buildWaypointLine(course, waypoints, {startS: gateS, endS, points, ease});
    // The rolling start is the speed the course's own racing line allows at the gate, at the instructor's pace.
    const natural = rollingMph ?? Math.floor(racingProfile.at(gateS) * pace);
    const profile = buildLessonPlan(line, {car: duel.car, pace, rollingMph: natural, drive: DRIVE,
      accelAt, tyreSlipSteering, brakeZoneS: Math.max(gateS, before?.s1 ?? gateS), holdMode: 'curved', yawMargin, lockMargin, noBrakeZones, brakeByTraction, cruiseMph,
      tractionAt: (s, lateral) => duel._drivingSurface(s, lateral).traction,
      speedLimitAt: (s, lateral) => duel._drivingSurface(s, lateral).speedLimit});
    const startMph = Math.min(natural, Math.floor(profile.at(gateS) * pace));
    const placement = placeLineCones(course, points);
    const turn = {s0: points.turnInS, s1: points.turnOutS, dir: points.dir};
    return {startS: gateS, turn, points, line, profile, placement, rollingMph: startMph};
  };
  if (fixedStartS !== null) return attempt(fixedStartS);
  // The player must not have to brake the moment the lesson starts: at the speed the
  // instructor has at the gate there must be at least LESSON_LINE.roadSeconds of road
  // before the first braking point. If the gate is closer than that, move it back along the road.
  const earliest = Math.max(0, (beforeGate?.s1 ?? 0) + LESSON_LINE.gateClearM);
  for (let gateS = found.startS; gateS >= earliest; gateS -= LESSON_LINE.gateStepM) {
    const plan = attempt(gateS);
    if (plan.profile.brakeS - plan.startS >= LESSON_LINE.roadSeconds * plan.rollingMph * DRIVE.mphToWorld) return plan;
  }
  throw new Error('No start gate gives ' + LESSON_LINE.roadSeconds + ' s of road before the first braking point');
}

// ---- lesson 4: snow (docs/DRIVING_LESSONS.md 12.4) --------------------------------------

// Tremblant Snow's Beaver Hairpin, reached from Beaver Kink along The Spur, which has an ice patch.
// The gate is 150 m before the Kink; the player rolls in at a snow speed (the summer instructor's
// speed there), and the gate moves back if there are not 3 s of road before the first braking point.
export const DRIVE_SNOW_ROWS = Object.freeze([
  Object.freeze({courseId: 'tremblant-snow', cornerNames: Object.freeze(['Beaver Hairpin']), gateBefore: 'Beaver Kink',
    gateOffsetM: 150, entryLeadM: 20, rollingMph: 45, cruiseMph: 40, dryCruiseMph: 60}),
]);

// Stretches of the road where the surface under the middle of the road is ice.
export function iceZonesOf(duel, fromS, toS) {
  const zones = [];
  let open = null;
  for (let s = Math.ceil(fromS); s <= toS; s++) {
    const ice = duel._drivingSurface(s, 0).gripKind === 'ice';
    if (ice && open === null) open = s;
    if (!ice && open !== null) { zones.push({s0: open, s1: s - 1}); open = null; }
  }
  if (open !== null) zones.push({s0: open, s1: toS});
  return zones;
}

// The snow lesson's plan on the tyres the Duel was started with. Braking and pulling away stop before
// the ice, the hairpin's speed is lock-limited (see snowLockMargin), and the dry board is where the same
// instructor would start braking if the surface were asphalt. `fixed` repeats the summer gate, rolling
// speed and cones for the winter instructor.
export async function snowPlanFor(duel, row, pace, {fixed = null} = {}) {
  const probe = linePointsFor(duel.course, row, .55);
  const ice = iceZonesOf(duel, probe.startS, probe.exitS + 100);
  const dry = {course: duel.course, car: duel.car, _drivingSurface: (s, lateral) =>
    ({...duel._drivingSurface(s, lateral), traction: 1, gripKind: 'asphalt'})};
  // The speed is settled before the ice and held to the turn-in: the first ice stretch to the hairpin is a no-braking zone.
  const hold = ice.length ? [{s0: ice[0].s0 - LESSON_LINE.iceClearM, s1: probe.turnInS}] : [];
  const options = {yawMargin: LESSON_LINE.lineYawMargin, lockMargin: LESSON_LINE.snowLockMargin, noBrakeZones: hold,
    entryClearM: LESSON_LINE.coneClearM,
    apexClearM: duel.state?.tyre === 'winter' ? LESSON_LINE.winterApexClearM : LESSON_LINE.apexClearM, brakeByTraction: true, cruiseMph: row.cruiseMph, rollingMph: fixed?.rollingMph ?? row.rollingMph,
    ...(fixed ? {startS: fixed.startS} : {})};
  const made = await linePlanFor(duel, row, pace, options);
  // Where the same instructor would start braking on dry asphalt; used only to place the board.
  const dryPlan = await linePlanFor(dry, row, pace, {...options, lockMargin: LESSON_LINE.lineYawMargin, noBrakeZones: [], brakeByTraction: false, cruiseMph: row.dryCruiseMph ?? row.cruiseMph,
    startS: made.startS, rollingMph: made.rollingMph});
  const {points} = made;
  const cones = fixed?.placement ?? placeCones(duel.course, {brakeS: made.profile.brakeS, apexS: points.apexes[0].s,
    exitS: points.exitS, turnInS: points.turnInS, dir: points.dir});
  const placement = fixed?.placement ?? {...cones, redBoardS: Math.min(Math.max(dryPlan.profile.brakeS, cones.cones[0].s), points.turnInS), ice};
  return {...made, placement, dryBrakeS: dryPlan.profile.brakeS, ice};
}

// Heavy native work starts only when explicitly called, not on import. This
// owns a fresh Duel and never reads an App, profile, storage or live race.
// Frame partitioning only feeds the fixed 120 Hz race-rule clock.
export async function buildInstructorRun({courseId, car, upgrades = {}, difficulty = 'casual',
  driverId = 'club', seed = 1989, fps = 60, maxSeconds = 120, lessonId = 'corner', tyre = 'summer', _fixed = null} = {}) {
  if (!['casual', 'pro'].includes(difficulty) || !Number.isFinite(fps) || fps <= 0 ||
      !Number.isFinite(maxSeconds) || maxSeconds <= 0) throw new TypeError('Invalid instructor options');
  if (!['corner', 'line', 'snow'].includes(lessonId) || !['summer', 'winter'].includes(tyre)) throw new TypeError('Unknown driving lesson');
  const isLine = lessonId === 'line', isSnow = lessonId === 'snow';
  const row = (isSnow ? DRIVE_SNOW_ROWS : isLine ? DRIVE_LINE_ROWS : DRIVE_LESSON_CORNERS).find(item => item.courseId === courseId);
  if (!row) throw new TypeError('Course has no driving lesson');
  const [{Duel}, {COURSE, CARS, DRIVE, steerForYaw}] = await Promise.all([
    import('../game.js'), import('../config.js'),
  ]);
  if (!Object.hasOwn(CARS, car)) throw new TypeError('Instructor needs the player car');
  const duel = new Duel({seed, featureFlags: {enabled: name => name === 'tyre-slip'}});
  duel.startCampaign({seed, car, upgrades: {...upgrades}, difficulty, driverId,
    mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(item => item.id === courseId), tyre});
  const course = duel.course, state = duel.state, spec = duel.car;
  const pace = difficulty === 'casual' ? .92 : .97;
  const planned = isSnow ? await snowPlanFor(duel, row, pace, {fixed: _fixed}) : isLine ? await linePlanFor(duel, row, pace) : await lessonPlanFor(duel, row, pace);
  // The winter instructor drives the summer instructor's gate, rolling speed and cones on winter tyres.
  const winter = isSnow && tyre === 'summer' ? await buildInstructorRun({courseId, car, upgrades, difficulty, driverId, seed, fps, maxSeconds, lessonId, tyre: 'winter',
    _fixed: {startS: planned.startS, rollingMph: planned.rollingMph, placement: planned.placement}}) : null;
  const {startS, turn, line, profile, placement} = planned, rollingMph = planned.rollingMph ?? row.rollingMph;
  const plan = {course, car: spec, line, profile, drive: DRIVE, steerForYaw,
    difficulty, turnInS: turn.s0, turnOutS: turn.s1, brakeS: profile.brakeS};
  // Lesson rules explicitly use the new tyres even in a Casual lesson. This
  // is confined to this fresh scratch race; ordinary Casual remains exact.
  state.tyreSlipRules = true; state.tyreSlip = 0;
  state.status = 'racing'; state.countdown = 0; state.s = startS;
  state.lateral = line.offsetAt(startS); state.headingError = line.relHeadingAt(startS);
  state.speedMph = rollingMph;
  const rollingGear = spec.gears.findIndex(top => top * DRIVE.gearCeilFrac >= rollingMph);
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
      x: world.x, y: world.y, z: world.z, tyreSlip: state.tyreSlip || 0,
      yawVelocity: state.yawVelocity};
  };
  const off = duel.onChange((current, event) => {
    if (event.crash || event.scrape || event.boundaryReset || event.checkpointReset) faults.push({fromS: tickStartS, s: current.s, reason: 'contact/reset'});
  });
  let ticks = 0, frames = 0;
  poses.push(capture(0));
  try {
    const needsTick = () => state.s < placement.finishS;
    while (needsTick() && ticks < maxSeconds * 120) {
      const frameTicks = Math.floor(++frames * 120 / fps + 1e-9);
      while (ticks < frameTicks && ticks < maxSeconds * 120 && needsTick()) {
        const controls = instructorControls(state, duel._drivingSurface(state.s, state.lateral), plan);
        // Inputs start at the current native pose, not one tick later.
        poses.at(-1).brake = controls.brake;
        poses.at(-1).throttle = controls.throttle;
        tickStartS = state.s;
        duel.setInput(controls);duel.step(1 / 120);ticks++;
        poses.push(capture(ticks / 120, controls.brake));
        if (state.offRoad || state.tyreSlip > 1 || state.status !== 'racing' || state.impactTimer > 0) {
          faults.push({fromS: tickStartS, s: state.s, reason: 'offroad/slide/status',
            t: ticks / 120, lateral: state.lateral, mph: state.speedMph,
            headingError: state.headingError, offRoad: state.offRoad, tyreSlip: state.tyreSlip,
            status: state.status, impactTimer: state.impactTimer, input: {...state.input}});
        }
      }
    }
    const {timeSec, poses: recorded} = finishInstructorTrace(poses, placement.finishS, faults);
    const corner = {id: isSnow ? row.cornerNames[0] : isLine ? row.cornerNames[0].replace(/ \d+$/, '') : row.cornerName, startS, finishS: placement.finishS, dir: turn.dir,
      turnInS: turn.s0, turnOutS: turn.s1};
    // Lesson 2 also records where the plan starts braking, for the road-before-braking check.
    const instructor = {...placement, timeSec, poses: recorded, ...(isLine || isSnow ? {brakeS: profile.brakeS} : {}),
      ...(winter ? {winter: {timeSec: winter.instructor.timeSec, poses: winter.instructor.poses}} : {})};
    // Use the very same physical cone counter as the student's lesson.
    const lesson = createDriveLesson(lessonId, {corner, instructor});
    const carView = pose => ({s: pose.s, lateral: pose.lateral, world: {x: pose.x, z: pose.z},
      speedMph: pose.mph, brake: pose.brake, throttle: pose.throttle, tyreSlip: pose.tyreSlip, status: 'racing'});
    stepDriveLesson(lesson, carView(recorded[0]), {start: true}, 0);
    for (let i = 1; i < recorded.length; i++) stepDriveLesson(lesson, carView(recorded[i]), {}, recorded[i].t - recorded[i - 1].t);
    const nearest = instructorConeDistances(recorded, placement.cones);
    if (lesson.lastAttempt?.cones.length !== placement.cones.length) {
      throw new Error('Instructor missed a native cone: ' + JSON.stringify(lesson.lastAttempt?.cones) + ', nearest ' + nearest.map(n => n.toFixed(2)).join(' ') + ' m');
    }
    // Never look like clipping a cone: clear every cone by minClearM past the distance that tips it.
    if (nearest.some(distance => distance < TIP_DISTANCE_M + LESSON_LINE.minClearM)) {
      throw new Error('Instructor too close to a cone: nearest ' + nearest.map(n => n.toFixed(2)).join(' ') + ' m, needs ' + (TIP_DISTANCE_M + LESSON_LINE.minClearM) + ' m');
    }
    return {corner, instructor, courseId, car, upgrades: {...upgrades}, difficulty, seed, ...(isLine || isSnow ? {lessonId, tyre} : {})};
  } finally { off(); }
}
