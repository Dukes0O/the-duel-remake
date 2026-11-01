import test from 'node:test';
import assert from 'node:assert/strict';
import './qa-kogane-switch.mjs';
import {CARS} from '../src/config.js';
import {buildInstructorRun, DRIVE_LESSON_CORNERS, DRIVE_LINE_ROWS, DRIVE_GEAR_ROWS,
  DRIVE_SNOW_ROWS, instructorConeDistances, TIP_DISTANCE_M, INSTRUCTOR_PACE, MAX_INSTRUCTOR_TRIES} from '../src/lessons/drive-lessons.js';

// Lane gates alternate the starter and the fastest road car across lesson roads.
// Every lesson and road keeps both difficulties. Full and direct runs keep all cars.
const sample = process.argv.includes('--sample');
const cars = Object.keys(CARS);
const sampleCars = ['falcone_f42', 'koenigsegg_jesko'];
// The full tier splits every car into parallel shards (--shard=K/N): each run goes to shard index % N.
const shardArgument = process.argv.find(argument => argument.startsWith('--shard='));
let shard = null;
if (shardArgument) {
  const match = /^--shard=(\d+)\/(\d+)$/.exec(shardArgument);
  if (!match) throw Error('Use --shard=1/N through --shard=N/N.');
  const number = Number(match[1]), count = Number(match[2]);
  if (count < 1 || number < 1 || number > count) throw Error('Shard number must be between 1 and shard count.');
  shard = {index: number - 1, count};
}
let runIndex = 0;

// Every native build owns a fresh in-memory Duel, never a player profile or save.
for (const [lessonId, rows] of Object.entries({corner: DRIVE_LESSON_CORNERS,
  line: DRIVE_LINE_ROWS, gears: DRIVE_GEAR_ROWS, snow: DRIVE_SNOW_ROWS})) {
  for (const [rowIndex, {courseId}] of rows.entries()) {
    const selectedCars = sample ? [sampleCars[rowIndex % sampleCars.length]] : cars;
    for (const car of selectedCars) for (const difficulty of ['casual', 'pro']) {
      if (shard && runIndex++ % shard.count !== shard.index) continue;
      test(`${lessonId} ${courseId} ${car} ${difficulty}: clean and repeatable`, async t => {
        const options = {lessonId, courseId, car, difficulty};
        const first = await buildInstructorRun(options);
        assert.deepEqual(await buildInstructorRun(options), first);
        const {instructor, corner} = first;
        assert.ok(instructor.timeSec > 0);
        assert.equal(instructor.poses.at(-1).s, corner.finishS);
        assert.ok(instructor.poses.every(p => p.tyreSlip <= 1));
        assert.ok(instructorConeDistances(instructor.poses, instructor.cones).every(d => d > TIP_DISTANCE_M));
        assert.ok(instructor.retries < MAX_INSTRUCTOR_TRIES);
        const {floor, margin} = INSTRUCTOR_PACE[difficulty];
        assert.ok(instructor.pace >= floor);
        // Room to beat him: at least the margin slower than a clean full-pace run, unless he is at the floor.
        if (instructor.fullPaceSec !== null && instructor.pace > floor)
          assert.ok(instructor.timeSec >= instructor.fullPaceSec * (1 + margin), `${instructor.timeSec} s against full pace ${instructor.fullPaceSec} s`);
        t.diagnostic(`pace ${instructor.pace}, ${instructor.timeSec.toFixed(2)} s, room ${instructor.fullPaceSec === null ? 'none' : (instructor.timeSec - instructor.fullPaceSec).toFixed(2) + ' s'}`);
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
