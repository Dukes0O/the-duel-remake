// OPEN-SHARED: the rules every card of the open Scablands is built on. Every world here is in memory.
import assert from 'node:assert/strict';
import {isTrue, checkFact, FACTS} from '../src/world/open/facts.js';
import {applyEffects, checkEffect, LEDGER_EFFECTS, OPEN_EFFECTS} from '../src/world/open/open-effects.js';
import {newWorld, stageOf, feudOf, favoursOf, isDriven, squareAt, MOST_FAVOURS} from '../src/world/open/open-record.js';
import {PEOPLE} from '../src/world/open/content/people.js';
import {TALK_TABLES} from '../src/world/open/content/talk-tables.js';
import {NO_HOLDS, USUAL_HOLDS, takeHold, dropHold, isHeld, holdsOfJob} from '../src/world/open/holds.js';
import {NAMES, SITES, GROUPS, FEUD_GROUPS, nameOf, isGroup, keepsFeud} from '../src/world/open/register.js';
import {checkPerson, checkBuilding, checkCheckpoint, checkSite, checkNeed, checkThread, checkSentence, checkTalkRow, requireSound}
  from '../src/world/open/check-tables.js';
import {sampleWorld, SAMPLE_NAMES} from '../src/world/open/samples.js';
import {beginOpenLand, stepOpenLand, holdOpenLand, releaseOpenLand} from '../src/world/open/open-land.js';
import {OPEN_PARTS} from '../src/world/open/parts.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {resolveRoles, fillLine, checkRole, roleId, subjectFor, placeOfRole} from '../src/world/open/roles.js';
import {joinTalkTables} from '../src/world/open/content/talk-tables.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {STORY_PEOPLE} from '../src/story/people.js';
import {createLedger, applyChoice} from '../src/story/ledger.js';

// The register and the story's people agree, and every name is said one way.
assert.deepEqual(NAMES.map(row => row.id).sort(), Object.keys(STORY_PEOPLE).sort());
assert.equal(nameOf('glasshouse'), 'The Glasshouse');
assert.equal(nameOf('rats-nest'), "The Rats' Nest");
assert.equal(nameOf('tin-town'), 'Tin Town');
assert.ok(SITES.length >= 9);
assert.ok(isGroup('traders') && !keepsFeud('traders') && keepsFeud('road-rats'));
assert.ok(FEUD_GROUPS.every(id => GROUPS.includes(id)));

// Sample worlds: each builds, and two calls share nothing.
for (const name of SAMPLE_NAMES) {
  const a = sampleWorld(name), b = sampleWorld(name);
  assert.deepEqual(a, b, name);
  assert.notEqual(a.ledger, b.ledger);
}
assert.throws(() => sampleWorld('no-such'), /No sample world/);

// The one way of asking, on the state section 21 is written for.
const helped = sampleWorld('helped-camp');
const yes = fact => assert.equal(isTrue(fact, helped), true, JSON.stringify(fact));
const no = fact => assert.equal(isTrue(fact, helped), false, JSON.stringify(fact));
yes({fact: 'word', of: 'glasshouse', atLeast: 'Friendly'});
no({fact: 'word', of: 'glasshouse', atLeast: 'Sworn'});
yes({fact: 'word', of: 'radio-hill', is: 'Strangers'});          // nobody met: Strangers
yes({fact: 'word', of: 'walkers', atMost: 'Friendly'});
yes({fact: 'feud', of: 'road-rats', atLeast: 'Watching'});
no({fact: 'feud', of: 'road-rats', atLeast: 'Raiding'});
yes({fact: 'feud', of: 'ash-men', is: 'Watching'});
no({fact: 'feud', of: 'traders', atLeast: 'Watching'});          // traders keep no feud
yes({fact: 'favour', of: 'glasshouse'});
yes({fact: 'favour', of: 'glasshouse', is: 1});
no({fact: 'favour', of: 'walkers'});
yes({fact: 'found', site: 'glasshouse'});
no({fact: 'found', site: 'radio-hill'});
yes({fact: 'stage', site: 'glasshouse', is: 'camp'});
yes({fact: 'stage', site: 'rats-nest', is: 'den'});
yes({fact: 'mark', id: 'glasshouse/pump-mended'});
no({fact: 'made', id: 'tower/crows-step'});
yes({fact: 'debt', person: 'walkers'});
yes({fact: 'debt', id: 'gate-watch'});
no({fact: 'debt', person: 'dace'});
no({fact: 'promise', id: 'glasshouse/seed'});
yes({fact: 'stock', of: 'embers', atLeast: 3});
no({fact: 'stock', of: 'embers', atLeast: 4});
yes({fact: 'scrap', is: 140});
yes({fact: 'roadWord', is: 1});
yes({fact: 'night', atLeast: 3});
no({fact: 'night', atLeast: 4});
no({fact: 'thread', id: 'burned-camp', at: 'any'});
no({fact: 'town', has: 'well'});
yes({all: [{fact: 'found', site: 'glasshouse'}, {not: {fact: 'found', site: 'radio-hill'}}]});
yes({any: [{fact: 'found', site: 'radio-hill'}, {fact: 'night', atLeast: 2}]});
assert.throws(() => isTrue({fact: 'weather'}, helped), /Unknown fact/);
// A role's condition leaves out the site and is asked of each candidate in turn.
const camp = {all: [{fact: 'stage', is: 'camp'}, {fact: 'word', atLeast: 'Friendly'}, {fact: 'found'}]};
assert.equal(isTrue(camp, helped, {site: 'glasshouse', of: 'glasshouse'}), true);
assert.equal(isTrue(camp, helped, {site: 'radio-hill', of: 'radio-hill'}), false);
// A named draw gives the same answer every time, and a different name may not.
const draw = {fact: 'draw', name: 'burned-camp/start', chance: .5};
assert.equal(isTrue(draw, helped), isTrue(draw, sampleWorld('helped-camp')));
assert.equal(isTrue({fact: 'draw', name: 'x', chance: 1}, helped), true);
assert.equal(isTrue({fact: 'draw', name: 'x', chance: 0}, helped), false);
// The asker puts the storyline and the night in front of a draw's name, so that it is drawn again each night.
{
  const start = {fact: 'draw', name: 'start', chance: .5};
  const byNight = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(night => isTrue(start, helped, {draw: 'burned-camp/night-' + night}));
  assert.ok(byNight.includes(true) && byNight.includes(false), 'ten nights are not ten times the same answer');
  assert.equal(isTrue(start, helped, {draw: 'burned-camp/night-3'}), isTrue({...start, name: 'burned-camp/night-3/start'}, helped));
}
// A fact asked without its subject, or with a role nobody filled in, is refused aloud and never answered wrongly.
assert.throws(() => isTrue({fact: 'word', atLeast: 'Friendly'}, helped), /without whose word/);
assert.throws(() => isTrue({fact: 'feud', of: '@enemy', atLeast: 'Raiding'}, helped), /was not turned into a name/);
const after = sampleWorld('after-the-smoke');
assert.equal(isTrue({fact: 'thread', id: 'burned-camp', at: 'clues'}, after), true);
assert.equal(isTrue({fact: 'thread', id: 'burned-camp', at: 'over'}, after), false);
assert.equal(isTrue({fact: 'stage', site: 'glasshouse', is: 'burned'}, after), true);
assert.deepEqual(after.open.threads['burned-camp'].cast, {camp: 'glasshouse', enemy: 'road-rats'});

