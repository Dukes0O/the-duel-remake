// Dump every visible triangle of the runtime Skyline (world metres) for the outline fit check.
// Usage: node tools/art/skyline-silhouette.mjs <lane .evidence output.bin>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadSkylineVehicle, SKYLINE_MODEL_URL } from '../../src/skyline-vehicle.js';

const target = resolve(process.argv[2]);
if (relative(resolve('.evidence'), target).startsWith('..')) throw Error('Fit output belongs under lane .evidence.');
const bytes = await readFile(new URL('../../public' + SKYLINE_MODEL_URL, import.meta.url));
const create = await loadSkylineVehicle({loadAsset: () => new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')});
const vehicle = create();
vehicle.updateMatrixWorld(true);
const out = [];
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh || mesh.geometry.userData.skipFit) return;
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
  const count = index ? index.count : p.count;
  for (let i = 0; i < count; i++) {
    const k = index ? index.getX(i) : i;
    const v = { x: p.getX(k), y: p.getY(k), z: p.getZ(k) };
    const e = mesh.matrixWorld.elements;
    out.push(e[0]*v.x + e[4]*v.y + e[8]*v.z + e[12], e[1]*v.x + e[5]*v.y + e[9]*v.z + e[13], e[2]*v.x + e[6]*v.y + e[10]*v.z + e[14]);
  }
});
await mkdir(dirname(target), {recursive: true});
await writeFile(target, Buffer.from(new Float32Array(out).buffer));
console.log('Silhouette triangles:', out.length / 9, '->', target);
