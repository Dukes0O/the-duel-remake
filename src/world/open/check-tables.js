// A check for every table of the open Scablands (docs/story/open-scablands.md, section 12) and for a storyline
// (section 18). Each check takes one row and returns sentences that name what is wrong; an empty list means the row
// is sound. Content is rows in tables, so these checks are what stands between a writer's slip and the game.
import {CAST_SOURCES, HOLD_SYSTEMS, PARTS_OF_DAY, ROUTINE_KINDS, SIGN_KINDS, SITE_KINDS, THREAD_KINDS, TIN_TOWN_SPOTS,
  isGroup, isPeople, isPerson, isPlace, isSite, nameRow, siteRow} from './register.js';
import {FACTS, checkFact} from './facts.js';
import {LEDGER_EFFECTS, OPEN_EFFECTS, checkEffect} from './open-effects.js';
import {ROLE_WORDS, checkRole, isRole} from './roles.js';

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

// ---- The one shape of a storyline's file (docs/story/open-scablands.md, section 18, "The one shape of a storyline's
// file"). `checkThread` refuses a key that is not here, and says which key and where. A key is added to the shape in
// section 18 first, and then here, and then used.
export const THREAD_SHAPE = Object.freeze({
  storyline: ['id', 'title', 'kind', 'reads', 'writes', 'cast', 'starts', 'sign', 'beats', 'ends', 'ignored', 'later', 'notes'],
  role: ['from', 'where', 'weightBy', 'apartFrom', 'except', 'among', 'nearest', 'optional', 'late', 'draw', 'chance', 'otherwise'],
  sign: ['kind', 'at', 'by', 'seenWithin', 'part', 'lastsNights', 'nightsNeeded', 'again', 'cue'],
  again: ['afterNights', 'when', 'at'],
  // `takes` holds the player (foot) and the car (car) while the storyline stands at the beat; `frees` lets go, true where
  // they are or putting the player beside the car at a spot; `leaves: 'hearth-bank'` ends the roam with the hearth banked
  // without the player; `ransom` is paid on entry (ransom-rule.js); `oneTalk` puts the questions and choices in one talk.
  beat: ['when', 'cue', 'cues', 'lines', 'thoughts', 'explore', 'mend', 'mends', 'questions', 'choices', 'mission', 'effects', 'next', 'notes',
    'takes', 'frees', 'leaves', 'ransom', 'oneTalk'],
  takes: ['foot', 'car'],
  ransom: ['price', 'asked', 'roadRats'],
  ransomPrice: ['when', 'scrap', 'embers'],
  ransomAsked: ['roadWord', 'embers'],
  line: ['speaker', 'words', 'when', 'radio', 'low', 'shouted', 'as', 'cue', 'moment', 'slot'],
  thought: ['thought', 'when', 'moment', 'slot'],
  question: ['id', 'to', 'words', 'lines', 'when', 'shows', 'effects', 'cue'],
  thing: ['id', 'what', 'thought', 'tells', 'when', 'effects', 'cue'],
  mend: ['id', 'what', 'wrenchSeconds', 'scrap', 'lines', 'effects', 'cue', 'during', 'after'],
  choice: ['id', 'by', 'words', 'plain', 'thought', 'when', 'hidden', 'lines', 'effects', 'cast', 'again', 'next', 'cue'],
  choiceAgain: ['afterNights', 'times'],
  mission: ['id', 'kind', 'partOf', 'by', 'minutes', 'outing', 'holds', 'enemy', 'cars', 'rule', 'lines', 'thoughts', 'outcomes', 'cue'],
  outcome: ['lines', 'effects', 'next', 'cast', 'when', 'cue'],
  nextRow: ['when', 'to'],
  later: ['id', 'by', 'when', 'at', 'words', 'lines', 'effects'],
  ignored: ['when', 'afterNights', 'afterChoice', 'says', 'line', 'effects', 'next'],
  afterChoice: ['id', 'times'],
});
// What a condition of the storyline has beside the facts: its key, and the keys that may stand beside it.
const CONDITIONS = Object.freeze({reach: ['within'], after: [], nights: ['since'], seconds: ['since'], part: [],
  cast: ['is'], asked: [], found: [], chose: [], due: [], sign: [], ended: []});
