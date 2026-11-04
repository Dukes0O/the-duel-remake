// LAB-CLASSROOM-LAUNCH (docs/board/cards/LAB-CLASSROOM-LAUNCH.md): Launch angles as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, MARKS, MAX_MS, FLAG_M, distanceOf, secondsOf, pathOf, kmh, hits, benchAttempts, noAirDistance, FREE_TRIES} from '../src/lab/lessons/launch-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/launch-board.js';
import {launchBench, rangeOf, TARGET} from '../src/lab/benches/launch.js';
import {skiZone} from '../src/ski/runs/summit-zones.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.launch;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 60) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
// Tilt the ramp and turn the dial to a setting, as the keys do.
function setTo(session, angle, ms) {
  for (let i = 0; i < 20 && angle != null && session.view().ramp && !session.view().ramp.locked && session.view().ramp.angle !== angle; i++) session.act(session.view().ramp.angle < angle ? 'angle:up' : 'angle:down');
  for (let i = 0; i < 20 && ms != null && session.view().dial && !session.view().dial.locked && session.view().dial.ms !== ms; i++) session.act(session.view().dial.ms < ms ? 'speed:up' : 'speed:down');
}
const setToFree = session => { for (let i = 0; i < 2 && session.view().ramp.angle !== 45; i++) session.act('angle:down'); };
const fly = session => { session.act('go'); until(session, x => x.ready || x.keys.Space === 'go'); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-speed') setTo(session, null, 20);
    else if (step === 'word-angle') setTo(session, 45);
    else if (step === 'word-distance') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-free') { fly(session); for (let i = 1; i < FREE_TRIES; i++) { session.act('angle:up'); fly(session); } }
    else if (step === 'try-flag') { session.act('answer:2'); setTo(session, 60); fly(session); }
    else if (step === 'try-speed') { setTo(session, null, 18); session.act('go'); session.act('answer:1'); until(session, x => x.ready); }
    else if (step === 'alone') { setTo(session, null, 22); fly(session); setTo(session, 70); fly(session); setTo(session, 45, 18); fly(session); }
    else if (step === 'check-pair') session.act('answer:0');
    else if (step === 'check-lower') session.act('answer:0');
    else if (step === 'check-game') session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}
// The challenge path in lab-view.js, as it feeds a lesson's machine runs to the bench.
function benchPasses(attempts) {
  let bench = openBench('launch');
  for (const attempt of attempts) {
    for (const c of bench.bench.controls) bench = setControl(bench, c.id, c.value);
    for (const c of attempt.controls) if (Object.hasOwn(attempt.input, c.id)) bench = setControl(bench, c.setting ?? c.id, c.values?.[Math.round(attempt.input[c.id])] ?? attempt.input[c.id]);
    bench = runBench(bench);
  }
  return goalMet(bench);
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and finishes on the bench', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['launch-speed', 'launch-launch-angle', 'launch-distance'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.word), ['Launch angle', 'Speed', 'Distance']);
  assert.equal(lesson.name, 'Launch angles');
  assert.equal(lesson.finishLabel, 'Finish the lesson');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.launch.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.launch.explain');
});

