// Real Bowl actions and memory-only driver records for Trick School.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlHudView} from '../src/bowl/bowl-night.js';
import {bowlSchoolRecord} from '../src/bowl/bowl-save.js';
import {BOWL_SCHOOL_LESSONS, BOWL_SCHOOL_REASONS} from '../src/bowl/bowl-school.js';
import {loadPlayers, PLAYERS_KEY} from '../src/progression.js';

const DT = 1 / 120;
const fresh = () => new Duel({seed: 1989});
const schoolMoves = BOWL_SCHOOL_LESSONS.map(lesson => lesson.kind);
const enable = duel => { duel.featureFlags = {enabled: flag => flag === 'titan-bowl'}; };
function practice(completed = []) {
  const duel = fresh();
  enable(duel);
  assert.ok(duel.startBowlNight({school: {completed}, playerId: 'driver'}));
  return duel;
}

function schoolDriver() {
  let active = null, air = 0, braking = false, rolled = false;
  return state => {
    const lesson = state.bowlNight.event.lesson;
    if (lesson !== active) { active = lesson; air = 0; braking = rolled = false; }
    const input = {throttle: 1, brake: 0, boost: false, steer: 0};
    if (lesson === 'wheelie') input.boost = true;
    else if (lesson === 'stoppie') {
      braking ||= state.speedMph > 32;
      if (braking) Object.assign(input, {throttle: 0, brake: 1, boost: true});
    } else if (lesson === 'donut') Object.assign(input, {boost: true, steer: 1});
    else if (state.airborne) {
      air++;
      input.throttle = 0;
      if (air === 4) {
        if (['spin', 'barrelRoll', 'sideFlip'].includes(lesson)) input.steer = 1;
        if (lesson === 'backflip') input.brake = 1;
        if (lesson === 'frontFlip') input.throttle = 1;
        if (lesson === 'barrelRoll') input.boost = true;
      }
      if (lesson === 'sideFlip' && !rolled && air > 10 && Math.abs(state.bowlPose?.yaw ?? 0) > .95) {
        Object.assign(input, {steer: 1, boost: true});
        rolled = true;
      }
    }
    return input;
  };
}

{
  const duel = fresh();
  duel.featureFlags = {enabled: () => false};
  assert.equal(duel.startBowlNight({school: {}}), false, 'the School is behind the Bowl switch');
}

{
  const duel = practice(), driver = schoolDriver();
  const ticks = [], next = [], finished = [], payouts = [];
  duel.onChange((state, ev) => {
    const message = ev.bowlSchool;
    if (message?.type === 'tick') ticks.push([message.lesson, message.cue, state.bowlNight.school.completed.length]);
    if (message?.type === 'next') next.push([message.lesson, state.s, state.lateral]);
    if (message?.type === 'done') finished.push(message.cue);
    if (ev.bowlEventResult || ev.bowlNightResult) payouts.push(ev);
  });
  for (let i = 0; i < 120 * 65 && duel.state.bowlNight.event.lesson; i++) {
    duel.setInput(driver(duel.state));
    duel.step(DT);
  }
  assert.deepEqual(ticks, schoolMoves.map((kind, i) => [kind, 'bowl.school.tick', i + 1]));
  assert.deepEqual(next.map(([kind]) => kind), schoolMoves.slice(1));
  const table = duel.course.features.ramps.find(ramp => ramp.id === 'table');
  assert.ok(next.slice(2).every(([, s, off]) => s === table.start - 27 && off === table.off), 'all flight lessons begin at the Table run-up');
  assert.deepEqual(finished, ['bowl.school.done']);
  for (let i = 0; i < 120 * 4; i++) duel.step(DT);
  const view = bowlHudView(duel.state, duel.course);
  assert.deepEqual([view.name, view.timeLeft, view.target, duel.state.bowlNight.event.lesson, duel.state.status],
    ['Trick School', null, null, null, 'racing']);
  assert.deepEqual(payouts, [], 'all eight lessons leave the floor open without an event or payout');
}

