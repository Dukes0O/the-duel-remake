import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import * as launch from '../src/lab/lessons/launch-lesson.js';
import * as wax from '../src/lab/lessons/wax-lesson.js';
import {launchBench, rangeOf, TARGET} from '../src/lab/benches/launch.js';
import {SNOWS, WAXES, waxBench, waxRunResult, snowOfDay} from '../src/lab/benches/wax.js';
import {launchTrace, launchSamples, launchDrawing} from '../src/lab/lessons/launch-animation.js';
import {waxSamples, waxDrawing} from '../src/lab/lessons/wax-animation.js';
import {PerspectiveCamera, Vector3} from 'three';

test('every launch prediction and path ends at the actual challenge distance', () => {
  for (let angleDeg = 15; angleDeg <= 75; angleDeg += 5) for (const speedMs of [5, 17, 20, 40]) for (const air of ['no air', 'air']) for (const landing of ['level', '10 m lower']) {
    const input = {angleDeg, speedMs, air, landing}, result = launchBench.run(input), trace = launchTrace(input);
    assert.equal(trace.rangeM, result.rangeM);
    assert.equal(trace.seconds, result.seconds);
    assert.ok(Math.abs(trace.points.at(-1)[0] - result.rangeM) < 1e-10);
    assert.equal(rangeOf(angleDeg, speedMs, {air: air === 'air', lower: landing !== 'level'}).rangeM, result.rangeM);
    for (const flagM of [0, 30, 55]) {
      const actual = launch.launchOutcome({...input, flagM});
      assert.equal(actual, Math.abs(result.rangeM - flagM) <= TARGET.withinM ? 'flag' : result.rangeM < flagM ? 'short' : 'past');
      assert.equal(launch.hooks.evaluate({input: {...input, flagM}, prediction: actual}).actual, actual);
    }
  }
  const d = launch.definition;
  const furthest = d.checks[0].answers.reduce((a, b) => launchBench.run(launchSamples[a.id]).rangeM > launchBench.run(launchSamples[b.id]).rangeM ? a : b);
  assert.equal(d.checks[0].correct, furthest.id);
  const lower = d.checks[1].answers.reduce((a, b) => launchBench.run(launchSamples[a.id]).rangeM > launchBench.run(launchSamples[b.id]).rangeM ? a : b);
  assert.equal(d.checks[1].correct, lower.id);
  for (const a of d.checks[1].answers) assert.equal(launch.launchOutcome(launchSamples[a.id]) === 'flag', a.id === d.checks[1].correct);
  for (const input of [{angleDeg:45,speedMs:17,flagM:30}, {angleDeg:45,speedMs:17}]) {
    assert.equal(launch.hooks.evaluate({input,prediction:'short'}).failure, 'picture');
  }
});

test('every wax prediction and check uses real glide and daily challenge rules', () => {
  for (const [i, snow] of Object.keys(SNOWS).entries()) for (const [waxDial, pick] of WAXES.entries()) {
    const r = waxBench.run({snow, wax: pick}), actual = r.right ? 'fast' : 'slow';
    const v = wax.hooks.evaluate({tryIndex: i, input: {waxDial}, prediction: actual});
    assert.equal(v.actual, actual); assert.equal(v.passed, r.right);
    const drawing = waxDrawing({snow, wax: pick}, 4);
    assert.equal(drawing.reading, r.glideS);
    assert.ok(drawing.captions[i].includes(r.glideS.toFixed(2)));
    if (r.right) assert.equal(r.glideS, r.bestGlideS); else assert.ok(r.glideS > r.bestGlideS);
  }
  for (const q of wax.definition.checks) for (const a of q.answers) assert.equal(waxBench.run(waxSamples[a.id]).right, a.id === q.correct);
  for (let day = 0; day < 30; day++) {
    const today = snowOfDay(day);
    for (const pick of WAXES) assert.equal(waxRunResult({day, pick, time: 999}).pass, pick === today.wax);
    assert.equal(waxRunResult({day, pick: today.wax, time: 0}).pass, false);
  }
  assert.equal(waxBench.run({snow: 'powder', wax: 'soft'}).glideS, waxBench.run({snow: 'powder', wax: 'medium'}).glideS);
});

