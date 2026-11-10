// MENU-NEXT-UP: the old menu's Next up line and its NEW tags (behind the 'menu-next-up' switch).
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {screenMarkup, menuNewMarks, menuNextUpInner, syncNewMarks} from '../src/screen-menu.js';
import {frontDoorFacts} from '../src/menu-front-door.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {createProfile} from '../src/progression.js';
import {MEDAL_CARS} from '../src/medals.js';
import {lessonRows} from '../src/lab/lab-lessons.js';
import {CPU_DIFFICULTY} from '../src/config.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const choices = {cpuDifficulty: Object.keys(CPU_DIFFICULTY)[0], difficulty: 'casual'};
const base = {choices, arrow: '', sound: '', escapeHTML};
const flagsOn = names => createFeatureFlags({storage: null, overrides: Object.fromEntries(names.map(name => [name, true]))});
const actionsOf = html => [...html.matchAll(/data-action="([^"]+)"/g)].map(match => match[1]);
const SECTION = /<section id="menu-next-up"[\s\S]*?<\/section>/;
const labFacts = () => frontDoorFacts({profile: createProfile(), flags: flagsOn(['lab']), labOn: true});

test('the switch is declared and off, and the front door stays off', () => {
  assert.equal(FEATURE_STATES['menu-next-up'], 'dev');
  assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('menu-next-up'), false);
  assert.equal(FEATURE_STATES['menu-front-door'], 'dev');
});

test('switch off: the old menu is exactly today\'s markup', () => {
  const off = screenMarkup(base);
  assert.equal(off, screenMarkup({...base, nextUp: null}));
  assert.ok(!off.includes('menu-next-up'));
});

test('switch on: the old menu holds the Next up line, and its controls are the same, in the same order', () => {
  const off = screenMarkup(base), on = screenMarkup({...base, nextUp: {facts: labFacts()}});
  assert.match(on, SECTION);
  assert.match(on, /<section id="menu-next-up" class="menu-next-up" aria-label="Next up"><button type="button" id="fd-next" class="front-door-next" data-action="lab-open">/);
  assert.ok(on.includes('NEXT UP') && on.includes('A Lab lesson is open'));
  // Without the new line the markup is the old menu byte for byte, so nothing was added, removed or moved.
  assert.equal(on.replace(SECTION, ''), off);
  const before = actionsOf(off), after = actionsOf(on);
  assert.deepEqual(actionsOf(on.replace(SECTION, '')), before);
  assert.equal(after.length, before.length + 1, 'one new control: the line');
  assert.ok(before.length > 8, 'the old menu\'s controls were really counted');
  assert.ok(!before.includes('lab-open'));
  assert.deepEqual(after.filter(action => action !== 'lab-open'), before, 'the old controls keep their order; the line is the only addition');
});

test('the line comes after the lesson button, so the lesson window keeps finding its own button first', () => {
  const on = screenMarkup({...base, nextUp: {facts: labFacts()}});
  assert.ok(on.indexOf('id="driving-instructor"') < on.indexOf('id="menu-next-up"'), 'the first data-drive-open stays the INSTRUCTOR button');
  assert.ok(on.indexOf('id="heli-visit"') < on.indexOf('id="menu-next-up"'));
});

test('the line is hidden when Next up has nothing to say', () => {
  assert.equal(menuNextUpInner({}), '');
  const on = screenMarkup({...base, nextUp: {facts: {}}});
  assert.match(on, /<section id="menu-next-up" class="menu-next-up" aria-label="Next up" hidden><\/section>/);
  assert.equal(on.replace(SECTION, ''), screenMarkup(base));
});

