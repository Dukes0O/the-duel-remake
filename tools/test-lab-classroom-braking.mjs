// LAB-CLASSROOM-BRAKING (docs/board/cards/LAB-CLASSROOM-BRAKING.md): Braking as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, CORNERS, STEADY_FRONT, FRONT_LOAD, REAR_LOAD, REAR_TWO_LINE, TEST_CARS, FREE_TRIES, MIN_SPEED, MAX_SPEED, SPEED_STEP, fastestFor, metresFrom, laneAt, stopOf, kmh, msOf, aOf, brakesOf, sumOf, benchAttempts} from '../src/lab/lessons/braking-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/braking-board.js';
import {brakingBench, stopDistance, frontLoadShare} from '../src/lab/benches/tunnel.js';
import {effectLine, TUNE_ROWS} from '../src/lab/tune-view.js';
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
    else if (step === 'word-speed') setTo(session, 100);
    else if (['word-stopping', 'word-deceleration', 'word-energy', 'word-weight'].includes(step)) { session.act('go'); until(session, x => x.ready); }
    else if (step === 'word-balance') { session.act('lever:front'); session.act('lever:front'); }
    else if (step === 'try-free') { brake(session); session.act('speed:up'); brake(session); session.act('car:next'); brake(session); }
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
const panelText = v => v.formulas.map(f => [f.title, f.formula, f.worked, f.note].filter(Boolean).join(' ')).join(' ');

test('the lesson walks the seven parts in order, keeps the old notebook words, and finishes on the bench', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['braking-metres-per-second', 'braking-word-0', 'braking-deceleration', 'braking-word-1', 'braking-word-2', 'braking-energy'], 'the old lesson’s notebook ids, and the new words');
  assert.deepEqual(lesson.words.map(w => w.word), ['Metres per second (m/s)', 'Stopping distance', 'Deceleration (m/s²)', 'Energy of motion', 'Weight shift', 'Brake balance']);
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
  assert.equal(end.metres, r.stopMetres); assert.equal(end.ms, 0); assert.equal(end.done, true);
  assert.ok(laneAt(100, 70, .3).metres < 0 && laneAt(100, 70, .3).braking === false, 'it arrives before the brake line');
});

test('the dial shows km/h, the sums use m/s, and the sum d = v² ÷ (2 × a) agrees with the bench to within a few centimetres', () => {
  assert.deepEqual([50, 60, 100, 120].map(kmh), [80, 97, 161, 193]);
  assert.equal(msOf(50), 22.35); assert.equal(msOf(100), 44.7); assert.equal(msOf(100), 2 * msOf(50), 'exactly twice in the sums');
  assert.equal(brakesOf(), 20.92); assert.equal(aOf(), 21.19);
  for (const car of TEST_CARS) for (let s = MIN_SPEED; s <= MAX_SPEED; s += SPEED_STEP) {
    assert.ok(Math.abs(sumOf(s, car) - metresFrom(s, car)) < .05, `${car} at ${s}: ${sumOf(s, car)} against ${metresFrom(s, car)}`);
    assert.equal(Math.round(msOf(s) * 3.6), kmh(s), 'the shown m/s gives the dial’s reading');
  }
  assert.equal(new Set(TEST_CARS.map(car => aOf(car))).size, TEST_CARS.length, 'each car in the free test brakes differently');
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s runs pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  const attempts = benchAttempts(v);
  assert.equal(benchPasses(attempts), true, 'the lesson’s own runs pass the bench’s goal');
  assert.equal(benchPasses(attempts.filter(a => a.input.speedMph !== 100)), false, 'without the run from 161 km/h the bench is not passed');
});

test('words: Space brakes to a measured stop; the pads shift the weight; the lever moves 10% a press to 70% front', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-stopping');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^The tape reads 11\.8 m, so the stopping distance from 80 km\/h is 11\.8 m/);
  playThroughTo(session, 'word-weight');
  assert.equal(session.view().close.front, .5, 'standing, half and half');
  session.act('go'); until(session, x => x.lanes[0]?.braking);
  assert.equal(session.view().close.front, FRONT_LOAD, 'braking, the weight tips forward');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /the front tyres carry 69% of the weight and the back tyres carry 31%/);
  session.act('next');
  assert.equal(session.view().lever.front, 50);
  session.act('lever:front');
  assert.equal(session.view().lever.front, 60); assert.equal(session.view().ready, false);
  session.act('lever:front');
  assert.match(session.view().brian.text, /^At 70% front, the front brakes do 70% of the braking and the back brakes do 30%/);
});

