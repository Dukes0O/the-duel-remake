import {digMachineIds} from './controls-view.js';
import {createMachineHaul, operateMachineHaul, stepMachineHaul} from './haul.js';
import {machineToolPosition, stepMachine} from './machine.js';
import {machineLoadVolume} from './tools.js';
import {machineDefinition} from './content/machines.js';
import {createGroundEdit} from '../world/ground-edit.js';
import {createGroundTunnels} from '../world/ground-tunnels.js';
import {HILLS} from '../world/scablands-height.js';
import {borerApprenticeControls, borerCutLesson, borerHasFace, createBorerState, stepBorer} from './borer.js';
import {advanceDelegatedWork, canDelegate, recordBorerLesson} from '../town/town-apprentices.js';
import {createWorkOrder} from '../town/town-work.js';
import {resetScablandsGroundEdit, scablandsNaturalHeightAt, setScablandsGroundEdit} from '../world/scablands-ground.js';
import {SCABLANDS_PLACES} from '../world/scablands.js';
import {solidsNear} from '../world/scablands-solids.js';
import {ROAD_NET} from '../world/scablands-road.js';
import {RIVER, RIVER_LAND, riverDistanceAt} from '../world/scablands-regions.js';
import {createTrencherState, stepTrencher} from './trencher.js';
import {createDrillRigState, stepDrillRig} from './drill.js';
import {createRoadMachineState, createRoadWork, stepRoadMachine} from './roads.js';
import {machineControlInput} from '../input-contexts.js';
import {createYardPlant, fillYardRockHeap, isPlantMachine, stepYardPlant, tipTruckIntoHopper} from './plant-yard.js';
import {machineFootprint, machineMoveContact, stoppedControls} from './yard-solids.js';

// The bucket reaches about 8.6 m from the excavator. The truck's
// bed is that far to the player's left and the heap that far to the right, so a swing reaches each.
export const DIG_REACH_M = 8.6;
const YARD = Object.freeze({excavator:{x:0,z:18}, dumpTruck:{x:DIG_REACH_M,z:18.7}, trencher:{x:24,z:10}});
export const DIG_HEAP = Object.freeze({x:-DIG_REACH_M,z:18});
// An old dozer stands by the Dome for good. It is drawn by the yard view and is as solid as the working machines.
export const PARKED_DOZER = Object.freeze({x:-24,z:12,heading:0.5});
const RESERVATIONS = Object.freeze([
  {x:0,z:120,radius:78,sentence:'The Dome is built here. Dig around it.'},
  {x:-90,z:120,radius:62,sentence:'The Dome is built here. Dig around it.'},
  {x:90,z:120,radius:62,sentence:'The Dome is built here. Dig around it.'},
  {x:0,z:1120,radius:18,sentence:'The gate is protected ground. Dig around it.'},
  ...SCABLANDS_PLACES.map(place=>({x:place.x,z:place.z,radius:place.flatRadius,
    sentence:place.id === 'tin-town' ? "That's Tin Town. Auntie Solder would have words." :
      `${place.name} is a story place. Dig around it.`})),
]);
const STEP = 1 / 60;

/** Use the machines' drive mapping for thrust and steering; arrows set the slope. */
export function borerYardControls(keys = {}, pad = null, mapping = null, mode = 'work') {
  const keyboard = machineControlInput(keys, null, 'drive');
  const drive = machineControlInput({}, pad, 'drive', mapping);
  const keyboardSlope = Number(!!keys.ArrowUp) - Number(!!keys.ArrowDown);
  const axis = mapping?.slope;
  const value = Number.isInteger(axis) && axis >= 0 ? -(pad?.axes?.[axis] || 0) : 0;
  return {forward:keyboard.forward || drive.forward, keyboardLever:!!keyboard.forward, padLever:mode === 'work' && !!pad, steer:keyboard.steer || drive.steer,
    slope:keyboardSlope || (Math.abs(value) < .12 ? 0 : Math.max(-1, Math.min(1, value)))};
}

/** Park outside the mesa's steep side, facing its centre. */
export function createDigBorer(ground) {
  const mesa = HILLS.filter(hill => hill.kind === 'mesa').reduce((nearest, hill) =>
    Math.hypot(hill.x - 2214, hill.z + 518) < Math.hypot(nearest.x - 2214, nearest.z + 518) ? hill : nearest);
  let angle = mesa.rampAngle + Math.PI / 2;
  if (mesa.x * Math.cos(angle) + mesa.z * Math.sin(angle) > 0) angle += Math.PI;
  // The land's rim has a small five-lobed edge, followed by the steep face.
  const foot = mesa.radius + 8 * Math.sin(angle * 5) + mesa.face;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  const x = mesa.x + (foot + 30) * dx, z = mesa.z + (foot + 30) * dz;
  return createBorerState({x, y:ground.heightAt(x,z), z, heading:Math.atan2(-dx,-dz)});
}

// A raised patch followed by a shallow ditch gives the blade material to carry.
// These are yard-only cells, separate from the town and from the ground save.
function yardRoadWork(ground) {
  const work = createRoadWork();
  for (let z = 12; z <= 19; z++) {
    const height = z < 16 ? 1 : -1;
    ground.setHeight(40, z, height);
    work.cells[`40:${z}`] = {height, spread:0, compaction:0, surface:0, roughness:0};
  }
  return work;
}

/** Frame edges stay queued until a simulation step consumes them. */
export function createPendingDigActions(){
  const pending=new Set();
  return Object.freeze({push(action){pending.add(action);},consume(action){if(!pending.has(action))return false;pending.delete(action);return true;}});
}

function newGround(seed) {
  return createGroundEdit({region:{id:'scablands',editable:true},seed,naturalHeight:scablandsNaturalHeightAt,
    reservedShapes:RESERVATIONS});
}

