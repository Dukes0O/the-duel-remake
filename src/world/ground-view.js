import * as THREE from 'three';

const SIDE = 32;

function makeChunk(row, heightAt) {
  const positions = [], colours = [], uvs = [], indices = [];
  const x0 = row.x * SIDE, z0 = row.z * SIDE;
  for (let z = 0; z <= SIDE; z++) for (let x = 0; x <= SIDE; x++) {
    const wx = x0 + x, wz = z0 + z, index = Math.min(SIDE - 1, z) * SIDE + Math.min(SIDE - 1, x);
    let turned=0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const sx=Math.max(0,Math.min(SIDE-1,Math.min(SIDE-1,z)+dz));
      const sz=Math.max(0,Math.min(SIDE-1,Math.min(SIDE-1,x)+dx));
      turned+=Math.min(1,Math.abs(row.delta[sz*SIDE+sx])*1.5)/9;
    }
    const variation=.86+(((Math.imul(Math.floor(wx+300),73856093)^Math.imul(Math.floor(wz+300),19349663))>>>0)%1000)/7000;
    const colour = new THREE.Color(0x887255).multiplyScalar(variation*(1-turned*.38));
    positions.push(wx, heightAt(wx, wz) + .035, wz);
    colours.push(colour.r, colour.g, colour.b);
    uvs.push(wx/10,wz/10);
    if (x < SIDE && z < SIDE) {
      const a = z * (SIDE + 1) + x, b = a + 1, c = a + SIDE + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // A shallow skirt hides the join between a cut chunk and the coarse terrain.
  for (let x = 0; x < SIDE; x++) {
    for (const [a, b] of [[x, x + 1], [SIDE * (SIDE + 1) + x + 1, SIDE * (SIDE + 1) + x],
      [x * (SIDE + 1), (x + 1) * (SIDE + 1)], [x * (SIDE + 1) + SIDE, (x + 1) * (SIDE + 1) + SIDE]]) {
      const base = positions.length / 3;
      for (const source of [a, b]) {
        positions.push(positions[source * 3], positions[source * 3 + 1] - 2, positions[source * 3 + 2]);
        colours.push(colours[source * 3], colours[source * 3 + 1], colours[source * 3 + 2]);
        uvs.push(uvs[source*2],uvs[source*2+1]);
      }
      indices.push(a, base, b, b, base, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Draws only edited 32 m chunks and replaces geometry only when their data changes. */
export function createGroundView({group, groundEdit, material = null} = {}) {
  if (!group?.isGroup || typeof groundEdit?.toSave !== 'function' || typeof groundEdit?.heightAt !== 'function')
    throw new TypeError('Ground view needs a Three.js group and ground edit layer.');
  const ownedMaterial = material || new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1});
  const meshes = new Map(), snapshots = new Map();
  let disposed = false;
  function update() {
    if (disposed) return 0;
    const rows = groundEdit.toSave().chunks, live = new Set();
    let changed = 0;
    for (const row of rows) {
      const key = `${row.x},${row.z}`;
      live.add(key);
      let mesh = meshes.get(key);
      if (!mesh) {
        mesh = new THREE.Mesh(makeChunk(row, groundEdit.heightAt), ownedMaterial);
        mesh.name = `Scablands edited ground ${key}`; mesh.receiveShadow = true; mesh.userData.chunk = {x: row.x, z: row.z};
        meshes.set(key, mesh); group.add(mesh); changed++;
      } else if (!same(row, snapshots.get(key))) {
        const geometry = makeChunk(row, groundEdit.heightAt), old = mesh.geometry;
        mesh.geometry = geometry; old.dispose(); changed++;
      }
      snapshots.set(key, {delta: new Float32Array(row.delta), material: new Uint8Array(row.material)});
    }
    for (const [key, mesh] of meshes) if (!live.has(key)) {
      group.remove(mesh); mesh.geometry.dispose(); meshes.delete(key); snapshots.delete(key); changed++;
    }
    return changed;
  }
  function same(row, previous) {
    if (!previous) return false;
    for (let i = 0; i < row.delta.length; i++)
      if (row.delta[i] !== previous.delta[i] || row.material[i] !== previous.material[i]) return false;
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const mesh of meshes.values()) { group.remove(mesh); mesh.geometry.dispose(); }
    meshes.clear(); snapshots.clear(); if (!material) ownedMaterial.dispose();
  }
  return Object.freeze({update, dispose, get chunkCount() { return meshes.size; }});
}
