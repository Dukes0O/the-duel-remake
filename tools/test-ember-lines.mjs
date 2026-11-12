// WW-LINES: every caption in docs/WASTELAND_WORLD.md section 5 is registered.
import assert from 'node:assert/strict';
import {EMBER_CAPTIONS, EMBER_LINE_IDS, EMBER_NOTE, EMBER_NOTE_ID} from '../src/story/ember-lines.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {captionText, storyLetter, storyLineKeys} from '../src/story/story-lines.js';

const EXPECTED = [
  ['Job 1 start', 'Cinder', 'This pot holds the last of the Everburn. Don\'t drop it. I mean it.'],
  ['Job 1 start', 'Cinder', 'I\'ve bolted a flamethrower to your car. Press its number and burn anything in the way.'],
  ['First barricade', 'Cinder', 'Ash Men\'s fence. Get close, and burn it.'],
  ['Crash, pot spills', 'Cinder', 'You dropped my fire! Go back, I\'ve got more. Slower this time.'],
  ['Job 1 sighting', 'Cinder', 'See the smoke with wheels under it? That is Old Smoke\'s furnace. Keep the pot out of its sight.'],
  ['Tin Town in sight', 'Auntie Solder', 'Is that smoke coming from your roof, or are you just pleased to see us?'],
  ['Job 1 won', 'Auntie Solder', 'A live ember. I haven\'t seen one in a year. Bring it in.'],
  ['Job 2 start', 'Auntie Solder', 'You can\'t get that car down my alleys. You\'ve legs, haven\'t you?'],
  ['Job 2 start', 'Cinder', 'Hold F to step out. Take my Hand Flamer. It only reaches six metres, so get close.'],
  ['First lamp', 'Cinder', 'One lit. Two more. Watch your eyebrows.'],
  ['Raiders', 'Cinder', 'Ash Men on the walkway. Fire works on them too.'],
  ['Job 2 won', 'Auntie Solder', 'Three lamps. Now we can see how bad it is. The board\'s by the door if you want work.'],
  ['Job 3 start', 'Auntie Solder', 'Thief! He\'s got my bellows! Heading for the Boneyard!'],
  ['In the Boneyard', 'Cinder', 'He\'s going through the planes. So are you.'],
  ['Falling behind', 'Cinder', 'Closer! You\'re losing him!'],
  ['Job 3 won', 'Cinder', 'Those are good bellows. Keep the flamethrower. You\'ve earned it.'],
  ['Job 3 sighting', 'Cinder', 'He was taking the bellows to the furnace. There it goes, out the far end.'],
  ['Job 4 start', 'Big Bess\'s driver, Moss', 'Bess does twenty miles an hour, downhill, with a tailwind. Keep them off us.'],
  ['Bess hit', 'Moss', 'That one hurt her feelings.'],
  ['Bess resting', 'Moss', 'She needs a minute. Hold on.'],
  ['Job 4 sighting', 'Moss', 'Furnace on the ridge, keeping pace with us. Bess does not like being watched.'],
  ['Job 4 won', 'Auntie Solder', 'Listen to that. That\'s a forge. That is a forge, you lovely thing.'],
  ['Job 5 start', 'Cinder', 'Old Smoke keeps the well key in the old mall. Leave the car outside. Too loud.'],
  ['Inside the mall', 'Cinder', 'Stay out of their lamps. If they see you, run. Nobody\'s cross with you for running.'],
  ['Key taken', 'Cinder', 'Got it? You\'ll walk slow with that. Mind the way back.'],
  ['Alarm', 'Cinder', 'They\'ve seen you! Run for the car!'],
  ['Job 5 won', 'Old Smoke', 'Little driver. You took my key. Come and give it back, up at the well.'],
  ['Job 6 start', 'Cinder', 'Hold them off while I work the valve. Three lots, I\'d guess.'],
  ['Waves over', 'Cinder', 'Valve\'s free. Hang on, what\'s that noise?'],
  ['Old Smoke appears', 'Old Smoke', 'Fire is mine. Everything goes grey in the end.'],
  ['Chase starts, after his first line', 'Old Smoke', 'If I cannot have the fire, nobody has it. I am going to put out your forge.'],
  ['Chase starts', 'Cinder', 'He is heading for Tin Town! When a door glows, hit it!'],
  ['First vent', 'Cinder', 'One down. Stay on him!'],
  ['Second vent', 'Old Smoke', 'My beautiful furnace! Stop that!'],
  ['Third vent', 'Cinder', 'That\'s it! Get clear! GET CLEAR!'],
  ['The gate burns', 'Auntie Solder', 'He has set the gate alight! We will mend it. You stop that furnace.'],
  ['The furnace reaches the gate with the right door broken', 'Auntie Solder', 'That is close enough, Smoke. Look at the state of you. Go home.'],
  ['Job 6 won', 'Cinder', 'Well, look at that. A hundred years old and still showing off.'],
  ['Job 6 won', 'Cinder', 'I\'m with you now, if you\'ll have me. Nobody else lets me bring the pot.'],
  ['Job 6 won', 'Hollis', 'I can see that fire from the gate. Good work, driver. The boiler has its parts.'],
];

