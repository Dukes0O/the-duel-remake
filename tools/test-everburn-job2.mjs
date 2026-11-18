import assert from 'node:assert/strict';
import {BRAND_RULE, BRAND_LINES, brandPay, brandSentence, stepBrandAsh} from '../src/world/jobs/brand-rule.js';
import {stepOnFoot} from '../src/world/jobs/steps/onfoot.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {brandSites} from '../src/world/jobs/brand-sites.js';
import {SCABLANDS_SOLIDS, SOLID_GRID, pushOutOfSolids} from '../src/world/scablands-solids.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {worldHudModel, worldMapFrame} from '../src/world/world-hud.js';
import {footBrandDirection} from '../src/combat-hud.js';
import {brandTownMap, drawSmallMap, createKnowledge, toScreen, SMALL_MAP} from '../src/world/scablands-map.js';
import {landMarks} from '../src/world/scablands-picture.js';
import {tinTownFence} from '../src/world/tin-town-shacks.js';
import {createJobSolidGrid} from '../src/world/scablands-solids.js';
import {createBrandLamps} from '../src/world/brand-lamps.js';
import {TOWN_LAMP} from '../src/world/town-lamp-look.js';
import {createBrandAuntie} from '../src/world/brand-auntie.js';
import {createCarriedBrand} from '../src/world/brand-carried.js';
import {createBrandAshView} from '../src/world/brand-ash-view.js';
import {createBrandThief} from '../src/world/brand-thief.js';
import {brandThiefPose} from '../src/world/jobs/brand-rule.js';
import * as THREE from 'three';
import {arenaReward, settleArenaResult} from '../src/arena/arena-settlement.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {pageFunctions, pageSource} from './scenarios/everburn-job2.mjs';
import {brandSwingReady} from '../src/world/jobs/brand-rule.js';
import {brandCombatView} from '../src/arena/modes/world-job.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {stepFootWeapons} from '../src/onfoot-weapons.js';

assert.equal(EVERBURN_SIDE_JOBS.find(job => job.steps.some(step => step.load === 'hot-soup'))
  .steps.find(step => step.load === 'hot-soup').what,
  'Carry Auntie\u2019s hot soup from her kitchen to the diggers at the Everburn well.');

// Slice 11, point 6: the same click chooses the brand by reach, never by slot.
const closeWorld = {actors:[{id:'close',brandAsh:true,x:0,y:0,z:2}],
  job:{steps:[{brand:true}],stepIndex:0,stepState:{brandSeconds:90}}};
const closeState = {status:'racing',onFoot:true,fighter:{x:0,y:0,z:0,flaming:true},
  fighterInput:{fire:true},arena:{mode:'world-job',worldJob:closeWorld}};
for (const selected of ['wrench','rpg','hand-flamer']) {
  closeState.footWeapons={selected};
  closeWorld.brandSwingHeld=false;
  assert.equal(brandSwingReady(closeState),true);
  assert.deepEqual(brandCombatView(closeState,closeWorld),{brandSwing:true,handFlamerHits:[]});
  assert.equal(brandCombatView(closeState,closeWorld).brandSwing,false);
}
closeWorld.actors[0].z=2.01;
assert.equal(brandSwingReady(closeState),false);
brandCombatView(closeState,closeWorld);
closeWorld.actors[0].z=2;
assert.equal(brandCombatView(closeState,closeWorld).brandSwing,false,
  'Holding the same click through a change of range never swings again.');
closeState.fighterInput.fire=false;
brandCombatView(closeState,closeWorld);
closeState.fighterInput.fire=true;
assert.equal(brandCombatView(closeState,closeWorld).brandSwing,true);

// Claude's hand play, 17 November: the flamer reaches a man by the flat distance and the way the walker faces, whatever
// the tilt of the view. At the view's own resting tilt (about -0.39) a man 5 m dead ahead is burned back; one 30 degrees
// to the side is not; one at 6.5 m is not.
{
  const world = {actors:[{id:'ahead',brandAsh:true,x:0,y:0,z:5},{id:'aside',brandAsh:true,x:2.5,y:0,z:4.33},
    {id:'far',brandAsh:true,x:0,y:0,z:6.5}],job:{steps:[{brand:true}],stepIndex:0,stepState:{brandSeconds:90}}};
  const state = {status:'racing',onFoot:true,fighter:{x:0,y:0,z:0,yaw:0,pitch:-.39,flaming:true},
    fighterInput:{fire:true},footWeapons:{selected:'hand-flamer'},arena:{mode:'world-job',worldJob:world}};
  assert.deepEqual(brandCombatView(state,world),{brandSwing:false,handFlamerHits:['ahead']});
  state.fighter.pitch=.6;
  assert.deepEqual(brandCombatView(state,world).handFlamerHits,['ahead'],'looking up changes nothing either');
}

// Use the normal weapon step: no flame, rocket or repair on a brand click.
closeWorld.actors[0].z=2;
const toolDuel=new Duel({featureFlags:createFeatureFlags({storage:null,qa:true,
  overrides:{arsenal:true,'crew-gear':true}})});
toolDuel.startCampaign({mode:'wasteland',car:'falcone_f42',driverId:'club',crewId:'cinder',
  discoveredGate:true,arsenalRank:30,opponentCount:0,cpuDifficulty:'easy'});
Object.assign(toolDuel.state,{status:'racing',onFoot:true,fighter:{x:0,y:0,z:0,yaw:0,pitch:0,
  health:100},fighterInput:{fire:true},arena:{mode:'world-job',worldJob:closeWorld}});
