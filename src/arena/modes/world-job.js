import {reserveRoadRiders, startRoadFight, updateRoadFight, roadRiderGoal,
  checkpointRoadView, applyCheckpointRoadRequest} from './road-riders.js';
import {barricadeEnds} from '../../world/jobs/barricade.js';
import {GAS_LOAD_RULE} from '../../world/jobs/gas-load-rule.js';
import {createStoryPeople, advanceStoryPeople} from '../../world/jobs/story-people.js';
import {NIGHT_2_ID, NIGHT_2_SCOUT, createNight2, enterNight2Step, routeNight2, night2Action, night2BrandRoute, night2ScoutDestination,
  night2CampSolids, stepNight2Siege, watchNight2Camp} from '../../world/jobs/night-2.js';
import {NIGHT_2_SITES} from '../../world/jobs/night-2-sites.js';
import {createJob, stepJob} from '../../world/jobs/job-engine.js';
import {createRaidZones, damageRaider} from '../../raiders.js';
import {COMBAT_TUNING} from '../../wasteland-tuning.js';
import {initializeCrewGear, signatureFor} from '../../crew-gear/signature.js';
import {clearScablandsTownLayout, scablandsSurfaceHeightAt, scablandsActorHeightAt, scablandsActorFeet, scablandsFloorsAt} from '../../world/scablands-ground.js';
import {OLD_SMOKE, oldSmokeVentTargets, createFurnace, stepFurnace, furnaceHit, furnaceHealth,
  furnaceNextDoor, furnaceFallBack, furnaceRested} from '../../world/jobs/old-smoke.js';
import {FURNACE_LEAVING, pathShare, stepSkylineSight, stepRidgeSight, hotDeliveryGlass, stepGlassSeen, glassWarningDue, stepGlassPursuit, glassPursuitReady, beginGlassPursuit, FURNACE_GLASS} from '../../world/jobs/furnace-sightings.js';
import {AMBUSH_WEAR_METRES, AMBUSH_WEAR_PER_SECOND, AMBUSH_RUN_DOWN_METRES, AMBUSH_RUN_DOWN_MPS, REST_HEALTH_MINIMUM} from '../../world/jobs/steps/escort.js';
import {nearestIronLineDistance, sampleIronLine} from '../../world/iron-line.js';
import {groundBeside, DECK_CUES} from '../../world/deck-plates.js';
import {captionRecord} from '../../story/story-lines.js';
import {applyArmorDamage} from '../../combat-armor.js';
import {startKnock} from '../../vehicle-knock.js';
import {DRIVE} from '../../config.js';
import {arenaFloorSpeed} from '../venues.js';
import {worldPose} from '../arena-floor.js';
import {wrapHeading} from '../../offroad-physics.js';
import {scablandsDriveAt, RIVER_LAND, GROUND_AREAS, polygonMargin, edgeWarp, DRIVE as SCABLANDS_DRIVE} from '../../world/scablands-regions.js';
import {ROAD_NET, roadPointFrom} from '../../world/scablands-road.js';
import {nearestOnLine, sees} from '../../world/scablands-ways.js';
import {MPH_TO_KMH, EMBER_RULE, emberLoss, SALT_RIDERS, saltIntercept, saltRiderSpeed, saltRidersTurnHome, emberSentence, EMBER_CAPTION_SECONDS} from '../../world/jobs/ember-rule.js';
import {stepMover, FOOT_GRADE, TRUCK_GRADE} from '../../world/scablands-movers.js';
import {createJobSolidGrid} from '../../world/scablands-solids.js';
import {yardPlan} from '../../world/scablands-yard-look.js';
import {brazierSpotsFor} from '../../world/ember-pot.js';
import {TIN_TOWN_SWING_SECONDS} from '../../world/tin-town-gate.js';
import {BRAND_RULE, brandSwingReady} from '../../world/jobs/brand-rule.js';
import {brandAshAim, brandRecoveryPose} from '../../world/jobs/brand-sites.js';
import {BELLOWS_RULE, bellowsBlockingMove, bellowsRoadFacts, bellowsRestartPlaces} from '../../world/jobs/bellows-rule.js';
import {handFlameAimsAt} from '../../world/jobs/hand-flame.js';
import {createFighter} from '../../onfoot.js';
import {crewPerks} from '../../crew.js';
import {resetFootWeaponUser} from '../../onfoot-weapons.js';
import {BELL_CUE, fillWorkVehicleTank, loadWorkVehicle, pumpWorkVehicleTank, ringWorkVehicleBell, startWorkVehicle, stepWorkVehicleControls, unloadWorkVehicle} from '../../town/work-vehicles.js';
import {groupKg} from '../../world/jobs/steps/haul.js';
import {BUILDINGS} from '../../world/open/content/buildings.js';
import {buildingWalls} from '../../world/open/building-rule.js';
import {forgePosts} from '../../world/open/content/people-forge.js';
import {applyEffects} from '../../world/open/open-effects.js';
import {installSiteGround} from '../../world/open/site-ground.js';
import {beginOpenLand, stepOpenLand} from '../../world/open/open-land.js';
import {sitePosition} from '../../world/open/site-rule.js';
import {SITES as OPEN_SITES} from '../../world/open/register.js';
import {distanceToPerson, TALK_RANGE} from '../../world/open/parts/people.js';
import {OPEN_TALK_HAIL} from '../../world/open/open-cues.js';
import {WAITING_LINE} from '../../world/open/content/talk-town.js';
import {startTalk, talkScreen} from '../../story/talk.js';
import {sprayWater, waterStreamStart} from '../../arsenal/water-cannon.js';
import {point as combatPoint} from '../../combat-actors.js';
import {targetIdentity} from '../../arsenal/targeting.js';

export const worldJobPosition = (duel, actor) => {
  const at = duel.course.worldAt(actor.s, actor.lateral);
  const feet = scablandsActorFeet(actor, at.y);
  return {x: at.x, y: duel.course.def.scablands ? feet : at.y, z: at.z};
};
const position = worldJobPosition;
// Both the rider and its post must be far away, or hidden by the ground.
function riderCanLeave(duel, car, rider, post) {
  const distance = point => Math.hypot(point.x - car.x, point.z - car.z);
  if (distance(rider) >= 600 && distance(post) >= 600) return true;
  const hidden = point => !sees(car, point, {heightAt:scablandsSurfaceHeightAt,
    actorFloors:true, tunnels:duel.course.groundTunnels, eye:5, target:2, step:5});
  return hidden(rider) && hidden(post);
}
// Keep sight work bounded and stagger the two road riders without using wall time.
export function roadRiderSight(rider, dt, index, trace) {
  rider.sightWait ??= index * 0.125;
  rider.sightWait -= Math.max(0, dt);
  if (rider.sightWait <= 0) {
    rider.roadVisible = trace();
    rider.sightWait = 0.25;
  }
  return rider.roadVisible === true;
}
const EMPTY_HIT_TARGETS = [];
// The drawn Pipe is 176 m long and follows the Salt Road at the named crossing.
// Keep the car's floor in the question: the river bed below is not the deck.
const PIPE_CROSSING = RIVER_LAND.crossings.find(crossing => crossing.id === 'the-pipe');
const PIPE_ROAD_HIT = ROAD_NET.nearest(PIPE_CROSSING.x, PIPE_CROSSING.z);
const pipePoints = PIPE_ROAD_HIT.road.points;
const pipeA = pipePoints[PIPE_ROAD_HIT.index], pipeB = pipePoints[PIPE_ROAD_HIT.index + 1];
const pipeLength = Math.hypot(pipeB.x - pipeA.x, pipeB.z - pipeA.z);
const pipeDirection = {x:(pipeB.x - pipeA.x) / pipeLength, z:(pipeB.z - pipeA.z) / pipeLength};
export function pipeDeckSpeed(point, speedKmh) {
  const dx = point.x - PIPE_CROSSING.x, dz = point.z - PIPE_CROSSING.z;
  const along = dx * pipeDirection.x + dz * pipeDirection.z;
  const across = dx * pipeDirection.z - dz * pipeDirection.x;
  const floor = scablandsSurfaceHeightAt(point.x, point.z);
  const onDeck = Math.abs(along) <= 88 && Math.abs(across) <= PIPE_CROSSING.deckHalfWidth &&
    Number.isFinite(point.y) && Math.abs(point.y - floor) <= 2;
  return {onDeck, tooFast:onDeck && speedKmh > 40};
}
const FURNACE_ID = 'old-smoke-furnace';
// Existing cues only (src/sound-bank.js), played through the arena tell event.
// townReached is the horn (the one that warns of the shove) and gateBurnt is the flamethrower's flame catching.
const FURNACE_CUES = Object.freeze({stoke: 'arena.tell', doorOpen: 'gate.latch',
  doorSlam: 'vehicle.landing', hit: 'combat.hit-confirm', shoveWarning: 'arena.toll-gate',
  fell: 'combat.explosion', townReached: 'arena.toll-gate', gateBurnt: 'weapon.flame.start'});
const FURNACE_HIT_LINES = Object.freeze({1: 'story.ember.cinder.18', 2: 'story.ember.old-smoke.3',
  3: 'story.ember.cinder.19'});
// The pot's cues (src/sound-bank.js), by the carry step's event.
const EMBER_CUES = Object.freeze({emberJolt: 'world.ember.spark', emberOut: 'world.ember.out', emberRelit: 'world.ember.scoop'});
const BRAND_CUES = Object.freeze({brandCatch: 'world.brand.catch', lit: 'world.brand.catch',
  brandOut: 'world.brand.out', ashThrow: 'world.ash.throw', townWoke: 'world.town.wake'});
const BELLOWS_CUES = Object.freeze({thiefAsh: 'world.thief.ash', bellowsLoaded: 'world.bellows.load'});

// A sack sounds where it burst; collecting the load sounds at the parked car.
// Reading an event never advances the chase or changes the cloud's lifetime.
export function playBellowsEvent(duel, worldJob, step, event, carPosition) {
  const cue = step?.bellows && BELLOWS_CUES[event.type];
  if (!cue) return false;
  const cloud = event.type === 'thiefAsh'
    ? worldJob.job.stepState.clouds?.find(candidate => candidate.id === event.id) : null;
  const position = cloud ? {x:cloud.x, y:carPosition.y, z:cloud.z} : {...carPosition};
  duel.emit({arenaTell: {id:event.id ?? 'bellows-load', targetId:'player', seconds:0, cue, position}});
  return true;
}

// Consume no evidence here. The normal contact and hit paths clear their own
// reports after the chase has read this step's real meetings and flame hits.
export function bellowsArenaFacts(duel, worldJob, step, thingsHit) {
  if (!step?.bellows || !step.bellowsRoute) return {};
  const thief = worldJob.actors.find(actor => actor.id === step.targetId);
  if (!thief?.position) return {};
  const car = position(duel, duel.state);
  const pose = duel.course.nearest(thief.position.x, thief.position.z);
  const surface = duel._drivingSurface(pose.s, pose.lateral);
  const contacts = duel.state.onFoot ? [] : (worldJob.carContacts ?? [])
    .filter(hit => hit.actor.id === step.targetId);
  const weaponHits = thingsHit.filter(hit => (hit.actorId ?? hit.id) === step.targetId && !hit.flame);
  const fighter = duel.state.onFoot && duel.state.fighter;
  const gear = signatureFor('cinder');
  // By heading, as in Light the Town: a walker looking down at the ground still burns the man in front of him. The barrel's
  // tilt is judged on its own (src/world/jobs/hand-flame.js): aimed at the sky, the flame burns nobody.
  const direction = fighter && {x: Math.sin(fighter.yaw || 0), z: Math.cos(fighter.yaw || 0)};
  const dx = fighter ? thief.position.x - fighter.x : 0;
  const dz = fighter ? thief.position.z - fighter.z : 0;
  const distance = Math.hypot(dx, dz);
  const handFlame = fighter?.flaming && duel.state.footWeapons?.selected === 'hand-flamer' &&
    distance > 0 && distance <= gear.range &&
    Math.abs((thief.position.y ?? 0) - fighter.y) < BELLOWS_RULE.handFlameHeightMetres &&
    (dx * direction.x + dz * direction.z) / distance >= Math.cos(gear.cone / 2) &&
    handFlameAimsAt(fighter, {x: thief.position.x, y: thief.position.y ?? fighter.y, z: thief.position.z});
  return {bellows:{weaponHits, ...bellowsRoadFacts(step.bellowsRoute, thief.position, car, thief.pathIndex ?? 0),
    playerTopSpeedKmh:surface.speedLimit * MPH_TO_KMH,
    flameContact:!!handFlame || thingsHit.some(hit => (hit.actorId ?? hit.id) === step.targetId && hit.flame === true),
    carContact:contacts.length > 0,
    meetingKmh:Math.max(0, ...contacts.map(hit => hit.kmh)),
    solidContact:thief.bellowsSolidContact === true,
    solidImpactKmh:thief.bellowsSolidImpactKmh ?? 0}};
}
const FURNACE_ARROWS = Object.freeze({left: '<< LEFT DOOR OPENING', right: 'RIGHT DOOR OPENING >>',
  rear: 'REAR DOOR OPENING (BEHIND HIM)'});
const FURNACE_LOG_LIMIT = 80;

// A line's words: the job's own captions, then any registered story's captions.
function captionFor(worldJob, lineId) {
  const own = worldJob.definition.captions?.[lineId];
  if (own) return own;
  const story = captionRecord(lineId);
  return story ? `${story.who}: ${story.text}` : '';
}
// The screen uses this only for presentation; the job's own line sequencing is unchanged.
function urgentCaption(worldJob, lineId, marked = false) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  return marked || lineId === step?.alarmLineId || lineId === step?.urgentLineId ||
    (step?.urgentLineIds ?? []).includes(lineId) ||
    [...(step?.sayNear ?? []), ...(step?.sayOnce ?? [])].some(cue => cue?.lineId === lineId && cue.urgent === true);
}
// EVERBURN-PLAY-FIXES, third round: every story line said from the moment a job's last step is decided (the step's closing lines, a
// run's arrival lines, the war party line) is kept, in order, on the world job (`endLines`: {lineId, text}), so that the results
// screen can show them. Nothing in a job reads this list: no rule, clock, pay or outcome depends on it.
function rememberEndLine(worldJob, lineId, text) {
  const job = worldJob.job, last = job.steps.length - 1, step = job.steps[last];
  if (!text || job.stepIndex !== last || job.stepState?.linesClosing !== true) return;
  if (![...(step.closing ?? []), ...(job.stepState.closingLines ?? [])].includes(lineId)) return;
  worldJob.endLines ??= [];
  if (!worldJob.endLines.some(line => line.lineId === lineId)) worldJob.endLines.push({lineId, text});
}
// A line the job says: the screen gets it as a caption, and the list above keeps it if the job is ending.
function sayLine(duel, worldJob, lineId, marked) {
  const text = captionFor(worldJob, lineId);
  duel._storyCallout(text, 2.2, urgentCaption(worldJob, lineId, marked === true));
  rememberEndLine(worldJob, lineId, text);
}
const WELL_WEAR_RANGE = 10;
const WELL_WEAR_PER_SECOND = 1;

// A drive through the player's own town: the free drive (town-drive) and the town's jobs (TOWN-HAUL-JOB, town-job) both stand
// the town's layout in the Scablands and start at its truck bay.
const townWorldJob = definition => definition?.kind === 'town-drive' || definition?.kind === 'town-job';

// TOWN-HAUL-JOB: the haul step's events, heard and read (src/world/jobs/steps/haul.js). A piece lifted on or off is the bellows'
// load thump (world.bellows.load), a piece thrown off is metal crushing (vehicle.crush) where it fell, and a delivered haul is the
// finished-step chime (interface.bonus). The weight on the bed is put on the truck, so it drives as heavy as it is.
const HAUL_CUES = Object.freeze({haulLift:'world.bellows.load', haulUnload:'world.bellows.load', haulShed:'vehicle.crush',
  haulDelivered:'interface.bonus'});
function haulShedSentence(event) {
  const count = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][event.pieces.length - 2];
  const what = event.pieces.length === 1 ? `A ${event.pieces[0]}` : `${count ?? 'Many'} pieces`;
  const how = event.cause === 'rough' ? 'rattled loose and fell off' : event.cause === 'fall' ? 'flew off in the fall' : 'fell off the back';
  return `${what} ${how}. That is ${groupKg(event.kg)} kg lost.`;
}
function syncHaulVehicle(worldJob) {
  const vehicle = worldJob.vehicle, loadKg = worldJob.job.stepState?.loadKg;
  if (!vehicle || !Number.isFinite(loadKg) || loadKg === vehicle.loadKg) return;
  worldJob.vehicle = loadKg > vehicle.loadKg ? loadWorkVehicle(vehicle, loadKg - vehicle.loadKg).vehicle
    : unloadWorkVehicle(vehicle, vehicle.loadKg - loadKg).vehicle;
}
// TOWN-HAUL-JOB: a washout is marked where the player sees it coming: an amber ring across the road at each end, beside the job's
// own ring. View-only: nothing reads these back.
function markHaulWashouts(duel, step) {
  const markers = duel.state.arena.markers ?? [];
  const ends = (step.washouts ?? []).flatMap(washout => [washout.line[0], washout.line.at(-1)].map((end, index) => ({kind:'ring',
    id:`haul-washout-${washout.id}-${index}`, color:'warn', radius:washout.halfWidth ?? 16, x:end.x, z:end.z,
    y:scablandsSurfaceHeightAt(end.x, end.z)})));
  duel.state.arena.markers = [...markers.filter(marker => !String(marker.id).startsWith('haul-washout-')), ...ends];
}
// TOWN-FIRE-JOB: the douse step's events, heard and read (src/world/jobs/steps/douse.js). A building catching is the town's fire
// (town.fire), the cannon opening is town.spray, a fire put out hisses (town.fire.out), a building lost is metal crushing as its
// roof comes in (vehicle.crush), filling at a tap is town.fill, and the call done is the finished-step chime (interface.bonus).
const DOUSE_CUES = Object.freeze({douseCaught:'town.fire', douseSpray:'town.spray', douseOut:'town.fire.out', douseLost:'vehicle.crush',
  douseFill:'town.fill', douseDone:'interface.bonus'});
