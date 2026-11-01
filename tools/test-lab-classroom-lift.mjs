// LAB-CLASSROOM-LIFT (docs/board/cards/LAB-CLASSROOM-LIFT.md): Lift and weight as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, OWN_KG, MOST_KG, CAR_KG, CRATE_KG, BEST_CRATES, kg, weightOf} from '../src/lab/lessons/lift-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, dragAngle} from '../src/lab/lessons/lift-board.js';
import {padForces, KESTREL, GRAVITY} from '../src/lab/benches/lift-pad.js';
import {heliMass, availableThrust, createHeliState} from '../src/heli/heli-flight.js';
import {CHALLENGE_RULES} from '../src/lab/lab-challenges.js';

const lesson = CLASSROOM_LESSONS.lift;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 30) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
// The key a prompt names ("press 1", "press W", "Hold W") must do what the prompt asks. A held key
// repeats until the lever stops, as a keyboard does.
function followPrompt(session) {
  const v = session.view(), match = v.prompt.match(/(press|hold) (Space|W|\d)/i);
  assert.ok(match, `prompt names no key: ${v.prompt}`);
  const [, how, key] = match, action = v.keys[key];
  assert.ok(action, `the key in "${v.prompt}" does nothing`);
  session.act(action);
  if (/hold/i.test(how)) for (let i = 0; i < 20 && session.view().keys[key]; i++) session.act(`${action}:held`);
  return action;
}
function playThroughTo(session, id, {guesses = {'try-car': 'guess:0', 'try-heavy': 'guess:1'}} = {}) {
  while (session.view().step.id !== id) {
    const v = session.view(), step = v.step.id;
    if (step.startsWith('watch') || step === 'wonder') until(session, x => x.ready, 20);
    else if (step.startsWith('word')) followPrompt(session);
    else if (step.startsWith('try')) {
      followPrompt(session); if (step === 'try-heavy') followPrompt(session);
      assert.equal(session.view().cards.length, 2, `${step}: set-up done, cards to guess`);
      session.act(guesses[step]); followPrompt(session); until(session, x => x.ready, 10);
    } else if (step === 'alone') { session.act('crate:add'); session.act('lever:up'); for (let i = 0; i < 12; i++) session.act('lever:up:held'); until(session, x => x.ready, 10); }
    else if (step.startsWith('check')) session.act(`answer:${{'check-heavy': 2, 'check-more': 0, 'check-game': 1}[step]}`);
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, one idea per step, and is listed for the classroom', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['lift-weight', 'lift-lift', 'lift-collective', 'lift-hover']);
  assert.equal(lesson.name, 'Lift and weight');
});

test('every weight and lift comes from the helicopter’s own flight rules', () => {
  const state = createHeliState({fuelKg: KESTREL.tankKg});
  assert.equal(OWN_KG, heliMass(state));
  assert.equal(MOST_KG, availableThrust(state, 0) / GRAVITY);
  assert.equal(weightOf({car: 1, crates: 2}), padForces({fuel: KESTREL.tankKg, car: 1, crates: 2}).massKg);
  assert.equal(CHALLENGE_RULES.lift.carId, 'dusthawk_rally', 'the lesson’s car is the challenge’s car');
  assert.deepEqual([OWN_KG, CAR_KG, CRATE_KG, Math.floor(MOST_KG)], [1630, 1280, 500, 3887]);
  assert.ok(weightOf({car: 1, crates: 1}) < MOST_KG && weightOf({car: 1, crates: 2}) > MOST_KG, 'Brian’s job has one right answer');
  assert.equal(BEST_CRATES, 1);
});

test('a child who does exactly what each prompt says passes every step with one press or one held key', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const end = session.view();
  assert.ok(end.last && end.ready);
  assert.ok(end.parts.slice(0, -1).every(p => p.done), 'every part before the recap is ticked');
  const events = session.takeEvents();
  assert.ok(events.filter(e => e.kind === 'right' || e.kind === 'pass').length >= 9, 'right answers are celebrated');
  assert.ok(!events.some(e => e.kind === 'fail' || e.kind === 'wrong'), events.filter(e => e.kind === 'fail' || e.kind === 'wrong').map(e => e.say).join(' / '));
});

