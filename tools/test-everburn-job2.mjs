import assert from 'node:assert/strict';
import {BRAND_RULE, BRAND_LINES, brandPay, brandSentence, stepBrandAsh} from '../src/world/jobs/brand-rule.js';
import {stepOnFoot} from '../src/world/jobs/steps/onfoot.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {brandSites} from '../src/world/jobs/brand-sites.js';
import {SCABLANDS_SOLIDS, SOLID_GRID, pushOutOfSolids} from '../src/world/scablands-solids.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {EVERBURN_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {tinTownFence} from '../src/world/tin-town-shacks.js';

// Rule snapshots, never a walking driver.
const hearth = {id: 'hearth', position: {x: 0, y: 0, z: 0}};
const places = ['pump', 'tower', 'far'].map((id, index) =>
  ({id, position: {x: 60 + index * 40, y: 0, z: 0}}));
const step = {kind: 'onfoot', brand: true, hearth, places};
const foot = (x, extras = {}) => ({onFoot: true,
  fighter: {position: {x, y: 0, z: 0}}, ...extras});
const tick = (state, view, dt = 0) => stepOnFoot(step, state, view, dt);

// Job 2.2: a car cannot take a brand; the hearth's boundary is inclusive.
assert.equal(tick({}, {onFoot: false, player: hearth}).state.brandsUsed, 0);
assert.equal(tick({}, foot(3.01)).state.brandsUsed, 0);
const taken = tick({}, foot(3));
assert.equal(taken.state.brandsUsed, 1);
assert.equal(taken.state.brandSeconds, BRAND_RULE.burnSeconds);
assert.deepEqual(taken.events, [{type: 'brandCatch', id: 'hearth'}]);
assert.equal(tick(taken.state, foot(10), 89).state.brandSeconds, 1);
const expired = tick(taken.state, foot(10), 90);
assert.equal(expired.state.brandSeconds, 0);
assert.deepEqual(expired.events, [{type: 'brandOut'}]);
assert.deepEqual(tick(expired.state, foot(10), 1).events, []);
assert.equal(tick(expired.state, foot(0)).state.brandsUsed, 2);
const refreshed = tick({...taken.state, brandSeconds: 20}, foot(0));
assert.equal(refreshed.state.brandSeconds, 90);
assert.equal(refreshed.state.brandsUsed, 1);
assert.equal(tick(taken.state, {onFoot: false}, 30).state.brandSeconds, 90);
const ashed = tick(taken.state, foot(10, {brandAshed: true}));
assert.equal(ashed.state.brandSeconds, 0);
assert.equal(tick(ashed.state, foot(0)).state.brandsUsed, 2);

// Job 2.3: two continuous seconds, any order, burning brand required.
let lighting = tick(taken.state, foot(100), 1);
assert.equal(lighting.complete, false);
assert.equal(lighting.state.lamps.tower, undefined);
assert.equal(tick(lighting.state, foot(103), 1).state.lightingSeconds, 0);
assert.equal(tick(expired.state, foot(100), 2).state.lamps.tower, undefined);
lighting = tick(lighting.state, foot(100), 1);
assert.equal(lighting.state.lamps.tower, true);
assert.equal(lighting.state.lastLamp, 'tower');
assert.equal(lighting.state.lamps.pump, undefined);
const relit = tick({...lighting.state, brandSeconds: 0}, foot(103));
assert.equal(relit.state.brandSeconds, 90);
assert.equal(relit.state.brandsUsed, 2);
assert.equal(tick({...lighting.state, brandSeconds: 0}, foot(103.01)).state.brandSeconds, 0);
assert.equal(tick(taken.state, foot(62), 2).state.lamps.pump, true);
assert.equal(tick(taken.state, foot(62.01), 2).state.lamps.pump, undefined);
assert.equal(tick(taken.state, {onFoot: true, fighter: {
  position: places[0].position, speed: 4.5}}, 2).state.lamps.pump, undefined);

