// The detailed ground of the Scablands (SCABLANDS-LAND round 4, slice 1). The land is 14 km by 10 km, so the fine ground is
// not drawn everywhere: one window of 60 by 60 cells (1,400 m by 1,000 m) follows the player.
// Its corners always lie on one fixed lattice of the whole land, and it moves
// only in whole cells, so a given corner has the same height whichever way the window is standing and nothing swims.
//
// Moving the window by a cell keeps the heights of the corners it still holds (they are copied across) and works out the new
// strip only, about 60 to 120 heights. The face mesh is rebuilt when
// the window moves. `refresh` works out every corner again when the land changes.
import * as THREE from 'three';
import {SCARPS, SCARP, preparedScarps} from './scablands-scarps.js';

export const NEAR_GROUND = Object.freeze({
  cellX: 1400 / 60, cellZ: 1000 / 60, cellsX: 60, cellsZ: 60,
  // The drawn ground rides this far above the land's own height, so that nothing laid on the land sinks into it.
  lift: .025,
});
const {cellX, cellZ, cellsX, cellsZ, lift} = NEAR_GROUND;
const across = cellsX + 1, down = cellsZ + 1, corners = across * down;
const divisions = 8;
const faces = preparedScarps(SCARPS).map(s => {
  const points = [];
  for (const along of [-SCARP.taper, s.length + SCARP.taper]) for (const across of [0, s.width])
    points.push({x: s.a.x + s.tx * along - s.tz * across, z: s.a.z + s.tz * along + s.tx * across});
  return {x0: Math.min(...points.map(p => p.x)), x1: Math.max(...points.map(p => p.x)),
    z0: Math.min(...points.map(p => p.z)), z1: Math.max(...points.map(p => p.z))};
});
const isFaceCell = (x, z) => faces.some(f => x <= f.x1 && x + cellX >= f.x0 && z <= f.z1 && z + cellZ >= f.z0);

// The height at (x, z) of the ground as it is drawn: the straight slopes between lattice corners, cut the way the window's
// triangles are cut (each cell is two triangles meeting along the line from its (1, 0) corner to its (0, 1) corner). Used to lay
// a thing on what is seen. `heightAt(x, z)` is the land's own height.
export function nearGroundHeightAt(x, z, heightAt, grid = NEAR_GROUND) {
  const {cellX, cellZ, lift} = grid;
  const fx = x / cellX, fz = z / cellZ, ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
  const corner = (i, j) => heightAt((ix + i) * cellX, (iz + j) * cellZ) + lift;
  if (isFaceCell(ix * cellX, iz * cellZ)) {
    const a = Math.fround(corner(0, 0)), b = Math.fround(corner(1, 0));
    const c = Math.fround(corner(0, 1)), d = Math.fround(corner(1, 1));
    const sample = (i, j) => {
      const s = i / divisions, t = j / divisions;
      if (j === 0) return a * (1 - s) + b * s;
      if (j === divisions) return c * (1 - s) + d * s;
      if (i === 0) return a * (1 - t) + c * t;
      if (i === divisions) return b * (1 - t) + d * t;
      return heightAt((ix + s) * cellX, (iz + t) * cellZ) + lift;
    };
    const sx = u * divisions, sz = v * divisions, i = Math.floor(sx), j = Math.floor(sz), s = sx - i, t = sz - j;
    if (s + t <= 1) { const h = sample(i, j); return h + (sample(i + 1, j) - h) * s + (sample(i, j + 1) - h) * t; }
    const h = sample(i + 1, j + 1);
    return h + (sample(i, j + 1) - h) * (1 - s) + (sample(i + 1, j) - h) * (1 - t);
  }
  if (u + v <= 1) { const a = corner(0, 0); return a + (corner(1, 0) - a) * u + (corner(0, 1) - a) * v; }
  const d = corner(1, 1);
  return d + (corner(0, 1) - d) * (1 - u) + (corner(1, 0) - d) * (1 - v);
}

