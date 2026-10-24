import assert from 'node:assert/strict';
import test from 'node:test';
import {createProfile, normalizeProfile, createPlayerRegistry, loadPlayers, savePlayers} from '../src/progression.js';
import {normalizeDrivingLessons, finishDriveLesson, grantDriveLessonReward} from '../src/lessons/drive-lesson-save.js';

const fresh = (brakes = 0) => ({...createProfile(), credits: 1700,
  upgrades: {falcone_f42: {engine: 1, brakes}}, futureField: {keep: true}});

test('old profiles stay exactly unchanged and read as no lessons completed', () => {
  const old = normalizeProfile(fresh());
  assert.equal(Object.hasOwn(old, 'drivingLessons'), false);
  assert.deepEqual(normalizeProfile(old), old);
  assert.deepEqual(normalizeDrivingLessons(), {version: 1, done: {corner: false}, best: {corner: null}, rewarded: {corner: false}});
});

test('finish records best and grants one brake level once without mutating the profile', () => {
  const old = fresh(1), before = structuredClone(old);
  const first = finishDriveLesson(old, 'corner', .42, 'falcone_f42');
  assert.equal(first.ok, true);assert.equal(first.profile.upgrades.falcone_f42.brakes, 2);
  assert.deepEqual(first.profile.drivingLessons, {version: 1, done: {corner: true}, best: {corner: .42}, rewarded: {corner: true}});
  assert.equal(first.profile.credits, old.credits);
  assert.equal(first.profile.upgrades.falcone_f42.engine, 1);
  assert.deepEqual(first.profile.futureField, old.futureField);
  assert.deepEqual(old, before);
  const retake = finishDriveLesson(first.profile, 'corner', .8, 'stuttgart_959s');
  assert.equal(retake.profile.drivingLessons.best.corner, .8);
  assert.deepEqual(retake.profile.upgrades, first.profile.upgrades);
  assert.equal(retake.profile.credits, old.credits);
  assert.equal(finishDriveLesson(retake.profile, 'corner', .2, 'falcone_f42').profile.drivingLessons.best.corner, .8);
  assert.deepEqual(grantDriveLessonReward(retake.profile, 'corner', 'falcone_f42').profile, retake.profile);
});

test('maxed brakes earn exactly600 credits once, including factory-maxed cars', () => {
  const old = fresh(3), first = finishDriveLesson(old, 'corner', .1, 'falcone_f42');
  assert.equal(first.profile.credits, 2300);assert.deepEqual(first.profile.upgrades, old.upgrades);
  assert.equal(finishDriveLesson(first.profile, 'corner', .2, 'falcone_f42').profile.credits, 2300);
  const factory = {...fresh(), unlockedCars: [...fresh().unlockedCars, 'ferrari_enzo']};
  assert.equal(finishDriveLesson(factory, 'corner', .1, 'ferrari_enzo').profile.credits, 2300);
});

test('invalid lessons, cars and non-winning margins never change anything', () => {
  const old = fresh();
  for (const id of ['line', '__proto__', '', null]) assert.equal(finishDriveLesson(old, id, .4, 'falcone_f42').profile, old);
  for (const car of ['missing', 'koenigsegg_jesko', '__proto__', null]) assert.equal(finishDriveLesson(old, 'corner', .4, car).profile, old);
  for (const margin of [0, -.1, NaN, Infinity, -Infinity, '1', null]) assert.equal(finishDriveLesson(old, 'corner', margin, 'falcone_f42').profile, old);
  assert.equal(grantDriveLessonReward(old, 'corner', 'falcone_f42').profile, old);
});

