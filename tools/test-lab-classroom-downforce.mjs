// LAB-CLASSROOM-DOWNFORCE (docs/board/cards/LAB-CLASSROOM-DOWNFORCE.md): Downforce as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, COURSES, WINGS, CAR_KG, WING_TWO_LINE, FREE_TRIES, MIN_SPEED, MAX_SPEED, SPEED_STEP, bestWing, pushKg, dragKg, topOf, pushAt, kmh, msOf, pushSum, dragSum, topMsSum, timesSum, benchAttempts} from '../src/lab/lessons/downforce-classroom.js';
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
    else if (step === 'word-speed') setTo(session, 100);
    else if (step === 'word-wing') { session.act('wing:steeper'); session.act('wing:steeper'); }
    else if (step === 'word-downforce' || step === 'word-drag') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-free') { fan(session); for (let i = 1; i < FREE_TRIES; i++) { session.act('speed:up'); fan(session); } }
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
  // The dial's readings: the same speeds in km/h, rounded.
  assert.deepEqual([50, 60, 70, 100, 120, 150].map(kmh), [80, 97, 113, 161, 193, 241]);
  // The car on the scale is the bench's car, the Falcone F42, and its top speed is the game's, in km/h.
  assert.equal(CAR_KG, 1250); assert.equal(tunnelCar.id, 'falcone_f42'); assert.equal(tunnelCar.topMph, CARS.falcone_f42.topSpeed);
  assert.deepEqual(WINGS.map(topOf), [323, 300, 283]);
  for (const wing of WINGS) assert.equal(topOf(wing), Math.round(tunnelCar.topMph * 1.609344 * downforceBench.run({speedMph: 150, wing}).topSpeedShare), 'top speed is the same at any fan speed');
  // The job: the least wing that gives each bend its push.
  assert.deepEqual(COURSES.map(bestWing), ['small', 'big', 'flat']);
  for (const course of COURSES.filter(c => c.bend)) {
    const best = bestWing(course), less = WINGS[WINGS.indexOf(best) - 1];
    assert.ok(downforce(course.speed, best).downforceKg >= course.needKg && downforce(course.speed, less).downforceKg < course.needKg);
  }
  // tune-view.js says 161 km/h after the merge (Claude), and this replacement then goes.
  assert.equal(WING_TWO_LINE, effectLine('wing', 2).replace('100 mph', '161 km/h'));
  assert.equal(WING_TWO_LINE, 'Grip at 161 km/h +6%, more at higher speed; top speed -2%.');
});

test('every sum in the panel comes out on a calculator from the numbers it shows, and agrees with the bench', () => {
  for (let speed = MIN_SPEED; speed <= MAX_SPEED; speed += SPEED_STEP) {
    assert.equal(Math.round(msOf(speed) * 3.6), kmh(speed), `${speed}: m/s × 3.6 rounds to the dial’s reading`);
    for (const wing of WINGS) {
      assert.equal(Math.round(pushSum(speed, wing)), pushKg(speed, wing), `${speed} ${wing}: the push sum is the scale’s reading`);
      assert.equal(Math.round(dragSum(speed, wing)), dragKg(speed, wing), `${speed} ${wing}: the drag sum is the rope’s reading`);
    }
  }
  for (const wing of WINGS) assert.equal(Math.round(topMsSum(wing) * 3.6), topOf(wing), `${wing}: the top speed sum`);
  assert.deepEqual(timesSum(100), {ratio: 2, times: 4}, 'twice the speed, four times the push');
  assert.deepEqual(timesSum(150), {ratio: 3, times: 9}, 'three times the speed, nine times the push');
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s runs pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  const attempts = benchAttempts(v);
  assert.equal(benchPasses(attempts), true, 'the lesson’s own runs pass the bench’s goal');
  assert.equal(benchPasses(attempts.filter(a => a.input.speedMph !== 100)), false, 'without a wing at the higher bench speed the bench is not passed');
  assert.equal(benchPasses(attempts.filter(a => a.input.speedMph !== 50)), false, 'without a wing at the lower bench speed the bench is not passed');
});

