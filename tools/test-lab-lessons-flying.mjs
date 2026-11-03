import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import * as fire from '../src/lab/lessons/fire-lesson.js';
import {fireBench, practiceFire, TAKES_AWAY} from '../src/lab/benches/fire.js';
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

// The pendulum, Projectile motion and Air and altitude are classroom lessons (tools/test-lab-classroom*.mjs).
const packets = [fire];
const finish = s => { for (let n = 0; n < 500; n++) s.tick(.1); };
test('the scale models keep real lengths and anchor at most three labels beside readable moving parts', () => {
  const d = fireDrawing({}, 0);
  assert.ok(d.labels.length <= 3);
  assert.equal(d.labels.length, d.labelPositions.length);
  for (const packet of packets) {
    const d = packet.hooks.animations.undefined();
    assert.ok(d.camera && d.objects.length > 0, `${packet.definition.id} keeps its experiment on the final key card`);
  }
});
test('the fire packet scaffolds real lessons through checks and keep rewards outside the teaching session', () => {
  for (const p of packets) {
    validateLesson(p.definition, p.hooks);
    const s = createLessonSession(p); s.next();
    for (const w of p.definition.words) { assert.equal(s.view().name, w.word); s.next(); }
    for (const w of p.definition.worked) { assert.equal(s.view().name, w.name); finish(s); assert.ok(s.next()); }
    for (let i = 0; i < 3; i++) {
      assert.equal(s.view().support, ['guided', 'prompted', 'alone'][i]);
      if (p === fire) { s.control(['water', 'sand', 'rake'][i]); if (i === 2) s.control('spray'); s.predict(['heat', 'air', 'fuel'][i]); }
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

test('two failures give plainer help and three offer a worked replay in every lesson', () => {
  for (const p of packets) {
    const s = createLessonSession(p); s.next();
    for (const _ of p.definition.words) s.next();
    for (const _ of p.definition.worked) { finish(s); s.next(); }
    for (let i = 0; i < 3; i++) {
      s.predict(p.definition.tries[0].prediction.answers.at(-1).id); s.run(); finish(s);
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