const finish = s => { for (let i = 0; i < 220; i++) s.tick(.1); };
for (const packet of [launch, wax]) test(`${packet.definition.id}: full teaching flow, useful failure, pictures and challenge`, () => {
  const {definition: d, hooks} = packet; validateLesson(d, hooks);
  const s = createLessonSession(packet); s.next();
  for (const row of d.words) { assert.equal(s.view().name, row.word); s.next(); }
  for (const row of d.worked) { finish(s); assert.equal(s.view().name, row.name); s.next(); }
  for (let index = 0; index < 3; index++) {
    const set = () => { if (d.id === 'launch') { s.control('angleDeg', 45); s.control('speedMs', 17); s.control('flagM', 30); } else s.control('waxDial', index); };
    set();
    if (index === 0) {
      s.predict(d.id === 'launch' ? 'short' : 'slow'); s.run(); finish(s);
      assert.equal(s.view().result.passed, false); assert.ok(s.view().text.length); s.retry();
    }
    s.predict(d.id === 'launch' ? 'flag' : 'fast'); s.run(); finish(s);
    assert.equal(s.view().result.passed, true); s.next();
  }
  for (const q of d.checks) {
    assert.ok(hooks.animations[s.view().animation]({time: 0, input: {}, index: s.view().index}).camera, 'unanswered check retains close camera');
    s.answer(q.answers.find(a => a.id !== q.correct).id);
    assert.equal(s.view().animation, q.answers.find(a => a.id === q.correct).animation); s.next();
  }
  assert.equal(s.view().challenge, true);
  if (d.id === 'launch') {
    s.startChallenge(); s.control('speedMs', 17); s.control('angleDeg', 45); s.predict('flag'); s.run(); finish(s);
    assert.equal(s.view().result.passed, true);
    assert.equal(launchBench.run(s.view().input).hit, true);
  }
});

test('every offered launch boundary keeps its flying skier and landing flag in view', () => {
  for (const angleDeg of [15, 45, 75]) for (const speedMs of [5, 24]) for (const flagM of [0, 60]) for (const time of [0, .4, 1, 2, 4]) {
    const d = launchDrawing({angleDeg, speedMs, flagM}, time);
    const c = new PerspectiveCamera(50, 1440 / 900, .1, 80); c.position.set(...d.camera.position); c.lookAt(...d.camera.target); c.updateMatrixWorld();
    for (const a of [d.position, ...d.captionAnchors]) { const p = new Vector3(...a).project(c); assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1, `${angleDeg}/${speedMs}/${flagM}/${time}: visible`); }
  }
  const start = launchDrawing({angleDeg:75,air:'air'}, .1), apex = launchDrawing({angleDeg:75,air:'air'}, .9);
  assert.ok(apex.forces[0].newtons < start.forces[0].newtons, 'speed shrinks near the apex');
  assert.ok(apex.forces[1].newtons < start.forces[1].newtons, 'drag follows the slowing skier');
});

test('close cameras, no newton captions and retained comparison paths', () => {
  const compare = launchDrawing({}, 7, 'compare');
  assert.equal(compare.trails.length, 5); assert.ok(compare.trails.every(t => t.points.length > 2));
  for (const packet of [launch, wax]) for (const fn of Object.values(packet.hooks.animations)) {
    const d = fn({time: 4, input: {}, index: 0});
    assert.ok(d.captions.length <= 3); assert.equal(d.hideLabels, true);
    assert.ok(!d.captions.some(t => /\bN\b|newton|m\/s/i.test(t)));
    const c = new PerspectiveCamera(50, 1440 / 900, .1, 80);
    c.position.set(...d.camera.position); c.lookAt(...d.camera.target); c.updateMatrixWorld();
    const left = new Vector3(-1.5, 1, 0).project(c), right = new Vector3(1.5, 1, 0).project(c);
    assert.ok(Math.abs(right.x - left.x) > .4, 'experiment fills a substantial part of the screen');
    for (const a of d.captionAnchors) { const p = new Vector3(...a).project(c); assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1, 'caption anchor stays in view'); }
  }
});
