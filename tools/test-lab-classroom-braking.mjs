// LAB-CLASSROOM-BRAKING (docs/board/cards/LAB-CLASSROOM-BRAKING.md): Braking as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, CORNERS, STEADY_FRONT, FRONT_LOAD, REAR_LOAD, REAR_TWO_LINE, fastestFor, metresFrom, laneAt, stopOf, benchAttempts} from '../src/lab/lessons/braking-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/braking-board.js';
import {brakingBench, stopDistance, frontLoadShare} from '../src/lab/benches/tunnel.js';
import {effectLine} from '../src/lab/tune-view.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.braking;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
// Turn the dial and move the lever to a setting, as the keys do.
function setTo(session, speed, front) {
  for (let i = 0; i < 20 && session.view().dial && !session.view().dial.locked && session.view().dial.speed !== speed; i++) session.act(session.view().dial.speed < speed ? 'speed:up' : 'speed:down');
  for (let i = 0; i < 20 && session.view().lever && !session.view().lever.locked && session.view().lever.front !== front; i++) session.act(session.view().lever.front < front ? 'lever:front' : 'lever:back');
}
const brake = session => { session.act('go'); until(session, x => x.ready || x.keys.Space === 'go', 15); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-stopping' || step === 'word-weight') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'word-balance') { session.act('lever:front'); session.act('lever:front'); }
    else if (step === 'try-speed') { setTo(session, 100); session.act('go'); session.act('answer:1'); until(session, x => x.ready); }
    else if (step === 'try-slide') { brake(session); setTo(session, 50, STEADY_FRONT); brake(session); }
    else if (step === 'alone') for (const gap of CORNERS) { setTo(session, fastestFor(gap), STEADY_FRONT); brake(session); }
    else if (step === 'check-four') session.act('answer:1');
    else if (step === 'check-balance') session.act('answer:2');
    else if (step === 'check-game') session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}
// The challenge path in lab-view.js, as it feeds a lesson's machine runs to the bench.
function benchPasses(attempts) {
  let bench = openBench('braking');
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
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['braking-word-0', 'braking-word-1', 'braking-word-2'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.word), ['Stopping distance', 'Weight shift', 'Brake balance']);
  assert.equal(lesson.name, 'Braking');
  assert.equal(lesson.finishLabel, 'Finish the lesson');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.braking.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.braking.explain');
});

test('every number is the braking bench’s own run, and question 3 is the Tune page’s own line', () => {
  for (const speed of [20, 50, 60, 100, 120, 150]) {
    assert.equal(metresFrom(speed), brakingBench.run({speedMph: speed}).stopMetres);
    assert.equal(metresFrom(speed), stopDistance(brakingBench.controls[0].value, speed).metres);
  }
  assert.equal(metresFrom(50).toFixed(1), '11.8'); assert.equal(metresFrom(100).toFixed(1), '47.2');
  assert.ok(Math.abs(metresFrom(100) / metresFrom(50) - 4) < .05, 'twice the speed, four times the road');
  assert.equal(FRONT_LOAD, frontLoadShare()); assert.equal(Math.round(REAR_LOAD * 100), 31);
  for (const front of [40, 50, 60, 70, 80, 90]) assert.equal(stopOf(50, front).rearSlides, front < STEADY_FRONT, `${front}% front`);
  assert.deepEqual(CORNERS.map(fastestFor), [60, 100, 120]);
  for (const gap of CORNERS) { const s = fastestFor(gap); assert.ok(metresFrom(s) <= gap && metresFrom(s + 10) > gap); }
  assert.equal(REAR_TWO_LINE, effectLine('brakes', 2));
  // The car on the strip brakes evenly from its speed to the bench's stop, in the bench's time.
  const r = stopOf(100);
  const end = laneAt(100, 70, 5);
  assert.equal(end.metres, r.stopMetres); assert.equal(end.mph, 0); assert.equal(end.done, true);
  assert.ok(laneAt(100, 70, .3).metres < 0 && laneAt(100, 70, .3).braking === false, 'it arrives before the brake line');
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s runs pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  const attempts = benchAttempts(v);
  assert.equal(benchPasses(attempts), true, 'the lesson’s own runs pass the bench’s goal');
  assert.equal(benchPasses(attempts.filter(a => a.input.speedMph !== 100)), false, 'without the 100 mph run the bench is not passed');
});

test('words: Space brakes to a measured stop; the pads shift the weight; the lever moves 10% a press to 70% front', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-stopping');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^11\.8 m from 50 mph\. That is its stopping distance/);
  session.act('next');
  assert.equal(session.view().close.front, .5, 'standing, half and half');
  session.act('go'); until(session, x => x.lanes[0]?.braking);
  assert.equal(session.view().close.front, FRONT_LOAD, 'braking, the weight tips forward');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /the front tyres carried 69% and the back 31%/);
  session.act('next');
  assert.equal(session.view().lever.front, 50);
  session.act('lever:front');
  assert.equal(session.view().lever.front, 60); assert.equal(session.view().ready, false);
  session.act('lever:front');
  assert.match(session.view().brian.text, /^70% front: the front brakes do 70% of the braking, the back brakes 30%/);
});

