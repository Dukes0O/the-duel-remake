import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {App} from '../src/app.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {pageFunctions, pageSource} from './scenarios/story-night-2.mjs';
import {Duel} from '../src/game.js';
import {namedThrow, bankHearth, createLedger} from '../src/story/ledger.js';
import {NIGHT_2_CHOICES, NIGHT_2_SCENES, night2Count} from '../src/story/scenes/night-2.js';
import {validateTalkScene} from '../src/story/talk.js';
import {night2Job, night2Odds, night2Opening} from '../src/world/jobs/night-2.js';
import {NIGHT_2_SITES as sites} from '../src/world/jobs/night-2-sites.js';
import {savedLedger} from '../src/story/ledger-save.js';
import {settleNight2} from '../src/story/night-2-save.js';

const seedFor = (name, chance, outcome) => {
  for (let seed = 1; seed < 10_000; seed++)
    if (namedThrow(createLedger(night2Opening(seed)), name, chance) === outcome) return seed;
  throw new Error('No seed for ' + name);
};
const theftSeed = seedFor('night-2/dace-steals', .5, true);
const giftSeed = seedFor('night-2/dace-steals', .5, false);
const refusesSeed = seedFor('night-2/clinker-offer', .5, true);
const goesSeed = seedFor('night-2/clinker-offer', .5, false);
const flags = {enabled: id => ['hidden-road', 'story-choices', 'crew-gear', 'warlord-cards'].includes(id)};

function chapter(seed, startedDuel) {
  const duel = startedDuel ?? new Duel({seed, featureFlags: flags});
  const cues = [];
  duel.onChange((_state, event) => { if (event.arenaTell) cues.push(event.arenaTell.cue); });
  if (!startedDuel) {
    duel.state.wastelandGateDiscovered = true;
    assert(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed,
      opponents: [], job: night2Job(seed)}));
  }
  const world = duel.state.arena.worldJob;
  const view = world.night2;
  duel.state.countdown = 0;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) duel.step(1 / 60); };
  const stage = () => world.job.steps[world.job.stepIndex]?.id;
  const screen = () => world.job.stepState.screen;
  const send = action => { assert(duel.talkInput(action, screen())); tick(); };
  const say = words => {
    if (!screen()) tick();
    while (screen()?.phase !== 'options') send({type: 'advance'});
    const index = screen().options.findIndex(option => option.words === words);
    assert(index >= 0, 'Missing option: ' + words);
    send({type: 'select', index});
  };
  const advance = next => {
    for (let i = 0; i < 20 && stage() !== next; i++) {
      if (!screen()) tick();
      else {
        assert.notEqual(screen().phase, 'options', 'Must answer at ' + stage());
        send({type: 'advance'});
      }
    }
    assert.equal(stage(), next);
  };
  const footAt = at => {
    const {x, y, z} = at.position ?? at;
    const {s, lateral} = duel.course.nearest(x, z);
    Object.assign(duel.state.fighter, {x, y, z, s, lateral, groundY: y, speed: 0});
  };
  const openGate = () => {
    tick(2);
    advance('walk-to-gate');
    footAt(sites.gateTalk);
    tick(2);
    assert.equal(stage(), 'gate');
  };
  const finish = count => {
    if (!screen()) tick();
    assert.equal(screen().line.words, night2Count(count).lines[0].words);
    const state = duel.state, fighter = state.fighter;
    const position = fighter ? [fighter.x, fighter.y, fighter.z] : [state.s, state.lateral];
    advance(undefined);
    assert.deepEqual(fighter ? [fighter.x, fighter.y, fighter.z] : [state.s, state.lateral], position,
      'The closing camera cut leaves the player where they were');
    assert.equal(duel.state.arena.result.winnerId, 'player');
    assert.equal(view.ledger.night, 3);
    assert.deepEqual(view.bank, {burned: Math.min(1, count), needed: 1});
    assert.equal(view.page.embers, Math.max(0, count - 1));
    assert.equal(Object.hasOwn(view.page, 'feud'), false);
  };
  return {duel, world, view, tick, stage, screen, say, advance, footAt, openGate, finish, cues};
}