const capitalised = text => text.charAt(0).toUpperCase() + text.slice(1);
function douseCallout(event) {
  if (event.type === 'douseCaught') return `The fire has caught ${event.name}.`;
  if (event.type === 'douseOut') return `The fire at ${event.name} is out.`;
  if (event.type === 'douseLost') return `${capitalised(event.name)} has burnt down.`;
  if (event.type === 'douseDry') return `${capitalised(event.name)} has no more water.`;
  if (event.type === 'douseFull') return 'The tank is full.';
  return null;
}
// The tank's water is the truck's weight too: 1 kg a litre (src/town/work-vehicles.js). Changed in steps of 10 litres or more.
function syncDouseVehicle(worldJob) {
  const vehicle = worldJob.vehicle, tankL = worldJob.job.stepState?.tankL;
  if (!vehicle || !Number.isFinite(tankL)) return;
  const change = tankL - vehicle.tankL;
  if (Math.abs(change) < 10 && !(tankL === 0 && vehicle.tankL > 0)) return;
  const pumpLpm = vehicle.car && worldJob.job.steps[worldJob.job.stepIndex]?.tank?.pumpLpm || 1000;
  worldJob.vehicle = change > 0 ? fillWorkVehicleTank(vehicle, change).vehicle : pumpWorkVehicleTank(vehicle, -change / pumpLpm * 60).vehicle;
}
// The water points are blue rings where the truck stops to fill up. View-only: nothing reads these back.
function markDouseWater(duel, step, stepState) {
  const markers = duel.state.arena.markers ?? [];
  const rings = (step.water ?? []).filter(point => !(Number.isFinite(point.storeL) && point.storeL - (stepState?.drawn?.[point.id] ?? 0) <= 0))
    .map(point => ({kind:'ring', id:`douse-${point.id}`, color:'magnet', radius:point.radius ?? 8, x:point.position.x, z:point.position.z,
      y:scablandsSurfaceHeightAt(point.position.x, point.position.z)}));
  duel.state.arena.markers = [...markers.filter(marker => !String(marker.id).startsWith('douse-')), ...rings];
}
function playDouseEvent(duel, worldJob, event, point) {
  const said = douseCallout(event);
  if (said) duel._storyCallout(said, 2.4, true);
  if (event.type === 'douseDone') worldJob.fireResult = {savedIds:event.savedIds, lostIds:event.lostIds, mainSaved:event.mainSaved,
    usedL:event.usedL, lineId:event.lineId, sentence:event.sentence};
  const cue = DOUSE_CUES[event.type];
  if (!cue) return;
  const building = worldJob.job.steps[worldJob.job.stepIndex]?.buildings?.find(row => row.id === event.id);
  duel.emit({arenaTell:{id:'town-fire', targetId:'player', seconds:0, cue,
    position:building ? {x:building.x, y:scablandsSurfaceHeightAt(building.x, building.z), z:building.z} : {...point}}});
}
/** H held in the fire truck (the firetruck input context). Written to the input, as a pedal is; read once a step. */
export function setJobVehicleSpray(duel, held) {
  const state = duel.state, worldJob = state.arena?.mode === 'world-job' ? state.arena.worldJob : null;
  if (!state.input) return false;
  state.input.spray = held === true && worldJob?.vehicle?.id === 'fire-truck' && !state.onFoot;
  return state.input.spray;
}
// WEAPON-WATER-CANNON: H in the fire truck is also the water cannon's stream on a car (src/arsenal/water-cannon.js): the
// same straight 14 m line from the nose that the Armory's car cannon throws, shoving the first car in it and putting out its
// fire, never damaging it. One tank: in a fire call the call's (the douse step drains it, told by `waterOnCar`), anywhere
// else the truck's own, at the pump's 1,000 L a minute. Water flows only while something is in front, as the fire call's
// cannon does, so holding H wastes none. The stream on a car starts with the truck's one spray sound (town.spray).
function sprayFromFireTruck(duel, worldJob, step, dt) {
  const state = duel.state, vehicle = worldJob.vehicle;
  if (!(dt > 0)) return null; // a step that passes no time (a talk, a held arrival) leaves the stream as it was
  const douse = step?.kind === 'douse';
  const tankL = douse && Number.isFinite(worldJob.job.stepState?.tankL) ? worldJob.job.stepState.tankL : vehicle?.tankL;
  if (worldJob.controls?.spray !== true || vehicle?.id !== 'fire-truck' || state.onFoot || !(tankL > 0)) {
    worldJob.truckStream = null;
    return null;
  }
  const at = combatPoint(duel, state);
  const stream = worldJob.truckStream ??= {pushed:{}, hitId:null};
  const result = sprayWater(duel, state, stream, dt, waterStreamStart(at, at.heading + (state.headingError || 0)));
  const hitId = result.hit ? targetIdentity(duel, result.hit) : null;
  if (hitId && hitId !== stream.hitId) duel.emit({arenaTell:{id:'town-water', targetId:'player', seconds:0, cue:'town.spray',
    position:{x:at.x, y:at.y, z:at.z}}});
  stream.hitId = hitId; stream.reach = result.reach;
  const start = waterStreamStart(at, at.heading + (state.headingError || 0));
  // Where the water lands on the car, for the drawing (a plain point: the view reads it and nothing reads it back).
  stream.to = hitId ? {x:start.x + Math.sin(start.heading) * result.reach, z:start.z + Math.cos(start.heading) * result.reach} : null;
  if (hitId && !douse) worldJob.vehicle = pumpWorkVehicleTank(vehicle, dt).vehicle;
  return result;
}
/** True while the player drives the fire truck in a job: the app then uses the firetruck input context. */
export const drivingFireTruck = state => state?.arena?.mode === 'world-job' && state.arena.worldJob?.vehicle?.id === 'fire-truck' && !state.onFoot;

function playHaulEvent(duel, worldJob, event, point) {
  const cue = HAUL_CUES[event.type];
  if (!cue) return;
  if (event.type === 'haulShed') duel._storyCallout(haulShedSentence(event), 2.6, true);
  if (event.type === 'haulDelivered') worldJob.haulResult = {good:event.good, deliveredKg:event.deliveredKg, lostKg:event.lostKg,
    pieces:event.pieces, lostPieces:event.lostPieces, sentence:event.sentence};
  duel.emit({arenaTell:{id:'town-haul', targetId:'player', seconds:0, cue, position:{...(event.position ?? point)}}});
}

export function createWorldJob(definition) {
  if (!definition) throw new TypeError('World Job mode needs a job definition');
  return {job: createJob(definition, definition.seed ?? 0), definition,
    marker: null, follow: null, spawnedWaves: 0, spawnedWaveKeys: [],
    clearedWaves: [], hitTargets: [], settled: false};
}

const endSiteGround = new WeakMap();

export function initializeWorldJob(duel, definition) {
  const state = duel.state, arena = state.arena;
  const worldJob = arena?.worldJob;
  if (!worldJob) return false;
  if (definition.open && duel.course.def?.scablands && duel.featureFlags?.enabled('story-choices')) {
    endSiteGround.set(worldJob, installSiteGround(definition.open.world.open.landSeed));
  }
  // Loaned car weapons belong to this run. They never touch the player profile.
  worldJob.originalWeaponLoadout = [...(state.weaponLoadout || [])];
  worldJob.originalCrewId = state.crewId;
  worldJob.originalFootWeaponSelected = state.footWeapons?.selected ?? null;
  worldJob.activeLoan = null;
  applyStepLoan(duel, worldJob);
  // TOWN-VEHICLES: a job may name a work vehicle; it is driven instead of the garage car while the town's switch is on.
  worldJob.vehicle = startWorkVehicle(definition.vehicle, {enabled: duel.featureFlags?.enabled?.('wasteland-town') === true});
  // SHIPS-DECKS: a car lent for this run (src/world/jobs/job-vehicle.js) is said as the job starts, and is never saved.
  if (definition.vehicleLent?.lineId) sayLine(duel, worldJob, definition.vehicleLent.lineId);
  if(townWorldJob(definition))duel.course.townLayout=definition.layout??null;
  if (definition.yard) {
    worldJob.solidGrid = createJobSolidGrid(duel.course.solidGrid);
    worldJob.solidGrid.setYard(yardPlan().solids);
  }
  // The neighbours' outposts and Mrs Vane's things are solid in a town drive only, from the layout the drive was started with
  // (TOWN-OUTPOST-SCENE, TOWN-VANE-SCENE). After the yard's grid, which replaces any grid made before it.
  const townSolids=definition.kind==='town-drive'?[...definition.layout?.outposts?.solids??[],...definition.layout?.vane?.solids??[]]:[];
  if(townSolids.length){
    worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    worldJob.solidGrid.setTown(townSolids);
  }
  if (definition.id === 'everburn-hot-delivery') {
    worldJob.solidGrid.setTownGate(definition.steps[0].riderSafeWall);
    const post = definition.steps[0].saltPost.position;
    worldJob.solidGrid.setShelter(post);
    worldJob.solidGrid.setPeople([{id:'hot-delivery-cinder', position:definition.steps[0].pickup.figure.position}]);
  }
  worldJob.raidSeed = duel.seed ^ 0x51ab1e;
  if (definition.steps[0]?.brand) {
    worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    worldJob.solidGrid.setBrandLamps(definition.steps[0].places ?? []);
    if (definition.steps[0].auntie) worldJob.solidGrid.setPeople([definition.steps[0].auntie]);
  }
  if (definition.storyPeople?.length) {
    worldJob.storyPeople = createStoryPeople(definition.storyPeople);
    worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    worldJob.solidGrid.setStoryPeople(worldJob.storyPeople);
  }
  worldJob.actors = [];
  for (const actor of definition.steps[0]?.waitingActors ?? []) updateJobActor(duel, worldJob, actor, 0);
  for (const actor of definition.steps[0]?.saltRiders ?? []) updateJobActor(duel, worldJob, actor, 0);
  syncJobCarSolids(worldJob);
  state.worldJobThingsHit = [];
  if (definition.steps[0]?.faceOriginToPlace && definition.steps[0]?.origin && definition.steps[0]?.place?.position) {
    const target = definition.steps[0].place.position;
    const at = duel.course.worldAt(state.s, state.lateral);
    state.headingError = Math.atan2(target.x - at.x, target.z - at.z) - duel.course.at(state.s).heading;
  }
  // EVERBURN-PLAY-FIXES: a first step may name where the car starts and which way it faces ({x, z, heading}).
  const carStart = definition.steps[0]?.carStart;
  if (carStart && Number.isFinite(carStart.x) && Number.isFinite(carStart.z) && Number.isFinite(carStart.heading)) {
    const pose = duel.course.nearest(carStart.x, carStart.z);
    state.s = state.prevS = pose.s; state.lateral = state.prevLateral = pose.lateral;
    state.speedMph = 0; state.yawVelocity = 0; state.pushVelocity = 0;
    state.headingError = wrapHeading(carStart.heading - duel.course.at(pose.s).heading);
  }
  if(townWorldJob(definition)&&definition.layout?.start){
    const start=definition.layout.start,pose=duel.course.nearest(start.x,start.z);
    state.s=pose.s;state.lateral=pose.lateral;state.prevS=pose.s;state.prevLateral=pose.lateral;
    state.speedMph=0;state.headingError=0;state.townGatePrompt='';
  }
  const footStart = definition.steps[0]?.footStart ?? definition.steps[0]?.bellowsFootStart;
  if (footStart) placeWorldFighter(duel, footStart);
  if (definition.steps.some(step=>step.kind==='rider-fight')) reserveRoadRiders(duel, worldJob);
  if (definition.id === NIGHT_2_ID) {
    worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    worldJob.solidGrid.setBrandLamps([...NIGHT_2_SITES.lamps, ...NIGHT_2_SITES.chaseLamps]);
    worldJob.tinTownGateProgress = 1;
    worldJob.solidGrid.setTownGate(NIGHT_2_SITES.gate, 1);
    worldJob.night2 = createNight2(definition, duel.course.solidGrid);
    enterNight2(duel, worldJob);
  }
  // OPEN-SHARED: a job that begins in the open land carries the open state (src/world/open/open-land.js).
  if (definition.open) worldJob.open = beginOpenLand(definition);
  // OPEN-ROAM: the same open gate is used for drawing and collisions.
  if (worldJob.open && definition.steps[0]?.kind === 'roam') {
    worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    worldJob.tinTownGateProgress = 1;
    worldJob.solidGrid.setTownGate(NIGHT_2_SITES.gate, 1);
  }
  // OPEN-DOORS: only the story outing replaces the two shack shells and staffs their posts.
  worldJob.serviceSheds = !!worldJob.open && !!duel.featureFlags?.enabled('story-choices') &&
    definition.steps.length === 1 && definition.steps[0].kind === 'roam';
  if (worldJob.serviceSheds) {
    worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    worldJob.solidGrid.openBuildingShells(BUILDINGS, BUILDINGS.flatMap(buildingWalls));
    const people = worldJob.storyPeople ?? [];
    const posts = forgePosts(definition.open.partOfDay, scablandsSurfaceHeightAt);
    // The shed staff stand at fixed posts; OPEN-ROAM's people part keeps them beside its own cast (syncOpenPeople).
    worldJob.fixedOpenPeople = posts.filter(p => !people.some(other => other.id === p.id));
    worldJob.storyPeople = [...people, ...createStoryPeople(worldJob.fixedOpenPeople)];
    worldJob.solidGrid.setStoryPeople(worldJob.storyPeople);
  }
  return true;
}

// A chapter can establish its first walking pose, or let the ordinary fighter
// find a safe spot beside a wreck when the player has to return on foot.
function placeWorldFighter(duel, start) {
  const state = duel.state;
  const pose = start ? {...duel.course.nearest(start.x, start.z), yaw: start.heading} : undefined;
  const fighter = createFighter(duel.course, state, pose);
  const perks = crewPerks(state.crewId);
  fighter.crewId = state.crewId || 'rook';
  fighter.maxHealth = Math.round(fighter.health * (perks.healthMultiplier || 1));
  fighter.health = fighter.maxHealth;
  fighter.sprintMultiplier = perks.sprintMultiplier || 1;
  fighter.bailTumbleSeconds = 0;
  state.fighter = fighter;
  state.onFoot = true;
  state.fighterInput = {};
  state.footPresentation = null;
  resetFootWeaponUser(duel);
}

export function cleanupWorldJobLoan(duel) {
  const worldJob = duel.state.arena?.mode === 'world-job' ? duel.state.arena.worldJob : null;
  if (!worldJob || !Array.isArray(worldJob.originalWeaponLoadout)) return false;
  endSiteGround.get(worldJob)?.();
  endSiteGround.delete(worldJob);
  duel.state.weaponLoadout = [...worldJob.originalWeaponLoadout];
  if (worldJob.originalCrewId) duel.state.crewId = worldJob.originalCrewId;
  if (worldJob.originalFootWeaponSelected && duel.state.footWeapons)
    duel.state.footWeapons.selected = worldJob.originalFootWeaponSelected;
  initializeCrewGear(duel);
  if(townWorldJob(worldJob.definition)){
    clearScablandsTownLayout();
    duel.course.townLayout=null;
    duel._obstacleQueryCache?.clear();
  }
  worldJob.activeLoan = null;
  worldJob.settled = true;
  return true;
}

function applyStepLoan(duel, worldJob) {
  const state = duel.state;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const loan = step?.lentWeapon ?? (worldJob.job.stepIndex === 0 ? worldJob.definition.lend?.[0] : null);
  worldJob.activeLoan = typeof loan === 'string' ? loan : null;
  state.weaponLoadout = [...(worldJob.originalWeaponLoadout || [])];
  if (worldJob.activeLoan === 'flamethrower') {
    const slot = Math.min(state.weaponLoadout.length, 3);
    state.weaponLoadout[slot] = worldJob.activeLoan;
  } else if (worldJob.activeLoan === 'cinders-hand-flamer') {
    state.crewId = 'cinder';
    initializeCrewGear(duel);
    if (state.footWeapons) state.footWeapons.selected = 'hand-flamer';
  } else if (worldJob.originalCrewId) {
    state.crewId = worldJob.originalCrewId;
    if (worldJob.originalFootWeaponSelected && state.footWeapons)
      state.footWeapons.selected = worldJob.originalFootWeaponSelected;
    initializeCrewGear(duel);
  }
  const stepCrew=worldJob.job.steps[worldJob.job.stepIndex]?.lentCrew;
  if(stepCrew&&state.crewId!==stepCrew) {state.crewId=stepCrew;initializeCrewGear(duel);}
}

export function prepareWorldJobControls(duel) {
  const worldJob=duel.state.arena?.mode==='world-job'?duel.state.arena.worldJob:null;
  if(!worldJob)return false;
  const step=worldJob.job.steps[worldJob.job.stepIndex];
  // Conversation choices and other external job transitions can enter a fight between simulation ticks.
  if (step?.kind === 'rider-fight' && worldJob.riderReserve) startRoadFight(duel,worldJob);
  const input=duel.state.input??{};
  worldJob.controls={whistle:input.boost===true||duel.state.fighterInput?.jump===true,
    spray:input.spray===true&&worldJob.vehicle?.id==='fire-truck'&&!duel.state.onFoot}; // TOWN-FIRE-JOB: H in the fire truck
  if(worldJob.vehicle&&!duel.state.onFoot)driveWorkVehicle(duel,worldJob,input);
  if(step?.kind!=='drivetrain') return false;
  Object.assign(worldJob.controls,{throttle:input.throttle??0,brake:input.brake??0});
  input.throttle=0;input.brake=0;input.steer=0;input.boost=false;
  duel.state.speedMph=0;duel.state.pushVelocity=0;
  return true;
}

// TOWN-VEHICLES: a truck has no nitro, and its steering keeps to its turning circle. Space is left for a vehicle's tool.
function driveWorkVehicle(duel, worldJob, input) {
  const stepped = stepWorkVehicleControls(worldJob.vehicle, input, {speedMph: duel.state.speedMph, course: duel.course});
  worldJob.vehicle = stepped.vehicle;
  input.steer = stepped.steer;
  duel.state.boost = 0;
}

// TOWN-VEHICLES: B rings the driven work vehicle's bell, if it has one (sound cue town.bell), as the weapon keys fire.
export function ringJobVehicleBell(duel) {
  const state = duel.state, worldJob = state.arena?.mode === 'world-job' ? state.arena.worldJob : null;
  if (!worldJob?.vehicle || state.status !== 'racing' || state.paused || state.onFoot) return false;
  const rung = ringWorkVehicleBell(worldJob.vehicle);
  worldJob.vehicle = rung.vehicle;
  if (rung.rang) duel.emit({arenaTell: {id: 'town-bell', targetId: 'player', seconds: 0, cue: BELL_CUE,
    position: worldJobPosition(duel, state)}});
  return rung.rang;
}

function syncJobCarSolids(worldJob) {
  if (!worldJob.night2 && worldJob.definition.id !== 'everburn-hot-delivery' && !worldJob.job.steps[worldJob.job.stepIndex]?.bellows && !worldJob.job.steps[worldJob.job.stepIndex]?.gasLoad) return;
  worldJob.solidGrid?.setCars(worldJob.actors.filter(actor => actor.renderCar && actor.position));
}

// The swept car contact and a rider's pursuit share one meeting and one ram cost.
function takeJobCarContacts(duel, worldJob) {
  for (const hit of worldJob.carContacts ?? []) {
    const rider = hit.actor;
    const step = worldJob.job.steps[worldJob.job.stepIndex];
    if (step?.gasLoad) {
      (worldJob.gasCarContacts ??= []).push({id:rider.id, kmh:hit.kmh});
      if (step.waitingActors?.some(actor => actor.id === rider.id && actor.gasBlockCar) && hit.kmh < GAS_LOAD_RULE.hardKnockKmh) continue;
    }
    if (step?.bellows && rider.id === step.targetId) continue;
    if (rider.health <= 0 || rider.ramContact || rider.ramRetreat) continue;
    rider.ramContact = true;
    worldJob.riderHitKmh = Math.max(worldJob.riderHitKmh ?? 0, hit.kmh);
    if (rider.id === worldJob.job.steps[worldJob.job.stepIndex]?.scout?.id) {
      stopScout(duel, worldJob, rider);
    } else {
      rider.ramRetreat = {x:rider.position.x - hit.nz * 40, z:rider.position.z + hit.nx * 40, seconds:0};
    }
  }
  worldJob.carContacts = [];
}

