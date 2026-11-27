// TOWN-HAUL-JOB: the town's drives, as job data on the World Job engine (docs/WASTELAND_TOWN.md sections 7 and 11). Pure: no
// DOM, no Three.js, nothing from app.js. A town job is built from the town (where its salvage pile is) and the Scablands' named
// places, and it is driven in the town's work vehicle. Its result goes back to the town as one mission result, settled once
// per run id (src/town/town-missions.js).
//
// - The salvage haul is Chapter 3, "What We Can Find": the flatbed to the Boneyard, where Odessa's gang is cutting up the old
//   airliners, and home with what it will carry. After Chapter 3 the same drive is the salvage run, open whenever you like.
// - The steel run opens when a building site has stopped for want of steel: the flatbed to Tin Town's steel stack and back.
import {LAND} from '../scablands-names.js';
import {ROAD_NET} from '../scablands-road.js';
import {sliceLine} from '../scablands-ways.js';
import {createTownWorld} from '../../town/town-world.js';
import {TOWN_CELL_METRES} from '../../town/town-world-data.js';
import {createTownMissionClock, townMissionDropCell, townMissionResult, TOWN_MISSION_MAX_LITRES} from '../../town/town-missions.js';
import {stepTown} from '../../town/index.js';
import {townCaptionText, TOWN_CAPTIONS} from '../../town/content/lines.js';
import {buildingById} from '../../town/content/registry.js';
import {fuelHours} from '../../town/town-fire.js';
import {DOUSE_WATER, tapFlowLpm} from './steps/douse.js';
import {TOWN_CHAPTER_JOBS, TOWN_REPEAT_JOBS, townJobRow} from '../../town/content/jobs.js';
import {OUTPOST_CHAPTERS} from '../../town/content/neighbours.js';
import {OUTPOSTS_WORLD} from '../../town/content/outposts-world.js';
import {makeRng} from '../../rng.js';

export const TOWN_JOB_KIND = 'town-job';
export const TOWN_HAUL_CHAPTER = 'town.act1.salvage';
export const TOWN_FIRE_CHAPTER = 'town.act1.fire';

const FLATBED_KG = 9000;
const place = (id, name, point, radius) => Object.freeze({id, name, radius, position:Object.freeze({x:point.x, z:point.z})});

/** Where the town takes a load: its first finished Salvage Yard, or the truck bay's pile before there is one. */
export const townHaulDropCell = townMissionDropCell;

function dropPlace(town) {
  const cell = townHaulDropCell(town);
  const building = (town?.buildings ?? []).find(row => row?.buildingId === 'salvage-yard' && row.state === 'finished' &&
    row.x === cell.x && row.z === cell.z) ?? null, yard = building !== null;
  // A building's middle, or the middle of the truck bay's cell; the drop ring stands just in front of a yard's south side.
  const x = (cell.x + (building?.width ?? 1) / 2) * TOWN_CELL_METRES;
  const z = (cell.z + (building ? building.depth + 1 : .5)) * TOWN_CELL_METRES;
  return place(yard ? 'salvage-yard' : 'truck-bay', yard ? 'the Salvage Yard' : 'the salvage pile by the truck bay', {x, z}, 14);
}

const facts = town => town?.story?.facts ?? {};
const completed = town => town?.story?.completed ?? {};
export const townSalvageChapterOpen = town => facts(town).wellBuilt === true && completed(town)[TOWN_HAUL_CHAPTER] !== true;
export const townSalvageRunOpen = town => completed(town)[TOWN_HAUL_CHAPTER] === true;

/** The unanswered report of a building site stopped for want of steel, or null. */
export function townSteelShortage(town) {
  return (town?.reports ?? []).find(report => report?.unanswered && report.eventId === 'site-stopped' &&
    (report.shortage?.good ?? report.job?.good) === 'steel') ?? null;
}

// The words the job says, with the speaker in front, as every World Job caption is.
function captionsFor(ids, town) {
  return Object.fromEntries(ids.filter(Boolean).map(id => [id, `${TOWN_CAPTIONS[id].who}: ${townCaptionText(id, town)}`]));
}

// TOWN-HAUL-JOB, Director's review of 20 November 2026: Chapter 3's first haul is short. The Boneyard's wreck fields begin 4.2 km
// along the road from the truck bay (about 6 minutes at a child's 42 km/h), and nothing salvageable lies nearer, so the gang has
// dragged its first cut pieces as far as the halfway camp: 2.5 km by the East Road, about 3.5 minutes each way. The pile stands
// 29 m off the road on the scab plates, clear of it. The full Boneyard run stays as the repeatable salvage run.
const CAMP_PILE = () => place('camp-pile', "the gang's first pile at the halfway camp", LAND.at('safe-road', -30, 30), 12);

