// SEA-LINES: every Act 5 line matches docs/story/the-sea-works.md section 4, and every line id in the
// section 5 job data resolves to words.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEA_CAPTIONS, SEA_LINE_CUES, SEA_LINE_IDS, SEA_PLACEHOLDERS} from '../src/story/sea-lines.js';
import '../src/story/ember-lines.js';
import {CAPTION_MAX_CHARACTERS, captionText, storyLineKeys} from '../src/story/story-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const source = readFileSync(new URL('../docs/story/the-sea-works.md', import.meta.url), 'utf8');
const section4 = source.split(/^## 5\./m)[0].split(/^## 4\./m)[1];
assert.ok(section4, 'section 4 exists');
const rows = [...section4.matchAll(/^\| `(?<id>[^`]+)` \| (?<who>.*?) \| (?<where>.*?) \| (?<text>.*?) \|$/gm)];
assert.equal(rows.length, 160, 'section 4 has 160 lines');
const expected = rows.map(row => row.groups);

// Every id is present, in the page's order, once.
assert.deepEqual(SEA_LINE_IDS, expected.map(({id}) => id), 'every id in section 4 is here, in order');
assert.equal(new Set(SEA_LINE_IDS).size, SEA_LINE_IDS.length, 'ids are unique');
assert.ok(SEA_LINE_IDS.every(id => id.startsWith('sea.')), 'every id is a sea id');
assert.equal(storyLineKeys().includes('sea'), false, 'the lines are town captions, not a second story table');

// Each line is word for word, a caption, within the limit and without an em dash, even once its blanks are filled.
const longFill = Object.fromEntries(SEA_PLACEHOLDERS.map(name => [name, name === 'aground' ? '999' : 'X'.repeat(24)]));
const used = new Set();
for (const {id, who, where, text} of expected) {
  assert.deepEqual(SEA_CAPTIONS[id], {who, where, text, captionOnly: true}, `${id} matches section 4`);
  assert.equal(captionText(id), text, `${id} is registered`);
  assert.ok(text.length > 0 && text.length <= CAPTION_MAX_CHARACTERS, `${id} is at most ${CAPTION_MAX_CHARACTERS} characters`);
  assert.ok(!/[\u2013\u2014]/u.test(`${who}${where}${text}`), `${id} has no em dash`);
  for (const [, name] of text.matchAll(/\{([^}]*)\}/g)) {
    assert.ok(SEA_PLACEHOLDERS.includes(name), `${id} uses only the town's placeholders, not {${name}}`);
    used.add(name);
  }
  const filled = text.replace(/\{([^}]*)\}/g, (_, name) => longFill[name]);
  assert.ok(filled.length <= CAPTION_MAX_CHARACTERS, `${id} stays within the limit once filled from the town`);
}
assert.deepEqual([...used].sort(), [...SEA_PLACEHOLDERS].sort(), 'every placeholder the card names is used');

// The bell is the one cue, and it is a cue the game already has.
assert.deepEqual(Object.keys(SEA_LINE_CUES), ['sea.day.14'], 'only day 14 has a cue');
assert.ok(SEA_CAPTIONS['sea.day.14'].text.includes('ring the bell'), 'and that is the line with the bell');
for (const cue of Object.values(SEA_LINE_CUES)) assert.ok(Object.hasOwn(SOUND_BANK, cue), `${cue} is in the sound bank`);

// Every line id in the section 5 job data resolves (a few name a line from an earlier story, such as Big Mo's loan).
const section5 = source.split(/^## 5\./m)[1].split(/^## 6\./m)[0];
const dataBlock = section5.match(/```js\s*([\s\S]*?)```/);
assert.ok(dataBlock, 'section 5 data block exists');
const referencedIds = [...new Set(dataBlock[1].match(/\b(?:story\.)?sea\.[a-z0-9.-]+[a-z0-9]|\bstory\.[a-z]+\.[a-z0-9.-]+[a-z0-9]/g) ?? [])];
assert.ok(referencedIds.length >= 100, `the job data names its lines (found ${referencedIds.length})`);
for (const id of referencedIds) assert.ok(captionText(id), `${id} in the job data resolves`);

console.log(`SEA-LINES: ${SEA_LINE_IDS.length} lines and ${referencedIds.length} job data references passed.`);