test('words: the dial shows km/h and m/s, the wing tilts and turns the smoke, and the scale and the rope read the push and the drag', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'wonder');
  assert.match(session.view().brian.text, /measures in kilograms, written kg/, 'kg is defined on first use');
  assert.match(session.view().brian.text, /kilometres per hour, written km\/h/, 'km/h is defined on first use');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /with the fan at 161 km\/h the scale read 1,475 kg, even though nothing solid pressed down on the car\. Where did the extra 225 kg come from\?/);
  session.act('next');
  assert.match(session.view().brian.text, /metres per second, written m\/s/, 'm/s is defined before any sum uses it');
  assert.equal(session.view().dial.kmh, 80, 'the dial starts away from its answer');
  assert.equal(session.view().ready, false);
  session.act('speed:up');
  assert.equal(session.view().dial.kmh, 97);
  setTo(session, 100);
  assert.match(session.view().brian.text, /^A dial reading of 161 km\/h is about the same as 44\.7 m\/s/);
  session.act('next');
  assert.equal(session.view().wingPanel.wing, 'flat', 'the wing starts away from its answer');
  assert.equal(session.view().rig.on, true, 'the fan blows smoke past it');
  session.act('wing:flatter');
  assert.match(session.view().brian.text, /^Flat is as flat as the wing goes/);
  session.act('wing:steeper');
  assert.equal(session.view().wingPanel.wing, 'small'); assert.equal(session.view().ready, false);
  session.act('wing:steeper');
  assert.match(session.view().brian.text, /^A steep wing turns the air upward, which is why the smoke bends upward behind the wing\./);
  assert.match(session.view().brian.text, /the air pushes back on the wing just as hard, so the wing is pushed downward/);
  session.act('next');
  assert.equal(session.view().rig.on, false, 'the fan waits for Space');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^With the fan at 80 km\/h and the steep wing, the scale read 1,306 kg, which is the car’s 1,250 kg and 56 kg of downforce\./);
  assert.match(session.view().brian.text, /a tyre grips harder when it is pressed onto the road harder/, 'why the push matters in a bend');
  assert.equal(Math.round(session.view().rig.scale), 1306);
  session.act('next');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^With the fan at 80 km\/h and the steep wing, the rope’s gauge read 30 kg/);
  assert.match(session.view().brian.text, /more wing means a lower top speed\. The steep wing lowers the top speed of this car, a Falcone F42, from 323 km\/h to 283 km\/h/);
  session.act('next');
  until(session, x => x.ready);
  assert.deepEqual(session.view().rows.map(r => [r.kmh, r.push, r.drag]), [[80, 56, 30], [161, 225, 122], [241, 505, 273]], 'the watch fills the table');
  assert.match(session.view().brian.text, /wing meets twice as much air during each second/, 'why the square');
});

