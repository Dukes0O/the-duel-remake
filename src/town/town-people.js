import {buildingById} from './content/registry.js';
import {TOWN_HOME_TYPES} from './content/homes.js';
import {townThoughtFor} from './content/thoughts.js';
import {townFamilyName, townPersonName} from './town-names.js';
import {TOWN_TIME} from './town-calendar.js';

const HOURS_PER_YEAR = TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear;
const FOUNDERS = 12;
const EMPTY_CONDITIONS = Object.freeze({});

function personAge(person, tick, hoursPerYear = BigInt(HOURS_PER_YEAR)) {
  let born;
  try { born = BigInt(person.born || 0); } catch { born = 0n; }
  const years = (tick - born) / hoursPerYear;
  return years <= 0n ? 0 : Number(years);
}

function ageFromBorn(born, tick, hoursPerYear) {
  const tickNumber = Number(tick);
  const elapsed = tickNumber - born;
  if (Number.isSafeInteger(born) && Number.isSafeInteger(tickNumber) && Number.isSafeInteger(elapsed)) {
    return Math.max(0, Math.floor(elapsed / Number(hoursPerYear)));
  }
  return personAge({born}, tick, hoursPerYear);
}

function takeUniqueName(rng, used) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const name = townPersonName(rng);
    if (!used.has(name)) { used.add(name); return name; }
  }
  return `${townPersonName(rng)} ${used.size + 1}`;
}

function makePerson(town, rng, data = {}) {
  const number = BigInt(town.nextPersonNumber || 1);
  town.nextPersonNumber = number + 1n;
  const id = `person-${number}`;
  const age = data.age ?? (data.born !== undefined ? 0 : rng.int(18, 55));
  const born = data.born !== undefined ? BigInt(data.born) : -BigInt(age * HOURS_PER_YEAR);
  const family = data.family || townFamilyName(rng, number - 1n);
  const homeId = data.home || `canvas-${family}`;
  town.homes ||= [];
  if (!data.home) town.homes.push({id:homeId, tier:0, goodDays:0, hardDays:0, type:TOWN_HOME_TYPES[0]});
  return {
    id,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : townPersonName(rng),
    born,
    nextBirthday:born + BigInt((age + 1) * HOURS_PER_YEAR),
    age,
    family,
    home: homeId,
    homeTier: 0,
    homeType: TOWN_HOME_TYPES[0],
    job: null,
    jobBuildingId: null,
    workHours: 0,
    skills: {building:0, care:0, farming:0, making:0, water:0, learning:0},
    health: 100,
    mood: 60,
    needs: {waterLitres:null, foodCalories:null, shelter:null},
    history: [data.history || 'Came to make a home in the town.'],
    thought: 'The morning is quiet.',
    generation: data.generation || 0,
    partnerId: data.partnerId || null,
    retired: false,
    schoolDays: 0,
  };
}

function createFounders(town, rng) {
  const supplied = Array.isArray(town.founders) ? town.founders : [];
  const count = Math.max(FOUNDERS, supplied.length);
  const names = new Set();
  for (let index = 0; index < count; index++) {
    const source = supplied[index] && typeof supplied[index] === 'object' ? supplied[index] : {};
    const family = townFamilyName(rng, Math.floor(index / 2));
    const person = makePerson(town, rng, {
      name: source.name || takeUniqueName(rng, names),
      age: rng.int(18, 55),
      family,
      home: `canvas-${Math.floor(index / 2) + 1}`,
      history: 'Came with the first twelve people.',
    });
    names.add(person.name);
    person.born -= BigInt(rng.int(0, HOURS_PER_YEAR - 1));
    person.nextBirthday = person.born + BigInt((person.age + 1) * HOURS_PER_YEAR);
    town.people.push(person);
  }
  for (let index = 0; index + 1 < town.people.length; index += 2) {
    town.people[index].partnerId = town.people[index + 1].id;
    town.people[index + 1].partnerId = town.people[index].id;
  }
  town.book ||= [];
  town.oldGround ||= [];
  town.book.push({type:'founding', tick:town.tick, text:'The first twelve people made a home here.'});
}