test('every distance is the launch bench’s own run with the skier’s air, and the board draws the bench’s own path', () => {
  for (let angle = 15; angle <= 75; angle += 5) for (let ms = 13; ms <= 24; ms++) for (const lower of [false, true]) {
    const r = launchBench.run({angleDeg: angle, speedMs: ms, air: 'air', landing: lower ? '10 m lower' : 'level'});
    assert.equal(distanceOf(angle, ms, lower), r.rangeM);
    assert.equal(secondsOf(angle, ms, lower), r.seconds);
    assert.equal(r.rangeM, rangeOf(angle, ms, {air: true, lower}).rangeM);
    const end = pathOf(angle, ms, lower).at(-1);
    assert.ok(Math.abs(end[0] - r.rangeM) < 1e-9 && end[1] === (lower ? -10 : 0), 'the drawn path lands where the bench says');
  }
  const d = (angle, ms = 20, lower = false) => Math.round(distanceOf(angle, ms, lower) * 10) / 10;
  assert.deepEqual([15, 30, 45, 60, 75].map(a => d(a)), [19, 31.6, 35.6, 30.5, 17.7]);
  assert.deepEqual([18, 20, 22].map(ms => d(45, ms)), [29.5, 35.6, 42]);
  assert.deepEqual([18, 20, 22].map(kmh), [65, 72, 79]);
  assert.deepEqual([40, 45, 55].map(a => d(a, 20, true)), [43.6, 42.7, 38.4]);
  assert.deepEqual([50, 40, 55, 70].map(a => d(a)), [34.9, 35.2, 33.2, 22.7]);
  // The 30 m mark is the bench's own target.
  assert.equal(FLAG_M, TARGET.rangeM);
  // Each job mark: the start misses, and its answers hit.
  assert.deepEqual(MARKS.map(k => hits(k.flag, k.angle, k.ms)), [false, false, false]);
  assert.equal(hits(42, 45, 22), true); assert.equal(hits(42, 45, 21), false); assert.equal(hits(42, 45, 23), false);
  assert.equal(hits(27, 20, 22), true); assert.equal(hits(27, 70, 22), true); assert.equal(hits(27, 15, 22), false); assert.equal(hits(27, 65, 22), false);
  // Question 3: the Aerials kicker takes off at about 50 degrees onto a lower hill.
  assert.ok(skiZone('aerials'));
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s launches pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  const attempts = benchAttempts(v);
  assert.equal(benchPasses(attempts), true, 'the lesson’s own launches pass the bench’s goal');
  const near = a => Math.abs(launchBench.run(a.input).rangeM - TARGET.rangeM) <= TARGET.withinM;
  assert.ok(attempts.some(near));
  assert.equal(benchPasses(attempts.filter(a => !near(a))), false, 'without a landing on the 30 m mark the bench is not passed');
});

test('words: the ramp tilts, the dial turns, and the tape reads the landing', () => {
  const session = createClassroomSession(lesson);
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /^At 60 degrees the skier went high but moved forward slowly, and landed 30\.5 m along the tape\. At 30 degrees the skier stayed low but moved forward quickly, and landed 31\.6 m\. Those are two very different jumps that land in nearly the same spot/);
  assert.deepEqual(session.view().rows.map(r => r.angle), [60, 30]);
  session.act('next');
  assert.equal(session.view().dial.kmh, 65, 'the dial starts away from its answer');
  assert.equal(session.view().ramp.locked, true);
  session.act('speed:up'); session.act('speed:up');
  assert.match(session.view().brian.text, /^A dial reading of 72 km\/h is about the same as 20 m\/s, and that is how fast the skier leaves the end of the ramp\./);
  session.act('next');
  assert.equal(session.view().ramp.angle, 60, 'the ramp starts away from its answer');
  assert.equal(session.view().ready, false);
  session.act('angle:down'); session.act('angle:down');
  assert.equal(session.view().ready, false);
  session.act('angle:down');
  assert.match(session.view().brian.text, /^A ramp at 45 degrees points halfway between level ground and straight up, and that angle is its launch angle\. The ramp divides the skier’s speed into two parts/);
  session.act('next');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^The tape reads 35\.6 m, which is further than both the 60 degree and the 30 degree jumps\. Leaving out the air, the formulas predict 40\.9 m\./);
  session.act('next');
  until(session, x => x.ready);
  assert.deepEqual(session.view().rows.map(r => [r.angle, Math.round(r.distance * 10) / 10]), [[15, 19], [30, 31.6], [45, 35.6], [60, 30.5], [75, 17.7]], 'the watch fills the table');
});