test('a held key stops the lever on the red line; a fresh press goes past it, and Brian says why she climbs', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-hover');
  let v = session.view();
  assert.equal(v.flight.lift, 1500);
  session.act('lever:up'); assert.equal(session.view().flight.lift, OWN_KG, 'one press reaches the red line');
  for (let i = 0; i < 5; i++) session.act('lever:up:held');
  assert.equal(session.view().flight.lift, OWN_KG, 'holding W stays on the red line');
  assert.ok(session.view().ready);
  run(session, 2); assert.equal(session.view().flight.status, 'hovering');
  const fresh = createClassroomSession(lesson);
  playThroughTo(fresh, 'word-hover');
  assert.ok(!fresh.view().ready);
  // Dragged past the line (more than the lever's click distance away).
  fresh.act(`hold:${OWN_KG + 400}`); fresh.act('release');
  assert.match(fresh.view().brian.text, new RegExp(`${kg(OWN_KG + 400)} of lift is more than her ${kg(OWN_KG)}, so she climbs`));
  fresh.act(`hold:${OWN_KG + 90}`); fresh.act('release');
  assert.equal(fresh.view().flight.lift, OWN_KG, 'a drag near the red line clicks onto it');
  assert.ok(fresh.view().ready);
});

test('a wrong guess says why with the real numbers, and the board shows what happened', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-car');
  session.act('car'); session.act('guess:1'); session.act('lever:weight');
  until(session, v => v.ready, 10);
  let v = session.view();
  assert.equal(v.mood, 'explain');
  assert.ok(v.brian.text.includes(kg(weightOf({car: 1}))) && v.brian.text.includes(kg(Math.floor(MOST_KG))), v.brian.text);
  assert.deepEqual(v.cards.map(c => c.state), ['right', 'wrong']);
  assert.equal(v.flight.status, 'hovering');
  session.act('next');
  session.act('crate:add'); session.act('crate:add'); session.act('guess:0'); session.act('lever:top');
  until(session, x => x.ready, 10);
  v = session.view();
  assert.match(v.brian.text, new RegExp(`${kg(weightOf({car: 1, crates: 2}))}: ${kg(Math.ceil(weightOf({car: 1, crates: 2}) - MOST_KG))} too heavy`));
  assert.equal(v.flight.status, 'taut', 'the cable is tight but the load stays down');
  assert.equal(v.flight.pad, Math.max(0, weightOf({car: 1, crates: 2}) - MOST_KG), 'the pad feels the weight the rotor cannot hold');
});

test('Brian’s job: each wrong load says what to change with the real numbers; only the most crates pass', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('lever:weight'); until(session, v => v.help > 0, 5);
  assert.match(session.view().brian.text, new RegExp(`room for ${kg(MOST_KG - weightOf({car: 1}))} more\\. A crate is 500 kg`));
  session.act('crate:add'); session.act('crate:add');
  assert.equal(session.view().flight.lift, 0, 'loading sets her down');
  session.act('lever:top'); until(session, v => v.help > 1, 5);
  assert.match(session.view().brian.text, /23 kg more than the 3,887 kg she can push.*Take a crate off with 2/);
  assert.ok(!session.view().ready);
  session.act('crate:remove'); session.act('lever:weight'); until(session, v => v.ready, 5);
  assert.match(session.view().brian.text, /Dusthawk and 1 crate, 3,410 kg, and she hovers/);
});

test('help climbs from a nudge to a plain step to Brian pressing the exact control', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-heavy');
  const hints = session.view().hints;
  for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
  let v = session.view();
  assert.equal(v.pointer.action, 'crate:add');
  assert.equal(hitTest(v, ...targetPoint(v, 'crate:add'))?.action, 'crate:add', 'Brian points at something a click there really presses');
  run(session, SHOW_ME_S + .2);
  assert.equal(session.view().flight.crates, 1); assert.match(session.view().brian.text, /^Like that\. /);
  session.act('crate:add'); session.act('guess:1');
  for (let i = 0; i < 3; i++) session.act('help');
  v = session.view();
  assert.equal(v.pointer.action, 'lever:top');
  const [x, y] = targetPoint(v, 'lever:top');
  assert.equal(hitTest(v, x, y)?.drag, 'lever');
  assert.ok(Math.abs(dragAngle(v, 'lever', x, y) - MOST_KG) < 1, 'a press on the top stop asks for the most lift');
  run(session, SHOW_ME_S + .2);
  assert.ok(session.view().flight.lift >= MOST_KG - .5);
});

