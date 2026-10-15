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
