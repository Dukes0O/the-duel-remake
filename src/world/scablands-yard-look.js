// The Scrapdome's yard as it stands on the Scablands (EVERBURN-REMAKE, job 1: "the yard stands on the land"). Claude's drawing.
// Everything here is shaped in code: no model files.
//
// What it is: a ring of scrap wall 170 m across round the place where the land's six roads meet, with an opening for each road.
// The East Road leaves through the gate: two towers of stacked shipping containers, a steel truss across them with the yard's
// name painted on a plate, and two leaves swung open. Inside the ring stand the dome (ribs of girder, skinned in patched sheet,
// with panels missing) and a lattice mast that is seen from the roads long before the wall is.
//
// Two rules keep it from reading as a toy. Nothing is a clean run: every sheet of the wall has its own height, its own lean out of
// line and its own colour, and containers stand in the wall where a sheet would not hold. And nothing is one colour: the sheets
// wear a picture of corrugated iron with rust run down it, over each sheet's own paint.
//
// `yardPlan()` is plain data: where each piece stands, and the solid shapes a car meets (`solids`), so that what is drawn and
// what is solid come from one list. `createYard({heightAt})` draws it; `heightAt(x, z)` is the ground's height in the yard's own
// frame (the yard's centre at the origin, x and z as the land's), so that every piece stands on the real ground.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROAD_NET} from './scablands-road.js';
import {makeRng} from '../rng.js';

export const YARD = Object.freeze({
  radius: 85, panel: 3.2, eastGate: 12, opening: 24, container: Object.freeze({length: 12.2, height: 2.9, depth: 2.6}),
  mast: Object.freeze({height: 40, foot: 2.6, top: .45, distance: 55}),
  dome: Object.freeze({distance: 54, radius: 19, height: 15, meridians: 14, bands: 6}),
});

const hash = (a, b = 0) => Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
const turn = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
// A bearing is measured as the land measures a heading: from +z toward +x.
const at = (bearing, distance) => ({x: Math.sin(bearing) * distance, z: Math.cos(bearing) * distance});

