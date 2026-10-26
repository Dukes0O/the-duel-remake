import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import * as projectile from '../src/lab/lessons/projectile-lesson.js';
import * as fire from '../src/lab/lessons/fire-lesson.js';
import * as pendulum from '../src/lab/lessons/pendulum-lesson.js';
import * as altitude from '../src/lab/lessons/altitude-lesson.js';
import {projectileBench, waterTrace, stoneDrop, stoneFallAfter} from '../src/lab/benches/projectile.js';
import {fireBench, practiceFire, TAKES_AWAY} from '../src/lab/benches/fire.js';
import {pendulumBench, stringPeriod} from '../src/lab/benches/pendulum.js';
import {altitudeBench, SITES} from '../src/lab/benches/altitude.js';
import {GRAVITY, createHeliState, heliReadout} from '../src/heli/heli-flight.js';
import {projectileDrawing, FLAG_TOLERANCE_M} from '../src/lab/lessons/projectile-animation.js';
import {altitudeReading, altitudeDrawing} from '../src/lab/lessons/altitude-animation.js';
import {fireDrawing} from '../src/lab/lessons/fire-animation.js';
import {mountMachine} from '../src/lab/lessons/flying-display.js';
import {Group} from 'three';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {inspectRepository} from './test-repo-hygiene.mjs';
import {recycleDirectory} from './integrate-lane.mjs';

test('the prescribed flying sheet names allow only three JPG rounds and reject raw captures', () => {
  const scratch = new URL('../.qa-dist/', import.meta.url);
  mkdirSync(scratch, {recursive: true});
  const root = mkdtempSync(new URL('flying-placement-', scratch));
  try {
    const accepted = [1, 2, 3].map(n => `docs/board/looks/lab-2/lab-lessons-flying-${n}.jpg`);
    const rejected = [
      'docs/board/looks/lab-2/lab-lessons-flying-4.jpg',
      'docs/board/looks/lab-2/lab-lessons-flying-1.png',
      'docs/board/looks/lab-2/lab-lessons-flying-1-raw.jpg',
      'docs/board/looks/other/lab-lessons-flying-1.jpg',
    ];
    for (const name of [...accepted, ...rejected]) {
      mkdirSync(join(root, name, '..'), {recursive: true});
      writeFileSync(join(root, name), 'placement fixture');
    }
    assert.deepEqual(inspectRepository(root, accepted).failures, []);
    const failures = inspectRepository(root, rejected).failures;
    assert.equal(failures.length, rejected.length);
    for (const name of rejected) assert.ok(failures.includes(`${name}: raw capture belongs in ignored .evidence, not the repository`));
  } finally { recycleDirectory(root); }
});

const packets = [projectile, fire, pendulum, altitude];
const finish = s => { for (let n = 0; n < 500; n++) s.tick(.1); };
test('all four packets scaffold real lessons through checks and keep rewards outside the teaching session', () => {
  for (const p of packets) {
    validateLesson(p.definition, p.hooks);
    const s = createLessonSession(p); s.next();
    for (const w of p.definition.words) { assert.equal(s.view().name, w.word); s.next(); }
    for (const w of p.definition.worked) { assert.equal(s.view().name, w.name); finish(s); assert.ok(s.next()); }
    for (let i = 0; i < 3; i++) {
      assert.equal(s.view().support, ['guided', 'prompted', 'alone'][i]);
      if (p === projectile) { s.control('flagM', Math.round(projectileBench.run({heightM: 30, speedMs: 10}).water.distanceM)); s.predict('hit'); }
      if (p === fire) { s.control(['water', 'sand', 'rake'][i]); if (i === 2) s.control('spray'); s.predict(['heat', 'air', 'fuel'][i]); }
      if (p === pendulum) { s.control('lengthM', [5, 15, 25][i]); if (i === 1) s.control('weightKg'); s.predict(['faster', 'same', 'slower'][i]); }
      if (p === altitude) { s.control('siteIndex', i); s.predict(['up', 'up', 'down'][i]); }
      assert.ok(s.run()); finish(s); assert.equal(s.view().result.passed, true, p.definition.id); s.next();
    }
    for (const q of p.definition.checks) {
      s.answer(q.answers.find(a => a.id !== q.correct).id);
      assert.equal(s.view().animation, q.answers.find(a => a.id === q.correct).animation);
      s.next();
    }
    assert.equal(s.view().challenge, true); assert.equal(s.view().attempts.length, 3);
    assert.equal(s.view().text, p.definition.challenge.text);
    assert.equal('reward' in s.view(), false);
  }
});

