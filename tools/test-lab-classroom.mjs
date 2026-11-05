// LAB-CLASSROOM (docs/board/cards/LAB-CLASSROOM.md): the classroom frame and the rebuilt pendulum lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, STUCK_OFFER_S, STUCK_HINT_S, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {KEY_NAMES} from '../src/lab/classroom/classroom-keys.js';
import {readFileSync} from 'node:fs';
import {STEPS, LENGTHS, HOOK_X, KEY_IDEAS, FREE_TRIES, MIN_PULL, PI_SHOWN, G_SHOWN, sumSeconds} from '../src/lab/lessons/pendulum-classroom.js';
import {createLoad, stepCable} from '../src/heli/heli-cable.js';
import {HELI_STEP} from '../src/heli/heli-flight.js';
import {CHALLENGE_RULES} from '../src/lab/lab-challenges.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, bobPoint} from '../src/lab/lessons/pendulum-board.js';
import {stringPeriod} from '../src/lab/benches/pendulum.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {STEPS as GFORCE_STEPS, KEY_IDEAS as GFORCE_IDEAS, createModel as createGforceModel} from '../src/lab/lessons/gforce-classroom.js';
import * as gforceBoard from '../src/lab/lessons/gforce-board.js';
import {lateralG} from '../src/lab/benches/gforce.js';
import {STEPS as GRIP_STEPS, createModel as createGripModel, lesson as gripLesson} from '../src/lab/lessons/grip-classroom.js';
import * as gripBoard from '../src/lab/lessons/grip-board.js';
import {gripBench, slipAtAngle, bestSlideDegrees} from '../src/lab/benches/tunnel.js';
import {tyreSlipGrip} from '../src/config.js';
import {STEPS as SUSPENSION_STEPS, WORDS as SUSPENSION_WORDS, createModel as createSuspensionModel} from '../src/lab/lessons/suspension-classroom.js';
import * as suspensionBoard from '../src/lab/lessons/suspension-board.js';
import {suspensionBench} from '../src/lab/benches/tunnel.js';
import {lessonOpenState} from '../src/lab/lab-lessons.js';

const lesson = CLASSROOM_LESSONS.pendulum;
const fakeCanvas = (labels = null) => new Proxy({}, {
  get: (_, name) => name === 'measureText'
    ? value => ({width: String(value).length * 8})
    : name === 'fillText'
      ? value => labels?.push(String(value))
    : ['createLinearGradient', 'createRadialGradient'].includes(name)
      ? () => ({addColorStop() {}})
      : () => {},
  set: () => true,
});
const s1 = seconds => `${seconds.toFixed(1)} s`;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 30) => {
  for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05);
  assert.ok(test(session.view()), 'condition not reached');
};
const goTo = (session, id) => {
  while (session.view().step.id !== id) {
    const view = session.view();
    assert.ok(view.ready, `step ${view.step.id} is not ready`);
    session.act('next');
  }
};
// The key a prompt names ("press 1", "press Space") must do what the prompt asks.
function followPrompt(session) {
  const v = session.view(), key = v.prompt.match(/press (Space|\d)/i)?.[1];
  assert.ok(key, `prompt names no key: ${v.prompt}`);
  assert.ok(v.keys[key], `the key in "${v.prompt}" does nothing`);
  session.act(v.keys[key]);
  return v.keys[key];
}
const FREE_TEST = [['hook:5'], ['hook:25'], ['weight:heavy']];
function playFree(session) {
  for (const actions of FREE_TEST) { actions.forEach(action => session.act(action)); session.act('release'); until(session, v => v.keys.Space === 'release', 15); }
}
// A child who does exactly what each prompt says, with one press, and always guesses right.
function playThrough(session, {check = () => {}} = {}) {
  until(session, v => v.ready); session.act('next'); // wonder
  assert.equal(followPrompt(session), 'release'); session.act('next');
  session.act('measure:25'); assert.ok(session.view().ready); session.act('next');
  until(session, v => v.lap.elapsed > stringPeriod(15) * .93 && v.lap.last === null, 20);
  assert.equal(followPrompt(session), 'tap'); assert.ok(session.view().ready, 'a tap on the return counts'); session.act('next');
  until(session, v => v.ready, 15); session.act('next');
  for (const [id, guess] of [['try-short', 'guess:0'], ['try-heavy', 'guess:2']]) {
    assert.equal(session.view().step.id, id);
    followPrompt(session); assert.equal(session.view().cards.length, 3, `${id}: set-up done, cards to guess`);
    session.act(guess); assert.equal(followPrompt(session), 'release');
    until(session, v => v.ready, 15); check(session.view()); session.act('next');
  }
  session.act(session.view().target); session.act(session.view().target); assert.ok(session.view().ready, 'the formula step opens after a hook and a weight'); session.act('next');
  playFree(session); assert.ok(session.view().ready, 'three settings open Continue'); session.act('next');
  session.act('hook:25'); session.act('release'); until(session, v => v.ready, 15); session.act('next');
  for (const answer of ['answer:1', 'answer:1', 'answer:0']) { session.act(answer); assert.ok(session.view().ready); session.act('next'); }
  return session.view();
}
function playThroughTo(session, id) {
  const script = {wonder: () => until(session, v => v.ready), 'word-pendulum': () => session.act('release'),
    'word-swing-time': () => { until(session, v => v.lap.elapsed > stringPeriod(15) * .93, 20); session.act('tap'); },
    'word-length': () => session.act('measure:25'), 'watch-lengths': () => until(session, v => v.ready, 15),
    'try-short': () => { session.act('hook:5'); session.act('guess:0'); session.act('release'); until(session, v => v.ready, 15); },
    'try-heavy': () => { session.act('weight:heavy'); session.act('guess:2'); session.act('release'); until(session, v => v.ready, 15); },
    'try-formula': () => { session.act(session.view().target); session.act(session.view().target); },
    'try-free': () => playFree(session),
    alone: () => { session.act('hook:25'); session.act('release'); until(session, v => v.ready, 15); },
    'check-slowest': () => session.act('answer:1'), 'check-heavy': () => session.act('answer:1'), 'check-settle': () => session.act('answer:0')};
  while (session.view().step.id !== id) { script[session.view().step.id](); session.act('next'); }
}
// The numbers a worked sum shows, on a calculator.
function swingSumOf(worked) {
  const [, pi, length, g, answer] = worked.match(/^2 × ([\d.]+) × √\((\d+) ÷ ([\d.]+)\) = ([\d.]+) s$/);
  return {calculated: 2 * Number(pi) * Math.sqrt(Number(length) / Number(g)), answer: Number(answer), length: Number(length)};
}

test('the lesson walks through the seven parts in order, one idea per step', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['pendulum-pendulum', 'pendulum-length', 'pendulum-swing-time']);
  assert.deepEqual(lesson.words.map(w => w.id).sort(), ['pendulum-length', 'pendulum-pendulum', 'pendulum-swing-time'], 'the old lesson’s notebook ids');
  assert.equal(FEATURE_STATES['lab-classroom'], 'on');
  assert.equal(STEPS.find(s => s.id === 'watch-lengths').voice, 'lab.brian.pendulum.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.pendulum.explain');
});

test('a child who does exactly what each prompt says passes every step with one press', () => {
  const session = createClassroomSession(lesson), events = [];
  const end = playThrough(session, {check: v => assert.equal(v.mood, 'cheer')});
  assert.equal(end.step.id, 'recap'); assert.ok(end.last && end.ready);
  assert.ok(end.parts.slice(0, -1).every(p => p.done), 'every part before the recap is ticked');
  events.push(...session.takeEvents());
  assert.ok(events.filter(e => e.kind === 'right').length >= 6, 'right answers are celebrated');
  assert.ok(!events.some(e => e.kind === 'fail' || e.kind === 'wrong'));
});

test('the guided tries ask for the set-up first, then the guess, then the release', () => {
  const fresh = createClassroomSession(lesson);
  playThroughTo(fresh, 'try-short');
  let v = fresh.view();
  assert.equal(v.cards.length, 0, 'no guess before the set-up'); assert.match(v.say, /5 m hook/); assert.equal(v.glow, 'hook:5');
  fresh.act('hook:5'); fresh.act('hook:5');
  v = fresh.view(); assert.equal(v.chosen.lengthM, 5, 'pressing a hook twice keeps it: nothing cycles'); assert.equal(v.cards.length, 3);
  assert.ok(v.cards.every(c => c.picture.kind === 'compare'), 'guess pictures show results (stopwatches), not set-ups');
  assert.deepEqual(v.cards.map(c => c.label), ['Sooner than the grey weight', 'Later than the grey weight', 'At the same moment']);
});

test('a wrong press never leaves a prompt that cannot be followed: from every setting the prompt and Show me reach the guess', () => {
  for (const id of ['try-short', 'try-heavy']) for (const first of ['hook:5', 'hook:15', 'hook:25', 'weight:light', 'weight:heavy']) for (const second of ['hook:5', 'hook:15', 'hook:25', 'weight:light', 'weight:heavy']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    for (const press of [first, second]) if (session.view().cards.length === 0) session.act(press);
    const shown = createClassroomSession(lesson);
    playThroughTo(shown, id);
    for (const press of [first, second]) if (shown.view().cards.length === 0) shown.act(press);
    for (let i = 0; i < 3 && session.view().cards.length === 0; i++) {
      const v = session.view(), key = v.prompt.match(/press (\d)/)?.[1];
      assert.equal(v.keys[key], v.target, `${id} after ${first}, ${second}: "${v.prompt}" presses the control Brian points at`);
      session.act(v.keys[key]);
    }
    assert.equal(session.view().cards.length, 3, `${id} after ${first}, ${second}: following the prompt reaches the guess`);
    for (let i = 0; i < 3 && shown.view().cards.length === 0; i++) {
      for (let rung = shown.view().help; rung < 3; rung++) shown.act('help');
      assert.match(shown.view().brian.text, /^Watch my pointer\. I will press the /);
      run(shown, SHOW_ME_S + .1);
    }
    assert.equal(shown.view().cards.length, 3, `${id} after ${first}, ${second}: Show me reaches the guess`);
  }
});

