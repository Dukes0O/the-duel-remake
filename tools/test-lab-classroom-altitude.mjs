// LAB-CLASSROOM-ALTITUDE (docs/board/cards/LAB-CLASSROOM-ALTITUDE.md): Air and altitude as a classroom lesson.
import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, PLACES, MOST, AIR, HEIGHT, NAME, OWN_KG, CRATE_KG, CAR_KG, RACK, weightOf, hoverShare, bestCrates, fuelPerMinute, GAME_CRATE_KG,
  CHALLENGE_CARD, FREE_TRIES, KEY_IDEAS, WORDS, pushAt} from '../src/lab/lessons/altitude-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/altitude-board.js';
import {altitudeBench, SITES} from '../src/lab/benches/altitude.js';
import {KESTREL, padForces} from '../src/lab/benches/lift-pad.js';
import {MOST_KG as LIFT_LESSON_MOST} from '../src/lab/lessons/lift-classroom.js';
import {CHALLENGE_RULES} from '../src/lab/lab-challenges.js';
import {createHeliState, heliReadout} from '../src/heli/heli-flight.js';

const lesson = CLASSROOM_LESSONS.altitude;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const say = session => session.view().brian.text;
const toSummit = session => { session.act('place:up'); session.act('place:up'); };
const holdUp = (session, n = 12) => { for (let i = 0; i < n; i++) session.act('lever:up:held'); };
const panel = session => session.view().formulas.map(f => [f.title, f.formula, f.worked, f.note].filter(Boolean).join(' ')).join(' ');
const worked = (session, title) => session.view().formulas.find(f => f.title === title)?.worked;
const testFree = session => { session.act('go'); until(session, x => x.keys.Space === 'go', 15); };
// One delivery: load this many crates, lift off and wait for Brian's verdict.
function deliver(session, crates) {
  const v = session.view();
  for (let i = v.flight.crates; i < crates; i++) session.act('crate:add');
  for (let i = v.flight.crates; i > crates; i--) session.act('crate:remove');
  session.act('go');
  until(session, x => x.ready || x.keys.Space === 'go', 15);
}
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-altitude') toSummit(session);
    else if (step === 'word-density') { session.act('scoop'); until(session, x => x.ready); }
    else if (step === 'word-thin') { session.act('rotor'); until(session, x => x.ready); }
    else if (step === 'try-car') { toSummit(session); session.act('guess:1'); holdUp(session); until(session, x => x.ready); }
    else if (step === 'try-lever') { toSummit(session); session.act('answer:2'); holdUp(session); until(session, x => x.ready); }
    else if (step === 'try-free') for (let i = 0; i < FREE_TRIES; i++) { testFree(session); session.act('crate:add'); }
    else if (step === 'alone') for (const place of [0, 1, 2]) deliver(session, bestCrates(place));
    else if (step === 'check-why') session.act('answer:0');
    else if (step === 'check-car') session.act('answer:1');
    else if (step === 'check-game') session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and goes to the flying challenge', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['altitude-altitude', 'altitude-air-density', 'altitude-thin-air'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.word), ['Altitude', 'Air density', 'Thin air']);
  assert.equal(lesson.name, 'Air and altitude');
  assert.equal(lesson.finishLabel, undefined, 'the challenge is the helicopter one, not a bench run');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.altitude.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.altitude.explain');
  // The challenge card says the challenge's own rule.
  const rule = CHALLENGE_RULES.altitude;
  assert.equal(GAME_CRATE_KG, rule.crateKg);
  assert.equal(SITES[PLACES[2]].altitudeM, HEIGHT[2]);
  assert.match(CHALLENGE_CARD.text, new RegExp(`${rule.crateKg} kg crate up to ${NAME[2]} and land with ${Math.round(rule.fuelShare * 100)}% of the tank left`));
});

