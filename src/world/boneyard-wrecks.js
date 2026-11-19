// How the Boneyard's three aircraft lie (SCABLANDS-LAND round 3, fix 5). The model carries three wrecks side by side along
// one line; the scene lifts each out of the model at load and sets it down again where this table says: its own heading,
// uneven gaps, and one rolled onto a wing. The table gives each wreck's bounds (an axis-aligned box in world metres, width then
// height then depth, round the whole aircraft; routes keep clear of it) and, apart from that, where the wreck is solid.
//
// A wreck is solid only where something of it is drawn at the height a car meets it (0.25 m to 2.2 m above the ground). One box
// round the whole aircraft stopped a car on open ground between a wing and the nose (Kyle and Claude, 17 November 2026). So each
// wreck has `axis`, the direction of its fuselage on the ground in degrees from +x toward +z, and `parts`, boxes in that frame:
// [u, w, halfU, halfW, height], u along the fuselage and w across it from the wreck's own place. The two level wrecks are a
// fuselage and low wings; the one rolled onto a wing touches the ground only at that wingtip, and a car passes under the rest.
// The rows are measured from the model by `node tools/measure-boneyard-wrecks.mjs`; tools/test-scablands-scene.mjs checks that
// they are what the model gives and that every drawn part at car height lies inside one.
// Each wreck stands at an offset (`dx`, `dz`, metres east and south) from the Boneyard's place, and the table is built from a
// land (src/world/scablands-names.js), so the wrecks move with the Boneyard. `x` and `z` are the world position of the middle of
// the wreck's footprint; `heading` is degrees turned from the model's own line (positive turns the nose toward +z); `roll` is
// degrees about the fuselage (0 is level).
import {LAND} from './scablands-names.js';

const SOLID_PARTS = Object.freeze({
  north: {axis: 7.9, parts: [[0, 0, 4.4, 10.9, 4.3], [-12, 0, 6.4, 3.1, 4.2], [12.5, 0, 4.9, 3.1, 7.9], [-5, 0, 1.4, 8.2, 4.2], [5, -3.2, 1.4, 6.3, 4.2], [7, -1.1, 1.4, 4.2, 4.2], [4.5, 7.4, 0.9, 1.8, 2.2]]},
  east: {axis: -40.9, parts: [[0, 0.2, 4.4, 10.9, 4.3], [-12, 0.2, 6.4, 3.1, 4.2], [12.5, 0.2, 4.9, 3.1, 7.9], [-5, 0.2, 1.4, 8.6, 4.2], [5, -2.8, 1.4, 6.2, 4.2], [7, -0.8, 1.4, 4.1, 4.2], [4.5, 7.6, 0.9, 1.8, 2.2]]},
  south: {axis: 68, parts: [[0, 5.9, 4.8, 2.1, 5.4]]},
});
const wreck = (id, part, dx, dz, heading, roll, size) => ({id, part, dx, dz, heading, roll, size: Object.freeze(size),
  axis: SOLID_PARTS[id].axis, parts: Object.freeze(SOLID_PARTS[id].parts.map(row => Object.freeze(row)))});
const WRECKS = Object.freeze([
  wreck('north', 'North Wreck', -6, -32, 8, 0, [38, 9, 23]),
  wreck('east', 'East Wreck', 42, 34, -30, 0, [33, 9, 30]),
  wreck('south', 'South Wreck', -52, -8, 62, 40, [20, 15, 38]),
]);
// A wreck's solid parts in the world: the middle of each box, its half sizes and its turn, as src/world/scablands-solids.js
// wants a turned box (the box's own x runs along (cos heading, -sin heading), which is the fuselage's direction here).
export function wreckSolidParts(wreck) {
  const angle = wreck.axis * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  return wreck.parts.map(([u, w, halfU, halfW, height], index) => Object.freeze({
    id: index ? `boneyard-wreck-${wreck.id}-${index + 1}` : `boneyard-wreck-${wreck.id}`,
    x: wreck.x + u * cos - w * sin, z: wreck.z + u * sin + w * cos, halfX: halfU, halfZ: halfW, heading: -angle, height}));
}
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
