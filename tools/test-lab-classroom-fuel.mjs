// LAB-CLASSROOM-FUEL (docs/board/cards/LAB-CLASSROOM-FUEL.md): Fuel and weight as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, DAYS, HALF, WEIGH_LITRES, WEIGH_KG, HALF_TANK_LINE, leastLitres, secondsTo60, gapAtWin, benchAttempts} from '../src/lab/lessons/fuel-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/fuel-board.js';
import {fuelBench, zeroToSixty, FUEL_RIG, PETROL_KG_PER_LITRE} from '../src/lab/benches/tunnel.js';
import {dragAt, lastsShare, SIXTY_MS, TANK_LITRES} from '../src/lab/benches/fuel.js';
import {LAB_TUNE} from '../src/lab/lab-tune.js';
import {effectLine} from '../src/lab/tune-view.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.fuel;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const pourTo = (session, litres) => {
  for (let i = 0; i < 20 && session.view().litres > litres; i++) session.act('pour:out');
  for (let i = 0; i < 20 && session.view().litres < litres; i++) session.act('pour:in');
  assert.equal(session.view().litres, litres);
};
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-fuel-load') pourTo(session, TANK_LITRES);
    else if (step === 'word-litre') { session.act('fill'); until(session, x => x.ready); }
    else if (step === 'word-kilogram') { session.act('weigh:water'); session.act('weigh:petrol'); }
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

test('the lesson walks the seven parts in order, keeps the old notebook words, and finishes on the bench', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['fuel-word-0', 'fuel-word-1', 'fuel-word-2'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.word), ['Fuel load', 'Litre', 'Kilogram']);
  assert.equal(lesson.name, 'Fuel and weight');
  assert.equal(lesson.finishLabel, 'Finish the lesson');
});

test('every number is the fuel bench’s own run, and Brian’s job is the game’s Grand Prix tank', () => {
  for (const litres of [0, 35, 50, 70]) {
    const r = fuelBench.run({litres});
    assert.equal(secondsTo60(litres), r.zeroToSixtyS);
    assert.equal(r.zeroToSixtyS, zeroToSixty(fuelBench.controls[0].value, litres).seconds);
    assert.equal(r.fuelKg, litres * PETROL_KG_PER_LITRE);
  }
  assert.equal(secondsTo60(70).toFixed(2), '3.16'); assert.equal(secondsTo60(35).toFixed(2), '3.09'); assert.equal(secondsTo60(0).toFixed(2), '3.03');
  assert.equal(WEIGH_KG.toFixed(1), '37.0');
  assert.equal(Math.round(gapAtWin(35, 70) * 100), 86, 'the half tank is 86 cm ahead when it reaches sixty');
  // The drag strip: the same push all the way, sixty mph at the bench's own time.
  const d = dragAt(70, secondsTo60(70));
  assert.ok(Math.abs(d.mph - FUEL_RIG.upToMph) < 1e-9 && Math.abs(d.metres - SIXTY_MS * secondsTo60(70) / 2) < 1e-9);
  // The Grand Prix: a full tank lasts 110%, so the least the can pours for each race is 35, 50 and 65 litres.
  assert.equal(lastsShare(TANK_LITRES), LAB_TUNE.fuel.fullTankRaceShare);
  assert.equal(lastsShare(HALF), LAB_TUNE.fuel.fullTankRaceShare * (1 - 2 * LAB_TUNE.fuel.loadPerStep), 'half a tank lasts what the Tune page says');
  assert.deepEqual(DAYS.map(d => leastLitres(d.share)), [35, 50, 65]);
  for (const d of DAYS) assert.ok(lastsShare(leastLitres(d.share)) >= d.share && lastsShare(leastLitres(d.share) - 5) < d.share);
  assert.equal(HALF_TANK_LINE, effectLine('fuel', 2), 'question 3 shows the Tune page’s own line');
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

test('pouring: ↑ pours in and ↓ pours out, 5 litres a press, with the litres and kilograms shown as they change', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-fuel-load');
  assert.equal(session.view().litres, 0);
  assert.deepEqual(session.view().keys, {'↑': 'pour:in'}, 'filling the tank needs only ↑');
  session.act('pour:in'); assert.equal(session.view().litres, 5);
  assert.match(session.view().prompt, /^5 litres in/);
  // A held key keeps pouring, but not faster than a pour every 0.14 s.
  session.act('pour:in:held'); assert.equal(session.view().litres, 5);
  run(session, .2); session.act('pour:in:held'); assert.equal(session.view().litres, 10);
  pourTo(session, TANK_LITRES);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^Full: 70 litres\. That is the car’s fuel load/);
  session.act('next'); session.act('fill'); until(session, x => x.ready);
  session.act('next'); session.act('weigh:petrol');
  assert.match(session.view().brian.text, /^A litre of petrol: 0\.74 kg\. Now the litre of water: press 1\./);
  session.act('weigh:water');
  assert.match(session.view().brian.text, /^Same space, one litre each\. The water weighs 1\.00 kg, the petrol 0\.74 kg\./);
  session.act('next'); until(session, x => x.ready);
  session.act('next');
  assert.equal(session.view().step.id, 'try-half');
  assert.equal(session.view().litres, 70, 'the tank starts full, so the first ↓ pours 5 litres out, not all of it');
  session.act('pour:out');
  assert.equal(session.view().litres, 65); assert.equal(session.view().kg.toFixed(1), '48.1');
  assert.match(session.view().prompt, /^65 litres, 48\.1 kg\./);
  session.act('pour:in'); session.act('pour:in');
  assert.equal(session.view().litres, 70);
  assert.match(session.view().brian.text, /The tank is full: 70 litres\./);
});

