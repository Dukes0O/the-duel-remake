// LAB-CLASSROOM-FUEL (docs/board/cards/LAB-CLASSROOM-FUEL.md): Fuel and weight as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, DAYS, HALF, WEIGH_LITRES, WEIGH_KG, HALF_TANK_LINE, FREE_CARS, FREE_TRIES, TARGET_KMH, TARGET_MS, toTarget, leastLitres, secondsTo100, secondsOf, sumsOf, gapAtWin, benchAttempts, KEY_IDEAS, CHALLENGE_CARD, WORDS, PASS_SAY} from '../src/lab/lessons/fuel-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, STRIP} from '../src/lab/lessons/fuel-board.js';
import {fuelBench, zeroToSixty, FUEL_RIG, PETROL_KG_PER_LITRE} from '../src/lab/benches/tunnel.js';
import {dragAt, lastsShare, SIXTY_MS, TANK_LITRES} from '../src/lab/benches/fuel.js';
import {LAB_TUNE} from '../src/lab/lab-tune.js';
import {effectLine} from '../src/lab/tune-view.js';
import {CARS} from '../src/config.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.fuel;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const pourTo = (session, litres) => {
  for (let i = 0; i < 20 && session.view().litres > litres; i++) session.act('pour:out');
  for (let i = 0; i < 20 && session.view().litres < litres; i++) session.act('pour:in');
  assert.equal(session.view().litres, litres);
};
// A race on the free test: Space, and the car parks again.
const raceFree = session => { session.act('go'); until(session, x => x.free.can); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-fuel-load') pourTo(session, TANK_LITRES);
    else if (step === 'word-litre') { session.act('fill'); until(session, x => x.ready); }
    else if (step === 'word-kilogram') { session.act('weigh:water'); session.act('weigh:petrol'); }
    else if (step === 'word-speed') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-free') for (const litres of [70, 35, 0]) { pourTo(session, litres); raceFree(session); }
    else if (step === 'try-half') { pourTo(session, HALF); session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-weigh') { pourTo(session, WEIGH_LITRES); session.act('go'); }
    else if (step === 'alone') for (const day of DAYS) { pourTo(session, leastLitres(day.share)); session.act('go'); until(session, x => x.step.id === 'alone' && (x.ready || x.job.day > DAYS.indexOf(day) + 1)); }
    else if (step === 'check-race') session.act('answer:1');
    else if (step.startsWith('check')) session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}
// The challenge path in lab-view.js, as it feeds a lesson's machine runs to the bench.
function benchPasses(attempts) {
  let bench = openBench('fuel');
  for (const attempt of attempts) {
    for (const c of bench.bench.controls) bench = setControl(bench, c.id, c.value);
    for (const c of attempt.controls) if (Object.hasOwn(attempt.input, c.id)) bench = setControl(bench, c.setting ?? c.id, c.values?.[Math.round(attempt.input[c.id])] ?? attempt.input[c.id]);
    bench = runBench(bench);
  }
  return goalMet(bench);
}
const sumOf = (view, title) => view.formulas.find(f => f.title.startsWith(title))?.worked;
// Every word a step can show before anything happens in it.
function stepWords(id) {
  const model = lesson.createModel();
  model.enter(STEPS.findIndex(s => s.id === id));
  const v = model.view();
  return [v.say, v.prompt, ...v.hints, ...v.formulas.flatMap(f => [f.title, f.formula, f.worked, f.note]), ...v.cards.map(c => c.label)].filter(Boolean).join(' ');
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and finishes on the bench', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['fuel-word-1', 'fuel-word-2', 'fuel-word-0'], 'the old lesson’s notebook ids, litre first because the fuel load is measured in litres');
  assert.deepEqual(lesson.words.map(w => w.word), ['Fuel load', 'Litre', 'Kilogram']);
  assert.equal(lesson.name, 'Fuel and weight');
  assert.equal(lesson.finishLabel, 'Finish the lesson');
});

test('every number is the fuel bench’s own run, and Brian’s job is the game’s Grand Prix tank', () => {
  for (const litres of [0, 35, 50, 70]) {
    const r = fuelBench.run({litres});
    assert.equal(secondsTo100(litres), toTarget(r.zeroToSixtyS));
    assert.ok(Math.abs(secondsTo100(litres) - r.zeroToSixtyS * (100 / 3.6) / SIXTY_MS) < 1e-9, 'the bench’s time, carried on to 100 km/h');
    assert.ok(Math.abs(100 / 3.6 / secondsTo100(litres) - SIXTY_MS / r.zeroToSixtyS) < 1e-9, 'at the bench’s own acceleration');
    assert.equal(r.zeroToSixtyS, zeroToSixty(fuelBench.controls[0].value, litres).seconds);
    assert.equal(r.fuelKg, litres * PETROL_KG_PER_LITRE);
  }
  assert.equal(secondsTo100(70).toFixed(2), '3.27'); assert.equal(secondsTo100(35).toFixed(2), '3.20'); assert.equal(secondsTo100(0).toFixed(2), '3.13');
  assert.equal(WEIGH_KG.toFixed(1), '37.0');
  assert.equal(Math.round(gapAtWin(35, 70) * 100), 92, 'the half tank is 92 cm ahead when it reaches the speed');
  // The drag strip: the same push all the way, and the bench's speed at the bench's own time.
  const benchS = fuelBench.run({litres: 70}).zeroToSixtyS, d = dragAt(70, benchS);
  assert.ok(Math.abs(d.mph - FUEL_RIG.upToMph) < 1e-9 && Math.abs(d.metres - SIXTY_MS * benchS / 2) < 1e-9);
  // The Grand Prix: a full tank lasts 110%, so the least the pump pours for each race is 35, 50 and 65 litres.
  assert.equal(lastsShare(TANK_LITRES), LAB_TUNE.fuel.fullTankRaceShare);
  assert.equal(lastsShare(HALF), LAB_TUNE.fuel.fullTankRaceShare * (1 - 2 * LAB_TUNE.fuel.loadPerStep), 'half a tank lasts what the Tune page says');
  assert.deepEqual(DAYS.map(d => leastLitres(d.share)), [35, 50, 65]);
  for (const d of DAYS) assert.ok(lastsShare(leastLitres(d.share)) >= d.share && lastsShare(leastLitres(d.share) - 5) < d.share);
  assert.equal(HALF_TANK_LINE, effectLine('fuel', 2), 'question 3 shows the Tune page’s own line');
});