// Job 2.4/5 foundations: a smothered lamp can be lit again; recovery preserves
// lamps and uses the last lamp on Easy, the hearth on other difficulties.
const smothered = tick(lighting.state, foot(10, {smotheredLamps: ['tower']}));
assert.equal(smothered.state.lamps.tower, false);
assert.equal(lighting.state.lamps.tower, true, 'do not mutate the previous state');
assert.equal(tick(smothered.state, foot(100), 2).state.lamps.tower, true);
const down = {onFoot: true, difficulty: 'easy', fighter: {knockedDown: true}};
const recovered = tick(lighting.state, down);
assert.equal(recovered.requests[0].place.id, 'tower');
assert.equal(recovered.state.lamps.tower, true);
assert.equal(recovered.state.brandsUsed, 2);
assert.equal(tick(recovered.state, down).requests.length, 0);
assert.equal(tick(lighting.state, {...down, difficulty: 'medium'}).requests[0].place.id, 'hearth');

// Job 2.6: time starts with the first brand, continues in the car and caps at dusk.
assert.equal(tick({}, foot(10), 100).state.dusk, 0);
assert.equal(tick(taken.state, {onFoot: false}, 120).state.dusk, .5);
assert.equal(tick(taken.state, {onFoot: false}, 240).state.dusk, 1);
assert.equal(tick(taken.state, {onFoot: false}, 300).state.dusk, 1);

// Job 2.7 foundations: all lamps must be lit at once, with the designed pay.
const all = {...taken.state, lamps: {pump: true, tower: true, far: true}};
assert.equal(tick(all, foot(10)).complete, true);
assert.equal(tick(all, foot(10, {smotheredLamps: ['pump']})).complete, false);
assert.equal(brandPay(1), 100);
assert.equal(brandPay(2), 70);
assert.equal(brandPay(3), 50);
assert.equal(brandPay(9), 50);
assert.equal(brandSentence(1), 'You lit the town with one brand.');
assert.equal(brandSentence(2), 'You lit the town with two brands.');
assert.equal(brandSentence(3), 'You lit the town with 3 brands.');

// The existing job engine dispatches the new rule without a second fighter.
let job = createJob({id: 'brand-rule-check', steps: [step]});
job = stepJob(job, foot(0), 0);
assert.equal(job.stepState.brandsUsed, 1);
for (const lamp of places) job = stepJob(job, foot(lamp.position.x), 2);
assert.equal(job.done, true);
assert(job.events.some(event => event.type === 'done'));
console.log('PASS Light the Town: brand, lamp lighting, recovery requests, dusk and pay.');

// Job 2.4: waves come from the farthest wall, once per first/second distinct
// lamp, even after a lamp is smothered and relit. Existing actors own movement.
const ashStep = {...step, ashEntries: [
  {id: 'west', position: {x: -100, y: 0, z: 0}},
  {id: 'east', position: {x: 200, y: 0, z: 0}},
]};
const ashView = {...foot(60), lamps: {pump: true}, brandSeconds: 90};
const ashTick = (state, view = ashView, dt = 0) => stepBrandAsh(ashStep, state, view, dt);
const firstWave = ashTick({});
assert.equal(firstWave.requests.length, 1);
assert.equal(firstWave.requests[0].from.id, 'west');
assert.equal(firstWave.requests[0].type, 'spawnBrandAsh');
assert.equal(ashTick(firstWave.state).requests.length, 0);
const secondWave = ashTick(firstWave.state, {...ashView, lamps: {pump: true, tower: true}});
assert.equal(secondWave.requests.length, 2);
assert.equal(Object.keys(secondWave.state.men).length, 3);
assert.equal(Object.values(secondWave.state.men).filter(man => man.role === 'smother').length, 1);
const darkAgain = ashTick(secondWave.state, {...ashView, lamps: {}});
assert.equal(ashTick(darkAgain.state, {...ashView, lamps: {pump: true, tower: true, far: true}}).requests.length, 0);
assert.equal(firstWave.state.men['town-ash-0-0'].lamp, undefined);

// Four seconds must be spent continuously beside the nearest lit lamp.
const smotherView = {...ashView, ashMen: [{id: 'town-ash-0-0', position: places[0].position}]};
const threat = ashTick(firstWave.state, smotherView, 3);
assert.deepEqual(threat.events, [{type: 'lampThreatened', id: 'pump'}]);
assert.deepEqual(threat.smotheredLamps, []);
assert.deepEqual(ashTick(threat.state, smotherView, 1).smotheredLamps, ['pump']);
const steppedAway = ashTick(threat.state, {...smotherView, ashMen: [
  {id: 'town-ash-0-0', position: {x: 63, y: 0, z: 0}},
]}, 1);
assert.deepEqual(ashTick(steppedAway.state, smotherView, 1).smotheredLamps, []);