for (const scene of Object.values(NIGHT_2_SCENES)) validateTalkScene(scene);
assert.equal(bankHearth(createLedger(night2Opening(9))).needed, 1);
const opening = chapter(giftSeed);
opening.openGate();
assert(opening.cues.includes('town.gate.bell'));
assert.equal(opening.world.storyPeople.filter(person => person.cart).length, 4);
assert.equal(opening.world.storyPeople.length, 13);
assert.equal(opening.world.storyPeople.find(person => person.id === 'wim').seat, 'handcart');
const pose = JSON.parse(await readFile(new URL('./art/story-plates/night-2-pose.json', import.meta.url)));
const matchesPose = (point, relative) => {
  for (const [index, axis] of ['x', 'y', 'z'].entries())
    assert(Math.abs(point[axis] - pose.gateWorld[index] - relative[index]) < 1e-8, 'Gate staging ' + axis);
};
for (const {id, action, position, yaw} of pose.people) {
  const person = opening.world.storyPeople.find(person => person.id === id);
  matchesPose(person.position, position);
  assert.equal(person.action, action);
  assert.equal(person.yaw, yaw);
}
for (const {owner, axle, yaw} of pose.carts) {
  const {cart} = opening.world.storyPeople.find(person => person.id === owner);
  matchesPose(cart, axle);
  assert.equal(cart.yaw, yaw);
}
const camera = opening.view.camera;
matchesPose(camera.position, pose.camera.eye);
matchesPose(camera.target, pose.camera.aim);
assert.equal(camera.fov, pose.camera.verticalFov);
opening.say(NIGHT_2_CHOICES[0].words);
assert.deepEqual([opening.view.ledger.stocks.embers, opening.view.ledger.words.walkers, opening.view.ledger.roadWord],
  [3, 'Friendly', 1]);
opening.advance('salt');
assert(opening.cues.includes('luck.kind'));
opening.advance('close');
opening.finish(3);
assert(opening.view.page.memories.includes('Dace kept a watch nobody asked for.'));
assert.equal(opening.view.ledger.feud, 'Raiding');
const profile = {wasteland: {scrap: 7}};
const saved = settleNight2(profile, opening.view);
assert(saved.ok && saved.changed);
assert.equal(saved.profile.wasteland.scrap, 17);
assert.deepEqual({...savedLedger(saved.profile), version: undefined}, {...opening.view.ledger, version: undefined});
assert.equal(settleNight2(saved.profile, opening.view).profile, saved.profile);
const newer = {story: {version: 7}, wasteland: {scrap: 91}};
assert.equal(settleNight2(newer, opening.view).profile, newer);

for (const [answer, count, word, mark] of [
  [0, 3, 'Sworn', 'dace-runner'], [1, 2, 'Friendly', 'dace-secret'], [2, 3, 'Wary', 'dace-sent-away'], [null, 1, 'Friendly', null],
]) {
  const run = chapter(theftSeed);
  run.openGate();
  run.say(NIGHT_2_CHOICES[0].words);
  run.advance('theft');
  assert(run.cues.includes('luck.unkind'));
  const {x, y, z} = run.duel.state.fighter;
  run.advance('chase');
  assert.deepEqual([run.duel.state.fighter.x, run.duel.state.fighter.y, run.duel.state.fighter.z], [x, y, z]);
  const dace = run.world.storyPeople.find(person => person.id === 'dace');
  run.tick();
  assert.equal(run.view.routes.length, 2);
  if (answer === null) {
    // Wide steps still use the real chapter movement and detect the camp arrival.
    for (let i = 0; i < 230 && run.stage() === 'chase'; i++) run.duel.step(.5);
    assert.equal(run.stage(), 'escaped');
    assert(run.view.ledger.obligations.some(item => item.id === 'walkers-great-favour'));
  } else {
    run.footAt(dace.position);
    run.tick(2);
    assert.equal(run.stage(), 'caught');
    run.say(NIGHT_2_SCENES.caught.choices[answer].words);
    assert(run.view.ledger.marks.includes(mark));
  }
  assert.equal(run.view.ledger.words.walkers, word);
  run.advance('close');
  run.finish(count);
}

