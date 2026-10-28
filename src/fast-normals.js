import * as THREE from 'three';

// BufferGeometry.computeVertexNormals for an indexed Float32 mesh, with the same arithmetic in the same order (face normals
// summed through Float32 storage, then each vertex normal scaled by 1 / its length), but on the arrays directly. Terrain
// meshes have hundreds of thousands of vertices and this was a visible part of building a world.
export function computeNormalsFast(geometry) {
  const position = geometry.attributes.position.array, index = geometry.index.array;
  const normals = new Float32Array(position.length);
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i] * 3, b = index[i + 1] * 3, c = index[i + 2] * 3;
    const cbx = position[c] - position[b], cby = position[c + 1] - position[b + 1], cbz = position[c + 2] - position[b + 2];
    const abx = position[a] - position[b], aby = position[a + 1] - position[b + 1], abz = position[a + 2] - position[b + 2];
    const x = cby * abz - cbz * aby, y = cbz * abx - cbx * abz, z = cbx * aby - cby * abx;
    normals[a] += x; normals[a + 1] += y; normals[a + 2] += z;
    normals[b] += x; normals[b + 1] += y; normals[b + 2] += z;
    normals[c] += x; normals[c + 1] += y; normals[c + 2] += z;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i], y = normals[i + 1], z = normals[i + 2];
    const scale = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
    normals[i] = x * scale; normals[i + 1] = y * scale; normals[i + 2] = z * scale;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
}
