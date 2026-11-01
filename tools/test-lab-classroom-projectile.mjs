// LAB-CLASSROOM-PROJECTILE (docs/board/cards/LAB-CLASSROOM-PROJECTILE.md): Projectile motion as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, JOB, RING_M, HIGH_M, LOW_M, BEST_LET_GO_M, TOP_FALL_MS, landing, dropPoint, metres} from '../src/lab/lessons/projectile-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint, dragAngle} from '../src/lab/lessons/projectile-board.js';
import {projectileBench, waterDrop, waterTrace, stoneDrop, stoneFallAfter} from '../src/lab/benches/projectile.js';
import {BUCKET} from '../src/heli/heli-bucket.js';
import {GRAVITY} from '../src/heli/heli-flight.js';

const lesson = CLASSROOM_LESSONS.projectile;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 30) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const water = (v, h = HIGH_M) => waterDrop(h, v).distanceM;
// The key a prompt names ("press Space", "press 1") must do what the prompt asks.
function followPrompt(session) {
  const v = session.view(), match = v.prompt.match(/press (Space|\d)/i);
  assert.ok(match, `prompt names no key: ${v.prompt}`);
  const action = v.keys[match[1]];
  assert.ok(action, `the key in "${v.prompt}" does nothing`);
  session.act(action);
  return action;
}
// The job: Space sets her off, Space again when the bucket is over the let-go point.
function flyAndLetGo(session, at) {
  session.act('drop');
  until(session, v => v.helis[0].x >= at, 10);
  session.act('drop');
  until(session, v => v.drops.length && v.drops.every(d => d.landed), 10);
}
function playThroughTo(session, id, {flag = Math.round(water(15)), guess = 1} = {}) {
  while (session.view().step.id !== id) {
    const v = session.view(), step = v.step.id;
    if (step.startsWith('watch') || step === 'wonder') until(session, x => x.ready, 20);
    else if (step.startsWith('word')) { followPrompt(session); until(session, x => x.ready, 10); }
    else if (step === 'try-flag') {
      for (let i = 0; i < flag; i++) session.act('flag:right');
      followPrompt(session); until(session, x => x.ready, 10);
    } else if (step === 'try-height') {
      assert.equal(v.cards.length, 3, 'the guess comes first');
      session.act(`answer:${guess}`); followPrompt(session); until(session, x => x.ready, 10);
    } else if (step === 'alone') flyAndLetGo(session, BEST_LET_GO_M);
    else if (step.startsWith('check')) session.act(`answer:${{'check-over': 2, 'check-faster': 0, 'check-game': 1}[step]}`);
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, one idea per step, and is listed for the classroom', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['projectile-gravity', 'projectile-forward-speed', 'projectile-arc'], 'the old lesson’s notebook ids');
  assert.equal(lesson.name, 'Projectile motion');
  assert.equal(lesson.challengeCard.title, 'Let go before the buoy.');
});

test('every landing comes from the bucket’s own water parcels, the ones the challenge’s buoys are hit by', () => {
  // The aim ring (waterDrop) and the parcel trace agree everywhere the board can drop from.
  for (const [height, speed] of [[10, 0], [10, 10], [30, 5], [30, 10], [30, 15], [30, 20], [60, 30]]) {
    const trace = waterTrace(height, speed), last = trace.at(-1), r = projectileBench.run({heightM: height, speedMs: speed});
    assert.equal(last.distanceM, r.water.distanceM); assert.equal(last.seconds, r.water.seconds); assert.equal(last.heightM, 0);
    assert.deepEqual(landing('water', height, speed), {distanceM: r.water.distanceM, seconds: r.water.seconds});
    assert.equal(dropPoint('water', height, speed, 99).x, r.water.distanceM, 'the drawn path ends on the landing');
  }
  for (const t of [1, 2, 3]) assert.equal(stoneFallAfter(t), GRAVITY * t * t / 2);
  assert.equal(stoneDrop(30, 0).seconds, stoneDrop(30, 30).seconds, 'forward speed does not change a stone’s fall time');
  assert.equal(dropPoint('stone', 30, 10, 1).x, 10, 'a stone keeps her forward speed');
  assert.equal(TOP_FALL_MS, BUCKET.fallSpeed);
  // The numbers Brian says.
  assert.deepEqual([5, 10, 15, 20].map(v => Math.round(water(v))), [6, 10, 13, 15]);
  assert.equal(Math.round(water(10, LOW_M)), 9);
  assert.deepEqual([10, 20].map(v => Math.round(stoneDrop(30, v).distanceM)), [25, 49]);
  assert.equal(BEST_LET_GO_M, JOB.buoyM - water(JOB.speed));
});

