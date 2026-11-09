// RAIL-LINES: every railway line matches its story table and the job data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RAIL_CAPTIONS, RAIL_LINE_IDS} from '../src/story/rail-lines.js';
import {captionText} from '../src/story/story-lines.js';

const source = readFileSync(new URL('../docs/story/there-is-no-2-15.md', import.meta.url), 'utf8');
const section4 = source.split(/^## 5\./m)[0].split(/^## 4\./m)[1];
assert.ok(section4, 'section 4 exists');
const rows = [...section4.matchAll(/^\| `(?<id>rail\.[^`]+)` \| (?<who>.*?) \| (?<where>.*?) \| (?<text>.*?) \|$/gm)];
assert.equal(rows.length, 158, 'section 4 has 158 railway lines');
const expected = rows.map(row => [row.groups.id, row.groups.who, row.groups.where, row.groups.text]);
assert.deepEqual(RAIL_LINE_IDS, expected.map(([id]) => id), 'all line ids match section 4 in order');
assert.equal(new Set(RAIL_LINE_IDS).size, RAIL_LINE_IDS.length, 'line ids are unique');
for (const [id, who, where, text] of expected) {
  assert.deepEqual(RAIL_CAPTIONS[id], {who, where, text, captionOnly: true}, `${id} matches section 4`);
  assert.equal(captionText(id), text, `${id} is registered`);
  assert.ok(text.length > 0 && text.length <= 260, `${id} is at most 260 characters`);
  assert.ok(!/\u2014/u.test(text), `${id} has no em dash`);
}

const section5 = source.split(/^## 5\./m)[1];
assert.ok(section5, 'section 5 exists');
const dataBlock = section5.match(/```js\s*([\s\S]*?)```/);
assert.ok(dataBlock, 'section 5 data block exists');
const referencedIds = [...new Set(dataBlock[1].match(/rail\.[a-z0-9.-]+/g) ?? [])];
for (const id of referencedIds) assert.ok(Object.hasOwn(RAIL_CAPTIONS, id), `${id} resolves`);

console.log(`RAIL-LINES: ${RAIL_LINE_IDS.length} table lines and ${referencedIds.length} job references passed.`);
