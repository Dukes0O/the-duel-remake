// SKIN-HOOKS (docs/HELI_WILDLIFE.md sections 5.2, 6 and 7): skins, gear, dirt,
// the wash and the wildlife count wired into the helicopter session and board.
// Part 1 pins what the session did before this card (fingerprints taken on
// 91ab8a10, before any change) and proves the session is the same with the
// heli-skins and wildlife switches off. Memory only: no real save is read or
// written, and nothing here uses a clock or Math.random.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession, courseSite} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {heliOf, missionsOf, setMissions, createMissions} from '../src/heli/heli-save.js';
import {dispatchBoardMarkup, handleBoardAction} from '../src/heli/heli-board.js';
import {dayJobs, bearing} from '../src/heli/heli-jobs.js';
import {hikerSpots, pickHiker, hoistSpots, pickHoist} from '../src/heli/heli-search.js';
import {surveyJob} from '../src/heli/heli-survey.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';
import * as wildlife from '../src/wildlife.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags} from '../src/wasteland-access.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

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

function pilot(view, target, {speed = 12, sink = 4} = {}) {
  const h = view.heli;
  const fwdX = Math.sin(h.heading), fwdZ = Math.cos(h.heading), rightX = -fwdZ, rightZ = fwdX;
  const dx = target.x - h.x, dz = target.z - h.z, distance = Math.hypot(dx, dz);
  const want = Math.min(speed, distance * 0.4);
  const wx = distance > 0.01 ? dx / distance * want : 0, wz = distance > 0.01 ? dz / distance * want : 0;
  const ex = wx - h.vx, ez = wz - h.vz;
  const clamp = v => Math.max(-1, Math.min(1, v));
  return {pitch: clamp((ex * fwdX + ez * fwdZ) * 0.25), roll: clamp((ex * rightX + ez * rightZ) * 0.25),
    lift: clamp(Math.max(-sink, Math.min(sink, target.y - h.y)) * 0.3 - h.vy * 0.3), yaw: 0};
}
function run(session, seconds, controls, until = null, dt = undefined) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / (dt ?? 1 / 120)); i++) {
    events.push(...session.step(controls(session.view()), dt));
    if (until?.(session.view(), events)) break;
  }
  return events;
}
const has = (events, type) => events.some(event => event.type === type);
const lines = events => events.filter(event => event.type === 'radio').map(event => event.line);

function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const DAY = '2026-10-20';
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
function readyProfile({count = 5, credits = 2000, name = 'Skin QA', extra = {}, heli = {}} = {}) {
  const profile = normalizeProfile({...createProfile(), credits, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: TRAINED, refuels: 3, playDay: {last: DAY, count}, ...heli}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: name});
  return setMissions(profile, {...armed, count: armed.need, ...extra}, on).profile;
}
function callProfile(kind, courseId, options = {}) {
  const base = readyProfile(options), armed = missionsOf(base);
  return setMissions(base, {...armed, call: {kind, id: `${kind}-${armed.draws}`, courseId, day: heliOf(base).playDay.count, answered: false}}, on).profile;
}
const sessionOptions = (profile, extra = {}) => ({profile, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true,
  rescueEnabled: true, playerName: 'Skin QA', today: DAY, carId: 'falcone_f42', ...extra});

// ---- Part 1: scenarios whose results must not move with the switches off ----
// Each returns a text of everything the session said and kept.
function snapshot(session, events) {
  return [JSON.stringify(events), JSON.stringify(heliOf(session.profile)), String(session.profile.credits), JSON.stringify(session.view()),
    dispatchBoardMarkup(session.view(), {jobs: session.boardJobs(), offer: session.raceHereOffer(), fire: {repairCost: 0}}), session.fingerprint()].join('\n');
}
// Over a car on the ground, steady at hook height.
function hookOver(session, car) {
  const goal = {x: car.x, z: car.z, y: car.y + 15.3};
  return run(session, 90, v => pilot(v, goal, {speed: 6, sink: 3}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 1 && Math.abs(v.heli.y - goal.y) < 0.4 && Math.hypot(v.heli.vx, v.heli.vz, v.heli.vy) < 0.5);
}
function carJobScenario(extra = {}) {
  const session = createHeliSession(sessionOptions(readyProfile({credits: 3000}), extra));
  const events = [...session.start()];
  const job = dayJobs(heliOf(session.profile).playDay.count)[0];
  session.takeJob(job.id); events.push(...session.takeEvents());
  const own = session.view().loads.find(c => c.own);
  events.push(...run(session, 4, () => ({})));
  if (own) {
    events.push(...hookOver(session, own));
    session.pressHook(); events.push(...session.takeEvents());
    events.push(...run(session, 12, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 24}, {speed: 6})));
  }
  const out = snapshot(session, events);
  session.leave();
  return out + JSON.stringify(heliOf(session.profile));
}
function rescueScenario(kind, courseId, extra = {}) {
  const session = createHeliSession(sessionOptions(callProfile(kind, courseId, {count: 30}), extra));
  const events = [...session.start()];
  session.pressRadio(); events.push(...session.takeEvents());
  session.fitRescueLine(); session.fitBucket(); events.push(...session.takeEvents());
  events.push(...run(session, 40, () => ({lift: 0.2})));
  events.push(...run(session, 25, v => pilot(v, {x: v.zone.x + 30, z: v.zone.z, y: v.zone.y + 30}, {speed: 8})));
  const out = snapshot(session, events);
  session.leave();
  return out + JSON.stringify(heliOf(session.profile));
}
function supplyScenario(extra = {}) {
  const session = createHeliSession(sessionOptions(callProfile('supply', 'tremblant-snow', {count: 30}), extra));
  const events = [...session.start()];
  session.pressRadio(); events.push(...session.takeEvents());
  const crate = session.view().rescue.crates[0];
  events.push(...run(session, 2, () => ({})));
  events.push(...hookOver(session, crate));
  session.pressHook(); events.push(...session.takeEvents());
  events.push(...run(session, 12, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 26}, {speed: 6})));
  const out = snapshot(session, events);
  session.leave();
  return out + JSON.stringify(heliOf(session.profile));
}
function fireScenario(extra = {}) {
  const session = createHeliSession(sessionOptions(readyProfile({count: 3}), extra));
  const events = [...session.start()];
  const zone = session.view().zone;
  events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'fireCall')));
  session.pressRadio(); events.push(...session.takeEvents());
  events.push(...run(session, 10, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45})));
  events.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 4}), v => v.heli.onGround));
  session.fitBucket(); session.buyFuel(Infinity); events.push(...session.takeEvents());
  events.push(...run(session, 5, () => ({pour: true})));
  const out = snapshot(session, events);
  session.leave();
  return out;
}
function scenarioHashes(extra = {}) {
  return {
    carJob: hash(carJobScenario(extra)),
    hiker: hash(rescueScenario('hiker', 'tremblant-woods', extra)),
    avalanche: hash(rescueScenario('avalanche', 'tremblant-snow', extra)),
    hoist: hash(rescueScenario('hoist', 'panorama-ridge', extra)),
    supply: hash(supplyScenario(extra)),
    fire: hash(fireScenario(extra)),
  };
}

// Taken on 91ab8a10 (RESCUE-AUTOPILOT's merge), before this card changed the
// session: a car job, the three rescues with the line fitted, a supply hook and
// a fire day, each with the events, save, view, board and fingerprint hashed.
// RESCUE-FINISH re-records hiker clue, hoist site/clock and supply clock only.
const BEFORE = {carJob: 2639427997, hiker: 75325398, avalanche: 382890534, hoist: 3958087009, supply: 1425980116, fire: 1685599464};
{
  same(scenarioHashes(), BEFORE, 'with no skin or wildlife switch the session is exactly what it was');
  same(scenarioHashes({skinsEnabled: false, wildlifeEnabled: false}), BEFORE, 'and with both switches off');
  same(scenarioHashes({skinsEnabled: 'yes', wildlifeEnabled: 1, wildlife: {}, surveyStand: () => null}), BEFORE, 'only true turns either on');
}
console.log('PASS the switches off keep the session exact');

// ---- Part 2: the paint shop, buying, wearing, the wash ----------------------
// A trained pilot at the pad. `owned`/`worn`/`fresh` are the saved skins; `missions` are merged
// into the mission record (with the secret count at 0 so no call rings); `dirt` the four levels.
function skinProfile({owned = [], worn = 'stock', fresh = [], credits = 3000, missions = {}, dirt = null, day = 5, fuelKg = 400} = {}) {
  const heli = {fuelKg, skins: {owned, worn, fresh}, ...(dirt ? {dirt} : {})};
  return readyProfile({count: day, credits, heli, extra: {count: 0, ...missions}});
}
const newSkinSession = (profile, extra = {}) => createHeliSession(sessionOptions(profile, {skinsEnabled: true, ...extra}));
const skinsOfSave = session => heliOf(session.profile).skins;
const dirtOfSave = session => heliOf(session.profile).dirt;
const EMPTY_DIRT = {dust: 0, mud: 0, soot: 0, salt: 0};
const idle = (session, seconds, dt = 0.05) => run(session, seconds, () => ({}), null, dt);
const climbOff = session => run(session, 6, () => ({lift: 0.7}), v => v.heli.y - v.zone.y > 5);

