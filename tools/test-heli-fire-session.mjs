// H2 Fire wired into the game (docs/HELI_FIRE.md section 16): a mission
// flown by script, a neglected fire burning its course, and the app's race
// start check, buyback and play days. Headless; memory storage only.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {COURSE} from '../src/config.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite} from '../src/heli/heli-session.js';
import {fireOnNewDay, fireWorld} from '../src/heli/heli-fire-run.js';
import {startFire, startCells} from '../src/heli/heli-fire.js';
import {armMissions, openCall} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, fireOf, setMissions, setFire, notePlayDay, createMissions, hearBurnNews, buyBack, burnCourse} from '../src/heli/heli-save.js';
import {courseClosed, buybackPrice} from '../src/course-closures.js';
import {dispatchBoardMarkup, handleBoardAction} from '../src/heli/heli-board.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const on = {enabled: true};

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
const woods = loadCourse('tremblant-woods');
const site = courseSite(woods.course, woods.ground, 'tremblant-woods');
const world = fireWorld(woods, site);

// The steady test pilot of tools/test-heli-jobs.mjs (Assisted).
function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    // The height error is capped, so it climbs and sinks at most `sink` m/s.
    lift: clamp(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
// Up to a safe height for the leg (the bucket clears the trees and ground on
// its line by 15 m), straight across, then down at the goal.
function legHeight(from, to) {
  let top = -Infinity;
  for (let k = 0; k <= 40; k++) {
    const x = from.x + (to.x - from.x) * k / 40, z = from.z + (to.z - from.z) * k / 40;
    top = Math.max(top, woods.ground.highest(x, z, 8));
  }
  return top + 15 + 19;
}
function travel(session, goal, finalY, {speed = 22} = {}) {
  const view = session.view(), high = Math.max(finalY, legHeight(view.heli, goal)), events = [];
  events.push(...run(session, 60, view => pilot(view, {x: view.heli.x, z: view.heli.z, y: high}, {speed: 1}), view => view.heli.y > high - 3));
  events.push(...run(session, 300, view => pilot(view, {x: goal.x, z: goal.z, y: high}, {speed}),
    view => Math.hypot(view.heli.x - goal.x, view.heli.z - goal.z) < 3 && Math.hypot(view.heli.vx, view.heli.vz) < 1));
  // Down fast while high, gently near the ground (the bucket hangs 19 m below).
  const sinkAt = view => Math.max(1.5, Math.min(6, (view.heli.y - finalY) / 6));
  events.push(...run(session, 180, view => pilot(view, {x: goal.x, z: goal.z, y: finalY}, {speed: 2, sink: sinkAt(view)}),
    view => Math.abs(view.heli.y - finalY) < 0.6 && Math.abs(view.heli.vy) < 0.4));
  return events;
}
function run(session, seconds, controls, until = null) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 120); i++) {
    events.push(...session.step(controls(session.view())));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const has = (events, type) => events.some(event => event.type === type);
const lines = events => events.filter(event => event.type === 'radio').map(event => event.line);

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
// A trained pilot whose secret count has just reached its need.
function readyProfile() {
  let profile = normalizeProfile({...createProfile(), credits: 2000, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count: 5}}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'Fire QA'});
  return setMissions(profile, {...armed, count: armed.need}, on).profile;
}
function newSession(profile, {fireEnabled = true} = {}) {
  return createHeliSession({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled, playerName: 'Fire QA',
    today: DAY, carId: 'falcone_f42'});
}

