// LAB-CLASSROOM-LANGUAGE (docs/board/cards/LAB-CLASSROOM-LANGUAGE.md): the classroom's running page, and the wording
// rules a machine can check. Whole sentences and accurate physics are read by Claude; these keep the plain faults away.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClassroomSession} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';

const projectile = CLASSROOM_LESSONS.projectile;
const until = (session, test, limit = 30) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };

test('the page keeps every step, in order: a new word goes below the last one and replaces nothing', () => {
  const session = createClassroomSession(projectile);
  until(session, v => v.ready);
  const first = session.view().page[0].setup;
  assert.match(first, /Why did the water miss/);
  session.act('next');
  session.act('drop'); until(session, v => v.ready);
  session.act('next');
  const v = session.view();
  assert.deepEqual(v.page.map(row => row.title), ['Why did the water miss?', 'Metres per second', 'Gravity and acceleration']);
  assert.equal(v.page[0].setup, first, 'the first words are still there');
  assert.match(v.page[1].setup, /measure speed in metres per second/, 'the word’s definition stays');
  assert.match(v.page[1].result, /multiplying by 3\.6/, 'and so does what the test showed');
  assert.match(v.page[2].setup, /Gravity is the pull of the Earth/);
});

test('a hint or a "watch this" line is not kept on the page, and going back shows the page up to that step', () => {
  const session = createClassroomSession(projectile);
  until(session, v => v.ready); session.act('next');
  session.act('help');
  session.act('drop');
  const row = session.view().page[1];
  assert.match(session.view().brian.text, /Watch the marks/);
  assert.ok(![row.setup, row.result].some(text => /Watch the marks/.test(text ?? '')));
  assert.ok(![row.setup, row.result].includes(session.view().hints[0]));
  until(session, v => v.ready); session.act('next');
  session.act('back');
  assert.deepEqual(session.view().page.map(r => r.title), ['Why did the water miss?', 'Metres per second']);
});

test('a result that arrives with no event stays on the page, and replaces a hint the player asked for', () => {
  const session = createClassroomSession(projectile);
  until(session, v => v.ready); session.act('next');
  session.act('drop'); until(session, v => v.ready); session.act('next');
  session.act('drop'); until(session, v => v.ready); session.act('next');
  session.act('drop'); until(session, v => v.ready); session.act('next');
  session.act('drop'); until(session, v => v.ready); session.act('next');
  assert.equal(session.view().step.id, 'watch-water');
  session.tick(.05); session.act('help');
  assert.equal(session.view().brian.text, session.view().hints[0]);
  until(session, v => v.ready);
  assert.match(session.view().brian.text, /The friction of the air against the droplets/, 'the explanation, not the hint');
  session.act('next');
  assert.match(session.view().page.at(-2).result, /The friction of the air against the droplets/, 'and it stays on the page');
});

test('a step done again shows its opening words before anything it found out the first time', () => {
  const session = createClassroomSession(projectile);
  until(session, v => v.ready); session.act('next');
  session.act('drop'); until(session, v => v.ready); session.act('next');
  session.act('back');
  const v = session.view();
  assert.equal(v.brian.text, v.page.at(-1).setup, 'the opening words are Brian’s words now');
});

// Every lesson moves onto this list as it is rewritten (card, "Order"); when all are on it, it becomes the whole of CLASSROOM_LESSONS.
const REWRITTEN = ['projectile', 'launch', 'rust', 'downforce', 'fire', 'gforce', 'altitude', 'braking', 'strength', 'fuel', 'wax', 'headings', 'lift', 'pendulum'];
test('a rewritten lesson calls no object she or her, uses one measurement system, and has physics that determines rather than decides', () => {
  for (const id of REWRITTEN) for (const file of [`${id}-classroom.js`, `${id}-board.js`]) {
    const source = readFileSync(new URL(`../src/lab/lessons/${file}`, import.meta.url), 'utf8');
    for (const [fault, pattern] of [['she or her', /\b(she|her|hers|herself)\b/i], ['mph', /\bmph\b/i], ['decides', /\bdecides?\b/i], ['takes its speed', /\b(air|wind)\s+(soon\s+)?takes\b/i]])
      assert.ok(!pattern.test(source), `${file} has ${fault}: ${source.match(pattern)?.[0]}`);
  }
});

// Pendulums holds its one formula until the player has found out by testing that length matters and weight does not, because showing it sooner
// would settle both guesses, and its last questions ask about those same two things.
const HOLDS_FORMULAS_BACK = {pendulum: ['word-pendulum', 'word-length', 'word-swing-time', 'watch-lengths', 'try-short', 'try-heavy', 'check-heavy', 'check-settle']};
test('a rewritten lesson shows formulas on every step after the first', () => {
  for (const id of REWRITTEN) {
    const lesson = CLASSROOM_LESSONS[id], model = lesson.createModel();
    lesson.steps.forEach((step, i) => {
      if (i === 0) return;
      model.enter(i);
      if (!HOLDS_FORMULAS_BACK[id]?.includes(step.id)) assert.ok(model.view().formulas?.length > 0, `${step.id} shows the physics`);
    });
  }
});