// Missions done before H3 count: the fifth of a kind earns its skin at the start, with Brian's line once.
{
  const session = newSkinSession(skinProfile({missions: {firesOut: 5, hoists: 7, searches: 4}}));
  const events = session.start();
  const earned = events.filter(event => event.type === 'skinEarned');
  same(earned.map(event => [event.kind, event.first]), [['fire', true], ['medevac', true]], 'fire (5) and medevac (7) are earned at once, search (4) is not');
  same(lines(events), ['heli.radio.skin.earned'], 'Brian says it once, for the first coat');
  same(skinsOfSave(session), {owned: ['fire', 'medevac'], worn: 'stock', fresh: ['fire', 'medevac']}, 'saved owned and fresh, still stock paint');
  const shop = session.paintShop();
  ok(/New coat of paint: Fire service, Medevac/.test(shop.note), 'the board carries a note');
  same(shop.rows.map(row => [row.kind, row.owned, row.worn, row.fresh]),
    [['stock', true, true, false], ['fire', true, false, true], ['medevac', true, false, true], ['rescue', false, false, false],
      ['wildlife', false, false, false], ['supply', false, false, false], ['tv', false, false, false]], 'the paint shop rows');
  same(shop.rows.find(row => row.kind === 'rescue'), {kind: 'rescue', name: 'Search and rescue', tally: 4, need: 5, owned: false, worn: false, fresh: false,
    price: 900, buy: true, canAfford: true}, 'the tally toward a coat (4 of 5) and its price (900, the floor)');
  ok(!session.view().skins.gear.litreGauge && session.view().skins.worn === 'stock', 'earned is not worn: no gear yet');
  // Coming back the same day says nothing more (the coat is already owned).
  const again = newSkinSession(session.profile);
  same(again.start().filter(event => event.type === 'skinEarned'), [], 'a coat is earned once');
  // A later fifth coat is not the first: no second line.
  const more = newSkinSession(setMissions(session.profile, {...missionsOf(session.profile), searches: 5}, on).profile);
  const later = more.start();
  same([later.filter(event => event.type === 'skinEarned').map(event => [event.kind, event.first]), lines(later)], [[['rescue', false]], []], 'the second coat has no line');
}
console.log('PASS coats are earned from the missions done');

// Wearing: free, at the pad, a fresh coat zeroes the dirt once.
{
  const session = newSkinSession(skinProfile({owned: ['fire', 'medevac'], fresh: ['fire'], dirt: {dust: 30, mud: 20, soot: 10, salt: 0}}));
  session.start();
  same(session.wearPaint('medevac').ok, true, 'wear an owned coat');
  const worn = session.takeEvents();
  same(worn.filter(event => event.type === 'skinWorn'), [{type: 'skinWorn', kind: 'medevac', freshCoat: false, fadeSeconds: 1.5}], 'it fades in over 1.5 s, not a fresh coat');
  same([skinsOfSave(session).worn, dirtOfSave(session), session.profile.credits], ['medevac', {dust: 30, mud: 20, soot: 10, salt: 0}, 3000], 'worn, dirt kept, free');
  same(session.wearPaint('medevac').already, true, 'wearing what is worn changes nothing');
  same(session.takeEvents().filter(event => event.type === 'skinWorn'), [], 'and says nothing');
  session.wearPaint('fire'); session.takeEvents();
  same([skinsOfSave(session), dirtOfSave(session)], [{owned: ['fire', 'medevac'], worn: 'fire', fresh: []}, EMPTY_DIRT], 'a fresh coat starts clean, once');
  session.wearPaint('medevac'); session.wearPaint('fire');
  same(skinsOfSave(session).worn, 'fire', 'back to it later is no new coat');
  same(session.wearPaint('supply').ok, false, 'a coat not owned is refused');
  same(session.wearPaint('stock').ok, true, 'stock paint is always there');
  // Not at the pad: refused.
  const air = newSkinSession(skinProfile({owned: ['fire']}));
  air.start();
  climbOff(air);
  same([air.wearPaint('fire').ok, air.view().heli.onGround], [false, false], 'the paint shop is on the ground at the pad');
}
console.log('PASS wearing a coat');

// Buying: the whole price once, only at the pad, never twice.
{
  const profile = skinProfile({credits: 3000, missions: {firesOut: 3}});
  const session = newSkinSession(profile);
  session.start();
  const row = kind => session.paintShop().rows.find(r => r.kind === kind);
  same([row('fire').price, row('medevac').price, row('tv').price], [1300, 2500, 2500], 'fire 3 of 5: 2500 less 3 x 400; medevac none done; the TV coat 2500');
  const bought = session.buyPaint('fire');
  same([bought.ok, bought.price, session.profile.credits], [true, 1300, 1700], 'bought: 1,300 credits, once');
  same(skinsOfSave(session), {owned: ['fire'], worn: 'stock', fresh: ['fire']}, 'owned and fresh, not yet worn');
  same(session.buyPaint('fire').ok, false, 'a second buy is refused');
  same(session.profile.credits, 1700, 'and nothing more is charged');
  same(session.takeEvents().filter(event => event.type === 'skinBought').length, 1, 'one purchase event');
  const poor = session.buyPaint('medevac');
  same([poor.ok, poor.reason, session.profile.credits], [false, 'You need 800 more credits.', 1700], 'too poor: refused with the shortfall, nothing taken');
  same(session.buyPaint('stock').ok, false, 'stock paint cannot be bought');
  same(session.buyPaint('nothing').ok, false, 'nor a name that is not a coat');
  // The persist callback sees the credits change once.
  const seen = [];
  const watched = newSkinSession(profile, {persist: saved => seen.push(saved.credits)});
  watched.start();
  seen.length = 0;
  watched.buyPaint('fire');
  same(seen, [1700], 'one save with the price taken once');
  // A coat whose five missions are done is free, not sold.
  const earned = newSkinSession(skinProfile({missions: {firesOut: 5}}));
  earned.start();
  same([earned.buyPaint('fire').ok, earned.profile.credits], [false, 3000], 'an earned coat is not bought');
  // Away from the pad.
  const air = newSkinSession(profile);
  air.start();
  climbOff(air);
  same([air.buyPaint('fire').ok, air.profile.credits], [false, 3000], 'not bought in the air');
}
console.log('PASS buying a coat');

// The wash: 100 credits, on the ground at the pad, everything back to 0.
{
  const dirty = {dust: 40, mud: 25, soot: 10, salt: 7};
  const session = newSkinSession(skinProfile({credits: 500, dirt: dirty}));
  session.start();
  const shop = session.paintShop();
  same([shop.grime, shop.wash.can, shop.wash.hint], [82, true, true], 'grime 82 of 100: the wash is open and Brian would suggest it');
  const washed = session.washHelicopter();
  same([washed.ok, washed.price, session.profile.credits, dirtOfSave(session)], [true, 100, 400, EMPTY_DIRT], 'washed: 100 credits, all four back to 0');
  const events = session.takeEvents();
  same([events.filter(event => event.type === 'washed'), lines(events), events.filter(event => event.type === 'cue').map(event => event.id)],
    [[{type: 'washed', price: 100}], ['heli.radio.wash.done'], ['heli.wash']], 'the pressure washer and Brian');
  same([session.washHelicopter().ok, session.profile.credits], [false, 400], 'a clean helicopter is not washed or charged');
  // Poor, and in the air.
  const poor = newSkinSession(skinProfile({credits: 60, dirt: dirty}));
  poor.start();
  same([poor.washHelicopter().ok, poor.profile.credits, poor.paintShop().wash.can], [false, 60, false], 'too poor: nothing taken');
  const air = newSkinSession(skinProfile({credits: 500, dirt: dirty}));
  air.start();
  climbOff(air);
  same([air.washHelicopter().ok, air.profile.credits], [false, 500], 'not in the air');
  // A dirty helicopter flies like a clean one.
  const fly = dirt => {
    const s = newSkinSession(skinProfile({dirt}));
    const log = [...s.start(), ...run(s, 6, v => pilot(v, {x: v.zone.x + 40, z: v.zone.z, y: v.zone.y + 30}, {speed: 8}))];
    return [JSON.stringify(log), s.fingerprint()];
  };
  same(fly(dirty), fly(EMPTY_DIRT), 'a filthy helicopter flies the same as a clean one');
}
console.log('PASS the wash');

