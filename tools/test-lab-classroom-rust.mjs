// LAB-CLASSROOM-RUST (docs/board/cards/LAB-CLASSROOM-RUST.md): Rust as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, JOBS, shareOf, coatOf, weekRust, bestFor, TRY_DAYS, ZINC_TO} from '../src/lab/lessons/rust-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/rust-board.js';
import {JARS, jarAfter, rustBench} from '../src/lab/benches/rust.js';
import {RUST_PARTS, rustOf, rightProtection, checkProtections} from '../src/lab/lab-workshop.js';
import {CHALLENGE_KIND} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.rust;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 60) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
function setDays(session, days) { for (let i = 0; i < 10 && session.view().dial && !session.view().dial.locked && session.view().dial.days !== days; i++) session.act(session.view().dial.days < days ? 'days:up' : 'days:down'); }
const runWeek = session => { session.act('go'); until(session, x => x.ready || x.keys.Space === 'go'); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (['word-rust', 'word-salt', 'word-zinc'].includes(step)) { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-days') { setDays(session, TRY_DAYS); session.act('go'); session.act('answer:1'); until(session, x => x.ready); }
    else if (step === 'try-zinc') { session.act('answer:1'); session.act('go'); until(session, x => x.ready); }
    else if (step === 'alone') for (const job of JOBS) { session.act(`coat:${bestFor(job.jar)}`); runWeek(session); }
    else if (step.startsWith('check-')) session.act(`answer:${{'check-five': 1, 'check-zinc': 1, 'check-sirena': 0}[step]}`);
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and hands over to the parts panel', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['rust-rust', 'rust-salt-water', 'rust-zinc-coat']);
  assert.deepEqual(lesson.words.map(w => w.id), ['rust-rust', 'rust-salt-water', 'rust-zinc-coat', 'rust-paint'], 'a player who learned Paint keeps it');
  assert.equal(lesson.name, 'Rust');
  assert.equal(lesson.finishLabel, 'Start the challenge');
  assert.equal(lesson.benchAttempts, undefined, 'the lesson does not pass the challenge itself');
  assert.equal(CHALLENGE_KIND.rust, 'protect');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.rust.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.rust.explain');
});

test('every share is the rust bench’s own, and Brian’s job follows the challenge’s own rule', () => {
  for (const jar of JARS) for (let days = 0; days <= 30; days++) {
    assert.equal(shareOf(jar.id, days), jarAfter(jar, days).rust);
    assert.equal(coatOf(jar.id, days), jarAfter(jar, days).zincLeft);
  }
  const p = share => Math.round(share * 100);
  assert.deepEqual(rustBench.run({days: 7}).jars.map(r => p(r.rust)), [0, 14, 84, 0]);
  assert.deepEqual(JARS.map(j => p(shareOf(j.id, 7))), [0, 14, 84, 0]);
  assert.equal(p(coatOf('zinc', 7)), 65);
  assert.deepEqual([3, 5].map(d => p(shareOf('salt', d))), [36, 60]);
  assert.equal(p(coatOf('zinc', 10)), 50); assert.equal(p(shareOf('zinc', 22)), 24); assert.equal(p(shareOf('zinc', ZINC_TO)), 60);
  // The job's things live in the same jars as the challenge's parts, and the least protection is the challenge's.
  for (const part of RUST_PARTS) {
    for (const coat of ['bare', 'zinc']) assert.equal(weekRust(part.jar, coat), rustOf(part.id, coat));
    assert.equal(bestFor(part.jar), rightProtection(part.id));
  }
  assert.deepEqual(JOBS.map(j => bestFor(j.jar)), ['zinc', 'bare', 'zinc']);
  assert.equal(checkProtections(Object.fromEntries(RUST_PARTS.map(part => [part.id, bestFor(part.jar)]))).passed, true);
});

test('a child who does exactly what each prompt says passes every step, and finishing starts the challenge', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const v = session.view();
  assert.equal(v.ready, true);
  assert.equal(v.last, true);
  assert.ok(v.parts.slice(0, 6).every(p => p.done));
  assert.match(v.prompt, /Enter starts the challenge: protect three parts of a car/);
});