// The washout: 200 m of the East Road over the scab plates, 1,000 to 1,200 m from the yard end, where last spring's rain broke the
// road up. Every haul that comes home by the East Road meets it (src/world/jobs/steps/haul.js says how it shakes the load). The way
// round is over the flats south of the plates: smooth, and about 2 km longer from the halfway camp.
export const TOWN_HAUL_WASHOUTS = Object.freeze([Object.freeze({id:'east-road-washout', name:'the washed-out road over the plates',
  line:Object.freeze(sliceLine(ROAD_NET.road('east-road').points, 1000, 1200).map(point => Object.freeze({x:point.x, z:point.z}))),
  halfWidth:16})]);

const KINDS = Object.freeze({
  salvage:Object.freeze({
    good:'salvage', goodName:'salvage',
    pile:() => place('boneyard-pile', "the gang's pile at the Boneyard", LAND.at('boneyard', -10, 12), 12),
    pileKg:12000,
    lines:Object.freeze({start:'town.haul.go', atPile:'town.haul.pile', backAtPile:'town.haul.back', full:'town.haul.full',
      setOff:'town.3.load', firstShed:'town.haul.shed', empty:'town.haul.empty', atDrop:'town.haul.drop', washout:'town.haul.washout'}),
  }),
  steel:Object.freeze({
    good:'steel', goodName:'steel',
    // Tin Town's steel stack, inside the gate's south side and off the East Road's last stretch.
    pile:() => place('tin-town-steel', "Tin Town's steel stack", LAND.at('tin-town', -60, 70), 12),
    pileKg:9000,
    lines:Object.freeze({start:'town.steel.go', atPile:'town.steel.pile', backAtPile:'town.haul.back', full:'town.haul.full',
      setOff:'town.steel.load', firstShed:'town.haul.shed', empty:'town.haul.empty', atDrop:'town.haul.drop', washout:'town.haul.washout'}),
  }),
});

/** The town jobs open in this town now: [{id, kind, chapter}], newest need first. */
export function openTownJobs(town) {
  const open = [];
  // TOWN-FIRE-JOB: a fire is the most urgent thing the town can ask for, so it comes first.
  if (townFireChapterOpen(town)) open.push({id:'town-fire-first', kind:'fire', chapter:true});
  else if (townBurning(town).length) open.push({id:'town-fire-call', kind:'fire', chapter:false});
  // TOWN-JOBS-2: a neighbour's chapter comes next (the town's own first haul is done before any of them), then what the town
  // is short of, then the jobs that come round again, and last the salvage run, which is always there.
  const neighbour = townSalvageChapterOpen(town) ? null : townChapterJobOpen(town);
  if (neighbour) open.push({id:neighbour.id, kind:neighbour.kind, chapter:true});
  if (townSteelShortage(town)) open.push({id:'town-steel-run', kind:'steel', chapter:false});
  if (townSalvageChapterOpen(town)) open.push({id:'town-haul-salvage', kind:'salvage', chapter:true});
  else {
    for (const row of TOWN_REPEAT_JOBS) if (townRepeatJobOpen(town, row)) open.push({id:row.id, kind:row.kind, chapter:false});
    if (townSalvageRunOpen(town)) open.push({id:'town-salvage-run', kind:'salvage', chapter:false});
  }
  return open;
}

const NAMES = Object.freeze({'town-haul-salvage':'What We Can Find', 'town-salvage-run':'The Salvage Run', 'town-steel-run':'The Steel Run',
  'town-fire-first':'First Fire', 'town-fire-call':'Fire Call'});
const CLOSING = Object.freeze({'town-haul-salvage':'town.3.won', 'town-salvage-run':'town.haul.won', 'town-steel-run':'town.steel.won'});

/**
 * A town job's definition for the World Job mode, or null when that job is not open in this town. `seed` sets the order the
 * pile's pieces come in. The town's layout is read once here, so a replay is repeatable from seed, inputs and that layout.
 */
export function townJobDefinition(town, jobId, {seed = town?.seed ?? 1, ember = {}} = {}) {
  const open = openTownJobs(town).find(job => job.id === jobId);
  if (!open) return null;
  if (open.kind === 'fire') return townFireDefinition(town, open, {seed, ember});
  const row = townJobRow(jobId);
  if (row) return townRowDefinition(town, row, {seed, ember});
  const chapter = jobId === 'town-haul-salvage', kind = KINDS[open.kind], closing = CLOSING[jobId];
  const lines = chapter ? {...kind.lines, start:'town.haul.go.camp'} : kind.lines;
  const pile = chapter ? CAMP_PILE() : kind.pile();
  const lineIds = [...Object.values(lines), closing];
  const layout = createTownWorld(town);
  return {
    id:jobId, kind:TOWN_JOB_KIND, townJob:open.kind, chapter:open.chapter ? TOWN_HAUL_CHAPTER : null, name:NAMES[jobId], eyebrow:'THE TOWN',
    seed:seed >>> 0, vehicle:'flatbed', layout, resultLineId:closing, captions:captionsFor(lineIds, town),
    steps:[{kind:'haul', id:'haul', good:kind.good, goodName:kind.goodName, maxKg:FLATBED_KG,
      pile:{...pile, kg:kind.pileKg}, drop:dropPlace(town), lines, washouts:TOWN_HAUL_WASHOUTS,
      startLineId:lines.start, closing:[closing]}],
  };
}

