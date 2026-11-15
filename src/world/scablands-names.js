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

// Named points that are not places but that more than one thing names: the halfway camp on the East Road (job 1's safe point, the
// escort's road, the furnace's way home), the Ash Men's two barricades on that road, the nodes of the dry river and the five
// places where it can be crossed. Each is a share of the way between two places or points that come earlier in this list, plus an
// offset, like any other point (`to` left out means the point is the offset from `from`).
const named = (id, name, from, to, share, dx = 0, dz = 0) => Object.freeze({id, name, from, to, share, dx, dz});
const NAMED_POINTS = Object.freeze([
  // The dry river (SCABLANDS-LAND round 4, slice 2a): from the Dry Dam's spillway, along the yard's north side, south between the yard
  // and Tin Town, out by the south side east of the Dead Mall. Eleven nodes; the bed is 120 m wide.
  // The head stands 980 m east of the Dry Dam (it was 300), so that the long road and Old Smoke's way, which pass the Dam's east side and turn toward the Ships, do not cross its rounded end (slice 2b).
  named('river-0', 'The river head', 'dry-dam', 'ridge', 0.13, 5, 40),
  named('river-1', 'River bend 1', 'dry-dam', 'tin-town', 0.162, -20, 50),
  named('river-2', 'River bend 2', 'ships-in-sand', 'everburn', 0.316, 140, 80),
  named('river-3', 'River bend 3', 'dry-dam', 'tin-town', 0.452, 10, -35),
  named('river-4', 'River bend 4', 'boneyard', 'ships-in-sand', 0.608, 140, -75),
  named('river-5', 'River bend 5', 'dead-mall', 'ridge', 0.672, 50, 30),
  named('river-6', 'River bend 6', 'tin-town', 'everburn', 0.256, -80, -280),
  named('river-7', 'River bend 7', 'dead-mall', 'tin-town', 0.536, -215, -295),
  named('river-8', 'River bend 8', 'boneyard', 'everburn', 0.217, 0, -140),
  named('river-9', 'River bend 9', 'boneyard', 'dead-mall', 0.56, 135, 455),
  named('river-10', 'The river mouth', 'boneyard', 'dead-mall', 0.601, 240, 805),
  // The five crossings, each a share of the way along one stretch of the river.
  named('girder-bridge', 'The Girder Bridge', 'river-5', 'river-6', .818),
  named('the-steps', 'The Steps', 'river-5', 'river-6', .318),
  named('the-wash', 'The Wash', 'river-7', 'river-8', .5),
  named('the-pipe', 'The Pipe', 'river-3', 'river-4', .43),
  named('south-ford', 'The South Ford', 'river-8', 'river-9', .615),
  // The halfway camp, on the East Road's straight stretch between the yard and the bend before the Girder Bridge.
  named('safe-road', 'The halfway camp', 'yard', 'boneyard', .47, 8, -230),
  // The Ash Men's barricades stand at the camp and on the bridge deck.
  named('ash-barricade-1', 'First barricade', 'safe-road'),
  named('ash-barricade-2', 'Second barricade', 'girder-bridge'),
]);

export function createLand(table = SCABLANDS_PLACES) {
  const rows = new Map([[YARD.id, YARD], ...table.map(row => [row.id, row])]);
  for (const point of NAMED_POINTS) {
    const a = rows.get(point.from), b = point.to ? rows.get(point.to) : a, share = point.to ? point.share : 0;
    rows.set(point.id, Object.freeze({id: point.id, name: point.name,
      x: a.x + (b.x - a.x) * share + point.dx, z: a.z + (b.z - a.z) * share + point.dz}));
  }
  const row = id => {
    const found = rows.get(id);
    if (!found) throw new RangeError(`The Scablands has no place called ${JSON.stringify(id)}.`);
    return found;
  };
  return Object.freeze({
    table, yard: YARD,
    // The named points that are not places (the river's nodes, the crossings, the halfway camp, the barricades), each {id, name, x, z}.
    named: Object.freeze(NAMED_POINTS.map(point => rows.get(point.id))),
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
