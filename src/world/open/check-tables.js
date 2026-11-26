// A check for every table of the open Scablands (docs/story/open-scablands.md, section 12) and for a storyline
// (section 18). Each check takes one row and returns sentences that name what is wrong; an empty list means the row
// is sound. Content is rows in tables, so these checks are what stands between a writer's slip and the game.
import {CAST_SOURCES, HOLD_SYSTEMS, PARTS_OF_DAY, ROUTINE_KINDS, SIGN_KINDS, SITE_KINDS, THREAD_KINDS,
  isGroup, isPlace, isSite, nameRow, siteRow} from './register.js';
import {FACTS, checkFact} from './facts.js';
import {LEDGER_EFFECTS, OPEN_EFFECTS, checkEffect} from './open-effects.js';
import {ROLE_WORDS} from './roles.js';

const storyId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9/-]*$/.test(value);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = value => Number.isFinite(value);
const pair = value => Array.isArray(value) && value.length === 2 && value.every(number);
const somewhere = id => isPlace(id) || isSite(id);
const prefixed = (id, list) => list.map(text => id + ': ' + text);

// A line a player reads: a whole plain sentence with no em dash (Kyle, 19 November 2026).
export function checkSentence(text) {
  if (typeof text !== 'string' || !text.trim()) return ['A line is missing.'];
  const wrong = [];
  if (text.includes('—')) wrong.push('The line "' + text.slice(0, 40) + '..." has an em dash.');
  if (!/[.!?]["')\]*]*$/.test(text.trim())) wrong.push('The line "' + text.slice(0, 40) + '..." does not end as a sentence.');
  return wrong;
}

// A position written by name: ['tin-town', 14, -6] is 14 m east and 6 m south of Tin Town; ['forge-shed', 'bench']
// is a named spot of a building or a site.
function checkAt(at) {
  if (!Array.isArray(at) || typeof at[0] !== 'string') return ['A position is written as [name, east, south] or [name, spot].'];
  if (at.length === 2 && typeof at[1] === 'string') return [];
  if (at.length === 3 && number(at[1]) && number(at[2])) return somewhere(at[0]) ? [] : ['"' + at[0] + '" is not a place or a site.'];
  return ['A position is written as [name, east, south] or [name, spot].'];
}

export function checkPerson(row) {
  if (!isObject(row) || !storyId(row.id)) return ['A person needs an id.'];
  const wrong = [];
  if (!nameRow(row.id)) wrong.push('"' + row.id + '" is not in the register.');
  if (typeof row.figure !== 'string') wrong.push('A person needs a figure.');
  if (!somewhere(row.home)) wrong.push('The home "' + row.home + '" is not a place or a site.');
  if (!isObject(row.routine) || !isObject(row.routine.day)) wrong.push('A person needs a routine for the day at least.');
  for (const [part, routine] of Object.entries(row.routine ?? {})) {
    if (!PARTS_OF_DAY.includes(part)) { wrong.push('"' + part + '" is not a part of the day.'); continue; }
    if (!ROUTINE_KINDS.includes(routine?.kind)) { wrong.push('The ' + part + ' routine needs a kind: track, wander or post.'); continue; }
    if (routine.kind === 'track') {
      if (!Array.isArray(routine.stops) || !routine.stops.length) wrong.push('A track needs stops.');
      for (const stop of routine.stops ?? []) {
        wrong.push(...checkAt(stop.at));
        if (!(stop.seconds >= 0)) wrong.push('A stop needs seconds, nought or more.');
      }
    } else if (routine.kind === 'wander') {
      wrong.push(...checkAt(routine.around));
      if (!(routine.radius > 0)) wrong.push('A wander needs a radius.');
      if (!pair(routine.pause) || routine.pause[0] > routine.pause[1]) wrong.push('A wander needs a pause, [least, most] seconds.');
    } else wrong.push(...checkAt(routine.at));
  }
  return prefixed(row.id, wrong);
}

export function checkBuilding(row) {
  if (!isObject(row) || !storyId(row.id)) return ['A building needs an id.'];
  const wrong = [];
  if (!somewhere(row.place)) wrong.push('The place "' + row.place + '" is not a place or a site.');
  if (!pair(row.at)) wrong.push('A building needs "at": [east, south] from its place.');
  if (!isObject(row.door) || !(row.door.width > 0)) wrong.push('A building needs a door with a width.');
  if (!isObject(row.room) || !isObject(row.room.spots)) wrong.push('A building needs a room with named spots.');
  for (const [spot, at] of Object.entries(row.room?.spots ?? {})) if (!pair(at)) wrong.push('The spot "' + spot + '" needs [east, south].');
  for (const service of row.services ?? []) {
    if (!storyId(service.id)) wrong.push('A service needs an id.');
    if (!nameRow(service.by)) wrong.push('The service "' + service.id + '" is given by "' + service.by + '", who is not in the register.');
    if (service.needs) wrong.push(...checkFact(service.needs));
  }
  for (const find of row.finds ?? []) {
    if (!storyId(find.id)) wrong.push('A find needs an id.');
    if (find.needs) wrong.push(...checkFact(find.needs));
    for (const effect of find.gives ?? []) wrong.push(...checkEffect(effect));
  }
  return prefixed(row.id, wrong);
}

export function checkCheckpoint(row) {
  if (!isObject(row) || !storyId(row.id)) return ['A checkpoint needs an id.'];
  const wrong = [];
  const onRoad = isObject(row.at) && typeof row.at.road === 'string' && row.at.share >= 0 && row.at.share <= 1;
  if (!onRoad && checkAt(row.at).length) wrong.push('A checkpoint stands at {road, share} or at [name, east, south].');
  if (!(row.radius > 0)) wrong.push('A checkpoint needs a radius.');
  if (!(row.chance >= 0 && row.chance <= 1)) wrong.push('A checkpoint needs a chance from 0 to 1.');
  if (!pair(row.cars) || row.cars[0] < 1 || row.cars[0] > row.cars[1]) wrong.push('A checkpoint needs cars: [least, most].');
  if (!Array.isArray(row.who) || !row.who.length) wrong.push('A checkpoint needs somebody who may come.');
  for (const who of row.who ?? []) {
    if (!isGroup(who.group)) wrong.push('"' + who.group + '" is not a group in the register.');
    if (!(who.weight > 0)) wrong.push('The group "' + who.group + '" needs a weight.');
    if (who.needs) wrong.push(...checkFact(who.needs));
  }
  return prefixed(row.id, wrong);
}

export function checkSite(row) {
  if (!isObject(row) || !storyId(row.id)) return ['A site needs an id.'];
  const wrong = [], known = siteRow(row.id);
  if (!known) return [row.id + ': the site is not in the register.'];
  if (row.name !== known.name) wrong.push('The register calls it "' + known.name + '".');
  if (row.kind !== known.kind || !SITE_KINDS.includes(row.kind)) wrong.push('The register says its kind is ' + known.kind + '.');
  if ((row.people ?? null) !== known.people) wrong.push('The register says its people are ' + known.people + '.');
  if (!Array.isArray(row.where) || row.where.length < 1 || row.where.length > 3) wrong.push('A site lists one to three places it could stand.');
  for (const where of row.where ?? []) wrong.push(...checkAt(where.at));
  if (!(row.foundWithin > 0)) wrong.push('A site needs "foundWithin", in metres.');
  if (!storyId(row.tell)) wrong.push('A site needs a tell.');
  for (const need of row.needs ?? []) if (!storyId(need)) wrong.push('A need is named by its id.');
  for (const other of row.hostileTo ?? []) if (!nameRow(other)) wrong.push('"' + other + '" is not in the register.');
  return prefixed(row.id, wrong);
}

export function checkNeed(row) {
  if (!isObject(row) || !storyId(row.id)) return ['A need needs an id.'];
  const wrong = [...checkSentence(row.what)];
  if (row.kind === 'mend') {
    if (!(row.wrenchSeconds > 0)) wrong.push('A thing to mend needs "wrenchSeconds".');
    if (!(row.scrap >= 0)) wrong.push('A thing to mend needs its price in scrap, nought or more.');
  } else if (row.kind === 'supply') {
    if (!(row.dueNights > 0)) wrong.push('A thing to fetch needs "dueNights".');
  } else wrong.push('A need is a thing to "mend" or a thing to "supply".');
  if (!Array.isArray(row.gives) || !row.gives.length) wrong.push('A need gives something when it is met.');
  for (const effect of row.gives ?? []) wrong.push(...checkEffect(effect));
  return prefixed(row.id, wrong);
}

// A row of a person's talk table: {needs, scene}. The first row whose condition is true is the talk that a walk up
// to that person starts; a row with no `needs` always may.
export function checkTalkRow(row) {
  if (!isObject(row)) return ['A talk row must be an object.'];
  const wrong = [];
  if (typeof row.scene !== 'string' || !row.scene) wrong.push('A talk row needs "scene": the id of a talk scene.');
  if (row.needs !== undefined) wrong.push(...checkFact(row.needs));
  return wrong;
}

// Every object inside a storyline, with the keys that lead to it.
function* everyObject(value, path = []) {
  if (Array.isArray(value)) { for (const item of value) yield* everyObject(item, path); return; }
  if (!isObject(value)) return;
  yield [value, path];
  for (const [name, item] of Object.entries(value)) yield* everyObject(item, [...path, name]);
}
function* everyString(value) {
  if (typeof value === 'string') yield value;
  else if (Array.isArray(value)) for (const item of value) yield* everyString(item);
  else if (isObject(value)) for (const item of Object.values(value)) yield* everyString(item);
}
const EFFECT_LISTS = ['effects', 'gives'];
const ALL_EFFECTS = [...LEDGER_EFFECTS, ...OPEN_EFFECTS];
// Effects that move nothing another storyline could read, so `writes` need not list them.
const UNLISTED_EFFECTS = ['thread', 'read', 'met', 'tell', 'ground', 'crossing', 'rest', 'dirt'];
const THREAD_WORDS = ['any', 'over'];

// A storyline (section 18): {id, title, kind, reads, writes, cast, starts, sign, beats, ends, ignored}.
// - A name in a condition or an effect may be a role of the cast: '@camp', '@camp.people' (roles.js).
// - A condition inside `cast.<role>.where` is asked of each candidate, so it may leave out whose word or which site.
//   Every other condition says whose, by name or by role.
// - An effect is any object with a `type` the ledger or the open land knows, wherever it sits, and any object with
//   a `type` under `effects`, `gives` or `outcomes`, so that a misspelt effect there is named.
export function checkThread(thread) {
  if (!isObject(thread) || !storyId(thread.id)) return ['A storyline needs an id.'];
  const wrong = [], say = text => { wrong.push(text); };
  if (typeof thread.title !== 'string' || !thread.title.trim()) say('It needs a title.');
  if (!THREAD_KINDS.includes(thread.kind)) say('It needs a kind, one of: ' + THREAD_KINDS.join(', ') + '.');
  for (const [list, known, what] of [['reads', FACTS, 'fact'], ['writes', ALL_EFFECTS, 'effect']]) {
    if (!Array.isArray(thread[list])) { say('It needs the list "' + list + '".'); continue; }
    for (const name of thread[list]) if (!known.includes(name)) say('"' + name + '" in "' + list + '" is not a ' + what + '.');
  }
  if (!isObject(thread.cast)) say('It needs a cast, which may be empty.');
  const roles = Object.keys(thread.cast ?? {});
  const castFrom = Object.fromEntries(Object.entries(thread.cast ?? {}).map(([role, how]) => [role, how?.from]));
  for (const [role, how] of Object.entries(thread.cast ?? {})) {
    if (!CAST_SOURCES.includes(how?.from)) say('The role "' + role + '" is filled from one of: ' + CAST_SOURCES.join(', ') + '.');
    if (how?.otherwise !== undefined && !roles.includes(how.otherwise)) say('The role "' + role + '" falls back on "' + how.otherwise + '", which is not a role.');
    if (how?.draw !== undefined && !(how.chance >= 0 && how.chance <= 1)) say('The role "' + role + '" is drawn, and needs a chance from 0 to 1.');
  }
  if (!isObject(thread.starts)) say('It needs "starts": the condition for beginning.');
  if (!isObject(thread.sign) || !SIGN_KINDS.includes(thread.sign.kind)) say('It needs a sign of a kind the land has: ' + SIGN_KINDS.join(', ') + '.');
  const beats = Object.keys(isObject(thread.beats) ? thread.beats : {});
  if (!beats.length) say('It needs beats.');
  for (const word of THREAD_WORDS) if (beats.includes(word)) say('A beat cannot be called "' + word + '": the fact "thread" uses that word.');
  const ends = Array.isArray(thread.ends) ? thread.ends : [];
  if (!ends.length || !ends.every(storyId)) say('It needs "ends": its named outcomes.');
  if (thread.ignored === undefined) say('It needs "ignored": what happens when the sign is never followed.');
  // A place named in a sign or a beat is a role, a site or one of the eight places.
  const placed = (value, where) => {
    if (typeof value === 'string' && !roles.includes(value.replace(/^@/, '')) && !somewhere(value))
      say(where + ' names "' + value + '", which is not a role of the cast, a site or a place.');
  };
  placed(thread.sign?.at, 'The sign');
  for (const [beat, body] of Object.entries(isObject(thread.beats) ? thread.beats : {})) {
    if (!isObject(body)) { say('The beat "' + beat + '" is empty.'); continue; }
    if (typeof body.next === 'string' && !beats.includes(body.next) && !ends.includes(body.next))
      say('The beat "' + beat + '" leads to "' + body.next + '", which is neither a beat nor an end.');
    for (const system of body.holds ?? []) if (!HOLD_SYSTEMS.includes(system)) say('The beat "' + beat + '" holds "' + system + '", which is not a system.');
    if (isObject(body.when)) placed(body.when.reach, 'The beat "' + beat + '"');
  }
  // Every condition and every effect, wherever it sits.
  const used = {facts: new Set(), effects: new Set()};
  for (const [node, path] of everyObject(thread)) {
    const key = path[path.length - 1] ?? null;
    const isEffect = typeof node.type === 'string' &&
      (ALL_EFFECTS.includes(node.type) || EFFECT_LISTS.includes(key) || path.includes('outcomes'));
    if (isEffect) {
      used.effects.add(node.type);
      for (const text of checkEffect(node, {roles: castFrom})) say(text);
      if (node.type === 'thread') {
        if (node.id !== thread.id) say('It moves the storyline "' + node.id + '". A storyline moves only itself.');
        if (node.to !== undefined && !beats.includes(node.to)) say('A thread effect moves to "' + node.to + '", which is not a beat.');
        if (node.end !== undefined && !ends.includes(node.end)) say('A thread effect ends at "' + node.end + '", which is not one of the ends.');
      }
      if (node.type === 'mark' && storyId(node.id) && !node.id.startsWith(thread.id + '/') && !node.id.startsWith('rumour/'))
        say('The mark "' + node.id + '" should begin with "' + thread.id + '/", so that a reader knows who wrote it.');
      continue;
    }
    if (typeof node.fact === 'string') {
      used.facts.add(node.fact);
      const inRole = path[0] === 'cast' && path.includes('where');
      for (const text of checkFact(node, {given: inRole ? ['site', 'of', 'person'] : [], roles: castFrom})) say(text);
      if (node.fact === 'thread' && node.id !== thread.id)
        say('It reads where the storyline "' + node.id + '" stands. No storyline\'s file names another: read a mark it leaves.');
    }
  }
  for (const fact of used.facts) if (Array.isArray(thread.reads) && fact !== 'draw' && fact !== 'thread' && !thread.reads.includes(fact))
    say('It asks the fact "' + fact + '", which its "reads" does not list.');
  for (const effect of used.effects) if (Array.isArray(thread.writes) && !UNLISTED_EFFECTS.includes(effect) && !thread.writes.includes(effect))
    say('It makes the effect "' + effect + '", which its "writes" does not list.');
  // Lines: no em dash, and a role named in a line is a role of the cast, asked for a word it has.
  for (const text of everyString(thread)) {
    if (text.includes('—')) say('The line "' + text.slice(0, 40) + '..." has an em dash.');
    for (const [, role, word] of text.matchAll(/\{([a-z][a-zA-Z]*)\.([a-zA-Z]+)\}/g)) {
      if (!roles.includes(role)) say('A line names the role "' + role + '", which the cast does not have.');
      else if (!ROLE_WORDS.includes(word)) say('A line asks the role "' + role + '" for "' + word + '". A role has: ' + ROLE_WORDS.join(', ') + '.');
    }
  }
  return prefixed(thread.id, [...new Set(wrong)]);
}

// Checks a whole table and throws one error that lists every fault, for use where a table is loaded.
export function requireSound(rows, check, what) {
  const wrong = rows.flatMap(check);
  if (wrong.length) throw new Error(what + ':\n  ' + wrong.join('\n  '));
  const ids = rows.map(row => row.id), twice = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (twice.length) throw new Error(what + ': the id "' + twice[0] + '" is used twice.');
  return rows;
}
