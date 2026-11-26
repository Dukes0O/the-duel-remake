// The one way of changing something in the open Scablands (docs/story/open-scablands.md, section 12).
// `applyEffects(world, {id, effects})` takes a choice and returns a new world and the changes made. The world given
// is never changed. The ledger's own effects go to the ledger as they always have (src/story/ledger.js). The open
// land adds these:
//
//   {type: 'find', site: 'glasshouse'}                   the site joins the map for good
//   {type: 'site', id: 'glasshouse', stage: 'burned'}    a site changes
//   {type: 'favour', person: 'glasshouse', by: 1}        a favour owed by a people, or spent; two at most
//   {type: 'scrap', by: -6}                              the player's scrap; never below nothing
//   {type: 'thread', id: 'burned-camp', to: 'clues'}     a storyline moves to a beat; `end` closes it; `cast` is kept
//   {type: 'town', post: 'ransom', scrap: 150}           a posting to the town; written down and nothing more yet
//   {type: 'feud', of: 'road-rats', by: 1}               a group's feud; without `of` it is the Ash Men's, as before
//   {type: 'promise', ..., dueNights: 3}                 the ledger's promise, due that many nights from tonight
// and three that keep count of things and are not written in the journal, because nothing is caused by them:
//   {type: 'ground', square: 311}                        a square of ground is driven over
//   {type: 'crossing', checkpoint: 'mall-road-2'}        a checkpoint is crossed once more
//   {type: 'rest', checkpoint: 'mall-road-2'}            a checkpoint rests; {type: 'rest', clear: true} wakes them all
//   {type: 'dirt', by: .02}  or  {type: 'dirt', to: 0}   dirt on the car, from 0 clean to 1 caked
//
// A CHOICE IS APPLIED ONCE A NIGHT. The same id on the same night changes nothing more, so that a talk that is shown
// twice cannot pay twice. A choice that may truly happen again the same night (a second repair, a second fight won)
// carries its own count in its id: 'forge-shed/repair/3'. The counting effects above ignore this rule: they are
// applied every time. So a choice that mixes the two is half applied when it is repeated: a wash sent twice under one
// id charges once and cleans twice. Give a repeatable choice its count.
// The counting effects are cheap but not free: send dirt once a second or once a square, never on every tick.
//
// WHAT COMES BACK. `changes` lists what changed: {type, key, before, after, choiceId, night}. A scrap change that
// could not be paid in full carries `owed`. An effect that changed nothing is left out.
import {applyChoice} from '../../story/ledger.js';
import {FEUD_WORDS, FRIEND_WORDS, OLD_FEUD_GROUP, SITE_STAGES, STOCKS, isPeople, isSite, keepsFeud, nameRow} from './register.js';
import {GROUND_COLUMNS, GROUND_ROWS, MOST_FAVOURS, favoursOf, feudOf, stageOf} from './open-record.js';
import {checkRole, isRole} from './roles.js';

export const LEDGER_EFFECTS = Object.freeze(['stock', 'word', 'feud', 'roadWord', 'mark', 'made', 'debt', 'promise',
  'settle', 'met', 'tell', 'read', 'shareHearth']);
export const OPEN_EFFECTS = Object.freeze(['find', 'site', 'favour', 'scrap', 'thread', 'town', 'ground', 'crossing',
  'rest', 'dirt']);
const COUNTING = Object.freeze(['ground', 'crossing', 'rest', 'dirt']);
const SQUARES = GROUND_COLUMNS * GROUND_ROWS;
const LONGEST_SENTENCE = 259;
const clip = (n, low, high) => Math.max(low, Math.min(high, n));
const storyId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9/-]*$/.test(value);
const isOpenEffect = effect => OPEN_EFFECTS.includes(effect.type) ||
  (effect.type === 'feud' && effect.of !== undefined && effect.of !== OLD_FEUD_GROUP);

