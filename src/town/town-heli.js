// Kestrel One over the wall (card HELI-RUSTWALL; docs/story/the-long-dry.md section 6): the town's side of the helicopter.
// Pure town rules, no graphics. The fire on the Ridge comes as Old Tam's report in Act 2; Hollis says to build a Helipad;
// once it stands, the pilot flies Kestrel One over from Tremblant, and with no pilot yet, Dune goes by dispatch instead.
// What the helicopter did in the Scablands comes back as commands: the Ridge fire's progress and end, a load set down at
// Old Tam's hut, and the map chunks seen from the air.
//
// The helicopter's own rules never import the town: scablandsHeliInputs() hands them the land as plain data.
import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';
import {TOWN_TIME} from './town-calendar.js';
import {raiseTownReport} from './town-reports.js';
import {TOWN_NEIGHBOURS} from './content/neighbours.js';
import {changeTownNeighbourStanding} from './town-outposts.js';
import {addExploredChunks} from './town-dispatch.js';
import {createTownWorld} from './town-world.js';
import {TOWN_CELL_METRES, TOWN_CHUNK_CELLS} from './town-world-data.js';
import {SCABLANDS_PLACES, SCABLANDS_LAYOUT} from '../world/scablands.js';
import {SCABLANDS_SOLIDS} from '../world/scablands-solids.js';
import {scablandsSurfaceHeightAt, scablandsRoadDistance} from '../world/scablands-ground.js';
import {ROAD_HALF_WIDTH} from '../world/scablands-road.js';

export const TOWN_HELI = Object.freeze({
  // The Ridge fire comes in the year Old Tam's outpost opens (src/town/content/neighbours.js), in Act 2.
  ridgeFireYear: TOWN_NEIGHBOURS.find(neighbour => neighbour.id === 'tam').opensYear,
  // Dune goes to fetch the helicopter he is owed on the first day and puts the fire out on the second.
  duneDays: 2,
  // A load set down at Old Tam's hut is a delivery: +10 standing with him (docs/WASTELAND_TOWN.md section 14).
  liftStanding: 10,
  regionId: 'scablands',
});
const FIRE_STATES = Object.freeze(['burning', 'out', 'lost', 'dune']);
const LIFT_IDS = Object.freeze(['tam-feed', 'tam-truck']);

// The town's helicopter record, made the first time it is needed (an older town reads as nothing done).
export function townHeliOf(town) {
  const stored = town?.heli && typeof town.heli === 'object' ? town.heli : null;
  return {ridgeFire: stored?.ridgeFire ?? null, liftsDone: Array.isArray(stored?.liftsDone) ? stored.liftsDone : [],
    scouted: Number.isSafeInteger(stored?.scouted) ? stored.scouted : 0, flown: stored?.flown === true};
}
function heliState(town) {
  town.heli ||= {ridgeFire: null, liftsDone: [], scouted: 0, flown: false};
  town.heli.liftsDone ||= [];
  if (!Number.isSafeInteger(town.heli.scouted)) town.heli.scouted = 0;
  return town.heli;
}

// The town's finished Helipad, if any: the first by id, so the choice never moves. Its middle in metres.
const finished = (town, buildingId) => (town?.buildings ?? []).filter(building => building.buildingId === buildingId && building.state === 'finished')
  .sort((a, b) => String(a.id).localeCompare(String(b.id)));
const middle = building => ({x: (building.x + (building.width ?? 4) / 2) * TOWN_CELL_METRES, z: (building.z + (building.depth ?? 4) / 2) * TOWN_CELL_METRES,
  half: Math.min(building.width ?? 4, building.depth ?? 4) * TOWN_CELL_METRES / 2});
export const townHelipad = town => { const pad = finished(town, 'helipad')[0]; return pad ? {id: pad.id, ...middle(pad)} : null; };

// Why the pilot cannot fly over the wall now, as a sentence, or null when they can. lessonsDone: the helicopter save's
// lessons ({liftoff, hover, landing, carry}); the bucket and the hook want all four.
export function scablandsVisitRefusal(town, {lessonsDone = null} = {}) {
  if (!townHelipad(town)) return 'Build a Helipad in the town first. Kestrel One needs somewhere to land.';
  if (!lessonsDone || !['liftoff', 'hover', 'landing', 'carry'].every(id => lessonsDone[id] === true))
    return 'Finish Brian\'s four flying lessons at Tremblant Woods first, then Kestrel One can come over the wall.';
  return null;
}

