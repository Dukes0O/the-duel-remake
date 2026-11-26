// The one way of asking a question in the open Scablands (docs/story/open-scablands.md, section 12). Every condition
// in every table and storyline is one of these, and `isTrue` is the only function that reads them.
//
//   {fact: 'word', of: 'glasshouse', atLeast: 'Friendly'}    a people's or a person's word for the player
//   {fact: 'feud', of: 'road-rats', atLeast: 'Raiding'}      a group's feud; false for a group that keeps none
//   {fact: 'favour', of: 'glasshouse', atLeast: 1}           favours a people owes the player
//   {fact: 'found', site: 'glasshouse'}                      a site on the player's map
//   {fact: 'stage', site: 'glasshouse', is: 'camp'}          what a site has become
//   {fact: 'mark', id: 'glasshouse/pump-mended'}             something that was done
//   {fact: 'made', id: 'tower/west-fence'}                   something that stands
//   {fact: 'debt', person: 'dace'}                           that person owes the player (or `id` for one debt)
//   {fact: 'promise', id: 'glasshouse/seed'}                 a promise the player has made and not yet kept
//   {fact: 'stock', of: 'embers', atLeast: 2}
//   {fact: 'scrap', atLeast: 20}                             scrap the player carries
//   {fact: 'roadWord', atLeast: 2}                           the Word on the road, 0 to 5
//   {fact: 'night', atLeast: 3}                              the ledger's night: 2 on the second night
//   {fact: 'thread', id: 'burned-camp', at: 'home'}          where a storyline stands: a beat, 'any' (begun) or 'over'
//   {fact: 'town', has: 'well'}                              the town's sim, read only; false while there is none
//   {fact: 'draw', name: 'start', chance: .5}                a named draw from the seed: the same answer every time
//   {all: [...]}   {any: [...]}   {not: {...}}
//
// COMPARING. A word or a number is compared with `atLeast`, `atMost` or `is`. A word or a feud needs one of them. A
// count with none of them asks "more than none".
//
// THE SUBJECT. `isTrue(fact, world, subject)`. The subject is what the asker knows and the condition leaves out:
//   {site, of, person}   fill in a fact that does not say whose word or which site. A role's condition
//                        (`cast.camp.where`) is asked of each candidate in turn this way; `subjectFor` (roles.js)
//                        builds it. `of: null` says nobody lives there, and a word, a feud or a favour is false.
//   {draw}               goes in front of every draw's name: 'burned-camp/night-3' + '/' + 'start'. THE ASKER SUPPLIES
//                        IT. A draw answers the same every time it is asked under one name, so whoever asks again
//                        on another night, or at another crossing, must put the night or the count in the name.
//                        The storyline rule gives '<storyline id>/night-<n>'; a checkpoint gives its id and its
//                        count of crossings.
//
// ROLES. In a storyline, a name may be a role of its cast, written '@camp'. '@camp.people' is the people of the site
// cast as the camp, for a word or a favour. `resolveRoles` (roles.js) turns them into real ids before anything is
// asked; `isTrue` itself never sees a role.
import {namedThrow} from '../../story/ledger.js';
import {FEUD_WORDS, FRIEND_WORDS, STOCKS, SITE_STAGES, isPeople, isSite, keepsFeud, nameRow} from './register.js';
import {favoursOf, feudOf, isFound, stageOf, threadOf, wordOf} from './open-record.js';
import {checkRole, isRole} from './roles.js';

export const FACTS = Object.freeze(['word', 'feud', 'favour', 'found', 'stage', 'mark', 'made', 'debt', 'promise',
  'stock', 'scrap', 'roadWord', 'night', 'thread', 'town', 'draw']);

function compare(value, fact, order = null) {
  const rank = v => order ? order.indexOf(v) : v;
  if (value === null || value === undefined) return false;
  if (fact.is !== undefined) return value === fact.is;
  if (fact.atLeast !== undefined && rank(value) < rank(fact.atLeast)) return false;
  if (fact.atMost !== undefined && rank(value) > rank(fact.atMost)) return false;
  if (fact.atLeast === undefined && fact.atMost === undefined) return order ? true : value > 0;
  return true;
}

export function isTrue(fact, world, subject = {}) {
  if (!fact || typeof fact !== 'object') throw new TypeError('A condition must be an object.');
  if (fact.all) return fact.all.every(part => isTrue(part, world, subject));
  if (fact.any) return fact.any.some(part => isTrue(part, world, subject));
  if (fact.not) return !isTrue(fact.not, world, subject);
  const of = fact.of ?? subject.of, site = fact.site ?? subject.site;
  // null means the asker knows there is nobody (a site where nobody lives): the answer is no. Left out altogether,
  // it is a slip, and is refused aloud.
  if (of === null && ['word', 'feud', 'favour'].includes(fact.fact)) return false;
  const needs = (value, what) => {
    if (typeof value !== 'string') throw new TypeError('The fact "' + fact.fact + '" was asked without ' + what + '.');
    if (isRole(value)) throw new TypeError('The role ' + value + ' was not turned into a name before it was asked.');
    return value;
  };
  switch (fact.fact) {
    case 'word': return compare(wordOf(world, needs(of, 'whose word')), fact, FRIEND_WORDS);
    case 'feud': return compare(feudOf(world, needs(of, 'whose feud')), fact, FEUD_WORDS);
    case 'favour': return compare(favoursOf(world, needs(of, 'who owes it')), fact);
    case 'found': return isFound(world, needs(site, 'a site'));
    case 'stage': return stageOf(world, needs(site, 'a site')) === fact.is;
    case 'mark': return world.ledger.marks.includes(fact.id);
    case 'made': return world.ledger.made.includes(fact.id);
    case 'debt': return world.ledger.obligations.some(item => item.type === 'debt' && item.owedBy !== 'player' &&
      (fact.id ? item.id === fact.id : item.person === (fact.person ?? subject.person)));
    case 'promise': return world.ledger.obligations.some(item => item.type === 'promise' && item.id === fact.id);
    case 'stock': return compare(world.ledger.stocks[fact.of], fact);
    case 'scrap': return compare(world.scrap, fact);
    case 'roadWord': return compare(world.ledger.roadWord, fact);
    case 'night': return compare(world.ledger.night, fact);
    case 'thread': {
      const record = threadOf(world, fact.id);
      if (!record) return false;
      if (fact.at === 'any' || fact.at === undefined) return true;
      if (fact.at === 'over') return record.end !== null;
      return record.end === null && record.beat === fact.at;
    }
    case 'town': return world.town?.has?.includes(fact.has) === true;
    case 'draw': return namedThrow({seed: world.seed}, subject.draw ? subject.draw + '/' + fact.name : fact.name, fact.chance);
    default: throw new TypeError('Unknown fact: ' + fact.fact);
  }
}