test('words and watch: the week runs on the calendar and the nails rust as the bench says', () => {
  const session = createClassroomSession(lesson);
  run(session, 1.5);
  assert.ok(session.view().day > 0 && session.view().day < 7, 'the calendar counts');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /^Same steel, same week: the dry nail is clean, 0%; the one in salt water is 84% rust/);
  assert.equal(session.view().sirena, true);
  session.act('next');
  assert.equal(session.view().day, 0, 'the week waits for Space');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^14% rust after a week: water and air reached the iron\. The dry nail had air but no water: 0%\./);
  session.act('next'); session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^84% against 14%: 6 times as much\. Salt water rusts 12% a day, fresh water 2%\./);
  session.act('next'); session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^Rust 0%, and 65% of the coat is left/);
  session.act('next'); until(session, x => x.ready);
  assert.deepEqual(session.view().shelf.map(j => Math.round(j.rust * 100)), [0, 14, 84, 0], 'the watch shows the four jars');
});

test('the tries: Space at the wrong day, and every wrong guess, say why with their numbers', () => {
  const days = createClassroomSession(lesson);
  playThroughTo(days, 'try-days');
  assert.equal(days.view().dial.days, 7, 'it starts away from its answer');
  days.act('go');
  assert.match(days.view().brian.text, /press ↓ until the dial reads 3/);
  setDays(days, 3); days.act('go');
  assert.deepEqual(days.view().cards.map(c => c.label), ['About 6%: like fresh water', 'About 36%: 12% a day', 'About 84%: a whole week']);
  days.act('answer:0'); until(days, x => x.ready);
  assert.match(days.view().brian.text, /^It is 36%\. 2% a day is fresh water; salt water rusts 12% a day/);
  const week = createClassroomSession(lesson);
  playThroughTo(week, 'try-days');
  setDays(week, 3); week.act('go'); week.act('answer:2'); until(week, x => x.ready);
  assert.match(week.view().brian.text, /^It is 36%\. 84% took the whole week; rust grows day by day/);

  for (const [pick, why] of [[0, /^At 10 days half the coat was still there, 50%\. It lasted 20 days; then the steel rusted: 60% by day 25/], [2, /^Wearing away is the zinc’s job: it went first, for 20 days/], [1, /^Right: the coat lasted 20 days/]]) {
    const zinc = createClassroomSession(lesson);
    playThroughTo(zinc, 'try-zinc');
    assert.equal(zinc.view().cards.length, 3, 'guess first');
    zinc.act(`answer:${pick}`); zinc.act('go');
    run(zinc, 4);
    assert.equal(zinc.view().ready, false, 'the coat takes its time');
    until(zinc, x => x.ready);
    assert.match(zinc.view().brian.text, why);
  }
});