// Ash aims at the player's position at release. The one-second tell permits
// a dodge; a landing exactly two metres away still puts the brand out.
const throwView = {...ashView, ashMen: [{id: 'town-ash-1-0', position: {x: 68, y: 0, z: 0}}]};
const thrown = ashTick(secondWave.state, throwView);
assert.equal(thrown.events[0].type, 'ashThrow');
assert.equal(thrown.brandAshed, false);
assert.equal(ashTick(thrown.state, throwView, .99).brandAshed, false);
assert.equal(ashTick(thrown.state, throwView, 1).brandAshed, true);
assert.equal(ashTick(thrown.state, {...throwView, ...foot(62)}, 1).brandAshed, true);
assert.equal(ashTick(thrown.state, {...throwView, ...foot(62.01)}, 1).brandAshed, false);
const landed = ashTick(thrown.state, throwView, 1);
assert.equal(ashTick(landed.state, throwView, 3.99).events.length, 0);
assert.equal(ashTick(landed.state, throwView, 4).events[0].type, 'ashThrow');
assert.equal(ashTick(secondWave.state, {...throwView, ...foot(59.99)}).events.length, 0);

// Job 2.5: a burning swing at two metres or a confirmed Hand Flamer hit at
// six metres causes permanent retreat. Neither damages or kills a fighter.
const swingView = {...ashView, ...foot(58), brandSwing: true, ashMen: smotherView.ashMen};
const fleeing = ashTick(firstWave.state, swingView);
assert.equal(fleeing.state.men['town-ash-0-0'].fleeing, true);
assert.deepEqual(fleeing.events, [{type: 'ashFled', id: 'town-ash-0-0'}]);
assert.equal(ashTick(firstWave.state, {...swingView, brandSeconds: 0}).state.men['town-ash-0-0'].fleeing, undefined);
assert.equal(ashTick(firstWave.state, {...swingView, ...foot(57.99)}).state.men['town-ash-0-0'].fleeing, undefined);
const flamerView = {...smotherView, ...foot(54), handFlamerHits: ['town-ash-0-0']};
assert.equal(ashTick(firstWave.state, flamerView).state.men['town-ash-0-0'].fleeing, true);
assert.equal(ashTick(firstWave.state, {...flamerView, ...foot(53.99)}).state.men['town-ash-0-0'].fleeing, undefined);
const overWall = ashTick(fleeing.state, {...ashView, ashMen: [
  {id: 'town-ash-0-0', position: {x: 200, y: 0, z: 0}},
]});
assert.deepEqual(overWall.requests, [{type: 'removeBrandAsh', id: 'town-ash-0-0'}]);
assert.deepEqual(ashTick(overWall.state, smotherView).requests, []);
assert.equal(fleeing.state.men['town-ash-0-0'].gone, undefined);

// The existing onfoot step consumes smothering and ash impacts directly.
const integratedSmother = stepOnFoot(ashStep,
  {...taken.state, lamps: {pump: true}, brandAsh: threat.state},
  {...smotherView, ...foot(10)}, 1);
assert.equal(integratedSmother.state.lamps.pump, false);
assert(integratedSmother.events.some(event => event.type === 'lampSmothered'));
const integratedAsh = stepOnFoot(ashStep,
  {...taken.state, lamps: {}, brandAsh: thrown.state}, throwView, 1);
assert.equal(integratedAsh.state.brandSeconds, 0);
assert(integratedAsh.events.some(event => event.type === 'brandOut'));
console.log('PASS Light the Town: Ash Men waves, smothering, ash tells, dodging and permanent retreat.');

