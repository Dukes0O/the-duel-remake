// HOME-GROUND-1 and HOME-GROUND-2: the rules of the player's own ground (docs/HOME_GROUND.md, sections 4 to 7). Plain
// functions on plain data; nothing here draws, reads a save, reads a clock or keeps state.
//
// THE GROUND is a square of HOME_CELLS by HOME_CELLS steps of 2 m. Its grid's nodes are (i, j), from (0, 0) at the
// north-west corner to (HOME_CELLS, HOME_CELLS) at the south-east one: i runs east and j runs south, as x and z do.
// A PIECE stands along the grid's lines: {kind, i, j, axis}. `axis` 'x' runs east from node (i, j), 'z' runs south.
// A panel covers one step; the gate covers four, and must stand in the outside fence.
//
// THE RECORD kept in the save (world.open.home):
//   version 4 adds crew: {job: {kind, i, j} | null, began: real seconds | null, done: work seconds}.
//   version 3 adds builds: [{kind, i, j, turn, stage}], loads: {coop, shed}, flatbed: {x, z, yaw}.
//   A load is 'stack', 'bed', or a grid point {i, j}. Once its floor stands, the load is part of that building.
//   A completed coop adds three ordinary {i, j, eggs} entries to boxes; coopBoxes identifies its fixed nests.
//   version 2 (HOME-GROUND-2): {version: 2, name, pieces, marks, hens: [{name, breed, due}], boxes: [{i, j, eggs}], eggs,
//     lastSeen}
//   version 1 (HOME-GROUND-1): {version: 1, name, pieces: [{kind, i, j, axis}], marks: [{kind, i, j, axis}]}
// A version 1, 2 or 3 record is read as it is; the enabled part turns it into version 4 the first time it runs
// with its switch on (upgradeHome). The panels and the gate he still carries are worked out from it: HOME_PANELS less
// the panels standing, and one gate less the gate standing; the old crates likewise, HOME_CRATES less the nest boxes.
//   hens      each hen's name, breed and `due`: the seconds until her next egg, 0 while she waits for room in a box
//   boxes     each nest box's cell of the grid (i, j from 0 to HOME_CELLS - 1) and the eggs in it
//   eggs      the eggs he has gathered into his store
//   lastSeen  the real moment, in seconds since 1970 by the laptop's clock, at which the hens' `due` was true; null
//             until a clock has been handed to the part. The clock is read once, when an outing opens.
import {AWAY_LONGEST, BOARD_WORDS, BOX_HOLDS, HEN_BREEDS, HEN_SETTLE_SECONDS, HOME_BOX, HOME_CELLS, HOME_CORNER, HOME_CRATES,
  HOME_LANE_CELLS, HOME_NAME_LONGEST, HOME_PANELS, HOME_PIECES, HOME_REACH, HOME_STEP, MOSS_HENS, layInterval,
  HOME_BUILDS, HOME_LOAD_STACK, HOME_WORDS, HOME_BOX_REACH, HOME_CREW_SECONDS, HOME_TOWER} from './content/home-ground.js';

export const HOME_RECORD_VERSION = 5;
const AXES = ['x', 'z'];
const whole = value => Number.isSafeInteger(value);

export const newHome = (name, lastSeen = null) => ({version: HOME_RECORD_VERSION, name, pieces: [], marks: [], hens: [], boxes: [],
  eggs: 0, lastSeen, builds: [], loads: {coop: 'stack', shed: 'stack', tower: 'stack'}, flatbed: firstFlatbed(),
  crew: {job: null, began: null, done: 0}, raids: newRaids()});
export const newRaids = () => ({played: 0, sittings: 0, nextDue: null, testDone: false, won: 0, lost: 0});
function firstFlatbed() { return {...groundPoint(15, -3), yaw: 0}; }
// Reading an older record does not upgrade it. Only the enabled part calls this.
export function upgradeHome(home) {
  if (home.version === HOME_RECORD_VERSION) return home;
  let kept = home.version === 1 ? {...home, hens: [], boxes: [], eggs: 0, lastSeen: null} : home;
  if (home.version < 3) kept = {...kept, builds: [], loads: {coop: 'stack', shed: 'stack'}, flatbed: firstFlatbed()};
  if (home.version < 4) kept = {...kept, crew: {job: null, began: null, done: 0}};
  return {...kept, version: HOME_RECORD_VERSION, loads: {...kept.loads, tower: 'stack'}, raids: newRaids()};
}

