// Five Cold Nights, sections 2 and 7. These rules return new data. Only the
// stock preview and the page projection are handed to a view.
import {makeRng} from '../rng.js';
import {FEUD_WORDS, STORY_PEOPLE} from './people.js';

export const FRIEND_WORDS = Object.freeze(['Cold', 'Wary', 'Strangers', 'Friendly', 'Sworn']);
export {FEUD_WORDS};
const stocks = ['embers', 'gas'];
const readableFacts = ['stock', 'word', 'met', 'mark', 'made', 'debt', 'promise', 'settle', 'feud', 'roadWord', 'shareHearth'];
const clip = (n, low, high) => Math.max(low, Math.min(high, n));

function requireValue(ok, message) {
  if (!ok) throw new TypeError(message);
}

function integer(n, low = Number.MIN_SAFE_INTEGER, high = Number.MAX_SAFE_INTEGER) {
  requireValue(Number.isSafeInteger(n) && n >= low && n <= high, 'Invalid ledger count.');
  return n;
}

function id(value) {
  requireValue(typeof value === 'string' && /^[a-z0-9][a-z0-9/-]*$/.test(value), 'Invalid story ID.');
  return value;
}

function person(key) {
  requireValue(Object.hasOwn(STORY_PEOPLE, key), 'Unknown person.');
  return key;
}

function sentence(text) {
  requireValue(typeof text === 'string' && text.trim() && text.length < 260, 'Invalid ledger sentence.');
  return text;
}

export function createLedger({seed, night = 1, embers = 0, gas = 0}) {
  return {
    seed: integer(seed, 0, 0xffffffff), night: integer(night, 1),
    stocks: {embers: integer(embers, 0), gas: integer(gas, 0)},
    words: {}, feud: FEUD_WORDS[0], roadWord: 0, marks: [], made: [],
    obligations: [], encounters: {}, extraHeatFrom: null, history: [],
  };
}

// The last change to this particular fact. A scene can keep its index when it
// needs to tell someone about it later, even if the same fact changes again.
export function causeOf(ledger, type, key = type) {
  const index = ledger.history.findLastIndex(change => change.type === type && change.key === key);
  if (index < 0) return null;
  const {choiceId, night} = ledger.history[index];
  return {index, choiceId, night};
}

// Persist a tell's cause without depending on its position in a replaceable night.
export function ledgerCause(history, index) {
  const change = history[index];
  if (!change) return null;
  const {night, choiceId, type, key} = change;
  const occurrence = history.slice(0, index).filter(item =>
    item.night === night && item.choiceId === choiceId && item.type === type && item.key === key).length;
  return {night, choiceId, type, key, occurrence};
}

export function sameLedgerCause(a, b) {
  return a && b && a.night === b.night && a.choiceId === b.choiceId && a.type === b.type && a.key === b.key &&
    a.occurrence === b.occurrence;
}

export function recordedTellCause(ledger, change) {
  if (change.cause) return change.cause;
  if (Array.isArray(ledger.legacyTellCauses)) {
    const tell = ledgerCause(ledger.history, ledger.history.indexOf(change));
    const known = ledger.legacyTellCauses.find(item => sameLedgerCause(item?.tell, tell));
    if (known) return known.cause;
  }
  return ledgerCause(ledger.history, change.source);
}

function stockAfter(count, by) {
  return clip(count + integer(by), 0, Number.MAX_SAFE_INTEGER);
}

// A writer opts in to showing one plain stock. Only changes to that stock
// are evaluated, including a choice which keeps the current amount.
export function plainStockChange(ledger, choice) {
  const stock = choice.plainStock;
  if (!stocks.includes(stock)) return null;
  const before = ledger.stocks[stock];
  let after = before;
  for (const effect of choice.effects) {
    if (effect.type === 'stock' && effect.stock === stock) after = stockAfter(after, effect.by);
  }
  return {stock, before, after};
}

