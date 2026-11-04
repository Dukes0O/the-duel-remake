// LAB-CLASSROOM-PROJECTILE (docs/board/cards/LAB-CLASSROOM-PROJECTILE.md): Projectile motion as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, JOB, RING_M, HIGH_M, LOW_M, BEST_LET_GO_M, TOP_FALL_MS, FREE_TRIES, landing, dropPoint, dropSpeed, metres} from '../src/lab/lessons/projectile-classroom.js';
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
// The job: Space sets the helicopter off, Space again when the bucket is over the release point.
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
    else if (step === 'try-free') for (let i = 0; i < FREE_TRIES; i++) { if (i) session.act('speed:up'); followPrompt(session); until(session, x => x.keys.Space === 'drop', 15); }
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
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['projectile-metres-per-second', 'projectile-gravity', 'projectile-forward-speed', 'projectile-arc'], 'the new word, then the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.id).sort(), ['projectile-acceleration', 'projectile-arc', 'projectile-forward-speed', 'projectile-gravity', 'projectile-metres-per-second']);
  assert.equal(lesson.name, 'Projectile motion');
  assert.equal(lesson.challengeCard.title, 'Release the water before the buoy.');
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
  assert.equal(dropPoint('stone', 30, 10, 1).x, 10, 'a stone keeps the helicopter’s forward speed');
  assert.deepEqual(dropSpeed('stone', 30, 10, 1), {forward: 10, down: GRAVITY}, 'the stone’s arrows: forward stays, downward grows');
  assert.ok(dropSpeed('water', 30, 10, 1).forward < 5, 'the water loses more than half its forward speed in the first second, as Brian says');
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

test('metres per second: the dial changes the speed and the sum, and the result explains km/h', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-metres');
  assert.match(session.view().brian.text, /measure speed in metres per second, which is written m\/s\. An object moving at 10 m\/s travels 10 metres during every second/);
  assert.equal(session.view().formulas[1].worked, '10 m/s × 3.6 = 36 km/h');
  session.act('speed:up');
  assert.equal(session.view().formulas[0].worked, '15 m ÷ 1 s = 15 m/s', 'the formula changes with the control');
  assert.equal(session.view().formulas[1].worked, '15 m/s × 3.6 = 54 km/h');
  assert.ok(!session.view().ready, 'Continue waits for a flight');
  session.act('drop'); until(session, v => v.ready, 8);
  const v = session.view();
  assert.match(v.brian.text, /travelled 15 metres during each second, so its speed was 15 m\/s/);
  assert.match(v.brian.text, /multiplying by 3\.6\. That makes 15 m\/s the same as 54 km\/h/);
  assert.equal(v.scale.v, 15);
  assert.ok(v.scale.t >= 3, 'three seconds are marked along the top');
  for (let i = 0; i < 5; i++) session.act('speed:up');
  assert.equal(session.view().formulas[0].worked, '20 m ÷ 1 s = 20 m/s', 'the fastest setting holds');
});

test('the free test: every control moves the sums at once, arcs stay to compare, and three tests open Continue', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  assert.equal(session.view().formulas[0].worked, '√(2 × 30 m ÷ 9.8 m/s^2) = 2.47 s');
  assert.equal(session.view().formulas[1].worked, '10 m/s × 2.47 s = 24.7 m');
  session.act('height:up');
  assert.equal(session.view().formulas[0].worked, '√(2 × 40 m ÷ 9.8 m/s^2) = 2.86 s', 'height changes the fall time');
  session.act('speed:up');
  assert.equal(session.view().formulas[1].worked, '15 m/s × 2.86 s = 42.9 m', 'speed and height change the distance');
  session.act('drop');
  assert.ok(session.view().keys.Space === undefined, 'no changes while the stone is falling');
  until(session, v => v.keys.Space === 'drop', 15);
  let v = session.view();
  assert.match(v.brian.text, /From 40 m at 15 m\/s, the stone fell for 2\.9 s and landed 43 m ahead of the post/);
  assert.equal(v.ghosts.length, 1); assert.ok(!v.ready);
  session.act('drop'); until(session, x => x.keys.Space === 'drop', 15);
  assert.ok(!session.view().ready, 'the same setting again does not count');
  session.act('height:down'); session.act('drop'); until(session, x => x.keys.Space === 'drop', 15);
  assert.ok(!session.view().ready);
  session.act('speed:down'); session.act('drop'); until(session, x => x.ready, 15);
  v = session.view();
  assert.equal(v.ghosts.length, 4, 'every arc is kept to compare');
  assert.match(v.prompt, /Press Enter to continue, or test another setting/);
  for (let i = 0; i < 9; i++) { session.act('height:up'); session.act('speed:up'); }
  assert.equal(session.view().formulas[1].worked, '20 m/s × 2.86 s = 57.2 m', 'the dials stop where the arc still fits the board');
});