// ---- Part 3: dirt builds per flight from the session's tally -------------------
const woods = loadCourse('tremblant-woods'), ridge = loadCourse('panorama-ridge');
// A level, clear spot a few metres off the pad's ring, for a landing off the pad.
function spotOffPad(world, zone) {
  for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12, x = zone.x + Math.cos(a) * 24, z = zone.z + Math.sin(a) * 24;
    const y = world.ground.height(x, z);
    const flat = [[3, 0], [-3, 0], [0, 3], [0, -3]].every(([dx, dz]) => Math.abs(world.ground.height(x + dx, z + dz) - y) < 0.4);
    if (flat && world.ground.near(x, z, 8).length === 0) return {x, z, y};
  }
  throw new Error('no level spot beside the pad');
}
// Up, over to a spot and down onto it; on the pad or off it.
function flyAndLand(session, world, spot) {
  const events = [];
  events.push(...run(session, 30, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 14}, {speed: 1}), v => v.heli.y > v.zone.y + 10));
  events.push(...run(session, 60, v => pilot(v, {x: spot.x, z: spot.z, y: spot.y + 14}, {speed: 6}),
    v => Math.hypot(v.heli.x - spot.x, v.heli.z - spot.z) < 1.5 && Math.hypot(v.heli.vx, v.heli.vz) < 0.4));
  events.push(...run(session, 90, v => pilot(v, {x: spot.x, z: spot.z, y: spot.y - 2}, {speed: 1, sink: 1.2}), v => v.heli.onGround));
  return events;
}
{
  // Engine time anywhere: 1 per 10 minutes, the same at any step size, settled when the visit ends.
  const hours = dt => { const s = newSkinSession(skinProfile()); s.start(); idle(s, 1250, dt); s.leave(); return dirtOfSave(s); };
  same(hours(0.05), {dust: 2, mud: 0, soot: 0, salt: 0}, '1,250 s of engine time is 2 dust');
  same(hours(0.025), hours(0.05), 'and the same with steps half as long');
  same(hours(1 / 120).dust, 2, 'and at the flight step');
}
{
  // A landing off the pad at the Woods is 3 mud; back on the pad adds none. The dirt is saved at the landing.
  const session = newSkinSession(skinProfile());
  session.start();
  const off = spotOffPad(woods, session.view().zone);
  const log = flyAndLand(session, woods, off);
  ok(has(log, 'touchdown') && session.view().heli.onGround, 'landed off the pad');
  same(dirtOfSave(session), {dust: 0, mud: 3, soot: 0, salt: 0}, 'mud 3 at once, in the save');
  const onPad = flyAndLand(session, woods, {x: session.view().zone.x, z: session.view().zone.z, y: session.view().zone.y});
  ok(has(onPad, 'touchdown'), 'and back on the pad');
  same(dirtOfSave(session), {dust: 0, mud: 3, soot: 0, salt: 0}, 'a landing on the pad adds nothing');
  same(session.view().skins.dirt, {dust: 0, mud: 3, soot: 0, salt: 0}, 'the view shows the levels');
  session.leave();
  // Saved on the profile that goes back to the app (persist sees it).
  ok(heliOf(session.profile).dirt.mud === 3, 'on the profile');
}
{
  // Panorama Ridge: dust 2 for a landing off the pad, and 1 per 2 minutes below 30 m.
  const session = newSkinSession(skinProfile());
  session.start('panorama-ridge');
  const off = spotOffPad(ridge, session.view().zone);
  flyAndLand(session, ridge, off);
  same(dirtOfSave(session), {dust: 2, mud: 0, soot: 0, salt: 0}, 'dust 2 for a landing off the pad at Panorama Ridge');
  run(session, 20, v => pilot(v, {x: off.x, z: off.z, y: off.y + 6}, {speed: 1}), v => v.heli.y > off.y + 3);
  idle(session, 250);   // hovering low: 250 s below 30 m is 2 more
  session.leave();
  same(dirtOfSave(session).dust, 4, 'and 1 per 2 minutes low (250 s is 2, the rest carries)');
}
{
  // A dirty coat that passes 80 hears Brian once.
  const session = newSkinSession(skinProfile({dirt: {dust: 40, mud: 38, soot: 0, salt: 0}}));
  session.start();
  const off = spotOffPad(woods, session.view().zone);
  const log = flyAndLand(session, woods, off);
  same([dirtOfSave(session).mud, lines(log).filter(line => line === 'heli.radio.wash.hint').length], [41, 1], '78 plus 3 mud passes 80: Brian suggests the wash once');
  flyAndLand(session, woods, {x: session.view().zone.x, z: session.view().zone.z, y: session.view().zone.y});
  const more = flyAndLand(session, woods, off);
  same(lines(more).filter(line => line === 'heli.radio.wash.hint').length, 0, 'not again while she stays dirty');
  same(session.paintShop().wash.hint, true, 'the paint shop still shows it');
  // A full coat: new dirt goes on and old comes off the largest.
  const full = newSkinSession(skinProfile({dirt: {dust: 60, mud: 40, soot: 0, salt: 0}}));
  full.start();
  flyAndLand(full, woods, spotOffPad(woods, full.view().zone));
  same(dirtOfSave(full), {dust: 57, mud: 43, soot: 0, salt: 0}, 'at 100 the 3 new mud takes 3 levels from the dustiest, the grime stays 100');
}
console.log('PASS dirt builds from the flight and is saved');

// ---- One real fire trip: the fire service coat, the bucket, soot and mud ------------
function fireLegHeight(from, to) {
  let top = -Infinity;
  for (let k = 0; k <= 40; k++) top = Math.max(top, woods.ground.highest(from.x + (to.x - from.x) * k / 40, from.z + (to.z - from.z) * k / 40, 8));
  return top + 15 + 19;
}
function fireTravel(session, goal, finalY, {speed = 22} = {}) {
  const view = session.view(), high = Math.max(finalY, fireLegHeight(view.heli, goal)), events = [];
  events.push(...run(session, 60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > high - 3));
  events.push(...run(session, 300, v => pilot(v, {x: goal.x, z: goal.z, y: high}, {speed}),
    v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 1));
  const sinkAt = v => Math.max(1.5, Math.min(6, (v.heli.y - finalY) / 6));
  events.push(...run(session, 180, v => pilot(v, {x: goal.x, z: goal.z, y: finalY}, {speed: 2, sink: sinkAt(v)}),
    v => Math.abs(v.heli.y - finalY) < 0.6 && Math.abs(v.heli.vy) < 0.4));
  return events;
}
// Answer the fire, fit the bucket (with the matching coat when asked), scoop once and drop once.
function fireTrip({worn = 'stock', owned = [], wearWithFit = false} = {}) {
  const session = newSkinSession(readyProfile({count: 3, heli: {skins: {owned, worn, fresh: owned.filter(kind => kind !== worn)}}}));
  const log = [...session.start()], zone = session.view().zone;
  log.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 45}), (v, got) => has(got, 'fireCall')));
  session.pressRadio(); log.push(...session.takeEvents());
  log.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y - 2}, {speed: 4}), v => v.heli.onGround));
  const fit = session.fitBucket({wear: wearWithFit});
  log.push(...session.takeEvents());
  const lake = woods.course.def.basins[0], middle = woods.course.worldAt(woods.course.phase(lake.s), lake.lateral);
  const surface = woods.ground.water(middle.x, middle.z);
  log.push(...fireTravel(session, middle, surface + 25));
  log.push(...run(session, 60, v => pilot(v, {x: middle.x, z: middle.z, y: surface + 17.6}, {speed: 2}), v => v.bucket?.words === 'full'));
  const full = session.view().bucket;
  const first = session.view().fire.target;
  log.push(...fireTravel(session, first, woods.ground.height(first.x, first.z) + 60));
  log.push(...run(session, 300, v => {
    const goal = v.fire?.target ?? first, aim = v.bucket?.aim, lead = aim ? {x: aim.x - v.bucket.x, z: aim.z - v.bucket.z} : {x: 0, z: 0};
    return pilot(v, {x: goal.x - lead.x, z: goal.z - lead.z, y: woods.ground.height(goal.x, goal.z) + 60}, {speed: 3});
  }, v => { const goal = v.fire?.target, aim = v.bucket?.aim; return !goal || aim && Math.hypot(aim.x - goal.x, aim.z - goal.z) < 4 && Math.hypot(v.heli.vx, v.heli.vz) < 1.5; }));
  const aimed = session.view().bucket;
  log.push(...run(session, 6, v => ({...pilot(v, {x: v.heli.x, z: v.heli.z, y: woods.ground.height(v.heli.x, v.heli.z) + 60}, {speed: 1}), pour: true}), v => (v.bucket?.water ?? 0) <= 0.5));
  log.push(...run(session, 6, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: woods.ground.height(v.heli.x, v.heli.z) + 60}, {speed: 1}), v => !v.bucket?.parcels.length));
  return {session, log, fit, full, aimed};
}
{
  const stock = fireTrip();
  ok(has(stock.log, 'bucketDip') && has(stock.log, 'fireHiss'), 'the stock trip dips and hisses');
  ok(!('reading' in stock.full) && !('sight' in stock.aimed), 'stock paint: no gauge, no sight');
  const coat = fireTrip({owned: ['fire'], worn: 'fire'});
  ok(/^\d+ L$/.test(coat.full.reading.text) && coat.full.reading.litres > 0, `the water gauge reads litres: ${coat.full.reading.text}`);
  ok(coat.aimed.sight && Math.hypot(coat.aimed.sight.x - coat.aimed.aim.x, coat.aimed.sight.z - coat.aimed.aim.z) < 1e-9, 'the drop sight is the centre of the aim ring');
  // At the pad the board's bucket line shows the litres instead of the word.
  const view = coat.session.view(), padView = {...view, heli: {...view.heli, onGround: true, x: view.zone.x, z: view.zone.z}, bucket: coat.full};
  ok(dispatchBoardMarkup(padView, {fire: {repairCost: 0}}).includes(`Bucket: ${coat.full.reading.text}`), 'the board shows the litres');
  ok(dispatchBoardMarkup({...padView, bucket: stock.full}, {fire: {repairCost: 0}}).includes('Bucket: full'), 'and the word on stock paint');
  // Same flight either way: the coat adds looks and gauges, never changes the physics.
  same([coat.session.fingerprint(), JSON.stringify(coat.log.filter(event => event.type !== 'skinEarned'))], [stock.session.fingerprint(), JSON.stringify(stock.log)],
    'the fire service coat flies and drops the same as stock paint');
  coat.session.leave();
  const dirt = dirtOfSave(coat.session);
  ok(dirt.mud >= 1 && dirt.soot >= 2, `a dip is mud and a drop on the fire is soot: ${JSON.stringify(dirt)}`);
  // Fit and wear in one click.
  const together = fireTrip({owned: ['fire'], wearWithFit: true});
  ok(together.fit.ok && skinsOfSave(together.session).worn === 'fire' && has(together.log, 'skinWorn'), 'Fit the bucket and wear Fire service: one click, both done');
}
console.log('PASS a fire trip: gauge, sight, mud and soot');