// Test a round bore against a turned footprint in the land's own coordinates.
function touchesFootprint(shape, footprint) {
  const dx = shape.x - footprint.x, dz = shape.z - footprint.z;
  const cos = Math.cos(footprint.heading || 0), sin = Math.sin(footprint.heading || 0);
  const x = dx * cos - dz * sin, z = dx * sin + dz * cos;
  return Math.hypot(Math.max(0, Math.abs(x) - footprint.halfX),
    Math.max(0, Math.abs(z) - footprint.halfZ)) <= shape.radius;
}

// A deck's footprint depends only on the land, not on the place asked about.
function crossingDecks(near, net, crossings) {
  const decks = [];
  for (const crossing of crossings) {
    if (crossing.deckHalfWidth === undefined) continue;
    const hit = net.nearest(crossing.x, crossing.z);
    if (!hit) continue;
    const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1];
    const supports = near(crossing.x, crossing.z, crossing.x, crossing.z, crossing.deckHalfWidth + 2);
    const halfLength = Math.max(0, ...supports.filter(solid => solid.kind === 'girder').map(solid => solid.halfZ));
    decks.push({...crossing, halfX:crossing.deckHalfWidth, halfZ:halfLength,
      heading:Math.atan2(b.x - a.x, b.z - a.z)});
  }
  return decks;
}
// QA-BORER-SUITE-TIME: the land's own solids, roads and crossings never change, and Mabel asks
// about hundreds of spoil cells a step, so their decks are worked out once. A check that supplies
// its own land still has its decks worked out on every call.
let landDecks = null;

/** Protect the land's own structures, decks and public roads from the bore. */
export function borerLandRefusal(shape, ground, {near = solidsNear, net = ROAD_NET, crossings = RIVER_LAND.crossings} = {}) {
  const existing = ground.refusal(shape);
  if (existing) return existing;
  for (const solid of near(shape.x, shape.z, shape.x, shape.z, shape.radius))
    if (touchesFootprint(shape, solid)) return 'She will not cut there. Something stands in the way.';
  const decks = near === solidsNear && net === ROAD_NET && crossings === RIVER_LAND.crossings
    ? (landDecks ??= crossingDecks(near, net, crossings)) : crossingDecks(near, net, crossings);
  for (const deck of decks)
    if (touchesFootprint(shape, deck)) return 'She will not cut there. Something stands in the way.';
  // The road index accepts points. Surround the bore with a circumscribed
  // octagon so its whole footprint, including its edge, is protected.
  if (net.nearest(shape.x, shape.z)) return 'She will not cut there. Something stands in the way.';
  const reach = shape.radius / Math.cos(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    if (net.nearest(shape.x + reach * Math.cos(angle), shape.z + reach * Math.sin(angle)))
      return 'She will not cut there. Something stands in the way.';
  }
  return null;
}

/** Spoil must also stay out of the river bed and its banks. */
export function borerSpoilRefusal(shape, ground) {
  if (riverDistanceAt(shape.x, shape.z) <= RIVER.rampLipHalfWidth + shape.radius)
    return 'She will not cut there. Something stands in the way.';
  return borerLandRefusal(shape, ground);
}

function roadGround(edit) {
  return {
    refusal(x,z) { return edit.refusal({x,z,radius:0.1}); },
    height(x,z) { return edit.heightAt(x,z) - scablandsNaturalHeightAt(x,z); },
    setHeight(x,z,height) {
      const shape = {x,z,radius:0.1};
      const target = scablandsNaturalHeightAt(x,z) + height;
      const before = edit.heightAt(x,z);
      const difference = target - before;
      if (difference > 0) edit.fill(shape, 'topsoil', difference * 1.25);
      else if (difference < 0) edit.cut(shape, target);
    },
  };
}

const suppliedGroundWork = new WeakMap();

/** Use the player's current difficulty for this visit, without reading a save. */
export function createDigSandboxForApp(app) {
  return createDigSandbox({playerId:app?.player?.id ?? 'player', easy:app?.cpuDifficulty === 'easy', town:(app?._switches?.() ?? app?.duel?.featureFlags)?.enabled('wasteland-town') === true});
}

/** Make the free yard simulation. This module has no DOM, renderer or career-save access. */
export function createDigSandbox({seed = 1, ground = null, playerId = 'player', protectLand = !ground, easy = false, town = true} = {}) {
  const edit = ground || newGround(seed);
  const memory = globalThis.__theDigGroundMemory ??= {};
  const saved = memory[playerId];
  let loaded = false;
  if (!ground && saved?.version === 1) {
    try { edit.loadSave(saved); loaded = true; } catch { /* An old in-memory shape is ignored safely. */ }
  }
  // TOWN-STORE replaces this page-lifetime memory save; career storage is never used.
  if (!ground && !loaded) {
    for(const [radius,volume] of [[0.8,4],[1.6,7],[2.6,11]])edit.fill({x:DIG_HEAP.x,z:DIG_HEAP.z,radius},'topsoil',volume);
    if (town) fillYardRockHeap(edit);
    memory[playerId]=edit.toSave();
  }
  setScablandsGroundEdit(edit);
  const haul = createMachineHaul({ground:edit,excavator:YARD.excavator,truck:YARD.dumpTruck});
  const roadMemory = globalThis.__theDigRoadMemory ??= {};
  const priorRoad = ground ? suppliedGroundWork.get(edit) : roadMemory[playerId];
  const roadWork = priorRoad ?? (loaded ? createRoadWork() : yardRoadWork(roadGround(edit)));
  if (ground) suppliedGroundWork.set(edit, roadWork);
  else {
    roadMemory[playerId] = roadWork;
    memory[playerId] = edit.toSave();
  }
  return {ground:edit,protectLand,easy, apprenticeTown:{people:[{id:'pim', name:'Pim'}], apprenticeships:[], borerLessons:[], book:[]}, borerWatching:{}, boreOrders:[], completedTunnels:[],tunnels:createGroundTunnels([], {heightAt:(x,z)=>edit.heightAt(x,z)}),playerId,haul,borer:createDigBorer(edit),trencher:createTrencherState(YARD.trencher),
    drill:createDrillRigState(seed,{x:YARD.trencher.x+8,z:YARD.trencher.z}),
    roadWork, roadMachines:Object.fromEntries(['dozer','roller','paver'].map((kind,index)=>
      [kind,createRoadMachineState(kind,{x:40+index*6,z:10})])),activeMachine:'excavator',
    plant:town ? createYardPlant({playerId, remember:!ground}) : null, plantSupplied:!!ground,
    town,cameraIndex:0,mode:'work',fixedCarry:0,elapsed:0,events:[],lastMessage:'',dirty:false,
    excavatedM3:0,loadedM3:0,tippedM3:0};
}

