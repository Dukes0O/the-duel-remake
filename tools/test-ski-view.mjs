// SKI-VIEW: heli-skiing drawn (docs/HELI_SKIING.md sections 2, 4, 5 and 8). Memory-only storage. Checks that the ski keys
// drive the run through the game's own App, that C and H change only the view, that drawing a run (the zone scene, the
// figures, the HUD) never changes the run, and that the cards say what the rules decided.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {skiKeys, skiCameraPose, backdropEye, skierPose, skiDeepSnow, loadingCardMarkup, resultCardMarkup, skiMenuMarkup,
  skiBoardMarkup, createSkiView, SKI_BACKDROP, SKI_CAMERA_VIEWS, zoneGrid} from '../src/ski/ski-view.js';
import {skiControlsHelp} from '../src/controls-help.js';
import {createSkiRun, stepSkiRun, skiRunView, skiRunFingerprint, SKI_RUN_IDS} from '../src/ski/ski-session.js';
import {skiZone} from '../src/ski/runs/summit-zones.js';
import {aerialsTips} from '../src/lab/benches/launch.js';
import {SKI_PADS} from '../src/ski/ski-session.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';

const DEG = Math.PI / 180;

test('the ski keys: A and D turn (D right), S skids, Shift tucks, W skates, Space pops; in the air W and S flip; the pad too', () => {
  assert.deepEqual(skiKeys({}), {turn: 0, flip: 0, skid: false, tuck: false, skate: false, pop: false});
  assert.equal(skiKeys({KeyD: true}).turn, 1); assert.equal(skiKeys({ArrowLeft: true}).turn, -1);
  assert.deepEqual(skiKeys({KeyS: true}), {turn: 0, flip: -1, skid: true, tuck: false, skate: false, pop: false});
  assert.deepEqual(skiKeys({KeyW: true, ShiftLeft: true, Space: true}), {turn: 0, flip: 1, skid: false, tuck: true, skate: true, pop: true});
  const pad = {axes: [0.8, -0.9], buttons: [{pressed: true}, {}, {}, {}, {}, {}, {}, {pressed: true}]};
  assert.deepEqual(skiKeys({}, pad), {turn: 0.8, flip: 0.9, skid: false, tuck: true, skate: true, pop: true});
  // The help lists every key of section 4.
  const keys = skiControlsHelp().map(([key]) => key).join(' ');
  for (const key of ['A D', 'S', 'SHIFT', 'W', 'SPACE', 'C', 'ESC', 'H']) assert.ok(keys.includes(key), `help lists ${key}`);
});

test('the cameras stay above the snow; the backdrop eye is over the pad and turned to its valley (the App test checks the valleys)', () => {
  for (const id of SKI_RUN_IDS) {
    const zone = skiZone(id), run = createSkiRun({runId: id});
    for (let i = 0; i < 120 * 6; i++) stepSkiRun(run, {skate: true, tuck: true});
    const skier = skiRunView(run).skier;
    for (const mode of SKI_CAMERA_VIEWS) {
      const pose = skiCameraPose({skier, mode, ground: zone.ground});
      assert.ok(pose.position.y >= zone.ground(pose.position.x, pose.position.z) + 0.79, `${id} ${mode}: above the snow`);
    }
    const eye = backdropEye(zone.world);
    assert.deepEqual([eye.x, eye.z, eye.y], [zone.world.x, zone.world.z, zone.world.y + SKI_BACKDROP.eyeAbove], `${id}: the eye is over its pad`);
    // A camera turned by `turn` sees the valley where it sees its own +z.
    const look = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, eye.turn, 0));
    const valley = SKI_BACKDROP.valley[zone.world.pad] * DEG;
    assert.ok(Math.abs(look.x - Math.sin(valley)) < 1e-9 && Math.abs(look.z - Math.cos(valley)) < 1e-9, `${id}: turned to the valley`);
  }
  assert.equal(skierPose({tumbling: true}), 'skier-tumble');
  assert.equal(skierPose({grounded: false}), 'skier-air');
  assert.equal(skierPose({grounded: true, edge: 30}), 'skier-lean-right');
  assert.equal(skierPose({grounded: true, edge: 0, tucked: true}), 'skier-tuck');
});

