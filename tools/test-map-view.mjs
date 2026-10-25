// MAP-VIEW: the pilot's map screen, the cockpit key, the board's Map button, scouting names, the signs and
// the Table, drawn from the helicopter's view (docs/PILOT_MAP.md sections 2, 3 and 5). Everything runs
// without graphics: the chart is painted on a recording stand-in for a 2D canvas and the world on a real
// three.js scene graph with stub models. Memory-only storage.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {keyboardAction, INPUT_CONTEXTS} from '../src/input-contexts.js';
import {controlsHelp} from '../src/controls-help.js';
import {instrumentsMarkup, controlsMarkup, noticeText} from '../src/heli/heli-ui.js';
import {dispatchBoardMarkup, handleBoardAction, atAnyPad} from '../src/heli/heli-board.js';
import {PLACES, FUEL_PADS, PILOT_MAP, placeById} from '../src/heli/pilot-map-data.js';
import {HELI_CUES} from '../src/heli/heli-audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {SECRET_SIGNS, TABLE, TABLE_ID} from '../src/heli/map-secrets.js';
import {mapModel, hitPlace, placeNote, bearingKm, chartFrame, drawChart, destinationOf, MAP_KEY, LOGBOOK_CARD} from '../src/heli/pilot-map-view.js';
import {createMapWorldView, SIGN_MODELS, MESA_FIT} from '../src/heli/pilot-map-world.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };

const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; }};
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});

// A 2D context that records what is painted, and nothing else.
function recordingContext() {
  const calls = [], texts = [];
  const target = {calls, texts, measureText: text => ({width: String(text).length * 6})};
  return new Proxy(target, {
    get(t, name) {
      if (name in t) return t[name];
      return (...args) => { calls.push(name); if (name === 'fillText' || name === 'strokeText') texts.push(String(args[0])); return undefined; };
    },
    set() { return true; },
  });
}