// The land as plain inputs for the helicopter's Scablands place. heightAt: the ground as the town has shaped it (the same one the
// town's scene and the cars use, unless a test passes another).
export function scablandsHeliInputs(town, {heightAt = scablandsSurfaceHeightAt} = {}) {
  const pad = townHelipad(town), reservoirs = finished(town, 'reservoir');
  const skip = new Set([pad?.id, ...reservoirs.map(r => r.id)].filter(Boolean));
  // A solid stored wholly under the ground there (the Ridge's kit keeps the place's old 18 m height under the 45 m Ridge top)
  // stands on the ground for the helicopter, as it is drawn.
  const fromSolid = solid => {
    const base = Number.isFinite(solid.minY) ? solid.minY : solid.y, top = Number.isFinite(solid.maxY) ? solid.maxY : solid.y + solid.height;
    const floor = heightAt(solid.x, solid.z), buried = top < floor;
    return {id: solid.id, kind: solid.kind ?? 'building', x: solid.x, z: solid.z, radius: Math.max(solid.halfX ?? 0, solid.halfZ ?? 0),
      base: buried ? floor : base, top: buried ? floor + (top - base) : top};
  };
  const townSolids = town ? createTownWorld(town).solids.filter(solid => !skip.has(solid.id)) : [];
  const record = townHeliOf(town);
  return Object.freeze({
    heightAt, roadDistance: scablandsRoadDistance, roadHalfWidth: ROAD_HALF_WIDTH,
    solids: Object.freeze([...SCABLANDS_SOLIDS, ...townSolids].map(fromSolid)),
    places: SCABLANDS_PLACES, land: Object.freeze({halfWidth: SCABLANDS_LAYOUT.halfWidth, halfDepth: SCABLANDS_LAYOUT.halfDepth}),
    chunkMetres: TOWN_CELL_METRES * TOWN_CHUNK_CELLS, seed: Number.isSafeInteger(town?.seed) ? town.seed : 0,
    pad: pad ? Object.freeze({x: pad.x, z: pad.z}) : null,
    reservoirs: Object.freeze(reservoirs.map(r => Object.freeze(middle(r)))),
    explored: Object.freeze((town?.dispatch?.explored ?? []).filter(area => area?.regionId === TOWN_HELI.regionId).map(area => Object.freeze({x: area.x, z: area.z}))),
    ridgeFire: record.ridgeFire ? Object.freeze({state: record.ridgeFire.state, fire: record.ridgeFire.fire ?? null}) : null,
    liftsDone: Object.freeze([...record.liftsDone]), flown: record.flown,
  });
}

// ---- The fire on the Ridge ---------------------------------------------------------------------------------------------
function raiseRidgeReport(town) {
  return raiseTownReport(town, 'ridge-fire', {ridgeFire: true, where: 'The Ridge', detail: 'No truck can get up the Ridge, so the help must come from the air.'});
}

// Dune goes in the pilot's place (docs/story/the-long-dry.md section 6): the job is done in two days, whatever the dice say,
// and the Helipad waits for a pilot.
export function sendDuneToRidge(town) {
  const fire = townHeliOf(town).ridgeFire;
  if (fire?.state !== 'burning') return {ok: false, message: 'Nothing is burning on the Ridge.'};
  if (fire.dune) return {ok: false, message: 'Dune is already on his way to the Ridge.'};
  if ((town.dispatch?.active ?? []).some(job => job.crewId === 'dune')) return {ok: false, message: 'Dune is out on another job, so he can go to the Ridge when he is back.'};
  const state = heliState(town);
  state.ridgeFire = {...state.ridgeFire, dune: {startedTick: BigInt(town.tick), daysRemaining: TOWN_HELI.duneDays}};
  return {ok: true, lineId: 'town.heli.dune', message: 'Dune has gone to the Ridge. The fire will be out in two days.'};
}

function settleRidge(town, outcome, by) {
  const state = heliState(town);
  if (state.ridgeFire?.state !== 'burning') return {ok: false, message: 'Nothing is burning on the Ridge.'};
  const {dune, fire, ...kept} = state.ridgeFire;
  state.ridgeFire = {...kept, state: outcome, settledTick: BigInt(town.tick), by};
  town.book ||= [];
  const text = outcome === 'out' ? 'Kestrel One came over the wall and put out the fire on the Ridge.'
    : outcome === 'dune' ? 'Dune put out the fire on the Ridge with a borrowed helicopter, and nobody asked him where it came from.'
      : 'The fire on the Ridge burnt out the scrub. Old Tam and his goats were safe.';
  town.book.push({type: 'ridge-fire', tick: BigInt(town.tick), text});
  return {ok: true, message: text};
}