function updateJobActors(duel, worldJob, dt) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  updateJobActor(duel, worldJob, step?.actor, dt);
  const wall = step?.riderSafeWall;
  if (wall && worldJob.job.stepState.loaded && !worldJob.ridersRetreating) {
    const car = position(duel, duel.state);
    const yaw = Math.atan2(wall.through.x, wall.through.z);
    const along = (car.x - wall.x) * Math.cos(yaw) - (car.z - wall.z) * Math.sin(yaw);
    const half = wall.opening / 2 + 2.1 + wall.fenceLength;
    const nearest = Math.max(-half, Math.min(half, along));
    const x = wall.x + nearest * Math.cos(yaw), z = wall.z - nearest * Math.sin(yaw);
    if (Math.hypot(car.x - x, car.z - z) <= wall.radius) {
      worldJob.ridersRetreating = true;
      sayLine(duel, worldJob, wall.lineId);
    }
  }
  for (const actor of step?.waitingActors ?? []) {
    updateJobActor(duel, worldJob, actor, dt);
    pursueJobRider(duel, worldJob, actor, dt);
  }
  if (step?.gasLoad) for (const def of step.gasRaiders ?? []) {
    if (!worldJob.job.stepState.gasRaids?.includes(def.raidId) || def.raidIndex >=
        (duel.state.cpuDifficulty === 'easy' ? GAS_LOAD_RULE.easyRaidCount : GAS_LOAD_RULE.raidCount)) continue;
    updateJobActor(duel, worldJob, def, dt);
    pursueJobRider(duel, worldJob, def, dt);
  }
  if (step?.saltRiders) {
    const car = position(duel, duel.state), pan = GROUND_AREAS.polygons.find(area => area.id === 'salt-pan');
    const ground = scablandsDriveAt(car.x, car.z);
    const onPan = ground.id === 'salt-pan' || ground.id === 'road' &&
      polygonMargin(pan.points, car.x, car.z) + edgeWarp(car.x, car.z, pan.phase) > 0;
    const riders = step.saltRiders.map(def => worldJob.actors.find(actor => actor.id === def.id));
    if (!worldJob.saltWarned && !worldJob.saltDone && worldJob.job.stepState.loaded && onPan &&
        riders.some(rider => rider.health > 0 && sees(rider.position, car, {heightAt:scablandsSurfaceHeightAt,
          actorFloors:true, tunnels:duel.course.groundTunnels, eye:SALT_RIDERS.eye,
          range:SALT_RIDERS.sightMetres, step:SALT_RIDERS.sightStep}))) {
      worldJob.saltWarned = true;
      duel._storyCallout("Rook: Salt riders. They won't climb the Ridge. Get to it first.", EMBER_CAPTION_SECONDS);
      duel.emit({arenaTell:{id:'salt-warning', targetId:'player', seconds:0, cue:'world.salt.horn', position:car}});
      for (const rider of riders) { rider.pursuing = true; rider.ambushKey = 'salt'; }
    }
    if (worldJob.saltWarned && !worldJob.saltDone) {
      worldJob.saltChaseSeconds = (worldJob.saltChaseSeconds ?? 0) + Math.max(0, dt);
      if (riders.some(rider => saltRidersTurnHome({car, rider:rider.position, ridge:step.saltRidge,
          onPan, chaseSeconds:worldJob.saltChaseSeconds}))) {
        worldJob.saltDone = true;
        for (const rider of riders) rider.returningToPost = true;
      }
    }
    for (const actor of step.saltRiders) if (worldJob.saltWarned) pursueJobRider(duel, worldJob, actor, dt);
  }
  // The scout is a job rider, so it uses the same actor and hit-target path.
  if (step?.scout && worldJob.job.stepState.loaded) {
    updateJobActor(duel, worldJob, step.scout, 0);
    const scout = worldJob.actors.find(actor => actor.id === step.scout.id);
    if (scout.health <= 0 && !worldJob.job.stepState.scoutHome && !worldJob.job.stepState.scoutStopped)
      stopScout(duel, worldJob, scout);
    const car = position(duel, duel.state);
    const dxCar = car.x - scout.position.x, dzCar = car.z - scout.position.z;
    const carDistance = Math.hypot(dxCar, dzCar);
    if (scout.health > 0 && !worldJob.job.stepState.scoutHome && !duel.state.onFoot && carDistance > 0 && carDistance <= 3 &&
        Math.abs(car.y - scout.position.y) < 3) {
      const pose = worldPose(duel, duel.state);
      const playerSpeed = (duel.state.speedMph || 0) * DRIVE.mphToWorld;
      const vx = Math.sin(pose.heading) * playerSpeed - Math.sin(scout.heading) * (scout.speed || 0);
      const vz = Math.cos(pose.heading) * playerSpeed - Math.cos(scout.heading) * (scout.speed || 0);
      const closing = -(vx * dxCar + vz * dzCar) / carDistance;
      if (closing > 0) {
        worldJob.riderHitKmh = Math.max(worldJob.riderHitKmh ?? 0, closing * 3.6);
        stopScout(duel, worldJob, scout);
      }
    }
    if (scout.health > 0 && !duel.state.onFoot && !worldJob.job.stepState.scoutWarned &&
        Math.hypot(car.x - scout.position.x, car.z - scout.position.z) <= step.scout.sightRadius &&
        roadRiderSight(scout, dt, 0, () => sees(scout.position, car, {heightAt:scablandsSurfaceHeightAt,
          actorFloors:true, tunnels:duel.course.groundTunnels, eye:1.5, step:5}))) {
      worldJob.job.stepState.scoutWarned = true;
      sayLine(duel, worldJob, 'scout.warning', true);
      duel.emit({arenaTell:{id:'ash-scout-warning', targetId:'player', seconds:0,
        cue:'world.ashmen.horn', position:scout.position}});
    }
    if (worldJob.job.stepState.scoutWarned && scout.health > 0 && !worldJob.job.stepState.scoutHome) {
      const road = ROAD_NET.road('east-road');
      const onRoad = nearestOnLine(road.points, scout.position.x, scout.position.z);
      const camp = nearestOnLine(road.points, step.barriers[0].position.x, step.barriers[0].position.z);
      const speed = (duel.state.cpuDifficulty === 'easy' ? step.scout.easySpeedKmh : step.scout.speedKmh) / 3.6;
      const travel = Math.max(0, speed * dt);
      const fence = step.barriers[0];
      // Leave the road before the fence and go around its end, using the same solids as other riders.
      if (worldJob.job.stepState.scoutApproach == null && camp.along - onRoad.along <= 18.001)
        worldJob.job.stepState.scoutApproach = 0;
      const approach = worldJob.job.stepState.scoutApproach;
      const forward = {x:Math.sin(fence.heading), z:Math.cos(fence.heading)};
      const side = {x:Math.cos(fence.heading), z:-Math.sin(fence.heading)};
      const corner = along => ({x:fence.position.x + side.x * 10 + forward.x * along,
        z:fence.position.z + side.z * 10 + forward.z * along});
      const target = approach == null ? (onRoad.distance > 0.1 ? onRoad : roadPointFrom(road, onRoad.x, onRoad.z,
        Math.min(travel, Math.max(0, camp.along - 18 - onRoad.along)))) :
        [corner(-8), corner(8), step.scout.camp.position][approach];
      const dx = target.x - scout.position.x, dz = target.z - scout.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0 && travel > 0) {
        const before = scout.position, share = Math.min(1, travel / distance);
        scout.heading = Math.atan2(dx, dz);
        const moved = stepMover(before, {x:before.x + dx * share, z:before.z + dz * share},
          {radius:1.3, grid:worldJob.solidGrid?.movers ?? worldJob.solidGrid, height:before.y});
        scout.position = {x:moved.x, y:moved.y, z:moved.z};
        scout.speed = Math.hypot(moved.x - before.x, moved.z - before.z) / dt;
      }
      if (approach != null && Math.hypot(target.x - scout.position.x, target.z - scout.position.z) < 0.1) {
        if (approach < 2) worldJob.job.stepState.scoutApproach++;
        else {
          worldJob.job.stepState.scoutHome = true;
          sayLine(duel, worldJob, 'scout.home', true);
          worldJob.job.stepState.campAwake = true;
          scout.speed = 0;
        }
      }
    }
  }
  if (worldJob.skylineWarned) {
    const car = position(duel, duel.state);
    let riderVisible = false;
    for (const [index, actorDef] of (step?.furnaceRiders ?? []).entries()) {
      if (worldJob.furnaceRidersGone?.includes(actorDef.id)) continue;
      updateJobActor(duel, worldJob, actorDef, 0);
      const rider = worldJob.actors.find(actor => actor.id === actorDef.id);
      if (rider.health <= 0 || worldJob.furnaceRidersReturning) continue;
      const visible = roadRiderSight(rider, dt, index, () => sees(rider.position, car,
        {heightAt:scablandsSurfaceHeightAt, actorFloors:true, tunnels:duel.course.groundTunnels,
          eye:FURNACE_GLASS.riderEye, step:FURNACE_GLASS.riderSightStep}));
      riderVisible ||= visible;
    }
    stepGlassPursuit(worldJob, riderVisible, dt);
    for (const actorDef of step?.furnaceRiders ?? []) {
      if (worldJob.furnaceRidersGone?.includes(actorDef.id)) continue;
      updateJobActor(duel, worldJob, actorDef, 0);
      const rider = worldJob.actors.find(actor => actor.id === actorDef.id);
      // Wrecks remain where they fell for the rest of the job.
      if (rider.health <= 0) continue;
      if (worldJob.furnaceRidersReturning) {
        rider.returningToPost = true;
        const car = position(duel, duel.state);
        if (riderCanLeave(duel, car, rider.position, actorDef.start.position)) {
          worldJob.actors.splice(worldJob.actors.indexOf(rider), 1);
          (worldJob.furnaceRidersGone ??= []).push(actorDef.id);
          continue;
        }
      }
      pursueJobRider(duel, worldJob, actorDef, dt);
    }
  }
  updateBellowsRiders(duel, worldJob, dt);
  syncJobCarSolids(worldJob);
  // FIELD-BATTLE-ASH: an escort step may also carry the furnace that hunts the escorted truck.
  if (step?.furnaceActor) updateBattleFurnace(duel, worldJob, step, dt);
}

// The bellows riders wait at the wing gap until the chase crosses 400 m.
// They share the road riders' mover, one-meeting latch and sideways retreat.
export function updateBellowsRiders(duel, worldJob, dt) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  if (!step?.bellows || !worldJob.job.stepState.ridersStarted) return;
  for (const definition of step.bellowsRiders ?? []) {
    updateJobActor(duel, worldJob, definition, 0);
    const rider = worldJob.actors.find(actor => actor.id === definition.id);
    if (worldJob.job.stepState.thiefStopped) { rider.speed = 0; continue; }
    pursueJobRider(duel, worldJob, definition, dt, true);
  }
}

// Only the riders' measured meeting speed costs armour here. Cold and rough
// ground never do. The ordinary contact latch prevents a second charge.
export function applyBellowsRiderHit(duel, worldJob) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  if (!step?.bellows || duel.state.onFoot) return 0;
  const amount = emberLoss(EMBER_RULE, {lostKmh:worldJob.riderHitKmh ?? 0,
    difficulty:duel.state.cpuDifficulty}).hit;
  return amount > 0 ? applyArmorDamage(duel, duel.state, 'fixed',
    {owner:'bellows-furnace-riders', amount}) : 0;
}

// A stopped scout remains as a wreck beside the road for the rest of the job.
function stopScout(duel, worldJob, scout) {
  const road = ROAD_NET.road('east-road');
  const onRoad = nearestOnLine(road.points, scout.position.x, scout.position.z);
  const ahead = roadPointFrom(road, onRoad.x, onRoad.z, 1);
  const dx = ahead.x - onRoad.x, dz = ahead.z - onRoad.z;
  const length = Math.hypot(dx, dz);
  if (length > 0) {
    const moved = stepMover(scout.position, {x:onRoad.x + dz / length * 8, z:onRoad.z - dx / length * 8},
      {radius:1.3, grid:worldJob.solidGrid?.movers ?? worldJob.solidGrid, height:scout.position.y});
    scout.position = {x:moved.x, y:moved.y, z:moved.z};
  }
  scout.health = 0;
  scout.speed = 0;
  worldJob.job.stepState.scoutStopped = true;
  sayLine(duel, worldJob, worldJob.job.stepState.campAwake ? 'scout.stopped.awake' : 'scout.stopped', true);
}

// The waiting cars begin pursuit when the loaded pot comes close to their post.
// They use the land's mover, including its floor and solid checks.
function pursueJobRider(duel, worldJob, actorDef, dt, bellowsRider = false) {
  const rider = worldJob.actors.find(actor => actor.id === actorDef.id);
  if (!rider) return;
  const gasStep = worldJob.job.steps[worldJob.job.stepIndex];
  const gasRider = gasStep?.gasLoad && (actorDef.gasBlockCar || actorDef.gasBlockRider || actorDef.gasRaid);
  if (gasRider) {
    if (!worldJob.job.stepState.gasLoaded) return;
    // A parked driver waits for his hard knock. A guard wakes only once.
    if (actorDef.gasBlockCar && !worldJob.job.stepState.clearedBlocks?.includes(rider.id)) return;
    const car = position(duel, duel.state);
    if (actorDef.gasBlockRider && !rider.pursuing && !rider.ramRetreat &&
        Math.hypot(car.x - rider.position.x, car.z - rider.position.z) > GAS_LOAD_RULE.blockRiderAlertMetres) return;
    if (rider.gasDrivenOff) return;
    if (rider.ramRetreat?.seconds >= 8) { rider.gasDrivenOff = true; rider.speed = 0; return; }
  }
  const retreat = rider.ramRetreat;
  if (retreat) {
    retreat.seconds += Math.max(0, dt);
    if (retreat.seconds >= 8 && !gasRider) {
      rider.ramRetreat = null;
      rider.ramContact = false;
    }
  }
  if ((!worldJob.job.stepState.loaded && !bellowsRider && !gasRider) || duel.state.onFoot && !actorDef.gasRaid) return;
  // A wreck stays where it fell, even if it was already returning to its post.
  if (rider.health <= 0) return;
  const car = position(duel, duel.state);
  const roadRider = worldJob.definition.id === 'everburn-hot-delivery' &&
    worldJob.job.steps[worldJob.job.stepIndex]?.waitingActors?.includes(actorDef);
  const furnaceRider = worldJob.definition.id === 'everburn-hot-delivery' &&
    worldJob.job.steps[worldJob.job.stepIndex]?.furnaceRiders?.includes(actorDef);
  const saltRider = worldJob.job.steps[worldJob.job.stepIndex]?.saltRiders?.includes(actorDef);
  if (saltRider && worldJob.saltDone && !rider.returningToPost) {
    rider.pursuing = false;
    rider.speed = 0;
    return;
  }
  const emberRider = roadRider || furnaceRider || saltRider;
  const ramRider = emberRider || bellowsRider || gasRider;
  const campRider = roadRider && actorDef.scoopAmbush;
  if (campRider && !worldJob.job.stepState.campAwake && !worldJob.ridersRetreating) {
    rider.speed = 0;
    rider.pursuing = false;
    return;
  }
  // A warned camp takes a position just beyond the standing fence before charging.
  const campFence = campRider && worldJob.job.steps[worldJob.job.stepIndex].barriers[0];
  const campFenceStanding = campFence && !worldJob.job.stepState.burntBarricades?.includes(campFence.id);
  if (campFenceStanding && worldJob.job.stepState.scoopBrazier !== actorDef.scoopAmbush &&
      !rider.pursuing && !retreat && !worldJob.ridersRetreating && !rider.returningToPost) {
    const ends = barricadeEnds(campFence.position, campFence.heading);
    const side = Math.hypot(rider.position.x - ends[0].x, rider.position.z - ends[0].z) <=
      Math.hypot(rider.position.x - ends[1].x, rider.position.z - ends[1].z) ? -1 : 1;
    const target = {x:campFence.position.x + Math.cos(campFence.heading) * side * 10,
      z:campFence.position.z - Math.sin(campFence.heading) * side * 10};
    const dx = target.x - rider.position.x, dz = target.z - rider.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.1 && dt > 0) {
      const before = rider.position, travel = Math.min(distance, 18 * dt);
      rider.heading = Math.atan2(dx, dz);
      const moved = stepMover(before, {x:before.x + dx / distance * travel, z:before.z + dz / distance * travel},
        {radius:1.3, grid:worldJob.solidGrid?.movers ?? worldJob.solidGrid, height:before.y});
      rider.position = {x:moved.x, y:moved.y, z:moved.z};
      rider.speed = Math.hypot(moved.x - before.x, moved.z - before.z) / dt;
      return;
    }
    rider.speed = 0;
  }
  if (ramRider && retreat && !worldJob.ridersRetreating && !rider.returningToPost) {
    if (!rider.ramRetreat) return;
    const dx = retreat.x - rider.position.x, dz = retreat.z - rider.position.z;
    const distance = Math.hypot(dx, dz);
    rider.speed = 0;
    if (distance > 3 && !retreat.stopped && dt > 0) {
      const travel = Math.min(distance, 18 * dt), before = rider.position;
      rider.heading = Math.atan2(dx, dz);
      const moved = stepMover(before, {x:before.x + dx / distance * travel, z:before.z + dz / distance * travel},
        {radius:1.3, grid:worldJob.solidGrid?.movers ?? worldJob.solidGrid, height:before.y});
      rider.position = {x:moved.x, y:moved.y, z:moved.z};
      rider.speed = Math.hypot(moved.x - before.x, moved.z - before.z) / dt;
      retreat.stillSeconds = moved.blocked === 'solid' && rider.speed < 0.01
        ? (retreat.stillSeconds ?? 0) + dt : 0;
      if (retreat.stillSeconds >= 1) retreat.stopped = true;
    }
    return;
  }
  if (roadRider && !worldJob.ridersRetreating && !rider.returningToPost) {
    const road = ROAD_NET.road('east-road').points;
    const carOnRoad = nearestOnLine(road, car.x, car.z);
    const step = worldJob.job.steps[worldJob.job.stepIndex];
    const barrier = step.barriers[step.waitingActors.indexOf(actorDef)].position;
    const post = nearestOnLine(road, barrier.x, barrier.z);
    const ground = scablandsDriveAt(car.x, car.z);
    const floors = [];
    scablandsFloorsAt(car.x, car.z, floors);
    const nearFence = Math.hypot(car.x - barrier.x, car.z - barrier.z) <= 150;
    const inRange = carOnRoad.distance <= 120 && Math.abs(carOnRoad.along - post.along) <= 900 &&
      ground.id !== 'river-bed' && ground !== SCABLANDS_DRIVE.steps &&
      (floors.length < 2 || Math.abs(car.y - floors[0]) < 3);
    const visible = inRange && roadRiderSight(rider, dt, step.waitingActors.indexOf(actorDef), () =>
      sees(rider.position, car, {heightAt:scablandsSurfaceHeightAt,
        actorFloors:true, tunnels:duel.course.groundTunnels, eye:1.5, step:5}));
    rider.lostSightSeconds = visible ? 0 : (rider.lostSightSeconds ?? 0) + Math.max(0, dt);
    if (rider.pursuing && (!inRange || rider.lostSightSeconds >= 5)) rider.returningToPost = true;
    const nearRider = Math.hypot(car.x - rider.position.x, car.z - rider.position.z) <= 120;
    if (!rider.pursuing && (!visible || (!nearFence && (!nearRider || campFenceStanding)))) return;
  }
  if (worldJob.ridersRetreating || rider.returningToPost) {
    rider.pursuing = false;
    const home = actorDef.start.position;
    const dx = home.x - rider.position.x, dz = home.z - rider.position.z;
    const distance = Math.hypot(dx, dz);
    rider.speed = 0;
    if ((roadRider || saltRider) && distance > 1 && !rider.returnStuck) {
      rider.returnCheckDistance ??= distance;
      rider.returnCheckSeconds = (rider.returnCheckSeconds ?? 0) + Math.max(0, dt);
      if (rider.returnCheckSeconds >= 5) {
        if (rider.returnCheckDistance - distance < 10) rider.returnStuck = true;
        rider.returnCheckDistance = distance;
        rider.returnCheckSeconds = 0;
      }
    }
    if (saltRider && rider.returnStuck) {
      rider.returningToPost = false;
      return;
    }
    // Check both ends before moving a stranded rider back to its post.
    if (roadRider && rider.returnStuck) {
      if (riderCanLeave(duel, car, rider.position, home)) {
        rider.position = {...home, y:scablandsSurfaceHeightAt(home.x, home.z)};
        rider.returnStuck = false;
        rider.returningToPost = false;
        rider.returnCheckDistance = undefined;
        rider.returnCheckSeconds = 0;
        rider.lostSightSeconds = 0;
        return;
      }
    }
    if (distance > 1 && dt > 0 && !rider.returnStuck) {
      rider.heading = Math.atan2(dx, dz);
      const travel = Math.min(distance, 18 * dt), before = rider.position;
      const moved = stepMover(before, {x:before.x + dx / distance * travel, z:before.z + dz / distance * travel},
        {radius:1.3, grid:worldJob.solidGrid?.movers ?? worldJob.solidGrid, height:before.y});
      rider.position = {x:moved.x, y:moved.y, z:moved.z};
      rider.speed = Math.hypot(moved.x - before.x, moved.z - before.z) / dt;
      if (saltRider) {
        rider.returnStillSeconds = moved.blocked === 'solid' && rider.speed < 0.01
          ? (rider.returnStillSeconds ?? 0) + dt : 0;
        if (rider.returnStillSeconds >= SALT_RIDERS.returnStillSeconds) {
          rider.returnStuck = true;
          rider.returningToPost = false;
          rider.speed = 0;
        }
      }
    }
    if (distance <= 1 && !worldJob.ridersRetreating) {
      rider.returningToPost = false;
      rider.lostSightSeconds = 0;
      rider.returnCheckDistance = undefined;
      rider.returnCheckSeconds = 0;
    }
    return;
  }
  if (actorDef.gasRaid) {
    const bess = worldJob.actors.find(actor => actor.id === gasStep.actorId);
    if (!bess?.position) return;
    // Reuse this pursuit mover, aiming alongside Bess rather than at the player.
    car.x = bess.position.x + Math.cos(bess.heading ?? 0) * actorDef.stationSide * GAS_LOAD_RULE.stationSideMetres;
    car.z = bess.position.z - Math.sin(bess.heading ?? 0) * actorDef.stationSide * GAS_LOAD_RULE.stationSideMetres;
    car.y = bess.position.y;
    rider.pursuing = true;
  }
  const dx = car.x - rider.position.x, dz = car.z - rider.position.z;
  const distance = Math.hypot(dx, dz);
  const scoopAmbush = actorDef.scoopAmbush && worldJob.job.stepState.scoopBrazier === actorDef.scoopAmbush;
  if (!rider.pursuing && !roadRider && !bellowsRider && distance > 120 && !scoopAmbush) return;
  rider.pursuing = true;
  if (distance > 8) rider.ramContact = false;
  if (distance <= 3 || dt <= 0) {
    rider.speed = 0;
    if (!actorDef.gasRaid && ramRider && dt > 0 && distance > 0 && !rider.ramContact && Math.abs(car.y - rider.position.y) < 3) {
      const pose = worldPose(duel, duel.state);
      const playerSpeed = (duel.state.speedMph || 0) * DRIVE.mphToWorld;
      const closing = -playerSpeed * (Math.sin(pose.heading) * dx / distance + Math.cos(pose.heading) * dz / distance);
      if (closing > 0) {
        rider.ramContact = true;
        worldJob.riderHitKmh = Math.max(worldJob.riderHitKmh ?? 0, closing * 3.6);
        rider.ramRetreat = {x:rider.position.x - dz / distance * 40, z:rider.position.z + dx / distance * 40, seconds:0};
        shoveCar(duel, {x:dx / distance, z:dz / distance, metresPerSecond:3});
      }
    }
    return;
  }
  const panTop = saltRider ? Math.min(duel.car.topSpeed,
    arenaFloorSpeed(duel.course.def.scrapdome, duel.car.topSpeed) * SCABLANDS_DRIVE['salt-pan'].top) * MPH_TO_KMH : 0;
  const pursuitSpeed = saltRider ? saltRiderSpeed(panTop, duel.state.cpuDifficulty) :
    (roadRider || bellowsRider) && duel.state.cpuDifficulty === 'easy' ? 5 : 18;
  const pose = worldPose(duel, duel.state), playerSpeed = (duel.state.speedMph || 0) * DRIVE.mphToWorld;
  const aim = saltRider ? saltIntercept(rider.position, car,
    {x:Math.sin(pose.heading) * playerSpeed, z:Math.cos(pose.heading) * playerSpeed}, pursuitSpeed) : car;
  const aimDx = aim.x - rider.position.x, aimDz = aim.z - rider.position.z;
  const aimDistance = Math.hypot(aimDx, aimDz);
  rider.heading = Math.atan2(aimDx, aimDz);
  const travel = Math.min(Math.max(0, aimDistance - (saltRider ? 0 : 3)), pursuitSpeed * dt);
  const before = rider.position;
  const moved = stepMover(before, {x: before.x + aimDx / (aimDistance || 1) * travel, z: before.z + aimDz / (aimDistance || 1) * travel},
    {radius: 1.3, grid: worldJob.solidGrid?.movers ?? worldJob.solidGrid, height: before.y});
  rider.position = {x: moved.x, y: moved.y, z: moved.z};
  rider.speed = Math.hypot(moved.x - before.x, moved.z - before.z) / dt;
  const remaining = Math.hypot(car.x - moved.x, car.z - moved.z);
  if (!actorDef.gasRaid && !rider.ramContact && remaining <= 3.001 && rider.speed > 0 && Math.abs(car.y - moved.y) < 3) {
    rider.ramContact = true;
    // Undo only the last step's distance clipping, while retaining any solid's obstruction.
    const closingSpeed = travel > 0 ? rider.speed * pursuitSpeed * dt / travel : 0;
    const pose = worldPose(duel, duel.state);
    const playerSpeed = (duel.state.speedMph || 0) * DRIVE.mphToWorld;
    const playerAlong = playerSpeed * (Math.sin(pose.heading) * dx / distance + Math.cos(pose.heading) * dz / distance);
    const hitKmh = ramRider ? Math.max(0, closingSpeed - playerAlong) * 3.6 : rider.speed * 3.6 * 0.5;
    worldJob.riderHitKmh = Math.max(worldJob.riderHitKmh ?? 0, hitKmh);
    if (ramRider) rider.ramRetreat = {x:moved.x - dz / distance * 40, z:moved.z + dx / distance * 40, seconds:0};
    shoveCar(duel, {x: dx / distance, z: dz / distance, metresPerSecond: 3});
  }
}

