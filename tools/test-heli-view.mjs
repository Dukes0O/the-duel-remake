import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {COURSE} from '../src/config.js';
import {createResultsScreen} from '../src/screen-results.js';
// HELI-VIEW: Kestrel One's instruments agree with the simulation, the
// notices and radio subtitles, the route buttons and the pump, and the four
// camera views (docs/HELICOPTER.md sections 8 and 11).
import assert from 'node:assert/strict';
import {createHeliState, heliReadout, stepHeli} from '../src/heli/heli-flight.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {instrumentReadings, instrumentsMarkup, controlsMarkup, noticeText, pumpLabel, lessonsMarkup, holdShare, landedArrival, arrivalMarkup} from '../src/heli/heli-ui.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {buyFuel} from '../src/heli/heli-save.js';
import {heliCameraPose, HELI_CAMERA_VIEWS, PILOT_EYE, heliToWorld} from '../src/heli/heli-camera.js';
import {createHeliView, KESTREL_MODEL_URL} from '../src/heli/heli-scene.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFileSync} from 'node:fs';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };

// HELI-LANDED: no automatic exit; a settled arrival offers deliberate menu actions.
{
  const landed = {phase: 'flying', courseId: 'tremblant-snow', zone: {x: 0, z: 0, radius: 12},
    heli: {x: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true}, loads: []};
  ok(arrivalMarkup(landed).includes('LANDED AT TREMBLANT SNOW'), 'landed place named');
  ok(arrivalMarkup(landed).includes('Nothing waiting here today'), 'quiet arrival explained');
  for (const patch of [{heli: {...landed.heli, onGround: false}}, {heli: {...landed.heli, vx: 2}},
    {heli: {...landed.heli, x: 13}}, {phase: 'cruise'}, {lesson: {}}, {challenge: {}}, {job: {}},
    {rescue: {active: {}}}, {fire: {cells: 1}}, {ski: {flight: {}}}, {ski: {run: {}}}, {survey: {taken: true}}])
    eq(arrivalMarkup({...landed, ...patch}), '', 'flying, outside the zone or busy: no arrival');
  ok(arrivalMarkup({...landed, rescue: {call: {}}}).includes('Shut down'), 'unanswered call does not force a job');
  ok(arrivalMarkup(landed, [{from: 'tremblant-snow', title: 'Snow delivery'},
    {from: 'panorama-ridge', title: 'Other delivery'}]).includes('Jobs here: Snow delivery'), 'existing local dispatch used');
  const own = {...landed, loads: [{id: 'falcone_f42', own: true, onGround: true, hooked: false}]};
  eq(landedArrival(own).carId, 'falcone_f42', 'own parked car chosen');
  eq(landedArrival({...own, loads: [{...own.loads[0], hooked: true}]}).carId, null, 'hooked car is not parked');
  eq(landedArrival({...own, loads: [{...own.loads[0], hooked: true}]}, {heli: {carsAt: {falcone_f42: 'tremblant-snow'}}}).carId, null, 'saved position cannot resurrect a hooked car');
  ok(arrivalMarkup(own).includes('parked here'), 'parked car described');
  // The actual menu exit and session fuel storage, using memory only.
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map(), storage = {getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  try {
    for (const action of ['race', 'shutdown']) {
      const app = new App();
      app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter: true}, qa: true}), () => app.duel.state);
      app.profile.credits = 1000000; app._saveProfile();
      app.purchaseCourse('tremblant-snow');
      app.profile = {...app.profile, heli: {...app.profile.heli, version: 1, fuelKg: 123.4, carsAt: {falcone_f42: 'tremblant-snow'}}};
      app._saveProfile();
      app.menuCar = 'viper_proto';
      ok(app.visitHeli(), 'real visit opens');
      app.heliSession.start('tremblant-snow');
      eq(landedArrival(app.heliView(), app.profile).carId, 'falcone_f42', 'saved parked car found even when another car was selected');
      const beforeCourse = app.menuStage;
      ok(app.heliLanded(action), 'landed action accepted');
      eq(app.duel.state.status, 'menu', 'opens menu without starting race');
      eq(app.heliSession, null, 'flight ended');
      eq(app.profile.heli.fuelKg, 123.4, 'remaining fuel kept');
      if (action === 'race') {
        eq(COURSE[app.menuStage].id, 'tremblant-snow', 'arrival course selected');
        eq(app.menuCar, 'falcone_f42', 'parked car selected');
      } else eq(app.menuStage, beforeCourse, 'shut down leaves menu choice alone');
    }
    const locked = new App();
    locked.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter: true}, qa: true}), () => locked.duel.state);
    locked.profile.courses = {version: 1, unlocked: []}; locked._saveProfile();
    locked.visitHeli(); locked.heliSession.start('tremblant-snow');
    ok(arrivalMarkup(locked.heliView(), [], locked.profile).includes('Unlock this course'), 'locked destination explains Race here is unavailable');
    ok(!locked.heliLanded('race') && locked.heliSession, 'locked course never exits into a different course');
    locked.returnToMenu();
    const app = new App();
    app.duel.state.status = 'heli'; app.duel.state.paused = true;
    const screen = createResultsScreen({app, profile: () => app.profile, credits: String, escapeHTML: String, time: String, arrow: ''});
    const html = screen(app.duel.state);
    ok(html.includes('W / S: Collective') && html.includes('P: Autopilot'), 'pause uses helicopter help');
    ok(!html.includes('ARROWS TO DRIVE') && !html.includes('SPACE TO BOOST'), 'no car footer during flight');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
  }
}

