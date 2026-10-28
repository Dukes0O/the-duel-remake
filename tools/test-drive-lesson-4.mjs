import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInstructorRun, buildLessonDemonstration} from '../src/lessons/drive-lessons.js';
for (const car of ['falcone_f42', 'koenigsegg_jesko']) for (const difficulty of ['casual', 'pro']) {
  test(`snow ${car} ${difficulty}: dry braking leaves the road or screeches; winter is faster`, async t => {
    const options = {lessonId: 'snow', courseId: 'tremblant-snow', car, difficulty};
    const i = (await buildInstructorRun(options)).instructor;
    const dry = (await buildLessonDemonstration(options, 'dry')).instructor;
    assert.ok(dry.screechSeconds >= .5 || dry.faults.some(f => f.offRoad));
    assert.ok(i.winter.timeSec < i.timeSec); assert.ok(i.ice.length > 0);
    t.diagnostic(`summer ${i.timeSec.toFixed(6)} s; winter ${i.winter.timeSec.toFixed(6)} s; dry offroad ${dry.faults.some(f => f.offRoad)} screech ${dry.screechSeconds.toFixed(3)} s`);
  });
}