test('a wrong guess says why with the real swing times, and the player can carry on', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  session.act('hook:5'); session.act('guess:1'); session.act('release');
  until(session, v => v.ready, 15);
  const v = session.view();
  assert.equal(v.mood, 'explain'); assert.ok(v.brian.text.includes(s1(stringPeriod(5))) && v.brian.text.includes(s1(stringPeriod(15))), v.brian.text);
  assert.match(v.brian.text, /A shorter string makes the weight follow a smaller circle/);
  assert.deepEqual(v.cards.map(c => c.state), ['right', 'wrong', null]);
  assert.ok(session.act('next'));
  session.act('hook:25');
  assert.equal(session.view().brian.text, 'The string is now 25 m, but this test changes only the weight, so the string must stay at 15 m. Press 2 to go back to the 15 m hook.');
});

test('no guess or open question is settled early: the words, the panel and the board wait for the result', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch-lengths');
  until(session, v => v.ready, 15);
  const watched = session.view();
  assert.deepEqual(watched.pendulums.map(p => p.lengthM), [15, 25], 'the 5 m string is left for the guess');
  assert.doesNotMatch(watched.say, /\b5 m\b|shorter/);
  assert.deepEqual(watched.formulas, []);
  session.act('next');
  session.act('hook:5');
  assert.deepEqual(session.view().formulas, [], 'the short string’s guess shows no sums');
  assert.ok(!session.view().trips, 'nor the trips');
  session.act('guess:0');
  assert.deepEqual(session.view().formulas, []);
  session.act('release'); until(session, v => v.ready, 15);
  assert.ok(session.view().trips, 'the trips appear with the result');
  session.act('next');
  session.act('weight:heavy');
  const heavy = session.view();
  assert.deepEqual(heavy.formulas, [], 'the heavy weight’s guess shows no sums');
  assert.ok(!heavy.pulls);
  assert.doesNotMatch(heavy.say, /same swing time|cancel|makes no difference/);
  for (const earlier of heavy.page.flatMap(row => [row.setup, row.result])) assert.doesNotMatch(earlier ?? '', /weight (does not|makes no)|cancel|same swing time/, 'no earlier step states the weight’s answer');
  session.act('guess:2'); session.act('release'); until(session, v => v.ready, 15);
  assert.ok(session.view().pulls);
  assert.deepEqual(session.view().formulas.map(f => f.worked), ['(20 × 9.81) ÷ 20 = 9.81 m/s²', '(200 × 9.81) ÷ 200 = 9.81 m/s²']);
  const checks = createClassroomSession(lesson);
  playThroughTo(checks, 'check-slowest');
  assert.ok(checks.view().formulas.every(f => !f.worked), 'question 1 shows only the general formula');
  checks.act('answer:1'); assert.ok(checks.view().formulas.every(f => f.worked)); checks.act('next');
  assert.deepEqual(checks.view().formulas, [], 'question 2 shows no sums, because the formula leaves the weight out');
  checks.act('answer:1'); assert.ok(checks.view().formulas.length > 0); checks.act('next');
  assert.deepEqual(checks.view().formulas, [], 'question 3 shows no sums');
});

test('the formula: π and √ are defined first, the hook and the weight move the sums, and every sum comes out on a calculator', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-formula');
  let v = session.view();
  assert.ok(v.say.indexOf('π is a Greek letter') < v.say.indexOf('T = 2 × π'), 'π comes before the formula');
  assert.ok(v.say.indexOf('√ means the square root') < v.say.indexOf('T = 2 × π'), '√ comes before the formula');
  assert.ok(v.say.indexOf('written m/s') < v.say.indexOf('m/s²'), 'm/s comes before m/s²');
  assert.equal(v.formulas[0].formula, 'T = 2 × π × √(L ÷ g)');
  assert.equal(v.formulas[0].worked, '2 × 3.14 × √(15 ÷ 9.81) = 7.77 s');
  assert.equal(v.formulas[1].worked, '(20 × 9.81) ÷ 20 = 9.81 m/s²');
  assert.ok(!v.ready);
  session.act('hook:5');
  v = session.view();
  assert.equal(v.formulas[0].worked, '2 × 3.14 × √(5 ÷ 9.81) = 4.48 s', 'the hook changes the sum and its answer');
  session.act('weight:heavy');
  v = session.view();
  assert.equal(v.formulas[0].worked, '2 × 3.14 × √(5 ÷ 9.81) = 4.48 s', 'the weight leaves the swing time alone');
  assert.equal(v.formulas[1].worked, '(200 × 9.81) ÷ 200 = 9.81 m/s²', 'and moves the numbers in the lower sum, not the answer');
  assert.ok(v.ready);
  const closing = v.brian.text;
  session.act('hook:25');
  assert.equal(session.view().formulas[0].worked, '2 × 3.14 × √(25 ÷ 9.81) = 10.03 s', 'the step stays open');
  assert.equal(session.view().brian.text, closing);
  for (const length of LENGTHS) {
    const {calculated, answer} = swingSumOf(`2 × ${PI_SHOWN} × √(${length} ÷ ${G_SHOWN}) = ${sumSeconds(length).toFixed(2)} s`);
    assert.ok(Math.abs(calculated - answer) < .005, `${length} m on a calculator`);
    assert.equal(answer.toFixed(1), stringPeriod(length).toFixed(1), `the sum agrees with the stopwatch at ${length} m`);
  }
  assert.ok(Math.abs(10.03 / 4.48 - 2.2) < .05, 'about 2.2 times, as Brian says');
  assert.equal(G_SHOWN, 9.81);
});

test('the free test: string, weight and pull-back all move the sums, three different settings open Continue, and the table keeps them', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  let v = session.view();
  assert.equal(FREE_TRIES, 3);
  assert.equal(v.ready, false);
  assert.deepEqual(v.formulas.map(f => f.worked), ['2 × 3.14 × √(15 ÷ 9.81) = 7.77 s', '(20 × 9.81) ÷ 20 = 9.81 m/s²', '4 × 15 × (20 ÷ 57.3) = 20.9 m', '20.9 ÷ 7.77 = 2.69 m/s']);
  for (const f of v.formulas) assert.ok(f.title, 'every entry has a heading');
  session.act('pull:up');
  assert.deepEqual(session.view().formulas.slice(2).map(f => f.worked), ['4 × 15 × (25 ÷ 57.3) = 26.2 m', '26.2 ÷ 7.77 = 3.37 m/s'], 'the pull-back moves the trip and the speed');
  assert.equal(session.view().formulas[0].worked, '2 × 3.14 × √(15 ÷ 9.81) = 7.77 s', 'but not the swing time');
  assert.ok(Math.abs(session.view().pendulums[0].angle - 25 * Math.PI / 180) < 1e-9, 'the weight is drawn at the angle the sum uses');
  session.act('pull:down');
  for (let i = 0; i < 6; i++) session.act('pull:down');
  assert.equal(session.view().pull.deg, MIN_PULL);
  assert.match(session.view().brian.text, /5 degrees is as small/, 'the end of the range says so');
  for (let i = 0; i < 3; i++) session.act('pull:up');
  assert.equal(session.view().pull.deg, 20);
  const test = () => { session.act('release'); until(session, x => x.keys.Space === 'release', 15); };
  test();
  assert.match(session.view().brian.text, /^With a 15 m string, a 20 kg weight and a pull-back of 20 degrees, one swing needed 7\.8 s, which is the sum’s 7\.77 s to one decimal place\. Change a setting/);
  test();
  assert.match(session.view().brian.text, /already tested this exact setting/);
  assert.equal(session.view().ready, false, 'the same setting again does not count');
  session.act('weight:heavy'); test();
  assert.match(session.view().brian.text, /string length stayed the same, so the swing time stayed at 7\.8 s, even though you changed the weight\./);
  assert.equal(session.view().ready, false);
  session.act('pull:up'); test();
  assert.match(session.view().brian.text, /even though you changed the pull-back\./);
  assert.equal(session.view().ready, true);
  session.act('hook:5'); test();
  assert.match(session.view().brian.text, /string length changed, so the swing time changed from 7\.8 s to 4\.5 s/);
  assert.deepEqual(session.view().freeRows.map(r => r.value), ['7.8 s', '7.8 s', '7.8 s', '7.8 s', '4.5 s'], 'the table keeps the results');
  assert.equal(session.view().freeRows.at(-1).label, '5 m, 200 kg, 25°');
});

test('Show me on the free test tries a different setting each time, says so truly, and finishes the step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  const settings = new Set();
  for (let i = 0; i < FREE_TRIES; i++) {
    const hints = session.view().hints;
    assert.match(hints[2], /a setting you have not tested yet/);
    for (let rung = 0; rung < 3; rung++) session.act('help');
    const v = session.view();
    assert.equal(v.pointer.action, 'set:best');
    assert.ok(hitTest(v, ...targetPoint(v, 'set:best')), 'Brian points at something a click there presses');
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^That is how it is done\. I will set a \d+ m string, a \d+ kg weight and a pull-back of \d+ degrees, and then I will let the weight go\./);
    until(session, x => x.freeRows.length === i + 1 && x.keys.Space === 'release', 20);
    settings.add(session.view().freeRows.at(-1).label);
  }
  assert.equal(settings.size, FREE_TRIES);
  assert.ok(session.view().ready);
});

test('a mouse can do everything on the free test, and a drag sets the pull-back to a whole number of degrees', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  const v = session.view();
  for (const action of ['pull:up', 'pull:down']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action);
  assert.ok(hoverInfo(v, ...targetPoint(v, 'pull:up')));
  assert.equal(hitTest(v, ...targetPoint(v, 'hook:25'))?.action, 'hook:25');
  assert.equal(hitTest(v, ...targetPoint(v, 'weight:heavy'))?.action, 'weight:heavy');
  session.act(`hold:${-12.4 * Math.PI / 180}`);
  assert.equal(session.view().pull.deg, 12);
  assert.equal(session.view().formulas[2].worked, '4 × 15 × (12 ÷ 57.3) = 12.6 m');
  session.act('release'); until(session, x => x.keys.Space === 'release', 15);
  assert.equal(session.view().freeRows[0].label, '15 m, 20 kg, 12°');
});