export function createNearGround({material, heightAt, name = 'Scablands near ground', grid = NEAR_GROUND}) {
  const {cellX, cellZ, cellsX, cellsZ, lift} = grid;
  const across = cellsX + 1, down = cellsZ + 1, corners = across * down;
  const positions = new Float32Array(corners * 3), normals = new Float32Array(corners * 3);
  let heights = new Float32Array(corners), spare = new Float32Array(corners);
  const indices = new Uint32Array(cellsX * cellsZ * 6);
  // The window's own corners stand at fixed offsets from its middle; only the middle (a lattice corner) moves.
  for (let iz = 0; iz < down; iz++) for (let ix = 0; ix < across; ix++) {
    const at = iz * across + ix;
    positions[at * 3] = (ix - cellsX / 2) * cellX; positions[at * 3 + 2] = (iz - cellsZ / 2) * cellZ;
    if (ix < cellsX && iz < cellsZ) {
      const a = at, b = a + 1, c = a + across, d = c + 1, slot = (iz * cellsX + ix) * 6;
      indices[slot] = a; indices[slot + 1] = c; indices[slot + 2] = b; indices[slot + 3] = b; indices[slot + 4] = c; indices[slot + 5] = d;
    }
  }
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3), normalAttribute = new THREE.BufferAttribute(normals, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage); normalAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute); geometry.setAttribute('normal', normalAttribute);
  const indexAttribute = new THREE.BufferAttribute(indices, 1);
  indexAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setIndex(indexAttribute);
  // The window always lies under the player, and its heights change as it moves: it is never culled.
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name; mesh.receiveShadow = true; mesh.frustumCulled = false;

  // Replace only cells touching a scarp with a separate finer mesh. Its borders follow
  // the original cell edges, so the two meshes meet without cracks or overlap.
  const faceGeometry = new THREE.BufferGeometry();
  const faceMesh = new THREE.Mesh(faceGeometry, material);
  faceMesh.name = 'Scablands near scarp faces'; faceMesh.receiveShadow = true; faceMesh.frustumCulled = false;
  mesh.add(faceMesh);

  const faceHeights = new Map();
  function updateFaces() {
    const facePositions = [], faceIndices = [];
    let baseCount = 0;
    for (let iz = 0; iz < cellsZ; iz++) for (let ix = 0; ix < cellsX; ix++) {
      const a = iz * across + ix, b = a + 1, c = a + across, d = c + 1;
      const x = (centreI + ix - cellsX / 2) * cellX, z = (centreJ + iz - cellsZ / 2) * cellZ;
      if (!isFaceCell(x, z)) {
        indices[baseCount++] = a; indices[baseCount++] = c; indices[baseCount++] = b;
        indices[baseCount++] = b; indices[baseCount++] = c; indices[baseCount++] = d;
        continue;
      }
      const key = `${centreI + ix - cellsX / 2},${centreJ + iz - cellsZ / 2}`;
      let samples = faceHeights.get(key);
      if (!samples) { samples = new Float64Array((divisions - 1) ** 2); faceHeights.set(key, samples); }
      const start = facePositions.length / 3;
      for (let j = 0; j <= divisions; j++) for (let i = 0; i <= divisions; i++) {
        const u = i / divisions, v = j / divisions, px = x + u * cellX, pz = z + v * cellZ;
        let y;
        if (j === 0) y = heights[a] * (1 - u) + heights[b] * u;
        else if (j === divisions) y = heights[c] * (1 - u) + heights[d] * u;
        else if (i === 0) y = heights[a] * (1 - v) + heights[c] * v;
        else if (i === divisions) y = heights[b] * (1 - v) + heights[d] * v;
        else {
          const sample = (j - 1) * (divisions - 1) + i - 1;
          y = samples[sample];
          if (!y) { y = heightAt(px, pz) + lift; samples[sample] = y || Number.MIN_VALUE; }
          else if (y === Number.MIN_VALUE) y = 0;
        }
        facePositions.push(px - centreI * cellX, y, pz - centreJ * cellZ);
      }
      for (let j = 0; j < divisions; j++) for (let i = 0; i < divisions; i++) {
        const q = start + j * (divisions + 1) + i;
        faceIndices.push(q, q + divisions + 1, q + 1, q + 1, q + divisions + 1, q + divisions + 2);
      }
    }
    for (const key of faceHeights.keys()) {
      const [i, j] = key.split(',').map(Number);
      if (i < centreI - cellsX / 2 || i >= centreI + cellsX / 2 || j < centreJ - cellsZ / 2 || j >= centreJ + cellsZ / 2) faceHeights.delete(key);
    }
    indexAttribute.count = baseCount; indexAttribute.needsUpdate = true;
    faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
    // The number of face vertices changes as the window moves. Three.js otherwise
    // reuses the previous normal buffer, even when it has a different length.
    faceGeometry.deleteAttribute('normal');
    faceGeometry.setIndex(faceIndices); faceGeometry.computeVertexNormals();
  }

  // The lattice corner (in whole cells) at the window's middle. Not yet placed.
  let centreI = NaN, centreJ = NaN;
  const cornerHeight = (i, j) => heightAt(i * cellX, j * cellZ) + lift;

  function shade() {
    for (let iz = 0; iz < down; iz++) for (let ix = 0; ix < across; ix++) {
      const at = iz * across + ix, h = heights[at];
      positions[at * 3 + 1] = h;
      // The slope from the corners either side (one side at the window's edge).
      const west = heights[iz * across + Math.max(0, ix - 1)], east = heights[iz * across + Math.min(cellsX, ix + 1)];
      const north = heights[Math.max(0, iz - 1) * across + ix], south = heights[Math.min(cellsZ, iz + 1) * across + ix];
      const slopeX = (east - west) / (cellX * (Math.min(cellsX, ix + 1) - Math.max(0, ix - 1)));
      const slopeZ = (south - north) / (cellZ * (Math.min(cellsZ, iz + 1) - Math.max(0, iz - 1)));
      const length = Math.hypot(slopeX, 1, slopeZ);
      normals[at * 3] = -slopeX / length; normals[at * 3 + 1] = 1 / length; normals[at * 3 + 2] = -slopeZ / length;
    }
    positionAttribute.needsUpdate = true; normalAttribute.needsUpdate = true;
  }

  // Put the window's middle on lattice corner (i, j), keeping the heights of the corners it already holds.
  function place(i, j) {
    const first = Number.isNaN(centreI), di = first ? 0 : i - centreI, dj = first ? 0 : j - centreJ;
    const kept = !first && Math.abs(di) < cellsX && Math.abs(dj) < cellsZ;
    for (let iz = 0; iz < down; iz++) for (let ix = 0; ix < across; ix++) {
      const from = (iz + dj) * across + (ix + di), inside = kept && ix + di >= 0 && ix + di < across && iz + dj >= 0 && iz + dj < down;
      spare[iz * across + ix] = inside ? heights[from] : cornerHeight(i + ix - cellsX / 2, j + iz - cellsZ / 2);
    }
    const swap = heights; heights = spare; spare = swap;
    centreI = i; centreJ = j;
    mesh.position.set(i * cellX, 0, j * cellZ);
    shade();
    updateFaces();
  }

  return {
    mesh, geometry, faceMesh,
    // The window's middle, in metres, once it has been placed.
    get centreX() { return centreI * cellX; },
    get centreZ() { return centreJ * cellZ; },
    // Move the window to the whole cell nearest (x, z). Returns true when it moved.
    follow(x, z) {
      const i = Math.round(x / cellX), j = Math.round(z / cellZ);
      if (i === centreI && j === centreJ) return false;
      place(i, j); return true;
    },
    // Work every corner out again (the land's own height has changed).
    refresh() {
      if (Number.isNaN(centreI)) return;
      const i = centreI, j = centreJ;
      faceHeights.clear();
      centreI = NaN; centreJ = NaN; place(i, j);
    },
    // The drawn height at (x, z), read from this window's own corners, for a point inside it; null outside.
    heightAtDrawn(x, z) {
      if (Number.isNaN(centreI)) return null;
      const fx = x / cellX - (centreI - cellsX / 2), fz = z / cellZ - (centreJ - cellsZ / 2);
      if (fx < 0 || fz < 0 || fx >= cellsX || fz >= cellsZ) return null;
      if (isFaceCell(Math.floor(x / cellX) * cellX, Math.floor(z / cellZ) * cellZ)) return nearGroundHeightAt(x, z, heightAt, grid);
      const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz, at = iz * across + ix;
      return u + v <= 1 ? heights[at] + (heights[at + 1] - heights[at]) * u + (heights[at + across] - heights[at]) * v :
        heights[at + across + 1] + (heights[at + across] - heights[at + across + 1]) * (1 - u) + (heights[at + 1] - heights[at + across + 1]) * (1 - v);
    },
    dispose() { geometry.dispose(); faceGeometry.dispose(); },
  };
}
