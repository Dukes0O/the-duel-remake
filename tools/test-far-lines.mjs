// FAR-LINES: every Far Side line matches its story table, and every line id in the job data resolves.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAR_CAPTIONS, FAR_LINE_IDS} from '../src/story/far-lines.js';
import {captionRecord, captionText} from '../src/story/story-lines.js';

const source = readFileSync(new URL('../docs/story/the-far-side.md', import.meta.url), 'utf8');
const section4 = source.split(/^## 5\./m)[0].split(/^## 4\./m)[1];
assert.ok(section4, 'section 4 exists');
const rows = [...section4.matchAll(/^\| `(?<id>far\.[^`]+)` \| (?<who>.*?) \| (?<where>.*?) \| (?<text>.*?) \|$/gm)];
assert.equal(rows.length, 122, 'section 4 has 122 Far Side lines');
const expected = rows.map(row => [row.groups.id, row.groups.who, row.groups.where, row.groups.text]);
assert.deepEqual(FAR_LINE_IDS, expected.map(([id]) => id), 'every id in section 4 is present, in order');
assert.equal(new Set(FAR_LINE_IDS).size, FAR_LINE_IDS.length, 'line ids are unique');
for (const [id, who, where, text] of expected) {
  assert.deepEqual(FAR_CAPTIONS[id], {who, where, text, captionOnly: true}, `${id} matches section 4`);
  assert.equal(captionText(id), text, `${id} is registered`);
  assert.equal(captionRecord(id), FAR_CAPTIONS[id], `${id} is registered as the Far Side's own record`);
  assert.ok(text.length > 0 && text.length <= 260, `${id} is at most 260 characters`);
  assert.ok(!/[–—]/u.test(`${who}${where}${text}`), `${id} has no em dash`);
}

// The only placeholders are the ones the caller fills: the machine's name, the apprentice's name and the survey's numbers.
const placeholders = new Set(Object.values(FAR_CAPTIONS).flatMap(caption => caption.text.match(/\{[^}]*\}/g) ?? []));
assert.deepEqual([...placeholders].sort(), ['{apprentice}', '{distance}', '{grade}', '{higher}', '{machine}', '{rise}', '{up}'],
  'placeholders are the known ones');

const section5 = source.split(/^## 5\./m)[1];
assert.ok(section5, 'section 5 exists');
const dataBlock = section5.match(/```js\s*([\s\S]*?)```/);
assert.ok(dataBlock, 'section 5 data block exists');
const referencedIds = [...new Set(dataBlock[1].match(/far\.[a-z0-9]+(?:\.[a-z0-9-]+)+/g) ?? [])];
assert.ok(referencedIds.length >= 100, 'the job data names its lines');
for (const id of referencedIds) assert.ok(Object.hasOwn(FAR_CAPTIONS, id), `${id} resolves`);

console.log(`FAR-LINES: ${FAR_LINE_IDS.length} table lines and ${referencedIds.length} job references passed.`);