// Conditions as written: every fact has a check, and a slip is named in a sentence.
for (const fact of FACTS) assert.ok(checkFact({fact}).every(text => typeof text === 'string'));
assert.deepEqual(checkFact({fact: 'word', of: 'glasshouse', atLeast: 'Friendly'}), []);
assert.match(checkFact({fact: 'word', of: 'glashouse', atLeast: 'Friendly'})[0], /not in the register/);
assert.match(checkFact({fact: 'word', of: 'glasshouse', atLeast: 'Friends'})[0], /five words/);
assert.match(checkFact({fact: 'word', atLeast: 'Friendly'})[0], /needs "of"/);
assert.deepEqual(checkFact({fact: 'word', atLeast: 'Friendly'}, {given: ['of']}), []);
assert.match(checkFact({fact: 'word', of: 'glasshouse'})[0], /needs "atLeast", "atMost" or "is"/);
assert.match(checkFact({fact: 'favour', of: 'marigold'})[0], /owed by a people/);
assert.deepEqual(checkFact({fact: 'feud', of: '@enemy', atLeast: 'Raiding'}, {roles: {camp: 'sites', enemy: 'groups'}}), []);
assert.deepEqual(checkFact({fact: 'word', of: '@camp.people', atLeast: 'Friendly'}, {roles: {camp: 'sites'}}), []);
assert.match(checkFact({fact: 'word', of: '@camp', atLeast: 'Friendly'}, {roles: {camp: 'sites'}})[0], /write "@camp.people"/);
assert.match(checkFact({fact: 'found', site: '@enemy'}, {roles: {enemy: 'groups'}})[0], /where a site is wanted/);
assert.match(checkFact({fact: 'feud', of: '@enemy.people', atLeast: 'Raiding'}, {roles: {enemy: 'groups'}})[0], /not cast from sites/);
assert.match(checkFact({fact: 'feud', of: '@enemy', atLeast: 'Raiding'})[0], /only a storyline has a cast/);
assert.match(checkFact({fact: 'feud', of: '@rival', atLeast: 'Raiding'}, {roles: {camp: 'sites'}})[0], /the cast does not have/);
assert.match(checkFact({fact: 'feud', of: 'traders', atLeast: 'Raiding'})[0], /keeps a feud/);
assert.match(checkFact({fact: 'stage', site: 'glasshouse', is: 'ruined'})[0], /needs "is"/);
assert.match(checkFact({fact: 'weather'})[0], /not a fact/);
assert.match(checkFact({all: []})[0], /needs a list/);
assert.deepEqual(checkFact({all: [{fact: 'night', atLeast: 2}, {not: {fact: 'found', site: 'hangar'}}]}), []);

// The one way of changing: the six new effects, a group's feud, and the ledger's own effects through one door.
let world = sampleWorld('first-night');
const before = structuredClone(world);
let step = applyEffects(world, {id: 'test/find', effects: [
  {type: 'find', site: 'radio-hill'}, {type: 'site', id: 'radio-hill', stage: 'outpost'},
  {type: 'favour', person: 'radio-hill', by: 1}, {type: 'scrap', by: -25},
  {type: 'thread', id: 'radio-hill-voice', to: 'heard'}, {type: 'town', post: 'report', text: 'A mast was found.'},
  {type: 'feud', of: 'road-rats', by: 2}, {type: 'word', person: 'radio-hill', by: 1}, {type: 'mark', id: 'test/found'},
  {type: 'stock', stock: 'embers', by: -1}]});