test('every number is the altitude bench’s own run and the Lift lesson’s pad', () => {
  PLACES.forEach((site, i) => {
    const r = altitudeBench.run({site});
    assert.equal(MOST[i], r.liftKg); assert.equal(AIR[i], r.trueShare); assert.equal(HEIGHT[i], r.altitudeM);
    // Moved from the old lesson's test: the stand's near-ground push is above the flying gauge's MAX LIFT.
    assert.equal(r.aloftLiftKg, heliReadout(createHeliState({altitudeOffset: r.altitudeM})).maxLiftKg);
    assert.ok(r.liftKg > r.aloftLiftKg);
  });
  assert.equal(MOST[0], LIFT_LESSON_MOST, 'Sea level is the Lift lesson’s most push near the ground');
  assert.equal(OWN_KG, padForces({fuel: KESTREL.tankKg}, 0).massKg);
  assert.equal(weightOf({car: 1, crates: 2}), padForces({fuel: KESTREL.tankKg, car: 1, crates: 2}, 0).massKg);
  assert.deepEqual(MOST.map(Math.round), [3887, 3513, 2777]);
  assert.deepEqual(AIR.map(a => Math.round(a * 100)), [100, 92, 75]);
  assert.deepEqual([0, 1, 2].map(p => Math.round(hoverShare(p) * 100)), [42, 46, 59]);
  assert.deepEqual([0, 1, 2].map(bestCrates), [4, 3, 2]);
  assert.ok(RACK > bestCrates(0), 'the rack can always overload her');
  assert.deepEqual([0, 1, 2].map(p => weightOf({car: 1}) <= MOST[p]), [true, true, false], 'the Dusthawk lifts at the sea and the Ridge only');
  assert.equal(fuelPerMinute(1), (KESTREL.burnIdle + KESTREL.burnPerCollective) * 60);
  assert.ok(fuelPerMinute(hoverShare(2)) > fuelPerMinute(hoverShare(0)));
});

test('a child who does exactly what each prompt says passes every step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  assert.equal(session.view().ready, true);
  assert.equal(session.view().last, true);
  assert.match(session.view().prompt, /try this in the helicopter/);
});

test('the words: the stand climbs the mountain, a jar scooped up high holds less, and thin air pushes less', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-altitude');
  session.act('place:down');
  assert.match(say(session), /Sea level is as low as the stand goes, at 0 m/);
  session.act('place:up');
  assert.match(say(session), /Panorama Ridge is 860 m above the sea\. Keep going/);
  assert.equal(session.view().ready, false);
  session.act('place:up');
  assert.match(say(session), /Summit Run is 2,860 m above the sea, so its altitude is 2,860 m/);
  session.act('next');
  assert.equal(session.view().jar.share, 0, 'the jar starts empty');
  assert.equal(session.view().jar.sea, true, 'beside the sea’s full jar');
  session.act('scoop'); until(session, x => x.ready);
  assert.equal(session.view().jar.share, AIR[2]);
  assert.match(say(session), /holds only 75 dots of air at Summit Run, where the jar from Sea level holds 100/);
  session.act('next');
  session.act('rotor'); until(session, x => x.ready);
  assert.equal(session.view().flight.lever, 1);
  assert.match(say(session), /the rotor pushes 2,777 kg, against 3,887 kg at Sea level, which is 71% as much/);
});

test('the guided tries set up first, then ask, then test; a wrong guess says why with the numbers', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-car');
  assert.equal(session.view().cards.length, 0, 'no guess before the stand is at the summit');
  session.act('guess:0');
  assert.equal(session.view().flight.place, 0);
  toSummit(session);
  assert.equal(session.view().cards.length, 2);
  assert.equal(session.view().flight.place, 2, 'the place name and its air stay on the board while guessing');
  session.act('lever:up');
  assert.equal(session.view().flight.lever, 0, 'the lever waits for the guess');
  session.act('guess:0');
  holdUp(session); until(session, x => x.ready);
  assert.equal(session.view().flight.status, 'stays');
  assert.match(say(session), /The car stays on the ground\. The weight of 2,910 kg is more than the 2,777 kg that the rotor can push at Summit Run, so the load is 133 kg too heavy\. At Sea level the rotor can push 3,887 kg/);
  assert.equal(session.view().cards.find(c => c.state === 'right').label, 'No, the car stays on the ground');
  session.act('next');
  assert.equal(session.view().lever.unknown, true, 'the red line up high is hidden until the guess');
  assert.equal(session.view().lever.ghost, hoverShare(0));
  toSummit(session);
  session.act('answer:1');
  assert.equal(session.view().lever.red, true);
  holdUp(session);
  assert.ok(Math.abs(session.view().flight.lever - hoverShare(2)) < 1e-9, 'a held W stops on the red line');
  until(session, x => x.ready);
  assert.equal(session.view().flight.status, 'hovering');
  assert.match(say(session), /The red line went higher, to 59%, not 42%\. The air is thinner, so the rotor needs more lever just to hover, and more lever burns more fuel, at 34\.4 kg a minute at Summit Run against 28\.8 kg a minute at Sea level/);
  // Dragged past the red line the helicopter climbs, and Brian says so.
  const again = createClassroomSession(lesson);
  playThroughTo(again, 'try-lever'); toSummit(again); again.act('answer:2');
  again.act('hold:0.8');
  assert.match(say(again), /gone past the red line, .* and the helicopter climbs\. Bring the lever back to the line with S/);
});