function conditionsFor(town, person, shelterIndex) {
  const conditions = town.peopleConditions || EMPTY_CONDITIONS;
  const water = Number.isFinite(conditions.waterLitresPerPerson) ? conditions.waterLitresPerPerson : null;
  const waterNeed = Number.isFinite(conditions.waterNeedLitresPerPerson) ? conditions.waterNeedLitresPerPerson : 15;
  const food = Number.isFinite(conditions.foodCaloriesPerPerson) ? conditions.foodCaloriesPerPerson : null;
  const shelter = Number.isFinite(conditions.shelterPlaces) ? shelterIndex < conditions.shelterPlaces : null;
  person.needs.waterLitres = water;
  person.needs.waterNeedLitres = waterNeed;
  person.needs.foodCalories = food;
  const coldCanvas=Boolean(town.peopleConditions?.coldNight)&&String(person.homeType||'').toLowerCase().includes('canvas');
  person.needs.shelter = coldCanvas?false:shelter;
  // A cold night on canvas is hard on mood and risks sickness (town-health.js); it is not the same as no shelter.
  return (water === null || water >= waterNeed) && (food === null || food >= 2100) && (shelter === null || shelter);
}

function needsMet(person) {
  const needs = person.needs || {};
  const waterNeed=Number.isFinite(needs.waterNeedLitres)?needs.waterNeedLitres:15;
  return (needs.waterLitres == null || needs.waterLitres >= 15)
    && (needs.waterLitres == null || needs.waterLitres >= waterNeed)
    && (needs.foodCalories == null || needs.foodCalories >= 2100)
    && (needs.shelter == null || needs.shelter);
}

function hasMeasuredSupport(town, livingCount) {
  const conditions = town.peopleConditions;
  const waterNeed=Number.isFinite(conditions?.waterNeedLitresPerPerson)?conditions.waterNeedLitresPerPerson:15;
  return conditions && Number.isFinite(conditions.waterLitresPerPerson) && conditions.waterLitresPerPerson >= 15
    && conditions.waterLitresPerPerson >= waterNeed
    && Number.isFinite(conditions.shelterPlaces) && conditions.shelterPlaces > livingCount;
}

function arrivalYearGrowth(year) {
  if (typeof year !== 'bigint') return Math.log2(Math.max(1, year));
  const digits = year.toString();
  if (digits.length < 16) return Math.log2(Number(year));
  return Math.log2(Number(`0.${digits.slice(0, 15)}`)) + (digits.length - 1) * Math.log2(10);
}

function matchJobs(town, hasBuildingAssignments = town.people.some(person => person.jobBuildingId)) {
  const vacancies = [];
  for (const building of town.buildings || []) {
    const data = buildingById.get(building.buildingId);
    if (building.state !== 'complete' || !data?.staff) continue;
    for (let seat = 0; seat < data.staff; seat++) vacancies.push({building, data});
  }
  const staleAssignments = !vacancies.length && hasBuildingAssignments;
  if (!vacancies.length && !staleAssignments) return;
  for (const person of town.people) {
    person.job = null;
    person.jobBuildingId = null;
  }
  const adults = town.people.filter(person => {
    const age = person.age;
    return age >= 16 && age < 65;
  });
  const used = new Set();
  for (const {building, data} of vacancies) {
    const skill = data.id.includes('school') || data.id.includes('clinic') ? 'care'
      : /well|water|pump|pipe|reservoir|treatment|standpipe/.test(data.id) ? 'water'
      : /greenhouse|chicken|goat/.test(data.id) ? 'farming'
      : /forge|kiln|workshop|sawmill/.test(data.id) ? 'making' : 'building';
    adults.sort((a, b) => (b.skills[skill] || 0) - (a.skills[skill] || 0) || a.id.localeCompare(b.id));
    const worker = adults.find(person => !used.has(person.id));
    if (!worker) break;
    worker.job = data.id;
    worker.jobBuildingId = building.id;
    worker.workHours = 8;
    worker.skills[skill] = (worker.skills[skill] || 0) + 0.01;
    used.add(worker.id);
  }
  for (const person of adults) if (!used.has(person.id)) {
    person.job = 'townhand';
    person.jobBuildingId = null;
    person.workHours = 8;
    person.skills.building = (person.skills.building || 0) + 0.005;
  }
}

function pairAdults(town) {
  const families = new Map();
  for (const person of town.people) {
    const age = person.age;
    if (person.partnerId || age < 18 || age > 45) continue;
    const group = families.get(person.family) || [];
    group.push(person);
    families.set(person.family, group);
  }
  const groups = [...families.values()];
  if (groups.length < 2) return;
  const first = [], second = [];
  groups.forEach((group, index) => (index % 2 ? second : first).push(...group));
  while (first.length && second.length) {
    const a = first.pop(), b = second.pop();
    a.partnerId = b.id;
    b.partnerId = a.id;
  }
}

