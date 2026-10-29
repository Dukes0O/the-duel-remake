// STORY-KOGANE-LINES: the ten captions, the letter, the reuse table and the story radio.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY_CAPTIONS, STORY_LETTER, STORY_LETTER_ID, STORY_LINE_IDS, STORY_REUSED_LINES, STORY_ANA_SEQUENCE,
  CAPTION_MAX_CHARACTERS, DELIVERY_TIME_WORDS, DELIVERY_TIME_WORDS_ALTERNATIVE, captionReadMs, captionText} from '../src/story/story-lines.js';
import {createStoryRadio, STORY_RADIO_HOLD_MS} from '../src/story/story-radio.js';
import {DRIVE_RADIO_LINES} from '../src/lessons/drive-radio-lines.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

// The lines: ten captions and the letter, unique ids, the contract's names.
const ids = Object.keys(STORY_CAPTIONS);
same(ids.length, 10, 'ten captions');
same(new Set(STORY_LINE_IDS).size, STORY_LINE_IDS.length, 'every id unique');
same(STORY_LINE_IDS.length, 11, 'ten captions and one letter');
ok(STORY_LINE_IDS.every(id => id.startsWith('story.kogane.')), 'ids are story.kogane.*');
same(STORY_LETTER.id, STORY_LETTER_ID, 'letter id');
ok(STORY_LETTER.text.startsWith('Dear driver, I am Daichi Mori.') && STORY_LETTER.text.endsWith('the night is ours. Daichi'), 'letter present');
same(STORY_LETTER.spoken, false, 'the letter is never spoken');
const allTexts = [...Object.values(STORY_CAPTIONS).map(c => c.text), STORY_LETTER.text];
const DASHES = [String.fromCharCode(0x2014), String.fromCharCode(0x2013)];
ok(allTexts.every(text => DASHES.every(dash => !text.includes(dash))), 'no em dash or en dash');
ok(Object.values(STORY_CAPTIONS).every(c => c.text.length > 0 && c.text.length <= CAPTION_MAX_CHARACTERS), 'no caption over 260 characters');
same(CAPTION_MAX_CHARACTERS, 260, 'the limit is 260');
ok(Object.values(STORY_CAPTIONS).every(c => c.captionOnly === true), 'every new line is caption only');
ok(Object.values(STORY_CAPTIONS).every(c => c.who && c.where), 'each caption names who and where');
ok(allTexts.every(text => !/\d/.test(text)), 'no prices, times or speeds (no digits at all)');
same(captionText(STORY_LETTER_ID), null, 'the letter is not a caption');
same(captionText('story.kogane.nope'), null, 'unknown id has no text');
same(STORY_CAPTIONS['story.kogane.daichi.grid'].text,
  'Four hairpins, one road. Brake at the board, turn in late, and get on the power early. See you at the bottom.', 'a line word for word');
// The words match the packet's table 6.1.
const packet = readFileSync(new URL('../docs/story/kogane-invitation.md', import.meta.url), 'utf8');
for (const [id, caption] of Object.entries(STORY_CAPTIONS)) {
  ok(packet.includes('| `' + id + '` |') && packet.includes('| ' + caption.text + ' |'), id + ' matches the packet');
}
ok(packet.includes('| ' + STORY_LETTER.text + ' |'), 'the letter matches the packet');
ok([DELIVERY_TIME_WORDS, DELIVERY_TIME_WORDS_ALTERNATIVE].includes(DELIVERY_TIME_WORDS), 'one constant for the dusk wording');
ok(Object.values(STORY_CAPTIONS).every(c => !/dusk|in the evening/.test(c.text)), 'captions use the constant, not their own dusk wording');

// Ana's two lines are in order.
same(STORY_ANA_SEQUENCE, ['story.kogane.ana.call', 'story.kogane.ana.lead'], 'Ana speaks in order');

// Reading time: 2.5 s plus 0.045 s a character, at most 10 s.
same(captionReadMs('x'.repeat(100)), 2500 + 4500, 'reading time of 100 characters');
same(captionReadMs('x'.repeat(1000)), 10000, 'reading time is capped at 10 seconds');
same(captionReadMs(''), 2500, 'reading time of nothing');
ok(Object.values(STORY_CAPTIONS).every(c => captionReadMs(c.text) <= 10000 && captionReadMs(c.text) >= 2500), 'every caption reads within the limits');

// Reuse table: every reused id exists in the recorded sets; the new ones exist as captions.
const reused = STORY_REUSED_LINES.flatMap(row => row.ids);
ok(reused.length >= 16, 'the reuse table is complete');
for (const id of reused) ok(Object.hasOwn(DRIVE_RADIO_LINES, id) || Object.hasOwn(HELI_RADIO_LINES, id), id + ' is a recorded line');
ok(reused.every(id => !STORY_LINE_IDS.includes(id)), 'no story id is also a recorded id');
for (const row of STORY_REUSED_LINES) if (row.then) ok(Object.hasOwn(STORY_CAPTIONS, row.then), row.then + ' exists');
ok(STORY_REUSED_LINES.find(row => row.ids.includes('drive.radio.v2.corner.pass')).onlyIfRewardIsNew, 'corner.pass only if the reward is new');
ok(STORY_REUSED_LINES.some(row => row.ids.includes('heli.radio.job.done') && row.then === 'story.kogane.daichi.thanks'), 'job done then Daichi thanks');

