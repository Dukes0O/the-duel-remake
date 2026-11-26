import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createScrapWear} from './world/scrap-look.js';

// COMBAT-ROOF-BOW-LOOK: the crossbow bolted to the roof of every fighting car while the combat rig is on. Drawing only: it
// reads the car's model to sit on its roof and never changes race state.
//
// Metres in the roof's own frame: +Z forward, +Y up, +X the driver's left, y = 0 on the roof's skin under the turntable and
// z = 0 at the turntable. A welded rack stands on four feet; a turntable carries a steel tiller with a timber butt and a
// cocking winch; a prod of stacked leaf springs is drawn back on a steel cable; a bolt with a broadhead lies in the groove,
// with two spares strapped along the tiller. The whole bow sits behind the windscreen's top edge, so the chase camera sees
// it against the roof and the rear glass, never across the windscreen.

export const ROOF_BOW = Object.freeze({
  // A car's width over this many metres sets the scale, kept between the two limits.
  widthPerUnit: 2, minScale: .9, maxScale: 1.3,
  // The rack: two cross bars at these places along the bow, each with a foot at either end. A foot's post may reach `maxLeg`
  // down to the roof; where it cannot, or is longer than `shortLeg`, its bar moves in towards the turntable, down to `minBar`. The rack stands narrower on a
  // narrow roof: a bar's half width shrinks until the skin under each foot is within `rackDrop` of the skin under its middle.
  bars: Object.freeze([-.28, .2]), minBar: .1, rackY: .07, shortLeg: .14, maxLeg: .4, rackHalf: .4, minRackHalf: .06,
  rackDrop: .06,
  // The windscreen starts where the roof's line falls this far below its highest point so far; the bow's point stays this far
  // behind it.
  screenDrop: .05, screenGap: .06,
});

// Colours are kept in the vertex colours so the whole bow is one draw; the scrap wear adds rust, runs and grain.
const COLOURS = Object.freeze({
  steel: 0x6b6f70, dark: 0x2e2a26, rust: 0x7a4a2c, worn: 0xa3a7a6, timber: 0x6a4e34, cable: 0x23211f,
  leather: 0x4a3322, bright: 0xc4c8c6,
});

function parts() {
  const list = [];
  const at = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const colour = new THREE.Color();
  const add = (name, geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal'].includes(key)) g.deleteAttribute(key);
    g.clearGroups();
    g.applyMatrix4(at.compose(p.set(...position), q.setFromEuler(e.set(...rotation, 'YXZ')), s.set(...scale)));
    colour.setHex(COLOURS[name]);
    const colours = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colours.length; i += 3) { colours[i] = colour.r; colours[i + 1] = colour.g; colours[i + 2] = colour.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    list.push(g);
  };
  // Edges are rounded where they are thick enough to catch the light; thin plates and small blocks stay square (and cheap).
  const box = (name, size, position, rotation, radius = .012) => add(name, Math.min(...size) >= .04 ?
    new RoundedBoxGeometry(...size, 1, Math.min(radius, Math.min(...size) / 2 - .001)) : new THREE.BoxGeometry(...size), position, rotation);
  const cyl = (name, radius, height, position, rotation, segments = 10, bottom = radius) =>
    add(name, new THREE.CylinderGeometry(radius, bottom, height, segments), position, rotation);
  // A straight rod between two points.
  const rod = (name, from, to, radius, segments = 6) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), length = a.distanceTo(b);
    const g = new THREE.CylinderGeometry(radius, radius, length, segments);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    add(name, g, a.add(b).multiplyScalar(.5).toArray());
  };
  return {list, add, box, cyl, rod};
}

// One bolt lying along +Z with its shaft's middle at `at`: a shaft, a broadhead flattened into a blade, and three vanes.
function bolt(k, [x, y, z], length = .7, head = 'bright') {
  const back = z - length / 2, front = z + length / 2;
  k.cyl('timber', .018, length, [x, y, z], [Math.PI / 2, 0, 0], 6);
  k.cyl('steel', .022, .05, [x, y, front - .02], [Math.PI / 2, 0, 0], 6, .018);
  k.add(head, new THREE.ConeGeometry(.065, .19, 4), [x, y, front + .095], [Math.PI / 2, 0, 0], [1, 1, .32]);
  for (const turn of [0, Math.PI * 2 / 3, -Math.PI * 2 / 3]) {
    const vane = new THREE.BoxGeometry(.004, .036, .12).translate(0, .03, 0).rotateZ(turn);
    k.add('leather', vane, [x, y, back + .09]);
  }
}