function recordPassing(town, person, tick, age) {
  const oldAge = age >= 65;
  const line = oldAge ? 'Passed gently in old age.' : 'Passed after a hard season.';
  const entry = {id:person.id, name:person.name, family:person.family, born:person.born, passed:tick, history:[...person.history, line]};
  town.oldGround.push(entry);
  town.book.push({type:'passing', personId:person.id, name:person.name, tick, text:`${person.name} ${line.toLowerCase()} They are remembered in the Old Ground.`});
}

function updateHomes(town, homeById, householdNeeds) {
  const paintedLimit = Number.isFinite(town.peopleConditions?.paintedHomePlaces)
    ? Math.max(0, town.peopleConditions.paintedHomePlaces) : 0;
  for (let index = 0; index < town.homes.length; index++) {
    const home = town.homes[index];
    const needs = householdNeeds.get(home.id);
    const supported = Boolean(needs?.members && needs.supported);
    const goodMood = Boolean(needs?.members && needs.goodMood);
    const poorMood = !needs?.members || needs.poorMood;
    const paintedGround = index < paintedLimit;
    if (paintedGround && supported && goodMood) {
      home.goodDays++;
      home.hardDays = 0;
      if (home.goodDays >= 180) {
        home.tier++;
        home.goodDays = 0;
      }
    } else if (home.tier > 0 && (!paintedGround || !supported || poorMood)) {
      home.hardDays++;
      home.goodDays = 0;
      if (home.hardDays >= 360) {
        home.tier--;
        home.hardDays = 0;
      }
    }
    home.type = TOWN_HOME_TYPES[home.tier] || `home tier ${home.tier + 1}`;
  }
  for (const person of town.people) {
    const home = homeById.get(person.home);
    person.homeTier = home.tier;
    person.homeType = home.type;
  }
}