test('the tries: Space at the wrong speed, every wrong guess and the same wing twice say why with their numbers', () => {
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  assert.equal(speed.view().dial.speed, 60, 'it starts away from its answer');
  assert.equal(speed.view().dial.kmh, 97);
  assert.equal(speed.view().wingPanel.locked, true);
  speed.act('go');
  assert.match(speed.view().brian.text, /press ↑ until the dial reads 193 km\/h/);
  setTo(speed, 120); speed.act('go');
  assert.equal(speed.view().cards.length, 3, 'set up, then guess from pictures of results');
  assert.deepEqual(speed.view().cards.map(c => c.label), ['About 81 kg, which is twice as much', 'About 162 kg, which is four times as much', 'About 323 kg, which is eight times as much']);
  speed.act('answer:0'); until(speed, x => x.ready);
  assert.match(speed.view().brian.text, /^The tilted wing pushed 162 kg, which is about four times as much as at 97 km\/h, not twice as much\. The speed went from 26\.82 m\/s to 53\.64 m\/s, which is exactly twice as fast/);
  assert.equal(speed.view().formulas.at(-1).worked, '(53.64 ÷ 26.82)^2 = 2.00^2 = 4.00 times', 'the sum compares with the speed the test started from');

  const cost = createClassroomSession(lesson);
  playThroughTo(cost, 'try-cost');
  assert.equal(cost.view().cards.length, 3);
  assert.equal(cost.view().dial.locked, true);
  cost.act('answer:2');
  fan(cost);
  assert.match(cost.view().brian.text, /^The tilted wing gave 112 kg of push and 101 kg on the rope, and it leaves a top speed of 300 km\/h\. Now test the flat wing and the steep wing/);
  cost.act('go');
  assert.match(cost.view().brian.text, /^You have already run the tilted wing\. Press ← or →/);
  setTo(cost, null, 'flat'); fan(cost); setTo(cost, null, 'big'); fan(cost);
  assert.equal(cost.view().ready, true);
  assert.match(cost.view().brian.text, /^The steep wing gives more push, 225 kg, but it also has more drag, so the top speed is only 283 km\/h\. The flat wing has the least drag, 81 kg, which comes from the car’s body alone, and it leaves the full top speed of 323 km\/h\./);
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
  assert.equal(session.view().job.kmh, 161);
  setTo(session, null, 'flat'); fan(session);
  assert.match(session.view().brian.text, /^At 161 km\/h the flat wing pushes 0 kg, but this bend needs 100 kg, so the car slid wide\. Press → for a steeper wing/);
  setTo(session, null, 'big'); fan(session);
  assert.match(session.view().brian.text, /^The car held the bend with 225 kg of push, but the tilted wing gives enough with 112 kg and leaves a top speed of 300 km\/h instead of 283 km\/h\. Press ← for a flatter wing/);
  setTo(session, null, 'small'); fan(session);
  assert.match(session.view().brian.text, /^Correct\. The tilted wing pushes 112 kg, which is more than the 100 kg that the bend needs/);
  assert.equal(session.view().job.course, 2); assert.equal(session.view().dial.speed, 70, 'Brian sets the fan to the next course'); assert.equal(session.view().dial.kmh, 113);
  fan(session);
  assert.match(session.view().brian.text, /^At 113 km\/h the tilted wing pushes 55 kg, but this bend needs 100 kg, so the car slid wide/);
  setTo(session, null, 'big'); fan(session);
  assert.match(session.view().brian.text, /^Correct\. At 113 km\/h the tilted wing gives only 55 kg, while the steep wing gives 110 kg/);
  fan(session);
  assert.match(session.view().brian.text, /^This course has no bend, so the car needs no push, and the steep wing lowers the top speed to 283 km\/h instead of 323 km\/h/);
  setTo(session, null, 'flat'); fan(session);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /the tilted wing for the bend at 161 km\/h, the steep wing for the bend at 113 km\/h and the flat wing for the straight\. That finishes the job/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and runs', () => {
  for (const id of ['word-speed', 'word-wing', 'word-downforce', 'word-drag', 'try-speed', 'try-cost', 'alone']) {
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
    assert.match(session.view().brian.text, /^That is how it is done. /);
    if (id === 'try-speed') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'try-cost') for (let k = 1; k < WINGS.length; k++) { until(session, x => x.keys.Space === 'go', 15); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    if (id === 'alone') for (let c = 1; c < COURSES.length; c++) { until(session, x => x.keys.Space === 'go' && x.job.course === c + 1, 15); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 30);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-nine': [[0, /^The push grows by more than that\. The steep wing pushes 56 kg at 80 km\/h and 505 kg at 241 km\/h, which is about nine times as much/], [1, /^The push is about nine times as great, not six times\. The steep wing pushes 56 kg at 80 km\/h and 505 kg at 241 km\/h/]],
    'check-bend': [[0, /^At 80 km\/h the steep wing pushes 56 kg, but at 241 km\/h the steep wing pushes 505 kg/], [1, /^At 161 km\/h the steep wing pushes 225 kg, but at 241 km\/h the steep wing pushes 505 kg/]],
    'check-game': [[1, /^The car does not become faster everywhere\. Two steps toward More wing give 6% more grip at 161 km\/h and more still at higher speeds, and they lower the top speed by 2%\./], [2, /^The setting does change the car/]],
  };
  for (const [id, picks] of Object.entries(answers)) for (const [pick, why] of picks) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    // The board and the panel do not give the answer away before the player picks.
    assert.equal(session.view().tune?.effect ?? null, null);
    assert.ok(session.view().formulas.every(f => !f.worked), `${id}: the panel’s worked sums wait for the answer`);
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
    assert.ok(session.view().formulas.some(f => f.worked), `${id}: the answered question shows its sums`);
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

test('the formulas: every press of the dial or the wing changes the sums at once, and a word step stays open after its answer', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-speed');
  const worked = () => session.view().formulas.map(f => f.worked);
  assert.equal(session.view().formulas.length, 1, 'only the sums that have been explained so far');
  assert.equal(worked()[0], '22.35 m/s × 3.6 = 80.46 km/h');
  session.act('speed:up');
  assert.equal(worked()[0], '26.82 m/s × 3.6 = 96.55 km/h', 'the dial changes the sum');
  setTo(session, 100);
  assert.ok(session.view().ready);
  session.act('speed:up');
  assert.equal(session.view().dial.kmh, 177, 'the dial stays free after the word, to go on watching');
  assert.equal(worked()[0], '49.17 m/s × 3.6 = 177.01 km/h');
  session.act('next');
  assert.equal(worked()[1], '0.5 × 1.225 × 0 ÷ 9.81 = 0');
  session.act('wing:steeper');
  assert.equal(worked()[1], '0.5 × 1.225 × 0.9 ÷ 9.81 = 0.05619', 'the wing changes the sum');
  session.act('wing:steeper');
  assert.equal(worked()[1], '0.5 × 1.225 × 1.8 ÷ 9.81 = 0.11239');
  session.act('wing:flatter');
  assert.equal(session.view().wingPanel.wing, 'small', 'the wing stays free after the word');
  assert.ok(session.view().ready);
  session.act('next');
  session.act('go'); until(session, x => x.ready);
  assert.equal(worked()[2], '0.11239 × 22.35^2 = 56.1 kg');
  setTo(session, 100);
  assert.equal(worked()[2], '0.11239 × 44.70^2 = 224.6 kg', 'twice the speed gives four times the push, as the dial moves');
  assert.equal(Math.round(session.view().rig.scale), 1475, 'the scale follows the dial');
  assert.ok(session.view().ready);
  assert.match(session.view().brian.text, /^With the fan at 80 km\/h and the steep wing, the scale read 1,306 kg/, 'the closing words stay true while the player turns the dial');
  session.act('next');
  session.act('go'); until(session, x => x.ready);
  assert.equal(worked()[0], '0.06081 × 22.35^2 = 30.4 kg');
  assert.equal(worked()[2], '89.855 × ∛(0.04058 ÷ 0.06081) = 78.521 m/s');
  assert.equal(worked()[3], '78.521 m/s × 3.6 = 282.68 km/h');
  session.act('wing:flatter');
  assert.equal(worked()[2], '89.855 × ∛(0.04058 ÷ 0.05070) = 83.428 m/s', 'the wing changes the top speed sum');
  assert.equal(worked()[3], '83.428 m/s × 3.6 = 300.34 km/h');
  session.act('next');
  until(session, x => x.ready);
  const times = session.view().formulas.find(f => /Compared with/.test(f.title));
  assert.equal(times.worked, '(67.06 ÷ 22.35)^2 = 3.00^2 = 9.00 times');
});

test('the free test: the sums show first, only different settings count, three open Continue, and the table keeps the results', () => {
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  assert.ok(!free.view().ready);
  assert.equal(free.view().rig.on, false, 'the fan waits for Space');
  const push = () => free.view().formulas.find(f => f.title === 'Downforce').worked, times = () => free.view().formulas.find(f => /Compared with/.test(f.title)).worked;
  assert.equal(push(), '0.11239 × 22.35^2 = 56.1 kg');
  free.act('speed:up');
  assert.equal(push(), '0.11239 × 26.82^2 = 80.8 kg', 'the dial changes the sum before the fan runs');
  assert.equal(times(), '(26.82 ÷ 22.35)^2 = 1.20^2 = 1.44 times');
  free.act('speed:down');
  free.act('wing:flatter');
  assert.equal(push(), '0.05619 × 22.35^2 = 28.1 kg', 'the wing changes the sum before the fan runs');
  free.act('wing:steeper');
  fan(free);
  assert.match(free.view().brian.text, /^With the steep wing and the fan at 80 km\/h, the scale read 1,306 kg, which is the car’s 1,250 kg and 56 kg of downforce\. The rope read 30 kg, and this wing leaves a top speed of 283 km\/h\./);
  assert.ok(!free.view().ready);
  fan(free);
  assert.ok(!free.view().ready, 'the same setting again does not count as a different one');
  free.act('speed:up'); fan(free);
  assert.ok(!free.view().ready);
  free.act('wing:flatter'); fan(free);
  assert.ok(free.view().ready, 'three tests open Continue');
  assert.equal(free.view().rows.length, 4, 'the table keeps the results');
  assert.deepEqual(free.view().rows.at(-1), {speed: 60, kmh: 97, wing: 'small', push: 40, drag: 36, top: 300});
});

test('Show me alone finishes the free test: each press tries a setting not yet tested, and its words are true', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  for (let press = 1; press <= FREE_TRIES; press++) {
    for (let h = 0; h < 3; h++) session.act('help');
    assert.ok(session.view().pointer, `press ${press}: Brian points`);
    run(session, SHOW_ME_S + .1);
    until(session, x => x.rows.length === press && x.keys.Space === 'go', 15);
  }
  assert.ok(session.view().ready, 'Show me alone reaches three different settings');
  assert.equal(new Set(session.view().rows.map(r => `${r.speed}/${r.wing}`)).size, FREE_TRIES);
  // A setting already tested: Brian points at a control, not at the fan, and says he will change the setting.
  session.act('help'); session.act('help'); session.act('help');
  assert.equal(session.view().target, 'set:best');
  assert.match(session.view().brian.text, /I will change to a setting you have not tested/);
});