// The bow's fixed parts at scale 1, on the rack a seat describes (roofBowSeat): `bars` the two bars' places along the bow,
// `rack` each bar's half width and `legs` each foot's post, rear left, rear right, front left, front right.
export function roofBowGeometry({bars = ROOF_BOW.bars, rack = [ROOF_BOW.rackHalf, ROOF_BOW.rackHalf],
  legs = [0, 0, 0, 0].map(() => ROOF_BOW.rackY)} = {}) {
  const k = parts(), R = ROOF_BOW.rackY;
  // The rack: two cross bars of square tube and four feet down to the roof, each on a pad.
  bars.forEach((z, bar) => {
    k.box('steel', [rack[bar] * 2 + .1, .04, .045], [0, R, z]);
    for (const side of [-1, 1]) {
      const x = side * rack[bar], leg = Math.max(.02, legs[bar * 2 + (side > 0 ? 1 : 0)] ?? R);
      k.box('dark', [.04, leg + .02, .04], [x, R - leg / 2, z], [0, 0, 0], .006);
      k.box('rust', [.1, .016, .12], [x, R - leg, z], [0, 0, 0], .005);
    }
  });
  // A plate across the bars, bolted down, with the turntable on it.
  k.box('rust', [.34, .022, .6], [0, R + .031, -.04], [0, 0, 0], .008);
  for (const x of [-.14, .14]) for (const z of [-.3, .22]) k.cyl('worn', .014, .018, [x, R + .045, z], [0, 0, 0], 6);
  k.cyl('dark', .12, .04, [0, R + .062, 0], [0, 0, 0], 16);
  for (const x of [-.07, .07]) k.box('steel', [.022, .13, .15], [x, .2, 0], [0, 0, 0], .006);
  k.cyl('worn', .02, .2, [0, .22, 0], [0, 0, Math.PI / 2], 8);
  // The tiller: a welded steel channel with a groove along its top, a timber butt and a cocking winch on its right.
  k.box('steel', [.1, .075, .86], [0, .245, -.04]);
  k.box('dark', [.03, .008, .78], [0, .285, -.02], [0, 0, 0], .002);
  k.box('timber', [.12, .12, .22], [0, .245, -.49], [0, 0, 0], .02);
  k.cyl('dark', .045, .12, [-.11, .245, -.36], [0, 0, Math.PI / 2], 12);
  k.box('rust', [.012, .11, .025], [-.175, .21, -.36]);
  k.cyl('worn', .012, .07, [-.21, .17, -.36], [0, 0, Math.PI / 2], 6);
  k.rod('cable', [-.11, .27, -.36], [0, .3, -.28], .006);
  // The latch that holds the cable back, and its trigger under the tiller.
  k.box('dark', [.07, .045, .06], [0, .3, -.28]);
  k.box('dark', [.016, .07, .02], [0, .175, -.3], [-.3, 0, 0], .004);
  // The head block, and a prod of three stacked leaves a side, bent back by the drawn cable.
  k.box('steel', [.22, .11, .11], [0, .245, .34]);
  k.box('dark', [.24, .03, .07], [0, .31, .34]);
  for (const side of [-1, 1]) {
    const points = [[.1, .37], [.3, .33], [.47, .26], [.6, .16]].map(([x, z]) => [side * x, z]);
    for (let leaf = 0; leaf < 3; leaf++) {
      for (let segment = 0; segment < 3 - leaf; segment++) {
        const [ax, az] = points[segment], [bx, bz] = points[segment + 1];
        const length = Math.hypot(bx - ax, bz - az) + .01, angle = Math.atan2(bz - az, bx - ax);
        // Each leaf lies behind the one in front of it, towards the bow's back.
        const nx = -Math.sin(angle) * side, nz = Math.cos(angle) * side, shift = -.022 * leaf * side;
        k.box(leaf ? 'rust' : 'steel', [length, .065 - leaf * .01, .02], [(ax + bx) / 2 + nx * shift, .245, (az + bz) / 2 + nz * shift],
          [0, -angle, 0], .004);
      }
    }
    // Two clamps where the leaves meet the head block, and the cable's eye at the tip.
    k.box('dark', [.03, .09, .07], [side * .13, .245, .34], [0, 0, 0], .006);
    k.cyl('worn', .018, .085, [side * .6, .245, .16], [0, 0, 0], 8);
    k.rod('cable', [side * .6, .27, .16], [0, .3, -.28], .006);
  }
  // The bolt in the groove, and two spares strapped along the tiller's left side.
  bolt(k, [0, .305, .06], .68);
  for (const [y, z] of [[.225, -.02], [.27, .02]]) bolt(k, [.075, y, z], .62, 'steel');
  for (const z of [-.2, .16]) k.box('leather', [.05, .1, .03], [.08, .245, z], [0, 0, 0], .006);
  const geometry = mergeGeometries(k.list);
  k.list.forEach(g => g.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}

export function createRoofBowMaterial() {
  const wear = createScrapWear({paint: 1, dust: 0x6b5a44, dustTop: .25});
  const material = wear.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .72, metalness: .4}));
  return {material, wear};
}

