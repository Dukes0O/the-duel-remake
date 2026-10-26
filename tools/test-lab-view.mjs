// LAB-VIEW: the Lab screen's rules and wiring that run without a browser (the screen itself is tools/scenarios/lab-view.mjs).
// The G-force lap monitor, the rust protection rules, the view-model (board, benches, readouts, shop), the Lab's own save calls
// through the app, the helicopter's pad menu, and the room's release on close.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {createGforceMonitor, stepGforceMonitor, gforceView, lateralGOf, GFORCE_LAP} from '../src/lab/lab-gforce.js';
import {createLabLap, leftRoad} from '../src/lab/lab-lap.js';
import {RUST_PARTS, PROTECTIONS, rustOf, rightProtection, checkProtections, RUST_OK} from '../src/lab/lab-workshop.js';
import {BENCH_OF, CHALLENGE_KIND, readoutRows, openBench, setControl, runBench, goalMet, challengeState, shopRows, choiceRows, boardRows,
  lineId, lineText, lineIdsOf, passIn, buyIn} from '../src/lab/lab-model.js';
import {LAB_LESSONS} from '../src/lab/lab-lessons.js';
import {LAB_LINES} from '../src/lab/lab-lines.js';
import {LAB_UPGRADES} from '../src/lab/lab-shop.js';
import {labOf} from '../src/lab/lab-save.js';
import {createProfile} from '../src/progression.js';
import {lightestArm} from '../src/lab/benches/strength.js';
import {boardMarkup, benchMarkup, shopMarkup, headerMarkup, gforceStripMarkup, optionLabel} from '../src/lab/lab-markup.js';
import {createLabScene, createSceneKeeper, labSceneStats, MODEL_OF_LESSON} from '../src/lab/lab-scene.js';
import {dispatchBoardMarkup, handleBoardAction} from '../src/heli/heli-board.js';
import {lessonsMarkup, challengeMarkup, challengeGoal, noticeText} from '../src/heli/heli-ui.js';
import {App} from '../src/app.js';
import {Group} from 'three';

const on = names => ({enabled: name => names.includes(name)});
const LAB_FLAGS = on(['lab', 'helicopter']);
const flown = profile => ({...profile, heli: {version: 1, fuelKg: 0, lessons: {liftoff: true, hover: true, landing: true, carry: true},
  playDay: {last: null, count: 0}, jobs: {day: 0, taken: null, done: []}, carsAt: {}, refuels: 0, flights: 0}});
const richProfile = () => flown({...createProfile(), credits: 20000, drivingLessons: {version: 1, done: {corner: true}}});

test('pendulum records all three lengths from DOM select strings', () => {
  let state = openBench('pendulum');
  for (const length of ['5', '15', '25']) {
    state = runBench(setControl(state, 'lengthM', length));
    assert.equal(state.result.lengthM, Number(length));
  }
  state = runBench(setControl(setControl(state, 'lengthM', '15'), 'weightKg', '200'));
  assert.equal(goalMet(state), true);
});

// ---- the G-force lap monitor ----

const corners = [{number: 1, entryS: 100, exitS: 200}, {number: 2, entryS: 400, exitS: 500}, {number: 3, entryS: 700, exitS: 800}, {number: 4, entryS: 900, exitS: 40}];
const drive = (monitor, from, to, {g = 0, offRoadAt = null} = {}) => {
  const events = [];
  // yaw rate chosen so the push is g: v * yaw / 9.81
  const speedMph = 90, yawVelocity = g * 9.81 / (speedMph * 0.44704);
  for (let s = from; s <= to; s += 2) events.push(...stepGforceMonitor(monitor, {s, speedMph, yawVelocity, offRoad: offRoadAt !== null && s >= offRoadAt}));
  return events;
};

test('the push is the bench\'s own v squared over r', () => {
  assert.ok(Math.abs(lateralGOf({speedMph: 80, yawVelocity: 0.7}) - 80 * 0.44704 * 0.7 / 9.81) < 1e-9);
  assert.equal(lateralGOf({speedMph: 0, yawVelocity: 1}), 0);
  assert.equal(lateralGOf({speedMph: 60, yawVelocity: 0}), 0);
  assert.equal(lateralGOf({speedMph: NaN, yawVelocity: 'x'}), 0);
});