// ---- A mission flown to the end ---------------------------------------------
function flyMission({maxTrips = Infinity} = {}) {
  let afterTwo = null;
  const session = newSession(readyProfile());
  const log = [...session.start()];
  const zone = session.view().zone;
  const above = (view, metres) => ({x: view.heli.x, z: view.heli.z, y: woods.ground.height(view.heli.x, view.heli.z) + metres});
  // Lift off and hold 45 m over the pad: the call comes 20 to 60 s later.
  log.push(...run(session, 120, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y + 45}), (view, seen) => has(seen, 'fireCall')));
  const call = log.find(event => event.type === 'fireCall');
  const lifted = log.findIndex(event => event.type === 'liftoff'), rang = log.indexOf(call);
  ok(call && lifted >= 0 && rang > lifted, 'the call comes mid-air after lift-off');
  ok(lines(log).includes('heli.radio.fire.call') && log.some(event => event.type === 'cue' && event.id === 'heli.fire.alert'), 'alert tone, then the call');
  ok(fireOf(session.profile)?.courseId === 'tremblant-woods', 'the fire starts at Tremblant Woods');
  ok(session.pressRadio(), 'R answers now');
  log.push(...session.takeEvents());
  ok(missionsOf(session.profile).call.answered, 'the call is answered in the save');
  // Land on the pad and fit the bucket.
  log.push(...run(session, 120, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 4}), view => view.heli.onGround));
  ok(session.view().heli.onGround, 'back on the pad');
  ok(session.fitBucket().ok, 'the bucket is fitted');
  ok(dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}}).includes('Take off the bucket'), 'the board offers to take it off');
  const lake = woods.course.def.basins[0], middle = woods.course.worldAt(woods.course.phase(lake.s), lake.lateral);
  const surface = woods.ground.water(middle.x, middle.z);
  let trips = 0, refuels = 0;
  for (let round = 0; round < 40 && fireOf(session.profile) && trips < maxTrips; round++) {
    // Fuel low: back to the pad for the pump.
    if (session.view().heli.fuelKg < 220) {
      log.push(...travel(session, zone, zone.y + 25));
      log.push(...run(session, 120, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 1, sink: 1}), view => view.heli.onGround));
      if (session.buyFuel(Infinity).ok) refuels++;
      log.push(...session.takeEvents());
    }
    // Scoop: over the lake, then low and slow until full.
    log.push(...travel(session, middle, surface + 25));
    log.push(...run(session, 60, view => pilot(view, {x: middle.x, z: middle.z, y: surface + 17.6}, {speed: 2}),
      view => view.bucket?.words === 'full'));
    // To the hot edge, high over the trees; aim with the ring, then pour.
    const target = () => session.view().fire?.target;
    if (!target()) break;
    const first = target();
    log.push(...travel(session, first, woods.ground.height(first.x, first.z) + 60));
    log.push(...run(session, 300, view => {
      const goal = view.fire?.target ?? target(), aim = view.bucket?.aim;
      const lead = aim ? {x: aim.x - view.bucket.x, z: aim.z - view.bucket.z} : {x: 0, z: 0};
      return pilot(view, {x: goal.x - lead.x, z: goal.z - lead.z, y: woods.ground.height(goal.x, goal.z) + 60}, {speed: 3});
    }, view => {
      const goal = view.fire?.target, aim = view.bucket?.aim;
      return !goal || aim && Math.hypot(aim.x - goal.x, aim.z - goal.z) < 4 && Math.hypot(view.heli.vx, view.heli.vz) < 1.5;
    }));
    log.push(...run(session, 6, view => ({...pilot(view, above(view, 60), {speed: 1}), pour: true}), view => (view.bucket?.water ?? 0) <= 0.5));
    // Let the drop's water land before the next leg.
    log.push(...run(session, 6, view => pilot(view, above(view, 60), {speed: 1}), view => !view.bucket?.parcels.length));
    trips++;
    if (trips === 2) afterTwo = [session.fingerprint(), JSON.stringify(heliOf(session.profile))];
  }
  return {session, log, trips, refuels, afterTwo};
}

const flown = flyMission();
{
  const {session, log, trips} = flown;
  const out = log.find(event => event.type === 'fireOut');
  ok(out, `the fire is put out (${trips} drops)`);
  // Section 4.5: a fire answered at once goes out in 4 to 8 drops. A fire step
  // lasts one real bucket trip (FIRE-FINISH), so this holds in play too.
  ok(trips <= 8, `answered at once, out within 8 drops (${trips})`);
  ok(trips >= 2 && trips <= 14, `in a sensible number of drops: ${trips}`);
  same([out.paid, out.firstBadge], [1500, true], '1,500 credits and the badge the first time');
  const heli = heliOf(session.profile);
  same([heli.fire, heli.missions.firesOut, heli.missions.badges, heli.missions.call], [null, 1, ['firefighter'], null], 'the save: no fire, one out, the badge');
  ok(heli.scars?.length === 1 && heli.scars[0].courseId === 'tremblant-woods', 'the burnt cells stay as a scar');
  ok(heli.missions.quiet.untilDay === heli.playDay.count + 2 && heli.missions.quiet.engineSeconds > 1100, 'the quiet spell starts');
  ok(lines(log).includes('heli.radio.fire.out') && lines(log).includes('heli.radio.fire.thanks'), 'Roger and Sarah say so');
  ok(log.some(event => event.type === 'cue' && event.id === 'heli.badge'), 'the badge chime');
  ok(lines(log).includes('heli.radio.bucket.first') && lines(log).includes('heli.radio.bucket.full'), 'Brian talks the bucket through');
  ok(log.some(event => event.type === 'fireHiss'), 'water hissed on the fire');
  ok(!session.view().loads.some(load => load.id === 'bucket'), 'the bucket is never drawn as a car');
}

