import assert from 'node:assert/strict';
import {bankHearth} from '../src/story/ledger.js';
import {directBankedOpenWorld} from '../src/story/ledger-save.js';
import {placeForThread, radioScene} from '../src/story/scenes/burned-camp.js';
import burned from '../src/story/threads/content/burned-camp.js';
import {threadRule} from '../src/story/threads/thread-rule.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, holdOpenLand, releaseOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {stageOf} from '../src/world/open/open-record.js';
import {openThreadSigns, threadsAtBankedHearth, threadsPart} from '../src/world/open/parts/threads.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {openThreadTalkScene} from '../src/world/open/content/talk-threads.js';
import {createSignView} from '../src/world/open/sign-view.js';
import {pageFunctions, pageSource} from './scenarios/open-burned-camp.mjs';

const id = burned.id;
const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const site = placeForThread('@camp', cast);
const at = spot => placeForThread(['@camp', spot], cast);
const nowhere = {x: site.x - 4000, z: site.z};
const sight = {x: site.x - 160, z: site.z};
const clueIds = ['frames', 'lamp', 'tracks', 'ruts', 'pods', 'pump'];
const seedOf = (world, seed) => ({...world, seed, ledger: {...world.ledger, seed}});
const apply = (world, id, effects) => applyEffects(world, {id, effects}).world;
const bank = world => ({...world, ledger: bankHearth(world.ledger).ledger});
// The director is given only this storyline, so that other loaded storylines cannot be drawn in its place.
const direct = (world, view) => threadsAtBankedHearth({world, view}, [burned]);
const enabled = seedOf(sampleWorld('helped-camp'), 1250);
const openFor = world => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
const walk = (open, point, extra = {}, dt = 1) => stepOpenLand(open, {player: {position: point}, onFoot: true,
  carPosition: at('car-stop'), ...extra}, dt, [threadsPart]);
const drive = (open, point, dt = 1) => walk(open, point, {onFoot: false}, dt);
const marks = open => open.world.ledger.marks;
const record = open => open.world.open.threads[id];

const started = direct(enabled);
assert.equal(started.open.threads[id].beat, 'sign');
assert.equal(stageOf(started, 'glasshouse'), 'burned');
assert.equal(directBankedOpenWorld(enabled, {storyChoices: false}), enabled);
assert.equal(direct(enabled, {lastNight: enabled.ledger.night}).open.threads[id], undefined);
assert.equal(direct(enabled, {player: {position: site}}).open.threads[id], undefined, 'a hearth must pass after visiting the camp');
const waiting = walk(openFor(enabled), site).open.world;
assert.equal(direct(waiting).open.threads[id], undefined, 'a recorded visit bars a start for the rest of the night');
const anotherNight = bank(waiting);
assert.ok(Array.from({length: 10}, (_, index) => direct(seedOf(anotherNight, index + 1)))
  .some(world => world.open.threads[id]), 'the visit does not bar a later night');
const stranger = apply(enabled, 'fixture/stranger', [{type: 'word', person: 'glasshouse', set: 'Strangers'}]);
for (const world of [stranger, seedOf(sampleWorld('nothing-found'), enabled.seed)])
  assert.equal(direct(world).open.threads[id], undefined);

const tower = apply(started, 'fixture/tower', [{type: 'made', id: 'tower/crows-step'}]);
let next = drive(openFor(tower), nowhere);
assert.equal(next.requests.length, 1);
assert.match(next.requests[0].text, /^The keeper: I can see smoke/);
assert.equal(record(next.open).beat, 'sign');
next = drive(next.open, sight, 2);
assert.deepEqual(next.requests, []);
next = drive(next.open, nowhere, 1);
next = drive(next.open, sight, 2);
assert.deepEqual(next.requests, [], 'breaking sight resets the witness time');
next = drive(next.open, sight, 1);
assert.equal(record(next.open).beat, 'clues');
assert.deepEqual(next.requests.map(row => row.text), [
  "That smoke is over by the Glasshouse, and it's far too thick and dark for a cooking fire.",
  'Marigold burns bean stalks in her stove, and they hardly make any smoke at all.',
]);
assert.deepEqual(next.events.map(row => row.cue), ['open.smoke.seen']);
let open = next.open;
assert.equal(openThreadSigns(open).length, 1);
assert.equal(openThreadSigns(holdOpenLand(open, 'job:test', ['signs'])).length, 0);
const quiet = drive(holdOpenLand(openFor(started), 'job:test', ['signs']), sight, 9);
assert.equal(record(quiet.open).beat, 'sign');
assert.equal(record(drive(releaseOpenLand(quiet.open, 'job:test'), sight, 3).open).beat, 'clues');