test('2 g in three different corners on the road passes, and only then', () => {
  const m = createGforceMonitor({corners, length: 1000});
  const first = drive(m, 90, 260, {g: 2.2});
  assert.deepEqual(first.map(e => e.type), ['gforceCorner']);
  assert.equal(gforceView(m).count, 1);
  const second = drive(m, 260, 560, {g: 2.2});
  assert.equal(second.length, 1);
  assert.equal(gforceView(m).done, false, 'two corners are not enough');
  const third = drive(m, 560, 860, {g: 2.2});
  assert.deepEqual(third.map(e => e.type), ['gforceCorner', 'gforcePass']);
  assert.equal(gforceView(m).done, true);
  assert.deepEqual(stepGforceMonitor(m, {s: 950, speedMph: 90, yawVelocity: 1, offRoad: false}), [], 'a passed lap says nothing more');
});

test('one corner counts once however many laps; 1.9 g never counts; the same corner twice is one corner', () => {
  const m = createGforceMonitor({corners, length: 1000});
  drive(m, 90, 1000, {g: 1.9});
  assert.equal(gforceView(m).count, 0);
  drive(m, 90, 260, {g: 2.5}); drive(m, 90, 260, {g: 2.5});
  assert.equal(gforceView(m).count, 1);
});

test('leaving the road in a corner spoils that corner; the next one starts clean', () => {
  const m = createGforceMonitor({corners, length: 1000});
  const spoiled = drive(m, 90, 260, {g: 2.6, offRoadAt: 150});
  assert.deepEqual(spoiled, [], 'a corner left on the grass does not count');
  assert.equal(gforceView(m).count, 0);
  assert.equal(drive(m, 260, 560, {g: 2.6}).length, 1, 'the next corner counts');
  // Off the road after the push but before the corner ends still spoils it.
  const late = createGforceMonitor({corners, length: 1000});
  assert.deepEqual(drive(late, 90, 260, {g: 2.6, offRoadAt: 190}), []);
});

test('a corner across the start line counts, and the course distance may run past one lap', () => {
  const m = createGforceMonitor({corners, length: 1000});
  const events = [];
  for (let s = 880; s <= 1100; s += 2) events.push(...stepGforceMonitor(m, {s, speedMph: 90, yawVelocity: 2.3 * 9.81 / (90 * 0.44704), offRoad: false}));
  assert.deepEqual(events.map(e => e.number), [4]);
});

test('the lap controller arms, ignores other race states and ends with a passed race', () => {
  let passed = 0;
  const lap = createLabLap({onPass: () => { passed++; }});
  const course = {length: 1000, at: s => ({x: s, z: 0, heading: 0}), groundAt: () => ({y: 0})};
  const state = {status: 'racing', paused: false, s: 0, speedMph: 90, yawVelocity: 1, offRoad: false};
  assert.deepEqual(lap.step(state, course), [], 'unarmed: nothing happens');
  assert.equal(lap.view(), null);
  lap.arm();
  assert.equal(lap.waiting, true);
  lap.step({...state, status: 'countdown'}, course);
  assert.equal(lap.view(), null, 'not racing: no strip');
  lap.step(state, course);
  assert.ok(lap.view(), 'racing and armed: the strip has numbers');
  lap.step({...state, paused: true}, course);
  lap.disarm();
  assert.equal(lap.armed, false);
  assert.equal(passed, 0);
});

// ---- the race is the same armed or not ----