check('the same mission flies the same way', () => {
  // Two drops are enough to show it: the same flight, fire and save.
  const again = flyMission({maxTrips: 2});
  same(again.afterTwo, flown.afterTwo, 'same inputs, same save after two drops');
});
function check(name, fn) { fn(); console.log('PASS ' + name); }

// ---- Answer later, and the board's Radio box ----------------------------------
{
  const session = newSession(readyProfile());
  session.start();
  const zone = session.view().zone;
  const log = run(session, 120, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y + 45}), (view, seen) => has(seen, 'fireCall'));
  log.push(...run(session, 21, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y + 45})));
  ok(lines(log).includes('heli.radio.fire.later') && has(log, 'fireLater'), 'no answer in 20 s: later');
  ok(missionsOf(session.profile).call && !missionsOf(session.profile).call.answered, 'the call waits in the save');
  ok(dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}}).includes('data-heli-board="radio-answer"'), 'the board shows Answer');
  ok(handleBoardAction('radio-answer', {heliSession: session, _heliEvents: () => {}}), 'Answer from the board');
  ok(missionsOf(session.profile).call.answered, 'answered later');
  ok(dispatchBoardMarkup(session.view(), {fire: {repairCost: 0}}).includes('% out'), 'the board shows the fire in hand');
  ok(!dispatchBoardMarkup(session.view(), {}).includes('heli-board-radio'), 'no Radio box with the switch off');
}

// ---- The autopilot on the fire course ------------------------------------------
{
  const session = newSession(readyProfile());
  session.start();
  const zone = session.view().zone;
  run(session, 120, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y + 45}), (view, seen) => has(seen, 'fireCall'));
  session.pressRadio();
  run(session, 120, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 4, sink: 1}), view => view.heli.onGround);
  ok(session.fitBucket().ok, 'bucket on');
  const lake = woods.course.def.basins[0], middle = woods.course.worldAt(woods.course.phase(lake.s), lake.lateral);
  const surface = woods.ground.water(middle.x, middle.z);
  ok(session.pressAutopilot(), 'the autopilot takes over');
  const log = run(session, 240, () => ({}), (view, seen) => has(seen, 'autopilotArrived'));
  const view = session.view();
  ok(has(log, 'autopilotArrived') && Math.hypot(view.heli.x - middle.x, view.heli.z - middle.z) < 6, 'with an empty bucket it flies to the lake');
  ok(Math.abs(view.heli.y - (surface + 25)) < 2, `and hovers about 25 m above the water (${(view.heli.y - surface).toFixed(1)} m)`);
  ok(!has(log, 'crash') && view.bucket.water === 0, 'scooping stays the pilot\'s');
}

// ---- Switch off: the visit is H1 exactly ----------------------------------------
{
  const off = newSession(readyProfile(), {fireEnabled: false});
  off.start();
  const zone = off.view().zone;
  const log = run(off, 90, view => pilot(view, {x: zone.x, z: zone.z, y: zone.y + 45}));
  ok(!has(log, 'fireCall') && !fireOf(off.profile), 'no call and no fire with the switch off');
  same([off.pressRadio(), off.fitBucket().ok], [false, false], 'no radio and no bucket');
  same([off.view().bucket, off.view().fire], [null, null], 'nothing in the view');
}

// ---- Neglect: the course burns, closes and is bought back ------------------------
{
  let profile = readyProfile();
  const opened = openCall(missionsOf(profile), {playDay: 5, conditions: {fire: ['tremblant-woods']}});
  profile = setMissions(profile, opened.missions, on).profile;
  const fire = startFire({id: opened.call.id, courseId: 'tremblant-woods', grid: world.grid, seed: opened.seed, startDay: 5,
    candidates: startCells(woods.course, woods.ground, world.grid, [])});
  profile = setFire(profile, fire, on).profile;
  let days = 0;
  for (let n = 1; n <= 20 && fireOf(profile); n++) {
    profile = notePlayDay(profile, `2026-11-${String(n).padStart(2, '0')}`, on).profile;
    profile = fireOnNewDay(profile, {enabled: true, world}).profile;
    days = n;
  }
  ok(!fireOf(profile) && days >= 3 && days <= 6, `a fire left alone is lost on play day ${days}`);
  const today = heliOf(profile).playDay.count;
  same(heliOf(profile).burnt['tremblant-woods'], {day: today, boughtBack: false}, 'the course burns that play day');
  ok(courseClosed(profile, 'tremblant-woods', undefined, on) && buybackPrice(profile, 'tremblant-woods', undefined, on) === 10_000, 'closed, 10,000 to buy back');
  same([missionsOf(profile).call, missionsOf(profile).count], [null, 0], 'the mission ends with no pay');
  ok(!courseClosed(profile, 'tremblant-snow', undefined, on), 'Tremblant Snow stays open');
}

