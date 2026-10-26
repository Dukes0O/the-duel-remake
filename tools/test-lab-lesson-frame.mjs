import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLesson, createLessonSession, registerLesson, lessonDefinition, forceArrow, FORCE_COLOURS} from '../src/lab/lesson-frame.js';
import {exampleLesson as d, exampleHooks as hooks} from './fixtures/lab-lesson-example.js';
import {createLab, normalizeLab, learnLabWord, labOf, labNotebookOf} from '../src/lab/lab-save.js';
import {normalizeProfile, createProfile} from '../src/progression.js';
const flags = {enabled: id => ['lab', 'lab-2'].includes(id)};
const copy = () => structuredClone(d);
const session = () => createLessonSession({definition: d, hooks});
const finish = s => { for (let i = 0; i < 100; i++) s.tick(.1); };
function toTries(s) { s.next(); s.next(); finish(s); s.next(); finish(s); s.next(); }

test('the definition rejects words before their introduction in every earlier teaching surface', () => {
  assert.equal(validateLesson(d, hooks), d);
  const early = copy(); early.wonder.text = 'Will a push move the ball?';
  assert.throws(() => validateLesson(early, hooks), /word used before shown: Push/);
  const missing = copy(); missing.vocabulary.push('drag'); assert.throws(() => validateLesson(missing, hooks), /missing a words step/);
  const earlierMeaning = copy(); earlierMeaning.words.push({id: 'drag', word: 'Drag', meaning: 'Drag slows things down.', animation: 'ball'});
  earlierMeaning.words[0].meaning = 'A push can beat drag.';
  assert.throws(() => validateLesson(earlierMeaning, hooks), /word used before shown: Drag/);
  const long = copy(); long.tries[0].prompt = 'One. Two. Three.'; assert.throws(() => validateLesson(long, hooks), /short sentences/);
  const hook = {...hooks, pictures: {}}; assert.throws(() => validateLesson(d, hook), /missing picture/);
  const banned = copy(); banned.hints.short.what = 'Not quite.'; assert.throws(() => validateLesson(banned, hooks), /short sentences/);
  const crowded = copy(); crowded.challenge.text = 'One idea. Another idea.';
  assert.throws(() => validateLesson(crowded, hooks), /short sentences/, 'the key card leaves room for one instruction');
});
test('watch has a real paused clock, one small step and replay, and cannot be skipped', () => {
  const s = session(); assert.equal(s.view().stage, 0); assert.deepEqual(s.view().words, []);
  s.next(); assert.deepEqual(s.view().words.map(w => w.id), ['push']); s.next();
  assert.equal(s.next(), false); s.tick(.1); s.pause(); const time = s.view().time;
  s.tick(.1); assert.equal(s.view().time, time); s.step(); assert.equal(s.view().time, time + .25);
  s.replay(); assert.equal(s.view().time, 0); assert.equal(s.view().paused, false);
  finish(s); assert.equal(s.next(), true); assert.equal(s.view().index, 1);
});
test('failure ladder explains, simplifies, shows the answer and returns to an unfinished player try', () => {
  const s = session(); toTries(s); assert.equal(s.view().support, 'guided');
  assert.equal(s.run(), false);
  for (let i = 0; i < 3; i++) {
    s.predict('near'); s.run(); finish(s);
    assert.equal(s.view().text, i ? d.hints.short.plainer : d.hints.short.what);
    assert.equal(s.view().showMe, i === 2); assert.equal(s.next(), false);
    if (i < 2) s.retry();
  }
  assert.equal(s.showMe(), true); assert.equal(s.view().text, d.hints.short.worked);
  assert.equal(s.next(), false); finish(s); s.next(); finish(s); s.next();
  assert.equal(s.view().stage, 3); assert.equal(s.view().support, 'guided'); assert.equal(s.view().result, null);
  for (const support of ['guided', 'prompted', 'alone']) {
    assert.equal(s.view().support, support); s.predict('far'); s.control('turn'); s.run(); finish(s);
    assert.equal(s.view().result.passed, true); s.next();
  }
  assert.equal(s.view().stage, 4); assert.equal(s.next(), false);
  s.answer('near'); assert.equal(s.view().animation, 'strong'); s.next(); s.answer('far'); s.next();
  assert.equal(s.view().challenge, true); assert.equal(s.view().text, d.challenge.text);
});
test('last attempt is copied for the ghost and successful teaching never grants progress', () => {
  const s = session(); toTries(s); s.predict('near'); s.run(); finish(s); s.retry();
  assert.deepEqual(s.view().previous.input, {});
  s.predict('far'); s.control('turn'); assert.deepEqual(s.view().previous.input, {});
  assert.equal(Object.hasOwn(s.view(), 'profile'), false);
  s.run(); finish(s); s.next();
  assert.deepEqual(s.view().previous.input, {turn: 1}, 'successful last try replaces the failed ghost');
});
test('a bench challenge is a fresh unassisted run after the checks', () => {
  const s = session(); toTries(s);
  for (let i = 0; i < 3; i++) { s.predict('far'); s.control('turn'); s.run(); finish(s); s.next(); }
  s.answer('far'); s.next(); s.answer('far'); s.next();
  assert.equal(s.startChallenge(), true); assert.equal(s.view().challenging, true);
  assert.equal(s.view().keyIdea, d.challenge.text); assert.equal(s.view().selected, null);
  assert.equal(s.view().result, null); assert.equal(s.next(), false);
  s.predict('far'); s.control('turn'); s.run(); finish(s);
  assert.equal(s.view().attempts.length, 4); assert.equal(s.view().result.passed, true);
  s.challengeRetry(); assert.equal(s.view().result, null);
  for (let i = 0; i < 3; i++) { s.predict('near'); s.run(); finish(s); assert.equal(s.view().keyIdea, null, 'help replaces the key idea to keep two sentences'); if (i < 2) s.retry(); }
  s.showMe(); finish(s); s.next(); finish(s); s.next();
  assert.equal(s.view().keyIdea, d.challenge.text); assert.equal(s.view().result, null);
});
test('notebook defaults, normalizes, round trips through profiles, preserves rewards and future data', () => {
  const old = {...createLab(), done: {lift: true}, owned: {'heavy-hook': true}, mystery: {a: [1]}}; delete old.notebook;
  const p = {...createProfile(), credits: 1234, lab: old}; const frozen = structuredClone(p);
  assert.deepEqual(labNotebookOf(p), []);
  assert.equal(Object.hasOwn(labOf(p), 'notebook'), false, 'the read default does not change the original Lab shape');
  assert.deepEqual(labNotebookOf({}), []);
  const r = learnLabWord(p, 'push', {flags}); assert.equal(r.ok, true); assert.deepEqual(p, frozen);
  assert.deepEqual(r.profile.lab.notebook, ['push']); assert.equal(r.profile.credits, 1234);
  assert.deepEqual(r.profile.lab.done, old.done); assert.deepEqual(r.profile.lab.owned, old.owned);
  assert.deepEqual(r.profile.lab.mystery, old.mystery);
  const loaded = normalizeProfile(JSON.parse(JSON.stringify(r.profile))); assert.deepEqual(loaded.lab.notebook, ['push']);
  assert.equal(learnLabWord(r.profile, 'push', {flags}).profile, r.profile);
  assert.deepEqual(normalizeLab({...old, notebook: ['push', 'push', null, 1, '__proto__', 'future-word', '<script>']}).notebook, ['push', 'future-word']);
  assert.equal(learnLabWord(p, 'push', {flags: {enabled: id => id === 'lab'}}).profile, p);
  const future = {...p, lab: {...old, version: 99, notebook: {future: true}}};
  assert.equal(learnLabWord(future, 'push', {flags}).profile, future); assert.equal(normalizeLab(future.lab), future.lab);
  assert.deepEqual(labNotebookOf(future), [], 'a future malformed notebook is safe to read');
});
test('registered data is stable and force arrows share their colour and linear scale', () => {
  const data = copy(); const remove = registerLesson(data, hooks);
  data.wonder.text = 'Changed'; assert.equal(lessonDefinition('lift').definition.wonder.text, d.wonder.text);
  remove(); assert.equal(lessonDefinition('lift'), null);
  for (const [kind, colour] of Object.entries(FORCE_COLOURS)) {
    const a = forceArrow({kind, newtons: 200}, .003), b = forceArrow({kind, newtons: 400}, .003);
    assert.equal(b.length, a.length * 2); assert.equal(a.colour, colour); assert.equal(a.label, '200 N');
  }
  assert.throws(() => forceArrow({kind: 'push', newtons: NaN}, .003));
});