test('the cards: the loading tips (all six aerials tips), the targets, the result with its three parts, the menu and the board', () => {
  const view = id => ({...skiRunView(createSkiRun({runId: id})), pick: 'hard'});
  const aerials = loadingCardMarkup(view('aerials'), {snow: {name: 'Packed powder', celsius: -8}});
  for (const tip of aerialsTips()) assert.ok(aerials.includes(tip.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')), 'an aerials tip');
  assert.ok(aerials.includes('Packed powder, -8 °C · wax hard'), 'the day\'s snow and the pick');
  assert.ok(loadingCardMarkup(view('moguls')).includes('Moguls form by themselves where many skiers turn in the same places'), 'the moguls tip');
  assert.ok(/GOLD<\/b> 0:\d\d\.\d\d/.test(loadingCardMarkup(view('slalom'))), 'timed targets as times');
  assert.ok(loadingCardMarkup(view('moguls')).includes('<b>GOLD</b> 80 pts'), 'judged targets as points');
  const timed = resultCardMarkup({kind: 'time', run: 'slalom', time: 47.5, raw: 37.5, missed: 2, medal: 1}, {paid: 150, improved: true});
  assert.ok(timed.includes('0:47.50') && timed.includes('2 gates missed (+10 s)') && timed.includes('BRONZE') && timed.includes('150 credits · new best'));
  const judged = resultCardMarkup({kind: 'points', run: 'aerials', points: 71.24, medal: 2, air: 80, form: 60, landing: 90});
  assert.ok(judged.includes('71.2 pts') && /Air <small>20%[\s\S]*Form <small>50%[\s\S]*Landing <small>30%/.test(judged) && judged.includes('SILVER'));
  const moguls = resultCardMarkup({kind: 'points', run: 'moguls', points: 50, medal: 1, turns: 70, air: 50, speed: 10});
  assert.ok(/Turns <small>60%[\s\S]*Air <small>20%[\s\S]*Speed <small>20%/.test(moguls), 'the moguls three parts');
  const offers = {pad: 'devils', snow: {name: 'Spring corn', celsius: 2}, waxes: ['hard', 'medium', 'soft'], challenge: {id: 'wax', run: 'slalom'},
    runs: [{id: 'slalom', name: 'Slalom', best: 41.2, medal: 3, limits: {kind: 'time'}}, {id: 'moguls', name: 'Moguls', best: null, medal: 0, limits: {kind: 'points'}}]};
  const menu = skiMenuMarkup(offers, {wax: 'soft'});
  assert.ok(menu.includes('SKI FROM DEVILS PLAYGROUND') && menu.includes('Spring corn</b>, 2 °C') && menu.includes('data-ski-wax="soft" aria-pressed="true"'));
  assert.ok(menu.includes('best 0:41.20 · Gold') && menu.includes('not skied yet') && menu.includes('data-ski-challenge="wax">Ski'), 'runs and the Lab run');
  assert.ok(skiMenuMarkup(offers).includes('data-ski-challenge="wax" disabled'), 'the Lab run waits for a wax');
  assert.ok(!skiMenuMarkup({...offers, pad: 'pickup', runs: offers.runs.filter(run => run.id !== 'slalom')}).includes('data-ski-challenge'), 'and shows only where the slalom starts');
  assert.ok(!skiMenuMarkup({...offers, waxes: null}).includes('data-ski-wax'), 'no wax pick without the kit');
  const board = skiBoardMarkup({drop: {title: 'Heli-ski drop at Summit Run', taken: false}, group: {title: 'Heli-ski group', guests: 4, payNow: 1200, taken: false, done: false}});
  assert.ok(board.includes('data-ski-board="drop"') && board.includes('data-ski-board="group"') && board.includes('1,200 credits'));
  assert.ok(skiBoardMarkup({drop: {title: 'Drop', taken: true}, group: null}, {kind: 'drop'}).includes('data-ski-board="hand-back"'));
  assert.equal(skiDeepSnow(skiRunView(createSkiRun({runId: 'slalom'}))), 0, 'no deep snow on a course');
});

// Stand-ins for SKI-ART's files: one small box per model, so the scene can be built without a browser.
const fakeModels = id => Promise.resolve({scene: Object.assign(new THREE.Group(), {name: id}).add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshStandardMaterial()))});
const sessionView = (run, group = false) => ({phase: 'skiing', ski: {run: {...skiRunView(run), pick: null}, group}});