// The radio: a fake chain and fake timers record the order.
function rig({muted = false, noChain = false} = {}) {
  const log = [];
  let now = 0, nextHandle = 1;
  const timers = new Map();
  const chain = {keyed: false,
    keyOn() { if (chain.keyed) return false; chain.keyed = true; log.push('on'); return true; },
    keyOff() { if (!chain.keyed) return false; chain.keyed = false; log.push('off'); return true; }};
  const state = {muted};
  const radio = createStoryRadio({
    getChain: () => (noChain ? null : chain),
    show: (id, text, ms) => log.push('show ' + id + ' ' + ms),
    hide: id => log.push('hide ' + id),
    isMuted: () => state.muted,
    schedule: (callback, ms) => { const handle = nextHandle++; timers.set(handle, {at: now + ms, callback}); return handle; },
    cancel: handle => timers.delete(handle),
  });
  const advance = ms => {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); now = due[1].at; due[1].callback();
    }
    now = end;
  };
  return {radio, log, chain, advance, state, timers};
}
const grid = 'story.kogane.daichi.grid', gridMs = captionReadMs(STORY_CAPTIONS[grid].text);

{ // on, show, off, hide in order
  const r = rig();
  ok(r.radio.say(grid), 'say works');
  same(r.log, ['on', 'show ' + grid + ' ' + gridMs], 'keys on, then shows');
  ok(r.radio.keyed && r.radio.playing === grid, 'playing and keyed');
  r.advance(STORY_RADIO_HOLD_MS);
  same(r.log.slice(2), ['off'], 'keys off after the short transmission');
  r.advance(gridMs - STORY_RADIO_HOLD_MS);
  same(r.log.slice(3), ['hide ' + grid], 'hides at the end of the reading time');
  same(r.radio.playing, null, 'nothing playing afterwards');
  same(r.timers.size, 0, 'no timers left');
}
{ // never keyed twice, never left on
  const r = rig();
  r.radio.say(grid); r.radio.say('story.kogane.daichi.win');
  same(r.log.filter(x => x === 'on').length, 2, 'two keys on');
  same(r.log.filter(x => x === 'off').length, 1, 'the first caption keyed off before the next keyed on');
  ok(r.log.indexOf('off') < r.log.lastIndexOf('on'), 'off comes before the second on');
  r.radio.stop();
  same(r.chain.keyed, false, 'stop leaves the radio off');
}
{ // leave, pause, stop, mute always key off
  for (const way of ['leave', 'pause', 'stop']) {
    const r = rig();
    r.radio.say(grid);
    r.radio[way]();
    same(r.chain.keyed, false, way + ' keys off');
    ok(r.log.includes('hide ' + grid), way + ' hides the words');
    same(r.timers.size, 0, way + ' clears timers');
    r.advance(20000);
    same(r.log.filter(x => x === 'off').length, 1, way + ' keys off once, even later');
  }
  const r = rig();
  r.radio.say(grid);
  r.radio.mute();
  same(r.chain.keyed, false, 'mute keys off at once');
  r.advance(20000);
  ok(r.log.includes('hide ' + grid), 'the words still end after mute');
  same(r.log.filter(x => x === 'off').length, 1, 'mute keys off once');
}
{ // muted from the start: words show, radio never keys on
  const r = rig({muted: true});
  r.radio.say(grid);
  same(r.log, ['show ' + grid + ' ' + gridMs], 'muted: words only');
  r.advance(20000);
  same(r.log.includes('on'), false, 'muted: never keys on');
}
{ // no audio yet: words show, nothing breaks
  const r = rig({noChain: true});
  r.radio.say(grid); r.advance(20000);
  same(r.log, ['show ' + grid + ' ' + gridMs, 'hide ' + grid], 'no chain: words only');
}
{ // Ana in order, the second straight after the first
  const r = rig();
  ok(r.radio.sayAna(), 'Ana starts');
  const first = captionReadMs(captionText(STORY_ANA_SEQUENCE[0])), second = captionReadMs(captionText(STORY_ANA_SEQUENCE[1]));
  r.advance(first);
  same(r.log.filter(x => x.startsWith('show')).map(x => x.split(' ')[1]), STORY_ANA_SEQUENCE, 'second line follows the first');
  r.advance(second);
  same(r.chain.keyed, false, 'Ana ends with the radio off');
  same(r.log.filter(x => x === 'on').length, 2, 'two keys on');
  same(r.log.filter(x => x === 'off').length, 2, 'two keys off');
  const r2 = rig();
  r2.radio.sayAna(); r2.radio.leave(); r2.advance(60000);
  same(r2.log.filter(x => x.startsWith('show')).length, 1, 'leaving drops the line waiting in the queue');
  same(r2.chain.keyed, false, 'leaving mid-queue leaves the radio off');
}
{ // the letter and unknown ids are refused; a disposed radio is quiet
  const r = rig();
  same(r.radio.say(STORY_LETTER_ID), false, 'the letter is never spoken');
  same(r.radio.say('nope'), false, 'unknown id refused');
  same(r.radio.sayInOrder([grid, 'nope']), false, 'a list with an unknown id plays nothing');
  same(r.log, [], 'nothing happened');
  r.radio.say(grid); r.radio.dispose();
  same(r.chain.keyed, false, 'dispose keys off');
  same(r.radio.say(grid), false, 'disposed radio refuses');
}
console.log('story lines: ' + checks + ' checks passed');
