// LAB-CLASSROOM-DOWNFORCE (docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md): Downforce as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, COURSES, WINGS, CAR_KG, TOP_MPH, WING_TWO_LINE, bestWing, pushKg, dragKg, topOf, pushAt, benchAttempts} from '../src/lab/lessons/downforce-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/downforce-board.js';
import {downforceBench, downforce, tunnelCar, kgForce} from '../src/lab/benches/tunnel.js';
import {CARS} from '../src/config.js';
import {effectLine, TUNE_ROWS} from '../src/lab/tune-view.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.downforce;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
// Turn the fan dial and tilt the wing to a setting, as the keys do.
function setTo(session, speed, wing) {
  for (let i = 0; i < 20 && speed != null && session.view().dial && !session.view().dial.locked && session.view().dial.speed !== speed; i++) session.act(session.view().dial.speed < speed ? 'speed:up' : 'speed:down');
  for (let i = 0; i < 5 && wing && session.view().wingPanel && !session.view().wingPanel.locked && session.view().wingPanel.wing !== wing; i++)
    session.act(WINGS.indexOf(session.view().wingPanel.wing) < WINGS.indexOf(wing) ? 'wing:steeper' : 'wing:flatter');
}
const fan = session => { session.act('go'); until(session, x => x.ready || x.keys.Space === 'go', 15); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-wing') { session.act('wing:steeper'); session.act('wing:steeper'); }
    else if (step === 'word-downforce' || step === 'word-drag') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-speed') { setTo(session, 120); session.act('go'); session.act('answer:1'); until(session, x => x.ready); }
    else if (step === 'try-cost') { session.act('answer:0'); for (const wing of ['flat', 'small', 'big']) { setTo(session, null, wing); fan(session); } }
    else if (step === 'alone') for (const course of COURSES) { setTo(session, null, bestWing(course)); fan(session); }
    else if (step === 'check-nine') session.act('answer:2');
    else if (step === 'check-bend') session.act('answer:2');
    else if (step === 'check-game') session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}
// The challenge path in lab-view.js, as it feeds a lesson's machine runs to the bench.
function benchPasses(attempts) {
  let bench = openBench('downforce');
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
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['downforce-word-0', 'downforce-word-1', 'downforce-word-2'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.word), ['Wing', 'Downforce', 'Drag']);
  assert.equal(lesson.name, 'Downforce');
  assert.equal(lesson.finishLabel, 'Finish the lesson');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.downforce.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.downforce.explain');
});

test('every number is the downforce bench’s own run, and question 3 is the Tune page’s own line', () => {
  for (const speed of [50, 60, 70, 100, 120, 150]) for (const wing of WINGS) {
    const r = downforceBench.run({speedMph: speed, wing});
    assert.equal(pushKg(speed, wing), Math.round(r.downforceKg));
    assert.equal(dragKg(speed, wing), Math.round(kgForce(r.dragN)));
    assert.equal(pushAt(speed, wing), downforce(speed, wing).downforceKg);
  }
  assert.deepEqual([50, 100, 150].map(s => pushKg(s, 'big')), [56, 225, 505]);
  assert.deepEqual([60, 120].map(s => pushKg(s, 'small')), [40, 162]);
  assert.deepEqual(WINGS.map(w => dragKg(100, w)), [81, 101, 122]);
  // The car on the scale is the bench's car, the Falcone F42, and its top speed is the game's.
  assert.equal(CAR_KG, 1250); assert.equal(tunnelCar.id, 'falcone_f42'); assert.equal(TOP_MPH, CARS.falcone_f42.topSpeed);
  assert.deepEqual(WINGS.map(topOf), [201, 187, 176]);
  for (const wing of WINGS) assert.equal(topOf(wing), Math.round(TOP_MPH * downforceBench.run({speedMph: 150, wing}).topSpeedShare), 'top speed is the same at any fan speed');
  // The job: the least wing that gives each bend its push.
  assert.deepEqual(COURSES.map(bestWing), ['small', 'big', 'flat']);
  for (const course of COURSES.filter(c => c.bend)) {
    const best = bestWing(course), less = WINGS[WINGS.indexOf(best) - 1];
    assert.ok(downforce(course.mph, best).downforceKg >= course.needKg && downforce(course.mph, less).downforceKg < course.needKg);
  }
  assert.equal(WING_TWO_LINE, effectLine('wing', 2));
  assert.equal(WING_TWO_LINE, 'Grip at 100 mph +6%, more at higher speed; top speed -2%.');
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s runs pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  const attempts = benchAttempts(v);
  assert.equal(benchPasses(attempts), true, 'the lesson’s own runs pass the bench’s goal');
  assert.equal(benchPasses(attempts.filter(a => a.input.speedMph !== 100)), false, 'without a wing at 100 mph the bench is not passed');
  assert.equal(benchPasses(attempts.filter(a => a.input.speedMph !== 50)), false, 'without a wing at 50 mph the bench is not passed');
});