// One open effect, applied to private copies. Returns what changed, or null when nothing did.
function applyOpen(world, effect) {
  const {open} = world;
  const whole = value => { if (!Number.isSafeInteger(value)) throw new TypeError('The effect "' + effect.type + '" changes by a whole number.'); };
  switch (effect.type) {
    case 'find': {
      if (!isSite(effect.site)) throw new TypeError('Unknown site: ' + effect.site);
      if (open.found.includes(effect.site)) return null;
      open.found.push(effect.site);
      return {key: effect.site};
    }
    case 'site': {
      if (!isSite(effect.id)) throw new TypeError('Unknown site: ' + effect.id);
      if (!SITE_STAGES.includes(effect.stage)) throw new TypeError('Unknown stage: ' + effect.stage);
      const before = stageOf(world, effect.id);
      if (before === effect.stage) return null;
      open.stages[effect.id] = effect.stage;
      return {key: effect.id, before, after: effect.stage};
    }
    case 'favour': {
      if (!isPeople(effect.person)) throw new TypeError('A favour is owed by a people, and this is not one: ' + effect.person);
      whole(effect.by);
      const before = favoursOf(world, effect.person), after = clip(before + effect.by, 0, MOST_FAVOURS);
      if (before === after) return null;
      open.favours[effect.person] = after;
      return {key: effect.person, before, after};
    }
    case 'scrap': {
      whole(effect.by);
      const before = world.scrap, after = Math.max(0, before + effect.by);
      // A price the player could not pay in full leaves the rest owed, for the rule that asked to see.
      const owed = Math.max(0, -(before + effect.by));
      if (before === after && !owed) return null;
      world.scrap = after;
      return {key: 'scrap', before, after, ...(owed ? {owed} : {})};
    }
    case 'thread': {
      if (!storyId(effect.id)) throw new TypeError('A thread effect needs the storyline\'s id.');
      const before = open.threads[effect.id] ?? null;
      const after = {beat: effect.to ?? before?.beat ?? null, began: before?.began ?? world.ledger.night,
        cast: structuredClone(effect.cast ?? before?.cast ?? {}), end: effect.end ?? before?.end ?? null};
      if (before && before.beat === after.beat && before.end === after.end && effect.cast === undefined) return null;
      open.threads[effect.id] = after;
      return {key: effect.id, before: before && {beat: before.beat, end: before.end}, after: {beat: after.beat, end: after.end}};
    }
    case 'town': {
      const {type, ...posting} = effect;
      if (typeof posting.post !== 'string') throw new TypeError('A town effect needs "post".');
      return {key: posting.post, posting: structuredClone(posting)};
    }
    case 'feud': {
      if (!keepsFeud(effect.of)) throw new TypeError(effect.of + ' is not a group that keeps a feud.');
      whole(effect.by);
      const before = feudOf(world, effect.of);
      const after = FEUD_WORDS[clip(FEUD_WORDS.indexOf(before) + effect.by, 0, FEUD_WORDS.length - 1)];
      if (before === after) return null;
      open.feuds[effect.of] = after;
      return {key: effect.of, before, after};
    }
    case 'ground': {
      if (!Number.isSafeInteger(effect.square) || effect.square < 0 || effect.square >= SQUARES) throw new TypeError('Unknown square of ground.');
      if (open.driven.includes(effect.square)) return null;
      open.driven = [...open.driven, effect.square];
      return {key: effect.square};
    }
    case 'crossing': {
      if (!storyId(effect.checkpoint)) throw new TypeError('A crossing needs its checkpoint.');
      const before = open.crossings[effect.checkpoint] ?? 0;
      open.crossings = {...open.crossings, [effect.checkpoint]: before + 1};
      return {key: effect.checkpoint, before, after: before + 1};
    }
    case 'rest': {
      if (effect.clear === true) {
        if (!open.resting.length) return null;
        const before = open.resting;
        open.resting = [];
        return {key: 'all', before, after: []};
      }
      if (!storyId(effect.checkpoint)) throw new TypeError('A rest needs its checkpoint, or "clear".');
      if (open.resting.includes(effect.checkpoint)) return null;
      open.resting = [...open.resting, effect.checkpoint];
      return {key: effect.checkpoint};
    }
    case 'dirt': {
      const before = open.car.dirt;
      if (!Number.isFinite(effect.to ?? effect.by)) throw new TypeError('Dirt changes "by" a number or goes "to" one.');
      const after = clip(effect.to ?? before + effect.by, 0, 1);
      if (before === after) return null;
      open.car = {...open.car, dirt: after};
      return {key: 'dirt', before, after};
    }
    default: throw new TypeError('Unknown open effect: ' + effect.type);
  }
}

export function applyEffects(world, {id: choiceId, effects}) {
  if (!storyId(choiceId)) throw new TypeError('Invalid choice id.');
  const night = world.ledger.night;
  const seen = change => change.choiceId === choiceId && change.night === night;
  const again = world.ledger.history.some(seen) || world.open.journal.some(seen);
  const due = again ? effects.filter(effect => COUNTING.includes(effect.type)) : effects;
  if (!due.length) return {world, changes: []};
  const forLedger = due.filter(effect => !isOpenEffect(effect)).map(effect => {
    // The Ash Men's feud is the ledger's own, whether or not the effect names them.
    if (effect.type === 'feud') { const {of, ...plain} = effect; return plain; }
    // A promise may say how many nights from tonight it falls due.
    if (effect.type === 'promise' && effect.due === undefined && effect.dueNights !== undefined) {
      const {dueNights, ...plain} = effect;
      return {...plain, due: night + dueNights};
    }
    return effect;
  });
  const told = applyChoice(world.ledger, {id: choiceId, effects: forLedger});
  // The counting effects replace only the field they touch, so a choice of nothing else shares the rest of the record.
  const next = {...world, ledger: told.ledger,
    open: due.every(effect => COUNTING.includes(effect.type)) ? {...world.open} : structuredClone(world.open)};
  const changes = [...told.changes];
  for (const effect of due.filter(isOpenEffect)) {
    const fact = applyOpen(next, effect);
    if (!fact) continue;
    const change = {type: effect.type, ...fact, choiceId, night};
    if (!COUNTING.includes(effect.type)) next.open.journal.push(change);
    changes.push(change);
  }
  return changes.length ? {world: next, changes} : {world, changes};
}