// The instruments read the simulation's own numbers.
{
  const ground = flatGround(0);
  const state = createHeliState({ground, altitudeOffset: 250});
  for (let i = 0; i < 120 * 4; i++) stepHeli(state, {lift: 1, pitch: 0.4, yaw: 0.3}, {ground});
  const readout = heliReadout(state, {loadKg: 1300});
  const r = instrumentReadings(readout);
  eq(r.altitude, `${readout.altitudeFt.toFixed(0)} ft`, 'altitude in feet');
  eq(r.altitudeM, `${readout.altitudeM.toFixed(0)} m`, 'altitude in metres too');
  eq(r.height, `${readout.heightFt.toFixed(0)} ft`, 'height above the ground');
  eq(r.airspeed, `${readout.airspeedKts.toFixed(0)} kt`, 'airspeed in knots');
  eq(r.climb, `${readout.climbFpm >= 5 ? '+' : ''}${Math.round(readout.climbFpm / 10) * 10} ft/min`, 'climb rate');
  eq(r.rotor, `${readout.rotorPct.toFixed(0)}%`, 'rotor speed');
  eq(r.fuel, `${readout.fuelKg.toFixed(0)} kg`, 'fuel');
  eq(r.fuelTime, `${readout.fuelMinutes.toFixed(0)} min left`, 'minutes of fuel left');
  eq(r.weight, `${readout.weightKg.toFixed(0)} kg`, 'weight with the car');
  eq(r.maxLift, `${readout.maxLiftKg.toFixed(0)} kg`, 'most liftable here');
  eq(Number(r.heading), Math.round(readout.headingDeg) % 360, 'compass heading');
  ok(r.pitch === readout.pitchDeg && r.roll === readout.rollDeg, 'the horizon uses the real attitude');
  const html = instrumentsMarkup({readout, autopilot: true}, {cameraIndex: 2});
  for (const text of [r.altitude, r.height, r.airspeed, r.rotor, r.fuel, r.weight, 'AUTOPILOT ON', 'VIEW CABLE'])
    ok(html.includes(text), `the panel shows ${text}`);
  ok(instrumentReadings({...readout, fuelKg: 50}).lowFuel, 'low fuel shows at 15%');
  ok(instrumentReadings({...readout, rotorPct: 85, engine: false}).lowRotor, 'low rotor with the engine out');
  ok(!instrumentReadings({...readout, rotorPct: 40, engine: false, heightM: 0}).lowRotor, 'no low rotor warning parked on the ground');
  ok(!instrumentReadings({...readout, rotorPct: 85, engine: true}).lowRotor, 'no low rotor while it spins up');
  ok(instrumentReadings({...readout, weightKg: readout.maxLiftKg + 1}).heavy, 'too heavy to hover here');
  ok(instrumentReadings({...readout, fuelMinutes: Infinity}).fuelTime === 'engine off', 'engine off');
  const nose = instrumentsMarkup({readout: {...readout, pitchDeg: 10, rollDeg: 15}});
  ok(nose.includes('rotate(-15.0deg) translateY(-20.0px)'), 'nose down lifts the horizon; a right bank turns it the other way');
  eq(instrumentsMarkup({readout: null}), '', 'no readout, no panel');
}

