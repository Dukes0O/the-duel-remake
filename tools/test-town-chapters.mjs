import assert from 'node:assert/strict';
import {ACT1_CHAPTERS, getTownChapterLines, getTownNext} from '../src/town/town-chapters.js';
import {TOWN_CAPTIONS, townCaptionText} from '../src/town/content/lines.js';
import {captionText} from '../src/story/story-lines.js';
import {createStoryRadio} from '../src/story/story-radio.js';

for (const [id, line] of Object.entries(TOWN_CAPTIONS)) {
  assert.ok(line.text.length <= 260, `${id} is over 260 characters`);
  assert.ok(!line.text.includes(String.fromCharCode(0x2014)), `${id} contains an em dash`);
  assert.equal(captionText(`story.town.${id.replace(/^town\./, '')}`), line.text, `${id} is registered with the story radio`);
}

assert.ok(ACT1_CHAPTERS.length > 0);
assert.ok(ACT1_CHAPTERS.every(chapter => chapter.next.trim().length > 0));
assert.equal(getTownNext({id:'town-1'}).chapter, ACT1_CHAPTERS[0]);
assert.equal(getTownNext({id:'town-1', story:{facts:{pitsDug:true}, completed:{'town.act1.twelve':true}}}).chapter, ACT1_CHAPTERS[1]);
assert.equal(townCaptionText('town.book.first', {founders:[{name:'Hollis'}, {name:'Odessa'}]}), 'These twelve came first. Hollis, Odessa');
assert.equal(townCaptionText('imre.won', {calendar:{year:1}}), "thirty-one years aground and we've not missed a watch. She'll want a crew when the water's back.");

const custom = [{id:'new-story.open', when:{path:'stories.newStory.ready', equals:true}, lineIds:['new.line'], next:'Meet the new neighbours.', mapTarget:'new-place'}];
const next = getTownNext({stories:{newStory:{ready:true}}}, custom);
assert.equal(next.chapter, custom[0]);
assert.equal(next.sentence, 'Meet the new neighbours.');
assert.equal(next.mapTarget, 'new-place');
assert.deepEqual(getTownChapterLines({founders:['Ari']}, {lineIds:['town.book.first']}), [
  {id:'town.book.first', text:'These twelve came first. Ari'},
]);

const underway = getTownNext({underWay:'The water tower is still going up.'}, []);
assert.equal(underway.chapter, null);
assert.equal(underway.sentence, 'The water tower is still going up.');
assert.ok(getTownNext({}, []).sentence.length > 0);
assert.equal(getTownNext({urgentNext:'A fire needs help.', underWay:'The tower is going up.'}, []).sentence, 'A fire needs help.');
const shown = [];
const radio = createStoryRadio({show:(id, text) => shown.push({id, text})});
assert.equal(radio.say('town.1.twelve'), true);
assert.deepEqual(shown.at(-1), {id:'town.1.twelve', text:TOWN_CAPTIONS['town.1.twelve'].text});
assert.equal(radio.sayTownLine('town.book.first', {founders:['Ari', 'Mina']}), true);
assert.deepEqual(shown.at(-1), {id:'town.book.first', text:'These twelve came first. Ari, Mina'});
radio.dispose();
console.log(`Town chapters passed: ${ACT1_CHAPTERS.length} Act 1 chapters, ${Object.keys(TOWN_CAPTIONS).length} captions.`);
