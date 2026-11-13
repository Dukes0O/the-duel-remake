import {createJob, stepJob} from '../../world/jobs/job-engine.js';
import {createRaidZones, damageRaider} from '../../raiders.js';
import {COMBAT_TUNING} from '../../wasteland-tuning.js';
import {initializeCrewGear} from '../../crew-gear/signature.js';
import {clearScablandsTownLayout, scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {OLD_SMOKE, oldSmokeVentTargets, createFurnace, stepFurnace, furnaceHit, furnaceHealth,
  furnaceNextDoor, furnaceFallBack, furnaceRested} from '../../world/jobs/old-smoke.js';
import {pathShare} from '../../world/jobs/furnace-sightings.js';
import {AMBUSH_WEAR_METRES, AMBUSH_WEAR_PER_SECOND, AMBUSH_RUN_DOWN_METRES, AMBUSH_RUN_DOWN_MPS, REST_HEALTH_MINIMUM} from '../../world/jobs/steps/escort.js';
import {nearestIronLineDistance, sampleIronLine} from '../../world/iron-line.js';
import {captionRecord} from '../../story/story-lines.js';
import {applyArmorDamage} from '../../combat-armor.js';
import {startKnock} from '../../vehicle-knock.js';
import {DRIVE} from '../../config.js';
import {worldPose} from '../arena-floor.js';
import {wrapHeading} from '../../offroad-physics.js';

const position = (duel, actor) => {
  const at = duel.course.worldAt(actor.s, actor.lateral);
  return {x: at.x, y: at.y, z: at.z};
};
const EMPTY_HIT_TARGETS = [];
const FURNACE_ID = 'old-smoke-furnace';
// Existing cues only (src/sound-bank.js), played through the arena tell event.
// townReached is the horn (the one that warns of the shove) and gateBurnt is the flamethrower's flame catching.
const FURNACE_CUES = Object.freeze({stoke: 'arena.tell', doorOpen: 'gate.latch',
  doorSlam: 'vehicle.landing', hit: 'combat.hit-confirm', shoveWarning: 'arena.toll-gate',
  fell: 'combat.explosion', townReached: 'arena.toll-gate', gateBurnt: 'weapon.flame.start'});
const FURNACE_HIT_LINES = Object.freeze({1: 'story.ember.cinder.18', 2: 'story.ember.old-smoke.3',
  3: 'story.ember.cinder.19'});
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

export function createWorldJob(definition) {
  if (!definition) throw new TypeError('World Job mode needs a job definition');
  return {job: createJob(definition, definition.seed ?? 0), definition,
    marker: null, follow: null, spawnedWaves: 0, spawnedWaveKeys: [],
    clearedWaves: [], hitTargets: [], settled: false};
}

export function initializeWorldJob(duel, definition) {
  const state = duel.state, arena = state.arena;
  const worldJob = arena?.worldJob;
  if (!worldJob) return false;
  // Loaned car weapons belong to this run. They never touch the player profile.
  worldJob.originalWeaponLoadout = [...(state.weaponLoadout || [])];
  worldJob.originalCrewId = state.crewId;
  worldJob.originalFootWeaponSelected = state.footWeapons?.selected ?? null;
  worldJob.activeLoan = null;
  applyStepLoan(duel, worldJob);
  if(definition.kind==='town-drive')duel.course.townLayout=definition.layout??null;
  worldJob.raidSeed = duel.seed ^ 0x51ab1e;
  worldJob.actors = [];
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
  if(definition.kind==='town-drive'&&definition.layout?.start){
    const start=definition.layout.start,pose=duel.course.nearest(start.x,start.z);
    state.s=pose.s;state.lateral=pose.lateral;state.prevS=pose.s;state.prevLateral=pose.lateral;
    state.speedMph=0;state.headingError=0;state.townGatePrompt='';
  }
  return true;
}

export function cleanupWorldJobLoan(duel) {
  const worldJob = duel.state.arena?.mode === 'world-job' ? duel.state.arena.worldJob : null;
  if (!worldJob || !Array.isArray(worldJob.originalWeaponLoadout)) return false;
  duel.state.weaponLoadout = [...worldJob.originalWeaponLoadout];
  if (worldJob.originalCrewId) duel.state.crewId = worldJob.originalCrewId;
  if (worldJob.originalFootWeaponSelected && duel.state.footWeapons)
    duel.state.footWeapons.selected = worldJob.originalFootWeaponSelected;
  initializeCrewGear(duel);
  if(worldJob.definition.kind==='town-drive'){
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
  const step=worldJob?.job.steps[worldJob.job.stepIndex];
  const input=duel.state.input??{};
  worldJob.controls={whistle:input.boost===true||duel.state.fighterInput?.jump===true};
  if(step?.kind!=='drivetrain') return false;
  Object.assign(worldJob.controls,{throttle:input.throttle??0,brake:input.brake??0});
  input.throttle=0;input.brake=0;input.steer=0;input.boost=false;
  duel.state.speedMph=0;duel.state.pushVelocity=0;
  return true;
}

function updateJobActors(duel, worldJob, dt) {
  const step = worldJob.job.steps[worldJob.job.stepIndex];
  updateJobActor(duel, worldJob, step?.actor, dt);
  // FIELD-BATTLE-ASH: an escort step may also carry the furnace that hunts the escorted truck.
  if (step?.furnaceActor) updateBattleFurnace(duel, worldJob, step, dt);
}

function updateJobActor(duel, worldJob, actorDef, dt) {
  if (!actorDef) return;
  let actor = worldJob.actors.find(item => item.id === actorDef.id);
  if (!actor) {
    const start = actorDef.path?.[0]?.position ?? actorDef.path?.[0];
    if (!start) return;
    actor = {id: actorDef.id, position: {...start}, health: actorDef.health ?? 100,
      pathProgress: 0, speed: 0, renderCar: actorDef.renderCar ?? null, stretchHealth: actorDef.health ?? 100,
      ...(actorDef.id === FURNACE_ID ? {startedAtSec: worldJob.clockSec ?? 0} : {})};
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
  const gap = Math.hypot(dx, dz), travel = Math.max(0, follow.speed ?? actorDef.speed ?? 0) * dt;
  if (gap <= travel || gap < .01) {
    actor.position = {...target};
    actor.pathIndex = Math.min(index + 1, path.length - 1);
    actor.pathProgress = path.length <= 1 ? 1 : actor.pathIndex / (path.length - 1);
    // Health at the start of this stretch: what a rest and restart of the stretch gives back (RUN-GAS).
    actor.stretchHealth = actor.health;
    if (index >= path.length - 1) actor.reachedEnd = true;
  } else {
    actor.position.x += dx / gap * travel;
    actor.position.z += dz / gap * travel;
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
        z, groundY: ground.y, approachTarget, approachSpeed: request.approachSpeed || 0});
    });
  }
  const count = Math.max(1, Math.min(zone.raiders.length, Math.floor(request.n) || 1));
  zone.raiders = zone.raiders.slice(0, count);
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
    Object.assign(raider, {id: `${key}:${index}`, s: ground.s, lateral: ground.lateral, x, y: ground.y, z, groundY: ground.y,
      yaw: Math.atan2(place.x - x, place.z - z), knockedDown: false, knockdownRemaining: 0, ambushKey: key});
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