for (const id of clueIds) {
  const arrive = walk(open, at(id));
  next = walk(arrive.open, at(id));
  assert.ok(marks(next.open).includes(`burned-camp/${id}`), id);
  assert.ok([...arrive.events, ...next.events].some(event => event.cue === 'open.clue.found' && event.id === id), id);
  assert.ok(!walk(next.open, at(id)).events.some(event => event.id === id), 'the same clue is only spoken once');
  open = next.open;
}
next = walk(open, at('car-stop'));
assert.ok(next.requests.some(row => row.text.startsWith('The tracks are still fresh')) || marks(next.open).includes('burned-camp/thought/clues-0'));
assert.ok(marks(next.open).includes('burned-camp/thought/clues-1'));
open = next.open;
const withWorld = {world: open.world};
const speech = radioScene(burned, burned.beats.clues, threadRule(burned, withWorld, record(open)));
assert.deepEqual(speech.questions.map(row => row.id), ['ash-men', 'captives', 'buggies', 'walkers']);
const radioRequest = walk(open, site, {interact: true, openRoam: true}).requests.find(request => request.type === 'talk');
// The radio talk names itself and says that its speaker is not standing here (merge of 25 November).
assert.deepEqual(radioRequest, {type: 'talk', id: speech.id, scene: speech, speaker: 'cinder', radio: true});
const askedOverRadio = walk(open, site, {jobEvents: [{type: 'openTalkQuestion', scene: speech.id, id: 'walkers'}]}).open;
assert.ok(marks(askedOverRadio).includes('burned-camp/asked/walkers'));
next = walk(open, site, {jobEvents: [{type: 'talkChoice', id: 'burned-camp/radio-done', asked: ['ash-men']}]});
assert.ok(marks(next.open).includes('burned-camp/asked/ash-men'));
next = walk(next.open, site, {interact: true});
assert.ok(marks(next.open).includes('burned-camp/asked/captives'));
assert.match(next.requests.at(-1).text, /^Auntie Solder: The Road Rats do/);

for (const [point, beat, end, mark] of [[at('tracks-away'), 'scout', null, 'followed-tracks'],
  [at('road-home'), 'home', null, 'went-home'], [nowhere, 'clues', 'left', 'drove-on']]) {
  const left = drive(open, point).open;
  assert.equal(record(left).beat, beat);
  assert.equal(record(left).end, end);
  assert.equal(stageOf(left.world, 'glasshouse'), 'burned');
  assert.ok(marks(left).includes('burned-camp/burned') && marks(left).includes(`burned-camp/${mark}`));
}

const late = openFor(bank(bank(sampleWorld('after-the-smoke'))));
assert.equal(openThreadSigns(late).length, 0);
open = late;
for (const id of clueIds) {
  open = walk(open, at(id)).open;
  open = walk(open, at(id)).open;
}
assert.deepEqual(clueIds.filter(id => marks(open).includes(`burned-camp/${id}`)), ['frames', 'lamp', 'pump']);
assert.equal(record(drive(open, at('tracks-away')).open).beat, 'clues');
const ignored = drive(openFor(bank(bank(bank(bank(started))))), nowhere).open;
assert.equal(record(ignored).end, 'taken');
assert.ok(marks(ignored).includes('burned-camp/never-went'));
assert.match(openThreadTalkScene('burned-camp/remembered', ignored).lines[0].words, /a camp out past the Ridge/);

const falseTrail = direct(seedOf(sampleWorld('helped-camp'), 2));
assert.equal(falseTrail.open.threads[id].cast.blamed, 'ash-men');
const falseOpen = openFor(falseTrail);
const visuals = createSignView();
visuals.update({open: falseOpen}, site, 0);
assert.ok(visuals.group.getObjectByName('burned-camp smoke')?.visible);
assert.ok(visuals.group.getObjectByName('Ash heaped on the cook fire')?.visible);
visuals.update({open: holdOpenLand(falseOpen, 'job:test', ['signs'])}, site, 1);
assert.equal(visuals.group.getObjectByName('burned-camp smoke'), undefined);
assert.equal(visuals.group.getObjectByName('Ash heaped on the cook fire').visible, false);
visuals.dispose();
const ashQuestion = radioScene(burned, burned.beats.clues, threadRule(burned, {world: falseTrail}, falseTrail.open.threads[id]))
  .questions.find(row => row.id === 'ash');
assert.match(ashQuestion.lines[0].words, /somebody tipped that ash onto a fire that was already dead/);

for (const name of Object.keys(pageFunctions)) assert.doesNotThrow(() => new Function(`return ${pageSource(name)}`), name);
console.log('test-burned-camp: passed');
