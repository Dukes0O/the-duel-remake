// How the Boneyard's three aircraft lie (SCABLANDS-LAND round 3, fix 5). The model carries three wrecks side by side along
// one line; the scene lifts each out of the model at load and sets it down again where this table says: its own heading,
// uneven gaps, and one rolled onto a wing. Each is also solid where it is drawn, so the table gives each wreck's footprint
// (an axis-aligned box in world metres, width then height then depth; tools/test-scablands-scene.mjs checks that the real model's
// parts all lie inside it).
// Each wreck stands at an offset (`dx`, `dz`, metres east and south) from the Boneyard's place, and the table is built from a
// land (src/world/scablands-names.js), so the wrecks move with the Boneyard. `x` and `z` are the world position of the middle of
// the wreck's footprint; `heading` is degrees turned from the model's own line (positive turns the nose toward +z); `roll` is
// degrees about the fuselage (0 is level).
import {LAND} from './scablands-names.js';

const wreck = (id, part, dx, dz, heading, roll, size) => ({id, part, dx, dz, heading, roll, size: Object.freeze(size)});
const WRECKS = Object.freeze([
  wreck('north', 'North Wreck', -6, -32, 8, 0, [38, 9, 23]),
  wreck('east', 'East Wreck', 42, 34, -30, 0, [33, 9, 30]),
  wreck('south', 'South Wreck', -52, -8, 62, 40, [20, 15, 38]),
]);
export function boneyardWrecks(land) {
  const {x, z} = land.at('boneyard');
  return Object.freeze(WRECKS.map(row => Object.freeze({...row, x: x + row.dx, z: z + row.dz})));
}
// Where Big Bess stands when no job moves her: clear of every wreck by at least 5 m and off both gas-run roads.
export function bessRest(land) {
  const {x, z} = land.at('boneyard', 40, -42);
  return Object.freeze({x, z, heading: 2.2});
}
export const BONEYARD_WRECKS = boneyardWrecks(LAND);
export const BESS_REST = bessRest(LAND);
