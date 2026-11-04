// LAB-CLASSROOM-WAX (docs/board/cards/LAB-CLASSROOM-WAX.md): Ski wax as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, DAYS, STRIP_M, runSeconds, metresAt, band, todayLine, frictionOf} from '../src/lab/lessons/wax-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/wax-board.js';
import {SNOWS, SNOW_DAYS, WAXES, GLIDE, glideSeconds, snowOfDay, waxRunResult} from '../src/lab/benches/wax.js';
import {SKI} from '../src/ski/ski-physics.js';
import {GRAVITY} from '../src/ski/ski-physics.js';

const lesson = CLASSROOM_LESSONS.wax;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const key = wax => `pick:${wax}`;
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const v = session.view(), step = v.step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-wax') session.act(key('hard'));
    else if (step === 'word-glide') { session.act('go'); until(session, x => x.ready); }
    else if (step === 'word-crystals') { for (let i = 0; i < 3; i++) session.act('warm'); }
    else if (step === 'try-cool' || step === 'try-wet') { session.act(key(SNOWS[step === 'try-cool' ? 'cold' : 'wet'].wax)); session.act('go'); until(session, x => x.ready); }
    else if (step === 'alone') for (const day of DAYS) { session.act(key(SNOWS[day.snow].wax)); session.act('go'); }
    else if (step.startsWith('check')) session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and is listed for the classroom', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['wax-wax', 'wax-glide', 'wax-snow-crystals'], 'the old lesson’s notebook ids');
  assert.equal(lesson.name, 'Ski wax');
  assert.equal(lesson.challengeCard.title, 'Hard wax for cold, soft wax for warm.');
});

test('every glide is the ski rules’ own friction on the bench’s slope, and the bands are the game’s days', () => {
  assert.equal(frictionOf('hard', 'powder'), SKI.wax.right);
  assert.equal(frictionOf('soft', 'powder'), SKI.wax.wrong);
  assert.equal(frictionOf(null, 'powder'), SKI.snowFriction);
  const slope = GLIDE.slopeDeg * Math.PI / 180;
  for (const f of [SKI.wax.right, SKI.snowFriction, SKI.wax.wrong]) assert.equal(glideSeconds(f, STRIP_M), Math.sqrt(2 * STRIP_M / (GRAVITY * (Math.sin(slope) - f * Math.cos(slope)))));
  assert.equal(runSeconds('hard', 'powder').toFixed(2), '8.88');
  assert.equal(runSeconds(null, 'powder').toFixed(2), '9.05');
  assert.equal(runSeconds('soft', 'powder').toFixed(2), '9.43');
  assert.ok(Math.abs(metresAt('soft', 'powder', runSeconds('hard', 'powder')) - (STRIP_M - 5.7)) < .2, 'the wrong ski is about 6 m behind');
  // The ski menu rounds the day's temperature; every day it can show lies in the band Brian names.
  const shown = {powder: new Set(), cold: new Set(), wet: new Set()};
  for (let day = 0; day < 400; day++) { const s = snowOfDay(day); shown[s.snow].add(Math.round(s.celsius) || 0); }
  assert.ok([...shown.powder].every(c => c <= -10) && [...shown.cold].every(c => c >= -9 && c <= -2) && [...shown.wet].every(c => c >= -1 && c <= 0), JSON.stringify(Object.fromEntries(Object.entries(shown).map(([k, v]) => [k, [...v]]))));
  assert.equal(band('powder'), '-10 °C and colder'); assert.equal(band('cold'), '-9 °C to -2 °C'); assert.equal(band('wet'), '-1 °C to 0 °C');
  for (const d of DAYS) { const {low, high} = SNOW_DAYS[d.snow]; assert.ok(d.celsius >= low && d.celsius <= high, `${todayLine(d)} is inside its band`); }
  for (const [i, day] of DAYS.entries()) assert.equal(todayLine(day), ['Today\'s snow: Dry powder, -13 °C', 'Today\'s snow: Cool snow, -3 °C', 'Today\'s snow: Wet snow, -1 °C'][i]);
  for (let day = 0; day < 20; day++) for (const pick of WAXES) assert.equal(waxRunResult({day, pick, time: 30}).pass, pick === snowOfDay(day).wax, 'the challenge passes on the wax the lesson teaches');
});

