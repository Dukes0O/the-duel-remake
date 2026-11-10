// LAB-BRIAN-SHORT (docs/board/cards/LAB-BRIAN-SHORT.md): Brian says at most three sentences at a time. In every classroom
// lesson each step opens with at most three sentences, and a step that has more keeps the rest behind "Tell me more".
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {createClassroomSession} from '../src/lab/classroom/classroom-frame.js';
import {MORE, SHOWN, OPENING_SENTENCES, OPENING_WORDS, sentences, wordCount, splitSay, fullText, firstSentence, paragraphs} from '../src/lab/classroom/brian-text.js';

test('a sentence ends at a full stop, a question mark or an exclamation mark, and a number with a decimal point stays whole', () => {
  assert.deepEqual(sentences('One swing needs 7.8 s. Is 9.81 m/s² the pull? Yes! It said “stop.” Then it stopped.'),
    ['One swing needs 7.8 s.', 'Is 9.81 m/s² the pull?', 'Yes!', 'It said “stop.”', 'Then it stopped.']);
  assert.equal(firstSentence(`A metre is a long stride.${MORE}A door is two metres tall.`), 'A metre is a long stride.');
});

test('a text opens with what comes before the mark, and the rest waits behind "Tell me more" with no word lost', () => {
  const text = `One. Two.${MORE}Three. Four. Five. Six. Seven.`;
  assert.deepEqual(splitSay(text), {opening: 'One. Two.', more: 'Three. Four. Five. Six. Seven.'});
  assert.equal(fullText(text), 'One. Two. Three. Four. Five. Six. Seven.');
  assert.deepEqual(paragraphs(text), ['One. Two.', 'Three. Four. Five.', 'Six. Seven.'], 'an opened text is drawn three sentences to a paragraph');
  assert.deepEqual(splitSay('One. Two. Three.'), {opening: 'One. Two. Three.', more: ''}, 'three sentences need no button');
});

test('a text with no mark, or with a long opening, is still cut after three sentences', () => {
  assert.deepEqual(splitSay('One. Two. Three. Four.'), {opening: 'One. Two. Three.', more: 'Four.'});
  assert.deepEqual(splitSay(`One. Two. Three. Four.${MORE}Five.`), {opening: 'One. Two. Three.', more: 'Four. Five.'});
  assert.deepEqual(splitSay(`${SHOWN} One. Two. Three?${MORE}Four.`), {opening: `${SHOWN} One. Two. Three?`, more: 'Four.'}, 'the words Brian says after his pointer do not push the question out of the opening');
});

test('all sixteen classroom lessons: every step opens with at most three sentences, and a longer step marks where "Tell me more" begins', () => {
  const lessons = Object.entries(CLASSROOM_LESSONS);
  assert.equal(lessons.length, 16);
  const faults = [];
  let marked = 0;
  for (const [id, lesson] of lessons) {
    const model = lesson.createModel();
    lesson.steps.forEach((step, index) => {
      model.enter(index);
      const say = model.view({help: 0, assist: false}).say, where = `${id}/${step.id}`;
      assert.equal(typeof say, 'string', `${where} has opening words`);
      const [head, ...rest] = say.split(MORE), count = sentences(head).length, words = wordCount(head);
      if (count < 1) faults.push(`${where}: no opening words`);
      if (count > OPENING_SENTENCES) faults.push(`${where}: the opening has ${count} sentences`);
      if (words > OPENING_WORDS) faults.push(`${where}: the opening has ${words} words`);
      if (rest.length > 1) faults.push(`${where}: more than one mark`);
      if (rest.length && !rest.join('').trim()) faults.push(`${where}: nothing waits behind the mark`);
      if (rest.length) marked++;
      // What the screen shows first is the same opening, and the button is offered exactly when words are waiting.
      const shown = splitSay(say);
      assert.equal(shown.opening, sentences(head).slice(0, OPENING_SENTENCES).join(' '), where);
      assert.equal(Boolean(shown.more), sentences(fullText(say)).length > sentences(shown.opening).length, where);
    });
  }
  assert.deepEqual(faults, [], `${faults.length} openings are too long`);
  assert.ok(marked >= 5, 'the lessons that had long openings keep the rest behind the mark');
});

test('the page keeps every word of a marked step, and Brian’s words reach the screen whole', () => {
  const session = createClassroomSession(CLASSROOM_LESSONS.pendulum);
  for (let t = 0; t < 8; t += .05) session.tick(.05);
  session.act('next');
  const v = session.view();
  assert.equal(v.step.id, 'word-pendulum');
  assert.ok(v.brian.text.includes(MORE), 'the pendulum step has more to tell');
  assert.match(splitSay(v.brian.text).opening, /^A pendulum is a weight that hangs on a string/);
  assert.match(splitSay(v.brian.text).more, /A litre of water weighs one kilogram/);
  assert.equal(v.page.at(-1).setup, v.brian.text, 'the page keeps the whole text for the opened step');
});

test('the classroom screen offers "Tell me more" on T (M switches the sound off) and opens an earlier step with a click', () => {
  const source = readFileSync(new URL('../src/lab/classroom/classroom-ui.js', import.meta.url), 'utf8');
  assert.match(source, /data-lc="more"[^>]*>Tell me more \$\{kbd\('T'\)\}/);
  assert.match(source, /event\.code === 'KeyT'/);
  assert.match(source, /data-lc="row:\$\{i\}" aria-expanded/);
});