assert.equal(Object.keys(EMBER_CAPTIONS).length, EXPECTED.length, 'every table caption is included');
assert.equal(EMBER_LINE_IDS.length, EXPECTED.length + 1, 'the note is included in the owned ids');
assert.equal(new Set(EMBER_LINE_IDS).size, EMBER_LINE_IDS.length, 'all ids are unique');
assert.ok(EMBER_LINE_IDS.every(id => id.startsWith('story.ember.')), 'ids use story.ember.*');
const entries = Object.values(EMBER_CAPTIONS);
assert.deepEqual(entries.map(({where, who, text}) => [where, who, text]), EXPECTED, 'captions match the design table word for word');
assert.ok(entries.every(({who, where, text, captionOnly}) => who && where && text && captionOnly === true), 'every caption has a speaker, place and words');
assert.ok(entries.every(({text}) => !text.includes(String.fromCharCode(0x2014))), 'captions contain no em dash');
// EVERBURN-RUN-AT-TOWN: seven new lines, and the old chase line is gone. The ids are the card's, except that the card's
// Job 1 sighting line (cinder.21) would have taken the id of the existing Job 6 line, so it is cinder.24.
const NEW_IDS = {'story.ember.cinder.24': 'Job 1 sighting', 'story.ember.cinder.22': 'Job 3 sighting', 'story.ember.moss.4': 'Job 4 sighting',
  'story.ember.old-smoke.4': 'Chase starts, after his first line', 'story.ember.cinder.23': 'Chase starts',
  'story.ember.auntie-solder.7': 'The gate burns', 'story.ember.auntie-solder.8': 'The furnace reaches the gate with the right door broken'};