function raceFingerprint(armed, steps) {
  const app = new App();
  app.duel.seed = 1989; app.autopilot = true;
  app._switches = () => ({enabled: name => name === 'lab'});
  if (armed) app.labLap.arm();
  app.startCampaign({car: 'falcone_f42', difficulty: 'casual'});
  const hash = createHash('sha256');
  let peakG = 0;
  for (let i = 0; i < steps; i++) {
    app.advance(1 / 60, 1 / 60);
    const s = app.duel.state;
    hash.update([s.status, s.s, s.lateral, s.speedMph, s.yawVelocity, s.headingError, s.stageTimeSec, s.revs, s.offRoad].join('|') + '\n');
    const view = app.labLap.view();
    if (view) peakG = Math.max(peakG, view.g);
  }
  return {digest: hash.digest('hex'), peakG, final: app.duel.state.s};
}

test('a race\'s fingerprint is identical with the G-force lap armed and not armed', () => {
  const idle = raceFingerprint(false, 5400), armed = raceFingerprint(true, 5400);
  assert.equal(armed.digest, idle.digest);
  assert.equal(armed.final, idle.final);
  assert.ok(idle.final > 500, 'the race moved');
  assert.ok(armed.peakG > 0.3, `the monitor was watching (peak ${armed.peakG.toFixed(2)} g)`);
  assert.equal(idle.peakG, 0, 'unarmed, no view');
});

// ---- rust protection ----

test('the rust protection answer comes from the bench\'s own jars', () => {
  assert.deepEqual(RUST_PARTS.map(part => rightProtection(part.id)), ['zinc', 'bare', 'zinc']);
  for (const part of RUST_PARTS) {
    const right = rightProtection(part.id);
    assert.ok(rustOf(part.id, right) <= RUST_OK, `${part.id} stays clean with the right choice`);
    if (right === 'zinc') assert.ok(rustOf(part.id, 'bare') > RUST_OK, `${part.id} rusts bare`);
  }
  assert.equal(rustOf('nothing', 'bare'), null);
  assert.equal(rustOf('underbody', 'paint'), null);
});

test('checking the three choices: all right passes, one wrong does not, junk does not', () => {
  assert.equal(checkProtections({underbody: 'zinc', exhaust: 'bare', armour: 'zinc'}).passed, true);
  const wrong = checkProtections({underbody: 'zinc', exhaust: 'zinc', armour: 'zinc'});
  assert.equal(wrong.passed, false);
  assert.deepEqual(wrong.rows.filter(row => !row.ok).map(row => row.part), ['exhaust']);
  assert.equal(checkProtections({}).passed, false);
  assert.equal(checkProtections(null).passed, false);
  assert.equal(PROTECTIONS.length, 2);
});

// ---- the view-model ----

test('every lesson has a bench, a challenge kind and Brian\'s three lines', () => {
  for (const lesson of LAB_LESSONS) {
    assert.ok(BENCH_OF[lesson.id], `${lesson.id} has a bench`);
    assert.ok(CHALLENGE_KIND[lesson.id], `${lesson.id} has a challenge kind`);
    assert.equal(lineIdsOf(lesson.id).length, 3, `${lesson.id} has intro, explain and pass`);
    for (const step of ['intro', 'explain', 'pass']) assert.equal(lineText(lesson.id, step), LAB_LINES[lineId(lesson.id, step)].text, 'the caption is the line\'s text');
  }
  assert.equal(Object.keys(MODEL_OF_LESSON).length, LAB_LESSONS.length, 'every lesson has a bench in the room');
});

test('every bench runs from its default dials and reads out in words', () => {
  for (const lesson of LAB_LESSONS) {
    const state = runBench(openBench(lesson.id));
    const rows = readoutRows(lesson.id, state.result);
    assert.ok(rows.length >= 2, `${lesson.id} reads out`);
    for (const row of rows) assert.ok(!/NaN|undefined|Infinity/.test(`${row.label} ${row.value}`), `${lesson.id}: ${row.label} ${row.value}`);
  }
  assert.deepEqual(readoutRows('lift', null), []);
});

test('dials clamp and snap like the bench, and a run keeps what it ran', () => {
  let state = openBench('lift');
  state = setControl(state, 'cargoKg', '99999');
  state = setControl(state, 'nonsense', 3);
  state = runBench(state);
  assert.equal(state.settings.cargoKg, 3000);
  assert.equal(state.history.length, 1);
  assert.equal(goalMet(state), false);
  state = runBench(setControl(state, 'collective', '1'));
  assert.equal(goalMet(state), true, 'full collective with the heavy cargo meets the lift goal');
});

