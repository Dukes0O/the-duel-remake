// HOME-GROUND-1 and HOME-GROUND-2: the rules of the player's own ground (docs/HOME_GROUND.md, sections 4 to 7). Plain
// functions on plain data; nothing here draws, reads a save, reads a clock or keeps state.
//
// THE GROUND is a square of HOME_CELLS by HOME_CELLS steps of 2 m. Its grid's nodes are (i, j), from (0, 0) at the
// north-west corner to (HOME_CELLS, HOME_CELLS) at the south-east one: i runs east and j runs south, as x and z do.
// A PIECE stands along the grid's lines: {kind, i, j, axis}. `axis` 'x' runs east from node (i, j), 'z' runs south.
// A panel covers one step; the gate covers four, and must stand in the outside fence.
//
// THE RECORD kept in the save (world.open.home):
//   version 2 (HOME-GROUND-2): {version: 2, name, pieces, marks, hens: [{name, breed, due}], boxes: [{i, j, eggs}], eggs,
//     lastSeen}
//   version 1 (HOME-GROUND-1): {version: 1, name, pieces: [{kind, i, j, axis}], marks: [{kind, i, j, axis}]}
// A version 1 record is read as it is and left as it is; the ground's part turns it into version 2 the first time it runs
// with its switch on (upgradeHome). The panels and the gate he still carries are worked out from it: HOME_PANELS less
// the panels standing, and one gate less the gate standing; the old crates likewise, HOME_CRATES less the nest boxes.
//   hens      each hen's name, breed and `due`: the seconds until her next egg, 0 while she waits for room in a box
//   boxes     each nest box's cell of the grid (i, j from 0 to HOME_CELLS - 1) and the eggs in it
//   eggs      the eggs he has gathered into his store
//   lastSeen  the real moment, in seconds since 1970 by the laptop's clock, at which the hens' `due` was true; null
//             until a clock has been handed to the part. The clock is read once, when an outing opens.
import {AWAY_LONGEST, BOARD_WORDS, BOX_HOLDS, HEN_BREEDS, HEN_SETTLE_SECONDS, HOME_BOX, HOME_CELLS, HOME_CORNER, HOME_CRATES,
  HOME_LANE_CELLS, HOME_NAME_LONGEST, HOME_PANELS, HOME_PIECES, HOME_REACH, HOME_STEP, MOSS_HENS, layInterval} from './content/home-ground.js';

export const HOME_RECORD_VERSION = 2;
const AXES = ['x', 'z'];
const whole = value => Number.isSafeInteger(value);

export const newHome = (name, lastSeen = null) => ({version: HOME_RECORD_VERSION, name, pieces: [], marks: [], hens: [], boxes: [],
  eggs: 0, lastSeen});
// A step 1 record as step 2 keeps it: nothing of what he built changes.
export const upgradeHome = home => home.version === 1
  ? {...home, version: HOME_RECORD_VERSION, hens: [], boxes: [], eggs: 0, lastSeen: null} : home;

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

