import test from 'node:test';
import assert from 'node:assert/strict';
import {createDriveLesson, stepDriveLesson, DRIVE_LESSON_STEPS, driveLessonGap,
  driveLessonGold, finishInstructorTrace, chooseDriveLessonStep} from '../src/lessons/drive-lessons.js';
const corner = {startS: 0, finishS: 400, dir: 1};
const targets = [
  {name: 'Brake bend', kind: 'brake', approachS: 0, brakeS: 80, turnInS: 100, turnOutS: 150, exitS: 170, targetMph: 60},
  {name: 'Lift bend', kind: 'lift', approachS: 150, brakeS: null, turnInS: 200, turnOutS: 250, exitS: 270, targetMph: 70},
  {name: 'Flat bend', kind: 'flat', approachS: 250, brakeS: null, turnInS: 300, turnOutS: 350, exitS: 370, targetMph: 80},
];
const instructor = {timeSec: 10, corners: targets, cones: [], poses: [{s: 0, t: 0}, {s: 200, t: 6}, {s: 400, t: 10}]};
const view = (s, extra = {}) => ({s, lateral: 0, world: {x: s, z: 0}, brake: 0, throttle: 1,
  speedMph: s < 180 ? 60 : s < 280 ? 70 : 80, tyreSlip: 0, status: 'racing', ...extra});
