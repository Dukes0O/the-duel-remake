// FAR-JOBS-1: pure rules, slow varied input traces, real Kestrel physics. No browser or persistent storage.
import assert from 'node:assert/strict';
import {FAR_JOBS, FAR_WORK, buildFarJobs, farJobDefinition, farJobParts, openFarJobs, farOutposts} from '../src/world/jobs/far-side.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {jobForRun} from '../src/world/jobs/job-vehicle.js';
import {longLoadContacts, longLoadEnds, stepLongLoad} from '../src/world/jobs/steps/long-load.js';
import {stepHeliceiling} from '../src/world/jobs/steps/heliceiling.js';
import {createHeliState, stepHeli, KESTREL, GRAVITY} from '../src/heli/heli-flight.js';
import {createLand, movedTable, LAND} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createTown} from '../src/town/town-state.js';
import {addScrapyardPart} from '../src/town/town-scrapyard.js';
import {FAR_CAPTIONS} from '../src/story/far-lines.js';
import {makeRng} from '../src/rng.js';

let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const same = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const enabled = {enabled:true};
const options = {...enabled, scrapyard:{x:0, z:-205}};
same(openFarJobs(), [], 'off means no jobs');
same(farJobDefinition('far-whose-goat'), null, 'definitions need the switch');
check(!createFeatureFlags({qa:false, storage:null}).enabled('far-jobs'), 'far-jobs is off for players');
same(openFarJobs({...enabled, chapterDone:14}), [], 'no goat before chapter 15');
same(openFarJobs({...enabled, chapterDone:15}).map(job => job.id), ['far-whose-goat'], 'the goat starts the strand');
same(openFarJobs({...enabled, jobsDone:['far-whose-goat']}).map(job => job.id), ['far-too-high'], 'the flight follows the goat');
same(openFarJobs({...enabled, jobsDone:['far-too-high'], buildingBuilt:['scrapyard'], standing:{'deck-town':9}}), [], 'Imre needs ten standing');
same(openFarJobs({...enabled, jobsDone:['far-too-high'], buildingBuilt:['scrapyard'], standing:{'deck-town':10}}).map(job => job.id), ['far-long-shaft'], 'the shaft needs a Scrapyard and Imre');
same(farJobDefinition('far-long-shaft', enabled), null, 'never invent a Scrapyard drop');
const shifted = buildFarJobs(createLand(movedTable(SCABLANDS_PLACES, 'dead-mall', 120, -85)), () => 7);
for (let i = 0; i < 3; i++) {
  const a = FAR_JOBS[0].steps[0].finds[i], b = shifted[0].steps[0].finds[i];
  same([b.position.x - a.position.x, b.position.z - a.position.z, b.position.y], [120, -85, 7], 'southern finds follow the named land and ground');
}
const town = createTown(713, 'Far checks'), before = structuredClone(town);
const yard = farOutposts(town).outposts.find(row => row.id === 'hermit-camp');
same(yard.animals.filter(animal => animal.id === 'fourteen').map(animal => [animal.kind, animal.cue]), [['goat', 'far.bell']], 'Fourteen joins Tam in the existing animal layout');
same(town, before, 'building the outposts changes no town state');
same(FAR_WORK[0].parts, ['propeller-shaft', 'cutter-gears', 'landing-rams'], 'the borer needs all three real ingredients');
for (const partId of FAR_WORK[0].parts) check(addScrapyardPart(town, {partId, source:'job', reference:'test'}).ok, `${partId} uses the existing part-arrival route`);

function trace(def, seed) {
  let job = createJob(def, seed), transcript = [];
  const tick = (view, dt = .25) => {
    const old = structuredClone(job);
    const next = stepJob(job, view, dt);
    assert.deepEqual(job, old, 'stepping leaves the previous state intact');
    job = next;
    transcript.push(...job.requests.filter(row => row.type === 'say').map(row => row.lineId));
    return job;
  };
  return {tick, get job() { return job; }, transcript};
}
function wait(run, view, seconds = 30) { for (let i = 0; i < seconds * 4 && !run.job.done; i++) run.tick(view); }