test('each kind of Next up sends the player to the button that already exists', () => {
  const kinds = [
    [{labLesson: {id: 'rust', name: 'Rust'}}, 'data-action="lab-open"'],
    [{course: {id: 'high-country', name: 'High Country', price: 900}}, 'data-action="courses"'],
    [{hold: {name: 'Sawtooth Sal'}}, 'data-action="wasteland-visit"'],
    [{heliJob: {name: 'Mountain rescue'}}, 'data-action="heli-visit"'],
    [{driveLesson: {id: 'corner', name: 'driving lesson 1, cornering'}}, 'data-drive-open'],
    [{story: {step: 'invite', read: false}}, 'data-story-open'],
  ];
  for (const [facts, hook] of kinds) {
    const inner = menuNextUpInner(facts);
    assert.ok(inner.includes(hook), hook);
    assert.ok(!/[—]/.test(inner), 'no em dash');
  }
});

test('the front door keeps its own line: nothing is added to it', () => {
  const facts = labFacts();
  const door = screenMarkup({...base, frontDoor: {facts}, nextUp: {facts}});
  assert.ok(!door.includes('id="menu-next-up"'));
  assert.equal(door, screenMarkup({...base, frontDoor: {facts}}));
});

test('NEW: an open Lab lesson not yet passed', () => {
  const flags = flagsOn(['lab']);
  const open = frontDoorFacts({profile: createProfile(), flags, labOn: true});
  assert.ok(open.labLesson, 'a new profile has an open Lab lesson');
  assert.equal(menuNewMarks({profile: createProfile(), facts: open}).lab, true);
  // The same player after passing every lesson that was open.
  const passed = Object.fromEntries(lessonRows(createProfile(), flags).filter(row => row.open).map(row => [row.id, true]));
  const done = {...createProfile(), lab: {version: 1, done: passed}};
  const after = frontDoorFacts({profile: done, flags, labOn: true});
  assert.equal(after.labLesson, null);
  assert.equal(menuNewMarks({profile: done, facts: after}).lab, false);
  assert.equal(menuNewMarks({profile: createProfile(), facts: frontDoorFacts({profile: createProfile(), flags: flagsOn([]), labOn: false})}).lab, false, 'Lab off: no tag');
});

test('NEW: a story step waiting', () => {
  const waiting = frontDoorFacts({profile: createProfile(), flags: flagsOn([]), story: {available: true, step: 'lesson', read: true}});
  assert.equal(menuNewMarks({profile: createProfile(), facts: waiting}).story, true);
  const finished = frontDoorFacts({profile: createProfile(), flags: flagsOn([]), story: {available: true, step: 'done', read: true}});
  assert.equal(menuNewMarks({profile: createProfile(), facts: finished}).story, false);
  const off = frontDoorFacts({profile: createProfile(), flags: flagsOn([]), story: {available: false, step: null}});
  assert.equal(menuNewMarks({profile: createProfile(), facts: off}).story, false);
});

test('NEW: an earned car waiting', () => {
  const sheet = {version: 1, cars: {falcone_f42: {duel: [1, 1, 1], grandprix: [1, 1, 1]}}};
  const earned = {...createProfile(), medals: sheet};
  assert.equal(menuNewMarks({profile: earned, earnedCars: true}).garage, true, 'six medals earn the first medal car');
  assert.equal(menuNewMarks({profile: earned, earnedCars: false}).garage, false, 'the medal cars stay hidden with their switch off');
  const owned = {...earned, unlockedCars: [...earned.unlockedCars, MEDAL_CARS[0]]};
  assert.equal(menuNewMarks({profile: owned, earnedCars: true}).garage, false, 'in the garage: tag gone');
  assert.equal(menuNewMarks({profile: createProfile(), earnedCars: true}).garage, false);
});