/** Keep a completed tunnel index for later cuts in this visit. */
export function rememberDigTunnel(sim) {
  if (!sim.borer.reachedDaylight || !sim.tunnels.segments.length || sim.completedTunnels.includes(sim.tunnels)) return sim;
  return {...sim, completedTunnels:[...sim.completedTunnels, sim.tunnels]};
}

/** Copy the current visit's tunnels into plain data, without writing a store. */
export function exportDigTunnels(sim) {
  return sim.tunnels.segments;
}

/** Rebuild the current visit's tunnels from plain data, without reading a store. */
export function importDigTunnels(sim, segments = []) {
  return {...sim, tunnels:createGroundTunnels(segments, {heightAt:(x,z)=>sim.ground.heightAt(x,z)})};
}

/** Leaving the yard hands the Scablands back with its own ground, so a later job is unchanged. */
export function closeDigSandbox() { resetScablandsGroundEdit(); }

export function switchDigMachine(sim) {
  const ids=digMachineIds(sim.town);
  const activeMachine=ids[(ids.indexOf(sim.activeMachine)+1)%ids.length];
  return {...sim,activeMachine,mode:activeMachine==='excavator' || (activeMachine==='borer' && sim.boreOrders.some(order => order.id === sim.activeBoreId && order.status !== 'finished'))?'work':'drive',daylightMessage:'', borePlayerAtLever:false};
}

/** Visit the active bore without changing its work or taking the lever. */
// Browser checks can skip the two long demonstrations without changing saves.
export function teachBorerForCheck(sim) {
  const town = {...sim.apprenticeTown, apprenticeships:[], borerLessons:[], book:[]};
  const personId = town.people[0].id;
  const lesson = {errorM:0, stallsPer100M:0, pace:1};
  recordBorerLesson(town, personId, lesson);
  recordBorerLesson(town, personId, lesson);
  return {...sim, apprenticeTown:town};
}

export function visitBore(sim, id) {
  if (!sim.boreOrders.some(order => order.id === id && order.id === sim.activeBoreId && order.status !== 'finished')) return sim;
  return {...sim, activeMachine:'borer', mode:'work', cameraIndex:0, borePlayerAtLever:false};
}

/** Take or return the lever on the bore currently being cut. */
export function toggleBoreLever(sim) {
  if (sim.activeMachine !== 'borer' || !sim.boreOrders.some(order =>
    order.id === sim.activeBoreId && order.status !== 'finished')) return sim;
  return {...sim, mode:'work', borePlayerAtLever:!sim.borePlayerAtLever};
}

export function cycleDigCamera(sim) { return {...sim,cameraIndex:(sim.cameraIndex+1)%(sim.activeMachine==='borer'?2:3)}; }

/** Record only what happened during this hand cut, without sampling the ground. */
export function watchBorerCut(watching, before, after, survey, reachedDaylight = false) {
  const next = {...watching};
  if (!before.started && survey && Number.isFinite(survey.riseM) && survey.distanceM > 0) {
    next.survey = true;
    next.grade = survey.riseM / survey.distanceM;
    next.surveyDistanceM = survey.distanceM;
    next.surveyRiseM = survey.riseM;
  }
  if (before.stalled && !after.stalled) next.freedStall = true;
  const cut = Math.max(0, after.distanceM - before.distanceM);
  if (cut && Number.isFinite(next.grade)) {
    next.gradeMetres = Math.abs(Math.tan(after.slope) - next.grade) <= 1 / 50 + 1e-9
      ? (next.gradeMetres || 0) + cut : 0;
    if (next.gradeMetres >= 50 - 1e-8) next.heldGrade = true;
  }
  if (reachedDaylight) next.daylight = true;
  return next;
}

export function borerWatchingWords(sim) {
  const name = sim.apprenticeTown.people[0].name;
  const seen = sim.borerWatching || {};
  const words = [`${name} is riding with you. Cut two tunnels and ${name} can cut the rest.`];
  for (const [key, action] of [['survey','read the survey'], ['freedStall','free a stall'],
    ['heldGrade','hold a grade'], ['daylight','come out to daylight']]) {
    if (seen[key]) words.push(`${name} has seen you ${action}.`);
  }
  if (seen.survey && sim.apprenticeTown.borerLessons.length === 1) {
    const rise = seen.surveyRiseM;
    words.push(`${name}: The far side is ${seen.surveyDistanceM} m on and ${Math.abs(rise).toFixed(1)} m ${rise >= 0 ? 'higher' : 'lower'}.`);
  }
  if (sim.apprenticeTown.apprenticeships.some(record => record.kind === 'bore'))
    words.push(`${name} can run her now. At a face, choose Send ${name}.`);
  return words;
}

/** The selected machine can survey the next face while Mabel is away. */
export function digBoreSurveyPosition(sim) {
  const actor = digSandboxMachineState(sim);
  if (sim.activeMachine === 'borer') return actor.started ? null : actor;
  return {x:actor.x, z:actor.z, y:sim.ground.heightAt(actor.x, actor.z), heading:actor.heading};
}