function updateJobActor(duel, worldJob, actorDef, dt) {
  if (!actorDef) return;
  let actor = worldJob.actors.find(item => item.id === actorDef.id);
  if (!actor) {
    // EVERBURN-PLAY-FIXES, fourth round: an actor may name its own start on its first piece (`start`), clear of the solid that stands on
    // the road's first place. It then begins on its way to the second place (pathIndex 1), as an actor on the first place would in a tick.
    const named = actorDef.start?.position ?? actorDef.start;
    const start = named ?? actorDef.path?.[0]?.position ?? actorDef.path?.[0];
    if (!start) return;
    actor = {id: actorDef.id, position: {...start}, ...(Number.isFinite(actorDef.heading) ? {heading:actorDef.heading} : {}), health: actorDef.health ?? 100,
      pathProgress: 0, speed: 0, renderCar: actorDef.renderCar ?? null, stretchHealth: actorDef.health ?? 100,
      ...(named && (actorDef.path?.length ?? 0) > 1 ? {pathIndex: 1, pathProgress: 1 / (actorDef.path.length - 1)} : {}),
      ...(actorDef.id === FURNACE_ID ? {startedAtSec: worldJob.clockSec ?? 0} : {})};
    if (duel.course.def.scablands) {
      actor.position.y = scablandsActorHeightAt(start.x, start.z) + (start.y || 0);
      actor.hasFloorHeight = true;
    }
    if (actorDef.id === FURNACE_ID && actorDef.legs) {
      actor.furnace = createFurnace(actorDef, duel.state.cpuDifficulty);
      syncFurnaceActor(actor);
    }
    worldJob.actors.push(actor);
  }
  if (actor.furnace) {
    stepFurnaceActor(duel, worldJob, actor, actorDef, dt);
    return;
  }
  const follow = worldJob.follow;
  if (!follow || follow.actorId && follow.actorId !== actor.id || !actorDef.path?.length) return;
  const path = actorDef.path.map(item => item.position ?? item);
  const index = Math.min(actor.pathIndex ?? 0, path.length - 1);
  const target = path[index];
  const dx = target.x - actor.position.x, dz = target.z - actor.position.z;
  const gap = Math.hypot(dx, dz), travel = Math.max(0, follow.speed ?? actorDef.speed ?? 0) * dt, before = {x: actor.position.x, y: actor.position.y, z: actor.position.z};
  let arrived = gap <= travel || gap < .01;
  if (arrived) actor.position = {...target};
  else {
    actor.position.x += dx / gap * travel;
    actor.position.z += dz / gap * travel;
  }
  // The escorted truck obeys the ground and the solids a car does (src/world/scablands-movers.js): a step up ground too steep to grip is not taken, and she is
  // pushed out of a building. Every stopping place must be clear of solids.
  const chaseStep = worldJob.job.steps[worldJob.job.stepIndex];
  if (chaseStep?.bellows && actor.id === chaseStep.targetId && !duel.state.onFoot && travel > 0 &&
      (!chaseStep.bellowsRoute || index < chaseStep.bellowsRoute.road.length)) {
    actor.position = bellowsBlockingMove(before, actor.position, path[Math.max(0, index - 1)], target,
      position(duel, duel.state), chaseStep.roadWidthMetres, dt);
  }
  if (duel.course.def.scablands && actor.position && !actor.train) {
    const at = stepMover(before, actor.position, {radius: 1.3, grade: TRUCK_GRADE, grid: worldJob.solidGrid?.movers ?? worldJob.solidGrid, height: before.y});
    actor.position.x = at.x; actor.position.z = at.z; actor.position.y = at.y;
    actor.hasFloorHeight = true;
    if (at.blocked) arrived = false;
    if (chaseStep?.bellows && actor.id === chaseStep.targetId) {
      actor.bellowsSolidContact = at.blocked === 'solid';
      actor.bellowsSolidImpactKmh = at.blocked === 'solid' ? Math.max(0,
        (follow.speed ?? 0) - (dt > 0 ? Math.hypot(at.x - before.x, at.z - before.z) / dt : 0)) * 3.6 : 0;
    }
  }
  if (chaseStep?.bellows && actor.id === chaseStep.targetId && dt > 0) {
    const dx = actor.position.x - before.x, dz = actor.position.z - before.z;
    actor.speed = Math.hypot(dx, dz) / dt;
    if (actor.speed > 0) actor.heading = Math.atan2(dx, dz);
  }
  if (arrived) {
    actor.pathIndex = Math.min(index + 1, path.length - 1);
    actor.pathProgress = path.length <= 1 ? 1 : actor.pathIndex / (path.length - 1);
    // Health at the start of this stretch: what a rest and restart of the stretch gives back (RUN-GAS).
    actor.stretchHealth = actor.health;
    if (index >= path.length - 1) actor.reachedEnd = true;
  }
  // An escorted truck has arrived when she has reached the last place of her road, not when she sets out for it
  // (RUN-GAS: her pathProgress already reads 1 while she is on her way to the last place).
  if (actorDef.escort) actor.atDestination = actor.reachedEnd === true || path.length <= 1;
}

function syncFurnaceActor(actor) {
  const furnace = actor.furnace;
  actor.position.x = furnace.x;
  actor.position.z = furnace.z;
  actor.position.y = scablandsSurfaceHeightAt(furnace.x, furnace.z);
  actor.heading = furnace.heading;
  actor.pathIndex = furnace.pathIndex;
  actor.pathProgress = furnace.path.total > 0 ? Math.min(1, furnace.metres / furnace.path.total) : 0;
  actor.speed = furnace.phase === 'fallen' ? 0 : actor.speed;
  actor.health = furnaceHealth(furnace);
  actor.nextDoor = furnaceNextDoor(furnace);
}

function logFurnace(duel, worldJob, event) {
  worldJob.furnaceLog ??= [];
  worldJob.furnaceLog.push({tSec: duel.state.stageTimeSec, ...event});
  if (worldJob.furnaceLog.length > FURNACE_LOG_LIMIT) worldJob.furnaceLog.shift();
}

function furnaceCue(duel, actor, cue, seconds = 0) {
  duel.emit({arenaTell: {id: actor.id, targetId: 'player', seconds, cue,
    position: {x: actor.position.x, y: actor.position.y, z: actor.position.z}}});
}

// Armour the furnace takes off the player. After the third hit the job is won:
// the car may lose armour near the well but is never left with none.
function furnaceHurts(duel, furnace, amount) {
  if (!(amount > 0)) return 0;
  const state = duel.state;
  const allowed = furnace.won ? Math.min(amount, Math.max(0, (state.armor ?? 0) - 1)) : amount;
  return allowed > 0 ? applyArmorDamage(duel, state, 'fixed', {owner: FURNACE_ID, amount: allowed}) : 0;
}

function shoveCar(duel, shove) {
  const state = duel.state;
  if (state.combatWrecking || state.knock) return;
  const pose = worldPose(duel, state), carMps = (state.speedMph || 0) * DRIVE.mphToWorld;
  startKnock(state, {vx: Math.sin(pose.heading) * carMps + shove.x * shove.metresPerSecond,
    vz: Math.cos(pose.heading) * carMps + shove.z * shove.metresPerSecond,
    spin: 0, severity: 'knocked', heading: pose.heading, player: true, arenaShove: true});
}

// FIELD-BATTLE-ASH: what the battle's furnace says and sounds. Existing cues only: the story's stoke, door and hit cues, and the
// fire cue (the one the gate's flame uses) when cinders land on Big Bess. The riders' warning is the ambush's own (spawnAmbush).
const BATTLE_CUES = Object.freeze({stoke: 'arena.tell', doorOpen: 'gate.latch', doorSlam: 'vehicle.landing', hit: 'combat.hit-confirm',
  cindersLand: 'weapon.flame.start'});
const BATTLE_LINES = Object.freeze({sighted: 'story.ember.moss.11', comesOut: 'story.ember.clinker.1', door: 'story.ember.clinker.2', cinders: 'story.ember.moss.12',
  dead: 'story.ember.cinder.25'});

function handleBattleEvent(duel, worldJob, actor, event) {
  const furnace = actor.furnace;
  logFurnace(duel, worldJob, event);
  const cue = BATTLE_CUES[event.type];
  if (cue) furnaceCue(duel, actor, cue, event.seconds ?? 0);
  if (event.type === 'stoke' && duel.state.cpuDifficulty === 'easy') duel._storyCallout(FURNACE_ARROWS[event.door] ?? '', event.seconds, true, true);
  else if (event.type === 'comesOut') {
    // Moss sees it first, then Clinker speaks; the screen's caption queue shows both in order.
    duel._storyCallout(captionFor(worldJob, BATTLE_LINES.sighted), 2.6);
    duel._storyCallout(captionFor(worldJob, BATTLE_LINES.comesOut), 2.6);
  }
  // A door that is not the last: Clinker. The last door ends the furnace, and the line for that is the one for its death.
  else if (event.type === 'hit' && event.hit < furnace.battle.doorsToStop) duel._storyCallout(captionFor(worldJob, BATTLE_LINES.door), 2.6);
  else if (event.type === 'dead') { worldJob.furnaceDied = true; duel._storyCallout(captionFor(worldJob, BATTLE_LINES.dead), 3); }
  else if (event.type === 'cindersLand' && !worldJob.cindersSaid) { worldJob.cindersSaid = true; duel._storyCallout(captionFor(worldJob, BATTLE_LINES.cinders), 2.6); }
}

function handleFurnaceEvent(duel, worldJob, actor, event) {
  const furnace = actor.furnace;
  if (furnace.battle) { handleBattleEvent(duel, worldJob, actor, event); return furnace; }
  logFurnace(duel, worldJob, event);
  const cue = FURNACE_CUES[event.type];
  if (cue) furnaceCue(duel, actor, cue, event.seconds ?? 0);
  if (event.type === 'stoke' && duel.state.cpuDifficulty === 'easy')
    duel._storyCallout(FURNACE_ARROWS[event.door] ?? '', event.seconds, true, true);
  // A door hit's line, the furnace bolting and turning round are instructions: the screen puts them first (urgent).
  else if (event.type === 'hit') duel._storyCallout(captionFor(worldJob, FURNACE_HIT_LINES[event.hit]), 2.6, true);
  else if (event.type === 'shoveWarning') duel._storyCallout('HIS CHIMNEY IS LEANING. DROP BACK OR CROSS OVER!', event.seconds + .4, true, true);
  else if (event.type === 'shove') {
    duel._storyCallout('SHOVED!', 1.2);
    duel.emit({combatHit: true, strength: .4, enemy: true, victim: 'player',
      hitPosition: {x: actor.position.x, y: actor.position.y, z: actor.position.z}});
  }
  else if (event.type === 'bolt') duel._storyCallout(event.toLeg === 'run-back' ? 'HE IS RUNNING BACK TO THE WELL. AFTER HIM!' : 'HE IS RUNNING FOR THE BONEYARD. AFTER HIM!', 3, true);
  else if (event.type === 'turnAround') duel._storyCallout('HE IS TURNING AROUND. KEEP WITH HIM!', 2.4, true);
  else if (event.type === 'gateBurnt') {
    // The scene keeps the fire on the gate until the job ends, even if a wreck starts the chase again.
    worldJob.gateBurnt = true;
    duel._storyCallout(captionFor(worldJob, 'story.ember.auntie-solder.7'), 3);
  }
  else if (event.type === 'townReached' && !event.burnt) duel._storyCallout(captionFor(worldJob, 'story.ember.auntie-solder.8'), 3);
  return furnace;
}

// The chase starts again from its own beginning (never the three waves).
function restartFurnace(duel, worldJob, actor, actorDef, reason) {
  actor.furnace = createFurnace(actorDef, duel.state.cpuDifficulty);
  actor.startedAtSec = worldJob.clockSec ?? 0;
  syncFurnaceActor(actor);
  logFurnace(duel, worldJob, {type: 'restart', reason});
  duel._storyCallout(reason === 'escaped' ? 'HE GOT AWAY. HE IS BACK AT THE WELL.' :
    'WRECKED. THE CHASE STARTS OVER.', 3);
}

// `escort` is given only for the battle's furnace: {metres, x, z, arrived, actor}, where the escorted truck is on her road.
function stepFurnaceActor(duel, worldJob, actor, actorDef, dt, escort = null) {
  const state = duel.state, wrecked = state.combatWrecking === true;
  let furnace = actor.furnace;
  // Old Smoke's chase starts over when the player is wrecked; the battle's furnace goes on without the player.
  if (!furnace.battle) {
    if (!furnace.won && wrecked) { furnace.holding = true; return; }
    if (furnace.holding) {
      restartFurnace(duel, worldJob, actor, actorDef, 'wrecked');
      return;
    }
  }
  const carAt = position(duel, state);
  const car = state.onFoot || wrecked ? null : {x: carAt.x, y: carAt.y, z: carAt.z};
  const out = stepFurnace(furnace, dt, {car, escort});
  syncFurnaceActor(actor);
  // Cinders on the escorted truck (the battle's furnace only): health off Big Bess, never below nothing.
  if (out.escortBurn > 0 && escort?.actor?.health > 0) escort.actor.health = Math.max(0, escort.actor.health - out.escortBurn);
  for (const event of out.events) handleFurnaceEvent(duel, worldJob, actor, event);
  if (furnace.escaped) { restartFurnace(duel, worldJob, actor, actorDef, 'escaped'); return; }
  if (out.armor > 0) furnaceHurts(duel, furnace, out.armor);
  if (out.shove) {
    furnaceHurts(duel, furnace, out.shove.armor);
    shoveCar(duel, out.shove);
  }
  if (out.speedCapMph !== null && state.speedMph > out.speedCapMph)
    state.speedMph = Math.max(out.speedCapMph, state.speedMph - OLD_SMOKE.cinder.easySlowMphPerSec * dt);
}