test('Show me on the speed test stops at the guess, and says so', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-speed');
  for (let h = 0; h < 3; h++) session.act('help');
  assert.match(session.view().brian.text, /and then you can guess/);
  assert.doesNotMatch(session.view().brian.text, /run the fan/);
  run(session, SHOW_ME_S + .1);
  assert.doesNotMatch(session.view().brian.text, /run the fan/);
  until(session, x => x.cards.length === 3, 10);
  assert.equal(session.view().rig.on, false, 'the fan waits for the guess');
});

test('a direction is right from every setting of the dial', () => {
  for (let speed = MIN_SPEED; speed <= MAX_SPEED; speed += SPEED_STEP) {
    if (speed === 120) continue;
    const session = createClassroomSession(lesson);
    playThroughTo(session, 'try-speed');
    setTo(session, speed);
    const way = speed < 120 ? '↑' : '↓', wrong = speed < 120 ? '↓' : '↑';
    assert.match(session.view().hints[1], new RegExp(`^Press ${way} until the dial reads 193 km/h`), `the hint at ${speed}`);
    session.act('go');
    assert.match(session.view().brian.text, new RegExp(`press ${way} until the dial reads 193 km/h`), `the refusal at ${speed}`);
    assert.doesNotMatch(session.view().brian.text, new RegExp(`press ${wrong}`));
  }
  const set = createClassroomSession(lesson);
  playThroughTo(set, 'try-speed');
  setTo(set, 120);
  assert.doesNotMatch(set.view().hints[1], /until/, 'at the right speed no direction is given');
});

