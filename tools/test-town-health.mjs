import assert from 'node:assert/strict';
import {makeRng} from '../src/rng.js';
import {registeredTownSystems} from '../src/town/town-sim.js';
import {stepTownHealth} from '../src/town/town-health.js';

function population(count) {
  return Array.from({length:count}, (_, index) => ({
    id:`person-${index + 1}`, home:`home-${Math.floor(index / 5)}`,
    health:100, illnessDays:0, homeType:'canvas',
  }));
}

const town = {tick:24n, people:population(300), buildings:[], peopleConditions:{waterLitresPerPerson:0, shelterPlaces:100}};
const rng = makeRng(1854);
stepTownHealth({town, rng, calendar:{season:'Winter'}});
assert.ok(town.health.sickPeople >= 3, 'bad water, poor shelter and winter cause an outbreak');
assert.ok(town.people.every(person => person.health >= 35), 'illness never kills people');
assert.ok(town.reports.some(report => report.eventId === 'sickness-in-town'), 'an outbreak raises the sickness report');
assert.ok(town.people.some(person => person.illnessCause === 'water'), 'the sickness records its cause');

const clinicTown = {
  tick:24n,
  people:population(10).map(person => ({...person, illnessDays:5, illnessCause:'water', health:70})),
  buildings:[{buildingId:'clinic', state:'complete'}],
  utilities:{waterResult:{taps:[{litresPerDay:150, quality:{stage:'chlorine'}}]}},
};
stepTownHealth({town:clinicTown, rng:makeRng(2), calendar:{season:'Summer'}});
assert.equal(clinicTown.health.treatedToday, 10, 'a clinic with enough clean water treats sick people');
assert.ok(clinicTown.people.every(person => person.illnessDays === 0 && person.health > 70));

assert.ok(registeredTownSystems().some(system => system.name === 'town-health'), 'health is registered with the town simulation');
console.log('Town health checks passed.');