for (const [id, where] of Object.entries(NEW_IDS)) assert.equal(EMBER_CAPTIONS[id]?.where, where, `${id} is registered for ${where}`);
assert.equal(EMBER_CAPTIONS['story.ember.cinder.17'], undefined, 'the old chase line cinder.17 is removed');
assert.match(EMBER_CAPTIONS['story.ember.cinder.21'].text, /^I'm with you now/, 'the existing Job 6 line cinder.21 is unchanged');
const chase = EVERBURN_JOBS[5].steps[1];
assert.deepEqual([chase.startLineId, ...[].concat(chase.afterStartLineId)], ['story.ember.old-smoke.2', 'story.ember.old-smoke.4', 'story.ember.cinder.23'],
  'the chase starts with Old Smoke\'s two lines, then Cinder\'s');
assert.equal(chase.what, 'Stop the furnace before it reaches Tin Town. Hit a door while it glows.', 'the job\'s line on screen names Tin Town');
assert.equal(EMBER_NOTE.id, EMBER_NOTE_ID);
assert.equal(EMBER_NOTE.text, 'Driver, the forge at Tin Town has gone cold, and no forge means no boiler parts. A woman named Cinder is at the back gate with a pot of fire and a bad attitude. I like her. Go and see. Hollis');
assert.equal(EMBER_NOTE.spoken, false, 'Hollis\'s note is never spoken');
assert.deepEqual(storyLineKeys().includes('ember'), true, 'the Everburn registers its story');
assert.equal(storyLetter('ember'), EMBER_NOTE, 'the note is available as the story letter');
for (const [id, caption] of Object.entries(EMBER_CAPTIONS)) assert.equal(captionText(id), caption.text, `${id} is registered`);
assert.equal(captionText(EMBER_NOTE_ID), null, 'the note is not a caption');
// The three sightings: each line plays once, through the job's own line player, at the moment the card gives.
function lineIdsHeard(job, viewAt, seconds, dt = 0.1) {
  const heard = [];
  for (let t = 0; t < seconds; t += dt) {
    job = stepJob(job, viewAt(t), dt);
    for (const request of job.requests) if (request.type === 'say' && request.lineId) heard.push(request.lineId);
  }
  return {heard, job};
}
{
  // Job 1: Cinder speaks once, when the player first comes within 260 m of the furnace at (300, -120).
  const at = (x, z) => ({player: {position: {x, y: 0, z}}, actors: []});
  const far = lineIdsHeard(createJob(EVERBURN_JOBS[0], 1), () => at(0, 0), 12);
  assert.ok(!far.heard.includes('story.ember.cinder.24'), 'job 1: nothing is said while the furnace is out of sight');
  const near = lineIdsHeard(far.job, () => at(100, 0), 12);
  assert.equal(near.heard.filter(id => id === 'story.ember.cinder.24').length, 1, 'job 1: Cinder points out the furnace once, 233 m away');
  const again = lineIdsHeard(near.job, () => at(300, -100), 12);
  assert.ok(!again.heard.includes('story.ember.cinder.24'), 'job 1: she does not say it twice');
  const edge = lineIdsHeard(createJob(EVERBURN_JOBS[0], 1), () => at(60, 0), 12);
  assert.ok(!edge.heard.includes('story.ember.cinder.24'), 'job 1: 270 m away is still too far');
}
{
  // Job 3: the catch plays Cinder's line and the job waits for it; the thief rolling on does not undo the catch.
  const thief = (health, gap) => ({player: {position: {x: 0, y: 0, z: 0}}, actors: [{id: 'ash-man-bellows-thief', position: {x: gap, y: 0, z: 0}, health}]});
  const start = lineIdsHeard(createJob(EVERBURN_JOBS[2], 1), () => thief(20, 20), 10);
  assert.ok(!start.heard.includes('story.ember.cinder.22') && !start.job.done, 'job 3: the line is not said before the catch');
  const caught = lineIdsHeard(start.job, t => thief(t < 0.2 ? 0 : 20, t < 0.2 ? 5 : 90), 1);
  assert.equal(caught.heard.filter(id => id === 'story.ember.cinder.22').length, 1, 'job 3: Cinder says it at the catch');
  assert.equal(caught.job.done, false, 'job 3: the job waits while the line shows');
  const after = lineIdsHeard(caught.job, () => thief(20, 90), 4);
  assert.equal(after.job.done, true, 'job 3: it ends once the line is done, though the thief has rolled out of reach');
  assert.ok(!after.heard.includes('story.ember.cinder.22'), 'job 3: the line is said once');
}
{
  // Job 4: Moss speaks once, when Big Bess has gone 30% of her road.
  const bess = share => ({player: {position: {x: 0, y: 0, z: 0}}, actors: [{id: 'big-bess', position: {x: 400, y: 0, z: 300}, health: 100, pathProgress: .5, share}]});
  const early = lineIdsHeard(createJob(EVERBURN_JOBS[3], 1), () => bess(.29), 12);
  assert.ok(!early.heard.includes('story.ember.moss.4'), 'job 4: nothing at 29% of the road');
  const there = lineIdsHeard(early.job, () => bess(.31), 12);
  assert.equal(there.heard.filter(id => id === 'story.ember.moss.4').length, 1, 'job 4: Moss says it at 31%');
  const later = lineIdsHeard(there.job, () => bess(.6), 12);
  assert.ok(!later.heard.includes('story.ember.moss.4'), 'job 4: and does not say it twice');
}

console.log(`test-ember-lines: ${EXPECTED.length} captions and note passed`);