// Where everything stands. `roads` are the land's roads; a road that starts at the yard gets an opening in the wall.
export function yardPlan(roads = ROAD_NET.roads) {
  const R = YARD.radius, box = YARD.container;
  const openings = roads.filter(road => Math.hypot(road.points[0].x, road.points[0].z) < 60).map(road => {
    const first = road.points[0], east = road.id === 'east-road';
    return {id: road.id, bearing: Math.atan2(first.x, first.z), width: east ? YARD.eastGate : YARD.opening, gate: east};
  });
  const east = openings.find(opening => opening.gate) ?? null;
  // The gate's towers stand where the wall would: a container's length each side of the opening.
  const clearOf = opening => (opening.gate ? opening.width / 2 + box.length + .4 : opening.width / 2) / R;
  const count = Math.round(2 * Math.PI * R / YARD.panel), step = 2 * Math.PI / count;
  const free = index => { const bearing = index * step; return openings.every(opening => Math.abs(turn(bearing - opening.bearing)) > clearOf(opening) + step / 2); };
  const pieces = [], solids = [];
  for (let index = 0; index < count; index++) {
    if (!free(index)) continue;
    const bearing = index * step;
    // A container stands in the wall about every seventeenth sheet, where four sheets in a row are free.
    if (hash(index, 3) < .06 && [1, 2, 3].every(more => free(index + more))) {
      const middle = bearing + step * 1.5, spot = at(middle, R), high = hash(index, 5) < .45 ? 2 : 1;
      pieces.push({kind: 'container', ...spot, heading: middle, stack: high, key: index});
      solids.push({id: `yard-container-${index}`, kind: 'building', shape: 'box', ...spot, heading: middle, halfX: box.length / 2, halfZ: box.depth / 2, height: box.height * high});
      index += 3;
      continue;
    }
    const out = (hash(index, 7) - .5) * .5, spot = at(bearing, R + out), height = 3.4 + 2.2 * hash(index, 11);
    const heading = bearing + (hash(index, 13) - .5) * .14;
    pieces.push({kind: 'sheet', ...spot, heading, height, length: YARD.panel + .12, key: index});
    solids.push({id: `yard-wall-${index}`, kind: 'building', shape: 'box', ...spot, heading, halfX: YARD.panel / 2 + .06, halfZ: .3, height});
  }
  // Plain posts at each side of a road's opening that is not the gate.
  for (const opening of openings.filter(item => !item.gate)) for (const side of [-1, 1]) {
    const bearing = opening.bearing + side * (opening.width / 2 + .2) / R, spot = at(bearing, R);
    pieces.push({kind: 'post', ...spot, heading: bearing, height: 6.2, key: opening.bearing * 7 + side});
    solids.push({id: `yard-post-${opening.id}-${side < 0 ? 'a' : 'b'}`, kind: 'post', shape: 'ellipse', ...spot, halfX: .45, halfZ: .45, height: 6.2});
  }
  let gate = null;
  if (east) {
    const towers = [-1, 1].map(side => {
      const bearing = east.bearing + side * (east.width / 2 + box.length / 2) / R, spot = at(bearing, R);
      solids.push({id: `yard-gate-tower-${side < 0 ? 'a' : 'b'}`, kind: 'building', shape: 'box', ...spot, heading: east.bearing, halfX: box.length / 2, halfZ: box.depth / 2, height: box.height * 2 + 2.6});
      return {...spot, side};
    });
    gate = {...at(east.bearing, R), bearing: east.bearing, width: east.width, clearance: box.height * 2, towers};
  }
  // The mast and the dome stand in the two widest gaps between roads, inside the wall.
  const bearings = openings.map(opening => opening.bearing).sort((a, b) => a - b);
  const gaps = bearings.map((bearing, index) => { const next = bearings[(index + 1) % bearings.length] + (index + 1 === bearings.length ? 2 * Math.PI : 0); return {middle: bearing + (next - bearing) / 2, width: next - bearing}; })
    .sort((a, b) => b.width - a.width);
  const dome = gaps[0] ? {...at(gaps[0].middle, YARD.dome.distance), bearing: gaps[0].middle, radius: YARD.dome.radius, height: YARD.dome.height} : null;
  const mast = gaps[2] ? {...at(gaps[2].middle, YARD.mast.distance), bearing: gaps[2].middle, height: YARD.mast.height} : null;
  if (dome) solids.push({id: 'yard-dome', kind: 'building', shape: 'ellipse', x: dome.x, z: dome.z, halfX: dome.radius, halfZ: dome.radius, height: dome.height});
  if (mast) solids.push({id: 'yard-mast', kind: 'post', shape: 'box', x: mast.x, z: mast.z, heading: mast.bearing, halfX: YARD.mast.foot, halfZ: YARD.mast.foot, height: mast.height});
  return {radius: R, openings, pieces, gate, dome, mast, solids};
}

// ---- Shapes ---------------------------------------------------------------------------------------------------------------------------
const paint = (geometry, hex, shadeFoot = 0) => {
  const colour = new THREE.Color(hex), position = geometry.attributes.position, values = new Float32Array(position.count * 3);
  geometry.computeBoundingBox();
  const low = geometry.boundingBox.min.y, tall = Math.max(.01, geometry.boundingBox.max.y - low);
  for (let i = 0; i < position.count; i++) {
    // Dark and damp where a thing meets the ground.
    const k = 1 - shadeFoot * Math.max(0, 1 - (position.getY(i) - low) / Math.min(tall, 1.2));
    values[i * 3] = colour.r * k; values[i * 3 + 1] = colour.g * k; values[i * 3 + 2] = colour.b * k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
  return geometry;
};
// The sheet picture repeats along a piece every 2.4 m; `plain` pieces (posts, struts) take one flat place in it.
const ribbed = (geometry, length, slide = 0) => {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * length / 2.4 + slide);
  return geometry;
};
const plain = geometry => { const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, .52, .62); return geometry; };

const SHEET = [0x634939, 0x725843, 0x544034, 0x7f6d56, 0x828681, 0x71766e, 0x5f6e72, 0x776f54, 0x654f40, 0x443b36];
const CONTAINER = [0x713f30, 0x425a66, 0x84764c, 0x4f5b48, 0x6b6964, 0x744837];
const STEEL = (a, b, dark = 1) => {
  const t = hash(a, b), u = hash(a * 3.1, b * 1.7);
  return new THREE.Color().setRGB((.27 + .1 * t) * dark, (.16 + .05 * t + .025 * u) * dark, (.115 + .04 * u) * dark, THREE.SRGBColorSpace).getHex();
};