test('the challenge button: locked, waiting, ready and passed, by kind', () => {
  const profile = richProfile(), opts = (met, extra = {}) => ({profile, flags: LAB_FLAGS, met, helicopterOn: true, ...extra});
  assert.equal(challengeState('lift', opts(false)).state, 'waiting');
  assert.equal(challengeState('lift', opts(true)).state, 'ready');
  assert.equal(challengeState('lift', opts(true, {helicopterOn: false})).state, 'waiting');
  assert.equal(challengeState('grip', opts(true)).label, 'Opens with tuning');
  assert.equal(challengeState('grip', opts(true)).state, 'waiting', 'the wind-tunnel five never open from the Lab yet');
  assert.equal(challengeState('rust', opts(true)).kind, 'protect');
  assert.equal(challengeState('gforce', opts(true)).kind, 'lap');
  assert.equal(challengeState('wax', opts(true, {profile: richProfile()})).state, 'locked', 'snow opens with heli-skiing');
  assert.equal(challengeState('lift', {profile: createProfile(), flags: LAB_FLAGS, met: true, helicopterOn: true}).state, 'locked', 'flying opens after the helicopter lessons');
});

test('the board lists the four groups with the reason a shut lesson is shut', () => {
  const rows = boardRows(createProfile(), LAB_FLAGS);
  assert.equal(rows.length, 16);
  const html = boardMarkup({rows});
  for (const group of ['Flying', 'Workshop', 'Wind tunnel', 'Snow']) assert.ok(html.includes(`>${group}</li>`), group);
  assert.ok(html.includes('Finish the helicopter lessons first') || html.includes('Opens with the helicopter'));
  assert.ok(html.includes('data-lab-lesson="start:strength"'));
  assert.deepEqual(boardRows(createProfile(), on([])), [], 'the board is empty while the Lab is off');
  assert.ok(boardMarkup({rows: []}).includes('not open yet'));
});

test('the Lab\'s own save calls: pass, buy, price taken once, nothing else changes', () => {
  let profile = richProfile();
  const credits = profile.credits;
  const passed = passIn(profile, 'strength', LAB_FLAGS);
  assert.equal(passed.ok, true);
  profile = passed.profile;
  assert.equal(labOf(profile).done.strength, true);
  const rows = shopRows(profile, LAB_FLAGS);
  assert.equal(rows.find(row => row.id === 'heavy-hook').canBuy, true);
  assert.equal(rows.find(row => row.id === 'engine-1').canBuy, false, 'engines need the Lift lesson');
  assert.match(rows.find(row => row.id === 'engine-1').note, /Pass Lift and weight first/);
  const bought = buyIn(profile, 'heavy-hook', LAB_FLAGS);
  assert.equal(bought.ok, true);
  assert.equal(bought.profile.credits, credits - 2000);
  assert.equal(buyIn(bought.profile, 'heavy-hook', LAB_FLAGS).ok, false, 'owned means owned');
  assert.equal(shopRows(bought.profile, LAB_FLAGS).find(row => row.id === 'heavy-hook').owned, true);
  assert.equal(shopRows(createProfile(), LAB_FLAGS).some(row => row.id === 'speirling'), false, 'the Spéirling is never listed');
  assert.ok(shopRows(createProfile(), LAB_FLAGS).length >= LAB_UPGRADES.filter(u => u.lesson !== null && u.price > 0).length);
});

