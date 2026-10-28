import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInstructorRun, buildLessonDemonstration, createDriveLesson, stepDriveLesson,
  DRIVE_LESSON_CORNERS, DRIVE_LINE_ROWS, DRIVE_GEAR_ROWS, DRIVE_SNOW_ROWS, gearFor} from '../src/lessons/drive-lessons.js';
test('gear selection keeps the requested revs below the downshift cap', () => {
  assert.equal(gearFor([50, 100, 150], 70), 1);
  assert.equal(gearFor([50, 100, 150], 140), 2);
});
for (const [lessonId, rows] of Object.entries({corner: DRIVE_LESSON_CORNERS, line: DRIVE_LINE_ROWS, gears: DRIVE_GEAR_ROWS, snow: DRIVE_SNOW_ROWS}))
  for (const {courseId} of rows) for (const difficulty of ['casual', 'pro']) {
    test(`100% driver ${lessonId} ${courseId} ${difficulty}: clean faster run beats the instructor`, async t => {
      const options = {lessonId, courseId, car: 'falcone_f42', difficulty};
      const baseline = await buildInstructorRun(options);
      const fast = await buildLessonDemonstration({...options, pace: baseline.instructor.pace}, 'fast');
      assert.equal(fast.instructor.clean, true);
      assert.ok(fast.instructor.timeSec < baseline.instructor.timeSec);
      const lesson = createDriveLesson(lessonId, baseline);
      lesson.stage = 'beat';
      const view = p => ({s: p.s, lateral: p.lateral, world: p, speedMph: p.mph,
        brake: p.brake, throttle: p.throttle, tyreSlip: p.tyreSlip, status: 'racing'});
      stepDriveLesson(lesson, view(fast.instructor.poses[0]), {start: true});
      for (let n = 1; n < fast.instructor.poses.length; n++) {
        const p = fast.instructor.poses[n], previous = fast.instructor.poses[n - 1];
        stepDriveLesson(lesson, view(p), {}, p.t - previous.t);
      }
      assert.equal(lesson.done, true); assert.equal(lesson.lastAttempt.clean, true);
      t.diagnostic(`fast margin ${(baseline.instructor.timeSec - fast.instructor.timeSec).toFixed(6)} s`);
    });
  }