test('every offered drop height and speed agrees with the challenge aim ring and actual parcel trace', () => {
  for (let heightM = 10; heightM <= 60; heightM += 5) for (let speedMs = 0; speedMs <= 30; speedMs++) {
    const r = projectileBench.run({heightM, speedMs});
    for (let flagM = 0; flagM <= 80; flagM++) {
      const error = r.water.distanceM - flagM;
      const actual = Math.abs(error) <= FLAG_TOLERANCE_M ? 'hit' : error < 0 ? 'short' : 'past';
      for (const prediction of ['short', 'hit', 'past']) {
        const verdict = projectile.hooks.evaluate({input: {heightM, speedMs, flagM}, prediction});
        assert.equal(verdict.actual, actual); assert.equal(verdict.passed, prediction === actual && actual === 'hit');
      }
    }
  }
  for (const [height, speed] of [[10, 0], [30, 10], [60, 30]]) {
    const trace = waterTrace(height, speed), last = trace.at(-1), r = projectileBench.run({heightM: height, speedMs: speed});
    assert.equal(last.distanceM, r.water.distanceM); assert.equal(last.seconds, r.water.seconds); assert.equal(last.heightM, 0);
    const d = projectileDrawing({heightM: height, speedMs: speed}, 4);
    assert.equal(d.objects.find(o => o.id === 'parcel').position[1], .3);
    assert.equal(d.objects.find(o => o.id === 'parcel').position[0], -1.3 + last.distanceM * .065);
  }
  for (const t of [1, 2, 3]) assert.equal(stoneFallAfter(t), GRAVITY * t * t / 2);
  assert.equal(stoneDrop(30, 0).seconds, stoneDrop(30, 30).seconds);
  assert.equal(projectile.definition.checks.every(q => q.correct === 'before'), true);
  const wonder = projectile.hooks.animations.wonder({time: 4});
  assert.equal(wonder.mode, 'wonder'); assert.ok(wonder.reading.water.distanceM > wonder.input.flagM);
  assert.equal(projectile.hooks.animations.gravity({time: 3}).input.heightM, 60);
  assert.ok(projectile.hooks.animations.gravity({time: 3}).objects.find(o => o.id === 'parcel').position[1] > .3);
  assert.equal(projectileDrawing({heightM: 60, speedMs: 30}, 4).streams.length, 1);
});

test('every fire tool removes its real triangle side and both strips stop the seeded spread', () => {
  for (const [i, tool] of ['water', 'sand', 'cleared strip'].entries()) {
    const input = {[['water', 'sand', 'rake'][i]]: tool, spray: 1};
    const r = fireBench.run({putOut: tool});
    assert.equal(r.burning, false); assert.equal(r.missing[0], TAKES_AWAY[tool]);
    for (const prediction of ['heat', 'fuel', 'air']) {
      const v = fire.hooks.evaluate({tryIndex: i, input, prediction});
      assert.equal(v.actual, r.missing[0]); assert.equal(v.passed, prediction === r.missing[0]);
    }
    assert.equal(fire.definition.checks[i].correct, TAKES_AWAY[tool]);
  }
  assert.equal(practiceFire().reachedFarSide, true);
  assert.equal(practiceFire({cleared: true}).reachedFarSide, false);
  assert.equal(practiceFire({treated: true}).reachedFarSide, false);
  assert.equal(fire.hooks.evaluate({tryIndex: 2, input: {rake: 'cleared strip'}, prediction: 'fuel'}).failure, 'coat');
  // Word animations keep the whole triangle; answer replays remove a side.
  assert.equal(fire.hooks.animations.heat({time: 2}).removed, undefined);
  assert.equal(fire.hooks.animations['answer-heat']({time: 2}).removed, 'heat');
  assert.ok(fireDrawing({putOut: 'sand'}, 2).objects.some(o => o.id === 'sand-cover'));
  assert.equal(fire.hooks.animations['answer-air']({time: 2}).mode, 'lid');
});

