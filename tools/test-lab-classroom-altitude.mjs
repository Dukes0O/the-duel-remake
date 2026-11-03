// LAB-CLASSROOM-ALTITUDE (docs/board/cards/LAB-CLASSROOM-ALTITUDE.md): Air and altitude as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, PLACES, MOST, AIR, HEIGHT, NAME, OWN_KG, CRATE_KG, CAR_KG, RACK, weightOf, hoverShare, bestCrates, fuelPerMinute, GAME_CRATE_KG,
  CHALLENGE_CARD} from '../src/lab/lessons/altitude-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/altitude-board.js';
import {altitudeBench, SITES} from '../src/lab/benches/altitude.js';
import {KESTREL, padForces} from '../src/lab/benches/lift-pad.js';
import {MOST_KG as LIFT_LESSON_MOST} from '../src/lab/lessons/lift-classroom.js';
import {CHALLENGE_RULES} from '../src/lab/lab-challenges.js';
import {GRAVITY, createHeliState, heliReadout} from '../src/heli/heli-flight.js';

const lesson = CLASSROOM_LESSONS.altitude;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const say = session => session.view().brian.text;
const toSummit = session => { session.act('place:up'); session.act('place:up'); };
const holdUp = (session, n = 12) => { for (let i = 0; i < n; i++) session.act('lever:up:held'); };
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
  assert.ok(MOST.every(kg => kg * GRAVITY < 1e6));
});

test('a child who does exactly what each prompt says passes every step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  assert.equal(session.view().ready, true);
  assert.equal(session.view().last, true);
  assert.match(session.view().prompt, /Try it for real in the helicopter/);
});

test('the words: the stand climbs the mountain, a jar scooped up high holds less, and thin air pushes less', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-altitude');
  session.act('place:down');
  assert.match(say(session), /Sea level is as low as she goes: 0 m/);
  session.act('place:up');
  assert.match(say(session), /Panorama Ridge: 860 m above the sea\. Once more/);
  assert.equal(session.view().ready, false);
  session.act('place:up');
  assert.match(say(session), /Summit Run: 2,860 m above the sea\. That is its altitude/);
  session.act('next');
  assert.equal(session.view().jar.share, 0, 'the jar starts empty');
  assert.equal(session.view().jar.sea, true, 'beside the sea’s full jar');
  session.act('scoop'); until(session, x => x.ready);
  assert.equal(session.view().jar.share, AIR[2]);
  assert.match(say(session), /holds only 75 bits of air up here, where the sea’s held 100/);
  session.act('next');
  session.act('rotor'); until(session, x => x.ready);
  assert.equal(session.view().flight.lever, 1);
  assert.match(say(session), /2,777 kg of push here, against 3,887 kg at Sea level, 71% as much/);
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
  assert.match(say(session), /It stays down: 2,910 kg against the 2,777 kg she can push up here, 133 kg too heavy\. At the sea she had 3,887 kg/);
  assert.equal(session.view().cards.find(c => c.state === 'right').label, 'No, it stays down');
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
  assert.match(say(session), /It went higher: 59%, not 42%\. Thinner air, so more lever just to hover, and more fuel: 34\.4 kg a minute, against 28\.8 at the sea/);
  // Dragged past the red line she climbs, and Brian says so.
  const again = createClassroomSession(lesson);
  playThroughTo(again, 'try-lever'); toSummit(again); again.act('answer:2');
  again.act('hold:0.8');
  assert.match(say(again), /Past the red line: .* so she climbs\. Bring the lever back to the line with S/);
});

test('Brian’s job: too many and too few each say why with the numbers; four, three and two crates pass', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().flight.crates, 0, 'each delivery starts away from its answer');
  deliver(session, 3);
  assert.match(say(session), /She hovers with 3,130 kg, and at Sea level she can push 3,887 kg: room for 757 kg more\. A crate is 500 kg/);
  assert.equal(session.view().help, 1, 'a failed try climbs the help');
  deliver(session, 5);
  assert.match(say(session), /4,130 kg is 243 kg more than the 3,887 kg she can push at Sea level: the load stays down/);
  deliver(session, 4);
  assert.match(say(session), /Right: four crates, 3,630 kg, and she hovers\. One more would be too heavy\. Next: Panorama Ridge/);
  assert.equal(session.view().flight.place, 1);
  deliver(session, 3);
  deliver(session, 3);
  assert.match(say(session), /3,130 kg is 353 kg more than the 2,777 kg she can push at Summit Run/);
  deliver(session, 2);
  assert.equal(session.view().ready, true);
  assert.match(say(session), /Four crates at Sea level, three crates at Panorama Ridge, two crates at Summit Run/);
  session.act('crate:add');
  assert.equal(session.view().flight.crates, 2, 'a finished job takes no more crates');
});

test('the questions: each wrong answer says why with the numbers', () => {
  const answers = {
    'check-why': [[1, /Her weight is the same everywhere: 1,630 kg/], [2, /Her rotor spins just as fast/], [0, /Yes\. A jar of air at Summit Run holds 75 bits/]],
    'check-car': [[0, /At Panorama Ridge she can still push 3,513 kg, more than 2,910 kg/], [2, /At Summit Run she can push only 2,777 kg: 133 kg short/], [1, /Yes\./]],
    'check-game': [[1, /burns the most: 48\.0 kg a minute/], [2, /Refuelling once the crate is on the hook does not count/], [0, /70% of the lever to hover at Summit Run, against 50% at the sea: 37\.9 kg a minute instead of 31\.4/]],
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
  for (const [step, target] of [['word-density', 'scoop'], ['word-thin', 'rotor'], ['try-car', 'place:2'], ['alone', 'crate:add']]) {
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
      if (v.target) assert.ok(targetPoint(v, v.target), `${STEPS[i].id} can point at ${v.target}`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
  // A click on Summit Run, the jar, the rotor, the rack and a drag of the lever do what the keys do.
  const s = createClassroomSession(lesson);
  playThroughTo(s, 'word-altitude');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'place:2')).action, 'place:2');
  playThroughTo(s, 'word-density');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'scoop')).action, 'scoop');
  playThroughTo(s, 'word-thin');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'rotor')).action, 'rotor');
  assert.match(hoverInfo(s.view(), ...targetPoint(s.view(), 'place:0')), /Sea level: 0 m above the sea/);
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
  assert.match(hoverInfo(s.view(), ...targetPoint(s.view(), 'crate:remove')), new RegExp(`A crate: ${CRATE_KG} kg`));
  assert.ok(CAR_KG > 0);
});
