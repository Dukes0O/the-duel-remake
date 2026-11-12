// How the Boneyard's three aircraft lie (SCABLANDS-LAND round 3, fix 5). The model carries three wrecks side by side along
// one line; the scene lifts each out of the model at load and sets it down again where this table says: its own heading,
// uneven gaps, and one rolled onto a wing. Each is also solid where it is drawn, so the table gives each wreck's footprint
// (an axis-aligned box in world metres, width then height then depth; tools/test-scablands-scene.mjs checks that the real model's
// parts all lie inside it).
// Positions are world metres of the middle of the wreck's footprint; `heading` is degrees turned from the model's own
// line (positive turns the nose toward +z); `roll` is degrees about the fuselage (0 is level).
export const BONEYARD_WRECKS=Object.freeze([
  Object.freeze({id:'north',part:'North Wreck',x:418,z:272,heading:8,roll:0,size:Object.freeze([38,9,23])}),
  Object.freeze({id:'east',part:'East Wreck',x:466,z:338,heading:-30,roll:0,size:Object.freeze([33,9,30])}),
  Object.freeze({id:'south',part:'South Wreck',x:372,z:296,heading:62,roll:40,size:Object.freeze([20,15,38])}),
]);
// Where Big Bess stands when no job moves her: clear of every wreck by at least 5 m and off both gas-run roads.
export const BESS_REST=Object.freeze({x:464,z:262,heading:2.2});