test('the sums: the speed is honest in km/h and m/s, and every sum comes out on a calculator and agrees with the stopwatch', () => {
  assert.equal(TARGET_KMH, 100, 'the lesson’s speed in km/h');
  assert.equal(Math.round(TARGET_KMH), TARGET_KMH, 'a whole number, so nothing is rounded');
  assert.equal(TARGET_MS, Number((100 / 3.6).toFixed(3)));
  assert.equal(TARGET_MS, 27.778);
  for (const car of FREE_CARS) for (let litres = 0; litres <= TANK_LITRES; litres += 5) {
    const s = sumsOf(litres, car), r = fuelBench.run({car, litres});
    assert.equal(s.fuel, Number((litres * .74).toFixed(2)));
    assert.equal(s.total, Number((s.empty + s.fuel).toFixed(2)));
    assert.equal(s.total.toFixed(1), r.carMassKg.toFixed(1), `${car}/${litres}: the total mass is the bench’s`);
    assert.equal(s.accel, Number((s.force / s.total).toFixed(3)));
    assert.equal(s.time, Number((TARGET_MS / s.accel).toFixed(2)));
    assert.equal(s.time.toFixed(2), secondsOf(litres, car).toFixed(2), `${car}/${litres}: the sum and the stopwatch agree`);
    assert.equal(secondsOf(litres, car), toTarget(r.zeroToSixtyS), `${car}/${litres}: the stopwatch is the bench’s run carried on to 100 km/h`);
  }
  assert.deepEqual([70, 35, 0].map(l => sumsOf(l).accel), [8.494, 8.673, 8.861]);
  assert.equal(sumsOf(70).force, 10617);
  assert.equal(sumsOf(0).empty, 1198.2);
});

test('the free test’s cars burn petrol, and an electric car is explained, not raced', () => {
  for (const car of FREE_CARS) { assert.ok(CARS[car], car); assert.notEqual(CARS[car].electric, true, `${car} is a petrol car`); }
  assert.ok(FREE_CARS.length >= 3);
  assert.match(stepWords('recap'), /An electric car carries batteries instead, and a battery has the same mass whether it is full or empty/);
});

test('a child who does exactly what each prompt says passes every step, and the lesson’s runs pass the bench', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.scene, 'recap'); assert.equal(v.ideas.length, 3); assert.ok(v.last);
  assert.equal(v.step.voice, 'lab.brian.fuel.explain');
  assert.equal(benchPasses(benchAttempts(v)), true, 'a full tank and half a tank were raced');
  assert.equal(benchPasses(benchAttempts({runs: [50, 65]})), false, 'without them the bench does not pass');
  assert.equal(benchPasses(benchAttempts({runs: [70]})), false);
});

test('pouring: ↑ pours in and ↓ pours out, 5 litres a press, with the litres, kilograms and sum shown as they change', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-fuel-load');
  assert.equal(session.view().litres, 0);
  assert.deepEqual(session.view().keys, {'↑': 'pour:in'}, 'filling the tank needs only ↑');
  assert.equal(sumOf(session.view(), 'Mass of the petrol'), '0 litres × 0.74 kg per litre = 0.0 kg');
  session.act('pour:in'); assert.equal(session.view().litres, 5);
  assert.match(session.view().prompt, /^The tank holds 5 litres\./);
  assert.equal(sumOf(session.view(), 'Mass of the petrol'), '5 litres × 0.74 kg per litre = 3.7 kg', 'the sum follows the press');
  // A held key keeps pouring, but not faster than a pour every 0.14 s.
  session.act('pour:in:held'); assert.equal(session.view().litres, 5);
  run(session, .2); session.act('pour:in:held'); assert.equal(session.view().litres, 10);
  pourTo(session, TANK_LITRES);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^A full tank holds 70 litres of petrol, and that petrol has a mass of 51\.8 kg\./);
  // The word step stays open, so the player can go on watching the sum, and its closing words stay true.
  const closing = session.view().brian.text;
  session.act('pour:out');
  assert.equal(session.view().litres, 65); assert.equal(session.view().ready, true);
  assert.equal(sumOf(session.view(), 'Mass of the petrol'), '65 litres × 0.74 kg per litre = 48.1 kg');
  assert.equal(session.view().brian.text, closing);
  session.act('next'); session.act('go'); until(session, x => x.ready);
  session.act('next'); until(session, x => x.ready);
  session.act('next'); playThroughTo(session, 'try-half');
  assert.equal(session.view().litres, 70, 'the tank starts full, so the first ↓ pours 5 litres out, not all of it');
  session.act('pour:out');
  assert.equal(session.view().litres, 65); assert.equal(session.view().kg.toFixed(1), '48.1');
  assert.match(session.view().prompt, /^The tank holds 65 litres of petrol, which is 48\.1 kg\./);
  session.act('pour:in'); session.act('pour:in');
  assert.equal(session.view().litres, 70);
  assert.equal(session.view().brian.text, 'The tank is full, with 70 litres.');
  session.act('pour:out');
  assert.notEqual(session.view().brian.text, 'The tank is full, with 70 litres.', 'the words go as soon as they stop being true');
  const words = createClassroomSession(lesson);
  playThroughTo(words, 'word-kilogram');
  assert.equal(words.view().prompt, 'Press 1 for the water and 2 for the petrol, or click a jug.');
  words.act('weigh:petrol');
  assert.match(words.view().brian.text, /^One litre of petrol has a mass of 0\.74 kg\. Now weigh the litre of water by pressing 1\./);
  assert.equal(words.view().prompt, 'Press 1 to weigh the water, or click its jug.', 'the prompt does not ask for what is done');
  words.act('weigh:water');
  assert.match(words.view().brian.text, /^Each jug holds the same space, one litre, but the water has a mass of 1\.00 kg and the petrol has a mass of 0\.74 kg\./);
  assert.equal(words.view().formulas.find(f => f.title === 'Petrol').worked, '0.74 kg ÷ 1 litre = 0.74 kg per litre');
});

