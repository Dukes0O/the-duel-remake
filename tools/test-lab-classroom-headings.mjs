// LAB-CLASSROOM-HEADINGS (docs/board/cards/LAB-CLASSROOM-HEADINGS.md): Headings and maps as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, JOB, RING_M, CRUISE_MS, pointAt, toMap, three, offBy} from '../src/lab/lessons/headings-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, dragAngle} from '../src/lab/lessons/headings-board.js';
import {CHALLENGE_RULES, challengeSpots} from '../src/lab/lab-challenges.js';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {courseSite} from '../src/heli/heli-session.js';
import {createHeliState, stepHeli, heliReadout, compassBearing} from '../src/heli/heli-flight.js';

const lesson = CLASSROOM_LESSONS.headings;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const press = (session, action, times = 1) => { for (let i = 0; i < times; i++) session.act(action); };
// Turn her with A or D, one press at a time, until the gauge reads the heading.
function turnTo(session, deg, way = 'right') {
  for (let i = 0; i < 80 && session.view().gauge !== three(deg); i++) session.act(`turn:${way}`);
  assert.equal(session.view().gauge, three(deg));
}
function flyJob(session, stopAt = JOB.distanceM) {
  session.act('fly');
  until(session, v => v.flown >= stopAt - CRUISE_MS * .05 / 2, 30);
  session.act('fly');
}
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const v = session.view(), step = v.step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-heading') turnTo(session, 30);
    else if (step === 'word-compass') { turnTo(session, 90); session.act('fly'); }
    else if (step === 'word-scale') { press(session, 'ruler:longer', 4); session.act('fly'); }
    else if (step === 'try-turn') { turnTo(session, JOB.headingDeg); session.act('fly'); until(session, x => x.ready); }
    else if (step === 'try-wrap') { turnTo(session, 340, 'left'); session.act('fly'); until(session, x => x.ready); }
    else if (step === 'alone') { turnTo(session, JOB.headingDeg); flyJob(session); }
    else if (step.startsWith('check')) session.act(`answer:${{'check-west': 2, 'check-wrap': 0, 'check-scale': 1}[step]}`);
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and is listed for the classroom', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.flatMap(s => [s.word, ...(s.words ?? [])]).filter(Boolean),
    ['headings-heading', 'headings-north', 'headings-east', 'headings-south', 'headings-west', 'headings-scale'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.id).sort(), ['headings-east', 'headings-heading', 'headings-north', 'headings-scale', 'headings-south', 'headings-west']);
  assert.equal(lesson.name, 'Headings and maps');
  assert.equal(lesson.challengeCard.title, 'Turn until the gauge reads 070.');
});

test('every heading is the HEADING gauge’s, and the job’s smoke is where the challenge puts it', () => {
  assert.deepEqual(JOB, {headingDeg: CHALLENGE_RULES.headings.headingDeg, distanceM: CHALLENGE_RULES.headings.distanceM});
  assert.equal(RING_M, CHALLENGE_RULES.headings.radius);
  // The challenge's smoke, from the Woods pad, drawn on the lesson's map (east right, north up).
  const course = new Course(ALL_CIRCUITS.find(def => def.id === 'tremblant-woods'), 1989), ground = groundFromCourse(course);
  const site = courseSite(course, ground, 'tremblant-woods'), marker = challengeSpots('headings', {course, ground}, site).marker;
  const offset = {x: marker.x - site.zone.x, z: marker.z - site.zone.z}, onMap = toMap(offset), smoke = pointAt(JOB.headingDeg, JOB.distanceM);
  assert.ok(Math.abs(onMap.x - smoke.x) < 1e-6 && Math.abs(onMap.y - smoke.y) < 1e-6, 'the board’s smoke is the challenge’s');
  assert.ok(Math.abs(compassBearing(offset.x, offset.z) - 70) < 1e-9);
  // Flying on a gauge reading goes the lesson's way: 090 is to the right on the map.
  for (const gauge of [0, 70, 90, 180, 270]) {
    const s = createHeliState({heading: -gauge * Math.PI / 180}); s.y = 30; s.onGround = false;
    for (let i = 0; i < 600; i++) stepHeli(s, {lift: .55, pitch: 1}, {ground: {height: () => 0}});
    assert.ok(Math.abs(offBy(heliReadout(s).headingDeg, gauge)) < .5);
    const went = toMap({x: s.x, z: s.z}), want = pointAt(gauge, 1), length = Math.hypot(went.x, went.y);
    assert.ok(Math.abs(went.x / length - want.x) < .01 && Math.abs(went.y / length - want.y) < .01, `on ${three(gauge)} she flies where the map says`);
  }
  assert.deepEqual(pointAt(90, 1).x.toFixed(6), '1.000000', 'east is to the right');
});

test('a child who does exactly what each prompt says passes every step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.scene, 'recap'); assert.equal(v.ideas.length, 3); assert.ok(v.last);
  assert.equal(v.step.voice, 'lab.brian.headings.explain');
});

