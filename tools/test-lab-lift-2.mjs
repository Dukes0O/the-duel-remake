import test from 'node:test';
import assert from 'node:assert/strict';
import {PAD, padForces, padOutcome} from '../src/lab/benches/lift-pad.js';
import {KESTREL, GRAVITY, HELI_STEP, createHeliState, heliMass, availableThrust, stepHeli} from '../src/heli/heli-flight.js';
import {definition, hooks} from '../src/lab/lessons/lift-lesson.js';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import {rotorBlades, pitchBlades, trialInput} from '../src/lab/lessons/lift-animation.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PerspectiveCamera, Vector3} from 'three';
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
      const h = padForces(input, PAD.hoverHeight);
      if (h.hoverCollective <= 1) {
        assert.equal(padOutcome({...input, collective: h.hoverCollective}), 'hover');
        hs.mode = 'real'; hs.collective = h.hoverCollective;
        stepHeli(hs, {}, {external: {y: -cargo * GRAVITY}}, HELI_STEP);
        assert.ok(Math.abs(hs.vy) < 1e-10, 'each liftable load can really balance in the low hover');
      }
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
  for (const name of ['Rotor', 'Weight', 'Lift', 'Collective', 'Hover']) {
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
  const goal = hooks.evaluate({tryIndex: 2, input: {collective: 1}, prediction: 'up'});
  assert.equal(goal.failure, 'goal'); assert.match(goal.hint.what, /[0-9]+ kg/);
  assert.match(goal.hint.what, /hook the Dusthawk and add 2 crates/);
  const lowPower = hooks.evaluate({tryIndex: 2, input: {car: 1, crates: 3, collective: .1}, prediction: 'down'});
  assert.match(lowPower.hint.what, /not tested.*kg.*full collective/);
  const wrongPicture = hooks.evaluate({tryIndex: 0, input: {collective: padForces({fuel: KESTREL.tankKg}, PAD.hoverHeight).hoverCollective}, prediction: 'up'});
  assert.equal(wrongPicture.failure, 'prediction'); assert.match(wrongPicture.hint.what, /1630 kg load hovered/);
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

test('pulling the collective raises its handle, speeds the air and grows lift together', () => {
  const low = hooks.animations.collective({time: 0});
  const high = hooks.animations.collective({time: 3});
  const handle = d => d.objects.find(o => o.id === 'collective-handle');
  assert.ok(handle(high).position[1] > handle(low).position[1]);
  assert.ok(high.streams[0].speed > low.streams[0].speed);
  assert.ok(high.forces.find(f => f.kind === 'lift').newtons > low.forces.find(f => f.kind === 'lift').newtons);
  assert.equal(high.graph, null);
});

test('force captions and the one graph compare kilograms derived from the same flight forces', () => {
  assert.equal(definition.words.find(w => w.word === 'Lift').caption,
    "We measure the rotor's push in kilograms, like weight, so you can compare them.");
  for (const animation of Object.values(hooks.animations)) {
    const d = animation({time: 3, input: {}, index: 0});
    for (const f of d.forces) {
      assert.equal(f.displayUnit, 'kg');
      assert.equal(f.displayValue, f.newtons / GRAVITY);
      assert.equal(f.origin[0], 0, 'both arrows start on the centre line');
    }
    if (d.graph) {
      assert.equal(d.graph.yLabel, 'Lift in kg');
      assert.equal(d.graph.maxY, padForces(d.load).maximumN / GRAVITY);
    }
  }
});

test('the kg introduction adds one caption without replacing the notebook meaning or relaxing prose limits', () => {
  const s = createLessonSession({definition, hooks}); s.next(); s.next(); s.next();
  assert.equal(s.view().name, 'Lift');
  assert.equal(s.view().text, definition.words[2].meaning + ' ' + definition.words[2].caption);
  assert.match(definition.words[2].meaning, /push up/);
  const invalid = structuredClone(definition);
  invalid.words[2].caption += ' A third sentence is too much.';
  assert.throws(() => validateLesson(invalid, hooks), /one or two short sentences/);
});

test('the view preserves the lift-to-weight length comparison on the helicopter centre line', () => {
  const d = hooks.animations.heavy({time: 0});
  const camera = new PerspectiveCamera(50, 1440 / 809, .1, 80);
  camera.position.set(...d.camera.position); camera.lookAt(...d.camera.target); camera.updateMatrixWorld();
  const lengths = d.forces.map(f => {
    const a = new Vector3(...f.origin), b = a.clone().addScaledVector(new Vector3(...f.direction), f.newtons * d.metresPerNewton);
    return Math.abs(a.project(camera).y - b.project(camera).y);
  });
  assert.ok(lengths[1] > lengths[0], 'the overloaded weight arrow must look longer');
  assert.ok(Math.abs(lengths[0] / lengths[1] - d.forces[0].newtons / d.forces[1].newtons) < 1e-10);
  for (const name of ['car', 'up']) {
    const climbing = hooks.animations[name]({time: 6});
    camera.position.set(...climbing.camera.position); camera.lookAt(...climbing.camera.target); camera.updateMatrixWorld();
    for (const f of climbing.forces) {
      const tip = new Vector3(...f.origin).addScaledVector(new Vector3(...f.direction), f.newtons * climbing.metresPerNewton).project(camera);
      assert.ok(tip.y > -1 && tip.y < 1, `${name}: a climbing arrow must stay inside the view`);
    }
  }
  const ramp = hooks.animations.ramp({time: 4});
  camera.position.set(...ramp.camera.position); camera.lookAt(...ramp.camera.target); camera.updateMatrixWorld();
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    const corner = new Vector3(...ramp.graph.position).addScaledVector(right, x * ramp.graph.size[0] / 2);
    corner.y += y * ramp.graph.size[1] / 2; corner.project(camera);
    assert.ok(Math.abs(corner.x) < 1 && Math.abs(corner.y) < 1, 'the graph and its kg axis title must fit inside the view');
  }
});
