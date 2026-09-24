import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The round-three Rook export ends the neck at 1.56 m and starts a separate
// head at 1.567 m. A continuous neck/jaw needs triangles across that plane.
const bytes = readFileSync(new URL('../public/assets/models/wasteland/crew/rook.glb', import.meta.url));
let json, binary;
for (let offset = 12; offset < bytes.length;) {
  const length = bytes.readUInt32LE(offset);
  const type = bytes.readUInt32LE(offset + 4);
  const chunk = bytes.subarray(offset + 8, offset + 8 + length);
  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
  if (type === 0x004e4942) binary = chunk;
  offset += 8 + length;
}
assert.ok(json && binary, 'Rook GLB must contain mesh data');
const nearNode = json.nodes.find(node => node.name === 'rook-near');
const near = json.meshes[nearNode?.mesh];
assert.ok(near, 'Rook near mesh is missing');

function values(accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const size = accessor.type === 'VEC3' ? 3 : 1;
  const width = accessor.componentType === 5126 ? 4 : accessor.componentType === 5125 ? 4 : 2;
  const stride = view.byteStride || size * width;
  const result = [];
  for (let row = 0; row < accessor.count; row++) {
    const point = [];
    for (let col = 0; col < size; col++) {
      const at = start + row * stride + col * width;
      point.push(accessor.componentType === 5126 ? binary.readFloatLE(at)
        : accessor.componentType === 5125 ? binary.readUInt32LE(at) : binary.readUInt16LE(at));
    }
    result.push(size === 1 ? point[0] : point);
  }
  return result;
}

let seamTriangles = 0;
let connectedCore = false;
for (const primitive of near.primitives) {
  const points = values(primitive.attributes.POSITION);
  const indices = values(primitive.indices);
  const parent = Array.from({length: points.length}, (_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (a, b) => {parent[find(a)] = find(b);};
  for (let index = 0; index < indices.length; index += 3) {
    join(indices[index], indices[index + 1]);
    join(indices[index + 1], indices[index + 2]);
    const triangle = indices.slice(index, index + 3).map(vertex => points[vertex]);
    const heights = triangle.map(point => point[1]); // glTF is Y up.
    const radius = triangle.map(point => Math.hypot(point[0], point[2]));
    if (Math.min(...heights) < 1.558 && Math.max(...heights) > 1.562
      && Math.max(...radius) < 0.12) seamTriangles++;
  }
  const bounds = new Map();
  for (let index = 0; index < points.length; index++) {
    const [x, y] = points[index];
    const id = find(index);
    const box = bounds.get(id) || {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity};
    box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y);
    bounds.set(id, box);
  }
  connectedCore ||= [...bounds.values()].some(box => box.minY < .4 && box.maxY > 1.76
    && box.minX < -.27 && box.maxX > .27);
}
assert.ok(seamTriangles >= 12,
  `Rook neck and jaw need connected skin across the 1.56 m seam; found ${seamTriangles} triangles`);
assert.ok(connectedCore, 'Rook needs one connected anatomical core spanning head, arms and legs');
console.log(`Rook neck/jaw seam: ${seamTriangles} bridging triangles.`);