for (const selected of ['hand-flamer','rpg','wrench']) {
  toolDuel.state.footWeapons.selected=selected;
  toolDuel.state.fighter.flaming=true;
  const ammo=toolDuel.state.footWeapons.ammo;
  stepFootWeapons(toolDuel,1/120);
  assert.equal(toolDuel.state.fighter.flaming,false);
  assert.equal(toolDuel.state.footWeapons.ammo,ammo);
  assert.equal(toolDuel.state.footWeapons.repairing,false);
  assert.equal(toolDuel.state.fighterInput.fire,true,'The job still sees the attack.');
}
toolDuel.state.footWeapons.selected='hand-flamer';
closeWorld.actors[0].z=3;
stepFootWeapons(toolDuel,1/120);
assert.equal(toolDuel.state.fighter.flaming,true,'Farther away the same attack fires the flamer.');
closeWorld.actors[0].z=2;
closeWorld.job.stepState.brandSeconds=0;
assert.equal(brandSwingReady(closeState),false);
closeWorld.job.stepState.brandSeconds=90;
closeState.fighter.knockedDown=true;
assert.equal(brandSwingReady(closeState),false);
closeState.fighter.knockedDown=false;
closeState.status='countdown';
assert.equal(brandSwingReady(closeState),false);

const hintStep={brand:true,places:[],ashEntries:[]};
const hintView={onFoot:true,fighter:{position:{x:0,y:0,z:0}},
  ashMen:[{id:'near',position:{x:0,y:0,z:12}}]};
const hint=stepBrandAsh(hintStep,{},hintView);
assert(hint.requests.some(request=>request.type==='say'&&request.lineId==='brand.tools'));
assert(!stepBrandAsh(hintStep,hint.state,hintView).requests.some(request=>request.lineId==='brand.tools'));
assert(!stepBrandAsh(hintStep,{}, {...hintView,ashMen:[{position:{x:0,y:0,z:12.01}}]}).state.toolsExplained);
console.log('PASS slice 11.6: any slot swings within 2 m, consumes no shot, and explains both tools once within 12 m.');

for (const name of Object.keys(pageFunctions)) {
  assert.doesNotThrow(() => new Function(`return ${pageSource(name)}`));
}
for (const scene of ['start', 'brand', 'opponent', 'ending']) {
  const source = pageSource('scene', scene);
  assert.doesNotThrow(() => new Function(`return ${source}`));
  assert(!source.includes('import('), 'Browser scenes use only the bundled app and renderer.');
}
console.log('PASS Light the Town: every browser page expression parses in its own function.');

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
assert.equal(recovered.state.brandSeconds, 0);
assert.equal(recovered.state.brandsUsed, 1);
assert(recovered.events.some(event => event.type === 'brandOut'));
const standingAgain = tick(recovered.state, foot(100));
assert.equal(standingAgain.state.brandsUsed, 2);
assert.equal(standingAgain.state.brandSeconds, 90);
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
// Slice 11.4: wall crossings and lamp arrivals are separate warnings.
const wallSay = stepOnFoot(ashStep, {...taken.state, lamps:{pump:true}}, foot(60));
assert(wallSay.requests.some(request => request.type === 'say' && request.lineId === 'brand.wallFirst'));
assert.equal(BRAND_LINES.wallFirst, "Auntie Solder: One's over the wall!");
assert.equal(BRAND_LINES.wallSecond, 'Auntie Solder: Two more over the wall!');
const warningAt = (state, x, lamps = ashView.lamps) => ashTick(state,
  {...ashView, lamps, ashMen:[{id:'town-ash-0-0', position:{x,y:0,z:0}}]});
const distantWarning = warningAt(firstWave.state, -70);
assert.deepEqual(distantWarning.events, [], 'Choosing a lamp 130 m away must not warn of arrival.');
const outsideWarning = warningAt(distantWarning.state, 44.99);
assert.deepEqual(outsideWarning.events, []);
const nearWarning = warningAt(outsideWarning.state, 45);
assert.deepEqual(nearWarning.events, [{type:'lampThreatened',id:'pump'}]);
assert.deepEqual(warningAt(nearWarning.state, 46).events, [], 'Do not repeat the same lamp warning.');
const otherLamp = warningAt(nearWarning.state, 85, {tower:true});
assert.deepEqual(otherLamp.events, [{type:'ashOverWall',lineId:'brand.wallSecond'},
  {type:'lampThreatened',id:'tower'}]);
assert.deepEqual(warningAt(otherLamp.state, 100, {}).events, [], 'A dark lamp is not threatened.');
const secondWallSay = stepOnFoot(ashStep, {...taken.state, lamps:{pump:true,tower:true},
  brandAsh:firstWave.state}, foot(60));
assert(secondWallSay.requests.some(request => request.type === 'say' && request.lineId === 'brand.wallSecond'));
assert(!secondWallSay.requests.some(request => request.lineId === 'brand.wallFirst'));
console.log('PASS slice 11.4: wall warnings and one arrival warning within 15 m of each lit target.');
assert.equal(firstWave.requests.length, 1);
assert.equal(firstWave.requests[0].from.id, 'west');
assert.equal(firstWave.requests[0].type, 'spawnBrandAsh');
assert.equal(ashTick(firstWave.state).requests.length, 0);
const secondWave = ashTick(firstWave.state, {...ashView, lamps: {pump: true, tower: true}});
assert.equal(secondWave.requests.length, 2);
// Slice 11.5: two wall points, then separation at every movement step.
const waveEntries = secondWave.requests.map(request => request.from.position);
assert(Math.hypot(waveEntries[0].x-waveEntries[1].x,
  waveEntries[0].z-waveEntries[1].z) >= 20, 'The second group enters at least 20 m apart.');

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
assert.equal(REMADE_EVERBURN_JOBS.includes(definition.id), true);
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