/** A survey belongs to the face where it was read. */
export function canSendBorer(sim, survey) {
  const b = digBoreSurveyPosition(sim);
  const person = sim.apprenticeTown.people[0];
  if (!b || !person || !canDelegate(sim.apprenticeTown, person.id, 'bore') ||
      !survey || !Number.isFinite(survey.distanceM) || survey.distanceM <= 0 || !Number.isFinite(survey.riseM) ||
      !['x','y','z','heading'].every(key => Number.isFinite(survey[key]) &&
        survey[key].toFixed(key === 'heading' ? 3 : 1) === b[key].toFixed(key === 'heading' ? 3 : 1))) return false;
  if (sim.boreOrders.some(order => order.mouth.x === b.x && order.mouth.z === b.z && order.heading === b.heading)) return false;
  const ground = sim.ground;
  const refusal = sim.protectLand ? borerLandRefusal({x:b.x, z:b.z, radius:machineDefinition('borer').boreRadiusM}, ground)
    : ground.refusal({x:b.x, z:b.z, radius:machineDefinition('borer').boreRadiusM});
  return !refusal && borerHasFace(ground, b, b.heading);
}

/** Queue the town's work order, keeping the surveyed line in this visit only. */
export function sendBorer(sim, survey) {
  if (!canSendBorer(sim, survey)) return sim;
  const person = sim.apprenticeTown.people[0];
  const id = `bore-${sim.boreOrders.length + 1}`;
  const order = createWorkOrder({id, targetId:id, targetKind:'bore',
    stages:[{kind:'bore', amount:survey.distanceM, workHours:survey.distanceM / 1800}]});
  Object.assign(order, {personId:person.id, mouth:{x:survey.x, y:survey.y, z:survey.z},
    heading:survey.heading, grade:survey.riseM / survey.distanceM, metres:survey.distanceM, survey});
  return {...sim, boreOrders:[...sim.boreOrders, order]};
}

/** Describe the orders without sampling the ground or changing the work. */
export function boreBoard(sim) {
  return sim.boreOrders.map(order => {
    const person = sim.apprenticeTown.people.find(item => item.id === order.personId);
    const apprentice = sim.apprenticeTown.apprenticeships.find(item => item.personId === order.personId && item.kind === 'bore');
    const active = order.id === sim.activeBoreId && order.status !== 'finished';
    const done = order.result?.distanceM ?? order.stages[0].completed;
    const remaining = Math.max(0, order.metres - done);
    const drift = active ? sim.borer.y - (order.mouth.y + order.grade * done) : 0;
    const rate = apprentice?.rate || 0;
    const minutes = rate > 0 ? (remaining / (.5 * rate) + remaining / 100 * (apprentice.stallsPer100M || 0) * 20 + (active ? sim.boreStallSeconds || 0 : 0)) / 60 : null;
    return {id:order.id, name:person?.name || 'Apprentice', finished:order.status === 'finished',
      active, playerCutting:active && sim.borePlayerAtLever, done, remaining, drift, stalls:order.result?.stalls ?? (active ? sim.borer.stallCount : 0),
      minutes, offLevel:order.result?.offLevelM ?? null};
  });
}

export function boreBoardWords(row) {
  const title = `Bore ${row.id.replace(/^bore-/, '')}`;
  if (row.finished) return `${title}: ${row.name} finished ${row.done.toFixed(1)} m, ${row.offLevel.toFixed(1)} m off level.`;
  if (!row.active) return `${title}: waiting. ${row.remaining.toFixed(1)} m.`;
  const time = row.minutes === null ? 'Time to daylight is unknown.' : `About ${Math.ceil(row.minutes)} minutes to daylight.`;
  return `${title}: ${row.playerCutting ? 'You are' : `${row.name} is`} cutting. ${row.done.toFixed(1)} m cut, ${row.remaining.toFixed(1)} m to go. Floor ${Math.abs(row.drift).toFixed(1)} m ${row.drift < 0 ? 'below' : 'above'} the line. ${row.stalls} ${row.stalls === 1 ? 'stall' : 'stalls'}. ${time}`;
}

