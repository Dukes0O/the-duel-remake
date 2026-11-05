// LAB-CLASSROOM-RUST (docs/board/cards/LAB-CLASSROOM-RUST.md): Rust as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, JOBS, shareOf, coatOf, weekRust, bestFor, TRY_DAYS, ZINC_TO, FREE_TRIES, FREE_MAX_DAYS} from '../src/lab/lessons/rust-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/rust-board.js';
import {JARS, jarAfter, rustBench} from '../src/lab/benches/rust.js';
import {RUST_PARTS, rustOf, rightProtection, checkProtections} from '../src/lab/lab-workshop.js';
import {CHALLENGE_KIND} from '../src/lab/lab-model.js';

const lesson = CLASSROOM_LESSONS.rust;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 60) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
function setDays(session, days) { for (let i = 0; i < 40 && session.view().dial && !session.view().dial.locked && session.view().dial.days !== days; i++) session.act(session.view().dial.days < days ? 'days:up' : 'days:down'); }
const runWeek = session => { session.act('go'); until(session, x => x.ready || x.keys.Space === 'go'); };
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (['word-rust', 'word-salt', 'word-zinc'].includes(step)) { session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-days') { setDays(session, TRY_DAYS); session.act('go'); session.act('answer:1'); until(session, x => x.ready); }
    else if (step === 'try-zinc') { session.act('answer:1'); session.act('go'); until(session, x => x.ready); }
    else if (step === 'try-free') { runWeek(session); for (let i = 1; i < FREE_TRIES; i++) { session.act('days:down'); runWeek(session); } }
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
  assert.match(v.prompt, /Press Enter to start the challenge, in which you protect three parts of a car/);
});

test('words and watch: the week runs on the calendar and the nails rust as the bench says', () => {
  const session = createClassroomSession(lesson);
  run(session, 1.5);
  assert.ok(session.view().day > 0 && session.view().day < 7, 'the calendar counts');
  until(session, x => x.ready);
  assert.match(session.view().brian.text, /^The two nails are made of the same steel and sat for the same week, but the nail in the dry jar has 0% rust and the nail in salt water has 84% rust/);
  assert.equal(session.view().sirena, true);
  session.act('next');
  assert.equal(session.view().day, 0, 'the week waits for Space');
  session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^After 7 days the nail in fresh water has 14% rust, because water and oxygen both reached the iron\. The nail in dry air met oxygen but no water, so it has 0% rust\./);
  session.act('next'); session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^After 7 days the nail in salt water has 84% rust and the nail in fresh water has 14% rust, so the salt water has made 6 times as much rust\. Salt water rusts the nail at 12% a day and fresh water at 2% a day/);
  session.act('next'); session.act('go'); until(session, x => x.ready);
  assert.match(session.view().brian.text, /^After 7 days the bare nail has 84% rust, but the nail with the zinc coat has 0% rust, and 65% of its coat is left/);
  session.act('next'); until(session, x => x.ready);
  assert.deepEqual(session.view().shelf.map(j => Math.round(j.rust * 100)), [0, 14, 84, 0], 'the watch shows the four jars');
});