test('the tap: a good tap ends the step and later presses cannot overwrite the result', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-swing-time');
  run(session, .3); session.act('tap');
  assert.match(session.view().brian.text, /has only just set off/);
  run(session, stringPeriod(15) * .4 - .3); session.act('tap');
  assert.match(session.view().brian.text, /near the far side/, 'a tap at 40% of the first swing is told the truth');
  until(session, v => v.lap.elapsed > stringPeriod(15) * .93, 20); session.act('tap');
  const said = session.view().brian.text;
  assert.match(said, /^Correct\. The weight swung out to the far side and came back to the green flag/);
  assert.equal(session.view().keys.Space, undefined);
  session.act('tap');
  assert.equal(session.view().brian.text, said);
});

test('help climbs from a nudge to a plain step to Brian pointing at the exact control', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  const hints = session.view().hints;
  for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); assert.equal(session.view().help, rung); }
  const v = session.view();
  assert.equal(v.pointer.action, 'hook:5');
  const [x, y] = targetPoint(v, v.pointer.action);
  assert.equal(x, HOOK_X[5]); assert.ok(y < 150, 'on the hook plate above the beam');
  assert.equal(hitTest(v, x, y)?.action, 'hook:5', 'Brian points at something a click there really presses');
  session.act('hook:5');
  assert.equal(session.view().help, 0, 'the right move clears the help');
});

test('Brian notices a stuck player: an offer at 12 s, the first hint at 25 s, never while watching', () => {
  const session = createClassroomSession(lesson);
  run(session, STUCK_HINT_S + 2);
  assert.equal(session.view().help, 0, 'the wonder needs no input, so nobody is stuck');
  session.act('next');
  const words = session.view().brian.text;
  run(session, STUCK_OFFER_S + .2);
  assert.match(session.view().nudge.text, /Stuck\? Press H/);
  assert.equal(session.view().brian.text, words, 'the offer sits under Brian’s words and never replaces them');
  run(session, STUCK_HINT_S - STUCK_OFFER_S);
  assert.equal(session.view().help, 1); assert.equal(session.view().nudge.text, session.view().hints[0]);
  assert.equal(session.view().brian.text, words, 'so does the first hint');
  session.act('help');
  assert.equal(session.view().brian.text, session.view().hints[1], 'asking for help answers in Brian’s own words');
  assert.equal(session.view().nudge, null);
});

test('Previous step goes back one step to read or do it again; there is nothing before the first', () => {
  const session = createClassroomSession(lesson);
  assert.equal(session.act('back'), false);
  playThroughTo(session, STEPS[3].id);
  assert.equal(session.act('back'), true);
  assert.equal(session.view().step.id, STEPS[2].id);
  assert.equal(session.view().ready, true, 'a step already done stays done');
  session.act('next');
  assert.equal(session.view().step.id, STEPS[3].id);
});

test('failed tries climb the help, but Show me waits for the player', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  for (let i = 0; i < 4; i++) {
    session.act('hook:5'); session.act('release'); until(session, v => v.help > 0 && v.lastTry, 15);
    assert.match(session.view().brian.text, new RegExp(`${s1(stringPeriod(5)).replace('.', '\\.')}.*longer string`));
    run(session, .1);
  }
  assert.equal(session.view().help, 2); assert.equal(session.view().pointer, null);
  assert.ok(!session.view().ready, 'the crane puzzle passes only on the 25 m string');
  session.act('weight:heavy'); session.act('hook:15'); session.act('release'); until(session, v => v.lastTry?.lengthM === 15, 15);
  assert.match(session.view().brian.text, /One swing needed 7\.8 s, which is too quick for my crane.*The heavy weight did not slow the swing/, 'the reason is said');
  session.act('hook:25'); session.act('release'); until(session, v => v.ready, 15);
  assert.match(session.view().brian.text, /^Correct\. One swing on the 25 m string needed 10\.0 s/);
});

test('every number on the board comes from stringPeriod', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch-lengths');
  until(session, v => v.ready, 15);
  assert.deepEqual(session.view().table.map(r => r.value), [15, 25].map(l => s1(stringPeriod(l))));
  assert.deepEqual([4.5, 7.8, 10].map(n => n.toFixed(1)), LENGTHS.map(l => stringPeriod(l).toFixed(1)), 'LAB.md 4.1 numbers');
  const heavy = createClassroomSession(lesson);
  playThroughTo(heavy, 'try-heavy');
  heavy.act('weight:heavy'); heavy.act('guess:0'); heavy.act('release'); until(heavy, v => v.ready, 15);
  assert.ok(heavy.view().brian.text.includes(s1(stringPeriod(15))), 'the light and the heavy weight need the same time');
  assert.deepEqual(heavy.view().cards.map(c => c.state), ['wrong', null, 'right']);
});

test('the Kestrel link: what Brian says about settling is what the game’s own cable does', () => {
  const heli = {x: 0, y: 100, z: 0, vx: 0, vy: 0, vz: 0}, load = createLoad({id: 'b', massKg: 1250}), start = 3;
  Object.assign(load, {hooked: true, onGround: false, settled: false, lineLength: 15, x: start, y: 100 - Math.sqrt(15 * 15 - start * start), z: 0, vx: 0, vy: 0, vz: 0});
  let lastAbove = 0;
  for (let t = 0; t < 60; t += HELI_STEP) { stepCable(load, heli, {}, HELI_STEP); if (Math.abs(load.x) >= 1) lastAbove = t; }
  assert.ok(Math.abs(lastAbove - 16) < 1, `about 16 seconds: ${lastAbove}`);
  assert.ok(Math.abs(lastAbove / stringPeriod(15) - 2) < .2, 'about two full swings');
  assert.equal(CHALLENGE_RULES.pendulum.swingMetres, 1, 'below 1 m is the challenge’s own rule');
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'check-settle');
  session.act('answer:0');
  assert.match(session.view().brian.text, /falls below 1 m in about 16 seconds, which is about two full swings/);
  assert.ok(session.view().settle.since < .01, 'the picture starts its settling when the question is answered, whatever the lesson’s clock reads');
  run(session, 8);
  assert.ok(Math.abs(session.view().settle.since - 8) < .1);
});

test('the recap and the card send the car to the orange light, and every check says why', () => {
  assert.equal(lesson.challengeCard.title, 'Length sets the swing time.');
  assert.equal(lesson.challengeCard.text, 'Carry the car to the orange light. Hover still inside the ring until the car stops swinging, then set it down.');
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.match(v.say, /Carry the car to the orange light, and hover still inside the ring until the car stops swinging/);
  assert.match(v.prompt, /orange light/);
  assert.match(KEY_IDEAS.find(i => i.id === 'settle').text, /orange light/);
  const wrong = {'check-slowest': [[0, /only 4\.5 s/], [2, /200 kg weight does not slow the swing/]], 'check-heavy': [[0, /needs 7\.8 s, the same as the 20 kg weight/], [2, /needs 7\.8 s/]], 'check-settle': [[1, /gives the car a new push/], [2, /still moving sideways/]]};
  for (const [id, picks] of Object.entries(wrong)) for (const [pick, why] of picks) {
    const asked = createClassroomSession(lesson);
    playThroughTo(asked, id);
    asked.act(`answer:${pick}`);
    assert.match(asked.view().brian.text, why);
    assert.ok(asked.view().ready, 'a wrong answer is a lesson, not a wall');
  }
});

test('slow motion runs the clock at half speed and says so', () => {
  const elapsedAfter = (slow, seconds) => {
    const session = createClassroomSession(lesson);
    playThroughTo(session, 'watch-lengths');
    if (slow) session.act('slow');
    run(session, seconds);
    assert.equal(session.view().slow, slow);
    return session.view().pendulums[0].stopwatch.elapsed;
  };
  // Released at 0.4 s after a 0.6 s pull: the stopwatch starts at 1 s of lesson time.
  assert.ok(Math.abs(elapsedAfter(false, 3) - 2) < .06);
  assert.ok(Math.abs(elapsedAfter(true, 3) - .5) < .06);
});

test('the board draws every step and card, and hit-tests a drag of your weight', () => {
  const calls = new Set();
  const fake = () => new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return text => ({width: String(text).length * 9});
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    return (...args) => { calls.add(name); return undefined; };
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const played = createClassroomSession(lesson);
  playThrough(played, {check: v => drawBoard(fake(), v, 1000, 680)});
  for (let i = 0; i < STEPS.length; i++) {
    played.act(`go:${i}`); run(played, 1);
    calls.clear(); drawBoard(fake(), played.view(), 1000, 680);
    assert.ok((calls.has('fillText') || calls.has('fill')) && (calls.has('arc') || calls.has('fillRect')), `${STEPS[i].id} draws its board`);
    for (const card of played.view().cards) {
      calls.clear();
      drawPicture(fake(), card.picture, 220, 110);
      assert.ok(calls.has('arc') || calls.has('fillRect'), `${card.id} draws a picture`);
    }
  }
  assert.ok(calls.has('arc') && calls.has('fillText'));
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  session.act('next'); // not ready yet: stays
  assert.equal(session.view().step.id, 'try-short');
  session.act('hook:5'); session.act('guess:0');
  const v = session.view(), you = v.pendulums.find(p => p.id === 'you');
  assert.deepEqual(hitTest(v, ...bobPoint(you)), {drag: 'you', action: 'release'});
});

