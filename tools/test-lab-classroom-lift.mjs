// LAB-CLASSROOM-LIFT (docs/board/cards/LAB-CLASSROOM-LIFT.md): Lift and weight as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {readFileSync} from 'node:fs';
import {STEPS, OWN_KG, MOST_KG, CAR_KG, CRATE_KG, BEST_CRATES, BAND_M, HOLD_S, FREE_TRIES, kg, weightOf, leverShare} from '../src/lab/lessons/lift-classroom.js';
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
// Three different settings: the lever is moved up a notch between tests.
function freeTests(session) { for (let i = 0; i < FREE_TRIES; i++) { session.act('lever:up'); session.act('go'); } }
function playThroughTo(session, id, {guesses = {'try-car': 'guess:0', 'try-heavy': 'guess:1'}} = {}) {
  while (session.view().step.id !== id) {
    const v = session.view(), step = v.step.id;
    if (step.startsWith('watch') || step === 'wonder') until(session, x => x.ready, 20);
    else if (step.startsWith('word')) followPrompt(session);
    else if (step === 'try-free') { freeTests(session); }
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
  assert.deepEqual([CHALLENGE_RULES.lift.low, CHALLENGE_RULES.lift.high, CHALLENGE_RULES.lift.holdSeconds], [...BAND_M, HOLD_S], 'the lesson states the challenge’s own band and time');
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

test('a held key stops the lever on the red line; a fresh press goes past it, and Brian says why the helicopter climbs', () => {
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
  assert.match(fresh.view().brian.text, new RegExp(`A lift of ${kg(OWN_KG + 400)} is more than the helicopter’s weight of ${kg(OWN_KG)}, so the helicopter climbs`));
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
  assert.match(v.brian.text, new RegExp(`${kg(weightOf({car: 1, crates: 2}))}, so the load is ${kg(Math.ceil(weightOf({car: 1, crates: 2}) - MOST_KG))} too heavy`));
  assert.equal(v.flight.status, 'taut', 'the cable is tight but the load stays down');
  assert.equal(v.flight.pad, Math.max(0, weightOf({car: 1, crates: 2}) - MOST_KG), 'the pad feels the weight the rotor cannot hold');
});

test('Brian’s job: each wrong load says what to change with the real numbers; only the most crates pass', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('lever:weight'); until(session, v => v.help > 0, 5);
  assert.match(session.view().brian.text, new RegExp(`room for ${kg(MOST_KG - weightOf({car: 1}))} more\\. A crate weighs 500 kg`));
  session.act('crate:add'); session.act('crate:add');
  assert.equal(session.view().flight.lift, 0, 'loading sets the helicopter down');
  session.act('lever:top'); until(session, v => v.help > 1, 5);
  assert.match(session.view().brian.text, /23 kg more than the 3,887 kg that the rotor can push.*Take a crate off by pressing 2/);
  assert.ok(!session.view().ready);
  session.act('crate:remove'); session.act('lever:weight'); until(session, v => v.ready, 5);
  assert.match(session.view().brian.text, /Dusthawk and 1 crate on the cable, the total weight is 3,410 kg and the helicopter hovers/);
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
  assert.equal(session.view().flight.crates, 1); assert.match(session.view().brian.text, /^That is how it is done. /);
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
  assert.match(hoverInfo(v, ...targetPoint(v, 'crate:add')), /spare crates, 500 kg each/);
  playThroughTo(session, 'word-lift');
  v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'rotor'))?.action, 'rotor');
  assert.match(hoverInfo(v, ...targetPoint(v, 'rotor')), /rotor/);
  playThroughTo(session, 'try-car');
  v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'car'))?.action, 'car');
  assert.match(hoverInfo(v, ...targetPoint(v, 'lever:weight')), /red line marks the total weight, 1,630 kg/);
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
  session.act('replay'); assert.equal(session.view().flight.crates, 3, 'the wonder starts again with all three crates');
  playThroughTo(session, 'try-car');
  session.act('car'); session.act('guess:0'); session.act('lever:weight'); until(session, v => v.ready, 10);
  session.act('replay'); session.act('replay'); run(session, .1);
  assert.equal(session.view().flight.h, 0, 'the helicopter sets down');
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
  assert.match(session.view().brian.text, /^With the Dusthawk and 2 crates on the cable, the total weight is 3,910 kg\./);
  session.act('crate:remove');
  assert.match(session.view().brian.text, /^With the Dusthawk and 1 crate on the cable, the total weight is 3,410 kg\. Now move the lever\./, 'the old “take one off” line is gone');
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
  assert.match(session.view().brian.text, /That load weighs 1,280 kg, and with Kestrel One’s 1,630 kg the total is 2,910 kg/);
});