/** Advance one order with the real cutter; the caller owns its tunnel index. */
export function stepDelegatedBore({town, order, borer, ground, tunnels, stallSeconds = 0, playerControls = null}, dtSeconds) {
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) throw new TypeError('Work time must be non-negative.');
  if (dtSeconds === 0) return {order, borer, stallSeconds, events:[]};
  const apprentice = town.apprenticeships.find(record => record.personId === order.personId && record.kind === 'bore');
  let cutter = borer;
  let hands = borerApprenticeControls(borer, order, apprentice, dtSeconds);
  // Space learned mistakes along the cut. Keep pressing until the cutter's own
  // overload rules produce the stall, then wait for the next interval.
  const learnedStalls = order.learnedStalls || 0;
  const stallRate = Math.max(0, apprentice.stallsPer100M || 0);
  const makingMistake = stallRate > 0 && borer.distanceM >= (learnedStalls + 1) * 100 / stallRate;
  if (playerControls) {
    const input = Math.max(-1, Math.min(1, playerControls.forward || 0));
    const oldLever = borer.lever || 0;
    const leverSource = playerControls.keyboardLever ? 'keyboard' : playerControls.padLever && Math.abs(input) > .12 ? 'pad' : borer.leverSource;
    const direct = playerControls.directLever || (playerControls.padLever && leverSource === 'pad' && !playerControls.keyboardLever);
    const lever = direct ? Math.max(0, input) : Math.max(0, Math.min(1, oldLever + input * (input > 0 ? .25 : .5) * dtSeconds));
    cutter = {...borer, lever, leverSource};
    hands = {thrust:input < 0 && oldLever <= 0 && lever <= 0 ? input : lever,
      steer:playerControls.steer, slope:playerControls.slope};
  } else {
    if (makingMistake && !borer.stalled && stallSeconds <= 0) hands.thrust = 1;
    if (stallSeconds > 0) hands.thrust = 0;
    // Three short attempts do not ease the lever for the full second Mabel
    // needs. After that Pim keeps it released for the rest of the wait.
    if (borer.stalled && stallSeconds > 18.5 && stallSeconds <= 20)
      hands.thrust = (20 - stallSeconds) % .5 < .25 ? 0 : 1;
  }
  const result = stepBorer(cutter, {...hands, tunnels, tunnelsIncludeCurrent:borer.started, mutableSegments:true}, ground, null, dtSeconds);
  const nextOrder = {...order, stages:order.stages.map(stage => ({...stage}))};
  if (result.events.some(event => event.type === 'stall')) nextOrder.failedStallReleases = 0;
  if (!playerControls && borer.stalled && borer.releaseSeconds > 0 && hands.thrust > 0 && result.state.stalled)
    nextOrder.failedStallReleases = (nextOrder.failedStallReleases || 0) + 1;
  if (!playerControls && makingMistake && result.events.some(event => event.type === 'stall'))
    nextOrder.learnedStalls = learnedStalls + 1;
  const daylight = result.events.some(event => event.type === 'daylight');
  const name = town.people.find(person => person.id === order.personId)?.name || 'Apprentice';
  if (nextOrder.failedStallReleases >= 3 && !nextOrder.stallCalled) {
    nextOrder.stallCalled = true;
    result.events.push({type:'bore-call', cue:'borer.call',
      message:`${name}: She's stopped at ${result.state.distanceM.toFixed(1)} m. Hard rock. Come and look, or I'll keep at it.`});
  }
  const drift = result.state.y - (order.mouth.y + order.grade * result.state.distanceM);
  if (!nextOrder.driftCalled && Math.abs(drift) > 1) {
    nextOrder.driftCalled = true;
    result.events.push({type:'bore-call', cue:'borer.call',
      message:`${name}: We're ${Math.abs(drift).toFixed(1)} m off the line at ${result.state.distanceM.toFixed(1)} m. Come and set her straight.`});
  }
  const highExit = result.events.find(event => event.reason === 'high-exit');
  if (highExit && !nextOrder.highExitCalled) {
    nextOrder.highExitCalled = true;
    result.events.push({type:'bore-call', cue:'borer.call',
      message:`${name}: She is ${highExit.heightM.toFixed(1)} m up the face. Please tip spoil below the mouth so she can get out.`});
  }
  if (daylight) {
    const event = result.events.find(item => item.type === 'daylight');
    event.type = 'bore-daylight';
    event.message = `${name}: Daylight. She is through, ${Math.abs(result.state.y - order.mouth.y).toFixed(1)} m off level.`;
  }
  advanceDelegatedWork(town, nextOrder, order.personId, dtSeconds / 60, {}, {
    boreCut:{metres:Math.max(0, result.state.distanceM - borer.distanceM), daylight},
  });
  const nextStallSeconds = result.events.some(event => event.type === 'stall')
    ? 20 : Math.max(0, stallSeconds - dtSeconds);
  return {order:nextOrder, borer:result.state, stallSeconds:nextStallSeconds, events:result.events};
}

/** Run the first unfinished order once per simulation step. */
function advanceDigBore(sim, input) {
  const index = sim.boreOrders.findIndex(order => order.status !== 'finished');
  if (index < 0) return {sim, events:[]};
  const order = sim.boreOrders[index];
  const starting = sim.activeBoreId !== order.id;
  const borer = starting ? createBorerState({...order.mouth, heading:order.heading}) : sim.borer;
  const tunnels = starting ? createGroundTunnels([], {heightAt:(x,z)=>sim.ground.heightAt(x,z)}) : sim.tunnels;
  const oldCount = borer.segments.length;
  const ground = sim.protectLand ? {...sim.ground, refusal:shape=>borerLandRefusal(shape,sim.ground),
    spoilRefusal:shape=>borerSpoilRefusal(shape,sim.ground)} : sim.ground;
  const result = stepDelegatedBore({town:sim.apprenticeTown, order, borer, ground, tunnels,
    stallSeconds:starting ? 0 : sim.boreStallSeconds,
    playerControls:!starting && sim.activeMachine === 'borer' && sim.borePlayerAtLever ? input.controls || {} : null}, STEP);
  const changed = result.borer.distanceM !== borer.distanceM ||
    result.events.some(event => event.type === 'breakthrough' || event.type === 'bore-daylight');
  if (changed) {
    if (oldCount) tunnels.extendLast(result.borer.segments[oldCount-1]);
    for (let i=oldCount; i<result.borer.segments.length; i++) tunnels.extendLast(result.borer.segments[i],true);
  }
  const boreOrders = sim.boreOrders.slice();
  if (result.order.status === 'finished') {
    result.order.result = {distanceM:result.borer.distanceM,
      offLevelM:Math.abs(result.borer.y - order.mouth.y), stalls:result.borer.stallCount};
  }
  boreOrders[index] = result.order;
  let next = {...sim, boreOrders, borer:result.borer, tunnels, activeBoreId:order.id,
    borerCutSurvey:starting ? order.survey : sim.borerCutSurvey,
    borerDaylightMessage:result.events.find(event => event.type === 'bore-daylight')?.message || (starting ? '' : sim.borerDaylightMessage),
    boreStallSeconds:result.stallSeconds, borePlayerAtLever:result.order.status === 'finished' ? false : sim.borePlayerAtLever,
    dirty:sim.dirty || changed};
  if (result.order.status === 'finished') next = rememberDigTunnel(next);
  return {sim:next, events:result.events};
}

const MACHINE_NAMES = Object.freeze({excavator:'excavator', dumpTruck:'dump truck', trencher:'trencher', drill:'drill rig',
  dozer:'dozer', roller:'road roller', paver:'paver', loader:'loader', mixer:'mixer truck', parked:'old dozer'});

