// BOWL-HOOKS: Show Night in the game, headless. One scripted night from the
// start to the results; the rules, the purse and the saves are checked without
// driving. Memory-only saves.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createProfile, isCarUnlocked, loadPlayers, savePlayers} from '../src/progression.js';
import {BOWL_PURSE, SHOW_TRUCK, bowlLayout, crushRowName, crushRowsToWin, bowlHudView, bowlNightPlayable, settleShowNight,
  showTruckFor} from '../src/bowl/bowl-night.js';
import {BIG_MO, BOWL_CRUSH_ROW, BOWL_GOALS, BOWL_RESULTS, BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {scoreFreestyle} from '../src/bowl/bowl-show.js';
import {Course} from '../src/course.js';
import {BOWL_COURSE} from '../src/bowl/bowl-course.js';

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
  ok([3, 4, 5].every(night => !bowlNightPlayable(night)), 'nights three to five wait for Last Truck Rolling (BOWL-RIVALS)');
  ok(!showDuel().startBowlNight({night: 3}), 'a night with an event still to build does not start');
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
  ok(crushRowsToWin(bowl, {cpuDifficulty: 'hard'}) === layout.rows.length && crushRowsToWin(bowl, {cpuDifficulty: 'easy'}) ===
    Math.ceil(layout.rows.length * .6), 'each level needs its share of however many rows the course has');
  ok(crushRowName(bowl, 0) === 'the first row of cars' && /buses/.test(crushRowName(bowl, layout.rows.findIndex(row => /bus/i.test(row.kind)))) &&
    crushRowName(bowl, layout.rows.length - 1) === 'the burning stack', 'rows are named by what stands in them');
}