test('the tries: a wrong pour says why with the real litres, kilograms and times, and the race still runs', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-half');
  pourTo(session, 50); session.act('go'); until(session, v => v.step.id === 'try-half' && v.lanes.every(l => l.done) && !/Watch/.test(v.brian.text));
  assert.equal(session.view().brian.text, '50 litres is more than half, and that car stopped the stopwatch at 3.23 s against 3.27 s for the full tank. Half of 70 is 35, so pour out 15 more litres with ↓ and race again.');
  assert.equal(session.view().ready, false);
  pourTo(session, 20); session.act('go'); until(session, v => /less than half/.test(v.brian.text));
  assert.equal(session.view().brian.text, '20 litres is less than half. That car won, stopping the stopwatch at 3.17 s against 3.27 s for the full tank, but half of 70 is 35, so pour in 15 litres with ↑ and race again.');
  pourTo(session, 35); session.act('go'); until(session, v => v.ready);
  assert.equal(session.view().brian.text, 'A tank holding 35 litres, half of 70, carries 25.9 kg of petrol. That car reached 100 km/h in 3.20 s and the full tank reached it in 3.27 s, so the car with half a tank was 92 cm ahead when it got there.');
  session.act('next');
  assert.equal(session.view().covered, true, 'the second try covers the gauge');
  // By mass: the player can pour past the mass; Space weighs it and the scale says how far off, and which way.
  for (let i = 0; i < 5; i++) session.act('pour:out');
  assert.equal(session.view().litres, 45, 'nothing stops the pour on the mass');
  assert.equal(session.view().ready, false);
  session.act('go');
  assert.equal(session.view().brian.text, 'The scale reads 33.3 kg, which is 3.7 kg too light. Each press of ↑ pours in 3.7 kg.');
  assert.equal(session.view().help, 1, 'a wrong weighing climbs one rung of help');
  session.act('pour:in'); session.act('pour:in'); session.act('go');
  assert.equal(session.view().brian.text, 'The scale reads 40.7 kg, which is 3.7 kg too heavy. Each press of ↓ lets out 3.7 kg.');
  assert.ok(!/litres/.test(session.view().brian.text), 'under the cloth Brian does not say the litres');
  session.act('pour:out'); session.act('go');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^The scale reads 37\.0 kg, which is correct\. Every litre has a mass of 0\.74 kg, so 37\.0 kg of petrol fills 50 litres of the tank\./);
  const full = createClassroomSession(lesson);
  playThroughTo(full, 'try-weigh');
  full.act('pour:in');
  assert.equal(full.view().brian.text, 'The tank is full.', 'the full tank is not given away in litres');
});

test('Brian’s job: too little runs out, too much carries extra mass, and that race goes again', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().job.name, 'Half a Grand Prix');
  assert.equal(session.view().litres, 70, 'the tank starts full');
  assert.equal(sumOf(session.view(), 'How far the petrol lasts'), '70 ÷ 70 × 110% = 110%');
  session.act('go'); until(session, v => /extra mass/.test(v.brian.text));
  assert.equal(session.view().brian.text, 'The car finished, but 70 litres lasts 110% of a Grand Prix, so 35 litres, which is 25.9 kg, was extra mass that the car carried for nothing. Set the tank to 35 litres and race again.');
  assert.equal(session.view().help, 1, 'a failed race climbs one rung of help');
  pourTo(session, 30); session.act('go');
  assert.equal(sumOf(session.view(), 'How far the petrol lasts'), '30 ÷ 70 × 110% = 47.1%', 'the sum follows the pour, with enough decimals to compare');
  const sounds = [];
  for (let t = 0; t < 5 && !/ran out/.test(session.view().brian.text); t += .05) { session.tick(.05); sounds.push(...session.takeEvents().filter(e => e.sound).map(e => e.sound)); }
  assert.ok(sounds.includes('car.sputter'), 'the engine coughs when it runs dry');
  assert.equal(session.view().brian.text, '30 litres lasts about 47% of a Grand Prix, so the car ran out of petrol before the flag. Half a Grand Prix uses about 32 litres and the pump pours 5 litres at a time, so set the tank to 35 litres and race again.');
  assert.ok(session.view().job.race.dry && session.view().job.race.at < 1);
  assert.equal(session.view().job.day, 1, 'the same race again');
  pourTo(session, 35); session.act('go'); until(session, v => v.job.day === 2);
  assert.match(session.view().brian.text, /^Correct\. 35 litres lasts 55% of a Grand Prix, which is just enough for this race\. The next race is three quarters of a Grand Prix, and the tank is full again\./);
  assert.equal(session.view().litres, 70);
  pourTo(session, 50); session.act('go'); until(session, v => v.job.day === 3);
  pourTo(session, 65); session.act('go'); until(session, v => v.ready);
  assert.equal(session.view().brian.text, 'You finished all three races with just enough petrol. You left 60 litres behind, which is 44.4 kg that the car never carried. That finishes the job.');
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me pours (and races) for the player', () => {
  for (const id of ['word-fuel-load', 'word-litre', 'word-kilogram', 'word-speed', 'try-free', 'try-half', 'try-weigh', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action === 'pour:best') assert.equal(hitTest(v, ...at)?.action, v.best > v.litres ? 'pour:in' : 'pour:out', `${id}: a click where Brian points pours the right way`);
    run(session, SHOW_ME_S + .2);
    assert.match(session.view().brian.text, /^That is how it is done. /);
    if (id === 'word-kilogram') { for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); }
    if (id === 'try-free') for (let i = 1; i < FREE_TRIES; i++) { until(session, x => x.free.can && x.free.rows.length === i, 10); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); }
    if (id === 'alone') for (let i = 1; i < DAYS.length; i++) { until(session, x => x.job.day === i + 1 && !x.job.race, 10); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); }
    until(session, x => x.ready, 30);
  }
});