test('the shop markup shows price, Buy, owned marks and the ring and cable choices', () => {
  let profile = richProfile();
  for (const id of ['projectile', 'pendulum', 'strength']) profile = passIn(profile, id, LAB_FLAGS).profile;
  profile = buyIn(profile, 'long-cable', LAB_FLAGS).profile;
  const html = shopMarkup({rows: shopRows(profile, LAB_FLAGS), choices: choiceRows(profile), wallet: profile.credits});
  assert.ok(html.includes('data-lab-buy="heavy-hook"') && html.includes('1,500 CR'));
  assert.ok(html.includes('Owned'), 'owned marks');
  assert.ok(html.includes('data-lab-cable="25"') && html.includes('data-lab-cable="15"'), 'cable choice once Long cable is owned');
  assert.ok(html.includes('data-lab-ring="1"') && html.includes('data-lab-ring="0"'), 'the drop ring just earned');
  assert.ok(!html.includes('data-lab-ring="2"'), 'a ring not yet earned is not offered');
});

test('the bench markup carries dials, Run, the readout and the challenge note, escaped', () => {
  const state = runBench(openBench('launch'));
  const html = benchMarkup({lessonId: 'launch', name: 'Launch <angles>', controls: state.bench.controls, settings: state.settings,
    readout: readoutRows('launch', state.result), challenge: {state: 'waiting', label: 'Finish the experiment', note: 'Meet "the goal"', kind: 'bench'}, hasRun: true, explained: false});
  assert.ok(html.includes('data-lab-control="angleDeg"') && html.includes('data-lab="run"') && html.includes('Hear Brian'));
  assert.ok(html.includes('Launch &lt;angles&gt;') && html.includes('&quot;the goal&quot;'));
  assert.ok(html.includes('class="lab-challenge-button" data-lab="challenge" disabled'), 'the button waits for the goal');
  assert.ok(headerMarkup({credits: 1234567, tab: 'shop'}).includes('1,234,567'));
  assert.equal(optionLabel('falcone_f42'), 'Falcone F42');
  assert.equal(optionLabel('panorama-ridge'), 'panorama ridge');
});

test('the hook arm goal is a real arm and the strip words match its state', () => {
  const arm = lightestArm();
  let state = openBench('strength');
  for (const [id, value] of [['part', 'hook arm'], ['material', arm.material], ['thicknessMm', arm.thicknessMm]]) state = setControl(state, id, value);
  state = runBench(state);
  assert.equal(goalMet(state), true);
  assert.ok(gforceStripMarkup({g: 1.234, count: 2, need: GFORCE_LAP.corners, state: 'counting'}).includes('1.2 g'));
  assert.equal(gforceStripMarkup(null), '');
});

// ---- the app: the Lab's open flag, saves and the helicopter's door ----

function labApp() {
  const app = new App();
  app._switches = () => ({enabled: name => ['lab', 'helicopter', 'forest-fire'].includes(name)});
  app.profile = {...app.profile, ...richProfile(), unlockedCars: app.profile.unlockedCars};
  return app;
}

test('the Lab opens from the menu only, saves through labCommit, and closes', () => {
  const app = labApp();
  assert.equal(app.labAvailable(), true);
  assert.equal(app.openLab(), true);
  assert.equal(app.labOpen, true);
  assert.equal(app.openLab(), false, 'already open');
  const result = app.labCommit((profile, flags) => passIn(profile, 'strength', flags));
  assert.equal(result.ok, true);
  assert.equal(app.profile.lab.done.strength, true);
  assert.equal(app.closeLab(), true);
  assert.equal(app.labOpen, false);
  assert.equal(app.closeLab(), false);
  // With the Lab off, nothing opens and nothing saves.
  const off = new App();
  off._switches = () => ({enabled: () => false});
  assert.equal(off.openLab(), false);
  assert.equal(off.labCommit((p, f) => passIn(p, 'strength', f)).ok, false);
});

test('the helicopter\'s Lab choices reach the saved profile, on the pad and after leaving, and the door ends the visit', () => {
  const app = labApp();
  let lab = labOf(app.profile);
  app.profile = {...app.profile, lab: {...lab, owned: {...lab.owned, 'long-cable': true}}};
  assert.equal(app.visitHeli(), true);
  assert.equal(app.heliSession.lab.longCable, true);
  assert.equal(app.heliSession.chooseLine(25).ok, true);
  assert.equal(app.profile.lab.cable, 25, 'the choice is saved the moment it is made');
  assert.equal(app.labFromHeli(), true, 'the door leaves the helipad for the Lab');
  assert.equal(app.heliSession, null);
  assert.equal(app.duel.state.status, 'menu');
  assert.equal(app.labOpen, true);
  assert.equal(app.profile.lab.cable, 25, 'and kept after the visit ends');
  assert.equal(app.labFromHeli(), false, 'no visit, no door');
});

