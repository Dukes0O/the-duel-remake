// TOWN-HAUL-JOB: what a mission does to the town, and the town's clock while a mission is driven (docs/WASTELAND_TOWN.md
// section 11). Pure: no DOM, no Three.js, nothing from app.js.
//
// A mission's effect on the town is one mission result, settled once per run id: the run ids already settled are kept on the
// town (`town.missions.settled`), so a result handed over twice (a retry of the save, a second press, a replayed event) changes
// the town once. The field is made the first time a result is settled, so a town saved before this card loads exactly as it
// was and is given nothing it did not have. Mission pay still goes to the wallet through the arena's own settlement.
import {goodDefinition, storeGood, stockpileAt} from './town-goods.js';
import {answerReport} from './town-reports.js';
import {stepTown} from './town-sim.js';

export const TOWN_MISSION_SETTLED_LIMIT = 500;
export const TOWN_MISSION_HISTORY_LIMIT = 40;
// The most a single run can bring or lose. A bed that empties is loaded again and a part-unloaded truck can drive off, so
// a run is not held to one 9,000 kg bedful; this bound only refuses a result no run could have.
export const TOWN_MISSION_MAX_KG = 100_000;
const HAUL_CHAPTER = 'town.act1.salvage';
const FIRE_CHAPTER = 'town.act1.fire';
export const TOWN_MISSION_MAX_LITRES = 100_000;
const DROP_CELL = Object.freeze({regionId:'scablands', x:4, z:-8});

const record = value => value && typeof value === 'object' && !Array.isArray(value);
const wholeKg = value => Number.isSafeInteger(value) && value >= 0 && value <= TOWN_MISSION_MAX_KG;

function missionsFor(town) {
  if (!record(town.missions)) town.missions = {version:1, settled:[], history:[], totals:{}};
  const state = town.missions;
  if (!Array.isArray(state.settled)) state.settled = [];
  if (!Array.isArray(state.history)) state.history = [];
  if (!record(state.totals)) state.totals = {};
  return state;
}

/** Where a haul's load goes: the first finished Salvage Yard, or the pile by the truck bay. */
export function townMissionDropCell(town) {
  const yard = (town?.buildings ?? []).find(building => building?.buildingId === 'salvage-yard' && building.state === 'finished');
  return yard ? {regionId:yard.regionId ?? 'scablands', x:yard.x, z:yard.z} : {...DROP_CELL};
}

/** True when this run's result has already changed the town. Reads only; makes nothing. */
export function townMissionSettled(town, runId) {
  return Array.isArray(town?.missions?.settled) && town.missions.settled.includes(runId);
}

/**
 * Apply one mission result to the town: {runId, jobId, kind:'haul', good, deliveredKg, lostKg, chapter}. The delivered
 * kilograms go on the stockpile, a Chapter 3 haul that brought anything home finishes the chapter, and a steel run answers the
 * stopped site's report. Returns {ok, settled, message}; `settled` is false when this run id has already been applied.
 */
export function townMissionResult(town, result = {}) {
  if (!record(town)) return {ok:false, settled:false, message:'There is no town to take the result.'};
  if (result?.kind === 'fire') return townFireResult(town, result);
  const {runId, jobId, kind, good, deliveredKg, lostKg, chapter = null} = result;
  if (typeof runId !== 'string' || !runId || runId.length > 128 || typeof jobId !== 'string' || !jobId || kind !== 'haul' ||
      !goodDefinition(good) || !wholeKg(deliveredKg) || !wholeKg(lostKg) ||
      (chapter !== null && chapter !== HAUL_CHAPTER))
    return {ok:false, settled:false, message:'That haul result is not clear.'};
  if (townMissionSettled(town, runId)) return {ok:true, settled:false, message:'That haul already has a result.'};
  const state = missionsFor(town), cell = townMissionDropCell(town);
  if (deliveredKg > 0) storeGood(town, cell, good, deliveredKg);
  state.settled.push(runId);
  if (state.settled.length > TOWN_MISSION_SETTLED_LIMIT) state.settled.splice(0, state.settled.length - TOWN_MISSION_SETTLED_LIMIT);
  const totals = state.totals[good] ??= {deliveredKg:0, lostKg:0, runs:0};
  totals.deliveredKg += deliveredKg; totals.lostKg += lostKg; totals.runs += 1;
  state.history.push({runId, jobId, good, deliveredKg, lostKg, tick:String(town.tick ?? 0)});
  if (state.history.length > TOWN_MISSION_HISTORY_LIMIT) state.history.splice(0, state.history.length - TOWN_MISSION_HISTORY_LIMIT);
  if (chapter === HAUL_CHAPTER && deliveredKg > 0) {
    if (!record(town.story)) town.story = {};
    if (!record(town.story.facts)) town.story.facts = {};
    if (!record(town.story.completed)) town.story.completed = {};
    town.story.facts.salvageDelivered = true;
    town.story.completed[HAUL_CHAPTER] = true;
  }
  if (good === 'steel' && deliveredKg > 0) {
    const report = (town.reports ?? []).find(row => row?.unanswered && row.eventId === 'site-stopped' &&
      (row.shortage?.good ?? row.job?.good) === 'steel');
    if (report) answerReport(town, report.id, 'send-supplies');
  }
  const pile = stockpileAt(town, cell)[good] ?? 0;
  return {ok:true, settled:true, stockKg:pile,
    message:deliveredKg > 0 ? `${deliveredKg} kg of ${good} went on the town's pile.` : 'Nothing reached the town this time.'};
}