// ---- Part 4: the fit buttons offer the matching coat, and the board ---------------
{
  const session = newSkinSession(skinProfile({owned: ['fire', 'medevac', 'rescue', 'wildlife'], worn: 'stock'}));
  session.start();
  same(session.paintShop().offers, {bucket: 'fire', line: 'medevac', survey: 'wildlife'}, 'with the coats owned, each fit button has an offer (the line: medevac until a search is in hand)');
  const view = session.view(), padView = {...view};
  const markup = dispatchBoardMarkup(padView, {jobs: session.boardJobs(), fire: {repairCost: 0}, skins: session.paintShop()});
  ok(markup.includes('data-heli-board="bucket-fit-wear"') && markup.includes('Fit the bucket and wear Fire service'), 'the board offers "Fit the bucket and wear Fire service"');
  ok(markup.includes('data-heli-board="bucket-fit"'), 'next to the plain fit');
  ok(markup.includes('Paint shop') && markup.includes('data-heli-board="paint-wear:medevac"') && markup.includes('Wash: 100 credits'), 'and the paint shop with its wash');
  ok(markup.includes('Wearing') && !/Search and rescue \d\/5/.test(markup), 'stock is worn; owned coats show no tally');
  const events = [];
  const answer = handleBoardAction('bucket-fit-wear', {heliSession: session, _heliEvents: got => events.push(...got)});
  ok(answer.ok && has(events, 'bucketFitted') && has(events, 'skinWorn'), 'one click fits the bucket and wears the coat');
  same(skinsOfSave(session).worn, 'fire', 'the fire service coat is on');
  same(session.paintShop().offers.bucket, null, 'the offer is gone once worn');
  ok(!dispatchBoardMarkup(session.view(), {jobs: [], fire: {repairCost: 0}, skins: session.paintShop()}).includes('bucket-fit-wear'), 'and its button');
}
{
  // The rescue line: a hoist call offers medevac, a search offers search and rescue.
  const offerFor = (kind, courseId, owned) => {
    const profile = callProfile(kind, courseId, {count: 30, heli: {skins: {owned, worn: 'stock', fresh: owned}}});
    const session = newSkinSession(profile);
    session.start();
    return session;
  };
  same(offerFor('hoist', 'panorama-ridge', ['medevac', 'rescue']).paintShop().offers.line, 'medevac', 'a hoist call: medevac');
  same(offerFor('hiker', 'tremblant-woods', ['medevac', 'rescue']).paintShop().offers.line, 'rescue', 'a hiker call: search and rescue');
  same(offerFor('avalanche', 'tremblant-snow', ['medevac', 'rescue']).paintShop().offers.line, 'rescue', 'an avalanche call: search and rescue');
  same(offerFor('hiker', 'tremblant-woods', ['medevac']).paintShop().offers.line, null, 'no offer for a coat that is not owned');
  const session = offerFor('hoist', 'panorama-ridge', ['medevac', 'rescue']);
  const markup = dispatchBoardMarkup(session.view(), {jobs: [], fire: {repairCost: 0}, skins: session.paintShop()});
  ok(markup.includes('Fit the rescue line and wear Medevac'), 'the board offers it');
  const events = [];
  ok(handleBoardAction('rescue-fit-wear', {heliSession: session, _heliEvents: got => events.push(...got)}).ok, 'one click');
  same([has(events, 'rescueLineFitted'), skinsOfSave(session).worn], [true, 'medevac'], 'the line is fitted and the medevac coat is on');
}
{
  // The board lists the coats with their tally and buys and washes through its buttons.
  const session = newSkinSession(skinProfile({credits: 3000, missions: {firesOut: 3}, dirt: {dust: 5, mud: 0, soot: 0, salt: 0}}));
  session.start();
  const app = {heliSession: session, _heliEvents: () => {}};
  let markup = dispatchBoardMarkup(session.view(), {jobs: [], skins: session.paintShop()});
  ok(markup.includes('Fire service 3/5') && markup.includes('Buy: 1,300 credits') && markup.includes('TV camera bought only') && markup.includes('Grime 5%'), 'tallies, prices and grime on the board');
  ok(handleBoardAction('paint-buy:fire', app).ok, 'Buy from the board');
  same(session.profile.credits, 1700, 'charged once');
  markup = dispatchBoardMarkup(session.view(), {jobs: [], skins: session.paintShop()});
  ok(markup.includes('paint-wear:fire') && markup.includes('(fresh coat)') && !markup.includes('paint-buy:fire'), 'then Wear (fresh coat) instead of Buy');
  ok(handleBoardAction('paint-wear:fire', app).ok && skinsOfSave(session).worn === 'fire', 'Wear from the board');
  ok(handleBoardAction('wash', app).ok === false, 'Wash on a clean coat: the fresh coat already zeroed the dirt');
  same(dirtOfSave(session), EMPTY_DIRT, 'fresh coat, clean');
  const dirty = newSkinSession(skinProfile({dirt: {dust: 5, mud: 0, soot: 0, salt: 0}}));
  dirty.start();
  ok(handleBoardAction('wash', {heliSession: dirty, _heliEvents: () => {}}).ok && dirty.profile.credits === 2900, 'Wash from the board takes 100');
  // No skins panel without the switch.
  const off = createHeliSession(sessionOptions(skinProfile({credits: 3000})));
  off.start();
  same([off.paintShop(), 'skins' in off.view(), dispatchBoardMarkup(off.view(), {jobs: [], fire: {repairCost: 0}, skins: off.paintShop()}).includes('Paint shop')], [null, false, false], 'with the switch off: no paint shop, no view');
  same([off.buyPaint('fire').ok, off.wearPaint('fire').ok, off.washHelicopter().ok], [false, false, false], 'and every coat action is refused');
}
console.log('PASS the fit buttons and the board');