// Apply one authored effect to a private copy. The returned fact is journalled
// by applyChoice with the choice and night that caused it.
function applyEffect(ledger, e) {
  switch (e.type) {
    // A scene that branches on an earlier fact records the facts it used.
    // The replay can then identify dependent nights even if the scene only spoke.
    case 'read': {
      requireValue(readableFacts.includes(e.fact), 'Unknown ledger fact.');
      const key = ['roadWord', 'shareHearth', 'feud'].includes(e.fact) ? e.fact : id(e.key);
      return {key, fact: e.fact};
    }
    case 'stock': {
      requireValue(stocks.includes(e.stock), 'Unknown stock.');
      const before = ledger.stocks[e.stock];
      const after = ledger.stocks[e.stock] = stockAfter(before, e.by);
      return before === after ? null : {key: e.stock, before, after};
    }
    case 'word': {
      const key = person(e.person);
      const before = ledger.words[key] ?? null;
      const word = before ?? 'Strangers';
      const after = e.set ?? FRIEND_WORDS[clip(FRIEND_WORDS.indexOf(word) + integer(e.by), 0, FRIEND_WORDS.length - 1)];
      requireValue(FRIEND_WORDS.includes(after), 'Unknown word.');
      if (word === after) return null;
      ledger.words[key] = after;
      return {key, before, after, ...(e.set === undefined ? {relative: true} : {})};
    }
    case 'feud': {
      const before = ledger.feud;
      const after = ledger.feud = FEUD_WORDS[clip(FEUD_WORDS.indexOf(before) + integer(e.by), 0, FEUD_WORDS.length - 1)];
      return before === after ? null : {key: 'feud', before, after};
    }
    case 'roadWord': {
      const before = ledger.roadWord;
      const after = ledger.roadWord = clip(before + integer(e.by), 0, 5);
      return before === after ? null : {key: 'roadWord', before, after};
    }
    case 'mark':
    case 'made': {
      const key = id(e.id);
      const list = e.type === 'mark' ? ledger.marks : ledger.made;
      if (list.includes(key)) return null;
      list.push(key);
      return {key};
    }
    case 'debt':
    case 'promise': {
      const key = id(e.id);
      if (ledger.obligations.some(item => item.id === key)) return null;
      const obligation = {type: e.type, id: key, person: person(e.person), text: sentence(e.text)};
      obligation.owedBy = e.owedBy ?? (e.type === 'promise' ? 'player' : obligation.person);
      requireValue(['player', obligation.person].includes(obligation.owedBy), 'Unknown party to an obligation.');
      if (e.type === 'promise') obligation.due = integer(e.due, ledger.night);
      ledger.obligations.push(obligation);
      return {key, before: null, after: obligation};
    }
    case 'settle': {
      const key = id(e.id);
      const index = ledger.obligations.findIndex(item => item.id === key);
      if (index < 0) return null;
      const [before] = ledger.obligations.splice(index, 1);
      return {key, before, after: null};
    }
    case 'met': {
      const key = person(e.person);
      const text = sentence(e.text);
      const before = ledger.encounters[key] ?? null;
      if (before === text) return null;
      ledger.encounters[key] = text;
      return {key, before, after: text};
    }
    case 'tell': {
      // The writer supplies what someone actually said, and the line tying it
      // to the decision. No raw marks, effect names or choice IDs reach the page.
      const source = e.sourceMark === undefined ? integer(e.source, 0, ledger.history.length - 1) :
        ledger.history.findLastIndex(change => change.type === 'mark' && change.key === id(e.sourceMark));
      if (source < 0) return null;
      const cause = ledgerCause(ledger.history, source);
      if (ledger.history.some(change => change.type === 'tell' &&
        sameLedgerCause(recordedTellCause(ledger, change), cause))) return null;
      return {key: cause.key, source, cause, text: sentence(e.text),
        because: e.sourceMark !== undefined && e.because === undefined ? '' : sentence(e.because)};
    }
    case 'shareHearth': {
      if (ledger.extraHeatFrom !== null) return null;
      ledger.extraHeatFrom = ledger.night;
      return {key: 'shareHearth'};
    }
    default:
      throw new TypeError('Unknown ledger effect: ' + e.type);
  }
}

export function applyChoice(ledger, {id: choiceId, effects}) {
  id(choiceId);
  const night = ledger.night;
  if (ledger.history.some(change => change.choiceId === choiceId && change.night === night))
    return {ledger, changes: []};
  const next = structuredClone(ledger);
  const changes = [];
  for (const effect of effects) {
    const fact = applyEffect(next, effect);
    if (!fact) continue;
    const change = {type: effect.type, ...fact, choiceId, night};
    next.history.push(change);
    changes.push(change);
  }
  return {ledger: changes.length ? next : ledger, changes};
}

export function namedThrow(ledger, name, probability) {
  id(name);
  requireValue(Number.isFinite(probability) && probability >= 0 && probability <= 1, 'Invalid chance.');
  let hash = 2166136261 ^ ledger.seed;
  for (const ch of name) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return makeRng(hash).chance(probability);
}

// An extra ember every second night the Walkers live at the hearth.
export function extraHeatTonight(from, night) {
  return from !== null && (night - from) % 2 === 1;
}

export function bankHearth(ledger) {
  const night = ledger.night;
  const choiceId = 'bank/' + night;
  const needed = extraHeatTonight(ledger.extraHeatFrom, night) ? 2 : 1;
  const burned = Math.min(ledger.stocks.embers, needed);
  const next = structuredClone(ledger);
  const changes = [];
  if (burned) {
    const before = next.stocks.embers;
    next.stocks.embers -= burned;
    changes.push({type: 'stock', key: 'embers', before, after: next.stocks.embers, choiceId, night});
  }
  next.night = integer(night + 1, 1);
  changes.push({type: 'night', key: 'night', before: night, after: next.night, choiceId, night});
  next.history.push(...changes);
  const due = next.obligations.filter(item => item.type === 'promise' && item.due === night);
  return {ledger: next, changes, burned, needed, due};
}

export function ledgerPageData(ledger) {
  if (!ledger) return null;
  const {embers, gas} = ledger.stocks;
  const consequences = ledger.history.filter(change => change.type === 'tell');
  let nights = embers;
  // Until a scene reveals the change in the hearth, it cannot give away that
  // consequence through a shorter forecast on the wall.
  if (ledger.extraHeatFrom !== null && consequences.some(change => {
    const cause = recordedTellCause(ledger, change);
    return cause?.type === 'shareHearth' && cause.night === ledger.extraHeatFrom;
  })) {
    const pairs = Math.floor(embers / 3);
    nights = pairs * 2 + Number(embers % 3 >= (extraHeatTonight(ledger.extraHeatFrom, ledger.night) ? 2 : 1));
  }
  return {
    embers, gas, nights,
    obligations: ledger.obligations.map(item => item.text),
    people: Object.entries(ledger.encounters).map(([key, last]) => ({name: STORY_PEOPLE[key], last})),
    consequences: consequences.map(({text, because}) => ({text, because})),
    ...(Array.isArray(ledger.toldBeforeChange) && ledger.toldBeforeChange.length
      ? {toldBeforeChange: ledger.toldBeforeChange} : {}),
  };
}
