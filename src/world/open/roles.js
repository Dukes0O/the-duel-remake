// Roles (docs/story/open-scablands.md, section 18). A storyline never names the camp it happens to: it asks for "a
// camp whose people are Friendly", and the game fills the role from the player's own ledger when the storyline
// starts. The cast is kept in the storyline's record as {role: id}, where the id is a site, a group, a people or a
// person of the register.
//
// IN A CONDITION OR AN EFFECT a role is written with '@':
//   '@camp'          the id cast as the camp:      {type: 'site', id: '@camp', stage: 'burned'}
//   '@camp.people'   the people of that site:      {type: 'word', person: '@camp.people', by: 1}
//   '@enemy'         a group cast as the enemy:    {fact: 'feud', of: '@enemy', atLeast: 'Raiding'}
// IN A LINE a role is written in braces, with one of four words:
//   {camp.name}      "the Glasshouse"   the site's or the people's name, with a small "the" inside a sentence
//   {camp.people}    "the Glasshouse"   the name of the site's people
//   {camp.leader}    "Marigold"         their leader, or the people's name where the register gives none
//   {camp.thing}     "her glass frames" what they would never leave behind, or "what is theirs"
// WHERE A PLACE IS NAMED (`sign.at`, a beat's `when.reach`) a role is written '@camp' too. The bare name 'camp' is
// read as the same role there, because the first storylines were written that way; `placeOfRole` reads both.
// WHAT A ROLE MAY STAND FOR depends on what it was cast from. Where a site is wanted, the role is cast from `sites`
// and written bare. Where a people, a person or a group is wanted, it is '@camp.people' for a role cast from
// `sites`, and the bare role for one cast from `groups`, `peoples` or `persons`.
// `resolveRoles` turns every '@' role in a piece of a storyline into a real id, and `fillLine` fills a line. The
// storyline rule calls both; `isTrue` and `applyEffects` never see a role. `subjectFor` gives the subject with
// which a role's own condition is asked of one candidate.
import {nameRow, nameOf, siteRow} from './register.js';

export const ROLE_WORDS = Object.freeze(['name', 'people', 'leader', 'thing']);
export const isRole = value => typeof value === 'string' && value.startsWith('@');
const parts = value => value.slice(1).split('.');

// What is wrong with a role as written. `roles` is the cast as {role: what it is cast from} (null outside a
// storyline). `want` is what the place it is written in needs: 'site', or 'name' (a people, a person or a group).
export function checkRole(value, roles, want = null) {
  const [role, word, ...rest] = parts(value);
  if (!roles) return ['"' + value + '" is a role, and only a storyline has a cast.'];
  if (!Object.hasOwn(roles, role)) return ['"' + value + '" names the role "' + role + '", which the cast does not have.'];
  if (rest.length || (word !== undefined && word !== 'people')) return ['"' + value + '" should be "@' + role + '" or "@' + role + '.people".'];
  const fromSites = roles[role] === 'sites';
  if (want === 'site' && (!fromSites || word)) return ['"' + value + '" is written where a site is wanted: use a role cast from sites, with no ".people".'];
  if (want === 'name' && fromSites && !word) return ['"' + value + '" is a site. Where a people is wanted, write "@' + role + '.people".'];
  if (want === 'name' && !fromSites && word) return ['"' + value + '": the role "' + role + '" is not cast from sites, so write "@' + role + '".'];
  return [];
}

// The subject with which a role's own condition (`cast.<role>.where`) is asked of one candidate. A site where nobody
// lives has no people: `of` is null, and a word, a feud or a favour asked of it is false.
export function subjectFor(from, id) {
  if (from === 'sites') return {site: id, of: siteRow(id)?.people ?? null};
  if (from === 'persons') return {of: id, person: id};
  return {of: id};
}

// The id a sign or a beat names as its place: a role, written '@camp' or bare, or else the name as written.
export function placeOfRole(value, cast) {
  if (isRole(value)) return roleId(value, cast);
  return typeof cast?.[value] === 'string' ? cast[value] : value;
}

// The real id a role stands for.
export function roleId(value, cast) {
  const [role, word] = parts(value), id = cast?.[role];
  if (typeof id !== 'string') throw new TypeError('The role "' + role + '" has not been cast.');
  if (word !== 'people') return id;
  const site = siteRow(id), row = nameRow(id);
  const people = site ? site.people : row?.kind === 'person' ? row.of : id;
  if (!people) throw new TypeError('Nobody lives at ' + id + ', so "' + value + '" names no people.');
  return people;
}

// A copy of any piece of a storyline (a condition, an effect, a list of them) with every '@' role made a real id.
export function resolveRoles(piece, cast) {
  if (isRole(piece)) return roleId(piece, cast);
  if (Array.isArray(piece)) return piece.map(item => resolveRoles(item, cast));
  if (piece && typeof piece === 'object') return Object.fromEntries(Object.entries(piece).map(([key, item]) => [key, resolveRoles(item, cast)]));
  return piece;
}

const smallThe = name => name.replace(/^The /, 'the ');
function roleWord(id, word) {
  const site = siteRow(id), row = nameRow(site?.people ?? id);
  const people = row?.kind === 'person' ? nameRow(row.of) : row;
  switch (word) {
    case 'name': return smallThe(nameOf(id) ?? id);
    case 'people': return smallThe(people?.name ?? nameOf(id) ?? id);
    case 'leader': return row?.kind === 'person' ? row.name : people?.leader ? nameOf(people.leader) : smallThe(people?.name ?? nameOf(id) ?? id);
    case 'thing': return people?.thing ?? 'what is theirs';
    default: throw new TypeError('A line can ask a role for: ' + ROLE_WORDS.join(', ') + '.');
  }
}

// A line with every {role.word} filled in. A line that begins with a role's name gets its capital back.
export function fillLine(text, cast) {
  const filled = text.replace(/\{([a-z][a-zA-Z]*)\.([a-zA-Z]+)\}/g, (_, role, word) => {
    if (typeof cast?.[role] !== 'string') throw new TypeError('The role "' + role + '" has not been cast.');
    return roleWord(cast[role], word);
  });
  return filled.charAt(0).toUpperCase() + filled.slice(1);
}