// The same pieces serve other scrap-built things (src/world/ash-men-look.js).
export function scrapBuilder(heightAt = () => 0) { return builder(heightAt); }
export const scrapSheetColours = () => SHEET.slice(), scrapSteel = (a, b, dark = 1) => STEEL(a, b, dark);

function builder(heightAt) {
  const parts = [];
  // A frame at (x, z) turned to `heading`: its x runs along the wall there, its z points out of the yard, its y is up from the ground.
  const frame = (x, z, heading, sink = .25) => {
    const matrix = new THREE.Matrix4().makeRotationY(heading).setPosition(x, heightAt(x, z) - sink, z);
    return {
      box(width, height, depth, lx, ly, lz, hex, {ribs = false, about = 0, lean = 0, foot = 0, slide = 0} = {}) {
        let geometry = new THREE.BoxGeometry(width, height, depth);
        geometry = ribs ? ribbed(geometry, Math.max(width, depth), slide) : plain(geometry);
        if (lean) geometry.rotateX(lean);
        if (about) geometry.rotateY(about);
        geometry.translate(lx, ly, lz);
        parts.push(paint(geometry, hex, foot).applyMatrix4(matrix).toNonIndexed());
      },
      strut(from, to, thick, hex) {
        const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), along = b.clone().sub(a), length = along.length();
        const geometry = plain(new THREE.BoxGeometry(thick, length, thick));
        geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize()));
        geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        parts.push(paint(geometry, hex).applyMatrix4(matrix).toNonIndexed());
      },
      // Any other shape (a drum, a tyre), built about the frame's origin, painted one colour and given the picture's flat place.
      add(geometry, hex, foot = 0) {
        const piece = plain(geometry.index ? geometry.toNonIndexed() : geometry);
        parts.push(paint(piece, hex, foot).applyMatrix4(matrix));
      },
      skin(corners, hex) {
        // A four-cornered panel of sheet, flat-shaded, seen from both sides.
        const [a, b, c, d] = corners, position = [...a, ...b, ...c, ...a, ...c, ...d], wide = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
        const u = wide / 2.4, s = hash(a[0], a[2]);
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([s, 0, s + u, 0, s + u, 1, s, 0, s + u, 1, s, 1], 2));
        geometry.computeVertexNormals();
        parts.push(paint(geometry, hex).applyMatrix4(matrix));
      },
    };
  };
  return {parts, frame};
}

function wall(frame, plan) {
  const box = YARD.container;
  for (const piece of plan.pieces) {
    const f = frame(piece.x, piece.z, piece.heading), k = piece.key;
    if (piece.kind === 'sheet') {
      const h = piece.height, lean = (hash(k, 17) - .5) * .12, hex = SHEET[Math.floor(hash(k, 19) * SHEET.length)];
      f.box(piece.length, h, .09, 0, h / 2, 0, hex, {ribs: true, lean, foot: .45, slide: hash(k, 23)});
      // One sheet in three carries a second, shorter sheet lapped over its top.
      if (hash(k, 29) < .34) f.box(piece.length * .8, 1.5, .09, (hash(k, 31) - .5) * .5, h + .35, .1, SHEET[Math.floor(hash(k, 37) * SHEET.length)], {ribs: true, lean: lean + .05, slide: hash(k, 41)});
      // A post behind each sheet, two rails along it, and a prop to the ground behind every fourth.
      f.box(.2, h + .5, .2, -piece.length / 2 + .1, (h + .5) / 2, -.16, STEEL(k, 1, .8), {foot: .4});
      f.box(piece.length, .12, .1, 0, h * .32, -.12, STEEL(k, 2, .7)); f.box(piece.length, .12, .1, 0, h * .78, -.12, STEEL(k, 3, .7));
      if (k % 4 === 0) f.strut([0, h * .78, -.18], [0, .1, -2.6], .16, STEEL(k, 4, .75));
    } else if (piece.kind === 'container') {
      for (let level = 0; level < piece.stack; level++) {
        const hex = CONTAINER[Math.floor(hash(k, 43 + level) * CONTAINER.length)], skew = level ? (hash(k, 47) - .5) * .16 : 0;
        f.box(box.length, box.height, box.depth, level ? (hash(k, 53) - .5) * 1.2 : 0, box.height * (level + .5), 0, hex, {ribs: true, about: skew, foot: level ? 0 : .4, slide: hash(k, 59)});
        // The frame of the box: corner posts and the top and bottom rails, darker than the sheet.
        for (const end of [-1, 1]) for (const side of [-1, 1]) f.box(.18, box.height, .18, end * (box.length / 2 - .05), box.height * (level + .5), side * (box.depth / 2 - .05), STEEL(k + level, end + side * 3, .7), {about: skew});
      }
    } else {
      f.box(.7, piece.height, .7, 0, piece.height / 2, 0, STEEL(k, 6, .8), {foot: .4});
      f.box(1.1, .25, 1.1, 0, piece.height + .1, 0, STEEL(k, 7, .6)); f.box(1.3, .5, 1.3, 0, .2, 0, 0x4a443c, {foot: .5});
    }
  }
}