assert.deepEqual(world, before, 'the world given is not changed');
world = step.world;
assert.equal(step.changes.length, 10);
assert.ok(step.changes.every(change => change.choiceId === 'test/find' && change.night === 2));
assert.deepEqual(world.open.found, ['radio-hill']);
assert.equal(stageOf(world, 'radio-hill'), 'outpost');
assert.equal(favoursOf(world, 'radio-hill'), 1);
assert.equal(world.scrap, 35);
assert.equal(world.open.threads['radio-hill-voice'].beat, 'heard');
assert.equal(feudOf(world, 'road-rats'), 'Hunting');
assert.equal(world.ledger.feud, 'Watching', 'the Ash Men are not moved by another group\'s feud');
assert.equal(world.ledger.words['radio-hill'], 'Friendly');
assert.equal(world.ledger.stocks.embers, 3);
assert.equal(world.open.journal.length, 7);
// The same choice on the same night changes nothing more.
assert.deepEqual(applyEffects(world, {id: 'test/find', effects: [{type: 'scrap', by: -25}]}), {world, changes: []});
// A site found stays found; favours stop at two and at nothing; scrap never goes below nothing and says what is owed.
step = applyEffects(world, {id: 'test/again', effects: [{type: 'find', site: 'radio-hill'},
  {type: 'favour', person: 'radio-hill', by: 5}, {type: 'scrap', by: -50}]});