// Slice 11.3: guidance reads every lamp, even before the player can see it.
const navigationWorld = {definition, job: {...actualJob, stepState: hudState},
  actors: [{id:'over-wall',brandAsh:true,x:sites.ashEntries[0].position.x,
    z:sites.ashEntries[0].position.z}]};
const navigationState = {status:'racing',onFoot:true,
  fighter:{...sites.lamps[1].position,yaw:Math.PI / 2},
  arena:{mode:'world-job',worldJob:navigationWorld}};
assert.deepEqual(footBrandDirection(navigationState),{name:'TOWER LAMP',distance:0,angle:-90});
navigationState.fighter = {...sites.hearth.position,yaw:0};
navigationWorld.job.stepState = {...hudState,brandSeconds:0};
assert.deepEqual(footBrandDirection(navigationState),{name:'THE HEARTH',distance:0,angle:0});
navigationState.fighter = {...sites.lamps[0].position,yaw:0};
assert.equal(footBrandDirection(navigationState).name,'PUMP LAMP');
navigationState.onFoot=false;
assert.equal(footBrandDirection(navigationState),null);
navigationState.onFoot=true;
navigationWorld.job.stepState=hudState;
const navigationBefore=JSON.stringify(navigationWorld);
const mapFrame=worldMapFrame({state:navigationState,course:null,model:hud(hudState),knowledge:null});
const townMap=brandTownMap(mapFrame,SMALL_MAP);
assert(townMap.view.scale >= 1,'The town uses metres rather than kilometres on the small map.');
assert.deepEqual(townMap.fires.map(fire=>[fire.id,fire.lit]),
  [['town-hearth',true],['pump',true],['tower',false],['far',false]]);
assert.deepEqual(townMap.men.map(man=>man.id),['over-wall']);
for(const point of [...townMap.fires,...townMap.men]) {
  const at=toScreen(townMap.view,point.x,point.z);
  assert(at.x>0&&at.x<SMALL_MAP.width&&at.y>0&&at.y<SMALL_MAP.height);
}
assert.equal(JSON.stringify(navigationWorld),navigationBefore);
const mapLabels=[], mapFills=[];
const mapContext=new Proxy({
  measureText:text=>({width:String(text).length*7}),
  fillText:text=>mapLabels.push(text),
  fill(){mapFills.push(this.fillStyle);},
},{get:(object,key)=>key in object?object[key]:()=>{}});
drawSmallMap(mapContext,{...mapFrame,picture:{marks:landMarks()},
  knowledge:createKnowledge(),target:null});
for(const label of ['HEARTH','PUMP','TOWER','FAR']) assert(mapLabels.includes(label));
for(const colour of ['#ffbc72','#252e34','#ff683a']) assert(mapFills.includes(colour),
  'The map paints lit fires, dark fires and the man who has entered.');
navigationState.onFoot=false;
assert.equal(brandTownMap({...mapFrame,onFoot:false},SMALL_MAP),null);
console.log('PASS slice 11.3: named foot arrows and a town map with every fire and entered Ash Man.');

// Job 2.3: the drawing and temporary collision posts share their dimensions.
const lampGrid = createJobSolidGrid({near: () => []});
lampGrid.setBrandLamps(sites.lamps);
assert.equal(lampGrid.brandLamps.length, 3);
for (const [index, solid] of lampGrid.brandLamps.entries()) {
  const at = sites.lamps[index].position;
  assert.equal(solid.x, at.x);
  assert.equal(solid.z, at.z);
  assert.equal(solid.halfX, BRAND_RULE.postRadius);
  const pushed = pushOutOfSolids(at.x + .01, at.z, .4, lampGrid);
  assert.equal(pushed.hit.id, solid.id);
  assert(Math.hypot(pushed.x - at.x, pushed.z - at.z) >= BRAND_RULE.postRadius + .4 - 1e-8);
}
const lampView = createBrandLamps();
const lampWorldJob = {job: {...actualJob, stepState: {lamps: {pump: true}}}};
const lampStateBefore = JSON.stringify(lampWorldJob);
lampView.update(lampWorldJob);
assert.equal(lampView.group.visible, true);
assert.equal(lampView.group.children.length, 3);
for (const [index, lamp] of lampView.group.children.entries()) {
  assert.equal(lamp.position.y, sites.lamps[index].position.y);
  // Claude's drawn lamp (src/world/town-lamp-look.js) stands in place of the plain post and box.
  const [look, glow] = lamp.children;
  assert.ok(look.getObjectByName('Lamp post and lantern'), 'each lamp is the drawn town lamp');
  assert.equal(look.children.filter(child => child.name === 'Lantern pane').length, 4);
  assert.ok(TOWN_LAMP.footRadius <= lampGrid.brandLamps[index].halfX + .1, 'the foot of the lamp is no more than 0.1 m wider than its solid');
  assert.ok(Math.abs(glow.position.y - (TOWN_LAMP.postHeight + .12 - TOWN_LAMP.lanternDrop + TOWN_LAMP.lantern.tall / 2)) < 1e-6, 'the light is in the lantern');
  assert.equal(look.getObjectByName('Lamp flame').visible, index === 0, 'only a lit lamp shows its flame');
  assert.equal(glow.distance, BRAND_RULE.lanternLightRadius);
  assert.equal(glow.intensity > 0, index === 0);
}
lampWorldJob.job.stepState.lamps.pump = false;
lampView.update(lampWorldJob);
assert.equal(lampView.group.children[0].children[1].intensity, 0);
lampWorldJob.job.stepState.lamps.pump = true;
assert.equal(JSON.stringify(lampWorldJob), lampStateBefore);
lampView.update(null);
assert.equal(lampView.group.visible, false);
lampView.dispose();
assert.equal(lampView.group.children.length, 0);
console.log('PASS Light the Town: solid posts, grounded lanterns and readable lit state.');