test('the tries: a launch at 45, every miss, every guess and Space at the wrong speed say why with their numbers', () => {
  const flag = createClassroomSession(lesson);
  playThroughTo(flag, 'try-flag');
  assert.equal(flag.view().cards.length, 3, 'guess first');
  assert.equal(flag.view().flag, 30);
  flag.act('answer:0');
  assert.equal(flag.view().dial.locked, true);
  flag.act('go');
  assert.match(flag.view().brian.text, /^At 45 degrees the skier lands 35\.6 m, which is beyond the flag\. Tilt the ramp first/);
  setTo(flag, 50); fly(flag);
  assert.match(flag.view().brian.text, /^The skier landed 34\.9 m along the tape, which is 4\.9 m beyond the 30 m flag\. Tilt the ramp steeper, further from 45 degrees, by pressing ↑, then press Space\./);
  setTo(flag, 75); fly(flag);
  assert.match(flag.view().brian.text, /^The skier landed 17\.7 m along the tape, which is 12\.3 m short of the 30 m flag\. Tilt the ramp flatter, towards 45 degrees, by pressing ↓/);
  setTo(flag, 60); fly(flag);
  assert.equal(flag.view().ready, true);
  assert.match(flag.view().brian.text, /^With the ramp at 60 degrees the skier landed 30\.5 m, on the flag\. A steeper ramp works, and so does tilting the other way\. A ramp at 30 degrees lands the skier 31\.6 m/);

  const either = createClassroomSession(lesson);
  playThroughTo(either, 'try-flag');
  either.act('answer:2'); setTo(either, 30); fly(either);
  assert.match(either.view().brian.text, /^With the ramp at 30 degrees the skier landed 31\.6 m, on the flag\. You were right that either direction works\. A ramp at 60 degrees lands the skier 30\.5 m/);

  const slow = createClassroomSession(lesson);
  playThroughTo(slow, 'try-speed');
  assert.equal(slow.view().dial.kmh, 72, 'it starts away from its answer');
  assert.equal(slow.view().ramp.locked, true);
  slow.act('go');
  assert.match(slow.view().brian.text, /press ← until the dial reads 65 km\/h/);
  setTo(slow, null, 18); slow.act('go');
  assert.deepEqual(slow.view().cards.map(c => c.label), ['About 34 m', 'About 30 m', 'About 20 m']);
  slow.act('answer:0'); until(slow, x => x.ready);
  assert.match(slow.view().brian.text, /^The jump shortened by more than that: the skier landed 29\.5 m/);
  const half = createClassroomSession(lesson);
  playThroughTo(half, 'try-speed');
  setTo(half, null, 18); half.act('go'); half.act('answer:2'); until(half, x => x.ready);
  assert.match(half.view().brian.text, /^The jump did not shorten by that much: the skier landed 29\.5 m\. Slowing down by 7 km\/h shortened the jump by 6\.1 m/);
});