function applyRequests(duel, worldJob, requests) {
  for (const request of requests) {
    if (request.type === 'marker') {
      worldJob.marker = request.place ?? null;
      const at = request.place?.position ?? request.place;
      duel.state.arena.markers = at && Number.isFinite(at.x) && Number.isFinite(at.z)
        ? [{kind: 'ring', id: 'world-job-marker', x: at.x, y: at.y ?? 0,
          z: at.z, radius: request.place?.radius ?? 4}] : [];
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

function moveJobRaiders(worldJob, dt) {
  for (const actor of worldJob.actors) {
    if (!actor.approachTarget || actor.knockedDown || !(actor.approachSpeed > 0)) continue;
    const dx = actor.approachTarget.x - actor.x, dz = actor.approachTarget.z - actor.z;
    const gap = Math.hypot(dx, dz), travel = actor.approachSpeed * dt;
    if (gap <= travel) {
      actor.x = actor.approachTarget.x; actor.z = actor.approachTarget.z;
    } else {
      actor.x += dx / gap * travel; actor.z += dz / gap * travel;
    }
    actor.yaw = Math.atan2(dx, dz);
  }
}

export function stepWorldJob(duel, dt) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || worldJob.settled || state.arena.result) return null;
  if(worldJob.definition.kind==='town-drive'){
    const gate=worldJob.definition.layout?.gate;
    if(gate){
      const point=position(duel,state),near=Math.hypot(point.x-gate.x,point.z-gate.z)<=gate.halfWidth+8;
      state.townGatePrompt=near?gate.prompt:'';
      if(near&&state.input?.interact&&!worldJob.gateOpened){
        worldJob.gateOpened=true;duel.emit?.({townGate:true});
      }
    }
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
  const playerView = {position: point, s: player.s, lateral: player.lateral,
    speed: player.speedMph ?? 0};
  const currentStep = worldJob.job.steps[worldJob.job.stepIndex];
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
    if (actor && Number.isFinite(hit.damage)) actor.health = Math.max(0, actor.health - hit.damage);
  }
  const targetActor = worldJob.actors.find(actor => actor.id === worldJob.job.steps[worldJob.job.stepIndex]?.targetId);
  const contact = targetActor && Math.hypot(point.x - targetActor.position.x, point.z - targetActor.position.z) <=
    (worldJob.job.steps[worldJob.job.stepIndex]?.contactRadius ?? 3)
    ? targetActor.id : null;
  const actors = [...worldJob.actors.map((actor, index) => ({id: actor.id ?? `raider-${index}`,
    position: actor.position ?? {x: actor.x, y: actor.y, z: actor.z}, health: actor.knockedDown ? 0 : actor.health,
    pathProgress: actor.pathProgress, atDestination: actor.atDestination, pathIndex: actor.pathIndex,
    // How far an escorted truck has gone along its road, for the step's sayAtShare lines (0 to 1).
    ...(currentStep?.sayAtShare && actor.id === currentStep.actorId && actor.position ?
      {share: pathShare(actor.position, actor.pathIndex, currentStep.path).share} : {})})),
  ...state.opponents.map((actor, index) => ({id: actor.jobId ?? `cpu-${index + 1}`,
    position: position(duel, actor), health: actor.armor}))];
  const view = {player: playerView, onFoot: !!state.onFoot,
    fighter: state.fighter ? {...state.fighter, position: point} : null,
    carPosition: position(duel, state),
    actors, crashSize: state.lastCrashSize || 0,
    thingsHit,
    carrying: worldJob.carrying, inventory: worldJob.inventory ?? [], lamps: worldJob.job.steps[worldJob.job.stepIndex]?.lamps ?? [],
    places: worldJob.places ?? {}, placeHealth: worldJob.placeHealth,
    difficulty: state.cpuDifficulty, controls:worldJob.controls??{}, interact:state.input?.interact===true,
    grapple:(state.crewGear?.id==='grapple'&&state.footWeapons?.selected===state.crewGear.id)||state.input?.interact===true,
    train:worldJob.actors.find(actor=>actor.train),
    contact, waveCleared: worldJob.clearedWaves};
  const previousStep = worldJob.job.stepIndex;
  const next = stepJob(worldJob.job, view, dt);
  worldJob.job = next;
  // The moment a step began its closing lines: the scene times the furnace's sighting after Job 3's catch from it.
  if (next.stepState.linesClosing && !Number.isFinite(worldJob.wonAtSec)) worldJob.wonAtSec = worldJob.clockSec;
  // FIELD-BATTLE-ASH: how the battle ended, fixed by the escort step the moment Big Bess arrived ('won' or 'arrived').
  if (next.stepState.ending) worldJob.battleEnding = next.stepState.ending;
  state.worldJobThingsHit = [];
  moveJobRaiders(worldJob, dt);
  updateJobActors(duel, worldJob, dt);
  if (next.stepIndex !== previousStep) {
    worldJob.clearedWaves = [];
    // EVERBURN-PLAY-FIXES: when a defence ends the raiders still standing are removed, so none is left piled at the well.
    if (currentStep?.kind === 'defend') removeWaveRaiders(duel, worldJob, previousStep);
  }
  if (next.stepIndex !== previousStep) applyStepLoan(duel, worldJob);
  for (const event of next.events) {
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
      const start = path?.[Math.max(0, (truck?.pathIndex ?? 1) - 1)];
      if (truck && start) {
        truck.position = {...(start.position ?? start)};
        // After a rest she has at least REST_HEALTH_MINIMUM, and more if she had more when the stretch began.
        truck.health = Math.max(truck.stretchHealth ?? 0, REST_HEALTH_MINIMUM);
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
    if(event.type==='roofBoard'&&state.fighter) {
      Object.assign(state.fighter,{x:event.position.x,y:event.position.y,z:event.position.z,groundY:event.position.y});
      worldJob.roofRide={x:event.position.x,y:event.position.y,z:event.position.z};
    }
    if (event.type === 'done') {
      worldJob.settled = true;
      if (worldJob.definition.battle === true) settleBattle(worldJob);
      state.weaponLoadout = [...(worldJob.originalWeaponLoadout || [])];
      if (worldJob.originalCrewId) state.crewId = worldJob.originalCrewId;
      if (worldJob.originalFootWeaponSelected && state.footWeapons)
        state.footWeapons.selected = worldJob.originalFootWeaponSelected;
      initializeCrewGear(duel);
      return {reason: 'job-complete', winnerId: 'player'};
    }
  }
  applyRequests(duel, worldJob, next.requests);
  worldJob.controls=null;
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

// Combat paths call this after a real projectile or flame contact. It only
// records job evidence; it does not alter projectile, damage, or hit results.
export function reportWorldJobThingHit(duel, hit) {
  const state = duel.state, worldJob = state.arena?.worldJob;
  if (!worldJob || !hit?.id) return false;
  state.worldJobThingsHit ??= [];
  if (state.worldJobThingsHit.some(item => item.id === hit.id)) return false;
  state.worldJobThingsHit.push({...hit});
  return true;
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
    const at = barrier.position ?? barrier;
    targets.push({id: barrier.id, kind: 'barricade', position: at,
      radius: 2, burnable: true});
  }
  return targets;
}

export function worldJobPilotGoal(duel, actor) {
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
