import {registerTownSystem} from './town-sim.js';
import {raiseTownReport} from './town-reports.js';

const DAY_TICKS = 24;
const LATrine_CAPACITY = 20;
const CLINIC_CAPACITY = 40;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function cleanWaterAvailable(town) {
  const water = town.utilities?.waterResult;
  if (!water) return false;
  const clean = (water.taps || []).reduce((sum, tap) => {
    const safe = tap.quality?.stage === 'boil' || tap.quality?.stage === 'chlorine';
    return sum + (safe ? Number(tap.litresPerDay) || 0 : 0);
  }, 0);
  return clean >= (town.people?.length || 0) * 15;
}

function healthPressures(town, season) {
  const people = town.people || [];
  const conditions = town.peopleConditions || {};
  const water = Number.isFinite(conditions.waterLitresPerPerson)
    ? conditions.waterLitresPerPerson : null;
  const cleanWater = cleanWaterAvailable(town);
  const rawWater = (town.utilities?.waterResult?.taps || []).some(tap =>
    tap.litresPerDay > 0 && tap.quality && tap.quality.stage !== 'boil' && tap.quality.stage !== 'chlorine');
  const latrines = (town.buildings || []).filter(building =>
    building.buildingId === 'latrine' && building.state === 'complete').length;
  const sanitationShortfall = Math.max(0, people.length - latrines * LATrine_CAPACITY);
  const shelterPlaces = Number.isFinite(conditions.shelterPlaces) ? conditions.shelterPlaces : null;
  const overcrowded = shelterPlaces !== null && shelterPlaces < people.length;
  const coldHomes = season === 'Winter' ? people.filter(person =>
    /canvas|tent/i.test(`${person.homeType || ''} ${person.thought || ''}`)).length : 0;
  return {water, cleanWater, rawWater, sanitationShortfall, overcrowded, coldHomes};
}

/** Apply one seeded, daily town health step without graphics or browser state. */
export function stepTownHealth({town, rng, calendar}) {
  if (!town || !Array.isArray(town.people)) return;
  const people = town.people;
  if (!people.length) return;
  const pressure = healthPressures(town, calendar?.season);
  const sickByHome = new Map();
  for (const person of people) {
    if (person.illnessDays > 0) sickByHome.set(person.home, (sickByHome.get(person.home) || 0) + 1);
  }

  let sick = 0;
  const newlySick = [];
  for (let index = 0; index < people.length; index++) {
    const person = people[index];
    person.health = Number.isFinite(person.health) ? clamp(person.health, 1, 100) : 100;
    const householdSpread = (sickByHome.get(person.home) || 0) > 0 ? 0.025 : 0;
    const waterRisk = pressure.water !== null && pressure.water < 15 ? 0.08 : pressure.rawWater ? 0.025 : 0;
    const sanitationRisk = pressure.sanitationShortfall ? 0.04 : 0;
    const crowdRisk = pressure.overcrowded ? 0.02 : 0;
    const coldRisk = pressure.coldHomes && /canvas|tent/i.test(person.homeType || '') ? 0.025 : 0;
    const chance = Math.min(0.35, householdSpread + waterRisk + sanitationRisk + crowdRisk + coldRisk);
    if (!(person.illnessDays > 0) && chance > 0 && rng.chance(chance)) {
      person.illnessDays = 7;
      person.illnessCause = waterRisk ? 'water' : sanitationRisk ? 'sanitation' : coldRisk ? 'cold' : 'crowding';
      sickByHome.set(person.home, (sickByHome.get(person.home) || 0) + 1);
      newlySick.push(person.id);
    }
    if (person.illnessDays > 0) {
      sick++;
      person.health = Math.max(35, person.health - 2);
      person.illnessDays--;
    } else {
      person.health = Math.min(100, person.health + 0.2);
      delete person.illnessCause;
    }
  }

  const hasClinic = (town.buildings || []).some(building =>
    building.buildingId === 'clinic' && building.state === 'complete');
  if (hasClinic && pressure.cleanWater) {
    let treated = 0;
    for (const person of people) {
      if (person.illnessDays > 0 && treated < CLINIC_CAPACITY) {
        person.illnessDays = 0;
        person.illnessCause = null;
        person.health = Math.min(100, person.health + 12);
        treated++;
      }
    }
    town.health = {...pressure, sickPeople:Math.max(0, sick - treated), treatedToday:treated};
    return;
  }

  town.health = {...pressure, sickPeople:sick, treatedToday:0};
  if (newlySick.length >= 3) {
    raiseTownReport(town, 'sickness-in-town', {sickness:true, personIds:newlySick,
      where:'Town', detail:`${newlySick.length} people are sick.`});
  }
}

registerTownSystem('town-health', 30, DAY_TICKS, stepTownHealth);