test('deceleration and energy: the marks fall by the same speed, and the energy explains four times the road', () => {
  const slow = createClassroomSession(lesson);
  playThroughTo(slow, 'word-deceleration');
  assert.match(slow.view().say, /written m\/s²/);
  assert.match(slow.view().say, /Together they make 21\.19 m\/s²/);
  slow.act('go'); until(slow, x => x.ready);
  const marks = slow.view().timeMarks;
  assert.deepEqual(marks.map(k => k.ms.toFixed(1)), ['25.2', '14.6', '4.0']);
  for (let i = 1; i < marks.length; i++) assert.ok(marks[i].metres - marks[i - 1].metres < (i > 1 ? marks[i - 1].metres - marks[i - 2].metres : marks[0].metres), 'the marks grow closer together');
  assert.match(slow.view().brian.text, /^The car lost the same 10\.6 m\/s during every half second/);
  assert.match(slow.view().brian.text, /35\.76 m\/s ÷ 21\.19 m\/s² = 1\.69 s/);
  assert.match(slow.view().brian.text, /so this car brakes about twice as hard/);
  // The panel's last line comes out on a calculator from the figures it shows.
  const [, v, a, t, left] = slow.view().formulas.at(-1).worked.match(/^([\d.]+) m\/s − ([\d.]+) m\/s\^2 × ([\d.]+) s = ([\d.]+) m\/s$/).map(Number);
  assert.equal(left, 0);
  assert.equal(Math.abs(v - a * t).toFixed(2), left.toFixed(2));

  const energy = createClassroomSession(lesson);
  playThroughTo(energy, 'word-energy');
  assert.match(energy.view().say, /twice the speed carries 2 × 2 = 4 times the energy/);
  assert.match(energy.view().say, /The same brakes remove the same amount of energy during each metre of road/);
  assert.equal(energy.view().dial.kmh, 161);
  assert.match(panelText(energy.view()), /\(44\.70 m\/s\)\^2 ÷ \(2 × 21\.19 m\/s\^2\) = 47\.15 m/);
  assert.doesNotMatch(panelText(energy.view()), /The tape reads/, 'no reading before the car has braked');
  assert.match(panelText(energy.view()), /The tape can differ from this sum by a few centimetres, because the sum uses rounded numbers and the game works out each stop in steps of 1\/120 of a second/, 'the difference is said, with its reason');
  assert.match(panelText(energy.view()), /passive drag is part of a; without it the stop would be 0\.6 m longer/);
  assert.match(panelText(energy.view()), /\(44\.70 m\/s ÷ 22\.35 m\/s\)\^2 = 4\.00 times the road/);
  {
    energy.act('go'); until(energy, x => x.ready);
    assert.match(energy.view().brian.text, /the mass cancels and leaves d = v² ÷ \(2 × a\)/);
    assert.match(panelText(energy.view()), /The tape reads 47\.2 m\./, 'the reading shows once the car has stopped');
  }
  const before = energy.view().formulas[2].worked;
  energy.act('speed:up');
  assert.notEqual(energy.view().formulas[2].worked, before, 'the word step stays open, and the sum follows the dial');
  assert.equal(energy.view().ready, true);
  const words = energy.view().brian.text;
  assert.ok(!/from 177 km\/h/.test(words), 'its closing words stay true at any speed');
});