test('the pictures show the idea: the trip, the pull arrow’s sum, the pull-back and a metre to scale are drawn', () => {
  const labels = [];
  const fake = () => new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return text => ({width: String(text).length * 9});
    if (name === 'fillText') return value => labels.push(String(value));
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    return () => {};
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const drawn = session => { labels.length = 0; drawBoard(fake(), session.view(), 1000, 680); return labels.join(' | '); };
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-length');
  assert.match(drawn(session), /1 m/);
  playThroughTo(session, 'try-short');
  session.act('hook:5'); session.act('guess:0'); session.act('release'); until(session, v => v.ready, 15);
  const short = drawn(session);
  assert.match(short, /one swing travels 7\.0 m/); assert.match(short, /one swing travels 20\.9 m/);
  session.act('next'); session.act('weight:heavy'); session.act('guess:2'); session.act('release'); until(session, v => v.ready, 15);
  const heavy = drawn(session);
  assert.match(heavy, /1962\.0 ÷ 200 kg = 9\.81 m\/s²/); assert.match(heavy, /196\.2 ÷ 20 kg = 9\.81 m\/s²/);
  assert.ok(Math.abs(1962 / 200 - 9.81) < 1e-9 && Math.abs(196.2 / 20 - 9.81) < 1e-9);
  session.act('next'); session.act(session.view().target); session.act(session.view().target); session.act('next');
  assert.match(drawn(session), /20°/);
  session.act('pull:up');
  assert.match(drawn(session), /25°/);
});

test('the guess cards’ symbols read as their dials do: grey on the left, yours on the right', () => {
  const symbolOf = mine => {
    const labels = [];
    const fake = new Proxy({}, {get: (target, name) => {
      if (name in target) return target[name];
      if (name === 'fillText') return value => labels.push(String(value));
      if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
      return () => {};
    }, set: (target, name, value) => { target[name] = value; return true; }});
    drawPicture(fake, {kind: 'compare', mine}, 220, 110);
    return labels.find(label => ['<', '>', '='].includes(label));
  };
  assert.equal(symbolOf('quicker'), '>', 'grey needs 7.8 s, more than your 4.5 s');
  assert.equal(symbolOf('slower'), '<', 'grey needs 7.8 s, less than your 10.0 s');
  assert.equal(symbolOf('same'), '=');
});

test('the words: every string a player reads avoids the reviewed faults', () => {
  const source = ['src/lab/lessons/pendulum-classroom.js', 'src/lab/lessons/pendulum-board.js'].map(file => readFileSync(file, 'utf8')).join('\n');
  for (const pattern of [/\b(she|her|hers|herself)\b/i, /\bmph\b/i, /\bdecides?\b/i, /\b(air|wind)\s+(soon\s+)?takes\b/i, /—/, /\bbench\b(?!\/|es)/i, /\bquiet\b/i, /Pick a card:/, /\btakes?\b/]) {
    const lines = source.split('\n').filter(line => !line.trim().startsWith('//') && !/^import /.test(line));
    assert.ok(!lines.some(line => pattern.test(line)), `${pattern} appears: ${lines.find(line => pattern.test(line))?.slice(0, 120)}`);
  }
});

test('review fixes: slow motion ends with its step; Show me presses the control; replays restart', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch-lengths');
  session.act('slow'); until(session, v => v.ready, 25); session.act('next');
  assert.equal(session.view().slow, false, 'slow motion does not follow the player into a step without its button');
  // Show me: three presses of Help, then Brian's pointer reaches the 5 m hook and presses it.
  for (let i = 0; i < 3; i++) session.act('help');
  run(session, SHOW_ME_S + .2);
  let v = session.view();
  assert.equal(v.chosen.lengthM, 5); assert.equal(v.cards.length, 3, 'the player is handed the guess');
  assert.match(v.brian.text, /^That is how it is done. /); assert.equal(v.celebrate, null, 'Brian does not cheer his own press');
  // A press that changes nothing is not a mistake; a weight press says to change one thing.
  session.act('guess:1'); session.act('release'); until(session, x => x.ready, 15);
  v = session.view();
  assert.equal(v.mood, 'explain');
  assert.ok(v.pendulums.every(p => (p.stopwatch?.elapsed ?? 0) < 1), 'a wrong guess replays both swings together');
  session.act('next');
  session.act('weight:light');
  assert.equal(session.view().help, 0, 'pressing the weight already hanging is not a failed try');
  session.act('weight:heavy'); session.act('guess:2'); session.act('release'); until(session, x => x.ready, 15); session.act('next');
  session.act(session.view().target); session.act(session.view().target); session.act('next');
  playFree(session); session.act('next');
  session.act('hook:25'); session.act('release'); until(session, x => x.ready, 15);
  run(session, 2); session.act('replay');
  assert.ok(session.view().pendulums[0].stopwatch === null || session.view().pendulums[0].stopwatch.elapsed < .2, 'Watch again restarts the crane swing');
});

test('review fixes: in the short-string try a weight press keeps the comparison fair', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  session.act('weight:heavy');
  assert.match(session.view().brian.text, /this test changes only the string, so the weight must stay at 20 kg\. Press 4/);
  session.act('hook:5');
  assert.equal(session.view().cards.length, 0, 'heavy on 5 m changes two things, so no guess yet');
  assert.equal(session.view().target, 'weight:light', 'and the prompt now asks for the weight, not the hook');
  session.act('weight:light');
  assert.equal(session.view().cards.length, 3);
});

test('review fixes: Show me only points where pressing for the player would be wrong (the swing tap)', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-length');
  assert.equal(session.view().keys[3], 'measure:25', 'the prompt’s "3" picks the longest string');
  session.act('measure:25'); session.act('next');
  for (let i = 0; i < 3; i++) session.act('help');
  run(session, 3);
  const v = session.view();
  assert.ok(v.pointer && !v.ready && v.tapFlash !== undefined, 'the tap stays the player’s to make');
  assert.equal(v.keys[3], undefined);
});

test('Suspension keeps its notebook terms, bench challenge and ordered classroom parts', () => {
  const suspension = CLASSROOM_LESSONS.suspension;
  assert.ok(suspension);
  assert.deepEqual([...new Set(SUSPENSION_STEPS.map(step => step.part))].sort(), [0,1,2,3,4,5,6]);
  assert.deepEqual(SUSPENSION_WORDS.slice(0,4).map(word => word.id), ['suspension-word-0','suspension-word-1','suspension-word-2','suspension-word-3']);
  assert.deepEqual(SUSPENSION_WORDS.map(word => word.word), ['Spring','Spring stiffness','Weight transfer','Body roll','Body shake']);
  assert.equal(suspension.challengeCard.title, 'Compare both springs on both roads.');
  assert.equal(suspension.challengeCard.text, 'Run the suspension rig with soft and stiff springs on the bumpy and smooth roads. Complete all four setting pairs.');
});

test('Suspension opens only after driving lesson 1, matching the Lab lesson gate', () => {
  const flags={enabled:name=>name==='lab'};
  assert.deepEqual(lessonOpenState({},'suspension',flags),{open:false,note:'Opens after driving lesson 1'});
  assert.deepEqual(lessonOpenState({drivingLessons:{version:1,done:{corner:true}}},'suspension',flags),{open:true,note:''});
});

test('the Suspension classroom challenge submits the same four settings to the unchanged bench goal', () => {
  const attempts=CLASSROOM_LESSONS.suspension.benchAttempts();
  assert.deepEqual(attempts.map(attempt=>attempt.input),[
    {spring:'soft',road:'bumpy'},{spring:'stiff',road:'bumpy'},
    {spring:'soft',road:'smooth'},{spring:'stiff',road:'smooth'},
  ]);
  assert.equal(suspensionBench.goalMet(attempts.map(attempt=>({result:{settings:attempt.input}}))),true);
});

test('the Suspension Watch changes the rig settings and live readings as Brian describes', () => {
  const model=createSuspensionModel(); model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='watch'));
  model.tick(.5); assert.deepEqual(model.view().setup,{spring:'soft',road:'bumpy'});
  const softShake=model.view().result.bodyShake;
  model.tick(.8); assert.deepEqual(model.view().setup,{spring:'stiff',road:'bumpy'});
  const stiffShake=model.view().result.bodyShake; assert.notEqual(stiffShake,softShake);
  model.tick(1.2); assert.deepEqual(model.view().setup,{spring:'soft',road:'smooth'});
  assert.notEqual(model.view().result.bodyShake,stiffShake);
  model.tick(1); assert.equal(model.view().ready,true); assert.match(model.view().say,/6\.5° and 2\.2°/);
});

test('Suspension exposes the complete screen contract and drawable targets on every step', () => {
  const sent = new Set(Object.values(KEY_NAMES)), model = createSuspensionModel();
  for (let index=0;index<SUSPENSION_STEPS.length;index++) {
    model.enter(index); const v=model.view();
    for (const field of ['actions','buttons','cards','keys','repeat','hints','formulas','target','glow','waiting','ready','asking','say','prompt']) assert.ok(field in v, `${v.scene} has ${field}`);
    for (const key of Object.keys(v.keys)) assert.ok(sent.has(key), `${v.scene} offers unsendable key ${key}`);
    for (const key of v.repeat) assert.ok(sent.has(key), `${v.scene} repeats unsendable key ${key}`);
    if(v.target) { const point=suspensionBoard.targetPoint(v,v.target); if(v.pointOnly) assert.equal(point,null); else assert.ok(point?.every(Number.isFinite),`${v.scene} target ${v.target} has a board point`); }
    if(v.asking) assert.equal(v.result,null,'an open question does not show the rig result');
    for(const card of v.cards) { const labels=[]; suspensionBoard.drawPicture(fakeCanvas(labels),card.picture,220,110); assert.ok(labels.some(label=>label.includes('Reading?')),`${card.id} shows an unknown answer reading`); }
  }
  assert.deepEqual(suspensionBoard.drawBoard(fakeCanvas(),model.view(),800,600),{scale:.8,left:0,top:28});
});

test('Suspension questions explain every wrong answer with the challenge bench results', () => {
  const model=createSuspensionModel();
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='guess-bumps'));
  assert.equal(model.view().scene,'guess-bumps');
  assert.equal(model.view().cards.length,3);
  assert.ok(model.view().formulas.every(row=>!row.worked), 'the open guess has no worked answer');
  model.act('answer:1');
  assert.match(model.view().say,/4\.77.*4\.09/);
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='guess-roll')); assert.equal(model.view().scene,'guess-roll');
  model.act('answer:0');
  assert.match(model.view().say,/6\.5.*2\.2/);
});

