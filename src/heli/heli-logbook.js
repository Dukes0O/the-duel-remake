// Kestrel One's career. Pure rules; the session supplies completed events.
import {heliOf, HELI_LESSONS} from './heli-save.js';
import {PLACES, LEFT_OFF, placeOfCourse} from './pilot-map-data.js';
import {wearSkin} from './heli-skins.js';

export const LOGBOOK_JOBS = Object.freeze(['car', 'crate', 'fire', 'rescue', 'ski']);
export const LOGBOOK_PLACES = Object.freeze(PLACES.filter(p => !LEFT_OFF.includes(p.id)).map(p => p.id));
export const RANKS = Object.freeze([
  {id: 'student', name: 'Student pilot', real: 'Student Pilot Permit, Helicopter',
    paint: 'Flight-school white with orange training stripes', roger: ''},
  {id: 'private', name: 'Private pilot', real: 'Private Pilot Licence, Helicopter: 45 hours of flying in real life.',
    paint: 'Midnight blue with a silver cheat line',
    roger: 'That is your licence, Kestrel One. Gus would have liked that. There is a book for you on the shelf.'},
  {id: 'commercial', name: 'Commercial pilot', real: 'Commercial Pilot Licence, Helicopter: 100 hours in real life; needed to be paid to fly.',
    paint: 'The lodge’s forest green and cream, a kestrel on the door',
    roger: "Commercial pilot. The lodge would like you flying for us properly now. New paint's on her."},
  {id: 'mountain', name: 'Mountain pilot', real: 'Mountain flying training and a long-line (external load) rating.',
    paint: 'Mountain rescue red and white with reflective bands',
    roger: 'Mountain rated. You are the one they call when it goes wrong up high.'},
  {id: 'chief', name: 'Chief pilot', real: 'The pilot an air service names to run its flying: a required post for Canadian air operators.',
    paint: 'Gus’s restored cream and signal red, a hand-painted kestrel',
    roger: "Chief pilot of the lodge air service. That was Gus's job. His last book is yours."},
].map(rank => Object.freeze({...rank, skin: `rank-${rank.id}`})));

export const GUS_BOOKS = Object.freeze([
  {year: 1964, place: 'the-table', clue: 'The Table',
    text: 'Coast route home, 1.4 hours. Flat-topped mesa off the left side, something like a tower on top. Fuel too low to look. Next time.'},
  {year: 1966, place: 'pacific-canyon', clue: 'The cove · Marguerite',
    text: "Spare parts down the coast for the Falcone team, 2.1 hours, at night. Wind came up hard off the cove. Watched the Marguerite's lights, then I didn't. Rosa will be heartbroken."},
  {year: 1972, place: 'summit-run', clue: 'Summit · footprints',
    text: 'Summit, above the trees, 0.9 hours. Footprints the size of a snow shovel. Nobody at the lodge believes me. Drew one anyway.'},
  {year: 1981, place: 'pacific-canyon', clue: 'Past the drop-off · Marguerite',
    text: "Last entry in this book. Found the Marguerite's last position in her captain's log: past the drop-off off the cove, too deep for anyone to reach. If you are reading this, Kestrel One, maybe one day you will."},
].map(Object.freeze));

export function logbookOf(profile) {
  return heliOf(profile).logbook ?? {flights: 0, jobs: Object.fromEntries(LOGBOOK_JOBS.map(k => [k, 0])), visited: [], awarded: 0};
}
const withBook = (profile, book) => ({...profile, heli: {...heliOf(profile), logbook: book}});

export function recordLogbook(profile, {flight = null, job = null, enabled = false} = {}) {
  if (enabled !== true) return profile;
  const book = logbookOf(profile);
  const place = placeOfCourse(flight)?.id ?? flight;
  if (LOGBOOK_PLACES.includes(place)) {
    return withBook(profile, {...book, flights: Math.min(1_000_000, book.flights + 1),
      visited: [...new Set([...book.visited, place])]});
  }
  if (LOGBOOK_JOBS.includes(job)) return withBook(profile, {...book,
    jobs: {...book.jobs, [job]: Math.min(1_000_000, book.jobs[job] + 1)}});
  return profile;
}

export function rankRules(profile) {
  const b = logbookOf(profile), lessons = heliOf(profile).lessons;
  return [HELI_LESSONS.every(id => lessons[id]), b.flights >= 10,
    ['car', 'crate', 'fire'].every(k => b.jobs[k] > 0), b.jobs.rescue > 0 && b.jobs.ski > 0,
    b.flights >= 50 && LOGBOOK_PLACES.every(id => b.visited.includes(id))];
}

// Only the session's home-pad path calls this. Awarded ranks never disappear.
export function awardLogbook(profile, {enabled = false} = {}) {
  if (enabled !== true) return {profile, ranks: []};
  const b = logbookOf(profile), rules = rankRules(profile);
  let awarded = b.awarded;
  while (awarded < RANKS.length && rules[awarded]) awarded++;
  const ranks = RANKS.slice(b.awarded, awarded);
  if (!ranks.length) return {profile, ranks};
  let next = withBook(profile, {...b, awarded});
  const heli = heliOf(next), skins = heli.skins ?? {owned: [], worn: 'stock', fresh: []};
  const earned = ranks.map(r => r.skin);
  next = {...next, heli: {...heli, skins: {...skins, owned: [...new Set([...skins.owned, ...earned])],
    fresh: [...new Set([...skins.fresh, ...earned])].filter(id => id !== skins.worn)}}};
  const worn = wearSkin(next, earned.at(-1), {enabled: true});
  return {profile: worn.profile, ranks, freshCoat: worn.freshCoat};
}

export function logbookView(profile) {
  const book = logbookOf(profile);
  return {...book, rank: RANKS[book.awarded - 1] ?? null, books: GUS_BOOKS.slice(0, Math.max(0, book.awarded - 1))};
}