test('the free test: the sums follow the dial and the car, only different settings count, and three open Continue', () => {
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  assert.ok(!free.view().ready);
  assert.equal(free.view().dial.kmh, 80); assert.equal(free.view().car.name, 'Falcone F42');
  assert.equal(free.view().lever, null);
  assert.match(free.view().formulas.at(-1).worked, /\(22\.35 m\/s\)\^2 ÷ \(2 × 21\.19 m\/s\^2\) = 11\.79 m/, 'the sum shows before the run');
  assert.doesNotMatch(free.view().formulas.at(-1).note, /The tape reads/, 'the tape has no reading until the car has stopped');
  free.act('speed:up');
  assert.match(free.view().formulas.at(-1).worked, /\(26\.82 m\/s\)\^2/, 'the dial changes the sum');
  free.act('speed:down');
  free.act('car:next');
  assert.equal(free.view().car.name, 'Stuttgart 959-S');
  assert.match(free.view().formulas.at(-1).worked, /2 × 23\.52 m\/s\^2/, 'the car changes the sum');
  free.act('car:prev');
  brake(free);
  assert.match(free.view().brian.text, /^The Falcone F42 stopped from 80 km\/h in 11\.8 m\. The sum predicted 11\.79 m/);
  assert.match(free.view().formulas.at(-1).note, /The tape reads 11\.8 m\./);
  free.act('speed:up');
  assert.doesNotMatch(free.view().formulas.at(-1).note, /The tape reads/, 'a new setting has no reading yet');
  free.act('speed:down');
  assert.ok(!free.view().ready);
  brake(free);
  assert.ok(!free.view().ready, 'the same setting again does not count as a different one');
  assert.equal(free.view().table.length, 2, 'the table keeps every result');
  free.act('speed:up'); brake(free);
  assert.ok(!free.view().ready);
  free.act('car:next'); brake(free);
  assert.ok(free.view().ready, 'three different settings open Continue');
  assert.equal(free.view().table.at(-1).car, 'Stuttgart 959-S');
  assert.ok(benchAttempts(free.view()).some(a => a.input.car === 'stuttgart_959s'), 'the bench is told which car ran');
});

test('Show me on the free test tries a different setting each time, so it reaches three and finishes', () => {
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  for (let i = 0; i < FREE_TRIES; i++) {
    assert.ok(!free.view().ready, `not ready after ${i} tests`);
    for (let k = 0; k < 3; k++) free.act('help');
    const v = free.view();
    assert.ok(v.pointer, 'Brian points');
    assert.ok(targetPoint(v, v.pointer.action), 'at a place on the board');
    if (i > 0) assert.match(v.brian.text, /I will turn the dial to \d+ km\/h, and then brake/, 'his words say what he will do');
    run(free, SHOW_ME_S + .1);
    until(free, x => x.keys.Space === 'go', 20);
  }
  assert.ok(free.view().ready, 'three Show mes finish the free test');
  assert.equal(new Set(free.view().table.map(r => `${r.car}/${r.kmh}`)).size, FREE_TRIES);
});

test('nothing before the guess in “Twice the speed” says or shows its answer', () => {
  const session = createClassroomSession(lesson);
  for (;;) {
    const id = session.view().step.id;
    const check = v => {
      const words = [v.say, ...v.hints, v.prompt, panelText(v), ...v.page.flatMap(row => [row.setup, row.result])].filter(Boolean).join(' ');
      assert.doesNotMatch(words, /four times|47\.\d|v\^2|\bsquare\b/i, `${id}: ${words}`);
      assert.ok(!v.lanes.some(l => l.done && l.stopMetres > 40), `${id}: no lane shows the stop from 161 km/h`);
    };
    check(session.view());
    if (id === 'try-speed') break;
    if (id === 'wonder' || id === 'watch') until(session, x => x.ready);
    else if (id === 'word-speed') setTo(session, 100);
    else if (id === 'word-balance') { session.act('lever:front'); session.act('lever:front'); }
    else { session.act('go'); until(session, x => x.ready); }
    check(session.view());
    session.act('next');
  }
  setTo(session, 100); session.act('go');
  assert.equal(session.view().cards.length, 3);
  assert.ok(session.view().hints.every(h => !/four times|energy/i.test(h)), 'the hints leave the guess open');
  session.act('answer:1'); until(session, x => x.ready);
  session.act('next');
  assert.equal(session.view().step.id, 'word-energy', 'the reason comes straight after the guess');
});

