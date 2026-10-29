import assert from 'node:assert/strict';
import {test} from 'node:test';
import {screenMarkup} from '../src/screen-menu.js';
import {frontDoorFacts, chooseNextUp, doorList, driveSummary} from '../src/menu-front-door.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {createProfile} from '../src/progression.js';
import {CPU_DIFFICULTY} from '../src/config.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const choices = {cpuDifficulty: Object.keys(CPU_DIFFICULTY)[0], difficulty: 'casual'};
const base = {choices, arrow: '', sound: '', escapeHTML};
const flagsOn = names => createFeatureFlags({storage: null, overrides: Object.fromEntries(names.map(name => [name, true]))});

test('the switch is declared and starts off', () => {
  assert.equal(FEATURE_STATES['menu-front-door'], 'dev');
  assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('menu-front-door'), false);
});

test('switch off leaves today\'s markup', () => {
  const off = screenMarkup(base);
  assert.equal(off, screenMarkup({...base, frontDoor: null}));
  assert.ok(!off.includes('front-door'));
  assert.ok(off.includes('class="wordmark"') && off.includes('CHOOSE YOUR WEAPON'));
  assert.ok(off.includes('id="start-engine"') && off.includes('class="race-setup"'));
});

test('switch on renders the three parts and eight doors', () => {
  const facts = frontDoorFacts({profile: createProfile(), flags: flagsOn(['lab']), wastelandOpen: true, heliOn: true, labOn: true, lessonsOn: true});
  const on = screenMarkup({...base, frontDoor: {facts}});
  for (const part of ['class="front-door-drive"', 'id="fd-nextup"', 'id="fd-doors"', 'id="fd-start-slot"', 'id="race-options"']) assert.ok(on.includes(part), part);
  assert.ok(!on.includes('class="wordmark"'), 'only one logo');
  assert.ok(!on.includes('CHOOSE YOUR WEAPON') && !on.includes('BUILD ') && !on.includes('BUILT FOR THE DRIVE'), 'plain words, no build stamp');
  // The old controls are still there, for the drawer to hold.
  for (const id of ['start-engine', 'scene-select', 'car-select', 'driver-select', 'lighting-mood', 'graphics-quality']) assert.ok(on.includes(`id="${id}"`), id);
  const doors = [...on.matchAll(/data-door="([a-z]+)"[^>]*?(data-action="([a-z-]+)"|data-drive-open)/g)].map(m => [m[1], m[3] ?? 'data-drive-open']);
  assert.deepEqual(doors, [['garage', 'garage'], ['courses', 'courses'], ['armory', 'armory'], ['wasteland', 'wasteland-visit'],
    ['helipad', 'heli-visit'], ['lab', 'lab-open'], ['lessons', 'data-drive-open'], ['scores', 'leaderboard']]);
});

test('a locked door says why and has no action', () => {
  const facts = frontDoorFacts({profile: createProfile(), flags: flagsOn([])});
  const doors = doorList(facts);
  assert.equal(doors.length, 8);
  const lab = doors.find(door => door.id === 'lab'), wasteland = doors.find(door => door.id === 'wasteland');
  assert.equal(lab.badge, 'LOCKED'); assert.ok(lab.note.length > 3);
  assert.equal(wasteland.badge, 'LOCKED');
  const markup = screenMarkup({...base, frontDoor: {facts}});
  assert.match(markup, /data-door="lab" aria-disabled="true" disabled/);
});

test('next up picks the first match in the ordered list', () => {
  const none = {};
  const lab = {id: 'lift', name: 'Lift and weight'}, course = {id: 'c', name: 'High Country', price: 900},
    hold = {name: 'Dust Ridge'}, heliJob = {name: 'Mountain rescue'}, driveLesson = {id: 'corner', name: 'driving lesson 1'}, creature = {name: 'the sea turtle'};
  assert.equal(chooseNextUp(none).kind, 'none');
  assert.equal(chooseNextUp({creature}).kind, 'creature');
  assert.equal(chooseNextUp({creature, driveLesson}).kind, 'lesson');
  assert.equal(chooseNextUp({creature, driveLesson, heliJob}).kind, 'heli');
  assert.equal(chooseNextUp({creature, driveLesson, heliJob, hold}).kind, 'hold');
  assert.equal(chooseNextUp({creature, driveLesson, heliJob, hold, course}).kind, 'course');
  const all = chooseNextUp({creature, driveLesson, heliJob, hold, course, labLesson: lab});
  assert.equal(all.kind, 'lab'); assert.equal(all.action, 'lab-open');
  assert.equal(chooseNextUp({driveLesson}).attr, 'data-drive-open');
});

test('next up from sample saves', () => {
  const poor = createProfile();
  const flags = flagsOn(['lab']);
  // New player, lab and lessons on: the Lab lesson comes first.
  const fresh = frontDoorFacts({profile: poor, flags, labOn: true, lessonsOn: true});
  assert.equal(chooseNextUp(fresh).kind, fresh.labLesson ? 'lab' : 'lesson');
  // Lab off, lessons on: the next driving lesson.
  const lessonOnly = frontDoorFacts({profile: poor, flags: flagsOn([]), lessonsOn: true});
  assert.equal(lessonOnly.labLesson, null);
  assert.equal(chooseNextUp(lessonOnly).kind, lessonOnly.course ? 'course' : 'lesson');
  assert.equal(lessonOnly.driveLesson.id, 'corner');
  // Rich player, nothing else on: an affordable course.
  const rich = frontDoorFacts({profile: {...createProfile(), credits: 99999}, flags: flagsOn([])});
  assert.ok(rich.course, 'a rich save can afford a course');
  assert.equal(chooseNextUp(rich).kind, 'course');
  // Nothing at all: the plain sentence.
  const empty = frontDoorFacts({profile: poor, flags: flagsOn([])});
  assert.equal(chooseNextUp({...empty, course: null}).kind, 'none');
});

test('drive summary reads in plain words', () => {
  assert.equal(driveSummary({carName: 'Falcone F42', mode: 'duel', level: 'Rookie'}), 'your Falcone F42 · Rival duel · Rookie');
  assert.ok(!/[—]/.test(driveSummary({carName: 'X', mode: 'timetrial', level: 'Pro'})));
});