test('drawing a run never changes it: the same controls give the same run with and without the zone scene', async () => {
  for (const id of SKI_RUN_IDS) {
    const plain = createSkiRun({runId: id, group: id !== 'powder'}), drawn = createSkiRun({runId: id, group: id !== 'powder'});
    const view = createSkiView({loadModel: fakeModels});
    const controls = i => ({turn: Math.sin(i / 90), skate: true, tuck: i % 400 > 200, pop: i % 600 === 0});
    view.pose(sessionView(drawn));
    await new Promise(done => setTimeout(done, 0));
    for (let i = 0; i < 120 * 20; i++) {
      stepSkiRun(plain, controls(i));
      stepSkiRun(drawn, controls(i));
      if (i % 12 === 0) {
        const frame = sessionView(drawn), pose = view.pose(frame, {cameraMode: i / 12, dt: 0.1});
        assert.ok(view.render({view: frame, pose, seconds: i / 120, dt: 0.1}), `${id}: drawn`);
      }
    }
    assert.equal(skiRunFingerprint(drawn), skiRunFingerprint(plain), `${id}: the drawn run matches the plain one`);
    const last = sessionView(drawn);
    view.render({view: last, pose: view.pose(last)});
    const scene = view.scene, zone = skiZone(id);
    const skier = scene.getObjectByName('Skier'), s = skiRunView(drawn).skier;
    assert.ok(Math.hypot(skier.position.x - s.x, skier.position.z - s.z) < 1e-6 && Math.abs(skier.position.y - (s.y - zone.drop.y)) < 1e-6, `${id}: the skier is drawn where it is`);
    assert.equal(skier.children.filter(pose => pose.visible).length, 1, `${id}: one pose at a time`);
    const poles = ['Red gates', 'Blue gates'].map(name => scene.getObjectByName(name)?.children[0]?.count ?? 0).reduce((a, b) => a + b, 0);
    assert.equal(poles, zone.kind === 'gs' ? zone.gates.length : zone.gates.length * 2, `${id}: every gate drawn`);
    assert.equal(scene.getObjectByName('Powder stashes').children.length, zone.stashes.length, `${id}: the stashes' fresh snow`);
    assert.equal(scene.getObjectByName('The group').visible, id !== 'powder', `${id}: the group skis beside the player`);
    // The kickers' lips and the netting's ends sit on the snow (a stand-in model's points, through each instance's matrix).
    const onSnow = (name, local, label) => {
      const mesh = scene.getObjectByName(name)?.children[0];
      for (let i = 0; i < (mesh?.count ?? 0); i++) {
        const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m);
        for (const point of local) {
          const p = point.clone().applyMatrix4(m);
          assert.ok(Math.abs(p.y - (zone.ground(p.x, p.z) - zone.drop.y)) < 0.35, `${id}: ${label} ${i} on the snow (${(p.y - (zone.ground(p.x, p.z) - zone.drop.y)).toFixed(2)} m)`);
        }
      }
    };
    if (id === 'moguls') onSnow('Kickers', [new THREE.Vector3(0, 1.69, 2.5)], 'kicker lip');
    onSnow('Safety netting', [new THREE.Vector3(-6, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 0)], 'netting');
    const grid = zoneGrid(zone);
    assert.ok(grid.xs[0] < zone.bounds.minX - 300 && grid.zs.at(-1) > zone.bounds.maxZ + 500, `${id}: the snow runs on past the zone`);
    view.dispose();
  }
  // The guide's ghost: on a timed run without the group only.
  const solo = createSkiRun({runId: 'slalom'}), view = createSkiView({loadModel: fakeModels});
  view.pose(sessionView(solo)); await new Promise(done => setTimeout(done, 0));
  const frame = sessionView(solo); view.render({view: frame, pose: view.pose(frame)});
  assert.equal(view.scene.getObjectByName("The guide's ghost").visible, true, 'the ghost on a timed run');
  assert.equal(view.pose({phase: 'flying', ski: {run: null}}), null, 'no run: nothing drawn');
  assert.equal(view.scene, null, 'and the zone is freed');
  view.dispose();
});