// ---- Part 5: each piece of gear works only while its coat is worn ---------------------
const camerasWith = worn => newSkinSession(skinProfile({owned: ['tv'], worn})).cameraCount;
same([camerasWith('tv'), camerasWith('stock'), createHeliSession(sessionOptions(skinProfile())).cameraCount], [5, 4, 4], 'the TV coat cycles five camera views, stock and the switch off four');
ok(/% \(this\.heliSession\?\.cameraCount \?\? 4\)/.test(readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')), 'C in the app cycles by the session\'s count');
{
  // The medevac winch: with H held, W reels in and S pays out at 1.5 m/s, between 5 and 40 m.
  const winch = (worn, controls, seconds, owned = ['medevac']) => {
    const session = newSkinSession(skinProfile({owned, worn}));
    session.start();
    const lift = run(session, 8, v => pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 30}, {speed: 2}), v => v.heli.y > v.zone.y + 28);
    run(session, seconds, v => ({...pilot(v, {x: v.zone.x, z: v.zone.z, y: v.zone.y + 30}, {speed: 2}), ...controls}));
    return {session, view: session.view(), lift};
  };
  const line = (worn, controls, seconds) => winch(worn, controls, seconds).view.skins.line;
  const near = (a, b, label) => ok(Math.abs(a - b) < 1e-6, `${label}: ${a} vs ${b}`);
  near(line('medevac', {pour: true, lift: 1}, 2), 15 - 3, 'H and W reel in 1.5 m/s for 2 s');
  near(line('medevac', {pour: true, lift: -1}, 4), 15 + 6, 'H and S pay out');
  near(line('medevac', {pour: true, lift: 1}, 20), 5, 'the line stops at 5 m');
  near(line('medevac', {pour: true, lift: -1}, 40), 40, 'and at 40 m');
  near(line('medevac', {reel: -1}, 2), 12, 'controls.reel works as well');
  near(line('medevac', {lift: 1}, 2), 15, 'W alone does not reel (H must be held)');
  same(line('stock', {pour: true, lift: 1}, 2), null, 'stock paint has no winch');
  same(winch('medevac', {}, 1).view.skins.gear.reelSpeed, 1.5, 'the gear table is the worn coat\'s');
  // W and S are the winch's while reeling: the helicopter does not also climb or sink.
  const rose = (worn, controls) => {
    const w = winch(worn, {}, 0.5), before = w.session.view().heli.y;
    run(w.session, 3, () => controls);
    return w.session.view().heli.y - before;
  };
  const reelRise = rose('medevac', {pour: true, lift: 1}), idleRise = rose('medevac', {}), plainRise = rose('stock', {lift: 1});
  ok(Math.abs(reelRise - idleRise) < 0.2 && plainRise - idleRise > 1, `reeling leaves the collective alone, plain W climbs (${reelRise.toFixed(2)}, ${idleRise.toFixed(2)} and ${plainRise.toFixed(2)} m)`);
  // A short line hooks a car from 5 m: stock paint cannot from that height.
  const hookWith = (worn, reelSeconds) => {
    const session = newSkinSession(skinProfile({owned: ['medevac'], worn}));
    session.start();
    const car = session.view().loads.find(c => c.own);
    run(session, reelSeconds, () => worn === 'medevac' ? {pour: true, lift: 1} : {});
    const goal = {x: car.x, z: car.z, y: car.y + 5.3};
    run(session, 60, v => pilot(v, {x: goal.x, z: goal.z, y: v.heli.y < car.y + 9 ? car.y + 9 : v.heli.y}, {speed: 4, sink: 3}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 1);
    run(session, 60, v => pilot(v, goal, {speed: 1, sink: 1}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 0.8 && Math.abs(v.heli.y - goal.y) < 0.3 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.4);
    const hooked = session.pressHook();
    session.takeEvents();
    run(session, 6, v => pilot(v, {x: goal.x, z: goal.z, y: goal.y + 12}, {speed: 1, sink: 2}), v => v.heli.y > goal.y + 8);
    const v = session.view();
    return {hooked: hooked?.type === 'hooked', hang: v.heli.y - v.load.y, onLine: v.skins?.line};
  };
  const winched = hookWith('medevac', 8), stock = hookWith('stock', 8);
  ok(winched.hooked && Math.abs(winched.hang - 5.05) < 0.3 && winched.onLine === 5, `the 5 m line hooks the car and it hangs ${winched.hang.toFixed(2)} m below`);
  ok(!stock.hooked, 'stock paint cannot hook from 5 m: the cable is 15 m');
}
console.log('PASS the winch');

// ---- Supply: the stronger hook and the cargo net ----------------------------------------
const supplySession = (worn, extra = {}) => {
  const owned = worn === 'stock' ? [] : [worn];
  const session = newSkinSession(callProfile('supply', 'tremblant-snow', {count: 30, heli: {skins: {owned, worn, fresh: []}}}), extra);
  session.start();
  session.pressRadio(); session.takeEvents();
  return session;
};
// Hover steady at a point, one hook height over the ground there, ready to press H.
function hoverAt(session, x, z, hangM = 15, {tolerance = 0.5} = {}) {
  const y = woods.ground.height(x, z) + 0.7 + hangM + 0.3;
  run(session, 90, v => pilot(v, {x, z, y: Math.max(y, v.heli.y < y + 6 ? y + 6 : y)}, {speed: 8, sink: 4}), v => Math.hypot(v.heli.x - x, v.heli.z - z) < 1.5);
  run(session, 90, v => pilot(v, {x, z, y}, {speed: 1, sink: 1.2}), v => Math.hypot(v.heli.x - x, v.heli.z - z) < tolerance && Math.abs(v.heli.y - y) < 0.3 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.4);
}
{
  const spots = session => session.view().rescue.crates;
  const net = supplySession('supply');
  const [a, b] = [spots(net)[0], spots(net)[1]];
  const mid = {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
  hoverAt(net, mid.x, mid.z);
  const hooked = net.pressHook();
  net.takeEvents();
  ok(hooked?.type === 'hooked', 'the cargo net hooks from between two crates');
  ok(spots(net).filter(crate => crate.hooked).length === 2, 'both crates are on the hook at once');
  const lifted = run(net, 8, v => pilot(v, {x: mid.x, z: mid.z, y: v.heli.y + 12}, {speed: 1, sink: 2}), v => v.heli.y > woods.ground.height(mid.x, mid.z) + 28);
  const [carrier, other] = spots(net).filter(crate => crate.hooked);
  ok(Math.abs(Math.hypot(carrier.x - other.x, carrier.z - other.z) - 1.5) < 0.2 && Math.abs(carrier.y - other.y) < 0.2, 'the second crate rides 1.5 m beside the first');
  same(net.view().rescue.active.crates.filter(state => state === 1).length, 2, 'the rescue record has both on the line');
  // Let go low: both are set down beside each other, each ready to be paid on its own.
  run(net, 60, v => pilot(v, {x: mid.x, z: mid.z, y: woods.ground.height(mid.x, mid.z) + 0.7 + 15.3}, {speed: 1, sink: 1.2}), v => Math.abs(v.heli.y - (woods.ground.height(mid.x, mid.z) + 16)) < 0.4);
  net.pressHook();
  run(net, 6, v => pilot(v, {x: mid.x, z: mid.z, y: v.heli.y}, {speed: 1}));
  ok(spots(net).every(crate => !crate.hooked && crate.onGround), 'let go, both crates rest on the ground');
  // Without the net the same spot hooks nothing (5.7 m is beyond the hook; H says "Closer"), and over one crate it takes one.
  const plain = supplySession('stock');
  hoverAt(plain, mid.x, mid.z);
  const missed = plain.pressHook();
  same([missed?.type, missed?.reason], ['hookRefused', 'closer'], 'stock paint: nothing within reach, and H says Closer');
  hoverAt(plain, a.x, a.z);
  plain.pressHook();
  same(spots(plain).filter(crate => crate.hooked).length, 1, 'stock paint hooks one crate');
  // The stronger hook reaches 6.7 m sideways on an ordinary car; the plain hook only 4 m.
  const carOff = worn => {
    const session = newSkinSession(skinProfile({owned: worn === 'stock' ? [] : [worn], worn}));
    session.start();
    const car = session.view().loads.find(c => c.own);
    hoverAt(session, car.x + 5.5, car.z, 15);
    const goalY = car.y + 15.3;
    run(session, 30, v => pilot(v, {x: car.x + 5.5, z: car.z, y: goalY}, {speed: 1, sink: 1}), v => Math.abs(v.heli.y - goalY) < 0.3 && Math.hypot(v.heli.vx, v.heli.vy, v.heli.vz) < 0.4);
    return session.pressHook()?.type ?? null;
  };
  same([carOff('supply'), carOff('stock')], ['hooked', 'hookRefused'], 'a car 5.5 m to the side: hooked with the stronger hook, out of reach otherwise');
}
console.log('PASS the cargo net and the stronger hook');

// ---- The search and rescue coat: the searchlight and the heat camera --------------------
const hikerSession = (worn, extra = {}) => {
  const owned = worn === 'stock' ? [] : [worn];
  const session = newSkinSession(callProfile('hiker', 'tremblant-woods', {count: 30, heli: {skins: {owned, worn, fresh: []}, fuelKg: 500}}), extra);
  session.start();
  session.pressRadio(); session.takeEvents();
  return session;
};
{
  const minutes = 8 * 60;
  const spent = (worn, seconds) => {
    const session = hikerSession(worn), log = [];
    for (let i = 0; i < Math.round(seconds / 0.05); i++) log.push(...session.step({}, 0.05));
    return {session, log};
  };
  const stockView = hikerSession('stock').view().rescue.active, lightView = hikerSession('rescue').view().rescue.active;
  same([stockView.limit, lightView.limit, lightView.left], [900, 900 + minutes, 900 + minutes], 'the searchlight lengthens the hiker search by 8 minutes');
  const plain = spent('stock', 930), light = spent('rescue', 930);
  same([plain.log.filter(e => e.type === 'rescueFailed').map(e => e.reason), light.log.filter(e => e.type === 'rescueFailed').length], [['time'], 0],
    'at 15 minutes the plain search is lost, the lit one goes on');
  const night = light.session.view().skins.night;
  same([night.dark, Math.round(night.nightSeconds), night.lightOn], [true, 30, true], 'it is dark, the light is on');
  same(light.session.view().rescue.active.dusk, 1, 'dusk is full at the plain clock');
  ok(lines(light.log).filter(line => line === 'heli.radio.hiker.dusk').length === 1 && lines(light.log).includes('heli.radio.rescue.cold'), 'dusk and cold come at the plain times');
  const over = spent('rescue', 900 + minutes + 10);
  same(over.log.filter(e => e.type === 'rescueFailed').map(e => e.reason), ['time'], 'and the lit search ends 8 minutes later');
  same(hikerSession('stock').view().skins.night.lightOn, false, 'no light on stock paint');
}
console.log('PASS the searchlight');

// ---- The medevac coat: a hoist rescue pays 200 more; the heat camera shows the people ----
const speedOf = view => Math.hypot(view.heli.vx, view.heli.vz);
function legHeight(world, from, to, margin) {
  let top = -Infinity;
  for (let k = 0; k <= 60; k++) top = Math.max(top, world.ground.highest(from.x + (to.x - from.x) * k / 60, from.z + (to.z - from.z) * k / 60, 10));
  return top + margin;
}
function travel(session, world, goal, finalY, {speed = 18, margin = 25, land = false} = {}) {
  const view = session.view(), high = Math.max(finalY, legHeight(world, view.heli, goal, margin)), events = [];
  events.push(...run(session, 90, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: high}, {speed: 1}), v => v.heli.y > high - 3));
  events.push(...run(session, 300, v => pilot(v, {x: goal.x, z: goal.z, y: high}, {speed}), v => Math.hypot(v.heli.x - goal.x, v.heli.z - goal.z) < 3 && speedOf(v) < 1));
  events.push(...run(session, 180, v => pilot(v, {x: goal.x, z: goal.z, y: finalY}, {speed: 2, sink: Math.max(1.5, Math.min(6, (v.heli.y - finalY) / 6))}),
    v => Math.abs(v.heli.y - finalY) < 0.6 && Math.abs(v.heli.vy) < 0.4));
  return events;
}
{
  const ridgeSite = courseSite(ridge.course, ridge.ground, 'panorama-ridge');
  const flyHoist = worn => {
    const owned = worn === 'stock' ? [] : [worn];
    const session = newSkinSession(callProfile('hoist', 'panorama-ridge', {count: 30, heli: {skins: {owned, worn, fresh: []}}}));
    const log = [...session.start()];
    session.pressRadio(); session.fitRescueLine(); log.push(...session.takeEvents());
    const r = missionsOf(session.profile).rescue, driver = pickHoist(hoistSpots(ridge.course, ridge.ground), r.seed, ridge.ground).driver;
    // Out of the Woods' area toward Panorama Ridge by hand, then the cruise leg.
    session.setDestination('panorama-ridge');
    const from = session.view().heli, dir = bearing('tremblant-woods', 'panorama-ridge'), far = {x: from.x + dir.x * 4000, z: from.z + dir.z * 4000};
    const top = legHeight(woods, from, far, 35);
    log.push(...run(session, 60, v => pilot(v, {x: from.x, z: from.z, y: top}, {speed: 1}), v => v.heli.y > top - 3));
    log.push(...run(session, 300, v => pilot(v, {x: far.x, z: far.z, y: top}, {speed: 28}), v => v.cruiseOffered));
    ok(session.acceptCruise(), 'the cruise leg is taken');
    log.push(...run(session, 3, () => ({})));
    // Lower the rescuer beside the driver, hold, clip on, carry to the pad.
    const gy = ridge.ground.height(driver.x, driver.z);
    log.push(...travel(session, ridge, driver, gy + 40, {speed: 19, margin: 40}));
    log.push(...run(session, 20, v => pilot(v, {x: driver.x, z: driver.z, y: gy + 40}, {speed: 1}), v => speedOf(v) < 0.3));
    const onSpot = (v, y, sink) => { const l = v.rescue.line; return pilot(v, {x: driver.x - (l.x - v.heli.x), z: driver.z - (l.z - v.heli.z), y}, {speed: 3, sink}); };
    const height = v => v.rescue.line.y - ridge.ground.height(v.rescue.line.x, v.rescue.line.z);
    log.push(...run(session, 120, v => onSpot(v, v.heli.y - 3, height(v) > 5 ? 3 : 0.7), (v, got) => has(got, 'holdStarted')));
    log.push(...run(session, 40, v => onSpot(v, v.heli.y, 0.3), (v, got) => has(got, 'clipped')));
    const zone = ridgeSite.zone, base = session.view().heli.y;
    log.push(...run(session, 60, v => pilot(v, {x: v.rescue.line.x, z: v.rescue.line.z, y: base + 35}, {speed: 1, sink: 2.5}), v => v.heli.y > base + 30));
    log.push(...travel(session, ridge, zone, zone.y + 40, {speed: 19, margin: 40}));
    log.push(...run(session, 10, v => pilot(v, {x: zone.x, z: zone.z, y: zone.y + 40}, {speed: 1}), () => false));
    const aboveRing = v => v.rescue.line.y - ridge.ground.height(v.rescue.line.x, v.rescue.line.z);
    log.push(...run(session, 120, v => pilot(v, {x: zone.x, z: zone.z, y: v.heli.y - 3}, {speed: 2, sink: aboveRing(v) > 6 ? 3 : 0.5}), (v, got) => has(got, 'rescueDone') || has(got, 'rescueFailed')));
    return {session, log, done: log.find(event => event.type === 'rescueDone')};
  };
  const stock = flyHoist('stock'), medevac = flyHoist('medevac');
  ok(stock.done && medevac.done, 'both hoist rescues are handed over');
  same([stock.done.condition, medevac.done.condition], [1, 1], 'the cruise leg makes the driver cold in both: hurt');
  same([stock.done.paid, medevac.done.paid], [720, 920], 'hurt pays 720; the stretcher adds 200 once, whole: 920');
  same(medevac.session.profile.credits - stock.session.profile.credits, 200, 'and the save agrees to the credit');
  // The same rescue on search and rescue paint gets no hoist bonus.
  const sar = flyHoist('rescue');
  same(sar.done.paid, 720, 'another coat adds nothing');
}
console.log('PASS the stretcher pays 200 more on a hoist rescue');