test('the pad menu: bucket loads, the line, the challenges, the door and the challenge line', () => {
  const app = labApp();
  app.profile = {...app.profile, lab: {...labOf(app.profile), done: {lift: true}, owned: {'long-cable': true, retardant: true}}};
  assert.equal(app.visitHeli(), true);
  const session = app.heliSession, view = app.heliView();
  const lab = {...session.lab, challenges: session.challengeBoard(), note: ''};
  const html = dispatchBoardMarkup(view, {lab});
  assert.ok(html.includes('data-heli-board="line:25"') && html.includes('data-heli-board="line:15"'));
  assert.ok(html.includes('data-heli-board="challenge:lift"') && html.includes('Lab challenges'));
  assert.ok(!html.includes('bucket-load:'), 'no bucket on the hook: no load buttons');
  assert.equal(handleBoardAction('challenge:lift', app).ok, false, 'the lift challenge needs a full tank: refused with a reason');
  assert.match(handleBoardAction('challenge:lift', app).reason, /tank/i);
  assert.equal(handleBoardAction('line:25', app).ok, true);
  assert.equal(handleBoardAction('challenge-stop', app), false);
  const door = lessonsMarkup(view, session.lessonBoard(), {lab: true});
  assert.ok(door.includes('data-heli-lab="door"'));
  assert.ok(!lessonsMarkup(view, session.lessonBoard(), {lab: false}).includes('data-heli-lab'));
  assert.equal(challengeMarkup(view), '', 'no challenge, no line');
  assert.match(challengeGoal({id: 'projectile', props: [{hit: true}, {hit: false}, {hit: false}]}), /1\/3/);
  assert.match(challengeGoal({id: 'headings', briefing: {headingDeg: 70, distanceM: 550}}), /heading 070/);
  assert.match(noticeText({type: 'challengePassed', challenge: 'fire'}), /Fire triangle/);
  app.returnToMenu();
});

// ---- the room is released when the Lab closes ----

