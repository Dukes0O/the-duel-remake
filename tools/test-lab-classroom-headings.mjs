// LAB-CLASSROOM-HEADINGS (docs/board/cards/LAB-CLASSROOM-HEADINGS.md): Headings and maps as a classroom lesson; its
// wording and formulas follow LAB-CLASSROOM-LANGUAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, JOB, RING_M, CRUISE_MS, FREE_TRIES, FREE_MIN_M, FREE_MAX_M, MAP, pointAt, toMap, three, offBy, headingTo} from '../src/lab/lessons/headings-classroom.js';
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
const worked = session => session.view().formulas.map(f => f.worked);
// Turn the helicopter with A or D, one press at a time, until the gauge reads the heading.
function turnTo(session, deg, way = 'right') {
  for (let i = 0; i < 80 && session.view().gauge !== three(deg); i++) session.act(`turn:${way}`);
  assert.equal(session.view().gauge, three(deg));
}
function flyJob(session, stopAt = JOB.distanceM) {
  session.act('fly');
  until(session, v => v.flown >= stopAt - CRUISE_MS * .05 / 2, 30);
  session.act('fly');
}
function moveMarker(session, east, north) {
  for (let i = 0; i < 20 && session.view().marker.east !== east; i++) session.act(session.view().marker.east < east ? 'marker:east' : 'marker:west');
  for (let i = 0; i < 20 && session.view().marker.north !== north; i++) session.act(session.view().marker.north < north ? 'marker:north' : 'marker:south');
}
function flyFree(session) { session.act('fly'); until(session, v => v.keys.Space === 'fly'); }
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const v = session.view(), step = v.step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-heading') turnTo(session, 30);
    else if (step === 'word-compass') { turnTo(session, 90); session.act('fly'); }
    else if (step === 'word-scale') { press(session, 'ruler:longer', 4); session.act('fly'); }
    else if (step === 'word-sums') moveMarker(session, 300, 400);
    else if (step === 'word-distance') moveMarker(session, 400, 300);
    else if (step === 'word-quarters') moveMarker(session, 300, -200);
    else if (step === 'try-free') { flyFree(session); for (let i = 1; i < FREE_TRIES; i++) { session.act('turn:right'); flyFree(session); } }
    else if (step === 'try-turn') { turnTo(session, JOB.headingDeg); session.act('fly'); until(session, x => x.ready); }
    else if (step === 'try-wrap') { turnTo(session, 340, 'left'); session.act('fly'); until(session, x => x.ready); }
    else if (step === 'alone') { turnTo(session, JOB.headingDeg); flyJob(session); }
    else if (step.startsWith('check')) session.act(`answer:${{'check-west': 2, 'check-wrap': 0, 'check-sum': 0, 'check-scale': 1}[step]}`);
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
    assert.ok(Math.abs(went.x / length - want.x) < .01 && Math.abs(went.y / length - want.y) < .01, `on ${three(gauge)} the helicopter flies where the map says`);
  }
  assert.deepEqual(pointAt(90, 1).x.toFixed(6), '1.000000', 'east is to the right');
  // The lesson's own heading from a place on the map is the gauge's compass, in all four quarters.
  for (const deg of [20, 120, 200, 340]) { const p = pointAt(deg, 300); assert.ok(Math.abs(headingTo(p.x, p.y) - deg) < 1e-9); }
});

test('a child who does exactly what each prompt says passes every step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.scene, 'recap'); assert.equal(v.ideas.length, 3); assert.ok(v.last);
  assert.equal(v.step.voice, 'lab.brian.headings.explain');
});