// The heat camera lists the warm hiker within 150 m; nothing without the coat.
{
  const heatOf = worn => {
    const session = hikerSession(worn);
    const r = missionsOf(session.profile).rescue, pick = pickHiker(hikerSpots(woods.course, woods.ground, courseSite(woods.course, woods.ground, 'tremblant-woods')), r.seed);
    const far = session.view().skins.heat.length;
    travel(session, woods, {x: pick.hiker.x + 60, z: pick.hiker.z}, woods.ground.height(pick.hiker.x, pick.hiker.z) + 70);
    return {far, near: session.view().skins.heat, heli: session.view().heli};
  };
  const lit = heatOf('rescue'), plain = heatOf('stock');
  same([lit.far, lit.near.length, lit.near[0]?.kind], [0, 1, 'hiker'], 'the camera shows the hiker once the helicopter is within 150 m, not before');
  const warm = lit.near[0];
  ok(warm.distance <= 150 && Math.abs(warm.distance - Math.hypot(lit.heli.x - warm.x, lit.heli.y - woods.ground.height(warm.x, warm.z), lit.heli.z - warm.z)) < 1e-6, 'with their place and the straight-line distance');
  same(plain.near.length, 0, 'no heat inset on stock paint');
}
console.log('PASS the heat camera lists the people');

