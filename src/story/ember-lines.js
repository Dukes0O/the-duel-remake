// The Everburn's words (docs/WASTELAND_WORLD.md section 5). Captions use the
// radio click; no voice file or new sound cue. Hollis's opening note is never
// spoken. Words only: nothing here changes a race, a fight or a save.
import {registerStoryLines} from './story-lines.js';

const line = (who, where, text) => Object.freeze({who, where, text, captionOnly: true});
const note = (id, who, where, text) => Object.freeze({id, who, where, spoken: false, text});

export const EMBER_NOTE_ID = 'story.ember.hollis.note';
export const EMBER_NOTE = note(EMBER_NOTE_ID, 'Hollis (a note, never spoken)', 'The Story Wall, opening note',
  'Driver, the forge at Tin Town has gone cold, and no forge means no boiler parts. A woman named Cinder is at the back gate with a pot of fire and a bad attitude. I like her. Go and see. Hollis');

export const EMBER_CAPTIONS = Object.freeze({
  'story.ember.cinder.1': line('Cinder', 'Job 1 start', 'This pot holds the last of the Everburn. Don\'t drop it. I mean it.'),
  'story.ember.cinder.2': line('Cinder', 'Job 1 start', 'I\'ve bolted a flamethrower to your car. Press its number and burn anything in the way.'),
  'story.ember.cinder.3': line('Cinder', 'First barricade', 'Ash Men\'s fence. Get close, and burn it.'),
  'story.ember.cinder.4': line('Cinder', 'Crash, pot spills', 'You dropped my fire! Go back, I\'ve got more. Slower this time.'),
  'story.ember.auntie-solder.1': line('Auntie Solder', 'Tin Town in sight', 'Is that smoke coming from your roof, or are you just pleased to see us?'),
  'story.ember.auntie-solder.2': line('Auntie Solder', 'Job 1 won', 'A live ember. I haven\'t seen one in a year. Bring it in.'),
  'story.ember.auntie-solder.3': line('Auntie Solder', 'Job 2 start', 'You can\'t get that car down my alleys. You\'ve legs, haven\'t you?'),
  'story.ember.cinder.5': line('Cinder', 'Job 2 start', 'Hold F to step out. Take my Hand Flamer. It only reaches six metres, so get close.'),
  'story.ember.cinder.6': line('Cinder', 'First lamp', 'One lit. Two more. Watch your eyebrows.'),
  'story.ember.cinder.7': line('Cinder', 'Raiders', 'Ash Men on the walkway. Fire works on them too.'),
  'story.ember.auntie-solder.4': line('Auntie Solder', 'Job 2 won', 'Three lamps. Now we can see how bad it is. The board\'s by the door if you want work.'),
  'story.ember.auntie-solder.5': line('Auntie Solder', 'Job 3 start', 'Thief! He\'s got my bellows! Heading for the Boneyard!'),
  'story.ember.cinder.8': line('Cinder', 'In the Boneyard', 'He\'s going through the planes. So are you.'),
  'story.ember.cinder.9': line('Cinder', 'Falling behind', 'Closer! You\'re losing him!'),
  'story.ember.cinder.10': line('Cinder', 'Job 3 won', 'Those are good bellows. Keep the flamethrower. You\'ve earned it.'),
  'story.ember.moss.1': line('Big Bess\'s driver, Moss', 'Job 4 start', 'Bess does twenty miles an hour, downhill, with a tailwind. Keep them off us.'),
  'story.ember.moss.2': line('Moss', 'Bess hit', 'That one hurt her feelings.'),
  'story.ember.moss.3': line('Moss', 'Bess resting', 'She needs a minute. Hold on.'),
  'story.ember.auntie-solder.6': line('Auntie Solder', 'Job 4 won', 'Listen to that. That\'s a forge. That is a forge, you lovely thing.'),
  'story.ember.cinder.11': line('Cinder', 'Job 5 start', 'Old Smoke keeps the well key in the old mall. Leave the car outside. Too loud.'),
  'story.ember.cinder.12': line('Cinder', 'Inside the mall', 'Stay out of their lamps. If they see you, run. Nobody\'s cross with you for running.'),
  'story.ember.cinder.13': line('Cinder', 'Key taken', 'Got it? You\'ll walk slow with that. Mind the way back.'),
  'story.ember.cinder.14': line('Cinder', 'Alarm', 'They\'ve seen you! Run for the car!'),
  'story.ember.old-smoke.1': line('Old Smoke', 'Job 5 won', 'Little driver. You took my key. Come and give it back, up at the well.'),
  'story.ember.cinder.15': line('Cinder', 'Job 6 start', 'Hold them off while I work the valve. Three lots, I\'d guess.'),
  'story.ember.cinder.16': line('Cinder', 'Waves over', 'Valve\'s free. Hang on, what\'s that noise?'),
  'story.ember.old-smoke.2': line('Old Smoke', 'Old Smoke appears', 'Fire is mine. Everything goes grey in the end.'),
  'story.ember.cinder.17': line('Cinder', 'Chase starts', 'He\'s running! When a vent glows, hit it!'),
  'story.ember.cinder.18': line('Cinder', 'First vent', 'One down. Stay on him!'),
  'story.ember.old-smoke.3': line('Old Smoke', 'Second vent', 'My beautiful furnace! Stop that!'),
  'story.ember.cinder.19': line('Cinder', 'Third vent', 'That\'s it! Get clear! GET CLEAR!'),
  'story.ember.cinder.20': line('Cinder', 'Job 6 won', 'Well, look at that. A hundred years old and still showing off.'),
  'story.ember.cinder.21': line('Cinder', 'Job 6 won', 'I\'m with you now, if you\'ll have me. Nobody else lets me bring the pot.'),
  'story.ember.hollis.1': line('Hollis', 'Job 6 won', 'I can see that fire from the gate. Good work, driver. The boiler has its parts.'),
});

export const EMBER_LINE_IDS = Object.freeze([...Object.keys(EMBER_CAPTIONS), EMBER_NOTE_ID]);

registerStoryLines('ember', {captions: EMBER_CAPTIONS, letter: EMBER_NOTE});
