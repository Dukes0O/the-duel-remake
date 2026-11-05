// LAB-CLASSROOM (docs/board/cards/LAB-CLASSROOM.md): the classroom frame and the rebuilt pendulum lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, STUCK_OFFER_S, STUCK_HINT_S, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {KEY_NAMES} from '../src/lab/classroom/classroom-keys.js';
import {STEPS, LENGTHS, HOOK_X} from '../src/lab/lessons/pendulum-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, bobPoint} from '../src/lab/lessons/pendulum-board.js';
import {stringPeriod} from '../src/lab/benches/pendulum.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {STEPS as GFORCE_STEPS, KEY_IDEAS as GFORCE_IDEAS, createModel as createGforceModel} from '../src/lab/lessons/gforce-classroom.js';
import * as gforceBoard from '../src/lab/lessons/gforce-board.js';
import {lateralG} from '../src/lab/benches/gforce.js';
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
const until = (session, test, limit = 30) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), 'condition not reached'); };
const goTo = (session, id) => { while (session.view().step.id !== id) { const v = session.view(); assert.ok(v.ready, `step ${v.step.id} is not ready`); session.act('next'); } };
// The key a prompt names ("press 1", "press Space") must do what the prompt asks.
function followPrompt(session) {
  const v = session.view(), key = v.prompt.match(/press (Space|\d)/i)?.[1];
  assert.ok(key, `prompt names no key: ${v.prompt}`);
  assert.ok(v.keys[key], `the key in "${v.prompt}" does nothing`);
  session.act(v.keys[key]);
  return v.keys[key];
}
// A child who does exactly what each prompt says, with one press, and always guesses right.
function playThrough(session, {check = () => {}} = {}) {
  until(session, v => v.ready); session.act('next'); // wonder
  assert.equal(followPrompt(session), 'release'); session.act('next');
  until(session, v => v.lap.elapsed > stringPeriod(15) * .93 && v.lap.last === null, 20);
  assert.equal(followPrompt(session), 'tap'); assert.ok(session.view().ready, 'a tap on the return counts'); session.act('next');
  session.act('measure:25'); assert.ok(session.view().ready); session.act('next');
  until(session, v => v.ready, 15); session.act('next');
  until(session, v => v.ready, 10); session.act('next');
  for (const [id, guess] of [['try-short', 'guess:0'], ['try-heavy', 'guess:2']]) {
    assert.equal(session.view().step.id, id);
    followPrompt(session); assert.equal(session.view().cards.length, 3, `${id}: set-up done, cards to guess`);
    session.act(guess); assert.equal(followPrompt(session), 'release');
    until(session, v => v.ready, 15); check(session.view()); session.act('next');
  }
  session.act('hook:25'); session.act('release'); until(session, v => v.ready, 15); session.act('next');
  for (const answer of ['answer:1', 'answer:1', 'answer:0']) { session.act(answer); assert.ok(session.view().ready); session.act('next'); }
  return session.view();
}

test('the lesson walks through the seven parts in order, one idea per step', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['pendulum-pendulum', 'pendulum-swing-time', 'pendulum-length']);
  assert.equal(FEATURE_STATES['lab-classroom'], 'on');
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
});
function playThroughTo(session, id) {
  const script = {wonder: () => until(session, v => v.ready), 'word-pendulum': () => session.act('release'),
    'word-swing-time': () => { until(session, v => v.lap.elapsed > stringPeriod(15) * .93, 20); session.act('tap'); },
    'word-length': () => session.act('measure:25'), 'watch-lengths': () => until(session, v => v.ready, 15), 'watch-weights': () => until(session, v => v.ready, 10)};
  while (session.view().step.id !== id) { script[session.view().step.id](); session.act('next'); }
}

test('a wrong guess says why with the real swing times, and the player can carry on', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  session.act('hook:5'); session.act('guess:1'); session.act('release');
  until(session, v => v.ready, 15);
  const v = session.view();
  assert.equal(v.mood, 'explain'); assert.ok(v.brian.text.includes(s1(stringPeriod(5))) && v.brian.text.includes(s1(stringPeriod(15))), v.brian.text);
  assert.deepEqual(v.cards.map(c => c.state), ['right', 'wrong', null]);
  assert.ok(session.act('next'));
  session.act('hook:25');
  assert.equal(session.view().brian.text, 'Keep it on the 15 m hook, so we change only one thing: the weight.');
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
  playThroughTo(session, 'try-short');
  for (const step of ['try-short', 'try-heavy']) { const v = session.view(); assert.equal(v.step.id, step); session.act(v.target); session.act('guess:2'); session.act('release'); until(session, x => x.ready, 15); session.act('next'); }
  for (let i = 0; i < 4; i++) {
    session.act('hook:5'); session.act('release'); until(session, v => v.help > 0 && v.lastTry, 15);
    assert.match(session.view().brian.text, new RegExp(`${s1(stringPeriod(5)).replace('.', '\\.')}.*longer string`));
  }
  assert.equal(session.view().help, 2); assert.equal(session.view().pointer, null);
  assert.ok(!session.view().ready, 'the crane puzzle passes only on the 25 m string');
});