// Job 2.1: the shipped figure is placed at the forge, grounded, facing the
// stop ring, solid to the fighter and absent in other jobs. Shared art survives.
assert.deepEqual(actualStep.auntie, sites.auntie);
const auntieAt = sites.auntie.position;
assert.equal(pushOutOfSolids(auntieAt.x, auntieAt.z, .45, SOLID_GRID).hit, null);
assert(Math.hypot(auntieAt.x - actualStep.meeting.position.x,
  auntieAt.z - actualStep.meeting.position.z) <= BRAND_RULE.meetingRadius);
lampGrid.setPeople([sites.auntie]);
assert.equal(pushOutOfSolids(auntieAt.x, auntieAt.z, .4, lampGrid).hit.id, sites.auntie.id);
const folk = new THREE.Group(), auntieSource = new THREE.Group();
auntieSource.name = 'auntie-solder_root';
auntieSource.position.set(-4.95, 0, 0);
const bone = new THREE.Bone();
const figure = new THREE.SkinnedMesh(new THREE.BoxGeometry(.5, 2, .4),
  new THREE.MeshStandardMaterial());
figure.position.y = 1;
figure.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(
  new Array(figure.geometry.attributes.position.count * 4).fill(0), 4));
figure.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(
  Array.from({length: figure.geometry.attributes.position.count * 4}, (_, i) => i % 4 === 0 ? 1 : 0), 4));
auntieSource.add(bone, figure);
figure.bind(new THREE.Skeleton([bone]));
folk.add(auntieSource);
const auntieView = createBrandAuntie();
auntieView.install(folk);
const auntieJob = {job: actualJob}, auntieBefore = JSON.stringify(auntieJob);
auntieView.update(auntieJob);
assert.equal(auntieView.group.visible, true);
assert.equal(auntieSource.visible, false, 'Only one Auntie is drawn during the job.');
assert.equal(auntieView.group.position.y, auntieAt.y);
const bounds = new THREE.Box3().setFromObject(auntieView.group);
assert(Math.abs(bounds.min.y - auntieAt.y) < 1e-6);
assert(Math.abs(bounds.max.y - bounds.min.y - BRAND_RULE.auntieHeight) < 1e-6);
const copy = auntieView.group.children[0];
const copiedBody = copy.children.find(node => node.isSkinnedMesh);
assert.notEqual(copiedBody.skeleton.bones[0], bone);
assert.equal(copiedBody.skeleton.bones[0].parent, copy);
assert.equal(copiedBody.geometry, figure.geometry, 'The shipped body is reused.');
assert.equal(JSON.stringify(auntieJob), auntieBefore);
auntieView.update(null);
assert.equal(auntieView.group.visible, false);
assert.equal(auntieSource.visible, true);
auntieView.update(auntieJob);
auntieView.dispose();
assert.equal(auntieView.group.children.length, 0);
assert.equal(auntieSource.visible, true);
figure.skeleton.dispose();figure.geometry.dispose();figure.material.dispose();
console.log('PASS Light the Town: grounded folk figure, independent skeleton and solid Auntie.');

// Job 2.2: the load stays with the existing fighter, remains a dark stick
// after burnout, and casts light only while carried and burning.
const brandView = createCarriedBrand();
const brandState = {onFoot: true, fighter: {x: 10, y: 3, z: 20, yaw: 0, pitch: 0},
  arena: {mode: 'world-job', worldJob: {job: {...actualJob,
    stepState: {brandsUsed: 1, brandSeconds: 90}}}}};
const brandBefore = JSON.stringify(brandState);
brandView.update(brandState);
assert.equal(brandView.group.visible, true);
const [brandStick, brandFlame, brandLight] = brandView.group.children;
assert.equal(brandStick.geometry.parameters.height, BRAND_RULE.brandLength);
assert.deepEqual(brandView.group.position.toArray(), [10 - BRAND_RULE.brandHandSide,
  3 + BRAND_RULE.brandHandHeight, 20 + BRAND_RULE.brandHandForward]);
assert.equal(brandFlame.visible, true);
assert.equal(brandLight.intensity, BRAND_RULE.brandLightIntensity);
assert.equal(brandLight.distance, BRAND_RULE.brandLightRadius);
assert.equal(JSON.stringify(brandState), brandBefore, 'The load view only reads the fighter and job.');
brandView.update(brandState,()=>.8);
assert.ok(Math.abs(brandView.group.position.y-(3+BRAND_RULE.brandHandHeight+.8))<1e-8,'The carried fire follows the drawn fighter.');
brandState.fighter.yaw = Math.PI / 2;
brandView.update(brandState);
assert(Math.abs(brandView.group.position.x - (10 + BRAND_RULE.brandHandForward)) < 1e-8);
assert(Math.abs(brandView.group.position.z - (20 + BRAND_RULE.brandHandSide)) < 1e-8);
brandState.arena.worldJob.job.stepState.brandSeconds = 0;
brandView.update(brandState);
assert.equal(brandView.group.visible, true);
assert.equal(brandFlame.visible, false);
assert.equal(brandLight.intensity, 0);
for (const hidden of [
  {...brandState, onFoot: false},
  {...brandState, fighter: {...brandState.fighter, knockedDown: true}},
  {...brandState, arena: {mode: 'race'}},
  {...brandState, arena: {mode: 'world-job', worldJob: {job: {...actualJob, stepState: {}}}}},
  null,
]) {
  brandView.update(hidden);
  assert.equal(brandView.group.visible, false);
  assert.equal(brandLight.intensity, 0);
}
let disposedBrandParts = 0;
// The drawn flame is two tongues that share one shape and one material.
for (const part of [brandStick.geometry, brandStick.material, brandFlame.children[0].geometry, brandFlame.children[0].material])
  part.addEventListener('dispose', () => disposedBrandParts++);
