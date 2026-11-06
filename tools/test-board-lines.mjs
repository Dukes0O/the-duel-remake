// BOARD-LINES: every board line matches its story table and the job data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOARD_CAPTIONS, BOARD_LINE_IDS} from '../src/story/board-lines.js';
import {captionText} from '../src/story/story-lines.js';

const source = readFileSync(new URL('../docs/story/the-notice-board.md', import.meta.url), 'utf8');
const section3 = source.split(/^## 4\./m)[0].split(/^## 3\./m)[1];
assert.ok(section3, 'section 3 exists');

const rows = [...section3.matchAll(/^\| `(?<id>board\.[^`]+)` \| (?<who>.*?) \| (?<where>.*?) \| (?<text>.*?) \|$/gm)];
assert.ok(rows.length > 0, 'section 3 has line rows');
const expected = rows.map(row => [row.groups.id, row.groups.who, row.groups.where, row.groups.text]);
assert.deepEqual(BOARD_LINE_IDS, expected.map(([id]) => id), 'all line ids match section 3 in order');
assert.equal(new Set(BOARD_LINE_IDS).size, BOARD_LINE_IDS.length, 'line ids are unique');
for (const [id, who, where, text] of expected) {
  assert.deepEqual(BOARD_CAPTIONS[id], {who, where, text, captionOnly: true}, `${id} matches section 3`);
  assert.equal(captionText(id), text, `${id} is registered`);
  assert.ok(text.length > 0 && text.length <= 260, `${id} is at most 260 characters`);
  assert.ok(!/[\u2014\u2013]/u.test(text), `${id} has no em or en dash`);
}

const section4 = source.split(/^## 4\./m)[1];
assert.ok(section4, 'section 4 exists');
const dataBlock = section4.match(/```js\s*([\s\S]*?)```/);
assert.ok(dataBlock, 'section 4 data block exists');
const referencedIds = [...new Set(dataBlock[1].match(/board\.[a-z0-9.-]+/g) ?? [])];
for (const id of referencedIds) assert.ok(Object.hasOwn(BOARD_CAPTIONS, id), `${id} resolves`);

console.log(`BOARD-LINES: ${BOARD_LINE_IDS.length} table lines and ${referencedIds.length} job references passed.`);
