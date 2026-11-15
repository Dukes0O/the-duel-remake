// The Scablands' four scarps (SCABLANDS-LAND round 4, slice 2b): a steep face of broken rock, 12 to 20 m high, on one side of a table of
// raised ground that dips away gently on the other. A car cannot climb the face (src/world/scablands-ground-rules.js: the ground is too
// steep to grip), so a scarp is a wall with its ends open: the way through is round an end, or through a gap between two stretches.
// A scarp is height only, added to the land's own height (src/world/scablands-height.js), so that the picture, the car and a person on
// foot all read one shape. Every point of one is written through the land's names (src/world/scablands-names.js); the card puts them
// "on the scab plates either side of the Steps", "north of the Halfway Camp" and "between the salt pan and the Ridge".
import {LAND} from './scablands-names.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };

// The face is twice as wide as it is high (a slope of .75 at its steepest, the shader's rock look and a car's grip limit both read it as
// a cliff); behind the face the top dips back to the plain over `dip` metres (a slope of about .07); each end of a stretch fades over
// `taper` metres, which is how a car gets round the end.
export const SCARP = Object.freeze({faceRatio: 2, dip: 300, taper: 140});

// A scarp is {id, name, height, stretches: [{a, b}]}: each stretch runs from point a to point b with its face on the LEFT of the way from a
// to b (the foot of the face is the line itself, the top lies to the right). All positions are in metres, x east and z south.
export function scarpsFor(land = LAND) {
  const line = (share, dx, dz) => land.between('yard', 'tin-town', share, dx, dz);
  const stretch = (a, b) => Object.freeze({a: Object.freeze({x: a.x, z: a.z}), b: Object.freeze({x: b.x, z: b.z})});
  return Object.freeze([
    // West of the Steps, on the scab plates: a wall running north from the line of the short cut, face to the west. The short cut passes
    // south of its end.
    Object.freeze({id: 'scab-west', name: 'The west scab scarp', height: 14,
      stretches: Object.freeze([stretch(line(.2917, 0, -300), line(.2917, 0, -1000))])}),
    // East of the Steps: the same, 1,700 m on, face to the west again, so the short cut is a way between two ends and not a line.
    Object.freeze({id: 'scab-east', name: 'The east scab scarp', height: 18,
      stretches: Object.freeze([stretch(line(.5833, 0, -310), line(.5833, 0, -1050))])}),
    // North of the Halfway Camp: a wall running west to east, face to the south toward the camp, top to the north.
    Object.freeze({id: 'camp-north', name: 'The camp scarp', height: 12,
      stretches: Object.freeze([stretch(land.at('safe-road', 150, -560), land.at('safe-road', -650, -560))])}),
    // Between the salt pan and the Ridge: a wall running east to west, face to the north, top to the south.
    Object.freeze({id: 'ridge-south', name: 'The Ridge scarp', height: 20,
      stretches: Object.freeze([stretch(land.at('ridge', -1050, 740), land.at('ridge', -250, 740))])}),
  ]);
}

// What a stretch makes of a point: its own coordinates. `across` is metres from the face's foot toward the top (negative on the foot's
// side), `along` metres from the stretch's start.
function prepare(scarp) {
  const width = scarp.height * SCARP.faceRatio;
  return scarp.stretches.map(({a, b}) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z), tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
    // Seen on a map (x to the right, z down), the face is on the left hand of someone walking from a to b and the top is on the right.
    const reach = width + SCARP.dip + SCARP.taper;
    const xs = [a.x, b.x], zs = [a.z, b.z];
    return {scarp, a, tx, tz, length, width, height: scarp.height,
      x0: Math.min(...xs) - reach, x1: Math.max(...xs) + reach, z0: Math.min(...zs) - reach, z1: Math.max(...zs) + reach};
  });
}

// The scarps' height at a point, for a list of scarps (`SCARPS` is the game's own).
export function scarpHeightFor(prepared, x, z) {
  let height = 0;
  for (const s of prepared) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    const dx = x - s.a.x, dz = z - s.a.z;
    const along = dx * s.tx + dz * s.tz, across = -(dx * s.tz - dz * s.tx);
    if (across <= 0 || along <= -SCARP.taper || along >= s.length + SCARP.taper) continue;
    // The profile across: the face from the foot to its top, then the dip back to the plain.
    const profile = across < s.width ? smooth(across / s.width) : 1 - smooth((across - s.width) / SCARP.dip);
    // The ends fade in along the line (a stretch is a full height only between its two tapers' ends).
    const ends = smooth((Math.min(along, s.length - along) + SCARP.taper * .5) / SCARP.taper);
    height = Math.max(height, s.height * profile * ends);
  }
  return height;
}

export const SCARPS = scarpsFor(LAND);
const PREPARED = SCARPS.flatMap(prepare);
export const scarpHeightAt = (x, z) => scarpHeightFor(PREPARED, x, z);
export const preparedScarps = scarps => scarps.flatMap(prepare);