test('Suspension guided prompts keep the measured roll comparison and three distinct free runs open Continue', () => {
  const model=createSuspensionModel();
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='try-free'));
  const initial=model.view().formulas.at(-1).worked;
  model.act('spring:stiff'); model.act('road:smooth');
  assert.equal(model.view().formulas.at(-1).worked,initial,'the roll comparison uses the same measured test readings');
  assert.match(initial,/6\.5° ÷ 2\.2° ≈ 3/);
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='word-shake'));
  assert.match(model.view().say,/one body-shake reading for this test/);
  assert.match(SUSPENSION_WORDS.at(-1).meaning,/m\/s², means how quickly the body’s speed changes/);
  assert.ok(model.view().formulas.every(row=>!row.title.toLowerCase().includes('shake')),'body shake has no formula panel');
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='try-free'));
  model.act('spring:stiff'); model.act('road:smooth');
  assert.equal(model.view().formulas.at(-1).worked,initial,'the roll comparison uses the same measured test readings');
  model.act('run'); model.act('road:bumpy'); model.act('run'); model.act('spring:soft'); model.act('run');
  assert.equal(model.view().rows.length,3); assert.equal(model.view().ready,true);
  assert.equal(new Set(model.view().rows.map(row=>`${row.spring}/${row.road}`)).size,3);
  const actual=suspensionBench.run({spring:'soft',road:'bumpy'});
  assert.equal(model.view().rows[2].shake,actual.bodyShake.toFixed(2));
});

test('Show me selects and runs a different setting pair each time in the free test', () => {
  const model=createSuspensionModel(); model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='try-free'));
  for(let i=0;i<3;i++) { const v=model.view(); assert.equal(v.target,'show'); model.act(v.target); }
  assert.equal(model.view().rows.length,3);
  assert.equal(new Set(model.view().rows.map(row=>`${row.spring}/${row.road}`)).size,3);
  assert.equal(model.view().ready,true);
});

test('Suspension roll comparison shows the measured numbers and a simple calculator sum', () => {
  const model=createSuspensionModel();
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='formula'));
  const row=model.view().formulas.find(item=>item.title==='What this bend showed');
  assert.match(row.worked,/6\.5° ÷ 2\.2° ≈ 3/);
  assert.match(row.worked,/stiff spring leans about a third as much/);
  assert.match(row.worked,/numbers come from this test/);
});

test('Suspension reading words define body shake and explain tyre contact plainly', () => {
  const model=createSuspensionModel();
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='word-shake'));
  assert.match(model.view().say,/one body-shake reading for this test/);
  assert.match(SUSPENSION_WORDS.at(-1).meaning,/m\/s², means how quickly the body’s speed changes/);
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='try-free'));
  model.act('run');
  assert.match(model.view().say,/Tyre contact shows how much of the test the tyre touched the road/);
});

test('Suspension held controls use classroom arrows and wait for their repeat interval', () => {
  const model=createSuspensionModel();
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='word-stiffness'));
  const arrows=[8592,8594,8595,8593].map(code=>String.fromCharCode(code));
  assert.deepEqual(Object.keys(model.view().keys),arrows);
  assert.deepEqual(arrows.map(key=>model.view().keys[key]),['spring:soft','spring:stiff','road:bumpy','road:smooth']);
  assert.deepEqual(model.view().repeat,arrows);
  for(const key of arrows) assert.ok(Object.values(KEY_NAMES).includes(key));
  model.act('spring:soft'); model.act('spring:stiff:held');
  assert.equal(model.state().setup.spring,'soft');
  model.tick(.15); model.act('spring:stiff:held');
  assert.equal(model.state().setup.spring,'stiff');
});

test('Suspension board targets hit every control and every drawn rectangle stays inside the board', () => {
  const rectangles=[]; let matrix=[1,0,0,1,0,0]; const stack=[];
  const transformed=(x,y,w,h)=>{
    const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>[matrix[0]*px+matrix[2]*py+matrix[4],matrix[1]*px+matrix[3]*py+matrix[5]]);
    const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
    rectangles.push([Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]);
  };
  const ctx=new Proxy({}, {get:(_,name)=>{
    if(name==='measureText') return value=>({width:String(value).length*7});
    if(['createLinearGradient','createRadialGradient'].includes(name)) return ()=>({addColorStop(){}});
    return (...args)=>{
      if(name==='save') stack.push([...matrix]);
      else if(name==='restore') matrix=stack.pop()??[1,0,0,1,0,0];
      else if(name==='translate') {matrix[4]+=matrix[0]*args[0]+matrix[2]*args[1];matrix[5]+=matrix[1]*args[0]+matrix[3]*args[1];}
      else if(name==='scale') {matrix[0]*=args[0];matrix[1]*=args[0];matrix[2]*=args[1];matrix[3]*=args[1];}
      else if(name==='rotate') {const [a,b,c,d]=matrix,co=Math.cos(args[0]),si=Math.sin(args[0]);matrix[0]=a*co+c*si;matrix[1]=b*co+d*si;matrix[2]=-a*si+c*co;matrix[3]=-b*si+d*co;}
      else if(name==='roundRect'||name==='fillRect') transformed(...args.slice(0,4));
    };
  },set:()=>true});
  const model=createSuspensionModel(); model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='try-free'));
  const view=model.view();
  for(const action of ['spring:soft','spring:stiff','road:bumpy','road:smooth','run']) {
    const point=suspensionBoard.targetPoint(view,action);
    assert.deepEqual(suspensionBoard.hitTest(view,...point),{action});
  }
  suspensionBoard.drawBoard(ctx,view); assert.ok(rectangles.length>10);
  for(const [x,y,width,height] of rectangles) assert.ok(x>=0&&y>=0&&x+width<=1000&&y+height<=680,`rectangle stays inside board: ${[x,y,width,height]}`);
  assert.ok(rectangles.some(([x,y,width,height])=>x===672&&y===370&&width===156&&height===44),'run button extents are checked');
});

test('Suspension on-your-own target and Show me use the same roll reading and target', () => {
  const model=createSuspensionModel();
  model.enter(SUSPENSION_STEPS.findIndex(step=>step.id==='alone'));
  assert.match(model.view().prompt,/less than 3/);
  model.act('show');
  assert.equal(model.view().ready,true);
  assert.match(model.view().say,/2\.2/);
});

test('Suspension review asks three questions and explains wrong choices without showing answers early', () => {
  const model=createSuspensionModel();
  for(const id of ['check-spring','check-transfer','check-formula']) {
    model.enter(SUSPENSION_STEPS.findIndex(step=>step.id===id));
    assert.equal(model.view().asking,true);
    assert.ok(model.view().formulas.every(row=>row.worked===''));
    model.act('answer:1');
    assert.equal(model.view().ready,true);
    assert.ok(model.view().say.length>30);
  }
});

test('hovering explains the parts of the picture: hooks, weights, stopwatches', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  const v = session.view(), [hx, hy] = targetPoint(v, 'hook:5');
  assert.match(hoverInfo(v, hx, hy), /5 m hook\. Click it, or press 1/);
  assert.match(hoverInfo(v, ...targetPoint(v, 'weight:heavy')), /200 kg weight\. Click it, or press 5/);
  const grey = v.pendulums.find(p => p.ghost);
  assert.match(hoverInfo(v, ...bobPoint(grey)), /grey weight/);
  assert.match(hoverInfo(v, grey.x - 30, 50), /stopwatch/i);
  assert.equal(hoverInfo(v, 500, 660), null);
});

function reachGforceFreeTest(session) {
  run(session, 2.6);
  assert.equal(session.view().step.id, 'wonder');
  assert.equal(session.view().ready, true);
  session.act('next');
  assert.equal(session.view().step.id, 'word-speed');
  session.act('speed:up');
  assert.equal(session.view().ready, true);
  session.act('next');
  assert.equal(session.view().step.id, 'word-radius');
  session.act('radius:down');
  session.act('radius:down');
  assert.equal(session.view().ready, true);
  session.act('next');
  assert.equal(session.view().step.id, 'word-acceleration');
  session.act('next');
  session.act('next');
  session.act('next');
  assert.equal(session.view().step.id, 'watch');
  run(session, 6.1);
  assert.equal(session.view().ready, true);
  session.act('next');
  assert.equal(session.view().step.id, 'try-speed');
}

function finishGuidedGforceTries(session) {
  session.act('answer:0');
  for (let press = 0; press < 4; press++) session.act('speed:up');
  session.act('run');
  assert.equal(session.view().ready, true);
  session.act('next');
  session.act('answer:0');
  session.act('radius:up');
  session.act('run');
  assert.equal(session.view().ready, true);
  session.act('next');
  assert.equal(session.view().step.id, 'try-free');
}

test('G-force is registered with its old notebook words, challenge and seven lesson parts', () => {
  const gforce = CLASSROOM_LESSONS.gforce;
  assert.ok(gforce);
  assert.equal(FEATURE_STATES['lab-classroom'], 'on');
  assert.deepEqual([...new Set(GFORCE_STEPS.map(step => step.part))], PARTS.map((_, i) => i));
  assert.deepEqual(GFORCE_STEPS.filter(step => step.word).map(step => step.word), [
    'gforce-speed', 'radius', 'gforce-acceleration', 'gforce',
  ]);
  assert.deepEqual(gforce.words.map(word => word.id), ['gforce', 'one-g', 'radius', 'gforce-speed', 'gforce-acceleration']);
  assert.equal(gforce.challengeCard.title, 'Reach 2 g in three different corners.');
  assert.equal(GFORCE_STEPS.find(step => step.id === 'recap').voice, 'lab.brian.gforce.explain');
});

test('the short G-force wonder ends with its prediction question', () => {
  const model = createGforceModel();
  model.enter(0);
  assert.match(model.view().say, /car on an arm.*cord.*meter.*words come next/i);
  model.tick(2.5);
  assert.match(model.view().say, /Which change could make the meter show a larger reading\?/);
});