test('the tries: a wrong pour says why with the real litres, kilograms and times, and the race still runs', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-half');
  pourTo(session, 50); session.act('go'); until(session, v => v.step.id === 'try-half' && v.lanes.every(l => l.done) && !/Watch/.test(v.brian.text));
  assert.equal(session.view().brian.text, '50 litres is more than half: 3.12 s against 3.16 s. Half of 70 is 35: pour out 15 more with ↓, then race again.');
  assert.equal(session.view().ready, false);
  pourTo(session, 20); session.act('go'); until(session, v => /less than half/.test(v.brian.text));
  assert.equal(session.view().brian.text, '20 litres is less than half. It won, 3.06 s against 3.16 s, but half of 70 is 35: pour in 15 with ↑, then race again.');
  pourTo(session, 35); session.act('go'); until(session, v => v.ready);
  assert.equal(session.view().brian.text, 'Half a tank: 35 litres, 25.9 kg. It reached 60 mph in 3.09 s, the full tank in 3.16 s: 86 cm ahead.');
  session.act('next');
  assert.equal(session.view().covered, true, 'the second try covers the gauge');
  // By weight: the player can pour past the weight; Space weighs it and the scale says how far off, and which way.
  for (let i = 0; i < 5; i++) session.act('pour:out');
  assert.equal(session.view().litres, 45, 'nothing stops the pour on the weight');
  assert.equal(session.view().ready, false);
  session.act('go');
  assert.equal(session.view().brian.text, 'The scale reads 33.3 kg: 3.7 kg too light. Each press of ↑ pours in 3.7 kg.');
  assert.equal(session.view().help, 1, 'a wrong weighing climbs one rung of help');
  session.act('pour:in'); session.act('pour:in'); session.act('go');
  assert.equal(session.view().brian.text, 'The scale reads 40.7 kg: 3.7 kg too heavy. Each press of ↓ lets out 3.7 kg.');
  assert.ok(!/litres/.test(session.view().brian.text), 'under the cloth Brian does not say the litres');
  session.act('pour:out'); session.act('go');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^37\.0 kg on the scale: that is 50 litres\./);
  const full = createClassroomSession(lesson);
  playThroughTo(full, 'try-weigh');
  full.act('pour:in');
  assert.equal(full.view().brian.text, 'The tank is full.', 'the full tank is not given away in litres');
});

