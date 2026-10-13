// Read-only corner cues from actual road geometry and authored coaching notes.
import {sampleCourse, detectCorners, resolveTrackIntel, cornerId} from './track-analysis.js';

const cache = new WeakMap();
const phase = (s, length) => ((s % length) + length) % length;

export function cornerWarnings(course) {
  if (!course || !Number.isFinite(course.length) || course.length <= 0) return [];
  if (cache.has(course)) return cache.get(course);
  const notes = resolveTrackIntel(course).notes ?? {};
  const pieces = course.script?.pieces;
  const corners = pieces
    ? pieces.filter(piece => piece.kind === 'turn').map(piece => ({
      name: piece.name, direction: piece.dir > 0 ? 'L' : 'R', radius: piece.radius,
      entryS: piece.s0, span: piece.s1 - piece.s0,
    }))
    : course.closed !== false ? detectCorners(sampleCourse(course)) : [];
  const rows = Object.freeze(corners.map((corner, index) => {
    const id = cornerId({...corner, number: index + 1});
    const written = notes[id]?.brakeBoard;
    const brakeBoard = Number.isFinite(written) && written > 0 ? written : 100;
    const coordinate = s => course.closed !== false ? phase(s, course.length) : s;
    return Object.freeze({id, name: corner.name || `Corner ${index + 1}`,
      direction: corner.direction, hairpin: corner.radius < 40, brakeBoard,
      entryS: coordinate(corner.entryS), brakeS: coordinate(corner.entryS - brakeBoard),
      apexS: coordinate(corner.entryS + corner.span * .55),
      brakingToApex: brakeBoard + corner.span * .55,
    });
  }));
  cache.set(course, rows);
  return rows;
}

export function cornerWarning(course, state) {
  if (!course || state?.status !== 'racing' || state.paused || state.onFoot ||
      !Number.isFinite(state.s)) return null;
  let selected = null, nearest = Infinity;
  for (const corner of cornerWarnings(course)) {
    const ahead = course.closed !== false
      ? phase(corner.apexS - state.s, course.length) : corner.apexS - state.s;
    // Use the actual braking coordinate directly: subtracting the apex span
    // loses a few bits at exact 150/100/50/0 boundaries on authored decimals.
    let brakingDistance = course.closed !== false
      ? corner.brakeS - phase(state.s, course.length) : corner.brakeS - state.s;
    if (course.closed !== false) {
      if (brakingDistance > ahead) brakingDistance -= course.length;
      else if (brakingDistance + course.length <= ahead) brakingDistance += course.length;
    }
    if (ahead <= 0 || brakingDistance > 250 || ahead >= nearest) continue;
    nearest = ahead;
    selected = {...corner, color: brakingDistance <= 0 ? 'red' : 'amber',
      distance: brakingDistance <= 0 ? 'BRAKE' : brakingDistance <= 50 ? '50'
        : brakingDistance <= 100 ? '100' : brakingDistance <= 150 ? '150' : '',
      arrow: corner.direction === 'L' ? (corner.hairpin ? '⇇' : '←') : (corner.hairpin ? '⇉' : '→'),
    };
  }
  return selected;
}