test('Brian’s job: too many and too few each say why with the numbers; four, three and two crates pass', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().flight.crates, 0, 'each delivery starts away from its answer');
  deliver(session, 3);
  assert.match(say(session), /The helicopter hovers with a weight of 3,130 kg, and at Sea level the rotor can push 3,887 kg, which leaves room for 757 kg more\. A crate weighs 500 kg/);
  assert.equal(session.view().help, 1, 'a failed try climbs the help');
  deliver(session, 5);
  assert.match(say(session), /4,130 kg is 243 kg more than the 3,887 kg that the rotor can push at Sea level, so the load stays on the ground/);
  deliver(session, 4);
  assert.match(say(session), /Correct\. Four crates bring the weight to 3,630 kg and the helicopter hovers, and one more crate would be too heavy\. The next delivery is at Panorama Ridge/);
  assert.equal(session.view().flight.place, 1);
  deliver(session, 3);
  deliver(session, 3);
  assert.match(say(session), /3,130 kg is 353 kg more than the 2,777 kg that the rotor can push at Summit Run/);
  deliver(session, 2);
  assert.equal(session.view().ready, true);
  assert.match(say(session), /four crates at Sea level, three crates at Panorama Ridge and two crates at Summit Run/);
  session.act('crate:add');
  assert.equal(session.view().flight.crates, 2, 'a finished job takes no more crates');
});

test('the questions: each wrong answer says why with the numbers', () => {
  const answers = {
    'check-why': [[1, /The helicopter weighs 1,630 kg at Sea level and at Summit Run/], [2, /The rotor spins just as fast/], [0, /Correct\. A jar of air at Summit Run holds 75 dots/]],
    'check-car': [[0, /At Panorama Ridge the rotor can still push 3,513 kg, which is more than 2,910 kg/], [2, /At Summit Run the rotor can push only 2,777 kg, which is 133 kg short/], [1, /Correct\./]],
    'check-game': [[1, /burns the most fuel, 48\.0 kg a minute/], [2, /Refuelling once the crate is on the cable does not count/], [0, /hovering by the pad at Summit Run needs 70% of the lever, against 50% at Sea level, and flying away from the ground needs more still/]],
  };
  for (const [step, tries] of Object.entries(answers)) for (const [answer, why] of tries) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, step);
    session.act(`answer:${answer}`);
    assert.match(say(session), why, `${step} answer ${answer}`);
    assert.equal(session.view().ready, true);
  }
});

test('help climbs from a nudge to a plain step to Brian pointing at the exact control, and Show me presses it', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-altitude');
  const hints = session.view().hints;
  for (const rung of [1, 2, 3]) { session.help(); assert.equal(say(session), hints[rung - 1]); }
  assert.equal(session.view().pointer.action, 'place:2');
  run(session, SHOW_ME_S + .1);
  assert.equal(session.view().flight.place, 2, 'Show me takes the stand to the summit');
  assert.equal(session.view().ready, true);
  for (const [step, target] of [['word-density', 'scoop'], ['word-thin', 'rotor'], ['try-car', 'place:2'], ['try-free', 'go'], ['alone', 'crate:add']]) {
    const s = createClassroomSession(lesson);
    playThroughTo(s, step);
    assert.equal(s.view().target, target, `${step} points at ${target}`);
  }
  const lever = createClassroomSession(lesson);
  playThroughTo(lever, 'try-lever'); toSummit(lever); lever.act('answer:2');
  assert.equal(lever.view().target, 'lever:weight');
  lever.help(); lever.help(); lever.help(); run(lever, SHOW_ME_S + .1);
  assert.ok(Math.abs(lever.view().flight.lever - hoverShare(2)) < 1e-9, 'Show me puts the lever on the red line');
});

