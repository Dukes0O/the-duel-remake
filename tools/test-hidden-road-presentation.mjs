import assert from 'node:assert/strict';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { EngineAudio } from '../src/audio.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { CAMERA_MODES } from '../src/camera-views.js';
import { sweepObstacle } from '../src/collision.js';

const ui = await import('../src/hidden-road-ui.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
const course = new Course(COURSE[0], 1989, { hiddenRoad: true });
const pose = course.hiddenRoad.poseAt(course.hiddenRoad.length - 12);
function state(phase = 'opening', seconds = 1) {
  return { status: 'exploring', paused: false, s: pose.s, lateral: pose.lateral,
    car: 'falcone_f42', speedMph: 0, headingError: pose.heading - course.at(pose.s).heading,
    hiddenRoadJourney: { id: 'synthetic-journey', phase, elapsedSec: 8 + seconds,
      phaseElapsedSec: seconds, progress: course.hiddenRoad.length - 12,
      gateOpen: phase === 'opening' ? seconds / 3 : 1, departed: true,
      controlsLocked: !['exploring', 'turned-back'].includes(phase), choiceReady: phase === 'choice' } };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const item of Object.values(value)) freeze(item); }
  return value;
}
function present(s, c = course) {
  assert.equal(typeof ui.hiddenRoadPresentation, 'function', 'DOM-free presentation selector is exported');
  return ui.hiddenRoadPresentation(s, c);
}

check('missing, disabled and inactive journeys show no gate controls or cinematic', () => {
  for (const [s, c] of [[{ status: 'racing' }, course], [state(), {}],
    [{ ...state(), status: 'menu' }, course], [{ ...state(), hiddenRoadJourney: null }, course]]) {
    const p = present(freeze(s), c);
    assert.equal(p.active, false);
    assert.equal(p.hudOpacity, 1);
    assert.equal(p.choiceReady, false);
    assert.equal(p.camera, null);
    assert.equal(p.gateOpen, 0);
    assert.equal(p.sparks.length, 0);
  }
});

check('HUD fades with simulation time and presentation cannot alter race snapshots', () => {
  const first = state('exploring', 0); first.hiddenRoadJourney.elapsedSec = 0;
  const later = state('exploring', 1); later.hiddenRoadJourney.elapsedSec = 1;
  const a = present(freeze(first)), b = present(freeze(later));
  assert.ok(a.hudOpacity > b.hudOpacity && b.hudOpacity >= 0);
  assert.equal(a.camera, null);
  const s = freeze(state()), before = JSON.stringify(s), geometry = JSON.stringify(course.hiddenRoad.samples);
  const expected = present(s);
  for (let i = 0; i < 20; i++) assert.deepEqual(present(s), expected, 'render calls do not advance clocks');
  present(freeze(state('opening', 2)));
  assert.deepEqual(present(s), expected, 'rewound snapshot has the same presentation');
  assert.equal(JSON.stringify(s), before);
  assert.equal(JSON.stringify(course.hiddenRoad.samples), geometry);
});

check('gate and low camera follow actual journey values, with bounded analytic sparks', () => {
  for (const phase of ['arriving', 'opening', 'choice', 'entering', 'arrived']) {
    const s = state(phase), p = present(freeze(s));
    assert.equal(p.gateOpen, s.hiddenRoadJourney.gateOpen);
    assert.ok(p.camera, `${phase} supplies a cinematic camera`);
    for (const vector of [p.camera.position, p.camera.target]) for (const value of Object.values(vector)) assert.ok(Number.isFinite(value));
    assert.ok(p.camera.position.y > pose.y && p.camera.position.y < pose.y + 8, 'camera remains low at the gate');
    assert.ok(p.camera.fov > 0 && p.camera.fov < 120);
    assert.ok(p.camera.blend >= 0 && p.camera.blend <= 1);
    assert.ok(Array.isArray(p.sparks) && p.sparks.length <= 64, 'sparks have a small bounded presentation budget');
    assert.equal(p.arrivalReady, phase === 'arrived');
  }
  const opening = present(freeze(state('opening', 1)));
  assert.ok(opening.sparks.length > 0, 'moving chains show sparks');
  const early = present(freeze(state('turned-back', .2))), late = present(freeze(state('turned-back', 1)));
  assert.ok(early.camera && early.camera.blend > 0 && early.camera.blend < 1, 'camera blends back after declining');
  assert.equal(late.camera, null);
});