// FIELD-BATTLE-ASH: the patched furnace comes out behind the escorted truck when she passes the place its definition names,
// and from then on follows the rules of old-smoke.js as the battle's furnace (`battle` on its definition).
function updateBattleFurnace(duel, worldJob, step, dt) {
  const def = step.furnaceActor, bess = worldJob.actors.find(item => item.id === step.actorId);
  if (!def || !bess?.position) return;
  const metres = pathShare(bess.position, bess.pathIndex, step.path).metres;
  let actor = worldJob.actors.find(item => item.id === def.id);
  if (!actor) {
    if (metres < def.battle.comesOutAtMetres - .5) return;
    actor = {id: def.id, position: {x: 0, y: 0, z: 0}, health: def.health ?? 3, pathProgress: 0, speed: 0, renderCar: null,
      startedAtSec: worldJob.clockSec ?? 0, furnace: createFurnace(def, duel.state.cpuDifficulty)};
    syncFurnaceActor(actor);
    worldJob.actors.push(actor);
  }
  stepFurnaceActor(duel, worldJob, actor, def, dt, {metres, x: bess.position.x, z: bess.position.z, arrived: bess.atDestination === true, actor: bess});
}

// EVERBURN-PLAY-FIXES: a defence step may name several places the raiders come from (`raiderEntries`). A wave comes from the one farthest
// from the player's car (and from the player on foot), so that no raider appears near the player: with the places a compass apart at
// 64 m from the well, that is never less than 64 m.
function farthestEntry(duel, entries) {
  const state = duel.state, car = position(duel, state), foot = state.onFoot && state.fighter ? state.fighter : null;
  const gap = at => Math.min(Math.hypot(at.x - car.x, at.z - car.z), foot ? Math.hypot(at.x - foot.x, at.z - foot.z) : Infinity);
  return entries.reduce((best, entry) => gap(entry.position ?? entry) > gap(best.position ?? best) ? entry : best);
}

function spawnWave(duel, worldJob, request, key) {
  if (worldJob.spawnedWaveKeys.includes(key)) return;
  const zones = createRaidZones(duel.course, worldJob.raidSeed + worldJob.spawnedWaves++);
  const zone = zones[0];
  const at = request.at?.position ?? request.at;
  if (at && Number.isFinite(at.x) && Number.isFinite(at.z)) {
    const center = request.from?.position ?? request.from ?? at;
    const dx = at.x - center.x, dz = at.z - center.z, distance = Math.hypot(dx, dz) || 1;
    const sideX = dz / distance, sideZ = -dx / distance;
    const hold = request.hold?.position ?? request.hold;
    const stop = Math.max(0, request.stopDistance || 0);
    const approachTarget = hold && Number.isFinite(hold.x) && Number.isFinite(hold.z)
      ? {...hold} : {x: at.x - dx / distance * stop,
        y: at.y, z: at.z - dz / distance * stop};
    zone.raiders.forEach((raider, index) => {
      const offset = (index - (request.n - 1) / 2) * .5;
      const x = center.x + sideX * offset, z = center.z + sideZ * offset;
      const ground = duel.course.nearest(x, z, zone.s);
      Object.assign(raider, {s: ground.s, lateral: ground.lateral, x, y: ground.y,
        z, approachTarget, approachSpeed: request.approachSpeed || 0});
    });
  }
  const count = Math.max(1, Math.min(zone.raiders.length, Math.floor(request.n) || 1));
  zone.raiders = zone.raiders.slice(0, count);
  // Job raiders move by their world y. The ordinary raid factory also makes a
  // fighter groundY, which is not used by the job mover and would go stale.
  for (const raider of zone.raiders) delete raider.groundY;
  duel.state.raids ??= {zones: [], shots: 0};
  duel.state.raids.zones.push(zone);
  worldJob.actors.push(...zone.raiders);
  worldJob.waveZones ??= {};
  worldJob.waveZones[key] = zone;
  worldJob.spawnedWaveKeys.push(key);
}

// Every raider of the waves a defence step spawned is taken away (their keys are '<step number>:<wave>').
function removeWaveRaiders(duel, worldJob, stepIndex) {
  for (const key of Object.keys(worldJob.waveZones ?? {}).filter(item => item.startsWith(`${stepIndex}:`))) {
    const zone = worldJob.waveZones[key];
    if (duel.state.raids) duel.state.raids.zones = duel.state.raids.zones.filter(candidate => candidate !== zone);
    worldJob.actors = worldJob.actors.filter(actor => !zone.raiders.includes(actor));
    delete worldJob.waveZones[key];
    worldJob.spawnedWaveKeys = worldJob.spawnedWaveKeys.filter(existing => existing !== key);
  }
}

// An ambush on an escort's road (src/world/jobs/steps/escort.js): the same foot raiders as the well's attackers, standing
// at the roadside on both sides of the place, within 12 m of it, and facing it. They are knocked down, recover and shoot
// exactly like the others; the camp's own place is the zone's, so they shoot at a car passing near them.
function spawnAmbush(duel, worldJob, request) {
  const key = request.key;
  if (!key || worldJob.spawnedWaveKeys.includes(key)) return;
  const zone = createRaidZones(duel.course, worldJob.raidSeed + worldJob.spawnedWaves++)[0];
  const place = request.at?.position ?? request.at, way = request.direction ?? {x: 0, z: 1};
  const sideX = way.z, sideZ = -way.x, count = Math.max(1, Math.floor(request.n) || 1);
  while (zone.raiders.length < count) zone.raiders.push({...zone.raiders.at(-1)});
  zone.raiders = zone.raiders.slice(0, count);
  zone.raiders.forEach((raider, index) => {
    const side = index % 2 === 0 ? 1 : -1, across = side * (6 + 2.5 * Math.floor(index / 2)), along = (index - (count - 1) / 2) * 2;
    const x = place.x + sideX * across + way.x * along, z = place.z + sideZ * across + way.z * along;
    const ground = duel.course.nearest(x, z, zone.s);
    Object.assign(raider, {id: `${key}:${index}`, s: ground.s, lateral: ground.lateral, x, y: ground.y, z,
      yaw: Math.atan2(place.x - x, place.z - z), knockedDown: false, knockdownRemaining: 0, ambushKey: key});
    delete raider.groundY;
  });
  zone.s = duel.course.nearest(place.x, place.z, zone.s).s;
  zone.id = key; zone.warnedLap = duel.state.currentLap; zone.nextShotAt = duel.state.stageTimeSec + 1.5;
  duel.state.raids ??= {zones: [], shots: 0};
  duel.state.raids.zones.push(zone);
  worldJob.actors.push(...zone.raiders);
  worldJob.waveZones ??= {};
  worldJob.waveZones[key] = zone;
  worldJob.spawnedWaveKeys.push(key);
  // The roadside camps' own warning (the existing cue), once for each ambush that appears.
  duel.emit({raiderWarning: true, zone: key});
}

// The raiders of an ambush give up (the escort has passed) or are put back in place (the stretch starts again).
function clearAmbush(duel, worldJob, key) {
  const zone = worldJob.waveZones?.[key];
  if (!zone) return;
  duel.state.raids.zones = duel.state.raids.zones.filter(candidate => candidate !== zone);
  worldJob.actors = worldJob.actors.filter(actor => !zone.raiders.includes(actor));
  delete worldJob.waveZones[key];
  worldJob.spawnedWaveKeys = worldJob.spawnedWaveKeys.filter(existing => existing !== key);
}

// RUN-GAS: every raider of an ambush still standing within 30 m of the escorted truck wears her health down each second.
function wearEscort(worldJob, step, difficulty, dt) {
  if (step.gasLoad) return;
  const truck = worldJob.actors.find(actor => actor.id === step.actorId);
  if (!truck?.position || !(truck.health > 0)) return;
  const rate = AMBUSH_WEAR_PER_SECOND[difficulty] ?? AMBUSH_WEAR_PER_SECOND.medium;
  let standing = 0;
  for (const raider of worldJob.actors) {
    if (!raider.ambushKey || raider.knockedDown || !Number.isFinite(raider.x) || !Number.isFinite(raider.z)) continue;
    if (Math.hypot(raider.x - truck.position.x, raider.z - truck.position.z) <= AMBUSH_WEAR_METRES) standing++;
  }
  if (standing) truck.health = Math.max(0, truck.health - standing * rate * dt);
}

// RUN-GAS: the player's car knocks down an ambush raider it touches (its centre within 2.2 m) while it moves at 4 m/s or more.
// A raider knocked down in an ambush, by the car or by any weapon, stays down for the rest of that ambush (src/raiders.js).
function runDownRaiders(duel, worldJob, car) {
  const state = duel.state;
  if (state.onFoot || state.combatWrecking || Math.abs(state.speedMph || 0) * DRIVE.mphToWorld < AMBUSH_RUN_DOWN_MPS) return;
  for (const raider of worldJob.actors) {
    if (!raider.ambushKey || raider.knockedDown || !(raider.health > 0) || !Number.isFinite(raider.x) || !Number.isFinite(raider.z)) continue;
    if (Math.hypot(raider.x - car.x, raider.z - car.z) <= AMBUSH_RUN_DOWN_METRES)
      damageRaider(duel, raider, raider.health, {source: 'car', owner: 'player'});
  }
}

// FIELD-BATTLE-ASH: the battle is over. It pays its four shares only when it was won; Big Bess arriving with the furnace still
// rolling pays the shares the definition names for that (the Boneyard road's own). The settlement reads `shares` from the definition.
function settleBattle(worldJob) {
  worldJob.battleEnding ??= worldJob.actors.some(actor => actor.furnace?.dead === true) ? 'won' : 'arrived';
  if (worldJob.battleEnding !== 'won') worldJob.definition = {...worldJob.definition, shares: worldJob.definition.arrivedShares};
}

// Light the Town reuses a factory raider and the ordinary job foot mover.
// These actors stay out of the roadside rocket zones: their rule throws ash.
export function applyBrandRequest(duel, worldJob, request) {
  if (request.type === 'spawnBrandAsh') {
    if (worldJob.actors.some(actor => actor.id === request.id)) return true;
    const at = request.from.position ?? request.from;
    const actor = createRaidZones(duel.course, worldJob.raidSeed + worldJob.spawnedWaves++)[0].raiders[0];
    const ground = duel.course.nearest(at.x, at.z);
    Object.assign(actor, {id: request.id, brandAsh: true, x: at.x, z: at.z,
      y: scablandsActorHeightAt(at.x, at.z, at.y), s: ground.s, lateral: ground.lateral,
      approachSpeed: BRAND_RULE.ashWalkMps});
    delete actor.groundY;
    worldJob.actors.push(actor);
    return true;
  }
  if (request.type === 'moveBrandAsh') {
    const actor = worldJob.actors.find(item => item.brandAsh && item.id === request.id);
    if (actor) {
      const goal=request.place.position??request.place;
      const step=worldJob.job.steps[worldJob.job.stepIndex];
      actor.approachTarget={...brandAshAim(actor,goal,step.ashEntries??[],
        worldJob.solidGrid?.movers??worldJob.solidGrid)};
    }
    return true;
  }
  if (request.type === 'removeBrandAsh') {
    worldJob.actors = worldJob.actors.filter(actor => !actor.brandAsh || actor.id !== request.id);
    return true;
  }
  if (request.type === 'brandRecovery') {
    const fighter = duel.state.onFoot && duel.state.fighter;
    if (!fighter) return true;
    const at = request.place.position ?? request.place;
    const step = worldJob.job.steps[worldJob.job.stepIndex];
    const {x, z, yaw} = brandRecoveryPose(step, request.place, worldJob.solidGrid);
    const ground = duel.course.nearest(x, z, fighter.s);
    const y = scablandsActorHeightAt(x, z, at.y);
    Object.assign(fighter, {x, y, z, yaw, s: ground.s, lateral: ground.lateral,
      groundY: y, airHeight: 0, verticalSpeed: 0, speed: 0,
      knockedDown: false, knockdownRemaining: 0, health: fighter.maxHealth,
      locomotion: 'idle', jumpHeld: false});
    delete fighter.boardingAnchor;
    fighter.respawns++;
    return true;
  }
  return false;
}

export function brandCombatView(state, worldJob) {
  const fighter = state.onFoot && state.fighter;
  const attacking = !!fighter && !fighter.knockedDown && state.fighterInput?.fire === true;
  const swing = attacking && brandSwingReady(state);
  const brandSwing = swing && !worldJob.brandSwingHeld;
  worldJob.brandSwingHeld = attacking;
  const handFlamerHits = [];
  if (attacking && !swing && fighter.flaming && state.footWeapons?.selected === 'hand-flamer') {
    // The aim is judged on the flat: a man is within reach by his distance over the ground and within the cone by the
    // way the walker faces. The view is tilted down about 22 degrees when nothing moves it, and a cone 17.5 degrees
    // either side measured in three dimensions against a flat distance could then never hold anyone (Claude's hand play,
    // 17 November 2026). The difference in height is checked on its own below, and so is the barrel's tilt: the flame burns
    // a man only when the barrel is aimed within 30 degrees of his chest (Kyle's try, 18 November 2026).
    const yaw = fighter.yaw || 0, direction = {x: Math.sin(yaw), z: Math.cos(yaw)}, gear = signatureFor('cinder');
    for (const actor of worldJob.actors) {
      if (!actor.brandAsh) continue;
      const dx = actor.x - fighter.x, dz = actor.z - fighter.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0 && distance <= BRAND_RULE.handFlamerRadius &&
          Math.abs(actor.y - fighter.y) < 2 &&
          (dx * direction.x + dz * direction.z) / distance >= Math.cos(gear.cone / 2) &&
          handFlameAimsAt(fighter, actor))
        handFlamerHits.push(actor.id);
    }
  }
  return {brandSwing, handFlamerHits};
}

// Only collection releases the waiting furnace. Repeated requests cannot
// restart its departure or sound its horn again.
export function applyBellowsFurnaceLeave(duel, worldJob, request) {
  if (request.type !== 'bellowsFurnaceLeave') return false;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  if (!step?.bellows || Number.isFinite(worldJob.bellowsLeavingAtSec)) return true;
  worldJob.bellowsLeavingAtSec = worldJob.clockSec ?? 0;
  const at = FURNACE_LEAVING.from;
  duel.emit({arenaTell: {id:'bellows-furnace-leave', targetId:'player', seconds:0,
    cue:'world.furnace.horn', position:{...at, y:scablandsSurfaceHeightAt(at.x, at.z)}}});
  return true;
}

// The stopped driver becomes an ordinary foot actor, outside the raid zones.
// He runs away from the player and cannot shoot or return to his parked car.
export function applyBellowsThiefFlee(duel, worldJob, request) {
  if (request.type !== 'bellowsThiefFlee') return false;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  if (!step?.bellows || worldJob.actors.some(actor => actor.bellowsThief)) return true;
  const car = worldJob.actors.find(actor => actor.id === step.targetId);
  if (!car?.position) return true;
  const player = position(duel, duel.state);
  const dx = car.position.x - player.x, dz = car.position.z - player.z;
  const gap = Math.hypot(dx, dz);
  const forward = gap > 0 ? {x:dx / gap, z:dz / gap}
    : {x:Math.sin(car.heading ?? 0), z:Math.cos(car.heading ?? 0)};
  const x = car.position.x + forward.x * BELLOWS_RULE.thiefExitMetres;
  const z = car.position.z + forward.z * BELLOWS_RULE.thiefExitMetres;
  const pose = duel.course.nearest(x, z);
  const actor = createRaidZones(duel.course, worldJob.raidSeed)[0].raiders[0];
  Object.assign(actor, {id:`${step.targetId}-on-foot`, bellowsThief:true,
    x, z, s:pose.s, lateral:pose.lateral, y:scablandsActorHeightAt(x, z, car.position.y),
    yaw:Math.atan2(forward.x, forward.z),
    approachSpeed:BELLOWS_RULE.thiefRunMps,
    approachTarget:{x:x + forward.x * BELLOWS_RULE.thiefRunMetres,
      z:z + forward.z * BELLOWS_RULE.thiefRunMetres}});
  delete actor.groundY;
  worldJob.actors.push(actor);
  worldJob.solidGrid?.setPeople([{id:actor.id, position:actor, floorHeight:actor.y}]);
  return true;
}

// A missed chase moves the existing cars, without recreating the job, load,
// armour or rewards. Foot players keep their fighter at the restarted car.
export function applyBellowsRestart(duel, worldJob, request) {
  if (request.type !== 'bellowsRestart') return false;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  if (!step?.bellows || !step.bellowsRoute) return true;
  const thief = worldJob.actors.find(actor => actor.id === step.targetId);
  if (!thief) return true;
  const places = bellowsRestartPlaces(step.bellowsRoute), state = duel.state;
  const pose = duel.course.nearest(places.player.x, places.player.z);
  state.s = state.prevS = pose.s; state.lateral = state.prevLateral = pose.lateral;
  state.speedMph = 0; state.yawVelocity = 0; state.pushVelocity = 0;
  state.headingError = wrapHeading(places.player.heading - duel.course.at(pose.s).heading);
  state.scablandsHitKmh = 0; state.scablandsLongFall = false;
  if (state.onFoot && state.fighter) {
    const at = duel.course.groundAt(pose.s, pose.lateral);
    Object.assign(state.fighter, {x:at.x, y:at.y, z:at.z, groundY:at.y,
      s:pose.s, lateral:pose.lateral, yaw:places.player.heading,
      speed:0, airHeight:0, verticalSpeed:0});
  }
  Object.assign(thief, {position:{x:places.thief.x,
    y:scablandsSurfaceHeightAt(places.thief.x, places.thief.z), z:places.thief.z},
    heading:places.thief.heading, pathIndex:places.thief.pathIndex,
    pathProgress:places.thief.pathIndex / (step.path.length - 1), speed:0,
    reachedEnd:false, bellowsSolidContact:false, bellowsSolidImpactKmh:0});
  worldJob.carContacts = [];
  worldJob.lastKmh = 0;
  worldJob.riderHitKmh = 0;
  worldJob.riderContactShedKmh = 0;
  syncJobCarSolids(worldJob);
  return true;
}