test('a child who does exactly what each prompt says passes every step with one press', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const end = session.view();
  assert.ok(end.last && end.ready);
  assert.ok(end.parts.slice(0, -1).every(p => p.done), 'every part before the recap is ticked');
  const events = session.takeEvents();
  assert.ok(events.filter(e => e.kind === 'right' || e.kind === 'pass').length >= 9, 'right answers are celebrated');
  assert.ok(!events.some(e => e.kind === 'fail' || e.kind === 'wrong'), events.filter(e => e.kind === 'fail' || e.kind === 'wrong').map(e => e.say).join(' / '));
  assert.ok(events.some(e => e.kind === 'sound' && e.sound === 'lab.splash'), 'a splash sounds');
});

test('the words: gravity marks 5 m then 20 m, a stone stays under her, and a faster arc is longer', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-gravity');
  session.act('drop'); run(session, 1.05);
  let v = session.view();
  assert.ok(Math.abs(v.drops[0].h - dropPoint('stone', HIGH_M, 0, v.drops[0].t).y - stoneFallAfter(v.drops[0].t)) < 1e-9);
  until(session, x => x.ready, 5);
  assert.match(session.view().brian.text, /fell 5 m in the first second and 15 m more in the next: faster every second\. It reached the water after 2\.5 s/);
  session.act('next'); session.act('drop');
  until(session, x => x.drops.length > 0, 3); run(session, 1);
  v = session.view();
  const d = v.drops[0], p = dropPoint('stone', d.h, d.v, d.t);
  assert.ok(Math.abs(d.x0 + p.x - v.helis[0].x) < .01, 'the stone is right under her as it falls');
  until(session, x => x.ready, 5);
  assert.match(session.view().brian.text, /stayed right under her and landed 25 m ahead/);
  session.act('next');
  assert.equal(session.view().ghosts[0].v, 10, 'the 10 m/s arc stays faint beside the new one');
  session.act('drop'); until(session, x => x.ready, 5);
  assert.match(session.view().brian.text, /49 m ahead, about twice the 25 m at 10 m\/s/);
});

test('the flag: a wrong guess says why with the real numbers, either side', () => {
  let session = createClassroomSession(lesson);
  playThroughTo(session, 'try-flag');
  session.act('drop'); until(session, v => v.ready, 10);
  let v = session.view();
  assert.equal(v.mood, 'explain');
  assert.match(v.brian.text, /It landed 13 m ahead, 13 m past your flag\. At 15 m\/s it carries on forward further than that: between the 10 m it went at 10 m\/s and the 15 m at 20 m\/s\./);
  assert.deepEqual(v.marks.map(k => k.label), ['13 m']);
  session = createClassroomSession(lesson);
  playThroughTo(session, 'try-flag');
  session.act('hold:25.4'); session.act('release');
  assert.equal(session.view().flag, 25, 'a drag puts the flag on a whole metre');
  for (let i = 0; i < 99; i++) session.act('flag:right:held');
  assert.equal(session.view().flag, 45, 'the flag stops at the end of the ruler');
  session.act('hold:25'); session.act('drop'); until(session, x => x.ready, 10);
  assert.match(session.view().brian.text, /It landed 13 m ahead, 12 m short of your flag\. Air slows the spray, so it lands short of where a stone would/);
  session.act('replay'); assert.equal(session.view().flag, 25, 'Watch again keeps the flag');
  until(session, x => x.drops.length && x.drops.every(d => d.landed), 10);
});

test('low or high: each wrong guess says why with both landings', () => {
  for (const [guess, says] of [[0, /^Only a little further: 9 m from 10 m up, 10 m from 30 m up\. The air soon takes the spray’s forward speed, so height hardly matters\./], [2, /^Higher never lands shorter, but only a little further for water: 9 m from 10 m up, 10 m from 30 m up\./]]) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, 'try-height');
    session.act(`answer:${guess}`); session.act('drop'); until(session, v => v.ready, 10);
    const v = session.view();
    assert.match(v.brian.text, says);
    assert.deepEqual(v.cards.map(c => c.state), [guess === 0 ? 'wrong' : null, 'right', guess === 2 ? 'wrong' : null]);
    assert.deepEqual(v.marks.map(k => k.label).sort(), ['10 m', '9 m']);
  }
});