for (const stopped of [false, true]) {
  const run = chapter(giftSeed);
  run.openGate();
  run.say(NIGHT_2_CHOICES[1].words);
  assert.equal(run.view.ledger.stocks.embers, 3);
  assert.equal(run.view.ledger.roadWord, 1);
  assert.equal(run.view.ledger.words.walkers, 'Friendly');
  assert(run.view.ledger.obligations.some(item => item.id === 'walkers-watch'));
  run.advance('walk-watch-post');
  run.footAt(sites.watchPost);
  run.tick(2);
  run.advance('scout');
  assert(run.cues.includes('night.whistle'));
  if (stopped) {
    const scout = run.world.actors.find(actor => actor.brandAsh);
    run.footAt({x: scout.x, y: scout.y, z: scout.z + 3.5});
    Object.assign(run.duel.state.fighter, {yaw: Math.PI, pitch: 0});
    run.duel.setFighterInput({fire: true});
    run.tick(12);
    assert(run.view.scoutTurned, 'The loaned hand flamer turns the real scout');
    run.duel.setFighterInput({fire: false});
  }
  for (let i = 0; i < 750 && run.stage() === 'scout'; i++) run.tick(7);
  assert.equal(run.stage(), stopped ? 'scout-stopped' : 'scout-escaped');
  assert.equal(run.view.ledger.feud, stopped ? 'Watching' : 'Raiding');
  run.advance('close');
  run.finish(3);
}

const lamp = chapter(23);
lamp.openGate();
lamp.say(NIGHT_2_CHOICES[2].words);
assert.equal(lamp.view.ledger.extraHeatFrom, 2);
assert.equal(lamp.view.ledger.stocks.embers, 4);
assert.equal(lamp.view.ledger.words['auntie-solder'], 'Wary');
assert.equal(lamp.view.ledger.roadWord, 2);
lamp.advance('light-pump');
lamp.footAt(sites.hearthFront);
lamp.tick();
assert(lamp.world.job.stepState.brandSeconds > 0);
lamp.footAt({x: sites.pump.position.x + 1.6, y: sites.pump.position.y, z: sites.pump.position.z});
lamp.tick(130);
assert.equal(lamp.stage(), 'back-to-hearth');
assert(lamp.view.lamps.pump);
lamp.footAt(sites.hearthApproach);
lamp.tick(2);
lamp.advance('close');
lamp.finish(4);

for (const [seed, mall, outcome] of [
  [refusesSeed, false, 'walkers-refuse-clinker'],
  [goesSeed, false, 'walkers-go-with-clinker'],
  [refusesSeed, true, 'walkers-refuse-clinker'],
]) {
  const run = chapter(seed);
  run.openGate();
  run.say(NIGHT_2_CHOICES[3].words);
  run.say(NIGHT_2_SCENES.refuse.choices[mall ? 0 : 1].words);
  run.advance('tower');
  if (!run.screen()) run.tick();
  assert.equal(night2Odds(run.view).refuseClinker, mall ? .75 : .5);
  assert.equal(run.view.ledger.words.walkers, mall ? 'Wary' : 'Cold');
  assert.equal(run.view.ledger.roadWord, 0);
  run.say('Watch');
  assert.equal(run.view.watchOutcome, outcome);
  run.advance('close');
  run.finish(4);
  assert.equal(run.view.ledger.feud, outcome === 'walkers-go-with-clinker' ? 'Hunting' : 'Raiding');
}

console.log('PASS Night 2 real world job: opening cast, both named throws, caught choices and escape, scout, lamp, Mall and bank.');

