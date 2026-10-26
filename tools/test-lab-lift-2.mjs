import test from 'node:test';
import assert from 'node:assert/strict';
import {PAD, padForces, padOutcome} from '../src/lab/lessons/lift-pad.js';
import {KESTREL, GRAVITY, HELI_STEP, createHeliState, heliMass, availableThrust, stepHeli} from '../src/heli/heli-flight.js';
import {definition, hooks} from '../src/lab/lessons/lift-lesson.js';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import {rotorBlades, pitchBlades, trialInput} from '../src/lab/lessons/lift-animation.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFileSync} from 'node:fs';

test('every offered pad load reads the helicopter rules, including ground effect', () => {
  let checked = 0;
  for (let cans = 0; cans <= 4; cans++) for (let crates = 0; crates <= PAD.maxCrates; crates++) for (const car of [0, 1]) {
    const fuel = cans * PAD.canKg;
    for (const collective of [0, .25, .5, .75, 1]) {
      const input = {fuel, crates, car, collective};
      const cargo = crates * PAD.crateKg + car * PAD.carKg;
      const s = createHeliState({fuelKg: fuel, mode: 'real'});
      const f = padForces(input);
      assert.equal(f.massKg, heliMass(s) + cargo);
      assert.equal(f.liftN, collective * (s.engine ? availableThrust(s, 0) : 0));
      assert.equal(f.weightN, (heliMass(s) + cargo) * GRAVITY);
      assert.equal(padOutcome(input) === 'down', f.liftN <= f.weightN);
      s.collective = collective;
      const expected = Math.max(0, (f.liftN - f.weightN) / heliMass(s) * HELI_STEP);
      stepHeli(s, {}, {external: {y: -cargo * GRAVITY}}, HELI_STEP);
      assert.ok(Math.abs(s.vy - expected) < 1e-10);
      const hs = createHeliState({fuelKg: fuel, y: PAD.hoverHeight});
      assert.equal(padForces(input, PAD.hoverHeight).maximumN, hs.engine ? availableThrust(hs, PAD.hoverHeight) : 0);
      checked++;
    }
  }
  assert.equal(checked, 250);
  assert.equal(PAD.canKg * 4, KESTREL.tankKg);
});

test('the real packet teaches its words in order, accepts an analog lever and finishes without awarding progress', () => {
  validateLesson(definition, hooks);
  const s = createLessonSession({definition, hooks});
  const finish = () => { for (let i = 0; i < 110; i++) s.tick(.1); };
  assert.equal(s.view().stage, 0); s.next();
  for (const name of ['Rotor', 'Lift', 'Weight', 'Collective', 'Hover']) {
    assert.equal(s.view().name, name); s.next();
  }
  for (const step of definition.worked) { assert.equal(s.view().name, step.name); finish(); s.next(); }
  for (let i = 0; i < 3; i++) {
    assert.equal(s.view().support, ['guided', 'prompted', 'alone'][i]);
    if (i === 2) { s.control('car'); s.control('crates'); s.control('crates'); s.control('crates'); }
    s.control('collective', i < 2 ? padForces({fuel: KESTREL.tankKg, crates: i}, PAD.hoverHeight).hoverCollective : 1);
    assert.ok(s.view().input.collective > 0 && s.view().input.collective <= 1);
    s.predict(i < 2 ? 'hover' : 'down'); s.run(); finish();
    assert.equal(s.view().result.passed, true); s.next();
  }
  for (const q of definition.checks) { s.answer(q.answers.find(a => a.id !== q.correct).id); assert.equal(s.view().animation, q.answers.find(a => a.id === q.correct).animation); s.next(); }
  assert.equal(s.view().challenge, true);
  assert.equal(s.view().text, definition.challenge.text);
  assert.equal(definition.challenge.title + ' ' + definition.challenge.text, "Lift must match weight. Lighten the load if she won't climb.");
});

test('hints name the physical failure and kilograms, and the hover pictures match flight forces', () => {
  for (const [input, kind] of [[{collective: 0}, 'low'], [{collective: 1}, 'high'], [{car: 1, crates: 3, collective: 1}, 'heavy']]) {
    const result = hooks.evaluate({tryIndex: 0, input, prediction: 'hover'});
    assert.equal(result.passed, false); assert.equal(result.failure, kind);
    assert.match(result.hint.what, /\d+ kg/); assert.match(result.hint.plainer, /\d+ kg/);
  }
  for (const check of definition.checks) for (const answer of check.answers) {
    const drawing = hooks.animations[answer.animation]({time: 2});
    const outcome = padOutcome(drawing.load);
    assert.equal(outcome === 'hover', check.correct === answer.id);
  }
  const overloaded = hooks.evaluate({tryIndex: 0, input: {car: 1, crates: 3, collective: 1}, prediction: 'hover'});
  const cratesToRemove = Number(overloaded.hint.what.match(/Remove (\d+) crates/)[1]);
  assert.ok(padForces({car: 1, crates: 3 - cratesToRemove, collective: 1}, PAD.hoverHeight).shortKg === 0);
});

test('every primitive in the real rotor pitches both blades together and restores its original mesh', async () => {
  const bytes = readFileSync(new URL('../public/assets/heli/kestrel-one.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const blades = rotorBlades(gltf.scene.getObjectByName('main_rotor'));
  assert.equal(blades.length, 3, 'the current multi-material model must not be mistaken for one mesh');
  pitchBlades(blades, 1);
  for (const {mesh, original} of blades) {
    const p = mesh.geometry.attributes.position;
    for (const sign of [-1, 1]) {
      const index = Array.from({length: p.count}, (_, i) => i).find(i => original[i * 3] * sign > 1);
      if (index !== undefined) assert.notEqual(p.getY(index), original[index * 3 + 1]);
    }
  }
  pitchBlades(blades, 0);
  for (const {mesh, original} of blades) assert.deepEqual(mesh.geometry.attributes.position.array, original);
  assert.equal(trialInput({}, 0).crates, 0); assert.equal(trialInput({}, 1).crates, 1);
});
