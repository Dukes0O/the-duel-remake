// The sea floor: rippled sand and rocky ground, seagrass patches, and rocks.
// The shape comes from sea-floor-shape.js. Ripples and grain are drawn in the
// shader; seagrass and rocks are instanced (a handful of meshes, many copies).
import * as THREE from 'three';
import { makeRng } from '../rng.js';
import { FLOOR_HALF_WIDTH, floorHeight, pebblePlacements, rockiness, seagrassPlacements, rockPlacements } from './sea-floor-shape.js';
import { patchWaterMaterial } from './water-shader.js';

// Pale golden sand, not bright white: it is lit by strong sun and must not glow.
const SAND = new THREE.Color().setRGB(0.66, 0.57, 0.39, THREE.SRGBColorSpace);
const SAND_DARK = new THREE.Color().setRGB(0.42, 0.35, 0.25, THREE.SRGBColorSpace);
const SAND_GREY = new THREE.Color().setRGB(0.50, 0.47, 0.40, THREE.SRGBColorSpace);
const ROCK = new THREE.Color().setRGB(0.34, 0.32, 0.27, THREE.SRGBColorSpace);
const TURF = new THREE.Color().setRGB(0.30, 0.29, 0.17, THREE.SRGBColorSpace);

function softNoise(x, z) {
  return 0.5 + 0.25 * Math.sin(x * 0.9 + z * 0.4) * Math.cos(z * 1.1 - x * 0.3) + 0.15 * Math.sin(x * 2.9 + z * 3.7) + 0.1 * Math.sin(x * 7.1 - z * 5.3);
}