// The bow for one fighting car: `group` is the rig's mount (it stays on the roof socket); the body sits inside it.
export function createRoofBow(name) {
  const group = new THREE.Group();
  group.name = name;
  const body = new THREE.Group();
  body.name = `${name} body`;
  const {material, wear} = createRoofBowMaterial();
  const mesh = new THREE.Mesh(roofBowGeometry(), material);
  mesh.name = `${name} crossbow`;
  mesh.castShadow = true;
  body.add(mesh);
  group.add(body);
  return {group, body, mesh, material, wear, seat: null};
}

// ---- Sitting on a car's roof -------------------------------------------------------------------------------------------------------

// The car's own surfaces: every visible mesh except what hangs on its sockets (kits, rigs, shields).
function carSurfaces(vehicle) {
  const sockets = new Set(Object.values(vehicle.userData.vehicleSockets ?? {}));
  const meshes = [];
  const walk = node => {
    if (sockets.has(node) || node.visible === false) return;
    if (node.isMesh && !node.isInstancedMesh && !node.isSkinnedMesh && node.geometry?.attributes?.position) meshes.push(node);
    for (const child of node.children) walk(child);
  };
  for (const child of vehicle.children) walk(child);
  return meshes;
}

// The car's skin over the roof, in the vehicle's own metres: `at(x, z)` is the height of the highest surface under that point,
// or null where there is none. The triangles near the roof are gathered once into 10 cm cells, so each look is a few tests.
const CELL = .1;
function roofSkin(vehicle, {x0, x1, z0, z1, below}) {
  const inverse = new THREE.Matrix4().copy(vehicle.matrixWorld).invert(), local = new THREE.Matrix4(), v = new THREE.Vector3();
  const box = new THREE.Box3(), cols = Math.ceil((x1 - x0) / CELL), rows = Math.ceil((z1 - z0) / CELL);
  const cells = Array.from({length: cols * rows}, () => []), tris = [];
  for (const mesh of carSurfaces(vehicle)) {
    const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index;
    local.multiplyMatrices(inverse, mesh.matrixWorld);
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    box.copy(geometry.boundingBox).applyMatrix4(local);
    if (box.max.x < x0 || box.min.x > x1 || box.max.z < z0 || box.min.z > z1 || box.max.y < below) continue;
    const points = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(local).toArray(points, i * 3);
    const count = index ? index.count : position.count;
    // Only a face seen from above is skin: a one-sided face turned down (a roof lining, the far side of a panel) is not drawn
    // from above and must not hold a foot up.
    const bothSides = [mesh.material].flat().some(material => material?.side === THREE.DoubleSide), flip = local.determinant() < 0 ? -1 : 1;
    for (let i = 0; i + 2 < count; i += 3) {
      const a = (index ? index.getX(i) : i) * 3, b = (index ? index.getX(i + 1) : i + 1) * 3, c = (index ? index.getX(i + 2) : i + 2) * 3;
      const minX = Math.min(points[a], points[b], points[c]), maxX = Math.max(points[a], points[b], points[c]);
      const minZ = Math.min(points[a + 2], points[b + 2], points[c + 2]), maxZ = Math.max(points[a + 2], points[b + 2], points[c + 2]);
      if (maxX < x0 || minX > x1 || maxZ < z0 || minZ > z1 || Math.max(points[a + 1], points[b + 1], points[c + 1]) < below) continue;
      // A steep face (a door, a pillar) seen from above is a sliver whose heights run its full height: it is not skin either.
      const ux = points[b] - points[a], uy = points[b + 1] - points[a + 1], uz = points[b + 2] - points[a + 2];
      const vx = points[c] - points[a], vy = points[c + 1] - points[a + 1], vz = points[c + 2] - points[a + 2];
      const nx = uy * vz - uz * vy, ny = (uz * vx - ux * vz) * flip, nz = ux * vy - uy * vx;
      if ((bothSides ? Math.abs(ny) : ny) <= .25 * Math.hypot(nx, ny, nz)) continue;
      const id = tris.length;
      tris.push([points[a], points[a + 1], points[a + 2], points[b], points[b + 1], points[b + 2], points[c], points[c + 1], points[c + 2]]);
      const c0 = Math.max(0, Math.floor((minX - x0) / CELL)), c1 = Math.min(cols - 1, Math.floor((maxX - x0) / CELL));
      const r0 = Math.max(0, Math.floor((minZ - z0) / CELL)), r1 = Math.min(rows - 1, Math.floor((maxZ - z0) / CELL));
      for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) cells[r * cols + col].push(id);
    }
  }
  return {
    count: tris.length,
    at(x, z) {
      const col = Math.floor((x - x0) / CELL), row = Math.floor((z - z0) / CELL);
      if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
      let best = null;
      for (const id of cells[row * cols + col]) {
        const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris[id];
        const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (Math.abs(d) < 1e-12) continue;
        const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, w = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
        if (u < -1e-6 || w < -1e-6 || u + w > 1 + 1e-6) continue;
        const y = u * ay + w * by + (1 - u - w) * cy;
        if (best === null || y > best) best = y;
      }
      return best;
    },
  };
}