test('in the App: the ski keys drive the run, C and H change only the view, and the step-out and restart go through the session', {timeout: 600000}, async () => {
  const {App} = await import('../src/app.js');
  const {createFeatureFlags} = await import('../src/feature-flags.js');
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), memory = new Map();
  const savedCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: () => {}});
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)}});
  let app;
  try {
    app = new App();
    app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {helicopter: true, 'forest-fire': true, rescue: true, 'summit-run': true, 'heli-skiing': true}, qa: true});
    app.profile = {...app.profile, credits: 2000, courses: {version: 1, unlocked: ['tremblant-woods', 'summit-run']},
      heli: {version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}, refuels: 3}};
    app._saveProfile();
    assert.ok(app.visitHeli(), 'the visit starts');
    const session = app.heliSession;
    assert.ok(session.skiBoard(), 'the ski board is open (the switch reaches the session)');
    assert.equal(app.heliSki('drop').ok, true, 'the ski drop is taken through the app');
    // Fly to Summit Run and down onto Devils Playground (a scripted pilot, as the session's own tests do).
    flyTo(session, () => groundFromCourse(app.duel.course), 'devils');
    assert.equal(session.view().ski.pad, 'devils', 'on the Devils Playground pad');
    // The backdrop's valleys are the real Summit ground's: from each pad, the lowest mean height 100 to 600 m out.
    const summit = groundFromCourse(app.duel.course);
    for (const [name, pad] of Object.entries(SKI_PADS)) {
      let best = null;
      for (let deg = 0; deg < 360; deg += 5) {
        let sum = 0;
        for (let d = 100; d <= 600; d += 50) sum += summit.height(pad.x + Math.sin(deg * DEG) * d, pad.z + Math.cos(deg * DEG) * d);
        if (!best || sum < best.sum) best = {deg, sum};
      }
      assert.equal(SKI_BACKDROP.valley[name], best.deg, `${name}: the backdrop looks down the valley at ${best.deg} degrees`);
    }
    const before = session.fingerprint();
    app._inputAction('heli-camera'); app._inputAction('heli-hook');
    assert.equal(session.fingerprint(), before, 'C and H on the pad still belong to the helicopter, and change nothing in flight here');
    assert.equal(app.heliSki('stepOut', 'slalom', {wax: null}).ok, true, 'step out onto the slalom');
    assert.equal(session.phase, 'skiing');
    assert.deepEqual([app.skiCamera, app.skiHelp], [0, false], 'a new run starts on the chase camera with the help shut');
    const skiing = session.fingerprint();
    app._inputAction('heli-camera'); app._inputAction('heli-hook'); app._inputAction('heli-autopilot'); app._inputAction('heli-cruise');
    assert.deepEqual([app.skiCamera, app.skiHelp], [1, true], 'on skis C changes the camera and H shows the ski keys');
    assert.equal(session.fingerprint(), skiing, 'and nothing else happens');
    // The real drawing paths, fed the App's own view, change nothing: the zone scene, the HUD and the helicopter panel.
    const {createHeliUi} = await import('../src/heli/heli-ui.js');
    const host = fakeHost(), ui = createHeliUi({host, app}), zone = createSkiView({loadModel: fakeModels});
    for (let i = 0; i < 30; i++) {
      const view = app.heliView(), pose = zone.pose(view, {cameraMode: i, dt: 0.1});
      zone.render({view, pose, seconds: i / 10, dt: 0.1});
      ui.update(i / 10);
      await new Promise(done => setTimeout(done, 0));
    }
    assert.equal(session.fingerprint(), skiing, 'drawing the run, its HUD and the panel changes nothing');
    assert.ok(host.made.some(node => node.className === 'ski-hud' && node.hidden === false), 'the run HUD shows');
    ui.dispose(); zone.dispose();
    // The keys: W skates off, then D turns right (the heading falls).
    app.keys = {KeyW: true};
    for (let i = 0; i < 60 * 3; i++) app._simulate(1 / 60);
    const off = session.view().ski.run.skier;
    assert.ok(off.speed > 1, `W pushed off (${off.speed.toFixed(2)} m/s)`);
    app.keys = {KeyD: true};
    for (let i = 0; i < 60 * 1; i++) app._simulate(1 / 60);
    assert.ok(session.view().ski.run.skier.edge > 10, 'D tips the skis to the right');
    assert.equal(app.heliSki('restart').ok, true, 'Start again');
    assert.equal(session.view().ski.run.t, 0, 'the run starts over');
    assert.equal(app.heliSki('leave').ok, true, 'Leave the run');
    assert.equal(session.phase, 'flying', 'the helicopter has the pilot back');
  } finally {
    app?.dispose();
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
    if (savedCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', savedCancel); else delete globalThis.cancelAnimationFrame;
  }
});