const CHOICE_WAYS = ['say', 'do', 'go'], MISSION_WAYS = ['car', 'foot'];
const THREAD_PARTS = ['dawn', 'day', 'noon', 'dusk', 'dark'];

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
const SOURCE_IS = {sites: isSite, groups: isGroup, peoples: isPeople, persons: isPerson};

// Follow explicit routes and beats that open after another beat or an end. Unfinished beats may
// still be checked by the crossings tool, but an ending must never sit on a disconnected beat.
function checkEndingBeats(beats, ends, firstBeat, ignored, say) {
  if (!firstBeat) return;
  const targets = value => [value].flat().map(row => isObject(row) ? row.to : row).filter(storyId);
  const edges = new Map();
  const endings = new Set();
  const add = (from, to) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from).add(to);
  };
  function followAfter(cond, name) {
    if (!isObject(cond)) return;
    for (const from of [cond.after].flat()) {
      if (Object.hasOwn(beats, from)) add(from, name);
      if (ends.includes(from)) add('end:' + from, name);
    }
    for (const parts of [cond.all, cond.any]) if (Array.isArray(parts)) {
      for (const part of parts) followAfter(part, name);
    }
  }
  function followNext(from, next) {
    for (const to of targets(next)) {
      if (Object.hasOwn(beats, to)) add(from, to);
      if (ends.includes(to)) {
        add(from, 'end:' + to);
        endings.add(from);
      }
    }
  }
  for (const [name, body] of Object.entries(beats)) {
    followAfter(body?.when, name);
    followNext(name, body?.next);
    if (Array.isArray(body?.choices)) for (const choice of body.choices) followNext(name, choice?.next);
    if (isObject(body?.mission?.outcomes)) {
      for (const outcome of Object.values(body.mission.outcomes)) followNext(name, outcome?.next);
    }
  }
  for (const row of [ignored].flat()) followNext(firstBeat, row?.next);
  const reached = new Set([firstBeat]);
  for (const from of reached) for (const to of edges.get(from) ?? []) reached.add(to);
  for (const name of endings) if (!reached.has(name)) say('The beat "' + name + '" leads to an end but cannot be reached.');
}