test('the board draws every step and card, hit-tests its controls and points at every target', () => {
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
    for (const t of [0, 1, 4]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
      const v = session.view();
      if (v.target) assert.equal(hitTest(v, ...targetPoint(v, v.target))?.action === (v.target === 'set:next' ? 'go' : v.target) || hitTest(v, ...targetPoint(v, v.target))?.drag === 'lever', true, `${STEPS[i].id}: a click where the pointer is does ${v.target}`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
  // A click on Summit Run, the jar, the rotor, the rack and a drag of the lever do what the keys do.
  const s = createClassroomSession(lesson);
  playThroughTo(s, 'word-altitude');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'place:2')).action, 'place:2');
  // A click on a place's name goes there too.
  for (const [i, name] of NAME.entries()) assert.match(hoverInfo(s.view(), 60, targetPoint(s.view(), `place:${i}`)[1] - 14), new RegExp(name));
  assert.equal(hitTest(s.view(), 60, targetPoint(s.view(), 'place:1')[1] - 14).action, 'place:1');
  playThroughTo(s, 'word-density');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'scoop')).action, 'scoop');
  playThroughTo(s, 'word-thin');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'rotor')).action, 'rotor');
  assert.match(hoverInfo(s.view(), ...targetPoint(s.view(), 'place:0')), /Sea level is 0 m above the sea/);
  playThroughTo(s, 'try-lever'); toSummit(s); s.act('answer:2');
  const [lx, ly] = targetPoint(s.view(), 'lever:weight');
  assert.equal(hitTest(s.view(), lx, ly).drag, 'lever');
  s.act(`hold:${hoverShare(2) + .02}`);
  assert.ok(Math.abs(s.view().flight.lever - hoverShare(2)) < 1e-9, 'a drag near the red line clicks onto it');
  playThroughTo(s, 'alone');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'crate:add')).action, 'crate:add');
  s.act('crate:add');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'crate:remove')).action, 'crate:remove');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'go')).action, 'go');
  for (let n = 2; n <= RACK; n++) {
    s.act('crate:add');
    assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'go')).action, 'go', `lift off with ${n} crates on is not a crate`);
    assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'crate:remove')).action, 'crate:remove');
  }
  assert.match(hoverInfo(s.view(), ...targetPoint(s.view(), 'crate:remove')), new RegExp(`A crate weighs ${CRATE_KG} kg`));
});

test('review fixes: Previous step shows a finished word as it was; one drag past the red line climbs the help once; the Watch speaks when its table is full', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-density');
  session.act('back');
  assert.equal(session.view().step.id, 'word-altitude');
  assert.equal(session.view().flight.place, 2, 'the stand is back at the summit');
  assert.match(say(session), /Summit Run is 2,860 m above the sea, so its altitude is 2,860 m/);
  assert.equal(session.view().ready, true);
  playThroughTo(session, 'watch');
  assert.doesNotMatch(say(session), /3,513 kg/);
  until(session, x => x.ready);
  session.act('replay');
  assert.doesNotMatch(say(session), /3,513 kg/, 'watching again starts with an empty table and says so');
  run(session, 11);
  assert.match(say(session), /3,887 kg at Sea level, 3,513 kg at Panorama Ridge and 2,777 kg at Summit Run/);
  playThroughTo(session, 'try-lever'); toSummit(session); session.act('answer:2');
  for (const share of [.7, .75, .8, .85]) session.act(`hold:${share}`);
  assert.equal(session.view().help, 1, 'one drag past the line is one fail');
  session.act('hold:.5'); session.act('hold:.8');
  assert.equal(session.view().help, 2, 'crossing the line again is a second');
});

