// Places by name (SCABLANDS-LAND round 4). Nothing that belongs to the Scablands writes a position of the land as a bare
// number. A position is one of three things, all worked out from the table of places (SCABLANDS_PLACES) and the yard:
//   land.at('tin-town', 12, -30)               a thing that stands in a place: the place's position plus an offset in metres;
//   land.between('yard', 'boneyard', .5, 7, -10)  a point on the way between two places: a share of the way from the first to the
//                                              second, plus an offset in metres (x east, z south);
//   land.yard                                  the yard at (0, 0), which never moves.
// So changing one place in the table moves everything written this way with it. A job file builds its positions from a
// land (`buildEverburn(land)`), and the game's own constants are built from the real one (`LAND`); a test builds them again
// from a copy of the table with one place moved and checks what followed it (tools/test-scablands-size.mjs).
import {SCABLANDS_PLACES} from './scablands.js';

const YARD = Object.freeze({id: 'yard', name: 'The Yard', x: 0, z: 0});
const point = (x, z) => Object.freeze({x, z});

// Named points that are not places but that more than one job names: the halfway camp on the way from the yard to the
// Boneyard (job 1's safe point, the escort's road, the furnace's way home). Each is a share of the way between two places
// plus an offset, like any other point.
const NAMED_POINTS = Object.freeze([
  Object.freeze({id: 'safe-road', name: 'The halfway camp', from: 'yard', to: 'boneyard', share: .526, dx: 7.06, dz: -9.84}),
  // The Ash Men's two barricades on the way, near the start and near the Boneyard.
  Object.freeze({id: 'ash-barricade-1', name: 'First barricade', from: 'yard', to: 'boneyard', share: .392, dx: 13.76, dz: -19.19}),
  Object.freeze({id: 'ash-barricade-2', name: 'Second barricade', from: 'yard', to: 'boneyard', share: .873, dx: 39.76, dz: -55.45}),
]);

export function createLand(table = SCABLANDS_PLACES) {
  const rows = new Map([[YARD.id, YARD], ...table.map(row => [row.id, row])]);
  for (const named of NAMED_POINTS) {
    const a = rows.get(named.from), b = rows.get(named.to);
    rows.set(named.id, Object.freeze({id: named.id, name: named.name,
      x: a.x + (b.x - a.x) * named.share + named.dx, z: a.z + (b.z - a.z) * named.share + named.dz}));
  }
  const row = id => {
    const found = rows.get(id);
    if (!found) throw new RangeError(`The Scablands has no place called ${JSON.stringify(id)}.`);
    return found;
  };
  return Object.freeze({
    table, yard: YARD,
    place: row,
    // The place's own position plus an offset (east, south) in metres.
    at: (id, dx = 0, dz = 0) => point(row(id).x + dx, row(id).z + dz),
    // `share` of the way from place `from` to place `to` (0 is `from`, 1 is `to`), plus an offset in metres.
    between: (from, to, share, dx = 0, dz = 0) => {
      const a = row(from), b = row(to);
      return point(a.x + (b.x - a.x) * share + dx, a.z + (b.z - a.z) * share + dz);
    },
  });
}

// The land as the game has it.
export const LAND = createLand();

// A copy of a table with one place moved by (dx, dz): for tests, to see what follows a place.
export const movedTable = (table, id, dx, dz) => Object.freeze(table.map(row =>
  row.id === id ? Object.freeze({...row, x: row.x + dx, z: row.z + dz}) : row));
