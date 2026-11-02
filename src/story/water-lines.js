// The Water Road's words (docs/story/wasteland-water-road.md section 5). Every
// spoken line is a caption with the radio click, like Kogane: no voice file and
// no new sound cue. Hollis's first note and V.'s notes are read on the Story
// card and never spoken, so they are not captions. Words only: nothing here
// changes a race, a fight or a save.
import {registerStoryLines} from './story-lines.js';

const line = (who, where, text) => Object.freeze({who, where, text, captionOnly: true});
const note = (id, who, where, text) => Object.freeze({id, who, where, spoken: false, text});

// Hollis's note: the Story card's letter (chapter 0).
export const WATER_LETTER_ID = 'story.water.hollis.note';
export const WATER_LETTER = note(WATER_LETTER_ID, 'Hollis (a note, never spoken)', 'The Story card, first thing',
  'Driver, the well is dry. The old water road runs from here to the Cistern, and eight warlords have cut it into pieces. ' +
  'Win it back stretch by stretch and this camp drinks again. Start with Sal. She sawed straight through our pipe. Hollis');

// V.'s notes, one after each of chapters 1 to 7, in order (WATER_NOTES[0] follows chapter 1).
export const WATER_NOTES = Object.freeze([
  note('story.water.v.1', 'V. (a note)', 'After chapter 1',
    'Nice driving. The Dustmonger guards the fuel your pump needs. He hides in his own dust, so stay close behind him. V.'),
  note('story.water.v.2', 'V. (a note)', 'After chapter 2',
    'Mirage paid a thief to steal your valve. The thief carries the glowing mark. Catch them and the valve is yours. V.'),
  note('story.water.v.3', 'V. (a note)', 'After chapter 3',
    'Gunn is sending raiders to wreck your pump while Odessa fits it. Hold them off. V.'),
  note('story.water.v.4', 'V. (a note)', 'After chapter 4',
    'Kettle Kingpin sits on a boiler that makes dirty water clean. Win it in his dome. V.'),
  note('story.water.v.5', 'V. (a note)', 'After chapter 5',
    'The Vultures stole your water truck. Two of them, one of you. Watch both mirrors. V.'),
  note('story.water.v.6', 'V. (a note)', 'After chapter 6',
    'The Tollkeeper\'s tanker is full of your water. Break its three red valves, then plant the charge. V.'),
  note('story.water.v.7', 'V. (a note)', 'After chapter 7',
    'Only my father is left. He uses every warlord\'s trick. You have beaten them all, so you know them all. V.'),
]);

// The spoken lines. `story.water.job.<warlord>` plays as that chapter's story job starts.
export const WATER_CAPTIONS = Object.freeze({
  'story.water.job.sal': line('Hollis', 'Chapter 1 job starts',
    'Sal\'s crew is on the pipe road. Show them whose road it is.'),
  'story.water.job.dustmonger': line('Hollis', 'Chapter 2 job starts',
    'The pump needs fuel. Bring the cans home before they do.'),
  'story.water.job.mirage': line('Hollis', 'Chapter 3 job starts',
    'Somebody out there has our valve. Find the marked car.'),
  'story.water.job.gunn': line('Odessa', 'Chapter 4 job starts',
    'Hold them off for five waves and this pump will run forever.'),
  'story.water.job.kettle': line('Hollis', 'Chapter 5 job starts',
    'Last car rolling takes the boiler. Make it you.'),
  'story.water.job.vultures': line('Hollis', 'Chapter 6 job starts',
    'That truck is ours. Bring it home.'),
  'story.water.job.tollkeeper': line('Hollis', 'Chapter 7 job starts',
    'Break the valves, plant the charge, and the water is ours.'),
  'story.water.vesper.8': line('Vesper', 'After the Baron falls',
    'It was me all along. Vesper. The Cistern is open and the water is yours. I\'m done with my father\'s road. Can I ride with you?'),
  'story.water.hollis.end': line('Hollis', 'The next yard visit after the Baron',
    'Listen to that. Water in the pipes. Thank you, driver.'),
  'story.water.hollis.9': line('Hollis', 'Straight after the end line',
    'Dust on the horizon. Somebody heard the water is flowing. A new warlord is coming.'),
  'story.water.magnus.beaten': line('Magnus', 'After Magnus falls',
    'You broke my magnet! Fine, keep your water. I\'ll build a bigger one.'),
  'story.water.hollis.10': line('Hollis', 'Straight after Magnus',
    'Magnus is back in his scrapyard, sulking. He\'ll want a rematch. The water keeps flowing.'),
});

// The caption that plays as a chapter's job starts, by warlord id.
export const waterJobCaption = warlordId => Object.hasOwn(WATER_CAPTIONS, `story.water.job.${warlordId}`)
  ? `story.water.job.${warlordId}` : null;

// Hollis's two lines on the yard visit after the Baron, one after the other.
export const WATER_END_SEQUENCE = Object.freeze(['story.water.hollis.end', 'story.water.hollis.9']);
// After a warlord's first defeat, by warlord id: Magnus's last words, then Hollis (the Baron's is Vesper's own line).
export const WATER_WON_SEQUENCES = Object.freeze({magnus: Object.freeze(['story.water.magnus.beaten', 'story.water.hollis.10'])});

// Every id the story owns: the captions, the letter and the notes.
export const WATER_LINE_IDS = Object.freeze([...Object.keys(WATER_CAPTIONS), WATER_LETTER_ID, ...WATER_NOTES.map(item => item.id)]);

registerStoryLines('water', {captions: WATER_CAPTIONS, letter: WATER_LETTER, sequences: {end: WATER_END_SEQUENCE,
  ...Object.fromEntries(Object.entries(WATER_WON_SEQUENCES).map(([id, ids]) => [`won-${id}`, ids]))}});