test('the words: D counts up, A counts down, east is 090, and the ruler counts squares', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-heading');
  session.act('turn:left');
  assert.equal(session.view().gauge, '355', 'past 000 turning left comes 355');
  assert.match(session.view().brian.text, /went down: A turns her left/);
  // Six presses of D after A: 30 degrees right since A, from 355 to 025.
  press(session, 'turn:right', 6);
  assert.match(session.view().brian.text, /^She reads 025: the number went up as she turned right/);
  session.act('next');
  turnTo(session, 120);
  session.act('fly');
  assert.match(session.view().brian.text, /She reads 120: 30 degrees too far right\. A turns her back left: the number goes down/);
  assert.equal(session.view().ready, false, 'a wrong heading is not east');
  press(session, 'turn:left', 6); session.act('fly');
  assert.match(session.view().brian.text, /She reads 090|^Right: 090 is east/);
  assert.equal(session.view().ready, true);
  session.act('next');
  press(session, 'ruler:longer', 7); session.act('fly');
  assert.match(session.view().brian.text, /That is 450 m: four and a half squares\. The hut is 3 squares away: 300 m\./);
  press(session, 'ruler:shorter', 3); session.act('fly');
  assert.match(session.view().brian.text, /^Right: three squares/);
});

test('the tries: a wrong heading says how far off and how far it passed; the short way round is A', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-turn');
  // The smoke is on the map while she turns (the pointer's target is a separate field).
  assert.equal(session.view().spot.kind, 'smoke'); assert.equal(session.view().target, 'turn:best');
  turnTo(session, 100); session.act('fly'); until(session, v => v.ready);
  const passed = Math.round(JOB.distanceM * Math.sin(30 * Math.PI / 180));
  assert.match(session.view().brian.text, new RegExp(`^You flew heading 100: 30 degrees too far right, and passed ${passed} m from the smoke\\. A turns her back left`));
  assert.equal(session.view().ghosts.length, 0, 'the flight is on the map until she flies again');
  // Fly it again: her last track stays as a faint line.
  press(session, 'turn:left', 6); session.act('fly'); until(session, v => /^Right over the smoke!/.test(v.brian.text));
  assert.equal(session.view().ghosts.length, 1);
  session.act('next');
  turnTo(session, 340, 'right'); session.act('fly'); until(session, v => v.ready);
  assert.match(session.view().brian.text, /^That worked, but A was the short way: 40 degrees instead of 320/);
  const short = createClassroomSession(lesson);
  playThroughTo(short, 'try-wrap');
  turnTo(short, 340, 'left'); assert.equal(short.view().gauge, '340');
  short.act('fly'); until(short, v => v.ready);
  assert.match(short.view().brian.text, /^Right: A turned her left past 000/);
});

test('Brian’s job: each miss says what to change with the real numbers; only stopping over the smoke passes', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  turnTo(session, 80); flyJob(session);
  assert.match(session.view().brian.text, /^You flew heading 080: 10 degrees too far right, and stopped \d+ m from the smoke\. Turn her to 070 \(A\)/);
  assert.equal(session.view().heli.x, 0, 'she is back on the pad for another go');
  turnTo(session, 70, 'left'); flyJob(session, 450);
  assert.match(session.view().brian.text, /^Right heading, but you stopped after 4\d\d m, \d+ m short\./);
  flyJob(session, 640);
  assert.match(session.view().brian.text, /^Right heading, but you stopped after 6\d\d m, \d+ m past it\./);
  flyJob(session);
  assert.match(session.view().brian.text, /^Over the smoke! 070 for 55\d m/);
  assert.equal(session.view().ready, true);
  // Flying off the map brings her back to the pad.
  const off = createClassroomSession(lesson);
  playThroughTo(off, 'alone');
  turnTo(off, 70); off.act('fly'); until(off, v => /flew off the map/.test(v.brian.text), 40);
  assert.equal(off.view().heli.x, 0);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me turns her and flies the job', () => {
  for (const id of ['word-heading', 'word-compass', 'word-scale', 'try-turn', 'try-wrap', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    assert.ok(targetPoint(v, v.pointer.action), `${id}: at a place on the board`);
    run(session, SHOW_ME_S + .2);
    assert.match(session.view().brian.text, /^Like that\. /);
    until(session, x => x.ready, 30);
  }
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  for (let i = 0; i < 3; i++) job.act('help');
  run(job, SHOW_ME_S + .2);
  assert.equal(job.view().keys.Space, undefined, 'the keys are held while Brian flies');
  until(job, v => v.ready, 30);
  assert.match(job.view().brian.text, /^Over the smoke! 070 for 550 m/);
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {'check-west': [0, /^090 is east\. West is 270/], 'check-wrap': [1, /^A works, but it is the long way, 340 degrees/], 'check-scale': [0, /five squares is 500 m, and half a square 50 m more/]};
  for (const [id, [pick, why]] of Object.entries(answers)) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
    run(session, 2);
  }
  const wrap = createClassroomSession(lesson);
  playThroughTo(wrap, 'check-wrap');
  wrap.act('answer:0');
  const seen = [];
  for (let t = 0; t < 2.5; t += .05) { wrap.tick(.05); seen.push(Number(wrap.view().gauge)); }
  assert.equal(seen.at(-1), 10);
  assert.ok(seen.some(d => d > 350) && seen.some(d => d < 10) && seen.every(d => d >= 350 || d <= 10), `the demo turns right through 000 to 010: ${seen}`);
});