// ---- Sarah's regrowth news: once per stage, at the first visit ------------------
{
  // Tremblant Woods burnt on play day 8; a visit on play day count.
  const visit = (count, burn = {day: 8, boughtBack: false}) => {
    const base = readyProfile();
    const profile = {...base, heli: {...heliOf(base), playDay: {last: DAY, count}, burnt: {'tremblant-woods': burn}}};
    const session = newSession(profile);
    const events = [...session.start(), ...session.step({})];
    return {events, heard: heliOf(session.profile).burnt['tremblant-woods'].heard, session};
  };
  const closed = visit(12);
  same(lines(closed.events).filter(line => line.startsWith('heli.radio.burn.')), [], 'closed (day 4 of the burn): no news yet');
  same(closed.heard, undefined, 'and nothing heard');
  const black = visit(18);
  same(lines(black.events).filter(line => line.startsWith('heli.radio.burn.')), ['heli.radio.burn.reopen'], 'reopened (day 10): "The burnt woods are open again"');
  same(black.heard, 'reopen', 'saved as heard');
  const again = newSession(black.session.profile);
  same(lines([...again.start(), ...again.step({})]).filter(line => line.startsWith('heli.radio.burn.')), [], 'the next visit of the same stage says nothing');
  same(lines(visit(30).events).filter(line => line.startsWith('heli.radio.burn.')), ['heli.radio.burn.shoots'], 'shoots (day 22)');
  same(lines(visit(45).events).filter(line => line.startsWith('heli.radio.burn.')), ['heli.radio.burn.fireweed'], 'fireweed (day 37), even with the earlier news missed');
  same(lines(visit(70).events).filter(line => line.startsWith('heli.radio.burn.')), [], 'healed (day 62): nothing');
  same(lines(visit(12, {day: 8, boughtBack: true}).events).filter(line => line.startsWith('heli.radio.burn.')), ['heli.radio.burn.reopen'],
    'bought back early: open again at once');
  const off = createHeliSession({profile: {...readyProfile(), heli: {...heliOf(readyProfile()), playDay: {last: DAY, count: 18},
    burnt: {'tremblant-woods': {day: 8, boughtBack: false}}}}, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: false,
    playerName: 'Fire QA', today: DAY, carId: 'falcone_f42'});
  same(lines([...off.start(), ...off.step({})]).filter(line => line.startsWith('heli.radio.burn.')), [], 'switch off: no news');
  // The save keeps news only forward and only for a burn.
  let profile = black.session.profile;
  same(hearBurnNews(profile, 'tremblant-woods', 'reopen', on).already, true, 'the same news again changes nothing');
  profile = hearBurnNews(profile, 'tremblant-woods', 'fireweed', on).profile;
  same(heliOf(hearBurnNews(profile, 'tremblant-woods', 'shoots', on).profile).burnt['tremblant-woods'].heard, 'fireweed', 'news never goes back');
  same(hearBurnNews(profile, 'tremblant-snow', 'reopen', on).ok, false, 'a course with no burn has no news');
  same(hearBurnNews(profile, 'tremblant-woods', 'smoke', on).ok, false, 'only the three pieces of news');
  same(hearBurnNews(profile, 'tremblant-woods', 'fireweed', {enabled: false}).ok, false, 'switch off: nothing saved');
  // A bought-back burn keeps its news; a new burn starts with none.
  const rich = {...profile, credits: 50_000};
  same(heliOf(buyBack(rich, 'tremblant-woods', on).profile ?? rich).burnt['tremblant-woods'].heard, 'fireweed', 'a buyback keeps the news heard');
  same(Object.hasOwn(heliOf(burnCourse(profile, 'tremblant-woods', heliOf(profile).playDay.count, on).profile).burnt['tremblant-woods'], 'heard'), false,
    'the course burning again starts with no news heard');
}