test('the words: gravity marks 4.9 m then 14.7 m more, a stone stays under the helicopter, and a faster arc is longer', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-gravity');
  assert.match(session.view().brian.text, /adds 9\.8 m\/s to the object’s downward speed during every second of the fall\. A steady gain in speed like this is called acceleration, and we write it as 9\.8 m\/s²/);
  session.act('drop'); run(session, 1.05);
  let v = session.view();
  assert.ok(Math.abs(v.drops[0].h - dropPoint('stone', HIGH_M, 0, v.drops[0].t).y - stoneFallAfter(v.drops[0].t)) < 1e-9);
  until(session, x => x.ready, 5);
  assert.match(session.view().brian.text, /fell 4\.9 m during the first second and 14\.7 m during the next second, because by then it was moving faster\. It reached the water after 2\.5 s/);
  assert.match(session.view().brian.text, /m\/s tells you how fast an object is moving at one moment, and m\/s² tells you how quickly that speed is changing/);
  session.act('next'); session.act('drop');
  until(session, x => x.drops.length > 0, 3); run(session, 1);
  v = session.view();
  const d = v.drops[0], p = dropPoint('stone', d.h, d.v, d.t);
  assert.ok(Math.abs(d.x0 + p.x - v.helis[0].x) < .01, 'the stone is directly below the helicopter as it falls');
  assert.equal(v.scale.v, 10, 'the marks along the top step at the forward speed');
  assert.ok(v.arrows, 'the speed arrows show on the stone');
  until(session, x => x.ready, 5);
  assert.match(session.view().brian.text, /landed 25 m ahead of the post, and it stayed directly below the helicopter all the way down/);
  session.act('next');
  assert.equal(session.view().ghosts[0].v, 10, 'the 10 m/s arc stays faint beside the new one');
  session.act('drop'); until(session, x => x.ready, 5);
  assert.match(session.view().brian.text, /landed 49 m ahead of the post, about twice as far as the 25 m it travelled at 10 m\/s/);
});

test('the flag: a wrong guess says why with the real numbers, either side', () => {
  let session = createClassroomSession(lesson);
  playThroughTo(session, 'try-flag');
  session.act('drop'); until(session, v => v.ready, 10);
  let v = session.view();
  assert.equal(v.mood, 'explain');
  assert.match(v.brian.text, /The water landed 13 m ahead of the post, which is 13 m beyond your flag\. At 15 m\/s the water travels further than your flag suggests, and it landed between the 10 m it reached at 10 m\/s and the 15 m it reached at 20 m\/s\./);
  assert.deepEqual(v.marks.map(k => k.label), ['13 m']);
  session = createClassroomSession(lesson);
  playThroughTo(session, 'try-flag');
  session.act('hold:25.4'); session.act('release');
  assert.equal(session.view().flag, 25, 'a drag puts the flag on a whole metre');
  for (let i = 0; i < 99; i++) session.act('flag:right:held');
  assert.equal(session.view().flag, 45, 'the flag stops at the end of the ruler');
  session.act('hold:25'); session.act('drop'); until(session, x => x.ready, 10);
  assert.match(session.view().brian.text, /The water landed 13 m ahead of the post, which is 12 m short of your flag\. The friction of the air slows the water, so it lands well short of where a stone would/);
  session.act('replay'); assert.equal(session.view().flag, 25, 'Watch again keeps the flag');
  until(session, x => x.drops.length && x.drops.every(d => d.landed), 10);
});