// Notices and the route panel.
{
  eq(noticeText({type: 'charged', kind: 'hardLanding', charged: 150, forgiven: 0}), 'Hard landing: 150 credits', 'repair notice');
  eq(noticeText({type: 'charged', kind: 'fuelTruck', charged: 40, forgiven: 860}), 'Fuel truck: 40 credits (860 forgiven)', 'forgiven part shown');
  eq(noticeText({type: 'fuelBought', kg: 400, cost: 0}), 'Fuel: 400.0 kg, the first tank is free', 'free tank notice');
  eq(noticeText({type: 'cruiseRefused', needKg: 120}), 'Not enough fuel for that leg: it needs 120 kg', 'cruise refused');
  eq(noticeText({type: 'delivered', courseId: 'panorama-ridge'}), 'Delivered to Panorama Ridge', 'delivered');
  eq(noticeText({type: 'touchdown'}), null, 'quiet events say nothing');
  const zone = {x: 0, z: 0, y: 10, radius: 12};
  const onPad = {heli: {x: 1, z: 1, y: 10, onGround: true, fuelKg: 300}, zone, courseId: 'tremblant-woods', destination: 'tremblant-snow', cruiseOffered: true};
  const html = controlsMarkup(onPad, {credits: 1000, refuels: 2});
  ok(html.includes('Tremblant Woods (here)') && html.includes('Tremblant Snow · 25 kg') && html.includes('Panorama Ridge · 120 kg'), 'routes with leg fuel');
  ok(html.includes('data-heli-destination="tremblant-snow" aria-pressed="true"'), 'the chosen destination is marked');
  ok(html.includes('FILL UP · 150 CR'), 'the pump prices 100 kg at 1.5 credits a kg');
  ok(html.includes('ENTER') && html.includes('cruise to Tremblant Snow'), 'the cruise prompt');
  ok(controlsMarkup(onPad, {credits: 1000, refuels: 0}).includes('FREE FIRST TANK'), 'the first tank is free');
  ok(controlsMarkup({...onPad, heli: {...onPad.heli, fuelKg: 400}}, {credits: 1000, refuels: 2}).includes('TANK FULL'), 'full tank');
  ok(!controlsMarkup({...onPad, heli: {...onPad.heli, onGround: false}}, {}).includes('FILL UP'), 'no pump in the air');
  ok(!controlsMarkup({...onPad, courseId: 'tremblant-snow'}, {}).includes('FILL UP'), 'the pump is at the home pad only');
}

// The pump's label promises exactly what buyFuel then does.
for (const [fuelKg, credits, refuels] of [[300, 1000, 2], [300.64, 1000, 2], [123.46, 1000, 1], [300, 40, 2], [300, 1, 2], [300, 0, 2], [0, 0, 0], [399.95, 500, 3], [123.4, 77, 1]]) {
  const label = pumpLabel(fuelKg, {credits, refuels});
  const profile = normalizeProfile({...createProfile(), credits, heli: {version: 1, fuelKg, refuels}});
  const result = buyFuel(profile, Infinity, {enabled: true});
  if (label.disabled) ok(!result.ok, `${label.text}: the pump refuses (${fuelKg} kg, ${credits} credits)`);
  else {
    ok(result.ok, `${label.text}: the pump sells`);
    const cost = /(\d+) CR/.exec(label.text)?.[1];
    eq(cost === undefined ? 0 : Number(cost), result.cost, `${label.text}: the price shown is the price charged`);
    const kg = /BUY ([\d.]+) KG/.exec(label.text)?.[1];
    if (kg) eq(Number(kg), result.kg, `${label.text}: the amount shown is the amount sold`);
  }
}