function gate(frame, plan) {
  if (!plan.gate) return;
  const g = plan.gate, box = YARD.container, f = frame(g.x, g.z, g.bearing, .2), half = g.width / 2, top = g.clearance;
  for (const side of [-1, 1]) {
    const cx = side * (half + box.length / 2);
    for (let level = 0; level < 2; level++) {
      f.box(box.length, box.height, box.depth, cx + (level ? side * .35 : 0), box.height * (level + .5), 0, CONTAINER[(level + (side > 0 ? 2 : 0)) % CONTAINER.length], {ribs: true, foot: level ? 0 : .4, slide: .3 * level + .1 * side});
      for (const end of [-1, 1]) for (const face of [-1, 1]) f.box(.2, box.height, .2, cx + end * (box.length / 2 - .06), box.height * (level + .5), face * (box.depth / 2 - .06), STEEL(level + side, end + face * 3, .68));
    }
    // A lookout on each tower: a hut of sheet with a tilted roof, and a rail round the tower's top.
    const hx = side * (half + 2.6);
    f.box(3.2, 2.1, 2.3, hx, top + 1.05, 0, SHEET[side > 0 ? 3 : 6], {ribs: true, slide: .2});
    f.box(3.8, .1, 2.9, hx, top + 2.3, 0, SHEET[1], {ribs: true, lean: .12});
    for (const face of [-1, 1]) f.box(box.length - 3.6, .08, .08, side * (half + 3.4 + (box.length - 3.6) / 2), top + 1.0, face * (box.depth / 2 - .1), STEEL(side, face + 20, .75));
    for (let post = 0; post < 4; post++) for (const face of [-1, 1]) f.box(.08, 1.0, .08, side * (half + 4 + post * 2.6), top + .5, face * (box.depth / 2 - .1), STEEL(post, face + 30 + side, .75));
    // A leaf of the gate, swung open outward: a frame of pipe and three sheets, hung from the tower's corner.
    const hinge = [side * half, 0, box.depth / 2], swing = side * 1.75, leaf = half - .4, dx = -side * Math.cos(swing), dz = Math.abs(Math.sin(swing));
    const on = (t, y) => [hinge[0] + dx * leaf * t, y, hinge[2] + dz * leaf * t];
    for (const y of [.35, 2.4, 4.4]) f.strut(on(0, y), on(1, y), .14, STEEL(side, y, .7));
    for (const t of [0, .5, 1]) f.strut(on(t, .2), on(t, 4.5), .14, STEEL(side, t + 9, .7));
    f.strut(on(0, .4), on(1, 4.3), .1, STEEL(side, 15, .7));
    for (let sheet = 0; sheet < 3; sheet++) {
      const a = on(sheet / 3 + .02, .5), b = on((sheet + 1) / 3 - .02, .5), high = 3.4 + .7 * hash(side, sheet);
      f.skin([a, b, [b[0], high, b[2]], [a[0], high, a[2]]], SHEET[(sheet * 3 + (side > 0 ? 1 : 5)) % SHEET.length]);
    }
  }
  // The truss across the towers: two chords, an upright every 2 m and a diagonal in each bay, on both faces of the towers.
  const span = half + 1.2, bays = Math.round(span * 2 / 2), bay = span * 2 / bays;
  for (const face of [-1, 1]) {
    const z = face * .9;
    f.strut([-span, top + .15, z], [span, top + .15, z], .26, STEEL(face, 40)); f.strut([-span, top + 1.75, z], [span, top + 1.75, z], .26, STEEL(face, 41));
    for (let index = 0; index <= bays; index++) {
      const x = -span + index * bay;
      f.strut([x, top + .15, z], [x, top + 1.75, z], .18, STEEL(index, face + 42));
      if (index < bays) f.strut([x, top + (index % 2 ? 1.75 : .15), z], [x + bay, top + (index % 2 ? .15 : 1.75), z], .14, STEEL(index, face + 44));
    }
  }
  for (let index = 0; index <= bays; index++) f.strut([-span + index * bay, top + 1.75, -.9], [-span + index * bay, top + 1.75, .9], .14, STEEL(index, 46));
  // Two lamps hang under the truss, each on its own length of chain.
  for (const x of [-half * .55, half * .55]) { f.strut([x, top + .15, 0], [x, top - .7, 0], .05, 0x1c1a18); f.box(.5, .32, .5, x, top - .85, 0, 0x2a2622); }
}