test('no sum settles a guess before it is made', () => {
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  const words = view => view.formulas.map(f => `${f.title} ${f.formula} ${f.worked ?? ''} ${f.note ?? ''}`).join(' ');
  setTo(speed, 120);
  const before = words(speed.view());
  assert.match(before, /53\.64 m\/s × 3\.6/, 'the dial still moves its own sum');
  assert.doesNotMatch(before, /162|4\.00|times/, 'the push and the comparison wait for the guess');
  speed.act('go');
  assert.equal(speed.view().cards.length, 3);
  assert.doesNotMatch(words(speed.view()), /162|4\.00|times/);
  speed.act('answer:2');
  until(speed, x => x.ready);
  assert.match(words(speed.view()), /4\.00 times/, 'the sums come back once the guess is made');
  const cost = createClassroomSession(lesson);
  playThroughTo(cost, 'try-cost');
  assert.equal(cost.view().cards.length, 3);
  assert.doesNotMatch(words(cost.view()), /top speed|km\/h|=\s*\d/i, 'no top speed or result while the guess is open');
  assert.ok(cost.view().formulas.every(f => !f.worked));
  cost.act('answer:0');
  assert.ok(cost.view().formulas.some(f => /Top speed/.test(f.title) && f.worked));
});

test('a step’s opening words do not change with a dial, and are true when they appear', () => {
  for (const [id, action] of [['word-speed', 'speed:up'], ['try-free', 'speed:up'], ['try-speed', 'speed:up']]) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const opening = session.view().say;
    session.act(action);
    assert.equal(session.view().say, opening, `${id}: a live number belongs in the prompt or the panel`);
  }
  const cost = createClassroomSession(lesson);
  playThroughTo(cost, 'try-cost');
  assert.match(cost.view().say, /^The fan is now set to 161 km\/h\./, 'the speed test before it ran at 193 km/h');
  const watch = createClassroomSession(lesson);
  playThroughTo(watch, 'word-drag');
  watch.act('go'); until(watch, x => x.ready);
  watch.act('wing:flatter'); watch.act('next');
  assert.match(watch.view().say, /^The wing is now steep/, 'the player may have left the wing flatter');
});

