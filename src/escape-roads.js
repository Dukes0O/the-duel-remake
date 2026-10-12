// Escape roads (a circuit's `escapeRoads`): a straight run-off on the outside of a
// named turn, behind an opening in the wall (src/track-script-course.js makes the
// walls, src/track-script-scene.js draws the ground; `colour` is the gravel's own colour,
// for a night circuit that wants it darker). Pure geometry on the road.
import { TRACK_SCRIPT, TrackScriptError } from './track-script.js';

export function escapeRoadsFor(course) {
  const specs = course.def.escapeRoads;
  if (!Array.isArray(specs) || !specs.length) return [];
  const script = course.script;
  return specs.map(spec => {
    const piece = script.pieces.find(item => item.kind === 'turn' && item.name === spec.piece);
    if (!piece) throw new TrackScriptError(`Escape road "${spec.id}" names no turn called "${spec.piece}".`);
    const side = -piece.dir, frame = course.at(piece.s0), half = script.halfWidthAt(piece.s0);
    const run = spec.run ?? 70, width = spec.width ?? 10, outer = half + TRACK_SCRIPT.wallSetback, inner = outer - width;
    const forward = { x: Math.sin(frame.heading), z: Math.cos(frame.heading) }, left = { x: Math.cos(frame.heading), z: -Math.sin(frame.heading) };
    return Object.freeze({ id: spec.id, piece: piece.name, s0: piece.s0, side, run, width, inner, outer, heading: frame.heading,
      origin: Object.freeze({ x: frame.x, y: frame.y, z: frame.z }), forward, left, tyreDepth: spec.tyreDepth ?? 1.8, colour: spec.colour ?? null });
  });
}

// A point's place in an escape road's own frame: metres forward of the turn's
// start, and metres outward from the road's centre line.
export function escapeFrame(escape, x, z) {
  const dx = x - escape.origin.x, dz = z - escape.origin.z;
  return { u: dx * escape.forward.x + dz * escape.forward.z, v: escape.side * (dx * escape.left.x + dz * escape.left.z) };
}

