// DRIVE-LESSON-CORE: the lesson contract, the instructor's radio voice and the
// instructor's list, shared by the helicopter and driving lessons
// (docs/DRIVING_LESSONS.md section 2).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COACH_EVERY, LESSON_RESULTS, lessonOpen, tickCoach, coachDue, coachSaid, passed, retry} from '../src/lessons/lesson-core.js';
import {HELI_RADIO_VOICE, RADIO_FILTER, softClipCurve, createRadioChain} from '../src/lessons/radio-voice.js';
import {lessonBoardMarkup} from '../src/lessons/lesson-board.js';
import * as heliAudio from '../src/heli/heli-audio.js';
import * as heliLines from '../src/heli/heli-radio-lines.js';
import * as heliLessons from '../src/heli/heli-lessons.js';
import {lessonsMarkup} from '../src/heli/heli-ui.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The contract.
same(LESSON_RESULTS, ['running', 'passed', 'retry'], 'a step answers running, passed or retry');
same(COACH_EVERY, 6, 'one coaching line every 6 seconds at most');
{
  const order = ['a', 'b', 'c'];
  ok(lessonOpen(order, {}, 'a') && !lessonOpen(order, {}, 'b'), 'the first lesson is open; the next waits');
  ok(lessonOpen(order, {a: true}, 'b') && !lessonOpen(order, {a: true}, 'c'), 'each lesson opens the next');
  ok(!lessonOpen(order, {a: true, b: true, c: true}, 'z'), 'an unknown lesson is never open');
  ok(!lessonOpen(order, {a: 'yes'}, 'b'), 'only a true done mark opens the next');
}
{
  const lesson = {coachIn: 0, held: 3, failed: false, done: false};
  coachSaid(lesson);
  same(lesson.coachIn, COACH_EVERY, 'coaching starts the timer again');
  for (let step = 0; step < 5.5 * 120; step++) tickCoach(lesson, 1 / 120);
  ok(!coachDue(lesson), 'no coaching before 6 seconds');
  for (let step = 0; step < 120; step++) tickCoach(lesson, 1 / 120);
  ok(coachDue(lesson), 'coaching is due after 6 seconds');
  coachSaid(lesson, 2);
  same(lesson.coachIn, 2, 'a mode may coach on its own interval');
  same(retry(lesson, 'drive.radio.retry'), {result: 'retry', radio: 'drive.radio.retry'}, 'retry answers with the line it is given');
  ok(lesson.held === 0 && lesson.failed && !lesson.done, 'retry clears the hold and marks a miss');
  same(passed(lesson, 'drive.radio.one.pass'), {result: 'passed', radio: 'drive.radio.one.pass'}, 'passed answers with the line it is given');
  ok(lesson.done, 'passed marks the lesson done');
}
{
  const source = read('src/lessons/lesson-core.js');
  ok(!/\bimport\b/.test(source), 'the contract imports nothing');
  ok(!/\bdocument\b|\bwindow\b|Math\.random|Date\.now|new Date|performance\.now|localStorage|requestAnimationFrame|crypto/.test(source),
    'the contract uses no page, clock, storage or randomness');
}

// The helicopter keeps its names and calls the shared pieces.
same(heliLessons.lessonOpen({}, 'liftoff'), lessonOpen(heliLessons.LESSON_ORDER, {}, 'liftoff'), 'the helicopter keeps two-argument lessonOpen');
ok(heliLessons.lessonOpen({liftoff: true}, 'hover') && !heliLessons.lessonOpen({}, 'hover'), 'the helicopter order is unchanged');
same(heliLessons.LESSON_RULES.coachEvery, COACH_EVERY, 'the helicopter coaches on the shared timer');
{
  // A crash in lesson 3 still resets the climb it saw, then tries again.
  const lesson = heliLessons.createLesson('landing', {spot: {x: 0, z: 0}});
  const view = {heli: {x: 0, z: 0, y: 4, groundY: 0, onGround: false}};
  heliLessons.stepLesson(lesson, view, []);
  ok(lesson.sawLift, 'lesson 3 sees the climb');
  same(heliLessons.stepLesson(lesson, view, [{type: 'crashed'}]), {result: 'retry', radio: 'heli.radio.retry'}, 'a crash is a retry with the helicopter line');
  ok(!lesson.sawLift && lesson.failed && lesson.held === 0, 'the retry clears the climb, the hold and marks a miss');
}