try {
  const makeApp = ({helicopter = true, pilotMap = true} = {}) => {
    const app = new App();
    app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter, 'pilot-map': pilotMap}, qa: true}), () => app.duel.state);
    return app;
  };
  const own = (app, courses, credits = 5000) => {
    app.profile = {...app.profile, credits, courses: {...app.profile.courses, version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked ?? []), ...courses])]}};
    app._saveProfile();
  };
  const fly = (app, seconds, keys = {}) => { app.keys = keys; for (let i = 0; i < Math.round(seconds * 60); i++) app._simulate(1 / 60); };

  // The notices name the map's places, not their ids.
  equal(noticeText({type: 'entered', courseId: 'the-table', arrived: true}), 'The Table: the landing zone is ahead', 'the Table is named on arrival');
  equal(noticeText({type: 'delivered', courseId: 'pacific-canyon'}), 'Delivered to Pacific Canyon Circuit', 'a map place is named in a notice');
  equal(noticeText({type: 'entered', courseId: 'tremblant-snow'}), 'Tremblant Snow', 'and the old names are unchanged');

  // ---- the keys, the help and the cues -------------------------------------------------------------------
  equal(keyboardAction('heli', 'KeyN'), 'heli-map', 'N is the map key in the helicopter');
  equal(MAP_KEY, 'N', 'the key the panel names is N');
  const heliKeys = Object.keys(INPUT_CONTEXTS.heli.keyboard), held = Object.values(INPUT_CONTEXTS.heli.held).flat();
  ok(new Set(heliKeys).size === heliKeys.length && !held.includes('KeyN'), 'N is free in the helicopter (no other action or held key uses it)');
  for (const id of ['map.open', 'map.close', 'map.pin']) ok(SOUND_BANK[id] === HELI_CUES[id] && HELI_CUES[id].flag === 'helicopter', `${id} is in the sound bank behind the helicopter switch`);

  // ---- switch off: nothing of the map exists -------------------------------------------------------------
  {
    const app = makeApp({pilotMap: false});
    app.profile.credits = 2000; app._saveProfile();
    ok(app.visitHeli() && !app.heliMapAvailable(), 'off: the helicopter flies and the map is not available');
    const view = app.heliView();
    ok(view.secrets === undefined && view.scout === undefined && view.destinations === undefined, 'off: the view carries nothing of the map');
    app._inputAction('heli-map');
    ok(app.heliMapOpen === false, 'off: N opens nothing');
    ok(!instrumentsMarkup(view).includes('MAP'), 'off: no MAP key in the cockpit line');
    ok(!controlsMarkup(view).includes('data-heli-map'), 'off: no map button in the FLY TO panel');
    ok(!dispatchBoardMarkup(view, {jobs: []}).includes('data-heli-board="map"'), 'off: no Map button on the board');
    app.returnToMenu();
  }

  // ---- switch on: the map opens, picks a destination and closes -----------------------------------------------
  const app = makeApp();
  own(app, ['tremblant-woods', 'tremblant-snow', 'panorama-ridge']);
  ok(app.visitHeli(), 'on: the visit starts');
  ok(app.heliMapAvailable(), 'on: the map is available');
  ok(app.heliBuyFuel().ok, 'the free first tank');
  fly(app, 1);
  {
    const view = app.heliView();
    ok(view.secrets !== undefined && Array.isArray(view.destinations), 'on: the view carries the secrets and the destinations');
    ok(instrumentsMarkup(view).includes(`MAP <kbd>${MAP_KEY}</kbd>`), 'on: the cockpit line lists the map key');
    // The pad: the board offers the map at any pad, not only at home.
    equal(atAnyPad(view), true, 'the helicopter starts on the pad');
    ok(dispatchBoardMarkup(view, {jobs: []}).includes('data-heli-board="map"'), 'on: the board has a Map button on the pad');
    ok(controlsMarkup(view).includes(`data-heli-map="open"`), 'on: the FLY TO panel has a map button wherever the helicopter is');
    ok(!dispatchBoardMarkup({...view, heli: {...view.heli, onGround: false}}, {jobs: []}).includes('data-heli-board="map"'), 'no Map button in the air (the key does that)');
    ok(controlsHelp({state: {status: 'heli'}, featureFlags: {enabled: name => name === 'pilot-map'}}).rows.some(([key]) => key === 'N'), 'the controls help lists N with the map on');
    ok(!controlsHelp({state: {status: 'heli'}, featureFlags: {enabled: () => false}}).rows.some(([key]) => key === 'N'), 'and not with it off');
  }
  const audioCalls = [];
  const play = app.heliAudio.play.bind(app.heliAudio);
  app.heliAudio.play = (id, ...rest) => { audioCalls.push(id); return play(id, ...rest); };
  const stateBefore = JSON.stringify({heli: app.heliView().heli, destination: app.heliView().destination, fuel: app.heliView().heli.fuelKg, credits: app.profile.credits});
  app._inputAction('heli-map');
  ok(app.heliMapOpen === true && audioCalls.includes('map.open'), 'N opens the map and plays map.open');
  ok(app.duel.state.paused !== true, 'the map does not pause the flight');
  app._inputAction('pause');
  ok(app.heliMapOpen === false && audioCalls.includes('map.close') && app.duel.state.paused !== true, 'Esc closes the map first, without pausing');
  app._inputAction('pause');
  ok(app.duel.state.paused === true, 'a second Esc pauses as usual');
  app._inputAction('heli-map');
  ok(app.heliMapOpen === false, 'N does nothing while paused');
  app._inputAction('pause');
  // The board's button opens it the same way.
  ok(handleBoardAction('map', app) && app.heliMapOpen === true, 'the board button opens the map');
  app.setHeliMap(false);

  // The model: places, ownership, pads, legs, reach, the helicopter.
  const profile = () => ({...app.profile, heli: app.heliSession.profile?.heli ?? app.profile.heli});
  const model = mapModel({view: app.heliView(), profile: profile(), jobs: app.heliSession.boardJobs()});
  equal(model.places.length, PLACES.length - 1, 'every place but the Table (not seen yet) is on the chart');
  ok(!model.places.some(place => place.id === TABLE_ID) && model.table === null, 'the Table is not on the map at first');
  const byId = new Map(model.places.map(place => [place.id, place]));
  equal(byId.get('tremblant-woods').state, 'owned', 'an owned course is ink');
  equal(byId.get('alpine-serpent').state, 'grey', 'a course you do not own is grey');
  equal(byId.get('tremblant-woods').isHere, true, 'the helicopter is at the home pad');
  for (const pad of FUEL_PADS) equal(byId.get(pad.place).pad?.price, pad.pricePerKg, `${pad.place} shows its pump price`);
  equal(byId.get('tremblant-snow').legKg, 25, 'the old leg to Tremblant Snow keeps its 25 kg');
  equal(byId.get('pacific-canyon').legKg, 290, 'home to Pacific Canyon is 290 kg');
  equal(byId.get('ardennes-forest').noLanding, true, 'Ardennes is drawn but has no landing zone');
  equal(byId.get('ardennes-forest').isDestination, false, 'and is not a destination');
  equal(byId.get('panorama-ridge').isDestination, true, 'Panorama Ridge is a destination');
  equal(byId.get('titan-stadium').destination, 'titan-arena', 'the stadium is its Monster Arena');
  ok(model.reachKm > 0 && model.reachKm <= 33, `the tank's reach is a ring (${model.reachKm} km)`);
  ok(Math.abs(model.heli.x - placeById('tremblant-woods').drawAt.x) < 1 && Math.abs(model.heli.z - placeById('tremblant-woods').drawAt.z) < 1, 'the helicopter is drawn at home');
  equal(JSON.stringify({heli: app.heliView().heli, destination: app.heliView().destination, fuel: app.heliView().heli.fuelKg, credits: app.profile.credits}), stateBefore, 'opening, closing and drawing the map changed no flight state');
  // The fuel ring follows the tank.
  const low = mapModel({view: {...app.heliView(), heli: {...app.heliView().heli, fuelKg: 65}}, profile: profile()});
  equal(low.reachKm, 5, 'a 65 kg tank reaches 5 km');
  ok(low.places.find(place => place.id === 'panorama-ridge').reachable === false, 'and a leg beyond it is marked');
  // Burnt, found and special cars.
  const burnt = mapModel({view: {...app.heliView(), fallen: ['panorama-ridge']}, profile: profile()});
  equal(burnt.places.find(place => place.id === 'panorama-ridge').state, 'burnt', 'a burnt course is black');
  const found = mapModel({view: {...app.heliView(), secrets: {...app.heliView().secrets, found: ['panorama-ridge-night']}}, profile: profile()});
  equal(found.found[0].place, 'panorama-ridge', 'a found secret is pinned by its course');
  const withCar = mapModel({view: app.heliView(), profile: {...profile(), unlockedCars: [...profile().unlockedCars, 'koenigsegg_jesko'],
    heli: {...profile().heli, carsAt: {koenigsegg_jesko: 'panorama-ridge'}}}});
  ok(withCar.places.find(place => place.id === 'panorama-ridge').cars.some(car => car.id === 'koenigsegg_jesko'), 'a special car shows where it stands');
  ok(!model.places.some(place => place.cars.length), 'and none without owning one');
  // Today's jobs.
  ok(model.jobLines.every(job => byId.has(job.from) && byId.has(job.to) && job.pay > 0), 'today\'s jobs are lines between places');
  // The moving map.
  const moving = mapModel({view: app.heliView(), profile: profile(), movingMap: true});
  ok(/\d{3}° \d+\.\d km/.test(placeNote(moving, moving.places.find(place => place.id === 'panorama-ridge'))), 'the moving map adds a bearing and distance');
  ok(!/°/.test(placeNote(model, model.places.find(place => place.id === 'panorama-ridge'))), 'and the plain map does not');
  const north = bearingKm({x: 0, z: 0}, {x: 0, z: 10}), east = bearingKm({x: 0, z: 0}, {x: 10, z: 0}), south = bearingKm({x: 0, z: 0}, {x: 0, z: -3});
  ok(north.bearing === 0 && east.bearing === 90 && south.bearing === 180 && Math.abs(north.km - 10) < 1e-9, 'bearings: north 0, east 90, south 180');
  // Hit test: a click near a place picks it, a click on open sea picks nothing.
  const frame = chartFrame(900, 900), woods = placeById('tremblant-woods').drawAt;
  equal(hitPlace(model, {x: woods.x + 0.2, z: woods.z - 0.2}, frame.k)?.id, 'tremblant-woods', 'a click near a place picks it');
  equal(hitPlace(model, {x: PILOT_MAP.bounds.minX + 1, z: PILOT_MAP.bounds.minZ + 1}, frame.k), null, 'open sea picks nothing');
  const round = frame.unproject(...frame.project(3.3, -7.7));
  ok(Math.abs(round.x - 3.3) < 1e-9 && Math.abs(round.z + 7.7) < 1e-9, 'the chart maps points both ways');
  ok(frame.project(0, 10)[1] < frame.project(0, 0)[1], 'north is up');

  // The chart paints every layer and names what the design lists.
  {
    const ctx = recordingContext();
    drawChart(ctx, {...model, movingMap: true}, {width: 900, height: 900, hover: model.places[0]});
    ok(ctx.calls.length > 800, `the chart paints the land, sea, contours, outlines and names (${ctx.calls.length} calls)`);
    for (const word of ['Tremblant Woods', 'Panorama Ridge', '1.5', '1.8', '2.0', '2.2', '5 km', 'N', '2500 m']) ok(ctx.texts.includes(word), `the chart writes ${word}`);
    ok(ctx.calls.includes('arc') && ctx.calls.includes('setLineDash'), 'it draws the tank ring and the dashed lines');
    const unseen = recordingContext();
    drawChart(unseen, model, {width: 900, height: 900});
    ok(!unseen.texts.includes('?') && !unseen.texts.includes('The Table'), 'the Table is not drawn until it is seen');
  }

  // Picking a destination: through the app, with the pin sound, and nothing else changes.
  audioCalls.length = 0;
  ok(app.heliMapPick('panorama-ridge') === true && app.heliView().destination === 'panorama-ridge', 'a pick sets the destination');
  ok(audioCalls.includes('map.pin'), 'and plays map.pin');
  ok(app.heliMapPick('ardennes-forest') === false && app.heliView().destination === 'panorama-ridge', 'a place with no landing zone cannot be picked');
  equal(app.heliView().heli.fuelKg, JSON.parse(stateBefore).fuel, 'the pick spent no fuel');
  equal(app.profile.credits, JSON.parse(stateBefore).credits, 'and no credits');
  ok(mapModel({view: app.heliView(), profile: profile()}).places.find(place => place.id === 'panorama-ridge').chosen, 'the chosen place is marked');

  // ---- the page: the panel's markup and clicks (a minimal document) ---------------------------------------------
  {
    const elements = [];
    const makeEl = tag => {
      const el = {tag, children: [], listeners: {}, hidden: false, className: '', textContent: '', attrs: {}, ownerDocument: null, innerHTML: '',
        append(child) { this.children.push(child); }, remove() {}, setAttribute(name, value) { this.attrs[name] = value; },
        addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }, removeEventListener() {},
        querySelector(selector) { return selector === 'canvas' ? canvas : selector === '.pilot-map-info' ? info : null; },
        getBoundingClientRect: () => ({left: 0, top: 0, width: 900, height: 900}), getContext: () => recordingContext(), closest: () => null};
      elements.push(el); return el;
    };
    const canvas = makeEl('canvas'), info = makeEl('p');
    const doc = {createElement: tag => { const el = makeEl(tag); el.ownerDocument = doc; return el; }};
    const host = {ownerDocument: doc, children: [], append(child) { this.children.push(child); }};
    const {createPilotMapUi} = await import('../src/heli/pilot-map-view.js');
    const ui = createPilotMapUi({host, app});
    const [section, card] = host.children;
    ui.update(app.heliView());
    ok(section.hidden === true, 'the panel is hidden while the map is closed');
    app.setHeliMap(true);
    ui.update(app.heliView());
    ok(section.hidden === false, 'the panel shows while the map is open');
    ok(section.innerHTML.includes('PILOT\'S MAP') && section.innerHTML.includes('Click a place'), 'the panel says what it is');
    ok(card.hidden === true, 'no logbook card away from the Table');
    // A click on the canvas at a place sets the destination.
    const click = section.listeners.click[0], pt = chartFrame(900, 900).project(...[placeById('tremblant-snow').drawAt.x, placeById('tremblant-snow').drawAt.z]);
    click({target: canvas, clientX: pt[0], clientY: pt[1]});
    equal(app.heliView().destination, 'tremblant-snow', 'a click on a place sets it as the destination');
    click({target: canvas, clientX: 5, clientY: 5});
    equal(app.heliView().destination, 'tremblant-snow', 'a click on open sea changes nothing');
    click({target: {closest: selector => selector === '[data-pilot-map="close"]' ? {} : null}});
    equal(app.heliMapOpen, false, 'the close button closes the map');
    ui.update(app.heliView());
    ok(section.hidden === true, 'and the panel hides');
    ui.update(null);
    ok(card.hidden === true && section.hidden === true, 'with no flight there is nothing to show');
    ui.dispose();
  }

  // ---- the world: signs, scouting and the Table -----------------------------------------------------------------
  {
    const scene = new THREE.Scene(), loaded = [];
    const stub = file => { loaded.push(file); const g = new THREE.Group(); g.name = file; if (file === 'table-lookout') { const spot = new THREE.Object3D(); spot.name = 'logbook_spot'; g.add(spot); } return Promise.resolve(g); };
    const heading = (x, z) => 0.5;
    const world = createMapWorldView({THREE, scene, load: stub, groundHeight: (x, z) => 100 + x / 100, roadHeading: heading, createCanvas: () => null});
    const settle = () => new Promise(resolve => setTimeout(resolve, 5));
    const base = {heli: {x: 0, y: 0, z: 0}, courseId: 'panorama-ridge', secrets: {signs: [], found: [], table: false}, scout: null};
    equal(world.update(null).hideCourse, false, 'no flight, nothing to hide');
    ok(world.group.visible === false, 'and nothing drawn');
    // The signs still to be found, placed on the ground.
    const sign = SECRET_SIGNS.find(item => item.id === 'panorama-ridge-reverse'), night = SECRET_SIGNS.find(item => item.id === 'panorama-ridge-night');
    world.update({...base, secrets: {...base.secrets, signs: [{id: sign.id, x: sign.x, z: sign.z}, {id: night.id, x: night.x, z: night.z}]}});
    await settle();
    deepEqualSet(world.signIds, [sign.id, night.id], 'both signs of this course are drawn');
    const holder = world.group.children.find(child => child.name === `Sign ${sign.id}`);
    ok(Math.abs(holder.position.x - sign.x) < 1e-9 && Math.abs(holder.position.y - (100 + sign.x / 100)) < 1e-9, 'a sign stands on the ground');
    ok(Math.abs(holder.rotation.y - (0.5 + Math.PI)) < 1e-9, 'the start grid faces against the lap');
    ok(Math.abs(world.group.children.find(child => child.name === `Sign ${night.id}`).rotation.y) < 1e-9, 'the fire pits have no direction');
    ok(holder.children.length === 1 && holder.children[0].name === 'sign-start-grid', 'with its model from MAP-ART');
    for (const [id, spec] of Object.entries(SIGN_MODELS)) ok(SECRET_SIGNS.some(item => item.id === id) && /^sign-/.test(spec.file), `${id} has a sign model`);
    equal(Object.keys(SIGN_MODELS).length, SECRET_SIGNS.length, 'every secret has a model');
    world.update({...base, secrets: {...base.secrets, signs: [{id: night.id, x: night.x, z: night.z}]}});
    deepEqualSet(world.signIds, [night.id], 'a found sign is taken off the ground');
    world.update(base);
    equal(world.signIds.length, 0, 'and with none left, none are drawn');
    // Scouting: the corner names over an owned course, once, shown only while flying over it.
    const scout = {courseId: 'panorama-ridge', corners: [{number: 1, name: 'The Hairpin', label: '1', x: 50, z: 60}, {number: 2, name: null, label: '2', x: -40, z: 220}]};
    world.update({...base, scout});
    const names = world.group.children.find(child => child.name === 'Corner names panorama-ridge');
    ok(names && names.children.length === 2 && names.visible, 'every corner of an owned course gets a name');
    ok(Math.abs(names.children[0].position.y - (100 + 50 / 100 + 7)) < 1e-9, 'hovering just over its corner');
    world.update({...base, scout});
    equal(world.group.children.filter(child => child.name === 'Corner names panorama-ridge').length, 1, 'made once for the course');
    world.update(base);
    ok(names.visible === false, 'and gone when the course is not one you own');
    // The Table: hides the course last loaded, built once from the Table's own rules.
    equal(world.update({...base, courseId: 'tremblant-woods'}).hideCourse, false, 'a course is not hidden');
    ok(!world.tableBuilt, 'and the Table is not built');
    equal(world.update({...base, courseId: TABLE_ID}).hideCourse, true, 'on the Table the course steps aside');
    await settle();
    ok(world.tableBuilt, 'the Table is built');
    const table = world.group.children.find(child => child.name === 'The Table');
    ok(table.visible && table.children.length >= 5, 'with a desert, the strip, the mesa, the lookout and the wreck');
    const mesa = table.children.find(child => child.name === 'table-mesa'), lookout = table.children.find(child => child.name === 'table-lookout');
    ok(mesa.position.y === TABLE.topY && Math.abs(mesa.scale.x * 200 - TABLE.topRadius) < 1e-9, 'the mesa top is the Table\'s top, as wide as its rules');
    ok(Math.abs(mesa.scale.y * 165 - (TABLE.topY - TABLE.floorY)) < 1e-9 && MESA_FIT.scaleY === mesa.scale.y, 'and its foot is at the floor');
    ok(lookout.position.x === TABLE.tower.x && lookout.position.z === TABLE.tower.z && lookout.position.y === TABLE.topY, 'the lookout stands where the Table\'s rules put it');
    await settle();
    ok(lookout.getObjectByName('logbook_spot').children[0]?.name === 'table-logbook', 'the logbook lies in the lookout\'s cab');
    const strip = table.children.find(child => child.geometry?.index && child.geometry.attributes.position.count === TABLE.strip.samples * 2);
    ok(strip, 'the strip follows the oval the helicopter\'s rules use');
    equal(world.update({...base, courseId: 'tremblant-woods'}).hideCourse, false, 'leaving the Table gives the course back');
    ok(!table.visible, 'and hides the Table');
    ok(loaded.includes('table-mesa') && loaded.includes('table-logbook') && new Set(loaded).size >= 5, 'the models were asked for by name');
    world.dispose();
  }
  ok(LOGBOOK_CARD.text.includes('Red car on the bottom off the Pacific cove'), 'the logbook\'s last page is the one the design quotes');
  for (const file of ['sign-logging-arrows', 'sign-start-grid', 'sign-fire-pits', 'sign-chalk-line', 'sign-lighthouse-window', 'table-mesa', 'table-lookout', 'table-plane-wreck', 'table-logbook'])
    ok(readFileSync(new URL(`../public/assets/models/pilot-map/${file}.glb`, import.meta.url)).length > 1000, `${file}.glb is in public/assets/models/pilot-map`);
  ok(/@import '\.\/pilot-map\.css'/.test(readFileSync(new URL('../src/heli/heli-ui.css', import.meta.url), 'utf8')), 'the map\'s sheet is loaded with the helicopter\'s');
  ok(destinationOf(placeById('titan-stadium')) === 'titan-arena' && destinationOf(placeById(TABLE_ID)) === TABLE_ID, 'a place\'s destination id');

  // Leaving the helicopter closes the map.
  app.setHeliMap(true);
  app.returnToMenu();
  ok(app.heliMapOpen === false && app.heliSession === null, 'leaving the visit closes the map');

  // The sign's switch: secretCourses follow the variants' own switches.
  ok(Array.isArray(app._secretCoursesOn()) && app._secretCoursesOn().every(id => SECRET_SIGNS.some(sign => sign.id === id)), 'secretCourses are secret courses');
  equal(app._secretCoursesOn().length, 0, 'none while the variants\' own switches are dev');
  console.log(`test-map-view: ${checks} checks passed`);
} finally {
  if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
}

function deepEqualSet(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label); checks++;
}
