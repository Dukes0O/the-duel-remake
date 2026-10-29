import test from 'node:test';
import assert from 'node:assert/strict';
// Kogane Pass is behind its dev switch, so the QA switch turns it on before the course list is built.
Object.defineProperty(globalThis, '__DUEL_QA__', {configurable: true, value: true});
Object.defineProperty(globalThis, 'location', {configurable: true, value: {search: '?flags=kogane-pass'}});
const {CARS} = await import('../src/config.js');
const {buildInstructorRun, DRIVE_LESSON_CORNERS, DRIVE_LINE_ROWS, DRIVE_GEAR_ROWS,
  DRIVE_SNOW_ROWS, instructorConeDistances, TIP_DISTANCE_M, INSTRUCTOR_PACE, MAX_INSTRUCTOR_TRIES} = await import('../src/lessons/drive-lessons.js');

// Lane gates alternate the starter and the fastest road car across lesson roads.
// Every lesson and road keeps both difficulties. Full and direct runs keep all cars.
const sample = process.argv.includes('--sample');
const cars = Object.keys(CARS);
const sampleCars = ['falcone_f42', 'koenigsegg_jesko'];

// Every native build owns a fresh in-memory Duel, never a player profile or save.
for (const [lessonId, rows] of Object.entries({corner: DRIVE_LESSON_CORNERS,
  line: DRIVE_LINE_ROWS, gears: DRIVE_GEAR_ROWS, snow: DRIVE_SNOW_ROWS})) {
  for (const [rowIndex, {courseId}] of rows.entries()) {
    const selectedCars = sample ? [sampleCars[rowIndex % sampleCars.length]] : cars;
    for (const car of selectedCars) for (const difficulty of ['casual', 'pro']) {
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
