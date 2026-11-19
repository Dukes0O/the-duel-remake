// The ledger is optional even in a profile which already has other stories.
import {applyChoice, bankHearth, createLedger} from './ledger.js';
import {replayTelling} from './ledger-replay.js';
import {registerStory, writeStory} from './story-save.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = n => Number.isSafeInteger(n) && n >= 0;
const unavailable = 'This ledger cannot be read by this version of the game.';

function readable(entry) {
  return entry?.version === 1 && count(entry.seed) && entry.seed <= 0xffffffff &&
    count(entry.night) && entry.night > 0 && count(entry.stocks?.embers) && count(entry.stocks?.gas) &&
    object(entry.words) && object(entry.encounters) && typeof entry.feud === 'string' && count(entry.roadWord) &&
    (entry.extraHeatFrom === null || count(entry.extraHeatFrom)) &&
    Array.isArray(entry.marks) && Array.isArray(entry.made) && Array.isArray(entry.obligations) &&
    entry.obligations.every(object) && Array.isArray(entry.history) && entry.history.every(object);
}

// Apply against the current profile. A replayed bank request for the previous
// night cannot move time a second time.
function update(entry, night, operation) {
  if (!readable(entry)) return unavailable;
  if (entry.night !== night) return 'That night has already changed.';
  const {ledger} = operation(entry);
  return ledger === entry ? null : ledger;
}

registerStory({
  key: 'ledger',
  steps: ['begin', 'keeping'],
  stepOf: entry => readable(entry) ? 'keeping' : 'begin',
  writers: {
    begin: (entry, opening) => {
      if (readable(entry)) return null;
      if (Object.keys(entry).length) return unavailable;
      return {version: 1, ...createLedger(opening)};
    },
    choose: (entry, night, choice) => update(entry, night, ledger => applyChoice(ledger, choice)),
    bank: (entry, night) => update(entry, night, bankHearth),
    replay: (entry, night, played, expected) => {
      if (!readable(entry) || JSON.stringify(entry) !== expected) return 'The saved telling has changed. Play the night again to compare it.';
      return replayTelling(entry, played, night)?.ledger ?? 'Finish the night before keeping it.';
    },
  },
});

// Inspect the original container before writeStory normalizes it for reading.
// An unrecognized value may hold data from another build.
function writeLedger(profile, writer, ...args) {
  if (Object.hasOwn(profile ?? {}, 'story')) {
    const story = profile.story;
    if (!object(story) || story.version !== 1 || (Object.hasOwn(story, 'ledger') && !readable(story.ledger))) {
      return {ok: false, changed: false, profile, reason: unavailable};
    }
  }
  return writeStory(profile, 'ledger', writer, ...args);
}

export const beginLedger = (profile, opening) => writeLedger(profile, 'begin', opening);
export const recordLedgerChoice = (profile, night, choice) => writeLedger(profile, 'choose', night, choice);
export const bankLedgerHearth = (profile, night) => writeLedger(profile, 'bank', night);
export const replaceLedgerNight = (profile, night, played, expected) => writeLedger(profile, 'replay', night, played, expected);
export function savedLedger(profile) {
  if (profile?.story?.version !== 1) return null;
  const entry = profile.story.ledger;
  return readable(entry) ? entry : null;
}