brandView.dispose();
assert.equal(disposedBrandParts, 4);
assert.equal(brandView.group.children.length, 0);
console.log('PASS Light the Town: carried brand, flame, ground light, burnout and cleanup.');

// Job 2.4: opponents outside the rocket zones are drawn at the ordinary foot
// mover's positions. The warning follows the rule's second, including pauses.
const ashViewDrawing = createBrandAshView();
const drawingActor = {id: 'town-ash-1-0', brandAsh: true, x: 10, y: 3, z: 20, yaw: 0};
const drawingWorld = {actors: [drawingActor, {...drawingActor, id: 'other', brandAsh: false}],
  job: {...actualJob, stepState: {brandAsh: {men: {[drawingActor.id]: {
    ash: {position: {x: 18, y: 4, z: 20}, remaining: 1},
  }}}}}};
const drawingBefore = JSON.stringify(drawingWorld);
ashViewDrawing.update(drawingWorld);
assert.equal(ashViewDrawing.group.visible, true);
assert.equal(ashViewDrawing.figures.group.visible, true);
assert.equal(ashViewDrawing.figures.meshes.plates.count, 12, 'Only the town opponent is drawn.');
const ashMatrix = new THREE.Matrix4();
ashViewDrawing.figures.meshes.plates.getMatrixAt(0, ashMatrix);
assert(Math.abs(ashMatrix.elements[12] - drawingActor.x) < 1e-6);
assert(Math.abs(ashMatrix.elements[13] - (drawingActor.y + 1.12)) < 1e-6);
const warningDrawing = ashViewDrawing.group.children[1];
const [ashBall, ashMark] = warningDrawing.children;
assert.equal(warningDrawing.visible, true);
assert.deepEqual(ashBall.position.toArray(), [10, 3 + BRAND_RULE.ashReleaseHeight, 20]);
assert.deepEqual(ashMark.position.toArray(), [18, 4 + BRAND_RULE.ashMarkLift, 20]);
ashViewDrawing.update(drawingWorld,()=>.8);
ashViewDrawing.figures.meshes.plates.getMatrixAt(0,ashMatrix);
assert.ok(Math.abs(ashMatrix.elements[13]-(drawingActor.y+1.12+.8))<1e-6,'The walking Ash Man receives the ground correction.');
assert.ok(Math.abs(ashBall.position.y-(3+BRAND_RULE.ashReleaseHeight+.8))<1e-8,'The thrown ash starts at the drawn hand.');
assert.ok(Math.abs(ashMark.position.y-(4+BRAND_RULE.ashMarkLift+.8))<1e-8,'The warning lies on the drawn target ground.');
ashViewDrawing.update(drawingWorld);
assert.equal(ashMark.geometry.parameters.outerRadius, BRAND_RULE.ashRadius);
ashViewDrawing.update(drawingWorld);
assert.deepEqual(ashBall.position.toArray(), [10, 3 + BRAND_RULE.ashReleaseHeight, 20], 'A pause holds the throw.');
assert.equal(JSON.stringify(drawingWorld), drawingBefore, 'Drawing cannot change ash or fighters.');
const drawingThrow = drawingWorld.job.stepState.brandAsh.men[drawingActor.id];
drawingThrow.ash.remaining = .5;
ashViewDrawing.update(drawingWorld);
assert.equal(ashBall.position.x, 14);
assert.equal(ashBall.position.y, (3 + BRAND_RULE.ashReleaseHeight + 4) / 2 + BRAND_RULE.ashArcHeight);
drawingThrow.ash = null;
ashViewDrawing.update(drawingWorld);
assert.equal(warningDrawing.visible, false);
drawingWorld.actors = [];
ashViewDrawing.update(drawingWorld);
assert.equal(ashViewDrawing.figures.group.visible, false, 'Fled opponents leave no figure.');
ashViewDrawing.update(null);
assert.equal(ashViewDrawing.group.visible, false);
let disposedAshParts = 0;
for (const part of [ashBall.geometry, ashBall.material, ashMark.geometry, ashMark.material])
  part.addEventListener('dispose', () => disposedAshParts++);
ashViewDrawing.dispose();
assert.equal(disposedAshParts, 4);
assert.equal(ashViewDrawing.group.children.length, 0);
console.log('PASS Light the Town: visible foot opponents, timed ash arc, landing warning and cleanup.');

// Job 2.7: the theft is visible only from the rule's fifth second. The runner
// follows clear ground toward the gate with the stolen bellows on his back.
const theftStep = {...actualStep, theftPath: sites.theftPath};
assert.equal(brandThiefPose(theftStep, {endingElapsed: 4.99}), null);
const theftStart = {theftStarted: true, endingElapsed: BRAND_RULE.theftAtSeconds};
const startPose = brandThiefPose(theftStep, theftStart);
assert.equal(startPose.x, sites.theftPath[0].position.x);
assert.equal(startPose.z, sites.theftPath[0].position.z);
const secondPose = brandThiefPose(theftStep, {...theftStart, endingElapsed: 6});
assert(Math.abs(Math.hypot(secondPose.x - startPose.x, secondPose.z - startPose.z) -
  BRAND_RULE.thiefRunMps) < 1e-8);