test('the words: D counts up, A counts down, east is 090, and the ruler counts boxes', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-heading');
  assert.match(session.view().brian.text, /A heading is the direction in which the helicopter is pointing, measured clockwise from north, in degrees\./);
  assert.match(session.view().brian.text, /a full turn is divided into 360 equal parts/);
  session.act('turn:left');
  assert.equal(session.view().gauge, '355', 'past 000 turning left comes 355');
  assert.match(session.view().brian.text, /The gauge went from 000 to 355, because 5° to the left of north/, 'a first A from 000 does not say the number went down');
  assert.doesNotMatch(session.view().brian.text, /number went down/);
  // Six presses of D after A: 30 degrees right since A, from 355 to 025.
  press(session, 'turn:right', 6);
  assert.match(session.view().brian.text, /^The gauge read 025 after the helicopter had turned 30 degrees to the right\. The number went up/);
  session.act('next');
  turnTo(session, 120);
  session.act('fly');
  assert.match(session.view().brian.text, /The gauge read 120 when you pressed Space, which is 30 degrees too far to the right\. Press A to turn the helicopter back to the left, and the number goes down/);
  assert.equal(session.view().ready, false, 'a wrong heading is not east');
  press(session, 'turn:left', 6); session.act('fly');
  assert.match(session.view().brian.text, /^Heading 090 points east/);
  assert.equal(session.view().ready, true);
  session.act('next');
  press(session, 'ruler:longer', 7); session.act('fly');
  assert.match(session.view().brian.text, /The ruler read 450 m when you pressed Space, which is four and a half boxes\. The hut is three boxes from the pad, which is 300 m\./);
  press(session, 'ruler:shorter', 3); session.act('fly');
  assert.match(session.view().brian.text, /^The hut is three boxes from the pad/);
});

test('the formulas: every press of a control changes the sums at once, and each sum comes out on a calculator', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-heading');
  session.act('turn:right');
  assert.equal(worked(session)[0], '5° ÷ 360° = 0.014', 'the heading changes the sum');
  session.act('next' ); // Not ready yet, so nothing moves.
  press(session, 'turn:right', 5);
  session.act('next');
  session.act('turn:right');
  assert.equal(worked(session)[0], '5° ÷ 360° = 0.014');
  turnTo(session, 90); session.act('fly'); session.act('next');
  assert.equal(worked(session)[0], '1.00 boxes × 100 m = 100 m');
  session.act('ruler:longer');
  assert.equal(worked(session)[0], '1.50 boxes × 100 m = 150 m', 'the ruler changes the sum');
  press(session, 'ruler:longer', 3); session.act('fly'); session.act('next');
  // The marker: atan and Pythagoras from the distances on the board.
  assert.deepEqual(worked(session), ['atan(100 ÷ 100) = 45.0°']);
  session.act('marker:east');
  assert.deepEqual(worked(session), ['atan(200 ÷ 100) = 63.4°'], 'the marker changes the sum');
  assert.equal(session.view().gauge, '063', 'and the helicopter points at it');
  moveMarker(session, 300, 400);
  assert.deepEqual(worked(session), ['atan(300 ÷ 400) = 36.9°']);
  assert.match(session.view().brian.text, /atan\(0\.75\) is 36\.9°/);
  assert.equal(Math.round(Math.atan(300 / 400) * 1800 / Math.PI) / 10, 36.9);
  session.act('next');
  // The distance: Pythagoras, and the same distance on a different heading.
  assert.deepEqual(worked(session), ['atan(300 ÷ 400) = 36.9°', '√(300^2 + 400^2) = 500.0 m']);
  moveMarker(session, 400, 300);
  assert.deepEqual(worked(session), ['atan(400 ÷ 300) = 53.1°', '√(400^2 + 300^2) = 500.0 m'], 'the marker changes the sums');
  assert.match(session.view().brian.text, /√\(160,000 \+ 90,000\) = √250,000 = 500 m/);
  session.act('next');
  // The correction by quarter: south adds 180, north and west adds 360, and each result is the gauge's heading.
  moveMarker(session, 300, -200);
  assert.deepEqual(worked(session).slice(0, 2), ['atan(300 ÷ −200) = −56.3°', '−56.3° + 180° = 123.7°']);
  assert.equal(session.view().gauge, '124');
  assert.match(session.view().brian.text, /Adding 180° gives 123\.7°/);
  moveMarker(session, -300, 400);
  assert.deepEqual(worked(session).slice(0, 2), ['atan(−300 ÷ 400) = −36.9°', '−36.9° + 360° = 323.1°']);
  assert.equal(session.view().gauge, '323');
  moveMarker(session, 300, 0);
  assert.match(worked(session)[0], /you cannot divide by 0.*straight east, on heading 090/, 'no division by nought');
  moveMarker(session, 0, 0);
  assert.match(worked(session)[0], /on the pad/);
  assert.ok(session.view().ready, 'the step stays open while the player experiments');
  // The panel's zero never carries a minus sign.
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  turnTo(free, 270);
  assert.equal(worked(free)[1], '300 × cos 270° = 0.0 m');
  assert.match(free.view().formulas[1].note, /cos 270° is 0\.00,/);
  // The watch: the time to arrive shows first, and the running time replaces it once the flight has begun.
  const watch = createClassroomSession(lesson);
  playThroughTo(watch, 'watch');
  assert.deepEqual(worked(watch).slice(0, 5), ['atan(346 ÷ −200) = −60.0°', '−60.0° + 180° = 120.0°', '√(346^2 + 200^2) = 399.6 m', '50 m/s × 3.6 = 180 km/h', '400 m ÷ 50 m/s = 8.0 s']);
  assert.equal(watch.view().formulas[4].title, 'Time to arrive', 'no running time before the flight');
  until(watch, v => v.flown > 100);
  assert.equal(watch.view().formulas[4].title, 'Time so far');
  until(watch, v => v.ready);
  assert.equal(worked(watch)[4], '400 m ÷ 50 m/s = 8.0 s');
  // The turn still needed follows the gauge, the short way round.
  const turn = createClassroomSession(lesson);
  playThroughTo(turn, 'try-turn');
  assert.equal(worked(turn)[0], 'atan(517 ÷ 188) = 70.0°');
  assert.match(worked(turn)[1], /^70° − 0° = 70°, which is 70° to the right/);
  turn.act('turn:left');
  assert.match(worked(turn)[1], /^70° − 355° = −285°, and −285° \+ 360° = 75°, which is 75° to the right/);
  assert.equal(worked(turn)[2], '550 × sin 355° = −47.9 m', 'and so does where this heading leads');
});