/** What a finished town job hands the town: the one mission result for this run, or null when the job was not finished. */
export function townJobResult(worldJob, runId) {
  const definition = worldJob?.definition, job = worldJob?.job;
  if (definition?.kind !== TOWN_JOB_KIND || !job?.done || typeof runId !== 'string' || !runId) return null;
  if (definition.townJob === 'fire') {
    const fire = worldJob.fireResult;
    if (!fire) return null;
    // The water used is a record, not a limit: a call long enough to pass the town's bound still gives the town its result.
    return {runId, jobId:definition.id, kind:'fire', savedIds:[...fire.savedIds], lostIds:[...fire.lostIds],
      waterL:Math.min(TOWN_MISSION_MAX_LITRES, Math.max(0, Math.round(fire.usedL))),
      chapter:definition.chapter ?? null, ash:definition.ash ?? null};
  }
  if (townJobRow(definition.id)) return townRowResult(worldJob, runId);
  const state = worldJob.haulResult;
  if (!state) return null;
  return {runId, jobId:definition.id, kind:'haul', good:state.good, deliveredKg:state.deliveredKg, lostKg:state.lostKg,
    chapter:definition.chapter ?? null};
}

/**
 * One drive of a town job, from GO to the town's save: the town ticks while it is driven (`frame`, real seconds, outside race
 * state) and its serious news is handed back for the radio; at the end `settle` applies the run's one mission result and saves
 * the town through `save(town, reason)`. The result is applied once whatever happens; settling again returns the same answer,
 * except that a save which failed is tried again.
 */
export function createTownJobRun({town, runId, save = async () => true, step = target => stepTown(target), secondsPerTick = 10,
  radioGapSeconds = 60, holdFires = []} = {}) {
  if (!town || typeof town !== 'object' || typeof runId !== 'string' || !runId) throw new TypeError('A town job run needs its town and run id.');
  const clock = createTownMissionClock(town, {step:holdFires.length ? holdingFires(step, holdFires) : step, secondsPerTick, radioGapSeconds});
  let settling = null, outcome = null;
  const trySave = () => (settling = Promise.resolve().then(() => save(town, 'mission')).then(saved => ({...outcome, saved:saved !== false}),
    error => ({...outcome, saved:false, saveMessage:error?.message || 'The town could not be saved.'})));
  return Object.freeze({
    town, runId,
    frame:seconds => clock.advance(seconds).radio,
    settle(worldJob) {
      if (settling) return settling.then(answer => answer.saved ? answer : trySave());
      const result = townJobResult(worldJob, runId);
      outcome = result ? townMissionResult(town, result)
        : {ok:true, settled:false, message:'The job was left unfinished, so nothing reached the town.'};
      return trySave();
    },
    get outcome() { return outcome; }, get ticks() { return clock.ticks; },
  });
}

// ---- TOWN-FIRE-JOB: the fire call -------------------------------------------------------------------------------------------
// Chapter 7, "First Fire": the soup kitchen is alight and the old engine is in the truck bay (docs/story/the-long-dry.md). After
// it, a fire call opens whenever one of the town's buildings is burning (src/town/town-fire.js lights about one a year). The
// fire truck drives it; its result tells the town which buildings were saved and which burnt down.

const SOUP_KITCHEN = 'soup-kitchen';
const finished = building => building?.state === 'finished' && (building.regionId ?? 'scablands') === 'scablands';
/** The town's buildings burning now (its own fire system's), in the Scablands. */
export const townBurning = town => (town?.buildings ?? []).filter(building => building?.fireStage &&
  (building.regionId ?? 'scablands') === 'scablands' && fuelHours(building) > 0);
/** Chapter 7 opens after the first winter, once there is a soup kitchen to burn. */
export function townFireChapterOpen(town) {
  return facts(town).winterPassed === true && completed(town)[TOWN_FIRE_CHAPTER] !== true &&
    (town?.buildings ?? []).some(building => building?.buildingId === SOUP_KITCHEN && finished(building) && fuelHours(building) > 0);
}

