import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import * as rust from '../src/lab/lessons/rust-lesson.js';
import * as gforce from '../src/lab/lessons/gforce-lesson.js';
import {JARS, jarAfter} from '../src/lab/benches/rust.js';
import {rustOf, rightProtection, RUST_PARTS} from '../src/lab/lab-workshop.js';
import {lateralG} from '../src/lab/benches/gforce.js';
import {readRust, rustTrial, rustState} from '../src/lab/lessons/rust-animation.js';
import {gforceSamples, G_BASE} from '../src/lab/lessons/gforce-animation.js';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {inspectRepository} from './test-repo-hygiene.mjs';
import {fileURLToPath} from 'node:url';

const packets = [rust, gforce];
test('the card-named comparison sheet has a valid review home', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const sheet = 'docs/board/looks/lab-2/lab-lessons-workshop-1.jpg';
  assert.deepEqual(inspectRepository(root, [sheet]).failures, []);
});
const finish = session => { for (let i = 0; i < 220; i++) session.tick(.1); };
const goodInputs = {
  rust: [0, 1, 2].map(() => ({partDial: 0, jarDial: 2, coatDial: 2})),
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

test('rust predictions and all three protection answers agree with jars and challenge', () => {
  for (let partDial = 0; partDial < 3; partDial++) for (let jarDial = 0; jarDial < 4; jarDial++) for (let coatDial = 0; coatDial < 3; coatDial++) {
    const input = {partDial, jarDial, coatDial}, load = readRust(input), jar = JARS[jarDial];
    const paint = coatDial === 1 && load.part !== 'exhaust';
    const truth = jarAfter({...jar, water: paint ? false : jar.water, zinc: coatDial === 2}, 7);
    assert.deepEqual(rustTrial(load), truth);
    const result = rust.hooks.evaluate({input, prediction: rustState(truth.rust)});
    assert.equal(result.actual, rustState(truth.rust)); assert.equal(result.passed, true);
  }
  for (const [i, part] of RUST_PARTS.entries()) {
    const q = rust.definition.checks[i]; assert.equal(q.correct, `${part.id}-${rightProtection(part.id)}`);
    for (const a of q.answers) {
      const draw = rust.hooks.animations[a.animation]({time: 4});
      assert.equal(rustTrial(draw.input).rust, rustOf(part.id, a.id.endsWith('-zinc') ? 'zinc' : 'bare'));
    }
  }
  const draw = rust.hooks.animations.try({time: 0, input: {}});
  const camera = new THREE.PerspectiveCamera(50, 1440 / 808, .1, 80);
  camera.position.set(...draw.camera.position); camera.lookAt(...draw.camera.target); camera.updateMatrixWorld(true);
  for (const control of draw.objects.filter(o => o.control)) {
    const point = new THREE.Vector3(...control.position).project(camera);
    assert.ok(point.y > -.25 && point.y < .8 && Math.abs(point.x) < .9, `${control.id} stays above the lesson panel`);
  }
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
  const d = rust.hooks.animations.try({time: 0, input: {jarDial: 0}});
  assert.equal(d.props.find(p => p.id === 'water').model, 'dry-air-jar');
  const pan = scene.getObjectByName('underbody-panel').clone(true), placement = d.props.find(p => p.id === 'part');
  pan.position.set(...placement.position); pan.updateMatrixWorld(true);
  const body = new THREE.Box3().setFromObject(pan), skin = d.objects.find(o => o.control === 'partDial');
  const hit = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...skin.position), new THREE.Vector3(...skin.size));
  assert.ok(hit.containsBox(body), 'the floor-pan face can be clicked, not just empty air above it');
});

test('enlarged jars replace old blank tags only in the lesson clone', async () => {
  const bytes = await readFile(new URL('../public/assets/models/lab/nail-jars.glb', import.meta.url));
  const {scene: model} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(model, group);
  const node = () => ({style: {}, dataset: {}, append() {}, remove() {}});
  const canvas = {dataset: {}, parentElement: node()};
  const mounted = rust.hooks.mount({group, THREE, models: new Map([['nail-jars', model]]), doc: {createElement: node}, canvas});
  mounted.draw(rust.hooks.animations.jars({time: 3}), {stage: 0, time: 3});
  const clone = group.children.find(n => n.getObjectByName('jar-dry'));
  for (const jar of JARS) {
    let sourceHasTag = false;
    model.getObjectByName(`jar-${jar.id}`).traverse(n => {
      if (n.geometry) { n.geometry.computeBoundingBox(); sourceHasTag ||= n.geometry.boundingBox.max.z > .2; }
    });
    assert.ok(sourceHasTag, 'original shelf still owns its original tag');
    clone.getObjectByName(`jar-${jar.id}`).traverse(n => {
      if (n.geometry) {
        // glTF material primitives share a position buffer; its unused vertices
        // are not part of this mesh. Check only triangles actually drawn.
        const p = n.geometry.attributes.position;
        const used = n.geometry.index?.array ?? Array.from({length: p.count}, (_, k) => k);
        assert.ok([...used].every(k => p.getZ(k) < .2), 'private jar draws no blank forward slab');
      }
    });
  }
  mounted.dispose(); assert.equal(model.visible, true); assert.equal(group.children.length, 0);
});