test('Brian’s job: each miss says what to change with the real numbers; only a splash in the ring passes', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  flyAndLetGo(session, JOB.buoyM);
  assert.match(session.view().brian.text, /^You let go right over the buoy\. The water keeps her forward speed and lands 10 m ahead, so it splashed 10 m past\. Let go 10 m before the buoy\./);
  assert.equal(session.view().help, 1);
  // The metres before the buoy and the miss add up to the metres the water carried on.
  const adds = (text, pattern, sign) => { const [, before, ahead, miss] = text.match(pattern).map(Number); assert.equal(before + sign * miss, ahead, text); return before; };
  flyAndLetGo(session, BEST_LET_GO_M + RING_M + 1);
  assert.ok(adds(session.view().brian.text, /^You let go (\d+) m before the buoy, but the water lands (\d+) m ahead, so it splashed (\d+) m past\. Let go a little sooner\./, 1) <= 5);
  flyAndLetGo(session, BEST_LET_GO_M - RING_M - 2);
  const said = session.view().brian.text.match(/fell (\d+) m short/)[1];
  assert.equal(session.view().marks.at(-1).label, `${said} m short`, 'the mark on the water says what Brian says');
  assert.ok(adds(session.view().brian.text, /^You let go (\d+) m before the buoy\. The water lands (\d+) m ahead, so it fell (\d+) m short\. Let go a little later\./, -1) >= 15);
  assert.ok(!session.view().ready);
  session.act('drop'); until(session, v => v.phase === undefined && v.prompt === 'Press Space to go round again.', 12);
  assert.match(session.view().brian.text, /She flew past without letting go/);
  flyAndLetGo(session, BEST_LET_GO_M + RING_M - .5);
  assert.ok(session.view().ready);
  assert.match(session.view().brian.text, /^Splash on the buoy! You let go [67] m before it, and the water carried on forward 10 m\. Job done\./);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me hits the buoy', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  const hints = session.view().hints;
  for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
  const v = session.view();
  assert.equal(v.pointer.action, 'drop:best');
  assert.equal(hitTest(v, ...targetPoint(v, 'drop:best'))?.action, 'drop', 'Brian points at something a click there really presses');
  run(session, SHOW_ME_S + .2);
  assert.match(session.view().brian.text, /^Like that\. /);
  until(session, x => x.ready, 10);
  assert.match(session.view().brian.text, /^Splash on the buoy! You let go 10 m before it/);
  const flag = createClassroomSession(lesson);
  playThroughTo(flag, 'try-flag');
  for (let i = 0; i < 3; i++) flag.act('help');
  assert.equal(flag.view().pointer.action, 'drop');
  run(flag, SHOW_ME_S + .2);
  assert.equal(flag.view().helis[0].set, true, 'Brian lets go with the flag where it is');
});

test('every check says why a wrong answer is wrong, with the numbers, and then shows it', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'check-over');
  session.act('answer:1');
  assert.match(session.view().brian.text, /keeps her forward speed, so it carries on forward as it falls: it lands 10 m past the buoy/);
  until(session, v => v.marks.length > 0, 10);
  assert.equal(session.view().marks[0].label, '10 m past');
  session.act('next'); session.act('answer:1');
  assert.match(session.view().brian.text, /At 20 m\/s the water lands 15 m ahead, not 10 m, so she lets go 15 m before the buoy: further back/);
  until(session, v => v.marks.length > 0, 10);
  assert.equal(session.view().marks[0].label, 'on the buoy');
  session.act('next'); session.act('answer:2');
  assert.match(session.view().brian.text, /Height hardly changes where water lands/);
  session.act('replay'); assert.equal(session.view().cards[1].state, 'right', 'Watch again keeps the answer');
});

test('mouse: the flag drags on the water, the helicopter can be clicked, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-flag');
  let v = session.view();
  const [x, y] = targetPoint(v, 'flag:right');
  assert.equal(hitTest(v, x + 60, y + 40)?.drag, 'flag');
  assert.equal(Math.round(dragAngle(v, 'flag', ...targetPoint(v, 'flag:right'))), 0);
  assert.match(hoverInfo(v, x, y), /Your flag, 0 m from the post/);
  assert.match(hoverInfo(v, ...targetPoint(v, 'drop')), /water bucket, 30 m above the lake/);
  playThroughTo(session, 'alone');
  v = session.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'drop'))?.action, 'drop');
  assert.match(hoverInfo(v, 200 + JOB.buoyM * 12, 596), /buoy/);
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
    for (const t of [0, 2.5, 2.5]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fillRect') || calls.has('fill'), `${c.id} draws a picture`); }
  }
});

test('replays: the wonder loops, and the watch steps start again', () => {
  const session = createClassroomSession(lesson);
  until(session, v => v.ready, 10);
  until(session, v => v.marks.length === 0, 6);
  assert.ok(session.view().ready, 'the wonder plays again by itself and stays ready');
  playThroughTo(session, 'watch-speeds');
  until(session, v => v.ready, 10);
  assert.deepEqual(session.view().table.map(r => r.value), ['6 m', '10 m', '15 m']);
  session.act('replay');
  assert.deepEqual(session.view().table.map(r => r.value), [null, null, null]);
  assert.equal(metres(-4.6), '5 m');
});