test('low or high: each wrong guess says why with both landings', () => {
  for (const [guess, says] of [[0, /^The higher water landed only a little further: the water from 10 m landed 9 m ahead and the water from 30 m landed 10 m ahead\. The higher water does fall for longer, but the friction of the air has already removed nearly all of its forward speed/], [2, /^The higher water did not land any closer: the water from 10 m landed 9 m ahead and the water from 30 m landed 10 m ahead\./]]) {
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
  assert.match(session.view().brian.text, /^You released the water directly above the buoy\. The water keeps moving forward and travels 10 m after its release, so it landed 10 m beyond the buoy\. Release it 10 m before the buoy\./);
  assert.equal(session.view().help, 1);
  // The metres before the buoy and the miss add up to the metres the water carried on.
  const adds = (text, pattern, sign) => { const [, before, ahead, miss] = text.match(pattern).map(Number); assert.equal(before + sign * miss, ahead, text); return before; };
  flyAndLetGo(session, BEST_LET_GO_M + RING_M + 1);
  assert.ok(adds(session.view().brian.text, /^You released the water (\d+) m before the buoy, but water at this speed travels (\d+) m forward, so it landed (\d+) m beyond the buoy\. Release it a little sooner\./, 1) <= 5);
  flyAndLetGo(session, BEST_LET_GO_M - RING_M - 2);
  const said = session.view().brian.text.match(/landed (\d+) m short/)[1];
  assert.equal(session.view().marks.at(-1).label, `${said} m short`, 'the mark on the water says what Brian says');
  assert.ok(adds(session.view().brian.text, /^You released the water (\d+) m before the buoy, but water at this speed travels only (\d+) m forward, so it landed (\d+) m short of the buoy\. Release it a little later\./, -1) >= 15);
  assert.ok(!session.view().ready);
  session.act('drop'); until(session, v => v.prompt === 'Press Space to go round again.', 12);
  assert.match(session.view().brian.text, /The helicopter flew past the buoy without releasing any water/);
  flyAndLetGo(session, BEST_LET_GO_M + RING_M - .5);
  assert.ok(session.view().ready);
  assert.match(session.view().brian.text, /^The water hit the buoy\. You released it [67] m before the buoy, and it travelled 10 m forward as it fell\. That finishes the job\./);
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
  assert.match(session.view().brian.text, /^That is how it is done. /);
  until(session, x => x.ready, 10);
  assert.match(session.view().brian.text, /^The water hit the buoy\. You released it 10 m before the buoy/);
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
  assert.match(session.view().brian.text, /does not fall straight down, because it keeps moving forward after it is released\. It lands 10 m beyond the buoy/);
  until(session, v => v.marks.length > 0, 10);
  assert.equal(session.view().marks[0].label, '10 m beyond');
  session.act('next'); session.act('answer:1');
  assert.match(session.view().brian.text, /At 20 m\/s the water travels 15 m forward rather than 10 m, so the helicopter must release it further back, 15 m before the buoy/);
  until(session, v => v.marks.length > 0, 10);
  assert.equal(session.view().marks[0].label, 'on the buoy');
  session.act('next'); session.act('answer:2');
  assert.match(session.view().brian.text, /Water poured after the bucket has passed the buoy keeps moving forward, away from the buoy/);
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

test('review fixes: Show me works at any moment of the job, holds the keys while Brian flies, and lands on the board', () => {
  const inBoard = v => { const [x, y] = targetPoint(v, 'drop:best'); return x > 0 && x < 1000 && y > 0 && y < 680; };
  const showMe = session => { for (let i = 0; i < 3; i++) session.act('help'); assert.ok(inBoard(session.view()), 'the pointer is on the board'); run(session, SHOW_ME_S + .2); };
  // Early in a run: Brian takes over, and the child's Space does nothing while he flies.
  let session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('drop'); run(session, 1.8);
  showMe(session);
  let v = session.view();
  assert.deepEqual([v.prompt, Object.keys(v.keys).length, v.buttons.length, v.waiting], ['Watch Brian release the water.', 0, 0, false]);
  session.act('drop');
  until(session, x => x.ready, 10);
  assert.match(session.view().brian.text, /^The water hit the buoy\. You released it 10 m before the buoy/);
  assert.ok(session.takeEvents().some(e => e.kind === 'pass' && e.sound === 'lab.splash'), 'the job splashes too');
  // Late in a run: the helicopter comes round and Brian flies it from the start.
  session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('drop'); until(session, x => x.helis[0].x > BEST_LET_GO_M + 2, 10);
  showMe(session);
  until(session, x => x.ready, 12);
  assert.match(session.view().brian.text, /^The water hit the buoy\./);
  // After a miss: the helicopter is back at the start, where the pointer and a click can reach it.
  session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  flyAndLetGo(session, JOB.buoyM + 3);
  v = session.view();
  assert.ok(v.helis[0].x < 0 && !v.helis[0].set, 'the helicopter comes round to the start after a miss');
  assert.equal(hitTest(v, ...targetPoint(v, 'drop'))?.action, 'drop');
  showMe(session);
  until(session, x => x.ready, 12);
  assert.match(session.view().brian.text, /^The water hit the buoy\./);
});

test('review fixes: no release while the helicopter speeds up; misses and hits are judged in the metres Brian says', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  session.act('drop'); run(session, .8); session.act('drop');
  assert.match(session.view().brian.text, /^Not yet, because the helicopter is still speeding up\. Wait until it has passed the 30 mark on the water\./);
  assert.equal(session.view().drops.length, 0);
  // Far off: no "a little" in what to change.
  until(session, x => x.helis[0].x >= 2, 5); session.act('drop');
  until(session, x => x.drops.every(d => d.landed), 10);
  assert.match(session.view().brian.text, /landed \d+ m short of the buoy\. Release it later\./);
  // Let go after the buoy: the mark on the water says after, as Brian does.
  flyAndLetGo(session, JOB.buoyM + 6);
  assert.match(session.view().brian.text, /^You released the water after passing the buoy\./);
  const said = [];
  const ctx = new Proxy({}, {get: (target, name) => name in target ? target[name] : name === 'fillText' ? value => said.push(value)
    : name === 'measureText' ? value => ({width: String(value).length * 9}) : ['createLinearGradient', 'createRadialGradient'].includes(name) ? () => ({addColorStop() {}}) : () => {},
  set: (target, name, value) => { target[name] = value; return true; }});
  drawBoard(ctx, session.view(), 1000, 680);
  assert.ok(said.some(t => /^released \d+ m after$/.test(t)), said.join(' | '));
  // The flag is judged in whole metres: 11 to 15 m are all within 2 m of the 13 m Brian says.
  for (const [flag, right] of [[10, false], [11, true], [15, true], [16, false]]) {
    const s = createClassroomSession(lesson);
    playThroughTo(s, 'try-flag');
    s.act(`hold:${flag}`); s.act('drop'); until(s, x => x.ready, 10);
    assert.equal(s.view().mood === 'cheer', right, `flag at ${flag} m: ${s.view().brian.text}`);
  }
});

test('review fixes: help after a finished step or an answered check names a key that works', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-gravity');
  session.act('drop'); until(session, v => v.ready, 5);
  assert.deepEqual(session.view().hints, ['Press R to watch it again.', 'Press Enter to continue.', 'Press Enter to continue.']);
  session.act('next');
  playThroughTo(session, 'check-over');
  session.act('answer:2');
  assert.equal(session.view().hints[0], 'Press R to watch it again.');
});