function fakeWindow() {
  const listeners = new Map(), frames = new Set();
  let next = 1;
  return {
    listeners, frames,
    devicePixelRatio: 1,
    addEventListener(type, fn) { listeners.set(fn, type); },
    removeEventListener(type, fn) { listeners.delete(fn); },
    requestAnimationFrame(fn) { const id = next++; frames.add(id); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
}
function fakeHost(win) {
  const children = new Set();
  const doc = {defaultView: win, createElement: tag => ({tag, className: '', remove() { children.delete(this); }})};
  return {ownerDocument: doc, clientWidth: 640, clientHeight: 360, children, append(node) { children.add(node); }};
}

test('opening and closing the room twice leaves no renderer, canvas, listener or frame behind', async () => {
  const manifest = {models: [{id: 'hangar', dimensionsMetres: [30, 8, 20]}], layout: {}};
  const made = [];
  for (let visit = 0; visit < 2; visit++) {
    const win = fakeWindow(), host = fakeHost(win);
    const renderer = {size: null, disposed: 0, lost: 0, rendered: 0, setPixelRatio() {}, setSize(w, h) { this.size = [w, h]; },
      render() { this.rendered++; }, dispose() { this.disposed++; }, forceContextLoss() { this.lost++; }};
    const scene = createLabScene({host, manifest, createRenderer: () => renderer, load: async () => new Group()});
    assert.equal(labSceneStats().live, 1);
    assert.equal(host.children.size, 1, 'one canvas');
    assert.equal(win.listeners.size, 1, 'one resize listener');
    assert.equal(win.frames.size, 1, 'one frame requested');
    await scene.ready;
    scene.show('strength');
    scene.renderOnce(16);
    assert.ok(renderer.rendered >= 1);
    scene.dispose(); scene.dispose();
    made.push({renderer, win, host});
  }
  for (const {renderer, win, host} of made) {
    assert.equal(renderer.disposed, 1); assert.equal(renderer.lost, 1);
    assert.equal(host.children.size, 0, 'the canvas is gone');
    assert.equal(win.listeners.size, 0, 'the listener is gone');
    assert.equal(win.frames.size, 0, 'no frame is waiting');
  }
  assert.equal(labSceneStats().live, 0);
});

test('a scene closed while its models are still loading frees them when they arrive', async () => {
  const win = fakeWindow(), host = fakeHost(win);
  let finish;
  const late = new Promise(resolve => { finish = resolve; });
  const renderer = {setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, forceContextLoss() {}};
  const scene = createLabScene({host, manifest: {models: [], layout: {}}, createRenderer: () => renderer, load: () => late.then(() => new Group())});
  scene.dispose();
  finish();
  await scene.ready;
  assert.equal(labSceneStats().live, 0);
});

test('opening every ordinary bench keeps the entry camera instead of gliding', async () => {
  const win = fakeWindow(), host = fakeHost(win);
  const renderer = {setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, forceContextLoss() {}};
  const scene = createLabScene({host, manifest: {models: [], layout: {}}, createRenderer: () => renderer, load: async () => new Group()});
  await scene.ready;
  const position = scene.camera().position;
  assert.equal(position[1], 1.6);
  for (const id of Object.keys(MODEL_OF_LESSON)) {
    scene.show(id); scene.renderOnce(16);
    assert.deepEqual(scene.camera().position, position, id + ': no old bench glide');
    assert.deepEqual(scene.camera().goal, position);
  }
  scene.dispose();
});

// ---- faults found in review ----

test('the Lab is open only on the menu: starting a race or a flight closes it for good', () => {
  const app = labApp();
  assert.equal(app.openLab(), true);
  app.startCampaign({car: 'falcone_f42', difficulty: 'casual'});
  assert.equal(app.labOpen, false, 'a race is not the menu');
  app.returnToMenu();
  assert.equal(app.labOpen, false, 'and the Lab does not pop open again');
  assert.equal(app.openLab(), true);
  app.closeLab();
  assert.equal(app.visitHeli(), true);
  assert.equal(app.labOpen, false);
  app.returnToMenu();
});

test('on the off-road courses the lap measures the road, not the race\'s always-on off-road flag', () => {
  const course = {roadHalfWidthAt: () => 9};
  assert.equal(leftRoad({offRoad: true, lateral: 2, s: 10}, course), false, 'in the middle of the road');
  assert.equal(leftRoad({offRoad: true, lateral: -12, s: 10}, course), true, 'past the edge');
  assert.equal(leftRoad({offRoad: false, lateral: 30, s: 10}, course), false, 'the race says it is on the road');
  const lap = createLabLap();
  lap.arm();
  const state = {status: 'racing', paused: false, s: 0, speedMph: 90, yawVelocity: 0.9, offRoad: true, lateral: 1, headingError: 0};
  const flat = {length: 1000, roadHalfWidthAt: () => 9, at: s => ({x: s * Math.cos(s / 80), z: s * Math.sin(s / 80), heading: s / 80}), groundAt: () => ({y: 0})};
  const states = [];
  for (let s = 0; s < 1000; s += 2) { state.s = s; lap.step(state, flat); states.push(lap.view()?.state); }
  assert.ok(!states.includes('off the road'), 'a car in the middle of an off-road course is never off the road');
});

test('a spin does not count as a corner, and a refused save is shown, not hidden', () => {
  const m = createGforceMonitor({corners, length: 1000});
  for (let s = 90; s <= 260; s += 2) stepGforceMonitor(m, {s, speedMph: 90, yawVelocity: 2.6 * 9.81 / (90 * 0.44704), offRoad: false, sliding: true});
  assert.equal(gforceView(m).count, 0, 'a sliding car\'s yaw spike is not cornering');
  // A course with three bends of 100 m radius, driven at 2.4 g; the save is refused.
  const heading = s => [[200, 300], [500, 600], [800, 900]].reduce((sum, [from, to]) => sum + Math.max(0, Math.min(1, (s - from) / (to - from))), 0) * 1.1;
  const path = [];
  for (let i = 0, x = 0, z = 0; i <= 1000; i++) { path.push({x, z, heading: heading(i)}); x += Math.sin(heading(i)); z += Math.cos(heading(i)); }
  const course = {length: 1000, roadHalfWidthAt: () => 9, at: s => path[Math.max(0, Math.min(1000, Math.round(s)))], groundAt: () => ({y: 0})};
  let asked = 0;
  const lap = createLabLap({onPass: () => { asked++; return {ok: false, reason: 'Opens after driving lesson 1'}; }});
  lap.arm();
  const race = {status: 'racing', paused: false, s: 0, speedMph: 90, yawVelocity: 2.4 * 9.81 / (90 * 0.44704), offRoad: false, lateral: 0, headingError: 0};
  let view = null;
  for (let step = 0; step < 1000; step++) { race.s = step; lap.step(race, course); view = lap.view() ?? view; }
  assert.equal(asked, 1, 'the pass was asked for once');
  assert.equal(view.state, 'passed');
  assert.equal(view.saveNote, 'Opens after driving lesson 1');
  assert.ok(gforceStripMarkup(view).includes('not saved'));
});

test('the room keeper: a late or failed start never leaves a room, a canvas or a stale plain screen', async () => {
  const stage = fakeHost(fakeWindow());
  const made = [];
  const factory = ({host}) => { const room = {disposed: 0, dispose() { this.disposed++; }, show() {}}; made.push(room); return room; };
  const manifest = {models: [], layout: {}};
  // Closed while the manifest loads: nothing is built.
  let release;
  const slow = new Promise(resolve => { release = resolve; });
  let keeper = createSceneKeeper({stage, loadManifest: () => slow, sceneFactory: factory});
  const started = keeper.start();
  keeper.stop();
  release(manifest);
  await started;
  assert.equal(made.length, 0);
  // Open, close and open again with the first load failing late: the second room survives.
  let rejectFirst, plain = 0;
  const first = new Promise((_, reject) => { rejectFirst = reject; });
  let calls = 0;
  keeper = createSceneKeeper({stage, loadManifest: () => (calls++ === 0 ? first : Promise.resolve(manifest)), sceneFactory: factory, onPlain: () => { plain++; }});
  const one = keeper.start();
  keeper.stop();
  const two = keeper.start();
  await two;
  assert.equal(made.length, 1);
  rejectFirst(new Error('late'));
  await one;
  assert.equal(plain, 0, 'the old start\'s failure is ignored');
  assert.ok(keeper.scene, 'the second room is still the room');
  keeper.stop();
  assert.equal(made[0].disposed, 1);
  assert.equal(keeper.scene, null);
  // A factory that throws (no 3D) leaves the screen plain.
  keeper = createSceneKeeper({stage, loadManifest: async () => manifest, sceneFactory: () => { throw new Error('no webgl'); }, onPlain: () => { plain++; }});
  await keeper.start();
  assert.equal(plain, 1);
});

test('a machine with no 3D leaves no canvas behind', () => {
  const win = fakeWindow(), host = fakeHost(win);
  assert.throws(() => createLabScene({host, manifest: {models: [], layout: {}}, createRenderer: () => { throw new Error('no webgl'); }}), /no webgl/);
  assert.equal(host.children.size, 0);
  assert.equal(win.listeners.size, 0);
});

test('a course with fewer than three corners says so on the strip instead of waiting for a pass that cannot come', () => {
  const m = createGforceMonitor({corners: corners.slice(0, 1), length: 1000});
  const view = gforceView(m);
  assert.equal(view.corners, 1);
  assert.match(gforceStripMarkup(view), /only 1 corner: choose another course/);
  assert.ok(!/choose another/.test(gforceStripMarkup(gforceView(createGforceMonitor({corners, length: 1000})))));
});