{
  const duel = practice(schoolMoves.slice(0, -1)), reasons = [];
  const report = event => { duel.emit(event); duel.emit(event); };
  duel.onChange((_, ev) => { if (ev.bowlSchool?.type === 'why') reasons.push(ev.bowlSchool.reason); });
  for (const reason of ['wheelieSpeed', 'stoppieSpeed', 'heldThrottle']) report({bowlTrickTry: {reason}});
  report({bowlTrickLate: {kind: 'backflip', turnsCompleted: 0}});
  report({bowlTrick: {kind: 'slam', landing: 'slam', turns: 0, points: 0, cues: []}});
  report({bowlTrickLate: {kind: 'backflip', turnsCompleted: 1}});
  report({bowlTrick: {kind: 'barrelRoll', landing: 'clean', turns: 1, points: 60, cues: []}});
  assert.deepEqual(reasons, Object.keys(BOWL_SCHOOL_REASONS), 'each real failure category is shown only once in a lesson');
  assert.equal(bowlHudView(duel.state, duel.course).caption, BOWL_SCHOOL_REASONS.rollDirection);
  report({bowlTrick: {kind: 'sideFlip', landing: 'clean', turns: 1, points: 80, cues: []}});
  duel.step(DT);
  report({bowlTrickTry: {reason: 'wheelieSpeed'}});
  assert.equal(reasons.filter(reason => reason === 'wheelieSpeed').length, 2, 'a separate practice phase can explain the same cause again');
}

{
  const duel = practice(schoolMoves.slice(0, 5)), reasons = [];
  duel.onChange((_, ev) => { if (ev.bowlSchool?.type === 'why') reasons.push(ev.bowlSchool.reason); });
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  for (let i = 0; i < 120 * 8 && !reasons.length; i++) duel.step(DT);
  assert.deepEqual(reasons, ['heldThrottle'], 'the real Table run notices W held continuously in the front flip lesson');
}

{
  const duel = practice(), reasons = [];
  duel.onChange((_, ev) => { if (ev.bowlSchool?.type === 'why') reasons.push(ev.bowlSchool.reason); });
  duel.state.speedMph = 18;
  duel.setInput({throttle: 1, boost: true, steer: 0, brake: 0});
  duel.step(DT);
  duel.setInput({throttle: 0, boost: true, steer: 0, brake: 1});
  duel.step(DT);
  assert.deepEqual(reasons, ['wheelieSpeed', 'stoppieSpeed'], 'the real ground inputs report both wrong-speed reasons');
}

function freestyle(night, eventIndex) {
  const duel = fresh();
  enable(duel);
  assert.ok(duel.startBowlNight({night, eventIndex, seed: 1989}));
  assert.equal(duel.state.bowlNight.event.type, 'freestyle');
  while (duel.state.status === 'countdown') duel.step(DT);
  return duel;
}

{
  const plain = freestyle(2, 1), featured = freestyle(1, 1);
  const report = (duel, kind, turns, points) =>
    duel.emit({bowlTrick: {kind, turns, points, landing: 'clean', fresh: false, repeat: 1, cues: []}});
  report(plain, 'backflip', 1, 50);
  report(featured, 'backflip', 1, 50);
  assert.deepEqual([plain.state.bowlNight.event.score, featured.state.bowlNight.event.score], [50, 100]);
  assert.equal(featured.state.bowlNight.event.trickPopups[0].base, 100, 'the label uses the same doubled base');
  const double = freestyle(5, 0);
  report(double, 'frontFlip', 2, 200);
  assert.equal(double.state.bowlNight.event.score, 400, 'the featured double earns the bonus');
  const reasons = [];
  plain.onChange((_, ev) => { if (ev.bowlSchool?.type === 'why') reasons.push(ev.bowlSchool.reason); });
  for (let attempt = 0; attempt < 2; attempt++) plain.emit({bowlTrickTry: {reason: 'wheelieSpeed'}});
  assert.deepEqual(reasons, ['wheelieSpeed'], 'a normal Bowl event also explains each cause once');
}