test('the wonder stops when the slower car has stopped, with the faster car still moving past the line', () => {
  const session = createClassroomSession(lesson);
  until(session, x => x.ready);
  const [slow, fast] = session.view().lanes;
  assert.equal(slow.done, true); assert.equal(fast.done, false);
  assert.ok(fast.metres > 30, 'past the line');
  assert.equal(Math.round(fast.ms * 3.6), 80);
  assert.match(session.view().brian.text, /had already passed the line and was still travelling at 80 km\/h/);
  run(session, 2);
  assert.equal(session.view().lanes[1].metres, fast.metres, 'the picture holds there');
});

test('the wording faults found in review stay gone', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-balance');
  assert.match(session.view().say, /In this game, the back tyres/);
  assert.match(session.view().say, /more braking at the front causes no slide, and the lever does not change the stopping distance/);
  assert.doesNotMatch(session.view().say, /\bask\b/);
  for (const front of [50, 70, 90]) assert.equal(stopOf(50, front).stopMetres, stopOf(50, 70).stopMetres, 'what the words say of the lever is what the game does');
  assert.equal(stopOf(50, 90).rearSlides, false);
  playThroughTo(session, 'check-four');
  assert.equal(session.view().prompt, 'Pick a card by clicking it, or press 1, 2 or 3.');
  playThroughTo(session, 'recap');
  assert.match(session.view().ideas[2].text, /^If the back brakes do more than 31% of the braking, which is the share of the weight on the back tyres/);
});

test('the panel never gives away an open guess or question', () => {
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  setTo(speed, 100);
  for (const stage of ['the dial is set', 'the cards are open']) {
    const shown = panelText(speed.view());
    assert.doesNotMatch(shown, /47\.\d|4\.00 times|four times/i, `${stage}: ${shown}`);
    if (stage === 'the dial is set') speed.act('go');
  }
  assert.equal(speed.view().cards.length, 3);
  speed.act('answer:1');
  assert.doesNotMatch(panelText(speed.view()), /47\.\d/, 'nor while the car is still braking');
  until(speed, x => x.ready);
  assert.match(panelText(speed.view()), /47\.2 m ÷ 11\.8 m = 4\.00/, 'the comparison shows once the car has stopped');

  const session = createClassroomSession(lesson);
  playThroughTo(session, 'check-four');
  assert.doesNotMatch(panelText(session.view()), /47\.\d|11\.\d|times/);
  session.act('answer:1');
  assert.match(panelText(session.view()), /47\.15 m/);
  session.act('next');
  assert.equal(session.view().step.id, 'check-balance');
  assert.doesNotMatch(panelText(session.view()), /\d+%/, 'no share settles the question while it is open');
  session.act('answer:2');
  assert.match(panelText(session.view()), /20% < 31%/);
  session.act('next');
  assert.equal(session.view().step.id, 'check-game');
  assert.doesNotMatch(panelText(session.view()), /\d%/, 'neither figure of the Tune page shows while the question is open');
  session.act('answer:0');
  assert.match(panelText(session.view()), /= \+2%/);
});

test('the pads appear only once weight shift has been explained', () => {
  const session = createClassroomSession(lesson);
  for (const id of ['word-speed', 'word-stopping', 'word-deceleration']) { playThroughTo(session, id); assert.equal(session.view().close.plain, true, id); }
  playThroughTo(session, 'word-weight');
  assert.ok(!session.view().close.plain, 'the pads show from the step that defines them');
});

test('every hint and message points the right way from any setting, and Show me says what it will do', () => {
  const low = createClassroomSession(lesson);
  playThroughTo(low, 'try-speed');
  low.act('go');
  assert.match(low.view().brian.text, /press ↑ until the dial reads 161/);
  assert.match(low.view().hints[1], /Press ↑ until the dial reads 161/);
  assert.match(low.view().hints[2], /I will turn the dial, and then you can guess/, 'Show me stops at the question, and says so');
  setTo(low, 130);
  low.act('go');
  assert.match(low.view().brian.text, /press ↓ until the dial reads 161/, 'above the answer, the dial turns down');
  assert.match(low.view().hints[1], /Press ↓ until the dial reads 161/);
  setTo(low, 100);
  assert.match(low.view().hints[1], /^The dial is set, so press Space/);
  assert.match(low.view().hints[2], /I will press Space, and then you can guess/);

  const slide = createClassroomSession(lesson);
  playThroughTo(slide, 'try-slide');
  brake(slide);
  assert.match(slide.view().hints[1], /Press → until the lever reads 70% front/);
  setTo(slide, 50, 90);
  assert.match(slide.view().hints[1], /^The lever is far enough toward the front/, 'past the answer, no more presses of →');
});

