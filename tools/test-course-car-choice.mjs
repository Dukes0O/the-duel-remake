import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { CARS, COURSE } from '../src/config.js';

// Ownership is App's responsibility. The simulation must never replace an
// accepted car with an event's recommendation, including specialist trials.
let checks = 0, combinations = 0;
for (const car of Object.keys(CARS)) for (const [startStage, event] of COURSE.entries()) {
  const duel = new Duel({ seed: 1989 }); duel.startCampaign({ car, startStage, mode: 'timetrial' });
  assert.equal(duel.state.car, car, `${event.id}: entry preserves ${car}`); checks++;
  assert.equal(duel.car.name, CARS[car].name, `${event.id}: actual tuning belongs to ${car}`); checks++;
  assert.equal(duel.course.def, event, `${event.id}: car choice cannot silently substitute the course`); checks++;
  assert.equal(duel._vehicleSpec(duel.state).mass, CARS[car].mass || 1450, `${event.id}: collision mass belongs to the selected car`); checks++;
  assert.equal(duel.state.lapsTotal, 2, `${event.id}: car freedom does not bypass required laps`); checks++;
  duel.state.status = 'racing'; duel.setInput({ throttle: 1 }); duel.step(1 / 120);
  assert.equal(duel.state.car, car, `${event.id}: the first real driving step preserves ${car}`); checks++;
  assert.ok(Number.isFinite(duel.state.speedMph) && duel.state.speedMph >= 0, `${event.id}: selected car has valid driving state`); checks++;
  combinations++;
}
console.log(`Course/car choice: ${checks} checks across ${combinations} raw simulation entries (${Object.keys(CARS).length} cars × ${COURSE.length} events).`);