test('Brian’s job: each mark starts on a miss, fixes one thing, and every miss says what to change', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  let v = session.view();
  assert.equal(v.job.mark, 1); assert.equal(v.flag, 42); assert.equal(v.ramp.locked, true); assert.equal(v.dial.locked, false);
  assert.notEqual(v.target, 'go', 'Brian does not point at the launcher before a choice is made');
  fly(session);
  assert.match(session.view().brian.text, /^The skier landed 35\.6 m along the tape, which is 6\.4 m short of the 42 m flag\. Add speed by pressing →, then press Space\./);
  setTo(session, null, 23); fly(session);
  assert.match(session.view().brian.text, /^The skier landed 45\.3 m along the tape, which is 3\.3 m beyond the 42 m flag\. Reduce the speed by pressing ←/);
  setTo(session, null, 22); fly(session);
  assert.match(session.view().brian.text, /^Correct: at 79 km\/h the skier landed 42\.0 m, on the 42 m flag, because more speed carries the skier further\. For the second mark/);
  v = session.view();
  assert.equal(v.job.mark, 2); assert.equal(v.dial.locked, true); assert.equal(v.ramp.locked, false); assert.equal(v.dial.kmh, 79);
  setTo(session, 15); fly(session);
  assert.match(session.view().brian.text, /^The skier landed 22\.8 m along the tape, which is 4\.2 m short of the 27 m flag\. Tilt the ramp steeper, towards 45 degrees, by pressing ↑/);
  setTo(session, 20); fly(session);
  assert.match(session.view().brian.text, /^Correct: with the ramp at 20 degrees the skier landed 28\.7 m, on the 27 m flag\. A ramp at 70 degrees would land close as well, at 26\.8 m\. For the third mark/);
  v = session.view();
  assert.equal(v.job.mark, 3); assert.equal(v.ramp.angle, 75); assert.equal(v.dial.kmh, 58); assert.equal(v.flag, 30);
  fly(session);
  assert.match(session.view().brian.text, /^The skier landed 11\.9 m along the tape, which is 18\.1 m short of the 30 m flag\. Tilt the ramp flatter, towards 45 degrees, by pressing ↓, or add speed by pressing →/);
  setTo(session, 75, MAX_MS); fly(session);
  assert.match(session.view().brian.text, /^The skier landed 24\.2 m along the tape, which is 5\.8 m short of the 30 m flag\. Tilt the ramp flatter, towards 45 degrees, by pressing ↓, then press Space\./, 'no more speed at the top of the dial');
  setTo(session, 45, 18); fly(session);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^With the ramp at 45 degrees and the dial at 65 km\/h, the skier landed 29\.5 m, on my 30 m mark\. Job done/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and launches', () => {
  for (const id of ['word-angle', 'word-speed', 'word-distance', 'try-flag', 'try-speed', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    if (id === 'try-flag') session.act('answer:1');
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action === 'go') assert.equal(hitTest(v, ...at)?.action, 'go', `${id}: a click where Brian points launches`);
    else assert.ok(hitTest(v, ...at), `${id}: Brian points at the ramp or the dial`);
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^Watch how I do it\. /);
    if (id === 'try-speed') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'alone') for (let k = 1; k < MARKS.length; k++) { until(session, x => x.keys.Space === 'go' && x.job.mark === k + 1, 20); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 40);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-pair': [[1, /^The ramp at 55 degrees lands the skier 33\.2 m, which is 1\.7 m shorter\. The ramp at 40 degrees is the closer match, because it is as far below 45 degrees as the 50 degree ramp is above it, and it lands the skier 35\.2 m/], [2, /^The ramp at 70 degrees is much too steep and lands the skier only 22\.7 m/]],
    'check-lower': [[1, /^The ramp at 45 degrees sends the skier 42\.7 m, but the ramp at 40 degrees sends the skier 43\.6 m\. With a lower landing the skier has longer to fall/], [2, /^The ramp at 55 degrees sends the skier only 38\.4 m/]],
    'check-game': [[1, /^The kicker is made of snow, so leaning back does not change its angle/], [2, /^A slower skier lands lower and shorter\. On the launcher at 50 degrees, the skier lands 28\.9 m at 65 km\/h and 41\.1 m at 79 km\/h/]],
  };
  for (const [id, picks] of Object.entries(answers)) for (const [pick, why] of picks) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    // The board does not give the answer away before the player picks.
    if (id === 'check-pair') assert.deepEqual(session.view().arcs.map(a => a.angle), [50]);
    if (id === 'check-lower') assert.deepEqual(session.view().arcs, []);
    if (id === 'check-game') assert.deepEqual(session.view().kicker.arcs, []);
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
  }
});

test('mouse: the ramp and the dial turn, a click on the launcher launches, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-speed');
  let v = session.view();
  for (const action of ['speed:up', 'speed:down']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  assert.equal(hitTest(v, ...targetPoint(v, 'angle:up')), null, 'the speed try’s ramp is set by Brian');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  for (const point of [targetPoint(v, 'speed:up'), targetPoint(v, 'angle:up'), [300, 330], [80, 300], [400, 272], [500, 480]]) assert.ok(hoverInfo(v, ...point), `hover at ${point}`);
  session.act(hitTest(v, ...targetPoint(v, 'speed:down')).action);
  assert.equal(session.view().dial.kmh, 68);
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  setTo(job, null, 22); fly(job);
  v = job.view();
  for (const action of ['angle:up', 'angle:down']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  assert.ok(hoverInfo(v, 118 + 27 * 9, 240), 'the flag is named');
});