const count = value => Number.isSafeInteger(value) && value >= 0;
function readableHen(hen) {
  return hen !== null && typeof hen === 'object' && Object.keys(hen).length === 3 && Object.hasOwn(HEN_BREEDS, hen.breed) &&
    cleanHomeName(hen.name) === hen.name && Number.isFinite(hen.due) && hen.due >= 0 && hen.due <= layInterval(hen.breed);
}
function readableBox(box) {
  return box !== null && typeof box === 'object' && Object.keys(box).length === 3 && whole(box.i) && whole(box.j) &&
    box.i >= 0 && box.i < HOME_CELLS && box.j >= 0 && box.j < HOME_CELLS && count(box.eggs) && box.eggs <= BOX_HOLDS;
}
export function readableHome(home) {
  if (home === null || typeof home !== 'object' || Array.isArray(home) || ![1, HOME_RECORD_VERSION].includes(home.version)) return false;
  const built = cleanHomeName(home.name) === home.name && Array.isArray(home.pieces) && home.pieces.every(readablePiece) &&
    Array.isArray(home.marks) && home.marks.every(readablePiece) && home.marks.length <= 4 * HOME_CELLS * (HOME_CELLS + 1) &&
    home.pieces.filter(piece => piece.kind === 'gate').length <= 1 &&
    home.pieces.filter(piece => piece.kind === 'panel').length <= HOME_PANELS;
  if (!built || home.version === 1) return built;
  return Array.isArray(home.hens) && home.hens.length <= MOSS_HENS.length && home.hens.every(readableHen) &&
    Array.isArray(home.boxes) && home.boxes.length <= HOME_CRATES && home.boxes.every(readableBox) &&
    new Set(home.boxes.map(box => box.i + ':' + box.j)).size === home.boxes.length &&
    count(home.eggs) && (home.lastSeen === null || (Number.isFinite(home.lastSeen) && home.lastSeen >= 0));
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
    if ((home.boxes ?? []).some(box => boxInLane(box, lane))) return 'gateLaneBox';
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
  for (const box of home?.boxes ?? []) {
    const {x, z} = boxInLand(box);
    rows.push({id: `home/box/${box.i}/${box.j}`, kind: 'post', x, z, halfX: HOME_BOX.size / 2, halfZ: HOME_BOX.size / 2,
      heading: 0, height: HOME_BOX.height, base: heightAt(x, z)});
  }
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

// The second board, with the news of his ground: just outside the gate, beside its other post, facing out.
export function newsBoardSpot(gate) {
  if (!gate) return null;
  const {x, z, length, heading} = pieceInLand(gate);
  const along = {x: Math.cos(heading), z: -Math.sin(heading)};
  const centre = groundCentre(), toward = {x: x - centre.x, z: z - centre.z}, out = Math.hypot(toward.x, toward.z) || 1;
  const outward = {x: toward.x / out, z: toward.z / out};
  const at = {x: x + along.x * (length / 2 + 1.4) + outward.x * 1.2, z: z + along.z * (length / 2 + 1.4) + outward.z * 1.2};
  return {...at, yaw: Math.atan2(outward.x, outward.z)};
}
// The crate Moss leaves with the hens in it: outside the gate, a little in front of it.
export function crateSpot(gate) {
  if (!gate) return null;
  const {x, z} = pieceInLand(gate);
  const centre = groundCentre(), toward = {x: x - centre.x, z: z - centre.z}, out = Math.hypot(toward.x, toward.z) || 1;
  return {x: x + toward.x / out * 3, z: z + toward.z / out * 3};
}

// ---- HOME-GROUND-2: the fence closed, the hens and their nest boxes -------------------------------------------------
// Every step of the outside edge has a panel or the gate in it, and the gate hangs.
export function fenceClosed(home) {
  if (!gateOf(home)) return false;
  const covered = new Set(home.pieces.flatMap(stepsOf));
  for (let n = 0; n < HOME_CELLS; n++)
    for (const key of [`x:${n}:0`, `x:${n}:${HOME_CELLS}`, `z:0:${n}`, `z:${HOME_CELLS}:${n}`]) if (!covered.has(key)) return false;
  return true;
}
export const hensWaiting = home => fenceClosed(home) && !(home.hens?.length);
// Moss's two hens, as he brings them.
export const giveHens = home => ({...home, hens: MOSS_HENS.map(hen => ({...hen}))});
export function nameHen(home, index, text) {
  const name = cleanHomeName(text);
  if (!name || !home.hens?.[index] || home.hens[index].name === name) return home;
  return {...home, hens: home.hens.map((hen, n) => n === index ? {...hen, name} : hen)};
}
export const cratesLeft = home => home?.hens?.length ? HOME_CRATES - home.boxes.length : 0;
export const boxRoom = home => (home?.boxes ?? []).reduce((sum, box) => sum + BOX_HOLDS - box.eggs, 0);
export const eggsInBoxes = home => (home?.boxes ?? []).reduce((sum, box) => sum + box.eggs, 0);
export const boxesFull = home => (home?.boxes?.length ?? 0) > 0 && boxRoom(home) === 0;
// The box the next egg goes in: the one with fewest eggs that has room, the first built if two have as few.
export function boxForEgg(boxes) {
  let best = -1;
  boxes.forEach((box, index) => { if (box.eggs < BOX_HOLDS && (best < 0 || box.eggs < boxes[best].eggs)) best = index; });
  return best;
}
// A cell overlaps the lane from the gate.
const boxInLane = (cell, lane) => !!lane && cell.i + 1 > lane.i0 && cell.i < lane.i1 && cell.j + 1 > lane.j0 && cell.j < lane.j1;
// A middle of a cell in the land.
export const boxInLand = ({i, j}) => groundPoint(i + .5, j + .5);
// The cell in front of him, for a nest box.
export function boxSlotInFront(position, yaw) {
  const {a, b} = toGrid(position.x + Math.sin(yaw) * HOME_REACH, position.z + Math.cos(yaw) * HOME_REACH);
  return {kind: 'box', i: Math.floor(a), j: Math.floor(b)};
}
export function boxRefusal(home, cell) {
  if (!whole(cell.i) || !whole(cell.j) || cell.i < 0 || cell.j < 0 || cell.i >= HOME_CELLS || cell.j >= HOME_CELLS) return 'offGround';
  if (home.boxes.some(box => box.i === cell.i && box.j === cell.j)) return 'boxCell';
  if (boxInLane(cell, laneOf(gateOf(home)))) return 'boxLane';
  if (cratesLeft(home) <= 0) return 'noCrates';
  return null;
}
// Room made in a box lets every hen who was waiting settle into it.
function settle(home) {
  if (!home.hens.some(hen => hen.due === 0) || boxRoom(home) === 0) return home;
  return {...home, hens: home.hens.map(hen => hen.due === 0 ? {...hen, due: HEN_SETTLE_SECONDS} : hen)};
}
export function buildBox(home, cell) {
  if (boxRefusal(home, cell)) return home;
  return settle({...home, boxes: [...home.boxes, {i: cell.i, j: cell.j, eggs: 0}]});
}
// Gathering takes every egg in a box into his store.
export function gatherBox(home, index) {
  const box = home.boxes[index];
  if (!box?.eggs) return home;
  return settle({...home, eggs: home.eggs + box.eggs, boxes: home.boxes.map((row, n) => n === index ? {...row, eggs: 0} : row)});
}
// Picking a box up gathers its eggs first; the old crate is back in his hands.
export function liftBox(home, index) {
  if (!home.boxes[index]) return home;
  const gathered = gatherBox(home, index);
  return {...gathered, boxes: gathered.boxes.filter((_, n) => n !== index)};
}

// ---- HOME-GROUND-2: laying, over any stretch of time -----------------------------------------------------------------
// The hens lay over `seconds`: each when her `due` comes, into the box with fewest eggs, one after another in the order
// the eggs come (by hen when two come together). When every box is full a hen whose egg is due waits, `due` 0, and lays
// again only once room is made (HEN_SETTLE_SECONDS later). Returns {home, laid: [{hen, box, at}]}, `at` the seconds into
// the stretch. The same seconds give the same eggs however they are cut into pieces, while no room is made between.
export function ripen(home, seconds) {
  if (!(seconds > 0) || !home.hens?.length) return {home, laid: []};
  const boxes = home.boxes.map(box => ({...box}));
  const next = home.hens.map(hen => hen.due);
  const laid = [];
  let room = boxRoom(home);
  for (;;) {
    let hen = -1;
    next.forEach((at, index) => { if (at <= seconds && (hen < 0 || at < next[hen])) hen = index; });
    if (hen < 0 || room === 0) break;
    const box = boxForEgg(boxes);
    boxes[box].eggs++; room--;
    laid.push({hen, box, at: next[hen]});
    next[hen] += layInterval(home.hens[hen].breed);
  }
  const hens = home.hens.map((row, index) => ({...row, due: next[index] <= seconds ? 0 : Math.min(layInterval(row.breed), next[index] - seconds)}));
  return {home: {...home, hens, boxes}, laid};
}

// ---- HOME-GROUND-2: the real clock -----------------------------------------------------------------------------------
// The one number the home rules take from the laptop's clock: the real seconds since his last visit, never less than
// nothing (a clock set back counts as no time) and never more than AWAY_LONGEST. Either moment unknown counts as none.
export function awayFor(lastSeen, now) {
  if (!Number.isFinite(lastSeen) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.min(AWAY_LONGEST, now - lastSeen));
}

// ---- HOME-GROUND-2: the board at the gate ----------------------------------------------------------------------------
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export function awayWords(seconds) {
  const minutes = Math.floor(seconds / 60), hours = Math.floor(seconds / 3600), days = Math.floor(seconds / 86400);
  if (days >= 1) {
    const left = hours - days * 24;
    return plural(days, 'day', 'days') + (left ? ' and ' + plural(left, 'hour', 'hours') : '');
  }
  if (hours >= 1) {
    const left = minutes - hours * 60;
    return plural(hours, 'hour', 'hours') + (left ? ' and ' + plural(left, 'minute', 'minutes') : '');
  }
  return plural(Math.max(1, minutes), 'minute', 'minutes');
}
// Three or four plain sentences: how long he was away, what the hens laid, the boxes, and his store. `opened` is what
// the outing found when it opened: {away (seconds counted), long (the clock said more than AWAY_LONGEST), laid}.
export function boardLines(opened, home) {
  const lines = [];
  const away = opened?.away ?? 0;
  lines.push(opened?.long ? BOARD_WORDS.awayLong : away < 60 ? BOARD_WORDS.awayMoment : fill(BOARD_WORDS.away, {time: awayWords(away)}));
  if (!home?.hens?.length) {
    lines.push(hensWaiting(home) ? BOARD_WORDS.crate : BOARD_WORDS.fenceFirst);
    return lines;
  }
  const laid = opened?.laid ?? 0;
  lines.push(laid === 0 ? BOARD_WORDS.laidNone : laid === 1 ? BOARD_WORDS.laidOne : fill(BOARD_WORDS.laidMany, {count: laid}));
  const waiting = eggsInBoxes(home);
  lines.push(!home.boxes.length ? BOARD_WORDS.noBox : boxesFull(home) ? BOARD_WORDS.full : waiting === 0 ? BOARD_WORDS.emptyBoxes :
    waiting === 1 ? BOARD_WORDS.waitingOne : fill(BOARD_WORDS.waiting, {count: waiting}));
  lines.push(home.eggs === 0 ? BOARD_WORDS.storeNone : home.eggs === 1 ? BOARD_WORDS.storeOne : fill(BOARD_WORDS.store, {count: home.eggs}));
  return lines;
}

// ---- HOME-GROUND-2: what he faces, within reach ----------------------------------------------------------------------
// A piece he built whose run passes within half a metre of the line from his feet to just past the outline's place, or a
// nest box there: the nearest along that line. This is what one press of B picks up.
export function facedThing(home, position, yaw) {
  const ahead = {x: Math.sin(yaw), z: Math.cos(yaw)};
  let best = null;
  const offer = (thing, along) => { if (!best || along < best.along) best = {...thing, along}; };
  for (let step = 3; step <= 20; step++) {
    const along = step / 10, px = position.x + ahead.x * along, pz = position.z + ahead.z * along;
    if (best && along > best.along) break;
    (home?.boxes ?? []).forEach((box, index) => {
      const at = boxInLand(box);
      if (Math.max(Math.abs(px - at.x), Math.abs(pz - at.z)) <= HOME_BOX.size / 2 + .25) offer({kind: 'box', index, box}, along);
    });
    for (const piece of home?.pieces ?? []) {
      const {x, z, length, heading} = pieceInLand(piece);
      const run = {x: Math.cos(heading), z: -Math.sin(heading)};
      const dx = px - x, dz = pz - z, t = Math.max(-length / 2, Math.min(length / 2, dx * run.x + dz * run.z));
      if (Math.hypot(dx - run.x * t, dz - run.z * t) <= .5) offer({kind: 'piece', piece}, along);
    }
  }
  return best;
}