function applyRequests(duel, worldJob, requests) {
  for (const request of requests) {
    // OPEN-DOORS: the scrap effect has already returned a paid receipt to the part.
    if (worldJob.serviceSheds && request.type === 'repair') {
      duel.state.armor = Math.min(duel.state.maxArmor, duel.state.armor + request.armour);
      worldJob.fieldPatched = false;
      continue;
    }
    if (worldJob.serviceSheds && request.type === 'wash') {
      const washed = applyEffects(worldJob.open.world, {id: 'car/wash', effects: [{type: 'dirt', to: 0}]});
      worldJob.open = {...worldJob.open, world: washed.world};
      continue;
    }
    if (worldJob.serviceSheds && request.type === 'shedCue') { night2Cue(duel, request.cue); continue; }
    if (applyBellowsRestart(duel, worldJob, request)) continue;
    if (applyBellowsFurnaceLeave(duel, worldJob, request)) continue;
    if (applyBellowsThiefFlee(duel, worldJob, request)) continue;
    if (applyBrandRequest(duel, worldJob, request)) continue;
    if (request.type === 'solids' && worldJob.open && typeof request.id === 'string' && Array.isArray(request.solids)) {
      if (worldJob.solidGrid || request.solids.length)
        (worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid)).setOpenSolids(request.id, request.solids);
    }
    else if (request.type === 'marker') {
      const step = worldJob.job.steps[worldJob.job.stepIndex], fighter = duel.state.fighter;
      if (worldJob.night2 && step?.kind === 'rider-fight') continue;
      const chapter = duel.state.onFoot && worldJob.night2;
      if (chapter && step?.brand && request.place) night2BrandRoute(chapter, fighter, request.place);
      const walking = chapter && (step?.kind === 'reach' || step?.brand || step?.action === 'board');
      const waypoint = walking && worldJob.night2.routes[0]?.point;
      const place = waypoint ? {...waypoint, y: scablandsSurfaceHeightAt(waypoint.x, waypoint.z), radius: 1.1}
        : walking ? null : request.place;
      worldJob.marker = place ?? null;
      const at = place?.position ?? place;
      const radius = place?.radius ?? 4;
      // Both Hot Delivery stops use the same floor ring. Raise it above the road
      // across its whole edge, including the slight slope at Cinder's post.
      const deliveryStop = worldJob.definition.id === 'everburn-hot-delivery' &&
        (request.place?.id === 'cinder' || request.place?.id === 'cold-forge');
      if (deliveryStop && at && worldJob.ringHeight?.place !== request.place) {
        worldJob.ringHeight = {place:request.place, height:Math.max(scablandsSurfaceHeightAt(at.x, at.z),
          ...Array.from({length:48}, (_, i) => {
            const angle = i * Math.PI * 2 / 48;
            return scablandsSurfaceHeightAt(at.x + Math.cos(angle) * radius, at.z + Math.sin(angle) * radius);
          }))};
      }
      const height = deliveryStop && at ? worldJob.ringHeight.height : at?.y ?? 0;
      duel.state.arena.markers = at && Number.isFinite(at.x) && Number.isFinite(at.z)
        ? [{kind: 'ring', id: 'world-job-marker', x: at.x, y: height,
          z: at.z, radius}] : [];
    }
    else if (request.type === 'follow') worldJob.follow = {...request,
      actorId: request.actorId ?? worldJob.job.steps[worldJob.job.stepIndex]?.targetId};
    else if(request.type==='train') {
      let actor=worldJob.actors.find(item=>item.id===request.actorId);
      if(!actor) {actor={id:request.actorId,health:9999,renderCar:'falcone_heritage'};worldJob.actors.push(actor);}
      actor.renderCar??='falcone_heritage';
      Object.assign(actor,{position:{...request.position},pathProgress:request.progress??actor.pathProgress??0,
        speed:request.speed??0,train:true});
      const path=request.path??worldJob.job.steps[worldJob.job.stepIndex]?.path;
      const metres=request.metres??0;
      actor.roofPlates=(request.roofPlates??['tank-wagon-2','tank-wagon-1']).map(id=>{
        const behind=id==='tank-wagon-2'?42:22;
        const sample=sampleIronLine(path,Math.max(0,metres-behind));
        return {id,position:sample?{...sample,y:sample.y+(request.roofHeight??3.5)}:actor.position,radius:4};
      });
      const cab=sampleIronLine(path,Math.max(0,metres-8))??actor.position;
      actor.coupling={x:cab.x-Math.sin(cab.heading??0)*4,y:cab.y+1,z:cab.z-Math.cos(cab.heading??0)*4};
      actor.trainLength=request.pathLength??0;
    }
    else if (request.type === 'spawnWave' && request.ambush) spawnAmbush(duel, worldJob, request);
    else if (request.type === 'clearWave') clearAmbush(duel, worldJob, request.key);
    else if (request.type === 'spawnWave') {
      const key = `${worldJob.job.stepIndex}:${worldJob.job.stepState.wave ?? 0}`;
      const entries = worldJob.job.steps[worldJob.job.stepIndex]?.raiderEntries;
      spawnWave(duel, worldJob, entries?.length ? {...request, from: farthestEntry(duel, entries)} : request, key);
    }
    else if (request.type === 'say' && request.lineId) sayLine(duel, worldJob, request.lineId, request.urgent);
    else if (request.type === 'lendWeapon' && typeof request.weapon === 'string') {
      duel.state.weaponLoadout = [...new Set([...(duel.state.weaponLoadout || []), request.weapon])];
    }
    else if (request.type === 'refill') {
      const {combat, footWeapons, footGear} = duel.state;
      if (request.carWeapon && combat?.cooldowns?.[request.carWeapon] !== undefined)
        combat.cooldowns[request.carWeapon] = 0;
      if (request.footAmmo === 'rpg' && footWeapons) {
        footWeapons.ammo = COMBAT_TUNING.foot.rpgAmmo;
        if (footGear?.name === 'LONGHORN RPG') footGear.ammo = footWeapons.ammo;
      }
      const at = request.place?.position ?? request.place;
      if (request.crateId && at) worldJob.refillCrate = {id: request.crateId, position: {...at}};
    }
  }
}

export function moveJobRaiders(duel, worldJob, dt) {
  const scablands = !!duel.course.def.scablands;
  for (const actor of worldJob.actors) {
    if (!actor.approachTarget || actor.knockedDown || !(actor.approachSpeed > 0)) continue;
    const dx = actor.approachTarget.x - actor.x, dz = actor.approachTarget.z - actor.z;
    const gap = Math.hypot(dx, dz), travel = actor.approachSpeed * dt, from = {x: actor.x, y: actor.y, z: actor.z};
    if (gap <= travel) {
      actor.x = actor.approachTarget.x; actor.z = actor.approachTarget.z;
    } else {
      actor.x += dx / gap * travel; actor.z += dz / gap * travel;
    }
    actor.yaw = Math.atan2(dx, dz);
    // A raider on foot obeys the ground and the solids a person does: ground steeper than 40 degrees is not climbed and a building is walked round.
    if (scablands) {
      const at = stepMover(from, actor, {radius: .4, grade: FOOT_GRADE, grid: worldJob.solidGrid?.movers ?? worldJob.solidGrid,
        height: actor.y, moverId: actor.id});
      actor.x = at.x; actor.z = at.z; actor.y = at.y;
      if (actor.bellowsThief && (from.x !== at.x || from.z !== at.z))
        worldJob.solidGrid?.setPeople([{id:actor.id, position:actor, floorHeight:actor.y}]);
    }
    if (actor.riderCrew && (actor.x !== from.x || actor.z !== from.z)) actor.steps++;
    if (actor.brandAsh) {
      // The foot mover resolves land and buildings, but not other people.
      // Reserve the whole step so a long step cannot pass through a neighbour.
      const neighbours = to => worldJob.actors.filter(other => {
        if (other === actor || !other.brandAsh) return false;
        const mx = to.x - from.x, mz = to.z - from.z;
        const lengthSquared = mx * mx + mz * mz;
        const share = lengthSquared > 0 ? Math.max(0, Math.min(1,
          ((other.x - from.x) * mx + (other.z - from.z) * mz) / lengthSquared)) : 0;
        return Math.hypot(from.x + mx * share - other.x,
          from.z + mz * share - other.z) < BRAND_RULE.ashSeparationMetres;
      });
      const crowded = neighbours(actor);
      if (crowded.length) {
        Object.assign(actor, from);
        const men = worldJob.job?.stepState?.brandAsh?.men ?? {};
        const yieldsTo = other => !!men[actor.id]?.fleeing !== !!men[other.id]?.fleeing
          ? !!men[other.id]?.fleeing : actor.id > other.id;
        if (crowded.some(yieldsTo)) {
          const angle = BRAND_RULE.ashYieldDegrees * Math.PI / 180;
          const mx = dx / (gap || 1) * Math.min(travel, gap);
          const mz = dz / (gap || 1) * Math.min(travel, gap);
          const candidates = [angle, -angle].map(turn => ({
            x: from.x + mx * Math.cos(turn) + mz * Math.sin(turn),
            z: from.z + mz * Math.cos(turn) - mx * Math.sin(turn),
          }));
          candidates.push({x:from.x - mx * BRAND_RULE.ashBackStepShare,
            z:from.z - mz * BRAND_RULE.ashBackStepShare});
          for (const candidate of candidates) {
            const at = scablands ? stepMover(from, candidate, {radius:BRAND_RULE.ashRadiusMetres,
              grade:FOOT_GRADE, grid:worldJob.solidGrid?.movers ?? worldJob.solidGrid,
              height:from.y}) : {...candidate,y:from.y};
            if (at.blocked || neighbours(at).length) continue;
            Object.assign(actor, {x:at.x,y:at.y,z:at.z});
            break;
          }
        }
      }
      // A brand opponent receives a fresh movement decision each rule step.
      actor.approachTarget = null;
    }
  }
}

