import {registerTownSystem} from './town-sim.js';
import {TOWN_TIME} from './town-calendar.js';
import {TOWN_BOOK_FORMS, townBookSentence} from './content/book-text.js';

const HOURS_PER_YEAR = BigInt(TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear);
const asTick = value => { try { return BigInt(value ?? 0); } catch { return 0n; } };

function foundersLine(town) {
  const names = (town.founders || []).map(person => typeof person === 'string' ? person : person?.name)
    .filter(name => typeof name === 'string' && name.trim());
  return names.length ? `The first people here were ${names.join(', ')}.` : 'The first twelve people made a home here.';
}

function ensureBook(town) {
  if (!Array.isArray(town.book)) town.book = [];
  if (!Array.isArray(town.bookPages)) town.bookPages = [];
  if (!town.bookState || typeof town.bookState !== 'object') town.bookState = {seenEvents:0, firstBuildings:[], peopleAway:{}, fireIds:[], droughtRegions:{}};
  const state = town.bookState;
  state.seenEvents = Number.isSafeInteger(state.seenEvents) ? Math.max(0, state.seenEvents) : 0;
  state.firstBuildings ||= []; state.peopleAway ||= {}; state.fireIds ||= []; state.droughtRegions ||= {};
  return state;
}

function annualNotes(town, state) {
  const notes = [];
  for (const event of town.book.slice(state.seenEvents)) {
    if (!event || typeof event !== 'object') continue;
    if (event.type === 'birth') notes.push(`${event.name || 'A child'} was born.`);
    else if (event.type === 'arrival') notes.push(`${event.name || 'Someone'} came to town.`);
    else if (event.type === 'passing') notes.push(`${event.name || 'Someone'} passed on.`);
    else if (event.type === 'return' || event.type === 'came-back') notes.push(`${event.name || 'Someone'} came back.`);
    else if (event.type === 'departure' || event.type === 'left') notes.push(`${event.name || 'Someone'} left town.`);
    else if (event.type === 'fire') notes.push('A fire kept the town busy.');
    else if (event.type === 'first') notes.push(event.text || 'The town had a first.');
  }
  state.seenEvents = town.book.length;
  const fires = new Set(state.fireIds);
  for (const building of town.buildings || []) {
    if ((building.fireStage || building.fireOut || String(building.state || '').startsWith('burnt-')) && !fires.has(building.id)) {
      notes.push('A fire made work for everyone.'); fires.add(building.id);
    }
    const firsts = new Set(state.firstBuildings);
    if (building.state === 'finished' && building.buildingId && !firsts.has(building.buildingId)) {
      state.firstBuildings.push(building.buildingId); firsts.add(building.buildingId);
      notes.push(`The first ${building.buildingId.replaceAll('-', ' ')} was finished.`);
    }
  }
  state.fireIds = [...fires];
  for (const person of town.people || []) {
    const away = person.leftTown === true || person.status === 'away';
    if (away && !state.peopleAway[person.id]) { notes.push(`${person.name || 'Someone'} left town.`); state.peopleAway[person.id] = true; }
    if (!away && state.peopleAway[person.id]) { notes.push(`${person.name || 'Someone'} came back.`); delete state.peopleAway[person.id]; }
  }
  for (const [regionId, region] of Object.entries(town.regions || {})) {
    const days = region.groundWater?.droughtDays || 0;
    const wasDry = !!state.droughtRegions[regionId];
    const isDry = days >= 30;
    if (isDry && !wasDry) notes.push('The wells began to feel the dry spell.');
    if (!isDry && wasDry) notes.push('The dry spell eased.');
    state.droughtRegions[regionId] = isDry;
  }
  return notes;
}

export function townBookPages(town) {
  return (town?.bookPages || []).map(page => ({year:page.year, text:page.text, entries:[...page.entries]}));
}

export function stepTownBook(town, tick = town.tick) {
  const state = ensureBook(town);
  if (!town.bookPages.length) {
    town.bookPages.push({year:1n, tick:asTick(tick), text:foundersLine(town), entries:['The town was founded.', ...((town.founders || []).map(person => typeof person === 'string' ? person : person?.name).filter(Boolean))]});
  }
  const currentYear = (asTick(tick) / HOURS_PER_YEAR) + 1n;
  const lastPage = town.bookPages[town.bookPages.length - 1];
  if (currentYear <= asTick(lastPage.year)) return;
  const notes = annualNotes(town, state);
  const base = townBookSentence(Number((currentYear - 2n) % BigInt(TOWN_BOOK_FORMS.length)));
  const text = notes.length ? `${base} ${notes.slice(0, 3).join(' ')}` : base;
  town.bookPages.push({year:currentYear, tick:asTick(tick), text, entries:notes});
}

registerTownSystem('town-book', 90, TOWN_TIME.ticksPerDay, ({town,tick}) => stepTownBook(town,tick));