test('downforce and drag do not appear before the steps that define them', () => {
  const session = createClassroomSession(lesson);
  const painted = view => {
    const out = [];
    const ctx = new Proxy({}, {get: (target, name) => {
      if (name in target) return target[name];
      if (name === 'measureText') return value => ({width: String(value).length * 9});
      if (name === 'fillText') return value => { out.push(value); };
      if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
      return () => {};
    }, set: (target, name, value) => { target[name] = value; return true; }});
    drawBoard(ctx, view, 1000, 680);
    return out.join(' ');
  };
  const words = view => [view.say, view.prompt, ...view.hints, ...view.formulas.flatMap(f => [f.title, f.formula, f.worked, f.note]), painted(view)].join(' ');
  for (const [id, absent] of [['wonder', /downforce|drag/i], ['word-speed', /downforce|drag/i], ['word-wing', /downforce|drag/i], ['word-downforce', /drag/i]]) {
    playThroughTo(session, id);
    run(session, 3);
    assert.doesNotMatch(words(session.view()), absent, `${id} before its word`);
  }
  playThroughTo(session, 'word-drag');
  session.act('go'); until(session, x => x.ready);
  assert.match(painted(session.view()), /drag/i, 'the picture names the drag once it is defined');
});

test('claims that add up: rounded figures say about, and exact words go with exact figures', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'watch');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /about twice the speed and about four times the push.*about three times the speed and about nine times the push/);
  playThroughTo(session, 'check-nine');
  assert.match(session.view().say, /about three times as fast\. About how many times greater/);
  assert.deepEqual(session.view().cards.map(c => c.label), ['About three times as great', 'About six times as great', 'About nine times as great']);
  session.act('answer:2');
  assert.match(session.view().brian.text, /about nine times as much/);
});

test('the lesson’s words keep to one measurement system and name their objects', () => {
  for (const file of ['downforce-classroom.js', 'downforce-board.js']) {
    const source = readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8');
    for (const [fault, pattern] of [['she or her', /\b(she|her|hers|herself)\b/i], ['mph', /\bmph\b/i], ['decides', /\bdecides?\b/i], ['takes its speed', /\b(air|wind)\s+(soon\s+)?takes\b/i]])
      assert.ok(!pattern.test(source), `${file} has ${fault}: ${source.match(pattern)?.[0]}`);
  }
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
