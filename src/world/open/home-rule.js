// HOME-GROUND-1: the rules of the player's own ground (docs/HOME_GROUND.md, sections 5 and 6). Plain functions on plain
// data; nothing here draws, reads a save or keeps state.
//
// THE GROUND is a square of HOME_CELLS by HOME_CELLS steps of 2 m. Its grid's nodes are (i, j), from (0, 0) at the
// north-west corner to (HOME_CELLS, HOME_CELLS) at the south-east one: i runs east and j runs south, as x and z do.
// A PIECE stands along the grid's lines: {kind, i, j, axis}. `axis` 'x' runs east from node (i, j), 'z' runs south.
// A panel covers one step; the gate covers four, and must stand in the outside fence.
//
// THE RECORD kept in the save (world.open.home):
//   {version: 1, name, pieces: [{kind, i, j, axis}], marks: [{kind, i, j, axis}]}
// The panels and the gate he still carries are worked out from it: HOME_PANELS less the panels standing, and one gate
// less the gate standing.
import {HOME_CELLS, HOME_CORNER, HOME_LANE_CELLS, HOME_NAME_LONGEST, HOME_PANELS, HOME_PIECES, HOME_REACH, HOME_STEP} from './content/home-ground.js';

export const HOME_RECORD_VERSION = 1;
const AXES = ['x', 'z'];
const whole = value => Number.isSafeInteger(value);

export const newHome = name => ({version: HOME_RECORD_VERSION, name, pieces: [], marks: []});