{
  const memory = new Map();
  let blockPlayerWrites = false;
  globalThis.localStorage = {get length() { return memory.size; }, key: index => [...memory.keys()][index] ?? null,
    getItem: key => memory.get(key) ?? null,
    setItem(key, value) {
      if (blockPlayerWrites && key === PLAYERS_KEY) throw new Error('The driver record is temporarily unavailable.');
      memory.set(key, String(value));
    },
    removeItem: key => memory.delete(key)};
  globalThis.window = new EventTarget();
  window.location = {search: ''};
  globalThis.Element ??= class {};
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  const {App} = await import('../src/app.js');
  const app = new App(), base = app.duel.featureFlags.base || app.duel.featureFlags;
  const flags = {...base, enabled: flag => flag === 'titan-bowl' || base.enabled(flag)};
  flags.base = flags;
  app.duel.featureFlags = flags;
  assert.ok(app.addPlayer('School driver').ok);
  const first = app.player.id, credits = app.profile.credits, wallet = app.profile.wasteland;
  assert.equal(app.showNightChoices().offerSchool, true);
  assert.ok(app.skipBowlSchoolOffer());
  assert.equal(app.showNightChoices().offerSchool, false);
  assert.ok(app.startBowlSchool(), 'the picker can still open School after choosing Not now');
  const driver = schoolDriver();
  for (let i = 0; i < 300 && !app.duel.state.bowlNight.school.completed.length; i++) {
    app.duel.setInput(driver(app.duel.state)); app.duel.step(DT);
  }
  assert.deepEqual(bowlSchoolRecord(loadPlayers().players.find(player => player.id === first).profile),
    {offered: true, completed: ['wheelie']});
  assert.equal(app.profile.credits, credits);
  assert.deepEqual(app.profile.wasteland, wallet, 'School leaves credits and the scrap wallet alone');
  assert.ok(app.leaveShowNight());
  assert.ok(app.startBowlSchool());
  assert.equal(app.duel.state.bowlNight.event.lesson, 'stoppie', 'the School resumes at the next unfinished lesson');
  assert.ok(app.leaveShowNight());
  assert.ok(app.addPlayer('Second driver').ok);
  assert.equal(app.showNightChoices().offerSchool, true, 'the next driver gets their own offer');
  assert.ok(app.startBowlSchool());
  assert.equal(app.duel.state.bowlNight.event.lesson, 'wheelie', 'the next driver starts at the first lesson');
  const second = app.player.id, secondDriver = schoolDriver();
  const savedSchool = id => bowlSchoolRecord(loadPlayers().players.find(player => player.id === id).profile);
  blockPlayerWrites = true;
  for (let i = 0; i < 300 && !app.duel.state.bowlNight.school.completed.length; i++) {
    app.duel.setInput(secondDriver(app.duel.state)); app.duel.step(DT);
  }
  assert.equal(app.duel.state.bowlSchoolSavePending, true);
  assert.deepEqual(savedSchool(second).completed, [], 'a failed write does not report a durable tick');
  blockPlayerWrites = false;
  app.togglePause();
  assert.ok(app.requestNavigation('menu'), 'the pause screen uses ordinary menu navigation');
  assert.deepEqual(savedSchool(second).completed, ['wheelie'], 'leaving through Pause retries the lesson write');

  assert.ok(app.addPlayer('Night driver').ok);
  const third = app.player.id;
  blockPlayerWrites = true;
  assert.equal(app.skipBowlSchoolOffer(), false, 'the first-visit choice could not be saved');
  assert.ok(app.startShowNight(1, {cpuDifficulty: 'easy'}));
  assert.equal(app.duel.state.bowlSchoolSavePending, true, 'the ordinary night keeps the pending dismissal visible');
  while (app.duel.state.bowlNight.caption) app.duel.step(DT);
  assert.match(bowlHudView(app.duel.state, app.duel.course).caption, /waiting to be saved/);
  assert.equal(savedSchool(third).offered, false);
  blockPlayerWrites = false;
  app.togglePause();
  assert.ok(app.requestNavigation('menu'));
  assert.deepEqual(savedSchool(third), {offered: true, completed: []}, 'ordinary Night 1 retries a pending dismissal');
  assert.equal(app.showNightChoices().offerSchool, false);
  assert.deepEqual(savedSchool(first).completed, ['wheelie'], 'a retry keeps other drivers\' records');
  app.dispose();
}

console.log('Trick School: eight real-floor lessons, seven repeat-safe explanations, featured scoring and per-driver records passed.');