for (let index = 1; index < sites.theftPath.length; index++) {
  const a = sites.theftPath[index - 1].position, b = sites.theftPath[index].position;
  const samples = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 4);
  for (let sample = 0; sample <= samples; sample++) {
    const share = sample / samples;
    const x = a.x + (b.x - a.x) * share, z = a.z + (b.z - a.z) * share;
    assert.equal(pushOutOfSolids(x, z, .4, SOLID_GRID).hit, null,
      `The thief's route must clear the town's solids at ${x}, ${z}.`);
  }
}
const thiefView = createBrandThief();
const theftWorld = {job: {steps: [theftStep], stepIndex: 0, stepState: theftStart}};
const beforeTheftDraw = JSON.stringify(theftWorld);
thiefView.update(theftWorld);
assert.equal(thiefView.group.visible, true);
assert.equal(thiefView.figures.group.visible, true);
const theftLoad = thiefView.group.children[1];
assert.equal(theftLoad.geometry.parameters.width, BRAND_RULE.thiefLoadWidth);
assert.equal(theftLoad.position.y, scablandsSurfaceHeightAt(startPose.x, startPose.z) + BRAND_RULE.thiefLoadLift);
const loadPosition = theftLoad.position.clone();
thiefView.update(theftWorld,()=>.8);
assert.equal(thiefView.group.position.y,.8,'The runner and stolen load share the ground correction.');
assert.deepEqual(theftLoad.position,loadPosition,'The root correction keeps the load beside its runner.');
thiefView.update(theftWorld);
assert.deepEqual(theftLoad.position, loadPosition, 'A paused ending holds the runner still.');
assert.equal(JSON.stringify(theftWorld), beforeTheftDraw, 'The drawing cannot change the job.');
theftWorld.job.stepState = {...theftStart, endingElapsed: 6};
thiefView.update(theftWorld);
assert.notDeepEqual(theftLoad.position, loadPosition);
thiefView.update(null);
assert.equal(thiefView.group.visible, false);
let thiefPartsDisposed = 0;
theftLoad.geometry.addEventListener('dispose', () => thiefPartsDisposed++);
theftLoad.material.addEventListener('dispose', () => thiefPartsDisposed++);
thiefView.dispose();
assert.equal(thiefPartsDisposed, 2);
assert.equal(thiefView.group.children.length, 0);
console.log('PASS Light the Town: timed thief, clear route, carried bellows and cleanup.');

// Job 2.7: the completed rule result reaches the normal payment and screen.
// Profiles here are plain objects; this check never opens player storage.
for (const [brandsUsed, pay, sentence] of [
  [1, 100, 'You lit the town with one brand.'],
  [2, 70, 'You lit the town with two brands.'],
  [3, 50, 'You lit the town with 3 brands.'],
  [7, 50, 'You lit the town with 7 brands.'],
]) {
  const completed = stepOnFoot(actualStep, {
    brandBriefed: true, townEnding: true, endingElapsed: BRAND_RULE.endingSeconds,
    theftStarted: true, brandsUsed,
  }, {}, 0);
  assert.equal(completed.complete, true);
  const arrived = completed.events.find(event => event.type === 'brandArrived');
  assert.deepEqual(arrived, {type: 'brandArrived', brandsUsed, pay, sentence});
  const brandResult = {brandsUsed: arrived.brandsUsed, pay: arrived.pay, sentence: arrived.sentence};
  const finishedArena = {version: 1, venueId: 'scablands', mode: 'world-job', phase: 'over',
    participants: [{id: 'player', kind: 'player'}],
    result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'},
    worldJob: {definition: actualJob, brandResult, job: {steps: actualJob.steps, stepIndex: actualJob.steps.length}}};
  for (const [difficulty, factor] of [['easy', 1], ['medium', 1.2], ['hard', 1.4]])
    assert.deepEqual(arenaReward(finishedArena, difficulty),
      {base: pay, placing: 0, wrecks: 0, factor, total: Math.round(pay * factor)});
  const profile = {credits: 123, kept: 'unchanged', wasteland: {
    version: 1, discoveredGate: true, scrap: 10, settledResults: [],
    territories: {kettle: {hold: 0, claimed: false}}, kept: 'unchanged',
  }};
  const beforeProfile = JSON.stringify(profile);
  const request = {runId: `town-${brandsUsed}`, ownerPlayerId: 'test-player',
    activePlayerId: 'test-player', cpuDifficulty: 'easy', arena: finishedArena};
  const paid = settleArenaResult(profile, request);
  assert.equal(paid.awarded, true);
  assert.equal(paid.scrapEarned, pay);
  assert.equal(paid.profile.wasteland.scrap, 10 + pay);
  assert.equal(paid.holdAdded, 0);
  assert.equal(JSON.stringify(profile), beforeProfile, 'Settlement leaves its input alone.');
  assert.deepEqual(Object.keys(paid.profile), Object.keys(profile));
  assert.deepEqual(Object.keys(paid.profile.wasteland), Object.keys(profile.wasteland));
  assert.equal(paid.profile.credits, 123);
  assert.equal(paid.profile.kept, 'unchanged');
  assert.equal(paid.profile.wasteland.kept, 'unchanged');
  const duplicate = settleArenaResult(paid.profile, request);
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.profile, paid.profile);
  assert.equal(duplicate.scrapEarned, 0);
  const unfinishedArena = {...finishedArena, phase: 'active'};
  assert.equal(settleArenaResult(profile, {...request, arena: unfinishedArena}).awarded, false);
  const screen = arenaResultsScreen({arena: finishedArena},
    {metric: () => '', action: () => '', escapeHTML: String});
  assert.equal(screen.description.split(sentence).length - 1, 1);
  const lost = arenaResultsScreen({arena: {...finishedArena,
    result: {winnerId: 'raiders', reason: 'job-failed'}}},
  {metric: () => '', action: () => '', escapeHTML: String});
  assert.equal(lost.description.includes(sentence), false);
}
console.log('PASS Light the Town: brand payment, result sentence, unchanged save shape and one payment per run.');