check('pause holds gate and camera but suppresses sparks and invitation input', () => {
  for (const phase of ['opening', 'choice']) {
    const active = state(phase), paused = { ...active, paused: true };
    const a = present(freeze(active)), b = present(freeze(paused));
    assert.equal(b.gateOpen, a.gateOpen);
    assert.deepEqual(b.camera, a.camera);
    assert.equal(b.choiceReady, false);
    assert.deepEqual(b.sparks, []);
  }
  assert.equal(present(freeze(state('choice'))).choiceReady, true);
  const notReady = state('choice'); notReady.hiddenRoadJourney.choiceReady = false;
  assert.equal(present(freeze(notReady)).choiceReady, false);
});

check('physical spur driving camera clears ground and wash banks before and after departure on ABC', () => {
  assert.equal(typeof ui.hiddenRoadDrivingCamera, 'function', 'physical spur camera helper is exported');
  for (const route of ROUTE_VARIANTS) {
    const c = new Course(COURSE[0], route.seed, { hiddenRoad: true });
    const road = c.hiddenRoad;
    for (const progress of [100, 150]) {
      const p = road.poseAt(progress), heading = p.heading + .35, slip = .07;
      const s = freeze({ status: progress < 150 ? 'racing' : 'exploring', paused: false,
        car: 'falcone_f42', s: p.s, lateral: p.lateral, groundHeight: p.y, airHeight: 0,
        headingError: heading - c.at(p.s).heading, slipAngle: slip,
        hiddenRoadJourney: progress < 150 ? { departed: false, phase: 'racing' } : { departed: true, phase: 'exploring' } });
      const before = JSON.stringify(s), car = c.worldAt(s.s, s.lateral), actualHeading = heading + slip;
      for (const mode of CAMERA_MODES) {
        const view = ui.hiddenRoadDrivingCamera(s, c, mode);
        assert.ok(view, `${route.id}/${progress}/${mode}: actual spur gets a physical camera`);
        for (const point of [view.position, view.target]) for (const value of Object.values(point)) assert.ok(Number.isFinite(value));
        const camera = view.position, near = c.nearest(camera.x, camera.z, p.s);
        assert.ok(camera.y >= c.groundAt(near.s, near.lateral).y + .3,
          `${route.id}/${mode}: camera is above actual local support, not an unrelated tunnel`);
        for (const wall of road.walls) assert.equal(sweepObstacle(camera, camera, wall, actualHeading,
          { halfWidth: .15, halfLength: .15, height: .3 }), null,
        `${route.id}/${mode}: camera near-plane clearance from actual wash bank`);
        const dx = camera.x - car.x, dz = camera.z - car.z;
        const forward = dx * Math.sin(actualHeading) + dz * Math.cos(actualHeading);
        const side = dx * Math.cos(actualHeading) - dz * Math.sin(actualHeading);
        if (['chase', 'wide', 'back'].includes(mode)) assert.ok(forward < -.1, `${mode} stays behind actual car heading`);
        if (['front', 'hood'].includes(mode)) assert.ok(forward > .1, `${mode} stays ahead of actual car heading`);
        if (mode === 'right') assert.ok(side > .1, 'right view stays to the car right');
        if (mode === 'left') assert.ok(side < -.1, 'left view stays to the car left');
        assert.deepEqual(ui.hiddenRoadDrivingCamera(s, c, mode), view, 'camera depends only on the snapshot');
      }
      assert.equal(JSON.stringify(s), before, 'camera helper cannot mutate simulation');
      assert.equal(ui.hiddenRoadDrivingCamera({ ...s, status: 'menu' }, c, 'chase'), null);
      assert.equal(ui.hiddenRoadDrivingCamera({ ...s, lateral: 0 }, c, 'chase'), null,
        'return to the racing lane restores the existing ordinary camera path');
      assert.equal(ui.hiddenRoadDrivingCamera(s, { ...c, hiddenRoad: null }, 'chase'), null,
        'flag-off course retains ordinary camera behavior');
    }
  }
});