// A name he may write: 1 to 24 letters, numbers, spaces and the marks a place name uses.
export function cleanHomeName(text) {
  if (typeof text !== 'string') return null;
  const name = text.replace(/\s+/g, ' ').trim();
  return name.length >= 1 && name.length <= HOME_NAME_LONGEST && /^[\p{L}\p{N} '&.,!?-]+$/u.test(name) ? name : null;
}

// Where a piece may stand at all: inside the square, and for the gate in its outside edge.
function inBounds({kind, i, j, axis}) {
  const span = HOME_PIECES[kind]?.cells;
  if (!span || !whole(i) || !whole(j) || !AXES.includes(axis)) return false;
  const along = axis === 'x' ? i : j, across = axis === 'x' ? j : i;
  return along >= 0 && along + span <= HOME_CELLS && across >= 0 && across <= HOME_CELLS;
}
const onEdge = ({i, j, axis}) => axis === 'x' ? j === 0 || j === HOME_CELLS : i === 0 || i === HOME_CELLS;

export function readablePiece(piece) {
  return piece !== null && typeof piece === 'object' && Object.keys(piece).length === 4 &&
    Object.hasOwn(HOME_PIECES, piece.kind) && inBounds(piece) && (piece.kind !== 'gate' || onEdge(piece));
}

export function readableHome(home) {
  return home !== null && typeof home === 'object' && !Array.isArray(home) && home.version === HOME_RECORD_VERSION &&
    cleanHomeName(home.name) === home.name && Array.isArray(home.pieces) && home.pieces.every(readablePiece) &&
    Array.isArray(home.marks) && home.marks.every(readablePiece) && home.marks.length <= 4 * HOME_CELLS * (HOME_CELLS + 1) &&
    home.pieces.filter(piece => piece.kind === 'gate').length <= 1 &&
    home.pieces.filter(piece => piece.kind === 'panel').length <= HOME_PANELS;
}

// The one-step lines a piece covers, as keys: 'x:3:0' is the step east from node (3, 0).
export function stepsOf({kind, i, j, axis}) {
  return Array.from({length: HOME_PIECES[kind].cells}, (_, n) => axis === 'x' ? `x:${i + n}:${j}` : `z:${i}:${j + n}`);
}

// The lane from the gate to the far fence, as a box of the grid's nodes: {i0, i1, j0, j1}.
export function laneOf(gate) {
  if (!gate) return null;
  return gate.axis === 'x' ? {i0: gate.i, i1: gate.i + HOME_LANE_CELLS, j0: 0, j1: HOME_CELLS}
    : {i0: 0, i1: HOME_CELLS, j0: gate.j, j1: gate.j + HOME_LANE_CELLS};
}
// A step crosses the lane when its middle lies strictly inside the lane's box. Its sides and its two ends are free:
// panels may line the lane, and the gate and the far fence stand at its ends.
export function crossesLane(key, lane) {
  if (!lane) return false;
  const [axis, a, b] = key.split(':'), i = Number(a) + (axis === 'x' ? .5 : 0), j = Number(b) + (axis === 'z' ? .5 : 0);
  return i > lane.i0 && i < lane.i1 && j > lane.j0 && j < lane.j1;
}

export const gateOf = home => home?.pieces.find(piece => piece.kind === 'gate') ?? null;
export const panelsLeft = home => HOME_PANELS - (home?.pieces.filter(piece => piece.kind === 'panel').length ?? 0);
export const gatesLeft = home => gateOf(home) ? 0 : 1;
const samePiece = (a, b) => a.kind === b.kind && a.i === b.i && a.j === b.j && a.axis === b.axis;

// What stands on any step of a piece.
export function piecesUnder(list, piece) {
  const steps = new Set(stepsOf(piece));
  return list.filter(other => stepsOf(other).some(key => steps.has(key)));
}

// Why a piece cannot be built here, or null when it can. The reasons are keys of HOME_WORDS.
export function refusal(home, piece) {
  if (!inBounds(piece)) return 'offGround';
  if (piece.kind === 'gate' && !onEdge(piece)) return 'gateEdge';
  if (piecesUnder(home.pieces, piece).length) return 'onTop';
  if (piece.kind === 'gate') {
    const lane = laneOf(piece);
    if (home.pieces.some(other => stepsOf(other).some(key => crossesLane(key, lane)))) return 'gateLane';
    if (!gatesLeft(home)) return 'noGate';
  } else {
    const lane = laneOf(gateOf(home));
    if (stepsOf(piece).some(key => crossesLane(key, lane))) return 'lane';
    if (panelsLeft(home) <= 0) return 'noPanels';
  }
  return null;
}

// What the outline over a slot means: {mode: 'build' | 'lift' | 'refused', reason, piece, target, marked}.
// He holds a panel or the gate. A panel aimed at a step where something stands offers to pick that thing up.
export function outlineFor(home, piece) {
  if (piece.kind === 'panel' && inBounds(piece)) {
    const [under] = piecesUnder(home.pieces, piece);
    if (under) return {mode: 'lift', piece, target: under};
  }
  const reason = refusal(home, piece);
  const marked = home.marks.some(mark => samePiece(mark, piece));
  return reason ? {mode: 'refused', reason, piece, marked} : {mode: 'build', piece, marked};
}

export function build(home, piece) {
  if (refusal(home, piece)) return home;
  return {...home, pieces: [...home.pieces, {...piece}], marks: home.marks.filter(mark => !samePiece(mark, piece))};
}
export function lift(home, piece) {
  const pieces = home.pieces.filter(other => !samePiece(other, piece));
  return pieces.length === home.pieces.length ? home : {...home, pieces};
}
// A mark is made from above. It stays until he builds that piece or clears the mark.
export function toggleMark(home, piece) {
  if (!inBounds(piece)) return home;
  const kept = home.marks.filter(mark => !samePiece(mark, piece));
  if (kept.length !== home.marks.length) return {...home, marks: kept};
  return {...home, marks: [...kept, {...piece}]};
}
export const markAt = (home, piece) => home.marks.find(mark => samePiece(mark, piece)) ?? null;

// ---- The ground in the land ---------------------------------------------------------------------------------------
export const groundPoint = (i, j) => ({x: HOME_CORNER.x + i * HOME_STEP, z: HOME_CORNER.z + j * HOME_STEP});
export const groundCentre = () => groundPoint(HOME_CELLS / 2, HOME_CELLS / 2);
// The grid position of a point of the land, in steps (not rounded).
export const toGrid = (x, z) => ({a: (x - HOME_CORNER.x) / HOME_STEP, b: (z - HOME_CORNER.z) / HOME_STEP});
// How far a point is outside the square, in metres (0 inside it).
export function outsideBy(x, z) {
  const {a, b} = toGrid(x, z), out = value => Math.max(0, -value, value - HOME_CELLS);
  return Math.hypot(out(a), out(b)) * HOME_STEP;
}

// The slot for a piece whose middle is nearest the grid point (a, b). `axis` is the way it runs.
export function slotAt(kind, a, b, axis) {
  const half = HOME_PIECES[kind].cells / 2;
  return axis === 'x' ? {kind, i: Math.round(a - half), j: Math.round(b), axis}
    : {kind, i: Math.round(a), j: Math.round(b - half), axis};
}
// The slot in front of him: the piece stands across the way he faces, and each press of R turns it a quarter.
export function slotInFront(kind, position, yaw, turns = 0) {
  const ahead = {x: position.x + Math.sin(yaw) * HOME_REACH, z: position.z + Math.cos(yaw) * HOME_REACH};
  const facingAlongZ = Math.abs(Math.cos(yaw)) >= Math.abs(Math.sin(yaw));
  const axis = AXES[((facingAlongZ ? 0 : 1) + turns) % 2];
  const {a, b} = toGrid(ahead.x, ahead.z);
  return slotAt(kind, a, b, axis);
}

// A piece's middle and run in the land: {x, z, length, heading}. A heading of 0 runs east, -PI/2 runs south, in the
// solids' turn (src/world/scablands-solids.js: a box's own x runs along (cos heading, -sin heading)).
export function pieceInLand(piece) {
  const length = HOME_PIECES[piece.kind].cells * HOME_STEP;
  const start = groundPoint(piece.i, piece.j);
  return piece.axis === 'x' ? {x: start.x + length / 2, z: start.z, length, heading: 0}
    : {x: start.x, z: start.z + length / 2, length, heading: -Math.PI / 2};
}

// The solid rows for the pieces that stand (the 'solids' request of src/world/open/open-land.js). A panel is a thin
// sheet; the gate is its two posts, and its two leaves while it is shut. `heightAt` is the ground's height.
export const GATE_POST = .3;
export function homeSolids(home, {gateOpen = false, heightAt}) {
  const rows = [];
  for (const piece of home?.pieces ?? []) {
    const {x, z, length, heading} = pieceInLand(piece);
    const along = {x: Math.cos(heading), z: -Math.sin(heading)};
    const id = `home/${piece.kind}/${piece.axis}/${piece.i}/${piece.j}`;
    if (piece.kind === 'panel') {
      rows.push({id, kind: 'wall', x, z, halfX: length / 2, halfZ: .1, heading, height: HOME_PIECES.panel.height, base: heightAt(x, z)});
      continue;
    }
    for (const side of [-1, 1]) {
      const px = x + along.x * side * length / 2, pz = z + along.z * side * length / 2;
      rows.push({id: id + '/post-' + (side < 0 ? 'a' : 'b'), kind: 'post', x: px, z: pz, halfX: GATE_POST, halfZ: GATE_POST,
        heading, height: HOME_PIECES.gate.height + .4, base: heightAt(px, pz)});
    }
    if (!gateOpen) rows.push({id: id + '/leaves', kind: 'wall', x, z, halfX: length / 2 - GATE_POST, halfZ: .12, heading,
      height: HOME_PIECES.gate.height, base: heightAt(x, z)});
  }
  return rows;
}

// The board with the ground's name: just outside the gate, beside its first post, facing out.
export function boardSpot(gate) {
  if (!gate) return null;
  const {x, z, length, heading} = pieceInLand(gate);
  const along = {x: Math.cos(heading), z: -Math.sin(heading)};
  // Outward is away from the ground's middle.
  const centre = groundCentre(), toward = {x: x - centre.x, z: z - centre.z}, out = Math.hypot(toward.x, toward.z) || 1;
  const outward = {x: toward.x / out, z: toward.z / out};
  const at = {x: x - along.x * (length / 2 + 1.4) + outward.x * 1.2, z: z - along.z * (length / 2 + 1.4) + outward.z * 1.2};
  return {...at, yaw: Math.atan2(outward.x, outward.z)};
}