// ---- The app: race start, buyback, play days and the switch ----------------------
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; }};
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  try {
    const makeApp = fire => {
      const app = new App();
      app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter: true, 'forest-fire': fire}, qa: true}), () => app.duel.state);
      return app;
    };
    const stage = COURSE.findIndex(course => course.id === 'tremblant-woods');
    const burnt = app => {
      app.profile = {...app.profile, credits: 12_000, courses: {version: 1, unlocked: ['pacific-canyon', 'tremblant-woods']},
        heli: {...heliOf(app.profile), playDay: {last: '2026-10-20', count: 9}, burnt: {'tremblant-woods': {day: 6, boughtBack: false}}}};
      app._saveProfile();
    };
    const app = makeApp(true);
    burnt(app);
    ok(app.startCampaign({startStage: stage, car: 'falcone_f42'}) === false, 'a closed course refuses the race');
    same(app.courseAccessMessage, 'Tremblant Woods is closed after a forest fire.', 'with the reason');
    const bought = app.buyBackCourse('tremblant-woods');
    same([bought.ok, bought.price, app.profile.credits], [true, 7_000, 5_000], 'bought back on play day 3 for 7,000');
    ok(app.startCampaign({startStage: stage, car: 'falcone_f42'}) !== false, 'then the race starts');
    app.returnToMenu();
    const offApp = makeApp(false);
    burnt(offApp);
    ok(offApp.startCampaign({startStage: stage, car: 'falcone_f42'}) !== false, 'switch off: nothing is closed');
    offApp.returnToMenu();
    same(offApp.buyBackCourse('tremblant-woods').ok, false, 'and there is nothing to buy back');
    // The main menu says why START is closed on a burnt course, instead of a dead button.
    {
      const {createRendererReadiness} = await import('../src/screen-readiness.js');
      const menu = makeApp(true);
      burnt(menu);
      const line = {textContent: 'COURSE LINE', dataset: {}};
      const ui = {view3d: {dataset: {}, classList: {add() {}}}, 'renderer-loading': {hidden: false, lastChild: {textContent: ''}},
        'renderer-error': {hidden: true, querySelector: () => ({textContent: ''})},
        'start-engine': {disabled: false, parentElement: {querySelector: () => line}}};
      const choices = {car: 'falcone_f42', startStage: stage};
      menu.menuCar = 'falcone_f42';
      const ready = createRendererReadiness({app: menu, ui, choices, profile: () => menu.profile, isDisposed: () => false,
        importRenderer: async () => ({attachRenderer: () => ({prepareVehicle(key) { ui.view3d.dataset.vehicleKey = key; ui.view3d.dataset.vehicleAsset = 'ready'; }, dispose() {}})})});
      await ready.ensureRenderer();
      same(line.textContent, 'Tremblant Woods is closed after a forest fire. It reopens in 7 play days, or buy it back in Your Courses.',
        'the line under START says the course is closed, for how long, and where to buy it back');
      ok(ui['start-engine'].disabled, 'and START is closed');
      menu.buyBackCourse('tremblant-woods');
      ready.syncRendererReadiness(menu.duel.state);
      ok(line.textContent === 'COURSE LINE' && !ui['start-engine'].disabled, 'bought back: the line comes back and START opens');
      const off = makeApp(false);
      burnt(off);
      const offLine = {textContent: 'COURSE LINE', dataset: {}};
      ui['start-engine'] = {disabled: false, parentElement: {querySelector: () => offLine}};
      const offReady = createRendererReadiness({app: off, ui, choices, profile: () => off.profile, isDisposed: () => false,
        importRenderer: async () => ({attachRenderer: () => ({prepareVehicle(key) { ui.view3d.dataset.vehicleKey = key; ui.view3d.dataset.vehicleAsset = 'ready'; }, dispose() {}})})});
      await offReady.ensureRenderer();
      ok(offLine.textContent === 'COURSE LINE', 'switch off: no closed note');
    }
    // A new date counts a play day when a flying player becomes active.
    const day = makeApp(true);
    burnt(day);
    const before = heliOf(day.profile).playDay.count;
    ok(day._noteFirePlayDay('2026-10-21') && heliOf(day.profile).playDay.count === before + 1, 'a new date is a play day');
    ok(!day._noteFirePlayDay('2026-10-21'), 'once per date');
    const never = makeApp(true);
    never.profile = {...createProfile()};
    ok(!never._noteFirePlayDay('2026-10-22') && !Object.hasOwn(never.profile, 'heli'), 'a player who never flew gains no helicopter field');
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  }
}

console.log(`test-heli-fire-session: ${checks} checks passed`);