test('Show me on the free test tries a different setting each time, and says what it will really do', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  const tested = [];
  for (let i = 0; i < FREE_TRIES; i++) {
    const v = session.view();
    assert.equal(v.ready, false);
    if (i === 0) { assert.equal(v.target, 'go', 'the first setting is untested, so Brian only races'); assert.match(v.hints[2], /race with the settings as they are/); }
    else { assert.equal(v.target, 'pour:best'); assert.match(v.hints[2], new RegExp(`set the tank to ${v.best} litres`)); }
    for (let k = 0; k < 3; k++) session.act('help');
    run(session, SHOW_ME_S + .2);
    until(session, x => x.lanes[0].seconds != null, 10);
    tested.push(session.view().lanes[0].litres);
    until(session, x => x.free.can && x.free.rows.length === i + 1, 10);
  }
  assert.equal(new Set(tested).size, FREE_TRIES, `three different settings: ${tested}`);
  assert.equal(session.view().ready, true, 'and Continue opens');
  assert.equal(session.view().free.rows.length, FREE_TRIES);
});

test('hints and prompts say the right way to turn the tap from every setting', () => {
  for (const [id, want, word] of [['try-half', HALF, 'gauge'], ['try-weigh', WEIGH_LITRES, 'scale']]) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    for (const litres of [70, want + 5, want - 5, 0]) {
      pourTo(session, litres);
      assert.match(session.view().hints[1], new RegExp(`Press ${litres > want ? '↓' : '↑'} until the ${word} reads`), `${id} from ${litres} litres`);
      assert.match(session.view().hints[2], /pour the petrol/);
    }
    pourTo(session, want);
    assert.match(session.view().hints[1], /so press Space\./, 'no press is asked for at the right setting');
    assert.match(session.view().hints[2], id === 'try-half' ? /I will race\./ : /I will weigh the petrol\./, 'Brian only does what is left to do');
    assert.match(session.view().prompt, id === 'try-half' ? /Press Space to race\.$/ : /Press Space to weigh it\.$/);
  }
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  pourTo(job, 35);
  assert.match(job.view().prompt, /Press Space to race\.$/);
  assert.match(job.view().hints[2], /I will race\./);
});

test('the free test: the sums show first, every press changes them, the table keeps the results, and only different settings count', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  let v = session.view();
  assert.equal(v.ready, false);
  assert.equal(sumOf(v, 'Total mass'), '1,198.2 kg + 51.8 kg = 1,250.0 kg', 'the sum shows before any race');
  assert.equal(sumOf(v, 'Acceleration'), '10,617 N ÷ 1,250.0 kg = 8.494 m/s^2');
  assert.equal(sumOf(v, 'Time'), '27.778 m/s ÷ 8.494 m/s^2 = 3.27 s');
  session.act('pour:out');
  assert.equal(sumOf(session.view(), 'Mass of the petrol'), '65 litres × 0.74 kg per litre = 48.1 kg', 'the gauge moves the sums');
  assert.equal(sumOf(session.view(), 'Total mass'), '1,198.2 kg + 48.1 kg = 1,246.3 kg');
  pourTo(session, 35);
  assert.equal(sumOf(session.view(), 'Acceleration'), '10,617 N ÷ 1,224.1 kg = 8.673 m/s^2');
  assert.equal(sumOf(session.view(), 'Time'), '27.778 m/s ÷ 8.673 m/s^2 = 3.20 s');
  session.act('car:next');
  assert.equal(session.view().free.car, 'Falcone Sirena');
  assert.equal(sumOf(session.view(), 'Acceleration'), '7,329 N ÷ 784.1 kg = 9.347 m/s^2', 'the car moves the sums');
  raceFree(session);
  assert.match(session.view().brian.text, /^The Falcone Sirena with 35 litres has a total mass of 784\.1 kg and an acceleration of 9\.347 m\/s², and the stopwatch stopped at 2\.97 s\. With a full tank this car stops the stopwatch at 3\.07 s, so carrying 35 fewer litres saved 0\.10 s\. Change a setting and test a different one\./);
  assert.equal(session.view().ready, false);
  raceFree(session);
  assert.equal(session.view().ready, false, 'the same setting again does not count as a different one');
  assert.equal(session.view().free.rows.length, 2, 'but the table keeps it');
  session.act('car:next'); session.act('car:next');
  assert.equal(session.view().free.car, 'Titan Monster');
  raceFree(session);
  assert.equal(session.view().ready, false);
  pourTo(session, 30);
  raceFree(session);
  assert.equal(session.view().ready, true, 'three different settings open Continue');
  assert.equal(session.view().free.rows.length, 4);
  session.act('car:next');
  assert.equal(session.view().free.car, 'Falcone F42', 'the cars go round');
  pourTo(session, 70); raceFree(session);
  assert.match(session.view().brian.text, /Its tank is full, so no fuel load gives this car a longer time\./);
  // A small saving reads as what the stopwatch can show, never as 0.00 s.
  const titan = createClassroomSession(lesson);
  playThroughTo(titan, 'try-free');
  titan.act('car:prev'); assert.equal(titan.view().free.car, 'Titan Monster');
  pourTo(titan, 65); raceFree(titan);
  assert.match(titan.view().brian.text, /made no difference that the stopwatch can show/);
  assert.ok(!/0\.00 s/.test(titan.view().brian.text));
});