test('mouse: the compass ring turns her, the ruler drags, her body flies, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-compass');
  let v = session.view();
  const [hx, hy] = targetPoint(v, 'fly');
  assert.equal(hitTest(v, hx + 70, hy)?.drag, 'compass');
  assert.equal(dragAngle(v, 'compass', hx + 70, hy), 90, 'to her right on the map is 090');
  assert.equal(dragAngle(v, 'compass', hx, hy - 70), 0);
  assert.equal(dragAngle(v, 'compass', hx - 70, hy), 270);
  session.act(`hold:${dragAngle(v, 'compass', hx + 70, hy + 2)}`);
  assert.equal(session.view().gauge, '090');
  assert.equal(hitTest(session.view(), hx, hy)?.action, 'fly', 'a click on her is Space');
  session.act('fly'); session.act('next');
  v = session.view();
  const end = targetPoint(v, 'ruler:best');
  assert.equal(hitTest(v, ...end)?.drag, 'ruler');
  session.act(`hold:${dragAngle(v, 'ruler', end[0] + 120, end[1])}`);
  assert.equal(session.view().ruler.length, 300, 'dragged to the hut');
  for (const [x, y] of [[hx, hy], [870, 120], end]) assert.ok(hoverInfo(session.view(), x, y), `hover at ${x}, ${y}`);
});

test('the board draws every step and card', () => {
  const calls = new Set();
  const fake = () => new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return value => ({width: String(value).length * 9});
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    return () => { calls.add(name); };
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  for (let i = 0; i < STEPS.length; i++) {
    session.act(`go:${i}`);
    for (const t of [0, 2.5, 6]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('stroke'), `${c.id} draws a picture`); }
  }
});

test('replays: the wonder and the watch start again', () => {
  const session = createClassroomSession(lesson);
  until(session, v => v.ready);
  session.act('replay');
  assert.equal(session.view().flown, null, 'she is back on the pad');
  until(session, v => v.ready);
  session.act('next'); playThroughTo(session, 'watch');
  until(session, v => v.ready);
  assert.equal(session.view().gauge, '120');
  session.act('replay');
  assert.equal(session.view().gauge, '000');
});

test('review fixes: the ruler keeps its 50 m steps, and Show me always works and is never called the long way', () => {
  const ruler = createClassroomSession(lesson);
  playThroughTo(ruler, 'word-scale');
  press(ruler, 'ruler:longer', 20);
  assert.equal(ruler.view().ruler.length % 50, 0, 'held → stops on a 50 m step');
  for (let i = 0; i < 20 && ruler.view().ruler.length > 300; i++) ruler.act('ruler:shorter');
  assert.equal(ruler.view().ruler.length, 300, '← reaches the hut again');
  // Heading: after a long turn left, Show me still turns her right and passes.
  const heading = createClassroomSession(lesson);
  playThroughTo(heading, 'word-heading');
  press(heading, 'turn:left', 32);
  for (let i = 0; i < 3; i++) heading.act('help');
  run(heading, SHOW_ME_S + .2);
  assert.match(heading.view().brian.text, /^Like that\. Watch: I turn her right/);
  until(heading, v => v.ready, 5);
  // The short way round: Show me after turning the long way starts again from 020 and turns left.
  const wrap = createClassroomSession(lesson);
  playThroughTo(wrap, 'try-wrap');
  press(wrap, 'turn:right', 36);
  for (let i = 0; i < 3; i++) wrap.act('help');
  run(wrap, SHOW_ME_S + .2);
  assert.match(wrap.view().brian.text, /^Like that\. Watch: I turn her to 340\./, 'Brian says the heading he turns to');
  until(wrap, v => v.ready, 20);
  assert.match(wrap.view().brian.text, /^Right: A turned her left past 000/);
});

test('review fixes: a practice flight ends at the map’s edge, and Brian’s pointer taps the heading he wants', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-turn');
  const v = session.view(), [hx, hy] = targetPoint(v, 'fly');
  assert.equal(v.aim, 70);
  const at = targetPoint(v, 'turn:best');
  assert.equal(hitTest(v, ...at)?.drag, 'compass', 'a click where Brian taps turns her');
  assert.equal(dragAngle(v, 'compass', ...at), 70);
  assert.equal(hitTest(v, hx, hy)?.action, 'fly', 'her body is Space');
  turnTo(session, 180); session.act('fly'); until(session, x => x.ready, 20);
  assert.ok(session.view().heli.y >= -340 - CRUISE_MS * .05, 'she stops at the map’s south edge');
  assert.match(session.view().brian.text, /^You flew heading 180: 110 degrees too far right/);
  // On Heading there is no Space: a click on her body does nothing.
  const word = createClassroomSession(lesson);
  playThroughTo(word, 'word-heading');
  const w = word.view(), [wx, wy] = targetPoint(w, 'fly');
  assert.equal(hitTest(w, wx, wy), null);
});