const worked = (view, title) => view.formulas.find(f => f.title === title)?.worked;
test('the sums: weight in newtons, the lever’s share and the force left over all follow the load and the lever on each press', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-weight');
  assert.equal(worked(session.view(), 'The weight in newtons'), '1,630 kg × 9.81 = 15,990.3 N');
  session.act('crate:add');
  assert.equal(worked(session.view(), 'The total mass'), '1,150 + 80 + 400 + 500 = 2,130 kg');
  assert.equal(worked(session.view(), 'The weight in newtons'), '2,130 kg × 9.81 = 20,895.3 N');
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  const title = 'The lift at this lever setting';
  assert.equal(worked(free.view(), title), '0.0000 × 3,887 kg = 0 kg');
  free.act('lever:up');
  assert.equal(worked(free.view(), title), '0.1286 × 3,887 kg = 500 kg', 'the lever changes the sum');
  assert.match(worked(free.view(), 'The force left over'), /^500 − 1,630 = −1,130 kg, so the helicopter stays on the pad/);
  assert.match(worked(free.view(), 'The lever needed to hover'), /^1,630 kg ÷ 3,887 kg = 0\.4193, which is 42%/);
  free.act('car');
  assert.equal(worked(free.view(), 'The total mass'), '1,150 + 80 + 400 + 1,280 = 2,910 kg', 'the load changes the sum');
  assert.match(worked(free.view(), 'The lever needed to hover'), /^2,910 kg ÷ 3,887 kg = 0\.7486, which is 75%/);
  free.act('crate:add'); free.act('crate:add');
  assert.match(worked(free.view(), 'The lever needed to hover'), /^3,910 kg ÷ 3,887 kg = 1\.0059, which is 101%, so the lever cannot reach it/);
});

test('every shown lever sum comes out on a calculator, and the rotor’s most push is the game’s own', () => {
  for (let lift = 0; lift <= 3880; lift += 10) assert.equal(Math.round(Number(leverShare(lift).toFixed(4)) * 3887), lift, `lever sum at ${lift} kg`);
  assert.equal(Number(leverShare(MOST_KG).toFixed(4)), 1);
  for (const load of [{}, {car: 1}, {crates: 1}, {car: 1, crates: 1}, {crates: 4}]) assert.equal(Math.round(Number(leverShare(weightOf(load)).toFixed(4)) * 3887), weightOf(load));
  assert.equal(Math.round(3380.4 * 1.15), Math.floor(MOST_KG));
  assert.ok(Math.abs(KESTREL.maxThrust / GRAVITY - 3380.4) < 1e-6);
  assert.equal(Math.round(1630 * 9.81 * 10) / 10, 15990.3);
});

test('the free test: only different settings count, the table keeps them, and three open Continue', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  assert.ok(!session.view().ready);
  session.act('go');
  assert.equal(session.view().freeTable.length, 1);
  assert.match(session.view().brian.text, /total weight is 1,630 kg\. The lever is at 0%, which gives a lift of 0 kg\. That is 1,630 kg less than the weight/);
  session.act('go');
  assert.match(session.view().brian.text, /already tested/);
  assert.equal(session.view().freeTable.length, 1, 'the same setting does not count twice');
  for (let i = 0; i < 3; i++) session.act('lever:up');
  session.act('lever:up:held'); session.act('go');
  assert.match(session.view().brian.text, /equal, so the two forces cancel and the helicopter hovers/);
  session.act('crate:add');
  assert.equal(session.view().flight.lift, 0, 'loading sets the helicopter down');
  assert.ok(!session.view().ready);
  session.act('lever:top'); session.act('go');
  assert.ok(session.view().ready, 'three different settings open Continue');
  assert.equal(session.view().freeTable.length, 3);
  assert.deepEqual(session.view().freeTable.map(r => r.value), ['stays down', 'hovers', 'climbs']);
});