// The helicopter's word on the Ridge fire: its record while it burns (so the next visit carries on where this one stopped),
// or how it ended.
export function heliRidgeFire(town, {state, fire = null} = {}) {
  const current = townHeliOf(town).ridgeFire;
  if (current?.state !== 'burning') return {ok: false, message: 'Nothing is burning on the Ridge.'};
  if (state === 'out' || state === 'lost') return settleRidge(town, state, 'player');
  if (state !== 'burning' || !fire || !Array.isArray(fire.burning) || !Array.isArray(fire.burnt)) return {ok: false, message: 'That is not a fire the town knows.'};
  heliState(town).ridgeFire = {...current, fire};
  return {ok: true, message: 'The fire on the Ridge is still burning.'};
}

// ---- Lifts and scouting ------------------------------------------------------------------------------------------------
export function heliLiftDone(town, {liftId} = {}) {
  if (!LIFT_IDS.includes(liftId)) return {ok: false, message: 'That is not a load for Old Tam.'};
  const state = heliState(town);
  if (state.liftsDone.includes(liftId)) return {ok: false, message: 'That load is already up on the Ridge.'};
  state.liftsDone.push(liftId);
  changeTownNeighbourStanding(town, 'tam', TOWN_HELI.liftStanding);
  return {ok: true, message: liftId === 'tam-feed' ? 'Old Tam has his goat feed.' : 'Old Tam has his pickup back.'};
}

export function heliScout(town, {chunks = []} = {}) {
  const valid = (Array.isArray(chunks) ? chunks : []).filter(chunk => Number.isSafeInteger(chunk?.x) && Number.isSafeInteger(chunk?.z));
  if (!valid.length) return {ok: false, message: 'Nothing new was seen from the air.'};
  const added = addExploredChunks(town, TOWN_HELI.regionId, valid);
  heliState(town).scouted += added;
  return {ok: true, added, message: added ? `Kestrel One put ${added} new pieces of the land on the map.` : 'That land is already on the map.'};
}

// The first visit over the wall, so Roger's surprise is said once.
export function heliFlown(town) {
  const state = heliState(town);
  if (state.flown) return {ok: true, already: true, message: 'Kestrel One has been over the wall before.'};
  state.flown = true;
  return {ok: true, already: false, message: 'Kestrel One came over the wall for the first time.'};
}

registerTownCommand('heliSendDune', town => sendDuneToRidge(town));
registerTownCommand('heliRidgeFire', (town, command) => heliRidgeFire(town, command));
registerTownCommand('heliLiftDone', (town, command) => heliLiftDone(town, command));
registerTownCommand('heliScout', (town, command) => heliScout(town, command));
registerTownCommand('heliFlown', town => heliFlown(town));

// Once a day: the Ridge fire starts in Old Tam's year, its report comes back on the first of each month while it burns
// and nobody has answered, an answer of "send Dune" sends him, and Dune's two days run down.
export function townHeliSystem({town, calendar}) {
  const record = townHeliOf(town);
  if (!record.ridgeFire) {
    if ((calendar?.year ?? 1) < TOWN_HELI.ridgeFireYear) return;
    heliState(town).ridgeFire = {state: 'burning', raisedTick: BigInt(town.tick)};
    raiseRidgeReport(town);
    return;
  }
  const fire = record.ridgeFire;
  if (fire.state !== 'burning') return;
  const asked = (town.reports ?? []).find(report => report.eventId === 'ridge-fire' && report.unanswered === false && report.answerId === 'send-dune' && !report.heliSettled);
  if (asked) { asked.heliSettled = true; sendDuneToRidge(town); }
  const dune = townHeliOf(town).ridgeFire.dune;
  if (dune) {
    const left = dune.daysRemaining - 1;
    if (left <= 0) settleRidge(town, 'dune', 'dune');
    else heliState(town).ridgeFire.dune = {...dune, daysRemaining: left};
    return;
  }
  const waiting = (town.reports ?? []).some(report => report.eventId === 'ridge-fire' && report.unanswered);
  if (!waiting && calendar?.day === 1) raiseRidgeReport(town);
}
registerTownSystem('town-heli', 72, TOWN_TIME.ticksPerDay, townHeliSystem);

export const ridgeFireDuneDaysLeft = town => townHeliOf(town).ridgeFire?.dune?.daysRemaining ?? null;
export {FIRE_STATES as TOWN_HELI_FIRE_STATES};