// The instructor's panel: on the pad, the lessons with their state and the
// opening's skip; during a lesson, its goal and the hold bar.
{
  const zone = {x: 0, z: 0, y: 10, radius: 12};
  const pad = {phase: 'flying', courseId: 'tremblant-woods', zone, heli: {x: 0, z: 0, y: 10, onGround: true}};
  const fresh = [{id: 'liftoff', open: true, done: false}, {id: 'hover', open: false, done: false},
    {id: 'landing', open: false, done: false}, {id: 'carry', open: false, done: false}];
  const html = lessonsMarkup(pad, fresh, {opening: true});
  ok(html.includes('INSTRUCTOR') && html.includes('data-heli-lesson="start:liftoff"'), 'lesson 1 can start');
  ok(!html.includes('start:hover') && html.includes('Opens later'), 'lesson 2 waits');
  ok(html.includes('data-heli-lesson="skip"'), 'the opening can be skipped');
  const later = lessonsMarkup(pad, fresh.map(item => ({...item, open: true, done: item.id !== 'carry'})));
  ok(later.includes('Retake') && !later.includes('skip'), 'finished lessons can be retaken; no skip once begun');
  eq(lessonsMarkup({...pad, heli: {...pad.heli, onGround: false}}, fresh), '', 'no board in the air');
  const running = lessonsMarkup({...pad, lesson: {id: 'hover', held: 5}}, fresh);
  ok(running.includes('LESSON 2 HOVER') && running.includes('heli-lesson-hold') && running.includes('data-heli-lesson="stop"'), 'a running lesson shows its goal, its bar and Stop');
  eq(running, lessonsMarkup({...pad, lesson: {id: 'hover', held: 7}}, fresh), 'the panel does not change as the bar moves (no rebuild under the mouse)');
  eq(holdShare({lesson: {id: 'hover', held: 5}}), 0.5, 'the bar is half full at 5 of 10 seconds');
  eq(holdShare({lesson: {id: 'landing', held: 3}}), 0, 'no bar for the landing');
  eq(noticeText({type: 'lessonPassed', lesson: 'carry'}), 'Lesson passed: 4 Carry and set down', 'passed notice');
}

// The four camera views.
{
  const view = {heli: {x: 0, y: 40, z: 0, heading: 0, pitch: 0, roll: 0}, load: {x: 0, y: 24, z: 0, hooked: true}};
  eq(HELI_CAMERA_VIEWS.join(','), 'behind,cockpit,cable,side', 'four views');
  const behind = heliCameraPose(view, 0), cockpit = heliCameraPose(view, 1), cable = heliCameraPose(view, 2), side = heliCameraPose(view, 3);
  ok(behind.position.z < -20 && behind.position.y > view.heli.y, 'behind and above, far enough to see the car swing');
  ok(Math.abs(cockpit.position.z - 1.1) < 1e-9 && cockpit.target.z > 30, 'the cockpit looks ahead from the pilot seat');
  ok(cable.target.y < view.load.y && Math.abs(cable.position.y - view.heli.y) < 1, 'down the cable from the hook');
  ok(Math.abs(side.position.x) === 30 && side.target.y === (view.heli.y + view.load.y) / 2, 'side view frames helicopter and car');
  eq(heliCameraPose(view, 4).name, 'behind', 'C wraps round');
}