test('the panel: every step after the first has sums, and they are only what has been explained so far', () => {
  for (const [i, step] of STEPS.entries()) {
    if (i === 0) continue;
    const model = lesson.createModel();
    model.enter(i);
    const formulas = model.view().formulas;
    assert.ok(formulas.length > 0, `${step.id} shows the physics`);
    for (const f of formulas) assert.ok(f.title, `${step.id}: every panel entry has a heading`);
  }
  const model = lesson.createModel();
  model.enter(0);
  assert.deepEqual(model.view().formulas, [], 'the wonder shows no sums');
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'word-speed');
  assert.deepEqual(speed.view().formulas.map(f => f.title), ['Speed in metres per second']);
  assert.equal(speed.view().formulas[0].worked, '100 km/h ÷ 3.6 = 27.778 m/s');
  speed.act('go'); run(speed, 1);
  assert.equal(speed.view().formulas.length, 1, 'acceleration is not in the panel until Brian has defined it');
  until(speed, v => v.ready);
  assert.equal(sumOf(speed.view(), 'Acceleration'), '27.778 m/s ÷ 3.27 s = 8.49 m/s^2');
  assert.match(speed.view().brian.text, /This car’s acceleration is 8\.49 m\/s², which means that its speed rises by 8\.49 m\/s during every second/);
  assert.equal(speed.view().graph.rise, 8.49);
  speed.act('replay');
  assert.ok(speed.view().ready, 'racing again keeps the step done');
  assert.match(speed.view().say, /This car’s acceleration/, 'and keeps the words');
});

test('the panel never settles a question before the answer, and never shows the litres under the cloth', () => {
  for (const id of ['check-water', 'check-race', 'check-game']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const before = session.view();
    assert.ok(before.formulas.length > 0);
    assert.ok(before.formulas.every(f => !f.worked), `${id}: only general formulas until the answer`);
    assert.ok(!/\d\.\d/.test(before.formulas.map(f => `${f.formula} ${f.note ?? ''}`).join(' ')), `${id}: no figures that settle it`);
    assert.equal(before.laneSums, false);
    session.act('answer:0');
    assert.ok(session.view().formulas.some(f => f.worked), `${id}: the sums come with the answer`);
    assert.equal(session.view().laneSums, true);
  }
  const race = createClassroomSession(lesson);
  playThroughTo(race, 'check-race');
  race.act('answer:1');
  assert.deepEqual(race.view().formulas.map(f => f.worked), ['10,617 N ÷ 1,250.0 kg = 8.494 m/s^2', '10,617 N ÷ 1,224.1 kg = 8.673 m/s^2']);
  const weigh = createClassroomSession(lesson);
  playThroughTo(weigh, 'try-weigh');
  const words = () => weigh.view().formulas.flatMap(f => [f.title, f.formula, f.worked, f.note]).filter(Boolean).join(' ');
  for (let i = 0; i < 3; i++) weigh.act('pour:out');
  assert.equal(sumOf(weigh.view(), 'How far'), '40.7 kg − 37.0 kg = 3.7 kg', 'the sum follows the scale');
  assert.ok(!/55 litres|40 litres/.test(words()), 'the litres in the tank stay under the cloth');
  weigh.act('pour:out'); weigh.act('pour:out');
  assert.equal(sumOf(weigh.view(), 'How far'), '33.3 kg − 37.0 kg = −3.7 kg');
  weigh.act('pour:in');
  assert.ok(!/50 litres/.test(words()), 'not even when it is right, until the scale has been read');
  weigh.act('go');
  assert.equal(sumOf(weigh.view(), 'Litres'), '37.0 kg ÷ 0.74 kg per litre = 50 litres');
  assert.equal(sumOf(weigh.view(), 'How far'), '37.0 kg − 37.0 kg = 0.0 kg', 'the sum at the end still comes out');
});

