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
// The most a single haul can bring: the flatbed's bed (src/town/content/work-vehicles.js).
export const TOWN_MISSION_MAX_KG = 9000;
const HAUL_CHAPTER = 'town.act1.salvage';
const DROP_CELL = Object.freeze({regionId:'scablands', x:4, z:-8});

const record = value => value && typeof value === 'object' && !Array.isArray(value);
const wholeKg = (value, most = TOWN_MISSION_MAX_KG) => Number.isSafeInteger(value) && value >= 0 && value <= most;
// What can be lost in one run: a bed that empties can be loaded again, so more than one bedful.
const MAX_LOST_KG = 100_000;

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
  const {runId, jobId, kind, good, deliveredKg, lostKg, chapter = null} = result;
  if (typeof runId !== 'string' || !runId || runId.length > 128 || typeof jobId !== 'string' || !jobId || kind !== 'haul' ||
      !goodDefinition(good) || !wholeKg(deliveredKg) || !wholeKg(lostKg, MAX_LOST_KG) ||
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
