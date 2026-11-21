// Actual pedals, steering, flights, landings and gate crossings with seeded courses.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlHudView} from '../src/bowl/bowl-night.js';
import {BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const DT = 1 / 120;
const eventTypes = ['longJump', 'highJump', 'homeRun'];
const full = {longJump: [1, 28], highJump: [1, 28], homeRun: [1, 33]};
// Grip and take-off stay untouched. Pedal pressure and the timing of the
// nitro press vary across ten reproducible attempts at a young driver's pace.
const child = {
  longJump: [[.7, 45], [.72, 43], [.74, 42], [.76, 47], [.78, 38],
    [.8, 45], [.82, 50], [.84, 40], [.86, 41], [.88, 44]],
  highJump: [.61, .62, .64, .68, .72, .76, .8, .84, .88, .92].map(throttle => [throttle, Infinity]),
  homeRun: [[.66, 36], [.7, 34], [.74, 37], [.77, 35], [.8, 34],
    [.83, 31], [.87, 32], [.91, 34], [.95, 27], [.99, 49]],
};

function aim(duel, target, pace) {
  const s = duel.state, p = duel.course.worldAt(s.s, s.lateral);
  const delta = Math.atan2(target.x - p.x, target.z - p.z) - p.heading - s.headingError;
  return {steer: Math.min(1, Math.max(-1, -2 * Math.atan2(Math.sin(delta), Math.cos(delta)))),
    throttle: s.speedMph < pace ? 1 : 0, brake: s.speedMph > pace + 3 ? .5 : 0, boost: false};
}

function driveBack(duel) {
  const {course, state} = duel;
  const {gate} = state.bowlOutside, {outside} = course.features.bowl;
  const phase = course.phase(state.s), distance = gate.s - phase, depth = state.lateral - outside.back;
  // Follow the top of the terraces to the car park, then take the bend at
  // speed. Brake before the Pit Gate and steer down its throat.
  if (depth < 1 && phase < gate.s - 22) return aim(duel, course.worldAt(phase + 2, outside.back + 20), 36);
  if (distance > 6) {
    const lane = outside.back + Math.max(9, 17 - distance / 2);
    return aim(duel, course.worldAt(phase + 5, lane), distance > 18 ? 36 : 23);
  }
  return aim(duel, course.worldAt(gate.s, outside.wall - 6), 18);
}

function run(eventType, {seed = 1989, cpuDifficulty = 'easy', go = () => full[eventType], single = false,
  returnToGate = true} = {}) {
  const duel = new Duel({seed});
  duel.featureFlags = {enabled: flag => flag === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night: 1, eventType, cpuDifficulty, seed, playerId: 'driver',
    ...(single ? {turn: {driver: 'Driver'}} : {})}));
  const {state, course} = duel, night = state.bowlNight, {event} = night;
  const notes = [], flights = new Map();
  duel.onChange((_, ev) => {
    if (ev.bowlGo) notes.push({go: ev.bowlGo, at: night.clock, crushed: [...state.crushedProps]});
    if (ev.bowlScore?.cue) notes.push({sound: ev.bowlScore.cue, points: ev.bowlScore.points, at: night.clock,
      position: [state.speedMph, state.s, state.lateral], crushed: [...state.crushedProps]});
    if (ev.bowlOverWall) notes.push({over: true, at: night.clock});
    if (ev.bowlBackIn) notes.push({gate: ev.bowlBackIn.gate, at: night.clock});
    assert.equal(ev.bowlNightResult, undefined, 'a standalone jump never creates a night payout');
  });
  const initial = [state.s, state.lateral];
  while (state.status === 'countdown') duel.step(DT);
  for (let tick = 0; tick < 120 * 135 && night.phase === 'event'; tick++) {
    const [throttle, boostAt] = go(event.go.number);
    const returning = eventType === 'homeRun' && event.go.landed && state.bowlOutside;
    const input = returning
      ? returnToGate ? driveBack(duel) : {throttle: 0, brake: 1, steer: 0, boost: false}
      : {throttle, steer: 0, brake: 0, boost: state.s >= boostAt};
    duel.setInput(input);
    const fading = event.goFadeUntil, stageTime = state.stageTimeSec;
    duel.step(DT);
    if (fading != null && night.clock < fading - 1e-8) assert.equal(state.stageTimeSec, stageTime);
    if (state.airborne && event.go.launched && !event.go.landed) {
      const flight = flights.get(event.go.number) ?? {height: 0, distance: 0};
      flight.height = Math.max(flight.height, state._jumpY);
      flight.distance = Math.max(flight.distance, state.airDistance);
      flights.set(event.go.number, flight);
    }
  }
  const result = night.lastResult;
  assert.ok(result, eventType + ' ends on its own');
  assert.deepEqual(notes.filter(note => note.go).map(note => [note.go.event, note.go.go, note.go.result]),
    result.goes.map(go => [eventType, go.go, go.result]));
  assert.equal(result.goes.length, single ? 1 : 3);
  assert.equal(result.bestGo.result, Math.max(...result.goes.map(go => go.result)));
  const ready = notes.filter(note => note.sound === 'bowl.go.ready');
  assert.equal(ready.length, single ? 0 : 2);
  const played = notes.filter(note => note.go);
  ready.forEach((note, index) => {
    assert.ok(Math.abs(note.at - played[index].at - .5) < 1e-6, 'the truck moves at the blackout midpoint');
    assert.deepEqual(note.position, [0, ...initial], 'a real reset returns the truck to its run-up');
    assert.ok(!note.crushed.some(id => id.startsWith('bowl-long-bus-')), 'the buses are stood up for the next go');
  });
  assert.ok(bowlHudView(state, course).goal.split(/\s+/).length <= 8);
  return {result, notes, line: course.features.bowlJump, course, flights};
}