// The part of checkThread that holds a file to the shape: every key, every place, every `next` and every condition
// of the storyline's own. It says what is wrong through `say`. The facts inside a condition are checked by checkFact.
function checkShape(thread, say) {
  const castFrom = Object.fromEntries(Object.entries(isObject(thread.cast) ? thread.cast : {}).map(([role, how]) => [role, how?.from]));
  const roles = Object.keys(castFrom);
  const beats = isObject(thread.beats) ? thread.beats : {};
  const beatNames = Object.keys(beats), firstBeat = beatNames[0];
  const ends = Array.isArray(thread.ends) ? thread.ends : [];
  const missionIds = new Set(Object.values(beats).map(body => body?.mission?.id));
  // What a condition may name: the questions, things to find, choices and promises of this file.
  const names = {questions: new Set(), things: new Set(), choices: new Set(), promises: new Set()};
  for (const body of Object.values(beats)) {
    for (const question of body?.questions ?? []) names.questions.add(question?.id);
    for (const thing of body?.explore ?? []) names.things.add(thing?.id);
    for (const choice of body?.choices ?? []) names.choices.add(choice?.id);
  }
  for (const [node] of everyObject(thread)) if (node.type === 'promise' && typeof node.id === 'string') names.promises.add(node.id);

  const keys = (node, kind, where, what) => {
    if (!isObject(node)) { say(where + ' must be an object.'); return false; }
    for (const key of Object.keys(node)) if (!THREAD_SHAPE[kind].includes(key))
      say(where + ' has the key "' + key + '", which the shape of a storyline does not have on ' + what + '.');
    return true;
  };
  const list = (value, where, each) => {
    if (value === undefined) return;
    if (!Array.isArray(value)) { say(where + ' must be a list.'); return; }
    value.forEach((item, index) => each(item, where + '[' + index + ']'));
  };
  // A place: a role '@camp', a site or place by its id, or [place, spot].
  const place = (value, where, reaching = false) => {
    if (Array.isArray(value)) {
      if (value.length !== 2 || typeof value[1] !== 'string') say(where + ' writes a spot as [place, spot].');
      else if (value[0] === 'tin-town' && !TIN_TOWN_SPOTS.includes(value[1]))
        say(where + ' names "' + value[1] + '", which is not a registered Tin Town spot.');
      else place(value[0], where);
    } else if (typeof value !== 'string') say(where + ' needs a place: a role like "@camp", a site or a place by its id, or [place, spot].');
    else if (isRole(value)) {
      const source = castFrom[value.slice(1)];
      const want = reaching && ['persons', 'peoples'].includes(source) ? 'name' : 'site';
      for (const text of checkRole(value, castFrom, want)) say(where + ': ' + text);
    }
    else if (reaching && (value === 'sign' || isPerson(value))) return;
    else if (roles.includes(value)) say(where + ' names the role "' + value + '" bare. Write "@' + value + '".');
    else if (!somewhere(value)) say(where + ' names "' + value + '", which is not a role of the cast, a site or a place.');
  };
  const beat = (value, where, extra = []) => {
    if (typeof value !== 'string' || (!beatNames.includes(value) && !extra.includes(value))) say(where + ' names "' + value + '", which is not a beat of this file.');
  };
  const known = (value, set, what, where) => {
    if (typeof value !== 'string' || !set.has(value)) say(where + ' names "' + value + '", which is not ' + what + ' of this file.');
  };

  function condition(cond, where, first = false) {
    if (cond === 'sign-seen') { if (!first) say(where + ': "sign-seen" is the "when" of the first beat only.'); return; }
    if (!isObject(cond)) { say(where + ': a condition is an object. Several are joined with "all".'); return; }
    for (const joiner of ['all', 'any']) if (cond[joiner] !== undefined) {
      if (!Array.isArray(cond[joiner])) say(where + ': "' + joiner + '" needs a list of conditions.');
      else for (const part of cond[joiner]) condition(part, where);
      return;
    }
    if (cond.not !== undefined) { condition(cond.not, where); return; }
    if (cond.fact !== undefined) return;
    const found = Object.keys(cond).filter(key => Object.hasOwn(CONDITIONS, key));
    if (found.length !== 1) {
      say(where + ': a condition is a fact, "all", "any", "not" or one of ' + Object.keys(CONDITIONS).join(', ') + '. This one has: ' + Object.keys(cond).join(', ') + '.');
      return;
    }
    const key = found[0], value = cond[key];
    for (const other of Object.keys(cond)) if (other !== key && !CONDITIONS[key].includes(other))
      say(where + ': the condition "' + key + '" has the key "' + other + '", which it does not have.');
    const here = where + ' (' + key + ')';
    switch (key) {
      case 'reach':
        place(value, here, true);
        if (cond.within !== undefined && !(cond.within > 0)) say(here + ': "within" is a number of metres.');
        break;
      case 'after':
        for (const name of [value].flat()) beat(name, here, ends);
        break;
      case 'nights': case 'seconds':
        if (!(value > 0)) say(here + ' needs a number.');
        if (cond.since !== undefined) beat(cond.since, here);
        break;
      case 'part':
        if (!THREAD_PARTS.includes(value)) say(here + ' names "' + value + '", which is not a part of the day: ' + THREAD_PARTS.join(', ') + '.');
        break;
      case 'cast':
        if (!roles.includes(value)) say(here + ' names "' + value + '", which is not a role of the cast.');
        else if (cond.is !== undefined && !SOURCE_IS[castFrom[value]]?.(cond.is))
          say(here + ': "' + cond.is + '" is not something the role "' + value + '" (cast from ' + castFrom[value] + ') could be.');
        break;
      case 'asked': known(value, names.questions, 'a question', here); break;
      case 'found': known(value, names.things, 'a thing to find', here); break;
      case 'chose': known(value, names.choices, 'a choice', here); break;
      case 'due': known(value, names.promises, 'a promise made by an effect', here); break;
      case 'sign': if (value !== 'again') say(here + ' must be "again".'); break;
      case 'ended': if (!ends.includes(value)) say(here + ' names "' + value + '", which is not an end of this file.'); break;
    }
  }
  const when = (node, where, first = false) => { if (node.when !== undefined) condition(node.when, where + '.when', first); };
  const cue = (value, where) => { if (value !== undefined && (typeof value !== 'string' || !value)) say(where + ' needs a cue id.'); };
  const timing = (row, at) => {
    if (row.slot !== undefined && !['before', 'after'].includes(row.slot)) say(at + '.slot must be "before" or "after".');
    if (row.moment !== undefined && (typeof row.moment !== 'string' || !row.moment)) say(at + '.moment needs a name.');
  };
  const lines = (value, where) => list(value, where, (line, at) => {
    if (!keys(line, 'line', at, 'a line')) return;
    if (typeof line.words !== 'string' || !line.words) say(at + ' needs "words".');
    if (typeof line.speaker !== 'string') say(at + ' needs "speaker".');
    when(line, at); cue(line.cue, at + '.cue'); timing(line, at);
  });
  const thoughtRow = (thought, at) => {
    if (typeof thought === 'string') return;
    if (!keys(thought, 'thought', at, 'a thought')) return;
    if (typeof thought.thought !== 'string') say(at + ' needs "thought".');
    when(thought, at); timing(thought, at);
  };
  const thoughts = (value, where) => list(value, where, thoughtRow);
  const effects = (value, where) => list(value, where, (effect, at) => {
    if (!isObject(effect)) return;
    when(effect, at);
    if (effect.type === 'thread') say(at + ' is a "thread" effect written by hand. Where a storyline leads is "next".');
    if (['mark', 'made'].includes(effect.type) && effect.text !== undefined) for (const text of checkSentence(effect.text)) say(at + ': ' + text);
  });
  const next = (value, where) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      if (value.every(row => typeof row === 'string')) {
        value.forEach((name, index) => beat(name, where + '[' + index + ']', ends));
        return;
      }
      value.forEach((row, index) => {
        const at = where + '[' + index + ']';
        if (!keys(row, 'nextRow', at, 'a row of "next"')) return;
        beat(row.to, at, ends);
        when(row, at);
        if (row.when === undefined && index < value.length - 1) say(at + ' has no "when" and is not the last, so the rows after it are never tried.');
      });
    } else beat(value, where, ends);
  };
  const cast = (value, where) => {
    if (value === undefined) return;
    if (!isObject(value)) { say(where + ' must be {role: id}.'); return; }
    for (const [role, id] of Object.entries(value)) {
      if (!roles.includes(role)) say(where + ' fills the role "' + role + '", which the cast does not have.');
      else if (!SOURCE_IS[castFrom[role]]?.(id)) say(where + ': "' + id + '" is not something the role "' + role + '" (cast from ' + castFrom[role] + ') could be.');
      else if (thread.cast[role].late !== true) say(where + ' fills the role "' + role + '", which is not "late: true".');
      filled.add(role);
    }
  };
  const filled = new Set();
  const things = (value, where) => list(value, where, (thing, at) => {
    if (!keys(thing, 'thing', at, 'a thing to find')) return;
    when(thing, at); effects(thing.effects, at + '.effects');
  });
  const mend = (value, at) => {
    if (!keys(value, 'mend', at, 'a mend')) return;
    cue(value.cue, at + '.cue'); lines(value.during, at + '.during'); lines(value.after, at + '.after');
    lines(value.lines, at + '.lines'); effects(value.effects, at + '.effects');
  };
  const questions = (value, where) => list(value, where, (question, at) => {
    if (!keys(question, 'question', at, 'a question')) return;
    when(question, at); lines(question.lines, at + '.lines');
    cue(question.cue, at + '.cue'); effects(question.effects, at + '.effects');
  });
  const choices = (value, where) => list(value, where, (choice, at) => {
    if (!keys(choice, 'choice', at, 'a choice')) return;
    if (choice.by !== undefined && !CHOICE_WAYS.includes(choice.by)) say(at + ' is made by "' + choice.by + '", which is not one of: ' + CHOICE_WAYS.join(', ') + '.');
    if (choice.again !== undefined) keys(choice.again, 'choiceAgain', at + '.again', 'a choice\'s "again"');
    if (choice.thought !== undefined) thoughtRow(choice.thought, at + '.thought');
    cue(choice.cue, at + '.cue');
    when(choice, at); lines(choice.lines, at + '.lines'); effects(choice.effects, at + '.effects');
    cast(choice.cast, at + '.cast'); next(choice.next, at + '.next');
  });
  const mission = (value, at) => {
    if (!keys(value, 'mission', at, 'a mission')) return;
    if (value.partOf !== undefined && (!storyId(value.partOf) || value.partOf === value.id || !missionIds.has(value.partOf)))
      say(at + '.partOf must name another mission in this file.');
    if (value.partOf === undefined && !storyId(value.kind)) say(at + ' needs a mission "kind" or "partOf".');
    cue(value.cue, at + '.cue');
    if (value.by !== undefined && !MISSION_WAYS.includes(value.by)) say(at + ' is driven "' + value.by + '", which is not one of: ' + MISSION_WAYS.join(', ') + '.');
    for (const system of value.holds ?? []) if (!HOLD_SYSTEMS.includes(system)) say(at + ' holds "' + system + '", which is not a system.');
    if (typeof value.enemy === 'string') {
      if (isRole(value.enemy)) for (const text of checkRole(value.enemy, castFrom, 'name')) say(at + ': ' + text);
      else if (!isGroup(value.enemy)) say(at + ' has the enemy "' + value.enemy + '", which is not a group in the register.');
    }
    if (value.rule !== undefined && !isObject(value.rule)) say(at + '.rule must be an object of numbers by plain names.');
    const moments = value.rule?.moments;
    list(moments, at + '.rule.moments', (name, where) => {
      if (typeof name !== 'string' || !name) say(where + ' needs a moment name.');
    });
    for (const key of ['lines', 'thoughts']) if (Array.isArray(value[key])) {
      value[key].forEach((row, index) => {
        if (row?.moment !== undefined && (!Array.isArray(moments) || !moments.includes(row.moment)))
          say(at + '.' + key + '[' + index + '] names a moment that the mission rule does not list.');
      });
    }
    lines(value.lines, at + '.lines'); thoughts(value.thoughts, at + '.thoughts');
    if (value.outcomes !== undefined) {
      if (!isObject(value.outcomes)) say(at + '.outcomes must be an object.');
      else for (const [name, outcome] of Object.entries(value.outcomes)) {
        const here = at + '.outcomes.' + name;
        if (!keys(outcome, 'outcome', here, 'an outcome')) continue;
        when(outcome, here); cue(outcome.cue, here + '.cue');
        lines(outcome.lines, here + '.lines'); effects(outcome.effects, here + '.effects');
        cast(outcome.cast, here + '.cast'); next(outcome.next, here + '.next');
      }
    }
  };

  keys(thread, 'storyline', 'The storyline', 'a storyline');
  for (const [role, how] of Object.entries(isObject(thread.cast) ? thread.cast : {})) {
    const at = 'cast.' + role;
    if (!keys(how, 'role', at, 'a role')) continue;
    if (how.where !== undefined) condition(how.where, at + '.where');
    if (how.weightBy !== undefined && !FACTS.includes(how.weightBy)) say(at + ' is weighted by "' + how.weightBy + '", which is not a fact.');
    for (const other of how.apartFrom ?? []) if (!roles.includes(other)) say(at + ' keeps apart from "' + other + '", which is not a role.');
    for (const key of ['except', 'among']) for (const id of how[key] ?? [])
      if (!SOURCE_IS[how.from]?.(id)) say(at + '.' + key + ' names "' + id + '", which the role (cast from ' + how.from + ') could not be.');
    if (how.nearest !== undefined && !somewhere(how.nearest)) say(at + '.nearest names "' + how.nearest + '", which is not a site or a place.');
    for (const key of ['optional', 'late']) if (how[key] !== undefined && typeof how[key] !== 'boolean') say(at + '.' + key + ' is true or false.');
  }
  if (thread.starts !== undefined) condition(thread.starts, 'starts');
  const signAt = (at, where) => {
    if (at === undefined) return;
    if (!isObject(at)) { place(at, where); return; }
    if (Object.keys(at).some(key => key !== 'checkpoint') || !isObject(at.checkpoint) ||
        Object.keys(at.checkpoint).some(key => key !== 'who') || !isGroup(at.checkpoint.who))
      say(where + ' is {checkpoint: {who: group}}, where the group is one in the register.');
  };
  if (isObject(thread.sign)) {
    const sign = thread.sign;
    keys(sign, 'sign', 'sign', 'the sign');
    signAt(sign.at, 'The sign');
    if (sign.part !== undefined && !THREAD_PARTS.includes(sign.part)) say('The sign is seen in "' + sign.part + '", which is not a part of the day.');
    if (sign.again !== undefined && keys(sign.again, 'again', 'sign.again', 'the sign\'s "again"')) {
      if (sign.again.afterNights !== undefined && (!Number.isInteger(sign.again.afterNights) || sign.again.afterNights < 1))
        say('sign.again.afterNights needs a positive whole number.');
      when(sign.again, 'sign.again');
      signAt(sign.again.at, 'sign.again.at');
    }
  }
  for (const [name, body] of Object.entries(beats)) {
    const at = 'beats.' + name;
    if (!keys(body, 'beat', at, 'a beat')) continue;
    when(body, at, name === firstBeat);
    list(body.cues, at + '.cues', cue);
    lines(body.lines, at + '.lines'); thoughts(body.thoughts, at + '.thoughts'); things(body.explore, at + '.explore');
    if (body.mend !== undefined) mend(body.mend, at + '.mend');
    list(body.mends, at + '.mends', mend);
    questions(body.questions, at + '.questions'); choices(body.choices, at + '.choices');
    if (body.mission !== undefined) mission(body.mission, at + '.mission');
    effects(body.effects, at + '.effects'); next(body.next, at + '.next');
    if (body.takes !== undefined && keys(body.takes, 'takes', at + '.takes', 'what a beat takes')) {
      place(body.takes.foot, at + '.takes.foot'); place(body.takes.car, at + '.takes.car');
    }
    if (body.frees !== undefined && body.frees !== true) {
      if (typeof body.frees !== 'string') say(at + '.frees is true, or the spot of the held car to put the player beside it.');
    }
    if (body.leaves !== undefined && body.leaves !== 'hearth-bank') say(at + '.leaves is "hearth-bank", the only way a beat ends a roam.');
    if (body.oneTalk !== undefined && body.oneTalk !== true) say(at + '.oneTalk is true or left out.');
    if (body.ransom !== undefined && keys(body.ransom, 'ransom', at + '.ransom', 'a ransom')) {
      const whole = value => Number.isSafeInteger(value) && value >= 0;
      if (!Array.isArray(body.ransom.price) || !body.ransom.price.length) say(at + '.ransom.price needs a list of prices.');
      list(body.ransom.price, at + '.ransom.price', (row, here) => {
        if (!keys(row, 'ransomPrice', here, 'a price')) return;
        when(row, here);
        if (!whole(row.scrap) || (row.embers !== undefined && !whole(row.embers))) say(here + ' needs whole numbers of scrap and embers.');
      });
      list(body.ransom.asked, at + '.ransom.asked', (row, here) => {
        if (keys(row, 'ransomAsked', here, 'embers asked') && (!whole(row.roadWord) || !whole(row.embers)))
          say(here + ' needs a whole Word on the road and a whole number of embers.');
      });
    }
  }
  list(thread.later, 'later', (row, at) => {
    if (!keys(row, 'later', at, 'a "later" row')) return;
    if (typeof row.by !== 'string') say(at + ' needs "by": who says it.');
    if (row.words !== undefined && typeof row.words !== 'string') say(at + '.words needs the player\'s words.');
    if (row.at !== undefined) place(row.at, at);
    when(row, at); lines(row.lines, at + '.lines'); effects(row.effects, at + '.effects');
  });
  const ignored = (row, at) => {
    if (!keys(row, 'ignored', at, '"ignored"')) return;
    when(row, at);
    if (row.afterNights !== undefined && (!Number.isInteger(row.afterNights) || row.afterNights < 1))
      say(at + '.afterNights needs a positive whole number.');
    if (row.afterChoice !== undefined && keys(row.afterChoice, 'afterChoice', at + '.afterChoice', '"afterChoice"')) {
      known(row.afterChoice.id, names.choices, 'a choice', at + '.afterChoice');
      if (!Number.isInteger(row.afterChoice.times) || row.afterChoice.times < 1)
        say(at + '.afterChoice.times needs a positive whole number.');
    }
    effects(row.effects, at + '.effects'); next(row.next, at + '.next');
  };
  if (Array.isArray(thread.ignored)) list(thread.ignored, 'ignored', ignored);
  else if (thread.ignored !== undefined) ignored(thread.ignored, 'ignored');
  checkEndingBeats(beats, ends, firstBeat, thread.ignored, say);
  for (const [role, how] of Object.entries(isObject(thread.cast) ? thread.cast : {}))
    if (how?.late === true && !filled.has(role)) say('The role "' + role + '" is "late: true", and no choice or outcome fills it with "cast".');
}