test('a child who does exactly what each prompt says passes every step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.scene, 'recap'); assert.equal(v.ideas.length, 3); assert.ok(v.last);
  assert.equal(v.step.voice, 'lab.brian.wax.explain');
});

test('the words: a tin turns the base its colour, the glide is timed at real speed, and warming rounds the crystals', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-wax');
  session.act('pick:medium');
  assert.match(session.view().brian.text, /^That is medium wax/);
  assert.equal(session.view().strips[0].lanes[0].wax, 'medium');
  session.act('next');
  session.act('go');
  run(session, 4);
  assert.ok(Math.abs(session.view().strips[0].lanes[0].seconds - 4) < .1, 'the stopwatch runs at real speed');
  until(session, v => v.ready);
  assert.match(session.view().brian.text, /^It glided 50 m in 8\.9 s/);
  session.act('next');
  session.act('warm'); assert.equal(session.view().celsius, -10);
  session.act('cool'); assert.equal(session.view().celsius, -15, '← cools it again');
  for (let i = 0; i < 3; i++) session.act('warm');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^At 0 °C the crystals are rounded and wet/);
});

test('the tries: a wrong tin says why with the real times and the snow’s band, and loses to no wax', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-cool');
  session.act('go');
  assert.match(session.view().brian.text, /Pick a tin first/);
  session.act('pick:hard'); session.act('go'); until(session, v => v.ready);
  assert.match(session.view().brian.text, /^Hard wax is for snow at -10 °C and colder: at -5 °C it lost to no wax, 9\.4 s against 9\.1 s\. Cool snow wants medium wax: press 2, then Space\.$/);
  const v = session.view(), [mine, plain] = v.strips[0].lanes;
  assert.ok(mine.seconds > plain.seconds, 'the wrong wax really lost');
  session.act('pick:medium'); session.act('go'); until(session, x => /^Right! Medium wax suits cool snow at -5 °C: 8\.9 s, faster than no wax, 9\.1 s\./.test(x.brian.text));
  session.act('next');
  session.act('pick:medium'); session.act('go'); until(session, v => v.ready);
  assert.match(session.view().brian.text, /^Medium wax is for cool snow, -9 °C to -2 °C: at 0 °C it lost to no wax/);
});

test('Brian’s job: three days on the ski menu; a wrong pick names the band and tries that day again', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().menu.line, 'Today\'s snow: Dry powder, -13 °C');
  session.act('pick:medium'); session.act('go');
  assert.match(session.view().brian.text, /Dry powder is -10 °C and colder, so it wants hard wax, not medium\./);
  assert.equal(session.view().menu.day, 1, 'the same day again');
  session.act('pick:hard'); session.act('go');
  assert.match(session.view().brian.text, /^Right: hard wax\. Next day\. Today's snow: Cool snow, -3 °C\./);
  session.act('pick:medium'); session.act('go'); session.act('pick:soft'); session.act('go');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^Three days, three right waxes/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me picks the right tin', () => {
  for (const id of ['word-wax', 'word-glide', 'word-crystals', 'try-cool', 'try-wet', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action === 'pick:best') assert.equal(hitTest(v, ...at)?.action, `pick:${v.best}`, `${id}: a click where Brian points picks the right tin`);
    run(session, SHOW_ME_S + .2);
    assert.match(session.view().brian.text, /^That is how it is done. /);
    if (id === 'alone') for (let i = 1; i < DAYS.length; i++) { for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); }
    until(session, x => x.ready, 30);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {'check-cold': [2, /^Soft wax is for wet snow near 0 °C\. Very cold snow has hard, sharp crystals: hard wax/], 'check-rule': [1, /^The other way round/], 'check-game': [2, /^The shop sells the Wax kit, but it does not tell you today’s snow/]};
  for (const [id, [pick, why]] of Object.entries(answers)) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
  }
  const race = createClassroomSession(lesson);
  playThroughTo(race, 'check-cold');
  race.act('answer:1'); until(race, v => v.strips[0].lanes.every(l => l.done), 15);
  const [hard, soft] = race.view().strips[0].lanes;
  assert.ok(hard.seconds < soft.seconds, 'the demo race shows hard wax winning on powder');
});