// What is wrong with a condition as written, as sentences; an empty list when nothing is.
//   given   which of `site`, `of` and `person` the asker fills in, so that a role's condition may leave them out
//   roles   a storyline's cast as {role: what it is cast from}, when the condition is a storyline's; null anywhere else
export function checkFact(fact, {given = [], roles = null} = {}) {
  const wrong = [];
  const say = text => { wrong.push(text); };
  if (!fact || typeof fact !== 'object' || Array.isArray(fact)) return ['A condition must be an object.'];
  for (const joiner of ['all', 'any']) if (fact[joiner] !== undefined) {
    if (!Array.isArray(fact[joiner]) || !fact[joiner].length) return ['"' + joiner + '" needs a list of conditions.'];
    return fact[joiner].flatMap(part => checkFact(part, {given, roles}));
  }
  if (fact.not !== undefined) return checkFact(fact.not, {given, roles});
  if (!FACTS.includes(fact.fact)) return ['"' + fact.fact + '" is not a fact the open land can be asked.'];
  const has = key => fact[key] !== undefined || given.includes(key);
  const compared = ['atLeast', 'atMost', 'is'].some(key => fact[key] !== undefined);
  const word = (list, what) => {
    if (!compared) say('The fact "' + fact.fact + '" needs "atLeast", "atMost" or "is".');
    for (const key of ['atLeast', 'atMost', 'is']) if (fact[key] !== undefined && !list.includes(fact[key]))
      say('"' + fact[key] + '" is not ' + what + '.');
  };
  const count = () => {
    for (const key of ['atLeast', 'atMost', 'is']) if (fact[key] !== undefined && !Number.isFinite(fact[key]))
      say('The fact "' + fact.fact + '" compares numbers, and "' + fact[key] + '" is not one.');
  };
  // A name is in the register, or is a role of the storyline's cast.
  const named = (value, isKnown, what, want = 'name') => {
    if (isRole(value)) wrong.push(...checkRole(value, roles, want));
    else if (!isKnown(value)) say('"' + value + '" is not ' + what + '.');
  };
  const storyId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9/-]*$/.test(value);
  switch (fact.fact) {
    case 'word':
      if (!has('of')) say('The fact "word" needs "of": whose word.');
      else if (fact.of !== undefined) named(fact.of, nameRow, 'in the register');
      word(FRIEND_WORDS, 'one of the five words');
      break;
    case 'feud':
      if (!has('of')) say('The fact "feud" needs "of": whose feud.');
      else if (fact.of !== undefined) named(fact.of, keepsFeud, 'a group that keeps a feud');
      word(FEUD_WORDS, 'a feud word');
      break;
    case 'favour':
      if (!has('of')) say('The fact "favour" needs "of": the people who owe it.');
      else if (fact.of !== undefined) named(fact.of, isPeople, 'a people in the register (a favour is owed by a people, not a person)');
      count();
      break;
    case 'found': case 'stage':
      if (!has('site')) say('The fact "' + fact.fact + '" needs "site".');
      else if (fact.site !== undefined) named(fact.site, isSite, 'a site in the register', 'site');
      if (fact.fact === 'stage' && !SITE_STAGES.includes(fact.is)) say('The fact "stage" needs "is", one of: ' + SITE_STAGES.join(', ') + '.');
      break;
    case 'mark': case 'made': case 'promise':
      if (!storyId(fact.id)) say('The fact "' + fact.fact + '" needs an "id" in small letters, digits, "/" and "-".');
      break;
    case 'debt':
      if (fact.id === undefined && !has('person')) say('The fact "debt" needs "person" or "id".');
      if (fact.person !== undefined) named(fact.person, nameRow, 'in the register');
      break;
    case 'stock':
      if (!STOCKS.includes(fact.of)) say('"' + fact.of + '" is not a stock the ledger keeps.');
      count();
      break;
    case 'scrap': case 'roadWord': case 'night': count(); break;
    case 'thread':
      if (!storyId(fact.id)) say('The fact "thread" needs the storyline\'s "id".');
      break;
    case 'town':
      if (typeof fact.has !== 'string') say('The fact "town" needs "has".');
      break;
    case 'draw':
      if (!storyId(fact.name)) say('The fact "draw" needs a "name" in small letters, digits, "/" and "-".');
      if (!(fact.chance >= 0 && fact.chance <= 1)) say('The fact "draw" needs a "chance" from 0 to 1.');
      break;
  }
  return wrong;
}
