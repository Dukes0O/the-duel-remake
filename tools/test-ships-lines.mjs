import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SHIPS_CAPTIONS, SHIPS_LINE_IDS, SHIPS_NOTE, VANE_LETTER} from '../src/story/ember-lines.js';
import {captionText, storyLetter, storyLineKeys} from '../src/story/story-lines.js';

const markdown = fs.readFileSync(new URL('../docs/story/ships-in-the-sand.md', import.meta.url), 'utf8');
const start = markdown.indexOf('## 4. Every line');
const end = markdown.indexOf('\n## 5.', start);
assert.notEqual(start, -1, 'the source section exists');
assert.notEqual(end, -1, 'the source section has an end');
const section = markdown.slice(start, end);
const expected = [...section.matchAll(/^\| `([^`]+)` \| ([^|]+) \| ([^|]+) \| (.+) \|$/gm)]
  .map(([, id, who, where, text]) => ({id, who: who.trim(), where: where.trim(), text: text.trim()}));
const notes = new Map([[SHIPS_NOTE.id, SHIPS_NOTE], [VANE_LETTER.id, VANE_LETTER]]);
assert.equal(expected.length, 90, 'every line in the design section is included');
assert.equal(SHIPS_LINE_IDS.length, expected.length, 'every design id is registered');
assert.equal(new Set(SHIPS_LINE_IDS).size, SHIPS_LINE_IDS.length, 'ids are unique');
assert.equal(storyLineKeys().includes('ships'), true, 'the story is registered');

for (const item of expected) {
  assert.ok(item.text.length <= 260, `${item.id} is within the caption limit`);
  const note = notes.get(item.id);
  if (note) {
    assert.equal(note.who, item.who);
    assert.equal(note.where, item.where);
    assert.equal(note.text, item.text, `${item.id} matches the design`);
    assert.equal(note.spoken, false, `${item.id} is unspoken`);
  } else {
    const caption = SHIPS_CAPTIONS[item.id];
    assert.ok(caption, `${item.id} exists`);
    assert.equal(caption.who, item.who, `${item.id} speaker matches`);
    assert.equal(caption.where, item.where, `${item.id} moment matches`);
    assert.equal(caption.text, item.text, `${item.id} text matches`);
    assert.equal(caption.captionOnly, true, `${item.id} is a caption`);
    assert.equal(captionText(item.id), item.text, `${item.id} is registered`);
  }
}

assert.equal(Object.keys(SHIPS_CAPTIONS).length, expected.length - notes.size);
assert.equal(storyLetter('ships'), SHIPS_NOTE);
assert.equal(captionText(SHIPS_NOTE.id), null);
assert.equal(captionText(VANE_LETTER.id), null);
assert.ok(!expected.some(({who, text}) => who === 'Captain Imre' && text.includes('One thing to report')));
console.log(`test-ships-lines: ${expected.length} exact lines passed`);