// Move continuously rather than teleporting onto each ring. Slow pace, loose line, pauses, no deadline.
function walkTo(run, from, to, rng, {speed = 5} = {}) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z), seconds = distance / speed;
  const ticks = Math.max(1, Math.ceil(seconds * 4));
  for (let i = 1; i <= ticks && !run.job.done; i++) {
    const t = i / ticks, position = {x:from.x + (to.x - from.x) * t + rng.range(-2, 2),
      y:from.y + (to.y - from.y) * t, z:from.z + (to.z - from.z) * t + rng.range(-2, 2)};
    run.tick({player:{position, heading:Math.atan2(to.x - from.x, to.z - from.z)}, speedKmh:speed * 3.6,
      difficulty:'easy', solids:[]});
  }
}
const wins = {goat:0, dune:0, shaft:0};
for (let seed = 1; seed <= 10; seed++) {
  const rng = makeRng(seed), definition = farJobDefinition('far-whose-goat', enabled);
  const loan = jobForRun(definition, {chosenCar:'falcone_f42', owns:() => false});
  same([loan.car, loan.job.vehicleLent.lineId], ['titan_monster', 'far.1.lent'], 'the child is lent the show truck');
  const goat = trace(loan.job, seed), finds = definition.steps[0].finds;
  goat.tick({player:{position:finds[2].position}});
  same(goat.job.stepState.index, 0, 'the lookout cannot skip the earlier tracks');
  let from = {...finds[0].position, x:finds[0].position.x - 40};
  for (const find of finds) {
    walkTo(goat, from, find.position, rng, {speed:3 + rng.float() * 3});
    wait(goat, {player:{position:find.position}}, 15);
    from = find.position;
  }
  wait(goat, {player:{position:finds[2].position}});
  if (goat.job.done) wins.goat++;
  for (const id of ['far.1.found1', 'far.1.found2', 'far.1.won', 'far.1.bell', 'far.1.brian', 'far.1.brian2'])
    check(goat.transcript.includes(id), `the goat's evidence and lesson are said: ${id}`);

  const dune = trace(farJobDefinition('far-too-high', enabled), seed);
  wait(dune, {elapsedGameDays:0}, 10);
  check(!dune.job.done && !dune.transcript.includes('far.2.dune.log1'), 'real seconds cannot advance Dune');
  for (const day of [1, 2, 3, 4, 5]) wait(dune, {elapsedGameDays:day}, 12);
  if (dune.job.done) wins.dune++;
  same(dune.transcript.filter(id => id.includes('.log')), ['far.2.dune.log1', 'far.2.dune.log2', 'far.2.dune.log3'], 'Dune writes each log once, in order');
  check(dune.transcript.includes('far.2.odessa'), 'both routes end with Odessa');

  const def = farJobDefinition('far-long-shaft', options), shaft = trace(def, seed), step = def.steps[0];
  const origin = step.origin.position, destination = {...step.destination.position, y:origin.y};
  wait(shaft, {player:{position:origin}, speedKmh:0}, 10);
  same(shaft.job.stepState.loadKg, 12000, 'the shaft stays a whole twelve-tonne load');
  walkTo(shaft, origin, destination, rng, {speed:4 + rng.float() * 2});
  wait(shaft, {player:{position:destination}, speedKmh:0}, 40);
  if (shaft.job.done) wins.shaft++;
  same(farJobParts(shaft.job), [{partId:'propeller-shaft', source:'job', reference:'far-long-shaft', workId:'build-borer'}], 'only a delivered shaft supplies the ingredient');
  same(farJobParts(createJob(def)), [], 'an unfinished haul supplies nothing');
}
for (const [job, count] of Object.entries(wins)) check(count >= 8, `${job}: ${count}/10 wins on Easy at a slow pace`);