test('each pendulum answer uses the period from the existing bench, independent of weight', () => {
  for (const lengthM of [5, 15, 25]) for (const weightKg of [20, 200]) {
    const r = pendulumBench.run({kind: 'string', lengthM, weightKg});
    const actual = r.periodS === stringPeriod(15) ? 'same' : r.periodS < stringPeriod(15) ? 'faster' : 'slower';
    for (const prediction of ['faster', 'slower', 'same']) {
      const v = pendulum.hooks.evaluate({input: {lengthM, weightKg, pull: 1}, prediction});
      assert.equal(v.actual, actual); assert.equal(v.passed, actual === prediction);
    }
  }
  assert.equal(pendulum.definition.checks[0].correct, 'long');
  assert.equal(pendulum.definition.checks[1].correct, 'heavy-medium');
  assert.equal(pendulum.hooks.evaluate({input: {pull: 0}, prediction: 'same'}).failure, 'pull');
});

test('all offered altitude loads compare with flying-height thrust, preserving the old ground stand', () => {
  Object.keys(SITES).forEach((site, siteIndex) => {
    const r = altitudeBench.run({site}), state = createHeliState({altitudeOffset: SITES[site].altitudeM});
    assert.equal(r.aloftLiftKg, heliReadout(state).maxLiftKg);
    assert.ok(r.liftKg > r.aloftLiftKg);
    for (let loadKg = 1000; loadKg <= 4000; loadKg += 100) {
      const expected = Math.abs(loadKg - r.aloftLiftKg) <= 25 ? 'hover' : r.aloftLiftKg > loadKg ? 'up' : 'down';
      for (const prediction of ['up', 'hover', 'down']) {
        const v = altitude.hooks.evaluate({input: {siteIndex, loadKg}, prediction});
        assert.equal(v.actual, expected); assert.equal(v.passed, prediction === expected);
      }
      const d = altitudeDrawing({siteIndex, loadKg}, 2);
      assert.ok(d.forces.every(f => f.displayUnit === 'kg'));
      assert.ok(Math.abs(d.forces[0].newtons / d.forces[1].newtons - r.aloftLiftKg / loadKg) < 1e-12);
      assert.equal(d.forces[0].newtons / GRAVITY, r.aloftLiftKg);
    }
  });
  assert.deepEqual([0, 1, 2].map(siteIndex => altitudeReading({siteIndex, loadKg: 3200}).outcome), ['up', 'down', 'down']);
  for (let i = 0; i < 3; i++) {
    const q = altitude.definition.tries[i].prediction;
    const d = altitude.hooks.animations.try({time: 0, input: {}, index: i});
    assert.equal(d.input.siteIndex, altitude.definition.tries[i].controls[0].initial);
    assert.equal(altitude.hooks.evaluate({tryIndex: i, input: {}, prediction: q.correct}).passed, true);
  }
});

test('two failures give plainer help and three offer a worked replay in every lesson', () => {
  for (const p of packets) {
    const s = createLessonSession(p); s.next();
    for (const _ of p.definition.words) s.next();
    for (const _ of p.definition.worked) { finish(s); s.next(); }
    for (let i = 0; i < 3; i++) {
      s.predict(p === pendulum ? 'faster' : p.definition.tries[0].prediction.answers.at(-1).id); s.run(); finish(s);
      assert.equal(s.view().result.passed, false);
      assert.ok(s.view().text.length > 10); if (i < 2) s.retry();
    }
    assert.equal(s.view().showMe, true); assert.equal(s.showMe(), true);
    for (const _ of p.definition.worked) { finish(s); s.next(); }
    assert.equal(s.view().stage, 3); assert.equal(s.view().index, 0);
  }
});

test('the final key-idea card can supply an empty drawing without reading absent machine input', () => {
  const scene = new Group(), group = new Group(), source = new Group(); scene.add(group, source);
  const element = () => ({style: {}, textContent: '', hidden: false, append() {}, remove() {}});
  const mounted = mountMachine('test-machine', () => { throw Error('Empty drawing reached machine updater'); })({group,
    models: new Map([['test-machine', source]]), doc: {createElement: element}, canvas: {parentElement: {append() {}}, dataset: {}}});
  assert.doesNotThrow(() => mounted.draw({}, {stage: 4}));
  mounted.dispose(); assert.equal(source.visible, true); assert.equal(group.children.length, 0);
});