// TOWN-FIRE-JOB: a fire call's result: {runId, jobId, kind:'fire', savedIds, lostIds, waterL, chapter, ash}. Every building that
// was put out stops burning in the town; every building that burnt down is left a black frame (`burnt-1`, as the town's own fire
// leaves one), to be built again. Chapter 7 is finished by its fire being put out, whatever was lost, and the ash on the ground is
// noted: `ash` is which version of the ash line was said, and only the first ('ash') opens the Everburn from it.
const FIRE_JOBS = Object.freeze(['town-fire-first', 'town-fire-call']);
const ASH_VERSIONS = Object.freeze(['ash', 'going', 'done']);
const idList = value => Array.isArray(value) && value.length <= 64 && value.every(id => typeof id === 'string' && id && id.length <= 128) &&
  new Set(value).size === value.length;
function townFireResult(town, result) {
  const {runId, jobId, savedIds, lostIds, waterL, chapter = null, ash = null} = result;
  const buildings = Array.isArray(town.buildings) ? town.buildings : [];
  const known = id => buildings.some(building => building?.id === id);
  if (typeof runId !== 'string' || !runId || runId.length > 128 || !FIRE_JOBS.includes(jobId) || !idList(savedIds) || !idList(lostIds) ||
      savedIds.some(id => lostIds.includes(id)) || ![...savedIds, ...lostIds].every(known) ||
      !Number.isSafeInteger(waterL) || waterL < 0 || waterL > TOWN_MISSION_MAX_LITRES ||
      (chapter !== null && chapter !== FIRE_CHAPTER) || (chapter === FIRE_CHAPTER) !== (jobId === 'town-fire-first') ||
      (chapter === FIRE_CHAPTER ? !ASH_VERSIONS.includes(ash) : ash !== null))
    return {ok:false, settled:false, message:'That fire call result is not clear.'};
  if (townMissionSettled(town, runId)) return {ok:true, settled:false, message:'That fire call already has a result.'};
  const state = missionsFor(town);
  for (const building of buildings) {
    if (!building || (!savedIds.includes(building.id) && !lostIds.includes(building.id))) continue;
    const wasBurning = building.fireStage !== undefined;
    for (const key of ['fireStage', 'fireStartedTick', 'fireWaterLitres', 'fireWaterThisHour', 'fireWaterTick']) delete building[key];
    if (lostIds.includes(building.id)) building.state = 'burnt-1';
    // As a hose does in the town (src/town/town-fire.js), a fire put out leaves the building marked as having had its fire.
    else if (wasBurning) building.fireOut = true;
  }
  state.settled.push(runId);
  if (state.settled.length > TOWN_MISSION_SETTLED_LIMIT) state.settled.splice(0, state.settled.length - TOWN_MISSION_SETTLED_LIMIT);
  const totals = state.totals.fire ??= {saved:0, lost:0, waterL:0, runs:0};
  totals.saved += savedIds.length; totals.lost += lostIds.length; totals.waterL += waterL; totals.runs += 1;
  state.history.push({runId, jobId, kind:'fire', savedIds:[...savedIds], lostIds:[...lostIds], waterL, tick:String(town.tick ?? 0)});
  if (state.history.length > TOWN_MISSION_HISTORY_LIMIT) state.history.splice(0, state.history.length - TOWN_MISSION_HISTORY_LIMIT);
  if (chapter === FIRE_CHAPTER) {
    if (!record(town.story)) town.story = {};
    if (!record(town.story.facts)) town.story.facts = {};
    if (!record(town.story.completed)) town.story.completed = {};
    town.story.facts.firstFireOut = true;
    town.story.facts.ashFound = true;
    if (ash === 'ash') town.story.facts.everburnFromAsh = true;
    town.story.completed[FIRE_CHAPTER] = true;
  }
  return {ok:true, settled:true, message:lostIds.length ? 'The fire is out, and the town has buildings to build again.' : 'The fire is out, and nothing burnt down.'};
}

/**
 * The town's clock while a mission is driven: one tick (one game hour) every `secondsPerTick` real seconds, outside race
 * state. Serious reports raised during the drive are handed to the radio one at a time, at most one each `radioGapSeconds`.
 * `step` is the town's own step (stepTown); a test may pass its own.
 */
export function createTownMissionClock(town, {secondsPerTick = 10, radioGapSeconds = 60, step = stepTown} = {}) {
  if (!record(town)) throw new TypeError('A town is needed for its clock.');
  const known = new Set((town.reports ?? []).map(report => report?.id));
  const waiting = [];
  let carried = 0, sinceRadio = radioGapSeconds, ticks = 0;
  function advance(realSeconds) {
    if (!Number.isFinite(realSeconds) || realSeconds <= 0) return {ticks:0, radio:null};
    carried += realSeconds; sinceRadio += realSeconds;
    let stepped = 0;
    while (carried + 1e-9 >= secondsPerTick) { carried -= secondsPerTick; step(town); stepped++; }
    ticks += stepped;
    if (stepped) for (const report of town.reports ?? []) {
      if (!report || known.has(report.id)) continue;
      known.add(report.id);
      if (report.unanswered && report.bad === true) waiting.push(report.id);
    }
    let radio = null;
    while (waiting.length && sinceRadio >= radioGapSeconds) {
      const report = (town.reports ?? []).find(row => row.id === waiting[0]);
      waiting.shift();
      if (!report?.unanswered) continue;
      radio = {lineId:'town.radio.report', reportId:report.id, report:report.what};
      sinceRadio = 0;
    }
    return {ticks:stepped, radio};
  }
  return Object.freeze({advance, get ticks() { return ticks; }, get waiting() { return waiting.length; }});
}