// Where the bow stands on this car, read from the model: its scale, its body's offset from the socket, and the rack's bars,
// widths and feet. `socket` is the roof socket the bow hangs on.
export function roofBowSeat(vehicle, socket) {
  const size = vehicle.userData.size ?? {width: 2.2, length: 4.6, height: 1.4};
  const scale = Math.min(ROOF_BOW.maxScale, Math.max(ROOF_BOW.minScale, size.width / ROOF_BOW.widthPerUnit));
  const sx = socket.position.x, sy = socket.position.y, sz = socket.position.z, reach = 2;
  vehicle.updateMatrixWorld(true);
  const skin = roofSkin(vehicle, {x0: sx - 1, x1: sx + 1, z0: sz - reach, z1: sz + reach, below: sy - 1.2});
  // Heights below the socket, in metres; null where the car has no skin within reach.
  const height = (x, z) => { const y = skin.at(sx + x, sz + z); return y === null || y < sy - 1.2 ? null : y - sy; };
  // The roof under the turntable; a car with no skin there keeps the socket's own height.
  const centre = height(0, 0);
  const roof = centre ?? -.1;
  // The roof's line along the middle: it ends where it falls below its highest point so far, at the windscreen's top edge in
  // front and the rear glass behind.
  const edge = direction => {
    let top = roof;
    for (let step = 1; step * .05 < reach; step++) {
      const z = direction * step * .05, at = height(0, z);
      if (at === null || at < top - ROOF_BOW.screenDrop) return z - direction * .025;
      top = Math.max(top, at);
    }
    return direction * reach;
  };
  const front = centre === null ? .55 : edge(1), back = centre === null ? -.8 : edge(-1);
  const extent = bowExtent(), bowFront = extent.front * scale, bowBack = extent.back * scale;
  // Centred on the roof, but never past the windscreen's top edge.
  const offset = Math.min((front + back) / 2 - (bowFront + bowBack) / 2, front - ROOF_BOW.screenGap - bowFront);
  // Each bar of the rack: as wide as the roof under it allows, so that no foot stands off the edge of a narrow canopy, and
  // moved in towards the turntable where a foot cannot reach the skin.
  const reachDown = (at, middle) => at !== null && ROOF_BOW.rackY - (at - roof) / scale <= ROOF_BOW.maxLeg &&
    at >= middle - ROOF_BOW.rackDrop;
  // A bar takes the first place, going in from its rest, where both its feet are short; failing that, the place where its longer
  // foot is shortest. A short roof then has the bow's butt reach back past its rear bar rather than stand on stilts.
  const legAt = at => ROOF_BOW.rackY - (at - roof) / scale;
  const placeBar = rest => {
    let best = null;
    for (let z = rest; Math.abs(z) >= ROOF_BOW.minBar - 1e-6; z -= Math.sign(rest) * .04) {
      const along = offset + z * scale, middle = height(0, along) ?? roof;
      let half = ROOF_BOW.rackHalf;
      for (const side of [-1, 1]) {
        let fits = ROOF_BOW.minRackHalf;
        for (let x = ROOF_BOW.minRackHalf; x <= ROOF_BOW.rackHalf + 1e-6; x += .02) {
          if (!reachDown(height(side * x * scale, along), middle)) break;
          fits = x;
        }
        half = Math.min(half, fits);
      }
      const feet = [-1, 1].map(side => height(side * half * scale, along));
      const longest = feet.every(at => reachDown(at, middle)) ? Math.max(...feet.map(legAt)) : Infinity;
      if (!best || longest < best.longest) best = {z, half, longest};
      if (longest <= ROOF_BOW.shortLeg) break;
    }
    return best;
  };
  const placed = ROOF_BOW.bars.map(placeBar), bars = placed.map(bar => bar.z), rack = placed.map(bar => bar.half);
  const legs = bars.flatMap((z, bar) => [-1, 1].map(side => {
    const at = height(side * rack[bar] * scale, offset + z * scale) ?? roof;
    return Math.min(ROOF_BOW.maxLeg, Math.max(.02, ROOF_BOW.rackY - (at - roof) / scale));
  }));
  return {scale, offset, roof, front, back, bars, rack, legs, found: centre !== null};
}

