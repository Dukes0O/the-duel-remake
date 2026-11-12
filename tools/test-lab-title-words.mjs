// LAB-LOOK routine fix: taught words become word buttons inside sentences, never inside titles or names
// ("Lift and weight" on the door board and in the shop stays one piece).
import test from 'node:test';
import assert from 'node:assert/strict';
import {wordMarkup, sentenceMarkup, LEFT_WHOLE} from '../src/lab/word-links.js';
import {shopMarkup, boardMarkup} from '../src/lab/lab-markup.js';
import {doorBoardMarkup} from '../src/lab/lab-walk-room.js';
import {lessonBoardMarkup} from '../src/lessons/lesson-board.js';

const WORDS = [{id: 'lift', word: 'Lift'}, {id: 'weight', word: 'Weight'}, {id: 'hover', word: 'Hover'}];
const wordsIn = html => [...html.matchAll(/data-word="(\w+)"/g)].map(m => m[1]);

test('a taught word in a sentence becomes a word button, and the button text keeps the sentence word', () => {
  const html = wordMarkup('The lift beats the weight.', WORDS);
  assert.deepEqual(wordsIn(html), ['lift', 'weight']);
  assert.match(html, /<button type="button" class="lab-word" data-word="lift">lift<\/button>/);
});

test('a lesson or upgrade name written inside a sentence stays whole, and the words around it still link', () => {
  const html = sentenceMarkup('Lift and weight passed. The lift is bigger than the weight. Try Engine 1 and Light frame.', WORDS);
  assert.ok(html.startsWith('Lift and weight passed.'), 'the lesson name is plain text');
  assert.deepEqual(wordsIn(html), ['lift', 'weight']);
  assert.equal(sentenceMarkup('Strength against weight, Light frame', WORDS), 'Strength against weight, Light frame');
});

test('headings and anything marked data-name are left whole', () => {
  for (const tag of ['h3', 'h4', '[data-name]', '[data-word]']) assert.ok(LEFT_WHOLE.split(',').includes(tag), `${tag} is left whole`);
});

const ROWS = [
  {group: 'Flying', id: 'lift', name: 'Lift and weight', open: true, done: false, note: '', reward: 'Engine 1', state: 'open'},
  {group: 'Flying', id: 'fire', name: 'Fire triangle', open: false, done: false, note: 'Opens with the helicopter', reward: 'Retardant tank', state: 'locked'},
];

test('the door board, the shop and the lesson list mark every lesson and upgrade title as a name', () => {
  assert.match(doorBoardMarkup(ROWS), /<b data-name>Lift and weight<\/b>/);
  assert.match(doorBoardMarkup(ROWS), /Opens: <span data-name>Engine 1<\/span>/);
  const shop = shopMarkup({rows: [{id: 'engine-1', name: 'Engine 1', lessonName: 'Lift and weight', price: 2500, owned: false, canBuy: true, note: ''}], choices: {showRing: false, showCable: false}, wallet: 5000});
  assert.match(shop, /<b data-name>Engine 1<\/b><small data-name>Lift and weight<\/small>/);
  assert.match(lessonBoardMarkup(ROWS, {action: 'data-lab-lesson', markNames: true}), /<span data-name>Lift and weight<\/span>/);
  assert.match(boardMarkup({rows: ROWS}), /<span data-name>Fire triangle<\/span>/);
});

test('the shared lesson list marks names only when the Lab asks, so the other screens keep their markup', () => {
  assert.doesNotMatch(lessonBoardMarkup(ROWS, {action: 'data-x'}), /data-name/);
});
