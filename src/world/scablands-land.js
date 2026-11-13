// The land the big map (M) always shows in a world job (EVERBURN-PLAY-FIXES, third round): the Scablands' five named places and
// the two gas roads. The places are the ones the jobs define (src/world/jobs/everburn.js) and the roads are the gas runs' own
// (src/world/jobs/gas-run.js); nothing here is a new coordinate. The big map draws this faintly, with the job's own ground bright
// on top. Drawing data only.
import {SCABLANDS_PLACES} from './jobs/everburn.js';
import {GAS_RUN_PATHS} from './jobs/gas-run.js';

const point = place => Object.freeze({x: place.position.x, z: place.position.z});
const PLACES = [['YARD GATE', SCABLANDS_PLACES.yardGate], ['TIN TOWN', SCABLANDS_PLACES.tinTown], ['THE EVERBURN', SCABLANDS_PLACES.everburn],
  ['DEAD MALL', SCABLANDS_PLACES.deadMall], ['BONEYARD', SCABLANDS_PLACES.boneyard]];
const ROADS = [['LONG ROAD', 'long'], ['BONEYARD ROAD', 'boneyard']];

export const SCABLANDS_LAND = Object.freeze({
  places: Object.freeze(PLACES.map(([name, place]) => Object.freeze({id: place.id, name, position: point(place)}))),
  roads: Object.freeze(ROADS.map(([name, id]) => Object.freeze({id, name, points: Object.freeze(GAS_RUN_PATHS[id].map(point))}))),
});