// A storyline (section 18): {id, title, kind, reads, writes, cast, starts, sign, beats, ends, ignored, later, notes}.
// - A name in a condition or an effect may be a role of the cast: '@camp', '@camp.people' (roles.js).
// - A condition inside `cast.<role>.where` is asked of each candidate, so it may leave out whose word or which site.
//   Every other condition says whose, by name or by role.
// - An effect is any object with a `type` the ledger or the open land knows, wherever it sits, and any object with
//   a `type` under `effects`, `gives` or `outcomes`, so that a misspelt effect there is named.
// - Every key is one the shape has (THREAD_SHAPE), and every `next`, place and condition names what the file has.
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
  for (const [beat, body] of Object.entries(isObject(thread.beats) ? thread.beats : {}))
    if (!isObject(body)) say('The beat "' + beat + '" is empty.');
  checkShape(thread, say);
  // Every condition and every effect, wherever it sits.
  const used = {facts: new Set(), effects: new Set()};
  for (const [node, path] of everyObject(thread)) {
    const key = path[path.length - 1] ?? null;
    const isEffect = typeof node.type === 'string' &&
      (ALL_EFFECTS.includes(node.type) || EFFECT_LISTS.includes(key) || path.includes('outcomes'));
    if (isEffect) {
      used.effects.add(node.type);
      for (const text of checkEffect(node, {roles: castFrom})) say(text);
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
