// WW-SCREENS: the Everburn story card, Story Wall, Next up, gate, notice board
// and results tick. Screen props use in-memory profiles only.
import assert from 'node:assert/strict';
import {createProfile} from '../src/progression.js';
import {markEmberJob, markEmberRead, markEmberEnd, EMBER_JOBS} from '../src/story/ember-save.js';
import {emberStoryProps} from '../src/story/ember-road.js';
import {emberNextUp, emberResultLine, emberWallMarkup, scablandsGateMarkup} from '../src/story/ember-ui.js';
import {storyCardKeys, storyView, storyCardMarkup} from '../src/story/story-ui.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const count = (text, pattern) => (text.match(pattern) || []).length;
let profile = createProfile();

// Nothing leaks through when the Everburn feature or the save is unavailable.
import '../src/story/ember-ui.js';
same(storyCardKeys().includes('ember'), true, 'the Everburn registers a Story choice');
same(emberStoryProps(profile).available, false, 'off by default');
same(emberWallMarkup(emberStoryProps(profile)), '', 'the Story Wall stays empty while unavailable');
same(scablandsGateMarkup().length, 0, 'the Scablands gate stays hidden while unavailable');

// A new story shows Hollis’s note and only its first job button.
profile = markEmberRead(profile).profile;
const first = emberStoryProps(profile, {available: true});
same(first.step, EMBER_JOBS[0], 'reading the note opens Hot Delivery');
const card = storyCardMarkup(storyView(first, 'ember'));
same(count(card, /data-story-step=/g), 1, 'the Story choice has one open-job button');
ok(card.includes('A woman named Cinder') && card.includes('Go to the back gate'), 'the Story choice shows Hollis’s note and the back gate action');
const wall = emberWallMarkup(first);
same(count(wall, /data-ember-step=/g), 1, 'the Story Wall has one button for the open job');
ok(wall.includes('THE EVERBURN') && wall.includes('Hot Delivery'), 'the Story Wall shows the first job');
ok(emberNextUp(first).text.startsWith('Next up: Hot Delivery.') && emberNextUp(first).button.includes('Go to the back gate'), 'Next up names the job and has one action');

// Progress is ordered, never duplicates buttons, and the notice board opens after job 2.
for (const id of EMBER_JOBS.slice(0, 2)) profile = markEmberJob(profile, id).profile;
const afterWalk = emberStoryProps(profile, {available: true});
same(afterWalk.steps.filter(step => step.state === 'open').length, 1, 'only one job is open');
same(afterWalk.steps.filter(step => step.state === 'done').length, 2, 'the first two jobs are ticked');
same(afterWalk.sideJobs.length, 3, 'the notice board opens after the walk');
const board = emberWallMarkup(afterWalk);
same(count(board, /data-ember-side-job=/g), 3, 'each notice-board job has one take button');
same(count(board, /data-ember-step=/g), 1, 'the next story job has one button');
const unsafe = emberStoryProps(profile, {available: true});
unsafe.steps[2].note = '<img src=x onerror=alert(1)>';
ok(!emberWallMarkup(unsafe).includes('<img'), 'story text is escaped');

// Back gate and free driving are separate choices; only a won story job gets a result tick.
const gate = scablandsGateMarkup({available: true});
same(count(gate, /<button/g), 2, 'the Scablands offers entry and free driving');
ok(gate.includes('BACK GATE') && gate.includes('DRIVE THE SCABLANDS'), 'the two routes are named plainly');
same(emberResultLine({emberJob: EMBER_JOBS[0], won: true}), 'Everburn: job 1, Hot Delivery, complete.', 'a won job gets a result tick');
same(emberResultLine({emberJob: EMBER_JOBS[0], won: false}), '', 'a lost job gets no result tick');
for (const id of EMBER_JOBS.slice(2)) profile = markEmberJob(profile, id).profile;
profile = markEmberEnd(profile).profile;
const ended = emberStoryProps(profile, {available: true});
same(ended.step, 'done', 'all six jobs finish the story');
same(ended.ended, true, 'the end mark is shown after completion');
same(count(emberWallMarkup(ended), /data-ember-step=/g), 0, 'finished story has no job button');

console.log(`test-ember-screens: ${checks} checks passed`);
