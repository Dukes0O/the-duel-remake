// WW-SCREENS: the Everburn story card, Story Wall, Next up, gate, notice board
// and results tick. Screen props use in-memory profiles only.
import assert from 'node:assert/strict';
import {createProfile} from '../src/progression.js';
import {markEmberJob, markEmberRead, markEmberEnd, EMBER_JOBS} from '../src/story/ember-save.js';
import {emberStoryProps} from '../src/story/ember-road.js';
import {emberNextUp, emberResultLine, emberWallMarkup} from '../src/story/ember-ui.js';
import {storyCardKeys, storyView, storyCardMarkup} from '../src/story/story-ui.js';
import {EVERBURN_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {arenaResultsScreen} from '../src/screen-arena.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const count = (text, pattern) => (text.match(pattern) || []).length;
let profile = createProfile();
// Keep the locked-job guard checks with an explicit, temporary unremade list.
const actualRemade = [...REMADE_EVERBURN_JOBS];
REMADE_EVERBURN_JOBS.splice(0,REMADE_EVERBURN_JOBS.length,EVERBURN_JOBS[0].id);

// Nothing leaks through when the Everburn feature or the save is unavailable.
import '../src/story/ember-ui.js';
same(storyCardKeys().includes('ember'), true, 'the Everburn registers a Story choice');
same(emberStoryProps(profile).available, false, 'off by default');
same(emberWallMarkup(emberStoryProps(profile)), '', 'the Story Wall stays empty while unavailable');

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

// Adding the next job to the one remade list opens it on both screens.
const resultFor = job => arenaResultsScreen({arena: {mode: 'world-job', result: {winnerId: 'player'},
  worldJob: {definition: job}}}, {metric: () => '', action: (label, id) => `${id}:${label}|`, escapeHTML: String});
const afterFirst = emberStoryProps(markEmberJob(profile, EMBER_JOBS[0]).profile, {available: true});
same(afterFirst.steps.filter(step => step.state === 'open').length, 0, 'unremade next job stays locked');
ok(emberWallMarkup(afterFirst).includes('The next job is being made.'), 'wall explains the wait');
same(resultFor(EVERBURN_JOBS[0]).actions, 'arena-yard:BACK TO THE YARD|', 'result offers only the yard');
ok(resultFor(EVERBURN_JOBS[0]).description.includes('The next job is being made.'), 'result explains the wait');
REMADE_EVERBURN_JOBS.push(EVERBURN_JOBS[1].id);
try {
  const remade = emberStoryProps(markEmberJob(profile, EMBER_JOBS[0]).profile, {available: true});
  same(remade.steps.filter(step => step.state === 'open').map(step => step.id), [EMBER_JOBS[1]], 'only the remade next job opens');
  same(count(emberWallMarkup(remade), /data-ember-step=/g), 1, 'the remade next job has one wall button');
  ok(emberWallMarkup(remade).includes(`data-ember-step="${EMBER_JOBS[1]}"`), 'the wall button starts the remade job');
  ok(resultFor(EVERBURN_JOBS[0]).actions.includes('ember-next-job:NEXT JOB: LIGHT THE TOWN|'), 'result offers the remade next job');
} finally {
  REMADE_EVERBURN_JOBS.pop();
}

// Existing progress can reach the notice board even when later jobs are not offered.
for (const id of EMBER_JOBS.slice(0, 2)) profile = markEmberJob(profile, id).profile;
const afterWalk = emberStoryProps(profile, {available: true});
same(afterWalk.steps.filter(step => step.state === 'open').length, 0, 'the unremade next job is locked');
same(afterWalk.steps.filter(step => step.state === 'done').length, 2, 'the first two jobs are ticked');
same(afterWalk.noticeBoardOpen, true, 'the notice board opens after the walk');
same(afterWalk.sideJobs.length, 0, 'no unremade board job is offered');
const board = emberWallMarkup(afterWalk);
same(count(board, /data-ember-side-job=/g), 0, 'unremade board jobs have no take buttons');
ok(board.includes('TIN TOWN NOTICE BOARD') && board.includes('The next job is being made.'), 'the board explains the wait');
REMADE_EVERBURN_JOBS.push('everburn-lost-prospector');
try {
  const remadeBoard = emberWallMarkup(emberStoryProps(profile, {available: true}));
  same(count(remadeBoard, /data-ember-side-job=/g), 1, 'a remade board job has one take button');
  ok(remadeBoard.includes('data-ember-side-job="lost-prospector"'), 'the button names the remade board job');
} finally {
  REMADE_EVERBURN_JOBS.pop();
}
ok(!emberNextUp(afterWalk).text.includes('Run Him Down') && !emberNextUp(afterWalk).button, 'the yard does not name or offer an unremade job');
same(count(board, /data-ember-step=/g), 0, 'the unremade next story job has no button');
ok(board.includes('The next job is being made.'), 'the wall explains why the next job is locked');
const unsafe = emberStoryProps(profile, {available: true});
unsafe.steps[2].note = '<img src=x onerror=alert(1)>';
ok(!emberWallMarkup(unsafe).includes('<img'), 'story text is escaped');

// Only a won story job gets a result tick.
same(emberResultLine({emberJob: EMBER_JOBS[0], won: true}), 'Everburn: job 1, Hot Delivery, complete.', 'a won job gets a result tick');
same(emberResultLine({emberJob: EMBER_JOBS[0], won: false}), '', 'a lost job gets no result tick');
for (const id of EMBER_JOBS.slice(2)) profile = markEmberJob(profile, id).profile;
profile = markEmberEnd(profile).profile;
const ended = emberStoryProps(profile, {available: true});
same(ended.step, 'done', 'all six jobs finish the story');
same(ended.ended, true, 'the end mark is shown after completion');
same(count(emberWallMarkup(ended), /data-ember-step=/g), 0, 'finished story has no job button');

REMADE_EVERBURN_JOBS.splice(0,REMADE_EVERBURN_JOBS.length,...actualRemade);
let evening = markEmberRead(createProfile()).profile;
for (let index=0;index<2;index++) {
  evening=markEmberJob(evening,EMBER_JOBS[index]).profile;
  const next=emberStoryProps(evening,{available:true});
  same(next.steps.filter(step=>step.state==='open').map(step=>step.id),[EMBER_JOBS[index+1]],'the remade evening opens one next job in story order');
  ok(resultFor(EVERBURN_JOBS[index]).actions.includes(`NEXT JOB: ${EVERBURN_JOBS[index+1].name.toUpperCase()}`),'the result offers the next remade evening job');
}
console.log(`test-ember-screens: ${checks} checks passed`);