test('the word steps stay open, their closing words stay true, and the height moves the sums on every press', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-altitude');
  assert.equal(worked(session, 'Altitude'), '0 m − 0 m = 0 m');
  toSummit(session);
  assert.equal(worked(session, 'Altitude'), '2,860 m − 0 m = 2,860 m');
  const closing = say(session);
  session.act('place:down');
  assert.equal(session.view().flight.place, 1, 'the stand still moves after the answer');
  assert.equal(worked(session, 'Altitude'), '860 m − 0 m = 860 m');
  assert.equal(say(session), closing, 'the closing words name their places, so they stay true');
  assert.equal(session.view().ready, true);
  session.act('next');
  session.act('scoop'); until(session, x => x.ready);
  assert.match(worked(session, 'Air density at this height'), /2,860 ÷ 288\.15\) \^ 4\.256 = 0\.75, which is 75 dots/);
  session.act('place:down'); session.act('place:down');
  assert.equal(session.view().jar.share, AIR[0], 'the jar follows the stand');
  assert.match(worked(session, 'Air density at this height'), /= 1\.00, which is 100 dots/);
  session.act('next');
  session.act('rotor'); until(session, x => x.ready);
  assert.equal(worked(session, 'The most the rotor can push'), '3,380.4 × 1.15 × 0.7143 = 2,777 kg');
  assert.equal(worked(session, 'The push at this lever setting'), '1.00 × 2,777 kg = 2,777 kg');
  session.act('place:down');
  assert.equal(session.view().flight.lever, 1, 'the lever stays up while the stand moves');
  assert.equal(worked(session, 'The most the rotor can push'), '3,380.4 × 1.15 × 0.9038 = 3,513 kg');
  assert.equal(worked(session, 'How much of the push remains'), '2.718 ^ (−860 ÷ 8,500) = 0.9038');
  assert.equal(worked(session, 'The push at this lever setting'), '1.00 × 3,513 kg = 3,513 kg');
});

test('every sum comes out on a calculator from the figures it shows, at every place and load', () => {
  for (const place of [0, 1, 2]) {
    const r = Number(Math.pow(2.718, -HEIGHT[place] / 8500).toFixed(4));
    assert.equal(Math.round(3380.4 * 1.15 * r), Math.round(MOST[place]), 'the most push');
    assert.equal(Math.round(Math.pow(1 - .0065 * HEIGHT[place] / 288.15, 4.256) * 100), Math.round(AIR[place] * 100), 'the air share');
    assert.equal(Math.floor((Math.round(MOST[place]) - OWN_KG) / CRATE_KG), bestCrates(place), 'the crates');
    for (const load of [...[0, 1, 2, 3, 4, 5].map(crates => ({crates})), {car: 1}, {crates: GAME_CRATE_KG / CRATE_KG}]) {
      const w = weightOf(load), shown = Number((w / Math.round(MOST[place])).toFixed(4));
      assert.equal(Math.round(shown * 100), Math.round(hoverShare(place, load) * 100), 'the lever to hover matches its percentage');
      if (shown <= 1) assert.equal(Math.round(pushAt(place, hoverShare(place, load))), w, 'on the red line the push is the weight');
      assert.equal(Math.round(Math.round(MOST[place]) - w), Math.round(MOST[place] - w), 'what is spare or short');
    }
    for (let lever = 0; lever <= 1.0001; lever += .01) {
      const shown = Number(lever.toFixed(2));
      assert.equal(pushAt(place, shown), shown * Math.round(MOST[place]), 'the push is the lever as shown times the most push as shown');
    }
  }
  assert.equal((15 + 33 * .587).toFixed(1), fuelPerMinute(hoverShare(2)).toFixed(1));
  assert.equal((15 + 33 * .4193).toFixed(1), fuelPerMinute(hoverShare(0)).toFixed(1));
  assert.equal(15 + 33, fuelPerMinute(1));
});