test('G-force screen contract uses sendable classroom keys and complete views', () => {
  const sent = new Set(Object.values(KEY_NAMES));
  const model = createGforceModel();
  for (let index = 0; index < GFORCE_STEPS.length; index++) {
    model.enter(index);
    const view = model.view();
    for (const field of ['actions', 'buttons', 'cards', 'keys', 'hints', 'formulas']) assert.ok(field in view, `${view.scene} has ${field}`);
    for (const key of Object.keys(view.keys)) assert.ok(sent.has(key), `${view.scene} offers unsendable key ${key}`);
    for (const key of view.repeat) assert.ok(sent.has(key), `${view.scene} repeats unsendable key ${key}`);
    assert.ok('focus' in view);
    assert.equal(typeof view.pointOnly, 'boolean');
    if (view.target) {
      const point = gforceBoard.targetPoint(view, view.target);
      if (view.pointOnly) assert.equal(point, null, `${view.scene} target ${view.target} belongs to classroom HTML`);
      else assert.ok(point?.every(Number.isFinite), `${view.scene} target ${view.target} has a board point`);
    }
    for (const card of view.cards) {
      assert.equal(card.picture.kind, 'reading', `${card.id} has a reading picture`);
      const labels = [];
      gforceBoard.drawPicture(fakeCanvas(labels), card.picture, 220, 110);
      assert.ok(labels.some(label => label.includes('Reading?')), `${card.id} labels its unknown meter reading`);
    }
  }
  const initial = model.view();
  assert.deepEqual(gforceBoard.drawBoard(fakeCanvas(), initial, 800, 600), {scale: .8, left: 0, top: 28});
  assert.ok('last' in createClassroomSession(CLASSROOM_LESSONS.gforce).view(), 'the frame supplies its final-step flag');
  const speedStep = GFORCE_STEPS.findIndex(step => step.id === 'word-speed');
  model.enter(speedStep);
  assert.deepEqual(model.view().keys, {'←': 'speed:down', '→': 'speed:up', '↓': 'radius:down', '↑': 'radius:up'});
  assert.deepEqual(model.view().repeat, ['←', '→', '↓', '↑']);
  model.act('speed:up');
  const speed = model.state().speed;
  model.act('speed:up:held');
  assert.equal(model.state().speed, speed, 'held repeats wait for their pacing gap');
  model.tick(.15);
  model.act('speed:up:held');
  assert.equal(model.state().speed, speed + 5, 'a held repeat moves after the pacing gap');
});

test('G-force formula sums calculate from the exact metric values they show and match the challenge rule', () => {
  const model = createGforceModel();
  const formulaIndex = GFORCE_STEPS.findIndex(step => step.id === 'formula');
  const radii = [10, 25, 50, 75, 100, 125, 150, 175, 200];
  for (let speed = 10; speed <= 150; speed += 5) {
    for (const radius of radii) {
      model.enter(formulaIndex);
      let state = model.state();
      while (state.speed < speed) { model.act('speed:up'); state = model.state(); }
      while (state.speed > speed) { model.act('speed:down'); state = model.state(); }
      while (state.radius < radius) { model.act('radius:up'); state = model.state(); }
      while (state.radius > radius) { model.act('radius:down'); state = model.state(); }
      const worked = model.view().formulas.at(-1).worked;
      const match = worked.match(/\((\d+\.\d{2}) m\/s\)² ÷ (\d+) m ÷ 9\.81 m\/s² = about (\d+\.\d{2}) g/);
      assert.ok(match, worked);
      const [, metresPerSecond, shownRadius, shownG] = match;
      const calculated = (Number(metresPerSecond) ** 2 / Number(shownRadius) / 9.81).toFixed(2);
      assert.equal(shownG, calculated, `${speed} dial setting and ${radius} m radius`);
      assert.equal(model.view().g.toFixed(2), lateralG(speed, radius).toFixed(2), 'the board meter matches the challenge function');
      assert.equal(model.view().speedKmh.toFixed(1), (speed * 1.609344).toFixed(1));
    }
  }
});

test('a child can follow the G-force prompts through the speed and radius lessons', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.gforce);
  reachGforceFreeTest(session);
  assert.match(session.view().brian.text, /96\.6 km\/h and radius stays at 50 m/);
  assert.equal(session.view().g, null, 'the open prediction has no live result');
  assert.ok(session.view().formulas.every(entry => entry.worked === ''), 'the open prediction has no worked answer');
  assert.ok(session.view().formulas.every(entry => entry.title.length > 0), 'every formula row has a title');
  finishGuidedGforceTries(session);
  session.act('speed:up');
  session.act('run');
  assert.equal(session.view().rows.length, 1);
  assert.equal(session.view().ready, false);
  session.act('radius:up');
  session.act('run');
  session.act('speed:up');
  session.act('run');
  assert.equal(session.view().rows.length, 3);
  assert.equal(session.view().ready, true);
  assert.equal(new Set(session.view().rows.map(row => `${row.speed}/${row.radius}`)).size, 3);
});

test('the watch changes both settings over time and keeps the board, meter and formula in step', () => {
  const model = createGforceModel();
  const watch = GFORCE_STEPS.findIndex(step => step.id === 'watch');
  model.enter(watch);
  model.tick(1);
  assert.equal(model.view().speedKmh, 64.4);
  model.tick(1);
  assert.equal(model.view().speedKmh, 128.7);
  assert.equal(model.view().radiusM, 50);
  assert.equal(model.view().g.toFixed(2), lateralG(80, 50).toFixed(2));
  assert.match(model.view().formulas[0].worked, /128\.7 km\/h/);
  model.tick(2);
  assert.equal(model.view().speedKmh, 64.4);
  model.tick(1);
  assert.equal(model.view().radiusM, 100);
  assert.equal(model.view().g.toFixed(2), lateralG(40, 100).toFixed(2));
  assert.match(model.view().formulas.at(-1).worked, /100 m/);
});

test('wrong G-force predictions explain the actual readings after the turn has run', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.gforce);
  reachGforceFreeTest(session);
  let open = session.view();
  assert.equal(open.g, null);
  assert.ok(open.formulas.every(entry => entry.worked === ''));
  session.act('answer:1');
  for (let press = 0; press < 4; press++) session.act('speed:up');
  session.act('run');
  assert.equal(session.view().brian.mood, 'explain');
  assert.match(session.view().brian.text, /96\.6 km\/h/);
  assert.match(session.view().brian.text, /1\.47 g/);
  assert.match(session.view().brian.text, /0\.65 g/);
  assert.match(session.view().brian.text, /1\.5 × 1\.5 = 2\.25/);
  session.act('next');
  session.act('answer:1');
  session.act('radius:up');
  session.act('run');
  assert.equal(session.view().brian.mood, 'explain');
  assert.match(session.view().brian.text, /75 m/);
  assert.match(session.view().brian.text, /0\.43 g/);
  assert.match(session.view().brian.text, /0\.65 g/);
  assert.match(session.view().brian.text, /one and a half times 50 m.*two thirds as large/);
});

test('Show me points to a live control and records a new free-test setting on each use', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.gforce);
  reachGforceFreeTest(session);
  finishGuidedGforceTries(session);
  for (let runIndex = 1; runIndex <= 3; runIndex++) {
    for (let rung = 0; rung < 3; rung++) session.act('help');
    let view = session.view();
    assert.equal(view.pointer.action, 'set:best');
    const point = gforceBoard.targetPoint(view, view.pointer.action);
    const hit = gforceBoard.hitTest(view, ...point);
    assert.ok(hit && ['speed:up', 'speed:down', 'radius:up', 'radius:down'].includes(hit.action));
    run(session, SHOW_ME_S + .05);
    assert.match(session.view().brian.text, /^That is how it is done\./);
    until(session, current => current.rows.length >= runIndex, 4);
    view = session.view();
    assert.equal(view.rows.length, runIndex);
    assert.equal(new Set(view.rows.map(row => `${row.speed}/${row.radius}`)).size, runIndex);
  }
  assert.equal(session.view().ready, true);
});

test('Brian’s 2 g test has a working Space key and needs a changed setting', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.gforce);
  reachGforceFreeTest(session);
  finishGuidedGforceTries(session);
  // Finish three different free runs through normal controls.
  for (const action of ['speed:up', 'run', 'radius:up', 'run', 'speed:up', 'run']) session.act(action);
  session.act('next');
  assert.equal(session.view().step.id, 'alone');
  let view = session.view();
  assert.equal(view.keys.Space, 'run');
  assert.match(view.prompt, /press Space/i);
  session.act(view.keys.Space);
  assert.equal(session.view().brian.mood, 'explain');
  assert.match(session.view().brian.text, /below the 2 g target/);
  for (let press = 0; press < 8; press++) session.act('speed:up');
  view = session.view();
  assert.equal(view.speedKmh, 128.7);
  assert.equal(view.keys.Space, 'run');
  session.act(view.keys.Space);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /2\.61 g/);
});

test('G-force questions have literal answers and keep their result sums hidden until answered', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.gforce);
  reachGforceFreeTest(session);
  finishGuidedGforceTries(session);
  for (const id of ['check-speed', 'check-radius', 'check-rule']) {
    while (session.view().step.id !== id) {
      const current = session.view();
      if (current.step.id === 'try-free') {
        for (const action of ['speed:up', 'run', 'radius:up', 'run', 'speed:up', 'run']) session.act(action);
      } else if (current.step.id === 'alone') {
        for (let press = 0; press < 8; press++) session.act('speed:up');
        session.act('run');
      }
      session.act('next');
    }
    const view = session.view();
    assert.equal(view.asking, true);
    assert.ok(view.formulas.every(entry => entry.worked === ''), `${id}: the panel has no answer sum`);
    session.act('answer:1');
    assert.equal(session.view().ready, true);
    assert.match(session.view().brian.text, /g|radius|speed/i);
    assert.equal(session.view().cards[1].state, 'wrong');
  }
});