world = step.world;
assert.deepEqual(world.open.found, ['radio-hill']);
assert.equal(favoursOf(world, 'radio-hill'), MOST_FAVOURS);
assert.equal(world.scrap, 0);
assert.equal(step.changes.find(change => change.type === 'scrap').owed, 15);
step = applyEffects(world, {id: 'test/spend', effects: [{type: 'favour', person: 'radio-hill', by: -3}]});
assert.equal(favoursOf(step.world, 'radio-hill'), 0);
// The Ash Men's feud is the ledger's own, named or not, so a ledger saved today is read as before.
step = applyEffects(world, {id: 'test/ash', effects: [{type: 'feud', of: 'ash-men', by: 1}]});
assert.equal(step.world.ledger.feud, 'Raiding');
assert.equal(feudOf(step.world, 'ash-men'), 'Raiding');
assert.deepEqual(step.world.open.feuds, world.open.feuds);
// A thread's end closes it, and its cast is kept.
step = applyEffects(sampleWorld('after-the-smoke'), {id: 'test/end', effects: [{type: 'thread', id: 'burned-camp', end: 'freed'}]});
assert.equal(isTrue({fact: 'thread', id: 'burned-camp', at: 'over'}, step.world), true);
assert.equal(step.world.open.threads['burned-camp'].cast.camp, 'glasshouse');
assert.throws(() => applyEffects(world, {id: 'test/bad', effects: [{type: 'find', site: 'atlantis'}]}), /Unknown site/);
assert.throws(() => applyEffects(world, {id: 'Bad Id', effects: []}), /Invalid choice id/);
// A plain ledger and applyChoice still behave as they did.
assert.equal(applyChoice(createLedger({seed: 1, night: 2}), {id: 'a', effects: [{type: 'feud', by: 1}]}).ledger.feud, 'Raiding');
for (const type of [...LEDGER_EFFECTS, ...OPEN_EFFECTS]) assert.ok(Array.isArray(checkEffect({type})));
assert.deepEqual(checkEffect({type: 'favour', person: 'glasshouse', by: 1}), []);
assert.match(checkEffect({type: 'site', id: 'glasshouse', stage: 'ruined'})[0], /not a stage/);
assert.match(checkEffect({type: 'rain'})[0], /not an effect/);
assert.match(checkEffect({type: 'word', person: 'glasshouse', set: 'Swron'})[0], /five words/);
assert.match(checkEffect({type: 'favour', person: 'marigold', by: 1})[0], /owed by a people/);
assert.match(checkEffect({type: 'promise', id: 'a/b', person: 'dot', text: 'You promised Dot.'})[0], /"due"/);
assert.match(checkEffect({type: 'met', person: 'dot', text: 'x'.repeat(260)})[0], /longer than/);
assert.deepEqual(checkEffect({type: 'site', id: '@camp', stage: 'burned'}, {roles: {camp: 'sites'}}), []);
assert.match(checkEffect({type: 'site', id: '@enemy', stage: 'burned'}, {roles: {enemy: 'groups'}})[0], /where a site is wanted/);
assert.match(checkEffect({type: 'find', site: '@camp.people'}, {roles: {camp: 'sites'}})[0], /where a site is wanted/);
assert.match(checkEffect({type: 'word', person: '@den', by: -1}, {roles: {den: 'sites'}})[0], /write "@den.people"/);
assert.match(checkEffect({type: 'promise', id: 'a/b', person: 'dot', text: 'You promised Dot.', dueNights: -1})[0], /nought or more/);
assert.match(checkEffect({type: 'site', id: '@camp', stage: 'burned'})[0], /only a storyline has a cast/);
// Every effect that the check passes can be applied, on the state section 21 is written for.
{
  const passed = [
    {type: 'find', site: 'radio-hill'}, {type: 'site', id: 'glasshouse', stage: 'burned'},
    {type: 'favour', person: 'glasshouse', by: 1}, {type: 'scrap', by: -6}, {type: 'thread', id: 'burned-camp', to: 'clues'},
    {type: 'town', post: 'ransom', scrap: 150}, {type: 'feud', of: 'road-rats', by: 1}, {type: 'feud', by: 1},
    {type: 'ground', square: 311}, {type: 'crossing', checkpoint: 'mall-road-2'}, {type: 'rest', checkpoint: 'mall-road-2'},
    {type: 'dirt', by: .25}, {type: 'stock', stock: 'embers', by: -1}, {type: 'word', person: 'glasshouse', set: 'Sworn'},
    {type: 'word', person: 'marigold', by: 1}, {type: 'roadWord', by: 1}, {type: 'mark', id: 'glasshouse/axle-mended'},
    {type: 'made', id: 'tower/crows-step'}, {type: 'debt', id: 'finch/lift', person: 'finch', text: 'Finch owes you a lift.'},
    {type: 'promise', id: 'glasshouse/seed', person: 'glasshouse', text: 'You promised the Glasshouse a sack of seed beans.', dueNights: 3},
    {type: 'met', person: 'marigold', text: 'Marigold showed you her beans.'},
    {type: 'rumour', site: 'bus-ring'},
  ];
  for (const effect of passed) assert.deepEqual(checkEffect(effect), [], JSON.stringify(effect));
  const done = applyEffects(sampleWorld('helped-camp'), {id: 'test/every-effect', effects: passed});
  assert.equal(done.changes.length, passed.length, 'each one changed something');
  assert.equal(done.world.ledger.obligations.find(item => item.id === 'glasshouse/seed').due, 6, 'three nights from the third night');
  assert.equal(isTrue({fact: 'promise', id: 'glasshouse/seed'}, done.world), true);
  assert.equal(done.world.open.car.dirt, .25);
  assert.equal(done.world.open.crossings['mall-road-2'], 1);
  assert.equal(isTrue({fact: 'mark', id: 'rumour/bus-ring'}, done.world), true, 'a rumour is the mark the maps read');
  assert.deepEqual(checkEffect({type: 'rumour', site: '@rumoured'}, {roles: {rumoured: 'sites'}}), []);
}
// A choice is applied once a night; one that may happen again carries its count; the next night it may be made again.
{
  const repair = n => ({id: 'forge-shed/repair' + (n ? '/' + n : ''), effects: [{type: 'scrap', by: -6}]});
  let now = applyEffects(sampleWorld('helped-camp'), repair()).world;
  assert.equal(now.scrap, 134);
  assert.equal(applyEffects(now, repair()).world.scrap, 134, 'the same id on the same night pays once');
  now = applyEffects(now, repair(2)).world;
  assert.equal(now.scrap, 128);
  const tomorrow = {...now, ledger: {...now.ledger, night: now.ledger.night + 1}};
  assert.equal(applyEffects(tomorrow, repair()).world.scrap, 122);
  // The counting effects are applied every time, whatever the id.
  const cross = {id: 'checkpoint/mall-road-2', effects: [{type: 'crossing', checkpoint: 'mall-road-2'}, {type: 'rest', checkpoint: 'mall-road-2'}]};
  now = applyEffects(applyEffects(now, cross).world, cross).world;
  assert.equal(now.open.crossings['mall-road-2'], 2);
  assert.deepEqual(now.open.resting, ['mall-road-2']);
  assert.equal(now.open.journal.some(change => change.type === 'crossing'), false);
  // A counting choice shares the journal with the world it came from, and leaves that world as it was.
  const dusty = applyEffects(now, {id: 'ground/dirt', effects: [{type: 'dirt', by: .1}, {type: 'ground', square: 5}]});
  assert.equal(dusty.world.open.journal, now.open.journal);
  assert.equal(now.open.car.dirt, 0);
  assert.equal(now.open.driven.includes(5), false);
  assert.deepEqual(applyEffects(now, {id: 'bank/wake', effects: [{type: 'rest', clear: true}]}).world.open.resting, []);
  // A price that cannot be paid in full says what is still owed, even from an empty pocket.
  const broke = applyEffects({...now, scrap: 0}, {id: 'forge-shed/repair/9', effects: [{type: 'scrap', by: -6}]});
  assert.equal(broke.changes[0].owed, 6);
  // A cast handed in is copied, so the caller's object is not the record's.
  const cast = {camp: 'glasshouse'};
  const began = applyEffects(now, {id: 'test/cast', effects: [{type: 'thread', id: 'dry-pump', to: 'asked', cast}]}).world;
  cast.camp = 'radio-hill';
  assert.equal(began.open.threads['dry-pump'].cast.camp, 'glasshouse');
}
// Roles: a storyline never names its camp. '@camp' is the id cast, '@camp.people' the people who live there.
{
  const cast = {camp: 'glasshouse', enemy: 'road-rats', helper: 'finch'};
  assert.deepEqual(resolveRoles([{type: 'site', id: '@camp', stage: 'burned'}, {type: 'word', person: '@camp.people', by: 1},
    {fact: 'feud', of: '@enemy', atLeast: 'Raiding'}, {type: 'word', person: '@helper.people', by: 1}], cast),
  [{type: 'site', id: 'glasshouse', stage: 'burned'}, {type: 'word', person: 'glasshouse', by: 1},
    {fact: 'feud', of: 'road-rats', atLeast: 'Raiding'}, {type: 'word', person: 'glasshouse', by: 1}]);
  assert.equal(roleId('@camp.people', {camp: 'rats-nest'}), 'road-rats');
  assert.throws(() => roleId('@camp.people', {camp: 'crows-step'}), /Nobody lives/);
  assert.throws(() => resolveRoles({of: '@rival'}, cast), /has not been cast/);
  assert.deepEqual(checkRole('@camp.leader', {camp: 'sites'}), ['"@camp.leader" should be "@camp" or "@camp.people".']);
  // A role's own condition is asked of every candidate without a throw, whatever the order of its parts.
  const friendly = {any: [{fact: 'word', atLeast: 'Friendly'}, {fact: 'favour'}, {fact: 'stage', is: 'ruin'}]};
  const world21 = sampleWorld('helped-camp');
  assert.deepEqual(SITES.filter(row => isTrue(friendly, world21, subjectFor('sites', row.id))).map(row => row.id), ['glasshouse', 'hangar']);
  assert.deepEqual(subjectFor('sites', 'crows-step'), {site: 'crows-step', of: null});
  assert.deepEqual(subjectFor('groups', 'road-rats'), {of: 'road-rats'});
  assert.equal(placeOfRole('@camp', cast), 'glasshouse');
  assert.equal(placeOfRole('camp', cast), 'glasshouse');
  assert.equal(placeOfRole('tin-town', cast), 'tin-town');
  assert.equal(fillLine('{camp.leader} would never have left {camp.thing} behind.', cast), 'Marigold would never have left her glass frames behind.');
  assert.equal(fillLine('{camp.name} is burning, and {enemy.name} did it.', cast), 'The Glasshouse is burning, and the Road Rats did it.');
  assert.equal(fillLine('Ask {enemy.leader}, or ask {camp.people}.', cast), 'Ask Sump, or ask the Glasshouse.');
  assert.equal(fillLine('{camp.leader} keeps {camp.thing} close.', {camp: 'bus-ring'}), 'Gasket keeps their tools close.');
  assert.equal(fillLine('{camp.leader} waits.', {camp: 'crows-step'}), "The Crow's Step waits.");
  assert.throws(() => fillLine('{rival.name} did this.', cast), /has not been cast/);
  const burned = applyEffects(sampleWorld('helped-camp'), {id: 'burned-camp/burn', effects: resolveRoles(
    [{type: 'site', id: '@camp', stage: 'burned'}, {type: 'feud', of: '@enemy', by: 1}], cast)});
  assert.equal(isTrue(resolveRoles({fact: 'feud', of: '@enemy', atLeast: 'Raiding'}, cast), burned.world), true);
}