test('Brian’s job: too little runs dry, too much carries weight it did not need, and that race goes again', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().job.name, 'Half a Grand Prix');
  assert.equal(session.view().litres, 70, 'the tank starts full');
  session.act('go'); until(session, v => /did not need/.test(v.brian.text));
  assert.equal(session.view().brian.text, 'It finished, but 70 litres lasts 110% of a Grand Prix: it carried 35 litres, 25.9 kg, it did not need. Pour out 35 and race again.');
  assert.equal(session.view().help, 1, 'a failed race climbs one rung of help');
  pourTo(session, 30); session.act('go');
  const sounds = [];
  for (let t = 0; t < 5 && !/ran dry/.test(session.view().brian.text); t += .05) { session.tick(.05); sounds.push(...session.takeEvents().filter(e => e.sound).map(e => e.sound)); }
  assert.ok(sounds.includes('car.sputter'), 'the engine coughs when it runs dry');
  assert.equal(session.view().brian.text, '30 litres lasts 47% of a Grand Prix: it ran dry before the flag. Half a Grand Prix needs about 32 litres: pour in 5 and race again.');
  assert.ok(session.view().job.race.dry && session.view().job.race.at < 1);
  assert.equal(session.view().job.day, 1, 'the same race again');
  pourTo(session, 35); session.act('go'); until(session, v => v.job.day === 2);
  assert.match(session.view().brian.text, /^Right: 35 litres lasts 55% of a Grand Prix, just enough\. Next race: Three quarters of a Grand Prix\. The tank is full again\./);
  assert.equal(session.view().litres, 70);
  pourTo(session, 50); session.act('go'); until(session, v => v.job.day === 3);
  pourTo(session, 65); session.act('go'); until(session, v => v.ready);
  assert.equal(session.view().brian.text, 'Three races, each on just enough. You left 60 litres behind, 44.4 kg the car never had to carry. Job done.');
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me pours (and races) for the player', () => {
  for (const id of ['word-fuel-load', 'word-litre', 'word-kilogram', 'try-half', 'try-weigh', 'alone']) {
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
    if (id === 'alone') for (let i = 1; i < DAYS.length; i++) { until(session, x => x.job.day === i + 1 && !x.job.race, 10); for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); }
    until(session, x => x.ready, 30);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-water': [1, /^No: a litre of petrol weighs 0\.74 kg and a litre of water 1\.00 kg\./],
    'check-race': [2, /^Close, but not together: 3\.09 s against 3\.16 s, 86 cm apart\./],
    'check-game': [1, /^A full tank lasts 110% of a Grand Prix, so half a tank lasts 55%: it runs dry past half way\. Empty, the car has 40% of its power until you pit\./],
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
  assert.match(game.view().brian.text, /^Lighter is quicker: in the game a half tank speeds up and brakes 3% better\./);
  assert.equal(game.view().tune.effect, HALF_TANK_LINE);
});

test('mouse: the nozzle pours in, the tap pours out, the strip races, the jugs weigh, and hovering names every part', () => {
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
  assert.ok(half.metres > full.metres && half.mph > full.mph, 'the half tank is ahead while they speed up');
  until(session, v => v.ready);
  [full, half] = session.view().lanes;
  assert.equal(half.winner, true); assert.equal(full.winner, false);
  assert.ok(half.metres > full.metres && half.metres < 46, 'they park on the strip, the winner in front');
  assert.equal(full.seconds, secondsTo60(70)); assert.equal(half.seconds, secondsTo60(35));
  session.act('replay');
  assert.ok(session.view().lanes.every(l => l.seconds == null), 'the race starts again');
  session.act('next'); playThroughTo(session, 'watch');
  assert.equal(session.view().litres, 70);
  run(session, 1); assert.ok(session.view().litres < 70 && session.view().kg < 51.8, 'the scale falls as the tank empties');
  until(session, v => v.ready);
  assert.deepEqual(session.view().lanes.map(l => l.winner), [false, false, true], 'the empty tank wins');
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
  // By weight: Space by mouse is a click on the scale.
  const weigh = createClassroomSession(lesson);
  playThroughTo(weigh, 'try-weigh');
  pourTo(weigh, WEIGH_LITRES);
  v = weigh.view();
  assert.equal(v.target, 'go');
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  // Show me in the job: "That is how it is done." comes with what Brian did, not the last failure.
  job.act('go'); until(job, x => /did not need/.test(x.brian.text));
  for (let k = 0; k < 3; k++) job.act('help');
  run(job, SHOW_ME_S + .2);
  assert.equal(job.view().brian.text, 'That is how it is done. Watch: I pour it to 35 litres, the least that lasts, then race.');
  // Watch again restarts the wonder at any time.
  const wonder = createClassroomSession(lesson);
  run(wonder, 2);
  assert.ok(wonder.view().actions.includes('replay'));
  wonder.act('replay');
  assert.ok(wonder.view().lanes.every(l => l.seconds == null));
  // Finishing passes in the classroom: Brian says what it opened, under the game's own numbers.
  assert.equal(lesson.passSay, 'Fuel passed! Fuel load is open on the Tune page in the garage: a half tank is quicker, but in a Grand Prix it runs dry at 55%.');
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
  assert.deepEqual(texts.filter(t => /\d+ (L|litres)\b/.test(t) && !/^One press pours/.test(t)), []);
});