/** Every machine standing in the yard except the one being driven, as solid footprints. Mabel works in her own bore. */
export function yardSolids(sim, exceptId = sim.activeMachine) {
  const solids = [{...machineFootprint('dozer', PARKED_DOZER), id:'parked'}];
  for (const id of digMachineIds(sim.town)) {
    if (id === exceptId || id === 'borer' || (isPlantMachine(id) && !sim.plant)) continue;
    solids.push(machineFootprint(id, digSandboxMachineState(sim, id)));
  }
  return solids;
}

/**
 * Try the driven machine's move before any work is done with it. A move into another machine is not made: the
 * machine stands still for this step with its work controls kept, and the first stop at speed is announced once.
 */
function holdAgainstSolids(sim, id, machine, controls, definition = machineDefinition(id)) {
  const after = stepMachine(definition, machine, controls, STEP);
  const solid = machineMoveContact(id, machine, after, yardSolids(sim, id));
  if (!solid) return {machine, controls, events:[]};
  const events = Math.abs(machine.speedMps) > 0.05 ? [{type:'machine-contact', cue:'machine-contact', machine:id, with:solid.id,
    message:`The ${MACHINE_NAMES[id]} has stopped against the ${MACHINE_NAMES[solid.id]}.`}] : [];
  return {machine:{...machine, speedMps:0}, controls:stoppedControls(controls), events};
}