test('a step’s opening words do not change with a dial or a lever, because the page keeps them', () => {
  for (const [id, press] of [['word-speed', 'speed:up'], ['word-balance', 'lever:front'], ['word-energy', 'speed:up'], ['try-free', 'speed:up'], ['try-speed', 'speed:up']]) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const first = session.view().say;
    session.act(press);
    assert.equal(session.view().say, first, `${id}: the opening words stay the same`);
  }
});

test('the sums on the screen add up from the figures shown', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  for (const gap of CORNERS) { setTo(session, fastestFor(gap), STEADY_FRONT); brake(session); }
  const said = session.view().brian.text;
  assert.match(said, /53\.64 m\/s, is twice the speed at the first, 26\.82 m\/s/);
  assert.equal(53.64, 2 * 26.82);
  assert.match(said, /67\.9 m is about four times the first stop of 17\.0 m/, '67.9 is not exactly 4 × 17.0, so it says about');
  assert.equal(Number((4 * 11.8).toFixed(1)), 47.2);
});

test('the tries: Space at the wrong speed, every wrong guess and every slide says why with its numbers', () => {
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'try-speed');
  assert.equal(speed.view().dial.speed, 50, 'it starts away from its answer');
  speed.act('go');
  assert.match(speed.view().brian.text, /press ↑ until the dial reads 161/);
  setTo(speed, 100); speed.act('go');
  assert.equal(speed.view().cards.length, 3, 'set up, then guess from pictures of results');
  speed.act('answer:2'); until(speed, x => x.ready);
  assert.match(speed.view().brian.text, /^The car needed 47\.2 m, which is four times 11\.8 m rather than eight times/);

  const twice = createClassroomSession(lesson);
  playThroughTo(twice, 'try-speed');
  setTo(twice, 100); twice.act('go'); twice.act('answer:0'); until(twice, x => x.ready);
  assert.match(twice.view().brian.text, /^The car needed 47\.2 m, not twice 11\.8 m\. It needed four times the road, because 4 × 11\.8 m = 47\.2 m\. The next step explains why/);

  const slide = createClassroomSession(lesson);
  playThroughTo(slide, 'try-slide');
  assert.equal(slide.view().lever.front, 50); assert.equal(slide.view().dial.locked, true);
  brake(slide);
  assert.match(slide.view().brian.text, /^The back of the car slid, because the back brakes did 50% of the braking, which is more than the 31% of the weight on the back tyres\. Press →/);
  assert.equal(slide.view().ready, false);
  setTo(slide, 50, 60); brake(slide);
  assert.match(slide.view().brian.text, /^The back of the car is still sliding at 60% front, because the back brakes did 40% of the braking, which is more than the 31%/);
  setTo(slide, 50, 70); brake(slide);
  assert.match(slide.view().brian.text, /^At 70% front the back brakes did 30% of the braking, which is less than the 31%/);
  assert.equal(slide.view().ready, true);
});