const nameOf = building => `the ${String(building.buildingId ?? 'building').replaceAll('-', ' ')}`;
function footprint(building) {
  const row = buildingById.get(building.buildingId), width = building.width ?? row?.width ?? 1, depth = building.depth ?? row?.depth ?? 1;
  return {x:(building.x + width / 2) * TOWN_CELL_METRES, z:(building.z + depth / 2) * TOWN_CELL_METRES,
    halfX:width * TOWN_CELL_METRES / 2, halfZ:depth * TOWN_CELL_METRES / 2, width, depth};
}
// A water point's ring stands just south of its building, where the truck can stop beside it.
function ringBeside(building) {
  const at = footprint(building);
  return {x:at.x, z:at.z + at.halfZ + 5};
}

/** The places the fire truck can fill up in this town, each at the flow it really gives (src/world/jobs/steps/douse.js). */
export function townFireWater(town) {
  const points = [];
  const taps = town?.utilities?.waterResult?.taps ?? [];
  for (const building of town?.buildings ?? []) {
    if (!finished(building)) continue;
    const at = ringBeside(building), id = `water:${building.id}`;
    if (building.buildingId === 'hand-well') points.push({id, kind:'well', name:DOUSE_WATER.well.name, position:at,
      flowLpm:DOUSE_WATER.well.flowLpm, storeL:DOUSE_WATER.well.wellStoreL});
    else if (building.buildingId === 'water-tower') points.push({id, kind:'tower', name:DOUSE_WATER.tower.name, position:at,
      flowLpm:tapFlowLpm(building.towerHeight ?? 12, 100), storeL:DOUSE_WATER.tower.storeL});
    else if (building.buildingId === 'standpipe') {
      const middle = footprint(building), tap = taps.find(row => Math.hypot(row.x - middle.x, row.z - middle.z) <= 12);
      const flowLpm = tapFlowLpm(tap?.pressureMetres ?? 0, 50);
      // A tap with no pressure behind it gives the truck almost nothing, so it has no ring.
      if (flowLpm >= 100) points.push({id, kind:'tap', name:DOUSE_WATER.tap.name, position:at, flowLpm});
    }
  }
  // The Water Road's tap at the gate, beside the truck bay, gives what is left of today's Water Road water.
  const limit = Number.isFinite(town?.utilities?.waterRoadLimitLitresPerDay) ? town.utilities.waterRoadLimitLitresPerDay : 10_000;
  const left = Math.max(0, Math.floor(limit - (Number.isFinite(town?.water?.in) ? town.water.in : 0)));
  if (left > 0) points.push({id:'water:gate', kind:'gate', name:DOUSE_WATER.gate.name, position:{...TOWN_FIRE_GATE_TAP},
    flowLpm:DOUSE_WATER.gate.flowLpm, storeL:left});
  return points.map(point => Object.freeze({...point, radius:8, position:Object.freeze(point.position)}));
}
// East of the Scrapdome's gate, on open ground beside the road out.
export const TOWN_FIRE_GATE_TAP = Object.freeze({x:38, z:-80});

// The day's wind (src/town/town-weather.js): the way it blows toward, 0 degrees along +x, and its strength against 18 km/h.
export function townFireWind(town) {
  const weather = town?.weather ?? {};
  const angle = (Number.isFinite(weather.windDirection) ? weather.windDirection : 45) * Math.PI / 180;
  const factor = Number.isFinite(weather.windFactor) ? weather.windFactor : (Number.isFinite(weather.windSpeedKph) ? weather.windSpeedKph : 14) / 18;
  return Object.freeze({x:Math.cos(angle), z:Math.sin(angle), factor});
}

// The lines of a fire call. The ash line has three versions (Claude, on the card): the first when the Everburn has not been
// started, `.going` when it has and Old Smoke stands, `.done` when he is beaten. Only the first opens the Everburn from the ash.
export function townAshLine(ember = {}) {
  return ember.smokeBeaten === true ? 'done' : ember.started === true ? 'going' : 'ash';
}
const ASH_LINES = Object.freeze({ash:'town.7.ash', going:'town.7.ash.going', done:'town.7.ash.done'});
const FIRE_LINES = Object.freeze({spread:'town.fire.spread', lost:'town.fire.lost', low:'town.fire.low', empty:'town.fire.empty',
  dry:'town.fire.dry'});