test('a word appears only after the step that defines it, and a step’s opening words do not change with a control', () => {
  const firstUse = {'word-litre': /\blitres?\b|\bL\b/i, 'word-kilogram': /\bkilograms?\b|\bkg\b|\bdensity\b|\bmass\b/i, 'word-fuel-load': /\bfuel load\b/i, 'word-speed': /m\/s/, 'watch': /\bforce\b|\bnewtons?\b|\d N\b/i, 'alone': /\bGrand Prix\b|\bpit lane\b/};
  for (const [definer, pattern] of Object.entries(firstUse)) {
    const until = STEPS.findIndex(s => s.id === definer);
    for (const step of STEPS.slice(0, until)) assert.ok(!pattern.test(stepWords(step.id)), `${step.id} uses ${pattern} before ${definer} defines it: ${stepWords(step.id).match(pattern)?.[0]}`);
    assert.ok(pattern.test(stepWords(definer)), `${definer} defines ${pattern}`);
  }
  assert.match(stepWords('wonder'), /reach 100 kilometres per hour, which is written km\/h/);
  assert.match(stepWords('word-speed'), /metres per second, written m\/s/);
  assert.ok(!/acceleration|m\/s²|m\/s\^2/i.test(stepWords('word-speed')), 'acceleration waits for the race on the graph');
  // The wonder's board has no litres or kilograms on its labels yet.
  const session = createClassroomSession(lesson);
  assert.equal(session.view().plain, true);
  // The opening words stay when a control moves; the live number is in the prompt and the panel.
  for (const id of ['word-fuel-load', 'try-free', 'try-half', 'try-weigh', 'alone']) {
    const s = createClassroomSession(lesson);
    playThroughTo(s, id);
    const first = s.view().say;
    s.act(id === 'word-fuel-load' ? 'pour:in' : 'pour:out');
    assert.equal(s.view().say, first, `${id}: the opening words do not change with the tap`);
  }
});

test('the words: metric only, whole sentences, nothing without a mind decides, and the claims hold for every car', () => {
  for (const file of ['fuel-classroom.js', 'fuel-board.js']) {
    const source = readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8');
    for (const [fault, pattern] of [['she or her', /\b(she|her|hers|herself)\b/i], ['mph', /\bmph\b/i], ['decides', /\bdecides?\b/i], ['takes its speed', /\b(air|wind)\s+(soon\s+)?takes\b/i], ['sixty', /\bnought\b|\bsixty\b/i], ['an em dash', /—/]])
      assert.ok(!pattern.test(source), `${file} has ${fault}: ${source.match(pattern)?.[0]}`);
  }
  const all = [...STEPS.map(s => stepWords(s.id)), ...KEY_IDEAS.map(i => i.text), CHALLENGE_CARD.title, CHALLENGE_CARD.text, ...WORDS.map(w => w.meaning), PASS_SAY].join(' ');
  assert.ok(!/\bbench\b/i.test(all), 'the player is never told about a bench');
  assert.ok(!/\b(takes|took)\b/i.test(all), 'a car or a tank takes nothing');
  assert.ok(!/: /.test(all), 'no colon that skips a verb');
  assert.match(KEY_IDEAS.find(i => i.id === 'quicker').text, /the same car with less petrol accelerates faster/, 'a heavier car with a stronger engine can still be faster, so the claim is about the same car');
  assert.ok(Math.min(...[70, 0].map(l => secondsOf(l, 'banshee_muscle'))) < secondsOf(0), 'the free test shows that heavier is not slower across different cars');
  assert.ok(!/\ba car with less mass accelerates\b/i.test(all));
  assert.equal(lesson.passSay, 'You have passed Fuel and weight, and Fuel load is now open on the Tune page in the garage. A half tank accelerates faster, but in a Grand Prix its petrol runs out after 55% of the race.');
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-water': [1, /^A litre of petrol has a mass of 0\.74 kg and a litre of water has a mass of 1\.00 kg\./],
    'check-race': [2, /^They do not arrive together\. The car with half a tank reached 100 km\/h in 3\.20 s, and the car with a full tank reached it in 3\.27 s\. That left a gap of 92 cm/],
    'check-game': [1, /^A full tank lasts 110% of a Grand Prix, so half a tank lasts 55% and its petrol runs out just past half way\. With an empty tank the car has 40% of its acceleration until it stops in the pit lane\./],
  };
  for (const [id, [pick, why]] of Object.entries(answers)) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    // The board does not give the answer away before the player picks.
    const before = session.view();
    assert.equal(before.tune?.effect ?? null, null);
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
  }
  const race = createClassroomSession(lesson);
  playThroughTo(race, 'check-race');
  assert.ok(race.view().lanes.every(l => l.seconds == null), 'the cars wait at the start until the answer');
  race.act('answer:0'); until(race, v => v.lanes.every(l => l.done), 15);
  const [full, half] = race.view().lanes;
  assert.ok(half.winner && full.behindM > .8, 'the race shows the half tank winning');
  const game = createClassroomSession(lesson);
  playThroughTo(game, 'check-game');
  game.act('answer:2');
  assert.match(game.view().brian.text, /^The same car with less mass accelerates faster, so in the game a half tank accelerates and brakes 3% better\./);
  assert.equal(game.view().tune.effect, HALF_TANK_LINE);
});

test('mouse: the nozzle pours in, the tap pours out, the strip races, the jugs weigh, the car changes, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-half');
  let v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'pour:in'))?.action, 'pour:in');
  assert.equal(hitTest(v, ...targetPoint(v, 'pour:out'))?.action, 'pour:out');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  for (const point of [targetPoint(v, 'pour:in'), targetPoint(v, 'pour:out'), [180, 300], [180, 500], [358, 520]]) assert.ok(hoverInfo(v, ...point), `hover at ${point}`);
  const words = createClassroomSession(lesson);
  playThroughTo(words, 'word-kilogram');
  v = words.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'weigh:best'))?.action, 'weigh:water');
  words.act('weigh:water');
  v = words.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'weigh:best'))?.action, 'weigh:petrol');
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  v = free.view();
  assert.equal(hitTest(v, 344, 640)?.action, 'car:next');
  assert.equal(hitTest(v, 116, 640)?.action, 'car:prev');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  assert.ok(hoverInfo(v, 230, 600), 'the car panel is named');
  free.act('go');
  assert.deepEqual(Object.keys(free.view().keys), [], 'nothing changes while the car is racing');
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'word-speed');
  v = speed.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go', 'a click on the road starts the race');
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
    for (const t of [0, 2, 6]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
});