// A grid of ground from (x0, z0), cols by rows points, cell metres apart. The
// shape gives the height and how rocky each point is.
function floorGeometry(spec) {
  const job = startFloor(spec);
  fillFloorRows(job, spec.rows);
  return finishFloor(job);
}
// The same grid in pieces, so a tile can be built a few rows per frame.
function startFloor(spec) {
  const n = spec.cols * spec.rows;
  return { spec, row: 0, positions: new Float32Array(n * 3), colours: new Float32Array(n * 3), sand: new Float32Array(n), tint: new THREE.Color() };
}
function fillFloorRows(job, count) {
  const { x0, z0, cols, rows, cell, height, rock: rockAt } = job.spec;
  const { positions, colours, sand, tint } = job;
  const end = Math.min(rows, job.row + count);
  for (let r = job.row; r < end; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = x0 + c * cell, z = z0 + r * cell;
      positions[i * 3] = x; positions[i * 3 + 1] = height(x, z); positions[i * 3 + 2] = z;
      const rock = rockAt(x, z), n = softNoise(x * 0.6, z * 0.6);
      // Patches of darker, browner and greyer sand across the floor.
      const patch = softNoise(x * 0.11 + 3, z * 0.09), grey = softNoise(x * 0.05 - 7, z * 0.06 + 2);
      tint.copy(SAND).lerp(SAND_DARK, Math.min(1, Math.max(0, (patch - 0.35) * 1.5) * 0.8 + n * 0.25));
      tint.lerp(SAND_GREY, Math.min(1, Math.max(0, (grey - 0.5) * 2.2)));
      tint.lerp(rock > 0.5 ? ROCK : TURF, Math.min(1, rock * 1.15));
      colours[i * 3] = tint.r; colours[i * 3 + 1] = tint.g; colours[i * 3 + 2] = tint.b;
      sand[i] = 1 - Math.min(1, rock * 1.4);
    }
  }
  job.row = end;
  return job.row >= rows;
}
function finishFloor(job) {
  const { cols, rows } = job.spec, { positions, colours, sand } = job;
  const index = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      index[k++] = a; index[k++] = d; index[k++] = b;
      index[k++] = b; index[k++] = d; index[k++] = e;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute('aSand', new THREE.BufferAttribute(sand, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function floorMaterial(uniforms) {
  return patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
    uniforms, { key: 'floor', ripples: true });
}

// The look test's stretch of ground as one mesh. cell is the grid size in metres.
export function createFloorMesh(uniforms, { cell = 1, zFrom = -14, zTo = 440 } = {}) {
  const halfWidth = FLOOR_HALF_WIDTH + 6;
  const cols = Math.round((halfWidth * 2) / cell) + 1, rows = Math.round((zTo - zFrom) / cell) + 1;
  const geometry = floorGeometry({ x0: -halfWidth, z0: zFrom, cols, rows, cell, height: floorHeight, rock: rockiness });
  const mesh = new THREE.Mesh(geometry, floorMaterial(uniforms));
  mesh.name = 'Sea floor';
  mesh.receiveShadow = true;
  return mesh;
}

// A Deep zone's ground (zone-floor.js) in square tiles. Only tiles near the
// trail exist, and only tiles near the camera are built and drawn: the water
// hides everything past about 140 m, so a 4 km loop costs what 300 m does.
export const TILE_SIZE = 48;
export function createFloorTiles(uniforms, shape, { cell = 1, reach = 170, budgetMs = 2, now = () => performance.now() } = {}) {
  const material = floorMaterial(uniforms);
  const group = new THREE.Group();
  group.name = `Sea floor: ${shape.id}`;
  const steps = Math.round(TILE_SIZE / cell), tiles = new Map();
  // Tiles whose middle is within the ground's span of the trail.
  const { minX, maxX, minZ, maxZ } = shape.bounds;
  for (let tx = Math.floor(minX / TILE_SIZE); tx <= Math.floor(maxX / TILE_SIZE); tx++) {
    for (let tz = Math.floor(minZ / TILE_SIZE); tz <= Math.floor(maxZ / TILE_SIZE); tz++) {
      const cx = (tx + 0.5) * TILE_SIZE, cz = (tz + 0.5) * TILE_SIZE, at = shape.sample(cx, cz);
      if (at && at.distance < at.width * 0.5 + 90 + TILE_SIZE * 0.71) tiles.set(`${tx}:${tz}`, { tx, tz, cx, cz, mesh: null, job: null });
    }
  }
  const spec = tile => ({ x0: tile.tx * TILE_SIZE, z0: tile.tz * TILE_SIZE, cols: steps + 1, rows: steps + 1, cell,
    height: shape.floorHeight, rock: shape.rockiness });
  function place(tile, geometry) {
    tile.mesh = new THREE.Mesh(geometry, material);
    tile.mesh.name = `Sea floor tile ${tile.tx}:${tile.tz}`;
    tile.mesh.receiveShadow = true;
    tile.job = null;
    group.add(tile.mesh);
  }
  function free(tile) {
    if (tile.mesh) { tile.mesh.geometry.dispose(); group.remove(tile.mesh); tile.mesh = null; }
    tile.job = null;
  }
  const gap = (tile, point) => Math.hypot(tile.cx - point.x, tile.cz - point.z);
  const near = (tile, point) => gap(tile, point) < reach + TILE_SIZE * 0.71;
  // Far behind: freed, and rebuilt if the car comes back.
  const far = (tile, point) => gap(tile, point) > reach * 1.8 + TILE_SIZE;
  let building = null;
  return {
    group, tileCount: tiles.size,
    get builtCount() { let n = 0; for (const t of tiles.values()) if (t.mesh) n++; return n; },
    // Build every tile around a point at once, before the first frame.
    prime(point) { for (const tile of tiles.values()) if (!tile.mesh && near(tile, point)) place(tile, floorGeometry(spec(tile))); },
    // Each frame: show the near tiles, free the far ones, and build the nearest
    // missing tile a few rows at a time within the time budget.
    update(camera) {
      const point = camera.position;
      let next = null, best = Infinity;
      for (const tile of tiles.values()) {
        if (tile.mesh) {
          tile.mesh.visible = near(tile, point);
          if (far(tile, point)) free(tile);
        } else if (near(tile, point)) {
          const d = gap(tile, point);
          if (d < best) { best = d; next = tile; }
        }
      }
      if (building && !near(building, point)) { building.job = null; building = null; }
      if (!building && next) { building = next; building.job = startFloor(spec(next)); }
      const start = now();
      while (building) {
        if (fillFloorRows(building.job, 4)) { place(building, finishFloor(building.job)); building = null; break; }
        if (now() - start >= budgetMs) break;
      }
    },
    dispose() {
      for (const tile of tiles.values()) free(tile);
      building = null;
      material.dispose();
    },
  };
}

// ---- seagrass ---------------------------------------------------------

const GRASS_SWAY = /* glsl */`
{
  float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
  float bend = aT * aT;
  float wave = sin(uUwTime * 1.15 + ph) + 0.5 * sin(uUwTime * 2.3 + ph * 1.7);
  transformed.x += (wave * 0.07 + 0.03) * bend * aLength;
  transformed.z += cos(uUwTime * 0.9 + ph * 1.3) * 0.05 * bend * aLength;
}`;
const GRASS_PARS = 'attribute float aT; attribute float aLength; uniform float uUwTime;';

function grassTuftGeometry(rng, blades = 12) {
  const positions = [], colours = [], ts = [], lengths = [], index = [];
  const dark = new THREE.Color().setRGB(0.20, 0.28, 0.08, THREE.SRGBColorSpace);
  const bright = new THREE.Color().setRGB(0.58, 0.66, 0.24, THREE.SRGBColorSpace);
  const tint = new THREE.Color();
  const segments = 3;
  for (let b = 0; b < blades; b++) {
    const angle = rng.float() * Math.PI * 2, spread = rng.range(0.0, 0.12), length = rng.range(0.28, 0.85), width = rng.range(0.010, 0.020);
    const baseX = Math.cos(angle) * spread, baseZ = Math.sin(angle) * spread, lean = rng.range(0.15, 0.7), face = rng.float() * Math.PI;
    const shade = rng.float();
    const startIndex = positions.length / 3;
    for (let s = 0; s <= segments; s++) {
      const t = s / segments, w = width * (1 - 0.82 * t * t);
      const out = lean * t * t * length, up = length * t * (1 - 0.15 * t);
      const cx = baseX + Math.cos(angle) * out, cz = baseZ + Math.sin(angle) * out;
      for (const side of [-1, 1]) {
        positions.push(cx + Math.cos(face) * w * side, up, cz + Math.sin(face) * w * side);
        tint.copy(dark).lerp(bright, Math.min(1, t * 0.9 + shade * 0.3));
        colours.push(tint.r, tint.g, tint.b);
        ts.push(t); lengths.push(length);
      }
    }
    for (let s = 0; s < segments; s++) {
      const a = startIndex + s * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
  geometry.setAttribute('aLength', new THREE.Float32BufferAttribute(lengths, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  // Blades stand up; light them from above so they do not go black edge-on.
  const normals = geometry.attributes.normal;
  for (let i = 0; i < normals.count; i++) normals.setXYZ(i, normals.getX(i) * 0.35, 0.94, normals.getZ(i) * 0.35);
  return geometry;
}

// Seagrass in chunks along the trail; chunks too far to see are not drawn.
export function createSeagrass(uniforms, { tufts = 1100, seed = 1989, distance = 85, placements = null } = {}) {
  const list = placements ?? seagrassPlacements(seed, tufts);
  const geometry = grassTuftGeometry(makeRng(seed ^ 0x6772), 12);
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    uniforms, { key: 'grass', vertexPars: GRASS_PARS, vertexSway: GRASS_SWAY, translucent: 0.25 });
  const group = new THREE.Group();
  group.name = 'Seagrass';
  const chunks = new Map();
  list.forEach((t, i) => {
    const key = `${Math.floor(t.z / 24)}:${Math.floor(t.x / 40)}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push({ t, i });
  });
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const parts = [];
  for (const members of chunks.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, members.length);
    const box = new THREE.Box3(), sphere = new THREE.Sphere();
    members.forEach(({ t, i }, k) => {
      q.setFromAxisAngle(up, t.yaw);
      s.set(t.size, t.size * (0.8 + 0.4 * ((i * 7919) % 100) / 100), t.size);
      p.set(t.x, t.y - 0.02, t.z);
      mesh.setMatrixAt(k, matrix.compose(p, q, s));
      box.expandByPoint(p);
    });
    box.expandByScalar(2);
    box.getBoundingSphere(sphere);
    mesh.boundingSphere = sphere;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    parts.push({ mesh, sphere });
  }
  return {
    group, count: list.length,
    update(camera) {
      for (const { mesh, sphere } of parts) mesh.visible = camera.position.distanceTo(sphere.center) - sphere.radius < distance;
    },
    dispose() { geometry.dispose(); material.dispose(); group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); },
  };
}

// ---- rocks ------------------------------------------------------------

// An angular, craggy rock: a sphere cut by flat planes and roughened, left
// faceted (flat shading) so the faces read as broken stone, with a coat of
// growth on the upward faces. Same function of position everywhere, so the
// faces never crack apart.
function rockGeometry(variant, detail, crags = 18) {
  const rng = makeRng(0x524f4b + variant * 977);
  const offsets = [0, 1, 2, 3, 4, 5].map(() => rng.range(0, 100));
  const cuts = [];
  for (let i = 0; i < crags; i++) {
    const n = new THREE.Vector3(rng.range(-1, 1), rng.range(-0.7, 1), rng.range(-1, 1)).normalize();
    cuts.push({ n, c: rng.range(0.50, 0.82) });
  }
  const g = new THREE.IcosahedronGeometry(1, detail);   // not indexed: every face has its own corners
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const pos = g.attributes.position, v = new THREE.Vector3(), dir = new THREE.Vector3();
  const colours = new Float32Array(pos.count * 3);
  const top = new THREE.Color().setRGB(0.40, 0.40, 0.30, THREE.SRGBColorSpace);
  const side = new THREE.Color().setRGB(0.31, 0.29, 0.26, THREE.SRGBColorSpace);
  const base = new THREE.Color().setRGB(0.18, 0.17, 0.15, THREE.SRGBColorSpace);
  const growth = new THREE.Color().setRGB(0.30, 0.34, 0.12, THREE.SRGBColorSpace);
  const tint = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    for (const { n, c } of cuts) {
      const d = v.dot(n);
      if (d > c) v.addScaledVector(n, -(d - c));
    }
    dir.copy(v).normalize();
    const rough = Math.sin(dir.x * 6.1 + offsets[0]) * Math.sin(dir.y * 7.3 + offsets[1]) * 0.12
      + Math.abs(Math.sin(dir.z * 11 + dir.x * 9 + offsets[2])) * 0.09 + Math.sin(dir.y * 19 + dir.z * 17 + offsets[3]) * 0.04;
    v.addScaledVector(dir, rough);
    pos.setXYZ(i, v.x, v.y, v.z);
    const h = dir.y;
    tint.copy(side).lerp(top, Math.max(0, h)).lerp(base, Math.max(0, -h) * 0.8);
    // Patches of green-brown growth, mostly on the upper faces.
    const g1 = Math.sin(dir.x * 5 + offsets[4]) * Math.sin(dir.z * 6 + offsets[5]) + h * 0.8;
    if (g1 > 0.35) tint.lerp(growth, Math.min(1, (g1 - 0.35) * 1.8));
    colours[i * 3] = tint.r; colours[i * 3 + 1] = tint.g; colours[i * 3 + 2] = tint.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  g.computeVertexNormals();   // not indexed, so these are flat: facets
  g.computeBoundingSphere();
  return g;
}

export function createRocks(uniforms, { count = 90, seed = 1989, detail = 3, placements = null } = {}) {
  const list = placements ?? rockPlacements(seed, count);
  const geometries = [0, 1, 2].map(v => rockGeometry(v, detail));
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }),
    uniforms, { key: 'rock', rock: true });
  const group = new THREE.Group();
  group.name = 'Rocks';
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const slots = [];          // where each rock lives: its mesh and its place in that mesh
  const drawn = list.map(r => ({ x: r.x, y: r.y, z: r.z }));
  const place = (r, slot) => {
    e.set(r.tilt, r.yaw, -r.tilt * 0.7, 'YXZ');
    q.setFromEuler(e);
    s.set(r.size, r.size * r.squash, r.size * 0.9);
    p.set(r.x, r.y, r.z);
    slot.mesh.setMatrixAt(slot.index, matrix.compose(p, q, s));
  };
  const meshes = geometries.map((geometry, variant) => {
    const members = list.filter(r => r.variant === variant);
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, members.length));
    mesh.count = members.length;
    let index = 0;
    list.forEach((r, i) => { if (r.variant === variant) { slots[i] = { mesh, index }; place(r, slots[i]); index++; } });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });
  return {
    group, count: list.length,
    // The run's rocks, in the same order: redraw only the ones the car has moved.
    // Returns how many instances changed.
    follow(current) {
      if (!Array.isArray(current) || current.length !== list.length) return 0;
      let moved = 0;
      const changed = new Set();
      current.forEach((r, i) => {
        const was = drawn[i];
        if (r.x === was.x && r.y === was.y && r.z === was.z) return;
        was.x = r.x; was.y = r.y; was.z = r.z;
        place({ ...list[i], x: r.x, y: r.y, z: r.z }, slots[i]);
        changed.add(slots[i].mesh); moved++;
      });
      for (const mesh of changed) mesh.instanceMatrix.needsUpdate = true;
      return moved;
    },
    dispose() { geometries.forEach(g => g.dispose()); material.dispose(); group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); },
  };
}

// Pebbles and cobbles: many small rough stones from the same three shapes, one
// draw each. They are what makes the ground read as ground, not a sheet.
export function createPebbles(uniforms, { count = 900, seed = 1989, placements = null } = {}) {
  const list = placements ?? pebblePlacements(seed, count);
  const geometries = [0, 1, 2].map(v => rockGeometry(v + 5, 1, 7));
  const material = patchWaterMaterial(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    uniforms, { key: 'rock', rock: true });
  const group = new THREE.Group();
  group.name = 'Pebbles';
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  geometries.forEach((geometry, variant) => {
    const members = list.filter(r => r.variant === variant);
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, members.length));
    mesh.count = members.length;
    members.forEach((r, i) => {
      q.setFromAxisAngle(up, r.yaw);
      s.set(r.size, r.size * r.squash, r.size * 0.9);
      p.set(r.x, r.y, r.z);
      mesh.setMatrixAt(i, matrix.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  return { group, count: list.length, dispose() { geometries.forEach(g => g.dispose()); material.dispose(); group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); } };
}