function townFireDefinition(town, open, {seed, ember}) {
  const chapter = open.chapter === true;
  const burning = new Map(townBurning(town).map(building => [building.id, Math.min(1, .35 + .2 * Math.max(1, building.fireStage))]));
  // The chapter's fire is the soup kitchen, already well alight when the call comes.
  const kitchen = chapter ? (town.buildings ?? []).find(building => building?.buildingId === SOUP_KITCHEN && finished(building)) : null;
  if (kitchen) burning.set(kitchen.id, Math.max(burning.get(kitchen.id) ?? 0, .45));
  const lit = (town.buildings ?? []).filter(building => burning.has(building.id));
  if (!lit.length) return null;
  const main = kitchen ?? lit.reduce((best, building) => burning.get(building.id) > burning.get(best.id) ? building : best);
  // Every building that can burn within 120 m of a fire can catch from it: every burning one, then the nearest of the rest, 40 at most.
  const apart = building => Math.min(...lit.map(fire => { const a = footprint(fire), b = footprint(building); return Math.hypot(a.x - b.x, a.z - b.z); }));
  const others = (town.buildings ?? []).filter(building => !burning.has(building.id) && finished(building) && fuelHours(building) > 0 &&
    !String(building.buildingId).startsWith('road-') && apart(building) <= 120).sort((a, b) => apart(a) - apart(b));
  const near = [...lit, ...others.slice(0, Math.max(0, 40 - lit.length))];
  const buildings = near.map(building => {
    const at = footprint(building);
    return Object.freeze({id:building.id, buildingId:building.buildingId, name:nameOf(building), x:at.x, z:at.z, halfX:at.halfX,
      halfZ:at.halfZ, areaM2:at.width * at.depth * TOWN_CELL_METRES ** 2, fuelHours:fuelHours(building), heat:burning.get(building.id) ?? 0,
      position:Object.freeze({x:at.x, z:at.z}), radius:Math.max(at.halfX, at.halfZ) + 10});
  });
  const ash = chapter ? townAshLine(ember) : null;
  const lines = Object.freeze({...FIRE_LINES, start:chapter ? 'town.7.fire' : 'town.fire.go', won:chapter ? 'town.7.won' : 'town.fire.won',
    burnt:chapter ? 'town.7.burnt' : 'town.fire.burnt'});
  const closing = chapter ? [ASH_LINES[ash]] : [];
  const lineIds = [...Object.values(lines), 'town.7.spray', ...closing];
  const mainName = nameOf(main);
  const captions = Object.fromEntries(Object.entries(captionsFor(lineIds, town)).map(([id, text]) => [id, text.replaceAll('{building}', mainName)]));
  const layout = createTownWorld(town);
  return {
    id:open.id, kind:TOWN_JOB_KIND, townJob:'fire', chapter:chapter ? TOWN_FIRE_CHAPTER : null, ash, name:NAMES[open.id], eyebrow:'THE TOWN',
    seed:seed >>> 0, vehicle:'fire-truck', layout, resultLineId:lines.won, captions,
    // The call comes a minute after the chapter's fire started (Odessa saw the smoke), and half a minute after the town's own.
    steps:[{kind:'douse', id:'douse', mainId:main.id, buildings, headStartSeconds:chapter ? 60 : 30, water:townFireWater(town), wind:townFireWind(town),
      tank:{capacityL:3000, startL:3000, pumpLpm:1000}, lines, startLineId:lines.start, ...(chapter ? {afterStartLineId:'town.7.spray'} : {}), closing}],
  };
}

// While a fire call is driven the fire is the player's: the town's own fire system leaves those buildings alone until the result
// comes back, so the town neither burns them down nor spreads from them twice.
function holdingFires(step, ids) {
  const held = new Set(ids);
  return target => {
    const kept = [];
    for (const building of target.buildings ?? []) if (held.has(building.id) && building.fireStage) {
      kept.push([building, building.fireStage, building.fireStartedTick]);
      delete building.fireStage;
    }
    // A held building is not burning in the town while the call is driven, so its own fire cannot light it again either.
    const guard = (target.buildings ?? []).filter(building => held.has(building.id) && building.fireProtectedUntilTick === undefined);
    for (const building of guard) building.fireProtectedUntilTick = BigInt(target.tick ?? 0) + 2n;
    try { step(target); } finally {
      for (const building of guard) delete building.fireProtectedUntilTick;
      for (const [building, stage, started] of kept) {
        building.fireStage = stage;
        if (started !== undefined) building.fireStartedTick = started;
      }
    }
  };
}

// ---- TOWN-JOBS-2: the jobs that are not fights ------------------------------------------------------------------------------
// The neighbours' chapters (Act 2, chapters 11 to 16) and section 7's jobs that come round again. Each is a row of
// src/town/content/jobs.js; this turns a row and the town into steps for the World Job engine. The neighbours stand where the
// land has them (src/town/town-outpost-world.js, read once from the town's layout), so a replay is repeatable from seed, inputs
// and that layout. Reading the town here writes nothing to it.

const TICKS_A_DAY = 24;
const outpostChapter = id => OUTPOST_CHAPTERS.find(chapter => chapter.id === id) ?? null;
const yearOf = town => Number.isFinite(town?.calendar?.year) ? town.calendar.year : 1;