// Job 2.3: actual town places, ground-level tower access and a clear alley
// route of the specified length. Geometry samples do not move a player.
const sites = brandSites();
assert.equal(sites.towerAtFoot, true);
assert.deepEqual(sites.lamps.map(lamp => lamp.id), ['pump', 'tower', 'far']);
for (const lamp of sites.lamps) {
  const {x, y, z} = lamp.position;
  assert.equal(y, scablandsSurfaceHeightAt(x, z));
  for (const solid of SCABLANDS_SOLIDS) {
    const dx = x - solid.x, dz = z - solid.z;
    const cos = Math.cos(solid.heading), sin = Math.sin(solid.heading);
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    // A bounding box is conservative for a round post too.
    const gap = Math.hypot(Math.max(0, Math.abs(lx) - solid.halfX),
      Math.max(0, Math.abs(lz) - solid.halfZ));
    assert(gap >= BRAND_RULE.lampClearance, `${lamp.id} too near ${solid.id}: ${gap}`);
  }
}
let walkMetres = 0;
for (let index = 1; index < sites.farWalk.length; index++) {
  const a = sites.farWalk[index - 1].position, b = sites.farWalk[index].position;
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  walkMetres += length;
  for (let part = 0; part <= Math.ceil(length * 4); part++) {
    const share = part / Math.ceil(length * 4);
    const x = a.x + (b.x - a.x) * share, z = a.z + (b.z - a.z) * share;
    assert.equal(pushOutOfSolids(x, z, .4, SOLID_GRID).hit, null,
      `The far lamp alley must fit the existing fighter at ${x}, ${z}.`);
  }
}
assert(walkMetres >= BRAND_RULE.farWalkMin && walkMetres <= BRAND_RULE.farWalkMax,
  `Far lamp alley length: ${walkMetres}`);
assert.deepEqual(sites, brandSites(), 'Sites repeat without a random draw.');
console.log(`PASS Light the Town: real lamp clearance and ${walkMetres.toFixed(1)} m alley route.`);

// Job 2.1: the stop is made in the car, before a brand can be taken. The
// existing caption sequencer says the three sentences once, in order.
const meetingStep = {...step, meeting: hearth};
const waiting = (state, view) => stepOnFoot(meetingStep, state, view, 0);
assert.equal(waiting({}, foot(0)).state.brandMeeting, undefined);
assert.equal(waiting({}, {player: hearth, speedKmh: 1}).state.brandMeeting, undefined);
assert.equal(waiting({}, {player: {position: {x: 8.01, z: 0}}}).state.brandMeeting, undefined);
const greeted = waiting({}, {player: {position: {x: 8, z: 0}}});
assert.equal(greeted.state.brandMeeting, true);
assert.deepEqual(greeted.requests.filter(request => request.type === 'say').map(request => request.lineId),
  ['brand.lamps', 'brand.alleys', 'brand.brand']);
assert.equal(waiting({...greeted.state, lineQueue: ['brand.brand']}, foot(0)).state.brandsUsed, undefined);
assert.equal(waiting({...greeted.state, lineRemaining: .1}, foot(0)).state.brandsUsed, undefined);
assert.equal(waiting(greeted.state, foot(0)).state.brandsUsed, 1);
const meetingDef = {id: 'brand-meeting-check', captions: Object.fromEntries(
  Object.entries(BRAND_LINES).map(([id, text]) => [`brand.${id}`, text])), steps: [meetingStep]};
let meetingJob = createJob(meetingDef);
const said = [];
for (let tickIndex = 0; tickIndex < 12; tickIndex++) {
  meetingJob = stepJob(meetingJob, {player: hearth, speedKmh: 0}, 1);
  said.push(...meetingJob.requests.filter(request => request.type === 'say').map(request => request.lineId));
}
assert.deepEqual(said, ['brand.lamps', 'brand.alleys', 'brand.brand']);
assert.equal(meetingJob.stepState.brandBriefed, true);
assert.equal(meetingJob.stepState.brandsUsed, 0);
assert.equal(meetingDef.captions[said[0]], BRAND_LINES.lamps);

// Job 2.7: nine seconds from the third lamp, theft at five seconds, and
// a single result containing the brands used before the engine clears state.
const endingStep = {...step, townEnding: true};
const endTick = (state, dt = 0) => stepOnFoot(endingStep, state,
  foot(10, {smotheredLamps: ['pump'], brandAshed: true}), dt);