// A lost event is tried again; nothing moves the night on.
{
  const duel = showDuel(), results = [];
  duel.onChange((_, ev) => ev.bowlEventResult && results.push(ev.bowlEventResult));
  ok(duel.startBowlNight({night: 1, cpuDifficulty: 'easy'}), 'night one starts');
  for (let i = 0; i < 120 * 8 && !results.length; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  const night = duel.state.bowlNight;
  ok(results.length === 1 && !results[0].won && results[0].event === 'carCrush', 'a truck that never moves loses the Car Crush');
  ok(duel.state.status === 'bowl_break' && night.phase === 'result' && night.show.eventIndex === 0, 'the night waits at the same event');
  ok(duel.continueBowlNight() && night.event.type === 'carCrush' && night.event.attempt === 2, 'the next start is the same event, attempt two');
  ok(duel.state.s === bowlLayout(duel.course).crush.startS && duel.state.status === 'countdown', 'the retry starts at the head of the crush line');
}

// One scripted night, the way in to the results: night one on Easy in the lent truck.
// The driver keeps to the middle of the floor, and in Freestyle swings over to the
// first parked car to launch off it.
const run = (() => {
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
      // The results stay on screen while Big Mo finishes speaking.
      if (s.bowlNight.phase === 'complete') { for (let wait = 0; wait < 120 * 10; wait++) duel.step(DT); break; }
      duel.continueBowlNight(); continue;
    }
    const freestyle = s.bowlNight.event.type === 'freestyle', layout = bowlLayout(duel.course);
    // Freestyle: the centre line over the kickers, swinging out to the first launch car on the way past it.
    const car = layout.parked[0], lapS = ((s.s % duel.course.length) + duel.course.length) % duel.course.length;
    const line = freestyle && lapS > car.s - 14 && lapS < car.s + 4 ? car.lateral : s.bowlNight.event.type === 'sideBySide' ? layout.lanes[0].lateral : 0;
    // The Car Crush as a child plays it: W held down, no steering.
    if (s.bowlNight.event.type === 'carCrush') duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
    else duel.setInput({throttle: s.speedMph < 32 ? 1 : 0, brake: 0, steer: Math.max(-1, Math.min(1, (s.lateral - line) * .3 + (s.headingError || 0) * 1.5)), boost: false});
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
  ok(log.events[0].rows >= 3, 'holding W with no steering, the Car Crush reaches the row Easy needs');
  ok(night.attempts[0].event === 'carCrush' && night.attempts[0].won, 'the first Car Crush run is won, with no wall in the way');
  const launch = log.scores.find(score => score.type === 'carLaunch' && score.event === 'freestyle');
  ok(launch, 'the Titan launches off a parked car in Freestyle');
  ok(log.scores.filter(score => score.type === 'landedJump').every(jump => jump.points < launch.points),
    'the launch off a car scores more than any ramp jump');
  ok(log.captions[0] === 'night.1.open' && log.captions.includes('lent.truck') && log.captions.at(-1) === 'night.won',
    'Big Mo opens the night, mentions the lent truck and closes the show');
  ok(['carCrush', 'freestyle', 'sideBySide'].every(type => log.captions.includes(`event.${type}.intro`) &&
    log.captions.includes(`event.won.${type}`)), 'Big Mo introduces and ends every event');
  ok(log.hud && log.hud.name === 'Freestyle' && log.hud.timeLeft > 0 && log.hud.timeLeft < 90 &&
    Number.isFinite(log.hud.crowd) && log.hud.goal.startsWith('Do big jumps'), 'the HUD reads the event, clock, crowd and goal');
  ok(['bowl.mo', 'bowl.crowd.rise', 'bowl.event.won'].every(cue => log.cues.has(cue)), 'each new event names its sound cue');
  const freestyle = log.events.find(result => result.event === 'freestyle');
  ok(freestyle.crowdPeak >= 25, `the crowd meter rises visibly even on a plain line over the kickers (peak ${freestyle.crowdPeak})`);
  // A good Freestyle: a big stunt every 7 seconds (big air, a launch off a car, the Table, a flip, a kicker, a donut).
  const stunts = [{type: 'landedJump', durationSeconds: 2.2, distanceMeters: 50}, {type: 'carLaunch', durationSeconds: 1.3, distanceMeters: 30},
    {type: 'landedJump', durationSeconds: 1.9, distanceMeters: 45}, {type: 'flip', pitchTurns: 1},
    {type: 'landedJump', durationSeconds: 1.2, distanceMeters: 28}, {type: 'donut', seconds: 3}];
  const good = scoreFreestyle(Array.from({length: 13}, (_, i) => ({...stunts[i % stunts.length], atSeconds: 4 + 7 * i})));
  const goodPeak = Math.max(...good.events.map(event => event.crowd));
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
  const sentences = [...Object.values(BIG_MO), BOWL_GOALS.carCrush(BOWL_CRUSH_ROW.cars(3)), BOWL_GOALS.carCrush(BOWL_CRUSH_ROW.buses), BOWL_RESULTS.eventRows(BOWL_CRUSH_ROW.fire), BOWL_GOALS.freestyle('400'),
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
  const bowl = new Course(BOWL_COURSE, 1989);
  ok(app.duel.course.features.flameJets.length === bowl.features.flameJets.length && app.duel.course.features.flameJets.length > 0 &&
    app.duel.course.features.crushables.length === bowl.features.crushables.length,
    'the course the renderer draws carries the Bowl\'s flame jets and crush line');
  ok(s.car === SHOW_TRUCK && app._racePaintCar === SHOW_TRUCK && s.bowlNight.lent, 'the App\'s car is the lent show truck');
  app.advance(5);
  ok(s.status === 'racing' && s.car === SHOW_TRUCK && app.duel.course.def.bowl, 'after the countdown the truck is still on the Bowl');
  ok(!isCarUnlocked(app.profile, SHOW_TRUCK) && !(app.profile.unlockedCars || []).includes(SHOW_TRUCK), 'the save has not gained the truck');
  ok(app.leaveShowNight('menu') && s.status === 'menu' && !s.bowlNight && app.duel.seed === menuSeed && s.car === app.menuCar,
    'leaving ends the night and puts the menu\'s seed and car back');
  app.dispose?.();
}

console.log(`test-bowl-night: ${checks} checks passed`);