test('Show me on the free test reaches three different settings by itself, and says what it will do', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  for (let i = 0; i < FREE_TRIES; i++) {
    assert.ok(!session.view().ready);
    for (let h = 0; h < 3; h++) session.act('help');
    assert.match(session.view().brian.text, /I will set a load and a lever that you have not tested yet/);
    assert.equal(session.view().pointer.action, 'set:best');
    assert.ok(hitTest(session.view(), ...targetPoint(session.view(), 'set:best')), 'Brian points at the lever');
    run(session, SHOW_ME_S + .2);
    assert.equal(session.view().freeTable.length, i + 1);
  }
  assert.ok(session.view().ready);
});

test('nothing gives a guess or a question away while it is open', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-heavy');
  session.act('crate:add'); session.act('crate:add');
  let v = session.view();
  assert.equal(v.cards.length, 2);
  assert.equal(v.gauge, 'plain', 'no red line above the top');
  assert.ok(!v.formulas.some(f => /cannot reach|101%|too heavy/.test(`${f.worked} ${f.note}`)), 'the panel does not settle the guess');
  // The wonder and the watch never show the Dusthawk with two crates, so this guess really is open.
  assert.deepEqual(weightOf({car: 1, crates: 2}), 3910);
  const first = createClassroomSession(lesson);
  assert.equal(first.view().flight.crates, 3);
  run(first, 6); assert.equal(first.view().flight.crates, 1, 'two crates come off at once, so two is never shown');
  playThroughTo(first, 'watch-loads');
  assert.deepEqual(first.view().sets.map(f => [f.car, f.crates]), [[0, 1], [0, 3], [0, 4]]);
  for (const [id, pick] of [['check-heavy', 2], ['check-more', 0], ['check-game', 1]]) {
    const s = createClassroomSession(lesson);
    playThroughTo(s, id);
    assert.ok(s.view().formulas.every(f => !f.worked && !f.note), `${id}: only general formulas while the question is open`);
    assert.ok(!s.view().formulas.some(f => /Dusthawk/.test(f.title)), `${id}: no title names the answer`);
    s.act(`answer:${pick}`);
    assert.ok(s.view().formulas.some(f => f.worked), `${id}: the sums appear with the answer`);
  }
});

test('a hint about the lever is right from either side of the red line', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-hover');
  assert.match(session.view().hints[1], /Press W until/);
  session.act(`hold:${OWN_KG + 400}`); session.act('release');
  assert.match(session.view().hints[1], /Press S until/);
});

test('a word does not appear before the step that defines it, and every view is free of the old faults', () => {
  const session = createClassroomSession(lesson);
  const seenBefore = {lever: 'word-collective', rotor: 'word-lift', hover: 'word-hover'};
  playThroughTo(session, 'recap');
  for (const step of STEPS) {
    session.act(`go:${STEPS.indexOf(step)}`);
    const v = session.view(), words = [v.say, v.prompt, ...v.hints, ...v.formulas.flatMap(f => [f.title, f.formula, f.worked, f.note])].filter(Boolean).join(' ').toLowerCase();
    for (const [word, from] of Object.entries(seenBefore)) if (STEPS.indexOf(step) < STEPS.findIndex(s => s.id === from)) assert.ok(!words.includes(word), `${step.id} uses “${word}” before it is defined`);
    assert.ok(v.formulas.every(f => f.title), `${step.id}: every panel entry has a title`);
    assert.ok(!/\bbench\b/i.test(words), `${step.id} says bench`);
  }
  for (const file of ['lift-classroom.js', 'lift-board.js']) {
    const source = readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8');
    for (const pattern of [/\b(she|her|hers|herself)\b/i, /\bmph\b/i, /\bdecides?\b/i, /\b(air|wind)\s+(soon\s+)?takes\b/i, /\bfeels?\b/i]) assert.ok(!pattern.test(source), `${file}: ${source.match(pattern)?.[0]}`);
  }
});