// STORY-NIGHT-2-FLOW item 4: when the scout is within the hand flamer's reach, the HUD says so, by brandCombatView's own rule:
// 'turn' when he is near enough but outside the flame's cone, 'aim' when the barrel is not on his chest, 'burn' when holding
// fire would burn him.
function scoutReach(state, scout, chapter) {
  const fighter = state.onFoot && state.fighter;
  if (!fighter || chapter.scoutTurned || chapter.scoutDowned || scout.knockedDown ||
      state.footWeapons?.selected !== 'hand-flamer') return null;
  const dx = scout.x - fighter.x, dz = scout.z - fighter.z, distance = Math.hypot(dx, dz);
  if (!(distance > 0) || distance > BRAND_RULE.handFlamerRadius || Math.abs(scout.y - fighter.y) >= 2) return null;
  const yaw = fighter.yaw || 0, facing = (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / distance;
  if (facing < Math.cos(signatureFor('cinder').cone / 2)) return 'turn';
  return handFlameAimsAt(fighter, scout) ? 'burn' : 'aim';
}

function night2Cue(duel, cue) {
  duel.emit({arenaTell: {id: cue, targetId: 'player', seconds: 0, cue}});
}

function enterNight2(duel, worldJob) {
  const {scout, riders = []} = enterNight2Step(worldJob);
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  if (step?.id === 'wash-walk-to-cut' && !duel.state.onFoot) {
    placeWorldFighter(duel);
    duel.emit({fighterExited: true});
  }
  if (scout) {
    applyBrandRequest(duel, worldJob, {type: 'spawnBrandAsh', ...NIGHT_2_SCOUT});
    const actor = worldJob.actors.find(item => item.id === NIGHT_2_SCOUT.id);
    actor.approachSpeed = 2.4;
  }
  for (const actor of riders) updateJobActor(duel, worldJob, actor, 0);
  if (!riders.length) worldJob.actors = worldJob.actors.filter(actor => !actor.id.startsWith('wash-rider-'));
  syncJobCarSolids(worldJob);
  if (!scout && !worldJob.night2?.scoutDowned) worldJob.actors = worldJob.actors.filter(actor => actor.id !== NIGHT_2_SCOUT.id);
  if (step?.kind === 'talk' || step?.kind === 'rider-fight') {
    worldJob.marker = null;
    duel.state.arena.markers = [];
  }
}

function routeWorldNight2(duel, worldJob, previous, next) {
  if (worldJob.night2 && next.stepIndex !== previous)
    routeNight2(worldJob, previous, next, cue => night2Cue(duel, cue), duel.state.combatWrecking);
}

function finishWorldJob(duel, worldJob) {
  const state = duel.state;
  worldJob.settled = true;
  if (worldJob.definition.battle === true) settleBattle(worldJob);
  state.weaponLoadout = [...(worldJob.originalWeaponLoadout || [])];
  if (worldJob.originalCrewId) state.crewId = worldJob.originalCrewId;
  if (worldJob.originalFootWeaponSelected && state.footWeapons)
    state.footWeapons.selected = worldJob.originalFootWeaponSelected;
  initializeCrewGear(duel);
  return {reason: 'job-complete', winnerId: 'player'};
}

// OPEN-ROAM: keep the cast array stable while figures move. The renderer
// uses its identity to decide when a different group needs to be loaded.
function syncOpenPeople(worldJob) {
  const cast = worldJob.open.parts.people?.cast ?? [], fixed = worldJob.fixedOpenPeople ?? [];
  let people = worldJob.storyPeople;
  // OPEN-DOORS: people at fixed posts (the shed staff) stand after the routine cast and are not moved here.
  const changed = !people || cast.length + fixed.length !== people.length || cast.some((person, i) => person.id !== people[i].id);
  if (changed) worldJob.storyPeople = people = createStoryPeople([...cast, ...fixed]);
  let moved = changed;
  cast.forEach((person, i) => {
    if (people[i].position !== person.position &&
        (people[i].position.x !== person.position.x || people[i].position.y !== person.position.y ||
         people[i].position.z !== person.position.z)) moved = true;
    Object.assign(people[i], {position: person.position, action: person.task, yaw: person.yaw, distance: person.distance});
  });
  if (moved) worldJob.solidGrid.setStoryPeople(people);
}

function beginOpenTalk(duel, worldJob, {id, person, scene, asked, radio = false}) {
  const {job} = worldJob;
  const talk = {...startTalk(scene), asked: asked.filter(key => scene.questions?.some(question => question.id === key))};
  const steps = job.steps.slice();
  // A talk on the radio (OPEN-THREADS: the questions home from a burned camp) has a speaker who is not standing here:
  // it is not ended by walking away, and nobody turns to face the player.
  const standing = worldJob.storyPeople?.find(item => item.id === person);
  const onRadio = radio === true || !standing;
  steps.splice(job.stepIndex, 0, {kind: 'talk', id, scene, openPerson: person, openRadio: onRadio});
  worldJob.openRoamStepState = job.stepState;
  worldJob.job = {...job, steps, stepState: {talk, screen: talkScreen(scene, talk)}};
  worldJob.storySpeaker = onRadio ? null : person;
  duel.emit({talkOpened: true});
  if (!onRadio) duel.emit({arenaTell: {id: 'open-talk', targetId: 'player', seconds: 0, cue: OPEN_TALK_HAIL,
    position: standing.position}});
}

function closeOpenTalk(duel, worldJob, step, waiting, finished = false) {
  const steps = worldJob.job.steps.slice();
  const stepIndex = steps.indexOf(step);
  steps.splice(stepIndex, 1);
  worldJob.job = {...worldJob.job, steps, stepIndex, stepState: worldJob.openRoamStepState, events: [], requests: [],
    talkResult: undefined};
  worldJob.openRoamStepState = null;
  worldJob.storySpeaker = null;
  worldJob.openJobEvents = [...(worldJob.openJobEvents ?? []), {type: 'openTalkClosed', scene: step.id, finished}];
  if (waiting) duel._storyCallout(WAITING_LINE);
}

export function stepWorldJob(duel, dt) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || worldJob.settled || state.arena.result) return null;
  const talkStep = worldJob.job.steps[worldJob.job.stepIndex];
  // STORY-NIGHT-2-FLOW: the rider laying siege circles the Walkers' camp (a talk passes no time, so it stands still then).
  if (worldJob.night2 && dt > 0 && stepNight2Siege(worldJob, dt,
    state.onFoot && state.fighter ? state.fighter : position(duel, state))) syncJobCarSolids(worldJob);
  if (talkStep?.kind === 'talk') {
    // OPEN-ROAM: external movement or leaving the driver's seat of the talk
    // closes this temporary step without routing a story choice.
    if (talkStep.openPerson && !talkStep.openRadio) {
      const person = worldJob.storyPeople.find(item => item.id === talkStep.openPerson);
      if (!state.onFoot || distanceToPerson(person, state.fighter) > TALK_RANGE) {
        worldJob.talkAction = null;
        closeOpenTalk(duel, worldJob, talkStep, true);
        return null;
      }
    }
    const previousScreen = worldJob.job.stepState.screen;
    if (previousScreen && !worldJob.talkAction && !talkStep.scene.autoAdvance) return null;
    const previousStep = worldJob.job.stepIndex;
    const before = worldJob.job.stepState.talk;
    const next = stepJob(worldJob.job, {talkAction: worldJob.talkAction, talkFacts: worldJob.talkFacts}, dt);
    if (talkStep.scene.autoAdvance && previousScreen && next.stepState.talk?.phase === before?.phase &&
        next.stepState.talk?.index === before?.index) next.stepState.screen = previousScreen;
    worldJob.talkAction = null;
    routeWorldNight2(duel, worldJob, previousStep, next);
    worldJob.job = next;
    if (!before) duel.emit({talkOpened: true});
    const screen = next.stepState.screen;
    const chosen = next.events.find(event => event.type === 'talkChoice');
    // OPEN-SHARED: the open land stands still during a talk, and hears what was chosen when it moves again.
    if (talkStep.openPerson) {
      const asked = next.stepState.talk?.asked ?? [];
      const questions = asked.filter(id => !before.asked.includes(id)).map(id => ({
        type: 'openTalkQuestion', scene: talkStep.id, id,
        effects: talkStep.scene.questions.find(question => question.id === id).effects,
      }));
      const result = chosen ? [{...chosen, scene: talkStep.id}] : [];
      worldJob.openJobEvents = [...(worldJob.openJobEvents ?? []), ...questions, ...result];
      if (next.stepIndex !== previousStep) {
        closeOpenTalk(duel, worldJob, talkStep, false, true);
        return null;
      }
    } else if (worldJob.open && next.events.length) worldJob.openJobEvents = [...(worldJob.openJobEvents ?? []), ...next.events];
    worldJob.storySpeaker = screen?.line && !screen.line.radio ? screen.line.speaker : null;
    if (chosen) duel.emit({storyChoice: chosen});
    if (next.stepIndex !== previousStep) {
      if (worldJob.night2) enterNight2(duel, worldJob);
      applyStepLoan(duel, worldJob);
    }
    const changed = !before || chosen || before.phase !== screen?.phase || before.index !== next.stepState.talk?.index;
    if (changed) {
      const cue = chosen ? 'story.talk.choose' : screen?.line ? 'story.talk.line' : screen?.phase === 'thoughts' ? 'story.thought' : null;
      const sceneCue = talkStep.scene.lines?.find(line => line.words === screen?.line?.words)?.cue;
      if (sceneCue) night2Cue(duel, sceneCue);
      if (screen?.line?.radio) duel.emit({talkRadio: true});
      else if (cue) duel.emit({arenaTell: {id: 'story-talk', targetId: 'player', seconds: 0, cue}});
    }
    return next.done ? finishWorldJob(duel, worldJob) : null;
  }
  // The town's ending clock belongs to its rule. Freeze combat and foot motion
  // through the arena's existing hold path, while continuing captions and actors.
  if (worldJob.job.stepState.townEnding) {
    worldJob.clockSec = state.stageTimeSec;
    const next = stepJob(worldJob.job, {}, dt);
    worldJob.job = next;
    applyRequests(duel, worldJob, next.requests);
    updateJobActors(duel, worldJob, dt);
    const arrived = next.events.find(event => event.type === 'brandArrived');
    if (arrived) worldJob.brandResult = {brandsUsed: arrived.brandsUsed, pay: arrived.pay, sentence: arrived.sentence};
    if (next.done) return finishWorldJob(duel, worldJob);
    return null;
  }
  if (duel.course.def.scablands && worldJob.definition.id === 'everburn-hot-delivery' &&
      worldJob.job.steps[0]?.riderSafeWall) {
    const gate = worldJob.job.steps[0].riderSafeWall, car = position(duel, state);
    const open = !state.onFoot && Math.hypot(car.x - gate.x, car.z - gate.z) <= 20;
    if (open && !worldJob.tinTownGateRequested) {
      worldJob.tinTownGateRequested = true;
      duel.emit?.({arenaTell:{id:'tin-town-gate', targetId:'player', seconds:0,
        cue:'world.tintown.gate', position:car}});
    }
    const progress = worldJob.tinTownGateProgress ?? 0;
    const travel = Math.max(0, dt) / TIN_TOWN_SWING_SECONDS;
    worldJob.tinTownGateProgress = worldJob.tinTownGateRequested ? Math.min(1, progress + travel) : progress;
    worldJob.solidGrid.setTownGate(gate, worldJob.tinTownGateProgress);
  }
  if (worldJob.arrivalHold) {
    const hold = worldJob.arrivalHold;
    worldJob.clockSec = state.stageTimeSec;
    hold.elapsed = Math.min(hold.seconds, hold.elapsed + dt);
    if (hold.gasLoad) worldJob.forgeGasShare = hold.elapsed / hold.seconds;
    if (!hold.caught && hold.elapsed + 1e-9 >= hold.catchAt) {
      hold.caught = true;
      duel.emit({arenaTell:{id:'forge-catch', targetId:'player', seconds:0,
        cue:'world.forge.catch', position:{...hold.position}}});
    }
    updateJobActors(duel, worldJob, dt);
    if (hold.elapsed + 1e-9 >= hold.seconds) {
      if (hold.gasLoad) worldJob.forgeGasShare = 1;
      worldJob.job = hold.completedJob;
      return finishWorldJob(duel, worldJob);
    }
    return null;
  }
  if(worldJob.definition.kind==='town-drive'){
    const gate=worldJob.definition.layout?.gate;
    if(gate){
      const point=position(duel,state),near=Math.hypot(point.x-gate.x,point.z-gate.z)<=gate.halfWidth+8;
      state.townGatePrompt=near?gate.prompt:'';
      if(near&&state.input?.interact&&!worldJob.gateOpened){
        worldJob.gateOpened=true;duel.emit?.({townGate:true});
      }
    }
    sprayFromFireTruck(duel, worldJob, null, dt); // WEAPON-WATER-CANNON: H in the fire truck on a free drive
    return null;
  }
  worldJob.clockSec = state.stageTimeSec;
  const waveKey = `${worldJob.job.stepIndex}:${worldJob.job.stepState.wave ?? 0}`;
  const waveZone = worldJob.waveZones?.[waveKey];
  const waveNumber = worldJob.job.stepState.wave ?? 0;
  if (waveZone?.raiders.length && waveZone.raiders.every(raider => raider.knockedDown) &&
      !worldJob.clearedWaves.includes(waveNumber)) worldJob.clearedWaves.push(waveNumber);
  const player = state.onFoot && state.fighter ? state.fighter : state;
  const point = state.onFoot&&state.fighter?{x:state.fighter.x,y:state.fighter.y,z:state.fighter.z}:position(duel, player);
  const currentStep = worldJob.job.steps[worldJob.job.stepIndex];
  if (worldJob.storyPeople && currentStep?.kind !== 'roam' && currentStep?.kind !== 'talk' &&
      advanceStoryPeople(worldJob.storyPeople, dt, scablandsActorHeightAt)) {
    worldJob.solidGrid.setStoryPeople(worldJob.storyPeople);
    // Carts that move take their solids with them (STORY-NIGHT-2-FLOW: the Walkers leaving a taken camp).
    if (worldJob.night2) worldJob.solidGrid.setCamp?.(night2CampSolids(worldJob.night2, worldJob.storyPeople));
  }
  if (duel.course.def.scablands && worldJob.definition.id === 'everburn-hot-delivery' && currentStep?.ember && !worldJob.job.done) {
    const car = player === state ? point : position(duel, state);
    worldJob.pipeDeck = pipeDeckSpeed(car, Math.abs(state.speedMph || 0) * MPH_TO_KMH);
    if (worldJob.pipeDeck.tooFast && !worldJob.pipeSlip && !state.knock) {
      // Slide toward the nearer edge; free-body motion and the land handle the fall.
      const across = (car.x - PIPE_CROSSING.x) * pipeDirection.z - (car.z - PIPE_CROSSING.z) * pipeDirection.x;
      const side = across < 0 ? -1 : 1;
      shoveCar(duel, {x:side * pipeDirection.z, z:-side * pipeDirection.x, metresPerSecond:18});
      if (state.knock) state.knock.scablandsFlight = true;
      worldJob.pipeSlip = true;
    }
    if (!worldJob.pipeDeck.onDeck) worldJob.pipeSlip = false;
    // The simulation runs at 120 steps per second. Stagger the two long
    // traces, keeping each result for 30 steps between checks.
    const sightStep = worldJob.sightStep ?? 0;
    worldJob.sightStep = (sightStep + 1) % 30;
    const sight = stepSkylineSight(worldJob.skylineSight ?? {}, car, dt, scablandsSurfaceHeightAt, duel.course.groundTunnels, sightStep === 0);
    worldJob.skylineSight = sight;
    const glass = hotDeliveryGlass(worldJob);
    stepGlassSeen(sight, {car, glass, visible:sight.visible,
      loaded:!!worldJob.job.stepState.loaded}, dt);
    if (!worldJob.glassSaid && scablandsDriveAt(car.x, car.z).id === 'scab-plates' &&
        Math.hypot(car.x - glass.x, car.z - glass.z) <= FURNACE_GLASS.captionMetres) {
      worldJob.glassSaid = true;
      duel._storyCallout("Rook: That light is the furnace's glass. Stay out of it, or get behind rock.", EMBER_CAPTION_SECONDS);
    }
    if (glassWarningDue(sight, !glassPursuitReady(worldJob, currentStep.furnaceRiders ?? []))) {
      beginGlassPursuit(worldJob);
      for (const actor of currentStep.furnaceRiders ?? []) {
        updateJobActor(duel, worldJob, actor, 0);
        const rider = worldJob.actors.find(item => item.id === actor.id);
        if (rider.health > 0) rider.pursuing = true;
      }
      duel.emit({arenaTell: {id: 'furnace-warning', targetId: 'player', seconds: 0,
        cue: 'world.furnace.horn', position: car}});
    }
    if (sight.change) {
      duel._storyCallout(sight.visible ? 'The furnace can see your car.' : 'The furnace has lost sight of your car.', 2.2);
      duel.emit({arenaTell: {id: 'furnace-sight', targetId: 'player', seconds: 0,
        cue: sight.visible ? 'arena.tell' : 'gate.latch', position: car}});
    }
    const lookout = stepRidgeSight(worldJob.ridgeSight ?? {}, car, scablandsSurfaceHeightAt, duel.course.groundTunnels, sightStep === 15);
    worldJob.ridgeSight = lookout;
    if (lookout.change) {
      duel._storyCallout(lookout.visible ? 'The lookout can see your car.' : 'The lookout has lost sight of your car.', 2.2);
      duel.emit({arenaTell: {id: 'lookout-sight', targetId: 'player', seconds: 0,
        cue: lookout.visible ? 'arena.tell' : 'gate.latch', position: car}});
    }
  }
  // Exploration finds use heights above the local ground, not world altitudes.
  const jobPoint = currentStep?.kind === 'explore' && duel.course.def.scablands
    ? {...point, y: point.y - scablandsActorHeightAt(point.x, point.z, point.y)} : point;
  const playerView = {position: jobPoint, s: player.s, lateral: player.lateral,
    speed: player.speedMph ?? 0};
  // TOWN-FIRE-JOB: the cannon sprays where the truck's nose points.
  const douseHeading = currentStep?.kind === 'douse' ? worldPose(duel, player).heading : undefined;
  // The braziers of a Hot Delivery carry step are solid while they are drawn (src/world/ember-pot.js says where they stand).
  const brazierKey = currentStep?.ember ? worldJob.job.stepIndex : -1;
  if (worldJob.brazierKey !== brazierKey) {
    worldJob.brazierKey = brazierKey;
    const grid = worldJob.solidGrid ??= createJobSolidGrid(duel.course.solidGrid);
    grid.setBraziers(currentStep?.ember ? brazierSpotsFor(currentStep) : []);
    grid.setBarricades(currentStep?.ember || currentStep?.gasLoad ? currentStep.barriers ?? [] : []);
  }
  const trainBefore=worldJob.actors.find(actor=>actor.train)?.position;
  const previousRoofStage=worldJob.job.stepState.stage==='roof';
  const trainMetresBefore=worldJob.job.stepState.trainMetres??0;
  if (currentStep?.kind === 'defend' && currentStep.placeId) {
    worldJob.places ??= {};
    const place = currentStep.place?.position ?? currentStep.place;
    const placeState = worldJob.places[currentStep.placeId] ??= {health: currentStep.health ?? 100};
    const difficultyScale = state.cpuDifficulty === 'easy' ? .1 : 1;
    let nearbyRaiders = 0;
    for (const raider of worldJob.actors) {
      if (raider.knockedDown || !Number.isFinite(raider.x) || !Number.isFinite(raider.z)) continue;
      if (Math.hypot(raider.x - place.x, raider.z - place.z) <= WELL_WEAR_RANGE) nearbyRaiders++;
    }
    placeState.health = Math.max(0, placeState.health - nearbyRaiders *
      WELL_WEAR_PER_SECOND * difficultyScale * dt);
  }
  if (currentStep?.kind === 'escort' && currentStep.ambushes?.length) {
    runDownRaiders(duel, worldJob, point);
    wearEscort(worldJob, currentStep, state.cpuDifficulty, dt);
  }
  const thingsHit = [...(state.worldJobThingsHit || []),
    ...(state.onFoot && state.input?.interact &&
      worldJob.job.steps[worldJob.job.stepIndex]?.kind === 'heist'
      ? [{id: worldJob.job.steps[worldJob.job.stepIndex].takeId, kind: 'take'}] : [])];
  for (const hit of thingsHit) {
    const targetId = hit.actorId ?? hit.id;
    const actor = worldJob.actors.find(item => item.id === targetId);
    // A door hit counts only on the glowing door; the furnace owns its health.
    if (hit.kind === 'furnace-vent') {
      if (actor?.furnace && furnaceHit(actor.furnace, hit.door, 'weapon')) syncFurnaceActor(actor);
      continue;
    }
    const activeScout = actor && actor.id === currentStep?.scout?.id &&
      !worldJob.job.stepState.scoutHome && !worldJob.job.stepState.scoutStopped;
    if (activeScout && hit.flame && actor.health > 0) {
      stopScout(duel, worldJob, actor);
    } else if (currentStep?.gasLoad && hit.flame && actor?.position && !actor.ramRetreat && !actor.gasDrivenOff && actor.health > 0 &&
        [...(currentStep.waitingActors ?? []), ...(currentStep.gasRaiders ?? [])].some(def => def.id === actor.id && (def.gasRaid || def.gasBlockRider))) {
      // Job 4, design points 4 and 5: flame drives a rider off as a ram does. He turns away from the car and does not come back.
      const dx = actor.position.x - point.x, dz = actor.position.z - point.z, away = Math.hypot(dx, dz) || 1;
      actor.ramRetreat = {x:actor.position.x + dx / away * 40, z:actor.position.z + dz / away * 40, seconds:0};
    } else if (actor && !(currentStep?.bellows && actor.id === currentStep.targetId) &&
        !(currentStep?.gasLoad && currentStep.waitingActors?.some(def => def.gasBlockCar && def.id === actor.id)) && Number.isFinite(hit.damage)) {
      actor.health = Math.max(0, actor.health - hit.damage);
      if (activeScout && actor.health <= 0) stopScout(duel, worldJob, actor);
    }
  }
  const targetActor = worldJob.actors.find(actor => actor.id === worldJob.job.steps[worldJob.job.stepIndex]?.targetId);
  const contact = targetActor && Math.hypot(point.x - targetActor.position.x, point.z - targetActor.position.z) <=
    (worldJob.job.steps[worldJob.job.stepIndex]?.contactRadius ?? 3)
    ? targetActor.id : null;
  // Job 3 reads this step's meetings with the thief before they are taken and cleared for the riders (a review of slice 12
  // found the order turned round, so that no knock on the thief could count).
  const bellowsFacts = bellowsArenaFacts(duel, worldJob, currentStep, thingsHit);
  takeJobCarContacts(duel, worldJob);
  const actors = [...worldJob.actors.map((actor, index) => ({id: actor.id ?? `raider-${index}`,
    position: actor.position ?? {x: actor.x, y: actor.y, z: actor.z}, health: actor.knockedDown ? 0 : actor.health,
    drivenOff:!!(actor.ramRetreat || actor.gasDrivenOff),
    pathProgress: actor.pathProgress, atDestination: actor.atDestination, pathIndex: actor.pathIndex,
    // How far an escorted truck has gone along its road, for the step's sayAtShare lines (0 to 1).
    ...(currentStep?.sayAtShare && actor.id === currentStep.actorId && actor.position ?
      {share: pathShare(actor.position, actor.pathIndex, currentStep.path).share} : {})})),
  ...state.opponents.map((actor, index) => ({id: actor.jobId ?? `cpu-${index + 1}`,
    position: position(duel, actor), health: actor.armor}))];
  // The ember in the pot (src/world/jobs/ember-rule.js) reads how fast the car goes, the speed the ground under it is safe at (its region, src/world/scablands-regions.js), and the speed it shed in
  // this one step: a hit on a solid, a barricade or another car sheds a lot in a step, braking only a little. This only reads the car.
  applyBellowsRiderHit(duel, worldJob);
  const kmh = Math.abs(state.speedMph || 0) * MPH_TO_KMH;
  // A fall (src/sim-scablands.js) is a hit of its own size whatever speed the car had: the larger of the speed shed and the fall's size.
  const hitKmh = Math.max(Number.isFinite(worldJob.lastKmh) ? Math.max(0, worldJob.lastKmh - kmh - (worldJob.riderContactShedKmh || 0)) : 0, state.scablandsHitKmh || 0, worldJob.riderHitKmh || 0);
  const severeHit = state.scablandsLongFall === true ||
    (worldJob.lastKmh > 80 && kmh < 1 && worldJob.lastKmh - kmh > 80);
  state.scablandsHitKmh = 0;
  state.scablandsLongFall = false;
  worldJob.riderHitKmh = 0;
  worldJob.riderContactShedKmh = 0;
  worldJob.lastKmh = kmh;
  const ground = scablandsDriveAt(point.x, point.z);
  if (currentStep?.ember && worldJob.job.stepState?.loaded && ground.id === 'river-bed' && !worldJob.bedColdSaid) {
    worldJob.bedColdSaid = true;
    duel._storyCallout('Cold mist lies in the hollows. Steer round it.', 3);
  }
  const carriedCar = position(duel, state);
  if (worldJob.night2 && currentStep?.id === 'scout') {
    const scout = worldJob.actors.find(item => item.id === NIGHT_2_SCOUT.id);
    const chapter = worldJob.night2;
    // One rule for an Ash Man on foot (STORY-NIGHT-2-FLOW item 7): the ambush rule's car hit knocks the scout flat for good,
    // as it does a rider's crew at the Wash.
    if (scout && !scout.knockedDown && !state.onFoot && !state.combatWrecking &&
        Math.abs(state.speedMph || 0) * DRIVE.mphToWorld >= AMBUSH_RUN_DOWN_MPS &&
        Math.hypot(scout.x - point.x, scout.z - point.z) <= AMBUSH_RUN_DOWN_METRES) {
      Object.assign(scout, {knockedDown: true, health: 0, approachSpeed: 0, approachTarget: null});
      chapter.scoutDowned = true;
      night2Cue(duel, 'night.ash-man.down');
    }
    if (scout && !scout.knockedDown) {
      const fire = brandCombatView(state, worldJob);
      const burning = fire.handFlamerHits.includes(NIGHT_2_SCOUT.id);
      const place = night2ScoutDestination(worldJob, burning);
      applyBrandRequest(duel, worldJob, {type: 'moveBrandAsh', id: NIGHT_2_SCOUT.id, place});
      if (burning) scout.approachSpeed = 4.5;
    }
    chapter.scoutReach = scout ? scoutReach(state, scout, chapter) : null;
  }
  const roadResult = worldJob.riderFight && updateRoadFight(duel,worldJob,dt);
  if (worldJob.night2) watchNight2Camp(worldJob, cue => night2Cue(duel, cue));
  const truckWater = sprayFromFireTruck(duel, worldJob, currentStep, dt);
  const view = {player: playerView, onFoot: !!state.onFoot, ...(truckWater?.hit ? {waterOnCar: true} : {}),
    ...(currentStep?.kind === 'rider-fight' ? {riderFight:worldJob.riderFight} : {}),
    ...(worldJob.night2 ? {night2Action: night2Action(worldJob, point, state.onFoot, carriedCar)} : {}),
    ...(currentStep?.gasLoad ? {carContacts:worldJob.gasCarContacts ?? [],
      playerFlaming:state.onFoot ? state.fighter?.flaming === true && state.footWeapons?.selected === 'hand-flamer' :
        (state.combat?.flameBursts ?? []).some(burst => burst.ownerId === 'player')} : {}),
    ...bellowsFacts,
    combatWrecking:state.combatWrecking === true,
    ...(currentStep?.brand ? brandCombatView(state, worldJob) : {}),
    ashMen: currentStep?.brand ? actors.filter(actor =>
      worldJob.actors.some(source => source.brandAsh && source.id === actor.id)) : [],
    speedKmh: kmh, hitKmh, severeHit, safeKmh: ground.safeKmh, groundRegion: ground.id, roughness: ground.roughness,
    ...(douseHeading !== undefined ? {heading: douseHeading} : {}),
    fighter: state.fighter ? {...state.fighter, position: point} : null,
    carPosition: carriedCar, carGroundRegion:state.onFoot ? scablandsDriveAt(carriedCar.x, carriedCar.z).id : ground.id,
    actors, crashSize: state.lastCrashSize || 0,
    thingsHit,
    carrying: worldJob.carrying, inventory: worldJob.inventory ?? [], lamps: worldJob.job.steps[worldJob.job.stepIndex]?.lamps ?? [],
    places: worldJob.places ?? {}, placeHealth: worldJob.placeHealth,
    difficulty: state.cpuDifficulty, controls:worldJob.controls??{}, interact:state.input?.interact===true,
    grapple:(state.crewGear?.id==='grapple'&&state.footWeapons?.selected===state.crewGear.id)||state.input?.interact===true,
    train:worldJob.actors.find(actor=>actor.train),
    contact, waveCleared: worldJob.clearedWaves};
  const previousStep = worldJob.job.stepIndex;
  const previousStepState = worldJob.job.stepState;
  // OPEN-SHARED: the open land's parts run beside the job's own step, and the step may read what they left.
  // OPEN-CHECKPOINTS: pass the road state to the part and deliver the fight's result on the next tick.
  let openStep = null;
  const checkpointsEnabled = worldJob.open && duel.featureFlags?.enabled('story-choices') === true;
  if (worldJob.open) {
    // OPEN-CHECKPOINTS, OPEN-ROAM and OPEN-DOORS: the road state, the clock's part of the day, the job's collision grid,
    // and the car, the shed staff and the ash for the sheds.
    const road = checkpointsEnabled ? checkpointRoadView(duel, worldJob) : {};
    const openRoam = currentStep?.kind === 'roam';
    // Where each site stands in this land, from the land's seed (OPEN-SITES), for every part that places one.
    const landSeed = worldJob.open.world.open.landSeed;
    if (worldJob.openSitePositions?.landSeed !== landSeed) worldJob.openSitePositions = {landSeed, at: Object.fromEntries(
      OPEN_SITES.map(site => [site.id, sitePosition(site.id, landSeed)]).filter(([, at]) => at))};
    openStep = stepOpenLand(worldJob.open, {...view, ...road, sitePositions: worldJob.openSitePositions.at, checkpointSites: worldJob.openSitePositions.at,
      openRoam, peopleGrid: openRoam ? worldJob.solidGrid : undefined,
      serviceSheds: worldJob.serviceSheds,
      car: {armour: state.armor, maxArmour: state.maxArmor, dirt: worldJob.open.world.open.car.dirt},
      fieldPatched: worldJob.fieldPatched,
      people: worldJob.storyPeople, partOfDay: worldJob.definition.open.partOfDay ?? 'day',
      greyWithAsh: worldJob.open.parts.buildings?.ash === true,
      onRoad: ground.id === 'road', ashHit: worldJob.ashHit, clockSec: worldJob.clockSec, jobEvents: worldJob.openJobEvents ?? []}, dt);
    worldJob.ashHit = false;
    worldJob.open = openStep.open;
    view.open = {world: worldJob.open.world, holds: worldJob.open.holds, leave: openStep.leave};
  }
  const next = stepJob(worldJob.job, view, dt);
  if (worldJob.open) {
    worldJob.openJobEvents = roadResult ? [...next.events, roadResult] : next.events;
    const fall = next.stepState.bridgeAsh?.hitFall;
    if (worldJob.serviceSheds && fall != null && fall !== previousStepState.bridgeAsh?.hitFall) worldJob.ashHit = true;
  }
  worldJob.gasCarContacts = [];
  routeWorldNight2(duel, worldJob, previousStep, next);
  worldJob.job = next;
  if (currentStep?.kind === 'haul') {
    syncHaulVehicle(worldJob);
    for (const event of next.events) playHaulEvent(duel, worldJob, event, point);
  }
  if (currentStep?.kind === 'douse') {
    syncDouseVehicle(worldJob);
    for (const event of next.events) playDouseEvent(duel, worldJob, event, point);
  }
  if (next.events.some(event => event.type === 'burn') && (currentStep?.ember || currentStep?.gasLoad)) {
    const burnt = next.stepState.burntBarricades ?? [];
    worldJob.solidGrid.setBarricades((currentStep.barriers ?? []).filter(barrier => !burnt.includes(barrier.id)));
  }
  // The moment a step began its closing lines: the scene times the furnace's sighting after Job 3's catch from it.
  if (next.stepState.linesClosing && !Number.isFinite(worldJob.wonAtSec)) worldJob.wonAtSec = worldJob.clockSec;
  // FIELD-BATTLE-ASH: how the battle ended, fixed by the escort step the moment Big Bess arrived ('won' or 'arrived').
  if (next.stepState.ending) worldJob.battleEnding = next.stepState.ending;
  state.worldJobThingsHit = [];
  // Slow Ride's stop and distance cap govern this movement tick, including
  // the six still seconds in which Moss works on the tank.
  if (currentStep?.gasLoad) applyRequests(duel, worldJob, next.requests.filter(request => request.type === 'follow'));
  moveJobRaiders(duel, worldJob, dt);
  updateJobActors(duel, worldJob, dt);
  if (next.stepIndex !== previousStep) {
    worldJob.clearedWaves = [];
    // EVERBURN-PLAY-FIXES: when a defence ends the raiders still standing are removed, so none is left piled at the well.
    if (currentStep?.kind === 'defend') removeWaveRaiders(duel, worldJob, previousStep);
    const outcome = currentStep?.kind === 'rider-fight' && worldJob.riderFight.outcome;
    if (outcome === 'lost' && currentStep.onLost !== 'continue' || outcome === 'surrounded' && currentStep.onSurrounded === 'lose')
      return {reason:'rider-fight-lost', winnerId:'raiders'};
    if (worldJob.riderReserve) startRoadFight(duel, worldJob);
    if (worldJob.night2) enterNight2(duel, worldJob);
    applyStepLoan(duel, worldJob);
  }
  for (const event of next.events) {
    if (currentStep?.gasLoad && event.type === 'gasRaid') duel.emit({arenaTell:{id:event.id, cue:'world.ashmen.horn',
      seconds:0, position:currentStep.gasRaids.find(raid => raid.id === event.id)?.place.position}});
    if (currentStep?.gasLoad && event.type === 'gasLeak') duel.emit({arenaTell:{id:'gas-leak', cue:'world.bess.leak',
      seconds:0, position:worldJob.actors.find(actor => actor.id === currentStep.actorId)?.position}});
    if (currentStep?.gasLoad && event.type === 'gasFlash') duel.emit({arenaTell:{id:'gas-flash', cue:'world.gas.flash',
      seconds:0, position:worldJob.actors.find(actor => actor.id === currentStep.actorId)?.position}});
    if (currentStep?.gasLoad && event.type === 'gasPlug') duel.emit({arenaTell:{id:'gas-plug', cue:'world.bess.plug',
      seconds:0, position:worldJob.actors.find(actor => actor.id === currentStep.actorId)?.position}});
    // The battle's furnace counts each of Big Bess's rests once it is out; after the third it is spent (old-smoke.js).
    // Rests she had before it came out are the riders' doing and burn none of its coal.
    if (event.type === 'rest' && worldJob.definition.battle === true) {
      const hunter = worldJob.actors.find(actor => actor.furnace?.battle);
      if (hunter) furnaceRested(hunter.furnace);
    }
    if (event.type === 'waveRestarted') {
      const step = next.steps[next.stepIndex];
      if (step?.kind === 'defend' && step.placeId) {
        worldJob.places ??= {};
        worldJob.places[step.placeId] = {health: step.health ?? 100};
      }
      const key = `${next.stepIndex}:${event.wave ?? 0}`;
      const zone = worldJob.waveZones?.[key];
      if (zone) {
        duel.state.raids.zones = duel.state.raids.zones.filter(candidate => candidate !== zone);
        worldJob.actors = worldJob.actors.filter(actor => !zone.raiders.includes(actor));
        delete worldJob.waveZones[key];
      }
      worldJob.spawnedWaveKeys = worldJob.spawnedWaveKeys.filter(existing => existing !== key);
    }
    if (event.type === 'restarted') {
      // The escorted truck starts the stretch again: back at the last place she reached, with the health she left it with.
      const truck = worldJob.actors.find(actor => actor.id === event.actorId), path = next.steps[next.stepIndex]?.path;
      // On her first stretch that place is her named start (the road's first place may be a solid), when she has one.
      const index = Math.max(0, (truck?.pathIndex ?? 1) - 1), named = index === 0 ? next.steps[next.stepIndex]?.actor?.start : null;
      const start = currentStep?.gasLoad ? event.place : named ?? path?.[index];
      if (truck && start) {
        truck.position = {...(start.position ?? start)};
        // After a rest she has at least REST_HEALTH_MINIMUM, and more if she had more when the stretch began.
        if (currentStep?.gasLoad) truck.pathIndex = event.pathIndex;
        else truck.health = Math.max(truck.stretchHealth ?? 0, REST_HEALTH_MINIMUM);
        truck.stretchHealth = truck.health;
        truck.reachedEnd = false; truck.atDestination = false;
        // The battle's furnace falls back to where it came out, behind her, and keeps its broken doors.
        const hunter = worldJob.actors.find(actor => actor.furnace?.battle);
        if (hunter) furnaceFallBack(hunter.furnace, pathShare(truck.position, truck.pathIndex, path).metres);
      }
    }
    if (event.type === 'waveCleared') worldJob.clearedWaves.push(event.wave);
    if (event.type === 'taken') {
      worldJob.carrying = event.id;
      worldJob.inventory = [...new Set([...(worldJob.inventory ?? []), event.id])];
    }
    if (event.type === 'say' && event.lineId) sayLine(duel, worldJob, event.lineId, event.urgent);
    // The ember (src/world/jobs/ember-rule.js): a jolt, the pot going out, a fresh scoop, and the grade at arrival. The sounds are the
    // bank's own cues, played through the arena tell event; the grade is kept for the pay and the results screen.
    if ((event.type === 'emberOut' || event.type === 'bessGreeting' || event.type === 'bridgeAshWarning') && event.text) duel._storyCallout(event.text, EMBER_CAPTION_SECONDS, true);
    if (event.type === 'bridgeAshWarning' || event.type === 'bridgeAshFall') duel.emit({arenaTell:{
      id:'bridge-ash', seconds:0, cue:event.type === 'bridgeAshWarning' ? 'world.ashmen.horn' : 'world.bridge.ash',
      position:{...currentStep.bridgeAsh}}});
    if (EMBER_CUES[event.type]) duel.emit({arenaTell: {id: 'ember-pot', targetId: 'player', seconds: 0, cue: EMBER_CUES[event.type], position: {...point}}});
    if (currentStep?.brand && BRAND_CUES[event.type]) {
      const lamp = currentStep.places?.find(place => place.id === event.id);
      duel.emit({arenaTell: {id: 'town-brand', targetId: 'player', seconds: 0,
        cue: BRAND_CUES[event.type], position: {...(event.position ?? lamp?.position ?? point)}}});
    }
    playBellowsEvent(duel, worldJob, currentStep, event, view.carPosition);
    if (event.type === 'bellowsArrived') {
      worldJob.bellowsResult = {bellows:event.bellows, knocks:event.knocks, pay:event.pay, sentence:event.sentence};
    }
    if (currentStep?.gasLoad && event.type === 'gasArrived') {
      worldJob.gasResult = {gas:event.gas, pay:event.pay, sentence:event.sentence};
      worldJob.forgeGasShare = 0;
      sayLine(duel, worldJob, currentStep.gasArrivalLineId);
      duel.emit({arenaTell:{id:'gas-arrival', targetId:'player', seconds:0,
        cue:'world.furnace.horn', position:{...(currentStep.gasFurnacePlace ?? currentStep.destination).position}}});
    }
    if (event.type === 'emberArrived') {
      worldJob.emberResult = {ember: event.ember, relights: event.relights, grade: event.grade, pay: event.pay,
        sentence: emberSentence(currentStep.ember, event.ember, event.relights)};
      if (worldJob.definition.id === 'everburn-hot-delivery') {
        worldJob.forgeFire = {ember:event.ember, grade:event.grade};
      }
    }
    if(event.type==='roofBoard'&&state.fighter) {
      Object.assign(state.fighter,{x:event.position.x,y:event.position.y,z:event.position.z,groundY:event.position.y});
      worldJob.roofRide={x:event.position.x,y:event.position.y,z:event.position.z};
      // SHIPS-DECKS: a ladder's top is a still plate; the fighter stands on it rather than landing on it.
      if(event.ladderId)Object.assign(state.fighter,{airHeight:0,verticalSpeed:0});
    }
    if(event.type==='deckGround'&&state.fighter)putFighterOnGround(duel,state.fighter,event.position);
    if(currentStep?.climbs&&DECK_CUES[event.type])duel.emit({arenaTell:{id:'deck-climb', targetId:'player', seconds:0,
      cue:DECK_CUES[event.type], position:state.fighter ? {x:state.fighter.x, y:state.fighter.y, z:state.fighter.z} : {...point}}});
    if (event.type === 'done') {
      if (currentStep?.arrivalHold) {
        worldJob.arrivalHold = {elapsed:0, ...currentStep.arrivalHold, gasLoad:currentStep.gasLoad === true,
          position:{...currentStep.destination.position}, completedJob:next};
        worldJob.job = {...next, done:false, stepIndex:previousStep,
          stepState:{...previousStepState, loaded:true, ...(currentStep.gasLoad ? {gas:worldJob.gasResult.gas} : {ember:worldJob.emberResult?.ember})}};
        state.speedMph = 0; state.pushVelocity = 0;
        return null;
      }
      return finishWorldJob(duel, worldJob);
    }
  }
  applyRequests(duel, worldJob, next.requests);
  if (openStep) {
    // A part's line brings its own caption.
    for (const request of openStep.requests) if (request.type === 'say' && request.lineId && typeof request.text === 'string')
      worldJob.definition.captions = {...worldJob.definition.captions, [request.lineId]: request.text};
    // OPEN-ROAM: a proximity talk inserts one temporary step before roam. The shared request is {type: 'talk'};
    // 'openTalk' is the name the people part used before the contract named it.
    const isTalk = request => request.type === 'talk' || request.type === 'openTalk';
    if (currentStep?.kind === 'roam') {
      syncOpenPeople(worldJob);
      const talk = openStep.requests.find(isTalk);
      if (talk) beginOpenTalk(duel, worldJob, {...talk, person: talk.person ?? talk.speaker, asked: talk.asked ?? []});
    }
    // OPEN-CHECKPOINTS: carry out the part's road requests in the same order as its lines.
    for (const request of openStep.requests.filter(request => !isTalk(request))) {
      if (!checkpointsEnabled || !applyCheckpointRoadRequest(duel, worldJob, request)) applyRequests(duel, worldJob, [request]);
    }
  }
  if (next.steps[next.stepIndex]?.kind === 'haul') markHaulWashouts(duel, next.steps[next.stepIndex]);
  if (next.steps[next.stepIndex]?.kind === 'douse') markDouseWater(duel, next.steps[next.stepIndex], next.stepState);
  worldJob.controls=null;
  standOnDeck(duel, next, previousStepState);
  const train=worldJob.actors.find(actor=>actor.train);
  if(train&&state.onFoot&&state.fighter&&next.stepState.stage==='roof') {
    if(worldJob.roofRide&&trainBefore) {
      // A rider moves with their own place on the train, so a long train round a bend keeps them on it.
      const ridePath=currentStep.path, rideAt=nearestIronLineDistance(ridePath,{x:state.fighter.x,y:state.fighter.y-(currentStep.roofHeight??3.5),z:state.fighter.z}).metres;
      const from=sampleIronLine(ridePath,rideAt), to=sampleIronLine(ridePath,rideAt+(next.stepState.trainMetres??trainMetresBefore)-trainMetresBefore);
      state.fighter.x+=to.x-from.x;state.fighter.z+=to.z-from.z;
      state.fighter.y=train.roofPlates?.[next.stepState.index??0]?.position.y??
        state.fighter.y+train.position.y-trainBefore.y;
      state.fighter.groundY=state.fighter.y;
      worldJob.roofRide={x:state.fighter.x,y:state.fighter.y,z:state.fighter.z};
    } else if(!worldJob.roofRide) {
      const plate=train.roofPlates?.[next.stepState.index??0];
      if(plate)Object.assign(state.fighter,{x:plate.position.x,y:plate.position.y,z:plate.position.z,groundY:plate.position.y});
    }
  }
  if(train&&state.onFoot&&state.fighter&&previousRoofStage&&next.stepState.stage==='ground') {
    const ground=duel.course.nearest(state.fighter.x,state.fighter.z,state.s);
    state.fighter.y=state.fighter.groundY=ground.y;
  }
  if(next.stepState.stage!=='roof')worldJob.roofRide=null;
  if(train&&!state.onFoot) {
    const nearest=duel.course.nearest(train.position.x,train.position.z,state.s);
    state.s=state.prevS=nearest.s;state.lateral=state.prevLateral=nearest.lateral;
    state.headingError=0;state.speedMph=train.speed*2.236936;
  }
  return null;
}

