import assert from 'node:assert/strict';
import {test} from 'node:test';
import {screenMarkup} from '../src/screen-menu.js';
import {readFileSync} from 'node:fs';
import {frontDoorFacts, chooseNextUp, doorList, doorTile, driveSummary, lastTimeLine} from '../src/menu-front-door.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {createProfile} from '../src/progression.js';
import {CPU_DIFFICULTY} from '../src/config.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const choices = {cpuDifficulty: Object.keys(CPU_DIFFICULTY)[0], difficulty: 'casual'};
const base = {choices, arrow: '', sound: '', escapeHTML};
const flagsOn = names => createFeatureFlags({storage: null, overrides: Object.fromEntries(names.map(name => [name, true]))});

test('the switch is declared, on since 30 October 2026, and an override can still turn it off', () => {
  assert.equal(FEATURE_STATES['menu-front-door'], 'on');
  assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('menu-front-door'), true);
  assert.equal(createFeatureFlags({storage: null, overrides: {'menu-front-door': false}}).enabled('menu-front-door'), false);
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
  for (const id of ['start-engine', 'scene-select', 'car-select', 'lighting-mood', 'graphics-quality']) assert.ok(on.includes(`id="${id}"`), id);
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

test('next up reads the hold, the helicopter job and the sea log', () => {
  const profile = {...createProfile(), wasteland: {...createProfile().wasteland, territories: {sal: {hold: 75, claimed: false}, gunn: {hold: 100, claimed: true}}}};
  const extras = {heliJob: {name: 'Recover the Falcone F42 from Panorama Ridge'}, seaCreature: {id: 'reef-fish', name: 'Reef fish'}};
  const closed = frontDoorFacts({profile, flags: flagsOn([]), wastelandOpen: false, heliOn: true, ...extras});
  assert.equal(closed.hold, null, 'no hold line while the Wasteland is shut');
  const open = frontDoorFacts({profile, flags: flagsOn([]), wastelandOpen: true, heliOn: true, ...extras});
  assert.equal(open.hold.name, 'Sawtooth Sal');
  assert.equal(chooseNextUp(open).kind, 'hold');
  assert.equal(chooseNextUp({...open, hold: null}).kind, 'heli');
  assert.equal(chooseNextUp({...open, hold: null, heliJob: null}).kind, 'creature');
  assert.equal(frontDoorFacts({profile, flags: flagsOn([]), wastelandOpen: true, heliOn: false, ...extras}).heliJob, null, 'no helicopter line with the helicopter off');
});

test('drive summary reads in plain words', () => {
  assert.equal(driveSummary({carName: 'Falcone F42', mode: 'duel', level: 'Rookie'}), 'your Falcone F42 · Rival duel · Rookie');
  assert.ok(!/[—]/.test(driveSummary({carName: 'X', mode: 'timetrial', level: 'Pro'})));
});

// Round 2: what happened last time, the Wasteland badge and the drawer's place.
const raced = (rows, best = {}) => ({...createProfile(), history: rows, personalBests: best});
const row = (extra = {}) => ({key: 'k' + Math.random(), eventId: 'pacific-canyon', car: 'falcone_f42', won: true, completed: true, timeSec: 187.4, cpuDifficulty: 'easy', reward: 600, at: 1, ...extra});

test('last time: a new player sees nothing', () => {
  assert.equal(lastTimeLine(createProfile(), 0), '');
  assert.equal(lastTimeLine(null, 0), '');
  assert.equal(lastTimeLine(createProfile(), 999), '');
});

test('last time: the latest race on the chosen course, in plain words', () => {
  assert.equal(lastTimeLine(raced([row()]), 0), 'Last time: won in 03:07.40');
  assert.equal(lastTimeLine(raced([row({won: true, timeSec: 200}), row({won: false, timeSec: 191.25})]), 0), 'Last time: lost, you finished in 03:11.25');
  assert.equal(lastTimeLine(raced([row({won: false, completed: false, timeSec: null})]), 0), 'Last time: the race did not finish');
  assert.equal(lastTimeLine(raced([row({won: false, completed: false, abandoned: true, timeSec: null})]), 0), 'Last time: you left the race early');
  // Only this course counts; a later race elsewhere does not replace it.
  assert.equal(lastTimeLine(raced([row(), row({eventId: 'high-country', won: false})]), 0), 'Last time: won in 03:07.40');
});

test('last time: personal best on the course, and a returning player on a fresh course', () => {
  const best = {'pacific-canyon|layout:4|seed:1989|laps:2|falcone_f42|duel|casual|easy': 185.1, 'pacific-canyon|layout:4|seed:1989|laps:2|stuttgart_959s|duel|casual|easy': 190};
  assert.equal(lastTimeLine(raced([row()], best), 0), 'Last time: won in 03:07.40 · Best 03:05.10');
  assert.equal(lastTimeLine(raced([], best), 0), 'Your best here: 03:05.10');
  // The best of another course does not leak in.
  assert.equal(lastTimeLine(raced([], {'high-country|layout:4|x': 150}), 0), 'You have not raced here yet.');
  assert.equal(lastTimeLine(raced([row()]), 1), 'You have not raced here yet.');
  for (const line of [lastTimeLine(raced([row()], best), 0), lastTimeLine(raced([row({won: false})]), 0)]) assert.ok(!/[—]/.test(line));
});

test('last time: the Drive card has its line, hidden until the menu fills it', () => {
  const on = screenMarkup({...base, frontDoor: {facts: frontDoorFacts({profile: createProfile(), flags: flagsOn([])})}});
  assert.match(on, /<p id="fd-last" class="front-door-last" hidden><\/p>/);
  assert.ok(on.indexOf('id="fd-summary"') < on.indexOf('id="fd-last"') && on.indexOf('id="fd-last"') < on.indexOf('id="fd-start-slot"'), 'the line sits between the summary and START ENGINE');
  assert.ok(!screenMarkup(base).includes('fd-last'), 'switch off: nothing new');
});

test('the Wasteland door says when a boss hold is nearly done', () => {
  const profile = hold => ({...createProfile(), wasteland: {...createProfile().wasteland, territories: {sal: hold}}});
  const door = hold => doorList(frontDoorFacts({profile: profile(hold), flags: flagsOn([]), wastelandOpen: true})).find(item => item.id === 'wasteland');
  assert.equal(door({hold: 75, claimed: false}).badge, 'NEARLY WON');
  assert.match(door({hold: 75, claimed: false}).note, /Sawtooth Sal/);
  assert.equal(door({hold: 100, claimed: false}).badge, 'NEARLY WON', 'a full hold that is not yet claimed is still waiting');
  assert.equal(door({hold: 50, claimed: false}).badge, 'READY');
  assert.equal(door({hold: 100, claimed: true}).badge, 'READY');
  assert.equal(door({hold: 75, claimed: true}).badge, 'READY');
  // The Wasteland still shut: locked, whatever the save says.
  const shut = doorList(frontDoorFacts({profile: profile({hold: 75, claimed: false}), flags: flagsOn([]), wastelandOpen: false})).find(item => item.id === 'wasteland');
  assert.equal(shut.badge, 'LOCKED');
  // The tile keeps one plain class for the colour and shows the words.
  const tile = doorTile(door({hold: 75, claimed: false}) && {...door({hold: 75, claimed: false}), id: 'wasteland', label: 'Wasteland', action: 'wasteland-visit'});
  assert.match(tile, /class="front-door-badge badge-new">NEARLY WON</);
});

test('the options drawer sits beside the Drive card and above the doors', () => {
  const css = readFileSync(new URL('../src/screen-front-door.css', import.meta.url), 'utf8');
  const rule = css.match(/\.front-door-options\{([^}]*)\}/)[1];
  assert.match(rule, /position:absolute/);
  assert.match(rule, /grid-area:1\/2\/5\/3/, 'the drawer fills the right column above the doors row');
  assert.match(rule, /overflow-y:auto/, 'its own contents scroll, not the page');
  assert.ok(!/bottom:\d+px/.test(rule), 'no fixed offset that could reach under the doors');
  assert.match(css, /grid-template-areas:'intro \.' 'drive \.' 'next \.' '\. \.' 'doors doors'/);
  assert.match(css, /\.in-menu \.menu-screen\.front-door-on \.front-door-credits\{position:absolute/, 'the credits link stays out of the grid');
});

test('a Story door leads while the story has something left, with NEW for a waiting message', () => {
  const door = story => doorList({story}).find(item => item.id === 'story');
  assert.equal(doorList({}).length, 8);
  assert.equal(door(null), undefined);
  assert.deepEqual([door({step: 'invite', read: false}).badge, door({step: 'lesson', read: true}).badge, door({step: 'ana', read: true}).badge], ['NEW', 'READY', 'NEW']);
  const doors = doorList({story: {step: 'duel', read: true}});
  assert.equal(doors.length, 9);
  assert.equal(doors[0].id, 'story');
  assert.ok(doorTile(doors[0]).includes('data-story-open') && !doorTile(doors[0]).includes('data-action'));
});