// A rule/mover check, not a player walk: the smotherer must reach each lamp
// from the wall point the rule chooses, then return to a wall when driven off.
const {brandAshAim}=await import('../src/world/jobs/brand-sites.js');
const {stepMover,FOOT_GRADE}=await import('../src/world/scablands-movers.js');
for(const lamp of actualStep.places) {
  const grid=createJobSolidGrid();grid.setBrandLamps(actualStep.places);
  const view={onFoot:true,fighter:{position:lamp.position},lamps:{[lamp.id]:true},brandSeconds:90};
  let ash=stepBrandAsh(actualStep,{},view,0);
  const spawn=ash.requests.find(request=>request.type==='spawnBrandAsh');
  const actor={id:spawn.id,...spawn.from.position};
  let smothered=false;
  const tick=(flee=false)=>{
    ash=stepBrandAsh(actualStep,ash.state,{...view,ashMen:[{id:actor.id,position:{...actor}}],
      handFlamerHits:flee?[actor.id]:[]},.1);
    smothered ||= ash.smotheredLamps.includes(lamp.id);
    const move=ash.requests.find(request=>request.type==='moveBrandAsh'&&request.id===actor.id);
    if(move) {
      const goal=move.place.position??move.place;
      const target=brandAshAim(actor,goal,actualStep.ashEntries,grid.movers);
      const distance=Math.hypot(target.x-actor.x,target.z-actor.z);
      const share=Math.min(1,BRAND_RULE.ashWalkMps*.1/(distance||1));
      const to={x:actor.x+(target.x-actor.x)*share,z:actor.z+(target.z-actor.z)*share};
      Object.assign(actor,stepMover(actor,to,{radius:BRAND_RULE.ashRadiusMetres,grade:FOOT_GRADE,grid:grid.movers,height:actor.y}));
    }
  };
  for(let i=0;i<1200&&!smothered;i++)tick();
  assert(smothered,`${lamp.id}: the farthest-wall smotherer must reach the lamp through alleys`);
  assert(ash.state.men[actor.id].smotherSeconds===0,'smothering still uses the rule clock');
  tick(true);
  for(let i=0;i<1200&&!ash.state.men[actor.id].gone;i++)tick();
  assert(ash.state.men[actor.id].gone,`${lamp.id}: the driven-off smotherer must reach the wall through alleys`);
}
console.log('PASS Light the Town: pump, tower and far smotherers reach lamps and flee through town solids with the existing foot mover.');

// Review cure: recovery uses the existing request handler and real town solids.
const {applyBrandRequest} = await import('../src/arena/modes/world-job.js');
for (const place of [sites.hearth, ...sites.lamps]) {
  const fighter = {s:0, maxHealth:100, respawns:0, knockedDown:true};
  const recoveryDuel = {state:{onFoot:true, fighter}, course:{nearest:()=>({s:0,lateral:0})}};
  applyBrandRequest(recoveryDuel, {solidGrid:lampGrid, job:{steps:[actualStep],stepIndex:0}},
    {type:'brandRecovery',place});
  const at=place.position;
  const radius=place===sites.hearth ? 3 : 2;
  assert(Math.hypot(fighter.x-at.x,fighter.z-at.z)<=radius+1e-8);
  assert.equal(pushOutOfSolids(fighter.x,fighter.z,.55,SOLID_GRID,fighter.y).hit,null);
  assert.equal(pushOutOfSolids(fighter.x,fighter.z,.55,lampGrid,fighter.y).hit,null);
  assert(Math.abs(fighter.yaw-Math.atan2(at.x-fighter.x,at.z-fighter.z))<1e-8);
  assert.equal(fighter.knockedDown,false);
}
console.log('PASS Light the Town: clear hearth and lamp recovery, facing the fire.');

// Two pairs approach the same point and cross paths, without player driving.
const {moveJobRaiders} = await import('../src/arena/modes/world-job.js');
const spacingActors = [
  {id:'a',brandAsh:true,x:-5,z:0}, {id:'b',brandAsh:true,x:5,z:0},
  {id:'c',brandAsh:true,x:0,z:-5}, {id:'d',brandAsh:true,x:0,z:5},
].map(actor => ({...actor,approachSpeed:BRAND_RULE.ashWalkMps}));
for (let frame=0;frame<120;frame++) {
  for (const actor of spacingActors) actor.approachTarget = {x:0,z:0};
  moveJobRaiders({course:{def:{scablands:false}}}, {actors:spacingActors}, 1/60);
  for (let a=0;a<spacingActors.length;a++) for(let b=a+1;b<spacingActors.length;b++)
    assert(Math.hypot(spacingActors[a].x-spacingActors[b].x,
      spacingActors[a].z-spacingActors[b].z)>=1.2, 'No two Ash Men may overlap at any step.');
}
console.log('PASS slice 11.5: separate wall entries and separation through converging steps.');

