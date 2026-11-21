// Actual pedals, steering, stunt inputs and landings with seeded courses.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlHudView} from '../src/bowl/bowl-night.js';
import {scoreStuntEvent} from '../src/bowl/bowl-show.js';
import {BIG_MO, BOWL_RESULTS, BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {bowlStrip} from '../src/bowl/bowl-hud.js';

const DT = 1 / 120;
const eventTypes = ['longJump', 'highJump'];
const full = {longJump: [1, 28], highJump: [1, 28], bestTrick: [1, Infinity]};
// Grip and take-off stay untouched. Pedal pressure and the timing of the
// nitro press vary across ten reproducible attempts at a young driver's pace.
const child = {
  longJump: [[.7, 45], [.72, 43], [.74, 42], [.76, 47], [.78, 38],
    [.8, 45], [.82, 50], [.84, 40], [.86, 41], [.88, 44]],
  highJump: [.61, .62, .64, .68, .72, .76, .8, .84, .88, .92].map(throttle => [throttle, Infinity]),
};

// Later taps and gentler starts sometimes leave too little time to turn.
const childTrickTaps = [
  [.87, 36, 42, 51], [.82, 54, 68, 64], [.78, 70, 82, 90], [.90, 87, 95, 131], [.74, 105, 115, 149],
  [.83, 126, 135, 156], [.71, 137, 146, 174], [.72, 153, 162, 191], [.68, 165, 177, 200], [.88, 184, 194, 211],
];

function tapTrick(input, trick, airTick, tapAt) {
  input.throttle = 0;
  input.boost = false;
  if (trick === 'tripleCombo') {
    input.steer = +(airTick >= tapAt && airTick < tapAt + 250);
    input.boost = input.steer > 0;
    input.brake = +(airTick >= tapAt && airTick < tapAt + 220);
    return;
  }
  const duration = trick === 'doubleBackflip' ? 112 : 1;
  if (airTick < tapAt || airTick >= tapAt + duration) return;
  if (trick === 'barrelRoll') Object.assign(input, {steer: 1, boost: true});
  if (trick === 'backflip' || trick === 'doubleBackflip') input.brake = 1;
  if (trick === 'frontFlip') input.throttle = 1;
}

function run(eventType, {seed = 1989, cpuDifficulty = 'easy', go = () => full[eventType], single = false,
  tricks = [], taps = [30, 30, 30], lateBackflip = false, boostFromStart = false} = {}) {
  const duel = new Duel({seed});
  duel.featureFlags = {enabled: flag => flag === 'titan-bowl'};
  const entry = eventType === 'bestTrick' ? {night: 4, eventIndex: 1} : {night: 1, eventType};
  assert.ok(duel.startBowlNight({...entry, cpuDifficulty, seed, playerId: 'driver',
    ...(single ? {turn: {driver: 'Driver'}} : {})}));
  const {state, course} = duel, night = state.bowlNight, {event} = night;
  const notes = [], flights = new Map();
  let secondGoSpeed = null, airTick = 0, activeGo = null;
  duel.onChange((_, ev) => {
    if (ev.boostStarted) notes.push({boost: event.go.number});
    if (ev.bowlGo) notes.push({go: ev.bowlGo, at: night.clock, crushed: [...state.crushedProps]});
    if (ev.bowlScore?.cue) notes.push({sound: ev.bowlScore.cue, points: ev.bowlScore.points, at: night.clock,
      position: [state.speedMph, state.s, state.lateral], crushed: [...state.crushedProps]});
    if (ev.bowlRound) notes.push({round: ev.bowlRound, at: night.clock});
    if (ev.bowlScore?.type === 'bowlTrick') notes.push({trickPoints: ev.bowlScore.points, attempt: event.go.number});
    if (ev.bowlCaption) notes.push({caption: ev.bowlCaption.id});
    if (ev.bowlTrick?.landing === 'slam') notes.push({slam: event.go.number});
    assert.equal(ev.bowlNightResult, undefined, 'a standalone jump never creates a night payout');
  });
  const initial = [state.s, state.lateral];
  while (state.status === 'countdown') duel.step(DT);
  for (let tick = 0; tick < 120 * 135 && night.phase === 'event'; tick++) {
    if (activeGo !== event.go.number) {
      activeGo = event.go.number;
      airTick = 0;
    }
    const [throttle, boostAt] = go(activeGo);
    const input = {throttle, steer: 0, brake: 0, boost: state.s >= boostAt};
    if (boostFromStart && activeGo === 1 && !state.airborne) input.boost = true;
    if (eventType === 'bestTrick' && state.airborne) {
      tapTrick(input, tricks[activeGo - 1], ++airTick, taps[activeGo - 1]);
    }
    if (lateBackflip && event.go.number === 1 && state.airborne && state._verticalSpeed < 0 && state.airHeight < 4) {
      Object.assign(input, {throttle: 0, boost: false, brake: 1});
    }
    duel.setInput(input);
    const fading = event.goFadeUntil, stageTime = state.stageTimeSec;
    duel.step(DT);
    if (fading != null && night.clock < fading - 1e-8) assert.equal(state.stageTimeSec, stageTime);
    if (event.go.number === 2 && event.go.startedAt != null && night.clock - event.go.startedAt >= 1) {
      secondGoSpeed ??= state.speedMph;
    }
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
  return {result, notes, facts: event.facts, line: course.features.bowlJump, course, flights, secondGoSpeed,
    rounds: notes.filter(note => note.round).map(note => note.round), finishCaption: bowlHudView(state, course).caption};
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
  assert.ok(!long.facts.some(fact => fact.type === 'crush'), 'flattening the row earns no Long Jump points');
  assert.ok(long.result.score > long.result.goes[0].score, 'clearing the buses scores higher than crushing them');
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
  assert.equal(high.result.score, high.result.bestGo.score + 160, 'earlier clears add only their bar bonus');
  const mixed = run('highJump', {cpuDifficulty: 'hard', go: go => go === 1 ? full.highJump : [1, Infinity]});
  assert.deepEqual(mixed.result.goes.map(go => go.result), [12, 0, 0]);
  assert.equal(mixed.result.score, mixed.result.bestGo.score, 'missed bars do not add ordinary jump points');
  const roofLanding = run('highJump', {cpuDifficulty: 'hard', lateBackflip: true});
  assert.ok(roofLanding.notes.some(note => note.slam === 1), 'a real late backflip lands on the roof');
  assert.ok(roofLanding.secondGoSpeed > 30, 'the next go pulls away without the previous landing recovery');
  assert.ok(high.line.bar && !high.line.target && !high.line.buses);
  assert.ok(!high.course.features.crushables.some(prop => prop.id.startsWith('bowl-long-bus-')));
}

{
  const singles = ['backflip', 'frontFlip', 'barrelRoll'];
  const easy = childTrickTaps.map(([throttle, ...taps], index) => run('bestTrick', {
    seed: 1989 + index, go: () => [throttle, Infinity], tricks: singles, taps,
  }));
  const wins = easy.filter(run => run.result.won).length;
  assert.ok(wins >= 6 && wins <= 9, `Best Trick Easy wins ${wins}/10`);
  console.log(`bestTrick: Easy ${wins}/10 (${easy.map(run => run.rounds.map(round => round.points).join('/')).join(', ')}).`);

  for (const cpuDifficulty of ['easy', 'medium', 'hard']) {
    const straight = run('bestTrick', {cpuDifficulty});
    assert.equal(straight.result.won, false);
    assert.ok(straight.rounds.every(round => round.points === 0 && !round.won));
    assert.ok(straight.result.score > 0, 'ordinary landings score without counting as tricks');
  }
  const boostedRunUp = run('bestTrick', {boostFromStart: true, tricks: ['backflip']});
  assert.ok(boostedRunUp.notes.some(note => note.boost === 1), 'Space on the run-up starts nitro');
  assert.deepEqual(boostedRunUp.result.goes[0].tricks, ['backflip'], 'only the legal air trick scores');
  assert.ok(boostedRunUp.rounds[0].won && boostedRunUp.rounds[0].points > 0, 'the air trick beats the rival');
  const repeat = run('bestTrick', {cpuDifficulty: 'medium', tricks: Array(3).fill('backflip')});
  assert.equal(repeat.result.won, false);
  assert.deepEqual(repeat.rounds.map(round => round.won), [false, false, false]);
  assert.ok(repeat.notes.some(note => note.caption === 'best.repeat'));
  assert.equal(repeat.finishCaption, BIG_MO['best.repeat'], 'the third loss reason survives the finish');
  const varied = run('bestTrick', {cpuDifficulty: 'medium', tricks: singles});
  assert.equal(varied.result.won, false, 'singles alone lose on Medium');
  assert.deepEqual(varied.result.goes.map(go => go.tricks), singles.map(trick => [trick]));
  assert.ok(varied.rounds.every(round => !round.won && round.rival.points > round.points));
  const rivalsScored = [...easy[0].rounds.slice(1), ...varied.rounds].map(round => round.rival);
  assert.ok(rivalsScored.some(rival => rival.featured && rival.fresh && rival.crowd > 0));
  for (const rival of rivalsScored) {
    const points = rival.basePoints * (rival.featured ? 2 : 1);
    assert.equal(rival.points, scoreStuntEvent({type: 'bowlTrick', points, fresh: rival.fresh, repeat: rival.repeat}, rival.crowd).points,
      'the rival gets the same featured, variety and round-start crowd points as the driver');
  }
  for (const round of varied.rounds) {
    const scored = varied.notes.filter(note => note.attempt === round.round);
    assert.equal(round.points, scored.reduce((sum, note) => sum + note.trickPoints, 0), 'only the awarded trick points decide the round');
  }
  assert.equal(varied.result.score, varied.result.bestGo.score, 'the best go keeps its whole score');
  assert.ok(!varied.line.bar && !varied.line.buses && !varied.line.target);
  assert.ok(!varied.course.features.crushables.some(prop => prop.id.startsWith('bowl-long-bus-')));

  const hardSingles = run('bestTrick', {cpuDifficulty: 'hard', tricks: singles});
  assert.equal(hardSingles.result.won, false);
  const hardDouble = run('bestTrick', {cpuDifficulty: 'hard', go: () => [1, 26],
    tricks: ['tripleCombo', 'tripleCombo'], taps: [4, 4, 4]});
  assert.equal(hardDouble.result.won, true);
  assert.equal(hardDouble.result.roundsWon, 2);
  assert.equal(BOWL_RESULTS.eventJump(hardDouble.result), 'You won 2 of the 3 rounds against Big Kettle.');
  assert.deepEqual(hardDouble.rounds.map(round => round.won), [true, true, false], 'the third go is played even with two wins');
  assert.deepEqual(hardDouble.notes.filter(note => note.sound?.startsWith('bowl.best.round.')).map(note => note.sound),
    ['bowl.best.round.won', 'bowl.best.round.won', 'bowl.best.round.lost']);

  const timeout = run('bestTrick', {go: () => [0, Infinity]});
  const closes = timeout.notes.filter(note => note.go);
  const starts = timeout.notes.filter(note => ['bowl.best.rival', 'bowl.best.rival.slam'].includes(note.sound));
  assert.deepEqual(starts.map(note => note.sound), ['bowl.best.rival.slam', 'bowl.best.rival', 'bowl.best.rival']);
  assert.equal(timeout.notes.filter(note => note.caption === 'best.noTrick').length, 3);
  assert.equal(timeout.finishCaption, BIG_MO['best.noTrick']);
  assert.ok(closes.every((note, index) => Math.abs(note.at - starts[index].at - 12) < 1e-6));
  assert.ok(starts.slice(1).every((note, index) => Math.abs(note.at - closes[index].at - 1) <= DT + 1e-6));
  assert.equal(timeout.result.score, 0);
}

{
  const duel = new Duel({seed: 1989});
  assert.equal(duel.startBowlNight({night: 1, eventType: 'longJump'}), false);
  duel.featureFlags = {enabled: flag => flag === 'titan-bowl'};
  assert.equal(duel.startBowlNight({night: 1, eventType: 'carCrush'}), false, 'standalone entry is only for jumps');
  assert.ok(duel.startBowlNight({night: 1, eventIndex: 1}));
  assert.equal(duel.course.features.bowlJump, undefined, 'other events do not get the jumping pieces');
  assert.ok(duel.startBowlNight({night: 4, eventIndex: 1, cpuDifficulty: 'medium'}));
  const strip = bowlStrip(duel.state, bowlHudView(duel.state, duel.course));
  assert.equal(strip.gapLabel, 'ROUND 1 OF 3');
  assert.equal(strip.crushLabel, 'BIG KETTLE: DOUBLE BACKFLIP 450');
  assert.equal(strip.chainLabel, 'YOU 0, BIG KETTLE 0');
}
for (const name of ['bowl.go.ready', 'bowl.long.clear', 'bowl.high.clear', 'bowl.high.fail',
  'bowl.best.rival', 'bowl.best.rival.slam', 'bowl.best.round.won', 'bowl.best.round.lost']) {
  assert.ok(SOUND_BANK[BOWL_SOUND_CUES[name]], name);
}
console.log('Three-go resets, best results, the one-second fade, event-specific pieces, sound cues and Best Trick timeout passed.');