test('the free test: height and load move the sums, the table keeps different settings, and three open Continue', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  assert.equal(session.view().ready, false);
  assert.deepEqual(session.view().results, []);
  const intro = say(session);
  assert.equal(worked(session, 'The crates the helicopter can carry'), '(3,887 kg − 1,630 kg) ÷ 500 kg = 4.51, so 4 crates');
  session.act('place:up');
  assert.equal(worked(session, 'The most the rotor can push'), '3,380.4 × 1.15 × 0.9038 = 3,513 kg', 'the height moves the sum');
  assert.equal(worked(session, 'The crates the helicopter can carry'), '(3,513 kg − 1,630 kg) ÷ 500 kg = 3.77, so 3 crates');
  session.act('crate:add');
  assert.equal(worked(session, 'The total weight'), '1,630 kg + 1 × 500 kg = 2,130 kg', 'the load moves the sum');
  assert.equal(worked(session, 'The lever needed to hover'), '2,130 kg ÷ 3,513 kg = 0.6063, which is 61%');
  assert.equal(say(session), intro, 'the opening words do not change with a control');
  testFree(session);
  assert.match(say(session), /At Panorama Ridge with one crate, the helicopter and its load weigh 2,130 kg and the rotor can push 3,513 kg, so the helicopter hovers with the lever at 61%, and 1,383 kg of push is left to spare\. Change a setting/);
  assert.equal(session.view().ready, false);
  testFree(session);
  assert.equal(session.view().results.length, 1, 'the same setting again does not count as a different one');
  assert.match(session.view().prompt, /tested so far: 1 of 3/);
  session.act('place:up');
  for (let i = 0; i < 4; i++) session.act('crate:add');
  testFree(session);
  assert.match(say(session), /At Summit Run with five crates, the helicopter and its load weigh 4,130 kg and the rotor can push 2,777 kg, so the load stays on the ground, because the load is 1,353 kg too heavy/);
  assert.equal(worked(session, 'The lever needed to hover'), '4,130 kg ÷ 2,777 kg = 1.4872, which is 149%, so the lever cannot reach it');
  session.act('place:down'); session.act('place:down');
  testFree(session);
  assert.equal(session.view().ready, true, 'three different settings open Continue');
  assert.equal(session.view().results.length, 3, 'the table keeps the results');
});

test('Show me on the free test tries a different setting each time, reaches three and finishes, and says so truly', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  for (let shown = 1; shown <= FREE_TRIES; shown++) {
    assert.equal(session.view().target, shown === 1 ? 'go' : 'set:next');
    for (let i = 0; i < 3; i++) session.help();
    assert.match(session.view().brian.text, shown === 1 ? /I will test the settings as they are/ : /I will choose a different setting and test it/);
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^That is how it is done\. With /);
    until(session, x => x.keys.Space === 'go', 15);
    assert.equal(session.view().results.length, shown, 'each Show me adds a new setting');
  }
  assert.equal(session.view().ready, true, 'Show me alone can finish the free test');
  const {results} = session.view();
  assert.ok(new Set(results.map(r => r.crates)).size > 1, 'Show me varies the crates');
  assert.ok(new Set(results.map(r => r.name)).size > 1, 'and the place');
});

test('nothing on the panel or the board settles a guess or a question while it is open', () => {
  const car = createClassroomSession(lesson);
  playThroughTo(car, 'try-car'); toSummit(car);
  assert.equal(car.view().cards.length, 2);
  assert.doesNotMatch(panel(car), /2,777|133/, 'the panel keeps back the push at Summit Run');
  assert.doesNotMatch(say(car), /2,777/);
  assert.equal(car.view().readouts.most, false, 'and so does the board');
  car.act('guess:0');
  assert.match(panel(car), /2,777/, 'once the guess is made the sum is shown');

  const lever = createClassroomSession(lesson);
  playThroughTo(lever, 'try-lever'); toSummit(lever);
  assert.equal(lever.view().cards.length, 3);
  assert.doesNotMatch(panel(lever), /2,777|0\.58|0\.59|59%/);
  assert.doesNotMatch(say(lever), /2,777|59%/);
  assert.match(panel(lever), /At Sea level, 1,630 kg ÷ 3,887 kg = 0\.4193, which is 42%/);
  assert.equal(lever.view().readouts.most, false);
  assert.equal(lever.view().lever.red, false);
  lever.act('answer:2');
  assert.match(panel(lever), /1,630 kg ÷ 2,777 kg = 0\.5870, which is 59%/);

  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  assert.equal(worked(job, 'The crates the helicopter can carry'), '(3,887 kg − 1,630 kg) ÷ 500 kg = ?', 'the job’s answer stays open');

  for (const [id, hidden] of [['check-why', /0\.75|75 dots|air share/], ['check-car', /3,513|2,777|3,887/], ['check-game', /48\.0|70%|lever × |15 \+/]]) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    assert.ok(session.view().formulas.length > 0, id + ' still shows general formulas');
    assert.doesNotMatch(panel(session), hidden, id + ' keeps its answer back');
    session.act('answer:0');
    assert.ok(session.view().formulas.some(f => f.worked && !/= \?/.test(f.worked)), id + ' shows the worked sums once answered');
  }
  assert.match((() => { const s = createClassroomSession(lesson); playThroughTo(s, 'check-game'); s.act('answer:0'); return panel(s); })(), /1,930 kg ÷ 2,777 kg = 0\.6950, which is 70%/);
});