test('a pending reward settles once and valid future lesson progress survives', () => {
  const old = {...fresh(), drivingLessons: {version: 1, done: {corner: true, line: true},
    best: {corner: .5, line: 1.2}, rewarded: {corner: false, line: true}, future: 'keep'}};
  const reward = grantDriveLessonReward(old, 'corner', 'falcone_f42');
  assert.equal(reward.profile.upgrades.falcone_f42.brakes, 1);
  assert.equal(reward.profile.drivingLessons.rewarded.corner, true);
  assert.equal(reward.profile.drivingLessons.done.line, true);
  assert.equal(reward.profile.drivingLessons.best.line, 1.2);
  assert.equal(reward.profile.drivingLessons.future, 'keep');
  assert.equal(grantDriveLessonReward(reward.profile, 'corner', 'falcone_f42').profile, reward.profile);
});

test('normalization rejects malformed known values and retains unknown additive data', () => {
  const value = normalizeDrivingLessons({version: 1, done: {corner: 'yes', line: true},
    best: {corner: -5}, rewarded: {corner: 1}, future: {keep: true}});
  assert.equal(value.done.corner, false);assert.equal(value.best.corner, null);assert.equal(value.rewarded.corner, false);
  assert.equal(value.done.line, true);assert.deepEqual(value.future, {keep: true});
  const future = {...fresh(), drivingLessons: {version: 2, future: [1, 2]}};
  assert.deepEqual(normalizeProfile(future).drivingLessons, future.drivingLessons);
  assert.equal(finishDriveLesson(future, 'corner', .4, 'falcone_f42').profile, future);
});

test('named players keep separate progress and rewards through memory-only save/reload', () => {
  const data = new Map(), storage = {getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v)};
  const registry = createPlayerRegistry(fresh());
  registry.players.push({id: 'second', name: 'Second', profile: fresh()});
  registry.players[0].profile = finishDriveLesson(registry.players[0].profile, 'corner', .25, 'falcone_f42').profile;
  assert.equal(savePlayers(registry, storage), true);
  const loaded = loadPlayers(storage);
  assert.equal(loaded.players[0].profile.drivingLessons.done.corner, true);
  assert.equal(loaded.players[1].profile.drivingLessons, undefined);
  assert.equal(loaded.players[1].profile.upgrades.falcone_f42.brakes, 0);
  assert.equal(finishDriveLesson(loaded.players[0].profile, 'corner', .5, 'falcone_f42').profile.upgrades.falcone_f42.brakes, 1);
});

// ---- DRIVE-LESSONS-SAVE-2: lessons 2 to 4 (docs/DRIVING_LESSONS.md 12.9) ----

import {DRIVE_LESSON_ORDER, DRIVE_LESSON_UPGRADE, driveLessonAccess} from '../src/lessons/drive-lesson-save.js';

const through = (profile, ids, options = {}) => ids.reduce((current, id) =>
  finishDriveLesson(current, id, .5, 'falcone_f42', options).profile, profile);

test('the order is corner, line, gears, snow, and each lesson has its own upgrade', () => {
  assert.deepEqual(DRIVE_LESSON_ORDER, ['corner', 'line', 'gears', 'snow']);
  assert.deepEqual(DRIVE_LESSON_UPGRADE, {corner: 'brakes', line: 'handling', gears: 'engine', snow: 'tires'});
  assert.ok(Object.isFrozen(DRIVE_LESSON_ORDER) && Object.isFrozen(DRIVE_LESSON_UPGRADE));
});

test('lessons open in order; gears says "Opens later" while engine-curve is off and snow then follows line', () => {
  const open = (lessons, id, engineCurve) => driveLessonAccess(lessons, id, {engineCurve});
  const done = ids => ({version: 1, done: Object.fromEntries(['corner', ...ids].map(id => [id, true])), best: {corner: null}, rewarded: {corner: false}});
  assert.equal(open(undefined, 'corner', false).open, true);
  assert.equal(open(undefined, 'line', false).open, false);
  assert.equal(open(done([]), 'line', false).open, true);
  assert.deepEqual(open(done(['line']), 'gears', false), {open: false, reason: 'Opens later'});
  assert.equal(open(done(['line']), 'snow', false).open, true, 'snow opens after line while gears is off');
  assert.equal(open(done(['line']), 'gears', true).open, true);
  assert.equal(open(done(['line']), 'snow', true).open, false, 'with gears on, snow waits for gears');
  assert.equal(open(done(['line', 'gears']), 'snow', true).open, true);
  assert.equal(open(done([]), 'snow', false).open, false);
  assert.equal(open(done(['line']), 'nope', true).open, false);
  assert.equal(open({version: 2}, 'corner', false).open, true, 'a newer save is read, never rewritten');
});