test('Brian’s job: the fastest steady stop before each corner; too fast, too slow and a slide each say why', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().line, 20);
  assert.match(panelText(session.view()), /√\(2 × 21\.19 m\/s\^2 × 20 m\) = 29\.11 m\/s/, 'the panel works the gap’s fastest speed');
  setTo(session, 70, STEADY_FRONT); brake(session);
  assert.match(session.view().brian.text, /^From 113 km\/h the car needs 23\.1 m, but the gap is only 20 m, so the car ran 3\.1 m past the corner/);
  setTo(session, 50, STEADY_FRONT); brake(session);
  assert.match(session.view().brian.text, /^The car stopped 8\.2 m short of the corner\. From 97 km\/h the car would still stop in time, in 17\.0 m/);
  setTo(session, 60, 50); brake(session);
  assert.match(session.view().brian.text, /^The back of the car slid/);
  setTo(session, 60, STEADY_FRONT); brake(session);
  assert.match(session.view().brian.text, /^Correct\. From 97 km\/h the car stops in 17\.0 m, which is inside the 20 m gap/);
  assert.equal(session.view().line, 50); assert.equal(session.view().ready, false);
  for (const gap of CORNERS.slice(1)) { setTo(session, fastestFor(gap), STEADY_FRONT); brake(session); }
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /97, 161 and 193 km\/h/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and brakes', () => {
  for (const id of ['word-speed', 'word-stopping', 'word-deceleration', 'word-energy', 'word-weight', 'word-balance', 'try-speed', 'try-slide', 'alone']) {
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
    assert.match(session.view().brian.text, /^That is how it is done. /);
    if (id === 'try-speed') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'try-slide') { until(session, x => x.keys.Space === 'go', 10); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .1); }
    if (id === 'alone') for (let c = 1; c < CORNERS.length; c++) { until(session, x => x.keys.Space === 'go' && x.job.corner === c + 1, 15); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 30);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-four': [[0, /^The car needs more than twice as much road\. It needs 11\.8 m from 80 km\/h and 47\.2 m from 161 km\/h, which is four times as far/], [2, /^The two distances are not the same/]],
    'check-balance': [[0, /^At 50% front the back brakes do 50% of the braking, but the back tyres carry only 31%/], [1, /^At 60% front the back brakes do 40%/]],
    'check-game': [[1, /^It is a trade rather than a gain in both\. The Tune page shows “Braking \+2%; cornering grip while braking −4%\.”/], [2, /^The setting does change the car/]],
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
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  v = free.view();
  for (const action of ['car:next', 'car:prev']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  assert.ok(hoverInfo(v, ...targetPoint(v, 'car:next')), 'the car chooser is named');
  assert.ok(hoverInfo(v, 300, 200), 'the table is named');
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
    if (['word-stopping', 'word-deceleration', 'word-energy', 'word-weight', 'try-free'].includes(STEPS[i].id)) session.act('go');
    for (const t of [0, 1, 4]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
});

test('review fixes: turning the dial counts as busy; the slide try shows the slide first; the Tune page agrees with question 3', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-speed');
  for (let i = 0; i < 14; i++) { session.act(i % 2 ? 'speed:down' : 'speed:up'); run(session, 2); }
  assert.equal(session.view().nudge, null, 'a player turning the dial is not stuck');
  assert.equal(session.view().help, 0);
  playThroughTo(session, 'try-slide');
  session.act('lever:front');
  assert.equal(session.view().lever.front, 50, 'the lever waits until the back has slid once');
  assert.equal(session.view().keys['→'], undefined);
  brake(session);
  session.act('lever:front');
  assert.equal(session.view().lever.front, 60);
  const row = TUNE_ROWS.find(r => r.setting === 'brakes');
  assert.match(row.trade, /grips less in a turn while braking/);
  assert.doesNotMatch(row.trade, /keeps the car turning in/);
});

test('the old lesson’s faults are gone: settings carry, the dial steps in whole steps, and each try starts away from its answer', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-balance');
  session.act('lever:front'); session.act('lever:front');
  assert.equal(session.view().ready, true);
  session.act('lever:front');
  assert.equal(session.view().lever.front, 80, 'the lever stays free after the word, to go on watching the sum');
  assert.equal(session.view().ready, true);
  assert.match(session.view().formulas[0].worked, /20% < 31%/, 'and the sum follows it');
  session.act('next');
  playThroughTo(session, 'try-speed');
  assert.equal(session.view().lever.front, 80, 'the lever carries into the speed try where the player left it');
  session.act('speed:up');
  assert.equal(session.view().dial.speed, 60, 'one press is one step of the bench');
  assert.equal(session.view().dial.kmh, 97);
  playThroughTo(session, 'try-slide');
  assert.equal(session.view().lever.front, 50, 'the slide try starts on a setting that slides');
  playThroughTo(session, 'alone');
  assert.equal(session.view().lever.front, STEADY_FRONT, 'the steady lever carries into Brian’s job');
  assert.notEqual(session.view().dial.speed, fastestFor(CORNERS[0]), 'the job starts away from its answer');
});
