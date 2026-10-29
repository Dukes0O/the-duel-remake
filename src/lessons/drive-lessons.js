import {driveRadioId} from './drive-radio-lines.js';

const sectionRow = (courseId, cornerNames, startPiece, startOffsetM, finishPiece, finishOffsetM = 0, finishEdge = 's1') =>
  Object.freeze({courseId, cornerName: cornerNames.join(', '), cornerNames: Object.freeze(cornerNames),
    startPiece, startOffsetM, finishPiece, finishOffsetM, finishEdge});
const PANORAMA = ['Griffin Bend', 'The Cutting', 'Reid Rise', 'Summit Park', 'Skyline',
  'The Esses 1', 'The Esses 2', 'The Esses 3', 'Forrest Elbow'];
const BEAVER = ['Ridge Corner', 'Beaver Kink', 'Beaver Hairpin'];
// Turns the track script leaves without a name get one for the lessons, found by the metre where the turn begins.
export const LESSON_TURN_NAMES = Object.freeze({
  'summit-run': Object.freeze({'Picnic Bend': 4462, 'Engineer Bend': 5380, 'Glacier Exit': 8754,
    'Whiteout Bend': 9439, 'Gallery Bend 1': 10570, 'Gallery Bend 2': 11170}),
  // The two bends the Kogane Pass script leaves unnamed: R43 after Cedar Hairpin, L44 after Maple Hairpin.
  'kogane-pass': Object.freeze({'Cedar Bend': 1206, 'Maple Bend': 1782}),
});
export const DRIVE_LESSON_CORNERS = Object.freeze([
  sectionRow('panorama-ridge', PANORAMA, 'Griffin Bend', -700, 'Forrest Elbow', 60),
  sectionRow('tremblant-woods', ['Beaver Kink', 'Beaver Hairpin', 'Devil\'s Chicane 1', 'Devil\'s Chicane 2', 'Lodge Bend', 'Final Turn'], 'Beaver Run', 100, 'Final Turn', 60),
  sectionRow('ardennes-forest', ['Les Combes', 'Combes Exit', 'Malmedy', 'Riverside', 'Woodland Left', 'Fagnes', 'Fagnes Exit'], 'Kestrel Straight', 0, 'Fagnes Exit', 60),
  // Brian's Hairpin Lesson (docs/story/kogane-invitation.md 8.1). The board lists it only while the course itself exists,
  // which is while the kogane-pass switch is on.
  sectionRow('kogane-pass', ['Car Park Corner', 'Cedar Hairpin', 'Cedar Bend', 'Maple Hairpin', 'Maple Bend', 'Tea House Hairpin'],
    'Shrine Straight', 0, 'Tea House Hairpin', 60),
]);

export const DRIVE_LESSON_STEPS = Object.freeze([
  Object.freeze({id: 'watch', title: 'Watch me', rule: 'none', whatCounts: 'Watch the instructor. Nothing is scored.', line: false, ghost: false}),
  Object.freeze({id: 'follow', title: 'Follow me', rule: 'none', whatCounts: 'Practise with every guide. Nothing is scored.', line: true, ghost: true, ghostLeadSeconds: 1}),
  Object.freeze({id: 'your-turn', title: 'Your turn', rule: 'clean-and-checks-or-faster', whatCounts: 'Clean run, and hit every brake zone or beat my time.', line: true, ghost: false}),
  Object.freeze({id: 'beat', title: 'Beat me', rule: 'clean-and-faster', whatCounts: 'One clean run faster than the instructor. A second faster earns gold.', line: false, ghost: true}),
]);
export const GEAR_LESSON = Object.freeze({greenMarkRevs: .5, lightsRevs: .9, limiterRevs: 1,
  instructorUpRevs: .96, apexRevs: .75, downCapRevs: .92, shiftEverySec: .25,
  lookAheadM: 150, startMph: 30, startGear: 1, accelShare: 4});