test('each lesson grants its own level once: handling, engine, tyres', () => {
  const old = fresh(0), before = structuredClone(old);
  const lined = finishDriveLesson(old, 'corner', .4, 'falcone_f42').profile;
  const line = finishDriveLesson(lined, 'line', 1.2, 'falcone_f42');
  assert.equal(line.ok, true); assert.deepEqual(line.reward, {kind: 'handling', carId: 'falcone_f42', level: 1});
  assert.equal(line.profile.upgrades.falcone_f42.handling, 1);
  assert.equal(line.profile.upgrades.falcone_f42.brakes, 1, 'lesson 1 reward untouched');
  const gears = finishDriveLesson(line.profile, 'gears', .7, 'falcone_f42', {engineCurve: true});
  assert.deepEqual(gears.reward, {kind: 'engine', carId: 'falcone_f42', level: 2});
  assert.equal(gears.profile.upgrades.falcone_f42.engine, 2);
  const snow = finishDriveLesson(gears.profile, 'snow', .3, 'falcone_f42', {engineCurve: true});
  assert.deepEqual(snow.reward, {kind: 'tires', carId: 'falcone_f42', level: 1});
  assert.equal(snow.profile.upgrades.falcone_f42.tires, 1);
  assert.deepEqual(snow.profile.drivingLessons, {version: 1, done: {corner: true, line: true, gears: true, snow: true},
    best: {corner: .4, line: 1.2, gears: .7, snow: .3}, rewarded: {corner: true, line: true, gears: true, snow: true}});
  assert.equal(snow.profile.credits, old.credits); assert.deepEqual(snow.profile.futureField, old.futureField);
  assert.deepEqual(old, before, 'the input profile is never mutated');
  // Each reward once: retakes raise the best margin only, on any car.
  const again = through(snow.profile, ['line', 'gears', 'snow'], {engineCurve: true});
  assert.deepEqual(again.upgrades, snow.profile.upgrades); assert.equal(again.credits, snow.profile.credits);
  const other = finishDriveLesson(snow.profile, 'line', 2, 'stuttgart_959s');
  assert.equal(other.profile.drivingLessons.best.line, 2); assert.equal(other.profile.upgrades.stuttgart_959s?.handling ?? 0, 0);
  for (const id of ['line', 'gears', 'snow']) assert.equal(grantDriveLessonReward(snow.profile, id, 'falcone_f42').profile, snow.profile);
});

test('a lesson at level 3 pays 600 credits once instead, including factory-maxed cars', () => {
  const maxed = {...fresh(), upgrades: {falcone_f42: {engine: 3, handling: 3, tires: 3, brakes: 3}}};
  const done = through(maxed, ['corner', 'line', 'gears', 'snow'], {engineCurve: true});
  assert.equal(done.credits, 1700 + 4 * 600); assert.deepEqual(done.upgrades, maxed.upgrades);
  assert.equal(through(done, ['line', 'gears', 'snow'], {engineCurve: true}).credits, done.credits);
  const factory = {...fresh(), unlockedCars: [...fresh().unlockedCars, 'ferrari_enzo']};
  const enzo = ['corner', 'line'].reduce((p, id) => finishDriveLesson(p, id, .5, 'ferrari_enzo').profile, factory);
  assert.equal(enzo.credits, 1700 + 1200);
});