test('mouse: the crates, the car, the rotor and the lever can be clicked, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-weight');
  let v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'crate:add'))?.action, 'crate:add');
  assert.match(hoverInfo(v, ...targetPoint(v, 'crate:add')), /Spare crates, 500 kg each/);
  playThroughTo(session, 'word-lift');
  v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'rotor'))?.action, 'rotor');
  assert.match(hoverInfo(v, ...targetPoint(v, 'rotor')), /rotor/);
  playThroughTo(session, 'try-car');
  v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'car'))?.action, 'car');
  assert.match(hoverInfo(v, ...targetPoint(v, 'lever:weight')), /red line is her weight, 1,630 kg/);
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
    session.act(`go:${i}`); run(session, 1.5);
    calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
    assert.ok(calls.has('fillText') && calls.has('fillRect'), `${STEPS[i].id} draws its board`);
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fillRect') || calls.has('fill'), `${c.id} draws a picture`); }
  }
});

test('replays: the wonder and the lever show run again, and a try sets down and lifts again', () => {
  const session = createClassroomSession(lesson);
  run(session, 9); assert.ok(session.view().ready);
  session.act('replay'); assert.equal(session.view().flight.crates, 2, 'the wonder starts again with both crates');
  playThroughTo(session, 'try-car');
  session.act('car'); session.act('guess:0'); session.act('lever:weight'); until(session, v => v.ready, 10);
  session.act('replay'); session.act('replay'); run(session, .1);
  assert.equal(session.view().flight.h, 0, 'she sets down');
  run(session, 3);
  assert.equal(session.view().flight.status, 'hovering', 'and lifts again with the same lever');
});

test('review fixes: Show me clears a stray crate; the job says what is loaded; Watch again on the job; the Collective pointer', () => {
  let session = createClassroomSession(lesson);
  playThroughTo(session, 'try-car');
  session.act('crate:add');
  for (let i = 0; i < 3; i++) session.act('help');
  assert.equal(session.view().pointer.action, 'crate:remove');
  run(session, SHOW_ME_S + .2);
  assert.equal(session.view().flight.crates, 0, 'Brian takes the stray crate off first');
  for (let i = 0; i < 3; i++) session.act('help');
  run(session, SHOW_ME_S + .2);
  assert.deepEqual([session.view().flight.car, session.view().cards.length], [1, 2], 'then hooks the car and hands over the guess');
  session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('crate:add'); session.act('crate:add');
  assert.match(session.view().brian.text, /^The Dusthawk and 2 crates: 3,910 kg\./);
  session.act('crate:remove');
  assert.match(session.view().brian.text, /^The Dusthawk and 1 crate: 3,410 kg\. Now the lever\./, 'the old “take one off” line is gone');
  session.act('lever:weight'); until(session, v => v.ready, 5);
  session.act('replay'); run(session, .1); assert.equal(session.view().flight.h, 0, 'Watch again works on the job');
  run(session, 3); assert.equal(session.view().flight.status, 'hovering');
  session = createClassroomSession(lesson);
  playThroughTo(session, 'word-collective');
  session.act('lever:down');
  for (let i = 0; i < 3; i++) session.act('help');
  const v = session.view(), [x, y] = targetPoint(v, v.pointer.action);
  assert.ok(Math.abs(dragAngle(v, 'lever', x, y) - 1000) < 1, 'Brian points at the 1,000 kg mark');
  run(session, SHOW_ME_S + .2);
  assert.ok(session.view().ready, 'Show me finishes the step even after the lever went down');
  session = createClassroomSession(lesson);
  playThroughTo(session, 'check-heavy');
  session.act('answer:0');
  assert.match(session.view().brian.text, /That load is 1,280 kg, so with Kestrel One’s 1,630 kg she weighs 2,910 kg/);
});