test('G-force lesson words and board labels avoid the reviewed language faults', () => {
  const forbidden = /\b(she|her|mph|bench|divisor|reference|decides)\b/i;
  const model = createGforceModel();
  for (let index = 0; index < GFORCE_STEPS.length; index++) {
    model.enter(index);
    const view = model.view();
    const copy = [view.say, view.prompt, ...view.hints,
      ...view.formulas.flatMap(row => [row.title, row.formula, row.worked, row.note]),
      ...view.cards.map(card => card.label)].join(' ');
    assert.doesNotMatch(copy, forbidden, GFORCE_STEPS[index].id);
    assert.ok(view.formulas.every(row => row.title), `${GFORCE_STEPS[index].id}: formula entries have titles`);
    const sentences = (view.say.match(/[.!?](?:\s|$)/g) ?? []).length;
    assert.ok(sentences <= 2, `${GFORCE_STEPS[index].id}: Brian uses at most two sentences`);
  }
  const view = model.view();
  assert.match(gforceBoard.hoverInfo(view, 274, 390), /radius from the centre/);
  assert.doesNotMatch(gforceBoard.hoverInfo(view, 274, 390), forbidden);

  const labels = [];
  const ctx = new Proxy({}, {
    get: (_, name) => name === 'measureText'
      ? value => ({width: String(value).length * 8})
      : ['createLinearGradient', 'createRadialGradient'].includes(name)
        ? () => ({addColorStop() {}})
        : (...args) => { if (name === 'fillText') labels.push(String(args[0])); },
    set: () => true,
  });
  model.enter(0);
  gforceBoard.drawBoard(ctx, model.view());
  assert.ok(labels.includes('ARM LENGTH'));
  assert.ok(labels.includes('SIDEWAYS PUSH'));
  assert.ok(!labels.includes('TURN RADIUS'));
  assert.ok(!labels.includes('SIDEWAYS ACCELERATION'));
  labels.length = 0;
  model.enter(GFORCE_STEPS.findIndex(step => step.id === 'word-radius'));
  gforceBoard.drawBoard(ctx, model.view());
  assert.ok(labels.includes('RADIUS'));
  labels.length = 0;
  model.enter(GFORCE_STEPS.findIndex(step => step.id === 'word-acceleration'));
  gforceBoard.drawBoard(ctx, model.view());
  assert.ok(labels.includes('SIDEWAYS ACCELERATION'));
});

test('G-force board draws the car, radius line, speed arrow, sideways push, cord and results table', () => {
  const calls = new Set();
  const ctx = new Proxy({}, {
    get: (_, name) => name === 'measureText'
      ? value => ({width: String(value).length * 8})
      : ['createLinearGradient', 'createRadialGradient'].includes(name)
        ? () => ({addColorStop() {}})
        : (...args) => calls.add(name),
    set: () => true,
  });
  const session = createClassroomSession(CLASSROOM_LESSONS.gforce);
  reachGforceFreeTest(session);
  finishGuidedGforceTries(session);
  session.act('speed:up');
  session.act('run');
  gforceBoard.drawBoard(ctx, session.view(), 1000, 680);
  assert.ok(calls.has('fillText'));
  assert.ok(calls.has('arc'));
  assert.ok(calls.has('lineTo'));
  const view = session.view();
  for (const action of ['speed:up', 'speed:down', 'radius:up', 'radius:down', 'run']) {
    assert.deepEqual(gforceBoard.hitTest(view, ...gforceBoard.targetPoint(view, action)), {action});
  }
});

function reachGripFreeTest(session) {
  until(session, view => view.ready); session.act('next');
  session.act('slide:up'); session.act('next');
  session.act('next'); session.act('next'); // formula
  for (let index = 0; index < 10; index++) session.act('slide:up');
  assert.match(session.view().formulas[0].worked, /0\.94 × 100 = 94%/);
  session.act('next'); // watch the rolling-road readings
  until(session, view => view.ready, 5);
  session.act('next'); // open the first prediction
  assert.equal(session.view().step.id, 'try-edge');
  session.act('answer:0'); session.act('run');
  session.act('next');
  assert.equal(session.view().step.id, 'try-far');
  session.act('answer:1'); session.act('run');
  session.act('next');
  assert.equal(session.view().step.id, 'try-free');
}

function reachGripQuestion(session) {
  until(session, view => view.ready); session.act('next');
  session.act('slide:up'); session.act('next');
  session.act('next'); session.act('next'); session.act('next');
  session.act('next'); // rolling-road watch
  until(session, view => view.ready, 5);
  session.act('next');
  assert.equal(session.view().step.id, 'try-edge');
  assert.equal(session.view().cards.length, 3);
}

test('Grip is registered as the classroom lesson with the kept notebook ids and challenge wording', () => {
  assert.equal(CLASSROOM_LESSONS.grip.id, 'grip');
  assert.equal(CLASSROOM_LESSONS.grip.name, 'Grip');
  assert.deepEqual(gripLesson.words.map(word => word.id), ['grip', 'slip', 'limit']);
  assert.equal(gripLesson.challengeCard.title, 'Find full grip, then find where it starts to fall.');
  assert.equal(GRIP_STEPS.at(-1).voice, 'lab.brian.grip.explain');
  const flags = {enabled: name => name === 'lab' || name === 'lab-classroom' || name === 'lab-tuning'};
  assert.deepEqual(lessonOpenState({drivingLessons: {version: 1, done: {corner: true}}}, 'grip', flags), {open: true, note: ''});
  assert.equal(lessonOpenState({}, 'grip', flags).open, false, 'the Wind tunnel remains locked before driving lesson 1');
});

test('a player can follow each Grip prompt, compare three settings, and pass the real two-run challenge', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.grip);
  until(session, view => view.ready); session.act('next');
  assert.equal(session.view().step.id, 'word-slide');
  assert.equal(session.view().keys['↑'], 'slide:up');
  session.act('slide:up');
  assert.equal(session.view().ready, true);
  session.act('next'); session.act('next'); session.act('next');
  assert.equal(session.view().step.id, 'formula');
  for (let index = 0; index < 10; index++) session.act('slide:up');
  assert.equal(session.view().formulas[0].worked, '0.94 × 100 = 94%');
  session.act('next');
  until(session, view => view.ready, 5);
  session.act('next');
  assert.equal(session.view().step.id, 'try-edge');
  assert.equal(session.view().cards.length, 3);
  assert.equal(session.view().grip, null);
  assert.ok(session.view().formulas.every(row => row.worked === ''), 'the open guess has no worked result');
  session.act('answer:0'); session.act('run');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /4\.5 degrees.*99\.7%.*100% less 99\.7% is about 0\.3%/);
  session.act('next');
  assert.equal(session.view().step.id, 'try-far');
  assert.equal(session.view().cards.length, 3);
  assert.ok(session.view().formulas.every(row => row.worked === ''), 'the second open guess hides its result');
  session.act('answer:1'); session.act('run');
  assert.match(session.view().brian.text, /9 degrees.*93\.9%.*99\.7%.*4\.5 degrees/);
  session.act('next');
  assert.equal(session.view().step.id, 'try-free');
  assert.equal(session.view().keys.Space, 'run');
  // A repeated setting does not count; three distinct settings complete the free test.
  for (const [target, presses] of [[3, 2], [4.5, 3], [9, 9]]) {
    for (let index = 0; index < presses; index++) session.act('slide:up');
    session.act('run');
    assert.equal(session.view().rows.at(-1).slideDeg, target);
  }
  assert.equal(session.view().rows.length, 3);
  assert.equal(new Set(session.view().rows.map(row => row.slideDeg)).size, 3);
  assert.equal(session.view().ready, true);
  session.act('next');
  assert.equal(session.view().step.id, 'challenge');
  // The target angle is not enough by itself: each result comes from the same bench function.
  for (let index = 0; index < 4; index++) session.act('slide:up');
  session.act('run');
  assert.equal(session.view().ready, false);
  session.act('slide:up'); session.act('run');
  assert.equal(session.view().ready, true);
  assert.equal(session.view().challengeAttempts.length, 2);
  const attempts = gripLesson.benchAttempts(session.view());
  const history = attempts.map(attempt => ({input: attempt.input, settings: attempt.input, result: gripBench.run(attempt.input)}));
  assert.equal(gripBench.goalMet(history), true);
  session.act('next');
  for (const [step, answer] of [['check-best', 'answer:1'], ['check-loss', 'answer:1'], ['check-driving', 'answer:0']]) {
    assert.equal(session.view().step.id, step);
    assert.equal(session.view().cards.length, 3);
    session.act(answer);
    session.act('next');
  }
  assert.equal(session.view().step.id, 'recap');
  assert.ok(session.view().ready);
});

test('Grip predictions explain the small loss at 4.5 degrees with rounded, readable numbers', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.grip);
  reachGripQuestion(session);
  session.act('answer:1'); session.act('run');
  const view = session.view();
  assert.equal(view.brian.mood, 'explain');
  assert.match(view.brian.text, /4\.5 degrees.*99\.7%.*100% less 99\.7% is about 0\.3%/);
  assert.doesNotMatch(view.brian.text, /\d+\.\d{3,}/);
});

test('Show me records three different free Grip settings and finishes the free test', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.grip);
  reachGripFreeTest(session);
  for (let index = 1; index <= 3; index++) {
    for (let rung = 0; rung < 3; rung++) session.act('help');
    const view = session.view();
    assert.equal(view.pointer.action, 'set:best');
    const point = gripBoard.targetPoint(view, view.pointer.action);
    const hit = gripBoard.hitTest(view, ...point);
    assert.ok(hit && ['slide:up', 'slide:down', 'run'].includes(hit.action));
    run(session, SHOW_ME_S + .05);
    assert.match(session.view().brian.text, /^That is how it is done\./);
    until(session, current => current.rows.length >= index, 3);
    assert.equal(session.view().rows.length, index);
    assert.equal(new Set(session.view().rows.map(row => row.slideDeg)).size, index);
  }
  assert.equal(session.view().ready, true);
});

test('Grip percent formula uses rounded displayed values and open guesses hide results', () => {
  const model = createGripModel();
  const formulaIndex = GRIP_STEPS.findIndex(step => step.id === 'formula');
  for (const angle of [0, 2, 3, 4, 4.5, 9, 12]) {
    model.enter(formulaIndex);
    let view = model.view();
    while (view.slideDeg < angle) { model.act('slide:up'); view = model.view(); }
    while (view.slideDeg > angle) { model.act('slide:down'); view = model.view(); }
    assert.match(view.formulas[0].formula, /grip kept as a fraction × 100/);
    assert.equal(view.grip, gripBench.run({slideDeg: angle, driver: 'casual'}).grip);
    assert.equal(view.percent, pctForGrip(view.grip));
    if (angle === 9) assert.equal(view.formulas[0].worked, '0.94 × 100 = 94%');
    assert.doesNotMatch(JSON.stringify(view.formulas), /clamp|\d+\.\d{3,}/i);
  }
  model.enter(GRIP_STEPS.findIndex(step => step.id === 'try-edge'));
  assert.ok(model.view().formulas.every(row => row.worked === ''));
  assert.equal(model.view().percent, null);
});

