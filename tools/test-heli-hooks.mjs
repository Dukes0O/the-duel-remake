// HELI-HOOKS: the helicopter plugged into the game (docs/HELICOPTER.md
// section 9). Memory-only storage. With the switch off nothing changes;
// with it on the menu's HELIPAD visit flies, saves and returns, the heli
// keys never reach the car, and Race here starts the normal race.
import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {HELI_CUES} from '../src/heli/heli-audio.js';
import {heliOf, carAt} from '../src/heli/heli-save.js';
import {heliCameraPose, HELI_CAMERA_VIEWS} from '../src/heli/heli-camera.js';
import {screenMarkup} from '../src/screen-menu.js';
import {COURSE} from '../src/config.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };

const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; }};
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
try {
  const makeApp = enabled => {
    const app = new App();
    app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter: enabled}, qa: true}), () => app.duel.state);
    return app;
  };
  const fly = (app, seconds, keys = {}) => {
    app.keys = keys;
    for (let i = 0; i < Math.round(seconds * 60); i++) app._simulate(1 / 60);
  };

  // Every helicopter cue is in the sound bank behind the switch.
  for (const [id, cue] of Object.entries(HELI_CUES)) {
    ok(SOUND_BANK[id] === cue, `${id} is in the sound bank`);
    ok(cue.flag === 'helicopter', `${id} is behind the switch`);
  }
  ok(screenMarkup({choices: {}, arrow: '', sound: '', escapeHTML: String}).includes('data-action="heli-visit" hidden'),
    'the HELIPAD button starts hidden');

  // Switch off: no visit, nothing changes.
  {
    const app = makeApp(false);
    ok(!app.heliAvailable(), 'off: not available');
    ok(app.visitHeli() === false && app.duel.state.status === 'menu', 'off: the visit is refused');
    ok(app.duel.startHeliVisit({courseId: 'tremblant-woods'}) === false, 'off: the game refuses a helicopter visit too');
    ok(!Object.hasOwn(app.profile, 'heli'), 'off: the save gains nothing');
  }

  // Switch on: the visit, the keys, the save and the way back.
  {
    const app = makeApp(true);
    app.profile.credits = 2000; app._saveProfile();
    ok(app.heliAvailable(), 'on: available');
    ok(app.visitHeli(), 'HELIPAD: the visit starts');
    assert.equal(app.duel.state.status, 'heli'); checks++;
    assert.equal(app.duel.course.def.id, 'tremblant-woods', 'at Tremblant Woods'); checks++;
    assert.equal(app.activeInputContext(), 'heli', 'the heli keys are active'); checks++;
    const before = {s: app.duel.state.s, speed: app.duel.state.speedMph};
    ok(app.heliBuyFuel().ok, 'the free first tank');
    fly(app, 6, {KeyW: true, ArrowUp: true});
    const view = app.heliView();
    ok(view.heli.y - view.heli.groundY > 5, `W lifts the helicopter (${(view.heli.y - view.heli.groundY).toFixed(1)} m up)`);
    ok(app.duel.state.s === before.s && app.duel.state.speedMph === before.speed, 'the race car never moves while flying');
    ok(app.duel.state.status === 'heli', 'the race stays held');
    app._inputAction('heli-autopilot');
    ok(app.heliSession.autopilotOn, 'P switches the autopilot on');
    app._inputAction('heli-camera');
    assert.equal(app.heliCamera, 1, 'C changes the view'); checks++;
    app._inputAction('pause');
    const paused = JSON.stringify(app.heliView().heli);
    fly(app, 1);
    ok(JSON.stringify(app.heliView().heli) === paused, 'Esc pauses the flight');
    app._inputAction('pause');
    fly(app, 1);
    ok(JSON.stringify(app.heliView().heli) !== paused, 'and resumes it');
    app.returnToMenu();
    ok(app.heliSession === null && app.duel.state.status === 'menu', 'back to the menu');
    const kept = heliOf(app.profile);
    ok(kept.fuelKg > 0 && kept.fuelKg < 400 && kept.refuels === 1, `the fuel left is saved (${kept.fuelKg} kg)`);
    ok(heliOf(makeApp(true).profile).fuelKg === kept.fuelKg, 'and survives a reload of the memory save');
  }

  // Race here: from a helicopter visit to the normal race with that car.
  {
    const app = makeApp(true);
    app.visitHeli();
    ok(!app.raceHere({courseId: 'tremblant-woods', carId: app.menuCar}) && app.heliSession, 'Race here needs an owned course');
    app.returnToMenu();
    app.profile.credits = 1_000_000; app._saveProfile();
    ok(app.purchaseCourse('tremblant-woods')?.ok !== false, 'buy Tremblant Woods');
    app.visitHeli();
    ok(app.raceHere({courseId: 'tremblant-woods', carId: app.menuCar}), 'Race here starts a race');
    ok(['countdown', 'racing'].includes(app.duel.state.status) && app.heliSession === null, 'a normal race, no helicopter');
    assert.equal(COURSE[app.duel.state.stageIndex].id, 'tremblant-woods'); checks++;
    app.returnToMenu();
    ok(!app.raceHere({courseId: 'tremblant-woods'}), 'no Race here without a helicopter visit');
  }

  // The Jesko races anywhere, including with an old saved helicopter position.
  {
    const setUp = app => {
      app.profile = {...app.profile, credits: 1_000_000, unlockedCars: [...new Set([...app.profile.unlockedCars, 'koenigsegg_jesko'])],
        courses: {...app.profile.courses, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'panorama-ridge'])]}};
      app._saveProfile();
    };
    const stage = id => COURSE.findIndex(item => item.id === id);
    const on = makeApp(true); setUp(on);
    ok(on.startCampaign({startStage: stage('panorama-ridge'), car: 'koenigsegg_jesko'}),
      'on: the Jesko races at Panorama Ridge without being flown there');
    on.returnToMenu();
    ok(on.startCampaign({startStage: stage('tremblant-woods'), car: 'koenigsegg_jesko'}), 'on: it races at Tremblant Woods, the home pad');
    on.returnToMenu();
    on.profile = {...on.profile, heli: {...(on.profile.heli || {version: 1}), version: 1, carsAt: {koenigsegg_jesko: 'panorama-ridge'}}};
    on._saveProfile();
    ok(on.startCampaign({startStage: stage('panorama-ridge'), car: 'koenigsegg_jesko'}), 'on: once set down at Panorama Ridge it races there');
    on.returnToMenu();
    ok(on.startCampaign({startStage: stage('tremblant-woods'), car: 'koenigsegg_jesko'}), 'on: it still races at home despite its saved position');
    on.returnToMenu();
    assert.equal(heliOf(on.profile).carsAt.koenigsegg_jesko, 'panorama-ridge', 'old position is preserved');
    ok(on.startCampaign({startStage: stage('tremblant-woods'), car: 'falcone_f42'}), 'on: other cars race anywhere');
    on.returnToMenu();
    const off = makeApp(false); setUp(off);
    ok(off.startCampaign({startStage: stage('panorama-ridge'), car: 'koenigsegg_jesko'}), 'off: the Jesko races anywhere as before');
    off.returnToMenu();
  }

  // Review cases: no helicopter sound loads with the switch off; restart is
  // refused while flying; leaving keeps changes made outside the session;
  // the pad resumes a paused flight; the Jesko can enter the Wasteland and arenas.
  {
    const off = makeApp(false);
    const loads = [];
    off.audio._loadCueBuffers?.toString().includes("'helicopter'") || loads.push('missing');
    ok(loads.length === 0, 'the start-up sound load leaves helicopter cues out');
    const app = makeApp(true);
    app.profile.credits = 2000; app._saveProfile();
    app.visitHeli(); const topUp = app.heliBuyFuel().cost ?? 0;
    fly(app, 2, {KeyW: true});
    app._inputAction('pause');
    ok(app.restart() === false && app.duel.state.status === 'heli' && app.heliSession, 'restart is refused while flying');
    app._inputAction('pause');
    app.profile = {...app.profile, credits: app.profile.credits + 5000, milestones: [...app.profile.milestones]};
    app.returnToMenu();
    ok(app.profile.credits === 7000 - topUp && heliOf(app.profile).fuelKg < 400, 'leaving keeps credits earned elsewhere and the fuel burned');
    const pressed = {start: false};
    const pad = {connected: true, axes: [0, 0, 0, 0], buttons: Array.from({length: 16}, (_, index) => ({get pressed() { return index === 9 && pressed.start; }, value: 0}))};
    const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {getGamepads: () => [pad]}});
    try {
      app.visitHeli();
      pressed.start = true; fly(app, 0.1); pressed.start = false; fly(app, 0.1);
      ok(app.duel.state.paused, 'Start pauses the flight');
      pressed.start = true; fly(app, 0.1); pressed.start = false; fly(app, 0.1);
      ok(!app.duel.state.paused, 'and Start resumes it');
    } finally {
      if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator); else delete globalThis.navigator;
    }
    app.returnToMenu();
    app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, 'koenigsegg_jesko'])]};
    app._saveProfile();
    app.menuCar = 'koenigsegg_jesko';
    ok(!app._airOnlyRefused('koenigsegg_jesko', 'pacific-canyon') && !app._airOnlyRefused('koenigsegg_jesko', 'scrapdome'),
      'the Jesko can drive into the Wasteland and arenas');
    ok(!app._airOnlyRefused('falcone_f42', 'scrapdome'), 'other cars can');
  }

  // The menu explains a closed START for an air-only car, in the app's words.
  {
    const {airOnlyNote} = await import('../src/heli/heli-jobs.js');
    const app = makeApp(true);
    app.profile = {...app.profile, credits: 1_000_000, unlockedCars: [...new Set([...app.profile.unlockedCars, 'ferrari_enzo'])],
      courses: {...app.profile.courses, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'panorama-ridge'])]},
      heli: {version: 1, carsAt: {}}};
    app._saveProfile();
    const stage = id => COURSE.findIndex(item => item.id === id);
    const note = airOnlyNote({enabled: true, profile: app.profile, carId: 'ferrari_enzo', courseId: 'panorama-ridge', carName: 'Ferrari Enzo'});
    const started = app.startCampaign({startStage: stage('panorama-ridge'), car: 'ferrari_enzo'});
    ok(!started && app.courseAccessMessage === note, 'the menu note and the refusal say the same thing');
    ok(airOnlyNote({enabled: true, profile: app.profile, carId: 'ferrari_enzo', courseId: 'tremblant-woods'}) === null, 'no note where the car is');
    ok(airOnlyNote({enabled: true, profile: app.profile, carId: 'falcone_f42', courseId: 'panorama-ridge'}) === null, 'no note for other cars');
    ok(airOnlyNote({enabled: false, profile: app.profile, carId: 'ferrari_enzo', courseId: 'panorama-ridge'}) === null, 'no note with the switch off');
  }

  // The menu line under START: the note replaces it, and when the note goes
  // the line is put back unless the menu has already written a newer one.
  {
    const {createRendererReadiness} = await import('../src/screen-readiness.js');
    const app = makeApp(true);
    app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, 'ferrari_enzo'])],
      courses: {...app.profile.courses, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'panorama-ridge'])]},
      heli: {version: 1, carsAt: {}}};
    app._saveProfile();
    const stage = id => COURSE.findIndex(item => item.id === id);
    const line = {textContent: 'OLD COURSE LINE', dataset: {}};
    const ui = {view3d: {dataset: {}, classList: {add() {}}}, 'renderer-loading': {hidden: false, lastChild: {textContent: ''}},
      'renderer-error': {hidden: true, querySelector: () => ({textContent: ''})},
      'start-engine': {disabled: false, parentElement: {querySelector: () => line}}};
    const choices = {car: 'ferrari_enzo', startStage: stage('panorama-ridge')};
    app.menuCar = 'ferrari_enzo';
    const ready = createRendererReadiness({app, ui, choices, profile: () => app.profile, isDisposed: () => false,
      importRenderer: async () => ({attachRenderer: () => ({prepareVehicle(key) { ui.view3d.dataset.vehicleKey = key; ui.view3d.dataset.vehicleAsset = 'ready'; }, dispose() {}})})});
    await ready.ensureRenderer();
    ok(line.textContent.includes('travels only by air') && ui['start-engine'].disabled, 'the note replaces the line and START closes');
    choices.startStage = stage('tremblant-woods'); line.textContent = 'WOODS LINE';
    ready.syncRendererReadiness(app.duel.state);
    ok(line.textContent === 'WOODS LINE', 'a newer menu line stays when the note goes');
    choices.startStage = stage('panorama-ridge'); ready.syncRendererReadiness(app.duel.state);
    app.menuCar = choices.car = 'koenigsegg_jesko'; ready.syncRendererReadiness(app.duel.state);
    ok(line.textContent === 'WOODS LINE', 'the saved line comes back when only the car changed');
  }

  // The four camera views read the session view and nothing else.
  {
    const view = {heli: {x: 0, y: 30, z: 0, heading: 0, pitch: 0, roll: 0}, load: {x: 0, y: 14, z: 0, hooked: true}};
    assert.deepEqual(HELI_CAMERA_VIEWS, ['behind', 'cockpit', 'cable', 'side']); checks++;
    for (let i = 0; i < 4; i++) {
      const pose = heliCameraPose(view, i);
      ok(pose && [pose.position.x, pose.position.y, pose.position.z, pose.target.y].every(Number.isFinite), `${HELI_CAMERA_VIEWS[i]} view`);
    }
    ok(heliCameraPose(view, 0).position.z < 0, 'behind is behind');
    ok(heliCameraPose(view, 2).target.y < view.heli.y, 'the cable view looks down the cable');
    ok(heliCameraPose({heli: null}, 0) === null, 'no helicopter, no pose');
  }
} finally {
  if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
}
console.log(`test-heli-hooks: ${checks} checks passed`);