// Holds: a system runs only while nobody holds it.
assert.deepEqual(holdsOfJob({steps: [{kind: 'roam'}]}), NO_HOLDS);
assert.deepEqual(holdsOfJob({steps: [{kind: 'reach'}, {kind: 'talk'}]}), USUAL_HOLDS);
assert.deepEqual(holdsOfJob({holds: [], steps: [{kind: 'reach'}]}), []);
let holds = takeHold(NO_HOLDS, 'scout');
assert.ok(isHeld(holds, 'checkpoints') && isHeld(holds, 'signs') && !isHeld(holds, 'services'));
holds = takeHold(holds, 'rescue', ['checkpoints']);
holds = dropHold(holds, 'scout');
assert.ok(isHeld(holds, 'checkpoints') && !isHeld(holds, 'signs'), 'one mission ending does not let go for another');
assert.deepEqual(dropHold(holds, 'rescue'), []);
assert.throws(() => takeHold(NO_HOLDS, 'x', ['weather']), /Unknown system/);

// A check for every table. The rows are the examples of section 12.
const odessa = {id: 'odessa', figure: 'odessa', home: 'tin-town', talk: 'odessa', routine: {
  day: {kind: 'track', loop: true, stops: [{at: ['forge-shed', 'bench'], task: 'weld', seconds: 40},
    {at: ['tin-town', 14, -6], task: 'carry', seconds: 0}]},
  dusk: {kind: 'wander', around: ['tin-town', 'hearth'], radius: 9, pause: [4, 12]},
  dark: {kind: 'post', at: ['forge-shed', 'cot'], task: 'sleep'}}};
assert.deepEqual(checkPerson(odessa), []);
assert.match(checkPerson({...odessa, home: 'tin-twon'})[0], /odessa: The home/);
assert.match(checkPerson({...odessa, routine: {day: {kind: 'stroll'}}})[0], /needs a kind/);
const shed = {id: 'forge-shed', place: 'tin-town', shell: 'shack-long', at: [22, -18], heading: 1.57,
  door: {side: 'south', width: 2.4}, room: {spots: {bench: [-3, 1], bay: [2, 0], cot: [-4, -2]}, things: ['anvil']},
  services: [{id: 'repair', by: 'odessa', needs: {fact: 'word', of: 'tin-town', atLeast: 'Wary'}, price: {scrapPerTenArmour: 2, least: 4}}],
  finds: [{id: 'forge-shed/old-map', needs: {fact: 'night', atLeast: 2}, gives: [{type: 'mark', id: 'rumour/radio-hill'}]}]};
assert.deepEqual(checkBuilding(shed), []);
assert.match(checkBuilding({...shed, services: [{id: 'repair', by: 'odesa'}]})[0], /not in the register/);
const checkpoint = {id: 'mall-road-2', at: {road: 'mall-road', share: .7}, radius: 180, chance: .45, cars: [1, 4],
  who: [{group: 'road-rats', weight: 3}, {group: 'traders', weight: 2},
    {group: 'ash-men', weight: 1, needs: {fact: 'feud', of: 'ash-men', atLeast: 'Raiding'}}]};
assert.deepEqual(checkCheckpoint(checkpoint), []);
assert.match(checkCheckpoint({...checkpoint, who: [{group: 'marigold', weight: 1}]})[0], /not a group/);
const glasshouse = {id: 'glasshouse', name: 'The Glasshouse', kind: 'camp', people: 'glasshouse',
  where: [{at: ['ships-in-sand', 2000, 700]}, {at: ['dead-mall', -1500, -2150]}, {at: ['tin-town', -200, 1900]}],
  foundWithin: 160, tell: 'thin-smoke-at-dusk', residents: ['marigold', 'finch'],
  needs: ['glasshouse/pump', 'glasshouse/seed'], hostileTo: []};