test('lessons cannot be skipped, gears waits for engine-curve, and a locked lesson changes nothing', () => {
  const old = fresh();
  for (const [id, options] of [['line', {}], ['gears', {engineCurve: true}], ['snow', {}], ['gears', {}]])
    assert.equal(finishDriveLesson(old, id, .5, 'falcone_f42', options).profile, old, id);
  const lined = through(old, ['corner', 'line']);
  const blocked = finishDriveLesson(lined, 'gears', .5, 'falcone_f42');
  assert.equal(blocked.ok, false); assert.equal(blocked.reason, 'Opens later'); assert.equal(blocked.profile, lined);
  assert.equal(finishDriveLesson(lined, 'snow', .5, 'falcone_f42', {engineCurve: true}).profile, lined, 'snow waits for gears when it is on');
  assert.equal(finishDriveLesson(lined, 'snow', .5, 'falcone_f42').ok, true, 'snow opens after line while gears is off');
  // A finished lesson can still be retaken if the switch is turned off later.
  const gears = through(lined, ['gears'], {engineCurve: true});
  assert.equal(finishDriveLesson(gears, 'gears', .9, 'falcone_f42').profile.drivingLessons.best.gears, .9);
});

test('old saves load unchanged: lessons 2 to 4 are never added, and saved ones are validated', () => {
  const lesson1 = {...fresh(), drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}};
  const loaded = normalizeProfile(lesson1);
  assert.deepEqual(loaded.drivingLessons, lesson1.drivingLessons);
  for (const key of ['done', 'best', 'rewarded']) for (const id of ['line', 'gears', 'snow']) assert.equal(Object.hasOwn(loaded.drivingLessons[key], id), false);
  assert.deepEqual(normalizeProfile(loaded), loaded);
  const bad = normalizeDrivingLessons({version: 1, done: {corner: true, line: 'yes', gears: 1, snow: true},
    best: {corner: .4, line: -1, gears: NaN, snow: 2.5}, rewarded: {line: 'x', snow: true}, future: [1]});
  assert.deepEqual(bad.done, {corner: true, line: false, gears: false, snow: true});
  assert.deepEqual(bad.best, {corner: .4, line: null, gears: null, snow: 2.5});
  assert.deepEqual(bad.rewarded, {corner: false, line: false, snow: true});
  assert.deepEqual(bad.future, [1]);
});

test('a newer save is kept as it is and never written over', () => {
  const newer = {...fresh(), drivingLessons: {version: 2, done: {corner: true, line: true, ice: true}, extra: {keep: 1}}};
  const before = structuredClone(newer);
  assert.deepEqual(normalizeProfile(newer).drivingLessons, newer.drivingLessons);
  for (const id of DRIVE_LESSON_ORDER) {
    const result = finishDriveLesson(newer, id, .5, 'falcone_f42', {engineCurve: true});
    assert.equal(result.ok, false, id); assert.equal(result.profile, newer, id);
    assert.equal(grantDriveLessonReward(newer, id, 'falcone_f42').profile, newer, id);
  }
  assert.deepEqual(newer, before);
});

test('a player who finished all four keeps it through memory-only save and reload, next to an old player', () => {
  const data = new Map(), storage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v)};
  const registry = createPlayerRegistry(fresh());
  registry.players.push({id: 'old', name: 'Old', profile: {...fresh(), drivingLessons: {version: 1, done: {corner: true}, best: {corner: .3}, rewarded: {corner: true}}}});
  registry.players[0].profile = through(registry.players[0].profile, ['corner', 'line', 'gears', 'snow'], {engineCurve: true});
  assert.equal(savePlayers(registry, storage), true);
  const loaded = loadPlayers(storage);
  assert.deepEqual(loaded.players[0].profile.drivingLessons.done, {corner: true, line: true, gears: true, snow: true});
  const levels = loaded.players[0].profile.upgrades.falcone_f42;
  assert.deepEqual([levels.brakes, levels.handling, levels.engine, levels.tires], [1, 1, 2, 1]);
  assert.deepEqual(loaded.players[1].profile.drivingLessons, {version: 1, done: {corner: true}, best: {corner: .3}, rewarded: {corner: true}});
});