test('the tries: Space at the wrong day, and every wrong guess, say why with their numbers', () => {
  const days = createClassroomSession(lesson);
  playThroughTo(days, 'try-days');
  assert.equal(days.view().dial.days, 7, 'it starts away from its answer');
  days.act('go');
  assert.match(days.view().brian.text, /This test runs for 3 days, so press ↓ until the dial reads 3/);
  setDays(days, 3); days.act('go');
  assert.deepEqual(days.view().cards.map(c => c.label), ['About 6%', 'About 36%', 'About 84%']);
  days.act('answer:0'); until(days, x => x.ready);
  assert.match(days.view().brian.text, /^The nail has 36% rust\. You would get 6% in fresh water at 2% a day, but salt water rusts the nail at 12% a day/);
  const week = createClassroomSession(lesson);
  playThroughTo(week, 'try-days');
  setDays(week, 3); week.act('go'); week.act('answer:2'); until(week, x => x.ready);
  assert.match(week.view().brian.text, /^The nail has 36% rust\. It needed the whole week to reach 84%, and the rust grows day by day/);

  for (const [pick, why] of [[0, /^At 10 days, 50% of the coat was still there, so the coat lasted longer than that\. It lasted 20 days, and then the steel rusted, reaching 60% by day 25/], [2, /^Zinc does wear away, and that is how the coat protects the steel\. The coat lasted 20 days/], [1, /^Correct\. The coat lasted 20 days/]]) {
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
  assert.match(session.view().brian.text, /^Left bare, the boat trailer reaches 84% rust in a week\. That is more than 10%, so it is not clean\. Press → to give it a zinc coat/);
  session.act('coat:zinc'); runWeek(session);
  assert.match(session.view().brian.text, /^Correct\. The zinc coat keeps the trailer clean, with 0% rust against 84% if it were bare\. The next thing is the toolbox/);
  v = session.view();
  assert.equal(v.switch.coat, 'zinc', 'the toolbox starts on zinc, away from its answer');
  runWeek(session);
  assert.match(session.view().brian.text, /^The toolbox stayed clean, but it would stay just as clean when bare, because a bare nail in dry air has 0% rust after a week\. Keep the zinc for places that water reaches/);
  session.act('coat:bare'); runWeek(session);
  assert.match(session.view().brian.text, /^Correct\. The toolbox stays clean when it is bare, with 0% rust/);
  assert.equal(session.view().switch.coat, 'bare', 'the gate starts bare, away from its answer');
  runWeek(session);
  assert.match(session.view().brian.text, /^Fresh water rusts steel slowly, but left bare, the garden gate reaches 14% rust in a week\. That is more than 10%, so it is not clean/);
  session.act('coat:zinc'); runWeek(session);
  assert.equal(session.view().ready, true);
  assert.match(session.view().brian.text, /Zinc protects the trailer and the gate, which water reaches, and the toolbox stays bare because it stays dry\. That finishes the job/);
  // A second visit starts the trailer bare again, away from its answer.
  session.act('next'); session.act('back');
  assert.equal(session.view().step.id, 'alone'); assert.equal(session.view().switch.coat, 'bare');
  session.act('go'); until(session, x => x.keys.Space === 'go');
  assert.match(session.view().brian.text, /^Left bare, the boat trailer reaches 84% rust/);
});

test('help climbs from a nudge to a plain step to Brian’s pointer, and Show me sets and runs', () => {
  for (const id of ['word-rust', 'word-salt', 'word-zinc', 'try-days', 'try-zinc', 'try-free', 'alone']) {
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
    assert.match(session.view().brian.text, /^That is how it is done. /);
    if (id === 'try-days') { until(session, x => x.cards.length === 3, 5); session.act('answer:1'); }
    if (id === 'try-free') for (let k = 1; k < FREE_TRIES; k++) { until(session, x => x.keys.Space === 'go', 20); session.act('days:down'); session.act('go'); }
    if (id === 'alone') for (let k = 1; k < JOBS.length; k++) { until(session, x => x.keys.Space === 'go' && x.job.n === k + 1, 20); for (let h = 0; h < 3; h++) session.act('help'); run(session, SHOW_ME_S + .1); }
    until(session, x => x.ready, 40);
  }
});

test('every check says why a wrong answer is wrong, then shows it', () => {
  const answers = {
    'check-five': [[0, /^The rust is greater than that\. Salt water rusts the nail at 12% a day, so 5 days give 60%/], [2, /^The nail has not rusted all the way through yet, because that needs more than 8 days\. 12% a day for 5 days gives 60%/]],
    'check-zinc': [[0, /^The coat lasts only 20 days, so by day 22 the coat has gone, and the steel has rusted for 2 days at 12% a day, which gives 24%/], [2, /^The zinc kept the steel clean for 20 days, so the steel has rusted for only 2 days, which gives 24% rather than the 100% of a bare nail/]],
    'check-sirena': [[1, /^Rust is part of the metal now, so water does not wash it off\. The soak draws the salt out of the metal, because salt keeps the rust forming at 12% a day against 2% a day in fresh water/], [2, /^Fresh water still rusts steel, by 14% in a week, although salt water rusts steel 6 times as fast/]],
  };
  for (const [id, picks] of Object.entries(answers)) for (const [pick, why] of picks) {
    const session = createClassroomSession(lesson);
    playThroughTo(session, id);
    assert.equal(session.view().reveal, null, 'the board does not give the answer away before the pick');
    if (id === 'check-five') assert.ok(!session.view().formulas.some(f => /60%/.test(f.worked ?? '')), 'nor does the physics panel');
    if (id === 'check-zinc') assert.ok(!session.view().formulas.some(f => /24%/.test(f.worked ?? '')), 'nor does the physics panel');
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

test('the sums: the day dial, the protection switch and the jar change the worked line on that press, and every sum comes out', () => {
  const worked = session => session.view().formulas.map(f => f.worked);
  const word = createClassroomSession(lesson);
  playThroughTo(word, 'word-rust');
  assert.equal(worked(word)[0], '2% a day × 7 days = 14%');
  word.act('days:down');
  assert.equal(worked(word)[0], '2% a day × 6 days = 12%', 'the dial changes the sum at once');
  word.act('go'); run(word, 2.1);
  assert.equal(worked(word)[0], `2% a day × ${Math.floor(word.view().day)} days = ${2 * Math.floor(word.view().day)}%`, 'the sum follows the calendar while it runs');
  assert.equal(word.view().shelf[1].shown, shareOf('fresh', Math.floor(word.view().day)), 'and the jar reads the same whole day');
  until(word, x => x.ready);
  assert.match(word.view().brian.text, /^After 6 days the nail in fresh water has 12% rust/);
  word.act('days:up');
  assert.equal(word.view().ready, true, 'the word stays open after its first run');
  assert.equal(worked(word)[0], '2% a day × 7 days = 14%');
  assert.match(word.view().brian.text, /^After 6 days/, 'and the closing words stay true of the run they describe');
  word.act('go'); until(word, x => /^After 7 days/.test(x.brian.text));

  const job = createClassroomSession(lesson);
  playThroughTo(job, 'alone');
  assert.equal(worked(job)[0], '12% a day × 7 days = 84%');
  assert.equal(worked(job).at(-1), undefined, 'the verdict waits for the run, because it is the choice the job asks for');
  runWeek(job);
  assert.match(worked(job).at(-1), /^84% is more than 10%, so this is not clean/);
  job.act('coat:zinc');
  assert.deepEqual(worked(job).slice(0, 2), ['100% − 5% a day × 7 days = 65%', '7 days is no more than 20 days, so the rust is 0%.'], 'the switch changes the sums at once');
  assert.equal(worked(job).at(-1), undefined);

  // Whatever the settings, a sum shown is a sum a calculator gives, and it agrees with the bench.
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  for (const jar of ['dry', 'fresh', 'salt']) for (const coat of ['bare', 'zinc']) {
    free.act(`jar:${jar}`); free.act(`coat:${coat}`);
    for (let d = 1; d <= FREE_MAX_DAYS; d++) {
      setDays(free, d);
      const r = jarAfter({...JARS.find(j => j.id === jar), zinc: coat === 'zinc'}, d), shown = worked(free);
      if (coat === 'bare') {
        const [, rate, days, sum] = shown[0].match(/^(\d+)% a day × (\d+) days? = (\d+)%/);
        assert.equal(Number(rate) * Number(days), Number(sum), shown[0]);
        assert.equal(Number(days), d);
        assert.equal(Math.min(100, Number(sum)), Math.round(r.rust * 100), `${jar} bare ${d}: the sum is the bench's`);
      } else if (jar === 'dry') assert.deepEqual(r, {id: 'dry', rust: 0, zincLeft: 1});
      else {
        const [, days, sign, left] = shown[0].match(/^100% − 5% a day × (\d+) days? = (−?)(\d+)%/);
        assert.equal(Number(days), d);
        assert.equal(100 - 5 * d, (sign ? -1 : 1) * Number(left), shown[0]);
        assert.equal(Math.max(0, 100 - 5 * d), Math.round(r.zincLeft * 100), `${jar} zinc ${d}: the coat is the bench's`);
        const under = shown[1].match(/^(\d+)% a day × \((\d+) − 20\) days = (\d+)%/);
        if (d <= 20) { assert.equal(under, null); assert.equal(r.rust, 0); }
        else { assert.equal(Number(under[1]) * (Number(under[2]) - 20), Number(under[3]), shown[1]); assert.equal(Math.min(100, Number(under[3])), Math.round(r.rust * 100)); }
      }
    }
  }
});

test('the free test: only different settings count, three open Continue, and the table keeps the results', () => {
  const free = createClassroomSession(lesson);
  playThroughTo(free, 'try-free');
  assert.ok(!free.view().ready);
  assert.deepEqual([free.view().dial.days, free.view().switch.coat, free.view().jarPick.jar], [7, 'bare', 'salt']);
  runWeek(free);
  assert.match(free.view().brian.text, /^After 7 days in salt water, the bare nail has 84% rust\. Change the jar, the days or the protection/);
  runWeek(free);
  assert.ok(!free.view().ready, 'the same setting again does not count as a different one');
  assert.match(free.view().prompt, /tested so far: 1 of 3/);
  free.act('coat:zinc'); setDays(free, 22); runWeek(free);
  assert.match(free.view().brian.text, /^After 22 days in salt water, the nail with a zinc coat has 24% rust, and its coat has gone/);
  assert.ok(!free.view().ready);
  free.act('jar:fresh'); runWeek(free);
  assert.match(free.view().brian.text, /^After 22 days in fresh water, the nail with a zinc coat has 4% rust, and its coat has gone/);
  assert.ok(free.view().ready, 'three different settings open Continue');
  assert.deepEqual(free.view().rows.slice(-3).map(r => [r.label, r.days, Math.round(r.rust * 100)]), [['Salt water, bare', 7, 84], ['Salt water, zinc coat', 22, 24], ['Fresh water, zinc coat', 22, 4]], 'the table keeps the results');
  // A long test on the top of the dial, and rust that cannot pass 100%.
  free.act('coat:bare'); free.act('jar:salt'); setDays(free, FREE_MAX_DAYS); free.act('days:up');
  assert.equal(free.view().dial.days, FREE_MAX_DAYS);
  free.act('go');
  assert.equal(free.view().ready, false, 'a line said during a run is not kept on the page as the result');
  run(free, 5.5);
  assert.match(free.view().brian.text, /^After 30 days in salt water, the bare nail has 100% rust\. The nail has rusted all the way through, so the rust stops at 100%/);
  assert.match(free.view().formulas[0].worked, /= 360%, which stops at 100%/);
  // The mouse reaches the jar buttons, and hovering names them.
  const v = free.view();
  for (const jar of ['dry', 'fresh', 'salt']) assert.equal(hitTest(v, ...targetPoint(v, `jar:${jar}`))?.action, `jar:${jar}`);
  assert.ok(hoverInfo(v, ...targetPoint(v, 'jar:dry')));
});

test('the panel gives nothing away while a question is open, and shows no stale days', () => {
  const said = session => JSON.stringify(session.view().formulas);
  // The word step and the watch come before the question about how long the coat lasts.
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-zinc');
  assert.doesNotMatch(said(session), /\b20\b/);
  session.act('go'); until(session, x => x.ready);
  assert.doesNotMatch(said(session), /\b20\b/);
  session.act('next'); until(session, x => x.ready);
  assert.equal(session.view().step.id, 'watch');
  assert.doesNotMatch(said(session), /\b20\b/);
  session.act('next');
  // Three days: the sum follows the dial and waits for its answer until the run.
  assert.equal(session.view().formulas[0].worked, '12% a day × 7 days = ?');
  setDays(session, 3);
  assert.equal(session.view().formulas[0].worked, '12% a day × 3 days = ?');
  assert.doesNotMatch(said(session), /36%/);
  assert.equal(session.view().noPreview, true, 'the graph does not draw the answer');
  session.act('go');
  assert.equal(session.view().cards.length, 3);
  assert.doesNotMatch(said(session), /36%/);
  session.act('answer:1'); until(session, x => x.ready);
  assert.equal(session.view().formulas[0].worked, '12% a day × 3 days = 36%');
  session.act('next');
  // How long the coat lasts: the question is about a week, whatever the dial last read.
  assert.equal(session.view().step.id, 'try-zinc');
  assert.equal(session.view().formulas[0].worked, '100% − 5% a day × 7 days = 65%');
  assert.doesNotMatch(said(session), /\b20\b/);
  session.act('answer:0');
  assert.doesNotMatch(said(session), /\b20\b/);
  session.act('go'); until(session, x => x.ready);
  assert.equal(session.view().formulas[1].worked, '12% a day × (25 − 20) days = 60%');
});

test('question 1 gives its rates in a sentence', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'check-five');
  assert.equal(session.view().formulas[0].worked, 'The rate is 2% a day in fresh water and 12% a day in salt water.');
});

test('the hint and the note say which way to turn the dial from every setting', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-days');
  for (let days = 1; days <= 7; days++) {
    setDays(session, days);
    const hint = session.view().hints[1];
    if (days === 3) { assert.match(hint, /^The dial reads 3, so press Space/); continue; }
    assert.match(hint, days < 3 ? /^Press ↑ until the dial reads 3/ : /^Press ↓ until the dial reads 3/);
    session.act('go');
    assert.match(session.view().brian.text, days < 3 ? /so press ↑ until the dial reads 3/ : /so press ↓ until the dial reads 3/);
  }
});

test('Show me alone finishes the free test: each press tries a different setting, reaches three, and says what it will test', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-free');
  const seenSettings = new Set();
  for (let round = 1; round <= FREE_TRIES; round++) {
    assert.equal(session.view().ready, false, `not ready before round ${round}`);
    for (let rung = 1; rung <= 3; rung++) session.act('help');
    const v = session.view();
    assert.ok(v.pointer, `round ${round}: Brian points`);
    assert.ok(targetPoint(v, v.pointer.action), `round ${round}: at a place on the board`);
    run(session, SHOW_ME_S + .1);
    if (round > 1) assert.match(session.view().brian.text, /^That is how it is done\. I will test /);
    until(session, x => x.rows.length === round && x.keys.Space === 'go', 30);
    const row = session.view().rows.at(-1);
    seenSettings.add(`${row.label}/${row.days}`);
    assert.equal(seenSettings.size, round, `round ${round} tried a different setting`);
    assert.match(session.view().prompt, round < FREE_TRIES ? new RegExp(`tested so far: ${round} of 3`) : /Press Enter to continue/);
  }
  assert.equal(session.view().ready, true, 'three rounds of Show me open Continue');
  // From any setting already tested, by jar alone too, Show me still moves on.
  for (let round = 0; round < 3; round++) {
    for (let rung = 1; rung <= 3; rung++) session.act('help');
    run(session, SHOW_ME_S + .1);
    until(session, x => x.rows.at(-1) && !x.running && x.keys.Space === 'go', 30);
  }
  assert.equal(new Set(session.view().rows.map(r => `${r.label}/${r.days}`)).size, 6, 'the last six runs are six different settings');
});

test('a revisit to the three days keeps one set of words on the page while the dial turns', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-zinc');
  session.act('back');
  assert.equal(session.view().step.id, 'try-days');
  const before = session.view(), row = before.page.at(-1), result = row.result;
  assert.equal(before.brian.text, row.setup);
  for (const action of ['days:down', 'days:down', 'days:up']) {
    session.act(action);
    const v = session.view();
    assert.equal(v.say, before.say, 'the words do not change with the dial');
    assert.deepEqual([v.page.at(-1).setup, v.page.at(-1).result], [row.setup, result], 'and the page keeps what it had');
  }
  assert.match(session.view().prompt, /The dial reads 6 days/, 'the prompt carries the live number');
  assert.equal(session.view().formulas[0].worked, '12% a day × 6 days = ?', 'and so does the panel');
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
