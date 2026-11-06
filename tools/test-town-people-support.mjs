import assert from 'node:assert/strict';
import {createTown, deserializeTown, serializeTown, stepTown, TOWN_TIME} from '../src/town/index.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function stepMonth(town) {
  for (let tick = 0; tick < TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth; tick++) stepTown(town);
}

const town = createTown(1989, 'Support test');
stepMonth(town);
check(town.people.length === 12, 'a town with no measured water or finished homes keeps its twelve founders');
check(town.peopleConditions.shelterPlaces === 12, 'the founders camp gives the first twelve shelter places');
check(town.peopleConditions.paintedHomePlaces === 0, 'unpainted founders camp adds no painted home places');
check(town.peopleConditions.waterLitresPerPerson === 0, 'a town with no delivered water measures zero water per person');
check(town.peopleConditions.waterNeedLitresPerPerson === town.weather.waterLitresPerPerson,
  'people support uses the same water need as the current weather');
check(!town.book.some(entry => entry.type === 'arrival'), 'people do not arrive without measured water and extra shelter');

const oldSave = {
  version: 1, id: 'town-old', name: 'Old town', seed: 7, rngState: 7, tick: 0,
  calendar: {year: 1, month: 1, day: 1}, people: [], buildings: [],
};
const loaded = deserializeTown(JSON.stringify(oldSave));
check(loaded.name === 'Old town' && loaded.people.length === 0, 'a town saved before support measurements still loads');
const beforeVisit = serializeTown(town);
const measured = town.peopleConditions.shelterPlaces;
check(measured === 12 && serializeTown(town) === beforeVisit, 'reading the measured support values does not change the town');

console.log(`Town people support: ${checks} checks passed.`);
