import test from 'node:test';
import assert from 'node:assert/strict';
import {CARS} from '../src/config.js';
import {buildInstructorRun, DRIVE_LESSON_CORNERS, DRIVE_LINE_ROWS, DRIVE_GEAR_ROWS,
  DRIVE_SNOW_ROWS, instructorConeDistances, TIP_DISTANCE_M} from '../src/lessons/drive-lessons.js';

// Every native build owns a fresh in-memory Duel, never a player profile or save.
for (const [lessonId, rows] of Object.entries({corner: DRIVE_LESSON_CORNERS,
  line: DRIVE_LINE_ROWS, gears: DRIVE_GEAR_ROWS, snow: DRIVE_SNOW_ROWS})) {
  for (const {courseId} of rows) for (const car of Object.keys(CARS)) {
    for (const difficulty of ['casual', 'pro']) {
      test(`${lessonId} ${courseId} ${car} ${difficulty}: clean and repeatable`, async t => {
        const options = {lessonId, courseId, car, difficulty};
        const first = await buildInstructorRun(options);
        assert.deepEqual(await buildInstructorRun(options), first);
        const {instructor, corner} = first;
        assert.ok(instructor.timeSec > 0);
        assert.equal(instructor.poses.at(-1).s, corner.finishS);
        assert.ok(instructor.poses.every(p => p.tyreSlip <= 1));
        assert.ok(instructorConeDistances(instructor.poses, instructor.cones).every(d => d > TIP_DISTANCE_M));
        assert.ok(instructor.retries <= 4);
        assert.ok(instructor.pace >= (difficulty === 'casual' ? .84 : .89));
        if (instructor.retries) t.diagnostic(`slower retry: ${instructor.retries}, pace ${instructor.pace}`);
        if (instructor.winter) {
          assert.ok(instructor.winter.poses.every(p => p.tyreSlip <= 1));
          assert.ok(instructorConeDistances(instructor.winter.poses, instructor.cones).every(d => d > TIP_DISTANCE_M));
          if (instructor.winter.retries) t.diagnostic(`winter slower retry: ${instructor.winter.retries}, pace ${instructor.winter.pace}`);
        }
      });
    }
  }
}