test('the races: one clock for every car, the lighter car ahead all the way, and the cars park at the end', () => {
  const session = createClassroomSession(lesson);
  run(session, 2);
  let [full, half] = session.view().lanes;
  assert.ok(half.metres > full.metres && half.kmh > full.kmh, 'the half tank is ahead while they speed up');
  until(session, v => v.ready);
  [full, half] = session.view().lanes;
  assert.equal(half.winner, true); assert.equal(full.winner, false);
  assert.ok(half.metres > full.metres && half.metres < STRIP.metres, 'they park on the strip, the winner in front');
  assert.equal(full.seconds, secondsTo100(70)); assert.equal(half.seconds, secondsTo100(35));
  assert.equal(Math.round(full.kmh), 100, 'the speed reads 100 km/h at the end');
  assert.ok(Math.abs(full.kmh - 100) < 1e-9 && Math.abs(half.kmh - 100) < 1e-9);
  session.act('replay');
  assert.ok(session.view().lanes.every(l => l.seconds == null), 'the race starts again');
  session.act('next') ; playThroughTo(session, 'watch');
  assert.equal(session.view().litres, 70);
  run(session, 1); assert.ok(session.view().litres < 70 && session.view().kg < 51.8, 'the scale falls as the tank empties');
  until(session, v => v.ready);
  assert.deepEqual(session.view().lanes.map(l => l.winner), [false, false, true], 'the empty tank wins');
  assert.match(session.view().brian.text, /each kilogram receives a larger share of the force, so the whole car accelerates faster/);
  assert.match(session.view().brian.text, /the empty tank beat the full tank by only 1\.8 m/);
  assert.deepEqual(session.view().formulas.map(f => f.worked).filter(Boolean), ['10,617 N ÷ 1,250.0 kg = 8.494 m/s^2', '10,617 N ÷ 1,224.1 kg = 8.673 m/s^2', '10,617 N ÷ 1,198.2 kg = 8.861 m/s^2']);
  assert.equal(STRIP.metres, 50);
  for (const car of FREE_CARS) assert.ok(TARGET_KMH / 3.6 * secondsOf(70, car) / 2 < STRIP.metres, `${car} stays on the strip`);
});

test('review fixes: the can holds only what went out of the tap; clicks land where things are drawn; Show me says what it did', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-fuel-load');
  session.act('pour:in'); session.act('pour:in');
  assert.equal(session.view().can, 0, 'filling the tank does not take petrol out of the can');
  pourTo(session, TANK_LITRES); session.act('next');
  playThroughTo(session, 'try-half');
  session.act('pour:out'); session.act('pour:out');
  assert.equal(session.view().can, 10);
  session.act('pour:in');
  assert.equal(session.view().can, 10, 'pouring in comes from the pump');
  // Show me's pour out goes into the can as well.
  for (let k = 0; k < 3; k++) session.act('help');
  run(session, SHOW_ME_S + 1);
  assert.ok(session.view().can > 10, 'what Brian pours out lands in the can');
  // The jugs: a click on the bottom of a jug weighs it; the empty space above does not.
  const words = createClassroomSession(lesson);
  playThroughTo(words, 'word-kilogram');
  let v = words.view();
  assert.equal(hitTest(v, 300, 460)?.action, 'weigh:water');
  assert.equal(hitTest(v, 300, 260), null);
  // Brian's job: a click on the race card's bar does not race; a click on the track does.
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  v = job.view();
  assert.equal(hitTest(v, 700, 160), null, 'the race card is not a button');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  // Pouring by mass: Space by mouse is a click on the scale.
  const weigh = createClassroomSession(lesson);
  playThroughTo(weigh, 'try-weigh');
  pourTo(weigh, WEIGH_LITRES);
  v = weigh.view();
  assert.equal(v.target, 'go');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  // Show me in the job: "That is how it is done." comes with what Brian did, not the last failure.
  job.act('go'); until(job, x => /extra mass/.test(x.brian.text));
  for (let k = 0; k < 3; k++) job.act('help');
  run(job, SHOW_ME_S + .2);
  assert.equal(job.view().brian.text, 'That is how it is done. I will set the tank to 35 litres, the least that lasts this race, and then race.');
  // Show me on a word step does not repeat the whole definition.
  const speed = createClassroomSession(lesson);
  playThroughTo(speed, 'word-speed');
  for (let k = 0; k < 3; k++) speed.act('help');
  run(speed, SHOW_ME_S + .2);
  assert.equal(speed.view().brian.text, 'That is how it is done. Watch the speed climb on the graph.');
  // Watch again restarts the wonder at any time.
  const wonder = createClassroomSession(lesson);
  run(wonder, 2);
  assert.ok(wonder.view().actions.includes('replay'));
  wonder.act('replay');
  assert.ok(wonder.view().lanes.every(l => l.seconds == null));
  // Pressing R after the race: the words about the finished race go while the cars restart, and come back at the end.
  until(wonder, x => x.ready);
  assert.match(wonder.view().brian.text, /The picture shows the moment/);
  wonder.act('replay');
  assert.ok(!/The picture shows the moment/.test(wonder.view().brian.text), 'no talk of the finish while the cars restart');
  assert.equal(wonder.view().ready, true, 'the step stays done');
  until(wonder, x => /The picture shows the moment/.test(x.brian.text));
  // The car can still run on an empty tank, so nothing says it must stop.
  assert.ok(!/must stop/.test(readFileSync(new URL('../src/lab/lessons/fuel-classroom.js', import.meta.url), 'utf8')));
  const pit = createClassroomSession(lesson);
  playThroughTo(pit, 'check-game');
  pit.act('answer:0');
  assert.match(pit.view().brian.text, /After that the car has 40% of its acceleration until it stops in the pit lane to refill/);
});