// Kestrel One's model (the HELI-ART-SRC contract) and the scene that draws it.
{
  const bytes = readFileSync(new URL('../public' + KESTREL_MODEL_URL, import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const node = name => gltf.nodes.find(item => item.name === name);
  for (const name of ['body', 'main_rotor', 'tail_rotor', 'skids', 'instrument_panel', 'cable_hook', 'pilot_eye'])
    ok(node(name), `the model has its ${name} node`);
  assert.deepEqual(node('pilot_eye').translation.map(v => Math.round(v * 100) / 100), [PILOT_EYE.x, PILOT_EYE.y, PILOT_EYE.z], 'the cockpit view sits at pilot_eye'); checks++;
  ok(Math.abs(node('main_rotor').translation[1] - 2.85) < 0.01, 'the rotor turns about the mast top, 2.85 m up');
  const triangles = gltf.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, p) => n + gltf.accessors[p.indices].count / 3, 0), 0);
  ok(triangles <= 20000, `at most 20,000 triangles (${triangles})`);
  ok(!(gltf.images?.length) || gltf.images.length <= 4, 'few or no textures');
  const parse = () => new Promise((resolve, reject) =>
    new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', gltf => resolve(gltf.scene), reject));
  const scene = new THREE.Scene();
  const view = createHeliView({THREE, scene, vehicleAssets: {status: () => 'error', load: () => Promise.resolve(false), create: () => null}, load: parse});
  eq(view.modelStatus, 'idle', 'nothing is downloaded before the first helicopter frame');
  view.update({heli: {x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0, rotor: 0, groundY: 0}, loads: []});
  eq(view.modelStatus, 'loading', 'the first helicopter frame starts the download');
  await new Promise(resolve => setTimeout(resolve, 50));
  for (let i = 0; i < 20 && view.modelStatus === 'loading'; i++) await new Promise(resolve => setTimeout(resolve, 50));
  eq(view.modelStatus, 'ready', `the model loads with its named nodes ${view.modelError}`);
  const heli = {x: 10, y: 30, z: 5, heading: 0.5, pitch: 0.2, roll: -0.3, rotor: 1, groundY: 0};
  const pose = view.update({heli, loads: [], zone: null}, {dt: 1 / 60});
  const rotor = scene.getObjectByName('main_rotor'), tail = scene.getObjectByName('tail_rotor');
  ok(rotor.rotation.y !== 0 && tail.rotation.x !== 0, 'main and tail rotors spin');
  const top = scene.getObjectByName('Helicopter').children.find(child => child.isLine).geometry.attributes.position;
  const hookAt = scene.getObjectByName('cable_hook').getWorldPosition(new THREE.Vector3());
  ok(Math.hypot(top.getX(0) - hookAt.x, top.getY(0) - hookAt.y, top.getZ(0) - hookAt.z) < 1e-4, 'the cable starts at cable_hook, banked and pitched');
  // The cockpit eye turns with the helicopter exactly as the model does.
  const eyeAt = scene.getObjectByName('pilot_eye').getWorldPosition(new THREE.Vector3());
  const eye = heliCameraPose({heli, load: null}, 1).position;
  ok(Math.hypot(eye.x - eyeAt.x, eye.y - eyeAt.y, eye.z - eyeAt.z) < 1e-4, 'the cockpit camera sits at pilot_eye in a bank and a flare');
  const spin = rotor.rotation.y;
  view.update({heli, loads: [], zone: null}, {dt: 1 / 60});
  ok(rotor.rotation.y > spin, 'the rotor keeps turning');
  ok(pose.camera && !scene.getObjectByName('Kestrel One (stand-in)'), 'no stand-in in the scene');
  const target = {x: 20, y: 2, z: 30, radius: 10,
    surface: Array.from({length: 130}, (_, i) => Math.cos((i % 65) * Math.PI / 32))};
  view.update({heli, loads: [], lesson: {id: 'carry', target, guidance: {ready: true}}});
  const painted = view.group.getObjectByName('Carry target');
  eq(painted.material.color.getHex(), 0x3ddc5a, 'the ready target turns green');
  const vertices = painted.geometry.attributes.position;
  ok(vertices.count === 130 && painted.geometry.parameters.outerRadius === 10, 'a full 64-segment circle uses the 10 m pass radius');
  painted.updateWorldMatrix(true, false);
  for (let i = 0; i < vertices.count; i++) {
    const world = painted.localToWorld(new THREE.Vector3().fromBufferAttribute(vertices, i));
    ok(Math.abs(world.y - (target.y + .15 + target.surface[i])) < 1e-6, 'paint follows terrain at every world-space vertex');
  }
  view.update({heli, loads: [], lesson: {id: 'carry', target, guidance: {ready: false}}});
  eq(painted.material.color.getHex(), 0xffcf3f, 'target returns to yellow when the crate is not ready');
  const failing = createHeliView({THREE, scene: new THREE.Scene(), vehicleAssets: {status: () => 'error'}, load: () => Promise.reject(new Error('missing file'))});
  const warn = console.warn; console.warn = () => {};
  failing.update({heli, loads: []});
  await new Promise(resolve => setTimeout(resolve, 10));
  console.warn = warn;
  ok(failing.update({heli, loads: []}) !== undefined && !failing.group.visible, 'after a failed load nothing hangs in the air');
  ok(failing.modelStatus === 'error' && /missing file/.test(failing.modelError), 'a failed load is reported, never replaced with a stand-in');
  view.dispose();
}

console.log(`test-heli-view: ${checks} checks passed`);
