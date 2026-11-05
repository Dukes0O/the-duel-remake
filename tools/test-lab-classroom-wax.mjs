// LAB-CLASSROOM-WAX (docs/board/cards/LAB-CLASSROOM-WAX.md): Ski wax as a classroom lesson; its wording and formulas follow LAB-CLASSROOM-LANGUAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, DAYS, STRIP_M, FREE_TRIES, SNOW_ORDER, KEY_IDEAS, runSeconds, metresAt, band, todayLine, frictionOf, sumOf} from '../src/lab/lessons/wax-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/wax-board.js';
import {SNOWS, SNOW_DAYS, WAXES, GLIDE, glideSeconds, snowOfDay, waxRunResult} from '../src/lab/benches/wax.js';
import {SKI, GRAVITY} from '../src/ski/ski-physics.js';

const lesson = CLASSROOM_LESSONS.wax;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const key = wax => `pick:${wax}`;
const settled = x => x.keys?.Space === 'go';
const raceFree = session => { session.act('go'); until(session, settled); };
function playStep(session, step) {
  if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
  else if (step === 'word-wax') session.act(key('hard'));
  else if (step === 'word-glide') { session.act('go'); until(session, x => x.ready); }
  else if (step === 'word-friction') session.act(key('hard'));
  else if (step === 'word-crystals') { for (let i = 0; i < 3; i++) session.act('warm'); }
  else if (step === 'why-cold') session.act(key('hard'));
  else if (step === 'why-wet') session.act(key('soft'));
  else if (step === 'try-free') { raceFree(session); session.act(key('soft')); raceFree(session); session.act('snow:warmer'); raceFree(session); }
  else if (step === 'try-cool' || step === 'try-wet') { session.act(key(SNOWS[step === 'try-cool' ? 'cold' : 'wet'].wax)); session.act('go'); until(session, x => x.ready); }
  else if (step === 'alone') for (const day of DAYS) { session.act(key(SNOWS[day.snow].wax)); session.act('go'); }
  else if (step.startsWith('check')) session.act('answer:0');
}
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    playStep(session, step);
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}
// Every word a step can show, in one string.
const wordsOf = v => [v.say, v.prompt, v.brian?.text, ...(v.hints ?? []), ...(v.formulas ?? []).flatMap(f => [f.title, f.formula, f.worked, f.note]), ...(v.cards ?? []).map(c => c.label), ...(v.buttons ?? []).map(b => b.label)].filter(Boolean).join(' ');
// A worked line comes out on a calculator from exactly the numbers it shows, to the decimals it shows.
function checkWorked(line) {
  const [sum, shown] = line.split(' = ');
  const places = (shown.match(/\.(\d+)/)?.[1] ?? '').length, answer = Number(shown.match(/-?[\d.]+/)[0]);
  const source = sum.replaceAll('m/s^2', '').replaceAll('m/s', '').replace(/(\d) s\b/g, '$1').replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll('^', '**').replaceAll('√', 'Math.sqrt');
  const value = new Function(`return ${source}`)();
  assert.ok(Math.abs(value - answer) <= .5 * 10 ** -places + 1e-9, `${line} gives ${value}`);
}
function checkAllWorked(v) { for (const f of v.formulas ?? []) { assert.ok(f.title, `${v.step.id}: every panel entry has a title`); if (f.worked) checkWorked(f.worked); } }

test('the lesson walks the seven parts in order, keeps the old notebook words, and is listed for the classroom', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['wax-wax', 'wax-glide', 'wax-snow-crystals'], 'the old lesson’s notebook ids');
  assert.equal(lesson.name, 'Ski wax');
  assert.equal(lesson.challengeCard.title, 'Cold snow needs a hard wax, and warm snow needs a soft wax.');
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