// A long rear overhang hits while the truck itself clears. A swept mid-turn contact is not missed between frames.
const post = {id:'post', x:-6, z:-6, halfX:.25, halfZ:.25, height:4};
const a = {x:0, z:0, heading:0}, b = {...a, heading:Math.PI / 2};
same(longLoadEnds(a, 18), [{x:0, z:-9}, {x:0, z:9}], 'the shaft overhangs both ends');
same(longLoadContacts(a, b, 18, [post]), ['post'], 'the overhang clips the inside of a tight turn');
same(longLoadContacts({...a, x:30}, {...b, x:30}, 18, [post]), [], 'a wide turn clears the same post');
same(longLoadContacts({...a, y:20}, {...b, y:20}, 18, [post]), [], 'a load above an object does not hit it');
const shaftStep = farJobDefinition('far-long-shaft', options).steps[0];
const hitView = {player:{position:{x:0, y:0, z:0}, heading:Math.PI / 2}, speedKmh:15, solids:[post]};
const shed = stepLongLoad(shaftStep, {phase:'carry', loadKg:12000, pose:a}, hitView, .25);
same([shed.state.phase, shed.state.sheds, shed.state.loadKg], ['shed', 1, 0], 'one hard contact drops the shaft');
let recover = shed;
for (let i = 0; i < 24; i++) recover = stepLongLoad(shaftStep, recover.state, {...hitView, speedKmh:0}, .25);
same([recover.state.phase, recover.state.loadKg], ['carry', 12000], 'six stopped seconds recover it nearby');
const tenth = stepLongLoad(shaftStep, {phase:'carry', loadKg:12000, pose:a, sheds:9}, hitView, .25);
check(tenth.restart && tenth.requests.some(row => row.type === 'marker' && row.place === shaftStep.origin), 'ten sheds restart at the pickup');

// Real no-load Kestrel physics at the thin-air ceiling, never a fixed target height or elapsed-time win.
const ceiling = KESTREL.airScaleHeight * Math.log(KESTREL.maxThrust / ((KESTREL.emptyKg + KESTREL.pilotKg + 400) * GRAVITY));
const heli = createHeliState({y:ceiling});
heli.collective = 1;
let observed = {};
for (let i = 0; i < 400 && !observed.reported; i++) {
  stepHeli(heli, {lift:1});
  observed = stepHeliceiling({}, observed, {heli, controls:{lift:1}}, 1 / 120).state;
}
check(observed.reported, 'Kestrel reaches the step end through the real falling-thrust physics');
const hover = createHeliState({y:40}); hover.collective = 1;
for (const view of [{heli:hover, controls:{lift:1}}, {heli, controls:{lift:0}}, {heli:{...heli, engine:false}, controls:{lift:1}},
  {heli:{...heli, crashed:true}, controls:{lift:1}}, {heli, loadKg:120, controls:{lift:1}}])
  check(!stepHeliceiling({}, {}, view, 100).complete, 'hover, low lever, engine out, crash or a loaded helicopter cannot claim a ceiling');
const flight = farJobDefinition('far-too-high', {...enabled, pilot:true});
same(flight.steps[0].kind, 'heliceiling', 'a pilot gets the real-flight route');
const one = stepJob(createJob(farJobDefinition('far-too-high', enabled), 81), {elapsedGameDays:5}, 1);
same(stepJob(createJob(farJobDefinition('far-too-high', enabled), 81), {elapsedGameDays:5}, 1), one, 'seed and inputs repeat exactly');
for (const id of Object.values(FAR_JOBS).flatMap(job => [job.lineId, job.resultLineId])) check(FAR_CAPTIONS[id], 'job words come from the story');
console.log(`FAR-JOBS-1: ${checks} checks passed. Slow Easy wins: goat ${wins.goat}/10 (lent Titan), Dune ${wins.dune}/10 (no pilot), shaft ${wins.shaft}/10.`);
