// BOWL-HOOKS: Show Night in the game, headless. One scripted night from the
// start to the results; the rules, the purse and the saves are checked without
// driving. Memory-only saves.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createProfile, isCarUnlocked, loadPlayers, savePlayers} from '../src/progression.js';
import {BOWL_PURSE, SHOW_TRUCK, bowlLayout, crushTarget, bowlHudView, bowlNightPlayable, settleShowNight,
  showTruckFor} from '../src/bowl/bowl-night.js';
import {BIG_MO, BOWL_GOALS, BOWL_RESULTS, BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {scoreFreestyle, scoreStuntEvent} from '../src/bowl/bowl-show.js';
import {bowlOpeningLines} from '../src/bowl/bowl-hud.js';
import {Course} from '../src/course.js';
import {BOWL_COURSE} from '../src/bowl/bowl-course.js';
import {CAR_CRUSH_DRESSING} from '../src/bowl/bowl-crush-field.js';
import {makeRng} from '../src/rng.js';
import {createCarCrushDriver} from './scenarios/bowl-night-pay.mjs';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const DT = 1 / 120;
const memory = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
};
const showDuel = (enabled = true) => {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => enabled && name === 'titan-bowl'};
  return duel;
};

// The switch gates the night, and a night runs only when every event has its rules.
{
  const off = showDuel(false);
  ok(!off.startBowlNight({night: 1}) && !off.state.bowlNight, 'with titan-bowl off there is no Show Night');
  ok(bowlNightPlayable(1) && bowlNightPlayable(2), 'nights one and two have every event');
  // BOWL-RIVALS registered Last Truck Rolling and BOWL-REX-FIGHT the Scrapasaurus, so every night now has every event.
  ok([3, 4, 5].every(night => bowlNightPlayable(night)), 'nights three to five have every event (Last Truck Rolling, and the Scrapasaurus on night five)');
  ok(!showDuel().startBowlNight({night: 6}) && !bowlNightPlayable(6), 'a night the show does not have does not start');
}

// The truck: the player's own Titan, or the show's truck lent at factory settings.
{
  equal(showTruckFor({owned: false, upgrades: {engine: 3}}), {car: SHOW_TRUCK, lent: true, upgrades: {}},
    'a player with no Titan is lent the show truck at factory settings');
  equal(showTruckFor({owned: true, upgrades: {engine: 3}}), {car: SHOW_TRUCK, lent: false, upgrades: {engine: 3}},
    'a Titan owner drives their own truck with its upgrades');
}

// Every place comes from the course's own data (course.features.bowl, BOWL-EXPAND),
// so a rebuilt Bowl moves the events with it.
{
  const bowl = new Course(BOWL_COURSE, 1989), layout = bowlLayout(bowl), show = bowl.features.bowl;
  const rowS = [...new Set(bowl.features.crushables.map(prop => prop.s))].sort((a, b) => a - b);
  ok(layout.crush.startS === show.crush.startS && layout.crush.lateral === show.crush.lateral &&
    layout.crush.endS === show.crush.endS && layout.rows.length === rowS.length,
    'the Car Crush runs from the course\'s start along its crush line, over its rows');
  equal(layout.parked.map(car => [car.s, car.lateral]), show.launchCars.map(car => [car.s, car.lateral]),
    'Freestyle\'s parked cars stand at the course\'s launch cars');
  equal(layout.lanes.map(lane => [lane.s, lane.lateral]), show.lanes.slice(0, 2).map(lane => [lane.s, lane.lateral ?? 0]),
    'Side by Side uses the course\'s two mirrored lanes, half a lap apart');
  ok(Math.abs(layout.lanes[1].s - layout.lanes[0].s - bowl.length / 2) < 1e-6, 'the lanes start half a lap apart');
  // A course without the show's data still gets places from its own shapes.
  const plain = {length: 400, def: {scrapdome: {floorHalfWidth: 12}}, roadHalfWidthAt: () => 12,
    features: {ramps: [{start: 20, end: 40}], crushables: [0, 1, 2].map(i => ({...bowl.features.crushables[i], s: 200 + 10 * i}))}};
  const derived = bowlLayout(plain);
  ok(derived.crush.startS < 200 && derived.lanes[1].s === 200 && derived.parked.length === 2 &&
    derived.parked.every(car => !(car.s >= 20 && car.s <= 40) && !(car.s >= 197 && car.s <= derived.crush.endS)),
    'without the show\'s data the places come from the crush line, the ramps and the ring');
  equal(['medium', 'hard'].map(cpuDifficulty => crushTarget({cpuDifficulty})), [18, 26],
    'Medium and Hard use their count targets');
  equal([BOWL_RESULTS.eventCrush({count: 5, total: 31}), BOWL_RESULTS.eventFullHouse(960)],
    ['You crushed 5 of 31 pieces.', 'A Full House added 960 points.'], 'the results show the count and Full House bonus');
}

