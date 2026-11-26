// The written storylines are in the one shape of docs/story/open-scablands.md section 18, "The one shape of a
// storyline's file" (card OPEN-THREAD-SHAPE). This test holds them there:
//   1. checkThread finds nothing wrong with any of the files.
//   2. Each file keeps its count of lines, thoughts, questions and choices, as numbers, so that a later edit that
//      drops one is seen. A count that rises is a deliberate addition: change the number with the reason.
//   3. checkThread refuses one key of each older dialect, on a copy of a real file, and names the key and where.
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkThread} from '../src/world/open/check-tables.js';

const folder = new URL('../src/story/threads/content/', import.meta.url);
const files = readdirSync(folder).filter(name => name.endsWith('.js')).sort();
const threads = {};
for (const name of files) threads[name.replace(/\.js$/, '')] = structuredClone((await import(new URL(name, folder).href)).default);

// What a player reads, counted: every line said (in a beat, a thing asked, a choice, a mend, a mission, an outcome or a
// "later" row), every thought (in a list, on a choice or on a thing to find), every question and every choice.
function tally(thread) {
  const count = {lines: 0, thoughts: 0, questions: 0, choices: 0};
  const walk = (value, key) => {
    if (Array.isArray(value)) {
      if (key === 'lines') count.lines += value.length;
      if (key === 'thoughts') count.thoughts += value.length;
      if (key === 'questions') count.questions += value.length;
      if (key === 'choices') count.choices += value.length;
      for (const item of value) walk(item, key);
    } else if (value && typeof value === 'object') {
      for (const [name, item] of Object.entries(value)) {
        if (name === 'notes') continue;
        if (name === 'thought' && typeof item === 'string' && ('words' in value || 'what' in value)) count.thoughts += 1;
        walk(item, name);
      }
    }
  };
  walk(thread, null);
  return count;
}

// The numbers, file by file. A file brought to the shape lost nothing a player reads (26 November 2026).
const COUNTS = {
  // The Ash Men's turn of the burned camp (OPEN-WRITE-4, 26 November 2026), a file of its own until it is folded into
  // burned-camp.js.
  'burned-camp-ash-men': {lines: 69, thoughts: 34, questions: 13, choices: 16},
  'burned-camp': {lines: 7, thoughts: 13, questions: 5, choices: 3},
  'dace-goes-looking': {lines: 100, thoughts: 31, questions: 11, choices: 16},
  'dry-pump': {lines: 65, thoughts: 31, questions: 11, choices: 18},
  'lights-on-the-whites': {lines: 66, thoughts: 20, questions: 15, choices: 13},
  'mall-road-toll': {lines: 59, thoughts: 18, questions: 10, choices: 24},
  'market-day': {lines: 97, thoughts: 32, questions: 31, choices: 29},
  'radio-hill-voice': {lines: 79, thoughts: 32, questions: 15, choices: 19},
  'runaway': {lines: 78, thoughts: 17, questions: 13, choices: 20},
  'somebody-elses-flag': {lines: 46, thoughts: 16, questions: 9, choices: 11},
  'stranded-hauler': {lines: 67, thoughts: 38, questions: 20, choices: 15},
};

for (const [name, thread] of Object.entries(threads)) {
  assert.deepEqual(checkThread(thread), [], name + ' is not in the shape');
  assert.deepEqual(tally(thread), COUNTS[name], name + ': its count of lines, thoughts, questions and choices changed');
}
assert.equal(Object.keys(threads).length, 11, 'nine storylines are written, the burned camp, and one turn of it');
assert.deepEqual(Object.keys(COUNTS).sort(), Object.keys(threads).sort(), 'every storyline has its counts');

// One key of each older dialect is refused, on a copy of a real file. Each is put where the older files had it.
const refused = (name, change, key, where) => {
  const copy = structuredClone(threads[name]);
  change(copy);
  const wrong = checkThread(copy);
  assert.ok(wrong.some(text => text.includes('"' + key + '"') && text.includes(where)), name + ' with "' + key + '" at ' + where + ' was not refused: ' + wrong.join(' | '));
};
const firstBeat = copy => Object.values(copy.beats).find(beat => beat.choices?.length);
const beatNamed = (copy, name) => copy.beats[name];
// Dialect of the first three (stranded-hauler, dry-pump, dace-goes-looking): `act` for how a choice is made, a
// `marks` table at the foot, `rolls`, `afterwards`, `banked`, `is` on a role, `rumour` on a row.
refused('stranded-hauler', copy => { firstBeat(copy).choices[0].act = 'say'; }, 'act', 'choices[0]');
refused('dry-pump', copy => { copy.marks = {}; }, 'marks', 'The storyline');
refused('dace-goes-looking', copy => { firstBeat(copy).rolls = []; }, 'rolls', 'beats.');
refused('stranded-hauler', copy => { copy.afterwards = []; }, 'afterwards', 'The storyline');
refused('dry-pump', copy => { Object.values(copy.cast)[0].is = 'dot'; }, 'is', 'cast.');
// Dialect of the second three (radio-hill-voice, lights-on-the-whites, runaway): `does`, `job`, `effectsWhen`,
// `tiedBack`, `only` and `castWhen` on a role.
refused('radio-hill-voice', copy => { firstBeat(copy).choices[0].does = 'Go'; }, 'does', 'choices[0]');
refused('lights-on-the-whites', copy => { firstBeat(copy).job = {}; }, 'job', 'beats.');
refused('runaway', copy => { firstBeat(copy).effectsWhen = []; }, 'effectsWhen', 'beats.');
refused('radio-hill-voice', copy => { copy.tiedBack = []; }, 'tiedBack', 'The storyline');
refused('mall-road-toll', copy => { Object.values(copy.cast)[0].only = 'x'; }, 'only', 'cast.');
refused('runaway', copy => { Object.values(copy.cast)[0].castWhen = {}; }, 'castWhen', 'cast.');
// Dialect of the third three (mall-road-toll, market-day, somebody-elses-flag): `needs` for a condition, `for` for a
// people, `end` and `ends`, `steps`, `fight`, `not` on a role.
refused('mall-road-toll', copy => { firstBeat(copy).needs = {fact: 'night', atLeast: 2}; }, 'needs', 'beats.');
refused('market-day', copy => { firstBeat(copy).choices[0].for = 'glasshouse'; }, 'for', 'choices[0]');
refused('somebody-elses-flag', copy => { firstBeat(copy).end = 'x'; }, 'end', 'beats.');
refused('mall-road-toll', copy => { firstBeat(copy).steps = []; }, 'steps', 'beats.');
refused('market-day', copy => { firstBeat(copy).fight = {}; }, 'fight', 'beats.');
refused('somebody-elses-flag', copy => { Object.values(copy.cast)[0].not = ['x']; }, 'not', 'cast.');
// A `thread` effect written by hand is refused, and so is a place or a `next` that the file does not have.
refused('market-day', copy => { firstBeat(copy).choices[0].effects = [{type: 'thread', id: copy.id, to: 'x'}]; }, 'thread', 'effect written by hand');
refused('runaway', copy => { firstBeat(copy).choices[0].next = 'nowhere-at-all'; }, 'nowhere-at-all', 'not a beat');
refused('dry-pump', copy => { firstBeat(copy).when = {after: 'nowhere-at-all'}; }, 'nowhere-at-all', '(after)');

console.log('test-thread-shape: ok');