// One radio voice: the helicopter re-exports the same objects.
same(HELI_RADIO_VOICE, {name: 'Brian', voiceId: 'nPczCjzI2devNBz1zQrb'}, 'the instructor is Brian');
ok(heliLines.HELI_RADIO_VOICE === HELI_RADIO_VOICE && heliLines.HELI_VOICES.brian === HELI_RADIO_VOICE, 'the helicopter lines use the shared voice');
ok(heliAudio.RADIO_FILTER === RADIO_FILTER && heliAudio.softClipCurve === softClipCurve && heliAudio.createRadioChain === createRadioChain,
  'the helicopter sound re-exports the shared radio');
ok(!/function createRadioChain|function softClipCurve|RADIO_FILTER = /.test(read('src/heli/heli-audio.js')), 'the radio is no longer defined in src/heli');

// The instructor's list.
{
  const rows = [
    {group: 'Driving', id: 'brake', name: 'Brake <late>', open: true, done: false},
    {group: 'Driving', id: 'line', name: 'The line', open: false, done: false},
    {group: 'Helicopter', id: 'liftoff', name: 'Lift-off', open: true, done: true},
  ];
  const html = lessonBoardMarkup(rows, {action: 'data-x'});
  ok(html.startsWith('<ul class="lesson-board">') && html.endsWith('</ul>'), 'plain rows in, the list out');
  ok(html.includes('<li class="lesson-board-group">Driving</li>') && html.includes('<li class="lesson-board-group">Helicopter</li>'), 'two groups get headings');
  ok(html.includes('data-x="start:brake">Start') && html.includes('data-x="start:liftoff">Retake'), 'open rows start, done rows retake');
  ok(html.includes('<li class="lesson-board-locked"><span>The line</span><small>Opens later</small>'), 'a locked row says it opens later');
  ok(html.includes('Brake &lt;late&gt;') && html.includes('✓ Lift-off'), 'names are escaped and done rows ticked');
  ok(!lessonBoardMarkup([rows[0]]).includes('lesson-board-group') && lessonBoardMarkup([rows[0]]).includes('data-lesson="start:brake"'),
    'one group needs no heading; the default action is data-lesson');
  same(lessonBoardMarkup([]), '', 'no rows, no list');
}
{
  // The helipad draws its list through the shared board, inside its own panel.
  const view = {phase: 'flying', courseId: 'tremblant-woods', zone: {x: 0, z: 0, y: 10, radius: 12}, heli: {x: 0, z: 0, y: 10, onGround: true}};
  const board = heliLessons.LESSON_ORDER.map((id, index) => ({id, open: index === 0, done: false}));
  const html = lessonsMarkup(view, board, {opening: true});
  same(html, '<div class="heli-lessons" role="group" aria-label="Instructor"><span>INSTRUCTOR</span>' +
    lessonBoardMarkup(board.map(item => ({group: 'Helicopter', id: item.id, name: {liftoff: '1 Lift-off', hover: '2 Hover', landing: '3 Landing', carry: '4 Carry and set down'}[item.id],
      open: item.open, done: item.done})), {action: 'data-heli-lesson'}) +
    '<button type="button" class="heli-skip" data-heli-lesson="skip">Skip the opening (marks lessons 1 and 2 done)</button></div>',
    'the helipad wraps the shared list in its own panel with its skip button');
}

// Styles moved with the list: the helipad keeps its look through lesson-board.css.
{
  const heliCss = read('src/heli/heli-ui.css'), boardCss = read('src/lessons/lesson-board.css'), router = read('src/screen-router.js');
  ok(!/heli-lesson-(locked|done)|\.heli-lessons (li|small|ul)/.test(heliCss), 'the list styles are gone from heli-ui.css');
  ok(boardCss.includes('li.lesson-board-done span{color:#9fd49a}') && boardCss.includes('li.lesson-board-locked{color:#ffffff66}'),
    'done and locked rows keep their colours');
  ok(router.includes("import './lessons/lesson-board.css';"), 'the page loads the list styles');
}

console.log(`test-heli-lesson-core: ${checks} checks passed`);