assert.deepEqual(checkSite(glasshouse), []);
assert.match(checkSite({...glasshouse, name: 'The Glass House'})[0], /register calls it/);
assert.deepEqual(checkNeed({id: 'glasshouse/pump', kind: 'mend', what: 'The wind pump has seized.', wrenchSeconds: 12, scrap: 8,
  gives: [{type: 'favour', person: 'glasshouse', by: 1}, {type: 'mark', id: 'glasshouse/pump-mended'}]}), []);
assert.deepEqual(checkNeed({id: 'glasshouse/seed', kind: 'supply', what: 'They need a sack of seed beans from Dot.', dueNights: 3,
  gives: [{type: 'word', person: 'glasshouse', set: 'Sworn'}]}), []);
assert.match(checkNeed({id: 'x', kind: 'mend', what: 'A pump — broken.', wrenchSeconds: 1, scrap: 0, gives: [{type: 'scrap', by: 1}]})[0], /em dash/);
assert.deepEqual(checkSentence('Mind the kiln door, because it is hotter than it looks.'), []);
assert.match(checkSentence('No full stop')[0], /does not end as a sentence/);
assert.throws(() => requireSound([glasshouse, glasshouse], checkSite, 'Sites'), /used twice/);
assert.throws(() => requireSound([{...glasshouse, kind: 'den'}], checkSite, 'Sites'), /Sites:/);

// A storyline, in the one shape of section 18 (docs/story/open-scablands.md, "The one shape of a storyline's file").
const thread = {id: 'burned-camp', title: 'Smoke over a friend', kind: 'trouble',
  reads: ['word', 'found', 'stage', 'feud', 'favour', 'made', 'stock', 'night'],
  writes: ['word', 'site', 'feud', 'mark', 'favour', 'stock', 'scrap'],
  cast: {
    camp: {from: 'sites', where: {all: [{fact: 'stage', is: 'camp'}, {fact: 'found'}, {fact: 'word', atLeast: 'Friendly'}]}},
    enemy: {from: 'groups', where: {fact: 'feud', atLeast: 'Watching'}, weightBy: 'feud'},
    blamed: {from: 'groups', draw: 'false-trail', chance: .3, otherwise: 'enemy'}},
  starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: 'burned-camp', at: 'any'}}, {fact: 'draw', name: 'start', chance: .5}]},
  sign: {kind: 'smoke', at: '@camp', seenWithin: 3500, lastsNights: 2},
  beats: {
    sign: {when: 'sign-seen', thoughts: ['That smoke is over by {camp.name}, and it is far too thick for a cooking fire.'], next: 'clues'},
    clues: {when: {reach: '@camp'}, choices: [
      {id: 'burned-camp/drive-on', effects: [{type: 'mark', id: 'burned-camp/drove-on'}, {type: 'site', id: '@camp', stage: 'burned'},
        {type: 'word', person: '@camp.people', by: -1}], next: 'left'},
      {id: 'burned-camp/follow', by: 'go', next: 'scout'}]},
    scout: {when: {fact: 'feud', of: '@enemy', atLeast: 'Watching'},
      mission: {id: 'burned-camp/scout', kind: 'reach', holds: ['checkpoints', 'signs'],
        outcomes: {seen: {effects: [{type: 'feud', of: '@enemy', by: 1}, {type: 'read', fact: 'met', key: 'rell'}], next: 'freed'}}}}},
  ends: ['freed', 'bought-back', 'left', 'taken'],
  ignored: {afterNights: 4, says: 'dot', line: 'There used to be a camp out past the Ridge that grew beans.'}};