// The scripted play follows the two real navigation arrows and uses only
// talk choices and on-foot controls to carry out the watch, from start to end.
const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)};
globalThis.cancelAnimationFrame = () => {};
const app = new App();
app.audio.unlock = () => {};
app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true}};
assert(app._saveProfile());
app.duel.featureFlags = flags;
const wall = yardHomeScreen({profile: app.profile, playerName: app.player.name, escapeHTML: String, panel: 'cards', featureFlags: flags});
assert.match(wall, /Five Cold Nights/);
assert.match(wall, /data-action="story-night-2"/);
assert(app.visitWasteland());
app.advance(8);
assert(app.isYardHomeActive());
app.duel.featureFlags = {enabled: id => id === 'hidden-road'};
assert.equal(app.startNight2(), false);
app.duel.featureFlags = flags;
assert(app.startNight2());
const drive = chapter(app.seed, app.duel);
function pointAt(duel, point, options) {
  const fighter = duel.state.fighter;
  const yaw = Math.atan2(point.x - fighter.x, point.z - fighter.z);
  const turn = Math.atan2(Math.sin(fighter.yaw - yaw), Math.cos(fighter.yaw - yaw));
  duel.setFighterInput({...options, lookX: turn / .0022, lookY: fighter.pitch / .0022});
}
drive.tick(2);
drive.advance('walk-to-gate');
for (let i = 0; i < 800 && drive.stage() === 'walk-to-gate'; i++) {
  const route = drive.view.routes[0];
  if (route) pointAt(drive.duel, route.point, {forward: true, sprint: true});
  drive.tick();
}
assert.equal(drive.stage(), 'gate');
drive.duel.setFighterInput({forward: false});
drive.say(NIGHT_2_CHOICES[1].words);
drive.advance('walk-watch-post');
for (let i = 0; i < 1800 && drive.stage() === 'walk-watch-post'; i++) {
  const route = drive.view.routes[0];
  if (route) pointAt(drive.duel, route.point, {forward: true, sprint: true});
  drive.tick();
}
assert.equal(drive.stage(), 'whistle');
drive.advance('scout');
for (let i = 0; i < 3600 && drive.stage() === 'scout'; i++) {
  const route = drive.view.routes[0];
  if (route) pointAt(drive.duel, route.point, {
    forward: !drive.view.scoutTurned && route.metres > 3, sprint: true, fire: !drive.view.scoutTurned && route.metres < 5,
  });
  drive.tick();
}
assert.equal(drive.stage(), 'scout-stopped');
drive.advance('close');
drive.finish(3);
assert.equal(savedLedger(app.profile).night, 3);
assert.equal(savedLedger(app.profile).feud, 'Watching');
assert.equal(app.duel.state.arena.result.settlementSaved, true);
console.log('PASS Night 2 scripted play: the watch, hearth to close, scout driven out by the gate.');

// The carry uses the ordinary pot from pickup to arrival. Set the car's
// position only to isolate the cost and delivery rule from the scripted play.
const pot = chapter(22);
pot.openGate();
pot.say(NIGHT_2_CHOICES[3].words);
pot.say('Say nothing');
pot.advance('tower');
pot.say('Carry one ember out to them, now');
assert.equal(pot.stage(), 'pot');
assert.equal(pot.view.ledger.stocks.embers, 3);
assert(pot.world.actors.filter(actor => actor.renderCar).length === 3);
pot.footAt({x: sites.car.x + 2.8, y: sites.car.y, z: sites.car.z});
pot.duel.setInput({interact: true});
for (let i = 0; i < 120 && pot.duel.state.onFoot; i++) pot.tick();
assert.equal(pot.duel.state.onFoot, false, 'The pot branch starts next to the usable car');
pot.duel.setInput({interact: false});
pot.tick(3);
assert(pot.world.job.stepState.loaded);
const {s, lateral} = pot.duel.course.nearest(sites.camp.position.x + 6, sites.camp.position.z);
Object.assign(pot.duel.state, {s, lateral, prevS: s, prevLateral: lateral, speedMph: 0});
pot.tick(2);
assert.equal(pot.stage(), 'delivery');
assert.equal(pot.view.ledger.words.walkers, 'Friendly');
assert(pot.view.ledger.marks.includes('changed-mind-in-night'));
pot.advance('close');
pot.finish(3);

const asked = chapter(11);
asked.openGate();
asked.say("Who's the boy staring at my hearth?");
asked.say('Dace. A word.');
asked.say('Where are you going?');
asked.say('Why not take a light from our hearth?');
asked.say(NIGHT_2_CHOICES[0].words);
assert.equal(asked.view.ledger.stocks.embers, 3);
assert(asked.view.ledger.marks.includes('know-south-ford'));
assert.equal(night2Odds(asked.view).theft, .22);
for (const [name, fn] of Object.entries(pageFunctions)) new Function('return ' + pageSource(name, ...Array(fn.length).fill(null)));
for (const source of [
  "document.querySelector('.night-2-alternative-route')?.hidden === false",
  'window.__qaApp.duel.state.arena.worldJob.job.stepState.brandSeconds > 0',
]) new Function('return (' + source + ')');
console.log('PASS Night 2 pot, questions, memory-only entry and scenario expression syntax.');
