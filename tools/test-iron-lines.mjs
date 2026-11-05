// MULE-LINES: every line in docs/story/iron-mule.md section 3 exists word for word.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IRON_CAPTIONS, IRON_LINE_IDS, IRON_NOTES} from '../src/story/iron-lines.js';
import {captionText, storyLineKeys} from '../src/story/story-lines.js';

const doc = readFileSync(new URL('../docs/story/iron-mule.md', import.meta.url), 'utf8');
const section = doc.split('## 3. Every line')[1].split('\n## 4.')[0];
const expected = [...section.matchAll(/^\| \x60(story\.iron\.[^\x60]+)\x60 \| ([^|]+) \| ([^|]+) \| (.+) \|$/gm)]
  .map(([, id, who, where, text]) => [id, who.trim(), where.trim(), text.trim()]);
const actualIds = Object.keys(IRON_CAPTIONS).concat(Object.keys(IRON_NOTES));
assert.equal(expected.length, 80, 'all 80 lines from the design table are read');
assert.equal(actualIds.length, expected.length, 'every design line has an id');
assert.equal(new Set(IRON_LINE_IDS).size, IRON_LINE_IDS.length, 'all ids are unique');
assert.deepEqual(new Set(IRON_LINE_IDS), new Set(expected.map(([id]) => id)), 'the owned ids match the design table');
for (const [id, who, where, text] of expected) {
  assert.ok(text.length <= 260, id + ' is at most 260 characters');
  if (Object.hasOwn(IRON_NOTES, id)) {
    const entry = IRON_NOTES[id];
    assert.deepEqual([entry.who, entry.where, entry.text, entry.spoken], [who, where, text, false], id + ' stays unspoken and matches the design');
    assert.equal(captionText(id), null, id + ' is not a caption');
  } else {
    const entry = IRON_CAPTIONS[id];
    assert.deepEqual([entry.who, entry.where, entry.text], [who, where, text], id + ' matches the design');
    assert.equal(entry.captionOnly, true, id + ' is caption only');
    assert.equal(captionText(id), text, id + ' is registered');
  }
}
assert.deepEqual(Object.keys(IRON_NOTES), ['story.iron.hollis.note', 'story.iron.6.letter']);
assert.ok(storyLineKeys().includes('iron'), 'the Iron Mule lines are registered');
console.log('test-iron-lines: 80 exact lines passed');
