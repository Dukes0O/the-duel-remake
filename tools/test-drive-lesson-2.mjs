import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInstructorRun, buildLessonDemonstration, DRIVE_LESSON_CORNERS, DRIVE_LINE_ROWS,
  DRIVE_GEAR_ROWS, DRIVE_SNOW_ROWS, createDriveLesson, stepDriveLesson} from '../src/lessons/drive-lessons.js';
for (const [lessonId, rows] of Object.entries({corner: DRIVE_LESSON_CORNERS, line: DRIVE_LINE_ROWS, gears: DRIVE_GEAR_ROWS, snow: DRIVE_SNOW_ROWS}))
  for (const {courseId} of rows) for (const car of ['falcone_f42', 'koenigsegg_jesko']) for (const difficulty of ['casual', 'pro']) {
    test(`${lessonId} ${courseId} ${car} ${difficulty}: section duration, guides and teaching proof`, async t => {
      const options = {lessonId, courseId, car, difficulty};
      const {instructor: i, corner} = await buildInstructorRun(options);
      assert.ok(i.timeSec >= 30 && i.timeSec <= 75, `${i.timeSec} s`);
      assert.ok(i.corners.length >= 3 && i.corners.length <= 9);
      assert.ok(i.plan.every(p => Number.isFinite(p.targetMph) && p.targetMph > 0));
      assert.ok(i.inputs.length > i.timeSec * 120 - 1 && i.inputs.length <= i.timeSec * 120 + 1);
      assert.equal(i.poses[0].s, corner.startS); assert.equal(i.poses.at(-1).s, corner.finishS);
      const self = createDriveLesson(lessonId, {corner, instructor:i}); self.stage='beat';
      for(let n=0;n<i.poses.length;n++) {
        const p=i.poses[n];
        stepDriveLesson(self,{s:p.s,lateral:p.lateral,world:p,speedMph:p.mph,
          brake:p.brake,throttle:p.throttle,tyreSlip:p.tyreSlip,status:'racing'}, {start:n===0}, n?p.t-i.poses[n-1].t:0);
      }
      assert.ok(self.lastAttempt.corners.every(c=>c.passed),JSON.stringify(self.lastAttempt.corners.filter(c=>!c.passed)));
      assert.equal(self.done,false,'an exact instructor tie cannot pass Beat me');
      if (lessonId !== 'gears') assert.ok((i.inputs.find(p => p.brake > 0)?.t ?? Infinity) >= 6);
      t.diagnostic(`instructor ${i.timeSec.toFixed(6)} s; ${i.corners.length} corners; rolling ${i.poses[0].mph} mph`);
      if (lessonId === 'corner') {
        const clip = i.lateClip;
        assert.ok(clip.screechSeconds >= .5 || clip.faults.some(f => f.offRoad));
        assert.ok(clip.timeSec < i.timeSec); assert.equal(clip.inputs[0].t, 0);
        t.diagnostic(`late clip ${clip.screechSeconds.toFixed(3)} s screech; offroad ${clip.faults.some(f => f.offRoad)}`);
      }
      if (lessonId === 'line') {
        const middle = (await buildLessonDemonstration({...options, pace: i.pace}, 'middle')).instructor;
        assert.equal(middle.clean, true);
        assert.ok(middle.timeSec >= i.timeSec + .3, `middle margin ${middle.timeSec - i.timeSec}`);
        t.diagnostic(`middle slower ${(middle.timeSec - i.timeSec).toFixed(6)} s`);
      }
    });
  }
