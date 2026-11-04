// LAB-CLASSROOM (docs/board/cards/LAB-CLASSROOM.md): the classroom frame and the rebuilt pendulum lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, STUCK_OFFER_S, STUCK_HINT_S, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, LENGTHS, HOOK_X} from '../src/lab/lessons/pendulum-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, bobPoint} from '../src/lab/lessons/pendulum-board.js';
import {stringPeriod} from '../src/lab/benches/pendulum.js';
import {FEATURE_STATES} from '../src/feature-flags.js';

const lesson = CLASSROOM_LESSONS.pendulum;
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
  assert.match(v.brian.text, /^Watch how I do it\. /); assert.equal(v.celebrate, null, 'Brian does not cheer his own press');
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
