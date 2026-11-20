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
import {createTownMissionClock, townMissionDropCell, townMissionResult} from '../../town/town-missions.js';
import {stepTown} from '../../town/index.js';
import {townCaptionText, TOWN_CAPTIONS} from '../../town/content/lines.js';

export const TOWN_JOB_KIND = 'town-job';
export const TOWN_HAUL_CHAPTER = 'town.act1.salvage';

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
  if (townSteelShortage(town)) open.push({id:'town-steel-run', kind:'steel', chapter:false});
  if (townSalvageChapterOpen(town)) open.push({id:'town-haul-salvage', kind:'salvage', chapter:true});
  else if (townSalvageRunOpen(town)) open.push({id:'town-salvage-run', kind:'salvage', chapter:false});
  return open;
}

const NAMES = Object.freeze({'town-haul-salvage':'What We Can Find', 'town-salvage-run':'The Salvage Run', 'town-steel-run':'The Steel Run'});
const CLOSING = Object.freeze({'town-haul-salvage':'town.3.won', 'town-salvage-run':'town.haul.won', 'town-steel-run':'town.steel.won'});

/**
 * A town job's definition for the World Job mode, or null when that job is not open in this town. `seed` sets the order the
 * pile's pieces come in. The town's layout is read once here, so a replay is repeatable from seed, inputs and that layout.
 */
export function townJobDefinition(town, jobId, {seed = town?.seed ?? 1} = {}) {
  const open = openTownJobs(town).find(job => job.id === jobId);
  if (!open) return null;
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
  radioGapSeconds = 60} = {}) {
  if (!town || typeof town !== 'object' || typeof runId !== 'string' || !runId) throw new TypeError('A town job run needs its town and run id.');
  const clock = createTownMissionClock(town, {step, secondsPerTick, radioGapSeconds});
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