// ---- Part 6: the wildlife count on the board, in the air and at the report ----------------
// A play day whose count is at the Woods, where the helicopter starts.
const COUNT_DAY = 9;
const countJob = surveyJob(COUNT_DAY);
ok(countJob.courseId === 'tremblant-woods' && countJob.species === 'moose', 'play day 9 asks for moose at the Woods');
const countSession = (extra = {}, {worn = 'stock', owned = [], day = COUNT_DAY, missions = {}, credits = 3000} = {}) => {
  const session = newSkinSession(skinProfile({day, worn, owned, missions, credits}), {wildlifeEnabled: true, wildlife, ...extra});
  session.start();
  return session;
};
// A back-and-forth pattern over the square, `gap` metres between lines, at `agl` above the ground.
function patternOver(square, gap, reach) {
  const points = [];
  for (let k = 0, z = square.z0 + reach; z < square.z1 + reach; k++, z += gap) {
    const zz = Math.min(z, square.z1 - 5), a = {x: square.x0 - 20, z: zz}, b = {x: square.x1 + 20, z: zz};
    points.push(...(k % 2 === 0 ? [a, b] : [b, a]));
  }
  return points;
}
function flyPoints(session, points, {agl = 110, speed = 26, each = null} = {}) {
  const events = [];
  let next = 0;
  for (let n = 0; n < 120 * 900 && next < points.length; n++) {
    const v = session.view(), p = points[next];
    if (Math.hypot(v.heli.x - p.x, v.heli.z - p.z) < 18) { next++; continue; }
    events.push(...session.step(pilot(v, {x: p.x, z: p.z, y: woods.ground.height(v.heli.x, v.heli.z) + agl}, {speed, sink: 6})));
    each?.(session.view());
    if (session.phase !== 'flying') break;
  }
  return events;
}
{
  // The board line: its own row below the car jobs, the same for the same play day.
  const session = countSession();
  const rows = session.boardJobs();
  const row = rows.at(-1);
  same([row.id, row.survey, row.title, row.payNow, row.taken, row.done], [countJob.id, true, 'Count the moose at Tremblant Woods', 600, false, false], 'the count is the last line on the board');
  same(rows.slice(0, 4).map(job => job.id), ['own', ...dayJobs(COUNT_DAY).map(job => job.id)], 'the car jobs above it are untouched');
  const markup = dispatchBoardMarkup(session.view(), {jobs: rows, mode: 'real', skins: session.paintShop()});
  ok(markup.includes('Count the moose at Tremblant Woods') && markup.includes('up to 600 credits') && !markup.includes('Pick up at undefined'), 'its board row');
  ok(!/up to 600 credits \(\+25%/.test(markup), 'the count pays the same in Real');
  // Switch off: no line, no job, R does nothing, no view.
  const off = createHeliSession(sessionOptions(skinProfile({day: COUNT_DAY}), {skinsEnabled: true, wildlife}));
  off.start();
  same([off.boardJobs().length, off.takeJob(countJob.id).ok, off.pressRadio(), 'survey' in off.view(), off.reportCount().ok], [4, false, false, false, false], 'with the wildlife switch off there is no count');
  // Take it: Sarah, the square, and the run starts clean.
  const events = [];
  const taken = session.takeJob(countJob.id);
  events.push(...session.takeEvents());
  same([taken.ok, lines(events), has(events, 'surveyTaken')], [true, ['heli.radio.survey.taken'], true], 'taken at the pad: Sarah');
  const view = session.view().survey;
  same([view.active, view.taken, view.count, view.percent, view.canReport, view.name], [true, true, 0, 0, false, 'moose'], 'the panel: moose, nothing counted, nothing covered');
  ok(view.square.size === 800 && view.animals.length >= 6 && view.target.distance > 0, 'an 800 m square, its animals and its bearing');
  ok(dispatchBoardMarkup(session.view(), {jobs: session.boardJobs()}).includes('MOOSE 0 &middot; 0% covered'), 'the board shows MOOSE 0 and 0% covered');
  same(session.takeJob(countJob.id).already, true, 'taking it twice changes nothing');
  same(session.reportCount().ok, false, 'nothing to report before a quarter is covered');
  same(session.pressRadio(), false, 'and R says nothing yet');
  // Another job drops the count, and so does Drop job.
  const car = dayJobs(COUNT_DAY)[0];
  session.takeJob(car.id);
  same([has(session.takeEvents(), 'surveyDropped'), session.view().survey.taken, session.view().survey.active], [true, false, false], 'taking a car job drops the count');
  same(session.takeJob(countJob.id).ok, false, 'and with a car job in hand it cannot be taken');
  session.dropJob();
  session.takeJob(countJob.id);
  same(session.dropJob().survey, true, 'Drop job drops it');
  same(session.view().survey.active, false, 'dropped');
  session.takeJob(countJob.id);
  session.takeJob('own');
  same(session.view().survey.taken, false, 'Fly my car drops it too');
}
console.log('PASS the count is on the board');

{
  // The whole count: lines 120 m apart cover the square; R reports once; the pay, the tally and the coat.
  const flyCount = (worn = 'stock', {gap = 120, reach = 60, missions = {}} = {}) => {
    const session = countSession({}, {worn, owned: worn === 'stock' ? [] : [worn], missions});
    session.takeJob(countJob.id);
    const log = session.takeEvents();
    const square = session.view().survey.square;
    const peaks = {heat: 0};
    log.push(...flyPoints(session, patternOver(square, gap, reach), {each: v => { peaks.heat = Math.max(peaks.heat, v.survey.heat.length); }}));
    return {session, log, peaks};
  };
  const full = flyCount();
  const view = full.session.view().survey;
  ok(view.percent >= 95 && view.canReport && view.count > 0, `covered ${view.percent}%, ${view.count} moose counted`);
  const counts = full.log.filter(event => event.type === 'surveyCount');
  ok(counts.length === view.count && counts.every((event, i) => event.count === i + 1) && full.log.some(e => e.type === 'cue' && e.id === 'heli.survey.click'), 'each animal ticks the panel once, with the shutter click');
  ok(!has(full.log, 'surveyScare'), 'flying high scares nothing');
  const before = full.session.profile.credits;
  ok(full.session.pressRadio(), 'R reports to Sarah');
  const events = full.session.takeEvents(), done = events.find(event => event.type === 'surveyDone');
  ok(done && done.truth >= 6 && done.truth <= 14 && done.paid >= 400 && done.paid <= 700, `reported ${done.estimate} against ${done.truth}: ${done.band}, ${done.paid} credits`);
  same([full.session.profile.credits - before, lines(events)], [done.paid, [`heli.radio.survey.${done.band}`]], 'paid once, and Sarah answers');
  const saved = heliOf(full.session.profile);
  same([saved.missions.wildlifeCounts, saved.survey, full.session.view().survey, full.session.boardJobs().length], [1, {day: COUNT_DAY, done: true}, null, 4], 'one count added, the day marked done, off the board');
  same([full.session.pressRadio(), full.session.reportCount().ok, full.session.takeJob(countJob.id).ok], [false, false, false], 'it cannot pay twice');
  // The same flight again is the same count.
  const again = flyCount();
  same([JSON.stringify(again.log), again.session.profile.credits], [JSON.stringify(full.log), full.session.profile.credits - done.paid], 'the same flight gives the same count and report');
  // The fifth count earns the wildlife coat.
  const fifth = flyCount('stock', {missions: {wildlifeCounts: 4}});
  fifth.session.pressRadio();
  const fifthEvents = fifth.session.takeEvents();
  same([fifthEvents.filter(event => event.type === 'skinEarned').map(event => event.kind), skinsOfSave(fifth.session).owned], [['wildlife'], ['wildlife']], 'the fifth count earns the wildlife coat');
  ok(fifth.session.paintShop().note.includes('Wildlife'), 'with a note on the board');
  // The heat camera shows warm animals within 150 m on the search and rescue coat only.
  const warm = flyCount('rescue', {gap: 240});
  const cold = flyCount('stock', {gap: 240});
  ok(warm.peaks.heat > 0 && cold.peaks.heat === 0, `warm animals shown with the heat camera (${warm.peaks.heat}), none without`);
}
console.log('PASS a count is flown and reported');

{
  // The zoom camera counts out to 100 m, so wider lines cover the square; quiet tips scare at 50 m, not 100.
  const cover = (worn, gap) => {
    const session = countSession({}, {worn, owned: worn === 'stock' ? [] : [worn]});
    session.takeJob(countJob.id); session.takeEvents();
    flyPoints(session, patternOver(session.view().survey.square, gap, worn === 'wildlife' ? 100 : 60));
    return session.view().survey.percent;
  };
  const zoom = cover('wildlife', 200), plain = cover('stock', 200);
  ok(zoom >= 95 && plain >= 55 && plain <= 70, `lines 200 m apart cover ${zoom}% with the zoom camera, ${plain}% without`);
  const passBy = worn => {
    const session = countSession({}, {worn, owned: worn === 'stock' ? [] : [worn]});
    session.takeJob(countJob.id); session.takeEvents();
    const animals = session.view().survey.animals, mine = animals.find(a => a.role === 'target');
    // Low (30 m) and 70 m to the side of one animal, no other animal within 100 m of the line.
    const near = animals.filter(a => a.id !== mine.id && Math.abs(a.z - (mine.z + 70)) < 100 && a.x > mine.x - 250 && a.x < mine.x + 250);
    return {session, mine, crowded: near.length};
  };
  const probe = passBy('stock');
  const events = [], line = [{x: probe.mine.x - 250, z: probe.mine.z + 70}, {x: probe.mine.x + 250, z: probe.mine.z + 70}];
  events.push(...flyPoints(probe.session, line, {agl: 30, speed: 12}));
  ok(events.some(e => e.type === 'surveyScare' && e.id === probe.mine.id) && lines(events).includes('heli.radio.survey.scared'), 'low and 70 m away, the plain helicopter scares the animal, and Sarah says so');
  ok(lines(events).filter(l => l === 'heli.radio.survey.scared').length <= 3, 'Sarah does not repeat herself every step');
  const quiet = passBy('wildlife');
  const quietEvents = flyPoints(quiet.session, [{x: quiet.mine.x - 250, z: quiet.mine.z + 70}, {x: quiet.mine.x + 250, z: quiet.mine.z + 70}], {agl: 30, speed: 12});
  ok(!quietEvents.some(e => e.type === 'surveyScare' && e.id === quiet.mine.id), 'with the quiet rotor tips (50 m) the same pass scares it not');
  ok(quietEvents.some(e => e.type === 'surveyCount' && e.id === quiet.mine.id), 'and it is counted (100 m reach)');
}
console.log('PASS the wildlife coat: zoom and quiet tips');

{
  // Leaving the course drops the count; it can be taken again the same play day.
  const dayAtRidge = [...Array(40).keys()].find(day => day > 0 && surveyJob(day).courseId === 'panorama-ridge');
  const session = countSession({}, {day: dayAtRidge});
  const job = surveyJob(dayAtRidge);
  const taken = session.takeJob(job.id);
  same([taken.ok, session.view().survey.active, session.destination], [true, false, 'panorama-ridge'], 'a count at another course: taken, aimed there, not started yet');
  // Out of the area and across the cruise leg.
  const from = session.view().heli, dir = bearing('tremblant-woods', 'panorama-ridge'), far = {x: from.x + dir.x * 4000, z: from.z + dir.z * 4000};
  const top = legHeight(woods, from, far, 35);
  run(session, 60, v => pilot(v, {x: from.x, z: from.z, y: top}, {speed: 1}), v => v.heli.y > top - 3);
  run(session, 300, v => pilot(v, {x: far.x, z: far.z, y: top}, {speed: 28}), v => v.cruiseOffered);
  ok(session.acceptCruise(), 'the cruise leg is taken');
  run(session, 3, () => ({}));
  same([session.view().courseId, session.view().survey.active, session.view().survey.taken], ['panorama-ridge', true, true], 'on arrival at the count\'s own course the square is there');
  // And the other way: a count taken at the Woods is dropped by leaving.
  const woodsDay = countSession();
  woodsDay.takeJob(countJob.id); woodsDay.takeEvents();
  woodsDay.setDestination('panorama-ridge');
  const start = woodsDay.view().heli, way = bearing('tremblant-woods', 'panorama-ridge'), out = {x: start.x + way.x * 4000, z: start.z + way.z * 4000};
  const high = legHeight(woods, start, out, 35);
  run(woodsDay, 60, v => pilot(v, {x: start.x, z: start.z, y: high}, {speed: 1}), v => v.heli.y > high - 3);
  run(woodsDay, 300, v => pilot(v, {x: out.x, z: out.z, y: high}, {speed: 28}), v => v.cruiseOffered);
  woodsDay.acceptCruise();
  const left = run(woodsDay, 3, () => ({}));
  same([has(left, 'surveyDropped'), woodsDay.view().survey.taken, woodsDay.view().survey.active, woodsDay.view().survey.jobId], [true, false, false, countJob.id], 'leaving the course drops the count; the job stays on the board');
}
console.log('PASS the count is dropped by leaving the course');

// Sarah's, Brian's and the sound ids are all real.
{
  const wanted = ['heli.radio.survey.taken', 'heli.radio.survey.scared', 'heli.radio.survey.good', 'heli.radio.survey.close', 'heli.radio.survey.off', 'heli.radio.survey.rare',
    'heli.radio.skin.earned', 'heli.radio.wash.hint', 'heli.radio.wash.done'];
  ok(wanted.every(id => HELI_RADIO_LINES[id]), 'every line the session says is in the radio table');
  const source = readFileSync(new URL('../src/heli/heli-session.js', import.meta.url), 'utf8');
  const said = [...source.matchAll(/'(heli\.radio\.(?:survey|skin|wash)\.[a-z]+)'/g)].map(match => match[1]);
  ok(said.every(id => HELI_RADIO_LINES[id]), `the session names only real lines (${[...new Set(said)].join(', ')})`);
}
// ---- The H key: the medevac coat acts on key-up, unless the winch was reeled ----------------
{
  const overCar = (worn, extra = {}) => {
    const session = newSkinSession(skinProfile({owned: worn === 'stock' ? [] : [worn], worn}), extra);
    session.start();
    const car = session.view().loads.find(c => c.own);
    hoverAt(session, car.x, car.z, 15);
    session.takeEvents();
    return session;
  };
  const hooked = session => session.view().load?.hooked === true;
  const tapped = session => {
    const first = session.hookKey(), events = [...session.takeEvents()];
    events.push(...session.step({pour: true}), ...session.step({pour: true}));
    const midway = hooked(session);
    events.push(...session.step({}), ...session.takeEvents());
    return {first, midway, events};
  };
  // Medevac: nothing on key-down, the hook on key-up; again to let it go.
  const medevac = overCar('medevac');
  const tap = tapped(medevac);
  same([tap.first, tap.midway, hooked(medevac), has(tap.events, 'hooked')], [null, false, true, true], 'medevac: H down does nothing, H up hooks the car');
  const second = tapped(medevac);
  same([hooked(medevac), has(second.events, 'released') || has(second.events, 'releasedHigh')], [false, true], 'and a second tap lets it go');
  // Holding H and reeling: no hook, no release, at any moment.
  const reeling = overCar('medevac');
  reeling.hookKey();
  const events = [];
  for (let i = 0; i < 240; i++) events.push(...reeling.step({pour: true, lift: 1}));
  events.push(...reeling.step({}));
  events.push(...reeling.step({}));
  same([hooked(reeling), has(events, 'hooked') || has(events, 'released'), Math.abs(reeling.view().skins.line - 12) < 1e-6], [false, false, true], 'medevac: H held with W reels the winch (2 s) and never hooks or releases');
  const withLoad = overCar('medevac');
  tapped(withLoad);
  withLoad.hookKey();
  for (let i = 0; i < 120; i++) withLoad.step({pour: true, lift: -1});
  withLoad.step({});
  same(hooked(withLoad), true, 'medevac: H with S while a car hangs pays out the line and does not release it');
  // Other coats and the switch off: H acts on key-down, exactly as before.
  for (const [label, session] of [['stock', overCar('stock')], ['fire', overCar('fire')], ['switch off', (() => {
    const s = createHeliSession(sessionOptions(skinProfile())); s.start();
    const car = s.view().loads.find(c => c.own); hoverAt(s, car.x, car.z, 15); s.takeEvents(); return s;
  })()]]) {
    const event = session.hookKey();
    same([event?.type, hooked(session)], ['hooked', true], `${label}: H down hooks at once`);
  }
  // Focus lost mid-hold: the key going up reads as nothing, not as a tap.
  const blurred = overCar('medevac');
  tapped(blurred);
  blurred.hookKey();
  blurred.step({pour: true});
  blurred.cancelHook();
  const afterBlur = [...blurred.step({}), ...blurred.step({})];
  same([hooked(blurred), has(afterBlur, 'released') || has(afterBlur, 'releasedHigh')], [true, false], 'blur mid-hold releases nothing');
  // H down while crashed (or before a visit) is forgotten.
  const crashedSession = overCar('medevac', {mode: 'real'});
  run(crashedSession, 40, () => ({lift: -1, pitch: 1}), () => crashedSession.phase === 'crashed');
  ok(crashedSession.phase === 'crashed', 'the helicopter is put down hard: a crash');
  same(crashedSession.hookKey(), null, 'H down while crashed is not remembered');
  run(crashedSession, 5, () => ({}), () => crashedSession.phase === 'flying');
  const reborn = crashedSession.view().load;
  hoverAt(crashedSession, reborn.x, reborn.z, 15);
  const afterCrash = [...crashedSession.step({}), ...crashedSession.step({})];
  same([has(afterCrash, 'hooked'), hooked(crashedSession)], [false, false], 'and nothing fires on the next flight');
  const atHome = newSkinSession(skinProfile({owned: ['medevac'], worn: 'medevac'}));
  same(atHome.hookKey(), null, 'H down before the visit starts does nothing');
  atHome.start();
  const car = atHome.view().loads.find(c => c.own);
  hoverAt(atHome, car.x, car.z, 15);
  const quiet = [...atHome.step({}), ...atHome.step({})];
  same([hooked(atHome), has(quiet, 'hooked')], [false, false], 'and does not fire on the first step of the flight');
  atHome.hookKey(); atHome.leave(); atHome.start();
  hoverAt(atHome, car.x, car.z, 15);
  same(hooked({view: () => atHome.view()}), false, 'a held H does not survive leaving and starting again');
}
console.log('PASS the hook acts on key-up with the medevac coat only');

// ---- The app passes the two switches, the wildlife rules and the standing check -------------
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map();
  const storage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; }};
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  try {
    const visit = overrides => {
      const app = new App();
      app.duel.featureFlags = raceFeatureFlags(createFeatureFlags({storage, overrides: {helicopter: true, ...overrides}, qa: true}), () => app.duel.state);
      ok(app.visitHeli(), 'the helicopter visit starts');
      return app;
    };
    const both = visit({'heli-skins': true, wildlife: true}), plain = visit({}), skinsOnly = visit({'heli-skins': true}), wildOnly = visit({wildlife: true});
    ok('skins' in both.heliSession.view() && 'survey' in both.heliSession.view(), 'both switches on: the session has skins and the count');
    ok(!('skins' in plain.heliSession.view()) && !('survey' in plain.heliSession.view()), 'both off: neither');
    ok('skins' in skinsOnly.heliSession.view() && !('survey' in skinsOnly.heliSession.view()), 'skins alone: no count');
    ok(!('skins' in wildOnly.heliSession.view()) && 'survey' in wildOnly.heliSession.view(), 'wildlife alone: no skins');
    const stand = both._surveyStand('tremblant-woods', {course: woods.course});
    ok(typeof stand === 'function', 'the standing check is a function of a point');
    const road = woods.course.worldAt(woods.course.phase(0), 0);
    same(stand(road.x, road.z), false, 'an animal may not stand on the road');
    const cycle = app => { app.heliCamera = 0; app._inputAction('heli-camera'); return app.heliCamera; };
    same([cycle(plain), plain.heliSession.cameraCount], [1, 4], 'C moves to the next camera view');
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
  }
}
console.log('PASS the app passes the skin and wildlife switches');

// Changing coats during a rescue is refused (it would change the gear mid-clock).
{
  const profile = callProfile('hiker', 'tremblant-woods', {count: 30, heli: {skins: {owned: ['rescue', 'fire'], worn: 'rescue', fresh: ['fire']}}});
  const session = newSkinSession(profile);
  session.start();
  ok(session.wearPaint('stock').ok, 'with only a call waiting a coat can still be changed');
  session.wearPaint('rescue');
  session.pressRadio();
  const refused = session.wearPaint('fire');
  same([refused.ok, refused.reason, skinsOfSave(session).worn], [false, 'Finish the rescue first.', 'rescue'], 'wear refused while a rescue is in hand');
  same(session.view().rescue.active.limit, 900 + 8 * 60, 'the searchlight clock is untouched');
  ok(/window\.addEventListener\('blur', \(\) => \{\s*this\.keys = \{\};\s*this\.heliSession\?\.cancelHook\(\);/.test(readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')), 'the app forgets a held H when the window loses focus');
}
console.log('PASS no coat change during a rescue');

console.log(`test-heli-skin-session: ${checks} checks passed`);