test('the words: a tin turns the base its colour, the glide is timed at real speed, friction has its sum, and warming rounds the crystals', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-wax');
  session.act('pick:medium');
  assert.match(session.view().brian.text, /^That is medium wax/);
  assert.equal(session.view().strips[0].lanes[0].wax, 'medium');
  session.act('next');
  session.act('go');
  run(session, 4);
  assert.ok(Math.abs(session.view().strips[0].lanes[0].seconds - 4) < .1, 'the stopwatch runs at real speed');
  assert.deepEqual(session.view().glide.marks.map(k => k.second).slice(0, 3), [1, 2, 3], 'a mark for each second');
  assert.ok(Math.abs(session.view().glide.marks[2].metres - 5.7) < .05);
  until(session, v => v.ready);
  assert.match(session.view().brian.text, /^The ski glided 50 m in 8\.9 s/);
  session.act('next');
  assert.equal(session.view().forces.friction, .05, 'no wax to begin with');
  session.act('pick:hard');
  assert.equal(session.view().forces.friction, .045);
  assert.equal(session.view().ready, true);
  session.act('next');
  session.act('warm'); assert.equal(session.view().celsius, -10);
  session.act('cool'); assert.equal(session.view().celsius, -15, '← cools it again');
  for (let i = 0; i < 3; i++) session.act('warm');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^At 0 °C the crystals are rounded and wet/);
});

test('the reasons: each starts on the wax that does not suit the snow, and the close-up and the sums follow the tin', () => {
  const cold = createClassroomSession(lesson);
  playThroughTo(cold, 'why-cold');
  assert.deepEqual(cold.view().closeup, {snow: 'powder', wax: 'soft'});
  assert.equal(cold.view().formulas[0].formula, 'friction = 0.06');
  assert.equal(cold.view().formulas.at(-1).worked, '√(2 × 50 ÷ 1.124) = 9.43 s');
  cold.act('pick:medium');
  assert.equal(cold.view().ready, false, 'the wax that does not suit the snow does not close the step');
  assert.match(cold.view().prompt, /^Press 1 to change to hard wax/, 'the prompt holds from any tin');
  cold.act('pick:hard');
  assert.equal(cold.view().formulas[0].formula, 'friction = 0.045');
  assert.equal(cold.view().formulas.at(-1).worked, '√(2 × 50 ÷ 1.269) = 8.88 s');
  assert.match(cold.view().brian.text, /A hard wax is too hard for the points to press into/);
  const wet = createClassroomSession(lesson);
  playThroughTo(wet, 'why-wet');
  assert.deepEqual(wet.view().closeup, {snow: 'wet', wax: 'hard'});
  assert.match(wet.view().say, /suction/);
  wet.act('pick:soft');
  assert.match(wet.view().brian.text, /^A softer wax repels water better/);
});

test('the tries: a wrong tin says why with the real times and the snow’s band, and loses to no wax', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-cool');
  session.act('go');
  assert.match(session.view().brian.text, /Pick a tin first/);
  session.act('pick:hard'); session.act('go'); until(session, v => v.ready);
  assert.match(session.view().brian.text, /^Hard wax suits snow at -10 °C and colder, and this snow is at -5 °C\. The ski with hard wax reached the finish in 9\.4 s, and the ski with no wax reached the finish in 9\.1 s, so this wax was slower than no wax at all\. Cool snow needs medium wax, so press 2 and then Space\.$/);
  const v = session.view(), [mine, plain] = v.strips[0].lanes;
  assert.ok(mine.seconds > plain.seconds, 'the wrong wax really lost');
  session.act('pick:medium'); session.act('go'); until(session, x => /^Correct\. Medium wax suits cool snow at -5 °C\. The ski with medium wax reached the finish in 8\.9 s, and the ski with no wax reached the finish in 9\.1 s\./.test(x.brian.text));
  session.act('next');
  session.act('pick:medium'); session.act('go'); until(session, v => v.ready);
  assert.match(session.view().brian.text, /^Medium wax suits cool snow, from -9 °C to -2 °C, and this snow is at 0 °C/);
});