// SHIPS-DECKS: put an on-foot fighter on the ground at (x, z), after a fall from a plate or a climb down to the ground.
function putFighterOnGround(duel, fighter, at) {
  const nearest = duel.course.nearest(at.x, at.z, fighter.s), ground = duel.course.groundAt(nearest.s, nearest.lateral);
  Object.assign(fighter, {x:at.x, z:at.z, s:nearest.s, lateral:nearest.lateral, y:ground.y, groundY:ground.y, airHeight:0, verticalSpeed:0});
}

// The walk reads the plate the fighter stands on (src/onfoot.js) from `fighter.deckPlate`, the climbing step's own `plate`. A step
// that ends with the fighter still up there (its last place on a deck) leaves them on the ground beside the ship for the next one.
function standOnDeck(duel, next, previousStepState) {
  const fighter = duel.state.onFoot ? duel.state.fighter : null;
  if (!fighter) return;
  const step = next.steps[next.stepIndex], plate = !next.done && step?.climbs ? next.stepState.plate ?? null : null;
  if (plate) { fighter.deckPlate = plate; return; }
  if (!fighter.deckPlate) return;
  const left = previousStepState?.plate === fighter.deckPlate && next.stepState.plate !== fighter.deckPlate && !next.done &&
    !next.events.some(event => event.type === 'deckGround') ? groundBeside(fighter.deckPlate) : null;
  delete fighter.deckPlate;
  if (left) putFighterOnGround(duel, fighter, left);
}

// Combat paths call this after a real projectile or flame contact. It only
// records job evidence; it does not alter projectile, damage, or hit results.
export function reportWorldJobThingHit(duel, hit) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || !hit?.id) return false;
  state.worldJobThingsHit ??= [];
  const step = worldJob.job?.steps[worldJob.job.stepIndex];
  const loadContact = step?.bellows && (hit.actorId ?? hit.id) === step.targetId;
  if (state.worldJobThingsHit.some(item => item.id === hit.id &&
      (!loadContact || item.hitId === hit.hitId && item.flame === hit.flame))) return false;
  state.worldJobThingsHit.push({...hit});
  return true;
}

// This car is a job actor, not an opponent. Native weapons share its solid
// body, but its rule alone decides load loss and hard knocks.
export function bellowsWeaponTarget(duel) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  const step = worldJob?.job?.steps[worldJob.job.stepIndex];
  if (!step?.bellows || worldJob.settled || state.arena.result ||
      state.status !== 'racing' || worldJob.job.stepState.thiefStopped) return null;
  const actor = worldJob.actors.find(item => item.id === step.targetId && item.health > 0);
  if (!actor?.position) return null;
  return {id:actor.id, actorId:actor.id, position:actor.position,
    obstacle:{...actor.position, halfX:BELLOWS_RULE.thiefRadiusMetres,
      halfZ:BELLOWS_RULE.thiefRadiusMetres, height:BELLOWS_RULE.weaponBodyHeightMetres, shape:'box'}};
}

export function worldJobHitTargets(duel) {
  const worldJob = duel.state.arena?.worldJob;
  if (!worldJob || worldJob.settled || duel.state.arena?.result) return EMPTY_HIT_TARGETS;
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  const targets = worldJob.hitTargets;
  targets.length = 0;
  for (const actor of worldJob.actors) {
    if (actor.health > 0 && actor.position) {
      targets.push({id: actor.id, actorId: actor.id, kind: actor.id.includes('furnace') ? 'furnace' : 'vehicle',
        position: actor.position, radius: 3});
      if (actor.id === FURNACE_ID) targets.push(...oldSmokeVentTargets(actor));
    }
  }
  for (const barrier of step?.barriers ?? []) {
    if (worldJob.job.stepState.burntBarricades?.includes(barrier.id)) continue;
    const at = barrier.position ?? barrier;
    targets.push({id: barrier.id, kind: 'barricade', position: at,
      segment: barricadeEnds(at, barrier.heading), halfDepth: 0.7, burnable: true});
  }
  return targets;
}

export function worldJobPilotGoal(duel, actor, dt) {
  if (actor.roadRider) return roadRiderGoal(duel, actor, dt);
  const follow = duel.state.arena?.worldJob?.follow;
  if (follow?.path?.length && (!follow.actorId || actor.jobId === follow.actorId ||
      actor.arenaId === follow.actorId || actor === duel.state.opponents[0])) {
    const target = follow.path[Math.min(duel.state.arena.worldJob.followIndex || 0,
      follow.path.length - 1)];
    const at = target.position ?? target;
    return {x: at.x, z: at.z, speedMph: follow.speed ?? 25, boost: false};
  }
  return null;
}