export function stepTownPeople({town, rng, tick, calendar}) {
  if (!Array.isArray(town.people)) town.people = [];
  if (!town.people.length && !town.foundingRecorded) {
    town.nextPersonNumber ||= 1n;
    createFounders(town, rng);
    town.foundingRecorded = true;
  }
  town.book ||= [];
  town.oldGround ||= [];
  const tickHours = BigInt(tick);
  const hoursPerYear = BigInt(HOURS_PER_YEAR);
  let work = town.peopleDailyWork;
  if (!work) {
    let nextId;
    try { nextId = BigInt(town.nextPersonNumber || 1); } catch { nextId = 1n; }
    if (nextId < 1n) nextId = 1n;
    const safeNextId = Number(nextId);
    const nextIdBig = Number.isSafeInteger(safeNextId) ? null : nextId.toString();
    const segmentsTotal = 24 - Number((BigInt(tick) - 1n) % 24n);
    const knownHomes = {};
    let hasUpgradedHomes = false;
    for (const home of town.homes || []) {
      knownHomes[home.id] = true;
      hasUpgradedHomes ||= home.tier > 0;
    }
    work = town.peopleDailyWork = {
      segment:0, segmentsTotal, peopleCount:town.people.length,
      nextId:Number.isSafeInteger(safeNextId) ? safeNextId : 1, nextIdBig,
      seenIds:{}, knownHomes, normalizing:!town.peopleIdsReady,
      hasBuildingAssignments:false, hasPartners:false, hasUnpairedAdults:false, hasUpgradedHomes,
      deadIndices:[], passedPartners:{}, householdNeeds:{},
      thoughtSeason:`${calendar.season}:${calendar.month}`,
      noMeasuredConditions:!town.peopleConditions || Object.keys(town.peopleConditions).length === 0,
      hasSchool:(town.buildings || []).some(building => building.buildingId === 'school' && building.state === 'complete'),
    };
  }
  const start = Math.floor(work.peopleCount * work.segment / work.segmentsTotal);
  const end = Math.floor(work.peopleCount * (work.segment + 1) / work.segmentsTotal);
  for (let index = start; index < end; index++) {
    const person = town.people[index];
    if (work.normalizing) {
      if (!person.id || work.seenIds[person.id]) {
        if (work.nextIdBig !== null) {
          const next = BigInt(work.nextIdBig);
          person.id = `person-${next}`;
          work.nextIdBig = (next + 1n).toString();
        } else person.id = `person-${work.nextId++}`;
      }
      work.seenIds[person.id] = true;
      const match = /^person-(\d+)$/.exec(person.id);
      if (match) {
        const number = Number(match[1]);
        if (Number.isSafeInteger(number)) {
          if (work.nextIdBig === null && number >= work.nextId) work.nextId = number + 1;
        } else {
          const next = (BigInt(match[1]) + 1n).toString();
          if (work.nextIdBig === null || BigInt(next) > BigInt(work.nextIdBig)) work.nextIdBig = next;
        }
      }
      if (!person.family) person.family = person.id;
      if (!person.home) person.home = `canvas-${person.family}`;
      if (!Number.isSafeInteger(person.homeTier) || person.homeTier < 0) person.homeTier = 0;
      if (typeof person.homeType !== 'string') person.homeType = TOWN_HOME_TYPES[person.homeTier] || `home tier ${person.homeTier + 1}`;
      if (!work.knownHomes[person.home]) {
        town.homes ||= [];
        const tier = Number.isSafeInteger(person.homeTier) && person.homeTier > 0 ? person.homeTier : 0;
        const type = TOWN_HOME_TYPES[tier] || `home tier ${tier + 1}`;
        town.homes.push({id:person.home, tier, goodDays:0, hardDays:0, type});
        work.hasUpgradedHomes ||= tier > 0;
        work.knownHomes[person.home] = true;
        person.homeTier = tier;
        person.homeType = type;
      }
      if (!Number.isFinite(person.health)) person.health = 100;
      if (!Number.isFinite(person.mood)) person.mood = 60;
      const bornNumber = typeof person.born === 'number' && Number.isSafeInteger(person.born) ? person.born : null;
      if (typeof person.born !== 'bigint' && bornNumber === null) person.born = 0n;
      else person.born = BigInt(person.born);
      if (!person.needs) person.needs = {waterLitres:null, foodCalories:null, shelter:null};
      if (!person.skills) person.skills = {};
      if (!Array.isArray(person.history)) person.history = [];
      if (typeof person.nextBirthday !== 'bigint' || tickHours >= person.nextBirthday) {
        person.age = bornNumber === null ? personAge(person, tickHours, hoursPerYear) : ageFromBorn(bornNumber, tickHours, hoursPerYear);
        person.nextBirthday = person.born + BigInt(person.age + 1) * hoursPerYear;
      }
    }
    work.hasPartners ||= Boolean(person.partnerId);
    if (typeof person.nextBirthday !== 'bigint' || tickHours >= person.nextBirthday) {
      person.age = personAge(person, tickHours, hoursPerYear);
      person.nextBirthday = person.born + BigInt(person.age + 1) * hoursPerYear;
    }
    work.hasUnpairedAdults ||= person.age >= 18 && person.age <= 45;
    work.hasBuildingAssignments ||= Boolean(person.jobBuildingId);
    const age = person.age;
    let supported;
    if (work.noMeasuredConditions) {
      person.needs.waterLitres = null;
      person.needs.foodCalories = null;
      person.needs.shelter = null;
      supported = true;
    } else supported = conditionsFor(town, person, index);
    if (!supported) {
      person.health = Math.max(0, person.health - 1);
      person.mood = Math.max(0, person.mood - 1.5);
    } else {
      person.health = Math.min(100, person.health + 0.05);
      person.mood = Math.min(100, person.mood + 0.15);
    }
    person.retired = age >= 65;
    person.workHours = 0;
    if (age >= 16 && age < 65) {
      person.workHours = 8;
      if (!person.job) person.job = 'townhand';
    }
    if (age >= 6 && age < 16 && work.hasSchool) {
      person.schoolDays = (person.schoolDays || 0) + 1;
      if (person.schoolDays % 180 === 0) person.skills.learning = (person.skills.learning || 0) + 1;
    }
    const ageRisk = age < 65 ? 0 : 0.00015 + Math.max(0, age - 65) * 0.00008;
    const poorHealthRisk = person.health <= 20 ? 0.002 : 0;
    const passingRisk = Math.min(0.25, ageRisk + poorHealthRisk);
    if (person.health <= 0 || passingRisk > 0 && rng.chance(passingRisk)) {
      recordPassing(town, person, tick, age);
      if (person.partnerId) work.passedPartners[person.partnerId] = true;
      work.deadIndices.push(index);
      continue;
    }
    if (person.thoughtSeason !== work.thoughtSeason) {
      person.thought = townThoughtFor(person.id, calendar.season, calendar.month);
      person.thoughtSeason = work.thoughtSeason;
    }
    const household = work.householdNeeds[person.home] || {members:0, supported:true, goodMood:true, poorMood:false};
    household.members++;
    household.supported &&= supported;
    household.goodMood &&= person.mood >= 70;
    household.poorMood ||= person.mood < 35;
    work.householdNeeds[person.home] = household;
  }
  work.segment++;
  if (work.segment < work.segmentsTotal) return;
  if (work.deadIndices.length) {
    const surviving = [];
    let deadCursor = 0;
    for (let index = 0; index < work.peopleCount; index++) {
      if (work.deadIndices[deadCursor] === index) { deadCursor++; continue; }
      const person = town.people[index];
      if (work.passedPartners[person.id]) person.partnerId = null;
      surviving.push(person);
    }
    town.people = surviving;
  } else if (Object.keys(work.passedPartners).length) {
    for (const person of town.people) if (work.passedPartners[person.id]) person.partnerId = null;
  }
  town.homesReady = true;
  const paintedLimit = Number.isFinite(town.peopleConditions?.paintedHomePlaces)
    ? Math.max(0, town.peopleConditions.paintedHomePlaces) : 0;
  if (paintedLimit || work.hasUpgradedHomes) {
    const homeById = new Map((town.homes || []).map(home => [home.id, home]));
    updateHomes(town, homeById, new Map(Object.entries(work.householdNeeds)));
  }
  town.nextPersonNumber = BigInt(work.nextIdBig ?? work.nextId);
  town.peopleIdsReady = true;
  matchJobs(town, work.hasBuildingAssignments);
  if (work.hasUnpairedAdults) pairAdults(town);
  const peopleById = work.hasPartners ? new Map(town.people.map(person => [person.id, person])) : null;
  if (peopleById) for (const person of town.people) {
    const partner = peopleById.get(person.partnerId);
    if (!partner || person.id.localeCompare(partner.id) >= 0) continue;
    const age = person.age;
    const partnerAge = partner.age;
    const eligible = age >= 18 && age <= 40 && partnerAge >= 18 && partnerAge <= 40
      && person.health >= 60 && partner.health >= 60 && person.mood >= 45 && partner.mood >= 45
      && needsMet(person) && needsMet(partner);
    if (!eligible || !rng.chance(0.0015)) continue;
    const child = makePerson(town, rng, {
      born:tick, family:person.family, home:person.home,
      generation:Math.max(person.generation || 0, partner.generation || 0) + 1,
      history:'Was born to a family in the town.',
    });
    town.peopleIdsReady = true;
    child.homeTier = person.homeTier || 0;
    child.homeType = person.homeType || TOWN_HOME_TYPES[0];
    town.people.push(child);
    town.book.push({type:'birth', personId:child.id, name:child.name, tick, text:`${child.name} was born in the town.`});
  }
  const ticksPerMonth = BigInt(TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth);
  if (tick % ticksPerMonth === 0n && hasMeasuredSupport(town, town.people.length)) {
    const averageMood = town.people.length ? town.people.reduce((sum, person) => sum + person.mood, 0) / town.people.length : 50;
    const laterYears = arrivalYearGrowth(calendar.year);
    const monthlyTarget = Math.max(1, Math.floor(1 + averageMood / 25 + laterYears));
    const room = Math.max(0, Math.floor(town.peopleConditions.shelterPlaces - town.people.length));
    const usedNames = new Set(town.people.map(person => person.name));
    for (let index = 0; index < Math.min(monthlyTarget, room); index++) {
      const person = makePerson(town, rng, {name:takeUniqueName(rng, usedNames), age:rng.int(16, 45), history:'Arrived looking for a safer home.'});
      person.born = tick - BigInt(person.age * HOURS_PER_YEAR);
      person.nextBirthday = person.born + BigInt(person.age + 1) * hoursPerYear;
      person.thought = townThoughtFor(person.id, calendar.season, calendar.month);
      town.people.push(person);
      town.peopleIdsReady = true;
      town.book.push({type:'arrival', personId:person.id, name:person.name, tick, text:`${person.name} arrived looking for a home.`});
    }
  }
  delete town.peopleDailyWork;
}