/** The neighbour's chapter job open now, or null: the first chapter not yet done whose year has come, in the story's order. */
export function townChapterJobOpen(town) {
  const next = OUTPOST_CHAPTERS.find(chapter => completed(town)[chapter.id] !== true);
  if (!next || yearOf(town) < (next.year ?? 1)) return null;
  const rows = TOWN_CHAPTER_JOBS.filter(row => row.chapter === next.id);
  // A chapter of two jobs (Dot's fire, then her fence): the second waits for the fact the first leaves.
  return rows.find(row => row.needsFact ? facts(town)[row.needsFact] === true : !row.setsFact || facts(town)[row.setsFact] !== true) ?? null;
}

/** The tick a repeating job was last done at, or null. */
function lastDoneTick(town, jobId) {
  const tick = town?.missions?.totals?.[jobId]?.lastTick;
  try { return tick === undefined ? null : BigInt(tick); } catch { return null; }
}

/** The unanswered report that opens a job, or null. */
export function townJobReport(town, row) {
  if (!row?.opens?.report) return null;
  return (town?.reports ?? []).find(report => report?.unanswered && report.eventId === row.opens.report) ?? null;
}

function townRepeatJobOpen(town, row) {
  const opens = row.opens ?? {};
  // A row whose kind has no builder yet is never open, so no job is offered that cannot be started.
  if (!BUILDERS[row.kind]) return false;
  if (opens.fact && facts(town)[opens.fact] !== true) return false;
  if (opens.chapter && completed(town)[opens.chapter] !== true) return false;
  if (opens.report && !townJobReport(town, row)) return false;
  if (opens.everyDays) {
    const last = lastDoneTick(town, row.id);
    let now = 0n;
    try { now = BigInt(town?.tick ?? 0); } catch { now = 0n; }
    if (last !== null && now - last < BigInt(opens.everyDays * TICKS_A_DAY)) return false;
  }
  return true;
}

const spotOf = (id, name, x, z, radius) => place(id, name, {x, z}, radius);
// A point `metres` from an outpost's middle toward the road (or rail) it faces; a negative distance is the far side.
function beside(outpost, metres, sideways = 0) {
  const dx = outpost.faces.x - outpost.x, dz = outpost.faces.z - outpost.z, length = Math.hypot(dx, dz) || 1;
  const ux = dx / length, uz = dz / length;
  return {x:outpost.x + ux * metres + uz * sideways, z:outpost.z + uz * metres - ux * sideways};
}
// The point `metres` along a road from its town end.
function alongRoad(roadId, metres) {
  const points = ROAD_NET.road(roadId).points, from = Math.max(0, metres);
  const at = sliceLine(points, from, from + 1)[0] ?? points.at(-1);
  return {x:at.x, z:at.z};
}
const roadLine = (roadId, from, to) => (from <= to ? sliceLine(ROAD_NET.road(roadId).points, from, to)
  : sliceLine(ROAD_NET.road(roadId).points, to, from).reverse()).map(point => Object.freeze({x:point.x, z:point.z}));

const homePile = town => { const drop = dropPlace(town); return {...drop, name:drop.id === 'salvage-yard' ? 'the Salvage Yard' : 'the pile by the truck bay'}; };
const NAMES_OF = Object.freeze({'dot-diner':"Dot's diner", 'plane-school':"Miss Quill's school", 'hermit-camp':"Old Tam's hut", 'deck-town':"Deck Town's tank",
  'rail-halt':'the Rail Halt'});

function haulStep(id, part, {pile, drop, what, count, spare = 0, extra = {}}) {
  const pieces = part.pieces ?? [part.piece], kg = part.kg ?? part.piece.kg * count, spareKg = part.spareKg ?? (part.piece?.kg ?? 0) * spare;
  return {kind:'haul', id, good:part.good ?? part.piece?.id ?? id, goodName:part.goodName ?? `${part.piece?.name ?? 'load'}s`, pieces, maxKg:kg,
    pile:{...pile, kg:kg + spareKg}, drop, lines:part.lines ?? {}, startLineId:part.lines?.start, closing:[...(part.closing ?? [])],
    words:part.words, what, ...extra};
}