test('the free test and the formulas: every press of the ramp or the dial changes the sums at once', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-angle');
  assert.equal(session.view().ramp.angle, 60);
  assert.equal(session.view().formulas.length, 3, 'only the sums that have been explained so far');
  let worked = session.view().formulas.map(f => f.worked);
  assert.equal(worked[1], '20 × cos 60° = 10.00 m/s');
  assert.equal(worked[2], '20 × sin 60° = 17.32 m/s');
  session.act('angle:down');
  worked = session.view().formulas.map(f => f.worked);
  assert.equal(worked[1], '20 × cos 55° = 11.47 m/s', 'the angle changes the sum');
  setToFree(session);
  assert.ok(session.view().ready, 'the word is done');
  session.act('angle:up');
  assert.equal(session.view().ramp.angle, 50, 'the ramp stays free after the word, to go on watching');
  assert.ok(session.view().ready);
  assert.equal(session.view().formulas[1].worked, '20 × cos 50° = 12.86 m/s');
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  assert.ok(!free.view().ready);
  free.act('speed:up');
  assert.equal(free.view().formulas[0].worked, '21 m/s × 3.6 = 75.6 km/h', 'the dial changes the sum');
  fly(free);
  assert.match(free.view().brian.text, /skier landed 38\.7 m along the tape\. Leaving out the air, the formulas predict 45\.0 m, so the friction of the air shortened the jump by 6\.3 m/);
  assert.match(free.view().formulas.at(-1).note, /The tape read 38\.7 m/);
  assert.ok(!free.view().ready);
  fly(free);
  assert.ok(!free.view().ready, 'the same setting again does not count as a different one');
  free.act('angle:up'); fly(free); free.act('angle:up'); fly(free);
  assert.ok(free.view().ready, 'three tests open Continue');
  assert.equal(free.view().rows.length, 4, 'the table keeps the results');
  assert.equal(noAirDistance(45, 20), 40.9, 'what Brian says is what the panel’s numbers give');
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
    session.act('back'); session.act(`go:${i}`);
    assert.equal(session.view().step.id, STEPS[i].id);
    if (STEPS[i].id === 'try-flag') { session.act('answer:2'); setTo(session, 60); session.act('go'); }
    if (STEPS[i].id === 'alone') session.act('go');
    for (const t of [0, 1, 3]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
  for (const id of ['check-pair', 'check-lower', 'check-game']) {
    session.act(`go:${STEPS.findIndex(s => s.id === id)}`);
    calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
    assert.ok(calls.has('stroke'), `${id} draws its answered picture`);
  }
});

test('the flights stay on the board: the furthest and the highest the dials allow fit the scene', () => {
  const PX = 9, LIP_X = 118, DECK_Y = 268;
  for (const [angle, ms] of [[45, MAX_MS], [75, MAX_MS], [15, MAX_MS]]) {
    const pts = pathOf(angle, ms);
    assert.ok(LIP_X + Math.max(...pts.map(p => p[0])) * PX < 590, `${angle}/${ms}: lands inside the scene`);
    assert.ok(DECK_Y - Math.max(...pts.map(p => p[1])) * PX > 30, `${angle}/${ms}: stays under the scene’s top`);
  }
  // Turning the dial and tilting the ramp counts as busy.
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-speed');
  for (let i = 0; i < 14; i++) { session.act(i % 2 ? 'speed:down' : 'speed:up'); run(session, 2); }
  assert.equal(session.view().nudge, null, 'a player turning the dial is not stuck');
  assert.equal(session.view().help, 0);
});