function run(lesson, {seconds = 10, brakeS = 80, brake = .5, slip = 0, offRoad = false, wall = false} = {}) {
  stepDriveLesson(lesson, view(0), {start: true});
  for (const s of [brakeS, brakeS + 1, 100, 149, 200, 249, 300, 349, 400]) {
    const from = lesson.attempt.previous.s;
    if (s < from) continue;
    stepDriveLesson(lesson, view(s, {brake: s === brakeS + 1 ? brake : 0, tyreSlip: slip, offRoad}),
      {wallHit: wall}, (s - from) * seconds / 400);
    if (lesson.phase === 'result') break;
  }
  return lesson.lastAttempt;
}
const lesson = (stage = 'your-turn') => Object.assign(createDriveLesson('corner', {corner, instructor}), {stage});
test('four steps: practice never passes, retakes skip practice, one Beat me win completes', () => {
  assert.deepEqual(DRIVE_LESSON_STEPS.map(s => s.id), ['watch', 'follow', 'your-turn', 'beat']);
  const l = createDriveLesson('corner', {corner, instructor});
  for (const stage of ['watch', 'follow']) {assert.equal(run(l, {seconds: 8}).passed, false); assert.equal(l.stage, stage); assert.equal(l.bestMargin, 0);}
  assert.equal(run(l).passed, true); assert.equal(l.stage, 'your-turn');
  assert.equal(run(l, {seconds: 9}).passed, true); assert.equal(l.stage, 'beat');
  assert.equal(l.done, true); assert.equal(l.gold, true); assert.equal(l.bestMargin, 1);
  assert.equal(createDriveLesson('corner', {corner, instructor, retake: true}).stage, 'your-turn');
});
test('brake window includes -15/+5 metres, requires 50%, and keeps the first press', () => {
  for (const [brakeS, expected] of [[65, true], [85, true], [64.99, false], [85.01, false]])
    assert.equal(run(lesson(), {brakeS}).corners[0].checks.brake, expected, String(brakeS));
  assert.equal(run(lesson(), {brake: .499}).corners[0].checks.brake, false);
  const l = lesson(); stepDriveLesson(l, view(0), {start: true});
  stepDriveLesson(l, view(50, {brake: .5}), {}, 1); stepDriveLesson(l, view(80), {}, 1);
  stepDriveLesson(l, view(81, {brake: 1}), {}, 1);
  assert.equal(l.attempt.corners[0].firstBrakeS, 0);
});
test('clean faster Your turn overrides missed zones; equal/slower and dirty runs cannot', () => {
  assert.equal(run(lesson(), {brakeS: 40, seconds: 9.9}).passed, true);
  assert.equal(run(lesson(), {brakeS: 40}).passed, false);
  assert.equal(run(lesson('beat')).passed, false); assert.equal(run(lesson('beat'), {seconds: 9.99}).passed, true);
  for (const extra of [{wall: true}, {slip: 1.01}, {offRoad: true}]) {
    const r = run(lesson(), {seconds: 9, ...extra}); assert.equal(r.passed, false); assert.equal(r.clean, false);
  }
});
test('per-corner checks distinguish lift/flat and keep advice with the worst corner', () => {
  const r = run(lesson());
  assert.deepEqual(r.corners.map(c => c.checks), [{brake: true, speed: true, quiet: true},
    {brake: true, speed: true, quiet: true}, {brake: null, speed: true, quiet: true}]);
  const l = lesson(); stepDriveLesson(l, view(0), {start: true});
  stepDriveLesson(l, view(200, {brake: .1, speedMph: 76, tyreSlip: 1.2}), {}, 1.2);
  stepDriveLesson(l, view(250, {brake: .1, speedMph: 76, tyreSlip: 1.2}), {}, .3);
  stepDriveLesson(l, view(400), {}, 1);
  assert.deepEqual(l.lastAttempt.corners[1].checks, {brake: false, speed: false, quiet: false});
  assert.equal(l.lastAttempt.corners[1].light, 'red'); assert.match(l.lastAttempt.advice, /sliding tyres grip less/);
});
test('pauses freeze time, short off-road visits reset, one second is allowed, finish clips time', () => {
  const l = lesson(); stepDriveLesson(l, view(0), {start: true});
  stepDriveLesson(l, view(100, {paused: true}), {}, 10); assert.equal(l.attempt.elapsedSeconds, 0);
  stepDriveLesson(l, view(100, {offRoad: true}), {}, 1); assert.equal(l.phase, 'driving');
  stepDriveLesson(l, view(200), {}, 1); stepDriveLesson(l, view(300, {offRoad: true}), {}, 1);
  stepDriveLesson(l, view(500), {}, 2); assert.equal(l.lastAttempt.elapsedSeconds, 4); assert.equal(l.lastAttempt.clean, true);
  assert.throws(() => stepDriveLesson(lesson(), view(0), {}, -1), /Negative/);
});
test('mistakes never end a run: a wall, a long trip off the road or a stop drive on to the finish (Kyle, 27 October)', () => {
  const l = lesson(); stepDriveLesson(l, view(0), {start: true});
  stepDriveLesson(l, view(100), {wallHit: true}, 2); assert.equal(l.phase, 'driving');
  stepDriveLesson(l, view(150, {offRoad: true}), {}, 3); assert.equal(l.phase, 'driving');
  stepDriveLesson(l, view(150, {speedMph: 0}), {}, 1); assert.equal(l.phase, 'driving');
  stepDriveLesson(l, view(400), {}, 4);
  assert.equal(l.phase, 'result'); assert.equal(l.lastAttempt.finished, true);
  assert.equal(l.lastAttempt.clean, false); assert.equal(l.lastAttempt.passed, false);
  const wreck = lesson(); stepDriveLesson(wreck, view(0), {start: true});
  stepDriveLesson(wreck, view(100), {wrecked: true}, 2);
  assert.equal(wreck.phase, 'result'); assert.equal(wreck.lastAttempt.finished, false);
});
test('any step can be chosen again, back or forward, until the lesson is passed', () => {
  const l = lesson('beat'); stepDriveLesson(l, view(0), {start: true});
  assert.equal(chooseDriveLessonStep(l, 'follow'), true);
  assert.equal(l.stage, 'follow'); assert.equal(l.phase, 'ready'); assert.equal(l.attempt, null);
  stepDriveLesson(l, view(0), {start: true}); assert.equal(l.stage, 'follow', 'a chosen step is not skipped');
  assert.equal(chooseDriveLessonStep(l, 'nope'), false);
  l.done = true; assert.equal(chooseDriveLessonStep(l, 'watch'), false);
});
test('gap uses equal distance; gold is derived; finish faults use the tick start', () => {
  assert.equal(driveLessonGap(instructor, 100, 4), 1); assert.equal(driveLessonGap(instructor, 300, 7), -1);
  assert.equal(driveLessonGap(instructor, -1, 2), 2); assert.equal(driveLessonGap(instructor, 401, 11), 1);
  assert.equal(driveLessonGold(.999), false); assert.equal(driveLessonGold(1), true); assert.equal(driveLessonGold(NaN), false);
  const poses = [{t: 0, s: 0, heading: 0}, {t: 1, s: 9, heading: 0}, {t: 2, s: 11, heading: 0}];
  assert.equal(finishInstructorTrace(poses, 10).timeSec, 1.5);
  assert.throws(() => finishInstructorTrace(poses, 10, [{fromS: 9}]), /cleanly/);
  assert.equal(finishInstructorTrace(poses, 10, [{fromS: 10}]).timeSec, 1.5);
});
