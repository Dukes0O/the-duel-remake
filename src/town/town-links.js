import {BUILDINGS} from './content/buildings.js';

const WARLORDS = Object.freeze([
  ['sal', 'Sal'], ['dustmonger', 'Dustmonger'], ['mirage', 'Mirage'],
  ['gunn', 'Gunn'], ['kettle', 'Kettle'], ['vultures', 'Vultures'],
  ['tollkeeper', 'Tollkeeper'], ['blackiron', 'Blackiron'], ['magnus', 'Magnus'],
]);
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : [];
const profilesFor = (town, profiles) => list(town?.mayors)
  .map(id => profiles?.[id]).filter(record);
const defeated = (profile, id) => profile?.wasteland?.warlords?.[id]?.defeated === true ||
  list(profile?.wasteland?.warlords?.defeated).includes(id);

function progress(town, profiles) {
  const mayors = profilesFor(town, profiles);
  const beaten = id => mayors.some(profile => defeated(profile, id));
  const count = WARLORDS.filter(([id]) => beaten(id)).length;
  const baron = beaten('blackiron');
  const waterLimitLitresPerDay = 10_000 + 12_000 * count + (baron ? 200_000 : 0);
  const emberJobs = Math.max(0, ...mayors.map(profile => list(profile?.story?.ember?.jobs).length));
  return {
    mayors,
    beaten,
    count,
    baron,
    waterLimitLitresPerDay,
    rank: Math.max(0, ...mayors.map(profile => Number.isFinite(profile?.wasteland?.rank) ? profile.wasteland.rank : 0)),
    crew: new Set(mayors.flatMap(profile => list(profile?.wasteland?.crew?.unlocked))),
    cars: new Set(mayors.flatMap(profile => list(profile?.unlockedCars))),
    chaptersDone: Math.max(0, Number.isSafeInteger(town?.chaptersDone) ? town.chaptersDone : 0,
      ...mayors.map(profile => {
        const saved = profile?.story?.town?.chaptersDone;
        const savedCount = Number.isSafeInteger(saved) && saved >= 0 ? saved
          : Array.isArray(saved) ? saved.filter(value => value === true).length
            : record(saved) ? Object.values(saved).filter(value => value === true).length : 0;
        return Math.max(savedCount, count + (profile?.story?.water?.read === true ? 1 : 0));
      })),
    emberJobs,
  };
}

function lockedReason(requirement, state) {
  if (requirement === 'start' || !requirement) return null;
  const people = /^(\d[\d,]*) people$/.exec(requirement);
  if (people) {
    const count = Number(people[1].replaceAll(',', ''));
    const population = (state.town?.people?.length ?? 0) + (state.town?.founders?.length ?? 0);
    return population >= count ? null : `Reach ${people[1]} people.`;
  }
  const chapter = /^chapter (\d+)$/i.exec(requirement);
  if (chapter) return state.chaptersDone >= Number(chapter[1]) ? null : `Finish chapter ${chapter[1]}.`;
  const year = /^Year (\d+)$/.exec(requirement);
  if (year) return (state.town?.calendar?.year ?? 1) >= Number(year[1]) ? null : `Reach Year ${year[1]}.`;
  const rank = /^rank (\d+)$/i.exec(requirement);
  if (rank) return state.rank >= Number(rank[1]) ? null : `Reach rank ${rank[1]}.`;
  if (/^Treatment Plant$/i.test(requirement)) return state.waterLimitLitresPerDay >= 200_000 ? null : `Raise the Water Road limit to 200,000 litres a day.`;
  if (/^Kettle and forge lit$/i.test(requirement)) return state.beaten('kettle') && state.emberJobs >= 6 ? null : 'Beat Kettle and finish the Everburn.';
  if (/^Everburn job (\d+)$/i.test(requirement)) {
    const n = Number(requirement.match(/\d+/)[0]);
    return state.emberJobs >= n ? null : `Finish Everburn job ${n}.`;
  }
  if (/^(?:after the first fire|Ridge fire)$/i.test(requirement)) return state.emberJobs > 0 ? null : 'Finish the first fire story.';
  if (/^(?:Miss Quill|Old Tam)$/i.test(requirement)) return state.chaptersDone >= 12 ? null : `Meet ${requirement}.`;
  if (/^Bowl played$/i.test(requirement)) return state.mayors.some(profile => profile.story?.bowl?.played === true) ? null : 'Play a Bowl show.';
  const named = WARLORDS.find(([, name]) => requirement.toLowerCase().includes(name.toLowerCase()));
  if (named) return state.beaten(named[0]) ? null : `Beat ${named[1]}.`;
  const crew = /crew[: ]+([a-z][a-z0-9_-]*)/i.exec(requirement);
  if (crew) return state.crew.has(crew[1]) ? null : `Unlock ${crew[1]}.`;
  const car = /car[: ]+([a-z][a-z0-9_-]*)/i.exec(requirement);
  if (car) return state.cars.has(car[1]) ? null : `Own ${car[1]}.`;
  return `Finish ${requirement}.`;
}

// Reads current progression only. It never changes the town or any profile.
export function isOpen(town, profiles, id) {
  const building = BUILDINGS.find(row => row.id === id);
  if (!building) return 'This place is not in the town yet.';
  const state = {...progress(town, profiles), town};
  const requirements = building.opensWith.split(/,\s*(?!\d)|\s+or\s+/i).filter(Boolean);
  for (const requirement of requirements) {
    const reason = lockedReason(requirement, state);
    if (reason === null) return true;
  }
  return lockedReason(requirements[0], state) ?? 'Finish an earlier town story.';
}

export function waterRoadLimitLitresPerDay(town, profiles) {
  return progress(town, profiles).waterLimitLitresPerDay;
}