const rounded = value => Math.round(value * 1e12) / 1e12;
const clamp = value => Math.max(0, Math.min(1, value));
const answer = (radio = null, cones = []) => ({result: 'running', radio, cones});
function finite(value, name) { if (!Number.isFinite(value)) throw new TypeError('Invalid ' + name); }
export const TIP_DISTANCE_M = .8;
function coneDistance(from, to, cone) {
  const dx = to.world.x - from.world.x, dz = to.world.z - from.world.z;
  const length2 = dx * dx + dz * dz;
  const u = length2 ? clamp(((cone.x - from.world.x) * dx + (cone.z - from.world.z) * dz) / length2) : 0;
  return Math.hypot(from.world.x + dx * u - cone.x, from.world.z + dz * u - cone.z);
}
export function instructorConeDistances(poses, cones) {
  return cones.map(cone => {
    let nearest = Infinity;
    for (let i = 1; i < poses.length; i++) nearest = Math.min(nearest,
      coneDistance({world: poses[i - 1]}, {world: poses[i]}, cone));
    return nearest;
  });
}
// Positive means behind. Distance, not ghost time, is the comparison axis.
export function instructorTimeAtDistance(poses, s) {
  finite(s, 'distance');
  if (!Array.isArray(poses) || !poses.length) throw new TypeError('Missing instructor trace');
  if (s <= poses[0].s) return poses[0].t;
  if (s >= poses.at(-1).s) return poses.at(-1).t;
  let lo = 0, hi = poses.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (poses[mid].s < s) lo = mid; else hi = mid; }
  const a = poses[lo], b = poses[hi];
  return a.t + (b.t - a.t) * (s - a.s) / (b.s - a.s);
}
export const driveLessonGap = (instructor, s, elapsedSeconds) => elapsedSeconds - instructorTimeAtDistance(instructor.poses, s);
export const driveLessonGold = margin => Number.isFinite(margin) && margin >= 1;
export function createDriveLesson(id, {corner, instructor, retake = false} = {}) {
  if (!['corner', 'line', 'gears', 'snow'].includes(id) || !corner || !instructor) throw new TypeError('Invalid driving lesson');
  for (const key of ['startS', 'finishS', 'dir']) finite(corner[key], key);
  if (!(corner.finishS > corner.startS) || Math.abs(corner.dir) !== 1 || !(instructor.timeSec > 0) ||
      !Array.isArray(instructor.corners) || !instructor.corners.length) throw new TypeError('Invalid lesson section');
  let previous = corner.startS;
  for (const c of instructor.corners) {
    for (const key of ['approachS', 'turnInS', 'turnOutS', 'exitS', 'targetMph']) finite(c[key], key);
    if (!['brake', 'lift', 'flat'].includes(c.kind) || c.approachS < previous ||
      !(c.approachS <= c.turnInS && c.turnInS < c.turnOutS && c.turnOutS <= c.exitS && c.exitS < corner.finishS) || c.targetMph <= 0)
      throw new TypeError('Invalid corner checks');
    if (c.kind === 'brake') finite(c.brakeS, 'brake point');
    previous = c.turnOutS;
  }
  return {id, corner: {...corner}, instructor, stage: retake ? 'your-turn' : 'watch', phase: 'ready',
    done: false, failed: false, bestMargin: 0, gold: false, attempt: null, lastAttempt: null,
    runs: {}, retake: retake === true};
}
export const driveLessonStep = lesson => DRIVE_LESSON_STEPS.find(step => step.id === lesson.stage);
// Any step can be chosen again, back or forward (Kyle, 27 October), and after a pass too (Kyle, 28 October):
// a run in progress is dropped unscored and the next run starts in the chosen step. Passing still needs Beat me.
export function chooseDriveLessonStep(lesson, id) {
  if (!lesson || !DRIVE_LESSON_STEPS.some(step => step.id === id)) return false;
  lesson.stage = id; lesson.phase = 'ready'; lesson.failed = false; lesson.attempt = null;
  return true;
}
// The run the opening screen highlights and Enter starts: the next one not done this visit, counting forward from
// the run just played (Follow me leads to Your turn), then the first one left, else Your turn.
// A retake counts Watch me and Follow me as done, since the first visit did them.
export function suggestedDriveLessonRun(lesson) {
  const runs = lesson?.runs ?? {};
  const isOpen = step => runs[step.id]?.done !== true && !(lesson?.retake === true && step.rule === 'none');
  const from = Math.max(0, DRIVE_LESSON_STEPS.findIndex(step => step.id === lesson?.stage));
  const open = DRIVE_LESSON_STEPS.slice(from).find(isOpen) ?? DRIVE_LESSON_STEPS.find(isOpen);
  return open?.id ?? 'your-turn';
}
function startAttempt(lesson, view) {
  if (view.s > lesson.corner.startS) throw new TypeError('Attempt must start before or at its gate');
  if (lesson.phase === 'result') {
    const i = DRIVE_LESSON_STEPS.findIndex(step => step.id === lesson.stage);
    if (i < 2 || lesson.lastAttempt?.passed) lesson.stage = DRIVE_LESSON_STEPS[Math.min(3, i + 1)].id;
  }
  lesson.phase = 'driving'; lesson.failed = false;
  lesson.attempt = {elapsedSeconds: 0, screechSeconds: 0, offRoadSeconds: 0, maxOffRoadSeconds: 0,
    wallHit: false, timerStarted: view.s === lesson.corner.startS, previous: {...view, world: {...view.world}},
    cones: [], tipped: [], firstBrakeS: null,
    corners: lesson.instructor.corners.map(c => ({name: c.name, firstBrakeS: null, brakeMax: 0, minMph: Infinity, screechSeconds: 0, wallHit: false}))};
  return answer(driveRadioId('shared', lesson.stage));
}
function cornerResult(c, row) {
  const brakeDeltaM = row.firstBrakeS === null || c.brakeS === null ? null : row.firstBrakeS - c.brakeS;
  const brake = c.kind === 'flat' ? null : c.kind === 'lift' ? row.brakeMax === 0 :
    brakeDeltaM !== null && brakeDeltaM >= -15 && brakeDeltaM <= 5;
  const speed = Number.isFinite(row.minMph) && Math.abs(row.minMph - c.targetMph) <= 5;
  const quiet = row.screechSeconds < .3;
  const checks = {brake, speed, quiet};
  const missed = Object.values(checks).filter(value => value === false).length;
  const {result: previousResult, ...observation} = row;
  return {...observation, minMph: Number.isFinite(row.minMph) ? row.minMph : null,
    targetMph: c.targetMph, kind: c.kind, brakeDeltaM, checks, passed: missed === 0 && !row.wallHit,
    light: row.wallHit || !quiet ? 'red' : missed ? 'amber' : 'green', missed};
}
export function driveLessonAdvice(rows) {
  const worst = [...rows].sort((a, b) => Number(b.wallHit) - Number(a.wallHit) || Number(!b.checks.quiet) - Number(!a.checks.quiet) || b.missed - a.missed || b.screechSeconds - a.screechSeconds)[0];
  if (!worst) return '';
  const name = worst.name + ': ';
  if (worst.wallHit) return name + 'you hit the wall; slow before turning so the car stays on the road.';
  const brake = worst.brakeDeltaM === null ? 'you missed the brake zone' : `you braked ${Math.abs(worst.brakeDeltaM).toFixed(0)} m ${worst.brakeDeltaM > 0 ? 'late' : 'early'}`;
  if (!worst.checks.quiet) return name + (worst.kind === 'brake' ? brake : 'you turned with too little grip') + ` and the tyres slid for ${worst.screechSeconds.toFixed(1)} s; sliding tyres grip less, so the car can run wide.`;
  if (worst.checks.brake === false) return name + (worst.kind === 'lift' ? 'leave the brake alone and lift the accelerator to keep the car settled.' : brake + '; slow while straight to leave grip for turning.');
  if (!worst.checks.speed) return name + `aim for ${worst.targetMph.toFixed(0)} mph through the corner to balance speed and grip.`;
  return name + 'you kept the speed and tyres under control; use the same line again.';
}
// Choose feedback from the same observed checks as the result card, without
// changing a rule or a race input. Off-road/wall and slides come first.
export function driveLessonResultRadio(lesson, rows, {reason, success, clean, faster}) {
  if (success && lesson.stage === 'beat') return driveRadioId(lesson.id, 'pass');
  // A run always goes on to the finish; walls and long trips off the road only mark it not clean.
  if (reason === 'wall' || reason === 'offroad' || reason === 'wreck' || lesson.attempt?.wallHit || lesson.attempt?.maxOffRoadSeconds > 1) return driveRadioId('shared', 'off');
  if (!clean && lesson.attempt.screechSeconds >= .3) return driveRadioId('shared', 'slid');
  const worst = [...rows].sort((a, b) => Number(b.wallHit) - Number(a.wallHit) ||
    Number(!b.checks.quiet) - Number(!a.checks.quiet) || b.missed - a.missed || b.screechSeconds - a.screechSeconds)[0];
  let miss = 'clean';
  if (worst?.wallHit) miss = 'off';
  else if (worst && !worst.checks.quiet) miss = 'slid';
  else if (worst?.checks.brake === false) miss = worst.kind === 'lift' ? 'lift' : worst.brakeDeltaM < 0 ? 'early' : 'late';
  else if (worst && !worst.checks.speed) miss = worst.minMph > worst.targetMph ? 'fast' : 'slow';
  else if (reason !== 'finish' || (!faster && lesson.stage === 'beat')) miss = 'pace';
  return driveRadioId('shared', miss);
}
function finishAttempt(lesson, reason, cones) {
  const a = lesson.attempt, finished = reason === 'finish';
  const rows = a.corners.map((row, i) => cornerResult(lesson.instructor.corners[i], row));
  const clean = !a.wallHit && a.maxOffRoadSeconds <= 1 && a.screechSeconds < .3;
  const margin = Math.round(lesson.instructor.timeSec * 1e6) / 1e6 - Math.round(a.elapsedSeconds * 1e6) / 1e6;
  const faster = finished && margin > 0;
  const scored = lesson.stage === 'your-turn' || lesson.stage === 'beat';
  const success = scored && finished && clean && (lesson.stage === 'beat' ? faster : faster || rows.every(row => row.passed));
  lesson.lastAttempt = {elapsedSeconds: a.elapsedSeconds, screechSeconds: a.screechSeconds,
    firstBrakeS: a.firstBrakeS, cones: [...a.cones], rules: rows.flatMap(row => Object.values(row.checks).filter(v => v !== null)),
    corners: rows, advice: driveLessonAdvice(rows), clean, finished, passed: success, endReason: reason,
    progressM: Math.max(0, Math.min(a.previous.s, lesson.corner.finishS) - lesson.corner.startS),
    instructorSeconds: lesson.instructor.timeSec, timeLostSeconds: finished ? rounded(a.elapsedSeconds - lesson.instructor.timeSec) : null};
  const radio = driveLessonResultRadio(lesson, rows, {reason, success, clean, faster});
  lesson.lastAttempt.radio = radio;
  lesson.phase = 'result';
  if (success && faster) lesson.bestMargin = Math.max(lesson.bestMargin, rounded(margin));
  lesson.gold = driveLessonGold(lesson.bestMargin);
  // What this visit has done, for the marks on the run buttons: a finished practice run, or a passed scored run with its best margin.
  if (scored ? success : finished) {
    lesson.runs ??= {};
    const before = lesson.runs[lesson.stage]?.margin ?? 0;
    lesson.runs[lesson.stage] = {done: true, margin: success && faster ? Math.max(before, rounded(margin)) : before};
  }
  if (success && lesson.stage === 'beat') { lesson.done = true; return {result: 'passed', radio, cones}; }
  lesson.failed = scored && !success;
  return {result: lesson.failed ? 'retry' : 'running', radio, cones};
}
// Only lesson state changes here. Observations never write the race or storage.
export function stepDriveLesson(lesson, view, events = {}, dt = 0) {
  for (const key of ['s', 'lateral', 'speedMph', 'brake', 'throttle', 'tyreSlip']) finite(view[key], key);
  finite(view.world?.x, 'world x'); finite(view.world?.z, 'world z'); finite(dt, 'step time');
  if (dt < 0) throw new TypeError('Negative step time');
  if (view.paused || view.status !== 'racing') return answer();
  if (events.start && lesson.phase !== 'driving') return startAttempt(lesson, view);
  if (lesson.phase !== 'driving') return answer();
  const a = lesson.attempt, from = a.previous, advance = view.s - from.s;
  if (dt === 0 && (advance || view.world.x !== from.world.x || view.world.z !== from.world.z)) throw new TypeError('Movement needs positive elapsed time');
  const overlap = (lo, hi) => advance > 0 ? Math.max(0, clamp((hi - from.s) / advance) - clamp((lo - from.s) / advance)) : Number(view.s >= lo && view.s <= hi);
  const wasStarted = a.timerStarted;
  const crossesStart = from.s <= lesson.corner.startS && view.s >= lesson.corner.startS;
  if (crossesStart) a.timerStarted = true;
  const active = wasStarted ? dt * (advance > 0 ? clamp((lesson.corner.finishS - from.s) / advance) : 1)
    : crossesStart ? dt * overlap(lesson.corner.startS, lesson.corner.finishS) : 0;
  a.elapsedSeconds = rounded(a.elapsedSeconds + active);
  if (view.tyreSlip > 1) a.screechSeconds = rounded(a.screechSeconds + active);
  a.offRoadSeconds = view.offRoad ? rounded(a.offRoadSeconds + active) : 0;
  a.maxOffRoadSeconds = Math.max(a.maxOffRoadSeconds, a.offRoadSeconds);
  a.wallHit ||= !!(events.wallHit || events.crashed);
  if (a.firstBrakeS === null && view.brake >= .5) a.firstBrakeS = from.s;
  lesson.instructor.corners.forEach((c, i) => {
    const row = a.corners[i], approach = dt * overlap(c.approachS, c.turnOutS);
    if (approach > 0) {
      row.brakeMax = Math.max(row.brakeMax, view.brake);
      if (row.firstBrakeS === null && from.brake < .5 && view.brake >= .5) row.firstBrakeS = from.s;
    }
    const turnTime = dt * overlap(c.turnInS, c.turnOutS);
    if (turnTime > 0) {
      row.minMph = Math.min(row.minMph, view.speedMph);
      if (view.tyreSlip > 1) row.screechSeconds = rounded(row.screechSeconds + turnTime);
    }
    if (dt * overlap(c.approachS, c.exitS) > 0 && (events.wallHit || events.crashed)) row.wallHit = true;
  });
  const cones = [];
  for (const cone of lesson.instructor.cones) {
    const distance = coneDistance(from, view, cone);
    if (distance <= 2.5 && !a.cones.some(row => row.id === cone.id)) a.cones.push({id: cone.id});
    if (distance <= TIP_DISTANCE_M && !a.tipped.includes(cone.id)) { a.tipped.push(cone.id); cones.push({id: cone.id, tipped: true, cue: 'lesson.cone'}); }
  }
  a.previous = {...view, world: {...view.world}};
  a.gapSeconds = driveLessonGap(lesson.instructor, view.s, a.elapsedSeconds);
  a.corners.forEach((row, i) => { row.result = cornerResult(lesson.instructor.corners[i], row); });
  // Mistakes never end a run (Kyle, 27 October): it ends at the finish, or when the car is wrecked and cannot go on.
  const reason = view.s >= lesson.corner.finishS ? 'finish' : events.wrecked ? 'wreck' : null;
  return reason ? finishAttempt(lesson, reason, cones) : answer(null, cones);
}