// The drawn town supplies valid separate entries for both groups, including
// the case where two lamps are already lit at the same rule step.
for (const lamp of sites.lamps) {
  const spawned = stepBrandAsh(actualStep, {}, {onFoot:true,
    fighter:{position:lamp.position}, lamps:{pump:true,tower:true}}, 0);
  const spawns = spawned.requests.filter(request => request.type === 'spawnBrandAsh');
  assert.equal(spawns.length,3);
  const second = spawns.slice(1).map(request => request.from.position);
  assert(Math.hypot(second[0].x-second[1].x,second[0].z-second[1].z)>=20);
  for (let a=0;a<spawns.length;a++) for (let b=a+1;b<spawns.length;b++) {
    const first=spawns[a].from.position, next=spawns[b].from.position;
    assert(Math.hypot(first.x-next.x,first.z-next.z)>=1.2);
  }
}
// A large time step must not let an Ash Man pass through a stationary one.
const crossing = [
  {brandAsh:true,x:-3,z:0,approachSpeed:6,approachTarget:{x:3,z:0}},
  {brandAsh:true,x:0,z:0},
];
moveJobRaiders({course:{def:{scablands:false}}}, {actors:crossing}, 1);
assert.equal(crossing[0].x,-3);
console.log('PASS slice 11.5: real town entries and no crossing through a stationary neighbour.');

// Review: opposing walkers must pass even in the town's narrowest alley.
// Check every authored alley stretch, in both normal and fleeing priority.
for (let segment = 1; segment < actualStep.farWalk.length - 1; segment++) {
  const start = actualStep.farWalk[segment].position;
  const end = actualStep.farWalk[segment + 1].position;
  const length = Math.hypot(end.x-start.x,end.z-start.z);
  const span = Math.min(10,length/3);
  const middle = {x:(start.x+end.x)/2,z:(start.z+end.z)/2};
  const ends = [-1,1].map(sign => ({x:middle.x+sign*(end.x-start.x)/length*span,
    z:middle.z+sign*(end.z-start.z)/length*span}));
  for (const fleeing of [false,true]) {
    const grid = createJobSolidGrid();
    grid.setBrandLamps(actualStep.places);
    const actors = ends.map((at,index) => ({id:index?'b':'a',brandAsh:true,...at,
      y:scablandsSurfaceHeightAt(at.x,at.z),approachSpeed:BRAND_RULE.ashWalkMps}));
    const world = {actors,solidGrid:grid,job:{stepState:{brandAsh:{men:{b:{fleeing}}}}}};
    const arrived = [false,false];
    for (let tick=0;tick<300 && !arrived.every(Boolean);tick++) {
      for (const [index,actor] of actors.entries()) {
        const goal = ends[1-index];
        arrived[index] ||= Math.hypot(actor.x-goal.x,actor.z-goal.z)<.5;
        actor.approachTarget = arrived[index] ? null :
          brandAshAim(actor,goal,actualStep.ashEntries,grid.movers);
      }
      moveJobRaiders({course:{def:{scablands:true}}},world,.1);
      assert(Math.hypot(actors[0].x-actors[1].x,actors[0].z-actors[1].z)>=1.2);
      for (const actor of actors) {
        const clear = pushOutOfSolids(actor.x,actor.z,BRAND_RULE.ashRadiusMetres,grid.movers,actor.y);
        assert(Math.hypot(clear.x-actor.x,clear.z-actor.z)<1e-8,
          `Alley ${segment}: ${actor.id} must remain outside buildings.`);
      }
    }
    assert(arrived.every(Boolean),`Alley ${segment}: both men arrive within 30 seconds (fleeing ${fleeing}).`);
  }
}
console.log('PASS review: opposing Ash Men and a fleeing man pass through every town alley within 30 seconds.');
for (const [fleeing, yieldingFirst] of [[false,false],[false,true],[true,false],[true,true]]) {
  const actors = [{id:'a',brandAsh:true,x:0,z:-1,approachTarget:{x:0,z:5}},
    {id:'b',brandAsh:true,x:0,z:1,approachTarget:{x:0,z:-5}}]
    .map(actor => ({...actor,approachSpeed:BRAND_RULE.ashWalkMps}));
  // Neither actor order may choose who has the way.
  if (yieldingFirst !== fleeing) actors.reverse();
  moveJobRaiders({course:{def:{scablands:false}}},{actors,
    job:{stepState:{brandAsh:{men:{b:{fleeing}}}}}},.3);
  const yielding = actors.find(actor => actor.id === (fleeing?'a':'b'));
  const winner = actors.find(actor => actor.id === (fleeing?'b':'a'));
  assert.equal(winner.x,0,'The man with the way keeps his line.');
  assert(fleeing ? yielding.x>0 : yielding.x<0,'The other man tries 60 degrees right first.');
}
console.log('PASS review: lower ids keep the way, fleeing takes priority, and the first free step is right.');
for (const blockLeft of [false,true]) {
  const yielding = {id:'b',brandAsh:true,x:0,z:-1.4,approachSpeed:BRAND_RULE.ashWalkMps,
    approachTarget:{x:0,z:10}};
  const actors = [yielding,{id:'a',brandAsh:true,x:0,z:0},
    {id:'c',brandAsh:true,x:1.4,z:-1.4}];
  if (blockLeft) actors.push({id:'d',brandAsh:true,x:-1.4,z:-1.4});
  moveJobRaiders({course:{def:{scablands:false}}},{actors},.1);
  if (blockLeft) {
    assert.equal(yielding.x,0);
    assert.equal(yielding.z,-1.4-BRAND_RULE.ashWalkMps*.1/2,'Both sides blocked: half a step back.');
  } else {
    assert(yielding.x<0,'Right blocked: take the free left step.');
    assert(yielding.z>-1.4,'The left step is forward, before trying back.');
  }
  for (const other of actors.slice(1)) assert(Math.hypot(yielding.x-other.x,yielding.z-other.z)>=1.2);
}
console.log('PASS review: a blocked right step tries left, then half a step back, keeping 1.2 metres.');