test('the free test: any heading and length, only different settings count, the table keeps them, and three open Continue', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  assert.ok(!session.view().ready);
  assert.deepEqual(worked(session), ['300 × sin 45° = 212.1 m', '300 × cos 45° = 212.1 m', '300 m ÷ 50 m/s = 6.0 s'], 'the sums show first');
  session.act('length:shorter');
  assert.equal(worked(session)[2], '250 m ÷ 50 m/s = 5.0 s', 'the length changes the sum');
  session.act('turn:right');
  assert.equal(worked(session)[0], '250 × sin 50° = 191.5 m', 'the heading changes the sum');
  flyFree(session);
  assert.match(session.view().brian.text, /^On heading 050 the helicopter flew 250 m and ended up 192 m east and 161 m north of the pad, as the sums predicted\. The flight lasted 5 seconds at 50 m\/s\./);
  assert.ok(!session.view().ready);
  flyFree(session);
  assert.ok(!session.view().ready, 'the same setting again does not count as a different one');
  assert.match(session.view().prompt, /tested so far: 1 of 3/);
  turnTo(session, 225); flyFree(session);
  assert.match(session.view().brian.text, /ended up 177 m west and 177 m south of the pad/);
  assert.equal(session.view().ghosts.length, 2, 'earlier flights stay on the map');
  assert.ok(!session.view().ready);
  session.act('length:longer'); flyFree(session);
  assert.ok(session.view().ready, 'three different settings open Continue');
  assert.equal(session.view().rows.length, 4, 'the table keeps the results');
  assert.deepEqual(session.view().rows[0], {heading: 50, distance: 250, east: 192, north: 161});
  // Every length on every heading stays on the map, so the free flight always ends where the sums say.
  for (let deg = 0; deg < 360; deg += 5) for (const far of [FREE_MIN_M, FREE_MAX_M]) {
    const p = pointAt(deg, far);
    assert.ok(p.x > MAP.west && p.x < MAP.east && p.y > MAP.south && p.y < MAP.north, `${deg}/${far}`);
  }
  press(session, 'length:longer', 10);
  assert.equal(session.view().ruler.length, FREE_MAX_M);
});