export const LESSON_LINE = Object.freeze({step: 1, accelShare: .75, yawMargin: .96,
  mainBrake: .8, lightBrake: .45, holdShare: .5});

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
  sectionRow('tremblant-woods', ['Pine Drop', 'Lakeside Plunge', 'Fir Esses 1', 'Fir Esses 2', ...BEAVER],
    'Lodge Straight', 100, 'Timber Straight', 150, 's0'),
  sectionRow('harbour-lights', ['Lantern Kink', 'Casino Corner', 'Temple Hill', 'Bell Tower Bend', 'Old Town Esses 1',
    'Old Town Esses 2', 'Old Town Esses 3', 'Old Town Esses 4', 'Precinct Bend'], 'Seafront Straight', 100, 'Hairpin Approach'),
  sectionRow('ardennes-forest', ['Long Left', 'Fagnes', 'Fagnes Exit', 'Campus', 'Stavelot', 'Woodcutter', 'Whitewood'], 'Woodland Left', 200, 'Whitewood', 130),
]);
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

export function buildLessonPlan(line, {car, pace, rollingMph, tractionAt, speedLimitAt,
  brakeZoneS, drive, accelAt, tyreSlipSteering, holdMode = 'exit', yawMargin = LESSON_LINE.yawMargin, noBrakeZones = [], brakeByTraction = false, cruiseMph = Infinity, lockMargin = yawMargin, accelShare = LESSON_LINE.accelShare}) {
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
    mph[i] = Math.min(mph[i], frozen(i) ? mph[i - 1] : Math.sqrt(v * v + 2 * accelShare * accelAt(car, mph[i - 1]) * toWorld * step) / toWorld);
  }
  // The corner's braking point: where the plan starts falling toward turn-in (or toward the start of a
  // no-braking zone, when the speed has to be settled before it).
  let brake = Math.min(index(points.turnInS), ...noBrakeZones.map(zone => Math.floor((zone.s0 - startS) / step)));
  while (brake > 0 && mph[brake - 1] > mph[brake] + 1e-9) brake--;
  const at = s => {
    const p = Math.max(0, Math.min(count - 1, (s - startS) / step)), i = Math.min(count - 2, Math.floor(p));
    return (mph[i] + (mph[i + 1] - mph[i]) * (p - i)) / pace;
  };
  return Object.freeze({mph, pace, brakeS: startS + brake * step, at});
}