// A page stand-in: every element answers any selector with its own child stand-in.
function fakeHost() {
  const made = [];
  const node = () => {
    const kids = new Map();
    const element = {innerHTML: '', textContent: '', hidden: false, className: '', dataset: {}, style: {setProperty() {}, removeProperty() {}},
      querySelector(selector) { if (!kids.has(selector)) kids.set(selector, node()); return kids.get(selector); },
      querySelectorAll() { return []; }, addEventListener() {}, removeEventListener() {}, append() {}, prepend() {}, remove() {},
      setAttribute() {}, blur() {}, closest() { return null; }};
    made.push(element);
    return element;
  };
  const doc = {createElement: () => node(), getElementById: () => null, head: {append() {}}};
  return {ownerDocument: doc, append() {}, made};
}

// ---- a scripted pilot (from tools/test-ski-heli.mjs) ---------------------------------------------------------------
function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli, fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz), want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0, ex = wx - h.vx, ez = wz - h.vz;
  const c = v => Math.max(-1, Math.min(1, v));
  return {pitch: c((ex * fwdX + ez * fwdZ) * 0.25), roll: c((ex * rightX + ez * rightZ) * 0.25), lift: c(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function fly(session, seconds, controls, until) {
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    const events = session.step(controls(session.view()));
    if (events.some(e => e.type === 'crashed')) throw new Error('crashed');
    if (until(session.view())) return;
  }
  throw new Error('the flight took too long');
}
// Home pad to Summit Run by the cruise leg, then over the mountain and down onto the pad; the climb waits in place where
// the ground ahead is high.
function flyTo(session, ground, padName) {
  fly(session, 120, v => pilot(v, {x: v.heli.x - 300, z: v.heli.z + 300, y: 100}, {speed: 30, sink: 8}), v => v.cruiseOffered);
  assert.equal(session.acceptCruise(), true);
  fly(session, 10, () => ({lift: 0}), v => v.phase === 'flying' && v.courseId === 'summit-run');
  const summit = ground(), pad = SKI_PADS[padName];
  fly(session, 900, v => {
    const h = v.heli, d = Math.hypot(pad.x - h.x, pad.z - h.z) || 1, ux = (pad.x - h.x) / d, uz = (pad.z - h.z) / d;
    let top = -Infinity;
    for (let k = 0; k <= 16; k++) top = Math.max(top, summit.highest(h.x + ux * k * 25, h.z + uz * k * 25, 10));
    const y = d > 150 ? Math.min(top + 110, summit.height(h.x, h.z) + 285) : pad.y + 40;
    if (h.y < y - 12) return pilot(v, {x: h.x, z: h.z, y}, {speed: 1, sink: 8});
    return pilot(v, {x: pad.x, z: pad.z, y}, {speed: 18, sink: 8});
  }, v => Math.hypot(v.heli.x - pad.x, v.heli.z - pad.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 0.6);
  fly(session, 120, v => pilot(v, {x: pad.x, z: pad.z, y: pad.y - 2}, {speed: 2, sink: 2.5}), v => v.heli.onGround);
}