/** Apply one fixed simulation step. Actions and ground edits never run in rendering. */
function fixedStep(sim,input) {
  const boreWasActive = sim.boreOrders.some(order => order.status !== 'finished');
  let bore={sim,events:[]};
  const stopBorer = error => {
    console.error('Mabel stopped:', error);
    const message='Mabel has stopped. Back her up and try again.';
    return {...sim, borer:{...sim.borer,lever:0,headSpeed:0}, borerFault:true, lastMessage:message};
  };
  // Do not repeatedly call a failed cutter. The player can back her up to retry.
  if (sim.borerFault && sim.activeMachine === 'borer' && (input.controls?.forward || 0) < 0)
    sim={...sim,borerFault:false, borePlayerAtLever:boreWasActive ? true : sim.borePlayerAtLever};
  if (!sim.borerFault) {
    try { bore=advanceDigBore(sim,input); }
    catch (error) { bore={sim:stopBorer(error),events:[]}; }
  } else bore={sim,events:[]};
  sim=bore.sim;
  const events=[...bore.events]; let next=sim;
  if(sim.activeMachine==='borer' && (boreWasActive || sim.borerFault)){
    // The active order advances above, whether the apprentice or player holds the lever.
  } else if(sim.activeMachine==='borer'){
    try {
    const controls=input.controls ?? {};
    if (!sim.borer.started && input.borerSurvey)
      next={...next,borerWatching:watchBorerCut(sim.borerWatching,sim.borer,sim.borer,input.borerSurvey)};
    if(sim.mode==='drive' && (!sim.borer.started || sim.borer.finished)){
      const forward=Math.max(-1,Math.min(1,controls.forward || 0));
      if (sim.borer.finished && (sim.borer.travelM < sim.borer.distanceM - 1e-8) && forward !== 0) {
        const result=stepBorer(sim.borer,{thrust:forward},sim.ground,null,STEP);
        next={...next,borer:{...result.state,headSpeed:0}};
      } else if (sim.borer.finished && ((sim.borer.outsideM || 0) > 0 || forward > 0)) {
        const outsideM = Math.max(0, (sim.borer.outsideM || 0) + forward * (4/3.6) * STEP);
        const move = outsideM - (sim.borer.outsideM || 0);
        const x = sim.borer.x + Math.sin(sim.borer.heading) * move;
        const z = sim.borer.z + Math.cos(sim.borer.heading) * move;
        const refusal = sim.ground.refusal({x,z,radius:3});
        if (!refusal) {
          const y=sim.ground.heightAt(x,z);
          // Clear the whole machine from the mouth before freeing it for a new cut.
          const borer=sim.borer.reachedDaylight && outsideM>=12
            ? createBorerState({x,y,z,heading:sim.borer.heading,name:sim.borer.name})
            : {...sim.borer,x,z,outsideM,y,headSpeed:0};
          next={...next,borer, ...(borer.started ? {} : {borerWatching:{}})};
        }
        else next={...next,lastMessage:refusal};
      } else if (sim.borer.finished && forward < 0) {
        const result=stepBorer(sim.borer,{thrust:forward},sim.ground,null,STEP);
        next={...next,borer:{...result.state,headSpeed:0}};
      } else {
      const steer=Math.max(-1,Math.min(1,controls.steer || 0));
      const heading=sim.borer.heading-steer*0.25*STEP*Math.abs(forward);
      const x=sim.borer.x+Math.sin(heading)*forward*(4/3.6)*STEP;
      const z=sim.borer.z+Math.cos(heading)*forward*(4/3.6)*STEP;
      const refusal=sim.ground.refusal({x,z,radius:3});
      if(!refusal) next={...next,borer:{...sim.borer,x,z,heading,y:sim.ground.heightAt(x,z),headSpeed:0}};
      else next={...next,lastMessage:refusal};
      }
    } else if (sim.mode === 'drive') {
      // Once inside the bore, cutting and tunnel travel belong to work mode.
      next={...next,borer:{...sim.borer,headSpeed:0}};
    } else {
      const oldLever=sim.borer.lever || 0;
      const thrustInput=Math.max(-1,Math.min(1,controls.forward || 0));
      const leverSource=controls.keyboardLever ? 'keyboard' : controls.padLever && Math.abs(thrustInput) > .12 ? 'pad' : sim.borer.leverSource;
      const direct=controls.directLever || (controls.padLever && leverSource === 'pad' && !controls.keyboardLever);
      const lever=direct ? Math.max(0,thrustInput) : Math.max(0,Math.min(1,oldLever + thrustInput * (thrustInput > 0 ? .25 : .5) * STEP));
      const thrust=thrustInput < 0 && oldLever <= 0 && lever <= 0 ? thrustInput : lever;
      // The visit owns this growing list, just as it owns the tunnel index.
      // Record the old count before the cutter extends it in place.
      const oldCount=sim.borer.segments.length;
      const result=stepBorer({...sim.borer,lever,leverSource},{thrust,steer:controls.steer,slope:controls.slope,
        tunnels:sim.tunnels,tunnelsIncludeCurrent:sim.borer.started,mutableSegments:true},
        sim.protectLand ? {...sim.ground, refusal:shape=>borerLandRefusal(shape,sim.ground),
          spoilRefusal:shape=>borerSpoilRefusal(shape,sim.ground)} : sim.ground,null,STEP);
      const daylight=result.events.find(event=>event.type==='daylight');
      next={...next,borer:result.state,lastMessage:result.state.message || '',
        borerCutSurvey:!sim.borer.started && result.state.started ? input.borerSurvey : sim.borerCutSurvey,
        borerDaylightMessage:daylight?.message || (!sim.borer.started && result.state.started ? '' : sim.borerDaylightMessage),
        borerWatching:watchBorerCut(next.borerWatching, sim.borer, result.state, input.borerSurvey, !!daylight)};
      if(daylight) {
        next.daylightMessage=daylight.message;
        const lesson=borerCutLesson(result.state);
        if (lesson) {
          const town={...sim.apprenticeTown, apprenticeships:sim.apprenticeTown.apprenticeships.map(record=>({...record})),
            borerLessons:[...sim.apprenticeTown.borerLessons], book:[...sim.apprenticeTown.book]};
          recordBorerLesson(town, 'pim', lesson, {easy:sim.easy});
          next.apprenticeTown=town;
        }
      }
      events.push(...result.events);
      if(result.state.distanceM!==sim.borer.distanceM ||
          result.events.some(event=>event.type==='breakthrough'||event.type==='daylight')){
        const segments=result.state.segments;
        if (!sim.borer.started) next.tunnels=createGroundTunnels([], {heightAt:(x,z)=>sim.ground.heightAt(x,z)});
        if (oldCount) next.tunnels.extendLast(segments[oldCount-1]);
        for (let i=oldCount;i<segments.length;i++) next.tunnels.extendLast(segments[i],true);
        next.dirty=true;
      }
      if (daylight) next=rememberDigTunnel(next);
    }
    } catch (error) { next=stopBorer(error); }
  } else if(sim.roadMachines[sim.activeMachine]){
    const road=sim.roadMachines[sim.activeMachine];
    const held=holdAgainstSolids(sim,sim.activeMachine,road.machine,input.controls ?? {});
    events.push(...held.events);
    const result=stepRoadMachine({...road,machine:held.machine},sim.roadWork,held.controls,STEP,roadGround(sim.ground));
    next={...next,roadWork:result.work,roadMachines:{...sim.roadMachines,[sim.activeMachine]:result.state}};
    events.push(...result.events);
  } else if(isPlantMachine(sim.activeMachine)){
    // The plant step below moves the loader and the mixer truck.
  } else if(sim.activeMachine==='drill'){
    const controls=input.controls ?? {};
    const held=holdAgainstSolids(sim,'drill',sim.drill.machine,controls.mastDown===true ? {forward:0,steer:0} : controls);
    events.push(...held.events);
    const result=stepDrillRig({...sim.drill,machine:held.machine},held.machine===sim.drill.machine ? controls : {...controls,forward:0,steer:0},STEP);
    next={...next,drill:result.state}; events.push(...result.events);
  } else if(sim.activeMachine==='trencher'){
    const trencher=sim.trencher,definition=machineDefinition('trencher');
    const held=holdAgainstSolids(sim,'trencher',trencher.machine,input.controls ?? {},
      trencher.speedFactor===1 ? definition : {...definition,maxSpeedMps:definition.maxSpeedMps*trencher.speedFactor});
    events.push(...held.events);
    const result=stepTrencher({...trencher,machine:held.machine},{...held.controls,chainDown:input.action==='trench'},STEP,sim.ground);
    next={...next,trencher:result.state}; events.push(...result.events);
  } else {
    let haul={...sim.haul,activeMachine:sim.activeMachine};
    const held=holdAgainstSolids(sim,sim.activeMachine,haul.machines[sim.activeMachine],input.controls ?? {});
    events.push(...held.events);
    haul={...haul,machines:{...haul.machines,[sim.activeMachine]:held.machine}};
    let advanced=stepMachineHaul(haul,held.controls,STEP);
    // The bed lifts while Space is held and settles back after; the load slides once it is high enough.
    const truck=advanced.machines.dumpTruck,tipping=input.action==='tip';
    const bedAngle=Math.max(0,Math.min(.85,(truck.bedAngle??0)+(tipping?.6:-.5)*STEP));
    advanced={...advanced,machines:{...advanced.machines,dumpTruck:{...truck,bedAngle}}};
    if(input.action==='tip'&&bedAngle<.4)return {...next,haul:{...advanced,activeMachine:'excavator'},events};
    const hopper=input.action==='tip'?tipTruckIntoHopper(next,advanced.machines.dumpTruck,STEP):{handled:false};
    if(hopper.handled){
      events.push(...hopper.events);
      return {...next,plant:hopper.plant,lastMessage:hopper.message||next.lastMessage,dirty:next.dirty||hopper.dirty,
        haul:{...advanced,machines:{...advanced.machines,dumpTruck:hopper.truck},activeMachine:'excavator'},events};
    }
    if(input.action==='dig'||input.action==='load'||input.action==='tip'){
      if(input.action==='dig'){
        const machine=haul.machines.excavator,tip=machineToolPosition(machineDefinition('excavator'),machine,'bucket');
        if(machineLoadVolume(machine)>=machineDefinition('excavator').tools.bucket.capacityM3-1e-5){
          next={...next,lastMessage:'The bucket is full. Load it into the truck.'};
          return {...next,haul:sim.haul,events};
        }
        if(tip.y>sim.ground.heightAt(tip.x,tip.z)+.05){
          next={...next,lastMessage:'Lower the boom until the bucket touches the ground.'};
          return {...next,haul:sim.haul,events};
        }
      }
      advanced=operateMachineHaul(advanced,{action:input.action,dtSeconds:STEP});
      const operation=advanced.lastOperation;
      if(input.action==='dig'){
        next={...next,excavatedM3:next.excavatedM3+(operation?.movedVolumeM3||0)};
        if(operation?.groundResult?.ok && operation.movedVolumeM3<0.00001)
          next={...next,lastMessage:'The bucket has reached the bottom here. Press A or D to swing to fresh dirt.'};
      }
      if(input.action==='load')next={...next,loadedM3:next.loadedM3+(operation?.movedVolumeM3||0)};
      if(input.action==='tip'){
        next={...next,tippedM3:next.tippedM3+(operation?.movedVolumeM3||0)};
        if(operation?.movedVolumeM3>0 && machineLoadVolume(advanced.machines.dumpTruck)<1e-5)
          next={...next,lastMessage:'The load is tipped. Fill the truck again.'};
      }
      if(operation?.groundResult?.reason)events.push({type:'cut-refused',reason:operation.groundResult.reason});
      if(operation?.refused&&operation.groundResult?.reason)events.push({type:'cut-refused',reason:operation.groundResult.reason});
      if(input.action==='dig'&&operation?.movedVolumeM3>0){
        const position=machineToolPosition(machineDefinition('excavator'),advanced.machines.excavator,'bucket');
        events.push({type:'dirt-plume',x:position.x,y:position.y,z:position.z,volumeM3:operation.movedVolumeM3,
          material:Object.keys(advanced.machines.excavator.load).at(-1)||'topsoil'});
      }
      if(input.action==='tip'&&operation?.movedVolumeM3>0){const rear=machineToolPosition(machineDefinition('dumpTruck'),advanced.machines.dumpTruck,'bed');events.push({type:'tip',x:rear.x,y:rear.y,z:rear.z,volumeM3:operation.movedVolumeM3});}
      if(operation?.missed){const tip=machineToolPosition(machineDefinition('excavator'),advanced.machines.excavator,'bucket');events.push({type:'spill',...tip,volumeM3:operation.spilledVolumeM3});}
      if(operation?.message)next={...next,lastMessage:operation.message};
    }
    next={...next,haul:{...advanced,activeMachine:'excavator'}};
  }
  if(sim.activeMachine==='borer' && sim.mode==='drive' &&
      (next.borer.x!==sim.borer.x || next.borer.z!==sim.borer.z)) next.daylightMessage='';
  const contact=events.find(event=>event.type==='machine-contact');
  if(contact)next={...next,lastMessage:contact.message};
  if(events.some(event=>event.type==='cut-refused'))next={...next,lastMessage:events.find(event=>event.type==='cut-refused').reason};
  if(events.some(event=>event.type==='dirt-plume'||event.type==='tip'||event.type==='spill'))next={...next,dirty:true};
  return {...next,events};
}