test('Brian’s job: three days on the ski menu; a wrong pick names the band and tries that day again', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.equal(session.view().menu.line, 'Today\'s snow: Dry powder, -13 °C');
  session.act('pick:medium'); session.act('go');
  assert.match(session.view().brian.text, /Dry powder is -10 °C and colder, so this snow needs hard wax, not medium wax\./);
  assert.equal(session.view().menu.day, 1, 'the same day again');
  session.act('pick:hard'); session.act('go');
  assert.match(session.view().brian.text, /^Correct\. Hard wax suits that snow\. On the next day, the ski menu reads “Today's snow: Cool snow, -3 °C”\./);
  session.act('pick:medium'); session.act('go'); session.act('pick:soft'); session.act('go');
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /^You have picked the right wax for all three days/);
  checkAllWorked(session.view());
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me picks the right tin', () => {
  for (const id of ['word-wax', 'word-glide', 'word-friction', 'word-crystals', 'why-cold', 'why-wet', 'try-cool', 'try-wet', 'alone']) {
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
  const answers = {'check-cold': [2, /^Soft wax suits wet snow near 0 °C\. Very cold snow has hard, sharp crystals, which press into a softer wax, so this snow needs a hard wax/], 'check-rule': [1, /^It is the other way round/], 'check-game': [2, /^The shop sells the Wax kit, but the shop does not show today’s snow/]};
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

test('mouse: a click on a tin picks it, a click on the ski releases it, and hovering names every part', () => {
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
  // Every combination of snow and wax draws its close-up on the free test.
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  for (const snow of SNOW_ORDER) for (const wax of WAXES) {
    free.act(`snow:${snow}`); free.act(key(wax));
    assert.deepEqual(free.view().closeup, {snow, wax});
    calls.clear(); drawBoard(fake(), free.view(), 1000, 680);
    assert.ok(calls.has('fillText'), `${snow} with ${wax} draws`);
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
  assert.match(warm.view().brian.text, /^That is how it is done. Watch the thermometer\. I will warm the tray to 0 °C\./);
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

test('the sums: each comes out on a calculator from the numbers it shows, and matches the stopwatch', () => {
  // Rounded to two decimals, the panel's time is the rule's own time.
  for (const f of [SKI.wax.right, SKI.snowFriction, SKI.wax.wrong]) assert.equal(sumOf(f).seconds.toFixed(2), glideSeconds(f, STRIP_M).toFixed(2), `friction ${f}`);
  assert.deepEqual([SKI.wax.right, SKI.snowFriction, SKI.wax.wrong].map(f => sumOf(f).acceleration), [1.269, 1.221, 1.124]);
  // Every step, before and after it is played.
  const session = createClassroomSession(lesson);
  for (const step of STEPS) {
    assert.equal(session.view().step.id, step.id);
    if (step.id !== 'wonder') assert.ok(session.view().formulas.length > 0, `${step.id} shows the physics`);
    checkAllWorked(session.view());
    if (step.id === 'recap') break;
    if (step.id === 'word-wax') for (const wax of WAXES) { session.act(key(wax)); checkAllWorked(session.view()); }
    if (step.id === 'word-glide') { session.act('go'); for (let t = 0; t < 8; t++) { run(session, 1); checkAllWorked(session.view()); } }
    else if (step.id === 'word-crystals') for (let i = 0; i < 2; i++) { session.act('warm'); checkAllWorked(session.view()); }
    if (step.id === 'word-glide') until(session, x => x.ready);
    else if (step.id === 'word-crystals') session.act('warm');
    else playStep(session, step.id);
    checkAllWorked(session.view());
    session.act('next');
  }
  // The whole of the free test's range.
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  for (const snow of SNOW_ORDER) for (const wax of WAXES) {
    free.act(`snow:${snow}`); free.act(key(wax));
    checkAllWorked(free.view());
    assert.equal(free.view().formulas.at(-1).worked.split(' = ')[1], `${runSeconds(wax, snow).toFixed(2)} s`, `${wax} on ${snow}`);
    // The claim Brian makes about a wax against no wax holds for every setting.
    assert.equal(runSeconds(wax, snow) < runSeconds(null, snow), SNOWS[snow].wax === wax);
  }
});

test('the formulas follow every press of a control', () => {
  const wax = createClassroomSession(lesson);
  playThroughTo(wax, 'word-wax');
  assert.equal(wax.view().formulas[0].worked, '9.43 s − 8.88 s = 0.55 s');
  wax.act(key('hard'));
  assert.equal(wax.view().formulas[0].worked, '9.43 s − 8.88 s = 0.55 s', 'hard wax is compared with the soft wax it raced, not with itself');
  assert.equal(wax.view().formulas[0].title, 'Hard wax against soft wax on dry powder');
  const friction = createClassroomSession(lesson);
  playThroughTo(friction, 'word-friction');
  assert.equal(friction.view().formulas[2].worked, '0.05 × 9.81 × 0.98481 = 0.483 m/s^2');
  friction.act(key('hard'));
  assert.equal(friction.view().formulas[2].worked, '0.045 × 9.81 × 0.98481 = 0.435 m/s^2');
  assert.equal(friction.view().formulas[3].worked, '1.704 − 0.435 = 1.269 m/s^2');
  friction.act(key('soft'));
  assert.equal(friction.view().formulas[3].worked, '1.704 − 0.580 = 1.124 m/s^2');
  friction.act('pick:none');
  assert.equal(friction.view().forces.wax, null, 'the ski can go back to no wax');
  assert.equal(friction.view().formulas[0].formula, 'friction = 0.05');
  const tray = createClassroomSession(lesson);
  playThroughTo(tray, 'word-crystals');
  assert.equal(tray.view().formulas[0].worked, '0 − (-15) = 15 degrees');
  tray.act('warm');
  assert.equal(tray.view().formulas[0].worked, '0 − (-10) = 10 degrees');
  const glide = createClassroomSession(lesson);
  playThroughTo(glide, 'word-glide');
  assert.equal(glide.view().formulas[0].worked, '1.269 m/s^2 × 0 s = 0.00 m/s');
  glide.act('go'); run(glide, 3.2);
  assert.equal(glide.view().formulas[0].worked, '1.269 m/s^2 × 3 s = 3.81 m/s');
  assert.equal(glide.view().formulas[1].worked, '3.81 m/s × 3.6 = 13.7 km/h');
  assert.equal(glide.view().formulas[2].worked, '0.5 × 1.269 × 3^2 = 5.7 m');
  until(glide, x => x.ready);
  assert.equal(glide.view().formulas[2].worked, '√(2 × 50 ÷ 1.269) = 8.88 s');
  assert.match(glide.view().brian.text, /reached 11\.27 m\/s at the finish, which is 40\.6 km\/h/);
});

test('the free test: any snow with any wax, only different settings count, three open Continue, and the table keeps the results', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  assert.equal(session.view().ready, false);
  assert.equal(session.view().rows.length, 0);
  assert.match(session.view().prompt, /tested so far: 0 of 3/);
  // The sums show first, so the player can work out the time.
  assert.equal(session.view().formulas.at(-1).worked, '√(2 × 50 ÷ 1.269) = 8.88 s');
  session.act('snow:warmer');
  assert.equal(session.view().closeup.snow, 'cold');
  assert.equal(session.view().formulas.at(-1).worked, '√(2 × 50 ÷ 1.124) = 9.43 s', 'the snow changes the sum');
  session.act(key('medium'));
  assert.equal(session.view().formulas.at(-1).worked, '√(2 × 50 ÷ 1.269) = 8.88 s', 'the wax changes the sum');
  raceFree(session);
  assert.match(session.view().brian.text, /^Medium wax on cool snow at -5 °C has a friction number of 0\.045, so the ski reached the finish in 8\.9 s, and the ski with no wax reached the finish in 9\.1 s\./);
  assert.equal(session.view().ready, false);
  raceFree(session);
  assert.equal(session.view().ready, false, 'the same setting again does not count as a different one');
  assert.match(session.view().prompt, /tested so far: 1 of 3/);
  session.act(key('soft')); raceFree(session);
  assert.match(session.view().brian.text, /This wax does not suit this snow, so the ski was slower than the ski with no wax/);
  assert.equal(session.view().ready, false);
  session.act('snow:warmer'); raceFree(session);
  assert.equal(session.view().ready, true, 'three different settings open Continue');
  assert.deepEqual(session.view().rows.map(r => [r.snow, r.wax, r.seconds, r.none]), [['cold', 'medium', 8.88, 9.05], ['cold', 'medium', 8.88, 9.05], ['cold', 'soft', 9.43, 9.05], ['wet', 'soft', 8.88, 9.05]]);
  // The snow stops at both ends of the range and says so.
  session.act('snow:warmer');
  assert.match(session.view().brian.text, /^Wet snow is the warmest snow in this test/);
  session.act('snow:powder'); session.act('snow:colder');
  assert.match(session.view().brian.text, /^Dry powder is the coldest snow in this test/);
  // The tabs along the top change the snow with the mouse, and hovering names each part.
  const tab = hitTest(session.view(), 780, 30);
  assert.equal(tab?.action, 'snow:cold');
  session.act(tab.action);
  assert.equal(session.view().closeup.snow, 'cold');
  for (const point of [[780, 30], [800, 400], [500, 600]]) assert.ok(hoverInfo(session.view(), ...point), `hover at ${point}`);
  assert.ok(session.view().keys['←'] && session.view().keys['→'] && session.view().keys['1'], 'every control has a key');
});

test('Show me on the free test tries a different setting each time, says which, and finishes', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  const tried = new Set();
  for (let i = 0; i < FREE_TRIES; i++) {
    for (let k = 0; k < 3; k++) session.act('help');
    assert.match(session.view().brian.text, /^Watch my pointer\. I will test a setting that you have not tested yet\./);
    assert.ok(session.view().pointer, 'Brian points');
    run(session, SHOW_ME_S + .2);
    const {snow, wax} = session.view().closeup;
    assert.match(session.view().brian.text, new RegExp(`^That is how it is done\\. I will test ${wax} wax on ${SNOWS[snow].name.toLowerCase()} at ${SNOWS[snow].celsius} °C\\.`));
    tried.add(`${snow}/${wax}`);
    until(session, settled);
  }
  assert.equal(tried.size, FREE_TRIES, 'three different settings');
  assert.equal(session.view().ready, true);
  assert.equal(session.view().rows.length, FREE_TRIES);
  // Once every setting has been tested, the hint says what Brian will really do.
  for (let i = FREE_TRIES; i < 9; i++) { for (let k = 0; k < 3; k++) session.act('help'); run(session, SHOW_ME_S + .2); until(session, settled); }
  for (let k = 0; k < 3; k++) session.act('help');
  assert.match(session.view().brian.text, /I will race the first one again/);
});

test('the panel never gives away an open guess or question', () => {
  const noAnswer = (v, where) => {
    const text = JSON.stringify(v.formulas);
    assert.doesNotMatch(text, /\b(hard|medium|soft)\b/i, `${where}: no wax is named`);
    assert.doesNotMatch(text, /8\.88|9\.05|9\.43|\d s\b/, `${where}: no time`);
    assert.ok(v.formulas.length > 0, `${where}: the general rule still shows`);
  };
  for (const id of ['try-cool', 'try-wet']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    noAnswer(session.view(), id);
    const before = JSON.stringify(session.view().formulas);
    for (const wax of WAXES) { session.act(key(wax)); noAnswer(session.view(), `${id} with ${wax}`); assert.equal(JSON.stringify(session.view().formulas), before, 'a tin does not move the panel while the choice is open'); }
    session.act('go'); until(session, x => x.ready);
    assert.ok(session.view().formulas.some(f => /\d s$/.test(f.worked ?? '')), 'the sums for the chosen wax show once the race has run');
  }
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  for (const wax of WAXES) { job.act(key(wax)); noAnswer(job.view(), `alone with ${wax}`); }
  for (const id of ['check-cold', 'check-rule', 'check-game']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    noAnswer(session.view(), id);
    assert.ok(session.view().strips.every(s => s.lanes.length === 0), `${id}: no skis suggest an answer`);
    assert.equal(session.view().menu, null, `${id}: the board does not show the ski menu`);
    for (const t of [[330, 600], [500, 600], [670, 600]]) { const hover = hoverInfo(session.view(), ...t); if (hover) assert.match(hover, /^(Hard|Medium|Soft) wax\.$/); }
    session.act('answer:0');
    if (id === 'check-game') assert.ok(session.view().menu, 'the ski menu shows after the answer');
  }
});

test('word steps stay open, their closing words stay true, and an intro does not change with a control', () => {
  const crystals = createClassroomSession(lesson);
  playThroughTo(crystals, 'word-crystals');
  const intro = crystals.view().page.at(-1).setup;
  crystals.act('warm');
  assert.equal(crystals.view().page.at(-1).setup, intro);
  assert.equal(crystals.view().say, intro, 'the live number is in the prompt and the panel');
  assert.match(crystals.view().prompt, /The tray is at -10 °C/);
  crystals.act('warm'); crystals.act('warm');
  const closing = crystals.view().brian.text;
  assert.match(crystals.view().prompt, /or press ← to cool the tray\.$/, 'at the top of the dial the prompt offers only what can be done');
  crystals.act('cool'); crystals.act('cool');
  assert.equal(crystals.view().celsius, -10, 'the dial stays free after the answer');
  assert.equal(crystals.view().brian.text, closing);
  assert.match(closing, /At 0 °C .* At -15 °C /, 'the closing words name their temperatures, so they stay true');
  assert.ok(crystals.view().ready);
  crystals.act('warm'); crystals.act('warm'); crystals.act('warm');
  assert.equal(crystals.view().celsius, 0, 'the top of the dial');
  for (const id of ['word-friction', 'why-cold', 'why-wet', 'word-wax']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    const first = session.view().page.at(-1).setup;
    playStep(session, id);
    assert.ok(session.view().ready);
    assert.equal(session.view().page.at(-1).setup, first);
    const closingWords = session.view().say;
    assert.ok(session.view().keys['1'], `${id}: the tins stay open`);
    session.act(key('medium'));
    if (id !== 'word-wax') assert.equal(session.view().say, closingWords, `${id}: the closing words do not change with a tin`);
    assert.equal(session.view().pick, 'medium');
    if (id !== 'word-wax') assert.doesNotMatch(closingWords, /\bnow\b/i, `${id}: nothing in the closing words depends on the tin`);
  }
  // Prompts ask only for what is left to do.
  const glide = createClassroomSession(lesson);
  playThroughTo(glide, 'word-glide');
  glide.act('go'); until(glide, x => x.ready);
  assert.doesNotMatch(glide.view().prompt, /Space/);
});

test('every word is defined before it is used, in whole sentences, with one measurement system and no minds', () => {
  const seenWords = [];
  const session = createClassroomSession(lesson);
  const collect = id => { const words = wordsOf(session.view()); seenWords.push([id, words]); checkWords(id, words); };
  for (const step of STEPS) {
    collect(step.id);
    if (step.id === 'recap') break;
    playStep(session, step.id);
    collect(step.id);
    session.act('next');
  }
  const firstAt = {};
  for (const [word, pattern] of [['friction', /friction/i], ['acceleration', /acceleration/i], ['m/s', /m\/s/], ['km/h', /km\/h/], ['suction', /suction/i], ['crystals', /crystals/i], ['°C', /°C/]]) firstAt[word] = seenWords.find(([, text]) => pattern.test(text))?.[0];
  assert.deepEqual(firstAt, {friction: 'word-friction', acceleration: 'word-glide', 'm/s': 'word-glide', 'km/h': 'word-glide', suction: 'why-wet', crystals: 'word-crystals', '°C': 'wonder'});
  // Each one's first step explains it.
  const opening = id => { const s = createClassroomSession(lesson); playThroughTo(s, id); return s.view().say; };
  assert.match(opening('wonder'), /read as “minus 15 degrees Celsius”\. Water freezes at 0 °C/);
  assert.match(opening('word-glide'), /metres per second, written m\/s/);
  assert.match(opening('word-glide'), /this kind of degree measures an angle, not a temperature\. Level ground is 0 degrees and straight up is 90 degrees/);
  { const s = createClassroomSession(lesson); playThroughTo(s, 'word-friction'); const notes = s.view().formulas.map(f => f.note).join(' '); assert.match(notes, /sin, short for sine, turns an angle into a share/); assert.match(notes, /cos, short for cosine, also turns an angle into a share/); }
  // The slope's angle appears nowhere before Glide defines it.
  { const s = createClassroomSession(lesson); for (const id of ['wonder', 'word-wax']) { playThroughTo(s, id); assert.doesNotMatch(wordsOf(s.view()), /\d+ degrees(?! Celsius)|\d°/, id); assert.doesNotMatch(hoverInfo(s.view(), 400, 260) ?? '', /degrees/, id); } }
  assert.match(opening('word-glide'), /kilometres per hour, written km\/h\. To change m\/s into km\/h you multiply by 3\.6, because an hour has 3,600 seconds and a kilometre has 1,000 metres/);
  assert.match(opening('word-glide'), /acceleration in metres per second, per second, written m\/s²/);
  assert.match(opening('word-friction'), /^Friction is the force that resists when one surface slides over another/);
  assert.match(opening('why-wet'), /holds the ski to the snow by suction\. Suction is/);
  // The pieces the walk above does not reach.
  for (const text of [...KEY_IDEAS.map(i => i.text), lesson.challengeCard.title, lesson.challengeCard.text, ...lesson.words.map(w => w.meaning)]) checkWords('fixed words', text);
  for (const file of ['wax-classroom.js', 'wax-board.js']) {
    const source = readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8');
    for (const [fault, pattern] of [['she or her', /\b(she|her|hers|herself)\b/i], ['mph', /\bmph\b/i], ['decides', /\bdecides?\b/i], ['takes its speed', /\b(air|wind)\s+(soon\s+)?takes\b/i]])
      assert.ok(!pattern.test(source), `${file} has ${fault}`);
  }
  function checkWords(where, text) {
    assert.doesNotMatch(text, /\bbench\b/i, `${where}: no unexplained bench`);
    assert.doesNotMatch(text, /\b(wants?|takes?|decides?|asks?)\b/i, `${where}: nothing without a mind wants or takes`);
    assert.doesNotMatch(text, /Pick a card:/, `${where}: the card prompt is a whole sentence`);
    assert.doesNotMatch(text, /[a-z]: (hard|soft|medium) wax\b/i, `${where}: no colon that skips a verb`);
    assert.doesNotMatch(text, /—/, `${where}: no long dashes`);
  }
});

test('the thermometer is one colour at every temperature, so it does not match a tin at an open pick', () => {
  const source = readFileSync(new URL('../src/lab/lessons/wax-board.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function thermometer('), source.indexOf('// Snow crystals:'));
  assert.match(body, /ctx\.fillStyle = THERMOMETER_FILL;/);
  assert.doesNotMatch(body, /WAX_COLOURS|#3f86d8|#9466d6|#d9573f/);
});

test('a hint or a prompt holds from every setting of its control', () => {
  // → is the right way from every reading of the tray, and the prompt says so.
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-crystals');
  for (let i = 0; i < 3; i++) {
    assert.match(session.view().prompt, /Press → to warm the tray/);
    assert.equal(session.view().hints[1], 'Press → until the thermometer reads 0 °C.');
    session.act('warm');
  }
  // The wrong tin's advice names the tin that suits the snow, whichever tin is on.
  for (const wax of ['hard', 'soft']) {
    const s = createClassroomSession(lesson);
    playThroughTo(s, 'try-cool');
    s.act(key(wax)); s.act('go'); until(s, x => x.ready);
    assert.match(s.view().brian.text, /press 2 and then Space\.$/);
  }
});