test('the tries: Space at the wrong speed, every wrong guess and every slide says why with its numbers', () => {
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  assert.equal(speed.view().dial.speed, 50, 'it starts away from its answer');
  speed.act('go');
  assert.match(speed.view().brian.text, /press ↑ until the dial reads 100/);
  setTo(speed, 100); speed.act('go');
  assert.equal(speed.view().cards.length, 3, 'set up, then guess from pictures of results');
  speed.act('answer:2'); until(speed, x => x.ready);
  assert.match(speed.view().brian.text, /^It needed 47\.2 m: four times 11\.8 m, not eight/);

  const slide = createClassroomSession(lesson);
  playThroughTo(slide, 'try-slide');
  assert.equal(slide.view().lever.front, 50); assert.equal(slide.view().dial.locked, true);
  brake(slide);
  assert.match(slide.view().brian.text, /^There: the back brakes did 50% of the braking, but braking left only 31% of the weight on the back tyres: they locked and the back slid/);
  assert.equal(slide.view().ready, false);
  setTo(slide, 50, 60); brake(slide);
  assert.match(slide.view().brian.text, /^At 60% front the back brakes did 40% of the braking/);
  setTo(slide, 50, 70); brake(slide);
  assert.match(slide.view().brian.text, /^70% front: the back brakes did 30%, less than the 31% the back tyres carry/);
  assert.equal(slide.view().ready, true);
});

test('Brian’s job: the fastest steady stop before each corner; too fast, too slow and a slide each say why', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().line, 20);
  setTo(session, 70, STEADY_FRONT); brake(session);
  assert.match(session.view().brian.text, /^From 70 mph it needs 23\.1 m, and the gap is 20 m: it ran 3\.1 m past the corner/);
  setTo(session, 50, STEADY_FRONT); brake(session);
  assert.match(session.view().brian.text, /^Stopped 8\.2 m short of the corner\. From 60 mph it still stops in time \(17\.0 m\)/);
  setTo(session, 60, 50); brake(session);
  assert.match(session.view().brian.text, /^The back slid/);
  setTo(session, 60, STEADY_FRONT); brake(session);
  assert.match(session.view().brian.text, /^Right: 60 mph stops in 17\.0 m, inside 20 m/);
  assert.equal(session.view().line, 50); assert.equal(session.view().ready, false);
  for (const gap of CORNERS.slice(1)) { setTo(session, fastestFor(gap), STEADY_FRONT); brake(session); }
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /60, 100 and 120 mph/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and brakes', () => {
  for (const id of ['word-stopping', 'word-weight', 'word-balance', 'try-speed', 'try-slide', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action === 'go') assert.equal(hitTest(v, ...at)?.action, 'go', `${id}: a click where Brian points brakes`);
    else assert.ok(hitTest(v, ...at), `${id}: Brian points at the dial or the lever`);
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^Like that\. /);
    if (id === 'try-speed') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'try-slide') { until(session, x => x.keys.Space === 'go', 10); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .1); }
    if (id === 'alone') for (let c = 1; c < CORNERS.length; c++) { until(session, x => x.keys.Space === 'go' && x.job.corner === c + 1, 15); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 30);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-four': [[0, /^It is more than twice: 11\.8 m from 50 mph, 47\.2 m from 100, four times as far\./], [2, /^Not the same/]],
    'check-balance': [[0, /^At 50% front the back brakes do 50% of the braking, but the back tyres carry only 31%/], [1, /^At 60% front the back brakes do 40%/]],
    'check-game': [[1, /^It is a trade: Braking \+2%; cornering grip while braking −4%\./], [2, /^It changes the car/]],
  };
  for (const [id, picks] of Object.entries(answers)) for (const [pick, why] of picks) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    // The board does not give the answer away before the player picks.
    assert.equal(session.view().tune?.effect ?? null, null);
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
  }
});

test('mouse: the dial and the lever turn, a click on the strip brakes, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  let v = session.view();
  for (const action of ['speed:up', 'speed:down', 'lever:front', 'lever:back']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  for (const point of [targetPoint(v, 'speed:up'), targetPoint(v, 'lever:front'), [300, 290], [300, 180], [500, 460]]) assert.ok(hoverInfo(v, ...point), `hover at ${point}`);
  session.act(hitTest(v, ...targetPoint(v, 'speed:up')).action);
  session.act(hitTest(v, ...targetPoint(v, 'lever:front')).action);
  v = session.view();
  assert.equal(v.dial.speed, 60); assert.equal(v.lever.front, 80);
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  v = speed.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'lever:front')), null, 'the speed try’s lever is shut');
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
    if (STEPS[i].id === 'try-speed') { setTo(session, 100); session.act('go'); }
    for (const t of [0, 1, 4]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
});

test('the old lesson’s faults are gone: settings carry, the dial steps in whole 10 mph, and each try starts away from its answer', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-balance');
  session.act('lever:front'); session.act('lever:front'); session.act('lever:front');
  playThroughTo(session, 'try-speed');
  assert.equal(session.view().lever.front, STEADY_FRONT, 'the lever stopped at 70% and carries into the speed try');
  session.act('speed:up');
  assert.equal(session.view().dial.speed, 60, 'one press is 10 mph');
  playThroughTo(session, 'try-slide');
  assert.equal(session.view().lever.front, 50, 'the slide try starts on a setting that slides');
  playThroughTo(session, 'alone');
  assert.equal(session.view().lever.front, STEADY_FRONT, 'the steady lever carries into Brian’s job');
  assert.notEqual(session.view().dial.speed, fastestFor(CORNERS[0]), 'the job starts away from its answer');
});