test('the Grip watch moves through four settings without giving away either prediction', () => {
  const model = createGripModel();
  model.enter(GRIP_STEPS.findIndex(step => step.id === 'watch'));
  assert.equal(model.view().slideDeg, 2);
  for (const angle of [3, 4, 12]) {
    model.tick(.8);
    assert.equal(model.view().slideDeg, angle);
    assert.equal(model.view().grip, gripBench.run({slideDeg: angle, driver: 'casual'}).grip);
  }
  const event = model.tick(.8);
  assert.equal(event.kind, 'right');
  assert.match(event.say, /2, 3 and 4 degrees.*100%.*12 degrees.*loss grows/);
  assert.doesNotMatch(event.say, /4\.5|9 degrees/);
  assert.equal(model.view().rows.length, 4);
  assert.deepEqual(model.view().rows.map(row => row.slideDeg), [2, 3, 4, 12]);
  assert.deepEqual(GRIP_STEPS.map(step => step.part), [...GRIP_STEPS.map(step => step.part)].sort((a, b) => a - b));
});

test('the Grip graph plots smooth unrounded readings past the best angle', () => {
  const points = gripBoard.gripCurvePoints().filter(point => point.slideDeg >= bestSlideDegrees());
  const changes = points.slice(1).map((point, index) => Math.abs(point.y - points[index].y));
  assert.ok(changes.some(change => change > 0), 'the plotted grip line changes after its peak');
  assert.ok(changes.every(change => change < .5), 'neighboring plotted points stay close for a smooth line');
  const raw = tyreSlipGrip(slipAtAngle(6.27 * Math.PI / 180), 'casual');
  const plotted = gripBoard.gripCurvePoints().find(point => Math.abs(point.slideDeg - 6.27) < .001);
  assert.ok(plotted, 'the graph samples at fine angle steps');
  assert.ok(Math.abs(plotted.y - (452 - (raw * 100 - 88) / 12 * 272)) < 1e-9, 'the graph uses the unrounded grip result');
});

test('Grip words and labels follow the reviewed classroom language rules', () => {
  const forbidden = /\b(she|her|mph|bench|decides|clamp|tyre model|tyre function|casual tyre reading|slip 1|0\.25 slip|same angle curve)\b/i;
  const model = createGripModel();
  for (let index = 0; index < GRIP_STEPS.length; index++) {
    model.enter(index);
    const view = model.view();
    const copy = [view.say, view.prompt, ...view.hints,
      ...view.formulas.flatMap(row => [row.title, row.formula, row.worked, row.note]),
      ...view.cards.map(card => card.label)].join(' ');
    assert.doesNotMatch(copy, forbidden, GRIP_STEPS[index].id);
    assert.ok(view.formulas.every(row => row.title), `${GRIP_STEPS[index].id}: formula entries have titles`);
    assert.ok((view.say.match(/[.!?](?:\s|$)/g) ?? []).length <= 2, `${GRIP_STEPS[index].id}: Brian uses at most two sentences`);
  }
  const gripCopy = [
    ...gripLesson.words.map(word => word.meaning),
    ...gripLesson.keyIdeas.map(item => item.text),
    gripLesson.challengeCard.text,
    gripLesson.passSay,
  ].join(' ');
  assert.doesNotMatch(gripCopy, forbidden);
  const lines = [];
  model.enter(0);
  gripBoard.drawBoard(fakeCanvas(lines), model.view());
  assert.ok(lines.includes('GRIP AS THE ANGLE CHANGES'));
  assert.ok(lines.includes('SIDEWAYS SLIDE ANGLE'));
  assert.ok(lines.includes('TYRE POINTS'));
  assert.ok(lines.includes('TRAVEL'));
  assert.doesNotMatch(lines.join(' '), forbidden);
  model.enter(GRIP_STEPS.findIndex(step => step.id === 'try-edge'));
  const guessLines = [];
  gripBoard.drawBoard(fakeCanvas(guessLines), model.view());
  assert.ok(!guessLines.some(line => line.includes('BEST ANGLE')));
  assert.equal(model.view().grip, null);
  assert.equal(model.view().percent, null);
});

test('each Grip check has one correct card, and the graph label fits between its panels', () => {
  for (const step of ['check-best', 'check-loss', 'check-driving']) {
    const outcomes = GRIP_STEPS.map((item, answer) => ({item, answer}))
      .filter(({item}) => item.id === step)
      .flatMap(({item}) => [0, 1, 2].map(answer => {
        const model = createGripModel();
        model.enter(GRIP_STEPS.indexOf(item));
        return model.act(`answer:${answer}`).kind;
      }));
    assert.equal(outcomes.filter(kind => kind === 'right').length, 1, step);
  }

  const rectangles = [], labels = [], transforms = [];
  let font = '';
  let matrix = [1, 0, 0, 1, 0, 0];
  const transformPoint = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const multiply = ([a, b, c, d, e, f], [g, h, i, j, k, l]) => [
    a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j,
    a * k + c * l + e, b * k + d * l + f,
  ];
  const bounds = (x, y, width, height) => {
    const points = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(point => transformPoint(...point));
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    rectangles.push([Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]);
  };
  const ctx = new Proxy({}, {
    get: (_, name) => name === 'roundRect'
      ? (x, y, width, height) => bounds(x, y, width, height)
      : name === 'fillRect'
        ? (x, y, width, height) => bounds(x, y, width, height)
      : name === 'fillText'
        ? (value, x, y) => labels.push({text: String(value), x: transformPoint(x, y)[0], y: transformPoint(x, y)[1], font})
        : name === 'measureText'
          ? value => ({width: String(value).length * 8})
          : name === 'save'
            ? () => transforms.push([...matrix])
            : name === 'restore'
              ? () => { matrix = transforms.pop() ?? [1, 0, 0, 1, 0, 0]; }
              : name === 'translate'
                ? (x, y) => { matrix = multiply(matrix, [1, 0, 0, 1, x, y]); }
                : name === 'rotate'
                  ? angle => { matrix = multiply(matrix, [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]); }
                  : name === 'scale'
                    ? (x, y) => { matrix = multiply(matrix, [x, 0, 0, y, 0, 0]); }
                    : name === 'setTransform'
                      ? (...values) => { matrix = values.length === 1 ? [1, 0, 0, 1, 0, 0] : values; }
                      : name === 'resetTransform'
                        ? () => { matrix = [1, 0, 0, 1, 0, 0]; }
          : ['createLinearGradient', 'createRadialGradient'].includes(name)
            ? () => ({addColorStop() {}})
            : () => {},
    set: (_, name, value) => { if (name === 'font') font = value; return true; },
  });
  const model = createGripModel();
  gripBoard.drawBoard(ctx, model.view());
  model.enter(GRIP_STEPS.length - 1);
  gripBoard.drawBoard(ctx, model.view());
  for (const [x, y, width, height] of rectangles) {
    assert.ok(x >= 0 && y >= 0 && x + width <= 1000 && y + height <= 700, `panel fits: ${[x, y, width, height]}`);
  }
  const graphPanel = rectangles.find(([x, y]) => x === 54 && y === 48);
  const axis = labels.find(label => label.text === 'SIDEWAYS SLIDE ANGLE');
  const size = Number(axis.font.match(/\d+(?:\.\d+)?px/)?.[0].replace('px', ''));
  assert.ok(axis.y + size / 2 < graphPanel[1] + graphPanel[3], 'the full sideways label fits inside the graph panel');
  assert.ok(graphPanel[1] + graphPanel[3] < 522, 'the graph and tyre panels do not overlap');
});

const pctForGrip = grip => Math.round(grip * 1000) / 10;

test('Grip screen contract uses sendable keys, complete views and board points for every target', () => {
  const sent = new Set(Object.values(KEY_NAMES));
  const model = createGripModel();
  for (let index = 0; index < GRIP_STEPS.length; index++) {
    model.enter(index);
    const view = model.view();
    const fields = [
      'actions', 'buttons', 'cards', 'keys', 'repeat', 'hints', 'formulas',
      'target', 'glow', 'waiting', 'ready', 'asking', 'say', 'prompt',
    ];
    for (const field of fields) assert.ok(field in view, `${view.scene} has ${field}`);
    for (const key of Object.keys(view.keys)) assert.ok(sent.has(key), `${view.scene} offers unsendable key ${key}`);
    for (const key of view.repeat) assert.ok(sent.has(key), `${view.scene} repeats unsendable key ${key}`);
    if (view.target) {
      const point = gripBoard.targetPoint(view, view.target);
      if (view.pointOnly) assert.equal(point, null, `${view.scene} target ${view.target} belongs to classroom HTML`);
      else assert.ok(point?.every(Number.isFinite), `${view.scene} target ${view.target} has a board point`);
    }
    for (const card of view.cards) {
      assert.equal(card.picture.kind, 'grip');
      const labels = [];
      gripBoard.drawPicture(fakeCanvas(labels), card.picture, 220, 110);
      assert.ok(labels.some(label => label.includes('Grip?')));
    }
  }
  const initial = model.view();
  assert.deepEqual(gripBoard.drawBoard(fakeCanvas(), initial, 800, 600), {scale: .8, left: 0, top: 28});
  const live = createClassroomSession(CLASSROOM_LESSONS.grip);
  reachGripFreeTest(live);
  for (const action of ['slide:up', 'slide:down', 'run']) {
    const view = live.view(), point = gripBoard.targetPoint(view, action);
    assert.deepEqual(gripBoard.hitTest(view, ...point), {action: action === 'run' ? 'run' : action});
  }
  assert.equal(Number(bestSlideDegrees().toFixed(1)), 4.3);
});