// The bow's reach along itself at scale 1, from the butt to the broadhead's point, read from its own shape.
let extent = null;
function bowExtent() {
  if (extent) return extent;
  const geometry = roofBowGeometry();
  geometry.computeBoundingBox();
  extent = {back: geometry.boundingBox.min.z, front: geometry.boundingBox.max.z};
  geometry.dispose();
  return extent;
}

// A car model is measured once: every copy of the same model with the same socket gets the same seat.
const seats = new Map();
function seatKey(vehicle, socket) {
  let meshes = 0;
  vehicle.traverse(node => { if (node.isMesh) meshes++; });
  const size = vehicle.userData.size ?? {};
  return [vehicle.userData.vehicleKey, vehicle.userData.vehicleSource, size.width, size.length, size.height, meshes,
    ...socket.position.toArray()].join('|');
}

// Fit a bow made by createRoofBow to the car it has just been bolted to.
export function seatRoofBow(bow, vehicle, socket) {
  const key = vehicle.userData.vehicleKey ? seatKey(vehicle, socket) : null;
  const seat = (key && seats.get(key)) || roofBowSeat(vehicle, socket);
  if (key) seats.set(key, seat);
  bow.body.scale.setScalar(seat.scale);
  bow.body.position.set(0, seat.roof, seat.offset);
  const old = bow.mesh.geometry;
  bow.mesh.geometry = roofBowGeometry(seat);
  old.dispose();
  bow.seat = seat;
  return seat;
}
