import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Texture, Vector2, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../public/assets/models/wasteland/town/homes.glb', import.meta.url));
const loader = new GLTFLoader();
loader.register(() => ({name: 'HEADLESS_TEXTURE', loadTexture: () => Promise.resolve(new Texture())}));
const {scene} = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);

// For a review, supply the accepted GLB. Mask the sampled coordinate buffers
// only. Equality elsewhere covers each picture, normal, position and index,
// all transforms, the node hierarchy, materials and every other UV channel.
let originalScene;
if (process.argv[2]) {
  const original = await readFile(process.argv[2]);
  const masked = Buffer.from(bytes);
  const size = original.readUInt32LE(12), start = 28 + size;
  const gltf = JSON.parse(original.subarray(20, 20 + size));
  for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
    const tile = gltf.materials[p.material].pbrMetallicRoughness.baseColorTexture;
    if (!tile) continue;
    const uv = gltf.accessors[p.attributes['TEXCOORD_' + (tile.texCoord ?? 0)]];
    const view = gltf.bufferViews[uv.bufferView], offset = start + (view.byteOffset ?? 0);
    original.copy(masked, offset, offset, offset + view.byteLength);
  }
  assert.ok(masked.equals(original), 'all bytes outside sampled UVs are unchanged');
  originalScene = (await loader.parseAsync(original.buffer.slice(original.byteOffset, original.byteOffset + original.byteLength), '')).scene;
}

const homes = ['tent-a', 'tent-b', 'shack-a', 'shack-b', 'shack-c', 'stack-a', 'stack-b', 'block-a', 'block-b', 'terrace-a'];
const positions = Array.from({length: 3}, () => new Vector3());
const coords = Array.from({length: 3}, () => new Vector2());
const previous = Array.from({length: 3}, () => new Vector2());
const edge = new Vector3(), normal = new Vector3();
let total = 0, wall = 0, oxide = 0;
let restored = 0, restoredWall = 0, restoredOxide = 0, preserved = 0;
const triangleArea = ([a, b, c]) => Math.abs((b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x)) / 2;

for (const name of homes) {
  const home = scene.getObjectByName(name);
  assert.ok(home?.getObjectByName(name + 'lamp'), name + ' has its lamp');
  const lost = [];
  home.traverse(mesh => {
    const texture = mesh.material?.map;
    if (!texture) return;
    const geometry = mesh.geometry, position = geometry.getAttribute('position');
    const channel = texture.channel ? 'uv' + texture.channel : 'uv';
    const uv = geometry.getAttribute(channel);
    const old = originalScene?.getObjectByName(mesh.name).geometry.getAttribute(channel);
    assert.ok(uv, name + ' has the coordinates its colour texture samples');
    for (let i = 0; i < geometry.index.count; i += 3) {
      for (let corner = 0; corner < 3; corner++) {
        const vertex = geometry.index.getX(i + corner);
        positions[corner].fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
        coords[corner].fromBufferAttribute(uv, vertex);
        if (old) previous[corner].fromBufferAttribute(old, vertex);
      }
      const [a, b, c] = positions;
      normal.subVectors(b, a).cross(edge.subVectors(c, a));
      const area = normal.length() / 2;
      if (area < 1e-7) continue;
      total += area;
      const isWall = area >= .5 && Math.abs(normal.y) < .1 * area;
      const isOxide = name === 'shack-a' && mesh.material.name.endsWith('red-oxide');
      if (isWall) wall += area;
      if (isOxide) oxide += area;
      if (triangleArea(coords) < .001 * area) lost.push({mesh: mesh.name, area});
      if (old && triangleArea(previous) >= .001 * area) {
        assert.ok(previous.every((v, j) => v.equals(coords[j])), 'original paint was disturbed on ' + mesh.name);
        preserved++;
      } else if (old) {
        restored += area;
        if (isWall) restoredWall += area;
        if (isOxide) restoredOxide += area;
      }
    }
  });
  // A single long beam or roof panel can lose its mapping even when the
  // surrounding material still has a large overall UV range.
  assert.equal(lost.length, 0, name + ' has collapsed triangles: ' + JSON.stringify(lost.slice(0, 3)));
}
assert.ok(wall > 600, 'the measured family includes its broad vertical walls');
assert.ok(oxide > 50, 'the red-oxide shack sheets were measured');
console.log(`All ten homes have full picture coverage across ${total.toFixed(2)} m², including ${wall.toFixed(2)} m² of broad vertical surfaces and ${oxide.toFixed(2)} m² of red oxide on shack-a.`);
if (originalScene) console.log(`Restored ${restored.toFixed(2)} m², including ${restoredWall.toFixed(2)} m² of broad vertical surfaces and ${restoredOxide.toFixed(2)} m² of the shack's red oxide. ${preserved} already-mapped triangles kept their exact corner UVs.`);