test('Brian’s job: too little, too much and the slow gate each say why; each thing starts away from its answer', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  let v = session.view();
  assert.equal(v.switch.coat, 'bare'); assert.equal(v.job.name, 'The boat trailer');
  assert.notEqual(v.target, 'go', 'Brian does not point at the calendar before a choice is made');
  runWeek(session);
  assert.match(session.view().brian.text, /^Bare in salt water: 84% in a week\. More than 10% is not clean: press → for zinc/);
  session.act('coat:zinc'); runWeek(session);
  assert.match(session.view().brian.text, /^Right: zinc keeps the trailer clean, 0% against 84% bare\. Next: the toolbox/);
  v = session.view();
  assert.equal(v.switch.coat, 'zinc', 'the toolbox starts on zinc, away from its answer');
  runWeek(session);
  assert.match(session.view().brian.text, /^It stayed clean, but so would bare: dry air rusts it 0%\. Save the zinc for where water reaches/);
  session.act('coat:bare'); runWeek(session);
  assert.match(session.view().brian.text, /^Right: the toolbox stays bare and clean, 0%/);
  assert.equal(session.view().switch.coat, 'bare', 'the gate starts bare, away from its answer');
  runWeek(session);
  assert.match(session.view().brian.text, /^Fresh water is slow, 14% in a week, but that is more than 10%: not clean/);
  session.act('coat:zinc'); runWeek(session);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /Zinc for the trailer and the gate, where water reaches; the toolbox stays bare in the dry\. Job done/);
  // A second visit starts the trailer bare again, away from its answer.
  session.act('next'); session.act('back');
  assert.equal(session.view().step.id, 'alone'); assert.equal(session.view().switch.coat, 'bare');
  session.act('go'); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /^Bare in salt water: 84%/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and runs', () => {
  for (const id of ['word-rust', 'word-salt', 'word-zinc', 'try-days', 'try-zinc', 'alone']) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    if (id === 'try-zinc') session.act('answer:1');
    const hints = session.view().hints;
    for (let rung = 1; rung <= 3; rung++) { session.act('help'); assert.equal(session.view().brian.text, hints[rung - 1]); }
    const v = session.view();
    assert.ok(v.pointer, `${id}: Brian points`);
    const at = targetPoint(v, v.pointer.action);
    assert.ok(at, `${id}: at a place on the board`);
    if (v.pointer.action === 'go') assert.equal(hitTest(v, ...at)?.action, 'go', `${id}: a click where Brian points runs the days`);
    else assert.ok(hitTest(v, ...at), `${id}: Brian points at the dial or the switch`);
    run(session, SHOW_ME_S + .1);
    assert.match(session.view().brian.text, /^Like that\. /);
    if (id === 'try-days') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'alone') for (let k = 1; k < JOBS.length; k++) { until(session, x => x.keys.Space === 'go' && x.job.n === k + 1, 20); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 40);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-five': [[0, /^More: salt water rusts 12% a day, so 5 days is 60%/], [2, /^Not yet: .* 12% a day for 5 days is 60%/]],
    'check-zinc': [[0, /^The coat lasts 20 days: by day 22 it is gone, and the steel has had 2 days of 12%: 24%/], [2, /^The zinc kept it clean for 20 days; only 2 days of rust since: 24%/]],
    'check-sirena': [[1, /^Rust is part of the metal now; water does not wash it off\. The soak draws the salt out: salt rusts 12% a day, fresh water 2%/], [2, /^Fresh water still rusts steel, 14% in a week, but 6 times slower than salt/]],
  };
  for (const [id, picks] of Object.entries(answers)) for (const [pick, why] of picks) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    assert.equal(session.view().reveal, null, 'the board does not give the answer away before the pick');
    session.act(`answer:${pick}`);
    assert.match(session.view().brian.text, why);
    assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    assert.ok(session.view().cards.some(c => c.state === 'right'));
  }
});

test('mouse: the dial and the switch turn, a click on the calendar runs, and hovering names every part', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-days');
  let v = session.view();
  for (const action of ['days:up', 'days:down']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  for (const point of [targetPoint(v, 'days:up'), [110, 100], [380, 230], [500, 480]]) assert.ok(hoverInfo(v, ...point), `hover at ${point}`);
  session.act(hitTest(v, ...targetPoint(v, 'days:down')).action);
  assert.equal(session.view().dial.days, 6);
  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  v = job.view();
  for (const action of ['coat:bare', 'coat:zinc']) assert.equal(hitTest(v, ...targetPoint(v, action))?.action, action, action);
  assert.equal(hitTest(v, ...targetPoint(v, 'go'))?.action, 'go');
  job.act(hitTest(v, ...targetPoint(v, 'coat:zinc')).action);
  assert.equal(job.view().switch.coat, 'zinc');
  assert.ok(hoverInfo(job.view(), ...targetPoint(v, 'coat:zinc')));
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
    session.act('back'); session.act(`go:${i}`);
    assert.equal(session.view().step.id, STEPS[i].id);
    if (STEPS[i].id === 'try-zinc') { session.act('answer:1'); session.act('go'); }
    if (STEPS[i].id === 'alone') session.act('go');
    for (const t of [0, 1, 3]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect'), `${c.id} draws a picture`); }
  }
  for (const id of ['check-five', 'check-zinc', 'check-sirena']) {
    session.act(`go:${STEPS.findIndex(s => s.id === id)}`);
    calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
    assert.ok(calls.has('fillText'), `${id} draws its answered picture`);
  }
});