const BUILDERS = Object.freeze({
  // Chapter 11: flour out to Dot, pies home.
  trade(town, row, {outpost}) {
    const home = homePile(town), dot = spotOf(row.outpostId, NAMES_OF[row.outpostId], ...Object.values(beside(outpost, 20)), 12);
    return [haulStep('out', row.out, {pile:home, drop:dot, count:row.out.count, spare:row.out.spare, what:`Drive to ${home.name} and stop beside it.`}),
      haulStep('back', row.back, {pile:dot, drop:home, count:row.back.count, spare:row.back.count, what:"Stop in the ring at Dot's diner."})];
  },
  // Chapter 13: chalk and books to the school.
  delivery(town, row, {outpost}) {
    const home = homePile(town), school = spotOf(row.outpostId, NAMES_OF[row.outpostId], ...Object.values(beside(outpost, 22)), 12);
    return [haulStep('out', row.out, {pile:home, drop:school, what:`Drive to ${home.name} and stop beside it.`,
      extra:row.out.nearLineId ? {sayNear:[{place:school, radius:60, lineId:row.out.nearLineId}]} : {}})];
  },
  // Chapter 14: salt up the Ridge, goats down.
  goats(town, row, {outpost}) {
    const home = homePile(town), hut = spotOf(row.outpostId, NAMES_OF[row.outpostId], ...Object.values(beside(outpost, 22)), 12);
    const salt = {good:'salt', goodName:'salt', piece:row.salt.piece, lines:{start:row.lines.start}, closing:[row.goats.lines.atPile],
      words:{first:'Hold still while the first sack of salt goes on.', loading:'Hold still while the salt goes on.', full:"That is all the salt. Drive up the Ridge to Old Tam's hut.",
        carry:"Take the salt up the Ridge to Old Tam's hut and stop in the ring.", unloading:'Hold still while the salt comes off.', delivered:'You delivered'}};
    const goats = {good:'goat', goodName:'goats', piece:row.goats.piece, lines:{atPile:row.goats.loadingLineId, setOff:row.goats.lines.setOff},
      closing:row.goats.closing, words:row.goats.words};
    return [haulStep('salt', salt, {pile:home, drop:hut, count:row.salt.count, spare:row.salt.count, what:`Drive to ${home.name} and stop beside it.`}),
      haulStep('goats', goats, {pile:hut, drop:home, count:row.goats.count, spare:4, what:"Stop in the ring at Old Tam's hut."})];
  },
  // Chapter 12, first part: the fire at Dot's, then the Rats who lit it.
  'outpost-fire'(town, row, {outpost, ember}) {
    const world = OUTPOSTS_WORLD.find(item => item.id === row.outpostId), [west, north, east, south] = world.bounds;
    const half = Math.max(east - west, south - north) / 2, id = `outpost:${row.outpostId}`, name = NAMES_OF[row.outpostId];
    const diner = Object.freeze({id, buildingId:row.outpostId, name, x:outpost.x, z:outpost.z, halfX:half, halfZ:half,
      areaM2:(east - west) * (south - north), fuelHours:fuelHours({buildingId:row.burnsLike}), heat:row.heat,
      position:Object.freeze({x:outpost.x, z:outpost.z}), radius:half + 10});
    const well = beside(outpost, 14, 22), door = beside(outpost, 22);
    const lines = Object.freeze({...FIRE_LINES, start:row.lines.start, won:row.lines.won, burnt:row.lines.burnt});
    const cinder = ember?.smokeBeaten === true ? {afterStartLineId:row.lines.cinder} : {};
    return [{kind:'douse', id:'douse', mainId:id, buildings:[diner], headStartSeconds:row.headStartSeconds, heldUntilMetres:150,
      water:[Object.freeze({id:'water:dot-well', kind:'well', name:"Dot's well", position:Object.freeze(well), flowLpm:row.well.flowLpm, storeL:row.well.storeL, radius:8})],
      wind:townFireWind(town), tank:{capacityL:3000, startL:3000, pumpLpm:1000}, lines, startLineId:lines.start, ...cinder},
    {kind:'hold', id:'watch', place:spotOf('dot-door', "Dot's door", door.x, door.z, row.watch.radius), radius:row.watch.radius,
      what:"Park in the ring by Dot's door and stay there.", gauge:{label:row.watch.label, total:row.watch.seconds, seconds:row.watch.seconds},
      rats:{...row.watch.rats, place:spotOf('dot-rats', 'the Rats', ...Object.values(beside(outpost, 40, -14)), 12)}}];
  },
  // Chapter 12, second part: a fence round Dot's, stop by stop.
  fence(town, row, {outpost}) {
    const names = ['north', 'east', 'south', 'west'], d = row.stopMetres;
    const stops = [[0, -d], [d, 0], [0, d], [-d, 0]].map(([dx, dz], index) => ({...spotOf(`fence-${names[index]}`, `the ${names[index]} side`, outpost.x + dx, outpost.z + dz, row.stopRadius),
      ...(row.ratsAt.includes(index) ? {rats:{...row.rats, id:`${row.id}-rats`, alertMetres:60}} : {})}));
    return [{kind:'fence', id:'fence', stops, what:"Drive to the first stop at Dot's diner.", startLineId:row.lines.start, closing:[...row.closing]}];
  },
  // Chapter 15: the tanker to Deck Town.
  water(town, row, {outpost}) {
    const at = beside(outpost, row.ringMetres);
    return [{kind:'hold', id:'fill', place:spotOf(row.outpostId, NAMES_OF[row.outpostId], at.x, at.z, row.radius), radius:row.radius,
      what:"Drive the tanker to Deck Town and stop in the ring by their tank.", gauge:{label:'litres pumped', total:row.tank.litres, seconds:row.seconds, easySeconds:row.easySeconds},
      tank:{startL:row.tank.litres, pumpLpm:row.tank.pumpLpm}, startLineId:row.lines.start, arriveLineId:row.lines.arrive, closing:[...row.closing]}];
  },
  // Chapter 16: Pim's water crane, on foot.
  crane(town, row, {outpost}) {
    const park = beside(outpost, -row.parkMetres);
    const joints = Array.from({length:row.bolts}, (_, index) => { const at = beside(outpost, -row.craneMetres, (index - (row.bolts - 1) / 2) * 3);
      return spotOf(`crane-bolt-${index + 1}`, 'the water crane', at.x, at.z, 3); });
    return [{kind:'repair', id:'crane', requiresExit:true, jointName:'bolt', seconds:row.seconds, carPlace:spotOf('halt-yard', NAMES_OF[row.outpostId], park.x, park.z, 14),
      joints, what:"Drive to Pim's Rail Halt and stop in the ring.", startLineId:row.lines.start, startedLineId:row.lines.started, closing:[...row.closing]}];
  },
});