test('Show me on the free test tries a different setting each time, so it reaches three and finishes', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  const settings = new Set();
  for (let i = 0; i < FREE_TRIES; i++) {
    for (let h = 0; h < 3; h++) session.act('help');
    assert.ok(session.view().pointer, 'Brian points');
    assert.match(session.view().brian.text, /I will test a different setting/);
    run(session, SHOW_ME_S + .2);
    until(session, v => v.keys.Space === 'fly' && v.rows.length === i + 1);
    settings.add(`${session.view().rows[i].heading}/${session.view().rows[i].distance}`);
  }
  assert.equal(settings.size, FREE_TRIES);
  assert.ok(session.view().ready);
});

test('a word step stays open after its answer, and its closing words stay true while the player goes on', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-heading');
  turnTo(session, 30);
  const closing = session.view().brian.text;
  assert.ok(session.view().ready);
  session.act('turn:right');
  assert.equal(session.view().gauge, '035', 'the keys go on turning the helicopter');
  assert.equal(worked(session)[0], '35° ÷ 360° = 0.097');
  assert.equal(session.view().brian.text, closing);
  assert.match(closing, /^The gauge read 030/, 'in the past tense, so it stays true');
  session.act('next');
  turnTo(session, 90); session.act('fly');
  session.act('turn:left');
  assert.equal(session.view().gauge, '085'); assert.ok(session.view().ready);
  session.act('next');
  press(session, 'ruler:longer', 4); session.act('fly');
  session.act('ruler:longer');
  assert.equal(session.view().ruler.length, 350); assert.ok(session.view().ready);
  assert.equal(worked(session)[0], '3.50 boxes × 100 m = 350 m');
});

test('a prompt never asks for what is already done, and a hint is right from every setting', () => {
  const compass = createClassroomSession(lesson);
  playThroughTo(compass, 'word-compass');
  assert.match(compass.view().hints[1], /^Press D until the gauge reads 090/);
  turnTo(compass, 120);
  assert.match(compass.view().hints[1], /^Press A until the gauge reads 090/, 'past east, the hint turns back');
  press(compass, 'turn:left', 6);
  assert.equal(compass.view().prompt, 'The gauge reads 090, so press Space.');
  assert.match(compass.view().hints[1], /already reads 090/);
  compass.act('fly'); compass.act('next');
  assert.match(compass.view().hints[1], /press → until the ruler reads 300 m/);
  press(compass, 'ruler:longer', 6);
  assert.match(compass.view().hints[1], /press ← until the ruler reads 300 m/, 'past the hut, the hint shortens the ruler');
  press(compass, 'ruler:shorter', 2);
  assert.equal(compass.view().prompt, 'The ruler reaches the hut, so press Space.');
  // Show me says what Brian really does: from a ruler past the hut he does not stretch it.
  assert.match(compass.view().hints[2], /set the ruler so that it reaches the hut/);
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  turnTo(job, 70);
  assert.match(job.view().prompt, /^The gauge reads 070, so press Space to fly\./);
  const marker = createClassroomSession(lesson);
  playThroughTo(marker, 'word-sums');
  moveMarker(marker, 600, 600);
  assert.match(marker.view().hints[1], /^Press ←/, 'past the place, the hint comes back');
  moveMarker(marker, 300, 600);
  assert.match(marker.view().hints[1], /^Press ↓/);
  marker.act('marker:north');
  assert.match(marker.view().brian.text, /cannot go any further/);
  marker.act('marker:south');
  assert.doesNotMatch(marker.view().brian.text, /cannot go any further/, 'the note goes once the marker moves');
});