// A lost event is tried again; nothing moves the night on.
{
  const duel = showDuel(), results = [];
  duel.onChange((_, ev) => ev.bowlEventResult && results.push(ev.bowlEventResult));
  ok(duel.startBowlNight({night: 1, cpuDifficulty: 'easy'}), 'night one starts');
  for (let i = 0; i < 120 * 65 && !results.length; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  const night = duel.state.bowlNight;
  ok(results.length === 1 && !results[0].won && results[0].event === 'carCrush', 'a truck that never moves loses the Car Crush');
  ok(duel.state.status === 'bowl_break' && night.phase === 'result' && night.show.eventIndex === 0, 'the night waits at the same event');
  ok(duel.continueBowlNight() && night.event.type === 'carCrush' && night.event.attempt === 2, 'the next start is the same event, attempt two');
  ok(duel.state.s === bowlLayout(duel.course).crush.startS && duel.state.status === 'countdown', 'the retry starts at the head of the crush line');
}

// Car Crush itself ends only at the clock or a Full House. Exercise the
// ordinary simulation path for the unsteered run, the slow drivers and a
// jump onto each pancake car.
function openCrush(level = 'easy', seed = 1989) {
  const duel = showDuel();
  duel.startBowlNight({night: 1, cpuDifficulty: level, seed});
  return duel;
}

function driveCrush(duel, drive) {
  for (let i = 0; i < 120 * 65 && duel.state.status !== 'bowl_break'; i++) {
    duel.setInput(drive(duel));
    duel.step(DT);
  }
  return duel.state.bowlNight.lastResult;
}

{
  const duel = openCrush('medium');
  const result = driveCrush(duel, () => ({throttle: 1, steer: 0, brake: 0, boost: false}));
  equal(duel.state.crushedProps, [1, 4, 7, 10, 13].map(index => `bowl-crush-${index}`),
    'holding W reaches the same five pieces of the original middle lane in order');
  ok(!result.won && result.count === 5 && Math.abs(duel.state.stageTimeSec - 60) < DT / 2,
    'holding W with no steering crushes five pieces and takes the full minute');
}

{
  const counts = Array.from({length: 10}, (_, index) => {
    const seed = 1989 + index, random = makeRng(seed ^ 0x43525553);
    const driver = createCarCrushDriver({pace: random.range(22, 30), laneBias: random.range(-1.9, 1.9), random});
    return driveCrush(openCrush('easy', seed), driver).count;
  });
  const target = crushTarget({cpuDifficulty: 'easy'});
  equal(target, Math.min(16, [...counts].sort((a, b) => b - a)[5]),
    'Easy uses the highest count reached by six slow seeded drives, capped at 16');
  const wins = counts.filter(count => count >= target).length;
  ok(wins >= 6 && wins < counts.length, 'a slow player can win Easy and can also fall short');
  console.log(`Car Crush Easy target ${target}, ${wins}/10 wins. Counts: ${counts.join(', ')}.`);
}

function racingCrush() {
  const duel = openCrush();
  while (duel.state.status === 'countdown') duel.step(DT);
  return duel;
}

function placeCrushTruck(duel, s, lateral, speedMph) {
  const y = duel.course.groundAt(s, lateral).y;
  Object.assign(duel.state, {s, prevS: s, lateral, prevLateral: lateral, headingError: 0,
    speedMph, groundHeight: y, prevGroundHeight: y, airborne: false, _jumpY: y, _verticalSpeed: 0});
}

for (const rampId of ['jump-kicker', 'crush-kicker', 'table']) {
  const duel = racingCrush(), pieces = [];
  const ramp = duel.course.features.ramps.find(item => item.id === rampId);
  const car = duel.course.features.crushables.find(item => item.bowlPancakeRamp === rampId);
  duel.onChange((_, ev) => { if (ev.bowlCrush) pieces.push(ev.bowlCrush); });
  placeCrushTruck(duel, ramp.start - 20, ramp.off, 48);
  duel.setInput({throttle: 1, steer: 0, brake: 0, boost: false});
  for (let i = 0; i < 720 && !pieces.some(hit => hit.id === car.id); i++) duel.step(DT);
  const hit = pieces.find(piece => piece.id === car.id);
  ok(hit?.pancake && hit.points === 105 && hit.cues.includes('bowl.crush.pancake'),
    `${rampId} sends the show truck down on its car for triple points and the pancake cue`);
}

{
  const duel = racingCrush(), hits = [];
  duel.onChange((_, ev) => { if (ev.bowlCrush?.id.startsWith('bowl-row-')) hits.push(ev.bowlCrush.id); });
  placeCrushTruck(duel, 55, 2, 18);
  duel.state.headingError = Math.PI / 2;
  duel.setInput({throttle: 1, steer: 0, brake: 0, boost: false});
  for (let i = 0; i < 120 * 3 && hits.length < 5; i++) duel.step(DT);
  equal(hits, [0, 1, 2, 3, 4].map(index => `bowl-row-${index}`),
    'one pass across the stand-side row sweeps up all five cars');
}

{
  const duel = racingCrush(), hits = [];
  const first = duel.course.features.crushables.find(item => item.id === 'bowl-bus-pile-0');
  duel.onChange((_, ev) => { if (ev.bowlCrush) hits.push(ev.bowlCrush); });
  placeCrushTruck(duel, first.s, first.off, 17);
  Object.assign(duel.state, {airborne: true, prevAirHeight: first.height + .2, airHeight: first.height + .1});
  duel._crushProps(duel.state);
  equal(hits.length, 0, 'overflight alone does not touch the Bus Pile');
  duel.state.airHeight = first.height - .1;
  duel.state._verticalSpeed = -6;
  duel._crushProps(duel.state);
  ok(hits.length === 3 && hits[0].pancake && hits[0].points === 600 &&
    hits.every((hit, index) => index === 0 || hit.points === 0),
  'a real roof crossing below 30 mph collapses the pile and triples its one award');
}

{
  const duel = racingCrush(), {state, course} = duel;
  const prop = course.features.crushables.find(item => item.id === 'bowl-bus-pile-0');
  const roof = prop.y + prop.height;
  placeCrushTruck(duel, 242.809, prop.off, 17);
  state.prevS = 242.746;
  Object.assign(state, {airborne: true, _verticalSpeed: -6,
    prevAirHeight: roof + .02 - course.groundAt(state.prevS, prop.off).y,
    airHeight: roof - .18 - course.groundAt(state.s, prop.off).y});
  duel._crushProps(state);
  ok(state.speedMph < 17 && state.crushedProps.length === 0,
    'descending past roof height before reaching the pile is still a slow side impact');
}

for (const [speed, count] of [[29, 0], [30, 3]]) {
  const duel = racingCrush(), hits = [], ticks = [];
  const first = duel.course.features.crushables.find(item => item.id === 'bowl-bus-pile-0');
  duel.onChange((state, ev) => {
    if (ev.bowlCrush) hits.push(ev.bowlCrush);
    if (ev.bowlScore?.cue === 'bowl.crush.chain') ticks.push(state.bowlNight.clock);
  });
  placeCrushTruck(duel, first.s, first.off, speed);
  duel._crushProps(duel.state);
  equal(hits.length, count, `the Bus Pile at ${speed} mph`);
  if (count) {
    equal(hits.map(hit => hit.chain), [1, 2, 3], 'all three buses add to the chain');
    equal(hits.reduce((total, hit) => total + hit.points, 0), 200, 'one Bus Pile award pays 200 points');
    for (let i = 0; i < 36; i++) duel.step(DT);
    ok(ticks.length === 2 && ticks[1] - ticks[0] >= .1, 'both bonus links of a fresh pile sound separately');
  }
}

{
  const duel = racingCrush(), hits = [];
  let fullHouse, houseCaption;
  duel.onChange((_, ev) => {
    if (ev.bowlCrush) hits.push(ev.bowlCrush);
    if (ev.bowlFullHouse) fullHouse = ev.bowlFullHouse;
    if (ev.bowlCaption?.id === 'moment.fullHouse') houseCaption = ev.bowlCaption.text;
  });
  const field = duel.course.features.crushables, cars = field.filter(prop => prop.sourceKind === 'junkCar');
  const hit = prop => duel.emit({propCrushed: {id: prop.id, kind: prop.sourceKind, byPlayer: true}});
  for (const car of cars.slice(0, 4)) hit(car);
  equal(hits.map(item => item.points), [35, 44, 53, 61], 'a four-piece chain pays x1, x1.25, x1.5 and x1.75');
  duel.state.stageTimeSec = 3.01;
  duel.step(DT);
  equal(duel.state.bowlNight.event.chain, 0, 'the chain disappears when three seconds pass without another hit');
  hit(cars[4]);
  equal(hits.at(-1).points, 35, 'the next piece starts a new chain');
  duel.state.stageTimeSec = 12;
  for (const item of field.filter(prop => !prop.bowlCrushGroup)) hit(item);
  const buses = field.filter(prop => prop.bowlCrushGroup).map(prop => prop.id);
  duel.emit({propCrushed: {id: buses[0], kind: 'bowlBusPile', groupIds: buses, byPlayer: true}});
  duel.step(DT);
  const result = duel.state.bowlNight.lastResult;
  ok(result?.won && result.fullHouse && result.count === 31, 'a Full House ends the event with all 31 pieces');
  equal(fullHouse?.bonus, 48 * 20, 'a Full House at twelve seconds pays for 48 whole seconds remaining');
  ok(houseCaption?.includes('Full House'), 'Big Mo calls the Full House at the end');
  equal(result.score, hits.reduce((total, item) => total + item.points, fullHouse.bonus),
    'the published result contains the chain points and the Full House bonus once each');
}

// Keep the original 32 mph approach as a clearance check. At that pace the
// centre kicker sends the truck past the first car well inside its lane.
{
  const duel = showDuel();
  duel.startBowlNight({night: 1, eventIndex: 1, cpuDifficulty: 'easy', seed: 1989});
  const s = duel.state, car = duel.state.traffic[0];
  for (let i = 0; i < 1200 && s.s < car.s; i++) {
    const line = s.s > car.s - 14 && s.s < car.s + 4 ? car.lateral : 0;
    duel.setInput(s.airborne ? {throttle: 0, brake: 0, steer: 0, boost: false} :
      {throttle: +(s.speedMph < 32), brake: 0, steer: Math.max(-1, Math.min(1, (s.lateral - line) * .3 + s.headingError * 1.5)), boost: false});
    duel.step(DT);
  }
  ok(s.s >= car.s && Math.abs(s.lateral - car.lateral) > 7 && !car.crushed,
    'at 32 mph the truck passes the parked car on a separate line without crushing it');
}

// One scripted night, the way in to the results: night one on Easy in the lent truck.
// The driver keeps to the middle of the floor, and in Freestyle swings over to the
// first parked car to launch off it.
const run = (() => {
  const driveCrush = createCarCrushDriver();
  const duel = showDuel(), log = {captions: [], scores: [], events: [], night: null, cues: new Set(), hud: null};
  duel.onChange((_, ev) => {
    if (ev.bowlCaption) { log.captions.push(ev.bowlCaption.id); log.cues.add(ev.bowlCaption.cue); }
    if (ev.bowlScore) { log.scores.push({...ev.bowlScore, event: duel.state.bowlNight.event.type}); log.cues.add(ev.bowlScore.cue); }
    if (ev.bowlEventResult) { log.events.push(ev.bowlEventResult); log.cues.add(ev.cue); }
    if (ev.bowlNightResult) log.night = ev.bowlNightResult;
  });
  ok(duel.startBowlNight({night: 1, cpuDifficulty: 'easy', owned: false, playerId: 'bowl-player', seed: 1989}), 'the night starts');
  ok(duel.course.def.bowl === true && duel.state.car === SHOW_TRUCK && duel.state.bowlNight.lent, 'the night is on the Bowl in the show truck');
  for (let i = 0; i < 120 * 300; i++) {
    const s = duel.state;
    if (s.status === 'bowl_break') {
      ok([s, ...s.opponents].every(truck => Object.values(truck.damageZones).every(value => value === 0)),
        'Car Crush, Freestyle and Side by Side finish with no wear on any truck');
      // The results stay on screen while Big Mo finishes speaking.
      if (s.bowlNight.phase === 'complete') { for (let wait = 0; wait < 120 * 10; wait++) duel.step(DT); break; }
      duel.continueBowlNight(); continue;
    }
    const freestyle = s.bowlNight.event.type === 'freestyle', layout = bowlLayout(duel.course);
    // Freestyle: the centre line over the kickers, swinging out to the first launch car on the way past it.
    const car = layout.parked[0], lapS = ((s.s % duel.course.length) + duel.course.length) % duel.course.length;
    const line = freestyle && lapS > car.s - 14 && lapS < car.s + 4 ? car.lateral : s.bowlNight.event.type === 'sideBySide' ? layout.lanes[0].lateral : 0;
    if (s.bowlNight.event.type === 'carCrush') duel.setInput(driveCrush(duel));
    else if (freestyle && s.airborne) duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    else duel.setInput({throttle: s.speedMph < (freestyle ? 30 : 32) ? 1 : 0, brake: 0, steer: Math.max(-1, Math.min(1, (s.lateral - line) * .3 + (s.headingError || 0) * 1.5)), boost: false});
    duel.step(DT);
    if (freestyle && s.stageTimeSec > 20 && !log.hud) log.hud = bowlHudView(s, duel.course);
  }
  return {duel, log};
})();
{
  const {duel, log} = run, night = duel.state.bowlNight;
  equal(log.events.map(result => [result.event, result.won]), [['carCrush', true], ['freestyle', true], ['sideBySide', true]],
    'the night runs its three events in order and each is won');
  ok(duel.state.status === 'bowl_break' && night.phase === 'complete' && night.show.complete, 'the night ends on its results');
  ok(log.night?.won && log.night.night === 1 && log.night.purse === BOWL_PURSE[0] && log.night.lent, 'the night result carries the purse');
  equal(log.night.score, log.events.reduce((sum, result) => sum + result.score, 0), 'the night score adds up the events');
  for (const result of log.events) {
    const points = log.scores.filter(score => score.event === result.event).reduce((sum, score) => sum + score.points, 0);
    ok(Number.isSafeInteger(result.score) && points === result.score, `${result.event}: the score is the sum of its scored stunts`);
  }
  ok(log.events[0].count >= crushTarget({cpuDifficulty: 'easy'}), 'two passes through the field reach the Easy count');
  ok(night.attempts[0].event === 'carCrush' && night.attempts[0].won, 'the first Car Crush run is won, with no wall in the way');
  const launch = log.scores.find(score => score.type === 'carLaunch' && score.event === 'freestyle');
  ok(launch, 'the Titan launches off a parked car in Freestyle');
  ok(log.scores.filter(score => score.type === 'landedJump').every(jump => jump.points < launch.points),
    'the launch off a car scores more than any ramp jump');
  equal(bowlOpeningLines(1, true), [BIG_MO['night.1.open'], BIG_MO['lent.truck']],
    'the opening card carries Big Mo’s welcome and the line about the lent truck');
  ok(log.captions[0] === 'event.carCrush.intro' && !log.captions.includes('night.1.open') &&
    !log.captions.includes('lent.truck') && log.captions.at(-1) === 'night.won',
    'the first event starts with its own line, and Big Mo closes the show');
  ok(['carCrush', 'freestyle', 'sideBySide'].every(type => log.captions.includes(`event.${type}.intro`) &&
    log.captions.includes(`event.won.${type}`)), 'Big Mo introduces and ends every event');
  ok(log.hud && log.hud.name === 'Freestyle' && log.hud.timeLeft > 0 && log.hud.timeLeft < 90 &&
    Number.isFinite(log.hud.crowd) && log.hud.goal === 'Beat Old Bess: 310.', 'the HUD reads the event, clock, crowd and goal');
  ok(['bowl.mo', 'bowl.crowd.rise', 'bowl.event.won'].every(cue => log.cues.has(cue)), 'each new event names its sound cue');
  const freestyle = log.events.find(result => result.event === 'freestyle');
  ok(freestyle.crowdPeak >= 25, `the crowd meter rises visibly even on a plain line over the kickers (peak ${freestyle.crowdPeak})`);
  // A good Freestyle: a big stunt every 7 seconds (big air, a launch off a car, the Table, a flip, a kicker, a donut).
  const stunts = [{type: 'landedJump', durationSeconds: 2.2, distanceMeters: 50}, {type: 'carLaunch', durationSeconds: 1.3, distanceMeters: 30},
    {type: 'landedJump', durationSeconds: 1.9, distanceMeters: 45}, {type: 'bowlTrick', kind: 'backflip', points: 50},
    {type: 'landedJump', durationSeconds: 1.2, distanceMeters: 28}, {type: 'bowlTrick', kind: 'donut', points: 15}];
  const good = scoreFreestyle(Array.from({length: 13}, (_, i) => ({...stunts[i % stunts.length], atSeconds: 4 + 7 * i})));
  const goodPeak = Math.max(...good.events.map(event => event.crowd));
  const jump = height => scoreStuntEvent({type: 'landedJump', durationSeconds: 1.5, distanceMeters: 30, heightMeters: height}, 0).points;
  ok(jump(10) > jump(4) && jump(4) > jump(0) && jump(0) === scoreStuntEvent({type: 'landedJump', durationSeconds: 1.5, distanceMeters: 30}, 0).points,
    'big air scores most: a higher jump pays more, and a jump with no height scores as before');
  ok(goodPeak >= 50 && goodPeak <= 100, `a good Freestyle lifts the crowd meter past half way (peak ${goodPeak.toFixed(1)})`);
}

// The purse pays once: a second settlement of the same run, or a later run of
// the same night, pays nothing. A lent truck never reaches the save.
const settledProfile = (() => {
  const result = run.log.night;
  const before = {...createProfile(), credits: 321, wasteland: {...createProfile().wasteland, scrap: 40}};
  const first = settleShowNight(before, result);
  ok(first.ok && first.changed && first.purse === BOWL_PURSE[0], 'a won night pays its purse');
  equal(first.profile.wasteland.scrap, 40 + BOWL_PURSE[0], 'the purse goes into the scrap wallet');
  equal(first.profile.bowl.nightsWon, [1], 'the night is recorded as won');
  equal(first.profile.bowl.trophies, ['show-night-1'], 'the night puts its trophy on the shelf');
  equal(first.profile.bowl.bestScores['car-crush'], result.bests.carCrush, 'event bests are recorded');
  const again = settleShowNight(first.profile, result);
  ok(again.ok && !again.changed && again.purse === 0 && again.alreadyPaid && again.profile === first.profile,
    'settling the same night again pays nothing and changes nothing');
  const later = settleShowNight(first.profile, {...result, bests: {freestyle: 1}});
  ok(!later.changed && later.purse === 0, 'a later run of a won night pays no second purse');
  const second = settleShowNight(first.profile, {...result, night: 2, bests: {}});
  ok(second.changed && second.purse === BOWL_PURSE[1] && second.profile.wasteland.scrap === 40 + BOWL_PURSE[0] + BOWL_PURSE[1],
    'the next night pays its own purse');
  ok(!settleShowNight(first.profile, {...result, won: false}).changed, 'an unfinished night pays nothing');
  const newer = {...before, wasteland: {...before.wasteland, version: 2, laterField: true}};
  const refused = settleShowNight(newer, result);
  ok(!refused.ok && !refused.changed && refused.profile === newer && refused.purse === 0,
    'a Wasteland save from a newer game is left exactly as it is');
  const {bowl, wasteland, ...rest} = first.profile, {wasteland: oldWasteland, ...oldRest} = before;
  equal(rest, oldRest, 'nothing else in the profile changes: credits, cars and upgrades stay as they were');
  equal({...wasteland, scrap: 0}, {...oldWasteland, scrap: 0}, 'only scrap changes in the Wasteland career');
  ok(!isCarUnlocked(first.profile, SHOW_TRUCK), 'the lent truck is not added to the save');
  return first.profile;
})();

// A save from before this card loads and saves unchanged, and gains no Bowl field.
for (const name of readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(file => file.endsWith('.json'))) {
  const fixture = JSON.parse(readFileSync(new URL(`./fixtures/saves/${name}`, import.meta.url), 'utf8'));
  const storage = memory(Object.fromEntries(Object.entries(fixture.storage).map(([key, value]) => [key, JSON.stringify(value)])));
  const before = loadPlayers(storage);
  ok(savePlayers(before, storage), `${name}: an old save saves`);
  equal(loadPlayers(storage), before, `${name}: unchanged after save and reload`);
  ok(before.players.every(player => !Object.hasOwn(player.profile, 'bowl')), `${name}: no Bowl field appears`);
}

// A save round trip keeps the night's result.
{
  const storage = memory();
  ok(savePlayers({version: 2, activePlayerId: 'bowl-player', players: [{id: 'bowl-player', name: 'Bowl Player', profile: settledProfile}]}, storage),
    'the settled night saves');
  const loaded = loadPlayers(storage).players[0].profile;
  equal(loaded.bowl.nightsWon, [1], 'the won night survives the round trip');
  equal(loaded.bowl.settledNights, ['night:1'], 'the purse receipt survives the round trip');
  equal(loaded.bowl.bestScores, settledProfile.bowl.bestScores, 'the best scores survive the round trip');
  equal(loaded.wasteland.scrap, settledProfile.wasteland.scrap, 'the purse survives the round trip');
  ok(!settleShowNight(loaded, run.log.night).changed, 'after loading, the same night still cannot pay twice');
}

// Every word: plain, whole sentences with no dashes; every sound has a stand-in.
{
  const sentences = [...Object.values(BIG_MO), BOWL_GOALS.carCrush(13), BOWL_GOALS.carCrush(18), BOWL_RESULTS.eventCrush({count: 31, total: 31}), BOWL_RESULTS.eventFullHouse(960), BOWL_GOALS.freestyle('400'),
    BOWL_GOALS.sideBySide(), BOWL_GOALS.lastTruckRolling(),
    ...Object.entries(BOWL_RESULTS).filter(([key]) => !/Title$|Button$|^pickStart$/.test(key)).flatMap(([, value]) =>
      typeof value === 'function' ? [value(2), value(0), value(true), value(false), value('Freestyle')].filter(line => typeof line === 'string') : [value])];
  for (const line of new Set(sentences)) {
    ok(/^[A-Z]/.test(line) && /[.!?]$/.test(line) && !/[–—]/.test(line) && !/ - /.test(line), `a plain sentence: ${line}`);
  }
  ok(Object.values(BOWL_SOUND_CUES).every(cue => Object.hasOwn(SOUND_BANK, cue)), 'every Show Night sound plays an existing cue');
}

// Through the real App, as the menu's START NIGHT button does: the night runs on the
// Bowl in the show truck, the save does not gain the truck, and leaving puts the
// menu's own race setup back. (The browser scenario bowl-night-pay checks the picture.)
{
  globalThis.localStorage = memory();
  globalThis.window = new EventTarget(); window.location = {search: ''};
  globalThis.Element ??= class {};
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  const {App} = await import('../src/app.js');
  const app = new App();
  const released = app.duel.featureFlags.base || app.duel.featureFlags;
  const flags = {...released, enabled: name => name === 'titan-bowl' || released.enabled(name)};
  flags.base = flags;
  app.duel.featureFlags = flags;
  ok(app.addPlayer('Bowl App').ok && app.menuCar !== SHOW_TRUCK, 'a new player has no Titan and another car on the menu');
  const menuSeed = app.duel.seed;
  ok(app.showNightChoices().lent && app.startShowNight(1, {from: 'menu', cpuDifficulty: 'easy'}), 'the App starts night one');
  const s = app.duel.state;
  ok(app.duel.course.def.id === 'titan-bowl' && app.duel.course.def.bowl === true && app.duel.stageDef.bowl === true,
    'the App\'s race is on the Bowl');
  const bowl = new Course({...BOWL_COURSE, bowlDressing: CAR_CRUSH_DRESSING}, 1989);
  ok(app.duel.course.features.flameJets.length === bowl.features.flameJets.length && app.duel.course.features.flameJets.length > 0 &&
    app.duel.course.features.crushables.length === 31 && app.duel.course.features.crushables.length === bowl.features.crushables.length,
    'the course the renderer draws carries the flame jets and the full Car Crush field');
  ok(s.car === SHOW_TRUCK && app._racePaintCar === SHOW_TRUCK && s.bowlNight.lent, 'the App\'s car is the lent show truck');
  app.advance(5);
  ok(s.status === 'racing' && s.car === SHOW_TRUCK && app.duel.course.def.bowl, 'after the countdown the truck is still on the Bowl');
  ok(!isCarUnlocked(app.profile, SHOW_TRUCK) && !(app.profile.unlockedCars || []).includes(SHOW_TRUCK), 'the save has not gained the truck');
  ok(app.leaveShowNight('menu') && s.status === 'menu' && !s.bowlNight && app.duel.seed === menuSeed && s.car === app.menuCar,
    'leaving ends the night and puts the menu\'s seed and car back');
  app.dispose?.();
}

console.log(`test-bowl-night: ${checks} checks passed`);