function townRowDefinition(town, row, {seed, ember}) {
  const layout = createTownWorld(town);
  const outpost = row.outpostId ? (layout.outposts?.outposts ?? []).find(item => item.id === row.outpostId) ?? null : null;
  if (row.outpostId && !outpost) return null;
  const steps = BUILDERS[row.kind]?.(town, row, {outpost, seed:seed >>> 0, ember, layout});
  if (!steps?.length) return null;
  const said = step => [step.startLineId, ...[].concat(step.afterStartLineId ?? []), ...(step.opening ?? []), ...(step.closing ?? []), ...Object.values(step.lines ?? {}),
    step.arriveLineId, step.holdLineId, step.outLineId, step.backLineId, step.startedLineId, step.jointLineId, step.downLineId, step.dropLineId, step.hookLineId,
    step.snapLineId, step.raidLineId, step.afterFirstLineId, step.stolen?.lineId, step.rats?.lineId, step.rats?.goneLineId,
    ...(step.sayNear ?? []).map(cue => cue.lineId), ...(step.sayAt ?? []).map(cue => cue.lineId), ...(step.stops ?? []).flatMap(stop => [stop.rats?.lineId, stop.rats?.goneLineId])];
  const lineIds = [...new Set([row.resultLineId, row.card?.lineId, row.vehicle?.lendLineId, ...steps.flatMap(said)].filter(id => TOWN_CAPTIONS[id]))];
  return {
    id:row.id, kind:TOWN_JOB_KIND, townJob:row.kind, chapter:row.chapter ?? null, name:row.name, eyebrow:'THE TOWN', seed:seed >>> 0,
    ...(row.side ? {side:row.side} : {}), ...(row.vehicle != null ? {vehicle:row.vehicle} : {}), layout, outpostSolids:true,
    resultLineId:row.resultLineId, captions:captionsFor(lineIds, town), steps,
  };
}

/**
 * What a finished job of a row hands the town: {runId, jobId, kind:'job', amounts}. `amounts` is what the run really did: the
 * kilograms that arrived, the litres pumped, what was saved. Null when the job was not finished.
 */
function townRowResult(worldJob, runId) {
  const definition = worldJob.definition, row = townJobRow(definition.id), results = worldJob.townResults ?? {};
  const whole = value => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  const amounts = {};
  if (row.kind === 'trade') {
    if (!results.out || !results.back) return null;
    amounts.sacks = Math.floor(whole(results.out.deliveredKg) / row.out.piece.kg);
    amounts.pies = Math.floor(whole(results.back.deliveredKg) / row.back.piece.kg) * row.back.piesEach;
  } else if (row.kind === 'delivery') {
    if (!results.out) return null;
    amounts.kg = whole(results.out.deliveredKg);
  } else if (row.kind === 'goats') {
    if (!results.salt || !results.goats) return null;
    amounts.saltKg = whole(results.salt.deliveredKg);
    amounts.goats = Math.floor(whole(results.goats.deliveredKg) / row.goats.piece.kg);
  } else if (row.kind === 'outpost-fire') {
    if (!results.douse || !results.watch) return null;
    amounts.saved = results.douse.mainSaved === true ? 1 : 0;
    amounts.waterL = Math.min(TOWN_MISSION_MAX_LITRES, whole(results.douse.usedL));
  } else if (row.kind === 'fence') {
    if (!results.fence) return null;
    amounts.stops = whole(results.fence.stops);
  } else if (row.kind === 'water') {
    if (!results.fill) return null;
    amounts.litres = whole(results.fill.total);
  } else if (row.kind === 'crane') {
    if (!results.crane) return null;
    amounts.bolts = whole(results.crane.joints);
  } else return null;
  return {runId, jobId:definition.id, kind:'job', amounts};
}