test('review: the free test follows both guided guesses, so that its Show me cannot answer them', () => {
  const at = id => STEPS.findIndex(s => s.id === id);
  assert.ok(at('try-free') > at('try-car') && at('try-free') > at('try-heavy'));
  assert.ok(at('try-free') < at('alone'));
  assert.match(createClassroomSession(lesson).view().say, /a rally car called the Dusthawk/, 'the Dusthawk is named when it first appears');
});

test('review: what the words say about W and S holds in both Assisted and Real flying', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'check-game');
  const v = session.view();
  assert.equal(v.cards.findIndex(c => /come back to equal the weight/.test(c.label)), 1);
  session.act('answer:1');
  assert.match(session.view().brian.text, /In Assisted flying.*let go of W.*In Real flying you press S/);
  const idea = lesson.keyIdeas.find(i => i.id === 'ease').text;
  assert.match(idea, /In Assisted flying, letting go of W.*In Real flying, W and S move the lever/);
  assert.match(lesson.challengeCard.text, /In Assisted flying.*In Real flying/);
  assert.match(lesson.words.find(w => w.id === 'lift-collective').meaning, /In Real flying.*In Assisted flying/);
  const word = createClassroomSession(lesson); playThroughTo(word, 'word-collective');
  assert.match(word.view().say, /Real flying.*Assisted flying/);
});

test('review: the job separates the rotor’s limit from the hook’s, and its prompt is right above the line', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('crate:add');
  assert.match(session.view().prompt, /hold W/);
  session.act('hold:3700'); session.act('release');
  assert.equal(session.view().flight.lift, 3700);
  assert.match(session.view().prompt, /press S \(or ↓\), or drag the lever, back down to the red line/);
  assert.doesNotMatch(session.view().prompt, /hold W/);
  session.act('lever:weight'); until(session, v => v.ready, 5);
  assert.equal(KESTREL.hookLimitKg, 1500);
  assert.match(session.view().brian.text, /measures only the rotor.*separate limit.*more than 1,500 kg/);
  assert.doesNotMatch(session.view().brian.text, /most that the helicopter can carry/);
});

test('review: the dial’s sum is true while the helicopter is off the pad, and it agrees with the dial', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-collective');
  session.act('hold:3000'); session.act('release'); run(session, 2);
  session.act('hold:1000'); session.act('release'); run(session, .1);
  const v = session.view();
  assert.ok(v.flight.h > 0, 'still in the air');
  assert.equal(v.flight.pad, 0);
  assert.equal(worked(v, 'What the pad’s dial reads'), 'The helicopter is off the pad, so the dial reads 0 kg');
  run(session, 5);
  assert.equal(worked(session.view(), 'What the pad’s dial reads'), '1,630 − 1,000 = 630 kg');
});

test('review: metres are defined before “1 m” is used, and the rotor’s limit is said in plain English', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const hover = STEPS.findIndex(s => s.id === 'word-hover');
  STEPS.forEach((step, i) => {
    session.act(`go:${i}`);
    const v = session.view(), words = [v.say, v.prompt, ...v.hints, ...v.formulas.flatMap(f => [f.worked, f.note])].filter(Boolean).join(' ');
    if (i < hover) assert.doesNotMatch(words, /\d m\b/, `${step.id} uses metres too early`);
    if (i === hover) assert.match(words, /one metre, written 1 m/);
    assert.doesNotMatch(words, /has a most\b|a most push of/, step.id);
  });
  for (const idea of lesson.keyIdeas) assert.doesNotMatch(idea.text, /has a most\b/);
});