test('the tries: a wrong heading says how far off and how far it passed; the short way round is A', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-turn');
  // The smoke is on the map while the helicopter turns (the pointer's target is a separate field).
  assert.equal(session.view().spot.kind, 'smoke'); assert.equal(session.view().target, 'turn:best');
  turnTo(session, 100); session.act('fly'); until(session, v => v.ready);
  const passed = Math.round(JOB.distanceM * Math.sin(30 * Math.PI / 180));
  assert.match(session.view().brian.text, new RegExp(`^You flew on heading 100, which is 30 degrees too far to the right, and the helicopter passed ${passed} m from the smoke\\. Press A to turn the helicopter back to the left`));
  assert.equal(session.view().ghosts.length, 0, 'the flight is on the map until the helicopter flies again');
  // Fly again: the last track stays as a faint line.
  press(session, 'turn:left', 6); session.act('fly'); until(session, v => /^The helicopter flew right over the smoke\./.test(v.brian.text));
  assert.match(session.view().brian.text, /the flight lasted 11 seconds at 50 m\/s/);
  assert.equal(session.view().ghosts.length, 1);
  session.act('next');
  turnTo(session, 340, 'right'); session.act('fly'); until(session, v => v.ready);
  assert.match(session.view().brian.text, /^The helicopter reached the smoke, but A was the short way round\. A turn of 40 degrees to the left would have done, instead of your 320 degrees/);
  const short = createClassroomSession(lesson);
  playThroughTo(short, 'try-wrap');
  // While the way round is an open question, the panel does not work out either turn.
  assert.ok(!worked(short).some(line => /320|40°/.test(line ?? '')), 'the open question is not settled by the panel');
  assert.ok(!short.view().formulas.some(f => /320|40°/.test(f.note ?? '')));
  turnTo(short, 340, 'left'); assert.equal(short.view().gauge, '340');
  short.act('fly'); until(short, v => v.ready);
  assert.match(short.view().brian.text, /^The helicopter turned left past 000/);
  assert.ok(worked(short).some(line => line === 'To the right, 340° − 20° = 320°. To the left, 360° − 320° = 40°.'), 'the result shows both turns');
});

test('Brian’s job: each miss says what to change with the real numbers; only stopping over the smoke passes', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  turnTo(session, 80); flyJob(session);
  assert.match(session.view().brian.text, /^You flew on heading 080, which is 10 degrees too far to the right, and stopped \d+ m from the smoke\. Turn the helicopter to heading 070 by pressing A/);
  assert.equal(session.view().heli.x, 0, 'the helicopter is back on the pad for another go');
  turnTo(session, 70, 'left'); flyJob(session, 450);
  assert.match(session.view().brian.text, /^You flew on the right heading, but you stopped after 4\d\d m, which is \d+ m short\./);
  flyJob(session, 640);
  assert.match(session.view().brian.text, /^You flew on the right heading, but you stopped after 6\d\d m, which is \d+ m past the smoke\./);
  flyJob(session);
  assert.match(session.view().brian.text, /^The helicopter stopped over the smoke\. It flew on heading 070 for 55\d m/);
  assert.equal(session.view().ready, true);
  // Flying off the map brings the helicopter back to the pad.
  const off = createClassroomSession(lesson);
  playThroughTo(off, 'alone');
  turnTo(off, 70); off.act('fly'); until(off, v => /flew off the map/.test(v.brian.text), 40);
  assert.equal(off.view().heli.x, 0);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me turns the helicopter and flies the job', () => {
  for (const id of ['word-heading', 'word-compass', 'word-scale', 'word-sums', 'word-distance', 'word-quarters', 'try-turn', 'try-wrap', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    assert.ok(targetPoint(v, v.pointer.action), `${id}: at a place on the board`);
    run(session, SHOW_ME_S + .2);
    assert.match(session.view().brian.text, /^That is how it is done. /);
    until(session, x => x.ready, 30);
  }
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  for (let i = 0; i < 3; i++) job.act('help');
  run(job, SHOW_ME_S + .2);
  assert.equal(job.view().keys.Space, undefined, 'the keys are held while Brian flies');
  until(job, v => v.ready, 30);
  assert.match(job.view().brian.text, /^The helicopter stopped over the smoke\. It flew on heading 070 for 550 m/);
});