test('every number on the board comes from stringPeriod', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch-lengths');
  until(session, v => v.ready, 15);
  assert.deepEqual(session.view().table.map(r => r.value), LENGTHS.map(l => s1(stringPeriod(l))));
  session.act('next'); until(session, v => v.ready, 10);
  assert.deepEqual(session.view().table.map(r => r.value), [s1(stringPeriod(15)), s1(stringPeriod(15))]);
  assert.deepEqual([4.5, 7.8, 10].map(n => n.toFixed(1)), LENGTHS.map(l => stringPeriod(l).toFixed(1)), 'LAB.md 4.1 numbers');
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
    for (const c of played.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('arc') || calls.has('fillRect'), `${c.id} draws a picture`); }
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

test('review fixes: slow motion ends with its step; Show me presses the control; replays restart', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch-lengths');
  session.act('slow'); until(session, v => v.ready, 25); session.act('next');
  assert.equal(session.view().slow, false, 'slow motion does not follow the player into a step without its button');
  until(session, v => v.ready, 10); session.act('next');
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
  session.act('hook:25'); session.act('release'); until(session, x => x.ready, 15);
  run(session, 2); session.act('replay');
  assert.ok(session.view().pendulums[0].stopwatch === null || session.view().pendulums[0].stopwatch.elapsed < .2, 'Watch again restarts the crane swing');
});

test('review fixes: in the short-string try a weight press keeps the comparison fair', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  session.act('weight:heavy');
  assert.match(session.view().brian.text, /Keep the light 20 kg weight/);
  session.act('hook:5');
  assert.equal(session.view().cards.length, 0, 'heavy on 5 m changes two things, so no guess yet');
  session.act('weight:light');
  assert.equal(session.view().cards.length, 3);
});

test('review fixes: Show me only points where pressing for the player would be wrong (the swing tap)', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-swing-time');
  for (let i = 0; i < 3; i++) session.act('help');
  run(session, 3);
  const v = session.view();
  assert.ok(v.pointer && !v.ready && v.tapFlash !== undefined, 'the tap stays the player’s to make');
  assert.equal(v.keys[3], undefined);
  playThroughTo(session, 'word-length');
  assert.equal(session.view().keys[3], 'measure:25', 'the prompt’s "3" picks the longest string');
});

test('Suspension keeps its notebook terms, bench challenge and ordered classroom parts', () => {
  const suspension = CLASSROOM_LESSONS.suspension;
  assert.ok(suspension);
  assert.deepEqual([...new Set(SUSPENSION_STEPS.map(step => step.part))], [0,1,2,3,4]);
  assert.deepEqual(SUSPENSION_WORDS.slice(0,4).map(word => word.id), ['suspension-word-0','suspension-word-1','suspension-word-2','suspension-word-3']);
  assert.deepEqual(SUSPENSION_WORDS.map(word => word.word), ['Spring','Soft','Stiff','Body roll','Body shake']);
  assert.equal(suspension.challengeCard.title, 'Compare both springs on both roads.');
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
  const advance=()=>{ if(model.view().ready) model.act('next'); };
  model.enter(5);
  assert.equal(model.view().scene,'guess-bumps');
  assert.equal(model.view().cards.length,3);
  assert.ok(model.view().formulas.every(row=>!row.worked), 'the open guess has no worked answer');
  model.act('answer:1'); model.act('spring:soft'); model.act('road:bumpy'); model.act('run');
  assert.match(model.view().say,/4\.09 m\/s².*4\.77 m\/s²/);
  model.enter(6); assert.equal(model.view().scene,'guess-roll');
  model.act('answer:0'); model.act('spring:stiff'); model.act('road:smooth'); model.act('run');
  assert.match(model.view().say,/6\.5°.*2\.2°/);
});

test('Suspension guided prompts work, the formulas follow settings, and three distinct free runs open Continue', () => {
  const model=createSuspensionModel();
  model.enter(7);
  const initial=model.view().formulas.at(-1).worked;
  model.act('spring:stiff'); model.act('road:smooth');
  assert.notEqual(model.view().formulas.at(-1).worked,initial,'the roll sum tracks control settings');
  model.act('run'); model.act('road:bumpy'); model.act('run'); model.act('spring:soft'); model.act('run');
  assert.equal(model.view().rows.length,3); assert.equal(model.view().ready,true);
  assert.equal(new Set(model.view().rows.map(row=>`${row.spring}/${row.road}`)).size,3);
  const actual=suspensionBench.run({spring:'soft',road:'bumpy'});
  assert.equal(model.view().rows[2].shake,actual.bodyShake.toFixed(2));
});

test('Show me selects and runs a different setting pair each time in the free test', () => {
  const model=createSuspensionModel(); model.enter(7);
  for(let i=0;i<3;i++) { const v=model.view(); assert.equal(v.target,'show'); model.act(v.target); }
  assert.equal(model.view().rows.length,3);
  assert.equal(new Set(model.view().rows.map(row=>`${row.spring}/${row.road}`)).size,3);
  assert.equal(model.view().ready,true);
});

test('hovering explains the parts of the picture: hooks, weights, stopwatches', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-short');
  const v = session.view(), [hx, hy] = targetPoint(v, 'hook:5');
  assert.match(hoverInfo(v, hx, hy), /5 m hook\. Click it, or press 1/);
  assert.match(hoverInfo(v, ...targetPoint(v, 'weight:heavy')), /200 kg weight\. Click it, or press 5/);
  const grey = v.pendulums.find(p => p.ghost);
  assert.match(hoverInfo(v, ...bobPoint(grey)), /grey weight/);
  assert.match(hoverInfo(v, grey.x - 30, 50), /Stopwatch/);
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
