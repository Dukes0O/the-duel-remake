// WATER-LINES: the Water Road's words (docs/story/wasteland-water-road.md section 5).
import assert from 'node:assert/strict';
import {WATER_CAPTIONS, WATER_LETTER, WATER_LETTER_ID, WATER_NOTES, WATER_LINE_IDS, WATER_END_SEQUENCE,
  waterJobCaption} from '../src/story/water-lines.js';
import {CAPTION_MAX_CHARACTERS, captionText, storyLetter, storySequence, storyLineKeys} from '../src/story/story-lines.js';
import {createStoryRadio} from '../src/story/story-radio.js';
import {WARLORD_LADDER} from '../src/warlords.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

// Every line of section 5: Hollis's note, seven job lines, seven notes from V., Vesper, and Hollis's two end lines.
same(Object.keys(WATER_CAPTIONS).length, 10, 'ten spoken lines');
same(WATER_NOTES.length, 7, 'seven notes from V.');
same(WATER_LINE_IDS.length, 18, 'eighteen lines in all, as in section 5');
same(new Set(WATER_LINE_IDS).size, WATER_LINE_IDS.length, 'every id unique');
ok(WATER_LINE_IDS.every(id => id.startsWith('story.water.')), 'ids are story.water.*');
same(WATER_LETTER.id, WATER_LETTER_ID, 'the letter is Hollis\'s note');
ok(WATER_LETTER.text.startsWith('Driver, the well is dry.') && WATER_LETTER.text.endsWith('Hollis'), 'Hollis signs his note');
ok(WATER_NOTES.every(item => item.text.endsWith(' V.')), 'V. signs every note');
ok([WATER_LETTER, ...WATER_NOTES].every(item => item.spoken === false), 'notes are never spoken');

// Plain words: no long or short dash, nothing over 260 characters, none of the words Kyle does not want.
const texts = [WATER_LETTER.text, ...WATER_NOTES.map(item => item.text), ...Object.values(WATER_CAPTIONS).map(item => item.text)];
const DASHES = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)];
ok(texts.every(text => DASHES.every(dash => !text.includes(dash))), 'no em dash or en dash');
ok(texts.every(text => text.length <= CAPTION_MAX_CHARACTERS), `none over ${CAPTION_MAX_CHARACTERS} characters`);
ok(texts.every(text => !/\b(quiet|silent|load-bearing)\b/i.test(text)), 'no figurative quiet, silent or load-bearing');
ok(Object.values(WATER_CAPTIONS).every(item => item.captionOnly === true && typeof item.who === 'string' && item.who), 'each caption says who speaks');

// One job line for each chapter that has a job (1 to 7); the Baron's chapter has none.
for (const id of WARLORD_LADDER.slice(0, 7)) ok(captionText(waterJobCaption(id)) !== null, `${id}: its job line plays`);
same(waterJobCaption('blackiron'), null, 'the Baron has no job line');
same(waterJobCaption('nobody'), null, 'an unknown warlord has none');

// Registered beside Kogane: the shared lookup finds the captions, never a note.
ok(storyLineKeys().includes('water') && storyLineKeys().includes('kogane'), 'the Water Road and Kogane are both registered');
same(captionText('story.water.vesper.8'), WATER_CAPTIONS['story.water.vesper.8'].text, 'the lookup finds a Water Road caption');
same(captionText(WATER_LETTER_ID), null, 'Hollis\'s note is not a caption');
ok(WATER_NOTES.every(item => captionText(item.id) === null), 'no note from V. is a caption');
same(storyLetter('water'), WATER_LETTER, 'the Story card\'s letter');
same(storySequence('water', 'end'), [...WATER_END_SEQUENCE], 'the end lines play in order');
ok(captionText('story.kogane.daichi.grid') !== null, 'Kogane\'s lines still read');

// The radio plays the end lines one after the other, and refuses a note.
{
  const shown = [], timers = [];
  const radio = createStoryRadio({show: id => shown.push(id), schedule: (callback, ms) => timers.push({callback, ms}) - 1, cancel: () => {}});
  ok(radio.saySequence('water', 'end'), 'the end sequence starts');
  same(shown, ['story.water.hollis.end'], 'Hollis speaks first');
  timers.at(-1).callback();
  same(shown, ['story.water.hollis.end', 'story.water.hollis.9'], 'then the dust on the horizon');
  ok(!radio.say(WATER_NOTES[0].id), 'a note is never spoken');
}

console.log(`test-water-lines: ${checks} checks passed`);