function mast(frame, plan) {
  if (!plan.mast) return;
  const m = plan.mast, f = frame(m.x, m.z, m.bearing, .2), H = m.height, half = y => YARD.mast.foot + (YARD.mast.top - YARD.mast.foot) * (y / H) ** .8;
  const corner = (index, y) => { const r = half(y), sx = index === 0 || index === 3 ? -1 : 1, sz = index < 2 ? -1 : 1; return [sx * r, y, sz * r]; };
  for (let index = 0; index < 4; index++) f.strut(corner(index, 0), corner(index, H), .22, STEEL(index, 60, .85));
  for (let level = 0, y = 0, step = 5; y < H - 1; level++, y += step, step = Math.max(2.4, step * .88)) {
    const next = Math.min(H, y + step);
    for (let index = 0; index < 4; index++) {
      const other = (index + 1) % 4;
      f.strut(corner(index, next), corner(other, next), .12, STEEL(level, index + 61, .9));
      f.strut(corner(level % 2 ? index : other, y), corner(level % 2 ? other : index, next), .1, STEEL(level, index + 65, .9));
    }
  }
  // A platform, a lamp and a pole with what is left of a flag.
  f.box(1.7, .12, 1.7, 0, H + .06, 0, STEEL(1, 70, .7)); f.box(.5, .5, .5, 0, H + .4, 0, 0x2a2622);
  f.strut([0, H, 0], [0, H + 5, 0], .1, STEEL(1, 71));
  f.skin([[.05, H + 3.3, 0], [3.4, H + 3.0, .5], [3.1, H + 4.5, .8], [.05, H + 4.9, 0]], 0x6e2f22);
  f.skin([[3.4, H + 3.0, .5], [4.6, H + 3.4, .2], [4.1, H + 4.0, .3], [3.1, H + 4.5, .8]], 0x5a281e);
}

function dome(frame, plan) {
  if (!plan.dome) return;
  const d = plan.dome, f = frame(d.x, d.z, d.bearing + Math.PI, .3), M = YARD.dome.meridians, B = YARD.dome.bands;
  // A node of the frame: meridian i (0 faces the yard's middle), band j from the ground (0) to the crown (B).
  const node = (i, j) => { const round = i / M * 2 * Math.PI, up = j / B * Math.PI / 2; return [Math.sin(round) * d.radius * Math.cos(up), d.height * Math.sin(up), Math.cos(round) * d.radius * Math.cos(up)]; };
  for (let i = 0; i < M; i++) for (let j = 0; j < B; j++) {
    const door = (i === 0 || i === M - 1) && j < 2;
    f.strut(node(i, j), node(i, j + 1), .3, STEEL(i, j + 80, .8));
    if (j && !(door && j < 2 && i === M - 1)) f.strut(node(i, j), node(i + 1, j), .22, STEEL(i, j + 90, .8));
    // Three panels in four still hang; the doorway toward the yard's middle is open.
    if (!door && hash(i * 5.1, j * 3.7 + 100) < .76 && j < B - 1)
      f.skin([node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)], SHEET[Math.floor(hash(i, j + 110) * SHEET.length)]);
  }
  for (let i = 0; i < M; i++) f.skin([node(i, B - 1), node(i + 1, B - 1), node(i + 1, B), node(i, B)], SHEET[(i * 3) % SHEET.length]);
  // A ring beam at the foot and a lintel over the doorway.
  for (let i = 0; i < M; i++) if (i !== M - 1) f.strut(node(i, 0), node(i + 1, 0), .4, 0x3b352f);
  f.strut(node(M - 1, 2), node(1, 2), .36, STEEL(3, 120, .7));
}