test('mouse: a click on a tin picks it, a click on the ski lets it go, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-cool');
  let v = session.view();
  const medium = targetPoint(v, 'pick:best');
  assert.equal(hitTest(v, ...medium)?.action, 'pick:medium');
  session.act(hitTest(v, ...medium).action);
  v = session.view();
  const ski = targetPoint(v, 'go');
  assert.equal(hitTest(v, ...ski)?.action, 'go');
  for (const [x, y] of [medium, ski, [400, 260]]) assert.ok(hoverInfo(v, x, y), `hover at ${x}, ${y}`);
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
    for (const t of [0, 3, 8]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
});

test('replays: the wonder and the watch start again', () => {
  const session = createClassroomSession(lesson);
  until(session, v => v.ready);
  // The board shows who won and how far behind the other was when the winner finished.
  const [hard, soft] = session.view().strips[0].lanes;
  assert.equal(hard.winner, true); assert.equal(soft.winner, false);
  assert.ok(Math.abs(soft.behindM - (STRIP_M - metresAt('soft', 'powder', runSeconds('hard', 'powder')))) < 1e-9 && soft.behindM > 5, `${soft.behindM} m behind`);
  session.act('replay');
  assert.ok(session.view().strips[0].lanes.every(l => !l.done), 'the race starts again');
  session.act('next'); playThroughTo(session, 'watch');
  until(session, v => v.ready);
  assert.equal(session.view().strips.length, 3);
  assert.ok(session.view().strips.every(s => s.lanes[0].seconds < s.lanes[1].seconds), 'on every tray the wax that suits it wins');
  session.act('replay');
  assert.ok(session.view().strips.every(s => s.lanes.every(l => l.seconds == null)));
});

test('review fixes: the thermometer is a control, Show me says what Brian does, and Space with no tin keeps the help', () => {
  const warm = createClassroomSession(lesson);
  playThroughTo(warm, 'word-crystals');
  let v = warm.view();
  assert.equal(hitTest(v, ...targetPoint(v, 'warm:best'))?.action, 'warm', 'a click where Brian points warms the tray');
  warm.act(hitTest(v, ...targetPoint(v, 'warm:best')).action);
  assert.equal(warm.view().celsius, -10);
  for (let i = 0; i < 3; i++) warm.act('help');
  run(warm, SHOW_ME_S + .2);
  assert.match(warm.view().brian.text, /^That is how it is done. Watch: I warm the tray to 0 °C\./);
  assert.equal(warm.view().prompt, 'Watch the thermometer.');
  until(warm, x => x.ready, 5);
  // Space with no tin says so and keeps Brian's help where it was.
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  for (let i = 0; i < 2; i++) job.act('help');
  job.act('go');
  assert.match(job.view().brian.text, /^Pick a tin first/);
  assert.equal(job.view().help, 2, 'the help stays');
  assert.equal(job.view().strips.length, 0, 'the job is the ski menu and the tins, with no tray where nothing moves');
});

test('review fixes: Question 1 races the wax the child picked, Question 2 hides the tins until answered, and each Question 3 pick has its reason', () => {
  const q1 = createClassroomSession(lesson);
  playThroughTo(q1, 'check-cold');
  assert.equal(hoverInfo(q1.view(), ...targetPoint({...q1.view(), best: 'hard'}, 'pick:best')), 'Hard wax.', 'no answer in the hover while asking');
  q1.act('answer:1');
  until(q1, v => v.strips[0].lanes.every(l => l.done), 15);
  assert.deepEqual(q1.view().strips[0].lanes.map(l => l.wax), ['hard', 'medium']);
  const q2 = createClassroomSession(lesson);
  playThroughTo(q2, 'check-rule');
  assert.equal(q2.view().ruleTins, false);
  q2.act('answer:0');
  assert.equal(q2.view().ruleTins, true);
  const reasons = new Set();
  for (const pick of [1, 2]) { const q3 = createClassroomSession(lesson); playThroughTo(q3, 'check-game'); q3.act(`answer:${pick}`); reasons.add(q3.view().brian.text); }
  assert.equal(reasons.size, 2);
});