assert.deepEqual(checkThread(thread), []);
const inBeat = (name, change) => ({...thread, beats: {...thread.beats, [name]: {...thread.beats[name], ...change}}});
const inClues = choice => inBeat('clues', {choices: [{id: 'a', ...choice}]});
const slips = [
  [{...thread, kind: 'sad'}, /needs a kind/],
  [{...thread, ends: []}, /needs "ends"/],
  [{...thread, ignored: undefined}, /needs "ignored"/],
  [{...thread, sign: {kind: 'rainbow'}}, /needs a sign/],
  [{...thread, reads: ['word']}, /its "reads" does not list/],
  [{...thread, writes: ['word']}, /its "writes" does not list/],
  [{...thread, starts: {fact: 'thread', id: 'runaway', at: 'over'}}, /No storyline's file names another/],
  [inBeat('sign', {next: 'nowhere'}), /which is not a beat of this file/],
  [inBeat('sign', {thoughts: ['{rival.name} did this.']}), /the cast does not have/],
  [inClues({effects: [{type: 'mark', id: 'glasshouse/x'}]}), /should begin with "burned-camp\/"/],
  [inClues({effects: [{type: 'thread', id: 'burned-camp', to: 'scout'}]}), /"thread" effect written by hand/],
  [{...thread, starts: {fact: 'word', atLeast: 'Friendly'}}, /needs "of"/],
  [inClues({next: 'scuot'}), /"scuot", which is not a beat/],
  [inClues({next: [{when: {fact: 'night', atLeast: 3}, to: 'fred'}, {to: 'left'}]}), /"fred", which is not a beat/],
  [inBeat('scout', {mission: {...thread.beats.scout.mission, outcomes: {seen: {effects: [{type: 'site', id: 'glasshuose', stage: 'burned'}]}}}}), /not a site in the register/],
  [inClues({effects: [{type: 'rain'}]}), /not an effect/],
  [inClues({effects: [{type: 'site', id: '@cmap', stage: 'burned'}]}), /the cast does not have/],
  [{...thread, sign: {kind: 'smoke', at: 'cmap'}}, /The sign names "cmap"/],
  [inBeat('scout', {mission: {...thread.beats.scout.mission, outcomes: {seen: {effects: [{type: 'fnid', site: '@camp'}]}}}}), /"fnid" is not an effect/],
  [inClues({effects: [{type: 'word', person: '@camp', by: 1}]}), /write "@camp.people"/],
  [inBeat('clues', {when: {reach: 'cmap'}}), /beats.clues.when \(reach\) names "cmap"/],
  [inBeat('clues', {when: {reach: 'camp'}}), /names the role "camp" bare. Write "@camp"/],
  [inBeat('sign', {thoughts: ['{camp.banana} is burning.']}), /for "banana"/],
  [{...thread, beats: {...thread.beats, over: {next: 'freed'}}}, /cannot be called "over"/],
  // A key the shape does not have is refused, and the sentence says which key and where.
  [{...thread, marks: {}}, /The storyline has the key "marks"/],
  [inClues({act: 'say'}), /beats.clues.choices\[0\] has the key "act"/],
  [inBeat('clues', {needs: {fact: 'night', atLeast: 3}}), /beats.clues has the key "needs"/],
  [inBeat('sign', {thoughts: [{thought: 'Smoke.', needs: true}]}), /thoughts\[0\] has the key "needs"/],
  [{...thread, cast: {...thread.cast, camp: {...thread.cast.camp, only: 'glasshouse'}}}, /cast.camp has the key "only"/],
  [inBeat('clues', {when: {banked: 1}}), /a condition is a fact/],
  [inBeat('clues', {when: {after: 'nowhere'}}), /\(after\) names "nowhere"/],
  [inBeat('clues', {when: {asked: 'nobody'}}), /\(asked\) names "nobody"/],
  [inBeat('clues', {when: {cast: 'rival'}}), /not a role of the cast/],
  [inBeat('scout', {mission: {...thread.beats.scout.mission, job: 1}}), /scout.mission has the key "job"/],
  [{...thread, ignored: {afterNights: 4, rows: []}}, /ignored has the key "rows"/],
];
for (const [slip, sentence] of slips) assert.ok(checkThread(slip).some(text => sentence.test(text)), String(sentence) + ' <- ' + checkThread(slip).join(' | '));

// The host: parts run in order, their choices are applied, and a later part sees what an earlier one changed.
const roamJob = {id: 'open-roam', open: {world: sampleWorld('first-night')}, steps: [{kind: 'roam'}]};
let open = beginOpenLand(roamJob);
assert.notEqual(open.world, roamJob.open.world, 'the job keeps its own copy of the world');
assert.deepEqual(open.holds, [], 'a job of the one step roam holds nothing');
assert.ok(isHeld(beginOpenLand({...roamJob, id: 'scout', steps: [{kind: 'reach'}]}).holds, 'checkpoints'));
assert.throws(() => beginOpenLand({steps: []}), /needs definition.open.world/);
const finder = {id: 'finder', begin: () => ({ticks: 0}), step(state, {view}) {
  if (state.ticks === 0 && view.player.position.x > 100) return {state: {ticks: 1},
    choices: [{id: 'finder/found', effects: [{type: 'find', site: 'crows-step'}]}],
    events: [{type: 'siteFound', site: 'crows-step'}],
    requests: [{type: 'say', lineId: 'open/site-found/crows-step', text: 'The Crow\'s Step is on your map.'}]};
  return {state};
}};
const watcher = {id: 'watcher', step(state, {world, holds}) {
  return {state: {saw: isTrue({fact: 'found', site: 'crows-step'}, world), held: isHeld(holds, 'checkpoints')},
    leave: state.saw ? {to: 'hearth'} : null};
}};
const view = x => ({player: {position: {x, y: 0, z: 0}}, onFoot: false});
let ticked = stepOpenLand(open, view(0), 1 / 60, [finder, watcher]);
assert.deepEqual(ticked.events, []);
assert.equal(ticked.leave, null);
ticked = stepOpenLand(ticked.open, view(200), 1 / 60, [finder, watcher]);
assert.deepEqual(ticked.open.world.open.found, ['crows-step']);
assert.equal(ticked.open.parts.watcher.saw, true, 'the later part sees the earlier part\'s choice in the same tick');
assert.deepEqual(ticked.events, [{type: 'siteFound', site: 'crows-step', part: 'finder'}]);
assert.equal(ticked.open.events[0].seq, 1);
assert.equal(ticked.requests.length, 1);
assert.equal(ticked.changes.length, 1);
const third = stepOpenLand(ticked.open, view(200), 1 / 60, [finder, watcher]);
assert.deepEqual(third.leave, {to: 'hearth'});
assert.equal(third.open.events.length, 1, 'events are kept, not raised again');
open = holdOpenLand(ticked.open, 'thread:burned-camp', ['checkpoints']);
assert.equal(stepOpenLand(open, view(0), 0, [watcher]).open.parts.watcher.held, true);
assert.equal(stepOpenLand(releaseOpenLand(open, 'thread:burned-camp'), view(0), 0, [watcher]).open.parts.watcher.held, false);
// A part is told what its own choices changed on the tick before, takes and drops a hold, and hears the job's events.
{
  const shop = {id: 'shop', step(state, {changes, view}) {
    return {state: {told: changes, heard: view.jobEvents ?? []},
      choices: state.told ? [] : [{id: 'shop/repair/1', effects: [{type: 'scrap', by: -500}]}],
      ...(view.takes ? {hold: {holder: 'beat:scout', systems: ['checkpoints']}} : {}),
      ...(view.drops ? {release: 'beat:scout'} : {})};
  }};
  let land = stepOpenLand(beginOpenLand(roamJob), {...view(0), takes: true}, 1, [shop]).open;
  assert.equal(isHeld(land.holds, 'checkpoints'), true);
  land = stepOpenLand(land, {...view(0), drops: true, jobEvents: [{type: 'talkChoice', id: 'odessa/mend'}]}, 1, [shop]).open;
  assert.equal(land.parts.shop.told[0].owed, 440, 'the part learns that the price was not paid in full');
  assert.deepEqual(land.parts.shop.heard, [{type: 'talkChoice', id: 'odessa/mend'}]);
  assert.equal(isHeld(land.holds, 'checkpoints'), false);
  assert.deepEqual(stepOpenLand(land, view(0), 1, [shop]).open.changes, {}, 'changes are told once');
  const thief = {id: 'thief', step: () => ({release: 'job:open-roam'})};
  assert.throws(() => stepOpenLand(land, view(0), 1, [thief]), /may not take or drop the job's own hold/);
  // Events keep a rising number across ticks, and the last 32 are kept.
  const noisy = {id: 'noisy', step: () => ({events: Array.from({length: 20}, () => ({type: 'tick'}))})};
  let loud = stepOpenLand(beginOpenLand(roamJob), view(0), 1, [noisy]).open;
  loud = stepOpenLand(loud, view(0), 1, [noisy]).open;
  assert.equal(loud.events.length, 32);
  assert.deepEqual([loud.events[0].seq, loud.events[31].seq], [9, 40]);
}
// The shared tables include the content of each populated town row.
assert.deepEqual(OPEN_PARTS.map(part => part.id), ['people', 'buildings', 'sites', 'checkpoints', 'threads', 'ground']);
for (const id of ['auntie-solder', 'cinder', 'rell', 'dace', 'wim']) {
  assert.equal(PEOPLE.filter(row => row.id === id).length, 1, id + ' is in the joined people table once');
  assert.equal(TALK_TABLES[id].filter(row => row.scene.startsWith('open/town/')).length, 6,
    id + ' has its five greetings and Night 2 line in the joined talk table');
}
// Driven ground: 560 squares, kept in the order driven, and not journalled.
assert.equal(squareAt(-7000, -5000), 0);
assert.equal(squareAt(6999, 4999), 559);
assert.equal(squareAt(7000, 0), null);
assert.equal(squareAt(6000, 0), squareAt(6027, 5));
{
  const start = sampleWorld('first-night'), square = squareAt(6000, 0);
  const drove = applyEffects(start, {id: 'ground/' + square, effects: [{type: 'ground', square}]});
  assert.deepEqual(drove.world.open.driven, [square]);
  assert.equal(drove.world.open.journal.length, 0);
  assert.equal(isDriven(drove.world, square), true);
  assert.deepEqual(applyEffects(drove.world, {id: 'ground/again', effects: [{type: 'ground', square}]}).changes, []);
  assert.throws(() => applyEffects(start, {id: 'ground/off', effects: [{type: 'ground', square: 560}]}), /Unknown square/);
}
const still = beginOpenLand(roamJob), stepped = stepOpenLand(still, view(0), 1);
assert.deepEqual(stepped.open.world, still.world);
assert.equal(stepped.open.seconds, 1);

// The step `roam` never completes by itself, and ends when a part asks to leave.
let job = createJob({id: 'open-roam', steps: [{kind: 'roam'}]}, 7);
for (let i = 0; i < 3600; i++) job = stepJob(job, {open: {leave: null}}, 1);
assert.equal(job.done, false, 'an hour of roaming is not a finished job');
job = stepJob(job, {open: {leave: {to: 'hearth'}}}, 1);
assert.equal(job.done, true);
assert.ok(job.events.some(event => event.type === 'roamLeft' && event.to === 'hearth'));
{
  const left = stepJob(createJob({steps: [{kind: 'roam'}]}), {open: {leave: {type: 'mission', to: 'burned-camp/scout'}}}, 1);
  assert.ok(left.events.some(event => event.type === 'roamLeft' && event.to === 'burned-camp/scout'), 'a part cannot rename the event');
}
// Talk tables: a person's rows from several files are joined in order, and a bad row is named.
{
  const scene = id => ({needs: {fact: 'night', atLeast: 2}, scene: id});
  const joined = joinTalkTables([{dot: [scene('thread-row')]}, {dot: [scene('greeting')], cinder: [{scene: 'kiln'}]}]);
  assert.deepEqual(joined.dot.map(row => row.scene), ['thread-row', 'greeting']);
  assert.deepEqual(checkTalkRow({scene: 'kiln'}), []);
  assert.throws(() => joinTalkTables([{dott: [scene('x')]}]), /not in the register/);
  assert.throws(() => joinTalkTables([{dot: [{needs: {fact: 'weather'}, scene: 'x'}]}]), /not a fact/);
}
assert.throws(() => createJob({steps: [{kind: 'wander-about'}]}), /Unknown job step/);

// The world a job begins with: read from a profile, and the profile is not changed.
const profile = {wasteland: {scrap: 77.9}};
const fresh = worldForProfile(profile, 99);
assert.equal(fresh.scrap, 77);
assert.equal(fresh.ledger.night, 1);
assert.equal(fresh.seed, 99);
assert.deepEqual(profile, {wasteland: {scrap: 77.9}});
assert.deepEqual(newWorld({seed: 5}).open.found, []);

console.log('test-open-shared: ok');