test('directions are right from every setting, words are defined before use, and each step has physics to show', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-lever'); toSummit(session); session.act('answer:2');
  assert.match(session.view().prompt, /Hold W or ↑.*up to the red line/);
  session.act('hold:.85');
  assert.match(session.view().prompt, /Hold S or ↓.*down to the red line/, 'above the line the prompt says to go down');
  assert.match(session.view().hints[1], /^Hold S until/);
  session.act('hold:.2');
  assert.match(session.view().prompt, /Hold W or ↑/);

  // No kilograms before the Thin air step, no dots before the Air density step, no hover before the lever step.
  const reader = createClassroomSession(lesson);
  assert.doesNotMatch(say(reader), /\bkg\b|dots|hover/);
  playThroughTo(reader, 'word-altitude');
  assert.doesNotMatch(say(reader) + panel(reader), /\bkg\b|dots|hover/);
  assert.doesNotMatch(hoverInfo(reader.view(), 60, targetPoint(reader.view(), 'place:1')[1] - 14), /dots/);
  playThroughTo(reader, 'word-density');
  assert.doesNotMatch(say(reader) + panel(reader), /\bkg\b|hover/);
  assert.match(say(reader), /we draw it with 100 dots/);
  playThroughTo(reader, 'word-thin');
  assert.match(say(reader), /written kg/);
  assert.match(say(reader), /A lever at 0% gives no push, and a lever at 100% gives the most push/);
  playThroughTo(reader, 'try-car');
  assert.doesNotMatch(say(reader), /hover/);
  playThroughTo(reader, 'try-lever');
  assert.match(say(reader), /To hover means to stay still in the air/);

  const model = lesson.createModel();
  STEPS.forEach((step, i) => { if (i) { model.enter(i); assert.ok(model.view().formulas.length > 0, step.id + ' shows the physics'); } });
  for (const file of ['altitude-classroom.js', 'altitude-board.js']) {
    const source = readFileSync(new URL('../src/lab/lessons/' + file, import.meta.url), 'utf8');
    for (const pattern of [/lever (that )?hovers|hovers the helicopter/i, /\b(hovering|flying)\b[^.`]*\btakes\b/i, /\b(she|her|hers|herself)\b/i, /\bmph\b/i, /\bdecides?\b/i, /\b(air|wind)\s+(soon\s+)?takes\b/i, /\bbits\b/i]) assert.ok(!pattern.test(source), file + ' has ' + source.match(pattern)?.[0]);
  }
  for (const words of [...KEY_IDEAS.map(i => i.text), ...WORDS.map(w => w.meaning), CHALLENGE_CARD.title, CHALLENGE_CARD.text]) assert.match(words, /\.$/, 'a whole sentence: ' + words);
});

test('Brian’s job keeps its opening words while the crates change, and the prompt carries the live number', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  const intro = say(session);
  session.act('crate:add'); session.act('crate:add');
  assert.equal(say(session), intro);
  assert.match(session.view().prompt, /At Sea level there are two crates on the cable, so the weight is 2,630 kg/);
  assert.equal(worked(session, 'The total weight'), '1,630 kg + 2 × 500 kg = 2,630 kg');
});

test('with no crates on the cable, Brian names no load', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  session.act('go');
  assert.match(say(session), /^With no crates on the cable, the helicopter weighs 1,630 kg by itself\. The lever is going up/);
  until(session, x => x.keys.Space === 'go', 15);
  assert.match(say(session), /^At Sea level with no crates, the helicopter weighs 1,630 kg by itself and the rotor can push 3,887 kg, so the helicopter hovers with the lever at 42%, and 2,257 kg of push is left to spare\./);
  session.act('crate:add'); session.act('go');
  assert.match(say(session), /^With one crate on the cable, the helicopter and its load weigh 2,130 kg\./);
});