/** The loader and the mixer truck move inside the plant's own step, so their move is tried here first. */
function holdPlantMachine(sim,input) {
  const id=sim.activeMachine;
  if(!isPlantMachine(id))return {sim,input,events:[],message:''};
  const controls=input.controls ?? {},machine=sim.plant[id].machine;
  const drive=id==='mixer'&&sim.mode==='work' ? {forward:0,steer:0} : {forward:controls.forward ?? 0,steer:controls.steer ?? 0};
  const held=holdAgainstSolids(sim,id,machine,drive);
  if(held.machine===machine)return {sim,input,events:[],message:''};
  const plant={...sim.plant,[id]:{...sim.plant[id],machine:held.machine}};
  return {sim:{...sim,plant},input:{...input,controls:{...controls,forward:0,steer:0}},events:held.events,
    message:held.events[0]?.message ?? ''};
}

export function stepDigSandbox(sim,input={},dtSeconds=STEP) {
  if(!Number.isFinite(dtSeconds)||dtSeconds<0)throw new TypeError('Sandbox time must be non-negative.');
  let carry=sim.fixedCarry+dtSeconds,next={...sim,events:[]};
  while(carry+1e-10>=STEP){
    const previousMessage=next.lastMessage;
    next=fixedStep({...next,lastMessage:''},input);
    // The plant runs every step, whichever machine is in use.
    if(next.plant){
      const held=holdPlantMachine(next,input);
      const works=stepYardPlant(held.sim,held.input,STEP);
      next={...next,plant:works.plant,lastMessage:held.message||works.message||next.lastMessage,events:[...next.events,...held.events,...works.events]};
    }
    if(next.lastMessage) next.events.push({type:'machine-message',message:next.lastMessage});
    else next.lastMessage=previousMessage;
    carry-=STEP;
  }
  next.fixedCarry=carry;next.elapsed=sim.elapsed+dtSeconds;
  if (next.roadWork !== sim.roadWork) {
    suppliedGroundWork.set(next.ground, next.roadWork);
    (globalThis.__theDigRoadMemory??={})[next.playerId]=next.roadWork;
    next.dirty=true;
  }
  if(next.dirty){(globalThis.__theDigGroundMemory??={})[next.playerId]=next.ground.toSave();next.dirty=false;}
  return next;
}

export function digSandboxMachineState(sim,id=sim.activeMachine) {
  if(isPlantMachine(id))return sim.plant[id].machine;
  return sim.roadMachines[id]?.machine??(id==='borer'?sim.borer:id==='trencher'?sim.trencher.machine:id==='drill'?sim.drill.machine:sim.haul.machines[id]);
}