class InstructorRunFault extends Error {}

// Observation may extend beyond the lesson to find the widest exit point.
// Keep only the gate-to-gate trace. A fault on a tick that starts before the
// finish remains a fault even if that tick ends beyond it.
export function finishInstructorTrace(poses, finishS, faults = []) {
  const at = poses.findIndex(pose => pose.s >= finishS);
  const fault = faults.find(item => !Number.isFinite(item.fromS) || item.fromS < finishS);
  if (at <= 0 || fault) throw new InstructorRunFault('Instructor did not finish cleanly: '+JSON.stringify(fault ?? {finishS}));
  const a = poses[at - 1], b = poses[at];
  const fraction = (finishS - a.s) / (b.s - a.s);
  const timeSec = a.t + (b.t - a.t) * fraction;
  // A gear is a whole number: the finish pose is in the gear the step before it was in.
  const finish = Object.fromEntries(Object.entries(b).map(([key, value]) => [key, key === 'gear' ? a.gear :
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
  const pace = profile.pace ?? (plan.difficulty === 'casual' ? .92 : .97);
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
  const brake = (!turning || plan.brakeInTurns === true || state.s < (plan.brakeS ?? -Infinity)) && (state.speedMph > targetMph + 1 || (planned > 0 && state.speedMph > targetMph - .5))
    ? Math.min(cap, Math.max(0, planned + (state.speedMph - targetMph) / 4)) : 0;
  const steerTarget = .98 * steerForYaw(desiredYaw, {speedMph: state.speedMph, grip: car.grip,
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

export const DRIVE_SNOW_ROWS = Object.freeze([
  sectionRow('tremblant-snow', ['Fir Esses 1', 'Fir Esses 2', ...BEAVER], 'Lakeshore', 0, 'Timber Straight', 150, 's0'),
  sectionRow('summit-run', ['Whiteout Bend', 'Gallery Bend 1', 'Gallery Bend 2'], 'Whiteout Crest', 250, "Devil's Staircase", 250, 's0'),
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

export const DRIVE_GEAR_ROWS = Object.freeze([
  sectionRow('panorama-ridge', PANORAMA.slice(0, 4), 'Mountain Straight', 0, 'Summit Park', 60),
  sectionRow('tremblant-woods', ['Fir Esses 1', 'Fir Esses 2', ...BEAVER], 'Lakeshore', 0, 'Timber Straight', 150, 's0'),
  sectionRow('summit-run', ['Picnic Hairpin', 'Picnic Bend', "Engineer's Hairpin", 'Engineer Bend'], 'Pine Switchbacks', 0, 'Engineer Bend', 60),
]);

export function gearFor(gears, mph, revs = GEAR_LESSON.apexRevs, cap = GEAR_LESSON.downCapRevs) {
  let best = gears.length - 1, bestGap = Infinity;
  gears.forEach((top, gear) => {
    const turning = mph / top;
    if (turning <= cap && Math.abs(turning - revs) < bestGap) { best = gear; bestGap = Math.abs(turning - revs); }
  });
  return best;
}

// The instructor's hands for lesson 3: lesson 1's pedals and wheel (the speed plan), plus the gearbox. Up at 96% revs.
// Down, while braking, one gear at a time, to the gear that puts the slowest speed in the road ahead nearest 75% revs.
// `plan.tooHigh` leaves the corner that many gears too high, for the proof. `plan.shifts` is the run's own memory of the last change.
export function gearsControls(state, surface, plan) {
  const pace = plan.profile.pace ?? (plan.difficulty === 'casual' ? .92 : .97);
  const base = instructorControls(state, surface, {...plan, brakeS: -Infinity, brakeInTurns: true});
  const gears = plan.car.gears, memory = plan.shifts;
  memory.cool = Math.max(0, memory.cool - 1 / 120);
  let shiftUp = false, shiftDown = false;
  if (memory.cool === 0) {
    if (base.brake === 0 && state.revs >= GEAR_LESSON.instructorUpRevs && state.gear < gears.length - 1) shiftUp = true;
    else if (base.brake > 0 && state.gear > 0) {
      let slowest = Infinity;
      for (let ahead = 0; ahead <= GEAR_LESSON.lookAheadM; ahead += 10)
        slowest = Math.min(slowest, Math.min(surface.speedLimit, plan.profile.at(state.s + ahead) * pace));
      const wanted = Math.min(gears.length - 1, gearFor(gears, slowest) + (plan.tooHigh ?? 0));
      shiftDown = state.gear > wanted && state.speedMph / gears[state.gear - 1] <= GEAR_LESSON.downCapRevs;
    }
    if (shiftUp || shiftDown) memory.cool = GEAR_LESSON.shiftEverySec;
  }
  return {...base, shiftUp, shiftDown};
}

// V2 section plan. All geometry comes from the course, never from a driven trace.
export async function sectionPlanFor(duel, row, pace, {middle = false, dry = false, rollingMph = null, steadyEntry = rollingMph === null} = {}) {
  const [{DRIVE, tyreSlipSteering}, {accelAt}] = await Promise.all([
    import('../config.js'), import('../race-lines.js'),
  ]);
  const course = duel.course, pieces = course.script.pieces;
  const piece = name => {
    const begins = LESSON_TURN_NAMES[row.courseId]?.[name];
    const found = pieces.find(p => p.name === name) ??
      (begins === undefined ? null : (turn => turn && {...turn, name})(pieces.find(p => p.kind === 'turn' && Math.round(p.s0) === begins)));
    if (!found) throw new Error('Missing section piece: ' + name);
    return found;
  };
  const startS = piece(row.startPiece).s0 + row.startOffsetM;
  const finishS = piece(row.finishPiece)[row.finishEdge] + row.finishOffsetM;
  const turns = row.cornerNames.map(piece);
  const points = {turnInS: turns[0].s0, apexS: turns[0].s0 + (turns[0].s1 - turns[0].s0) * .55,
    exitS: turns.at(-1).s1, dir: turns[0].dir};
  const outsideClear = course.def.id === 'tremblant-snow' ? 4.5 : row.courseId === 'harbour-lights' ? 2 : row.courseId === 'kogane-pass' ? 3.4 : 2.9;
  const apexClear = row.courseId === 'harbour-lights' ? 1.5 : row.courseId === 'kogane-pass' ? 3.4 : 2.5;
  const waypoints = [{s: startS, lateral: -turns[0].dir * (course.roadHalfWidthAt(startS) - outsideClear)}];
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i], previous = turns[i - 1], next = turns[i + 1];
    const outside = s => -turn.dir * (course.roadHalfWidthAt(s) - outsideClear);
    const entry = turn.s0 - 40;
    if (entry > waypoints.at(-1).s + 60 && (!previous || entry > previous.s1 + 30)) waypoints.push({s: entry, lateral: outside(entry)});
    const apexS = turn.s0 + (turn.s1 - turn.s0) * .55;
    waypoints.push({s: apexS, lateral: turn.dir * (course.roadHalfWidthAt(apexS) - apexClear)});
    const exit = turn.s1 + (turn.s1 - apexS);
    if (!next || exit + 80 < next.s0) waypoints.push({s: exit, lateral: outside(exit)});
  }
  waypoints.push({s: finishS + 40, lateral: waypoints.at(-1).lateral});
  const line = middle ? lineFromLateral(course, () => 0, startS, finishS + 40, points)
    : buildWaypointLine(course, waypoints, {startS, endS: finishS + 40, points, ease: 'parabolic'});
  const surface = (s, lat) => dry ? {traction: 1, speedLimit: Infinity} : duel._drivingSurface(s, lat);
  let profile = buildLessonPlan(line, {car: duel.car, pace, rollingMph: rollingMph ?? duel.car.topSpeed,
    tractionAt: (s, lat) => surface(s, lat).traction, speedLimitAt: (s, lat) => surface(s, lat).speedLimit,
    brakeByTraction: true, brakeZoneS: startS, drive: DRIVE, accelAt, tyreSlipSteering,
    holdMode: 'section', yawMargin: course.def.id === 'tremblant-snow' ? .85 : row.courseId === 'harbour-lights' ? .94 : .9, lockMargin: course.def.id === 'tremblant-snow' ? 1.2 : row.courseId === 'harbour-lights' ? .94 : .9});
  if (steadyEntry) {
    const entryMph = Math.min(rollingMph ?? profile.at(startS) * pace, (turns[0].s0 - startS) / (8 * DRIVE.mphToWorld));
    const entryEndS = startS + entryMph * DRIVE.mphToWorld * 6;
    const mph = Float64Array.from(profile.mph);
    for (let i = 0; i < mph.length; i++) {
      const s = startS + i;
      if (s <= entryEndS) mph[i] = Math.min(mph[i], entryMph);
      if (i) mph[i] = Math.min(mph[i], Math.sqrt((mph[i - 1] * DRIVE.mphToWorld) ** 2 +
        2 * LESSON_LINE.accelShare * accelAt(duel.car, mph[i - 1]) * DRIVE.mphToWorld) / DRIVE.mphToWorld);
    }
    const at = s => { const x = Math.max(0, Math.min(mph.length - 1, s - startS)), i = Math.min(mph.length - 2, Math.floor(x));
      return (mph[i] + (mph[i + 1] - mph[i]) * (x - i)) / pace; };
    profile = {...profile, mph, at};
  }
  return {startS, finishS, turn: turns[0], turns, points, line, profile,
    rollingMph: rollingMph ?? Math.floor(profile.at(startS) * pace), placement: {finishS, cones: []}};
}

function sectionCorners(course, made, car, drive) {
  let approachS = made.startS;
  return made.turns.map((turn, index) => {
    const next = made.turns[index + 1];
    const exitS = Math.min(turn.s1 + 30, next?.s0 ?? made.finishS - 1, made.finishS - 1);
    let apexS = turn.s0, exitConeS = turn.s1, targetMph = Infinity, brakeS = null, lifted = false;
    for (let s = turn.s0; s <= turn.s1; s++) {
      targetMph = Math.min(targetMph, made.profile.at(s) * made.profile.pace);
      if (turn.dir * made.line.offsetAt(s) > turn.dir * made.line.offsetAt(apexS)) apexS = s;
    }
    for (let s = turn.s1; s <= exitS; s++)
      if (turn.dir * made.line.offsetAt(s) < turn.dir * made.line.offsetAt(exitConeS)) exitConeS = s;
    for (let s = approachS; s < turn.s0 + (turn.s1 - turn.s0) * .55; s++) {
      const v = made.profile.at(s) * made.profile.pace * drive.mphToWorld;
      const ahead = made.profile.at(s + 2) * made.profile.pace * drive.mphToWorld;
      const brake = Math.max(0, (v * v - ahead * ahead) / 4) / (drive.brakeAccel * car.braking * drive.mphToWorld);
      if (brake > .01 && brakeS === null) brakeS = s;
      lifted ||= made.profile.at(s + 1) <= made.profile.at(s) + .001;
    }
    const cone = (s, dir) => {
      const lateral = dir * (course.roadHalfWidthAt(s) - .3);
      return {s, lateral, ...course.groundAt(s, lateral)};
    };
    if (brakeS !== null && index) brakeS = Math.max(brakeS, approachS + 3);
    const row = {name: turn.name, kind: brakeS !== null ? 'brake' : lifted ? 'lift' : 'flat',
      approachS, turnInS: turn.s0, turnOutS: turn.s1, exitS, brakeS, targetMph,
      brakeZone: brakeS === null ? null : {s0: brakeS - 15, s1: brakeS + 5},
      apexCone: cone(apexS, turn.dir), exitCone: cone(exitConeS, -turn.dir)};
    approachS = turn.s1;
    return row;
  });
}

// The public brake point is also the instructor's planned first firm pedal input.
// Firm input begins at the public point; linked corners get a short release between presses.
export function sectionControls(state, surface, plan, {gears = false, late = false, tyreSlipSteering} = {}) {
  const corner = plan.corners.find(c => state.s >= c.approachS && state.s < c.turnOutS);
  const firstBrake = plan.corners.find(c => c.kind === 'brake');
  const brakeS = corner?.brakeS === null ? null : corner?.brakeS + (late && corner === firstBrake ? 25 : 0);
  const braking = corner?.kind === 'brake' && state.s >= brakeS;
  const pace = plan.profile.pace;
  const profile = late && corner === firstBrake && state.s <= corner.turnOutS ?
    {...plan.profile, at: s => plan.profile.at(s - 25)} : plan.profile;
  const steerForYaw = late ? (yaw, options) => {
    const {steerGain} = tyreSlipSteering(options);
    return Math.max(-1, Math.min(1, -yaw / Math.max(.05, steerGain)));
  } : plan.steerForYaw;
  const active = {...plan, profile, steerForYaw};
  const controls = gears ? gearsControls(state, surface, active) : instructorControls(state, surface, active);
  if (corner && corner !== plan.corners[0] && state.s < corner.approachS + 2) controls.brake = 0;
  else if (braking && state.s < brakeS + 2) controls.brake = Math.max(.5, controls.brake);
  if (corner?.kind === 'lift' || corner?.kind === 'flat') controls.brake = 0;
  if (late && firstBrake && state.s < firstBrake.brakeS + 25) controls.brake = 0;
  if (controls.brake > 0) controls.throttle = 0;
  return controls;
}

// Heavy native work starts only when explicitly called, not on import. This
// owns a fresh Duel and never reads an App, profile, storage or live race.
// Frame partitioning only feeds the fixed 120 Hz race-rule clock.
// The instructor leaves room to beat him (docs/DRIVING_LESSONS.md 14.8): his
// time is at least `margin` slower than a clean full-pace run of his own line
// in your car, so a fast car is no harder to beat than a slow one.
export const INSTRUCTOR_PACE = {casual: {initial: .92, floor: .78, margin: .07}, pro: {initial: .95, floor: .85, margin: .04}};
export const MAX_INSTRUCTOR_TRIES = 6;
export async function buildInstructorRun(options = {}) {
  const {difficulty = 'casual', lessonId = 'corner'} = options;
  const {initial, floor, margin} = INSTRUCTOR_PACE[difficulty];
  // A full-pace run that slides or leaves the road gives no reference; the
  // pace then follows the faults alone. The winter comparison keeps the summer gate.
  const full = options._fixed ? null : await buildInstructorAttempt({...options, _mode: 'fast'}, initial, 0);
  const fullSec = full && full.instructor.poses.at(-1).s >= full.corner.finishS - .5 ? full.instructor.timeSec : null;
  const needed = fullSec === null ? 0 : fullSec * (1 + margin);
  // The winter comparison starts at the summer run's pace, so the tyres are the only difference.
  let pace = options._pace ?? initial, result = null, fault = null;
  for (let tries = 0; tries < MAX_INSTRUCTOR_TRIES; tries++) {
    try {
      result = await buildInstructorAttempt(options, pace, tries);
    } catch (error) {
      if (!(error instanceof InstructorRunFault)) throw error;
      fault = error;
      if (pace === floor) break;
      pace = Math.max(floor, Math.round((pace - .02) * 100) / 100);
      continue;
    }
    if (result.instructor.timeSec >= needed || pace === floor) break;
    // About 0.7% more time for each 1% of pace; step a little further to land past the line.
    const short = (needed - result.instructor.timeSec) / result.instructor.timeSec;
    pace = Math.max(floor, Math.round((pace - Math.max(.01, short * 1.6)) * 100) / 100);
  }
  if (!result) throw fault;
  result.instructor.fullPaceSec = fullSec;
  if (lessonId === 'corner') {
    const clip = await buildInstructorAttempt({...options, _mode: 'late'}, result.instructor.pace, result.instructor.retries);
    result.instructor.lateClip = {poses: clip.instructor.poses, inputs: clip.instructor.inputs,
      timeSec: clip.instructor.timeSec, screechSeconds: clip.instructor.screechSeconds, faults: clip.instructor.faults};
  }
  return result;
}

async function buildInstructorAttempt({courseId, car, upgrades = {}, difficulty = 'casual',
  driverId = 'club', seed = 1989, fps = 60, maxSeconds = 120, lessonId = 'corner', tyre = 'summer', _fixed = null, _mode = 'instructor'} = {}, pace, retries) {
  if (!['casual', 'pro'].includes(difficulty) || !Number.isFinite(fps) || fps <= 0 ||
      !Number.isFinite(maxSeconds) || maxSeconds <= 0) throw new TypeError('Invalid instructor options');
  if (!['corner', 'line', 'snow', 'gears'].includes(lessonId) || !['summer', 'winter'].includes(tyre)) throw new TypeError('Unknown driving lesson');
  const isLine = lessonId === 'line', isSnow = lessonId === 'snow', isGears = lessonId === 'gears';
  const row = (isGears ? DRIVE_GEAR_ROWS : isSnow ? DRIVE_SNOW_ROWS : isLine ? DRIVE_LINE_ROWS : DRIVE_LESSON_CORNERS).find(item => item.courseId === courseId);
  if (!row) throw new TypeError('Course has no driving lesson');
  const [{Duel}, {COURSE, CARS, DRIVE, DIFFICULTY, steerForYaw, tyreSlipSteering}] = await Promise.all([
    import('../game.js'), import('../config.js'),
  ]);
  if (!Object.hasOwn(CARS, car)) throw new TypeError('Instructor needs the player car');
  // Lesson 3 runs on the engine curve (the lesson shows "Opens later" while that switch is off).
  const duel = new Duel({seed, featureFlags: {enabled: name => name === 'tyre-slip' || isGears && name === 'engine-curve'}});
  duel.startCampaign({seed, car, upgrades: {...upgrades}, difficulty, driverId,
    mode: 'timetrial', opponentCount: 0, startStage: COURSE.findIndex(item => item.id === courseId), tyre});
  const course = duel.course, state = duel.state, spec = duel.car;
  // The gearbox lesson is manual whatever the player's setting, and the limiter cannot blow the engine in a lesson.
  // Confined to this scratch race, like the sliding-tyre rules below.
  if (isGears) Object.defineProperty(duel, 'diff', {get: () => ({...DIFFICULTY[difficulty], autoShift: false, engineBlow: false})});
  const reference = _mode === 'fast' || _mode === 'middle' || _mode === 'dry' ? await sectionPlanFor(duel, row, pace, {rollingMph: isGears ? 30 : null}) : null;
  const planned = await sectionPlanFor(duel, row, _mode === 'fast' ? 1 : pace, {middle: _mode === 'middle', dry: _mode === 'dry', rollingMph: isGears ? 30 : reference?.rollingMph ?? null, steadyEntry: !isGears});
  // The winter instructor drives the summer instructor's gate, rolling speed and cones on winter tyres.
  const winter = isSnow && tyre === 'summer' && _mode === 'instructor' ? await buildInstructorRun({courseId, car, upgrades, difficulty, driverId, seed, fps, maxSeconds, lessonId, tyre: 'winter',
    _fixed: {startS: planned.startS, rollingMph: planned.rollingMph, placement: planned.placement}, _pace: pace}) : null;
  const {startS, turn, line, profile, placement} = planned, rollingMph = planned.rollingMph ?? row.rollingMph;
  const plan = {course, car: spec, line, profile, drive: DRIVE, steerForYaw,
    difficulty, turnInS: turn.s0, turnOutS: turn.s1, brakeS: -Infinity, brakeInTurns: true, ...(isGears ? {shifts: {cool: 0}} : {})};
  // Lesson rules explicitly use the new tyres even in a Casual lesson. This
  // is confined to this fresh scratch race; ordinary Casual remains exact.
  state.tyreSlipRules = true; state.tyreSlip = 0;
  state.status = 'racing'; state.countdown = 0; state.s = startS;
  state.lateral = line.offsetAt(startS); state.headingError = line.relHeadingAt(startS);
  state.speedMph = rollingMph;
  const rollingGear = spec.gears.findIndex(top => top * DRIVE.gearCeilFrac >= rollingMph);
  state.gear = isGears ? Math.min(GEAR_LESSON.startGear, spec.gears.length - 1) : rollingGear < 0 ? spec.gears.length - 1 : rollingGear;
  state.revs = state.speedMph / spec.gears[state.gear];
  state.yawVelocity = line.curvatureAt(startS) * state.speedMph * DRIVE.mphToWorld;
  state.traffic = []; state.opponents = [];
  state.nextLapGate = duel._lapGates.filter(s => s <= startS).length;
  const corners = sectionCorners(course, planned, spec, DRIVE);
  plan.corners = corners;
  placement.cones = corners.flatMap(c => [c.apexCone, c.exitCone]).sort((a, b) => a.s - b.s).map((c, i) => ({...c, id: i + 1}));
  placement.redBoardS = (corners.find(c => c.kind === 'brake')?.brakeS ?? profile.brakeS) + 25;
  if (isSnow) {
    const dry = await sectionPlanFor(duel,row,pace,{dry:true,rollingMph,steadyEntry:true});
    placement.redBoardS = sectionCorners(course,dry,spec,DRIVE).find(c=>c.kind==='brake')?.brakeS ?? dry.profile.brakeS;
  }
  const poses = [], inputs = [], faults = [];
  let tickStartS = startS;
  const capture = (t, brake = 0) => {
    const world = course.groundAt(state.s, state.lateral);
    return {t, s: state.s, lateral: state.lateral, brake, throttle: state.input.throttle,
      mph: state.speedMph, heading: course.at(state.s).heading + state.headingError,
      airHeight: state.airHeight || 0, groundHeight: state.groundHeight,
      terrainPitch: state.terrainPitch, terrainRoll: state.terrainRoll,
      x: world.x, y: world.y, z: world.z, tyreSlip: state.tyreSlip || 0,
      yawVelocity: state.yawVelocity, ...(isGears ? {gear: state.gear, revs: state.revs} : {})};
  };
  const off = duel.onChange((current, event) => {
    if (event.crash || event.scrape || event.boundaryReset || event.checkpointReset) {console.error('EV',JSON.stringify(event),current.s.toFixed(1),current.lateral.toFixed(2),current.speedMph.toFixed(1),'pace',pace);faults.push({fromS: tickStartS, s: current.s, reason: 'contact/reset'});}
  });
  let ticks = 0, frames = 0;
  poses.push(capture(0));
  try {
    let screechSeconds = 0;
    const needsTick = () => state.s < placement.finishS && !(_mode !== 'instructor' && (state.offRoad || state.impactTimer > 0 || state.status !== 'racing' || screechSeconds >= .5));
    while (needsTick() && ticks < maxSeconds * 120) {
      const frameTicks = Math.floor(++frames * 120 / fps + 1e-9);
      while (ticks < frameTicks && ticks < maxSeconds * 120 && needsTick()) {
        const surface = duel._drivingSurface(state.s, state.lateral);
        const controls = sectionControls(state, surface, plan, {gears: isGears, late: _mode === 'late', tyreSlipSteering});
        inputs.push({t: ticks / 120, s: state.s, throttle: controls.throttle, brake: controls.brake, steer: controls.steer, shiftUp: controls.shiftUp, shiftDown: controls.shiftDown, boost: false});
        // Inputs start at the current native pose, not one tick later.
        poses.at(-1).brake = controls.brake;
        poses.at(-1).throttle = controls.throttle;
        tickStartS = state.s;
        duel.setInput(controls);duel.step(1 / 120);ticks++;
        poses.push(capture(ticks / 120, controls.brake));
        if (state.tyreSlip > 1) screechSeconds += 1 / 120;
        if (state.offRoad || state.tyreSlip > 1 || state.status !== 'racing' || state.impactTimer > 0) {
          faults.push({fromS: tickStartS, s: state.s, reason: 'offroad/slide/status',
            t: ticks / 120, lateral: state.lateral, mph: state.speedMph,
            headingError: state.headingError, offRoad: state.offRoad, tyreSlip: state.tyreSlip,
            status: state.status, impactTimer: state.impactTimer, input: {...state.input}});
        }
      }
    }
    const {timeSec, poses: recorded} = _mode === 'instructor' || state.s >= placement.finishS ? finishInstructorTrace(poses, placement.finishS, _mode === 'instructor' ? faults : []) : {timeSec: ticks / 120, poses};
    const corner = {id: isGears ? row.cornerName : isSnow ? row.cornerNames[0] : isLine ? row.cornerNames[0].replace(/ \d+$/, '') : row.cornerName, startS, finishS: placement.finishS, dir: turn.dir,
      turnInS: turn.s0, turnOutS: turn.s1};
    // Lesson 2 also records where the plan starts braking, for the road-before-braking check.
    const trajectory = [];
    for(let s=startS;s<=planned.finishS;s++){
      const lateral=line.offsetAt(s),targetMph=profile.at(s)*profile.pace;
      const difference=profile.at(s+1)-profile.at(s);
      trajectory.push({s,lateral,...course.groundAt(s,lateral),targetMph,action:difference<-.001?'brake':difference>.001?'accelerate':'coast'});
    }
    const instructor = {...placement, corners, inputs, plan:trajectory, ice: isSnow ? iceZonesOf(duel, startS, planned.finishS) : [], timeSec, pace, retries, poses: recorded, clean: faults.length === 0, faults, screechSeconds, ...(isLine || isSnow ? {brakeS: profile.brakeS} : {}),
      ...(winter ? {winter: {timeSec: winter.instructor.timeSec, pace: winter.instructor.pace, retries: winter.instructor.retries, poses: winter.instructor.poses, inputs: winter.instructor.inputs}} : {})};
    if (_mode === 'instructor' && instructorConeDistances(recorded, placement.cones).some(d => d <= TIP_DISTANCE_M)) throw new InstructorRunFault('Instructor tipped a cone');
    return {corner, instructor, courseId, car, upgrades: {...upgrades}, difficulty, seed, lessonId, tyre};
  } finally { off(); }
}

// Native teaching proofs and Watch clips use the same controller and physics.
export async function buildLessonDemonstration(options, mode) {
  if (!['late', 'middle', 'dry', 'fast'].includes(mode)) throw new TypeError('Unknown demonstration');
  // Pass the instructor's own pace so a proof starts as his lesson does; the middle-of-the-road
  // proof then differs from his run only in its line.
  return buildInstructorAttempt({...options, _mode: mode}, options.pace ?? (options.difficulty === 'pro' ? .97 : .92), 0);
}