test('words: the wing tilts and turns the smoke; the scale and the rope read the push and the drag', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'wonder');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /At 100 mph the scale read 1,475 kg, and nothing touched the car\. Where did 225 kg come from\?/);
  session.act('next');
  assert.equal(session.view().wingPanel.wing, 'flat', 'the wing starts away from its answer');
  assert.equal(session.view().rig.on, true, 'the fan blows smoke past it');
  session.act('wing:flatter');
  assert.match(session.view().brian.text, /^Flat is as flat as the wing goes/);
  session.act('wing:steeper');
  assert.equal(session.view().wingPanel.wing, 'small'); assert.equal(session.view().ready, false);
  session.act('wing:steeper');
  assert.match(session.view().brian.text, /^Steep: the wing throws the air up behind it, so the air pushes the wing down/);
  session.act('next');
  assert.equal(session.view().rig.on, false, 'the fan waits for Space');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^The scale reads 1,306 kg: the car’s 1,250 kg and 56 kg of air pushing it down\. That push is downforce/);
  assert.equal(Math.round(session.view().rig.scale), 1306);
  session.act('next');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^The rope’s gauge reads 30 kg/);
  session.act('next');
  until(session, x => x.ready);
  assert.deepEqual(session.view().rows.map(r => [r.speed, r.push, r.drag]), [[50, 56, 30], [100, 225, 122], [150, 505, 273]], 'the watch fills the table');
});

test('the tries: Space at the wrong speed, every wrong guess and the same wing twice say why with their numbers', () => {
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  assert.equal(speed.view().dial.speed, 60, 'it starts away from its answer');
  assert.equal(speed.view().wingPanel.locked, true);
  speed.act('go');
  assert.match(speed.view().brian.text, /press ↑ until the dial reads 120/);
  setTo(speed, 120); speed.act('go');
  assert.equal(speed.view().cards.length, 3, 'set up, then guess from pictures of results');
  assert.deepEqual(speed.view().cards.map(c => c.label), ['About 81 kg: twice as much', 'About 162 kg: four times as much', 'About 323 kg: eight times as much']);
  speed.act('answer:0'); until(speed, x => x.ready);
  assert.match(speed.view().brian.text, /^It pushed 162 kg: four times as much as at 60 mph, not twice/);

  const cost = createClassroomSession(lesson);
  playThroughTo(cost, 'try-cost');
  assert.equal(cost.view().cards.length, 3);
  assert.equal(cost.view().dial.locked, true);
  cost.act('answer:2');
  fan(cost);
  assert.match(cost.view().brian.text, /^The tilted wing: 112 kg of push, 101 kg on the rope, top speed 187 mph\. Now the flat and the steep/);
  cost.act('go');
  assert.match(cost.view().brian.text, /^You have run the tilted wing: press ← or → for another/);
  setTo(cost, null, 'flat'); fan(cost); setTo(cost, null, 'big'); fan(cost);
  assert.equal(cost.view().ready, true);
  assert.match(cost.view().brian.text, /^The steep wing pushes more, 225 kg, but drags more too: only 176 mph\. Flat drags least, 81 kg, the car’s body alone, and keeps all 201 mph\./);
  assert.deepEqual(cost.view().rows.map(r => r.wing), ['small', 'flat', 'big']);
});

test('Brian’s job starts away from course 1’s answer, whatever order the tries were run in', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-cost');
  session.act('answer:0');
  for (const wing of ['flat', 'big', 'small']) { setTo(session, null, wing); fan(session); }
  assert.equal(session.view().wingPanel.wing, 'small', 'the tries end on the tilted wing');
  session.act('next');
  assert.equal(session.view().step.id, 'alone');
  assert.equal(session.view().wingPanel.wing, 'big');
  assert.notEqual(session.view().target, 'go', 'Brian does not point at the fan before a choice is made');
});

