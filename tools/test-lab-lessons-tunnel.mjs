import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession} from '../src/lab/lesson-frame.js';
import {TUNNEL_BENCHES} from '../src/lab/benches/tunnel.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';
import {Euler, Vector3, PerspectiveCamera} from 'three';
import {gripSound, stopGripSound} from '../src/lab/lessons/grip-animation.js';
import * as grip from '../src/lab/lessons/grip-lesson.js';
import * as downforce from '../src/lab/lessons/downforce-lesson.js';
import * as braking from '../src/lab/lessons/braking-lesson.js';
import * as suspension from '../src/lab/lessons/suspension-lesson.js';
import * as fuel from '../src/lab/lessons/fuel-lesson.js';
const packets = [grip, downforce, braking, suspension, fuel];
const expected = {
  grip: r => r.grip === 1 ? 'holds' : 'slides',
  downforce: r => r.downforceN > 0 ? 'both' : 'flat',
  braking: r => r.rearBrakeShare > r.rearLoadShare ? 'slide' : r.settings.speedMph <= 50 ? 'short' : 'long',
  suspension: r => r.leanDeg === TUNNEL_BENCHES.suspension.run({spring: 'soft', road: r.settings.road}).leanDeg ? 'gentle' : 'shaky',
  fuel: r => r.fuelKg <= TUNNEL_BENCHES.fuel.run({litres: 35}).fuelKg ? 'light' : 'heavy',
};
function inputsFor(spec, wanted) {
  const input = {};
  for (const [key, value] of Object.entries(wanted)) {
    const c = spec.controls.find(c => (c.setting ?? c.id) === key && (Number.isFinite(c.min) || c.value === value));
    assert.ok(c, `control for ${key}=${value}`); input[c.id] = value;
  }
  return input;
}
const finish = s => { for (let i = 0; i < 100; i++) s.tick(.1); };
test('reversing a choice replaces its old input in both teaching and bench proof', () => {
  for (const packet of [downforce, suspension]) {
    const {spec, definition, hooks} = packet, s = createLessonSession(packet);
    s.next(); definition.words.forEach(() => s.next()); definition.worked.forEach(() => { finish(s); s.next(); });
    const choices = spec.controls.filter(c => c.setting);
    for (const a of choices) for (const b of choices.filter(b => b.setting === a.setting && b.id !== a.id)) {
      s.control(a.id); s.control(b.id); s.control(a.id);
      const input = s.view().input;
      assert.equal(Object.hasOwn(input, b.id), false, 'the abandoned choice cannot override a later action');
      const settings = {};
      spec.controls.forEach(c => { if (Object.hasOwn(input, c.id)) settings[c.setting ?? c.id] = input[c.id]; });
      assert.equal(spec.bench.run(settings).settings[a.setting], a.value);
      assert.equal(hooks.animations.try({input, index: 0, time: 0}).result.settings[a.setting], a.value);
    }
  }
});
test('sparse inputs reset to the same bench defaults for each challenge attempt', () => {
  const attempts = [{}, {stiff: 'stiff'}, {smooth: 'smooth'}, {stiff: 'stiff', smooth: 'smooth'}];
  let bench = openBench('suspension');
  for (const input of attempts) {
    for (const c of bench.bench.controls) bench = setControl(bench, c.id, c.value);
    for (const c of suspension.spec.controls) if (Object.hasOwn(input, c.id)) bench = setControl(bench, c.setting ?? c.id, input[c.id]);
    bench = runBench(bench);
    assert.deepEqual(bench.result.settings, suspension.hooks.animations.try({input, index: 0, time: 0}).result.settings);
  }
  assert.equal(goalMet(bench), true);
});
test('braking pictures show the selected speed, stop fully and face the direction of travel', () => {
  for (const speedMph of [20, 50, 100, 150]) {
    const d = braking.hooks.animations.try({input: {speedMph, frontShare: 70}, time: 2});
    assert.equal(d.cars.length, 1);
    assert.ok(d.labels[0].text.startsWith(`${speedMph} mph`));
    assert.equal(d.cars[0].rotation[2], 0, 'the two-second trial reaches its stop');
    assert.ok(new Vector3(0, 0, 1).applyEuler(new Euler(...d.cars[0].rotation)).x > 0);
    const camera = new PerspectiveCamera(50, 1440 / 900, .1, 80);
    camera.position.set(...d.camera.position); camera.lookAt(...d.camera.target); camera.updateMatrixWorld();
    const point = new Vector3(...d.cars[0].position).project(camera);
    assert.ok(Math.abs(point.x) < .8 && Math.abs(point.y) < .8, 'even the longest stop stays in the close view');
    assert.ok(d.forces[0].origin[0] > d.cars[0].position[0] && d.forces[1].origin[0] < d.cars[0].position[0]);
    assert.equal(d.forces[0].newtons, d.result.frontLoadShare);
  }
});
test('air crosses the wing chord and the wing span stays level at every tilt', () => {
  for (const wing of ['flat', 'small', 'big']) {
    const c = downforce.spec.controls.find(c => c.value === wing);
    const d = downforce.hooks.animations.try({input: {[c.id]: wing}, time: 1});
    const pose = d.parts[0], rotation = new Euler(...pose.rotation, pose.order);
    const span = new Vector3(1, 0, 0).applyEuler(rotation), chord = new Vector3(0, 0, 1).applyEuler(rotation);
    assert.ok(Math.abs(span.x) < 1e-12 && Math.abs(span.y) < 1e-12);
    assert.ok(Math.abs(chord.x) > .9, 'smoke crosses the chord, not the span');
  }
});
test('the drawing graph uses actual slide degrees and the challenge grip curve', () => {
  const graph = grip.hooks.animations['watch-2']({time: 3}).graph;
  assert.equal(graph.maxX, 12); assert.equal(graph.revealX, 12);
  graph.points.forEach(([x, y]) => assert.equal(y, grip.spec.bench.run({slideDeg: x}).grip * 100));
});
test('grip uses the existing sample for a short squeal and a longer screech, respecting mute', () => {
  const stops = [], starts = [];
  const node = () => ({connect() {}, disconnect() {}, stop(t) { stops.push(t); }, start() { starts.push(1); }});
  const audio = {samples: {squeal: {source: {buffer: {}}}}, context: {currentTime: 10,
    createBufferSource: node, createGain: () => ({...node(), gain: {setValueAtTime() {}, setTargetAtTime() {}}})}};
  for (const index of [1, 2]) {
    gripSound({stage: 2, index, animation: `watch-${index}`, time: 0}, audio);
    gripSound({stage: 2, index, animation: `watch-${index}`, time: .2}, audio);
  }
  assert.deepEqual(stops.filter(Number.isFinite), [10.18, 11.2]);
  assert.equal(starts.length, 2);
  gripSound({stage: 2, index: 0, time: 0}, {...audio, muted: true});
  assert.equal(starts.length, 2); stopGripSound();
});
for (const {spec, definition, hooks} of packets) {
  test(`${spec.id}: every offered prediction reads the challenge bench`, () => {
    validateLesson(definition, hooks);
    const bench = TUNNEL_BENCHES[spec.id];
    let settings = [{}];
    for (const c of bench.controls) {
      if (!spec.controls.some(x => (x.setting ?? x.id) === c.id)) continue;
      const values = c.options ?? Array.from({length: Math.round((c.max - c.min) / c.step) + 1}, (_, i) => c.min + i * c.step);
      settings = settings.flatMap(s => values.map(v => ({...s, [c.id]: v})));
    }
    for (const s of settings) {
      const result = bench.run(s), input = inputsFor(spec, s), actual = expected[spec.id](result);
      for (let i = 0; i < 3; i++) {
        assert.equal(hooks.evaluate({tryIndex: i, input, prediction: actual}).actual, actual);
        const d = hooks.animations.try({input, index: i, time: 1});
        assert.deepEqual(d.result.settings, result.settings);
        assert.ok(d.camera.position[2] < 6, 'low close view');
        assert.ok(d.labels.length <= 3);
        assert.ok(d.labels.every(l => !/\bN\b|newtons/i.test(l.text)));
        assert.ok(d.streams.length > 0 && d.streams.every(s => s.speed > 0));
      }
    }
    spec.examples.forEach((s, i) => assert.equal(definition.tries[i].prediction.correct, expected[spec.id](bench.run(s))));
    for (const [id, s] of Object.entries(spec.answerInputs)) assert.equal(expected[spec.id](bench.run(s)), id, 'answer picture matches its bench outcome');
  });
  test(`${spec.id}: teaching leads to the real challenge goal without a reward shortcut`, () => {
    const s = createLessonSession({definition, hooks});
    s.next(); definition.words.forEach(() => s.next());
    definition.worked.forEach(() => { finish(s); s.next(); });
    for (let i = 0; i < 3; i++) {
      assert.equal(s.view().support, ['guided', 'prompted', 'alone'][i]);
      const input = inputsFor(spec, spec.examples[i]);
      Object.entries(input).forEach(([id, v]) => s.control(id, v));
      s.predict(expected[spec.id](spec.bench.run(spec.examples[i]))); s.run(); finish(s);
      assert.equal(s.view().result.passed, true); s.next();
    }
    definition.checks.forEach(q => { s.answer(q.answers.find(a => a.id !== q.correct).id); assert.equal(s.view().animation, q.answers.find(a => a.id === q.correct).animation); s.next(); });
    assert.equal(s.view().challenge, true); s.startChallenge();
    const wanted = spec.id === 'suspension' ? {spring: 'stiff', road: 'smooth'} : spec.examples[2];
    const input = inputsFor(spec, wanted); Object.entries(input).forEach(([id, v]) => s.control(id, v));
    s.predict(expected[spec.id](spec.bench.run(wanted))); s.run(); finish(s);
    assert.equal(s.view().result.passed, true);
    const history = s.view().attempts.map(a => {
      const settings = {};
      a.controls.forEach(c => { if (Object.hasOwn(a.input, c.id)) settings[c.setting ?? c.id] = a.input[c.id]; });
      return {result: spec.bench.run(settings)};
    });
    assert.equal(spec.bench.goalMet(history), true, 'the original bench must accept the actual attempts');
  });
}
test('suspension teaches the shake and lean trade-off without teaching tyre contact', () => {
  const {definition, hooks, spec} = suspension;
  assert.doesNotMatch(JSON.stringify(definition), /contact|tyre light/i);
  for (const spring of ['soft', 'stiff']) for (const road of ['smooth', 'bumpy']) {
    const d = hooks.animations.try({input: {[spring]: spring, [road]: road}, time: 1});
    assert.ok(d.labels.every(l => !/contact|%/i.test(l.text)));
    assert.ok(d.objects.every(o => o.id !== 'contact-light'));
  }
  const written = [];
  const ctx = new Proxy({}, {get: (_, key) => key === 'fillText' ? text => written.push(text) : () => {}});
  Object.values(hooks.pictures).forEach(picture => picture(ctx, 450, 120));
  assert.ok(written.some(text => text === 'Less shake on bumps'));
  assert.ok(written.some(text => text === 'More shake on bumps'));
  assert.ok(written.every(text => !/contact|%/i.test(text)));
  const time = Math.PI / 18;
  const d = hooks.animations['watch-1']({index: 1, time});
  assert.equal(d.cars.length, 2);
  assert.ok(d.cars[0].position[0] < d.cars[1].position[0], 'both setups are side by side');
  const soft = spec.bench.run({spring: 'soft', road: 'bumpy'}), stiff = spec.bench.run({spring: 'stiff', road: 'bumpy'});
  assert.ok(d.cars[0].position[1] < d.cars[1].position[1], 'soft passes less bump movement to the body');
  assert.ok(Math.abs(d.cars[0].rotation[2]) > Math.abs(d.cars[1].rotation[2]), 'stiff keeps the body flatter');
  assert.ok(Math.abs((d.cars[0].position[1] - .55) / (d.cars[1].position[1] - .55) - soft.bodyShake / stiff.bodyShake) < 1e-12);
  assert.ok(Math.abs(d.cars[0].rotation[2] / d.cars[1].rotation[2] - soft.leanDeg / stiff.leanDeg) < 1e-12);
});

test('the lesson comparisons tell the truth where the design prose differs', () => {
  const b = TUNNEL_BENCHES;
  assert.equal(b.grip.run({slideDeg: 0}).grip, b.grip.run({slideDeg: 4}).grip, 'available grip is a plateau, not a rising curve');
  assert.ok(b.suspension.run({spring: 'soft'}).bodyShake < b.suspension.run({spring: 'stiff'}).bodyShake, 'soft springs reduce the shake passed to the body');
  assert.ok(b.suspension.run({spring: 'stiff'}).leanDeg < b.suspension.run({spring: 'soft'}).leanDeg, 'stiff springs keep the body flatter in a bend');
  assert.equal(b.braking.run({frontShare: 50}).stopMetres, b.braking.run({frontShare: 70}).stopMetres);
  assert.equal(b.fuel.controls.some(c => c.id === 'laps'), false);
  assert.equal(b.grip.controls.some(c => c.id === 'pressure'), false);
});