const wake = stepOnFoot(endingStep, all, foot(10), 0);
assert.equal(wake.complete, false);
assert(wake.events.some(event => event.type === 'townWoke'));
assert.deepEqual(wake.requests.filter(request => request.type === 'say'), [{type: 'say', lineId: 'brand.awake'}]);
const beforeTheft = endTick(wake.state, 4.99);
assert.equal(beforeTheft.events.length, 0);
const theft = endTick(beforeTheft.state, .01);
assert.equal(theft.complete, false);
assert.deepEqual(theft.events, [{type: 'brandTheft'}]);
assert.equal(theft.state.lamps.pump, true, 'Arrival freezes the lit lamps.');
assert.equal(theft.state.brandSeconds, wake.state.brandSeconds);
assert.equal(endTick(theft.state, 3.99).events.length, 0);
const arrived = endTick(theft.state, 4);
assert.equal(arrived.complete, true);
assert.deepEqual(arrived.events, [{type: 'brandArrived', brandsUsed: 1, pay: 100,
  sentence: 'You lit the town with one brand.'}]);
let endingJob = {...createJob({id: 'brand-ending-check', steps: [endingStep]}), stepState: all};
endingJob = stepJob(endingJob, foot(10), 0);
endingJob = stepJob(endingJob, foot(10), 5);
endingJob = stepJob(endingJob, foot(10), 4);
assert.equal(endingJob.done, true);
assert(endingJob.events.some(event => event.type === 'brandArrived' && event.pay === 100));
assert.equal(endingJob.events.filter(event => event.type === 'done').length, 1);
console.log('PASS Light the Town: stop, ordered briefing, nine-second ending, theft and result event.');

// The real job uses these rules and the town's fence, with no saved fields or
// story switch added. It stays unavailable until all of its checks pass.
const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-get-out-and-walk');
const actualStep = definition.steps[0];
assert.equal(definition.name, 'Light the Town');
assert.equal(actualStep.brand, true);
assert.equal(actualStep.townEnding, true);
assert.equal(actualStep.lentWeapon, 'cinders-hand-flamer');
assert.deepEqual(actualStep.places, sites.lamps);
assert.deepEqual(actualStep.hearth, sites.hearth);
assert.equal(actualStep.carStart.x, actualStep.meeting.position.x);
assert.equal(actualStep.carStart.z, actualStep.meeting.position.z);
assert(sites.ashEntries.length > 0);
assert.equal(sites.ashEntries.length, tinTownFence().length);
for (const [index, entry] of sites.ashEntries.entries()) {
  const sheet = tinTownFence()[index];
  assert(Math.abs(Math.hypot(entry.position.x - sheet.x, entry.position.z - sheet.z) - BRAND_RULE.wallEntryInset) < 1e-8);
  assert.equal(pushOutOfSolids(entry.position.x, entry.position.z, .4, SOLID_GRID).hit, null);
}
assert.equal(REMADE_EVERBURN_JOBS.includes(definition.id), false);
const actualJob = createJob(definition);
const hud = (state, player = sites.hearth.position) => worldHudModel({
  worldJob: {definition, job: {...actualJob, stepState: state}}, player, onFoot: true,
});
assert.equal(hud({}).target.id, 'cold-forge');
assert.equal(hud({}).brand, null);
const hudState = {brandBriefed: true, brandsUsed: 1, brandSeconds: 45, lamps: {pump: true}};
const hudBefore = JSON.stringify(hudState);
assert.equal(hud(hudState, sites.lamps[1].position).target.id, 'tower');
assert.notEqual(hud(hudState, sites.lamps[0].position).target.id, 'pump');
assert.deepEqual(hud(hudState).brand, {value: 45, max: 90, out: false, brandsUsed: 1});
assert.equal(hud({...hudState, brandSeconds: 0}, sites.lamps[0].position).target.id, 'pump');
assert.equal(hud({...hudState, brandSeconds: 0}).brand.out, true);
assert.equal(hud({...hudState, townEnding: true}).line, BRAND_LINES.awake);
assert.equal(hud({...hudState, townEnding: true, theftStarted: true}).line, BRAND_LINES.thief);
assert.equal(hud({...hudState, townEnding: true}).target, null);
assert.equal(JSON.stringify(hudState), hudBefore, 'The HUD only reads job state.');
console.log('PASS Light the Town: real definition, clear wall entries, brand gauge and lamp guidance.');
