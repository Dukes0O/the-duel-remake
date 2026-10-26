// Actual fixed-step flights, with memory-only profiles. No graphics or storage.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {logbookOf, logbookView, LOGBOOK_PLACES} from '../src/heli/heli-logbook.js';
import {shelfMarkup} from '../src/heli/heli-logbook-ui.js';
import {mapModel, placeNote} from '../src/heli/pilot-map-view.js';
import {createMissions, setMissions, missionsOf} from '../src/heli/heli-save.js';
import {armMissions} from '../src/heli/heli-missions.js';

const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(c => c.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}
const trained = {liftoff: true, hover: true, landing: true, carry: true};
const fresh = () => ({credits: 10000, heli: {version: 1, fuelKg: 400, lessons: trained}});
function make(profile = fresh(), options = {}) {
  return createHeliSession({profile, enabled: true, logbookEnabled: true, loadCourse, ...options});
}
function run(session, seconds, controls) {
  const events = [];
  for (let i = 0; i < seconds * 120; i++) events.push(...session.step(controls(session.view())));
  return events;
}
const up = () => ({lift: 1});
const down = view => ({lift: Math.max(-1, Math.min(1, (view.zone.y - 1 - view.heli.y) * .3 - view.heli.vy * .3))});
const session = make();
session.start();
run(session, 1, () => ({}));
assert.equal(session.view().logbook.notice.id, 'student');
assert.match(shelfMarkup(session.view()), /THE SHELF/);
session.dismissRank();
assert.equal(session.view().logbook.notice, null);
for (let flight = 1; flight <= 10; flight++) {
  run(session, 4, up);
  assert.equal(logbookOf(session.profile).flights, flight - 1, 'takeoff alone is not a flight');
  assert.equal(shelfMarkup(session.view()), '', 'shelf is only at home on the pad');
  const events = run(session, 30, down);
  assert.ok(events.some(e => e.type === 'touchdown'), 'pilot landed');
  assert.equal(logbookOf(session.profile).flights, flight);
  run(session, 1, down);
  assert.equal(logbookOf(session.profile).flights, flight, 'resting never counts twice');
}
assert.equal(session.view().logbook.notice.id, 'private');
assert.match(shelfMarkup(session.view()), /supervised training flights/);
assert.match(shelfMarkup(session.view()), /1964/);
assert.match(shelfMarkup(session.view()), /Flat-topped mesa/);
assert.equal(logbookView(session.profile).rank.id, 'private');
const map = mapModel({view: {...session.view(), destinations: []}, profile: session.profile});
const table = map.places.find(p => p.id === 'the-table');
assert.ok(table, 'Gus marks the Table before discovery');
assert.match(placeNote(map, table), /Gus 1964/);
assert.equal(table.isDestination, false, 'a clue never unlocks a destination');
assert.equal(session.wearLogbookPaint('rank-student').ok, true, 'earned paint stays selectable without heli-skins');
assert.equal(session.wearLogbookPaint('rank-chief').ok, false, 'cannot wear an unearned paint');
const restored = make(session.profile);
restored.start();
run(restored, 1, () => ({}));
assert.equal(restored.view().logbook.notice, null, 'reload never repeats a rank');
assert.match(shelfMarkup(restored.view()), /1964/);
run(restored, 4, up);
restored.leave();
restored.start();
run(restored, 1, () => ({}));
assert.equal(logbookOf(restored.profile).flights, 10, 'quitting in flight adds nothing');
const off = make(fresh(), {logbookEnabled: false});
off.start();
run(off, 4, up); run(off, 30, down);
assert.equal(off.profile.heli.logbook, undefined, 'off switch adds no keys');
assert.equal(off.view().logbook, undefined);
// A home touchdown during a live supply rescue must retain the mission gear.
const rescueProfile = fresh();
rescueProfile.courses = {version: 1, unlocked: ['tremblant-woods', 'tremblant-snow']};
rescueProfile.heli.logbook = {flights: 9, jobs: {}, visited: [], awarded: 1};
rescueProfile.heli.skins = {owned: ['supply', 'rank-student'], worn: 'supply', fresh: []};
const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'Logbook QA'});
const ready = setMissions(rescueProfile, {...armed, count: armed.need,
  call: {kind: 'supply', id: 'supply-0', courseId: 'tremblant-snow', day: 0, answered: false}}, {enabled: true}).profile;
const rescue = make(ready, {rescueEnabled: true, fireEnabled: true, skinsEnabled: true, loadFireCourse: loadCourse});
rescue.start();
assert.ok(rescue.pressRadio());
assert.equal(missionsOf(rescue.profile).rescue.kind, 'supply');
run(rescue, 4, up); run(rescue, 30, down);
assert.equal(logbookOf(rescue.profile).flights, 10);
assert.equal(rescue.view().skins.worn, 'supply', 'pending rank keeps live cargo gear fitted');
assert.equal(rescue.view().logbook.notice, null, 'award waits until the rescue ends');
rescue.leave();
rescue.start();
run(rescue, 1, () => ({}));
assert.equal(rescue.view().logbook.notice.id, 'private', 'deferred rank is not lost');
const chiefProfile = fresh();
chiefProfile.heli.logbook = {flights: 50, jobs: {car: 1, crate: 1, fire: 1, rescue: 1, ski: 1}, visited: LOGBOOK_PLACES, awarded: 4};
const chief = make(chiefProfile);
chief.start(); run(chief, 1, () => ({}));
const chiefShelf = shelfMarkup(chief.view());
assert.equal(chief.view().logbook.notice.id, 'chief');
assert.match(chiefShelf, /Ana:/, 'Chief receives Ana’s text call');
assert.equal(chief.view().logbook.books.length, 4);
for (const year of [1964, 1966, 1972, 1981]) assert.match(chiefShelf, new RegExp(String(year)));
console.log('HELI-LOGBOOK session: ten real flights, once-only ranks, shelf, map clues and switch isolation passed');
