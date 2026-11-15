// What the Scablands' roads, dry river and crossings look like as drawn (SCABLANDS-LAND round 4, slice 2a). The shapes come from the
// same data the driving reads (src/world/scablands-road.js, src/world/scablands-regions.js), so the picture and the rules agree.
//   createRiverField   the river's distance from every point, as a small picture made in code, so that the ground's shader can tell
//                      the bed, the banks and the plain apart without searching the river for every pixel;
//   createRoadsDraw    the road net as flat ribbons laid on the ground in pieces of about a kilometre, built when the player nears them;
//   createRiverDraw    the gorge: the bed and its banks, sunk 8 m, as ribbons (the ground is not drawn where the river is);
//   createCrossings    the Girder Bridge and the Pipe, in code from plain shapes.
// No file is loaded and nothing here changes a height a car touches.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RIVER, RIVER_LAND, riverDepthAt, riverGorgeDepthAt, riverDistanceAt, stepsWayFor} from './scablands-regions.js';
import {ROAD_NET, ROAD_HALF_WIDTH} from './scablands-road.js';
import {resampleRoad} from './scablands-road-geometry.js';
import {NEAR_GROUND, nearGroundHeightAt} from './near-ground.js';

const {cellX, cellZ} = NEAR_GROUND;

// ---- The river's distance picture ----------------------------------------------------------------------------------------------------
// One byte for each 32 m square of the land and its edge: the distance to the river's middle in 0.5 m steps up to 128 m (255 beyond).
// The ground's shader reads it with the picture's own smoothing, which keeps every edge within about a metre and a half.
const FIELD_CELL = 32;
export function createRiverField({halfWidth, halfDepth, river = RIVER_LAND, distance = riverDistanceAt}) {
  const margin = 400, width = Math.ceil((halfWidth * 2 + margin * 2) / FIELD_CELL), depth = Math.ceil((halfDepth * 2 + margin * 2) / FIELD_CELL);
  const x0 = -halfWidth - margin, z0 = -halfDepth - margin, data = new Uint8Array(width * depth);
  for (let row = 0; row < depth; row++) for (let column = 0; column < width; column++) {
    const metres = distance(x0 + (column + .5) * FIELD_CELL, z0 + (row + .5) * FIELD_CELL);
    data[row * width + column] = metres >= 128 ? 255 : Math.round(metres / 128 * 255);
  }
  const texture = new THREE.DataTexture(data, width, depth, THREE.RedFormat, THREE.UnsignedByteType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false; texture.unpackAlignment = 1; texture.needsUpdate = true;
  return {texture, box: {x0, z0, width: width * FIELD_CELL, depth: depth * FIELD_CELL}};
}

// ---- Heights laid on the drawn ground -------------------------------------------------------------------------------------------------
// `plainAt(x, z)` is the ground's height as drawn (the land's own height with the river's cut put back). The drawn ground is the straight
// slopes between the lattice corners of the detailed window (near-ground.js); a thing laid on it reads the same slopes. Corner heights
// are remembered, because a road asks for the same corners again and again.
function createDrawnGround(plainAt) {
  let corners = new Map();
  const corner = (px, pz) => {
    const key = Math.round(px / cellX) * 100003 + Math.round(pz / cellZ);
    let height = corners.get(key);
    if (height === undefined) { height = plainAt(px, pz); corners.set(key, height); }
    return height;
  };
  return {
    at: (x, z) => nearGroundHeightAt(x, z, corner),
    forget: () => { corners = new Map(); },
    get size() { return corners.size; },
  };
}

// ---- Roads ------------------------------------------------------------------------------------------------------------------------------
const ROAD_STEP = 12, ROAD_LIFT = .06, ROAD_REACH = 1.2, PIECE_SECTIONS = 80;
const ROAD_ACROSS = Object.freeze([-1, -.66, -.33, 0, .33, .66, 1].map(share => share * ROAD_REACH));
// How wide the ribbon is where it crosses the river on a deck: a deck is only as wide as its road, so the ribbon narrows to it.
const decks = river => river.crossings.filter(crossing => crossing.deckHalfWidth !== undefined);
function narrowing(x, z, river) {
  const here = river.nearest(x, z);
  if (!here) return 1;
  let narrow = 1;
  for (const crossing of decks(river)) {
    if (Math.abs(here.along - crossing.along) > crossing.reach + 70) continue;
    const share = (crossing.deckHalfWidth + 1.4) / (ROAD_HALF_WIDTH * ROAD_REACH);
    // Narrow where the gorge is, widening over the 40 m before its lip.
    const wide = Math.min(1, Math.max(0, (here.distance - RIVER.lipHalfWidth - 8) / 40));
    narrow = Math.min(narrow, share + (1 - share) * wide * wide * (3 - 2 * wide));
  }
  return narrow;
}

// `material` carries the road's look (createRoadLook). Returns {group, update, refresh, dispose, pieces}.
export function createRoadsDraw({net = ROAD_NET, river = RIVER_LAND, plainAt, material, range = 3000}) {
  const ground = createDrawnGround(plainAt), group = new THREE.Group();
  group.name = 'Scablands roads';
  const pieces = [];
  for (const road of net.roads) {
    const sections = resampleRoad(road.points, ROAD_STEP);
    for (let first = 0; first + 1 < sections.length; first += PIECE_SECTIONS) {
      const last = Math.min(sections.length - 1, first + PIECE_SECTIONS), middle = sections[Math.floor((first + last) / 2)];
      pieces.push({road, first, last, sections, centre: middle, mesh: null});
    }
  }
  function build(piece) {
    const {road, sections, first, last} = piece, across = ROAD_ACROSS.length;
    const positions = [], roads = [], indices = [];
    for (let index = first; index <= last; index++) {
      const section = sections[index], nx = Math.cos(section.heading), nz = -Math.sin(section.heading);
      const squeeze = narrowing(section.x, section.z, river);
      for (let point = 0; point < across; point++) {
        const u = ROAD_ACROSS[point], reach = u * ROAD_HALF_WIDTH * squeeze;
        const x = section.x + nx * reach, z = section.z + nz * reach;
        // The ground the ribbon lies on: the drawn plain with the river's cut (a ford or a wash goes down into the gorge, a deck does not).
        positions.push(x, ground.at(x, z) - riverDepthAt(x, z) + ROAD_LIFT, z);
        roads.push(u, section.along);
      }
      if (index < last) {
        const base = (index - first) * across;
        for (let point = 0; point < across - 1; point++) {
          const a = base + point, b = a + 1, c = a + across, d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aRoad', new THREE.Float32BufferAttribute(roads, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${road.name}, piece ${Math.floor(first / PIECE_SECTIONS) + 1}`; mesh.receiveShadow = true; mesh.renderOrder = 1;
    group.add(mesh); piece.mesh = mesh;
  }
  const limit = range * range;
  return {
    group, pieces,
    // Show the pieces within `range` of the player and build one that is newly near (one a call, so that no frame builds a lot).
    update(x, z, {all = false} = {}) {
      let built = 0;
      for (const piece of pieces) {
        const near = all || (piece.centre.x - x) ** 2 + (piece.centre.z - z) ** 2 < limit;
        if (near && !piece.mesh && (all || built === 0)) { build(piece); built++; }
        if (piece.mesh) piece.mesh.visible = near;
      }
      return built;
    },
    // The ground under the roads has changed (a work order's edit): lay every built piece again.
    refresh() {
      ground.forget();
      for (const piece of pieces) if (piece.mesh) { group.remove(piece.mesh); piece.mesh.geometry.dispose(); piece.mesh = null; }
    },
    dispose() { for (const piece of pieces) piece.mesh?.geometry.dispose(); },
  };
}

// ---- The gorge ----------------------------------------------------------------------------------------------------------------------------
const GORGE_STEP = 16, GORGE_SECTIONS = 64;
const GORGE_ACROSS = Object.freeze([-92, -84, -78, -72, -66, -60, -56, -52, -40, -20, 0, 20, 40, 52, 56, 60, 66, 72, 78, 84, 92]);
// The river's ends are rounded (the ground is cut by distance from the river's line), so the gorge's ribbon closes with a half circle.
const CAPS = 8;

export function createRiverDraw({river = RIVER_LAND, plainAt, material, range = 3000}) {
  const line = resampleRoad(river.line.points, GORGE_STEP), group = new THREE.Group();
  group.name = 'Scablands dry river';
  const frames = [];
  const head = line[0], tail = line.at(-1);
  for (let k = CAPS; k >= 1; k--) {
    const away = k * 92 / (CAPS + 1), dx = Math.sin(head.heading), dz = Math.cos(head.heading);
    frames.push({x: head.x - dx * away, z: head.z - dz * away, heading: head.heading, scale: Math.sqrt(1 - (away / 92) ** 2)});
  }
  for (const section of line) frames.push({...section, scale: 1});
  for (let k = 1; k <= CAPS; k++) {
    const away = k * 92 / (CAPS + 1), dx = Math.sin(tail.heading), dz = Math.cos(tail.heading);
    frames.push({x: tail.x + dx * away, z: tail.z + dz * away, heading: tail.heading, scale: Math.sqrt(1 - (away / 92) ** 2)});
  }
  const pieces = [];
  for (let first = 0; first + 1 < frames.length; first += GORGE_SECTIONS) {
    const last = Math.min(frames.length - 1, first + GORGE_SECTIONS), middle = frames[Math.floor((first + last) / 2)];
    pieces.push({first, last, centre: middle, mesh: null});
  }
  function build(piece) {
    const across = GORGE_ACROSS.length, positions = [], indices = [];
    for (let index = piece.first; index <= piece.last; index++) {
      const frame = frames[index], nx = Math.cos(frame.heading), nz = -Math.sin(frame.heading);
      for (const offset of GORGE_ACROSS) {
        const reach = offset * frame.scale, x = frame.x + nx * reach, z = frame.z + nz * reach;
        positions.push(x, plainAt(x, z) - riverGorgeDepthAt(x, z), z);
      }
      if (index < piece.last) {
        const base = (index - piece.first) * across;
        for (let point = 0; point < across - 1; point++) { const a = base + point, b = a + 1, c = a + across, d = c + 1; indices.push(a, c, b, b, c, d); }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `The dry river, piece ${Math.floor(piece.first / GORGE_SECTIONS) + 1}`; mesh.receiveShadow = true;
    group.add(mesh); piece.mesh = mesh;
  }
  const limit = range * range;
  return {
    group, pieces,
    update(x, z, {all = false} = {}) {
      let built = 0;
      for (const piece of pieces) {
        const near = all || (piece.centre.x - x) ** 2 + (piece.centre.z - z) ** 2 < limit;
        if (near && !piece.mesh && (all || built === 0)) { build(piece); built++; }
        if (piece.mesh) piece.mesh.visible = near;
      }
      return built;
    },
    refresh() { for (const piece of pieces) if (piece.mesh) { group.remove(piece.mesh); piece.mesh.geometry.dispose(); piece.mesh = null; } },
    dispose() { for (const piece of pieces) piece.mesh?.geometry.dispose(); },
  };
}

// ---- The Girder Bridge and the Pipe ----------------------------------------------------------------------------------------------------
// Built from plain boxes and a cylinder in the road's own frame (x across the road, y up, z along it), then merged into one piece each.
const box = (width, height, depth, x, y, z, turn = 0) => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (turn) geometry.rotateX(turn);
  geometry.translate(x, y, z);
  return geometry;
};
const colour = (geometry, hex) => {
  const paint = new THREE.Color(hex), values = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < values.length; i += 3) { values[i] = paint.r; values[i + 1] = paint.g; values[i + 2] = paint.b; }
  geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
  return geometry;
};

// The bridge: a deck level with the plain, a truss up each side (two chords, uprights and a diagonal in each bay), cross ties across the
// top and three piers down to the bed. `length` is the span along the road. Returns one geometry.
export function girderBridgeGeometry({length = 176, deckWidth = 15, bay = 11, depthBelow = 9} = {}) {
  const parts = [], steel = 0x5a4a3c, dark = 0x3b322b, concrete = 0x6b6358, half = length / 2, rail = deckWidth / 2 + .3, top = 5.4;
  parts.push(colour(box(deckWidth, .9, length, 0, -.55, 0), 0x4b4137));
  const bays = Math.round(length / bay), step = length / bays;
  for (const side of [-1, 1]) {
    const x = side * rail;
    parts.push(colour(box(.55, .55, length, x, top, 0), steel), colour(box(.7, .6, length, x, -.1, 0), dark));
    for (let index = 0; index <= bays; index++) {
      const z = -half + index * step;
      parts.push(colour(box(.4, top + .1, .4, x, top / 2, z), steel));
      if (index < bays) {
        const turn = Math.atan2(step, top) * (index % 2 ? 1 : -1), diagonal = Math.hypot(top, step);
        parts.push(colour(box(.3, diagonal, .3, x, top / 2, z + step / 2, turn), steel));
      }
    }
  }
  // Cross ties over the roadway every third bay, high enough for any car and Big Bess.
  for (let index = 1; index < bays; index += 3) parts.push(colour(box(deckWidth + .6, .35, .35, 0, top, -half + index * step), steel));
  for (const along of [-half * .62, 0, half * .62]) parts.push(colour(box(deckWidth - 3, depthBelow + .6, 3.4, 0, -depthBelow / 2 - .55, along), concrete));
  return mergeGeometries(parts.map(part => part.toNonIndexed()));
}

// The Pipe: a narrow deck one car wide with an old pipeline on piers beside it, flanged every few metres.
export function pipeGeometry({length = 176, deckWidth = 8.4, depthBelow = 9} = {}) {
  const parts = [], half = length / 2, rust = 0x5c3f2b, pipeRadius = 1.15, pipeX = deckWidth / 2 + 2.2;
  parts.push(colour(box(deckWidth, .8, length, 0, -.5, 0), 0x4b4137));
  const pipe = new THREE.CylinderGeometry(pipeRadius, pipeRadius, length, 14, 1, false);
  pipe.rotateX(Math.PI / 2); pipe.translate(pipeX, 1.5, 0); parts.push(colour(pipe, rust));
  for (let z = -half + 6; z < half; z += 11) {
    const flange = new THREE.CylinderGeometry(pipeRadius + .22, pipeRadius + .22, .5, 14); flange.rotateX(Math.PI / 2); flange.translate(pipeX, 1.5, z);
    parts.push(colour(flange, 0x3f2c20));
  }
  for (let z = -half + 9; z < half; z += 22) parts.push(colour(box(1.1, depthBelow + 2.4, 1.1, pipeX, -depthBelow / 2 + .35, z), 0x3d3630));
  for (const along of [-half * .6, 0, half * .6]) parts.push(colour(box(deckWidth - 2, depthBelow + .6, 2.6, 0, -depthBelow / 2 - .45, along), 0x6b6358));
  return mergeGeometries(parts.map(part => part.toNonIndexed()));
}

// The crossings' structures, each a mesh placed on its road: {group, update(x, z)}. `material` is the rusted steel's.
export function createCrossings({river = RIVER_LAND, net = ROAD_NET, plainAt, material, range = 2600}) {
  const group = new THREE.Group(), made = [];
  group.name = 'Scablands crossings';
  for (const crossing of river.crossings) {
    if (crossing.kind !== 'bridge' && crossing.kind !== 'pipe') continue;
    const hit = net.nearest(crossing.x, crossing.z);
    if (!hit) continue;
    const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1], heading = Math.atan2(b.x - a.x, b.z - a.z);
    const length = 176, geometry = crossing.kind === 'bridge' ? girderBridgeGeometry({length}) : pipeGeometry({length});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = crossing.name; mesh.castShadow = true; mesh.receiveShadow = true;
    // The deck is level with the plain at its two ends: it is tipped to lie between them, and stands on the road's own heading.
    const dx = Math.sin(heading) * length / 2, dz = Math.cos(heading) * length / 2;
    const front = plainAt(crossing.x + dx, crossing.z + dz), back = plainAt(crossing.x - dx, crossing.z - dz);
    mesh.position.set(crossing.x, (front + back) / 2, crossing.z);
    mesh.rotation.order = 'YXZ'; mesh.rotation.y = heading; mesh.rotation.x = -Math.atan2(front - back, length);
    mesh.material = typeof material === 'function' ? material(crossing, mesh) : material;
    mesh.userData.crossing = crossing.id; mesh.updateMatrixWorld(true); mesh.matrixAutoUpdate = false;
    group.add(mesh); made.push({mesh, crossing});
  }
  const limit = range * range;
  return {group, made, update(x, z) { for (const item of made) item.mesh.visible = (item.crossing.x - x) ** 2 + (item.crossing.z - z) ** 2 < limit; }, dispose() { for (const item of made) item.mesh.geometry.dispose(); }};
}

// ---- The Steps' marked way ---------------------------------------------------------------------------------------------------------------
// The Steps are rock ledges cut down to the river and up again (the ground's own shape, src/world/scablands-regions.js). The way a car climbs
// them is marked: a worn lane 3.6 m wide straight across the river with a dashed pale line down its middle, a low cairn every 16 m beside it, and a
// painted post (2.2 m, solid: src/world/scablands-solids.js) either side of the lane where the ledges meet the plain. Built once, when the player nears it.
export function createStepsWay({river = RIVER_LAND, plainAt, range = 2600}) {
  const way = stepsWayFor(river), group = new THREE.Group();
  group.name = 'The Steps, marked way';
  if (!way) return {group, way, update() {}, dispose() {}};
  const parts = [], reach = RIVER.rampLipHalfWidth + 10, step = 3;
  const heightAt = (x, z) => plainAt(x, z) - riverGorgeDepthAt(x, z);
  const at = (across, lane) => ({x: way.x + way.nx * across + way.tx * lane, z: way.z + way.nz * across + way.tz * lane});
  // The lane: a ribbon laid on the ledges, worn pale, with a dash of lighter chalk every other 3 m along its middle.
  const positions = [], colours = [], indices = [], lanes = [-1.8, -.35, .35, 1.8];
  for (let across = -reach, row = 0; across <= reach; across += step, row++) {
    const dash = Math.floor((across + reach) / step) % 3 !== 2;
    for (const [index, lane] of lanes.entries()) {
      const p = at(across, lane), chalk = index === 1 || index === 2 ? (dash ? .86 : .62) : .5;
      positions.push(p.x, heightAt(p.x, p.z) + .09, p.z);
      colours.push(.62 * chalk + .1, .54 * chalk + .09, .42 * chalk + .07);
    }
    if (across + step <= reach) { const a = row * 4; for (let k = 0; k < 3; k++) indices.push(a + k, a + k + 4, a + k + 1, a + k + 1, a + k + 4, a + k + 5); }
  }
  const lane = new THREE.BufferGeometry();
  lane.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  lane.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  lane.setIndex(indices); lane.computeVertexNormals();
  parts.push(lane.toNonIndexed());
  // Cairns: three flat stones stacked, 0.8 m high in all (a car drives over a stone that low), every 16 m, on both sides of the lane.
  for (let across = -reach + 8; across < reach; across += 16) for (const side of [-1, 1]) {
    const p = at(across, side * 3.4), base = heightAt(p.x, p.z);
    for (const [width, height, lift] of [[1.1, .3, 0], [.8, .26, .3], [.5, .24, .56]]) {
      const stone = new THREE.BoxGeometry(width, height, width * .9); stone.rotateY((across * .13 + side) % 1.2); stone.translate(p.x, base + lift + height / 2, p.z);
      parts.push(colour(stone, 0x6f6455).toNonIndexed());
    }
  }
  // Painted posts at each end, either side of the lane, with a band of rust-orange paint near the top.
  for (const across of [-88, 88]) for (const side of [-3.5, 3.5]) {
    const p = at(across, side), base = heightAt(p.x, p.z);
    const post = new THREE.BoxGeometry(.2, 2.2, .2); post.translate(p.x, base + 1.1, p.z); parts.push(colour(post, 0x7a6e5e).toNonIndexed());
    const band = new THREE.BoxGeometry(.24, .5, .24); band.translate(p.x, base + 1.9, p.z); parts.push(colour(band, 0xb5532a).toNonIndexed());
  }
  for (const part of parts) part.deleteAttribute('uv');
  const merged = mergeGeometries(parts);
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
  mesh.name = 'The Steps, lane, cairns and posts'; mesh.receiveShadow = true; mesh.castShadow = true;
  group.add(mesh); group.visible = false;
  const limit = range * range;
  return {group, way, mesh, update(x, z) { group.visible = (way.x - x) ** 2 + (way.z - z) ** 2 < limit; }, dispose() { merged.dispose(); mesh.material.dispose(); }};
}