test('NEW: a course owned with no finish', () => {
  const bought = {...createProfile(), courses: {version: 1, unlocked: ['high-country']}};
  assert.equal(menuNewMarks({profile: createProfile()}).courses, false, 'the free starter course never counts');
  assert.equal(menuNewMarks({profile: bought}).courses, true);
  const finished = {...bought, history: [{key: 'k', eventId: 'high-country', car: 'falcone_f42', won: false, completed: true, timeSec: 200, at: 1}]};
  assert.equal(menuNewMarks({profile: finished}).courses, false, 'finished once: tag gone');
  const abandoned = {...bought, history: [{key: 'k', eventId: 'high-country', car: 'falcone_f42', won: false, completed: false, abandoned: true, at: 1}]};
  assert.equal(menuNewMarks({profile: abandoned}).courses, true, 'leaving early is not a finish');
  const bestOnly = {...bought, personalBests: {'high-country|layout:4|seed:1|laps:2|falcone_f42|duel|casual|easy': 180}};
  assert.equal(menuNewMarks({profile: bestOnly}).courses, false, 'a saved best is a finish even when the old race rows are gone');
});

test('a profile from before this change loads unchanged', () => {
  const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
  const profile = deepFreeze(JSON.parse(JSON.stringify({...createProfile(), courses: {version: 1, unlocked: ['high-country']}, lab: {version: 1, done: {rust: true}}})));
  const copy = JSON.stringify(profile);
  const facts = frontDoorFacts({profile, flags: flagsOn(['lab']), labOn: true, lessonsOn: true});
  menuNewMarks({profile, facts, earnedCars: true});
  menuNextUpInner(facts);
  assert.equal(JSON.stringify(profile), copy, 'nothing was written to the profile');
  // A bare profile with none of the fields a later build adds is read without error.
  assert.doesNotThrow(() => menuNewMarks({profile: {}, facts: {}, earnedCars: true}));
  assert.doesNotThrow(() => menuNewMarks({profile: null}));
});

test('NEW tags are put on existing buttons and taken off again, and only once', () => {
  const makeButton = () => { let html = ''; return {
    get html() { return html; },
    querySelector: selector => selector === '.menu-new' && html.includes('menu-new') ? {remove: () => { html = ''; }} : null,
    insertAdjacentHTML: (where, text) => { assert.equal(where, 'beforeend'); html += text; }}; };
  const buttons = {'#heli-visit': makeButton(), '#story-visit': makeButton(), '#garage-open': makeButton(), '.course-store-button': makeButton()};
  const root = {querySelector: selector => buttons[selector] ?? null};
  syncNewMarks(root, {lab: true, story: false, garage: true, courses: false});
  syncNewMarks(root, {lab: true, story: false, garage: true, courses: false});
  assert.equal(buttons['#heli-visit'].html, '<i class="menu-new">NEW</i>', 'the Lab tag is on the Helipad button, once');
  assert.equal(buttons['#garage-open'].html, '<i class="menu-new">NEW</i>');
  assert.equal(buttons['#story-visit'].html, '');
  syncNewMarks(root, {lab: false, story: true, garage: false, courses: true});
  assert.equal(buttons['#heli-visit'].html, '');
  assert.equal(buttons['#garage-open'].html, '');
  assert.equal(buttons['#story-visit'].html, '<i class="menu-new">NEW</i>');
  assert.equal(buttons['.course-store-button'].html, '<i class="menu-new">NEW</i>');
  // A button the menu does not show (no helicopter, no story) is skipped without error.
  assert.doesNotThrow(() => syncNewMarks({querySelector: () => null}, {lab: true, story: true, garage: true, courses: true}));
});

test('the styles place the line on its own and float the tags, so no layout rule of the old menu changes', () => {
  const css = readFileSync(new URL('../src/screen-menu.css', import.meta.url), 'utf8');
  const mine = css.slice(css.indexOf('/* MENU-NEXT-UP'));
  assert.match(mine, /\.menu-next-up\{position:absolute;top:\d+px/);
  assert.match(mine, /\.menu-new\{position:absolute/);
  assert.ok(!/grid-template|grid-area|\.menu-screen\{|\.menu-intro|\.race-setup|\.garage\{/.test(mine), 'no rule for the menu\'s own grid or panels');
});