export function yardShape(plan = yardPlan(), heightAt = () => 0) {
  const {parts, frame} = builder(heightAt);
  wall(frame, plan); gate(frame, plan); mast(frame, plan); dome(frame, plan);
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  return merged;
}

// The plate with the yard's name, hung on both faces of the gate's truss.
export function yardSignShape(plan = yardPlan(), heightAt = () => 0) {
  if (!plan.gate) return null;
  const g = plan.gate, wide = Math.min(10.5, g.width - 1), tall = 1.75, parts = [];
  for (const face of [-1, 1]) {
    const board = new THREE.PlaneGeometry(wide, tall);
    if (face < 0) board.rotateY(Math.PI);
    board.translate(0, g.clearance + .95, face * 1.06);
    parts.push(board.toNonIndexed());
  }
  const merged = mergeGeometries(parts);
  merged.applyMatrix4(new THREE.Matrix4().makeRotationY(g.bearing).setPosition(g.x, heightAt(g.x, g.z) - .2, g.z));
  return merged;
}

// ---- Surfaces -------------------------------------------------------------------------------------------------------------------------
// Corrugated iron: twelve ribs to the picture's width (2.4 m), a lap seam across the middle, a row of fixings above and below it, rust
// run down from the seam and the fixings, and dirt thrown up along the foot. Greys only: each sheet's own paint shows through it.
export function yardSheetPicture(documentLike = typeof document === 'undefined' ? null : document) {
  if (!documentLike) return null;
  const size = 512, canvas = documentLike.createElement('canvas'); canvas.width = canvas.height = size;
  const pen = canvas.getContext('2d'), rng = makeRng(4117), rib = size / 12;
  for (let x = 0; x < size; x++) {
    const wave = Math.cos(x / rib * 2 * Math.PI), light = Math.round(205 + 44 * wave - 26 * Math.max(0, -wave) ** 3);
    pen.fillStyle = `rgb(${light},${light},${light})`; pen.fillRect(x, 0, 1, size);
  }
  // Blotches of scale, wider than a rib.
  for (let n = 0; n < 70; n++) {
    const x = rng.range(0, size), y = rng.range(0, size), r = rng.range(14, 60), dark = rng.range(.05, .2);
    for (const dx of [-size, 0, size]) { const glow = pen.createRadialGradient(x + dx, y, 0, x + dx, y, r); glow.addColorStop(0, `rgba(58,34,20,${dark})`); glow.addColorStop(1, 'rgba(58,34,20,0)'); pen.fillStyle = glow; pen.fillRect(x + dx - r, y - r, r * 2, r * 2); }
  }
  // The lap seam, its shadow, and the fixings.
  pen.fillStyle = 'rgba(20,14,10,.5)'; pen.fillRect(0, size * .47, size, 3); pen.fillStyle = 'rgba(255,255,255,.1)'; pen.fillRect(0, size * .47 - 3, size, 3);
  for (const row of [.2, .43, .52, .8]) for (let index = 0; index < 12; index += 2) {
    const x = (index + .5 + (row > .5 ? 1 : 0)) * rib, y = size * row;
    pen.fillStyle = 'rgba(24,18,14,.75)'; pen.beginPath(); pen.arc(x, y, 2.6, 0, Math.PI * 2); pen.fill();
    const run = pen.createLinearGradient(0, y, 0, y + rng.range(40, 120)); run.addColorStop(0, `rgba(70,36,18,${rng.range(.25, .5)})`); run.addColorStop(1, 'rgba(70,36,18,0)');
    pen.fillStyle = run; pen.fillRect(x - rng.range(1.5, 4), y, rng.range(3, 7), 120);
  }
  // Long runs of rust from the top edge and the seam.
  for (let n = 0; n < 46; n++) {
    const x = rng.range(0, size), y = rng.float() < .5 ? 0 : size * .47, long = rng.range(60, 230), wide = rng.range(2, 9);
    const run = pen.createLinearGradient(0, y, 0, y + long); run.addColorStop(0, `rgba(64,32,16,${rng.range(.18, .42)})`); run.addColorStop(1, 'rgba(64,32,16,0)');
    pen.fillStyle = run; pen.fillRect(x, y, wide, long);
  }
  // Dirt along the foot (the picture's bottom is a sheet's foot).
  const dirt = pen.createLinearGradient(0, size * .8, 0, size); dirt.addColorStop(0, 'rgba(60,46,32,0)'); dirt.addColorStop(1, 'rgba(60,46,32,.55)');
  pen.fillStyle = dirt; pen.fillRect(0, size * .8, size, size * .2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.anisotropy = 8;
  return texture;
}

export function yardSurface(picture = yardSheetPicture()) {
  return new THREE.MeshStandardMaterial({map: picture, vertexColors: true, roughness: .93, metalness: .08, side: THREE.DoubleSide});
}

// A plate of rusted steel with the name brushed on it in pale paint that has run.
export function yardSignPicture(documentLike = typeof document === 'undefined' ? null : document) {
  if (!documentLike) return null;
  const canvas = documentLike.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
  const pen = canvas.getContext('2d'), rng = makeRng(907);
  pen.fillStyle = '#2c2420'; pen.fillRect(0, 0, 1024, 160);
  for (let n = 0; n < 160; n++) { pen.fillStyle = `rgba(${rng.float() < .5 ? '96,52,28' : '18,14,12'},${rng.range(.05, .22)})`; pen.beginPath(); pen.ellipse(rng.range(0, 1024), rng.range(0, 160), rng.range(8, 70), rng.range(5, 30), rng.range(0, 3), 0, Math.PI * 2); pen.fill(); }
  pen.font = '900 118px Impact, "Arial Narrow", "Arial Black", sans-serif'; pen.textBaseline = 'middle'; pen.textAlign = 'center';
  const word = 'SCRAPDOME', gap = 960 / word.length;
  for (let index = 0; index < word.length; index++) {
    const x = 32 + gap * (index + .5), y = 82 + rng.range(-5, 5);
    pen.save(); pen.translate(x, y); pen.rotate(rng.range(-.035, .035));
    pen.fillStyle = `rgba(${Math.round(rng.range(196, 222))},${Math.round(rng.range(186, 206))},${Math.round(rng.range(150, 176))},.93)`; pen.fillText(word[index], 0, 0); pen.restore();
    // A run of paint from the foot of a letter.
    if (rng.float() < .6) { pen.fillStyle = 'rgba(206,196,164,.75)'; pen.fillRect(x + rng.range(-24, 24), y + 38, rng.range(3, 6), rng.range(10, 34)); }
  }
  // Wear across the paint, and four fixings.
  for (let n = 0; n < 240; n++) { pen.fillStyle = `rgba(44,36,32,${rng.range(.2, .7)})`; pen.fillRect(rng.range(0, 1024), rng.range(0, 160), rng.range(2, 26), rng.range(1, 3)); }
  for (const [x, y] of [[14, 14], [1010, 14], [14, 146], [1010, 146]]) { pen.fillStyle = '#15110f'; pen.beginPath(); pen.arc(x, y, 6, 0, Math.PI * 2); pen.fill(); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

export function yardSignSurface(picture = yardSignPicture()) {
  return new THREE.MeshStandardMaterial({map: picture, color: picture ? 0xb8b2a6 : 0x2c2420, roughness: .9, metalness: .1});
}

// The yard, drawn: one piece for the wall, gate, mast and dome, and one for the name plate. Both cast shadows.
export function createYard({heightAt = () => 0, plan = yardPlan(), documentLike = typeof document === 'undefined' ? null : document} = {}) {
  const group = new THREE.Group(); group.name = 'Scrapdome yard on the land';
  const body = new THREE.Mesh(yardShape(plan, heightAt), yardSurface(yardSheetPicture(documentLike)));
  body.name = 'Yard wall, gate, mast and dome'; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const signShape = yardSignShape(plan, heightAt);
  if (signShape) { const sign = new THREE.Mesh(signShape, yardSignSurface(yardSignPicture(documentLike))); sign.name = 'Yard name plate'; group.add(sign); }
  group.userData.plan = plan;
  return group;
}