for (const event of eventTypes) {
  const results = child[event].map((input, i) => run(event, {seed: 1989 + i, go: () => input, single: true}).result);
  const wins = results.filter(result => result.won).length;
  assert.ok(wins >= 6 && wins <= 9, `${event}: Easy wins ${wins}/10`);
  const unboosted = run(event, {cpuDifficulty: 'hard', go: () => [1, Infinity], single: true});
  assert.equal(unboosted.result.won, false, event + ' Hard needs more than full throttle');
  const boosted = run(event, {cpuDifficulty: 'hard', single: true});
  assert.equal(boosted.result.won, true, event + ' Hard is reachable with nitro');
  const flight = boosted.flights.get(1);
  console.log(`${event}: Easy ${wins}/10 (${results.map(result => result.bestGo.result).join(', ')}); Hard ${unboosted.result.bestGo.result} without nitro, ${boosted.result.bestGo.result} with nitro (${flight.height.toFixed(1)} m high, ${flight.distance.toFixed(1)} m long).`);
}

{
  const long = run('longJump', {go: go => go === 2 ? full.longJump : [1, Infinity]});
  assert.equal(long.result.bestGo.go, 2, 'only the best run is kept');
  const first = long.notes.find(note => note.go?.go === 1);
  assert.ok(first.crushed.some(id => id.startsWith('bowl-long-bus-')), 'an ordinary landing actually crushes a jump bus');
  assert.ok(first.go.result < long.line.buses.length, 'a crushed bus is not counted as clear');
  const buses = long.line.buses;
  assert.equal(buses[0].distance, 20);
  buses.slice(1).forEach((bus, index) => assert.equal(bus.distance - buses[index].distance, 3));
  assert.equal(long.course.features.crushables.filter(prop => prop.id.startsWith('bowl-long-bus-')).length, buses.length);
  assert.equal(long.line.bar || long.line.target, undefined);
}

{
  const high = run('highJump');
  const heights = high.result.goes.map(go => go.result);
  assert.deepEqual(heights, [heights[0], heights[0] + 1, heights[0] + 2]);
  assert.deepEqual(high.notes.filter(note => note.sound === 'bowl.high.clear').map(note => note.points), [100, 60, 60]);
  assert.ok(high.line.bar && !high.line.target && !high.line.buses);
  assert.ok(!high.course.features.crushables.some(prop => prop.id.startsWith('bowl-long-bus-')));
}

{
  const home = run('homeRun');
  assert.deepEqual(home.line.target.radii, [4, 8, 12]);
  assert.ok(!home.line.bar && !home.line.buses);
  assert.ok(!home.course.features.crushables.some(prop => prop.id.startsWith('bowl-long-bus-')));
  assert.ok(home.result.goes.every(go => go.result === 4));
  const returns = home.notes.filter(note => note.gate);
  const walls = home.notes.filter(note => note.over);
  assert.equal(returns.length, 3);
  assert.equal(walls.length, 3);
  assert.ok(returns.every((note, i) => note.at - walls[i].at < 30));
  assert.deepEqual(home.notes.filter(note => note.sound === 'bowl.home.ring').map(note => note.points), [600, 600, 600]);
  const middle = run('homeRun', {single: true, cpuDifficulty: 'hard', go: () => [.66, 36]});
  assert.equal(middle.result.bestGo.result, 3, 'the real landing hit the middle ring');
  assert.equal(middle.result.won, true, 'the middle ring meets the Hard goal');
  assert.equal(middle.notes.find(note => note.sound === 'bowl.home.ring').points, 300);
  const timeout = run('homeRun', {single: true, returnToGate: false});
  assert.equal(timeout.result.won, false, 'a target landing alone does not win');
  assert.ok(timeout.notes.some(note => note.sound === 'bowl.home.ring'));
  assert.ok(!timeout.notes.some(note => note.gate));
  assert.ok(Math.abs(timeout.notes.find(note => note.go).at - timeout.notes.find(note => note.over).at - 30) < .01);
}

{
  const duel = new Duel({seed: 1989});
  assert.equal(duel.startBowlNight({night: 1, eventType: 'longJump'}), false);
  duel.featureFlags = {enabled: flag => flag === 'titan-bowl'};
  assert.equal(duel.startBowlNight({night: 1, eventType: 'carCrush'}), false, 'standalone entry is only for jumps');
  assert.ok(duel.startBowlNight({night: 1, eventIndex: 1}));
  assert.equal(duel.course.features.bowlJump, undefined, 'other events do not get the jumping pieces');
}
for (const name of ['bowl.go.ready', 'bowl.long.clear', 'bowl.high.clear', 'bowl.high.fail', 'bowl.home.ring']) assert.ok(SOUND_BANK[BOWL_SOUND_CUES[name]], name);
console.log('Three-go resets, best results, the one-second fade, event-specific pieces, five sounds and Home Run timeout passed.');
