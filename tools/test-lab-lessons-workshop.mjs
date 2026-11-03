import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import * as gforce from '../src/lab/lessons/gforce-lesson.js';
import {lateralG} from '../src/lab/benches/gforce.js';
import {gforceSamples, G_BASE} from '../src/lab/lessons/gforce-animation.js';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {inspectRepository} from './test-repo-hygiene.mjs';
import {fileURLToPath} from 'node:url';

// Rust is a classroom lesson now (tools/test-lab-classroom-rust.mjs).
const packets = [gforce];
test('the card-named comparison sheet has a valid review home', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const sheet = 'docs/board/looks/lab-2/lab-lessons-workshop-1.jpg';
  assert.deepEqual(inspectRepository(root, [sheet]).failures, []);
});
const finish = session => { for (let i = 0; i < 220; i++) session.tick(.1); };
const goodInputs = {
  gforce: [{speedMph: 80, radiusM: 50}, {speedMph: 20, radiusM: 50}, {speedMph: 40, radiusM: 50}],
};
for (const packet of packets) test(`${packet.definition.id}: real teaching sequence, retries, checks and challenge`, () => {
  const {definition: d, hooks} = packet;
  validateLesson(d, hooks);
  const s = createLessonSession(packet);
  s.next();
  for (const row of d.words) { assert.equal(s.view().name, row.word); s.next(); }
  for (const row of d.worked) { assert.equal(s.view().name, row.name); finish(s); s.next(); }
  for (let i = 0; i < 3; i++) {
    assert.equal(s.view().support, ['guided', 'prompted', 'alone'][i]);
    const input = goodInputs[d.id][i];
    for (const control of s.view().controls) {
      if (Object.hasOwn(input, control.id)) s.control(control.id, input[control.id]);
    }
    const actual = hooks.evaluate({tryIndex: i, input: s.view().input, prediction: ''}).actual;
    const wrong = d.tries[i].prediction.answers.find(a => a.id !== actual).id;
    if (i === 0) {
      for (let n = 0; n < 3; n++) { s.predict(wrong); s.run(); finish(s); assert.equal(s.view().result.passed, false); if (n < 2) s.retry(); }
      assert.equal(s.view().showMe, true); s.showMe();
      for (const row of d.worked) { finish(s); s.next(); }
      assert.equal(s.view().stage, 3);
    }
    s.predict(actual); s.run(); finish(s);
    assert.equal(s.view().result.passed, true, JSON.stringify(s.view().result)); s.next();
  }
  for (const q of d.checks) {
    const wrong = q.answers.find(a => a.id !== q.correct).id;
    s.answer(wrong);
    assert.equal(s.view().animation, q.answers.find(a => a.id === q.correct).animation);
    s.next();
  }
  assert.equal(s.view().challenge, true);
  assert.equal(s.view().text, d.challenge.text);
});

test('G-force predictions, metre radii, arrow lengths and hardest-turn pictures use lateralG', () => {
  const base = lateralG(G_BASE.speedMph, G_BASE.radiusM);
  for (let speedMph = 20; speedMph <= 80; speedMph += 20) for (let radiusM = 25; radiusM <= 100; radiusM += 25) {
    const g = lateralG(speedMph, radiusM), actual = Math.abs(g - base) < 1e-9 ? 'same' : g > base ? 'more' : 'less';
    for (let tryIndex = 0; tryIndex < 3; tryIndex++) {
      const result = gforce.hooks.evaluate({tryIndex, input: {speedMph, radiusM}, prediction: actual});
      assert.equal(result.actual, actual); assert.equal(result.passed, actual === ['more', 'less', 'same'][tryIndex]);
    }
  }
  const slow = gforce.hooks.animations.same({time: 3}), fast = gforce.hooks.animations.more({time: 3});
  assert.equal(fast.forces[0].newtons / slow.forces[0].newtons, 4);
  for (const time of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const draw = gforce.hooks.animations.more({time});
    assert.ok(draw.x * draw.forces[0].direction[0] + draw.z * draw.forces[0].direction[2] < 0, 'push points into the turn');
  }
  const check = gforce.definition.checks[0];
  const most = [...check.answers].sort((a, b) => lateralG(gforceSamples[b.id].speedMph, gforceSamples[b.id].radiusM) - lateralG(gforceSamples[a.id].speedMph, gforceSamples[a.id].radiusM))[0];
  assert.equal(check.correct, most.id);
});

test('round two uses real named props, anchored readings and hit skins on the ruler and floor pan', async () => {
  const bytes = await readFile(new URL('../public/assets/models/lab/workshop-lesson-props.glb', import.meta.url));
  const {scene} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  for (const name of ['paint-tin', 'zinc-can', 'salt-bag', 'water-jug', 'dry-air-jar', 'steel-bar', 'aluminium-bar', 'carbon-bar', 'mass-weight']) {
    const prop = scene.getObjectByName(name);
    assert.ok(prop, name);
    assert.ok(prop.children.some(n => n.name.startsWith('Stamped')), `${name} has its name on the model`);
    assert.ok(new THREE.Box3().setFromObject(prop).getSize(new THREE.Vector3()).length() > .1);
  }
  for (const packet of packets) for (const animation of Object.values(packet.hooks.animations)) {
    const d = animation({time: 3, input: {}});
    assert.ok(d.captions.length <= 3);
    assert.equal(d.captionAnchors.length, d.captions.length);
    assert.ok(d.objects.filter(o => o.control).every(o => o.opacity === 0), 'no visible cube controls');
  }
});