// A small semantic DOM fixture: no HTML parser, renderer, timers or browser globals.
class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.ownerDocument = doc;
    this.children = []; this.attributes = {}; this.listeners = new Map(); this.hidden = false;
    this.disabled = false; this.textContent = ''; this.isConnected = true; }
  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.isConnected = false; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  focus() { this.ownerDocument.activeElement = this; }
  dispatch(type, extra = {}) {
    const event = { target: this, key: '', code: '', preventDefault() {}, stopPropagation() {}, ...extra };
    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }
}
function nodes(root) { return [root, ...root.children.flatMap(nodes)]; }
check('DOM invitation dispatches eligible choices, returns focus and removes its listeners', () => {
  assert.equal(typeof ui.createHiddenRoadUi, 'function');
  const doc = { createElement: tag => new Element(tag, doc), activeElement: null };
  const host = new Element('main', doc), previous = new Element('button', doc);
  previous.focus();
  const choices = []; let menus = 0;
  const view = ui.createHiddenRoadUi({ host, onChoose: x => choices.push(x), onMenu: () => menus++ });
  view.update(state('opening'), course);
  const buttons = nodes(host).filter(node => node.tagName === 'BUTTON');
  const enter = buttons.find(node => node.textContent === 'Enter the Wasteland');
  const back = buttons.find(node => node.textContent === 'Turn back');
  assert.ok(enter && back, 'semantic buttons have clear action labels');
  enter.dispatch('click'); assert.deepEqual(choices, []);
  view.update(state('choice'), course);
  assert.equal(enter.disabled, false);
  enter.dispatch('click'); assert.deepEqual(choices, ['enter']);
  view.update({ ...state('choice'), paused: true }, course);
  back.dispatch('click'); assert.deepEqual(choices, ['enter']);
  view.update(state('choice'), course);
  back.dispatch('click'); assert.deepEqual(choices, ['enter', 'turn-back']);
  view.update(state('arrived'), course);
  const menu = nodes(host).find(node => node.tagName === 'BUTTON' && node.textContent === 'Return to menu');
  assert.ok(menu); menu.dispatch('click'); assert.equal(menus, 1);
  const retained = nodes(host);
  view.dispose(); view.dispose();
  assert.equal(host.children.length, 0);
  assert.equal(doc.activeElement, previous, 'dialog restores prior connected focus');
  for (const element of retained) for (const listeners of element.listeners.values()) assert.equal(listeners.size, 0);
  enter.dispatch('click'); menu.dispatch('click');
  assert.deepEqual(choices, ['enter', 'turn-back']); assert.equal(menus, 1);
});

function audioFixture() {
  const calls = [], voices = [];
  const audio = new EngineAudio({ hiddenRoadVoiceFactory: cue => {
    calls.push(structuredClone(cue));
    const voice = { stops: 0, stop() { this.stops++; } }; voices.push(voice); return voice;
  } });
  audio.setMuted(false);
  assert.equal(typeof audio.updateHiddenRoad, 'function', 'journey sound consumes simulation snapshots');
  return { audio, calls, voices };
}
function soundOpening(fixture) {
  for (const t of [0, .25, .5, .75, 1]) fixture.audio.updateHiddenRoad(state('opening', t));
  assert.ok(fixture.calls.length > 0, 'opening makes original gate sound cues');
}
check('audio deduplicates simulation cues and cannot mutate or advance journey state', () => {
  const f = audioFixture(); soundOpening(f);
  const s = freeze(state('opening', 1)), before = JSON.stringify(s), count = f.calls.length;
  for (let i = 0; i < 20; i++) f.audio.updateHiddenRoad(s);
  assert.equal(f.calls.length, count, 'render frequency cannot repeat a cue');
  const keys = f.calls.map(c => `${c.journeyId}/${c.phase}/${c.kind}/${c.index}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const c of f.calls) {
    assert.ok(['drum', 'chain', 'latch'].includes(c.kind));
    assert.equal(c.journeyId, 'synthetic-journey');
    assert.ok(Number.isFinite(c.simulationTime));
  }
  assert.equal(JSON.stringify(s), before);
});

for (const action of ['pause', 'mute', 'menu', 'new-journey']) check(`audio ${action} cancels voices and does not replay a backlog`, () => {
  const f = audioFixture(); soundOpening(f);
  const old = [...f.voices];
  if (action === 'pause') { f.audio.setPaused(true); f.audio.updateHiddenRoad({ ...state('opening', 10), paused: true }); }
  if (action === 'mute') { f.audio.setMuted(true); f.audio.updateHiddenRoad(state('opening', 10)); }
  if (action === 'menu') f.audio.updateHiddenRoad({ ...state('opening', 10), status: 'menu' });
  if (action === 'new-journey') {
    const s = state('opening', 0); s.hiddenRoadJourney.id = 'next-run'; f.audio.updateHiddenRoad(s);
  }
  for (const voice of old) assert.equal(voice.stops, 1, 'each owned voice is retired once');
  if (action === 'pause' || action === 'mute') {
    const mutedCount = f.calls.length;
    for (let i = 0; i < 5; i++) f.audio.updateHiddenRoad({ ...state('opening', 10), paused: action === 'pause' });
    assert.equal(f.calls.length, mutedCount);
    f.audio.setPaused(false); f.audio.setMuted(false);
    f.audio.updateHiddenRoad(state('opening', 10.1));
    assert.ok(f.calls.length - mutedCount <= 2, 'resume emits at most current drum/chain, not missed beats');
  }
  f.audio.setPaused(true);
  for (const voice of f.voices) assert.ok(voice.stops <= 1, 'repeated cleanup cannot double-stop a voice');
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Hidden Road presentation: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