// A name he may write: 1 to 24 letters, numbers, spaces and the marks a place name uses.
export function cleanHomeName(text) {
  if (typeof text !== 'string') return null;
  const name = text.replace(/\s+/g, ' ').trim();
  return name.length >= 1 && name.length <= HOME_NAME_LONGEST && /^[\p{L}\p{N} '&.,!?-]+$/u.test(name) ? name : null;
}

// Stage 0 is a movable chalk mark. One unfinished building of each kind can stand beside the completed ones.
const sameCell = (a, b) => a.i === b.i && a.j === b.j;
export function buildBounds(row) {
  const size = HOME_BUILDS[row.kind], turned = row.turn % 2;
  return {i0: row.i, j0: row.j, i1: row.i + (turned ? size.depth : size.width),
    j1: row.j + (turned ? size.width : size.depth)};
}
const rectanglesOverlap = (a, b) => !!b && a.i0 < b.i1 && a.i1 > b.i0 && a.j0 < b.j1 && a.j1 > b.j0;
function pieceThroughBuild(piece, row) {
  const b = buildBounds(row), span = HOME_PIECES[piece.kind].cells;
  return piece.axis === 'x' ? piece.j >= b.j0 && piece.j <= b.j1 && piece.i < b.i1 && piece.i + span > b.i0
    : piece.i >= b.i0 && piece.i <= b.i1 && piece.j < b.j1 && piece.j + span > b.j0;
}
function readableBuild(row) {
  if (!row || Object.keys(row).length !== 5 || !Object.hasOwn(HOME_BUILDS, row.kind) ||
      !whole(row.i) || !whole(row.j) || !whole(row.turn) || row.turn < 0 || row.turn > 3 ||
      !whole(row.stage) || row.stage < 0 || row.stage > 4) return false;
  const b = buildBounds(row);
  return b.i0 >= 0 && b.j0 >= 0 && b.i1 <= HOME_CELLS && b.j1 <= HOME_CELLS;
}
const loadPoint = row => row && Object.keys(row).length === 2 && whole(row.i) && whole(row.j) &&
  row.i >= 0 && row.j >= 0 && row.i < HOME_CELLS && row.j < HOME_CELLS;
function readableBuildings(home) {
  const kinds = home.version >= 5 ? Object.keys(HOME_BUILDS) : ['coop', 'shed'];
  if (!Array.isArray(home.builds) || home.builds.length > (home.version === 3 ? 2 : HOME_CELLS * HOME_CELLS) || !home.builds.every(readableBuild) ||
      (home.version >= 4 && new Set(home.builds.map(row => row.i + ':' + row.j)).size !== home.builds.length) ||
      (home.version === 3 && new Set(home.builds.map(row => row.kind)).size !== home.builds.length) ||
      home.builds.some(row => !kinds.includes(row.kind)) ||
      kinds.some(kind => home.builds.filter(row => row.kind === kind && row.stage < 4).length > 1) ||
      !home.loads || Object.keys(home.loads).length !== kinds.length ||
      !kinds.every(kind => ['stack', 'bed'].includes(home.loads[kind]) || loadPoint(home.loads[kind])) ||
      Object.values(home.loads).filter(row => row === 'bed').length > 1 ||
      !home.flatbed || Object.keys(home.flatbed).length !== 3 ||
      !['x', 'z', 'yaw'].every(key => Number.isFinite(home.flatbed[key]))) return false;
  return home.builds.every(row => row.stage === 0 || (home.version >= 4 && row.stage === 4) || loadPoint(home.loads[row.kind])) &&
    (home.version === 3 || home.builds.every((row, index) => !home.builds.slice(index + 1).some(other => rectanglesOverlap(buildBounds(row), buildBounds(other)))));
}
export function buildInLand(row) {
  const b = buildBounds(row), at = groundPoint((b.i0 + b.i1) / 2, (b.j0 + b.j1) / 2);
  return {...at, width: (b.i1 - b.i0) * HOME_STEP, depth: (b.j1 - b.j0) * HOME_STEP, heading: row.turn * Math.PI / 2};
}
export function buildingDoor(row) {
  const at = buildInLand(row), front = HOME_BUILDS[row.kind].depth * HOME_STEP / 2 + .3;
  return {x: at.x + Math.sin(at.heading) * front, z: at.z + Math.cos(at.heading) * front};
}
export function buildSlot(kind, position, yaw, turn = 0) {
  const size = HOME_BUILDS[kind], w = (turn % 2 ? size.depth : size.width), d = (turn % 2 ? size.width : size.depth);
  const reach = 2 + (Math.abs(Math.sin(yaw)) * w + Math.abs(Math.cos(yaw)) * d) * HOME_STEP / 2;
  const {a, b} = toGrid(position.x + Math.sin(yaw) * reach, position.z + Math.cos(yaw) * reach);
  return {kind, i: Math.round(a - w / 2), j: Math.round(b - d / 2), turn, stage: 0};
}
export function buildRefusal(home, row) {
  if (!readableBuild(row)) return 'offGround';
  if (home.builds.some(other => other.kind === row.kind && other.stage < 4)) return 'buildExists';
  const bounds = buildBounds(row);
  if (rectanglesOverlap(bounds, laneOf(gateOf(home)))) return 'lane';
  if (home.builds.some(other => rectanglesOverlap(bounds, buildBounds(other))) ||
      home.pieces.some(piece => pieceThroughBuild(piece, row)) ||
      home.boxes.some(box => rectanglesOverlap(bounds, {i0: box.i, i1: box.i + 1, j0: box.j, j1: box.j + 1}))) return 'onTop';
  return null;
}
export function markBuild(home, row) {
  if (row.stage !== 0 || buildRefusal(home, row)) return home;
  const fresh = home.builds.some(other => other.kind === row.kind && other.stage === 4 && sameCell(other, home.loads[row.kind] ?? {}));
  return {...home, builds: [...home.builds, {...row}], loads: fresh ? {...home.loads, [row.kind]: 'stack'} : home.loads};
}
export function liftBuild(home, target) {
  return {...home, builds: home.builds.filter(row => !matchesBuild(row, target) || row.stage > 0 || matchesBuild(row, home.crew?.job))};
}
export function buildHasLoad(home, row) {
  const at = home.loads[row.kind];
  return loadPoint(at) && Math.hypot(at.i - row.i, at.j - row.j) * HOME_STEP <= 4;
}
export const matchesBuild = (row, target) => !!target && (typeof target === 'string' ? row.kind === target :
  row.kind === target.kind && sameCell(row, target));
export function raiseBuild(home, target, byCrew = false) {
  const row = home.builds.find(item => matchesBuild(item, target) && item.stage < 4);
  const kind = row?.kind;
  if (!row || !buildHasLoad(home, row)) return home;
  const next = {...home, builds: home.builds.map(item => item === row ? {...row, stage: row.stage + 1} : item)};
  if (kind === 'coop' && row.stage === 3) next.boxes = [...home.boxes, ...coopBoxes(next).filter(cell =>
    !home.boxes.some(box => sameCell(cell, box))).map(cell => ({...cell, eggs: 0}))];
  if (!byCrew && matchesBuild(row, home.crew?.job)) {
    next.crew = {...home.crew, done: Math.min(HOME_CREW_SECONDS[kind], home.crew.done + HOME_CREW_SECONDS[kind] / 4)};
    if (row.stage === 3) next.crew = {job: null, began: null, done: 0};
  }
  return settle(next);
}

// Only the next building of a kind he has raised himself can be handed over. Completed buildings are never removed.
export function crewOffer(home) {
  if (home.crew?.job) return null;
  return home.builds.find(row => row.stage < 4 && buildHasLoad(home, row) &&
    home.builds.some(other => other.kind === row.kind && other.stage === 4)) ?? null;
}
export function handToCrew(home, row, now = null) {
  const offer = crewOffer(home);
  if (!offer || !matchesBuild(offer, row)) return home;
  return {...home, crew: {job: {kind: row.kind, i: row.i, j: row.j},
    began: Number.isFinite(now) && now >= 0 ? now : null, done: row.stage * HOME_CREW_SECONDS[row.kind] / 4}};
}
function readableCrew(home) {
  const crew = home.crew;
  if (!crew || Object.keys(crew).length !== 3 || !Number.isFinite(crew.done) || crew.done < 0 ||
      !(crew.began === null || Number.isFinite(crew.began) && crew.began >= 0)) return false;
  if (crew.job === null) return crew.began === null && crew.done === 0;
  const job = crew.job;
  if (!job || Object.keys(job).length !== 3 || !Object.hasOwn(HOME_BUILDS, job.kind) || !whole(job.i) || !whole(job.j)) return false;
  const row = home.builds.find(item => matchesBuild(item, job));
  const stageSeconds = HOME_CREW_SECONDS[job.kind] / 4;
  return !!row && row.stage < 4 && buildHasLoad(home, row) &&
    home.builds.some(other => other.kind === row.kind && other.stage === 4) &&
    crew.done >= row.stage * stageSeconds && crew.done < (row.stage + 1) * stageSeconds;
}
// `seconds` is supplied by the outing. Never read the real clock here or charge for time twice.
export function advanceCrew(home, seconds) {
  if (!home.crew?.job || !Number.isFinite(seconds) || seconds <= 0) return {home, finished: null};
  const job = home.crew.job, duration = HOME_CREW_SECONDS[job.kind];
  const done = Math.min(duration, home.crew.done + seconds);
  let next = {...home, crew: {...home.crew, done}};
  const stage = Math.min(4, Math.floor(done / (duration / 4)));
  let row = next.builds.find(item => matchesBuild(item, job));
  while (row.stage < stage) {
    next = raiseBuild(next, job, true);
    row = next.builds.find(item => matchesBuild(item, job));
  }
  const finished = row.stage === 4 ? row : null;
  if (finished) next = {...next, crew: {job: null, began: null, done: 0}};
  return {home: next, finished};
}
export function crewFinishedWords(home, row) {
  const number = home.builds.filter(item => item.kind === row.kind).findIndex(item => matchesBuild(item, row)) + 1;
  const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'][number - 1] ?? `number ${number}`;
  return `Rook and Wren finished your ${ordinal} ${row.kind}.`;
}

// A finished coop makes room for eggs for the remaining time away, just as it does during an outing.
export function ripenHome(home, seconds) {
  const elapsed = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const untilRoof = home.crew?.job ? HOME_CREW_SECONDS[home.crew.job.kind] - home.crew.done : elapsed;
  const first = Math.min(elapsed, untilRoof), ripe = ripen(home, first);
  const worked = advanceCrew(ripe.home, first), rest = ripen(worked.home, elapsed - first);
  return {home: rest.home, laid: [...ripe.laid, ...rest.laid], finished: worked.finished};
}
// Built-in nests use the existing egg record and laying rules. Their cells cannot be lifted as crates.
export function coopBoxes(home) {
  if (!home || home.version < 3 || !Array.isArray(home.builds)) return [];
  return home.builds.filter(item => item?.kind === 'coop' && item.stage === 4).flatMap(row => [[0, 0], [1, 0], [0, 1]].map(([x, z]) => {
    for (let n = 0; n < row.turn; n++) [x, z] = [z, 1 - x];
    return {i: row.i + x, j: row.j + z};
  }));
}
export function gatherCoop(home) {
  return home.boxes.reduce((kept, box, index) => coopBoxes(home).some(cell => sameCell(box, cell)) ? gatherBox(kept, index) : kept, home);
}
export const shedWords = home => home.eggs === 1 ? HOME_WORDS.shedStoreOne : HOME_WORDS.shedStore.replace('{count}', home.eggs);
export function roostAt(home, index, partOfDay) {
  const row = home.builds?.find(item => item.kind === 'coop' && item.stage === 4);
  if (!row || index >= HOME_BUILDS.coop.hens || !['dusk', 'dark'].includes(partOfDay)) return null;
  const at = buildInLand(row), x = (index % 3 - 1) * .65, z = .65 + Math.floor(index / 3) * .55;
  return {x: at.x + x * Math.cos(at.heading) + z * Math.sin(at.heading),
    z: at.z - x * Math.sin(at.heading) + z * Math.cos(at.heading)};
}
export const homeLoadKg = home => Object.keys(HOME_BUILDS).reduce((kg, kind) => kg + (home.loads[kind] === 'bed' ? HOME_BUILDS[kind].kg : 0), 0);
// A single interaction from the enabled home part, only for a stopped, driven flatbed.
export function transferHomeLoad(home, {vehicle, position, speedKmh}) {
  if (vehicle !== 'flatbed' || !position || !Number.isFinite(speedKmh) || Math.abs(speedKmh) >= 1.5) return home;
  const bed = Object.keys(HOME_BUILDS).find(kind => home.loads[kind] === 'bed');
  if (bed) {
    const mark = home.builds.find(row => row.kind === bed && row.stage === 0);
    if (!mark || Math.hypot(position.x - buildInLand(mark).x, position.z - buildInLand(mark).z) > 4) return home;
    return {...home, loads: {...home.loads, [bed]: {i: mark.i, j: mark.j}}};
  }
  const kind = Object.keys(HOME_BUILDS).find(key => {
    if (home.crew?.job?.kind === key) return false;
    if (!home.builds.some(row => row.kind === key && row.stage === 0) && home.builds.some(row => row.kind === key && row.stage > 0)) return false;
    if (home.builds.some(row => row.kind === key && row.stage > 0 && row.stage < 4)) return false;
    const location = home.loads[key];
    const at = location === 'stack' ? HOME_LOAD_STACK : loadPoint(location) ? groundPoint(location.i, location.j) : null;
    return at && Math.hypot(position.x - at.x, position.z - at.z) <= 4;
  });
  return kind ? {...home, loads: {...home.loads, [kind]: 'bed'}} : home;
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
  return piece !== null && typeof piece === 'object' &&
    (Object.keys(piece).length === 4 || Object.keys(piece).length === 5 && piece.kind === 'panel' && typeof piece.down === 'boolean') &&
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
  if (home === null || typeof home !== 'object' || Array.isArray(home) || ![1, 2, 3, 4, HOME_RECORD_VERSION].includes(home.version)) return false;
  const built = cleanHomeName(home.name) === home.name && Array.isArray(home.pieces) && home.pieces.every(readablePiece) &&
    Array.isArray(home.marks) && home.marks.every(readablePiece) && home.marks.length <= 4 * HOME_CELLS * (HOME_CELLS + 1) &&
    home.pieces.filter(piece => piece.kind === 'gate').length <= 1 &&
    home.pieces.filter(piece => piece.kind === 'panel').length <= HOME_PANELS;
  if (!built || home.version === 1) return built;
  if (home.version >= 3 && !readableBuildings(home)) return false;
  if (home.version >= 4 && !readableCrew(home)) return false;
  if (home.version >= 5 && !readableRaids(home.raids)) return false;
  const builtIn = coopBoxes(home);
  return Array.isArray(home.hens) && home.hens.length <= (builtIn.length ? HOME_BUILDS.coop.hens * builtIn.length / 3 : MOSS_HENS.length) && home.hens.every(readableHen) &&
    Array.isArray(home.boxes) && home.boxes.length <= HOME_CRATES + builtIn.length && home.boxes.every(readableBox) &&
    builtIn.every(cell => home.boxes.some(box => sameCell(box, cell))) &&
    new Set(home.boxes.map(box => box.i + ':' + box.j)).size === home.boxes.length &&
    count(home.eggs) && (home.lastSeen === null || (Number.isFinite(home.lastSeen) && home.lastSeen >= 0));
}

function readableRaids(raids) {
  return !!raids && Object.keys(raids).length === 6 && Number.isFinite(raids.played) && raids.played >= 0 &&
    count(raids.sittings) && (raids.nextDue === null || Number.isFinite(raids.nextDue) && raids.nextDue >= 0) &&
    typeof raids.testDone === 'boolean' && count(raids.won) && count(raids.lost);
}

export function standPanel(home, piece) {
  if (piece.kind !== 'panel' || !piece.down) return home;
  return {...home, pieces: home.pieces.map(row => row === piece ? {...row, down: false} : row)};
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
  if ((home.builds ?? []).some(row => pieceThroughBuild(piece, row))) return 'onTop';
  if (piece.kind === 'gate') {
    const lane = laneOf(piece);
    if (home.pieces.some(other => stepsOf(other).some(key => crossesLane(key, lane)))) return 'gateLane';
    if ((home.boxes ?? []).some(box => boxInLane(box, lane))) return 'gateLaneBox';
    if ((home.builds ?? []).some(row => rectanglesOverlap(buildBounds(row), lane))) return 'lane';
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
  for (const row of home?.builds ?? []) {
    if (row.stage < (row.kind === 'tower' ? 1 : 2)) continue;
    const at = buildInLand(row), w = HOME_BUILDS[row.kind].width * HOME_STEP, d = HOME_BUILDS[row.kind].depth * HOME_STEP;
    const add = (key, x, z, halfX, halfZ, height) => {
      const px = at.x + x * Math.cos(at.heading) + z * Math.sin(at.heading);
      const pz = at.z - x * Math.sin(at.heading) + z * Math.cos(at.heading);
      rows.push({id: `home/${row.kind}/${row.i}/${row.j}/${key}`, kind: 'wall', x: px, z: pz, halfX, halfZ, heading: at.heading,
        height, base: heightAt(at.x, at.z)});
    };
    if (row.kind === 'tower') {
      for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) add(`post/${x}/${z}`, x, z, .16, .16, HOME_TOWER.platform);
      continue;
    }
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) add(`post/${x}/${z}`, x, z, .09, .09, 2.1);
    if (row.stage >= 3) {
      add('back', 0, -d / 2, w / 2, .06, 2.1);
      for (const side of [-1, 1]) add('side/' + side, side * w / 2, 0, .06, d / 2, 2.1);
      if (row.kind === 'shed') for (const side of [-1, 1]) add('front/' + side, side * 1.35, d / 2, .65, .06, 2.1);
    }
  }
  for (const box of home?.boxes ?? []) {
    const {x, z} = boxInLand(box);
    rows.push({id: `home/box/${box.i}/${box.j}`, kind: 'post', x, z, halfX: HOME_BOX.size / 2, halfZ: HOME_BOX.size / 2,
      heading: 0, height: HOME_BOX.height, base: heightAt(x, z)});
  }
  for (const piece of home?.pieces ?? []) {
    if (piece.down) continue;
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
  const covered = new Set(home.pieces.filter(piece => !piece.down).flatMap(stepsOf));
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
export const cratesLeft = home => home?.hens?.length ? HOME_CRATES - home.boxes.length + coopBoxes(home).length : 0;
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
// Keep the snapped box inside the forward view, in radians to either side of where he looks.
const BOX_AIM = .6;
// The cell in front of him, for a nest box.
export function boxSlotInFront(position, yaw) {
  const ahead = {x: Math.sin(yaw), z: Math.cos(yaw)};
  const {a, b} = toGrid(position.x + ahead.x * HOME_BOX_REACH, position.z + ahead.z * HOME_BOX_REACH);
  let best = null;
  // Snapping to a two-metre cell must not bring the box back under his feet. Choose the nearest cell whose centre
  // is at least a step ahead and inside his forward view.
  for (let i = Math.floor(a) - 1; i <= Math.floor(a) + 1; i++) {
    for (let j = Math.floor(b) - 1; j <= Math.floor(b) + 1; j++) {
      const at = boxInLand({i, j}), dx = at.x - position.x, dz = at.z - position.z;
      const along = dx * ahead.x + dz * ahead.z, across = dx * ahead.z - dz * ahead.x;
      if (along < HOME_BOX_REACH - .5 || Math.abs(across) > along * Math.tan(BOX_AIM)) continue;
      const score = (along - HOME_BOX_REACH) ** 2 + across ** 2;
      if (!best || score < best.score) best = {i, j, score};
    }
  }
  // No cell clears a step ahead inside the view only at a grid corner; the plain cell ahead is then the answer.
  return best ? {kind: 'box', i: best.i, j: best.j} : {kind: 'box', i: Math.floor(a), j: Math.floor(b)};
}
export function boxRefusal(home, cell) {
  if (!whole(cell.i) || !whole(cell.j) || cell.i < 0 || cell.j < 0 || cell.i >= HOME_CELLS || cell.j >= HOME_CELLS) return 'offGround';
  if (home.boxes.some(box => box.i === cell.i && box.j === cell.j)) return 'boxCell';
  if ((home.builds ?? []).some(row => rectanglesOverlap(buildBounds(row), {i0: cell.i, i1: cell.i + 1, j0: cell.j, j1: cell.j + 1}))) return 'onTop';
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
  if (coopBoxes(home).some(cell => sameCell(cell, home.boxes[index]))) return home;
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
  if (opened?.raid) lines.push(opened.raid);
  const down = home?.pieces.filter(piece => piece.down).length ?? 0;
  if (down) lines.push(down === 1 ? HOME_WORDS.panelDown : fill(HOME_WORDS.panelsDown, {count: down === 2 ? 'Two' : down}));
  if (opened?.finished) lines.push(crewFinishedWords(home, opened.finished));
  const away = opened?.away ?? 0;
  if (opened?.long) lines.push(BOARD_WORDS.awayLong);
  else if (away >= 3600) lines.push(fill(BOARD_WORDS.away, {time: awayWords(away)}));
  if (!home?.hens?.length) {
    lines.push(hensWaiting(home) ? BOARD_WORDS.crate : BOARD_WORDS.fenceFirst);
    return lines;
  }
  const laid = opened?.laid ?? 0;
  lines.push(laid === 0 ? BOARD_WORDS.laidNone : laid === 1 ? BOARD_WORDS.laidOne : fill(BOARD_WORDS.laidMany, {count: laid}));
  const waiting = eggsInBoxes(home);
  lines.push(!home.boxes.length ? BOARD_WORDS.noBox : boxesFull(home) ? BOARD_WORDS.full : waiting === 0 ? BOARD_WORDS.emptyBoxes :
    waiting === 1 ? BOARD_WORDS.waitingOne : fill(BOARD_WORDS.waiting, {count: waiting}));
  lines.push(home.builds?.some(row => row.kind === 'shed' && row.stage === 4) ? shedWords(home) :
    home.eggs === 0 ? BOARD_WORDS.storeNone : home.eggs === 1 ? BOARD_WORDS.storeOne : fill(BOARD_WORDS.store, {count: home.eggs}));
  if (home.boxes.length && !home.builds?.some(row => row.kind === 'coop' && row.stage === 4)) lines.push(BOARD_WORDS.firstBuildings);
  return lines;
}

// ---- HOME-GROUND-2: what he faces, within reach ----------------------------------------------------------------------
// A piece he built whose run passes within half a metre of the line from his feet to just past the outline's place, or a
// nest box there: the nearest along that line. This is what one press of B picks up.
export function facedThing(home, position, yaw) {
  const ahead = {x: Math.sin(yaw), z: Math.cos(yaw)};
  let best = null;
  const offer = (thing, along) => { if (!best || along < best.along) best = {...thing, along}; };
  // The box's snapped cell can lie beside the sight line or one cell further on. The same reach serves building,
  // gathering and picking it up, without extending the reach for fence panels.
  (home?.boxes ?? []).forEach((box, index) => {
    if (coopBoxes(home).some(cell => sameCell(cell, box))) return;
    const at = boxInLand(box), dx = at.x - position.x, dz = at.z - position.z;
    const along = dx * ahead.x + dz * ahead.z, across = dx * ahead.z - dz * ahead.x;
    if (along >= .3 && Math.hypot(dx, dz) <= HOME_BOX_REACH + HOME_STEP && Math.abs(across) <= along * Math.tan(BOX_AIM))
      offer({kind: 'box', index, box}, along);
  });
  for (let step = 3; step <= 20; step++) {
    const along = step / 10, px = position.x + ahead.x * along, pz = position.z + ahead.z * along;
    if (best && along > best.along) break;
    for (const piece of home?.pieces ?? []) {
      const {x, z, length, heading} = pieceInLand(piece);
      const run = {x: Math.cos(heading), z: -Math.sin(heading)};
      const dx = px - x, dz = pz - z, t = Math.max(-length / 2, Math.min(length / 2, dx * run.x + dz * run.z));
      if (Math.hypot(dx - run.x * t, dz - run.z * t) <= .5) offer({kind: 'piece', piece}, along);
    }
  }
  return best;
}