test('every check says why a wrong answer is wrong, then shows it, and its panel settles nothing until it is answered', () => {
  const answers = {'check-west': [0, /^Heading 090 points east\. West is heading 270/], 'check-wrap': [1, /^A would reach heading 010, but it is the long way round, a turn of 340 degrees/],
    'check-sum': [1, /^Heading 090 points straight east, but the hut is north of the pad as well\. East ÷ north is 300 ÷ 300 = 1, and atan\(1\) is 45°/], 'check-scale': [0, /five boxes is 500 m, and half a box adds 50 m/]};
  for (const [id, [pick, why]] of Object.entries(answers)) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    assert.ok(session.view().formulas.length > 0, `${id} shows the general formula`);
    assert.ok(session.view().formulas.every(f => !f.worked), `${id}: no worked sum while the question is open`);
    assert.ok(session.view().formulas.every(f => f.title), `${id}: every panel entry has a title`);
    if (id === 'check-sum') assert.equal(session.view().triangle.line, false, 'the straight line waits for the answer');
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
    assert.ok(session.view().formulas.some(f => f.worked), `${id}: the sum shows after the answer`);
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

test('mouse: the compass ring turns the helicopter, the ruler drags, its body flies, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-compass');
  let v = session.view();
  const [hx, hy] = targetPoint(v, 'fly');
  assert.equal(hitTest(v, hx + 70, hy)?.drag, 'compass');
  assert.equal(dragAngle(v, 'compass', hx + 70, hy), 90, 'to the right of the helicopter on the map is 090');
  assert.equal(dragAngle(v, 'compass', hx, hy - 70), 0);
  assert.equal(dragAngle(v, 'compass', hx - 70, hy), 270);
  session.act(`hold:${dragAngle(v, 'compass', hx + 70, hy + 2)}`);
  assert.equal(session.view().gauge, '090');
  assert.equal(hitTest(session.view(), hx, hy)?.action, 'fly', 'a click on the helicopter is Space');
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

test('the compass picture measures the angle from north, clockwise, round to the heading', () => {
  const arcs = [];
  const ctx = new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return value => ({width: String(value).length * 9});
    if (name === 'arc') return (x, y, r, from, to) => arcs.push({from, to});
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    return () => {};
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-turn');
  turnTo(session, 70);
  drawBoard(ctx, session.view(), 1000, 680);
  const from = -Math.PI / 2, to = from + 70 * Math.PI / 180;
  assert.ok(arcs.some(a => Math.abs(a.from - from) < 1e-9 && Math.abs(a.to - to) < 1e-9), 'an arc runs from north clockwise by 70 degrees');
});

test('review of Headings: a first A after D says the number went down, the cards print no sizes, the panel and the hint agree, and each new word is defined', () => {
  const left = createClassroomSession(lesson);
  playThroughTo(left, 'word-heading');
  press(left, 'turn:right', 2); left.act('turn:left');
  assert.equal(left.view().gauge, '005');
  assert.match(left.view().brian.text, /^The number went down, because A turns the helicopter to the left/);
  const wrap = createClassroomSession(lesson);
  playThroughTo(wrap, 'check-wrap');
  assert.ok(wrap.view().cards.every(c => !/\d/.test(c.label)), 'the sizes wait for the reply');
  wrap.act('answer:0');
  assert.match(wrap.view().brian.text, /only 20 degrees to reach 010, while the turn with A would be 340 degrees/);
  const half = createClassroomSession(lesson);
  playThroughTo(half, 'try-turn');
  turnTo(half, 250);
  assert.match(half.view().hints[1], /^Press D /);
  assert.match(worked(half)[1], /half a turn\. Either way is 180°, so a turn of 180° to the right will do/, 'the panel agrees with the hint');
  const words = createClassroomSession(lesson);
  playThroughTo(words, 'word-sums');
  let say = words.view().say;
  for (const [word, definition] of [['atan(1)', /Atan, short for arctangent, is the button/], ['right-angled', /corner of a page/]]) { assert.ok(say.includes(word), word); assert.match(say, definition); }
  assert.doesNotMatch(say, /square corner|back into an angle/);
  moveMarker(words, 300, 400); words.act('next');
  say = words.view().say;
  for (const [word, definition] of [['300²', /To square a number means to multiply it by itself/], ['√25', /The square root of a number, written √/]]) {
    assert.ok(say.includes(word), word); assert.match(say, definition);
  }
  assert.ok(say.indexOf('To square a number') < say.indexOf('square the east distance'), 'squaring is defined before its use');
  moveMarker(words, 400, 300); words.act('next');
  assert.match(words.view().say, /needs a correction/);
  assert.doesNotMatch(words.view().say, /one correction/);
  moveMarker(words, 300, -200);
  assert.doesNotMatch(words.view().brian.text, /other correction/);
  // Show me's closing words are true when Brian did the work.
  const shown = createClassroomSession(lesson);
  playThroughTo(shown, 'word-heading');
  for (let i = 0; i < 3; i++) shown.act('help');
  run(shown, SHOW_ME_S + .2); until(shown, v => v.ready, 5);
  assert.doesNotMatch(shown.view().brian.text, /\byou had\b/);
  for (const file of ['headings-classroom.js', 'headings-board.js']) assert.doesNotMatch(readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8'), /\b(one|each|half a|\d) square\b(?! root)/i, 'a map box is never called a square');
});

test('replays: the wonder and the watch start again', () => {
  const session = createClassroomSession(lesson);
  until(session, v => v.ready);
  session.act('replay');
  assert.equal(session.view().flown, null, 'the helicopter is back on the pad');
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
  // Heading: after a long turn left, Show me still turns the helicopter right and passes.
  const heading = createClassroomSession(lesson);
  playThroughTo(heading, 'word-heading');
  press(heading, 'turn:left', 32);
  for (let i = 0; i < 3; i++) heading.act('help');
  run(heading, SHOW_ME_S + .2);
  assert.match(heading.view().brian.text, /^That is how it is done\. I will turn the helicopter to the right/);
  until(heading, v => v.ready, 5);
  // The short way round: Show me after turning the long way starts again from 020 and turns left.
  const wrap = createClassroomSession(lesson);
  playThroughTo(wrap, 'try-wrap');
  press(wrap, 'turn:right', 36);
  assert.match(wrap.view().hints[2], /start again from heading 020, turn the helicopter left to heading 340 and then fly/, 'the hint says what Brian will do');
  for (let i = 0; i < 3; i++) wrap.act('help');
  run(wrap, SHOW_ME_S + .2);
  assert.match(wrap.view().brian.text, /^That is how it is done\. I will start again from heading 020, turn the helicopter left to heading 340 and then fly 450 m\./, 'Brian says the heading he turns to');
  until(wrap, v => v.ready, 20);
  assert.match(wrap.view().brian.text, /^The helicopter turned left past 000/);
});

test('review fixes: a practice flight ends at the map’s edge, and Brian’s pointer taps the heading he wants', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-turn');
  const v = session.view(), [hx, hy] = targetPoint(v, 'fly');
  assert.equal(v.aim, 70);
  const at = targetPoint(v, 'turn:best');
  assert.equal(hitTest(v, ...at)?.drag, 'compass', 'a click where Brian taps turns the helicopter');
  assert.equal(dragAngle(v, 'compass', ...at), 70);
  assert.equal(hitTest(v, hx, hy)?.action, 'fly', 'the helicopter’s body is Space');
  turnTo(session, 180); session.act('fly'); until(session, x => x.ready, 20);
  assert.ok(session.view().heli.y >= -340 - CRUISE_MS * .05, 'the helicopter stops at the map’s south edge');
  assert.match(session.view().brian.text, /^You flew on heading 180, which is 110 degrees too far to the right/);
  // On Heading there is no Space: a click on the helicopter's body does nothing.
  const word = createClassroomSession(lesson);
  playThroughTo(word, 'word-heading');
  const w = word.view(), [wx, wy] = targetPoint(w, 'fly');
  assert.equal(hitTest(w, wx, wy), null);
});

test('the words on the lesson’s own files: no she or her, one measurement system, whole-sentence card prompts, and sums that show from the second step on', () => {
  for (const file of ['headings-classroom.js', 'headings-board.js']) {
    const source = readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8');
    for (const [fault, pattern] of [['she or her', /\b(she|her|hers|herself)\b/i], ['mph', /\bmph\b/i], ['decides', /\bdecides?\b/i], ['takes its speed', /\b(air|wind)\s+(soon\s+)?takes\b/i], ['Pick a card:', /Pick a card:/]])
      assert.ok(!pattern.test(source), `${file} has ${fault}: ${source.match(pattern)?.[0]}`);
  }
  const model = lesson.createModel();
  lesson.steps.forEach((step, i) => {
    if (i === 0) return;
    model.enter(i);
    const formulas = model.view().formulas;
    assert.ok(formulas?.length > 0, `${step.id} shows the physics`);
    assert.ok(formulas.every(f => f.title), `${step.id}: every panel entry has a title`);
  });
});