test('Brian’s job: the least wing that holds each course; too little, too much and a wing on the straight each say why', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().dial.locked, true);
  assert.equal(session.view().job.mph, 100);
  setTo(session, null, 'flat'); fan(session);
  assert.match(session.view().brian.text, /^At 100 mph the flat wing pushes 0 kg; this bend needs 100 kg, so the car slid wide\. Steeper/);
  setTo(session, null, 'big'); fan(session);
  assert.match(session.view().brian.text, /^It held with 225 kg, but the tilted wing does it with 112 kg and keeps 187 mph, not 176\. Flatter/);
  setTo(session, null, 'small'); fan(session);
  assert.match(session.view().brian.text, /^Right: the tilted wing pushes 112 kg, enough for 100 kg/);
  assert.equal(session.view().job.course, 2); assert.equal(session.view().dial.speed, 70, 'Brian sets the fan to the next course');
  fan(session);
  assert.match(session.view().brian.text, /^At 70 mph the tilted wing pushes 55 kg; this bend needs 100 kg, so the car slid wide/);
  setTo(session, null, 'big'); fan(session);
  assert.match(session.view().brian.text, /^Right: at 70 mph the tilted wing gives only 55 kg; the steep one gives 110 kg/);
  fan(session);
  assert.match(session.view().brian.text, /^No bend needs push here, and the steep wing costs top speed: 176 mph, not 201/);
  setTo(session, null, 'flat'); fan(session);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /tilted for the 100 mph bend, steep for the 70 mph bend, flat for the straight\. Job done/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and runs', () => {
  for (const id of ['word-wing', 'word-downforce', 'word-drag', 'try-speed', 'try-cost', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    if (id === 'try-cost') session.act('answer:0');
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action === 'go') assert.equal(hitTest(v, ...at)?.action, 'go', `${id}: a click where Brian points runs the fan`);
    else assert.ok(hitTest(v, ...at), `${id}: Brian points at the dial or the wing`);
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^Watch how I do it\. /);
    if (id === 'try-speed') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'try-cost') for (let k = 1; k < WINGS.length; k++) { until(session, x => x.keys.Space === 'go', 15); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    if (id === 'alone') for (let c = 1; c < COURSES.length; c++) { until(session, x => x.keys.Space === 'go' && x.job.course === c + 1, 15); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 30);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-nine': [[0, /^More than three times: 56 kg at 50 mph, 505 kg at 150, nine times as much/], [1, /^Not six: 56 kg at 50 mph, 505 kg at 150, nine times/]],
    'check-bend': [[0, /^At 50 mph it pushes 56 kg; at 150 mph, 505 kg/], [1, /^At 100 mph it pushes 225 kg; at 150 mph, 505 kg/]],
    'check-game': [[1, /^Not everywhere: Grip at 100 mph \+6%, more at higher speed; top speed −2%\./], [2, /^It changes the car/]],
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

test('mouse: the dial and the wing turn, a click in the tunnel runs the fan, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-speed');
  let v = session.view();
  for (const action of ['speed:up', 'speed:down']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  assert.equal(hitTest(v, ...targetPoint(v, 'wing:steeper')), null, 'the speed try’s wing is set by Brian');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  for (const point of [targetPoint(v, 'speed:up'), targetPoint(v, 'wing:steeper'), [96, 178], [130, 330], [400, 330], [450, 168], [330, 260], [500, 480]]) assert.ok(hoverInfo(v, ...point), `hover at ${point}`);
  session.act(hitTest(v, ...targetPoint(v, 'speed:up')).action);
  assert.equal(session.view().dial.speed, 70);
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  v = job.view();
  for (const action of ['wing:steeper', 'wing:flatter']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  // A click on one of the three wings moves one notch toward it.
  assert.equal(v.wingPanel.wing, 'big');
  assert.equal(hitTest(v, 670, 240)?.action, 'wing:flatter');
  job.act(hitTest(v, 670, 240).action);
  assert.equal(job.view().wingPanel.wing, 'small');
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
    if (STEPS[i].id === 'try-speed') { setTo(session, 120); session.act('go'); }
    if (STEPS[i].id === 'alone') session.act('go');
    for (const t of [0, 1, 3]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
});

test('the Tune page agrees with question 3, and turning the dial counts as busy', () => {
  const row = TUNE_ROWS.find(r => r.setting === 'wing');
  assert.match(row.trade, /More wing grips more in fast corners/);
  assert.ok(CLASSROOM_LESSONS.downforce.challengeCard.text.includes('Wing angle is on the Tune page'));
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-speed');
  for (let i = 0; i < 14; i++) { session.act(i % 2 ? 'speed:down' : 'speed:up'); run(session, 2); }
  assert.equal(session.view().nudge, null, 'a player turning the dial is not stuck');
  assert.equal(session.view().help, 0);
});