// What is wrong with an effect as written, as sentences; an empty list when nothing is. `roles` are the role names
// (as {role: what it is cast from}) when the effect is a storyline's, and null anywhere else.
export function checkEffect(effect, {roles = null} = {}) {
  if (!effect || typeof effect !== 'object') return ['An effect must be an object.'];
  const wrong = [];
  const say = text => { wrong.push(text); };
  const whole = (key, what) => { if (!Number.isSafeInteger(effect[key])) say('The effect "' + effect.type + '" needs "' + key + '": ' + what + '.'); };
  const named = (key, isKnown, what, want = 'name') => {
    if (isRole(effect[key])) wrong.push(...checkRole(effect[key], roles, want));
    else if (!isKnown(effect[key])) say('"' + effect[key] + '" is not ' + what + '.');
  };
  const sentence = () => {
    if (typeof effect.text !== 'string' || !effect.text.trim()) say('The effect "' + effect.type + '" needs its sentence in "text".');
    else if (effect.text.length > LONGEST_SENTENCE) say('The sentence of the effect "' + effect.type + '" is longer than ' + LONGEST_SENTENCE + ' letters.');
  };
  switch (effect.type) {
    case 'find': named('site', isSite, 'a site in the register', 'site'); break;
    case 'site':
      named('id', isSite, 'a site in the register', 'site');
      if (!SITE_STAGES.includes(effect.stage)) say('"' + effect.stage + '" is not a stage a site can have.');
      break;
    case 'favour': named('person', isPeople, 'a people in the register (a favour is owed by a people, not a person)'); whole('by', 'how many'); break;
    case 'scrap': whole('by', 'how much'); break;
    case 'thread':
      if (!storyId(effect.id)) say('The effect "thread" needs the storyline\'s "id".');
      if (effect.to === undefined && effect.end === undefined) say('The effect "thread" needs "to" (a beat) or "end".');
      break;
    case 'town': if (typeof effect.post !== 'string') say('The effect "town" needs "post".'); break;
    case 'ground': whole('square', 'which square'); break;
    case 'crossing': if (!storyId(effect.checkpoint)) say('The effect "crossing" needs "checkpoint".'); break;
    case 'rest': if (effect.clear !== true && !storyId(effect.checkpoint)) say('The effect "rest" needs "checkpoint", or "clear: true".'); break;
    case 'dirt': if (!Number.isFinite(effect.to ?? effect.by)) say('The effect "dirt" needs "by" or "to", a number.'); break;
    case 'feud':
      if (effect.of !== undefined) named('of', keepsFeud, 'a group that keeps a feud');
      whole('by', 'how many steps');
      break;
    case 'stock':
      if (!STOCKS.includes(effect.stock)) say('"' + effect.stock + '" is not a stock the ledger keeps.');
      whole('by', 'how many');
      break;
    case 'word':
      named('person', nameRow, 'in the register');
      if (effect.set === undefined) whole('by', 'how many words up or down, or "set"');
      else if (!FRIEND_WORDS.includes(effect.set)) say('"' + effect.set + '" is not one of the five words.');
      break;
    case 'roadWord': whole('by', 'how many'); break;
    case 'mark': case 'made': case 'settle':
      if (!storyId(effect.id)) say('The effect "' + effect.type + '" needs an "id" in small letters, digits, "/" and "-".');
      break;
    case 'debt': case 'promise':
      if (!storyId(effect.id)) say('The effect "' + effect.type + '" needs an "id".');
      named('person', nameRow, 'in the register');
      sentence();
      if (effect.type === 'promise' && !(Number.isSafeInteger(effect.due ?? effect.dueNights) && (effect.due ?? effect.dueNights) >= 0))
        say('A promise needs "due" (a night) or "dueNights" (nights from tonight, nought or more).');
      break;
    case 'met': named('person', nameRow, 'in the register'); sentence(); break;
    case 'tell': case 'read': case 'shareHearth': break;
    default: say('"' + effect.type + '" is not an effect the ledger or the open land knows.');
  }
  return wrong;
}
