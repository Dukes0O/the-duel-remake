import {LAND} from '../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {BUILDINGS} from './content/buildings.js';

export function pointInBuilding(row, offset = [0, 0], land = LAND) {
  return land.at(row.place, row.at[0] + offset[0], row.at[1] + offset[1]);
}

export function roomAt(point, rows = BUILDINGS) {
  if (!point) return null;
  return rows.find(row => {
    const centre = pointInBuilding(row);
    if (Math.abs(point.x - centre.x) >= row.size[0] / 2 - .08 ||
        Math.abs(point.z - centre.z) >= row.size[1] / 2 - .08) return false;
    if (Number.isFinite(point.y)) {
      const floor = scablandsSurfaceHeightAt(centre.x, centre.z);
      if (point.y < floor - .6 || point.y >= floor + row.size[2]) return false;
    }
    return true;
  }) ?? null;
}

export function inBay(row, car) {
  if (!row.carBay || !car) return false;
  const bay = pointInBuilding(row, row.carBay.at);
  return Math.hypot(car.x - bay.x, car.z - bay.z) <= row.carBay.radius;
}

// The drawing and collision grid share the dimensions, including both jambs.
export function buildingWalls(row) {
  const [width, depth, height] = row.size;
  const sides = [['north', width, -1, false], ['south', width, 1, false],
    ['west', depth, -1, true], ['east', depth, 1, true]];
  return sides.flatMap(([side, length, sign, across]) => {
    const edge = sign * (across ? width : depth) / 2;
    const panel = (name, middle, span) => ({
      id: row.id + '/' + name, side, kind: 'wall', shape: 'box',
      ...pointInBuilding(row, across ? [edge, middle] : [middle, edge]),
      halfX: across ? .08 : span/2, halfZ: across ? span/2 : .08,
      heading: 0, height, exactCarCorners: true,
    });
    if (row.door.side !== side) return [panel(side, 0, length)];
    const jamb = (length - row.door.width) / 2, middle = (length + row.door.width) / 4;
    return [panel(side + '-left', -middle, jamb), panel(side + '-right', middle, jamb)];
  });
}