test('review fixes: the weighing try draws no race strip, so nothing on the board shows the litres under the cloth', () => {
  const texts = [];
  const fake = new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return value => ({width: String(value).length * 9});
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    if (name === 'fillText') return value => texts.push(String(value));
    return () => {};
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-weigh');
  session.act('pour:out'); session.act('pour:out'); session.act('pour:out');
  drawBoard(fake, session.view(), 1000, 680);
  assert.deepEqual(texts.filter(t => /\d+ (L|litres)\b/.test(t) && !/^Each press pours/.test(t)), []);
});

test('LAB-ROUND-NUMBERS: every speed in km/h that the lesson shows is a multiple of 10, and the race ends at exactly 100 km/h', () => {
  assert.equal(TARGET_KMH % 10, 0);
  const found = [];
  const drawn = view => {
    const texts = [];
    const fake = new Proxy({}, {get: (target, name) => {
      if (name in target) return target[name];
      if (name === 'measureText') return value => ({width: String(value).length * 9});
      if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
      if (name === 'fillText') return value => texts.push(String(value));
      return () => {};
    }, set: (target, name, value) => { target[name] = value; return true; }});
    drawBoard(fake, view, 1000, 680);
    return texts;
  };
  // The words of a view: Brian, the prompt, the hints, the panel, the cards and the recap's ideas.
  const words = v => [v.say, v.prompt, v.brian?.text, ...v.hints, ...v.formulas.flatMap(f => [f.title, f.formula, f.worked, f.note]), ...v.cards.map(c => c.label), ...(v.ideas ?? []).map(i => i.text)];
  // The board is read only while no car is moving, because a moving car's speed reading is a result.
  const still = v => v.lanes.every(l => l.seconds == null || l.done);
  const hovers = v => v.lanes.map((_, i) => hoverInfo(v, 700, 160 + i * 100));
  const collect = (v, where) => {
    for (const l of v.lanes) if (l.done) assert.ok(Math.abs(l.kmh - TARGET_KMH) < 1e-9, `${where}: a finished car reads ${TARGET_KMH} km/h`);
    for (const text of [...words(v), ...(still(v) ? [...drawn(v), ...hovers(v)] : [])].filter(Boolean))
      // "1 m/s is the same as 3.6 km/h" is how the two units compare, not a speed of the car.
      for (const [, n] of String(text).replace('1 m/s is the same as 3.6 km/h', '').matchAll(/(\d[\d.,]*) ?(?:km\/h|kilometres per hour)/g)) found.push({where, n: Number(n.replace(/,/g, '')), text});
  };
  for (const text of [...KEY_IDEAS.map(i => i.text), CHALLENGE_CARD.title, CHALLENGE_CARD.text, PASS_SAY]) collect({lanes: [], hints: [], formulas: [], cards: [], say: text}, 'cards');
  // Each step as it opens and as it stands when it is done, with the right answers.
  for (const step of STEPS) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, step.id);
    collect(session.view(), `${step.id} opening`);
    for (let rung = 0; rung < 2; rung++) { session.act('help'); collect(session.view(), `${step.id} hint`); }
    const next = STEPS[STEPS.indexOf(step) + 1];
    if (!next) continue;
    const done = createClassroomSession(lesson);
    playThroughTo(done, step.id);
    const tick = done.tick;
    done.tick = dt => { const r = tick(dt); collect(done.view(), `${step.id} playing`); return r; };
    playThroughTo(done, next.id);
  }
  // The wrong pours and the wrong answers say their own sentences.
  const half = createClassroomSession(lesson);
  playThroughTo(half, 'try-half');
  for (const litres of [70, 50, 20]) { pourTo(half, litres); half.act('go'); collect(half.view(), 'try-half racing'); until(half, v => v.lanes.every(l => l.done) && !/Watch/.test(v.brian.text)); collect(half.view(), `try-half ${litres}`); }
  for (const pick of [0, 2]) {
    const race = createClassroomSession(lesson);
    playThroughTo(race, 'check-race');
    race.act(`answer:${pick}`); collect(race.view(), `check-race ${pick}`);
    until(race, v => v.lanes.every(l => l.done), 15); collect(race.view(), `check-race ${pick} raced`);
  }
  assert.ok(found.length > 20, `the walk reads the lesson’s speeds: ${found.length}`);
  for (const where of ['wonder opening', 'word-speed opening', 'watch playing', 'try-half 50', 'check-race 2']) assert.ok(found.some(f => f.where === where), `${where} shows a speed`);
  for (const f of found) assert.ok(Number.isInteger(f.n) && f.n % 10 === 0, `${f.where}: ${f.n} km/h in “${f.text}”`);
  assert.deepEqual([...new Set(found.map(f => f.n))], [TARGET_KMH], 'the lesson has one speed, 100 km/h');
});
